/**
 * Judge Engine v2 — Independent AI Session Content Evaluator
 *
 * Evaluates generated content like Rally's AI judge, using learned data
 * from the Knowledge DB for calibrated, unbiased scoring.
 *
 * Key Principle: INDEPENDENT AI SESSION
 * - Uses a DIFFERENT AI session/token than the Generator (tokens 3+)
 * - This prevents bias where the judge "recognizes" its own output
 *   and scores it higher.
 *
 * Scoring System (matches Rally's ACTUAL 7-category system):
 * - Binary Gates (0-2 each, must pass ALL to qualify):
 *   1. Originality and Authenticity
 *   2. Content Alignment
 *   3. Information Accuracy
 *   4. Campaign Compliance
 * - Quality Metrics (0-5 each):
 *   5. Engagement Potential
 *   6. Technical Quality
 *   7. Reply Quality
 * - Max Score: 23 (4 × 2 + 3 × 5)
 */

import { getAIClient } from './http-ai-client';

// ─── Local type for AI chat messages (mirrors http-ai-client internal ChatMessage) ──
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ─── Pattern Data Types (aligned with Knowledge DB) ─────────────────
// These types mirror what KnowledgeDB provides.
// When knowledge-db.ts is built, these can be re-exported from there.

export interface PatternData {
  /** Total number of real Rally submissions analyzed */
  totalSubmissions: number;
  /** Campaign address this data is for */
  campaignAddress?: string;

  /** Strength patterns found in top-scoring submissions */
  strengthPatterns: Array<{
    pattern: string;
    frequency: number; // percentage of top scorers
  }>;

  /** Weakness patterns found in bottom-scoring submissions */
  weaknessPatterns: Array<{
    pattern: string;
    frequency: number; // percentage of bottom scorers
  }>;

  /** Phrases that Rally's judge flags/downgrades */
  bannedPhrases: Array<{
    phrase: string;
    reason: string;
  }>;

  /** Per-category scoring benchmarks from real data */
  benchmarks: {
    originality: { winnerAvg: number; loserAvg: number; target: number };
    alignment: { winnerAvg: number; loserAvg: number; target: number };
    accuracy: { winnerAvg: number; loserAvg: number; target: number };
    compliance: { winnerAvg: number; loserAvg: number; target: number };
    engagement: { winnerAvg: number; loserAvg: number; target: number };
    technical: { winnerAvg: number; loserAvg: number; target: number };
    replyQuality: { winnerAvg: number; loserAvg: number; target: number };
  };

  /** Per-category insights about what the Rally judge looks for */
  categoryInsights: Record<string, string>;

  /** Top scoring examples from real submissions */
  topExamples: Array<{
    username: string;
    score: number;
    maxScore: number;
    strengths: string[];
  }>;
}

// ─── Judge Result Types ─────────────────────────────────────────────

