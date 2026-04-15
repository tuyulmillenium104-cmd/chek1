/**
 * Rally Brain v7.0 — Data Collector
 *
 * Fetches Rally.fun submissions via their public API, parses atto values,
 * extracts 7 content categories, and stores them in the database.
 *
 * Key design decisions:
 * - Deduplicates by rallyId (no double-counting)
 * - Stores tweet URL for later content fetching (expensive operation deferred)
 * - Handles API errors gracefully (never crashes pipeline)
 * - Supports pagination via limit parameter
 */

import { db } from '@/lib/db';
import {
  type RallySubmissionRaw,
  type ParsedSubmission,
  type ParsedCategory,
  CONTENT_CATEGORY_SET,
} from './types';

// ─── Configuration ────────────────────────────────────────────────

const RALLY_API_BASE = 'https://app.rally.fun/api';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_LIMIT = 100;
const FETCH_TIMEOUT_MS = 15_000;

// ─── Public API ───────────────────────────────────────────────────

/**
 * Collect submissions from Rally.fun API for a campaign.
 * Fetches, parses, deduplicates, and stores in DB.
 *
 * @param campaignAddress - Rally.fun contract address (0x...)
 * @param campaignId - Internal campaign DB ID
 * @param options.limit - Max submissions to fetch (default 100)
 * @returns Fetched count and new (deduplicated) count
 */
export async function collectSubmissions(
  campaignAddress: string,
  campaignId: string,
  options?: { limit?: number }
): Promise<{ fetched: number; new: number }> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const startTime = Date.now();

  console.log(`[v7] Collector: fetching submissions for ${campaignAddress.substring(0, 10)}... (limit=${limit})`);

  // 1. Fetch raw submissions from Rally API
  const rawSubmissions = await fetchRallySubmissions(campaignAddress, limit);

  if (rawSubmissions.length === 0) {
    console.log('[v7] Collector: no submissions returned from API');
    return { fetched: 0, new: 0 };
  }

  console.log(`[v7] Collector: fetched ${rawSubmissions.length} raw submissions`);

  // 2. Parse all submissions
  const parsedSubmissions = rawSubmissions.map(parseRallySubmission);

  // 3. Deduplicate against existing DB records
  const newSubmissions = await deduplicateAndStore(parsedSubmissions, campaignId);

  const elapsed = Date.now() - startTime;
  console.log(
    `[v7] Collector: ${rawSubmissions.length} fetched, ${newSubmissions.length} new (${elapsed}ms)`
  );

  return { fetched: rawSubmissions.length, new: newSubmissions.length };
}

// ─── Raw API Fetch ────────────────────────────────────────────────

/**
 * Fetch raw submissions from Rally.fun API.
 * Uses cache-busting approach to get fresh data.
 */
async function fetchRallySubmissions(
  campaignAddress: string,
  limit: number
): Promise<RallySubmissionRaw[]> {
  if (!campaignAddress || !/^0x[a-fA-F0-9]{40}$/.test(campaignAddress)) {
    console.warn('[v7] Collector: invalid campaign address format');
    return [];
  }

  const url = `${RALLY_API_BASE}/submissions?campaignAddress=${campaignAddress}&limit=${limit}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[v7] Collector: API returned status ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.warn('[v7] Collector: API response is not an array');
      return [];
    }

    return data as RallySubmissionRaw[];
  } catch (error) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[v7] Collector: fetch failed: ${msg}`);
    return [];
  }
}

// ─── Parsing ──────────────────────────────────────────────────────

/**
 * Convert atto value (10^-18) to human-readable number.
 * Rally stores all scores as atto values (strings).
 */
export function attoToNumber(atto: string | number | null | undefined): number {
  if (!atto) return 0;
  const num = typeof atto === 'string' ? parseFloat(atto) : atto;
  if (isNaN(num)) return 0;
  return num / 1e18;
}

/**
 * Parse a raw Rally submission into structured format.
 *
 * Separates content quality (7 categories, max 21) from engagement (5 categories).
 */
