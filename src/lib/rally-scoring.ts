/**
 * Rally Scoring System v2 — ALIGNED WITH RALLY.FUN ACTUAL SCORING
 *
 * Based on REAL Rally.fun submission data analysis (1933 submissions analyzed).
 * Rally uses 12 scoring categories split into CONTENT and ENGAGEMENT:
 *
 * CONTENT (atemporal, max 21.0 points — scored by AI judges):
 *   1. Originality and Authenticity (0-2)
 *   2. Content Alignment (0-2)
 *   3. Information Accuracy (0-2)
 *   4. Campaign Compliance (0-2)
 *   5. Engagement Potential (0-5)
 *   6. Technical Quality (0-5)
 *   7. Reply Quality (0-5)
 *
 * ENGAGEMENT (temporal, unlimited — from real X/Twitter metrics):
 *   1. Retweets, 2. Likes, 3. Replies, 4. Followers of Repliers, 5. Impressions
 *
 * KEY INSIGHT: Rally separates CONTENT QUALITY (atemporal) from ENGAGEMENT (temporal).
 * Content quality is what we can control and predict. Engagement depends on real Twitter performance.
 *
 * Our judges now score ONLY the 7 content categories — matching Rally's actual AI judges.
 * Engagement is estimated but NOT factored into the quality score.
 *
 * Consensus: Majority vote for binary gates, median for continuous scores.
 * G4 Originality and X-Factor detection still active as programmatic supplements.
 */

// ═══════════════════════════════════════════════════════════════════
// RALLY-ALIGNED CONTENT SCORES (PRIMARY SCORING SYSTEM)
// ═══════════════════════════════════════════════════════════════════

export interface RallyContentScores {
  /** How original and authentic is the content? (0-2) */
  originalityAuthenticity: number;
  /** How well does it align with campaign requirements? (0-2) */
  contentAlignment: number;
  /** Are all claims accurate and verifiable? (0-2) */
  informationAccuracy: number;
  /** Does it comply with all campaign rules? (0-2) */
  campaignCompliance: number;
  /** How likely is this to generate engagement? (0-5) */
  engagementPotential: number;
  /** Writing quality, flow, readability (0-5) */
  technicalQuality: number;
  /** Quality of reply/response if applicable (0-5) */
  replyQuality: number;
}

