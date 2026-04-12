import { NextResponse } from 'next/server'
import { getMaster, getKnowledgeVault } from '@/lib/rally-data'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const master = getMaster()
    const vault = getKnowledgeVault()

    const vaultCampaigns: Record<string, any> = {}
    if (vault?.campaigns) {
      for (const vc of vault.campaigns) {
        if (vc.contract_address) {
          vaultCampaigns[vc.contract_address.toLowerCase()] = vc
        }
      }
    }

    const campaigns: any[] = []

    // Active campaign
    if (master?.active_campaign) {
      const active = master.active_campaign
      const missions = active.missions || []
      const vaultData = vaultCampaigns[active.contract_address?.toLowerCase()]
      campaigns.push({
        title: active.title,
        contractAddress: active.contract_address,
        creator: active.creator || active.display_creator?.display_name || 'Unknown',
        xUsername: active.x_username || active.display_creator?.x_username || '',
        rewardPool: active.reward_pool || 'N/A',
        rewardToken: active.reward_token || '',
        startDate: active.start_date || '',
        endDate: active.end_date || '',
        status: active.status || 'unknown',
        totalMissions: missions.length,
        bestScore: missions[0]?.best_content?.score ?? null,
        missions: missions.map((m: any) => ({
          title: m.title,
          directive: m.directive,
          reward: m.reward,
          status: m.status,
          rules: m.rules || [],
          proposedAngles: m.proposed_angles || [],
        })),
        isActive: true,
        campaignUrl: active.campaign_url || '',
        knowledgeBase: active.knowledge_base || '',
        minimumFollowers: active.minimum_followers || 0,
        vaultData: vaultData ? {
          mission: vaultData.mission,
          rallyActualScore: vaultData.rally_actual_score,
          rallyActualBreakdown: vaultData.rally_actual_breakdown,
          achieved18_18: vaultData.achieved_18_18,
          cyclesNeeded: vaultData.cycles_needed,
          winningAngle: vaultData.winning_angle,
          winningHook: vaultData.winning_hook,
          techniquesThatWorked: vaultData.techniques_that_worked,
          calibration: vaultData.calibration,
        } : null,
      })
    }

    // Historical campaigns
    for (const h of (master?.campaign_history || [])) {
      const vc = vaultCampaigns[h.contract_address?.toLowerCase()] || {}
      const creatorMatch = (h.creator || '').match(/\(@(\w+)\)/)
      const xUsername = creatorMatch ? creatorMatch[1] : ''
      campaigns.push({
        title: h.title,
        contractAddress: h.contract_address,
        creator: h.creator || 'Unknown',
        xUsername,
        rewardPool: vc.reward || 'N/A',
        startDate: h.set_at || '',
        endDate: '',
        status: h.status || 'ended',
        totalMissions: h.total_missions || (vc.mission ? 1 : 0),
        bestScore: h.best_avg_score ?? vc.final_score ?? null,
        isActive: false,
        vaultData: vc ? {
          mission: vc.mission,
          rallyActualScore: vc.rally_actual_score,
          achieved18_18: vc.achieved_18_18,
          cyclesNeeded: vc.cycles_needed,
          winningAngle: vc.winning_angle,
          winningHook: vc.winning_hook,
          techniquesThatWorked: vc.techniques_that_worked,
          calibration: vc.calibration,
        } : null,
      })
    }

    // Database campaigns
    try {
      const model = (db as any).rallyCampaign
      if (model && typeof model.findMany === 'function') {
        const dbCampaigns = await model.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
        for (const dc of dbCampaigns) {
          if (campaigns.some(c => c.contractAddress && dc.contractAddress && c.contractAddress.toLowerCase() === dc.contractAddress.toLowerCase())) continue
          campaigns.push({
            title: dc.title,
            contractAddress: dc.contractAddress || '',
            creator: dc.creator || 'Unknown',
            xUsername: dc.xUsername || '',
            rewardPool: dc.rewardPool || 'N/A',
            startDate: dc.startDate || '',
            endDate: dc.endDate || '',
            status: dc.status || 'active',
            isActive: dc.isActive,
            vaultData: null,
          })
        }
      }
    } catch {}

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '12.2',
      source: 'Rally Command Center',
      totalCampaigns: campaigns.length,
      campaigns,
    }

    return new NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': 'attachment; filename="rally-campaigns-export.json"',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Campaign export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
