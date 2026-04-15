/**
 * GET /api/v7/pipeline/status
 *
 * Returns data pipeline health and status:
 * - Last 10 pipeline runs
 * - Total submissions collected across all campaigns
 * - Campaigns that have intelligence data
 * - Prediction model status per campaign
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPipelineStatus } from '@/lib/v7/pipeline';

export async function GET() {
  try {
    console.log('[v7 API] Fetching pipeline status...');

    // Get pipeline status summary from v7 pipeline module
    const pipelineStatus = await getPipelineStatus();

    // Get last 10 pipeline runs with campaign names
    const recentRuns = await db.pipelineRun.findMany({
      where: { runType: 'data_pipeline' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        campaign: {
          select: { id: true, name: true },
        },
      },
    });

    // Format recent runs
    const formattedRuns = recentRuns.map((run) => ({
      id: run.id,
      campaignId: run.campaignId,
      campaignName: run.campaign?.name ?? 'Unknown',
      status: run.status,
      submissionsFetched: run.submissionsFetched,
      submissionsNew: run.submissionsNew,
      analysisGenerated: run.analysisGenerated,
      modelTrained: run.modelTrained,
      processingTimeMs: run.processingTimeMs,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt.toISOString(),
    }));

    // Total submissions across all campaigns
    const totalSubmissions = await db.rallySubmission.count();

    // Campaigns with intelligence data
    const campaigns = await db.campaign.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        campaignAddress: true,
        intelligence: {
          select: {
            totalSubmissions: true,
            predictionModel: true,
            lastFetchedAt: true,
            version: true,
          },
        },
      },
    });

    const campaignsIntel = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      campaignAddress: c.campaignAddress,
      hasIntelligence: !!c.intelligence,
      totalSubmissions: c.intelligence?.totalSubmissions ?? 0,
      lastFetchedAt: c.intelligence?.lastFetchedAt?.toISOString() ?? null,
      intelligenceVersion: c.intelligence?.version ?? 0,
      modelStatus: c.intelligence?.predictionModel
        ? (() => {
            try {
              const model = JSON.parse(c.intelligence.predictionModel);
              return {
                trained: true,
                mae: model.mae ?? null,
                r2: model.r2 ?? null,
                sampleCount: model.sampleCount ?? 0,
                lastTrainedAt: model.lastTrainedAt ?? null,
              };
            } catch {
              return { trained: false };
            }
          })()
        : { trained: false },
    }));

    return NextResponse.json({
      pipeline: pipelineStatus,
      recentRuns: formattedRuns,
      totalSubmissions,
      campaigns: campaignsIntel,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[v7 API] Pipeline status error:', error);
    return NextResponse.json(
      { success: false, errorMessage: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