export function parseRallySubmission(raw: RallySubmissionRaw): ParsedSubmission {
  const isDisqualified = raw.disqualifiedAt !== null;
  const isHidden = raw.hiddenAt !== null;
  const isInvalidated = raw.invalidatedAt !== null;
  const isValid = !isDisqualified && !isHidden && !isInvalidated;

  // Parse each analysis category
  const categories: ParsedCategory[] = (raw.analysis || []).map((a) => {
    const score = attoToNumber(a.atto_score);
    const maxScore = attoToNumber(a.atto_max_score);
    const isContent = CONTENT_CATEGORY_SET.has(a.category);

    return {
      name: a.category,
      score: Math.round(score * 10000) / 10000,
      maxScore: Math.round(maxScore * 10000) / 10000,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0,
      analysis: a.analysis || '',
      isContent,
    };
  });

  // Content quality = sum of content-only category scores
  const contentCategories = categories.filter((c) => c.isContent);
  const contentQualityScore = Math.round(
    contentCategories.reduce((sum, c) => sum + c.score, 0) * 100
  ) / 100;
  const contentMaxScore = contentCategories.reduce((sum, c) => sum + c.maxScore, 0);
  const contentQualityPct =
    contentMaxScore > 0
      ? Math.round((contentQualityScore / contentMaxScore) * 1000) / 10
      : 0;

  // Engagement = sum of engagement category scores
  const engagementCategories = categories.filter((c) => !c.isContent);
  const engagementScore = Math.round(
    engagementCategories.reduce((sum, c) => sum + c.score, 0) * 100
  ) / 100;

  return {
    rallyId: raw.id,
    xUsername: raw.xUsername || '',
    tweetId: raw.tweetId || '',
    tweetUrl: raw.tweetId
      ? `https://x.com/${raw.xUsername}/status/${raw.tweetId}`
      : '',
    contentQualityScore,
    contentQualityPct,
    engagementScore,
    rawScore: Math.round(attoToNumber(raw.attoRawScore) * 100) / 100,
    isValid,
    categories,
    missionId: raw.missionId || '',
    periodIndex: raw.periodIndex || 0,
  };
}

// ─── Deduplication & Storage ──────────────────────────────────────

/**
 * Deduplicate submissions against DB and store new ones.
 * Uses upsert approach with rallyId as the dedup key.
 *
 * Processes in batches of 20 to avoid overwhelming SQLite.
 */
async function deduplicateAndStore(
  submissions: ParsedSubmission[],
  campaignId: string
): Promise<ParsedSubmission[]> {
  const newSubmissions: ParsedSubmission[] = [];

  // Get existing rallyIds in one query
  const rallyIds = submissions.map((s) => s.rallyId);
  const existing = await db.rallySubmission.findMany({
    where: { rallyId: { in: rallyIds } },
    select: { rallyId: true },
  });
  const existingSet = new Set(existing.map((e) => e.rallyId));

  // Filter to only new submissions
  const toInsert = submissions.filter((s) => !existingSet.has(s.rallyId));

  if (toInsert.length === 0) {
    console.log('[v7] Collector: all submissions already exist (no new data)');
    return newSubmissions;
  }

  // Insert in batches of 20
  const BATCH_SIZE = 20;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);

    try {
      await db.rallySubmission.createMany({
        data: batch.map((s) => ({
          campaignId,
          rallyId: s.rallyId,
          xUsername: s.xUsername,
          tweetId: s.tweetId,
          tweetUrl: s.tweetUrl,
          contentQualityScore: s.contentQualityScore,
          contentQualityPct: s.contentQualityPct,
          engagementScore: s.engagementScore,
          rawScore: s.rawScore,
          atemporalPoints: '0', // Will be updated if needed from raw data
          temporalPoints: '0',
          isValid: s.isValid,
          isDisqualified: !s.isValid && s.contentQualityScore === 0,
          isHidden: false,
          categoryScores: JSON.stringify(
            s.categories.map((c) => ({
              name: c.name,
              score: c.score,
              maxScore: c.maxScore,
              pct: c.percentage,
              analysis: c.analysis,
              isContent: c.isContent,
            }))
          ),
          missionId: s.missionId || null,
          periodIndex: s.periodIndex,
        })),
        skipDuplicates: true, // Safety net in case of race conditions
      });

      newSubmissions.push(...batch);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[v7] Collector: batch insert failed at offset ${i}: ${msg}`);
      // Continue with next batch — don't let one batch failure stop everything
    }
  }

  return newSubmissions;
}

// ─── Utility: Get all submissions for a campaign from DB ──────────

/**
 * Retrieve all stored submissions for a campaign from the database.
 * Returns parsed submission format.
 */
export async function getStoredSubmissions(
  campaignId: string
): Promise<ParsedSubmission[]> {
  const records = await db.rallySubmission.findMany({
    where: { campaignId },
    orderBy: { contentQualityScore: 'desc' },
  });

  return records.map((r) => {
    let categories: ParsedCategory[] = [];
    try {
      const parsed = JSON.parse(r.categoryScores);
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
      // categoryScores JSON is malformed — use empty array
    }

    return {
      rallyId: r.rallyId,
      xUsername: r.xUsername,
      tweetId: r.tweetId,
      tweetUrl: r.tweetUrl,
      contentQualityScore: r.contentQualityScore,
      contentQualityPct: r.contentQualityPct,
      engagementScore: r.engagementScore,
      rawScore: r.rawScore,
      isValid: r.isValid,
      categories,
      missionId: r.missionId ?? '',
      periodIndex: r.periodIndex,
    };
  });
}
