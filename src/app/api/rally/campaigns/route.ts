import { NextResponse } from 'next/server'
import { getMaster, getKnowledgeVault } from '@/lib/rally-data'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const master = getMaster()

    const vault = getKnowledgeVault()
    const active = master?.active_campaign
    const history = master?.campaign_history || []
    const cronConfig = master?.cron_config || {}

    // Build vault campaign lookup by contract_address
    const vaultCampaigns: Record<string, any> = {}
    if (vault?.campaigns) {
      for (const vc of vault.campaigns) {
        if (vc.contract_address) {
          vaultCampaigns[vc.contract_address.toLowerCase()] = vc
        }
      }
    }

    // ── Step 1: Fetch all DB campaigns upfront (including file_sync ones) ──
    let allDbCampaigns: any[] = []
    try {
      const rallyCampaign = (db as any).rallyCampaign
      if (rallyCampaign && typeof rallyCampaign.findMany === 'function') {
        allDbCampaigns = await rallyCampaign.findMany({
          orderBy: { createdAt: 'desc' },
        })
      }
    } catch {
      allDbCampaigns = []
    }

    // Build sets of contract addresses and titles that exist in DB (any source)
    // Used to skip file-based campaigns that are already in DB
    const dbAllAddresses = new Set(
      allDbCampaigns
        .filter((dc: any) => dc.contractAddress)
        .map((dc: any) => dc.contractAddress.toLowerCase())
    )
    const dbAllTitles = new Set(
      allDbCampaigns
        .filter((dc: any) => dc.title)
        .map((dc: any) => dc.title.toLowerCase().trim())
    )

    const campaigns: any[] = []

    // ── Step 2: Process file-based campaigns, skipping those already in DB as file_sync ──

    // Active campaign from file
    if (active) {
      const activeAddr = active.contract_address?.toLowerCase()
      // Skip if this active campaign is already in DB (from any source)
      const isSynced = activeAddr && dbAllAddresses.has(activeAddr)

      if (!isSynced) {
        const missions = active.missions || []
        const bestScore = missions[0]?.best_content?.score ?? null

        // Check if vault has additional data for active campaign
        const vaultData = vaultCampaigns[activeAddr]

        // Check if campaign has expired
        const endDate = active.end_date ? new Date(active.end_date) : null
        const isExpired = endDate !== null && endDate < new Date()

        campaigns.push({
          id: active.contract_address, // Always use contract_address for consistency with DB sync
          title: active.title,
          contractAddress: active.contract_address,
          creator: active.creator || active.display_creator?.display_name || 'Unknown',
          xUsername: active.x_username || active.display_creator?.x_username || '',
          rewardPool: active.reward_pool || 'N/A',
          startDate: active.start_date || '',
          endDate: active.end_date || '',
          totalMissions: missions.length,
          bestScore,
          missions: missions.map((m: any) => ({
            id: m.id,
            title: m.title,
            directive: m.directive,
            reward: m.reward,
            status: m.status,
            buildCount: m.build_count || 0,
            contentCount: m.portfolio?.length || 0,
          })),
          isActive: isExpired ? false : true,
          status: isExpired ? 'ended' : (active.status || 'active'),
          dataCompleteness: active.data_completeness || 0,
          campaignUrl: active.campaign_url || '',
          source: 'file',
          // Additional fields from active campaign data
          description: active.goal || active.style || '',
          headerImageUrl: active.header_image_url || '',
          rewardToken: active.reward_token || '',
          rewardChainId: active.reward_chain_id || null,
          minimumFollowers: active.minimum_followers || 0,
          knowledgeBase: active.knowledge_base || '',
          rules: missions[0]?.rules || [],
          proposedAngles: missions[0]?.proposed_angles || [],
        })
      }
    }

    // Historical campaigns from file — skip if already synced to DB
    for (const h of history) {
      const addr = h.contract_address?.toLowerCase()
      const isSyncedByAddr = addr && dbAllAddresses.has(addr)
      const isSyncedByTitle = h.title && dbAllTitles.has(h.title.toLowerCase().trim())

      // Skip if this historical campaign is already in DB (from any source)
      if (isSyncedByAddr || isSyncedByTitle) continue

      const vc = vaultCampaigns[addr] || {}

      // Extract x_username from creator string like "Rally (@RallyOnChain)"
      const creatorMatch = (h.creator || '').match(/\(@(\w+)\)/)
      const xUsername = creatorMatch ? creatorMatch[1] : (vc.creator?.match(/\(@(\w+)\)/)?.[1] || '')

      // Calculate data completeness based on available fields
      let completenessPoints = 0
      const totalPoints = 12
      if (h.title) completenessPoints++
      if (h.contract_address) completenessPoints++
      if (h.creator) completenessPoints++
      if (vc.reward) completenessPoints++
      if (vc.mission) completenessPoints++
      if (vc.final_score !== undefined) completenessPoints++
      if (vc.rally_actual_score !== undefined) completenessPoints++
      if (vc.winning_angle) completenessPoints++
      if (vc.winning_hook) completenessPoints++
      if (vc.techniques_that_worked?.length) completenessPoints++
      if (vc.calibration) completenessPoints++
      if (vc.key_winning_elements?.length) completenessPoints++
      const dataCompleteness = Math.round((completenessPoints / totalPoints) * 100)

      // Build mission from vault data
      const missionFromVault = vc.mission ? [{
        id: 0,
        title: vc.mission,
        directive: '',
        reward: vc.reward || '',
        status: 'completed',
        buildCount: vc.cycles_needed || 0,
        contentCount: vc.achieved_18_18 ? 1 : 0,
      }] : []

      campaigns.push({
        id: h.contract_address, // Always use contract_address for consistency with DB sync
        title: h.title,
        contractAddress: h.contract_address,
        creator: h.creator || 'Unknown',
        xUsername,
        rewardPool: vc.reward || 'N/A',
        startDate: h.set_at || '',
        endDate: '',
        status: h.status || 'ended',
        isActive: false,
        totalMissions: h.total_missions || (vc.mission ? 1 : 0),
        bestScore: h.best_avg_score ?? vc.final_score ?? null,
        missions: missionFromVault,
        dataCompleteness,
        campaignUrl: h.contract_address ? `https://app.rally.fun/campaigns/${h.contract_address}` : '',
        source: 'file',
        // Rich vault data
        vaultData: vc ? {
          mission: vc.mission || '',
          rallyActualScore: vc.rally_actual_score ?? null,
          rallyActualBreakdown: vc.rally_actual_breakdown || null,
          achieved18_18: vc.achieved_18_18 || false,
          cyclesNeeded: vc.cycles_needed || 0,
          feedbackIterations: vc.feedback_iterations || 0,
          winningAngle: vc.winning_angle || '',
          winningVariation: vc.winning_variation || '',
          winningHook: vc.winning_hook || '',
          keyWinningElements: vc.key_winning_elements || [],
          failingDimensionsHistory: vc.failing_dimensions_history || [],
          techniquesThatWorked: vc.techniques_that_worked || [],
          techniquesThatFailed: vc.techniques_that_failed || [],
          techniquesValidatedByRally: vc.techniques_validated_by_rally || null,
          overusedHooksFound: vc.overused_hooks_found || [],
          scoreDistributionObserved: vc.score_distribution_observed || null,
          calibration: vc.calibration || null,
          qnaGenerated: vc.qna_generated || false,
          qnaCount: vc.qna_count || 0,
        } : null,
      })
    }

    // ── Step 3: Build existing addresses/titles set from file campaigns for dedup ──
    const existingAddresses = new Set(
      campaigns
        .filter(c => c.contractAddress)
        .map(c => c.contractAddress.toLowerCase())
    )
    const existingTitles = new Set(
      campaigns.map(c => c.title.toLowerCase().trim())
    )

    // ── Step 4: Add DB campaigns (file_sync + rally_live + manual) ──
    for (const dc of allDbCampaigns) {
      // file_sync and rally_live campaigns were already used to skip file-based ones,
      // so always include them (they replace the file versions).
      // For manual campaigns: skip if a file-based campaign with same address/title exists.
      if (dc.source === 'manual') {
        if (dc.contractAddress && existingAddresses.has(dc.contractAddress.toLowerCase())) {
          continue
        }
        if (dc.title && existingTitles.has(dc.title.toLowerCase().trim())) {
          continue
        }
      }

      // Parse extra JSON data if available
      let extraData: any = {}
      if (dc.dataJson) {
        try {
          extraData = JSON.parse(dc.dataJson)
        } catch {
          extraData = {}
        }
      }

      // Calculate data completeness for DB campaigns
      let completenessPoints = 0
      const totalPoints = 12
      if (dc.title) completenessPoints++
      if (dc.creator) completenessPoints++
      if (dc.rewardPool) completenessPoints++
      if (dc.startDate || dc.endDate) completenessPoints++
      if (dc.description) completenessPoints++
      if (dc.contractAddress) completenessPoints++
      if (dc.knowledgeBase) completenessPoints++
      if (dc.rulesJson) completenessPoints++
      if (dc.proposedAnglesJson) completenessPoints++
      if (dc.missionsJson) completenessPoints++
      if (dc.style) completenessPoints++
      if (dc.goal) completenessPoints++
      const dataCompleteness = Math.round((completenessPoints / totalPoints) * 100)

      // For file_sync and rally_live campaigns, enrich with vault data
      let vaultDataForDb: any = null
      if ((dc.source === 'file_sync' || dc.source === 'rally_live') && dc.contractAddress) {
        const vc = vaultCampaigns[dc.contractAddress.toLowerCase()]
        if (vc) {
          vaultDataForDb = {
            mission: vc.mission || '',
            rallyActualScore: vc.rally_actual_score ?? null,
            rallyActualBreakdown: vc.rally_actual_breakdown || null,
            achieved18_18: vc.achieved_18_18 || false,
            cyclesNeeded: vc.cycles_needed || 0,
            feedbackIterations: vc.feedback_iterations || 0,
            winningAngle: vc.winning_angle || '',
            winningVariation: vc.winning_variation || '',
            winningHook: vc.winning_hook || '',
            keyWinningElements: vc.key_winning_elements || [],
            failingDimensionsHistory: vc.failing_dimensions_history || [],
            techniquesThatWorked: vc.techniques_that_worked || [],
            techniquesThatFailed: vc.techniques_that_failed || [],
            techniquesValidatedByRally: vc.techniques_validated_by_rally || null,
            overusedHooksFound: vc.overused_hooks_found || [],
            scoreDistributionObserved: vc.score_distribution_observed || null,
            calibration: vc.calibration || null,
            qnaGenerated: vc.qna_generated || false,
            qnaCount: vc.qna_count || 0,
          }
        }
      }

      // Parse missions from missionsJson for DB campaigns
      let parsedMissions: any[] = []
      if (dc.missionsJson) {
        try {
          parsedMissions = JSON.parse(dc.missionsJson).map((m: any) => ({
            id: m.id,
            title: m.title,
            directive: m.directive,
            reward: m.reward || '',
            status: m.status || 'built',
            buildCount: m.build_count || 0,
            contentCount: 0,
          }))
        } catch {
          parsedMissions = []
        }
      }

      // Parse rules and proposed angles for display
      let parsedRules: string[] = []
      if (dc.rulesJson) {
        try { parsedRules = JSON.parse(dc.rulesJson) } catch { parsedRules = [] }
      }
      let parsedAngles: string[] = []
      if (dc.proposedAnglesJson) {
        try { parsedAngles = JSON.parse(dc.proposedAnglesJson) } catch { parsedAngles = [] }
      }

      // Extract bestScore from missions data
      let bestScoreFromMissions: number | null = null
      if (parsedMissions.length > 0) {
        for (const m of parsedMissions) {
          // bestScore might be in extraData from file_sync
          if (!bestScoreFromMissions && m.buildCount > 0) {
            bestScoreFromMissions = extraData.best_avg_score ?? extraData.final_score ?? extraData.rally_actual_score ?? null
          }
        }
      }

      // Check if DB campaign has expired
      const dbEndDate = dc.endDate ? new Date(dc.endDate) : null
      const dbIsExpired = dbEndDate !== null && dbEndDate < new Date()

      campaigns.push({
        id: dc.id,
        title: dc.title,
        contractAddress: dc.contractAddress || '',
        creator: dc.creator || 'Unknown',
        xUsername: dc.xUsername || '',
        rewardPool: dc.rewardPool || 'N/A',
        startDate: dc.startDate || '',
        endDate: dc.endDate || '',
        status: dbIsExpired ? 'ended' : (dc.status || 'active'),
        totalMissions: parsedMissions.length > 0 ? parsedMissions.length : 0,
        bestScore: bestScoreFromMissions ?? extraData.best_avg_score ?? extraData.final_score ?? null,
        missions: parsedMissions,
        isActive: dbIsExpired ? false : dc.isActive,
        dataCompleteness,
        campaignUrl: dc.campaignUrl || '',
        source: 'db',
        dbSource: dc.source || 'manual',
        dbId: dc.id,
        description: dc.description || dc.goal || '',
        vaultData: vaultDataForDb,
        // Display fields — extract from extra data (rally_live sync stores these in dataJson)
        headerImageUrl: extraData.header_image_url || '',
        rewardToken: extraData.reward_token || '',
        minimumFollowers: extraData.minimum_followers || 0,
        knowledgeBase: dc.knowledgeBase || '',
        rules: parsedRules,
        proposedAngles: parsedAngles,
        // Pipeline-required fields (for generator tab)
        missionsJson: dc.missionsJson || null,
        proposedAnglesJson: dc.proposedAnglesJson || null,
        rulesJson: dc.rulesJson || null,
        style: dc.style || null,
        goal: dc.goal || null,
      })
    }

    // Get cron jobs from DB
    let cronJobs: any[] = []
    try {
      const rallyCronJob = (db as any).rallyCronJob
      if (rallyCronJob && typeof rallyCronJob.findMany === 'function') {
        cronJobs = await rallyCronJob.findMany({
          where: { status: { not: 'deleted' } },
          orderBy: { createdAt: 'desc' },
        })
      }
    } catch {
      cronJobs = []
    }

    // Sort campaigns: active first, then by dataCompleteness desc
    campaigns.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      if (b.dataCompleteness !== a.dataCompleteness) return b.dataCompleteness - a.dataCompleteness
      return (b.totalMissions || 0) - (a.totalMissions || 0)
    })

    return NextResponse.json({
      campaigns,
      cronConfig: {
        buildJobId: cronConfig.build_job_id || null,
        buildSchedule: cronConfig.build_schedule || null,
        buildStatus: cronConfig.build_status || null,
        monitorJobId: cronConfig.monitor_job_id || null,
        monitorSchedule: cronConfig.monitor_schedule || null,
        monitorStatus: cronConfig.monitor_status || null,
        timezone: cronConfig.timezone || 'Asia/Jakarta',
        campaignAddress: cronConfig.campaign_address || null,
      },
      cronJobs,
      pipelineState: master?.pipeline_state || {},
    })
  } catch (error) {
    console.error('Campaigns API error:', error)
    return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 })
  }
}
