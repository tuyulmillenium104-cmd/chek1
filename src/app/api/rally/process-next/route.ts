/**
 * GET /api/rally/process-next
 * 
 * Processes the next queued job using the Rally pipeline v2.
 * Called by the cron agent.
 * 
 * Pipeline flow: queue/ → processing/ → runPipeline() → results/
 */

import { NextResponse } from 'next/server';
import { readdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { runPipeline, type CampaignJob } from '@/lib/pipeline';

export const maxDuration = 300;

const BASE_DIR = '/home/z/my-project/rally-jobs';
const QUEUE_DIR = path.join(BASE_DIR, 'queue');
const PROCESSING_DIR = path.join(BASE_DIR, 'processing');
const RESULTS_DIR = path.join(BASE_DIR, 'results');

function updateStatus(jobId: string, phase: string) {
  return writeFile(
    path.join(PROCESSING_DIR, `${jobId}_status.json`),
    JSON.stringify({ phase, startedAt: Date.now() }, null, 2)
  ).catch(() => {});
}

async function cleanupProcessing(jobId: string) {
  const files = [`${jobId}.json`, `${jobId}_status.json`];
  for (const f of files) {
    try {
      const p = path.join(PROCESSING_DIR, f);
      if (existsSync(p)) await unlink(p);
    } catch { /* ignore */ }
  }
}

function normalizeRules(rules: string | string[] | undefined): string[] {
  if (!rules) return [];
  if (Array.isArray(rules)) return rules;
  if (typeof rules === 'string') {
    return rules.split('\n').map((r: string) => r.trim()).filter((r: string) => r.length > 0);
  }
  return [];
}

function normalizeMissionRules(rules: string | string[] | undefined): string[] {
  return normalizeRules(rules);
}

export async function GET() {
  try {
    // 1. Read queue directory
    let files: string[];
    try {
      files = (await readdir(QUEUE_DIR))
        .filter((f: string) => f.endsWith('.json'))
        .sort();
    } catch {
      // Queue dir might not exist yet
      return NextResponse.json({
        success: true,
        processed: false,
        message: 'No pending jobs',
      });
    }

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        processed: false,
        message: 'No pending jobs',
      });
    }

    // 2. Pick the first job
    const firstFile = files[0];
    const jobFilePath = path.join(QUEUE_DIR, firstFile);
    const jobId = firstFile.replace('.json', '');

    console.log(`[PROCESS-NEXT] Processing job ${jobId}...`);

    // 3. Read job file
    const jobRaw = await readFile(jobFilePath, 'utf-8');
    const jobData = JSON.parse(jobRaw);

    // 4. Move from queue to processing
    const processingPath = path.join(PROCESSING_DIR, `${jobId}.json`);
    await rename(jobFilePath, processingPath);

    // 5. Create status file
    await updateStatus(jobId, 'starting');

    try {
      // 6. Normalize the job data into CampaignJob format
      const campaignData = jobData.campaignData || {};
      const mission = jobData.mission || null;

      // Normalize rules — could be string or array
      const campaignRules = normalizeRules(campaignData.rules);
      const missionRules = normalizeMissionRules(mission?.rules);

      const job: CampaignJob = {
        id: jobData.id || jobId,
        campaignData: {
          title: campaignData.title || 'Untitled Campaign',
          goal: campaignData.goal || '',
          style: campaignData.style || '',
          rules: campaignRules,
          knowledgeBase: campaignData.knowledgeBase || '',
          adminNotice: campaignData.adminNotice || '',
          displayCreator: campaignData.displayCreator || '',
          intelligentContractAddress: campaignData.intelligentContractAddress || '',
          gateWeights: Array.isArray(campaignData.gateWeights)
            ? campaignData.gateWeights.map(Number)
            : [0.9, 0.8, 1, 0.7],
          metricWeights: Array.isArray(campaignData.metricWeights)
            ? campaignData.metricWeights.map(Number)
            : [0.1, 0.3, 0, 0, 0, 0, 0, 0.9],
        },
        mission: mission ? {
          title: mission.title || '',
          description: mission.description || '',
          rules: missionRules,
          style: mission.style || '',
          contentType: mission.contentType || 'tweet',
          characterLimit: mission.characterLimit ? Number(mission.characterLimit) : undefined,
        } : null,
        missionIndex: jobData.missionIndex || 0,
        leaderboardData: jobData.leaderboardData || null,
      };

      // 7. Run pipeline
      console.log(`[PROCESS-NEXT] Running pipeline for job ${jobId}...`);
      await updateStatus(jobId, 'phase0');
      const result = await runPipeline(job);

      // 8. Save result
      const resultPath = path.join(RESULTS_DIR, `${jobId}.json`);
      await writeFile(resultPath, JSON.stringify(result, null, 2));

      // 9. Cleanup processing files
      await cleanupProcessing(jobId);

      console.log(`[PROCESS-NEXT] Job ${jobId} completed — verdict: ${result.verdict}, CP: ${result.consensus?.campaignPoints?.toFixed(3) || 'N/A'}`);

      return NextResponse.json({
        success: true,
        processed: true,
        jobId,
        verdict: result.verdict,
        campaignPoints: result.consensus?.campaignPoints,
        gateMultiplier: result.consensus?.gateMultiplier,
        topPercentile: result.consensus?.topPercentile,
        timings: result.timings,
      });

    } catch (pipelineError: any) {
      // Pipeline failed — save error as result
      const errorResult = {
        success: false,
        jobId,
        status: 'error',
        error: pipelineError.message || String(pipelineError),
        content: '',
        verdict: 'REJECT',
        verdictReason: `Pipeline error: ${pipelineError.message}`,
        timings: { phase0: 0, phase1: 0, phase2: 0, phase3: 0, total: 0 },
      };

      const resultPath = path.join(RESULTS_DIR, `${jobId}.json`);
      await writeFile(resultPath, JSON.stringify(errorResult, null, 2));
      await cleanupProcessing(jobId);

      console.error(`[PROCESS-NEXT] Job ${jobId} failed:`, pipelineError.message);

      return NextResponse.json({
        success: true,
        processed: true,
        jobId,
        error: pipelineError.message,
        verdict: 'REJECT',
      });
    }

  } catch (error: any) {
    console.error('[PROCESS-NEXT] Fatal error:', error.message);
    return NextResponse.json({
      success: false,
      processed: false,
      error: error.message,
    }, { status: 500 });
  }
}
