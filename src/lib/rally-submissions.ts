/**
 * Rally Submissions Fetcher
 *
 * Fetches REAL submission data from Rally.fun API.
 * Endpoint: GET /api/submissions?campaignAddress={address}
 *
 * Returns submission data including:
 * - tweetId (to read actual content)
 * - 12 analysis categories with scores (Rally's ACTUAL scoring)
 * - atemporalPoints (content quality, no engagement)
 * - temporalPoints (engagement metrics: likes, RTs, impressions)
 * - disqualification/invalidation status
 *
 * Key discovery: Rally uses 12 scoring categories, NOT 4 gates + 5 engagement:
 *   CONTENT (atemporal): Originality, Content Alignment, Info Accuracy,
 *     Campaign Compliance, Engagement Potential, Technical Quality, Reply Quality
 *   ENGAGEMENT (temporal): Retweets, Likes, Replies, Followers of Repliers, Impressions
 */

const RALLY_API_BASE = 'https://app.rally.fun/api';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ─── Types ──────────────────────────────────────────────────────────

export interface RallyAnalysisCategory {
  category: string;
  atto_score: string;      // Score in atto (10^-18)
  atto_max_score: string;  // Max possible score in atto
  analysis: string;        // AI judge's analysis text
}

export interface RallySubmission {
  id: string;
  campaignAddress: string;
  periodIndex: number;
  missionId: string;
  type: string;
  syncStatus: string;
  userXId: string;
  xUsername: string;
  tweetId: string;
  /** Content quality score (no engagement) - in atto */
  atemporalPoints: string;
  /** Engagement-derived score - in atto */
  temporalPoints: string;
  /** Raw total score - in atto */
  attoRawScore: string;
  timestamp: string;
  /** 12 analysis categories from Rally's AI judges */
  analysis: RallyAnalysisCategory[];
  referrer: string | null;
  attoReferralBonus: string;
  attoExternalMultiplier: string;
  hiddenAt: string | null;
  disqualifiedAt: string | null;
  invalidatedAt: string | null;
  mission: {
    id: string;
    campaignAddress: string;
    title: string;
    description: string;
  };
}

export interface ParsedSubmission {
  raw: RallySubmission;
  /** Valid submission (not disqualified/hidden) */
  isValid: boolean;
  /** Content quality score (human-readable) */
  contentQualityScore: number;    // 0-21
  /** Content quality percentage */
  contentQualityPct: number;      // 0-100%
  /** Engagement score (human-readable) */
  engagementScore: number;
  /** Total raw score (human-readable) */
  rawScore: number;
  /** Referral bonus */
  referralBonus: number;
  /** External multiplier */
  externalMultiplier: number;
  /** Parsed analysis categories */
  categories: {
    name: string;
    score: number;
    maxScore: number;
    percentage: number;
    analysis: string;
    isContent: boolean;  // true = atemporal, false = temporal
  }[];
  /** Tweet URL */
  tweetUrl: string;
  /** X username */
  xUsername: string;
  /** Mission ID */
  missionId: string;
}

export interface SubmissionsSummary {
  campaignAddress: string;
  totalFetched: number;
  totalValid: number;
  /** Top submissions sorted by content quality */
  topByContent: ParsedSubmission[];
  /** Score distribution stats */
  stats: {
    contentQuality: { mean: number; median: number; min: number; max: number; p10: number; p25: number; p50: number; p75: number; p90: number };
    engagement: { mean: number; median: number; min: number; max: number };
  };
  /** Rally's actual scoring categories discovered */
  discoveredCategories: string[];
  /** Content vs Engagement categories */
  contentCategories: string[];
  engagementCategories: string[];
  /** Average score per category */
  avgScorePerCategory: { name: string; avgPct: number; avgScore: number; maxScore: number }[];
  /** Common failure patterns (categories where people score low) */
  weakCategories: string[];
  /** Strong categories (where people score high) */
  strongCategories: string[];
}

// ─── Content vs Engagement classification ──────────────────────────

const CONTENT_CATEGORIES = new Set([
  'Originality and Authenticity',
  'Content Alignment',
  'Information Accuracy',
  'Campaign Compliance',
  'Engagement Potential',
  'Technical Quality',
  'Reply Quality',
]);

