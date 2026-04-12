import { NextResponse } from 'next/server'

const RALLY_API_BASE = 'https://app.rally.fun/api/campaigns'

/**
 * GET /api/rally/fetch-campaign-detail?address=0x...
 * Fetches FULL campaign detail from Rally.fun API including missions, rules, style, knowledgeBase, etc.
 * 
 * Query params:
 *   address: contract address (intelligentContractAddress)
 * 
 * Returns: Full campaign detail object
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: 'Missing required parameter: address' },
        { status: 400 }
      )
    }

    // Fetch campaign detail from Rally API
    const res = await fetch(`${RALLY_API_BASE}/${address}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Rally API returned ${res.status}`, details: await res.text() },
        { status: res.status }
      )
    }

    const campaign = await res.json()

    // Normalize missions for dashboard use
    const missions = (campaign.missions || []).map((m: any, idx: number) => ({
      id: idx,
      rallyMissionId: m.id,
      title: m.title,
      description: m.description,
      rules: typeof m.rules === 'string'
        ? m.rules.split('\n').map((r: string) => r.trim()).filter(Boolean)
        : Array.isArray(m.rules) ? m.rules : [],
      active: m.active ?? true,
      directive: m.description?.split('\n')[0]?.substring(0, 200) || '',
      // Extract proposed angles from description (usually in **Proposed angles:** section)
      proposedAngles: extractProposedAngles(m.description || ''),
      reward: formatCampaignRewards(campaign.campaignRewards, campaign.token),
    }))

    // Extract key fields from the full campaign
    const detail = {
      // Core identification
      rallyId: campaign.id,
      contractAddress: campaign.intelligentContractAddress,
      title: campaign.title,
      campaignUrl: `https://app.rally.fun/campaigns/${campaign.intelligentContractAddress}`,

      // Campaign brief data (from Rally API — matches skill doc's Data Fortress)
      goal: campaign.goal || '',
      knowledgeBase: campaign.knowledgeBase || '',
      style: campaign.style || '',
      rules: typeof campaign.rules === 'string'
        ? campaign.rules.split('\n').map((r: string) => r.trim()).filter(Boolean)
        : Array.isArray(campaign.rules) ? campaign.rules : [],

      // Missions (full detail)
      missions,

      // Creator info
      creator: campaign.displayCreator?.displayName || 'Unknown',
      xUsername: campaign.displayCreator?.xUsername || '',
      avatarUrl: campaign.displayCreator?.avatarUrl || '',
      creatorProfileUrl: campaign.displayCreator?.profileUrl || '',

      // Reward info
      tokenSymbol: campaign.token?.symbol || '',
      tokenAddress: campaign.tokenAddress || '',
      tokenPrice: campaign.token?.usdPrice || null,
      totalReward: campaign.campaignRewards?.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0) || 0,
      rewardBreakdown: (campaign.campaignRewards || []).map((r: any) => ({
        amount: r.totalAmount,
        token: r.token?.symbol || campaign.token?.symbol || '',
        source: r.source,
      })),

      // Dates and timing
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      periodLengthDays: campaign.periodLengthDays || 0,
      currentPeriodIndex: campaign.currentPeriodIndex || 0,

      // Requirements
      minimumFollowers: campaign.minimumFollowers || 0,
      onlyVerifiedUsers: campaign.onlyVerifiedUsers || false,
      gasPaymentVerification: campaign.gasPaymentVerification || false,
      allowOldTweets: campaign.allowOldTweets || false,

      // Scoring
      gateWeights: campaign.gateWeights || [],
      metricWeights: campaign.metricWeights || [],
      alpha: campaign.alpha || null,

      // Stats
      lastSyncedSubmissionCount: campaign.lastSyncedSubmissionCount || 0,
      lastSyncedAt: campaign.lastSyncedAt || null,
      numShards: campaign.numShards || 0,

      // Images
      headerImageUrl: campaign.headerImageUrl || '',

      // Participation status
      participating: campaign.participating || false,
      missionCount: campaign.missionCount || missions.length,
    }

    // Calculate data completeness score
    const completenessFields = [
      !!detail.title,
      !!detail.goal,
      !!detail.knowledgeBase,
      !!detail.style,
      detail.rules.length > 0,
      detail.missions.length > 0,
      !!detail.creator,
      !!detail.xUsername,
      detail.totalReward > 0,
      !!detail.startDate,
      !!detail.endDate,
      detail.gateWeights.length > 0,
    ]
    detail.dataCompleteness = Math.round((completenessFields.filter(Boolean).length / completenessFields.length) * 100)

    return NextResponse.json({
      campaign: detail,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Rally campaign detail fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign detail from Rally API', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Extract proposed angles from mission description text.
 * Rally API puts proposed angles in the description under "**Proposed angles:**" section.
 */
function extractProposedAngles(description: string): string[] {
  const angles: string[] = []
  const lines = description.split('\n')

  let inAnglesSection = false
  for (const line of lines) {
    if (line.toLowerCase().includes('proposed angles') || line.toLowerCase().includes('proposed angle')) {
      inAnglesSection = true
      continue
    }
    if (inAnglesSection) {
      // Stop at next section (starts with **)
      if (line.trim().startsWith('**') && line.includes(':')) break
      if (line.trim().startsWith('---')) break
      // Extract angle text (usually after "The '...' Angle:" pattern)
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

/**
 * Format campaign rewards into readable string
 */
function formatCampaignRewards(rewards: any[], token: any): string {
  if (!rewards?.length) return ''
  const parts = rewards.map(r => {
    const amount = r.totalAmount?.toLocaleString() || '0'
    const sym = r.token?.symbol || token?.symbol || ''
    return `${amount} ${sym}`
  })
  return parts.join(' + ')
}
