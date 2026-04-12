import { NextResponse } from 'next/server'
import { getMaster, getKnowledgeVault } from '@/lib/rally-data'
import { db } from '@/lib/db'

// GET /api/rally/sync-campaigns — Return current sync status
export async function GET() {
  try {
    const master = getMaster()
    const vault = getKnowledgeVault()

    const active = master?.active_campaign
    const history = master?.campaign_history || []

    // Collect all file-based contract addresses
    const fileAddresses: string[] = []
    if (active?.contract_address) {
      fileAddresses.push(active.contract_address.toLowerCase())
    }
    for (const h of history) {
      if (h.contract_address) {
        fileAddresses.push(h.contract_address.toLowerCase())
      }
    }

    // Check which are already in the DB
    const rallyCampaign = (db as any).rallyCampaign
    let syncedCount = 0
    let missingCount = 0
    const details: { address: string; inDb: boolean; source: string }[] = []

    if (rallyCampaign && typeof rallyCampaign.findMany === 'function') {
      const dbCampaigns = await rallyCampaign.findMany({
        where: { source: 'file_sync' },
        select: { contractAddress: true },
      })

      const dbAddressSet = new Set(
        dbCampaigns
          .filter((c: any) => c.contractAddress)
          .map((c: any) => c.contractAddress.toLowerCase())
      )

      for (const addr of fileAddresses) {
        const inDb = dbAddressSet.has(addr)
        if (inDb) syncedCount++
        else missingCount++
        details.push({ address: addr, inDb, source: inDb ? 'file_sync' : 'file_only' })
      }
    } else {
      missingCount = fileAddresses.length
      for (const addr of fileAddresses) {
        details.push({ address: addr, inDb: false, source: 'file_only' })
      }
    }

    // Total DB campaigns with source file_sync
    let totalDbSynced = 0
    try {
      if (rallyCampaign && typeof rallyCampaign.count === 'function') {
        totalDbSynced = await rallyCampaign.count({ where: { source: 'file_sync' } })
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      status: 'ok',
      syncStatus: {
        fileBasedCampaigns: fileAddresses.length,
        syncedToDb: syncedCount,
        missingFromDb: missingCount,
        totalDbSynced,
      },
      details,
    })
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/rally/sync-campaigns — Sync file-based campaigns into DB
export async function POST() {
  try {
    const master = getMaster()
    const vault = getKnowledgeVault()

    if (!master) {
      return NextResponse.json(
        { error: 'rally_master.json not found or invalid' },
        { status: 404 }
      )
    }

    const rallyCampaign = (db as any).rallyCampaign
    if (!rallyCampaign || typeof rallyCampaign.upsert !== 'function') {
      return NextResponse.json(
        { error: 'RallyCampaign model not available in Prisma client' },
        { status: 500 }
      )
    }

    // Build vault lookup by contract_address (case-insensitive)
    const vaultCampaigns: Record<string, any> = {}
    if (vault?.campaigns) {
      for (const vc of vault.campaigns) {
        if (vc.contract_address) {
          vaultCampaigns[vc.contract_address.toLowerCase()] = vc
        }
      }
    }

    const results = {
      active: { created: 0, updated: 0, skipped: 0 },
      history: { created: 0, updated: 0, skipped: 0 },
      total: 0,
      errors: [] as string[],
    }

    // ── Sync Active Campaign ────────────────────────────────────────────
    const active = master.active_campaign
    if (active && active.contract_address) {
      try {
        const addr = active.contract_address
        const missions = active.missions || []

        // Check if active campaign has expired
        const activeEndDate = active.end_date ? new Date(active.end_date) : null
        const isExpired = activeEndDate !== null && activeEndDate < new Date()
        const effectiveStatus = isExpired ? 'ended' : 'active'
        const effectiveIsActive = !isExpired

        // Collect all rules across missions (deduped)
        const allRules: string[] = []
        const allAngles: string[] = []
        for (const m of missions) {
          if (m.rules) {
            for (const r of m.rules) {
              if (!allRules.includes(r)) allRules.push(r)
            }
          }
          if (m.proposed_angles) {
            for (const a of m.proposed_angles) {
              if (!allAngles.includes(a)) allAngles.push(a)
            }
          }
        }

        // Serialize missions: keep pipeline-relevant fields only
        const missionsPayload = missions.map((m: any) => ({
          id: m.id,
          title: m.title,
          directive: m.directive,
          description: m.description || '',
          reward: m.reward || '',
          rules: m.rules || [],
          proposed_angles: m.proposed_angles || [],
          active: m.active ?? true,
          status: m.status || 'built',
          build_count: m.build_count || 0,
        }))

        // Build extra data JSON with fields not stored in dedicated columns
        const extraData: Record<string, any> = {}
        if (active.campaign_id) extraData.campaign_id = active.campaign_id
        if (active.reward_token) extraData.reward_token = active.reward_token
        if (active.reward_chain_id) extraData.reward_chain_id = active.reward_chain_id
        if (active.header_image_url) extraData.header_image_url = active.header_image_url
        if (active.display_creator) extraData.display_creator = active.display_creator
        if (active.data_completeness !== undefined) extraData.data_completeness = active.data_completeness
        if (active.data_source) extraData.data_source = active.data_source
        if (active.creator_address) extraData.creator_address = active.creator_address
        if (active.minimum_followers !== undefined) extraData.minimum_followers = active.minimum_followers
        if (active.gas_payment_verification !== undefined) extraData.gas_payment_verification = active.gas_payment_verification
        if (active.num_shards) extraData.num_shards = active.num_shards
        if (active.gate_weights) extraData.gate_weights = active.gate_weights
        if (active.metric_weights) extraData.metric_weights = active.metric_weights
        if (active.last_synced_at) extraData.last_synced_at = active.last_synced_at
        if (active.last_synced_submission_count !== undefined) extraData.last_synced_submission_count = active.last_synced_submission_count

        // Check if this campaign already exists in DB (to determine created vs updated)
        const existing = await rallyCampaign.findUnique({
          where: { id: addr },
        })

        await rallyCampaign.upsert({
          where: { id: addr },
          create: {
            id: addr,
            title: active.title || 'Untitled Campaign',
            contractAddress: addr,
            campaignUrl: active.campaign_url || '',
            creator: active.creator || active.display_creator?.display_name || '',
            xUsername: active.x_username || active.display_creator?.x_username || '',
            rewardPool: active.reward_pool || '',
            startDate: active.start_date || '',
            endDate: active.end_date || '',
            status: effectiveStatus,
            description: active.goal || '',
            source: 'file_sync',
            isActive: effectiveIsActive,
            missionsJson: missions.length > 0 ? JSON.stringify(missionsPayload) : null,
            knowledgeBase: active.knowledge_base || '',
            proposedAnglesJson: allAngles.length > 0 ? JSON.stringify(allAngles) : null,
            rulesJson: allRules.length > 0 ? JSON.stringify(allRules) : null,
            style: active.style || '',
            goal: active.goal || '',
            dataJson: Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : null,
          },
          update: {
            title: active.title || 'Untitled Campaign',
            contractAddress: addr,
            campaignUrl: active.campaign_url || '',
            creator: active.creator || active.display_creator?.display_name || '',
            xUsername: active.x_username || active.display_creator?.x_username || '',
            rewardPool: active.reward_pool || '',
            startDate: active.start_date || '',
            endDate: active.end_date || '',
            status: effectiveStatus,
            description: active.goal || '',
            source: 'file_sync',
            isActive: effectiveIsActive,
            missionsJson: missions.length > 0 ? JSON.stringify(missionsPayload) : undefined,
            knowledgeBase: active.knowledge_base || '',
            proposedAnglesJson: allAngles.length > 0 ? JSON.stringify(allAngles) : undefined,
            rulesJson: allRules.length > 0 ? JSON.stringify(allRules) : undefined,
            style: active.style || '',
            goal: active.goal || '',
            dataJson: Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : null,
          },
        })

        if (existing) {
          results.active.updated++
        } else {
          results.active.created++
        }
        results.total++
      } catch (err: any) {
        results.errors.push(`Active campaign: ${err.message || String(err)}`)
        results.active.skipped++
      }
    }

    // ── Sync Campaign History ───────────────────────────────────────────
    const history = master.campaign_history || []
    for (const h of history) {
      if (!h.contract_address) {
        results.history.skipped++
        results.errors.push(`History entry "${h.title || 'unknown'}" has no contract_address, skipped.`)
        continue
      }

      try {
        const addr = h.contract_address
        const addrLower = addr.toLowerCase()
        const vc = vaultCampaigns[addrLower] || {}

        // Extract x_username from creator string like "Rally (@RallyOnChain)"
        const creatorMatch = (h.creator || '').match(/\(@(\w+)\)/)
        const xUsername = creatorMatch
          ? creatorMatch[1]
          : (vc.creator?.match(/\(@(\w+)\)/)?.[1] || '')

        // Build missions from history + vault data
        const missionsPayload: any[] = []
        if (vc.mission || h.total_missions) {
          missionsPayload.push({
            id: 0,
            title: vc.mission || h.title || 'Mission',
            directive: vc.mission || '',
            description: '',
            reward: vc.reward || h.reward_pool || '',
            rules: [],
            proposed_angles: [],
            active: false,
            status: 'completed',
            build_count: vc.cycles_needed || 0,
          })
        }

        // Collect rules from vault if available (from techniques)
        const rulesFromVault: string[] = []
        if (vc.techniques_that_worked?.length) {
          rulesFromVault.push(...vc.techniques_that_worked)
        }

        // Build knowledge base from vault
        const knowledgeBaseParts: string[] = []
        if (vc.mission) knowledgeBaseParts.push(`Mission: ${vc.mission}`)
        if (vc.winning_angle) knowledgeBaseParts.push(`Winning Angle: ${vc.winning_angle}`)
        if (vc.winning_hook) knowledgeBaseParts.push(`Winning Hook: ${vc.winning_hook}`)
        if (vc.key_winning_elements?.length) {
          knowledgeBaseParts.push(`Key Elements: ${vc.key_winning_elements.join('; ')}`)
        }
        if (vc.techniques_that_worked?.length) {
          knowledgeBaseParts.push(`Working Techniques: ${vc.techniques_that_worked.join('; ')}`)
        }
        if (vc.techniques_that_failed?.length) {
          knowledgeBaseParts.push(`Failed Techniques: ${vc.techniques_that_failed.join('; ')}`)
        }
        if (vc.score_distribution_observed) {
          const sd = vc.score_distribution_observed
          knowledgeBaseParts.push(
            `Score Distribution: avg=${sd.avg_score}, perfect_18=${sd.perfect_18_count}, submissions_analyzed=${sd.submissions_analyzed}`
          )
        }
        if (vc.rally_actual_breakdown) {
          const bd = vc.rally_actual_breakdown
          knowledgeBaseParts.push(
            `Rally Score Breakdown: ${Object.entries(bd).map(([k, v]) => `${k}=${v}`).join(', ')}`
          )
        }

        // Build proposed angles from vault
        const anglesFromVault: string[] = []
        if (vc.winning_angle) anglesFromVault.push(vc.winning_angle)
        if (vc.techniques_that_worked) {
          for (const t of vc.techniques_that_worked) {
            if (!anglesFromVault.includes(t)) anglesFromVault.push(t)
          }
        }

        // Build extra data JSON
        const extraData: Record<string, any> = {}
        if (h.campaign_id) extraData.campaign_id = h.campaign_id
        if (vc.campaign_id) extraData.campaign_id = vc.campaign_id
        extraData.total_missions = h.total_missions || 0
        extraData.missions_completed = h.missions_completed || 0
        extraData.best_avg_score = h.best_avg_score ?? null
        extraData.total_portfolio_items = h.total_portfolio_items || 0
        if (vc.final_score !== undefined) extraData.final_score = vc.final_score
        if (vc.rally_actual_score !== undefined) extraData.rally_actual_score = vc.rally_actual_score
        if (vc.rally_actual_breakdown) extraData.rally_actual_breakdown = vc.rally_actual_breakdown
        if (vc.achieved_18_18 !== undefined) extraData.achieved_18_18 = vc.achieved_18_18
        if (vc.cycles_needed) extraData.cycles_needed = vc.cycles_needed
        if (vc.feedback_iterations) extraData.feedback_iterations = vc.feedback_iterations
        if (vc.winning_variation) extraData.winning_variation = vc.winning_variation
        if (vc.winning_hook) extraData.winning_hook = vc.winning_hook
        if (vc.key_winning_elements) extraData.key_winning_elements = vc.key_winning_elements
        if (vc.failing_dimensions_history) extraData.failing_dimensions_history = vc.failing_dimensions_history
        if (vc.techniques_that_worked) extraData.techniques_that_worked = vc.techniques_that_worked
        if (vc.techniques_that_failed) extraData.techniques_that_failed = vc.techniques_that_failed
        if (vc.techniques_validated_by_rally) extraData.techniques_validated_by_rally = vc.techniques_validated_by_rally
        if (vc.overused_hooks_found) extraData.overused_hooks_found = vc.overused_hooks_found
        if (vc.score_distribution_observed) extraData.score_distribution_observed = vc.score_distribution_observed
        if (vc.calibration) extraData.calibration = vc.calibration
        if (vc.qna_generated) extraData.qna_generated = vc.qna_generated
        if (vc.qna_count) extraData.qna_count = vc.qna_count

        // Check existing
        const existing = await rallyCampaign.findUnique({
          where: { id: addr },
        })

        const campaignUrl = h.contract_address
          ? `https://app.rally.fun/campaigns/${h.contract_address}`
          : ''

        await rallyCampaign.upsert({
          where: { id: addr },
          create: {
            id: addr,
            title: h.title || 'Untitled Campaign',
            contractAddress: addr,
            campaignUrl,
            creator: h.creator || vc.creator || '',
            xUsername,
            rewardPool: vc.reward || h.reward_pool || '',
            startDate: h.set_at || '',
            endDate: '',
            status: 'ended',
            description: vc.mission || '',
            source: 'file_sync',
            isActive: false,
            missionsJson: missionsPayload.length > 0 ? JSON.stringify(missionsPayload) : null,
            knowledgeBase: knowledgeBaseParts.length > 0 ? knowledgeBaseParts.join('\n\n') : null,
            proposedAnglesJson: anglesFromVault.length > 0 ? JSON.stringify(anglesFromVault) : null,
            rulesJson: rulesFromVault.length > 0 ? JSON.stringify(rulesFromVault) : null,
            style: '',
            goal: vc.mission || '',
            dataJson: JSON.stringify(extraData),
          },
          update: {
            title: h.title || 'Untitled Campaign',
            contractAddress: addr,
            campaignUrl,
            creator: h.creator || vc.creator || '',
            xUsername,
            rewardPool: vc.reward || h.reward_pool || '',
            startDate: h.set_at || '',
            endDate: '',
            status: 'ended',
            description: vc.mission || '',
            source: 'file_sync',
            isActive: false,
            missionsJson: missionsPayload.length > 0 ? JSON.stringify(missionsPayload) : undefined,
            knowledgeBase: knowledgeBaseParts.length > 0 ? knowledgeBaseParts.join('\n\n') : undefined,
            proposedAnglesJson: anglesFromVault.length > 0 ? JSON.stringify(anglesFromVault) : undefined,
            rulesJson: rulesFromVault.length > 0 ? JSON.stringify(rulesFromVault) : undefined,
            style: '',
            goal: vc.mission || '',
            dataJson: JSON.stringify(extraData),
          },
        })

        if (existing) {
          results.history.updated++
        } else {
          results.history.created++
        }
        results.total++
      } catch (err: any) {
        results.errors.push(`History "${h.title || h.contract_address}": ${err.message || String(err)}`)
        results.history.skipped++
      }
    }

    return NextResponse.json({
      status: 'ok',
      message: `Synced ${results.total} campaigns (${results.active.created + results.history.created} created, ${results.active.updated + results.history.updated} updated)`,
      results,
    })
  } catch (error) {
    console.error('Sync campaigns error:', error)
    return NextResponse.json(
      { error: 'Failed to sync campaigns', details: String(error) },
      { status: 500 }
    )
  }
}
