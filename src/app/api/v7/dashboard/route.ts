import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPipelineStatus } from '@/lib/v7/pipeline';

export async function GET() {
  try {
    // 1. Pipeline status from recent runs
    const pipelineStatus = await getPipelineStatus();

    // 2. Campaigns with intelligence
    const campaigns = await db.campaign.findMany({
      include: {
        intelligence: true,
        generationResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const campaignsData = campaigns.map((c) => {
      let intelligence: Record<string, unknown> | null = null;
      if (c.intelligence) {
        try {
          intelligence = {
            totalSubmissions: c.intelligence.totalSubmissions,
            totalValid: c.intelligence.totalValid,
            scoreStats: JSON.parse(c.intelligence.scoreStats || '{}'),
            categoryAverages: JSON.parse(c.intelligence.categoryAverages || '[]'),
            weakCategories: JSON.parse(c.intelligence.weakCategories || '[]'),
            strongCategories: JSON.parse(c.intelligence.strongCategories || '[]'),
            topPatterns: JSON.parse(c.intelligence.topPatterns || '[]'),
            top10Threshold: c.intelligence.top10Threshold,
            top25Threshold: c.intelligence.top25Threshold,
            top50Threshold: c.intelligence.top50Threshold,
            averageThreshold: c.intelligence.averageThreshold,
          };
        } catch {
          intelligence = null;
        }
      }

      let predictionModel: Record<string, unknown> | null = null;
      if (c.intelligence?.predictionModel) {
        try {
          predictionModel = JSON.parse(c.intelligence.predictionModel);
        } catch {
          // ignore
        }
      }

      const lastGen = c.generationResults[0] ?? null;
      const lastGeneration = lastGen
        ? {
            id: lastGen.id,
            status: lastGen.status,
            predictedScore: lastGen.predictedScore,
            actualScore: lastGen.actualScore,
            processingTimeMs: lastGen.processingTimeMs,
            createdAt: lastGen.createdAt.toISOString(),
          }
        : null;

      return {
        id: c.id,
        name: c.name,
        campaignAddress: c.campaignAddress,
        isActive: c.isActive,
        intelligence,
        predictionModel,
        lastGeneration,
        lastGeneratedAt: c.lastGeneratedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      };
    });

    // 3. Top submissions per campaign (top 10 each)
    const topSubmissions: Array<Record<string, unknown>> = [];
    for (const campaign of campaigns) {
      const submissions = await db.rallySubmission.findMany({
        where: {
          campaignId: campaign.id,
          isValid: true,
        },
        orderBy: { contentQualityScore: 'desc' },
        take: 10,
      });

      topSubmissions.push(
        ...submissions.map((s) => {
          let parsedCategories: Array<Record<string, unknown>> = [];
          try {
            parsedCategories = JSON.parse(s.categoryScores || '[]');
          } catch {
            // ignore
          }
          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            id: s.id,
            xUsername: s.xUsername,
            tweetUrl: s.tweetUrl,
            contentQualityScore: s.contentQualityScore,
            contentQualityPct: s.contentQualityPct,
            categoryScores: parsedCategories,
          };
        })
      );
    }

    // 4. Recent generations
    const recentGenerations = await db.generationResult.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        campaign: {
          select: { id: true, name: true },
        },
      },
    });

    const recentGenerationsData = recentGenerations.map((g) => ({
      id: g.id,
      campaignId: g.campaignId,
      campaignName: g.campaign.name,
      status: g.status,
      predictedScore: g.predictedScore,
      actualScore: g.actualScore,
      scoreDelta: g.scoreDelta,
      processingTimeMs: g.processingTimeMs,
      antiAIScore: g.antiAIScore,
      createdAt: g.createdAt.toISOString(),
    }));

    // 5. Recent pipeline runs (last 10) — no campaign include since not a relation
    const recentPipelineRuns = await db.pipelineRun.findMany({
      where: { runType: 'data_pipeline' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentPipelineRunsData = recentPipelineRuns.map((r) => ({
      id: r.id,
      runType: r.runType,
      status: r.status,
      submissionsFetched: r.submissionsFetched,
      submissionsNew: r.submissionsNew,
      analysisGenerated: r.analysisGenerated,
      modelTrained: r.modelTrained,
      processingTimeMs: r.processingTimeMs,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      pipelineStatus,
      campaigns: campaignsData,
      topSubmissions,
      recentGenerations: recentGenerationsData,
      recentPipelineRuns: recentPipelineRunsData,
    });
  } catch (error) {
    console.error('[v7] Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data dashboard', errorMessage: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
