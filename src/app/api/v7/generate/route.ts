/**
 * POST /api/v7/generate
 *
 * Generate content for a campaign using data intelligence + prediction model.
 *
 * Flow:
 * 1. Load campaign & its intelligence from DB
 * 2. Load prediction model (if available)
 * 3. Run the existing pipeline (runPipeline from @/lib/pipeline)
 * 4. Run prediction model on the best content to get a predicted score
 * 5. Save generation result to DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runPipeline } from '@/lib/pipeline';
import { predictScore, extractFeatures } from '@/lib/v7/predictor';
import { getStoredIntelligence } from '@/lib/v7/analyzer';
import type { PredictionModel, ContentFeatures } from '@/lib/v7/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const { campaignId } = body || {};

    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json(
        { success: false, errorMessage: 'campaignId is required.' },
        { status: 400 }
      );
    }

    const variations = typeof body.variations === 'number'
      ? Math.min(10, Math.max(1, body.variations))
      : undefined;

    console.log(`[v7 API] Generate triggered for campaign: ${campaignId.substring(0, 8)}`);

    // 1. Load campaign from DB
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        intelligence: {
          select: {
            predictionModel: true,
            featureStats: true,
            totalSubmissions: true,
            weakCategories: true,
            strongCategories: true,
            topPatterns: true,
            averageThreshold: true,
            top10Threshold: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, errorMessage: 'Campaign not found.' },
        { status: 404 }
      );
    }

    // 2. Parse prediction model from intelligence
    let predictionModel: PredictionModel | null = null;
    if (campaign.intelligence?.predictionModel) {
      try {
        const parsed = JSON.parse(campaign.intelligence.predictionModel);
        if (campaign.intelligence.featureStats) {
          parsed.featureStats = JSON.parse(campaign.intelligence.featureStats);
        }
        predictionModel = parsed as PredictionModel;
      } catch {
        console.warn('[v7 API] Failed to parse stored prediction model');
      }
    }

    // 3. Load full intelligence for pipeline context
    const intelligence = await getStoredIntelligence(campaignId);

    // 4. Build pipeline job
    const campaignData: Record<string, unknown> = (() => {
      try {
        return typeof campaign.campaignData === 'string'
          ? JSON.parse(campaign.campaignData)
          : {};
      } catch {
        return {};
      }
    })();

    // Inject intelligence data into campaign data for pipeline
    const enrichedCampaignData = {
      ...campaignData,
      _v7Intelligence: intelligence
        ? {
            totalSubmissions: intelligence.totalSubmissions,
            totalValid: intelligence.totalValid,
            weakCategories: intelligence.weakCategories,
            strongCategories: intelligence.strongCategories,
            topPatterns: intelligence.topPatterns,
            averageThreshold: intelligence.averageThreshold,
            top10Threshold: intelligence.top10Threshold,
            categoryAverages: intelligence.categoryAverages,
          }
        : null,
    };

    // 5. Create generation result record
    const generationResult = await db.generationResult.create({
      data: {
        campaignId,
        status: 'processing',
        intelligenceSnapshot: intelligence ? JSON.stringify(intelligence) : null,
      },
    });

    const startTime = Date.now();

    try {
      // 6. Run the pipeline
      console.log(`[v7 API] Starting pipeline for campaign: ${campaign.name}`);

      const pipelineResult = await runPipeline({
        id: campaignId,
        campaignName: campaign.name,
        campaignData: enrichedCampaignData,
      });

      const processingTimeMs = Date.now() - startTime;
      let predictedScore: number | null = null;
      let scoringBreakdown: string | null = null;
      let bestContent = pipelineResult.bestContent;

      // 7. Run prediction model on best content
      if (bestContent && predictionModel) {
        try {
          predictedScore = predictScore(predictionModel, bestContent);
          console.log(`[v7 API] Predicted score: ${predictedScore}/21 (MAE=${predictionModel.mae}, R²=${predictionModel.r2})`);

          // Also extract features for the breakdown
          const features = extractFeatures(bestContent);
          scoringBreakdown = JSON.stringify({
            predictedScore,
            features,
            modelMetrics: {
              mae: predictionModel.mae,
              r2: predictionModel.r2,
              sampleCount: predictionModel.sampleCount,
            },
          });
        } catch (predError) {
          console.warn('[v7 API] Prediction failed (non-fatal):', predError);
        }
      }

      // 8. Update generation result in DB
      const finalStatus = pipelineResult.status === 'success' ? 'completed'
        : pipelineResult.status === 'partial' ? 'completed'
        : 'failed';

      await db.generationResult.update({
        where: { id: generationResult.id },
        data: {
          status: finalStatus,
          content: bestContent,
          predictedScore,
          scoringBreakdown,
          totalCycles: pipelineResult.totalCycles,
          totalVariations: pipelineResult.totalVariationsGenerated,
          totalAICalls: pipelineResult.totalAIcalls,
          processingTimeMs,
          errorMessage: pipelineResult.error ?? null,
        },
      });

      // Update campaign's lastGeneratedAt
      await db.campaign.update({
        where: { id: campaignId },
        data: { lastGeneratedAt: new Date() },
      });

      console.log(`[v7 API] Generation complete: ${finalStatus} in ${processingTimeMs}ms`);

      return NextResponse.json({
        success: true,
        generationId: generationResult.id,
        status: finalStatus,
        campaignId,
        bestContent,
        predictedScore,
        pipelineStatus: pipelineResult.status,
        totalCycles: pipelineResult.totalCycles,
        totalVariations: pipelineResult.totalVariationsGenerated,
        totalAICalls: pipelineResult.totalAIcalls,
        processingTimeMs,
        candidates: pipelineResult.candidates.length,
        modelUsed: predictionModel ? {
          mae: predictionModel.mae,
          r2: predictionModel.r2,
          sampleCount: predictionModel.sampleCount,
        } : null,
      });
    } catch (pipelineError) {
      // Pipeline itself threw — update generation result as failed
      const processingTimeMs = Date.now() - startTime;
      const errorMsg = pipelineError instanceof Error ? pipelineError.message : String(pipelineError);

      await db.generationResult.update({
        where: { id: generationResult.id },
        data: {
          status: 'failed',
          processingTimeMs,
          errorMessage: errorMsg,
        },
      });

      console.error(`[v7 API] Pipeline execution failed: ${errorMsg}`);

      return NextResponse.json({
        success: false,
        generationId: generationResult.id,
        errorMessage: errorMsg,
        processingTimeMs,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[v7 API] Generate error:', error);
    return NextResponse.json(
      { success: false, errorMessage: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
