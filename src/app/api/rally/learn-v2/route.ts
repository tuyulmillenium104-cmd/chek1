/**
 * POST /api/rally/learn-v2
 *
 * Starts the v2 learning pipeline for a campaign — fetches submissions,
 * runs AI-powered pattern extraction, merges with existing knowledge.
 * Fire-and-forget pattern: returns jobId immediately, poll for status.
 *
 * GET /api/rally/learn-v2?jobId=xxx
 *
 * Polls learning status for a running/completed/failed job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { runLearn, type LearnResult, type LearnProgress } from '@/lib/learn-engine';

// ─── Types ──────────────────────────────────────────────────────────

interface LearnV2Job {
  id: string;
  status: 'running' | 'completed' | 'failed';
  campaignAddress: string;
  campaignName: string;
  progress: LearnProgress[];
  result: LearnResult | null;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
}

// ─── HMR-Safe Store ────────────────────────────────────────────────

const GLOBAL_KEY = '__rally_learn_v2_jobs';
const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes — learn results are valuable

function getLearnV2Store(): Map<string, LearnV2Job> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, LearnV2Job>();
    if (typeof setInterval === 'function') {
      setInterval(() => {
        const store = g[GLOBAL_KEY] as Map<string, LearnV2Job>;
        const now = Date.now();
        for (const [id, job] of store) {
          if (job.completedAt && now - job.completedAt > JOB_TTL_MS) {
            console.log(`[LearnV2] Cleaning up completed job ${id} (TTL ${JOB_TTL_MS / 1000}s)`);
            store.delete(id);
          }
        }
      }, 60000);
    }
  }
  return g[GLOBAL_KEY] as Map<string, LearnV2Job>;
}

// ─── POST: Start Learning Pipeline ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body is required' },
        { status: 400 }
      );
    }

    const campaignAddress = body?.campaignAddress;
    const campaignName = body?.campaignName || 'Unknown Campaign';
    const forceReanalyze = body?.forceReanalyze === true;

    if (!campaignAddress || typeof campaignAddress !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid campaignAddress' },
        { status: 400 }
      );
    }

    const jobId = randomUUID();
    const store = getLearnV2Store();

    // Reject if there's already a running job for this campaign
    for (const [, existing] of store) {
      if (
        existing.campaignAddress === campaignAddress &&
        existing.status === 'running'
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `A learn job is already running for ${campaignAddress.substring(0, 10)}... (jobId: ${existing.id})`,
            existingJobId: existing.id,
          },
          { status: 409 }
        );
      }
    }

    const job: LearnV2Job = {
      id: jobId,
      status: 'running',
      campaignAddress,
      campaignName,
      progress: [],
      result: null,
      error: null,
      startedAt: Date.now(),
      completedAt: null,
    };

    store.set(jobId, job);

    // Fire-and-forget: start the learn pipeline in the background
    runLearnV2Pipeline(job, forceReanalyze);

    return NextResponse.json({
      success: true,
      jobId,
      message: `Learn v2 pipeline started for "${campaignName}". Poll /api/rally/learn-v2?jobId=${jobId}`,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Learn-v2 error:', errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

// ─── GET: Poll Status ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Missing jobId query parameter' },
      { status: 400 }
    );
  }

  const store = getLearnV2Store();
  const job = store.get(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Learn v2 job not found. It may have expired (30 min TTL).' },
      { status: 404 }
    );
  }

  const elapsed = ((job.completedAt || Date.now()) - job.startedAt) / 1000;

  const response: Record<string, unknown> = {
    status: job.status,
    elapsed: Math.round(elapsed * 10) / 10,
  };

  if (job.status === 'running') {
    response.progress = job.progress;
  }

  if (job.status === 'completed' && job.result) {
    response.result = job.result;
  }

  if (job.status === 'failed') {
    response.error = job.error;
  }

  return NextResponse.json(response);
}

// ─── Background Pipeline ──────────────────────────────────────────

async function runLearnV2Pipeline(job: LearnV2Job, forceReanalyze: boolean) {
  const onProgress = (progress: LearnProgress) => {
    job.progress.push(progress);
  };

  try {
    console.log(
      `[LearnV2] Starting pipeline for ${job.campaignAddress.substring(0, 10)}... ` +
      `(${job.campaignName}, forceReanalyze=${forceReanalyze})`
    );

    const result = await runLearn(job.campaignAddress, job.campaignName, {
      onProgress,
      forceReanalyze,
    });

    if (result.success) {
      job.result = result;
      job.status = 'completed';
      console.log(
        `[LearnV2] Completed for ${job.campaignAddress.substring(0, 10)}... ` +
        `(${result.newSubmissions} new, ${result.newPatterns} patterns, ${result.duration}ms)`
      );
    } else {
      job.status = 'failed';
      job.error = result.error || 'Learning pipeline returned unsuccessful result';
      console.error(`[LearnV2] Failed for ${job.campaignAddress.substring(0, 10)}...: ${job.error}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    job.status = 'failed';
    job.error = errorMsg;
    console.error(`[LearnV2] Pipeline crashed for job ${job.id}: ${errorMsg}`);
  } finally {
    job.completedAt = Date.now();
  }
}