export interface JudgeResult {
  /** Per-category scores */
  scores: {
    originality: number;   // 0-2 (binary gate)
    alignment: number;     // 0-2 (binary gate)
    accuracy: number;      // 0-2 (binary gate)
    compliance: number;    // 0-2 (binary gate)
    engagement: number;    // 0-5 (quality metric)
    technical: number;     // 0-5 (quality metric)
    reply_quality: number; // 0-5 (quality metric)
  };
  /** Sum of all scores (max 23) */
  totalScore: number;
  /** Maximum possible score (23) */
  maxScore: number;
  /** Overall verdict — all binary gates must score > 0 to pass */
  verdict: 'pass' | 'fail';
  /** Letter grade based on total score */
  grade: string;
  /** Detailed per-category analysis with learned references */
  categoryAnalysis: Record<string, {
    score: number;
    max: number;
    analysis: string;
    learnedReference?: string;
  }>;
  /** Specific strengths identified */
  strengths: string[];
  /** Specific weaknesses identified */
  weaknesses: string[];
  /** Actionable improvement suggestions */
  improvements: string[];
  /** Predicted Rally score as percentage (0-100) */
  predictedRallyScorePct: number;
  /** Whether anti-AI patterns were detected */
  antiAIDetected: boolean;
  /** Specific banned phrases found in content */
  bannedPhrasesFound: string[];
  /** Whether the content follows a template-like structure */
  templateStructureDetected: boolean;
  /** Whether learned patterns from KnowledgeDB were injected */
  learnedPatternsUsed: boolean;
  /** AI session/token used for this judge evaluation */
  aiSessionId: string;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Default token index for judge isolation (tokens 0-2 reserved for learn/generate) */
const DEFAULT_JUDGE_TOKEN_INDEX = 3;

/** Temperature for judge evaluation — analytical, consistent */
const JUDGE_TEMPERATURE = 0.4;

/** Max tokens for judge response (structured JSON) */
const JUDGE_MAX_TOKENS = 3000;

/** AI call timeout in milliseconds */
const JUDGE_TIMEOUT_MS = 45000;

/** Grade thresholds based on total score (max 23) */
const GRADE_THRESHOLDS: Array<{ min: number; grade: string }> = [
  { min: 21, grade: 'S' },
  { min: 18, grade: 'A' },
  { min: 15, grade: 'B' },
  { min: 12, grade: 'C' },
  { min: 9,  grade: 'D' },
  { min: 0,  grade: 'F' },
];

// ─── Category definitions for prompt building ────────────────────────

const CATEGORY_NAMES: Record<string, { key: string; max: number; type: 'gate' | 'quality'; fullName: string }> = {
  originality:   { key: 'originality',   max: 2, type: 'gate',   fullName: 'Originality and Authenticity' },
  alignment:     { key: 'alignment',     max: 2, type: 'gate',   fullName: 'Content Alignment' },
  accuracy:      { key: 'accuracy',      max: 2, type: 'gate',   fullName: 'Information Accuracy' },
  compliance:    { key: 'compliance',    max: 2, type: 'gate',   fullName: 'Campaign Compliance' },
  engagement:    { key: 'engagement',    max: 5, type: 'quality', fullName: 'Engagement Potential' },
  technical:     { key: 'technical',     max: 5, type: 'quality', fullName: 'Technical Quality' },
  reply_quality: { key: 'reply_quality', max: 5, type: 'quality', fullName: 'Reply Quality' },
};

// ─── Prompt Building ────────────────────────────────────────────────

/**
 * Build the learned data section for injection into the judge prompt.
 * Formats PatternData into a structured, actionable context block.
 */
function buildLearnedDataSection(data: PatternData): string {
  const lines: string[] = [];
  lines.push(`Based on analysis of ${data.totalSubmissions} real submissions:`);

  // Strength patterns
  if (data.strengthPatterns.length > 0) {
    lines.push('');
    lines.push('STRENGTH PATTERNS (what winners do):');
    for (const sp of data.strengthPatterns.slice(0, 8)) {
      lines.push(`- ${sp.pattern} (found in ${sp.frequency}% of top scorers)`);
    }
  }

  // Weakness patterns
  if (data.weaknessPatterns.length > 0) {
    lines.push('');
    lines.push('WEAKNESS PATTERNS (what losers do):');
    for (const wp of data.weaknessPatterns.slice(0, 8)) {
      lines.push(`- ${wp.pattern} (found in ${wp.frequency}% of bottom scorers)`);
    }
  }

  // Banned phrases
  if (data.bannedPhrases.length > 0) {
    lines.push('');
    lines.push('BANNED PHRASES (Rally judge flags these):');
    for (const bp of data.bannedPhrases.slice(0, 10)) {
      lines.push(`- "${bp.phrase}" — ${bp.reason}`);
    }
  }

  // Scoring benchmarks
  if (data.benchmarks) {
    lines.push('');
    lines.push('SCORING BENCHMARKS (from real Rally data):');
    const b = data.benchmarks;
    lines.push(`- Originality: Winners avg ${b.originality.winnerAvg}/2, Losers avg ${b.originality.loserAvg}/2, Target: ${b.originality.target}/2`);
    lines.push(`- Alignment: Winners avg ${b.alignment.winnerAvg}/2, Losers avg ${b.alignment.loserAvg}/2, Target: ${b.alignment.target}/2`);
    lines.push(`- Accuracy: Winners avg ${b.accuracy.winnerAvg}/2, Losers avg ${b.accuracy.loserAvg}/2, Target: ${b.accuracy.target}/2`);
    lines.push(`- Compliance: Winners avg ${b.compliance.winnerAvg}/2, Losers avg ${b.compliance.loserAvg}/2, Target: ${b.compliance.target}/2`);
    lines.push(`- Engagement: Winners avg ${b.engagement.winnerAvg}/5, Losers avg ${b.engagement.loserAvg}/5, Target: ${b.engagement.target}/5`);
    lines.push(`- Technical: Winners avg ${b.technical.winnerAvg}/5, Losers avg ${b.technical.loserAvg}/5, Target: ${b.technical.target}/5`);
    lines.push(`- Reply Quality: Winners avg ${b.replyQuality.winnerAvg}/5, Losers avg ${b.replyQuality.loserAvg}/5, Target: ${b.replyQuality.target}/5`);
  }

  // Category insights
  if (data.categoryInsights && Object.keys(data.categoryInsights).length > 0) {
    lines.push('');
    lines.push('CATEGORY INSIGHTS:');
    for (const [category, insight] of Object.entries(data.categoryInsights)) {
      lines.push(`- ${category}: ${insight}`);
    }
  }

  // Top scoring examples
  if (data.topExamples && data.topExamples.length > 0) {
    lines.push('');
    lines.push('TOP SCORING EXAMPLES:');
    for (const ex of data.topExamples.slice(0, 5)) {
      lines.push(`- @${ex.username} scored ${ex.score}/${ex.maxScore} — key strengths: ${ex.strengths.join(', ')}`);
    }
  }

  return `═══ LEARNED DATA FROM RALLY SUBMISSIONS ═══\n${lines.join('\n')}`;
}

/**
 * Build the campaign context section for injection into the judge prompt.
 * Extracts key fields to avoid prompt bloat with enriched data.
 */
function buildCampaignContextSection(campaignData: Record<string, unknown>): string {
  const fields: string[] = [];

  const title = String(campaignData.title || campaignData.name || '');
  if (title) fields.push(`Title: ${title}`);

  const description = String(campaignData.description || '');
  if (description) fields.push(`Description: ${description.substring(0, 500)}`);

  const goal = String(campaignData.goal || campaignData.mission || '');
  if (goal) fields.push(`Goal/Mission: ${goal}`);

  const rules = Array.isArray(campaignData.rules)
    ? campaignData.rules.join('\n')
    : String(campaignData.rules || '');
  if (rules) fields.push(`Rules: ${rules.substring(0, 500)}`);

  const style = String(campaignData.style || '');
  if (style) fields.push(`Style: ${style}`);

  const category = String(campaignData.category || '');
  if (category) fields.push(`Category: ${category}`);

  const prohibitedItems = Array.isArray(campaignData.prohibitedItems)
    ? campaignData.prohibitedItems.join(', ')
    : String(campaignData.prohibitedItems || '');
  if (prohibitedItems) fields.push(`Prohibited Items: ${prohibitedItems.substring(0, 300)}`);

  const requiredElements = Array.isArray(campaignData.requiredElements)
    ? campaignData.requiredElements.join(', ')
    : String(campaignData.requiredElements || '');
  if (requiredElements) fields.push(`Required Elements: ${requiredElements.substring(0, 300)}`);

  const platform = String(campaignData.platform || '');
  if (platform) fields.push(`Platform: ${platform}`);

  const contentType = String(campaignData.contentType || campaignData.content_type || '');
  if (contentType) fields.push(`Content Type: ${contentType}`);

  const kb = String(campaignData.knowledgeBase || campaignData.knowledge_base || '');
  if (kb.length > 20) fields.push(`Knowledge Base: ${kb.substring(0, 1000)}`);

  // Include non-internal fields that are strings
  for (const [key, value] of Object.entries(campaignData)) {
    if (key.startsWith('_')) continue;
    if (typeof value === 'string' && value.length > 10 && value.length < 300 && !fields.some(f => f.startsWith(`${key}:`))) {
      fields.push(`${key}: ${value}`);
    }
  }

  return `═══ CAMPAIGN CONTEXT ═══\n${fields.join('\n')}`;
}

/**
 * Build the full judge system prompt with optional learned data.
 */
function buildJudgeSystemPrompt(learnedData?: PatternData): string {
  const learnedDataSection = learnedData
    ? `\n\n${buildLearnedDataSection(learnedData)}\n\nIMPORTANT: Use the learned data above to calibrate your scoring. Reference specific patterns and benchmarks in your analysis.`
    : '\n\nNote: No learned data available for this campaign. Score based on general Rally judging standards.';

  return `You are Rally.fun's AI JUDGE — a meticulous evaluator who scores content EXACTLY like Rally's actual AI judging system.

You evaluate content across 7 categories (Rally's ACTUAL scoring system):

BINARY GATES (0-2 each, 0 = FAIL, must pass ALL to qualify):
1. Originality and Authenticity — Is this genuinely original? Not templated? Has personal voice?
2. Content Alignment — Does it match the campaign's core message? All requirements met?
3. Information Accuracy — Are all claims accurate and verifiable from the knowledge base?
4. Campaign Compliance — Does it follow ALL campaign rules? No prohibited items?

QUALITY METRICS (0-5 each):
5. Engagement Potential — Hook strength, conversation potential, shareability?
6. Technical Quality — Flow, readability, grammar, structure quality?
7. Reply Quality — Does content invite substantive discussion? Has thought-provoking elements?

SCORING RULES:
- Binary gates: 0 = completely fails, 1 = partially meets, 2 = fully meets
- Quality metrics: 0 = terrible, 1 = poor, 2 = below average, 3 = average, 4 = good, 5 = exceptional
- Be STRICT but FAIR. Score based on actual quality, not effort.
- A score of 0 on ANY binary gate means automatic FAIL, regardless of other scores.
${learnedDataSection}

CAMPAIGN CONTEXT:
{CAMPAIGN_CONTEXT_SECTION}

CONTENT TO JUDGE:
{content}

Respond in JSON format:
{
  "scores": {
    "originality": 2,
    "alignment": 2,
    "accuracy": 2,
    "compliance": 2,
    "engagement": 4,
    "technical": 4,
    "reply_quality": 3
  },
  "total_score": 19,
  "max_score": 23,
  "verdict": "pass",
  "grade": "A",
  "category_analysis": {
    "Originality and Authenticity": {
      "score": 2,
      "max": 2,
      "analysis": "Detailed explanation of why this score was given, referencing specific parts of the content...",
      "learned_reference": "Matches winner pattern: 'personal anecdote with specific examples' (found in 87% of top scorers)"
    },
    "Content Alignment": {
      "score": 2,
      "max": 2,
      "analysis": "...",
      "learned_reference": "..."
    },
    "Information Accuracy": {
      "score": 2,
      "max": 2,
      "analysis": "...",
      "learned_reference": "..."
    },
    "Campaign Compliance": {
      "score": 2,
      "max": 2,
      "analysis": "...",
      "learned_reference": "..."
    },
    "Engagement Potential": {
      "score": 4,
      "max": 5,
      "analysis": "...",
      "learned_reference": "..."
    },
    "Technical Quality": {
      "score": 4,
      "max": 5,
      "analysis": "...",
      "learned_reference": "..."
    },
    "Reply Quality": {
      "score": 3,
      "max": 5,
      "analysis": "...",
      "learned_reference": "..."
    }
  },
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific weakness 1"],
  "improvements": ["actionable improvement 1", "actionable improvement 2"],
  "predicted_rally_score_pct": 82.6,
  "anti_ai_detected": false,
  "banned_phrases_found": [],
  "template_structure_detected": false
}

CRITICAL: Output ONLY valid JSON. No markdown, no code fences, no explanation.`;
}

// ─── Grade Calculation ───────────────────────────────────────────────

/**
 * Calculate letter grade based on total score (max 23).
 */
function calculateGrade(totalScore: number): string {
  for (const threshold of GRADE_THRESHOLDS) {
    if (totalScore >= threshold.min) {
      return threshold.grade;
    }
  }
  return 'F';
}

// ─── JSON Response Parsing ───────────────────────────────────────────

interface RawJudgeResponse {
  scores?: {
    originality?: number;
    alignment?: number;
    accuracy?: number;
    compliance?: number;
    engagement?: number;
    technical?: number;
    reply_quality?: number;
  };
  total_score?: number;
  max_score?: number;
  verdict?: string;
  grade?: string;
  category_analysis?: Record<string, {
    score?: number;
    max?: number;
    analysis?: string;
    learned_reference?: string;
  }>;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  predicted_rally_score_pct?: number;
  anti_ai_detected?: boolean;
  banned_phrases_found?: string[];
  template_structure_detected?: boolean;
}

/**
 * Extract and parse JSON from the AI response.
 * Handles cases where AI wraps JSON in markdown code fences or adds extra text.
 */
function extractJudgeJSON(rawContent: string): RawJudgeResponse | null {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(rawContent.trim());
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Not direct JSON, continue
  }

