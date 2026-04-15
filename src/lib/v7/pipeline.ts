/**
 * Rally Brain v7.0 — Data Pipeline Orchestrator
 *
 * Main entry point for the continuous data pipeline that runs 24/7.
 * Orchestrates: collection → analysis → prediction model training.
 *
 * Pipeline stages:
 * 1. Fetch campaign config from DB
 * 2. Collect new submissions from Rally.fun API (dedup against DB)
 * 3. Analyze submissions → update campaign intelligence
 * 4. Train/update prediction model (if enough data with content text)
 * 5. Log pipeline run in DB
 *
 * Error handling:
 * - Each campaign is processed independently
 * - One campaign failure never stops the pipeline
 * - All errors are logged with [v7] prefix
 * - Pipeline run results are persisted in PipelineRun table
 */

import { db } from '@/lib/db';
import { collectSubmissions, getStoredSubmissions } from './collector';
import { analyzeCampaign, getStoredIntelligence } from './analyzer';
import { trainModel } from './predictor';
import type { DataPipelineRunResult, PipelineStatus, PredictionModel } from './types';

// ─── Configuration ────────────────────────────────────────────────

const MIN_SAMPLES_FOR_MODEL = 15;
const PIPELINE_TIMEOUT_MS = 120_000; // 2 minutes per campaign

// ─── Public API ───────────────────────────────────────────────────

/**
 * Run the full data pipeline for a single campaign.
 *
 * Stages:
 * 1. Fetch campaign from DB
 * 2. Collect new submissions from Rally API
 * 3. Analyze submissions (update intelligence)
 * 4. Train/update prediction model
 * 5. Log pipeline run
 *
 * @param campaignId - Internal campaign DB ID
 * @returns Pipeline run result with stats
 */
export async function runDataPipeline(
  campaignId: string
): Promise<DataPipelineRunResult> {
  const startTime = Date.now();
  console.log(`[v7] Pipeline: starting for campaign ${campaignId.substring(0, 8)}...`);

  let submissionsFetched = 0;
  let submissionsNew = 0;
  let analysisGenerated = false;
  let modelTrained = false;
  let errorMessage: string | undefined;

  try {
    // Set timeout guard
    const pipelinePromise = executePipeline(
      campaignId
    );
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Pipeline timed out after ${PIPELINE_TIMEOUT_MS / 1000}s`)),
        PIPELINE_TIMEOUT_MS
      )
    );

    const result = await Promise.race([pipelinePromise, timeoutPromise]);

    submissionsFetched = result.submissionsFetched;
    submissionsNew = result.submissionsNew;
    analysisGenerated = result.analysisGenerated;
    modelTrained = result.modelTrained;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[v7] Pipeline: campaign ${campaignId.substring(0, 8)} FAILED: ${errorMessage}`);
  }

  const processingTimeMs = Date.now() - startTime;

  // Log pipeline run in DB
  await logPipelineRun({
    campaignId,
    runType: 'data_pipeline',
    status: errorMessage ? 'failed' : 'completed',
    submissionsFetched,
    submissionsNew,
    analysisGenerated,
    modelTrained,
    processingTimeMs,
    errorMessage,
  });

  const success = !errorMessage;
  console.log(
    `[v7] Pipeline: campaign ${campaignId.substring(0, 8)} ` +
    `${success ? '✅' : '❌'} ` +
    `${submissionsFetched} fetched, ${submissionsNew} new, ` +
    `analysis=${analysisGenerated}, model=${modelTrained} ` +
    `(${processingTimeMs}ms)`
  );

  return {
    success,
    submissionsFetched,
    submissionsNew,
    analysisGenerated,
    modelTrained,
    processingTimeMs,
    errorMessage,
  };
}

/**
 * Run the data pipeline for ALL active campaigns.
 * Each campaign is processed independently — one failure doesn't stop others.
 *
 * @returns Array of results, one per campaign
 */
export async function runFullPipeline(): Promise<DataPipelineRunResult[]> {
  console.log('[v7] Pipeline: running full pipeline for all active campaigns...');

  const campaigns = await db.campaign.findMany({
    where: {
      isActive: true,
      campaignAddress: { not: null },
    },
    select: {
      id: true,
      name: true,
      campaignAddress: true,
    },
  });

  if (campaigns.length === 0) {
    console.log('[v7] Pipeline: no active campaigns with addresses found');
    return [];
  }

  console.log(`[v7] Pipeline: processing ${campaigns.length} campaigns`);

  // Process campaigns sequentially (API rate limits)
  const results: DataPipelineRunResult[] = [];

  for (const campaign of campaigns) {
    if (!campaign.campaignAddress) continue;

    const result = await runDataPipeline(campaign.id);
    results.push(result);
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `[v7] Pipeline: full pipeline complete. ${successCount}/${campaigns.length} succeeded`
  );

  return results;
}

/**
 * Get current pipeline status — summary of recent runs and system health.
 */
