/**
 * Rally Brain v7.0 — Submission Analyzer
 *
 * Analyzes collected submissions to build campaign intelligence:
 * - Score distributions (mean, median, percentiles)
 * - Per-category averages across all submissions
 * - Weak/strong category identification
 * - Top-performer pattern analysis (what top 10% do differently)
 * - Calibration thresholds for quality gates
 *
 * Intelligence is versioned and stored in the CampaignIntelligence table.
 * Each update increments the version number.
 */

import { db } from '@/lib/db';
import {
  type ParsedSubmission,
  type SubmissionStats,
  type CampaignIntelligence,
  type ParsedCategory,
} from './types';

// ─── Public API ───────────────────────────────────────────────────

/**
 * Analyze all stored submissions for a campaign and produce intelligence.
 * Updates the CampaignIntelligence record in the DB (increments version).
 *
 * @param campaignId - Internal campaign DB ID
 * @returns The generated campaign intelligence
 */
export async function analyzeCampaign(
  campaignId: string
): Promise<CampaignIntelligence> {
  const startTime = Date.now();
  console.log(`[v7] Analyzer: analyzing campaign ${campaignId.substring(0, 8)}...`);

  // 1. Get all submissions from DB
  const allSubmissions = await db.rallySubmission.findMany({
    where: { campaignId },
    orderBy: { contentQualityScore: 'desc' },
  });

  if (allSubmissions.length === 0) {
    console.log('[v7] Analyzer: no submissions to analyze');
    return createEmptyIntelligence();
  }

  // 2. Parse submissions into structured format
  const parsed = allSubmissions.map(dbRecordToParsed);
  const validSubmissions = parsed.filter((s) => s.isValid);

  // 3. Compute score statistics
  const contentScores = validSubmissions.map((s) => s.contentQualityScore);
  const contentPcts = validSubmissions.map((s) => s.contentQualityPct);
  const scoreStats = computeScoreStats(contentScores);

  // 4. Compute per-category averages
  const categoryAverages = computeCategoryAverages(validSubmissions);

  // 5. Identify weak and strong categories
  const { weak, strong } = identifyCategoryStrengths(categoryAverages);

  // 6. Analyze top-performer patterns
  const topPatterns = analyzeTopPatterns(validSubmissions);

  // 7. Calculate thresholds
  const pctStats = computeScoreStats(contentPcts);
  const top10Threshold = pctStats.p90;
  const top25Threshold = pctStats.p75;
  const top50Threshold = pctStats.p50;
  const averageThreshold = pctStats.mean;

  const intelligence: CampaignIntelligence = {
    totalSubmissions: allSubmissions.length,
    totalValid: validSubmissions.length,
    scoreStats,
    categoryAverages,
    weakCategories: weak,
    strongCategories: strong,
    topPatterns,
    top10Threshold,
    top25Threshold,
    top50Threshold,
    averageThreshold,
  };

  // 8. Save to DB (upsert with version increment)
  await saveIntelligence(campaignId, intelligence);

  const elapsed = Date.now() - startTime;
  console.log(
    `[v7] Analyzer: done. ${validSubmissions.length}/${allSubmissions.length} valid, ` +
    `mean=${scoreStats.mean.toFixed(2)}/21, top10=${top10Threshold.toFixed(1)}% (${elapsed}ms)`
  );

  return intelligence;
}

// ─── Score Statistics ─────────────────────────────────────────────

/**
 * Compute comprehensive statistics for a set of numeric scores.
 * Returns mean, median, min, max, and key percentiles.
 */
