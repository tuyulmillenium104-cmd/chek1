/**
 * Learn Engine v2 — AI-Powered Learning System for Rally Content Campaigns
 *
 * Fetches Rally submissions, extracts patterns from the judge's analysis text
 * using AI, and stores them persistently. Supports incremental learning
 * (only processes NEW submissions) and cron-based scheduled learning.
 *
 * Architecture:
 *   Step 1: Fetch New Submissions — deduplicate against stored data by tweet_id
 *   Step 2: AI-Powered Pattern Extraction — analyze winner vs loser judge text
 *   Step 3: Merge Patterns — update frequencies, add new patterns
 *   Step 4: Update Learn Session Log
 *
 * Persistence: JSON files at /home/z/my-project/rally-data/learn/{campaign}/
 *   (designed to be swapped with knowledge-db imports when available)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fetchRallySubmissions, parseSubmission, type ParsedSubmission, type RallySubmission } from './rally-submissions';
import { getAIClient } from './http-ai-client';

// ─── Constants ──────────────────────────────────────────────────────

const DATA_ROOT = '/home/z/my-project/rally-data/learn';
const AI_CALL_TIMEOUT_MS = 60_000;
const RALLY_API_TIMEOUT_MS = 30_000;
const MIN_SUBMISSIONS_FOR_AI = 5;
const WINNER_LOSER_SAMPLE_SIZE = 10;

// ─── Exported Types ─────────────────────────────────────────────────

export interface LearnResult {
  success: boolean;
  newSubmissions: number;
  duplicateSubmissions: number;
  totalSubmissions: number;
  patternsExtracted: boolean;
  newPatterns: number;
  topScore: number;
  averageScore: number;
  weakCategories: string[];
  strongCategories: string[];
  duration: number;
  error?: string;
}

export interface LearnProgress {
  phase: 'fetching' | 'deduplicating' | 'analyzing' | 'merging' | 'done';
  message: string;
  timestamp: number;
}

// ─── Internal Types ─────────────────────────────────────────────────

interface StoredSubmission {
  tweetId: string;
  xUsername: string;
  contentQualityScore: number;
  contentQualityPct: number;
  rawScore: number;
  isValid: boolean;
  categories: {
    name: string;
    score: number;
    maxScore: number;
    percentage: number;
    analysis: string;
    isContent: boolean;
  }[];
  missionId: string;
  fetchedAt: string;
}

interface StrengthPattern {
  pattern: string;
  examples: string[];
  frequency_in_winners: number;
  frequency_in_losers: number;
  category: string;
}

interface WeaknessPattern {
  pattern: string;
  red_flag_phrases: string[];
  frequency_in_losers: number;
  frequency_in_winners: number;
  category: string;
}

interface BannedPhrase {
  phrase: string;
  reason: string;
}

interface ScoringBenchmark {
  winner_avg: number;
  loser_avg: number;
  target: number;
}

interface CategoryInsight {
  what_winners_do: string;
  what_losers_do: string;
  key_differentiator: string;
  rally_judge_expects: string;
}

interface TopExample {
  rank: number;
  username: string;
  score: number;
  key_strengths: string[];
}

interface AIPatternResponse {
  strength_patterns: StrengthPattern[];
  weakness_patterns: WeaknessPattern[];
  banned_phrases: BannedPhrase[];
  scoring_benchmarks: Record<string, ScoringBenchmark>;
  category_insights: Record<string, CategoryInsight>;
  top_examples: TopExample[];
}

interface CampaignPatterns {
  campaignAddress: string;
  campaignName: string;
  updatedAt: string;
  strengthPatterns: StrengthPattern[];
  weaknessPatterns: WeaknessPattern[];
  bannedPhrases: BannedPhrase[];
  scoringBenchmarks: Record<string, ScoringBenchmark>;
  categoryInsights: Record<string, CategoryInsight>;
  topExamples: TopExample[];
}

interface LearnSession {
  timestamp: string;
  newSubmissions: number;
  patternsExtracted: boolean;
  newPatterns: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

interface CampaignData {
  campaignAddress: string;
  campaignName: string;
  cronEnabled: boolean;
  cronIntervalHours: number;
  lastLearnAt: string | null;
  nextScheduledLearn: string | null;
  totalSubmissions: number;
  sessions: LearnSession[];
}

// ─── Persistence Layer ──────────────────────────────────────────────
// When knowledge-db.ts is available, these functions should be replaced
// with imports from './knowledge-db'.

function getCampaignDir(campaignAddress: string): string {
  return path.join(DATA_ROOT, campaignAddress.toLowerCase());
}

async function ensureCampaignDir(campaignAddress: string): Promise<string> {
  const dir = getCampaignDir(campaignAddress);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Load stored submissions for a campaign */