export interface RallyContentCategory {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface RallyEngagementEstimate {
  /** Estimated retweets */
  retweets: number;
  /** Estimated likes */
  likes: number;
  /** Estimated replies */
  replies: number;
  /** Estimated followers of repliers */
  followersOfRepliers: number;
  /** Estimated impressions */
  impressions: number;
}

export interface RallyScoringResult {
  /** 7 content category scores */
  content: RallyContentScores;
  /** Individual categories for display */
  categories: RallyContentCategory[];
  /** Total content quality score (sum of 7 categories, max 21.0) */
  contentQualityScore: number;
  /** Content quality percentage (0-100%) */
  contentQualityPct: number;
  /** Estimated Rally position */
  estimatedPosition: string;
  /** Overall grade (S+, S, A, B, C, D, F) */
  overallGrade: string;
  /** Engagement estimate (NOT factored into quality score) */
  engagementEstimate: RallyEngagementEstimate;
  /** Whether content passes minimum quality threshold */
  passesThreshold: boolean;
  /** G4 Originality detection results */
  g4Detection: G4DetectionResult | null;
  /** X-Factor detection results */
  xFactors: XFactorResult | null;
  /** Detailed feedback per category */
  categoryAnalysis?: Record<string, string>;
}

// Content category definitions
export const CONTENT_CATEGORIES = [
  { key: 'originalityAuthenticity', name: 'Originality and Authenticity', maxScore: 2, description: 'Genuine, human-like, not templated or AI-sounding' },
  { key: 'contentAlignment', name: 'Content Alignment', maxScore: 2, description: 'Matches campaign core message and requirements' },
  { key: 'informationAccuracy', name: 'Information Accuracy', maxScore: 2, description: 'All claims are accurate and verifiable' },
  { key: 'campaignCompliance', name: 'Campaign Compliance', maxScore: 2, description: 'Follows all campaign rules and guidelines' },
  { key: 'engagementPotential', name: 'Engagement Potential', maxScore: 5, description: 'Likely to generate likes, RTs, replies' },
  { key: 'technicalQuality', name: 'Technical Quality', maxScore: 5, description: 'Writing quality, flow, readability, grammar' },
  { key: 'replyQuality', name: 'Reply Quality', maxScore: 5, description: 'Quality of reply/response if applicable' },
] as const;

export type ContentCategoryKey = (typeof CONTENT_CATEGORIES)[number]['key'];

// ═══════════════════════════════════════════════════════════════════
// GRADE & POSITION CALCULATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get overall grade based on content quality score (0-21).
 * Calibrated against real Rally submission data:
 *   - Top 10% typically score 16+ (76%+ quality)
 *   - Top 25% typically score 13+ (62%+ quality)
 *   - Median typically scores 10-12 (48-57% quality)
 */
function getContentGrade(score: number): string {
  if (score >= 19.0) return 'S+';
  if (score >= 16.5) return 'S';
  if (score >= 14.0) return 'A';
  if (score >= 11.0) return 'B';
  if (score >= 8.0) return 'C';
  if (score >= 5.0) return 'D';
  return 'F';
}

/**
 * Estimate Rally position based on content quality score.
 * These thresholds are calibrated from real submission data and can be
 * overridden by calibration data from runCalibration().
 */
function estimatePosition(
  pct: number,
  thresholds?: { top10Pct: number; top25Pct: number; top50Pct: number; averagePct: number }
): string {
  if (thresholds) {
    if (pct >= thresholds.top10Pct) return 'Top 10%';
    if (pct >= thresholds.top25Pct) return 'Top 25%';
    if (pct >= thresholds.top50Pct) return 'Top 50%';
    if (pct >= thresholds.averagePct) return 'Above Average';
    return 'Below Average';
  }
  // Default thresholds (from empirical data)
  if (pct >= 76) return 'Top 10%';
  if (pct >= 62) return 'Top 25%';
  if (pct >= 48) return 'Top 50%';
  if (pct >= 35) return 'Above Average';
  return 'Below Average';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ═══════════════════════════════════════════════════════════════════
// PRIMARY SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate Rally-aligned content quality score from 7 content categories.
 * This is the PRIMARY scoring function — matches Rally's actual AI judge scoring.
 *
 * @param scores - The 7 content category scores (or partial)
 * @param options - Optional thresholds from calibration, min quality threshold
 */
export function calculateRallyContentScore(
  scores: Partial<RallyContentScores>,
  options?: {
    thresholds?: { top10Pct: number; top25Pct: number; top50Pct: number; averagePct: number };
    minQualityPct?: number;
    g4Detection?: G4DetectionResult | null;
    xFactors?: XFactorResult | null;
    categoryAnalysis?: Record<string, string>;
    engagementEstimate?: Partial<RallyEngagementEstimate>;
  }
): RallyScoringResult {
  // Apply scores with clamping
  const content: RallyContentScores = {
    originalityAuthenticity: clamp(scores.originalityAuthenticity ?? 0, 0, 2),
    contentAlignment: clamp(scores.contentAlignment ?? 0, 0, 2),
    informationAccuracy: clamp(scores.informationAccuracy ?? 0, 0, 2),
    campaignCompliance: clamp(scores.campaignCompliance ?? 0, 0, 2),
    engagementPotential: clamp(scores.engagementPotential ?? 0, 0, 5),
    technicalQuality: clamp(scores.technicalQuality ?? 0, 0, 5),
    replyQuality: clamp(scores.replyQuality ?? 0, 0, 5),
  };

  // Build individual categories for display
  const categories: RallyContentCategory[] = CONTENT_CATEGORIES.map((cat) => ({
    name: cat.name,
    score: content[cat.key],
    maxScore: cat.maxScore,
    percentage: cat.maxScore > 0 ? (content[cat.key] / cat.maxScore) * 100 : 0,
  }));

  // Total content quality
  const contentQualityScore = categories.reduce((sum, c) => sum + c.score, 0);
  const maxPossible = categories.reduce((sum, c) => sum + c.maxScore, 0);
  const contentQualityPct = maxPossible > 0 ? (contentQualityScore / maxPossible) * 100 : 0;

  // Grade and position
  const overallGrade = getContentGrade(contentQualityScore);
  const estimatedPosition = estimatePosition(contentQualityPct, options?.thresholds);

  // Threshold check
  const minPct = options?.minQualityPct ?? 35; // Default 35% = above average
  const passesThreshold = contentQualityPct >= minPct;

  // Engagement estimate (default zeros — engagement is temporal)
  const engagementEstimate: RallyEngagementEstimate = {
    retweets: options?.engagementEstimate?.retweets ?? 0,
    likes: options?.engagementEstimate?.likes ?? 0,
    replies: options?.engagementEstimate?.replies ?? 0,
    followersOfRepliers: options?.engagementEstimate?.followersOfRepliers ?? 0,
    impressions: options?.engagementEstimate?.impressions ?? 0,
  };

  return {
    content,
    categories: categories.map((c) => ({
      ...c,
      percentage: Math.round(c.percentage * 10) / 10,
    })),
    contentQualityScore: Math.round(contentQualityScore * 100) / 100,
    contentQualityPct: Math.round(contentQualityPct * 10) / 10,
    estimatedPosition,
    overallGrade,
    engagementEstimate,
    passesThreshold,
    g4Detection: options?.g4Detection ?? null,
    xFactors: options?.xFactors ?? null,
    categoryAnalysis: options?.categoryAnalysis,
  };
}

// ═══════════════════════════════════════════════════════════════════
// JUDGE RESPONSE PARSING
// ═══════════════════════════════════════════════════════════════════

/**
 * Parse AI judge response into Rally content scores.
 * Judges return JSON with the 7 Rally content categories.
 */
export function parseJudgeResponse(response: string): {
  content?: Partial<RallyContentScores>;
  verdict?: string;
  feedback?: string;
  improvements?: string[];
  categoryAnalysis?: Record<string, string>;
} {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Extract Rally content scores (support both snake_case and camelCase)
      const content: Partial<RallyContentScores> = {
        originalityAuthenticity:
          parsed.originality_authenticity ??
          parsed.originalityAuthenticity ??
          parsed.originality_and_authenticity,
        contentAlignment:
          parsed.content_alignment ??
          parsed.contentAlignment,
        informationAccuracy:
          parsed.information_accuracy ??
          parsed.informationAccuracy,
        campaignCompliance:
          parsed.campaign_compliance ??
          parsed.campaignCompliance,
        engagementPotential:
          parsed.engagement_potential ??
          parsed.engagementPotential,
        technicalQuality:
          parsed.technical_quality ??
          parsed.technicalQuality,
        replyQuality:
          parsed.reply_quality ??
          parsed.replyQuality,
      };

      return {
        content,
        verdict: parsed.verdict,
        feedback: parsed.feedback,
        improvements: parsed.improvements,
        categoryAnalysis: parsed.category_analysis ?? parsed.categoryAnalysis,
      };
    }

    // Fallback: regex extraction
    const content: Partial<RallyContentScores> = {};

    const patterns: [RegExp, keyof RallyContentScores][] = [
      [/originality[_\s]*(?:and)?[_\s]*authenticity[:\s]+(\d+\.?\d*)/i, 'originalityAuthenticity'],
      [/content[_\s]*alignment[:\s]+(\d+\.?\d*)/i, 'contentAlignment'],
      [/information[_\s]*accuracy[:\s]+(\d+\.?\d*)/i, 'informationAccuracy'],
      [/campaign[_\s]*compliance[:\s]+(\d+\.?\d*)/i, 'campaignCompliance'],
      [/engagement[_\s]*potential[:\s]+(\d+\.?\d*)/i, 'engagementPotential'],
      [/technical[_\s]*quality[:\s]+(\d+\.?\d*)/i, 'technicalQuality'],
      [/reply[_\s]*quality[:\s]+(\d+\.?\d*)/i, 'replyQuality'],
    ];

    for (const [pattern, key] of patterns) {
      const match = response.match(pattern);
      if (match) content[key] = parseFloat(match[1]);
    }

    return { content };
  } catch {
    return {};
  }
}