export function computeScoreStats(scores: number[]): SubmissionStats {
  if (scores.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = sorted.reduce((a, b) => a + b, 0) / n;

  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const percentile = (p: number): number => {
    const idx = Math.ceil((p / 100) * n) - 1;
    return sorted[Math.max(0, Math.min(idx, n - 1))];
  };

  return {
    mean: round2(mean),
    median: round2(median),
    min: round2(sorted[0]),
    max: round2(sorted[n - 1]),
    p10: round2(percentile(10)),
    p25: round2(percentile(25)),
    p50: round2(percentile(50)),
    p75: round2(percentile(75)),
    p90: round2(percentile(90)),
  };
}

// ─── Category Averages ────────────────────────────────────────────

/**
 * Compute average scores and percentages for each content category
 * across all valid submissions.
 */
function computeCategoryAverages(
  submissions: ParsedSubmission[]
): CampaignIntelligence['categoryAverages'] {
  // Aggregate scores per category
  const categoryData = new Map<
    string,
    { scores: number[]; pcts: number[]; maxScore: number }
  >();

  for (const submission of submissions) {
    for (const cat of submission.categories) {
      if (!cat.isContent) continue;

      const existing = categoryData.get(cat.name);
      if (existing) {
        existing.scores.push(cat.score);
        existing.pcts.push(cat.percentage);
      } else {
        categoryData.set(cat.name, {
          scores: [cat.score],
          pcts: [cat.percentage],
          maxScore: cat.maxScore,
        });
      }
    }
  }

  // Compute averages
  return [...categoryData.entries()]
    .map(([name, data]) => ({
      name,
      avgPct: round1(
        data.pcts.reduce((a, b) => a + b, 0) / data.pcts.length
      ),
      avgScore: round2(
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      ),
      maxScore: data.maxScore,
    }))
    .sort((a, b) => a.avgPct - b.avgPct);
}

// ─── Weak/Strong Category Identification ──────────────────────────

/**
 * Identify the weakest (bottom 2-3) and strongest (top 2-3) content categories.
 * Categories scoring below 50% are "weak", above 70% are "strong".
 */
function identifyCategoryStrengths(
  categoryAverages: CampaignIntelligence['categoryAverages']
): { weak: string[]; strong: string[] } {
  const WEAK_THRESHOLD = 50;
  const STRONG_THRESHOLD = 70;

  const weak = categoryAverages
    .filter((c) => c.avgPct < WEAK_THRESHOLD)
    .sort((a, b) => a.avgPct - b.avgPct)
    .map((c) => c.name);

  const strong = categoryAverages
    .filter((c) => c.avgPct >= STRONG_THRESHOLD)
    .sort((a, b) => b.avgPct - a.avgPct)
    .map((c) => c.name);

  // If no categories are above/below thresholds, take top/bottom 2
  return {
    weak: weak.length > 0 ? weak : categoryAverages.slice(0, 2).map((c) => c.name),
    strong:
      strong.length > 0
        ? strong
        : categoryAverages.slice(-2).map((c) => c.name),
  };
}

// ─── Top Pattern Analysis ─────────────────────────────────────────

/**
 * Analyze what top-performing submissions (top 25%) do differently
 * compared to all submissions.
 *
 * For each category, compare the average percentage of top submissions
 * vs overall average, and generate an insight about the delta.
 */
export function analyzeTopPatterns(
  submissions: ParsedSubmission[]
): CampaignIntelligence['topPatterns'] {
  if (submissions.length < 5) return [];

  // Sort by content quality score descending
  const sorted = [...submissions].sort(
    (a, b) => b.contentQualityScore - a.contentQualityScore
  );

  // Top 25% (minimum 3 submissions)
  const topN = Math.max(3, Math.ceil(sorted.length * 0.25));
  const topSubmissions = sorted.slice(0, topN);

  // Compute per-category averages for top and overall
  const allCategoryAvg = computeCategoryMap(submissions);
  const topCategoryAvg = computeCategoryMap(topSubmissions);

  // Build patterns
  const patterns: CampaignIntelligence['topPatterns'] = [];

  for (const [name, topAvg] of topCategoryAvg) {
    const overallAvg = allCategoryAvg.get(name) ?? 0;
    const delta = topAvg - overallAvg;

    patterns.push({
      category: name,
      topAvgPct: round1(topAvg),
      overallAvgPct: round1(overallAvg),
      delta: round1(delta),
      insight: generatePatternInsight(name, topAvg, overallAvg, delta),
    });
  }

  // Sort by delta descending (biggest differences first)
  return patterns.sort((a, b) => b.delta - a.delta);
}

/**
 * Generate a human-readable insight about a category pattern.
 */
function generatePatternInsight(
  category: string,
  topAvg: number,
  overallAvg: number,
  delta: number
): string {
  if (delta > 20) {
    return `Top performers score ${delta.toFixed(0)}% higher on ${category} — this is a KEY differentiator.`;
  } else if (delta > 10) {
    return `Top performers consistently outperform on ${category} (${topAvg.toFixed(0)}% vs ${overallAvg.toFixed(0)}%).`;
  } else if (delta > 0) {
    return `Slight edge on ${category} among top performers.`;
  } else {
    return `${category} is not a differentiator — everyone scores similarly.`;
  }
}

/**
 * Compute a map of category name -> average percentage.
 */
function computeCategoryMap(
  submissions: ParsedSubmission[]
): Map<string, number> {
  const map = new Map<string, { total: number; count: number }>();

  for (const submission of submissions) {
    for (const cat of submission.categories) {
      if (!cat.isContent) continue;
      const existing = map.get(cat.name);
      if (existing) {
        existing.total += cat.percentage;
        existing.count++;
      } else {
        map.set(cat.name, { total: cat.percentage, count: 1 });
      }
    }
  }

  return new Map(
    [...map.entries()].map(([name, data]) => [
      name,
      data.count > 0 ? data.total / data.count : 0,
    ])
  );
}

// ─── Persistence ──────────────────────────────────────────────────

/**
 * Save campaign intelligence to the database.
 * Upserts the record and increments the version number.
 */
export async function saveIntelligence(
  campaignId: string,
  intelligence: CampaignIntelligence
): Promise<void> {
  const existing = await db.campaignIntelligence.findUnique({
    where: { campaignId },
  });

  if (existing) {
    await db.campaignIntelligence.update({
      where: { campaignId },
      data: {
        totalSubmissions: intelligence.totalSubmissions,
        totalValid: intelligence.totalValid,
        lastFetchedAt: new Date(),
        scoreStats: JSON.stringify(intelligence.scoreStats),
        categoryAverages: JSON.stringify(intelligence.categoryAverages),
        weakCategories: JSON.stringify(intelligence.weakCategories),
        strongCategories: JSON.stringify(intelligence.strongCategories),
        topPatterns: JSON.stringify(intelligence.topPatterns),
        top10Threshold: intelligence.top10Threshold,
        top25Threshold: intelligence.top25Threshold,
        top50Threshold: intelligence.top50Threshold,
        averageThreshold: intelligence.averageThreshold,
        version: { increment: 1 },
      },
    });
  } else {
    await db.campaignIntelligence.create({
      data: {
        campaignId,
        totalSubmissions: intelligence.totalSubmissions,
        totalValid: intelligence.totalValid,
        lastFetchedAt: new Date(),
        scoreStats: JSON.stringify(intelligence.scoreStats),
        categoryAverages: JSON.stringify(intelligence.categoryAverages),
        weakCategories: JSON.stringify(intelligence.weakCategories),
        strongCategories: JSON.stringify(intelligence.strongCategories),
        topPatterns: JSON.stringify(intelligence.topPatterns),
        top10Threshold: intelligence.top10Threshold,
        top25Threshold: intelligence.top25Threshold,
        top50Threshold: intelligence.top50Threshold,
        averageThreshold: intelligence.averageThreshold,
        version: 1,
      },
    });
  }
}

// ─── Utility: Get stored intelligence from DB ─────────────────────

/**
 * Retrieve stored campaign intelligence from the database.
 */
export async function getStoredIntelligence(
  campaignId: string
): Promise<CampaignIntelligence | null> {
  const record = await db.campaignIntelligence.findUnique({
    where: { campaignId },
  });

  if (!record) return null;

  try {
    const scoreStats = JSON.parse(record.scoreStats || '{}') as SubmissionStats;
    const categoryAverages = JSON.parse(record.categoryAverages || '[]') as CampaignIntelligence['categoryAverages'];
    const weakCategories = JSON.parse(record.weakCategories || '[]') as string[];
    const strongCategories = JSON.parse(record.strongCategories || '[]') as string[];
    const topPatterns = JSON.parse(record.topPatterns || '[]') as CampaignIntelligence['topPatterns'];

    return {
      totalSubmissions: record.totalSubmissions,
      totalValid: record.totalValid,
      scoreStats,
      categoryAverages,
      weakCategories,
      strongCategories,
      topPatterns,
      top10Threshold: record.top10Threshold ?? 0,
      top25Threshold: record.top25Threshold ?? 0,
      top50Threshold: record.top50Threshold ?? 0,
      averageThreshold: record.averageThreshold ?? 0,
    };
  } catch {
    console.warn('[v7] Analyzer: failed to parse stored intelligence');
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function createEmptyIntelligence(): CampaignIntelligence {
  return {
    totalSubmissions: 0,
    totalValid: 0,
    scoreStats: { mean: 0, median: 0, min: 0, max: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
    categoryAverages: [],
    weakCategories: [],
    strongCategories: [],
    topPatterns: [],
    top10Threshold: 0,
    top25Threshold: 0,
    top50Threshold: 0,
    averageThreshold: 0,
  };
}

function dbRecordToParsed(record: {
  rallyId: string;
  xUsername: string;
  tweetId: string;
  tweetUrl: string;
  contentQualityScore: number;
  contentQualityPct: number;
  engagementScore: number;
  rawScore: number;
  isValid: boolean;
  categoryScores: string;
  missionId: string | null;
  periodIndex: number;
}): ParsedSubmission {
  let categories: ParsedCategory[] = [];
  try {
    const parsed = JSON.parse(record.categoryScores);
    if (Array.isArray(parsed)) {
      categories = parsed.map((c: Record<string, unknown>) => ({
        name: String(c.name ?? ''),
        score: Number(c.score ?? 0),
        maxScore: Number(c.maxScore ?? 0),
        percentage: Number(c.pct ?? 0),
        analysis: String(c.analysis ?? ''),
        isContent: Boolean(c.isContent),
      }));
    }
  } catch {
    // malformed JSON
  }

  return {
    rallyId: record.rallyId,
    xUsername: record.xUsername,
    tweetId: record.tweetId,
    tweetUrl: record.tweetUrl,
    contentQualityScore: record.contentQualityScore,
    contentQualityPct: record.contentQualityPct,
    engagementScore: record.engagementScore,
    rawScore: record.rawScore,
    isValid: record.isValid,
    categories,
    missionId: record.missionId ?? '',
    periodIndex: record.periodIndex,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