  // Try extracting JSON from markdown code fences
  const fenceMatch = rawContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Continue
    }
  }

  // Try finding the outermost JSON object
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Last resort: try to fix common JSON issues
      try {
        let fixed = jsonMatch[0];
        // Remove trailing commas before } or ]
        fixed = fixed.replace(/,\s*([}\]])/g, '$1');
        const parsed = JSON.parse(fixed);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        // All parsing attempts failed
      }
    }
  }

  return null;
}

/**
 * Build a complete JudgeResult from raw AI response, with validation and defaults.
 */
function buildJudgeResult(
  raw: RawJudgeResponse,
  content: string,
  learnedData: PatternData | undefined,
  tokenIndex: number,
  sessionId: string,
): JudgeResult {
  // Extract and validate scores
  const scores = {
    originality:   clampScore(raw.scores?.originality ?? 0, 0, 2),
    alignment:     clampScore(raw.scores?.alignment ?? 0, 0, 2),
    accuracy:      clampScore(raw.scores?.accuracy ?? 0, 0, 2),
    compliance:    clampScore(raw.scores?.compliance ?? 0, 0, 2),
    engagement:    clampScore(raw.scores?.engagement ?? 0, 0, 5),
    technical:     clampScore(raw.scores?.technical ?? 0, 0, 5),
    reply_quality: clampScore(raw.scores?.reply_quality ?? 0, 0, 5),
  };

  // Calculate total score
  const totalScore = scores.originality + scores.alignment + scores.accuracy + scores.compliance +
                     scores.engagement + scores.technical + scores.reply_quality;

  // Determine verdict: ALL binary gates must score > 0
  const binaryGatesPassed = scores.originality > 0 && scores.alignment > 0 &&
                            scores.accuracy > 0 && scores.compliance > 0;
  const verdict = binaryGatesPassed ? 'pass' : 'fail';

  // Calculate grade
  const grade = raw.grade || calculateGrade(totalScore);

  // Build category analysis
  const categoryAnalysis: JudgeResult['categoryAnalysis'] = {};
  const rawAnalysis = raw.category_analysis || {};

  for (const [key, cat] of Object.entries(CATEGORY_NAMES)) {
    const rawCat = rawAnalysis[cat.fullName] || rawAnalysis[key];
    categoryAnalysis[cat.fullName] = {
      score: cat.type === 'gate' ? clampScore(rawCat?.score ?? scores[key as keyof typeof scores], 0, 2) : clampScore(rawCat?.score ?? scores[key as keyof typeof scores], 0, 5),
      max: cat.max,
      analysis: rawCat?.analysis || `Score: ${scores[key as keyof typeof scores]}/${cat.max}`,
      learnedReference: rawCat?.learned_reference,
    };
  }

  // Predicted Rally score as percentage
  const predictedRallyScorePct = raw.predicted_rally_score_pct ??
    Math.round((totalScore / 23) * 1000) / 10;

  // Anti-AI detection — cross-check with local banned phrase lists
  const bannedPhrasesFound = raw.banned_phrases_found || [];
  const antiAIDetected = raw.anti_ai_detected ?? false;
  const templateStructureDetected = raw.template_structure_detected ?? false;

  // Determine if learned patterns were used
  const learnedPatternsUsed = !!learnedData && learnedData.totalSubmissions > 0;

  return {
    scores,
    totalScore,
    maxScore: 23,
    verdict,
    grade,
    categoryAnalysis,
    strengths: raw.strengths || [],
    weaknesses: raw.weaknesses || [],
    improvements: raw.improvements || [],
    predictedRallyScorePct,
    antiAIDetected,
    bannedPhrasesFound,
    templateStructureDetected,
    learnedPatternsUsed,
    aiSessionId: `judge-token${tokenIndex}-${sessionId}`,
  };
}

