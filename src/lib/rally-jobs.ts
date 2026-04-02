/**
 * Job Queue Manager
 * 
 * Manages the file-based job queue for Rally content generation:
 * - getNextJob() — Read next pending JSON file from queue directory
 * - saveResult(jobId, result) — Save result to results directory
 * - listJobs() — List all jobs with status
 * - getQueueStatus() — Get queue depth and stats
 * 
 * Jobs are stored as JSON files in /home/z/my-project/rally-jobs/queue/
 * Results are stored as JSON files in /home/z/my-project/rally-jobs/results/
 */

import { promises as fs } from 'fs';
import path from 'path';
import { db } from './db';

const QUEUE_DIR = '/home/z/my-project/rally-jobs/queue';
const RESULTS_DIR = '/home/z/my-project/rally-jobs/results';

// ─── Types ──────────────────────────────────────────────────────────

export interface QueueJob {
  id: string;
  campaignName: string;
  campaignData: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt?: string;
}

export interface JobResult {
  jobId: string;
  campaignName: string;
  status: 'success' | 'failed' | 'partial';
  bestContent: string | null;
  bestScoring: {
    contentQualityScore: number;
    contentQualityPct: number;
    passesThreshold: boolean;
    overallGrade: string;
    estimatedPosition: string;
    categories: {
      name: string;
      score: number;
      maxScore: number;
      percentage: number;
    }[];
  } | null;
  totalCycles: number;
  totalVariationsGenerated: number;
  totalAIcalls: number;
  processingTime: number;
  error?: string;
  completedAt: string;
}

export interface QueueStatus {
  pendingJobs: number;
  processingJobs: number;
  totalResults: number;
  recentResults: JobResult[];
  queueFiles: string[];
  resultFiles: string[];
}

// ─── Ensure Directories Exist ───────────────────────────────────────

async function ensureDirs() {
  await fs.mkdir(QUEUE_DIR, { recursive: true });
  await fs.mkdir(RESULTS_DIR, { recursive: true });
}

// ─── Job Queue Operations ───────────────────────────────────────────

/**
 * Get the next pending job from the queue
 */
export async function getNextJob(): Promise<QueueJob | null> {
  await ensureDirs();

  try {
    const files = await fs.readdir(QUEUE_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();

    for (const file of jsonFiles) {
      const filePath = path.join(QUEUE_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const job: QueueJob = JSON.parse(content);

      if (job.status === 'pending') {
        // Mark as processing
        job.status = 'processing';
        await fs.writeFile(filePath, JSON.stringify(job, null, 2));

        // Also update in database if exists
        try {
          const existingJob = await db.rallyJob.findUnique({
            where: { id: job.id },
          });
          if (existingJob) {
            await db.rallyJob.update({
              where: { id: job.id },
              data: { status: 'processing' },
            });
          } else {
            await db.rallyJob.create({
              data: {
                id: job.id,
                campaignName: job.campaignName,
                campaignData: JSON.stringify(job.campaignData),
                status: 'processing',
              },
            });
          }
        } catch (dbError) {
          // Database error shouldn't block queue processing
          console.error('[JobQueue] DB update error:', dbError);
        }

        return job;
      }
    }
  } catch (error) {
    console.error('[JobQueue] Error reading queue:', error);
  }

  return null;
}

/**
 * Save a result to the results directory
 */
export async function saveResult(jobId: string, result: JobResult): Promise<void> {
  await ensureDirs();

  const resultFile = path.join(RESULTS_DIR, `${jobId}.json`);
  await fs.writeFile(resultFile, JSON.stringify(result, null, 2));

  // Update database (upsert — direct mode jobs don't exist in DB yet)
  try {
    await db.rallyJob.upsert({
      where: { id: jobId },
      create: {
        id: jobId,
        campaignName: result.campaignName,
        campaignData: '{}',
        status: result.status === 'success' ? 'completed' : 'failed',
        result: JSON.stringify(result),
        score: result.bestScoring?.contentQualityScore ?? null,
      },
      update: {
        status: result.status === 'success' ? 'completed' : 'failed',
        result: JSON.stringify(result),
        score: result.bestScoring?.contentQualityScore ?? null,
      },
    });
  } catch (dbError) {
    console.error('[JobQueue] DB save error:', dbError);
  }

  // Mark job file as completed/failed
  try {
    const jobFile = path.join(QUEUE_DIR, `${jobId}.json`);
    const content = await fs.readFile(jobFile, 'utf-8');
    const job = JSON.parse(content);
    job.status = result.status === 'success' ? 'completed' : 'failed';
    await fs.writeFile(jobFile, JSON.stringify(job, null, 2));
  } catch {
    // Job file may not exist or may already be processed
  }
}

/**
 * List all jobs (both queue and results)
 */
export async function listJobs(): Promise<{
  queue: QueueJob[];
  results: JobResult[];
}> {
  await ensureDirs();

  const queue: QueueJob[] = [];
  const results: JobResult[] = [];

  // Read queue
  try {
    const files = await fs.readdir(QUEUE_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(QUEUE_DIR, file), 'utf-8');
        queue.push(JSON.parse(content));
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Queue dir may not exist
  }

  // Read results
  try {
    const files = await fs.readdir(RESULTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json')).sort().reverse();
    for (const file of jsonFiles.slice(0, 20)) {
      try {
        const content = await fs.readFile(path.join(RESULTS_DIR, file), 'utf-8');
        results.push(JSON.parse(content));
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Results dir may not exist
  }

  return { queue, results };
}

/**
 * Get queue status and statistics
 */
export async function getQueueStatus(): Promise<QueueStatus> {
  await ensureDirs();

  let pendingJobs = 0;
  let processingJobs = 0;
  let totalResults = 0;
  const queueFiles: string[] = [];
  const resultFiles: string[] = [];
  const recentResults: JobResult[] = [];

  // Count queue files
  try {
    const files = await fs.readdir(QUEUE_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();
    queueFiles.push(...jsonFiles);

    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(QUEUE_DIR, file), 'utf-8');
        const job = JSON.parse(content);
        if (job.status === 'pending') pendingJobs++;
        if (job.status === 'processing') processingJobs++;
      } catch {
        pendingJobs++;
      }
    }
  } catch {
    // Queue dir may not exist
  }

  // Count and read recent results
  try {
    const files = await fs.readdir(RESULTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json')).sort().reverse();
    resultFiles.push(...jsonFiles);
    totalResults = jsonFiles.length;

    for (const file of jsonFiles.slice(0, 10)) {
      try {
        const content = await fs.readFile(path.join(RESULTS_DIR, file), 'utf-8');
        recentResults.push(JSON.parse(content));
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Results dir may not exist
  }

  // Also count from database
  try {
    const dbPending = await db.rallyJob.count({ where: { status: 'pending' } });
    const dbCompleted = await db.rallyJob.count({ where: { status: 'completed' } });
    if (dbPending > pendingJobs) pendingJobs = dbPending;
    if (dbCompleted > totalResults) totalResults = dbCompleted;
  } catch {
    // Database may not be available
  }

  return {
    pendingJobs,
    processingJobs,
    totalResults,
    recentResults,
    queueFiles,
    resultFiles,
  };
}