// ═══════════════════════════════════════════════════════════════════
// MULTI-JUDGE CONSENSUS
// ═══════════════════════════════════════════════════════════════════

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Merge content scores from multiple judges using MEDIAN consensus.
 *
 * Unlike gates (which need majority vote for pass/fail), content categories
 * use MEDIAN because they are continuous scores (0-2 or 0-5).
 * Median is robust against outlier judges and prevents any single judge from dominating.
 *
 * This matches GenLayer's Byzantine fault-tolerant consensus:
 * - Each judge independently evaluates content
 * - Median ensures honest majority wins even if 1/3 are malicious
 * - No hardcoded weight bias — all judges are equal
 */
export function mergeRallyJudgeScores(
  judgeResults: Array<{
    content?: Partial<RallyContentScores>;
    categoryAnalysis?: Record<string, string>;
  }>,
  options?: {
    thresholds?: { top10Pct: number; top25Pct: number; top50Pct: number; averagePct: number };
    minQualityPct?: number;
  }
): RallyScoringResult {
  // Collect scores per category from all judges
  const categoryKeys: ContentCategoryKey[] = [
    'originalityAuthenticity', 'contentAlignment', 'informationAccuracy', 'campaignCompliance',
    'engagementPotential', 'technicalQuality', 'replyQuality',
  ];

  const mergedContent: Partial<RallyContentScores> = {};

  for (const key of categoryKeys) {
    const values = judgeResults
      .map((j) => j.content?.[key] ?? 0)
      .filter((v) => v > 0); // Only include non-zero scores

    if (values.length > 0) {
      mergedContent[key] = median(values);
    }
  }

  // Collect category analysis from all judges (combine into one)
  const combinedAnalysis: Record<string, string> = {};
  for (const judge of judgeResults) {
    if (judge.categoryAnalysis) {
      for (const [cat, analysis] of Object.entries(judge.categoryAnalysis)) {
        if (!combinedAnalysis[cat]) {
          combinedAnalysis[cat] = analysis;
        }
      }
    }
  }

  return calculateRallyContentScore(mergedContent, {
    ...options,
    categoryAnalysis: Object.keys(combinedAnalysis).length > 0 ? combinedAnalysis : undefined,
  });
}