/**
 * Build a fallback JudgeResult when AI call fails or returns unparseable data.
 * Runs local heuristic checks on the content.
 */
function buildFallbackJudgeResult(
  content: string,
  campaignData: Record<string, unknown>,
  tokenIndex: number,
  sessionId: string,
  error?: string,
): JudgeResult {
  console.warn(`[JudgeEngine] AI judge failed, using fallback heuristic scoring${error ? `: ${error}` : ''}`);

  const lower = content.toLowerCase();
  const contentLen = content.length;

  // Heuristic scoring — intentionally strict to avoid false passes
  const scores = {
    originality: 0,   // Assume fails until AI confirms
    alignment: 0,
    accuracy: 0,
    compliance: 0,
    engagement: 0,
    technical: 0,
    reply_quality: 0,
  };

  // Basic length check — very short content likely fails
  if (contentLen >= 100) {
    scores.technical = 1;
  }
  if (contentLen >= 200) {
    scores.technical = 2;
    scores.engagement = 1;
  }

  // Check for banned phrases
  const bannedPhrasesFound: string[] = [];
  const knownBanned = ['vibe coding', 'skin in the game', 'intelligent contracts', 'agent era', 'guaranteed', '100%', 'risk-free'];
  for (const phrase of knownBanned) {
    if (lower.includes(phrase)) {
      bannedPhrasesFound.push(phrase);
    }
  }

  // Check for template structure
  const templateStarters = ['unpopular opinion:', 'hot take:', 'thread alert:', 'breaking:', 'stop scrolling'];
  const templateStructureDetected = templateStarters.some(s => lower.startsWith(s));

  // Check for AI-sounding words
  const aiWords = ['delve', 'leverage', 'tapestry', 'paradigm', 'landscape', 'nuance', 'crucial', 'foster', 'utilize', 'elevate'];
  const antiAIDetected = aiWords.some(w => lower.includes(w));

  const totalScore = scores.originality + scores.alignment + scores.accuracy + scores.compliance +
                     scores.engagement + scores.technical + scores.reply_quality;

  return {
    scores,
    totalScore,
    maxScore: 23,
    verdict: 'fail',
    grade: 'F',
    categoryAnalysis: {
      'Originality and Authenticity': { score: 0, max: 2, analysis: 'Unable to evaluate — AI judge unavailable. Defaulting to fail-safe.' },
      'Content Alignment': { score: 0, max: 2, analysis: 'Unable to evaluate — AI judge unavailable. Defaulting to fail-safe.' },
      'Information Accuracy': { score: 0, max: 2, analysis: 'Unable to evaluate — AI judge unavailable. Defaulting to fail-safe.' },
      'Campaign Compliance': { score: 0, max: 2, analysis: 'Unable to evaluate — AI judge unavailable. Defaulting to fail-safe.' },
      'Engagement Potential': { score: scores.engagement, max: 5, analysis: 'Heuristic estimate based on content length.' },
      'Technical Quality': { score: scores.technical, max: 5, analysis: 'Heuristic estimate based on content length and structure.' },
      'Reply Quality': { score: scores.reply_quality, max: 5, analysis: 'Unable to evaluate — AI judge unavailable. Defaulting to fail-safe.' },
    },
    strengths: [],
    weaknesses: error ? [`AI judge error: ${error}`] : ['AI judge unavailable — cannot verify quality'],
    improvements: ['Retry content evaluation when AI judge is available'],
    predictedRallyScorePct: Math.round((totalScore / 23) * 1000) / 10,
    antiAIDetected,
    bannedPhrasesFound,
    templateStructureDetected,
    learnedPatternsUsed: false,
    aiSessionId: `judge-fallback-token${tokenIndex}-${sessionId}`,
  };
}

