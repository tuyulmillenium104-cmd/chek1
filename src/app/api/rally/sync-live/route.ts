import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const RALLY_API_BASE = 'https://app.rally.fun/api/campaigns'
const MAX_DETAIL_FETCHES_PER_SYNC = 5
const DETAIL_FETCH_TIMEOUT_MS = 15_000

interface RallyCampaignListItem {
  id: string
  intelligentContractAddress: string
  title: string
  startDate: string
  endDate: string
  missionCount: number
  minimumFollowers: number
  onlyVerifiedUsers: boolean
  participating: boolean
  displayCreator: {
    type: string
    xUsername: string | null
    displayName: string | null
    avatarUrl: string | null
    profileUrl: string | null
  }
  token: {
    symbol: string
    usdPrice: number | null
  }
  campaignRewards: Array<{
    totalAmount: number
    token: { symbol: string } | null
    source: string
  }>
  headerImageUrl: string | null
  gasPaymentVerification: boolean
}

// ---------------------------------------------------------------------------
// Helper: parse rules from Rally API (can be string split by \n, or array)
// ---------------------------------------------------------------------------
function parseRules(rules: any): string[] {
  if (typeof rules === 'string') {
    return rules.split('\n').map((r: string) => r.trim()).filter(Boolean)
  }
  if (Array.isArray(rules)) {
    return rules.map((r: any) => String(r).trim()).filter(Boolean)
  }
  return []
}

// ---------------------------------------------------------------------------
// Helper: extract proposed angles from mission description text
// ---------------------------------------------------------------------------
function extractAngles(description: string): string[] {
  const angles: string[] = []
  const lines = description.split('\n')

  let inAnglesSection = false
  for (const line of lines) {
    if (line.toLowerCase().includes('proposed angles') || line.toLowerCase().includes('proposed angle')) {
      inAnglesSection = true
      continue
    }
    if (inAnglesSection) {
      if (line.trim().startsWith('**') && line.includes(':')) break
      if (line.trim().startsWith('---')) break
      const match = line.match(/^\s*(?:\d+\.\s*)?(?:The\s+)?['""]?([^'""]+)['""]?\s+Angle:/i)
      if (match) {
        angles.push(line.replace(/\*\*/g, '').trim())
      } else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        angles.push(line.replace(/^[-•]\s*/, '').replace(/\*\*/g, '').trim())
      } else if (line.trim() && !line.startsWith('#')) {
        const cleaned = line.replace(/\*\*/g, '').trim()
        if (cleaned.length > 10) angles.push(cleaned)
      }
    }
  }

  return angles.filter(a => a.length > 5)
}

// ---------------------------------------------------------------------------
// Helper: format reward string from campaignRewards + token
// ---------------------------------------------------------------------------
function formatRewardString(campaignRewards: any[], token: any): string {
  if (!campaignRewards?.length) return ''
  const parts = campaignRewards.map(r => {
    const amount = r.totalAmount?.toLocaleString() || '0'
    const sym = r.token?.symbol || token?.symbol || ''
    return `${amount} ${sym}`
  })
  return parts.join(' + ')
}

