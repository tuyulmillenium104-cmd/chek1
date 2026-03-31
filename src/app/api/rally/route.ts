import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const QUEUE_DIR = '/home/z/my-project/rally-jobs/queue';

// POST /api/rally - Submit a new job to the queue with full campaign context
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignData, missionIndex, leaderboardData } = body;

    if (!campaignData) {
      return NextResponse.json({ error: 'campaignData is required' }, { status: 400 });
    }

    const jobId = crypto.randomUUID().slice(0, 8);
    const mission = campaignData.missions?.[missionIndex || 0] || null;

    const job = {
      id: jobId,
      type: 'rally-content-generation',
      status: 'queued',
      createdAt: Date.now(),
      // Full campaign context for the cron processor
      campaignData: {
        title: campaignData.title,
        goal: campaignData.goal,
        style: campaignData.style,
        rules: campaignData.rules,
        knowledgeBase: campaignData.knowledgeBase,
        adminNotice: campaignData.adminNotice,
        displayCreator: campaignData.displayCreator,
        intelligentContractAddress: campaignData.intelligentContractAddress,
        campaignRewards: campaignData.campaignRewards,
        gateWeights: campaignData.gateWeights,
        metricWeights: campaignData.metricWeights,
      },
      mission: mission ? {
        title: mission.title,
        description: mission.description,
        rules: mission.rules,
        style: mission.style,
        contentType: mission.contentType,
        characterLimit: mission.characterLimit,
      } : null,
      missionIndex: missionIndex || 0,
      leaderboardData: leaderboardData || null,
    };

    await writeFile(path.join(QUEUE_DIR, `${jobId}.json`), JSON.stringify(job, null, 2));
    console.log(`[RALLY] Job ${jobId} queued — Campaign: ${campaignData.title}, Mission: ${mission?.title || 'N/A'}`);

    return NextResponse.json({
      success: true,
      jobId,
      status: 'queued',
      campaign: campaignData.title,
      mission: mission?.title,
    });
  } catch (error: any) {
    console.error('[RALLY QUEUE ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
