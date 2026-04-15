/**
 * Rally Brain v7.0 — Shared Types & Constants
 *
 * Data-driven content generation system for Rally.fun.
 * All types used across the v7 pipeline: collector, analyzer, predictor, orchestrator.
 */

// ═══════════════════════════════════════════════════════════════════
// RALLY API RAW TYPES
// ═══════════════════════════════════════════════════════════════════

/** Raw submission from Rally.fun API (GET /api/submissions) */
export interface RallySubmissionRaw {
  id: string;
  campaignAddress: string;
  periodIndex: number;
  missionId: string;
  userXId: string;
  xUsername: string;
  tweetId: string;
  atemporalPoints: string;
  temporalPoints: string;
  attoRawScore: string;
  timestamp: string;
  analysis: Array<{
    category: string;
    atto_score: string;
    atto_max_score: string;
    analysis: string;
  }>;
  referrer: string | null;
  disqualifiedAt: string | null;
  hiddenAt: string | null;
  invalidatedAt: string | null;
  mission: {
    id: string;
    campaignAddress: string;
    title: string;
    description: string;
  };
}

// ═══════════════════════════════════════════════════════════════════
// PARSED SUBMISSION TYPES
// ═══════════════════════════════════════════════════════════════════

/** A single parsed scoring category from Rally's AI judges */
export interface ParsedCategory {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  analysis: string;
  isContent: boolean;
}

/** Fully parsed submission with human-readable scores */
export interface ParsedSubmission {
  rallyId: string;
  xUsername: string;
  tweetId: string;
  tweetUrl: string;
  contentQualityScore: number; // 0-21 (sum of 7 content categories)
  contentQualityPct: number; // 0-100%
  engagementScore: number;
  rawScore: number;
  isValid: boolean;
  categories: ParsedCategory[];
  missionId: string;
  periodIndex: number;
}

// ═══════════════════════════════════════════════════════════════════
// STATISTICS TYPES
// ═══════════════════════════════════════════════════════════════════

/** Score distribution statistics */
export interface SubmissionStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

// ═══════════════════════════════════════════════════════════════════
// CAMPAIGN INTELLIGENCE TYPES
// ═══════════════════════════════════════════════════════════════════

/** Aggregated intelligence for a campaign */
export interface CampaignIntelligence {
  totalSubmissions: number;
  totalValid: number;
  scoreStats: SubmissionStats;
  categoryAverages: Array<{
    name: string;
    avgPct: number;
    avgScore: number;
    maxScore: number;
  }>;
  weakCategories: string[];
  strongCategories: string[];
  topPatterns: Array<{
    category: string;
    topAvgPct: number;
    overallAvgPct: number;
    delta: number;
    insight: string;
  }>;
  top10Threshold: number;
  top25Threshold: number;
  top50Threshold: number;
  averageThreshold: number;
}

// ═══════════════════════════════════════════════════════════════════
// PREDICTION MODEL TYPES
// ═══════════════════════════════════════════════════════════════════

/** Linear regression prediction model */
export interface PredictionModel {
  coefficients: number[];
  intercept: number;
  featureNames: string[];
  mae: number;
  r2: number;
  lastTrainedAt: string;
  sampleCount: number;
  featureStats: { means: number[]; stds: number[] };
}

/** Extracted features from content text */
export interface ContentFeatures {
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  paragraphCount: number;
  questionCount: number;
  exclamationCount: number;
  hasAtRally: boolean;
  hasLink: boolean;
  hasHashtag: boolean;
  hashtagCount: number;
  emojiCount: number;
  mentionCount: number;
  contractionCount: number;
  personalPronounCount: number;
  bannedWordCount: number;
  aiWordCount: number;
  templatePhraseCount: number;
  uniqueWordRatio: number;
  avgWordLength: number;
  capitalRatio: number;
  startsWithLowercase: boolean;
  endsWithQuestion: boolean;
  endsWithExclamation: boolean;
  hasNumber: boolean;
  numberCount: number;
  dashCount: number;
  quoteCount: number;
  readabilityScore: number; // simplified Flesch-Kincaid
}

// ═══════════════════════════════════════════════════════════════════
// PIPELINE TYPES
// ═══════════════════════════════════════════════════════════════════