async function loadStoredSubmissions(campaignAddress: string): Promise<StoredSubmission[]> {
  const filePath = path.join(getCampaignDir(campaignAddress), 'submissions.json');
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as StoredSubmission[];
  } catch {
    return [];
  }
}

/** Save submissions to disk */
async function saveStoredSubmissions(campaignAddress: string, submissions: StoredSubmission[]): Promise<void> {
  const dir = await ensureCampaignDir(campaignAddress);
  const filePath = path.join(dir, 'submissions.json');
  await fs.writeFile(filePath, JSON.stringify(submissions, null, 2));
}

/** Load existing patterns for a campaign */
async function loadCampaignPatterns(campaignAddress: string): Promise<CampaignPatterns | null> {
  const filePath = path.join(getCampaignDir(campaignAddress), 'patterns.json');
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as CampaignPatterns;
  } catch {
    return null;
  }
}

/** Save patterns to disk */
async function saveCampaignPatterns(campaignAddress: string, patterns: CampaignPatterns): Promise<void> {
  const dir = await ensureCampaignDir(campaignAddress);
  const filePath = path.join(dir, 'patterns.json');
  await fs.writeFile(filePath, JSON.stringify(patterns, null, 2));
}

/** Load campaign metadata (for cron/status) */
async function loadCampaignData(campaignAddress: string): Promise<CampaignData | null> {
  const filePath = path.join(getCampaignDir(campaignAddress), 'campaign.json');
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as CampaignData;
  } catch {
    return null;
  }
}