const ENGAGEMENT_CATEGORIES = new Set([
  'Retweets',
  'Likes',
  'Replies',
  'Followers of Repliers',
  'Impressions',
]);

// ─── Cache ──────────────────────────────────────────────────────────

const _submissionCache = new Map<string, { data: RallySubmission[]; fetchedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ─── Fetch Functions ────────────────────────────────────────────────

/**
 * Fetch real submissions from Rally.fun API for a campaign.
 * Uses the correct endpoint: /api/submissions?campaignAddress={address}
 */
export async function fetchRallySubmissions(
  campaignAddress: string,
  options?: { limit?: number; useCache?: boolean }
): Promise<RallySubmission[]> {
  const limit = options?.limit ?? 100;
  const useCache = options?.useCache !== false;

  if (!campaignAddress || !/^0x[a-fA-F0-9]{40}$/.test(campaignAddress)) {
    console.warn('[Submissions] Invalid campaign address');
    return [];
  }

  // Check cache
  if (useCache) {
    const cacheKey = `${campaignAddress}:${limit}`;
    const cached = _submissionCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      console.log(`[Submissions] Returning cached data (${cached.data.length} submissions)`);
      return cached.data;
    }
  }

  const url = `${RALLY_API_BASE}/submissions?campaignAddress=${campaignAddress}&limit=${limit}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
      console.warn(`[Submissions] API returned ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.warn('[Submissions] Response is not an array');
      return [];
    }

    console.log(`[Submissions] Fetched ${data.length} submissions for ${campaignAddress.substring(0, 10)}...`);

    // Cache
    const cacheKey = `${campaignAddress}:${limit}`;
    _submissionCache.set(cacheKey, { data, fetchedAt: Date.now() });

    // Limit cache size
    if (_submissionCache.size > 20) {
      const oldestKey = _submissionCache.keys().next().value;
      if (oldestKey) _submissionCache.delete(oldestKey);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[Submissions] Fetch failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

// ─── Parsing ────────────────────────────────────────────────────────

function attoToNumber(atto: string | number | null | undefined): number {
  if (!atto) return 0;
  const num = typeof atto === 'string' ? parseFloat(atto) : atto;
  return num / 1e18;
}

/**
 * Parse a raw RallySubmission into structured, human-readable format.
 */
export function parseSubmission(raw: RallySubmission): ParsedSubmission {
  const isDisqualified = raw.disqualifiedAt !== null;
  const isHidden = raw.hiddenAt !== null;
  const isInvalidated = raw.invalidatedAt !== null;
  const isValid = !isDisqualified && !isHidden && !isInvalidated;

  const categories = (raw.analysis || []).map((a) => {
    const score = attoToNumber(a.atto_score);
    const maxScore = attoToNumber(a.atto_max_score);
    const isContent = CONTENT_CATEGORIES.has(a.category);

    return {
      name: a.category,
      score,
      maxScore,
      percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
      analysis: a.analysis || '',
      isContent,
    };
  });

  // Content quality = sum of content-only category scores
  const contentCategories = categories.filter((c) => c.isContent);
  const contentQualityScore = contentCategories.reduce((sum, c) => sum + c.score, 0);
  const contentMaxScore = contentCategories.reduce((sum, c) => sum + c.maxScore, 0);
  const contentQualityPct = contentMaxScore > 0 ? (contentQualityScore / contentMaxScore) * 100 : 0;

  // Engagement = sum of engagement category scores
  const engagementCategories = categories.filter((c) => !c.isContent);
  const engagementScore = engagementCategories.reduce((sum, c) => sum + c.score, 0);

  return {
    raw,
    isValid,
    contentQualityScore: Math.round(contentQualityScore * 100) / 100,
    contentQualityPct: Math.round(contentQualityPct * 10) / 10,
    engagementScore: Math.round(engagementScore * 100) / 100,
    rawScore: attoToNumber(raw.attoRawScore),
    referralBonus: attoToNumber(raw.attoReferralBonus),
    externalMultiplier: attoToNumber(raw.attoExternalMultiplier),
    categories,
    tweetUrl: raw.tweetId
      ? `https://x.com/${raw.xUsername}/status/${raw.tweetId}`
      : '',
    xUsername: raw.xUsername || '',
    missionId: raw.missionId || '',
  };
}

/**
 * Fetch and parse submissions, returning structured summary.
 */
export async function getSubmissionsSummary(
  campaignAddress: string,
  options?: { limit?: number }
): Promise<SubmissionsSummary> {
  const rawSubmissions = await fetchRallySubmissions(campaignAddress, options);

  const parsed = rawSubmissions.map(parseSubmission);
  const valid = parsed.filter((s) => s.isValid);

  // Sort by content quality percentage
  const topByContent = [...valid].sort((a, b) => b.contentQualityPct - a.contentQualityPct);

  // Score distributions
  const contentScores = valid.map((s) => s.contentQualityPct).filter((s) => s > 0);
  const engagementScores = valid.map((s) => s.engagementScore).filter((s) => s > 0);

  const sortedContent = [...contentScores].sort((a, b) => a - b);

  const percentile = (arr: number[], pct: number) => {
    if (arr.length === 0) return 0;
    const idx = Math.ceil((pct / 100) * arr.length) - 1;
    return arr[Math.max(0, Math.min(idx, arr.length - 1))];
  };

  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
  };

  // Discover categories
  const allCategories = new Set<string>();
  const contentCats: string[] = [];
  const engagementCats: string[] = [];

  for (const s of valid) {
    for (const c of s.categories) {
      allCategories.add(c.name);
      if (c.isContent && !contentCats.includes(c.name)) contentCats.push(c.name);
      if (!c.isContent && !engagementCats.includes(c.name)) engagementCats.push(c.name);
    }
  }

  // Average score per content category
  const categoryScores: Record<string, number[]> = {};
  const categoryMax: Record<string, number> = {};
  for (const s of valid) {
    for (const c of s.categories) {
      if (!c.isContent) continue; // Only analyze content categories
      if (!categoryScores[c.name]) categoryScores[c.name] = [];
      categoryScores[c.name].push(c.percentage);
      categoryMax[c.name] = c.maxScore;
    }
  }

  const avgScorePerCategory = Object.entries(categoryScores)
    .map(([name, scores]) => ({
      name,
      avgPct: Math.round(mean(scores) * 10) / 10,
      avgScore: Math.round((mean(scores) / 100) * (categoryMax[name] || 1) * 100) / 100,
      maxScore: categoryMax[name] || 0,
    }))
    .sort((a, b) => a.avgPct - b.avgPct);

  // Weak categories (bottom 3)
  const weakCategories = avgScorePerCategory.slice(0, 3).map((c) => c.name);
  // Strong categories (top 3)
  const strongCategories = avgScorePerCategory.slice(-3).map((c) => c.name).reverse();

  return {
    campaignAddress,
    totalFetched: rawSubmissions.length,
    totalValid: valid.length,
    topByContent: topByContent.slice(0, 20),
    stats: {
      contentQuality: {
        mean: Math.round(mean(contentScores) * 10) / 10,
        median: Math.round(median(contentScores) * 10) / 10,
        min: Math.round(Math.min(...contentScores) * 10) / 10,
        max: Math.round(Math.max(...contentScores) * 10) / 10,
        p10: Math.round(percentile(sortedContent, 10) * 10) / 10,
        p25: Math.round(percentile(sortedContent, 25) * 10) / 10,
        p50: Math.round(percentile(sortedContent, 50) * 10) / 10,
        p75: Math.round(percentile(sortedContent, 75) * 10) / 10,
        p90: Math.round(percentile(sortedContent, 90) * 10) / 10,
      },
      engagement: {
        mean: Math.round(mean(engagementScores) * 100) / 100,
        median: Math.round(median(engagementScores) * 100) / 100,
        min: Math.round(Math.min(...engagementScores) * 100) / 100,
        max: Math.round(Math.max(...engagementScores) * 100) / 100,
      },
    },
    discoveredCategories: [...allCategories],
    contentCategories: contentCats,
    engagementCategories: engagementCats,
    avgScorePerCategory,
    weakCategories,
    strongCategories,
  };
}

/**
 * Get top N submissions with full analysis text (for calibration study).
 * Returns only valid submissions sorted by content quality.
 */
export async function getTopSubmissionsForCalibration(
  campaignAddress: string,
  topN: number = 10
): Promise<ParsedSubmission[]> {
  const summary = await getSubmissionsSummary(campaignAddress, { limit: 200 });
  return summary.topByContent.slice(0, topN);
}
