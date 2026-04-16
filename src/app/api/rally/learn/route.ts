/**
 * POST /api/rally/learn
 *
 * Starts the learning pipeline for a campaign — fetches submissions, extracts patterns,
 * compares winners vs losers, and produces learning rules.
 *
 * GET /api/rally/learn?jobId=xxx
 *
 * Polls learning status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSubmissionsSummary, type SubmissionsSummary } from '@/lib/rally-submissions';

// ─── Types ──────────────────────────────────────────────────────────

interface LearningJob {
  id: string;
  status: 'running' | 'completed' | 'failed';
  campaignAddress: string;
  campaignName: string;
  progress: Array<{ message: string; type: string; timestamp: number }>;
  result: LearningResult | null;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
}

interface PatternInsight {
  category: string;
  winnerAvg: number;
  loserAvg: number;
  gap: number;
  insight: string;
}

interface LearningResult {
  campaignAddress: string;
  campaignName: string;
  totalSubmissions: number;
  validSubmissions: number;
  summary: SubmissionsSummary;
  patterns: PatternInsight[];
  rules: string[];
  weakCategories: string[];
  strongCategories: string[];
  topScorers: Array<{
    rank: number;
    xUsername: string;
    contentQualityPct: number;
    contentQualityScore: number;
    tweetUrl: string;
  }>;
  recommendations: string[];
}

// ─── HMR-Safe Store ────────────────────────────────────────────────

const GLOBAL_KEY = '__rally_learning_jobs';

function getLearningStore(): Map<string, LearningJob> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, LearningJob>();
    if (typeof setInterval === 'function') {
      setInterval(() => {
        const store = g[GLOBAL_KEY] as Map<string, LearningJob>;
        const now = Date.now();
        for (const [id, job] of store) {
          if (job.completedAt && now - job.completedAt > 10 * 60 * 1000) {
            store.delete(id);
          }
        }
      }, 60000);
    }
  }
  return g[GLOBAL_KEY] as Map<string, LearningJob>;
}

// ─── POST: Start Learning ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const campaignAddress = body?.campaignAddress;
    const campaignName = body?.campaignName || 'Unknown Campaign';

    if (!campaignAddress || !/^0x[a-fA-F0-9]{40}$/.test(campaignAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing campaignAddress' },
        { status: 400 }
      );
    }

    const jobId = body?.jobId || randomUUID();
    const store = getLearningStore();

    const job: LearningJob = {
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

    // Fire-and-forget background learning
    runLearningPipeline(job);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Learning pipeline started. Poll /api/rally/learn?jobId=' + jobId,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Learn error:', errorMsg);
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
      { success: false, error: 'Missing jobId parameter' },
      { status: 400 }
    );
  }

  const store = getLearningStore();
  const job = store.get(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Learning job not found. It may have expired.' },
      { status: 404 }
    );
  }

  const response: Record<string, unknown> = {
    success: true,
    jobId: job.id,
    status: job.status,
    campaignAddress: job.campaignAddress,
    campaignName: job.campaignName,
    progress: job.progress,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    elapsed: job.completedAt
      ? ((job.completedAt - job.startedAt) / 1000).toFixed(1) + 's'
      : ((Date.now() - job.startedAt) / 1000).toFixed(1) + 's',
  };

  if (job.error) {
    response.error = job.error;
  }

  if (job.result) {
    response.result = job.result;
  }

  return NextResponse.json(response);
}

// ─── Learning Pipeline (Background) ────────────────────────────────

async function runLearningPipeline(job: LearningJob) {
  const addProgress = (message: string, type: string) => {
    job.progress.push({ message, type: type || 'info', timestamp: Date.now() });
  };

  try {
    addProgress(`Starting learning pipeline for "${job.campaignName}"...`, 'system');

    // Step 1: Fetch submissions
    addProgress('Fetching Rally submissions for analysis...', 'info');
    console.log(`[Learn] Fetching submissions for ${job.campaignAddress.substring(0, 10)}...`);

    const summary = await Promise.race([
      getSubmissionsSummary(job.campaignAddress, { limit: 100 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Submissions fetch timed out (20s)')), 20000)
      ),
    ]);

    addProgress(
      `Fetched ${summary.totalFetched} submissions (${summary.totalValid} valid)`,
      'success'
    );

    if (summary.totalValid < 3) {
      addProgress('Not enough valid submissions for meaningful analysis (need ≥3)', 'warning');
    }

    // Step 2: Analyze patterns
    addProgress('Analyzing winner vs loser patterns...', 'info');
    const patterns = analyzePatterns(summary);
    addProgress(`Extracted ${patterns.length} pattern insights across content categories`, 'success');

    // Step 3: Generate rules
    addProgress('Generating content rules from patterns...', 'info');
    const rules = generateRules(summary, patterns);
    addProgress(`Generated ${rules.length} content rules`, 'success');

    // Step 4: Build recommendations
    addProgress('Building recommendations...', 'info');
    const recommendations = buildRecommendations(summary, patterns, rules);
    addProgress('Recommendations built', 'success');

    // Step 5: Extract top scorers
    const topScorers = summary.topByContent.slice(0, 10).map((s, i) => ({
      rank: i + 1,
      xUsername: s.xUsername || 'anonymous',
      contentQualityPct: s.contentQualityPct,
      contentQualityScore: s.contentQualityScore,
      tweetUrl: s.tweetUrl,
    }));

    // Done
    job.result = {
      campaignAddress: job.campaignAddress,
      campaignName: job.campaignName,
      totalSubmissions: summary.totalFetched,
      validSubmissions: summary.totalValid,
      summary,
      patterns,
      rules,
      weakCategories: summary.weakCategories,
      strongCategories: summary.strongCategories,
      topScorers,
      recommendations,
    };

    job.status = 'completed';
    job.completedAt = Date.now();

    addProgress(
      `Learning completed in ${((Date.now() - job.startedAt) / 1000).toFixed(1)}s — ${summary.totalValid} submissions analyzed`,
      'success'
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    job.status = 'failed';
    job.error = errorMsg;
    job.completedAt = Date.now();
    addProgress(`Learning failed: ${errorMsg}`, 'error');
    console.error(`[Learn] Pipeline failed for job ${job.id}:`, errorMsg);
  }
}

// ─── Pattern Analysis ──────────────────────────────────────────────

function analyzePatterns(summary: SubmissionsSummary): PatternInsight[] {
  const patterns: PatternInsight[] = [];

  if (summary.totalValid < 2) {
    return patterns;
  }

  const top = summary.topByContent;
  const topThird = Math.max(1, Math.floor(top.length / 3));
  const bottomThird = Math.max(topThird, top.length - Math.floor(top.length / 3));

  const winners = top.slice(0, topThird);
  const losers = top.slice(bottomThird);

  if (winners.length === 0 || losers.length === 0) {
    return patterns;
  }

  // Analyze per-category
  const categorySet = new Set<string>();
  for (const s of [...winners, ...losers]) {
    for (const c of s.categories) {
      if (c.isContent) categorySet.add(c.name);
    }
  }

  for (const catName of categorySet) {
    const winnerScores = winners
      .map((s) => s.categories.find((c) => c.name === catName)?.percentage || 0)
      .filter((v) => v > 0);
    const loserScores = losers
      .map((s) => s.categories.find((c) => c.name === catName)?.percentage || 0)
      .filter((v) => v > 0);

    if (winnerScores.length === 0 || loserScores.length === 0) continue;

    const winnerAvg = winnerScores.reduce((a, b) => a + b, 0) / winnerScores.length;
    const loserAvg = loserScores.reduce((a, b) => a + b, 0) / loserScores.length;
    const gap = winnerAvg - loserAvg;

    let insight: string;
    if (gap > 30) {
      insight = `Critical differentiator — winners score ${gap.toFixed(0)}% higher. Focus here for top placement.`;
    } else if (gap > 15) {
      insight = `Moderate gap — winners outperform by ${gap.toFixed(0)}%. Worth investing effort.`;
    } else if (gap > 5) {
      insight = `Small gap (${gap.toFixed(0)}%) — baseline competence is already high.`;
    } else {
      insight = `Negligible gap — this category doesn't differentiate much.`;
    }

    patterns.push({
      category: catName,
      winnerAvg: Math.round(winnerAvg * 10) / 10,
      loserAvg: Math.round(loserAvg * 10) / 10,
      gap: Math.round(gap * 10) / 10,
      insight,
    });
  }

  // Sort by gap (largest first)
  patterns.sort((a, b) => b.gap - a.gap);

  return patterns;
}

// ─── Rule Generation ───────────────────────────────────────────────

function generateRules(
  summary: SubmissionsSummary,
  patterns: PatternInsight[]
): string[] {
  const rules: string[] = [];

  // From weak categories
  for (const weak of summary.weakCategories.slice(0, 3)) {
    rules.push(`WEAK: ${weak} — this is where most submissions lose points. Invest extra effort here.`);
  }

  // From patterns
  for (const p of patterns.slice(0, 3)) {
    if (p.gap > 15) {
      rules.push(`DIFFERENTIATOR: ${p.category} — winners average ${p.winnerAvg}% vs losers ${p.loserAvg}%.`);
    }
  }

  // General rules from category analysis
  if (summary.stats.contentQuality.mean < 50) {
    rules.push('OVERALL: Content quality is generally low. Meeting basic quality standards gives you a significant edge.');
  }
  if (summary.stats.contentQuality.p90 > 80) {
    rules.push(`TARGET: Top 10% submissions score ≥${summary.stats.contentQuality.p90}%. Aim above this threshold.`);
  }

  // From strong categories (what's already covered well)
  for (const strong of summary.strongCategories.slice(0, 2)) {
    const catAvg = summary.avgScorePerCategory.find((c) => c.name === strong);
    if (catAvg && catAvg.avgPct > 70) {
      rules.push(`STRONG: ${strong} — most submissions score well here (${catAvg.avgPct}% avg). Just don't mess it up.`);
    }
  }

  return rules;
}

// ─── Recommendations ───────────────────────────────────────────────

function buildRecommendations(
  summary: SubmissionsSummary,
  patterns: PatternInsight[],
  rules: string[]
): string[] {
  const recs: string[] = [];

  // Top priority: biggest gap category
  if (patterns.length > 0 && patterns[0].gap > 15) {
    recs.push(`1. Focus heavily on "${patterns[0].category}" — it's the #1 differentiator (${patterns[0].gap.toFixed(0)}% gap).`);
  }

  // Fix weak categories
  if (summary.weakCategories.length > 0) {
    recs.push(`2. Avoid common weaknesses in: ${summary.weakCategories.slice(0, 3).join(', ')}.`);
  }

  // Target score
  if (summary.stats.contentQuality.p90 > 0) {
    recs.push(`3. To be in top 10%, aim for content quality ≥${summary.stats.contentQuality.p90}%.`);
  }

  // Leverage strengths
  if (summary.strongCategories.length > 0) {
    recs.push(`4. Maintain strength in: ${summary.strongCategories.slice(0, 2).join(', ')} — these are baseline expectations.`);
  }

  // Content type insight
  if (summary.stats.engagement.mean > 0) {
    recs.push(`5. Average engagement score: ${summary.stats.engagement.mean.toFixed(2)}. Content-driven quality matters more.`);
  }

  return recs;
}