export async function getPipelineStatus(): Promise<PipelineStatus> {
  const recentRuns = await db.pipelineRun.findMany({
    where: { runType: 'data_pipeline' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const totalRuns = recentRuns.length;
  const successfulRuns = recentRuns.filter((r) => r.status === 'completed').length;
  const failedRuns = recentRuns.filter((r) => r.status === 'failed').length;
  const lastRun = recentRuns[0];

  // Count unique campaigns processed
  const campaignsProcessed = new Set(
    recentRuns.filter((r) => r.campaignId).map((r) => r.campaignId!)
  ).size;

  // Count total submissions collected
  const totalSubmissionsCollected = recentRuns.reduce(
    (sum, r) => sum + r.submissionsNew,
    0
  );

  // Count models trained
  const modelsTrained = recentRuns.filter((r) => r.modelTrained).length;

  return {
    lastRunAt: lastRun?.createdAt?.toISOString() ?? null,
    lastRunSuccess: lastRun?.status === 'completed' ?? false,
    totalRuns,
    successfulRuns,
    failedRuns,
    campaignsProcessed,
    totalSubmissionsCollected,
    modelsTrained,
  };
}

// ─── Internal Pipeline Execution ──────────────────────────────────

/**
 * Execute the actual pipeline stages for a single campaign.
 * This is separated from runDataPipeline for timeout handling.
 */
async function executePipeline(
  campaignId: string
): Promise<{
  submissionsFetched: number;
  submissionsNew: number;
  analysisGenerated: boolean;
  modelTrained: boolean;
}> {
  // 1. Fetch campaign from DB
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, campaignAddress: true },
  });

  if (!campaign || !campaign.campaignAddress) {
    throw new Error(`Campaign ${campaignId} not found or has no address`);
  }

  // 2. Collect new submissions from Rally API
  console.log(`[v7] Pipeline: stage 1 — collecting submissions...`);
  const collectionResult = await collectSubmissions(
    campaign.campaignAddress,
    campaignId,
    { limit: 100 }
  );

  // 3. Analyze submissions (always re-analyze to get fresh intelligence)
  console.log(`[v7] Pipeline: stage 2 — analyzing submissions...`);
  const intelligence = await analyzeCampaign(campaignId);
  const analysisGenerated = intelligence.totalValid > 0;

  // 4. Train/update prediction model (if enough data)
  console.log(`[v7] Pipeline: stage 3 — training prediction model...`);
  let modelTrained = false;

  try {
    // Check if we have enough data with content text
    const submissions = await db.rallySubmission.findMany({
      where: {
        campaignId,
        isValid: true,
        contentText: { not: null },
      },
      select: {
        contentText: true,
        contentQualityScore: true,
      },
    });

    if (submissions.length >= MIN_SAMPLES_FOR_MODEL) {
      const trainingData = submissions
        .filter((s) => s.contentText && s.contentText.trim().length > 10)
        .map((s) => ({
          content: s.contentText!,
          score: s.contentQualityScore,
        }));

      const model = trainModel(trainingData);

      if (model) {
        // Store model in CampaignIntelligence
        await db.campaignIntelligence.update({
          where: { campaignId },
          data: {
            predictionModel: JSON.stringify({
              coefficients: model.coefficients,
              intercept: model.intercept,
              featureNames: model.featureNames,
              mae: model.mae,
              r2: model.r2,
              lastTrainedAt: model.lastTrainedAt,
              sampleCount: model.sampleCount,
            }),
            featureStats: JSON.stringify(model.featureStats),
          },
        });
        modelTrained = true;
      }
    } else {
      console.log(
        `[v7] Pipeline: skipping model training (${submissions.length} submissions with content text, need ${MIN_SAMPLES_FOR_MODEL})`
      );
    }
  } catch (error) {
    // Model training failure is non-fatal
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[v7] Pipeline: model training failed (non-fatal): ${msg}`);
  }

  return {
    submissionsFetched: collectionResult.fetched,
    submissionsNew: collectionResult.new,
    analysisGenerated,
    modelTrained,
  };
}

// ─── Pipeline Run Logging ─────────────────────────────────────────

/**
 * Log a pipeline run in the database.
 */
async function logPipelineRun(params: {
  campaignId: string;
  runType: string;
  status: string;
  submissionsFetched: number;
  submissionsNew: number;
  analysisGenerated: boolean;
  modelTrained: boolean;
  processingTimeMs: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    await db.pipelineRun.create({
      data: {
        campaignId: params.campaignId,
        runType: params.runType,
        status: params.status,
        submissionsFetched: params.submissionsFetched,
        submissionsNew: params.submissionsNew,
        analysisGenerated: params.analysisGenerated,
        modelTrained: params.modelTrained,
        processingTimeMs: params.processingTimeMs,
        errorMessage: params.errorMessage ?? null,
        runData: JSON.stringify({
          timestamp: new Date().toISOString(),
          fetched: params.submissionsFetched,
          newSubmissions: params.submissionsNew,
        }),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[v7] Pipeline: failed to log run: ${msg}`);
  }
}
