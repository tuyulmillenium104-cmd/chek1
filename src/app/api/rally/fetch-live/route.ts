import { NextResponse } from 'next/server'

const RALLY_API_BASE = 'https://app.rally.fun/api/campaigns'

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

/**
 * GET /api/rally/fetch-live?status=active
 * Fetches campaigns live from Rally.fun API
 * 
 * Query params:
 *   status: "active" | "ended" | "all" (default: "active")
 * 
 * Returns: { campaigns: [...], total: number, fetchedAt: string }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'

    const allCampaigns: RallyCampaignListItem[] = []

    // Fetch active campaigns
    if (status === 'active' || status === 'all') {
      const res = await fetch(`${RALLY_API_BASE}?status=active`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.campaigns)) {
          allCampaigns.push(...data.campaigns)
        }
      }
    }

    // Fetch ended campaigns (separate request)
    if (status === 'ended' || status === 'all') {
      const res = await fetch(`${RALLY_API_BASE}?status=ended`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.campaigns)) {
          allCampaigns.push(...data.campaigns)
        }
      }
    }

    // Normalize campaigns for frontend display
    const campaigns = allCampaigns.map((c) => {
      const totalReward = c.campaignRewards.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
      const rewardTokens = [...new Set(
        c.campaignRewards
          .map(r => r.token?.symbol || c.token?.symbol || '')
          .filter(Boolean)
      )]

      const now = new Date()
      const start = new Date(c.startDate)
      const end = new Date(c.endDate)
      const isActive = now >= start && now <= end

      return {
        rallyId: c.id,
        contractAddress: c.intelligentContractAddress,
        title: c.title,
        creator: c.displayCreator?.displayName || 'Unknown',
        xUsername: c.displayCreator?.xUsername || '',
        avatarUrl: c.displayCreator?.avatarUrl || '',
        creatorProfileUrl: c.displayCreator?.profileUrl || '',
        missionCount: c.missionCount || 0,
        totalReward,
        rewardTokens: rewardTokens.join(' + '),
        tokenSymbol: c.token?.symbol || '',
        tokenPrice: c.token?.usdPrice || null,
        startDate: c.startDate,
        endDate: c.endDate,
        isActive,
        minimumFollowers: c.minimumFollowers || 0,
        onlyVerifiedUsers: c.onlyVerifiedUsers || false,
        participating: c.participating || false,
        gasPaymentVerification: c.gasPaymentVerification || false,
        headerImageUrl: c.headerImageUrl || '',
        campaignUrl: `https://app.rally.fun/campaigns/${c.intelligentContractAddress}`,
        source: 'rally_live' as const,
      }
    })

    // Sort: active first, then by reward pool desc
    campaigns.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return b.totalReward - a.totalReward
    })

    return NextResponse.json({
      campaigns,
      total: campaigns.length,
      activeCount: campaigns.filter(c => c.isActive).length,
      endedCount: campaigns.filter(c => !c.isActive).length,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Rally live fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns from Rally API', details: String(error) },
      { status: 500 }
    )
  }
}