// ═══════════════════════════════════════════════════════════════════
// G4 ORIGINALITY PROGRAMMATIC DETECTION
// ═══════════════════════════════════════════════════════════════════

export interface G4DetectionResult {
  score: number;
  bonuses: string[];
  penalties: string[];
  details: {
    casualHook: boolean;
    parentheticalAside: boolean;
    contractionsCount: number;
    personalAngle: boolean;
    conversationalEnding: boolean;
    sentenceFragments: boolean;
    emDashes: boolean;
    smartQuotes: boolean;
    aiPhrases: boolean;
    genericOpening: boolean;
    formalEnding: boolean;
    overExplaining: boolean;
  };
}

const G4_BONUS_RULES: { name: string; test: (c: string) => boolean; points: number }[] = [
  { name: 'casualHook', test: (c) => /^(what|how come|why|eh|wait|so|ok|nggak|gw|tau|nah|baru|tadi|serius)/i.test(c.trim()), points: 1.5 },
  { name: 'parentheticalAside', test: (c) => /\([^)]{5,40}\)/.test(c), points: 1 },
  { name: 'conversations', test: (c) => (c.match(/\b(don'?t|can'?t|won'?t|isn'?t|aren'?t|didn'?t|wasn'?t|couldn'?t|wouldn'?t|shouldn'?t|haven'?t|hasn'?t)\b/gi) || []).length >= 3, points: 1 },
  { name: 'personalAngle', test: (c) => /\b(i|me|my|we|us|our|gw|gue|kita)\b/i.test(c), points: 1 },
  { name: 'conversationalEnding', test: (c) => /\?\s*$|!\s*$|\.\.\.\s*$/.test(c.trim()), points: 0.5 },
  { name: 'sentenceFragments', test: (c) => {
    const sentences = c.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const shorts = sentences.filter(s => s.trim().split(/\s+/).length <= 5);
    return shorts.length >= 1;
  }, points: 0.5 },
];