// ─── Utility Functions ───────────────────────────────────────────────

/**
 * Clamp a score value within min/max bounds.
 */
function clampScore(value: number, min: number, max: number): number {
  if (typeof value !== 'number' || isNaN(value)) return min;
  return Math.round(Math.min(Math.max(value, min), max) * 10) / 10;
}

/**
 * Generate a unique judge session ID for context isolation.
 */
function generateJudgeSessionId(): string {
  return `v2-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

// ─── Core Judge Functions ────────────────────────────────────────────

/**
 * Judge content independently using an isolated AI session.
 *
 * Key design principles:
 * - Uses a DIFFERENT token than the generator (tokens 3+ reserved for judge)
 * - Temperature 0.4 for analytical, consistent scoring
 * - enableThinking: false to ensure structured JSON output
 * - Optionally injects learned data from KnowledgeDB for calibrated scoring
 *
 * @param content - The content to judge
 * @param campaignData - Campaign context data
 * @param campaignAddress - Optional campaign address for knowledge lookup
 * @param options - Configuration options
 * @returns Promise<JudgeResult> - Comprehensive evaluation result
 */
export async function judgeContent(
  content: string,
  campaignData: Record<string, unknown>,
  campaignAddress?: string,
  options?: {
    /** Learned pattern data from KnowledgeDB */
    learnedData?: PatternData;
    /** Force a specific token index for session isolation (default: 3) */
    judgeTokenIndex?: number;
  },
): Promise<JudgeResult> {
  const tokenIndex = options?.judgeTokenIndex ?? DEFAULT_JUDGE_TOKEN_INDEX;
  const sessionId = generateJudgeSessionId();
  const learnedData = options?.learnedData;

  console.log(
    `[JudgeEngine] Starting evaluation (token#${tokenIndex}, session=${sessionId}, ` +
    `learned=${!!learnedData}, content=${content.length} chars)`
  );

  const client = getAIClient();

  // Build system prompt with learned data
  const systemPrompt = buildJudgeSystemPrompt(learnedData);

  // Build campaign context
  const campaignContext = buildCampaignContextSection(campaignData);

  // Replace placeholders in system prompt with actual content
  // (campaign context goes in the system prompt, content goes in user message)
  const filledSystemPrompt = systemPrompt.replace(
    '{CAMPAIGN_CONTEXT_SECTION}',
    campaignContext
  );

  const messages: ChatMessage[] = [
    { role: 'system', content: filledSystemPrompt },
    {
      role: 'user',
      content: `Evaluate this content. Output ONLY valid JSON with no markdown or explanation.\n\nCONTENT TO JUDGE:\n${content}`,
    },
  ];

  try {
    // Execute judge AI call with timeout
    const response = await Promise.race([
      client.chat(messages, {
        temperature: JUDGE_TEMPERATURE,
        maxTokens: JUDGE_MAX_TOKENS,
        enableThinking: false,
        forceTokenIndex: tokenIndex,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Judge AI call timed out')), JUDGE_TIMEOUT_MS)
      ),
    ]);

    let responseContent = response.content;

    // Fallback: extract JSON from thinking content if main content is empty
    if (responseContent.trim().length < 20 && response.thinking) {
      const thinkingText = response.thinking.trim();
      const jsonMatch = thinkingText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseContent = jsonMatch[0];
        console.warn(`[JudgeEngine] Extracted JSON from reasoning_content (${responseContent.length} chars)`);
      }
    }

    // Parse the response
    const parsed = extractJudgeJSON(responseContent);

    if (!parsed) {
      console.error(
        `[JudgeEngine] Failed to parse judge response. Raw length: ${responseContent.length}. ` +
        `First 200 chars: ${responseContent.substring(0, 200)}`
      );
      return buildFallbackJudgeResult(content, campaignData, tokenIndex, sessionId, 'JSON parse failed');
    }

    const result = buildJudgeResult(parsed, content, learnedData, tokenIndex, sessionId);

    console.log(
      `[JudgeEngine] Evaluation complete: ${result.totalScore}/${result.maxScore} (${result.grade}) ` +
      `verdict=${result.verdict} gates=[${result.scores.originality},${result.scores.alignment},${result.scores.accuracy},${result.scores.compliance}] ` +
      `quality=[${result.scores.engagement},${result.scores.technical},${result.scores.reply_quality}] ` +
      `predicted=${result.predictedRallyScorePct}%`
    );

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[JudgeEngine] AI call failed: ${errorMsg}`);

    // Return fallback result instead of throwing
    return buildFallbackJudgeResult(content, campaignData, tokenIndex, sessionId, errorMsg);
  }
}

/**
 * Judge multiple content variations and select the best one.
 *
 * Each variation is judged independently using a different token index
 * for maximum session isolation. Uses a rotating token pool starting
 * from `tokenPoolStart` (default 3).
 *
 * @param contents - Array of content variations to judge
 * @param campaignData - Campaign context data
 * @param campaignAddress - Optional campaign address for knowledge lookup
 * @param options - Configuration options
 * @returns Object with best result, all results, and best index
 */
export async function judgeAndSelect(
  contents: string[],
  campaignData: Record<string, unknown>,
  campaignAddress?: string,
  options?: {
    /** Learned pattern data from KnowledgeDB */
    learnedData?: PatternData;
    /** Minimum total score required to pass (default: 0 = no minimum) */
    minScore?: number;
    /** Starting token index for judge isolation (default: 3) */
    tokenPoolStart?: number;
  },
): Promise<{ best: JudgeResult; all: JudgeResult[]; bestIndex: number }> {
  if (contents.length === 0) {
    throw new Error('[JudgeEngine] judgeAndSelect: No contents provided');
  }

  const minScore = options?.minScore ?? 0;
  const tokenPoolStart = options?.tokenPoolStart ?? DEFAULT_JUDGE_TOKEN_INDEX;

  console.log(`[JudgeEngine] Judging ${contents.length} variations (tokenPoolStart=${tokenPoolStart}, minScore=${minScore})`);

  // Judge all contents in parallel, each with a different token for isolation
  const judgePromises = contents.map((content, index) => {
    const tokenIndex = tokenPoolStart + (index % 8); // Rotate through 8 tokens
    return judgeContent(content, campaignData, campaignAddress, {
      learnedData: options?.learnedData,
      judgeTokenIndex: tokenIndex,
    });
  });

  const results = await Promise.all(judgePromises);

  // Find the best result by total score
  let bestIndex = 0;
  let bestScore = results[0].totalScore;

  for (let i = 1; i < results.length; i++) {
    if (results[i].totalScore > bestScore) {
      bestScore = results[i].totalScore;
      bestIndex = i;
    }
    // Tie-break: prefer 'pass' verdict
    if (results[i].totalScore === bestScore && results[i].verdict === 'pass' && results[bestIndex].verdict !== 'pass') {
      bestIndex = i;
    }
  }

  // Check if best meets minimum score
  if (results[bestIndex].totalScore < minScore) {
    console.warn(
      `[JudgeEngine] No content meets minimum score ${minScore}. ` +
      `Best: ${results[bestIndex].totalScore}/${23} at index ${bestIndex}`
    );
  }

  console.log(
    `[JudgeEngine] Best selection: index=${bestIndex} score=${results[bestIndex].totalScore}/23 ` +
    `(${results[bestIndex].grade}) verdict=${results[bestIndex].verdict} ` +
    `predicted=${results[bestIndex].predictedRallyScorePct}%`
  );

  // Log all results summary
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const marker = i === bestIndex ? ' ← BEST' : '';
    console.log(
      `[JudgeEngine]   [#${i}] ${r.totalScore}/23 (${r.grade}) ${r.verdict} ` +
      `gates=[${r.scores.originality},${r.scores.alignment},${r.scores.accuracy},${r.scores.compliance}] ` +
      `quality=[${r.scores.engagement},${r.scores.technical},${r.scores.reply_quality}]${marker}`
    );
  }

  return {
    best: results[bestIndex],
    all: results,
    bestIndex,
  };
}