// ---------------------------------------------------------------------------
// Helper: fetch single campaign detail from Rally API with timeout
// ---------------------------------------------------------------------------
async function fetchCampaignDetail(address: string): Promise<any | null> {
  try {
    const res = await fetch(`${RALLY_API_BASE}/${address}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(DETAIL_FETCH_TIMEOUT_MS),
    })

    if (!res.ok) {
      console.error(`Detail fetch failed for ${address}: HTTP ${res.status}`)
      return null
    }

    return await res.json()
  } catch (err: any) {
    console.error(`Detail fetch error for ${address}: ${err.message}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Helper: build pipeline-compatible missionsJson from Rally detail response
// ---------------------------------------------------------------------------
function buildMissionsJson(campaign: any): string {
  const missions = (campaign.missions || []).map((m: any, idx: number) => ({
    id: idx,
    title: m.title || `Mission ${idx + 1}`,
    directive: m.description?.split('\n')[0]?.substring(0, 200) || m.title || '',
    reward: formatRewardString(campaign.campaignRewards, campaign.token),
    rules: parseRules(m.rules),
    proposed_angles: extractAngles(m.description || ''),
    active: m.active ?? true,
    status: 'active' as const,
    build_count: 0,
  }))

  return JSON.stringify(missions)
}

/**
 * POST /api/rally/sync-live
 * Fetches ALL campaigns from Rally.fun API and upserts them into the database.
 *
 * Phase 1: Basic sync — fetches list API for all active/ended campaigns.
 * Phase 2: Detail enrichment — fetches full detail for up to 5 campaigns
 *          that are missing pipeline data (no knowledgeBase).
 *
 * Returns: { status, synced, updated, skipped, errors, detailFetched, detailErrors }
 */
export async function POST() {
  try {
    const rallyCampaign = (db as any).rallyCampaign
    if (!rallyCampaign || typeof rallyCampaign.upsert !== 'function') {
      return NextResponse.json(
        { error: 'RallyCampaign model not available in Prisma client' },
        { status: 500 }
      )
    }

    const results = {
      synced: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      detailFetched: 0,
      detailErrors: [] as string[],
      campaigns: [] as { title: string; address: string; status: string }[],
    }

    // Track addresses of campaigns that were synced/updated and need detail
    const addressesNeedingDetail: string[] = []

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1: Basic sync from list API
    // ═══════════════════════════════════════════════════════════════════════

    const allCampaigns: RallyCampaignListItem[] = []

    for (const status of ['active', 'ended']) {
      try {
        const res = await fetch(`${RALLY_API_BASE}?status=${status}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(20000),
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.campaigns)) {
            allCampaigns.push(...data.campaigns)
          }
        }
      } catch (err: any) {
        results.errors.push(`Failed to fetch ${status} campaigns: ${err.message}`)
      }
    }

    // Deduplicate by contract address (Rally API may return same campaign in both active and ended)
    const seen = new Set<string>()
    const uniqueCampaigns = allCampaigns.filter(c => {
      const addr = c.intelligentContractAddress.toLowerCase()
      if (seen.has(addr)) return false
      seen.add(addr)
      return true
    })

    const now = new Date()

    for (const c of uniqueCampaigns) {
      try {
        const addr = c.intelligentContractAddress
        if (!addr) {
          results.skipped++
          continue
        }

        // Calculate actual status based on dates
        const startDate = new Date(c.startDate)
        const endDate = new Date(c.endDate)
        const isActive = now >= startDate && now <= endDate
        const isEnded = now > endDate
        const isNotStarted = now < startDate
        const effectiveStatus = isEnded ? 'ended' : isNotStarted ? 'upcoming' : 'active'

        // Calculate total reward
        const totalReward = c.campaignRewards.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
        const rewardTokens = [...new Set(
          c.campaignRewards
            .map(r => r.token?.symbol || c.token?.symbol || '')
            .filter(Boolean)
        )]

        // Build reward pool string
        const rewardParts = rewardTokens.map(sym => {
          const amount = c.campaignRewards
            .filter(r => r.token?.symbol === sym)
            .reduce((sum, r) => sum + (r.totalAmount || 0), 0)
          return `${amount.toLocaleString()} ${sym}`
        })
        const rewardPoolStr = rewardParts.join(' + ')

        // Build extra data JSON for fields not in dedicated columns
        const extraData: Record<string, any> = {
          rally_campaign_id: c.id,
          reward_token: c.token?.symbol || '',
          token_price: c.token?.usdPrice || null,
          mission_count: c.missionCount || 0,
          participating: c.participating || false,
          gas_payment_verification: c.gasPaymentVerification || false,
          only_verified_users: c.onlyVerifiedUsers || false,
          distribution_chain_id: c.distributionContractChainId || null,
          reward_tokens: rewardTokens,
          total_reward_raw: totalReward,
          last_live_sync: now.toISOString(),
          source_rally_api: true,
        }

        // Check if this campaign already exists in DB
        const existing = await rallyCampaign.findFirst({
          where: { contractAddress: addr },
        })

        if (existing) {
          // Update existing campaign — preserve pipeline fields if they exist
          const updateData: Record<string, any> = {
            title: c.title || existing.title,
            campaignUrl: `https://app.rally.fun/campaigns/${addr}`,
            creator: c.displayCreator?.displayName || existing.creator || 'Unknown',
            xUsername: c.displayCreator?.xUsername || existing.xUsername || '',
            rewardPool: rewardPoolStr || existing.rewardPool,
            startDate: c.startDate || existing.startDate,
            endDate: c.endDate || existing.endDate,
            status: effectiveStatus,
            isActive: isActive,
            dataJson: JSON.stringify({ ...extraData, ...(existing.dataJson ? JSON.parse(existing.dataJson) : {}) }),
          }

          // Don't overwrite pipeline fields if they were manually set or imported with full detail
          if (!existing.knowledgeBase) {
            updateData.description = c.displayCreator?.displayName
              ? `Campaign by ${c.displayCreator.displayName} on Rally.fun`
              : 'Rally.fun campaign'
          }

          await rallyCampaign.update({
            where: { id: existing.id },
            data: updateData,
          })
          results.updated++

          // Track for Phase 2 if missing pipeline data
          if (!existing.knowledgeBase) {
            addressesNeedingDetail.push(existing.id)
          }
        } else {
          // Create new campaign
          await rallyCampaign.create({
            data: {
              title: c.title || 'Untitled Campaign',
              contractAddress: addr,
              campaignUrl: `https://app.rally.fun/campaigns/${addr}`,
              creator: c.displayCreator?.displayName || 'Unknown',
              xUsername: c.displayCreator?.xUsername || '',
              rewardPool: rewardPoolStr,
              startDate: c.startDate,
              endDate: c.endDate,
              status: effectiveStatus,
              description: c.displayCreator?.displayName
                ? `Campaign by ${c.displayCreator.displayName} on Rally.fun`
                : 'Rally.fun campaign',
              source: 'rally_live',
              isActive: isActive,
              dataJson: JSON.stringify(extraData),
            },
          })
          results.synced++

          // New campaigns always need detail
          addressesNeedingDetail.push(addr)
        }

        results.campaigns.push({
          title: c.title,
          address: addr,
          status: effectiveStatus,
        })
      } catch (err: any) {
        results.errors.push(`${c.title}: ${err.message || String(err)}`)
        results.skipped++
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2: Detail enrichment — fetch full detail for campaigns missing pipeline data
    // ═══════════════════════════════════════════════════════════════════════

    if (addressesNeedingDetail.length > 0) {
      // Re-fetch the DB records to get current state after Phase 1 writes
      // and limit to campaigns that still have no knowledgeBase
      const candidates = await rallyCampaign.findMany({
        where: {
          OR: addressesNeedingDetail.map(id => ({ id })),
          knowledgeBase: null,
        },
        select: { id: true, contractAddress: true, title: true },
        take: MAX_DETAIL_FETCHES_PER_SYNC,
      })

      for (const candidate of candidates) {
        const addr = candidate.contractAddress
        if (!addr) continue

        try {
          const detail = await fetchCampaignDetail(addr)
          if (!detail) {
            results.detailErrors.push(`${candidate.title} (${addr}): Detail fetch returned null`)
            continue
          }

          // Extract pipeline fields from the detail response
          const goal = detail.goal || ''
          const knowledgeBase = detail.knowledgeBase || ''
          const style = detail.style || ''
          const rulesArr = parseRules(detail.rules)
          const missionsJson = buildMissionsJson(detail)

          // Collect all proposed angles across all missions for the campaign-level field
          const allAngles: string[] = []
          for (const m of (detail.missions || [])) {
            const mAngles = extractAngles(m.description || '')
            allAngles.push(...mAngles)
          }
          const proposedAnglesJson = JSON.stringify([...new Set(allAngles)])

          // Build update payload — only set fields that have actual data
          const detailUpdate: Record<string, any> = {}
          if (goal) detailUpdate.goal = goal
          if (knowledgeBase) detailUpdate.knowledgeBase = knowledgeBase
          if (style) detailUpdate.style = style
          if (rulesArr.length > 0) detailUpdate.rulesJson = JSON.stringify(rulesArr)
          if (missionsJson) detailUpdate.missionsJson = missionsJson
          if (proposedAnglesJson && JSON.parse(proposedAnglesJson).length > 0) {
            detailUpdate.proposedAnglesJson = proposedAnglesJson
          }

          // Update the description to include goal info if we now have it
          if (goal) {
            detailUpdate.description = goal.substring(0, 500)
          }

          // Only update if we got at least some pipeline data
          if (Object.keys(detailUpdate).length > 0) {
            await rallyCampaign.update({
              where: { id: candidate.id },
              data: detailUpdate,
            })
            results.detailFetched++
          } else {
            results.detailErrors.push(`${candidate.title} (${addr}): Detail fetched but no pipeline fields found`)
          }
        } catch (err: any) {
          results.detailErrors.push(`${candidate.title} (${addr}): ${err.message || String(err)}`)
        }
      }
    }

    return NextResponse.json({
      status: 'ok',
      message: `Synced ${results.synced} new + ${results.updated} updated campaigns from Rally.fun API` +
        (results.detailFetched > 0 ? ` (${results.detailFetched} enriched with pipeline data)` : ''),
      totalFromApi: uniqueCampaigns.length,
      ...results,
    })
  } catch (error) {
    console.error('Rally live sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync campaigns from Rally API', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rally/sync-live
 * Returns the last sync status (read-only, no sync performed)
 */
export async function GET() {
  try {
    const rallyCampaign = (db as any).rallyCampaign
    if (!rallyCampaign || typeof rallyCampaign.count !== 'function') {
      return NextResponse.json({ error: 'DB not available' }, { status: 500 })
    }

    const totalCount = await rallyCampaign.count()
    const liveCount = await rallyCampaign.count({ where: { source: 'rally_live' } })
    const activeCount = await rallyCampaign.count({ where: { isActive: true } })
    const endedCount = await rallyCampaign.count({ where: { status: 'ended' } })

    // Count campaigns with pipeline data vs without
    const withPipeline = await rallyCampaign.count({
      where: { knowledgeBase: { not: null } },
    })
    const withoutPipeline = liveCount - withPipeline

    return NextResponse.json({
      status: 'ok',
      dbStats: {
        total: totalCount,
        fromRallyLive: liveCount,
        active: activeCount,
        ended: endedCount,
        other: totalCount - liveCount,
        withPipelineData: withPipeline,
        missingPipelineData: withoutPipeline,
      },
      message: liveCount > 0
        ? `${liveCount} campaigns from Rally API in database (${withPipeline} with pipeline data, ${withoutPipeline} missing)`
        : 'No live campaigns synced yet. POST to sync now.',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get sync status', details: String(error) },
      { status: 500 }
    )
  }
}