const G4_PENALTY_RULES: { name: string; test: (c: string) => boolean; points: number }[] = [
  { name: 'emDashes', test: (c) => /[—–―]/.test(c), points: -1.5 },
  { name: 'smartQuotes', test: (c) => /[""''']/u.test(c) && !/"/u.test(c), points: -1 },
  { name: 'aiPhrases', test: (c) => {
    const words = ['delve', 'leverage', 'tapestry', 'paradigm', 'landscape', 'nuance', 'harness', 'elevate', 'streamline', 'empower', 'foster', 'utilize'];
    return words.some(w => c.toLowerCase().includes(w));
  }, points: -1 },
  { name: 'genericOpening', test: (c) => /^(the|this is|there are|in my opinion|as we know)/i.test(c.trim()), points: -1 },
  { name: 'formalEnding', test: (c) => /(in conclusion|to summarize|as discussed|regards,|sincerely)/i.test(c), points: -1 },
  { name: 'overExplaining', test: (c) => c.split(/\s+/).length > 120, points: -0.5 },
];

export function detectG4Elements(content: string): G4DetectionResult {
  const bonuses: string[] = [];
  const penalties: string[] = [];
  let score = 0;

  for (const rule of G4_BONUS_RULES) {
    if (rule.test(content)) {
      score += rule.points;
      bonuses.push(rule.name);
    }
  }

  for (const rule of G4_PENALTY_RULES) {
    if (rule.test(content)) {
      score += rule.points;
      penalties.push(rule.name);
    }
  }

  return {
    score: Math.round(score * 100) / 100,
    bonuses,
    penalties,
    details: {
      casualHook: G4_BONUS_RULES[0].test(content),
      parentheticalAside: G4_BONUS_RULES[1].test(content),
      contractionsCount: (content.match(/\b(don'?t|can'?t|won'?t|isn'?t|aren'?t|didn'?t|wasn'?t|couldn'?t|wouldn'?t|shouldn'?t|haven'?t|hasn'?t)\b/gi) || []).length,
      personalAngle: G4_BONUS_RULES[3].test(content),
      conversationalEnding: G4_BONUS_RULES[4].test(content),
      sentenceFragments: G4_BONUS_RULES[5].test(content),
      emDashes: G4_PENALTY_RULES[0].test(content),
      smartQuotes: G4_PENALTY_RULES[1].test(content),
      aiPhrases: G4_PENALTY_RULES[2].test(content),
      genericOpening: G4_PENALTY_RULES[3].test(content),
      formalEnding: G4_PENALTY_RULES[4].test(content),
      overExplaining: G4_PENALTY_RULES[5].test(content),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// X-FACTOR DETECTION
// ═══════════════════════════════════════════════════════════════════

export interface XFactorResult {
  score: number;
  factors: string[];
}

const X_FACTOR_RULES: { name: string; test: (c: string) => boolean; points: number }[] = [
  { name: 'specificNumber', test: (c) => /\b\d{1,3}(,\d{3})*(\.\d+)?\b/.test(c), points: 1 },
  { name: 'timeSpecificity', test: (c) => /\b(yesterday|last (monday|tuesday|wednesday|thursday|friday|week|month)|this (morning|afternoon|evening|week))\b/i.test(c), points: 1 },
  { name: 'embarrassingHonesty', test: (c) => /\b(stupid|idiot|dumb|wrong|mistake|embarrassing|awkward|cringe|nggak paham|salah|bodoh)\b/i.test(c), points: 1 },
  { name: 'insiderDetail', test: (c) => /\b(internally|behind the scenes|off-record|insider|unannounced|beta|early access|before anyone)\b/i.test(c), points: 1 },
  { name: 'unexpectedAngle', test: (c) => /\b(unpopular|contrarian|counterintuitive|against the grain|unlike most|everyone thinks|nobody talks|the opposite)\b/i.test(c), points: 1 },
];

export function detectXFactors(content: string): XFactorResult {
  const factors: string[] = [];
  let score = 0;

  for (const rule of X_FACTOR_RULES) {
    if (rule.test(content)) {
      score += rule.points;
      factors.push(rule.name);
    }
  }

  return { score: Math.min(score, 5), factors };
}

// ═══════════════════════════════════════════════════════════════════
// QUICK THRESHOLD CHECK
// ═══════════════════════════════════════════════════════════════════

/**
 * Quick quality check — does this content pass minimum Rally quality threshold?
 */
export function quickRallyQualityCheck(
  scores: Partial<RallyContentScores>,
  options?: {
    thresholds?: { top10Pct: number; top25Pct: number; top50Pct: number; averagePct: number };
    minQualityPct?: number;
  }
): { passed: boolean; qualityPct: number; estimatedPosition: string } {
  const result = calculateRallyContentScore(scores, options);
  return {
    passed: result.passesThreshold,
    qualityPct: result.contentQualityPct,
    estimatedPosition: result.estimatedPosition,
  };
}

// ═══════════════════════════════════════════════════════════════════
// LEGACY SCORING (DEPRECATED — kept for backward compatibility)
// ═══════════════════════════════════════════════════════════════════
//
// The following interfaces and functions are from the OLD scoring system
// (4 gates + 2 quality + 5 engagement). They are kept for backward
// compatibility but should NOT be used for new code.
//
// Use calculateRallyContentScore() and mergeRallyJudgeScores() instead.

/** @deprecated Use RallyContentScores instead */
export interface GateScores {
  gateUtama: number;
  gateTambahan: number;
  g4Originality: number;
  punctuation: number;
}

/** @deprecated Use RallyContentScores instead */
export interface QualityScores {
  factCheck: number;
  internalQuality: number;
}

/** @deprecated Use RallyContentScores instead */
export interface EngagementProjections {
  hook: number;
  resonance: number;
  shareability: number;
  commentTrigger: number;
  viralPotential: number;
}

/** @deprecated Use RallyContentScores instead */
export interface MetricWeights {
  hook: number;
  resonance: number;
  shareability: number;
  commentTrigger: number;
  viralPotential: number;
}

/** @deprecated Use RallyScoringResult instead */
export interface FullScoringResult {
  gates: GateScores;
  quality: QualityScores;
  engagement: EngagementProjections;
  metricWeights: MetricWeights;
  gatesPassed: boolean;
  failedGates: string[];
  qualitySum: number;
  engagementSum: number;
  weightedEngagementSum: number;
  campaignPoints: number;
  qualityGatePassed: boolean;
  gateEliminated: boolean;
  topPercentEstimate: string;
  overallGrade: string;
  gateMultiplier: number;
  g4Detection: G4DetectionResult | null;
  xFactors: XFactorResult | null;
}

const DEFAULT_METRIC_WEIGHTS: MetricWeights = {
  hook: 0.2, resonance: 0.2, shareability: 0.2,
  commentTrigger: 0.2, viralPotential: 0.2,
};

function getTopPercentEstimate(cp: number): string {
  if (cp >= 25) return 'Top 1%';
  if (cp >= 18) return 'Top 5%';
  if (cp >= 14) return 'Top 10%';
  if (cp >= 9) return 'Top 25%';
  if (cp >= 5) return 'Top 50%';
  return 'Below Median';
}

function getOverallGrade(cp: number): string {
  if (cp >= 20) return 'S+';
  if (cp >= 16) return 'S';
  if (cp >= 12) return 'A';
  if (cp >= 8) return 'B';
  if (cp >= 4) return 'C';
  if (cp >= 2) return 'D';
  return 'F';
}

/** @deprecated Use calculateRallyContentScore instead */
export function checkGateElimination(gates: GateScores): {
  passed: boolean;
  failedGates: string[];
} {
  const failedGates: string[] = [];
  if (gates.gateUtama === 0) failedGates.push('gateUtama');
  if (gates.gateTambahan === 0) failedGates.push('gateTambahan');
  if (gates.g4Originality === 0) failedGates.push('g4Originality');
  if (gates.punctuation === 0) failedGates.push('punctuation');
  return { passed: failedGates.length === 0, failedGates };
}

/** @deprecated Use calculateRallyContentScore instead */
export function calculateScore(
  scores: {
    gates?: Partial<GateScores>;
    quality?: Partial<QualityScores>;
    engagement?: Partial<EngagementProjections>;
  },
  options?: {
    metricWeights?: Partial<MetricWeights>;
    minQualityCP?: number;
  }
): FullScoringResult {
  const gates: GateScores = {
    gateUtama: clamp(scores.gates?.gateUtama ?? 0, 0, 2),
    gateTambahan: clamp(scores.gates?.gateTambahan ?? 0, 0, 2),
    g4Originality: clamp(scores.gates?.g4Originality ?? 0, 0, 2),
    punctuation: clamp(scores.gates?.punctuation ?? 0, 0, 2),
  };

  const quality: QualityScores = {
    factCheck: clamp(scores.quality?.factCheck ?? 0, 0, 5),
    internalQuality: clamp(scores.quality?.internalQuality ?? 0, 0, 5),
  };

  const engagement: EngagementProjections = {
    hook: clamp(scores.engagement?.hook ?? 0, 0, 10),
    resonance: clamp(scores.engagement?.resonance ?? 0, 0, 10),
    shareability: clamp(scores.engagement?.shareability ?? 0, 0, 10),
    commentTrigger: clamp(scores.engagement?.commentTrigger ?? 0, 0, 10),
    viralPotential: clamp(scores.engagement?.viralPotential ?? 0, 0, 10),
  };

  const metricWeights: MetricWeights = {
    hook: options?.metricWeights?.hook ?? DEFAULT_METRIC_WEIGHTS.hook,
    resonance: options?.metricWeights?.resonance ?? DEFAULT_METRIC_WEIGHTS.resonance,
    shareability: options?.metricWeights?.shareability ?? DEFAULT_METRIC_WEIGHTS.shareability,
    commentTrigger: options?.metricWeights?.commentTrigger ?? DEFAULT_METRIC_WEIGHTS.commentTrigger,
    viralPotential: options?.metricWeights?.viralPotential ?? DEFAULT_METRIC_WEIGHTS.viralPotential,
  };

  const weightSum = metricWeights.hook + metricWeights.resonance + metricWeights.shareability +
    metricWeights.commentTrigger + metricWeights.viralPotential;
  if (weightSum > 0 && Math.abs(weightSum - 1.0) > 0.001) {
    const n = 1.0 / weightSum;
    metricWeights.hook *= n;
    metricWeights.resonance *= n;
    metricWeights.shareability *= n;
    metricWeights.commentTrigger *= n;
    metricWeights.viralPotential *= n;
  }

  const gateResult = checkGateElimination(gates);
  const gatesPassed = gateResult.passed;
  const gateEliminated = !gatesPassed;

  const qualitySum = quality.factCheck + quality.internalQuality;
  const engagementSum = engagement.hook + engagement.resonance + engagement.shareability +
    engagement.commentTrigger + engagement.viralPotential;
  const weightedEngagementSum =
    engagement.hook * metricWeights.hook * 5 +
    engagement.resonance * metricWeights.resonance * 5 +
    engagement.shareability * metricWeights.shareability * 5 +
    engagement.commentTrigger * metricWeights.commentTrigger * 5 +
    engagement.viralPotential * metricWeights.viralPotential * 5;

  const minQualityCP = options?.minQualityCP ?? 3.0;
  let campaignPoints: number;
  if (gateEliminated) {
    campaignPoints = 0;
  } else {
    campaignPoints = qualitySum + weightedEngagementSum;
  }

  const qualityGatePassed = gatesPassed && campaignPoints >= minQualityCP;

  const gStar = gatesPassed
    ? (gates.gateUtama + gates.gateTambahan + gates.g4Originality + gates.punctuation) / 4
    : 0;
  const gateMultiplier = gateEliminated ? 0.5 : 1 + 0.5 * (gStar - 1);

  const finalCP = gateEliminated ? 0 : campaignPoints;

  return {
    gates, quality, engagement, metricWeights,
    gatesPassed,
    failedGates: gateResult.failedGates,
    qualitySum,
    engagementSum,
    weightedEngagementSum,
    campaignPoints: Math.round(finalCP * 100) / 100,
    qualityGatePassed,
    gateEliminated,
    topPercentEstimate: gateEliminated ? 'Eliminated' : getTopPercentEstimate(campaignPoints),
    overallGrade: gateEliminated ? 'F' : getOverallGrade(campaignPoints),
    gateMultiplier: Math.round(gateMultiplier * 100) / 100,
    g4Detection: null,
    xFactors: null,
  };
}

/** @deprecated Use mergeRallyJudgeScores instead */
function majorityVoteGate(scores: number[], gateName: string): number {
  const passVotes = scores.filter(s => s > 0).length;
  const total = scores.length;
  if (total === 0) return 0;
  const majorityThreshold = Math.floor(total / 2) + 1;
  if (passVotes >= majorityThreshold) {
    return median(scores);
  } else {
    return 0;
  }
}

/** @deprecated Use mergeRallyJudgeScores instead */
export function mergeJudgeScores(
  judgeResults: Array<{
    gates?: Partial<GateScores>;
    quality?: Partial<QualityScores>;
    engagement?: Partial<EngagementProjections>;
    weight?: number;
  }>,
  options?: {
    metricWeights?: Partial<MetricWeights>;
    minQualityCP?: number;
  }
): FullScoringResult {
  const gates: GateScores = {
    gateUtama: majorityVoteGate(judgeResults.map(j => j.gates?.gateUtama ?? 0), 'gateUtama'),
    gateTambahan: majorityVoteGate(judgeResults.map(j => j.gates?.gateTambahan ?? 0), 'gateTambahan'),
    g4Originality: majorityVoteGate(judgeResults.map(j => j.gates?.g4Originality ?? 0), 'g4Originality'),
    punctuation: majorityVoteGate(judgeResults.map(j => j.gates?.punctuation ?? 0), 'punctuation'),
  };

  const quality: QualityScores = {
    factCheck: median(judgeResults.map(j => j.quality?.factCheck ?? 0)),
    internalQuality: median(judgeResults.map(j => j.quality?.internalQuality ?? 0)),
  };

  const engagement: EngagementProjections = {
    hook: median(judgeResults.map(j => j.engagement?.hook ?? 0)),
    resonance: median(judgeResults.map(j => j.engagement?.resonance ?? 0)),
    shareability: median(judgeResults.map(j => j.engagement?.shareability ?? 0)),
    commentTrigger: median(judgeResults.map(j => j.engagement?.commentTrigger ?? 0)),
    viralPotential: median(judgeResults.map(j => j.engagement?.viralPotential ?? 0)),
  };

  return calculateScore({ gates, quality, engagement }, options);
}

/** @deprecated Use quickRallyQualityCheck instead */
export function quickQualityGateCheck(
  scores: {
    gates?: Partial<GateScores>;
    quality?: Partial<QualityScores>;
    engagement?: Partial<EngagementProjections>;
  },
  options?: {
    metricWeights?: Partial<MetricWeights>;
    minQualityCP?: number;
  }
): { passed: boolean; gateEliminated: boolean; estimatedCP: number; failedGates: string[] } {
  const result = calculateScore(scores, options);
  return {
    passed: result.qualityGatePassed,
    gateEliminated: result.gateEliminated,
    estimatedCP: result.campaignPoints,
    failedGates: result.failedGates,
  };
}

// ═══════════════════════════════════════════════════════════════════
// RALLY-ALIGNED MAPPING (deprecated — scores are now native Rally)
// ═══════════════════════════════════════════════════════════════════

/** @deprecated Categories are now native — no mapping needed */
export interface RallyAlignedCategory {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  isContent: boolean;
}

/** @deprecated Use RallyScoringResult directly */
export interface RallyAlignedScoringResult {
  original: FullScoringResult;
  rallyCategories: RallyAlignedCategory[];
  contentQualityScore: number;
  contentQualityPct: number;
  estimatedRallyPosition: string;
  estimatedAtemporalPoints: number;
  note: string;
}

/** @deprecated Use calculateRallyContentScore directly */
export function calculateRallyAlignedScore(
  originalResult: FullScoringResult,
  options?: {
    thresholds?: {
      top10Pct: number;
      top25Pct: number;
      top50Pct: number;
      averagePct: number;
      perfectPct: number;
    };
  }
): RallyAlignedScoringResult {
  // Map old scoring to Rally's 7 content categories
  const rallyCategories: RallyAlignedCategory[] = [
    { name: 'Originality and Authenticity', score: originalResult.gates.g4Originality, maxScore: 2, percentage: (originalResult.gates.g4Originality / 2) * 100, isContent: true },
    { name: 'Content Alignment', score: originalResult.gates.gateUtama, maxScore: 2, percentage: (originalResult.gates.gateUtama / 2) * 100, isContent: true },
    { name: 'Information Accuracy', score: (originalResult.quality.factCheck / 5) * 2, maxScore: 2, percentage: (originalResult.quality.factCheck / 5) * 100, isContent: true },
    { name: 'Campaign Compliance', score: originalResult.gates.punctuation, maxScore: 2, percentage: (originalResult.gates.punctuation / 2) * 100, isContent: true },
    { name: 'Engagement Potential', score: (originalResult.engagement.hook / 10) * 5, maxScore: 5, percentage: (originalResult.engagement.hook / 10) * 100, isContent: true },
    { name: 'Technical Quality', score: (originalResult.quality.internalQuality / 5) * 5, maxScore: 5, percentage: (originalResult.quality.internalQuality / 5) * 100, isContent: true },
    { name: 'Reply Quality', score: (originalResult.engagement.commentTrigger / 10) * 5, maxScore: 5, percentage: (originalResult.engagement.commentTrigger / 10) * 100, isContent: true },
  ];

  const contentQualityScore = rallyCategories.filter(c => c.isContent).reduce((s, c) => s + c.score, 0);
  const contentMaxScore = rallyCategories.filter(c => c.isContent).reduce((s, c) => s + c.maxScore, 0);
  const contentQualityPct = contentMaxScore > 0 ? (contentQualityScore / contentMaxScore) * 100 : 0;

  let estimatedRallyPosition: string;
  if (options?.thresholds) {
    const t = options.thresholds;
    if (contentQualityPct >= t.top10Pct) estimatedRallyPosition = 'Top 10%';
    else if (contentQualityPct >= t.top25Pct) estimatedRallyPosition = 'Top 25%';
    else if (contentQualityPct >= t.top50Pct) estimatedRallyPosition = 'Top 50%';
    else if (contentQualityPct >= t.averagePct) estimatedRallyPosition = 'Above Average';
    else estimatedRallyPosition = 'Below Average';
  } else {
    estimatedRallyPosition = originalResult.topPercentEstimate;
  }

  return {
    original: originalResult,
    rallyCategories: rallyCategories.map(c => ({ ...c, percentage: Math.round(c.percentage * 10) / 10 })),
    contentQualityScore: Math.round(contentQualityScore * 100) / 100,
    contentQualityPct: Math.round(contentQualityPct * 10) / 10,
    estimatedRallyPosition,
    estimatedAtemporalPoints: contentQualityScore,
    note: 'Mapped from legacy scoring — use calculateRallyContentScore for native Rally alignment',
  };
}