/**
 * Generate human-readable feedback from a JudgeResult.
 * Designed to be fed back into the content regeneration loop
 * so the generator can improve on the next cycle.
 *
 * @param result - The judge evaluation result
 * @returns Formatted feedback string for regeneration
 */
export function generateJudgeFeedback(result: JudgeResult): string {
  const lines: string[] = [];

  // Header with summary
  lines.push(`═══ JUDGE FEEDBACK: ${result.grade} (${result.totalScore}/${result.maxScore}) — ${result.verdict.toUpperCase()} ═══`);

  // Binary gates status
  const gates = [
    { name: 'Originality', score: result.scores.originality, max: 2 },
    { name: 'Alignment', score: result.scores.alignment, max: 2 },
    { name: 'Accuracy', score: result.scores.accuracy, max: 2 },
    { name: 'Compliance', score: result.scores.compliance, max: 2 },
  ];

  const failedGates = gates.filter(g => g.score === 0);
  if (failedGates.length > 0) {
    lines.push('');
    lines.push(`🚫 BINARY GATE FAILURES (${failedGates.length}/4):`);
    for (const gate of failedGates) {
      const analysis = result.categoryAnalysis[`${gate.name === 'Originality' ? 'Originality and Authenticity' : gate.name === 'Alignment' ? 'Content Alignment' : gate.name === 'Accuracy' ? 'Information Accuracy' : 'Campaign Compliance'}`];
      lines.push(`  - ${gate.name}: 0/${gate.max} — ${analysis?.analysis || 'Failed binary gate'}`);
    }
  } else {
    lines.push('');
    lines.push('✅ All binary gates PASSED');
  }

  // Quality metrics
  const quality = [
    { name: 'Engagement', score: result.scores.engagement, max: 5 },
    { name: 'Technical', score: result.scores.technical, max: 5 },
    { name: 'Reply Quality', score: result.scores.reply_quality, max: 5 },
  ];

  lines.push('');
  lines.push('Quality Metrics:');
  for (const q of quality) {
    const status = q.score >= 4 ? '✅' : q.score >= 3 ? '⚠️' : '🚫';
    lines.push(`  ${status} ${q.name}: ${q.score}/${q.max}`);
  }

  // Category insights with learned references
  const categoriesWithInsights = Object.entries(result.categoryAnalysis)
    .filter(([, v]) => v.learnedReference);

  if (categoriesWithInsights.length > 0) {
    lines.push('');
    lines.push('📚 Learned Pattern References:');
    for (const [name, data] of categoriesWithInsights) {
      if (data.learnedReference) {
        lines.push(`  - ${name}: ${data.learnedReference}`);
      }
    }
  }

  // Strengths
  if (result.strengths.length > 0) {
    lines.push('');
    lines.push('💪 Strengths:');
    for (const s of result.strengths) {
      lines.push(`  + ${s}`);
    }
  }

  // Weaknesses
  if (result.weaknesses.length > 0) {
    lines.push('');
    lines.push('⚠️ Weaknesses:');
    for (const w of result.weaknesses) {
      lines.push(`  - ${w}`);
    }
  }

  // Actionable improvements
  if (result.improvements.length > 0) {
    lines.push('');
    lines.push('🔧 Actionable Improvements:');
    for (let i = 0; i < result.improvements.length; i++) {
      lines.push(`  ${i + 1}. ${result.improvements[i]}`);
    }
  }

  // Detection warnings
  const warnings: string[] = [];
  if (result.antiAIDetected) warnings.push('Anti-AI patterns detected');
  if (result.bannedPhrasesFound.length > 0) warnings.push(`Banned phrases: ${result.bannedPhrasesFound.join(', ')}`);
  if (result.templateStructureDetected) warnings.push('Template structure detected');

  if (warnings.length > 0) {
    lines.push('');
    lines.push('🚨 Detection Warnings:');
    for (const w of warnings) {
      lines.push(`  ! ${w}`);
    }
  }

  // Predicted score
  lines.push('');
  lines.push(`📊 Predicted Rally Score: ${result.predictedRallyScorePct}%`);

  return lines.join('\n');
}