/** Save campaign metadata */
async function saveCampaignData(campaignAddress: string, data: CampaignData): Promise<void> {
  const dir = await ensureCampaignDir(campaignAddress);
  const filePath = path.join(dir, 'campaign.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/** Get all campaign addresses that have data */
async function getAllCampaignAddresses(): Promise<string[]> {
  try {
    await fs.mkdir(DATA_ROOT, { recursive: true });
    const entries = await fs.readdir(DATA_ROOT, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function parsedToStored(parsed: ParsedSubmission): StoredSubmission {
  return {
    tweetId: parsed.raw.tweetId,
    xUsername: parsed.xUsername,
    contentQualityScore: parsed.contentQualityScore,
    contentQualityPct: parsed.contentQualityPct,
    rawScore: parsed.rawScore,
    isValid: parsed.isValid,
    categories: parsed.categories.map((c) => ({
      name: c.name,
      score: c.score,
      maxScore: c.maxScore,
      percentage: c.percentage,
      analysis: c.analysis,
      isContent: c.isContent,
    })),
    missionId: parsed.missionId,
    fetchedAt: new Date().toISOString(),
  };
}

function computeCategoryStats(validSubs: ParsedSubmission[]): {
  weakCategories: string[];
  strongCategories: string[];
  topScore: number;
  averageScore: number;
} {
  const categoryScores: Record<string, number[]> = {};
  let totalScore = 0;
  let topScore = 0;

  for (const s of validSubs) {
    totalScore += s.contentQualityPct;
    if (s.contentQualityPct > topScore) topScore = s.contentQualityPct;

    for (const c of s.categories) {
      if (!c.isContent) continue;
      if (!categoryScores[c.name]) categoryScores[c.name] = [];
      categoryScores[c.name].push(c.percentage);
    }
  }

  const avgScore = validSubs.length > 0 ? totalScore / validSubs.length : 0;
  const mean = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const sorted = Object.entries(categoryScores)
    .map(([name, scores]) => ({ name, avg: mean(scores) }))
    .sort((a, b) => a.avg - b.avg);

  const weakCategories = sorted.slice(0, 3).map((c) => c.name);
  const strongCategories = sorted.slice(-3).map((c) => c.name).reverse();

  return {
    weakCategories,
    strongCategories,
    topScore: Math.round(topScore * 10) / 10,
    averageScore: Math.round(avgScore * 10) / 10,
  };
}

// ─── Step 2: AI Pattern Extraction ──────────────────────────────────

function buildAnalysisPayload(
  winners: ParsedSubmission[],
  losers: ParsedSubmission[]
): string {
  const parts: string[] = [];

  // Collect all content category names
  const categoryNames = new Set<string>();
  for (const s of [...winners, ...losers]) {
    for (const c of s.categories) {
      if (c.isContent) categoryNames.add(c.name);
    }
  }

  parts.push('=== TOP WINNERS (Highest Content Quality Scores) ===');
  parts.push('');

  for (let i = 0; i < winners.length; i++) {
    const w = winners[i];
    parts.push(`--- WINNER #${i + 1}: @${w.xUsername} (Score: ${w.contentQualityPct}%, Raw: ${w.contentQualityScore}) ---`);

    for (const cat of categoryNames) {
      const c = w.categories.find((cc) => cc.name === cat && cc.isContent);
      if (c && c.analysis) {
        parts.push(`[${cat}] Score: ${c.percentage}% (${c.score}/${c.maxScore})`);
        parts.push(`Judge Analysis: ${c.analysis}`);
        parts.push('');
      }
    }

    parts.push('---');
    parts.push('');
  }

  parts.push('');
  parts.push('=== BOTTOM PERFORMERS (Lowest Content Quality Scores) ===');
  parts.push('');

  for (let i = 0; i < losers.length; i++) {
    const l = losers[i];
    parts.push(`--- LOSER #${i + 1}: @${l.xUsername} (Score: ${l.contentQualityPct}%, Raw: ${l.contentQualityScore}) ---`);

    for (const cat of categoryNames) {
      const c = l.categories.find((cc) => cc.name === cat && cc.isContent);
      if (c && c.analysis) {
        parts.push(`[${cat}] Score: ${c.percentage}% (${c.score}/${c.maxScore})`);
        parts.push(`Judge Analysis: ${c.analysis}`);
        parts.push('');
      }
    }

    parts.push('---');
    parts.push('');
  }

  // Add category score comparison
  parts.push('');
  parts.push('=== CATEGORY SCORE COMPARISON ===');

  for (const cat of categoryNames) {
    const winnerScores = winners
      .map((w) => w.categories.find((c) => c.name === cat && c.isContent)?.percentage)
      .filter((s): s is number => s !== undefined);
    const loserScores = losers
      .map((l) => l.categories.find((c) => c.name === cat && c.isContent)?.percentage)
      .filter((s): s is number => s !== undefined);

    const wAvg = winnerScores.length > 0
      ? winnerScores.reduce((a, b) => a + b, 0) / winnerScores.length
      : 0;
    const lAvg = loserScores.length > 0
      ? loserScores.reduce((a, b) => a + b, 0) / loserScores.length
      : 0;

    parts.push(`${cat}: Winners avg ${Math.round(wAvg)}% | Losers avg ${Math.round(lAvg)}% | Gap ${Math.round(wAvg - lAvg)}%`);
  }

  return parts.join('\n');
}

const LEARNER_SYSTEM_PROMPT = `You are a LEARNING ANALYST for Rally.fun content campaigns. Your job is to analyze Rally judge's evaluation text and extract actionable patterns.

You will receive analysis text from Rally's AI judges for multiple submissions. Some scored high (winners) and some scored low (losers).

For each content category, extract:
1. STRENGTH_PATTERNS: What specific writing techniques, phrases, structures, or approaches cause HIGH scores?
2. WEAKNESS_PATTERNS: What specific writing techniques, phrases, structures, or approaches cause LOW scores?
3. RED_FLAG_PHRASES: Specific phrases or words that the Rally judge explicitly flags as negative
4. GREEN_FLAG_PHRASES: Specific phrases or words that the Rally judge explicitly praises
5. CATEGORY_INSIGHTS: What does the Rally judge actually look for in this category?

Respond in JSON format with this structure:
{
  "strength_patterns": [
    {
      "pattern": "specific pattern description",
      "examples": ["exact quote from analysis text"],
      "frequency_in_winners": 0.87,
      "frequency_in_losers": 0.15,
      "category": "Originality and Authenticity"
    }
  ],
  "weakness_patterns": [
    {
      "pattern": "specific weakness description",
      "red_flag_phrases": ["exact phrases from analysis"],
      "frequency_in_losers": 0.72,
      "frequency_in_winners": 0.05,
      "category": "Originality and Authenticity"
    }
  ],
  "banned_phrases": [
    { "phrase": "exact phrase", "reason": "why it's flagged" }
  ],
  "scoring_benchmarks": {
    "originality": { "winner_avg": 1.8, "loser_avg": 0.9, "target": 1.5 }
  },
  "category_insights": {
    "Originality and Authenticity": {
      "what_winners_do": "description",
      "what_losers_do": "description",
      "key_differentiator": "single most important factor",
      "rally_judge_expects": "what the judge evaluates"
    }
  },
  "top_examples": [
    { "rank": 1, "username": "...", "score": 20.0, "key_strengths": ["..."] }
  ]
}

IMPORTANT RULES:
- Only include patterns that are directly supported by the analysis text
- Use exact quotes from the judge's text as examples
- Frequency values should reflect what you observe in the data (not made up)
- scoring_benchmarks keys should use snake_case versions of category names
- Be precise and analytical — this drives content strategy`;

async function extractPatternsViaAI(
  winners: ParsedSubmission[],
  losers: ParsedSubmission[]
): Promise<AIPatternResponse> {
  const payload = buildAnalysisPayload(winners, losers);

  console.log(`[LearnEngine] Sending analysis to AI: ${winners.length} winners, ${losers.length} losers (${payload.length} chars)`);

  const ai = getAIClient();

  const response = await Promise.race([
    ai.chat(
      [
        { role: 'system', content: LEARNER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze these Rally judge evaluations and extract patterns.\n\n${payload}`,
        },
      ],
      {
        temperature: 0.3,
        enableThinking: false,
        maxTokens: 4000,
        model: 'glm-4-plus',
      }
    ),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI pattern extraction timed out (60s)')), AI_CALL_TIMEOUT_MS)
    ),
  ]);

  const content = response.content.trim();

  // Extract JSON from the response (handle markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON object boundaries if no code block
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(jsonStr) as AIPatternResponse;

  // Validate structure
  if (!parsed.strength_patterns && !parsed.weakness_patterns && !parsed.banned_phrases) {
    throw new Error('AI response missing expected pattern fields');
  }

  // Ensure arrays exist
  parsed.strength_patterns = parsed.strength_patterns || [];
  parsed.weakness_patterns = parsed.weakness_patterns || [];
  parsed.banned_phrases = parsed.banned_phrases || [];
  parsed.scoring_benchmarks = parsed.scoring_benchmarks || {};
  parsed.category_insights = parsed.category_insights || {};
  parsed.top_examples = parsed.top_examples || [];

  console.log(
    `[LearnEngine] AI extracted: ${parsed.strength_patterns.length} strength patterns, ` +
    `${parsed.weakness_patterns.length} weakness patterns, ` +
    `${parsed.banned_phrases.length} banned phrases, ` +
    `${Object.keys(parsed.category_insights).length} category insights`
  );

  return parsed;
}

// ─── Step 3: Pattern Merging ────────────────────────────────────────

function mergePatterns(
  existing: CampaignPatterns | null,
  incoming: AIPatternResponse,
  campaignAddress: string,
  campaignName: string
): { merged: CampaignPatterns; newPatternCount: number } {
  const merged: CampaignPatterns = {
    campaignAddress,
    campaignName,
    updatedAt: new Date().toISOString(),
    strengthPatterns: [...(existing?.strengthPatterns || [])],
    weaknessPatterns: [...(existing?.weaknessPatterns || [])],
    bannedPhrases: [...(existing?.bannedPhrases || [])],
    scoringBenchmarks: { ...(existing?.scoringBenchmarks || {}) },
    categoryInsights: { ...(existing?.categoryInsights || {}) },
    topExamples: [...(existing?.topExamples || [])],
  };

  let newPatternCount = 0;

  // --- Merge strength patterns ---
  for (const newSp of incoming.strength_patterns) {
    const existingIdx = merged.strengthPatterns.findIndex(
      (sp) => sp.pattern.toLowerCase() === newSp.pattern.toLowerCase() && sp.category === newSp.category
    );

    if (existingIdx >= 0) {
      // Update frequency counts with weighted average (favor recent data)
      const existingSp = merged.strengthPatterns[existingIdx];
      existingSp.frequency_in_winners = Math.round(
        (existingSp.frequency_in_winners * 0.6 + newSp.frequency_in_winners * 0.4) * 100
      ) / 100;
      existingSp.frequency_in_losers = Math.round(
        (existingSp.frequency_in_losers * 0.6 + newSp.frequency_in_losers * 0.4) * 100
      ) / 100;

      // Merge examples (deduplicate)
      for (const ex of newSp.examples || []) {
        if (!existingSp.examples.includes(ex)) {
          existingSp.examples.push(ex);
          if (existingSp.examples.length > 5) existingSp.examples.shift();
        }
      }
    } else {
      merged.strengthPatterns.push({ ...newSp, examples: newSp.examples || [] });
      newPatternCount++;
    }
  }

  // --- Merge weakness patterns ---
  for (const newWp of incoming.weakness_patterns) {
    const existingIdx = merged.weaknessPatterns.findIndex(
      (wp) => wp.pattern.toLowerCase() === newWp.pattern.toLowerCase() && wp.category === newWp.category
    );

    if (existingIdx >= 0) {
      const existingWp = merged.weaknessPatterns[existingIdx];
      existingWp.frequency_in_losers = Math.round(
        (existingWp.frequency_in_losers * 0.6 + newWp.frequency_in_losers * 0.4) * 100
      ) / 100;
      existingWp.frequency_in_winners = Math.round(
        (existingWp.frequency_in_winners * 0.6 + newWp.frequency_in_winners * 0.4) * 100
      ) / 100;

      for (const phrase of newWp.red_flag_phrases || []) {
        if (!existingWp.red_flag_phrases.includes(phrase)) {
          existingWp.red_flag_phrases.push(phrase);
        }
      }
    } else {
      merged.weaknessPatterns.push({ ...newWp, red_flag_phrases: newWp.red_flag_phrases || [] });
      newPatternCount++;
    }
  }

  // --- Merge banned phrases ---
  const existingBannedPhrases = new Set(merged.bannedPhrases.map((bp) => bp.phrase.toLowerCase()));
  for (const newBp of incoming.banned_phrases) {
    if (!existingBannedPhrases.has(newBp.phrase.toLowerCase())) {
      merged.bannedPhrases.push(newBp);
      existingBannedPhrases.add(newBp.phrase.toLowerCase());
      newPatternCount++;
    }
  }

  // --- Update scoring benchmarks (replace with latest data) ---
  for (const [key, bench] of Object.entries(incoming.scoring_benchmarks)) {
    if (merged.scoringBenchmarks[key]) {
      const existingB = merged.scoringBenchmarks[key];
      merged.scoringBenchmarks[key] = {
        winner_avg: Math.round((existingB.winner_avg * 0.4 + bench.winner_avg * 0.6) * 100) / 100,
        loser_avg: Math.round((existingB.loser_avg * 0.4 + bench.loser_avg * 0.6) * 100) / 100,
        target: Math.round((existingB.target * 0.5 + bench.target * 0.5) * 100) / 100,
      };
    } else {
      merged.scoringBenchmarks[key] = bench;
    }
  }

  // --- Update category insights (replace with latest) ---
  for (const [key, insight] of Object.entries(incoming.category_insights)) {
    merged.categoryInsights[key] = insight;
  }

  // --- Update top examples (keep top 20, sorted by score desc) ---
  for (const newEx of incoming.top_examples) {
    const existingIdx = merged.topExamples.findIndex(
      (ex) => ex.username === newEx.username
    );

    if (existingIdx >= 0) {
      // Update if new score is higher
      if (newEx.score > merged.topExamples[existingIdx].score) {
        merged.topExamples[existingIdx] = newEx;
      }
    } else {
      merged.topExamples.push(newEx);
    }
  }

  // Sort and trim top examples
  merged.topExamples.sort((a, b) => b.score - a.score);
  merged.topExamples = merged.topExamples.slice(0, 20);

  // Update ranks
  merged.topExamples.forEach((ex, i) => {
    ex.rank = i + 1;
  });

  return { merged, newPatternCount };
}

// ─── Step 4: Session Logging ────────────────────────────────────────

async function recordSession(
  campaignAddress: string,
  campaignName: string,
  session: LearnSession
): Promise<void> {
  let data = await loadCampaignData(campaignAddress);

  if (!data) {
    data = {
      campaignAddress,
      campaignName,
      cronEnabled: false,
      cronIntervalHours: 6,
      lastLearnAt: null,
      nextScheduledLearn: null,
      totalSubmissions: 0,
      sessions: [],
    };
  }

  data.lastLearnAt = session.timestamp;
  data.sessions.push(session);

  // Keep only last 50 sessions
  if (data.sessions.length > 50) {
    data.sessions = data.sessions.slice(-50);
  }

  // Update next scheduled learn if cron is enabled
  if (data.cronEnabled) {
    const nextTime = new Date(session.timestamp);
    nextTime.setHours(nextTime.getHours() + data.cronIntervalHours);
    data.nextScheduledLearn = nextTime.toISOString();
  }

  await saveCampaignData(campaignAddress, data);
}

// ─── Main Learn Function ────────────────────────────────────────────

export async function runLearn(
  campaignAddress: string,
  campaignName?: string,
  options?: {
    onProgress?: (progress: LearnProgress) => void;
    forceReanalyze?: boolean;
    maxSubmissions?: number;
  }
): Promise<LearnResult> {
  const startTime = Date.now();
  const name = campaignName || 'Unknown Campaign';
  const maxSubs = options?.maxSubmissions || 200;
  const progress = options?.onProgress || (() => {});

  const reportProgress = (phase: LearnProgress['phase'], message: string) => {
    progress({ phase, message, timestamp: Date.now() });
    console.log(`[LearnEngine] [${phase}] ${message}`);
  };

  try {
    // ── Step 1: Fetch New Submissions ──
    reportProgress('fetching', `Fetching Rally submissions for "${name}"...`);

    const rawSubmissions: RallySubmission[] = await Promise.race([
      fetchRallySubmissions(campaignAddress, { limit: maxSubs }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Rally API fetch timed out (30s)')), RALLY_API_TIMEOUT_MS)
      ),
    ]);

    if (rawSubmissions.length === 0) {
      console.log('[LearnEngine] No submissions fetched — campaign may have no data');
      return {
        success: true,
        newSubmissions: 0,
        duplicateSubmissions: 0,
        totalSubmissions: 0,
        patternsExtracted: false,
        newPatterns: 0,
        topScore: 0,
        averageScore: 0,
        weakCategories: [],
        strongCategories: [],
        duration: Date.now() - startTime,
      };
    }

    console.log(`[LearnEngine] Fetched ${rawSubmissions.length} raw submissions`);

    // Parse all submissions
    const allParsed = rawSubmissions.map(parseSubmission);
    const validParsed = allParsed.filter((s) => s.isValid);

    // ── Step 1b: Deduplicate ──
    reportProgress('deduplicating', `Deduplicating against stored data...`);

    const storedSubmissions = await loadStoredSubmissions(campaignAddress);
    const existingTweetIds = new Set(storedSubmissions.map((s) => s.tweetId));

    const newParsed = options?.forceReanalyze
      ? validParsed
      : validParsed.filter((s) => !existingTweetIds.has(s.raw.tweetId));

    const duplicateCount = validParsed.length - newParsed.length;
    console.log(
      `[LearnEngine] Deduplication: ${newParsed.length} new, ${duplicateCount} duplicates, ` +
      `${storedSubmissions.length} previously stored`
    );

    // Store new submissions
    if (newParsed.length > 0) {
      const newStored = newParsed.map(parsedToStored);
      const allStored = options?.forceReanalyze
        ? newStored
        : [...storedSubmissions, ...newStored];

      await saveStoredSubmissions(campaignAddress, allStored);
      console.log(`[LearnEngine] Stored ${allStored.length} total submissions for campaign`);
    }

    // Compute stats across ALL valid submissions (for accurate category analysis)
    const analysisSubmissions = options?.forceReanalyze
      ? newParsed
      : [...validParsed];

    const stats = computeCategoryStats(analysisSubmissions);

    // ── Step 2: AI Pattern Extraction ──
    let patternsExtracted = false;
    let newPatterns = 0;

    const submissionsForAI = options?.forceReanalyze ? analysisSubmissions : newParsed;

    if (submissionsForAI.length >= MIN_SUBMISSIONS_FOR_AI) {
      reportProgress(
        'analyzing',
        `Analyzing ${submissionsForAI.length} submissions with AI (winner vs loser comparison)...`
      );

      // Sort by content quality to pick winners and losers
      const sorted = [...submissionsForAI].sort((a, b) => b.contentQualityPct - a.contentQualityPct);
      const winners = sorted.slice(0, WINNER_LOSER_SAMPLE_SIZE);
      const losers = sorted.slice(-WINNER_LOSER_SAMPLE_SIZE).reverse();

      try {
        const aiPatterns = await extractPatternsViaAI(winners, losers);
        patternsExtracted = true;

        // ── Step 3: Merge Patterns ──
        reportProgress('merging', 'Merging new patterns with existing knowledge...');

        const existingPatterns = await loadCampaignPatterns(campaignAddress);
        const { merged, newPatternCount } = mergePatterns(
          existingPatterns,
          aiPatterns,
          campaignAddress,
          name
        );

        await saveCampaignPatterns(campaignAddress, merged);
        newPatterns = newPatternCount;

        console.log(`[LearnEngine] Merged patterns: ${newPatternCount} new patterns added`);
      } catch (aiError) {
        const aiErrorMsg = aiError instanceof Error ? aiError.message : String(aiError);
        console.warn(`[LearnEngine] AI pattern extraction failed: ${aiErrorMsg}`);
        console.warn('[LearnEngine] Continuing without AI patterns — raw data still stored');
        patternsExtracted = false;
      }
    } else {
      console.log(
        `[LearnEngine] Skipping AI analysis — only ${submissionsForAI.length} new submissions ` +
        `(need ≥${MIN_SUBMISSIONS_FOR_AI})`
      );
    }

    // ── Step 4: Update Learn Session Log ──
    const session: LearnSession = {
      timestamp: new Date().toISOString(),
      newSubmissions: newParsed.length,
      patternsExtracted,
      newPatterns,
      durationMs: Date.now() - startTime,
      success: true,
    };

    await recordSession(campaignAddress, name, session);

    // Update total submissions in campaign data
    const campaignData = await loadCampaignData(campaignAddress);
    if (campaignData) {
      campaignData.totalSubmissions = (await loadStoredSubmissions(campaignAddress)).length;
      await saveCampaignData(campaignAddress, campaignData);
    }

    reportProgress('done', `Learning complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    return {
      success: true,
      newSubmissions: newParsed.length,
      duplicateSubmissions: duplicateCount,
      totalSubmissions: analysisSubmissions.length,
      patternsExtracted,
      newPatterns,
      topScore: stats.topScore,
      averageScore: stats.averageScore,
      weakCategories: stats.weakCategories,
      strongCategories: stats.strongCategories,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[LearnEngine] Learning failed: ${errorMsg}`);

    // Record failed session
    try {
      await recordSession(campaignAddress, name, {
        timestamp: new Date().toISOString(),
        newSubmissions: 0,
        patternsExtracted: false,
        newPatterns: 0,
        durationMs: Date.now() - startTime,
        success: false,
        error: errorMsg,
      });
    } catch {
      // Don't let session recording failure mask the original error
    }

    return {
      success: false,
      newSubmissions: 0,
      duplicateSubmissions: 0,
      totalSubmissions: 0,
      patternsExtracted: false,
      newPatterns: 0,
      topScore: 0,
      averageScore: 0,
      weakCategories: [],
      strongCategories: [],
      duration: Date.now() - startTime,
      error: errorMsg,
    };
  }
}

// ─── Cron: Scheduled Learning ───────────────────────────────────────

/**
 * Check all campaigns with cron enabled and run learn for those
 * whose nextScheduledLearn has passed.
 */
export async function runCronLearn(): Promise<{ campaign: string; result: LearnResult }[]> {
  console.log('[LearnEngine] Running cron learn cycle...');

  const campaignAddresses = await getAllCampaignAddresses();
  const results: { campaign: string; result: LearnResult }[] = [];
  const now = Date.now();

  for (const addr of campaignAddresses) {
    try {
      const data = await loadCampaignData(addr);

      if (!data || !data.cronEnabled || !data.lastLearnAt) {
        continue;
      }

      const nextLearn = data.nextScheduledLearn
        ? new Date(data.nextScheduledLearn).getTime()
        : new Date(data.lastLearnAt).getTime() + data.cronIntervalHours * 3600_000;

      if (now < nextLearn) {
        console.log(
          `[LearnEngine] Skipping ${addr.substring(0, 10)}... — not due yet ` +
          `(next: ${new Date(nextLearn).toISOString()})`
        );
        continue;
      }

      console.log(`[LearnEngine] Cron triggered for ${addr.substring(0, 10)}... (${data.campaignName})`);

      const result = await runLearn(addr, data.campaignName);
      results.push({ campaign: addr, result });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[LearnEngine] Cron error for ${addr}: ${errorMsg}`);
      results.push({
        campaign: addr,
        result: {
          success: false,
          newSubmissions: 0,
          duplicateSubmissions: 0,
          totalSubmissions: 0,
          patternsExtracted: false,
          newPatterns: 0,
          topScore: 0,
          averageScore: 0,
          weakCategories: [],
          strongCategories: [],
          duration: 0,
          error: errorMsg,
        },
      });
    }
  }

  console.log(`[LearnEngine] Cron cycle complete: ${results.length} campaigns processed`);
  return results;
}

// ─── Get Learn Status ───────────────────────────────────────────────

export async function getLearnStatus(campaignAddress: string): Promise<{
  hasData: boolean;
  totalSubmissions: number;
  lastLearnAt: string | null;
  nextScheduledLearn: string | null;
  cronEnabled: boolean;
  cronIntervalHours: number;
}> {
  const campaignData = await loadCampaignData(campaignAddress);
  const storedSubs = await loadStoredSubmissions(campaignAddress);
  const patterns = await loadCampaignPatterns(campaignAddress);

  const hasData = storedSubs.length > 0 || patterns !== null;

  return {
    hasData,
    totalSubmissions: storedSubs.length,
    lastLearnAt: campaignData?.lastLearnAt || null,
    nextScheduledLearn: campaignData?.nextScheduledLearn || null,
    cronEnabled: campaignData?.cronEnabled || false,
    cronIntervalHours: campaignData?.cronIntervalHours || 6,
  };
}

// ─── Utility: Configure Cron for a Campaign ─────────────────────────

export async function configureCron(
  campaignAddress: string,
  campaignName: string,
  options: {
    enabled: boolean;
    intervalHours?: number;
  }
): Promise<void> {
  let data = await loadCampaignData(campaignAddress);

  if (!data) {
    data = {
      campaignAddress,
      campaignName,
      cronEnabled: false,
      cronIntervalHours: 6,
      lastLearnAt: null,
      nextScheduledLearn: null,
      totalSubmissions: 0,
      sessions: [],
    };
  }

  data.cronEnabled = options.enabled;
  if (options.intervalHours) {
    data.cronIntervalHours = options.intervalHours;
  }

  if (options.enabled) {
    const nextTime = new Date();
    nextTime.setHours(nextTime.getHours() + data.cronIntervalHours);
    data.nextScheduledLearn = nextTime.toISOString();
  } else {
    data.nextScheduledLearn = null;
  }

  await saveCampaignData(campaignAddress, data);
  console.log(
    `[LearnEngine] Cron ${options.enabled ? 'enabled' : 'disabled'} for ${campaignAddress.substring(0, 10)}... ` +
    `(interval: ${data.cronIntervalHours}h)`
  );
}

// ─── Utility: Get Stored Patterns ───────────────────────────────────

export async function getStoredPatterns(
  campaignAddress: string
): Promise<CampaignPatterns | null> {
  return loadCampaignPatterns(campaignAddress);
}

// ─── Utility: Get Learn History ─────────────────────────────────────

export async function getLearnHistory(
  campaignAddress: string,
  limit?: number
): Promise<LearnSession[]> {
  const data = await loadCampaignData(campaignAddress);
  if (!data) return [];

  const sessions = [...data.sessions].reverse();
  return limit ? sessions.slice(0, limit) : sessions;
}

// ─── Utility: Clear All Learn Data for a Campaign ───────────────────

export async function clearLearnData(campaignAddress: string): Promise<void> {
  const dir = getCampaignDir(campaignAddress);
  try {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      await fs.unlink(path.join(dir, entry));
    }
    await fs.rmdir(dir);
    console.log(`[LearnEngine] Cleared all learn data for ${campaignAddress.substring(0, 10)}...`);
  } catch {
    // Directory may not exist — that's fine
  }
}
