/**
 * In-memory pipeline job store for background execution + polling.
 *
 * Architecture:
 * - POST /api/rally/generate → starts pipeline in background, returns { jobId } immediately
 * - GET  /api/rally/generate/status?jobId=xxx → returns current progress + final result
 *
 * No long-lived HTTP connections needed — completely immune to proxy timeouts.
 *
 * IMPORTANT: Uses globalThis to persist the jobs Map across Next.js HMR hot reloads.
 * Without globalThis, the in-memory Map gets wiped every time any server file changes,
 * causing "Job not found" errors during polling.
 */

import { runPipeline, type PipelineJob, type PipelineResult } from './pipeline';
import { saveResult, type JobResult } from './rally-jobs';

// ─── Types ──────────────────────────────────────────────────────────

export interface BackgroundJob {
  id: string;
  status: 'running' | 'completed' | 'failed';
  progress: Array<{ message: string; type: string; timestamp: number }>;
  result: PipelineResult | null;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
}

// ─── HMR-Safe In-Memory Store ───────────────────────────────────────
// Uses globalThis to survive hot module reloads in Next.js dev mode.
// In production, this lives in process memory (no HMR).

const GLOBAL_KEY = '__rally_background_jobs';

function getJobsStore(): Map<string, BackgroundJob> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, BackgroundJob>();
    // Auto-cleanup: remove completed jobs after 10 minutes
    if (typeof setInterval === 'function') {
      setInterval(() => {
        const store = g[GLOBAL_KEY] as Map<string, BackgroundJob>;
        const now = Date.now();
        for (const [id, job] of store) {
          if (job.completedAt && now - job.completedAt > 10 * 60 * 1000) {
            store.delete(id);
          }
        }
      }, 60000);
    }
  }
  return g[GLOBAL_KEY] as Map<string, BackgroundJob>;
}

// ─── Job Manager ─────────────────────────────────────────────────────

/**
 * Start a pipeline job in the background.
 * Returns immediately with the job ID — caller polls for status.
 */
export function startBackgroundJob(pipelineJob: PipelineJob): string {
  const jobId = pipelineJob.id;
  const store = getJobsStore();

  const job: BackgroundJob = {
    id: jobId,
    status: 'running',
    progress: [],
    result: null,
    error: null,
    startedAt: Date.now(),
    completedAt: null,
  };

  store.set(jobId, job);

  console.log(`[BackgroundJob] Started job ${jobId} for "${pipelineJob.campaignName}". Active jobs: ${store.size}`);

  // Fire-and-forget: run pipeline in background
  runPipelineInBackground(job, pipelineJob);

  return jobId;
}

/**
 * Get the current status of a background job.
 */
export function getJobStatus(jobId: string): BackgroundJob | null {
  const store = getJobsStore();
  return store.get(jobId) || null;
}

/**
 * Run the pipeline in the background and update the job state.
 */
async function runPipelineInBackground(job: BackgroundJob, pipelineJob: PipelineJob) {
  const addProgress = (message: string, type: string) => {
    job.progress.push({
      message,
      type: type || 'info',
      timestamp: Date.now(),
    });
  };

  try {
    addProgress(`Pipeline started for campaign: "${pipelineJob.campaignName}"`, 'system');

    const result = await runPipeline(pipelineJob, {
      onProgress: (message, type) => addProgress(message, type),
    });

    job.result = result;
    job.status = result.status === 'failed' ? 'failed' : 'completed';
    job.completedAt = Date.now();

    addProgress(
      `Pipeline ${job.status} in ${((Date.now() - job.startedAt) / 1000).toFixed(1)}s — ${result.totalVariationsGenerated} candidates, ${result.totalAIcalls} AI calls`,
      job.status === 'completed' ? 'success' : 'error'
    );

    if (result.bestScoring) {
      addProgress(
        `Best: Grade ${result.bestScoring.overallGrade} — Score ${result.bestScoring.contentQualityScore.toFixed(2)}/21.0 (${result.bestScoring.contentQualityPct}%)`,
        'success'
      );
    }

    // Save to DB (non-blocking)
    const jobResult: JobResult = {
      jobId: result.jobId,
      campaignName: result.campaignName,
      status: result.status,
      bestContent: result.bestContent,
      bestScoring: result.bestScoring
        ? {
            contentQualityScore: result.bestScoring.contentQualityScore,
            contentQualityPct: result.bestScoring.contentQualityPct,
            passesThreshold: result.bestScoring.passesThreshold,
            overallGrade: result.bestScoring.overallGrade,
            estimatedPosition: result.bestScoring.estimatedPosition,
            categories: result.bestScoring.categories.map((c) => ({
              name: c.name,
              score: c.score,
              maxScore: c.maxScore,
              percentage: c.percentage,
            })),
          }
        : null,
      totalCycles: result.totalCycles,
      totalVariationsGenerated: result.totalVariationsGenerated,
      totalAIcalls: result.totalAIcalls,
      processingTime: result.processingTime,
      error: result.error,
      completedAt: new Date().toISOString(),
    };

    saveResult(result.jobId, jobResult).catch((e) => {
      console.warn('[BackgroundJob] DB save failed (non-blocking):', e instanceof Error ? e.message : e);
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    job.status = 'failed';
    job.error = errorMsg;
    job.completedAt = Date.now();
    addProgress(`Pipeline failed: ${errorMsg}`, 'error');
    console.error(`[BackgroundJob] Pipeline failed for job ${job.id}:`, errorMsg);
  }
}