/** Result of a single data pipeline run */
export interface DataPipelineRunResult {
  success: boolean;
  submissionsFetched: number;
  submissionsNew: number;
  analysisGenerated: boolean;
  modelTrained: boolean;
  processingTimeMs: number;
  errorMessage?: string;
}

/** Pipeline status summary */
export interface PipelineStatus {
  lastRunAt: string | null;
  lastRunSuccess: boolean;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  campaignsProcessed: number;
  totalSubmissionsCollected: number;
  modelsTrained: number;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

/** The 7 content categories scored by Rally's AI judges (max 21 points) */
export const CONTENT_CATEGORIES = [
  'Originality and Authenticity',
  'Content Alignment',
  'Information Accuracy',
  'Campaign Compliance',
  'Engagement Potential',
  'Technical Quality',
  'Reply Quality',
] as const;

/** The 5 engagement categories (temporal, from X/Twitter metrics) */
export const ENGAGEMENT_CATEGORIES = [
  'Retweets',
  'Likes',
  'Replies',
  'Followers of Repliers',
  'Impressions',
] as const;

/** Words that will get you penalized or disqualified */
export const BANNED_WORDS = [
  'guaranteed', 'guarantee', '100%', 'risk-free', 'sure thing',
  'financial advice', 'investment advice', 'buy now', 'sell now',
  'get rich', 'quick money', 'easy money', 'passive income',
  'follow me', 'subscribe to my', 'click here',
  'vibe coding', 'skin in the game', 'intelligent contracts',
  'trust layer', 'agent era', 'frictionless', 'how did I miss this',
] as const;

/** Words/phrases commonly used by AI that reduce authenticity score */
export const AI_WORDS = [
  'delve', 'leverage', 'tapestry', 'paradigm', 'landscape', 'nuance',
  'underscores', 'pivotal', 'crucial', 'embark', 'journey',
  'explore', 'unlock', 'harness', 'foster', 'utilize', 'elevate',
  'streamline', 'empower', 'moreover', 'furthermore', 'consequently',
  'nevertheless', 'notably', 'significantly', 'comprehensive',
] as const;

/** Overused template phrases that reduce originality */
export const TEMPLATE_PHRASES = [
  'unpopular opinion', 'hot take', 'thread alert', 'breaking',
  "here's the thing", "let's dive in", "nobody is talking about",
  'key takeaways', 'picture this', 'at the end of the day',
  'it goes without saying', 'at its core', 'the reality is',
  "it's worth noting", 'make no mistake', 'the bottom line is',
] as const;

/** Set version of content categories for fast lookup */
export const CONTENT_CATEGORY_SET = new Set<string>(CONTENT_CATEGORIES);

/** Set version of engagement categories for fast lookup */
export const ENGAGEMENT_CATEGORY_SET = new Set<string>(ENGAGEMENT_CATEGORIES);

/** Set version of banned words for fast lookup */
export const BANNED_WORD_SET = new Set<string>(BANNED_WORDS.map(w => w.toLowerCase()));

/** Set version of AI words for fast lookup */
export const AI_WORD_SET = new Set<string>(AI_WORDS.map(w => w.toLowerCase()));

/** Set version of template phrases for fast lookup */
export const TEMPLATE_PHRASE_SET = new Set<string>(TEMPLATE_PHRASES.map(p => p.toLowerCase()));

/** Feature names in the order they are extracted (must match extractFeatures output) */
export const FEATURE_NAMES: (keyof ContentFeatures)[] = [
  'charCount',
  'wordCount',
  'sentenceCount',
  'avgSentenceLength',
  'paragraphCount',
  'questionCount',
  'exclamationCount',
  'hasAtRally',
  'hasLink',
  'hasHashtag',
  'hashtagCount',
  'emojiCount',
  'mentionCount',
  'contractionCount',
  'personalPronounCount',
  'bannedWordCount',
  'aiWordCount',
  'templatePhraseCount',
  'uniqueWordRatio',
  'avgWordLength',
  'capitalRatio',
  'startsWithLowercase',
  'endsWithQuestion',
  'endsWithExclamation',
  'hasNumber',
  'numberCount',
  'dashCount',
  'quoteCount',
  'readabilityScore',
];
