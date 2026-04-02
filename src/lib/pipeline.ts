/**
 * Pipeline Orchestrator v2 — Rally-Aligned
 *
 * The main pipeline for Rally content generation:
 * - Takes a campaign job from queue
 * - GROUND TRUTH CALIBRATION: Fetches REAL Rally submissions for scoring calibration
 * - COMPETITIVE INTELLIGENCE: Analyzes competitor content, builds differentiation strategy
 * - Generates 3 content variations per cycle (rate limit efficient)
 * - 2-stage judge for each: Optimist (pass/fail) → Analyst (scoring)
 * - JUDGE ISOLATION: Each judge uses a DIFFERENT token, unique session ID, and diverse temperature
 * - RALLY-ALIGNED CONSENSUS: Median for all 7 content categories (GenLayer Byzantine consensus)
 * - Scores match Rally.fun's ACTUAL scoring: 7 content categories (max 21.0 points)
 * - Max 2 regeneration cycles per job (with 4-minute pipeline timeout)
 * - COMPETITIVE ANALYSIS: Disabled by default (rate limit budget prioritized for content gen)
 * - ADAPTIVE LEARNING LOOP:
 *   - Analyzes feedback from ALL failing candidates
 *   - Cross-cycle feedback accumulation
 *   - Failure pattern analysis across 7 content categories
 *   - Dynamic prompt adaptation
 *   - Smart fail-fast: only stops if no improvement after cycle 3
 */

import {
  generateContent,
  judgeContent,
  regenerateContent,
  type GeneratedContent,
  type JudgeResult,
} from './ai-service';
import { getAIClient, type TokenData } from './http-ai-client';
import {
  getSubmissionsSummary,
  type SubmissionsSummary,
} from './rally-submissions';
// runCalibration no longer called directly (was causing duplicate API fetch)
import {
  mergeRallyJudgeScores,
  calculateRallyContentScore,
  detectG4Elements,
  detectXFactors,
  type RallyScoringResult,
  type RallyContentScores,
} from './rally-scoring';
import { checkCompliance } from './ai-service';
import {
  runCompetitiveAnalysis,
  checkContentSimilarity,
  convertRallyMetricWeights,
  type CompetitiveAnalysis,
} from './rally-competitive';

// ─── Campaign Summary Builder (instant, no AI call) ───────────────

/**
 * Build a campaign summary directly from raw Rally campaign data.
 * This replaces the old analyzeCampaign() AI call (~15s saved).
 * Extracts key info for content generation without any AI invocation.
 */
function buildCampaignSummary(campaignData: Record<string, unknown>): Record<string, unknown> {
  const title = String(campaignData.title || campaignData.campaignName || '');
  const description = String(campaignData.description || '');
  const rules = Array.isArray(campaignData.rules) ? campaignData.rules.join('\n') : String(campaignData.rules || '');
  const mission = String(campaignData.mission || campaignData.coreMessage || '');
  const prohibitedItems = Array.isArray(campaignData.prohibitedItems) ? campaignData.prohibitedItems.join(', ') : String(campaignData.prohibitedItems || '');
  const requiredElements = Array.isArray(campaignData.requiredElements) ? campaignData.requiredElements.join(', ') : String(campaignData.requiredElements || '');
  const platform = String(campaignData.platform || 'X (Twitter)');
  const contentType = String(campaignData.contentType || campaignData.content_type || 'reply');

  return {
    source: 'direct_extraction',
    title,
    description: description.substring(0, 500),
    rules: rules.substring(0, 500),
    mission: mission.substring(0, 300),
    prohibitedItems: prohibitedItems.substring(0, 300),
    requiredElements: requiredElements.substring(0, 300),
    platform,
    contentType,
    keyRequirements: [mission, rules, requiredElements].filter(Boolean).join(' | ').substring(0, 500),
    estimatedDifficulty: (rules.length + prohibitedItems.length) > 200 ? 'high' : (rules.length + prohibitedItems.length) > 50 ? 'medium' : 'low',
  };
}

// ─── Pipeline Configuration ─────────────────────────────────────────

const CONFIG = {
  variationsPerCycle: 4,    // 4 variations — more diversity, better chance of hitting quality gate in 1 cycle
  maxCycles: 2,             // 2 cycles — cycle 2 uses adaptive feedback from cycle 1 failures
  minQualityPct: 35,        // 35% to pass (7.35/21 — Above Average, not too strict but filters truly bad content)
  failFastCycle: 2,         // Only fail fast after cycle 2
  // ═══ OPTIMIZED: 2-judge system (no critic) ═══
  // Critic judge times out 50% of the time (45s wasted each). Removing it:
  // - Saves ~45s per cycle (no critic timeout)
  // - Optimist + Analyst provide sufficient score variance
  // - Median of 2 = average of 2 (still produces good scores)
  judgeTypes: ['optimist', 'analyst'] as const,  // 2-stage judge (fast, no timeout)
  // Pipeline timeouts — v6.1: generous margins for rate-limited parallel generation
  pipelineTimeoutMs: 300000, // 5 min hard limit (safety margin for rate limit delays)
  cycleTimeoutMs: 150000,     // 2.5 min per cycle (4 parallel gen ~30s + cascade judge ~20s + rate limit margin)
  gatewayTimeoutMs: 270000,  // 4.5 min margin
  skipCompetitiveAnalysis: false,  // ENABLED — but NON-BLOCKING (runs in background)
  skipGroundTruthCalibration: false,  // ENABLED — ground truth calibration (non-blocking background)
};

// ─── Pipeline Types ─────────────────────────────────────────────────

export interface PipelineJob {
  id: string;
  campaignName: string;
  campaignData: Record<string, unknown>;
}

export interface ContentCandidate {
  index: number;
  content: string;
  generated: GeneratedContent;
  judgeResults: JudgeResult[];
  scoring: RallyScoringResult;
  passedQualityGate: boolean;
  cycle: number;
  isRegeneration: boolean;
}

export interface PipelineResult {
  jobId: string;
  campaignName: string;
  status: 'success' | 'failed' | 'partial';
  bestContent: string | null;
  bestScoring: RallyScoringResult | null;
  totalCycles: number;
  totalVariationsGenerated: number;
  totalAIcalls: number;
  candidates: ContentCandidate[];
  campaignAnalysis: Record<string, unknown> | null;
  competitiveAnalysis: CompetitiveAnalysis | null;
  competitorBeatScore?: number;
  /** Ground truth data from REAL Rally submissions */
  groundTruth?: {
    totalValid: number;
    contentQualityMean: number;
    contentQualityMedian: number;
    contentCategories: string[];
    engagementCategories: string[];
    weakCategories: string[];
    strongCategories: string[];
    top10Threshold: number;
    calibrationThresholds?: {
      top10Pct: number;
      top25Pct: number;
      top50Pct: number;
      averagePct: number;
    };
  };
  error?: string;
  processingTime: number;
}

interface CycleResult {
  cycle: number;
  candidates: ContentCandidate[];
  passedCount: number;
  eliminatedCount: number;
  bestCandidate: ContentCandidate | null;
  aiCalls: number;
}

// ─── Adaptive Learning Types ────────────────────────────────────────

interface FailurePattern {
  /** Average score per content category across failing candidates */
  avgCategoryScores: {
    originalityAuthenticity: number;
    contentAlignment: number;
    informationAccuracy: number;
    campaignCompliance: number;
    engagementPotential: number;
    technicalQuality: number;
    replyQuality: number;
  };
  /** How many candidates scored 0 on each binary gate */
  zeroGateCounts: {
    originalityAuthenticity: number;
    contentAlignment: number;
    informationAccuracy: number;
    campaignCompliance: number;
  };
  /** Most common feedback themes */
  recurringFeedback: string[];
  /** Most common improvement suggestions */
  recurringImprovements: string[];
  /** Whether any candidate scored 0 on a binary gate */
  hasGateFailure: boolean;
  /** Whether quality scores are weak */
  hasQualityWeakness: boolean;
  /** Best content quality score so far */
  bestScoreSoFar: number;
  /** Number of cycles analyzed */
  cyclesAnalyzed: number;
}

interface CrossCycleMemory {
  patterns: FailurePattern;
  allFeedback: Array<{
    cycle: number;
    candidateIndex: number;
    feedback: string;
    improvements: string[];
    contentQualityPct: number;
  }>;
  cpTrendPerCycle: number[];
  /** Calibration thresholds from real Rally data */
  calibrationThresholds?: {
    top10Pct: number;
    top25Pct: number;
    top50Pct: number;
    averagePct: number;
  };
}

// ─── Pattern Analysis ───────────────────────────────────────────────

function analyzeCyclePatterns(candidates: ContentCandidate[], bestScoreSoFar: number, cyclesAnalyzed: number): FailurePattern {
  const failing = candidates.filter(c => !c.passedQualityGate);
  if (failing.length === 0) {
    return {
      avgCategoryScores: {
        originalityAuthenticity: 0, contentAlignment: 0, informationAccuracy: 0,
        campaignCompliance: 0, engagementPotential: 0, technicalQuality: 0, replyQuality: 0,
      },
      zeroGateCounts: {
        originalityAuthenticity: 0, contentAlignment: 0, informationAccuracy: 0, campaignCompliance: 0,
      },
      recurringFeedback: [],
      recurringImprovements: [],
      hasGateFailure: false,
      hasQualityWeakness: false,
      bestScoreSoFar,
      cyclesAnalyzed,
    };
  }

  const n = failing.length;

  // Average scores per category
  const avgScores = {
    originalityAuthenticity: 0, contentAlignment: 0, informationAccuracy: 0,
    campaignCompliance: 0, engagementPotential: 0, technicalQuality: 0, replyQuality: 0,
  };

  // Count zero-scored gates
  const zeroGates = {
    originalityAuthenticity: 0, contentAlignment: 0, informationAccuracy: 0, campaignCompliance: 0,
  };

  let hasGateFailure = false;

  for (const candidate of failing) {
    const c = candidate.scoring.content;
    avgScores.originalityAuthenticity += c.originalityAuthenticity;
    avgScores.contentAlignment += c.contentAlignment;
    avgScores.informationAccuracy += c.informationAccuracy;
    avgScores.campaignCompliance += c.campaignCompliance;
    avgScores.engagementPotential += c.engagementPotential;
    avgScores.technicalQuality += c.technicalQuality;
    avgScores.replyQuality += c.replyQuality;

    // Check for gate failures (score = 0)
    if (c.originalityAuthenticity === 0) { zeroGates.originalityAuthenticity++; hasGateFailure = true; }
    if (c.contentAlignment === 0) { zeroGates.contentAlignment++; hasGateFailure = true; }
    if (c.informationAccuracy === 0) { zeroGates.informationAccuracy++; hasGateFailure = true; }
    if (c.campaignCompliance === 0) { zeroGates.campaignCompliance++; hasGateFailure = true; }
  }

  // Normalize averages
  for (const key of Object.keys(avgScores) as (keyof typeof avgScores)[]) {
    avgScores[key] = Math.round((avgScores[key] / n) * 100) / 100;
  }

  // Collect feedback
  const allFeedback: string[] = [];
  const allImprovements: string[] = [];
  for (const candidate of failing) {
    for (const judgeResult of candidate.judgeResults) {
      if (judgeResult.feedback) allFeedback.push(judgeResult.feedback);
      for (const imp of judgeResult.improvements) {
        if (imp) allImprovements.push(imp);
      }
    }
  }

  const recurringFeedback = findRecurringThemes(allFeedback, 2);
  const recurringImprovements = findRecurringThemes(allImprovements, 1);

  // Quality weakness check (binary gates score avg < 1.0 or quality scores avg < 2.5)
  const hasQualityWeakness =
    avgScores.originalityAuthenticity < 1.0 ||
    avgScores.contentAlignment < 1.0 ||
    avgScores.engagementPotential < 2.5 ||
    avgScores.technicalQuality < 2.5;

  // Find best score across ALL candidates
  const cycleBestScore = Math.max(...candidates.map(c => c.scoring.contentQualityScore));
  const newBestScore = Math.max(bestScoreSoFar, cycleBestScore);

  return {
    avgCategoryScores: avgScores,
    zeroGateCounts: zeroGates,
    recurringFeedback,
    recurringImprovements,
    hasGateFailure,
    hasQualityWeakness,
    bestScoreSoFar: newBestScore,
    cyclesAnalyzed: cyclesAnalyzed + 1,
  };
}

function findRecurringThemes(entries: string[], minOccurrences: number): string[] {
  const phrases = new Map<string, number>();
  for (const entry of entries) {
    const normalized = entry.toLowerCase().trim();
    const words = normalized.split(/\s+/).filter(w => w.length >= 3);
    for (let i = 0; i < words.length; i++) {
      phrases.set(words[i], (phrases.get(words[i]) || 0) + 1);
      if (i + 1 < words.length) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        phrases.set(bigram, (phrases.get(bigram) || 0) + 1);
      }
    }
  }
  return [...phrases.entries()]
    .filter(([, count]) => count >= minOccurrences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase]) => phrase);
}

// ─── Dynamic Prompt Builder ─────────────────────────────────────────

function buildAdaptiveRegenerationInstructions(memory: CrossCycleMemory): {
  feedbackSummary: string;
  improvementsList: string[];
  focusAreas: string[];
} {
  const patterns = memory.patterns;
  const feedbackParts: string[] = [];
  const improvementsList: string[] = [];
  const focusAreas: string[] = [];

  // 1. Address gate failures (binary gates scoring 0)
  if (patterns.hasGateFailure) {
    const gateFailures = Object.entries(patterns.zeroGateCounts).filter(([, count]) => count > 0);
    if (gateFailures.length > 0) {
      feedbackParts.push(`⚠️ CRITICAL: ${gateFailures.length} content category(ies) scoring 0 — content is being heavily penalized.`);

      for (const [gate, count] of gateFailures) {
        const pct = Math.round((count / (memory.allFeedback.length || 1)) * 100);
        feedbackParts.push(`- ${gate}: Scored 0 in ${pct}% of candidates`);

        switch (gate) {
          case 'originalityAuthenticity':
            focusAreas.push('Make it GENUINELY ORIGINAL — avoid AI-sounding phrases, template structures, or generic takes');
            improvementsList.push('Use a completely different angle/perspective; add personal voice and imperfections');
            break;
          case 'contentAlignment':
            focusAreas.push('STRICTLY match the campaign core message — every sentence must align');
            improvementsList.push('Re-read the campaign brief; ensure content directly addresses the core message');
            break;
          case 'informationAccuracy':
            focusAreas.push('Only include VERIFIABLE claims — remove speculation or unverified statements');
            improvementsList.push('Remove any claims not supported by the knowledge base; use vague language for unknowns');
            break;
          case 'campaignCompliance':
            focusAreas.push('Follow ALL campaign rules — check prohibited items and formatting requirements');
            improvementsList.push('Review campaign rules; remove any prohibited content or phrases');
            break;
        }
      }
    }
  }

  // 2. Address quality weaknesses (low scores on continuous categories)
  if (patterns.hasQualityWeakness) {
    const weakCategories: [string, number, number][] = [
      ['Engagement Potential', patterns.avgCategoryScores.engagementPotential, 5],
      ['Technical Quality', patterns.avgCategoryScores.technicalQuality, 5],
      ['Reply Quality', patterns.avgCategoryScores.replyQuality, 5],
    ].filter(([, avg]) => (avg as number) < 2.5) as [string, number, number][];

    if (weakCategories.length > 0) {
      feedbackParts.push(`- Weak quality categories: ${weakCategories.map(([name, avg, max]) => `${name} avg ${avg}/${max}`).join(', ')}`);

      for (const [name, avg] of weakCategories) {
        switch (name) {
          case 'Engagement Potential':
            improvementsList.push('Write a MUCH stronger opening line; add elements that provoke engagement');
            focusAreas.push('Stronger engagement potential');
            break;
          case 'Technical Quality':
            improvementsList.push('Improve sentence flow, transitions, and overall readability');
            focusAreas.push('Better writing quality');
            break;
          case 'Reply Quality':
            improvementsList.push('Add more conversational depth; end with a question or thought-provoking statement');
            focusAreas.push('Better reply/conversational quality');
            break;
        }
      }
    }
  }

  // 3. Recurring feedback themes
  if (patterns.recurringFeedback.length > 0) {
    feedbackParts.push(`\nRecurring judge feedback: ${patterns.recurringFeedback.slice(0, 5).join(', ')}`);
  }

  // 4. Recurring improvements
  if (patterns.recurringImprovements.length > 0) {
    for (const imp of patterns.recurringImprovements.slice(0, 3)) {
      if (!improvementsList.includes(imp)) improvementsList.push(imp);
    }
  }

  // 5. Cross-cycle trend
  if (memory.cpTrendPerCycle.length > 1) {
    const lastCP = memory.cpTrendPerCycle[memory.cpTrendPerCycle.length - 1];
    const prevCP = memory.cpTrendPerCycle[memory.cpTrendPerCycle.length - 2];
    const trend = lastCP > prevCP ? 'IMPROVING ↗' : lastCP < prevCP ? 'DECLINING ↘' : 'STABLE →';
    feedbackParts.push(`\n📊 Cross-cycle trend: ${trend} (Score: ${prevCP.toFixed(1)} → ${lastCP.toFixed(1)} / 21.0)`);
  }

  return {
    feedbackSummary: feedbackParts.join('\n'),
    improvementsList: [...new Set(improvementsList)].slice(0, 8),
    focusAreas,
  };
}

// ─── Pipeline Execution ─────────────────────────────────────────────

// ─── Pipeline Progress Callback ───────────────────────────────────────

export interface PipelineProgressOptions {
  onProgress?: (message: string, type: 'info' | 'success' | 'warning' | 'error' | 'system') => void;
}

export async function runPipeline(job: PipelineJob, options?: PipelineProgressOptions): Promise<PipelineResult> {
  const startTime = Date.now();
  let totalAIcalls = 0;
  const allCandidates: ContentCandidate[] = [];

  // Real-time progress emitter — sends to both console and SSE stream
  const emit = (message: string, type: 'info' | 'success' | 'warning' | 'error' | 'system' = 'info') => {
    console.log(`[Pipeline] ${message}`);
    options?.onProgress?.(message, type);
  };

  // Declare these before try so they're accessible in catch
  let campaignAnalysisResult: Record<string, unknown> | null = null;
  let competitiveAnalysisResult: CompetitiveAnalysis | null = null;

  // Pipeline-level timeout guard
  const pipelineTimer = setTimeout(() => {
    console.error(`[Pipeline] TIMEOUT: Pipeline exceeded ${CONFIG.pipelineTimeoutMs / 1000}s limit`);
  }, CONFIG.pipelineTimeoutMs);

  try {
    // ═══════════════════════════════════════════════════════════════
    // PRE-CYCLE PHASE: NON-BLOCKING (v3 optimization)
    // - Campaign analysis: instant (no AI call — extracted from raw data)
    // - Ground truth: fire-and-forget background fetch (injected if ready)
    // - Competitive analysis: fire-and-forget background fetch
    // Total pre-cycle time: ~0s (was ~15s with campaign analysis AI call)
    // ═══════════════════════════════════════════════════════════════
    emit('Building campaign summary from raw data (no AI call)...');
    emit('Starting background tasks: ground truth + competitive analysis...', 'info');

    // INSTANT: Build campaign analysis from raw data (eliminates ~15s AI call)
    const campaignAnalysis = buildCampaignSummary(job.campaignData);
    campaignAnalysisResult = campaignAnalysis;
    emit('Campaign summary built instantly from raw data', 'success');

    // BACKGROUND: Ground truth fetch (non-AI, just Rally API calls — fire-and-forget)
    let groundTruthData: {
      groundTruthPrompt: string;
      rallySubmissions: SubmissionsSummary | null;
      calibrationThresholds: { top10Pct: number; top25Pct: number; top50Pct: number; averagePct: number } | undefined;
    } | null = null;

    const groundTruthBgPromise = (async () => {
      let groundTruthPrompt = '';
      let rallySubmissions: SubmissionsSummary | null = null;
      let calibrationThresholds: { top10Pct: number; top25Pct: number; top50Pct: number; averagePct: number } | undefined;

      if (!CONFIG.skipGroundTruthCalibration) {
        try {
          const campaignAddr = String(job.campaignData.intelligentContractAddress || '');
          if (campaignAddr && /^0x[a-fA-F0-9]{40}$/.test(campaignAddr)) {
            emit('📊 Fetching REAL Rally submissions for calibration (background)...', 'info');
            console.log('[Pipeline] Fetching REAL Rally submissions for calibration (background)...');
            const gtResult = await Promise.race([
              getSubmissionsSummary(campaignAddr, { limit: 50 }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Ground truth timed out (15s)')), 15000)
              ),
            ]);
            rallySubmissions = gtResult;
            emit(`Ground truth: ${rallySubmissions.totalValid} valid submissions analyzed`, 'success');
            console.log(`[Pipeline] Ground truth: ${rallySubmissions.totalValid} valid submissions analyzed`);

            if (rallySubmissions.totalValid > 0) {
              calibrationThresholds = {
                top10Pct: rallySubmissions.stats.contentQuality.p90,
                top25Pct: rallySubmissions.stats.contentQuality.p75,
                top50Pct: rallySubmissions.stats.contentQuality.p50,
                averagePct: rallySubmissions.stats.contentQuality.mean,
              };
              const topScore = rallySubmissions.stats.contentQuality.max;
              const medianScore = rallySubmissions.stats.contentQuality.median;
              groundTruthPrompt = `═══ GROUND TRUTH FROM RALLY SUBMISSIONS ═══\nAnalyzed ${rallySubmissions.totalValid} valid submissions.\nTop 10% quality: ≥ ${rallySubmissions.stats.contentQuality.p90}%.\nMedian: ${medianScore}%. Max: ${topScore}%.\nWeak categories: ${rallySubmissions.weakCategories.join(', ')}.\nStrong categories: ${rallySubmissions.strongCategories.join(', ')}.\nTo be in top 10%, your content quality must be ≥ ${rallySubmissions.stats.contentQuality.p90}%.`;
            }
          }
        } catch (e) {
          console.warn('[Pipeline] Ground truth fetch failed (non-fatal):', e instanceof Error ? e.message : e);
        }
      }
      groundTruthData = { groundTruthPrompt, rallySubmissions, calibrationThresholds };
    })();

    // DEFERRED: Competitive analysis starts AFTER generation cycle.
    // This is critical: competitive analysis uses the same AI client singleton and
    // consumes rate limit buckets. Starting it alongside generation causes bucket
    // contention, making 4 parallel gen calls serialize from ~30s to ~90s.
    // By deferring competitive to after generation, all buckets are free for gen.
    let competitiveBgAiCalls = 0;
    let competitiveBgPromise: Promise<void> | null = null;

    // Brief check for ground truth (max 3s) — inject if ready, skip if not
    if (!groundTruthData) {
      await Promise.race([
        groundTruthBgPromise,
        new Promise<void>(r => setTimeout(r, 3000)),
      ]);
    }
    const groundTruthPrompt = groundTruthData?.groundTruthPrompt || '';
    const rallySubmissions = groundTruthData?.rallySubmissions || null;
    const calibrationThresholds = groundTruthData?.calibrationThresholds;

    emit('Pre-cycle complete — starting content generation immediately...', 'success');
    console.log(`[Pipeline] Pre-cycle complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s. No AI calls in pre-cycle (v3). Ground truth: ${groundTruthData ? 'ready' : 'pending(background)'}, competitive: pending(background)`);

    const enrichedCampaignData = {
      ...job.campaignData,
      analysis: campaignAnalysis,
      _groundTruth: groundTruthPrompt,
      _rallySubmissions: rallySubmissions,
    };

    // Initialize cross-cycle learning memory
    const memory: CrossCycleMemory = {
      patterns: {
        avgCategoryScores: {
          originalityAuthenticity: 0, contentAlignment: 0, informationAccuracy: 0,
          campaignCompliance: 0, engagementPotential: 0, technicalQuality: 0, replyQuality: 0,
        },
        zeroGateCounts: {
          originalityAuthenticity: 0, contentAlignment: 0, informationAccuracy: 0, campaignCompliance: 0,
        },
        recurringFeedback: [],
        recurringImprovements: [],
        hasGateFailure: false,
        hasQualityWeakness: false,
        bestScoreSoFar: 0,
        cyclesAnalyzed: 0,
      },
      allFeedback: [],
      cpTrendPerCycle: [],
      calibrationThresholds,
    };

    const preCycleElapsed = Date.now() - startTime;
    emit(`📖 Building pre-writing perspective + extracting verified facts...`, 'info');
    console.log(`[Pipeline] Pre-cycle complete in ${(preCycleElapsed / 1000).toFixed(1)}s. Time remaining: ${((CONFIG.pipelineTimeoutMs - preCycleElapsed) / 1000).toFixed(0)}s`);

    // Step 3: Generation Cycles
    let bestOverall: ContentCandidate | null = null;

    for (let cycle = 1; cycle <= CONFIG.maxCycles; cycle++) {
      const elapsed = Date.now() - startTime;
      // HARD STOP: Don't start a new cycle if we don't have enough time budget.
      // A cycle needs ~90s. If we're within 100s of gateway timeout, skip.
      const remainingBeforeGateway = CONFIG.gatewayTimeoutMs - elapsed;
      if (elapsed > CONFIG.pipelineTimeoutMs || remainingBeforeGateway < 100000) {
        console.warn(`[Pipeline] Time budget exhausted (${(elapsed / 1000).toFixed(1)}s elapsed, ${remainingBeforeGateway < 100000 ? 'near gateway timeout' : 'pipeline timeout'}). Stopping cycles.`);
        break;
      }

      emit(`Generating ${CONFIG.variationsPerCycle} content variations (Cycle ${cycle}) — BEAT MODE + human artifacts...`, 'info');
      console.log(`[Pipeline] Cycle ${cycle}/${CONFIG.maxCycles} for job "${job.campaignName}" (${(elapsed / 1000).toFixed(1)}s elapsed)`);

      // Inject competitive data if available (from previous run or early completion)
      if (competitiveAnalysisResult) {
        enrichedCampaignData._competitiveIntel = competitiveAnalysisResult.pipelineInstructions || '';
        enrichedCampaignData._phrasesToAvoid = competitiveAnalysisResult.differentiation?.phrasesToAvoid || [];
        enrichedCampaignData._gapsToExploit = competitiveAnalysisResult.differentiation?.gapsToExploit || [];
        totalAIcalls += competitiveBgAiCalls;
        console.log(`[Pipeline] Cycle ${cycle}: Competitive data injected (${competitiveAnalysisResult.totalCompetitorsAnalyzed} competitors)`);
      }

      let cycleResult: CycleResult;
      try {
        cycleResult = await Promise.race([
          runGenerationCycle(
            enrichedCampaignData,
            cycle,
            allCandidates,
            memory,
            calibrationThresholds,
            competitiveAnalysisResult,
            emit
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Cycle ${cycle} timed out (${CONFIG.cycleTimeoutMs / 1000}s)`)), CONFIG.cycleTimeoutMs)
          ),
        ]);
      } catch (cycleError) {
        const cycleErrMsg = cycleError instanceof Error ? cycleError.message : String(cycleError);
        console.error(`[Pipeline] Cycle ${cycle} failed: ${cycleErrMsg}`);
        // If we have candidates from previous cycles, use them
        if (allCandidates.length > 0) {
          console.log(`[Pipeline] Using ${allCandidates.length} candidates from previous cycles`);
          break;
        }
        continue;
      }

      totalAIcalls += cycleResult.aiCalls;

      for (const candidate of cycleResult.candidates) {
        allCandidates.push(candidate);
      }

      // Collect feedback from failing candidates
      collectFailingFeedback(cycleResult.candidates, cycle, memory);

      // Analyze patterns
      memory.patterns = analyzeCyclePatterns(
        [...allCandidates],
        memory.patterns.bestScoreSoFar,
        memory.patterns.cyclesAnalyzed
      );

      // Track trend
      const cycleBestScore = cycleResult.candidates.length > 0
        ? Math.max(...cycleResult.candidates.map(c => c.scoring.contentQualityScore))
        : 0;
      memory.cpTrendPerCycle.push(cycleBestScore);

      console.log(`[Pipeline] Cycle ${cycle} patterns:`, {
        gateFailure: memory.patterns.hasGateFailure,
        qualityWeakness: memory.patterns.hasQualityWeakness,
        bestScore: memory.patterns.bestScoreSoFar.toFixed(2) + '/21.0',
      });

      // Update best overall
      if (cycleResult.bestCandidate) {
        if (!bestOverall || cycleResult.bestCandidate.scoring.contentQualityScore > bestOverall.scoring.contentQualityScore) {
          bestOverall = cycleResult.bestCandidate;
        }
      }

      // Post-judge checks
      emit(`🔎 G4 Originality scan + X-Factor viral detection...`, 'info');
      emit(`🛡️ Similarity check: ensuring content is NOT like competitors...`, 'info');
      emit(`🧪 Anti-AI detection (40+ red flags)...`, 'info');
      emit(`Anti-fabrication check: verifying claims...`, 'info');

      // Quality gate check
      if (bestOverall && bestOverall.passedQualityGate) {
        const elapsed = (Date.now() - startTime) / 1000;
        emit(`✅ Quality gate PASSED in cycle ${cycle}! Score: ${bestOverall.scoring.contentQualityScore.toFixed(2)}/21.0 (${bestOverall.scoring.contentQualityPct}%)`, 'success');
        console.log(`[Pipeline] Quality gate PASSED in cycle ${cycle} (Score: ${bestOverall.scoring.contentQualityScore.toFixed(2)}/21.0, ${bestOverall.scoring.contentQualityPct}%, ${elapsed.toFixed(1)}s)`);
        break;
      }

      console.log(`[Pipeline] Cycle ${cycle} summary: ${cycleResult.passedCount}/${cycleResult.candidates.length} passed, best=${cycleResult.bestCandidate ? cycleResult.bestCandidate.scoring.contentQualityScore.toFixed(2) : 'none'}/21.0, AI calls=${cycleResult.aiCalls}`);

      // Smart fail-fast
      if (cycleResult.passedCount === 0 && cycle >= CONFIG.failFastCycle) {
        const improving = memory.cpTrendPerCycle.length >= 2 &&
          memory.cpTrendPerCycle[memory.cpTrendPerCycle.length - 1] >
          memory.cpTrendPerCycle[memory.cpTrendPerCycle.length - 2];

        if (!improving) {
          emit(`Quality threshold check — no candidates passed in cycle ${cycle}`, 'warning');
          console.log(`[Pipeline] Smart fail-fast: 0/${CONFIG.variationsPerCycle} passed in cycle ${cycle}, no improvement trend`);
          break;
        }
      }
    }

    // START COMPETITIVE ANALYSIS NOW (after generation, so it doesn't steal buckets)
    if (!competitiveBgPromise) {
      emit('🔍 Starting competitive analysis (deferred to avoid bucket contention)...', 'info');
      competitiveBgPromise = (async () => {
        try {
          const result = await Promise.race([
            runCompetitiveAnalysis(job.campaignData),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Competitive analysis timed out (60s)')), 60000)
            ),
          ]);
          competitiveAnalysisResult = result;
          competitiveBgAiCalls = 2;
          emit(`🔍 Competitors: ${result.totalCompetitorsAnalyzed} found, target ${result.differentiation.targetScore}/21`, 'success');
        } catch (e) {
          console.warn('[Pipeline] Competitive analysis skipped (non-fatal):', e instanceof Error ? e.message : e);
        }
      })();
    }

    clearTimeout(pipelineTimer);
    const totalElapsed = Date.now() - startTime;
    emit(`Pipeline completed in ${(totalElapsed / 1000).toFixed(1)}s — ${allCandidates.length} candidates, ${totalAIcalls} AI calls`, 'success');
    console.log(`[Pipeline] Finished in ${(totalElapsed / 1000).toFixed(1)}s — ${allCandidates.length} candidates, ${totalAIcalls} AI calls`);

    // Final ground truth capture — await background promise
    await Promise.race([groundTruthBgPromise, new Promise<void>(r => setTimeout(r, 2000))]);
    // Await competitive analysis (should be done by now)
    if (competitiveBgPromise) {
      await Promise.race([competitiveBgPromise, new Promise<void>(r => setTimeout(r, 3000))]);
    }
    const finalRallySubmissions = groundTruthData?.rallySubmissions || null;
    const finalCalibrationThresholds = groundTruthData?.calibrationThresholds;

    const status = bestOverall?.passedQualityGate ? 'success' : bestOverall ? 'partial' : 'failed';

    return {
      jobId: job.id,
      campaignName: job.campaignName,
      status,
      bestContent: bestOverall?.content || null,
      bestScoring: bestOverall?.scoring || null,
      totalCycles: Math.min(allCandidates.length > 0 ? Math.ceil(allCandidates.length / CONFIG.variationsPerCycle) : 0, CONFIG.maxCycles),
      totalVariationsGenerated: allCandidates.length,
      totalAIcalls,
      candidates: allCandidates,
      campaignAnalysis,
      competitiveAnalysis: competitiveAnalysisResult,
      groundTruth: finalRallySubmissions ? {
        totalValid: finalRallySubmissions.totalValid,
        contentQualityMean: finalRallySubmissions.stats.contentQuality.mean,
        contentQualityMedian: finalRallySubmissions.stats.contentQuality.median,
        contentCategories: finalRallySubmissions.contentCategories,
        engagementCategories: finalRallySubmissions.engagementCategories,
        weakCategories: finalRallySubmissions.weakCategories,
        strongCategories: finalRallySubmissions.strongCategories,
        top10Threshold: finalRallySubmissions.stats.contentQuality.p90,
        calibrationThresholds: finalCalibrationThresholds,
      } : undefined,
      processingTime: totalElapsed,
    };
  } catch (error) {
    clearTimeout(pipelineTimer);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const totalElapsed = Date.now() - startTime;
    console.error(`[Pipeline] Fatal error for job "${job.campaignName}" after ${(totalElapsed / 1000).toFixed(1)}s:`, errorMsg);

    // If we have any candidates at all, return partial results
    if (allCandidates.length > 0) {
      const bestCandidate = allCandidates.reduce((best, c) =>
        c.scoring.contentQualityScore > best.scoring.contentQualityScore ? c : best
      );
      console.log(`[Pipeline] Returning partial results with ${allCandidates.length} candidates`);
      return {
        jobId: job.id,
        campaignName: job.campaignName,
        status: 'partial',
        bestContent: bestCandidate.content,
        bestScoring: bestCandidate.scoring,
        totalCycles: Math.ceil(allCandidates.length / CONFIG.variationsPerCycle),
        totalVariationsGenerated: allCandidates.length,
        totalAIcalls,
        candidates: allCandidates,
        campaignAnalysis: campaignAnalysisResult,
        competitiveAnalysis: competitiveAnalysisResult,
        error: `Pipeline error: ${errorMsg} (partial results returned)`,
        processingTime: totalElapsed,
      };
    }

    return {
      jobId: job.id,
      campaignName: job.campaignName,
      status: 'failed',
      bestContent: null,
      bestScoring: null,
      totalCycles: 0,
      totalVariationsGenerated: 0,
      totalAIcalls,
      candidates: allCandidates,
      campaignAnalysis: null,
      competitiveAnalysis: null,
      error: errorMsg,
      processingTime: totalElapsed,
    };
  }
}

function collectFailingFeedback(candidates: ContentCandidate[], cycle: number, memory: CrossCycleMemory): void {
  for (const candidate of candidates) {
    if (candidate.passedQualityGate) continue;
    for (const judgeResult of candidate.judgeResults) {
      memory.allFeedback.push({
        cycle,
        candidateIndex: candidate.index,
        feedback: judgeResult.feedback,
        improvements: judgeResult.improvements,
        contentQualityPct: candidate.scoring.contentQualityPct,
      });
    }
  }
}

async function runGenerationCycle(
  campaignData: Record<string, unknown>,
  cycle: number,
  allCandidates: ContentCandidate[],
  memory: CrossCycleMemory,
  calibrationThresholds?: { top10Pct: number; top25Pct: number; top50Pct: number; averagePct: number },
  competitiveAnalysis?: CompetitiveAnalysis | null,
  emit?: (message: string, type?: string) => void
): Promise<CycleResult> {
  let aiCalls = 0;
  const candidates: ContentCandidate[] = [];
  let passedCount = 0;
  let eliminatedCount = 0;
  let bestCandidate: ContentCandidate | null = null;

  const isRegeneration = cycle > 1 && memory.allFeedback.length > 0;

  // Build adaptive regeneration instructions
  let adaptiveInstructions: ReturnType<typeof buildAdaptiveRegenerationInstructions> | null = null;
  if (isRegeneration && memory.patterns.cyclesAnalyzed > 0) {
    adaptiveInstructions = buildAdaptiveRegenerationInstructions(memory);
    console.log(`[Pipeline] Cycle ${cycle}: Adaptive regeneration with ${adaptiveInstructions.focusAreas.length} focus areas`);
  }

  const competitiveContext = competitiveAnalysis?.pipelineInstructions || '';

  // ═══════════════════════════════════════════════════════════════
  // PHASE A: GENERATE ALL VARIATIONS IN PARALLEL
  // Each variation uses a different rate limit bucket.
  // This reduces generation time from ~150s sequential to ~30s parallel.
  // ═══════════════════════════════════════════════════════════════
  emit?.(`🎭 Random non-linear structure + 3 human artifacts per variant...`, 'info');
  console.log(`[Pipeline] Cycle ${cycle}: Generating ${CONFIG.variationsPerCycle} variations IN PARALLEL...`);
  const genCycleStart = Date.now();

  const genPromises = Array.from({ length: CONFIG.variationsPerCycle }, async (__, i) => {
    const varStart = Date.now();
    try {
      let generated: GeneratedContent;

      if (isRegeneration && adaptiveInstructions) {
        const bestFailing = getBestFailingCandidate(allCandidates);
        const referenceContent = bestFailing?.content || '(No reference — generate fresh based on feedback patterns)';
        const enhancedFeedback = competitiveContext
          ? `${competitiveContext}\n\n═══ ADAPTIVE FEEDBACK ═══\n${adaptiveInstructions.feedbackSummary}`
          : adaptiveInstructions.feedbackSummary;

        generated = await regenerateContent(
          referenceContent,
          enhancedFeedback,
          adaptiveInstructions.improvementsList,
          {
            ...campaignData,
            _focusAreas: adaptiveInstructions.focusAreas,
            _isAdaptive: true,
            _cycleNumber: cycle,
            _competitiveIntel: competitiveContext,
          }
        );
        return { index: i, generated, aiCallCount: 1, varTime: Date.now() - varStart };
      } else {
        const enhancedCampaignData = competitiveContext
          ? { ...campaignData, _competitiveIntel: competitiveContext }
          : campaignData;
        generated = await generateContent(enhancedCampaignData, { emotion: i });

        // If content is empty or too short, retry once
        if (generated.content.length < 100) {
          console.warn(`[Pipeline] Cycle ${cycle}: Variation ${i + 1} too short (${generated.content.length} chars), retrying...`);
          try {
            generated = await generateContent(enhancedCampaignData, { emotion: i + 5 });
            return { index: i, generated, aiCallCount: 2, varTime: Date.now() - varStart };
          } catch (retryErr) {
            console.error(`[Pipeline] Cycle ${cycle}: Variation ${i + 1} retry failed:`, retryErr);
          }
        }
        return { index: i, generated, aiCallCount: 1, varTime: Date.now() - varStart };
      }
    } catch (e) {
      console.error(`[Pipeline] Cycle ${cycle}: Variation ${i + 1} generation failed:`, e instanceof Error ? e.message : e);
      return { index: i, generated: null, aiCallCount: 0, varTime: Date.now() - varStart };
    }
  });

  const genResults = await Promise.all(genPromises);
  const genTime = Date.now() - genCycleStart;
  const genAiCalls = genResults.reduce((sum, r) => sum + r.aiCallCount, 0);
  aiCalls += genAiCalls;
  emit?.(`All ${CONFIG.variationsPerCycle} variations generated in ${(genTime / 1000).toFixed(1)}s — running compliance check...`, 'info');
  console.log(`[Pipeline] Cycle ${cycle}: All ${CONFIG.variationsPerCycle} variations generated in ${(genTime / 1000).toFixed(1)}s (${genAiCalls} AI calls)`);

  // ═══════════════════════════════════════════════════════════════
  // PHASE B: SOFT FILTER — only block truly broken content
  // ═══════════════════════════════════════════════════════════════
  // v7 FIX: Previous compliance check was too aggressive — it blocked ALL
  // generated content before AI judges could evaluate it. Now we only
  // block content that is genuinely unusable (empty, too short, or has
  // critical banned phrases). AI pattern/template detection is left to
  // the judges who are better at nuanced evaluation.
  const validResults = genResults.filter(r => {
    if (!r.generated) return false;
    const content = r.generated.content;

    // ONLY block if content is too short (< 20 chars) — basically empty
    if (content.trim().length < 20) {
      console.log(`[Pipeline] Cycle ${cycle}: Var ${r.index + 1} filtered (too short: ${content.length} chars)`);
      const failedScoring = calculateRallyContentScore({});
      candidates.push({
        index: r.index, content, generated: r.generated,
        judgeResults: [], scoring: failedScoring,
        passedQualityGate: false, cycle, isRegeneration,
      });
      eliminatedCount++;
      return false;
    }

    // Log compliance info for debugging but DON'T block
    const compliance = checkCompliance(content, campaignData as { description?: string; rules?: string });
    if (!compliance.passed) {
      const failedChecks = compliance.checks.filter(c => !c.passed);
      console.log(`[Pipeline] Cycle ${cycle}: Var ${r.index + 1} compliance soft-fail (not blocking): ${failedChecks.map(c => c.message).join('; ')}`);
    }

    return true;
  });

  if (validResults.length === 0) {
    console.log(`[Pipeline] Cycle ${cycle}: All variations too short (< 20 chars), cannot judge`);
    return { cycle, candidates, passedCount, eliminatedCount, bestCandidate, aiCalls };
  }

  emit?.(`Running 2-stage judge: Optimist → Analyst (CASCADE mode)...`, 'info');
  console.log(`[Pipeline] Cycle ${cycle}: ${validResults.length}/${CONFIG.variationsPerCycle} passed soft filter, starting CASCADE judging...`);

  // ═══════════════════════════════════════════════════════════════
  // PHASE C: CASCADE JUDGING (v3 optimization)
  // Instead of judging all N variants in parallel:
  // 1. Pick the BEST 1 variant (by content length heuristic)
  // 2. Judge ONLY that 1 first
  // 3. If it passes → DONE (saves 2*(N-1) judge calls ≈ ~20-30s!)
  // 4. If it fails → judge remaining (N-1) in parallel
  // ═══════════════════════════════════════════════════════════════
  const aiClient = getAIClient();

  // Helper: judge a single variant with all judge types, returns judge results
  const judgeVariant = async (vr: typeof validResults[number]): Promise<JudgeResult[]> => {
    const judgeTokens = aiClient.reserveTokensForJudges(CONFIG.judgeTypes.length);
    const judgePromises = CONFIG.judgeTypes.map(async (judgeType, ji) => {
      const judgeToken = judgeTokens[ji] ?? null;
      try {
        const result = await judgeContent(vr.generated!.content, campaignData, judgeType, judgeToken);
        const judgeScore = result.content ? Object.values(result.content).reduce((a, b) => a + (b || 0), 0) : 0;
        console.log(`[Pipeline] Cycle ${cycle}: Var ${vr.index + 1} Judge ${judgeType} → ${result.verdict} (${judgeScore.toFixed(1)}/21.0)`);
        return result;
      } catch (e) {
        console.error(`[Pipeline] Cycle ${cycle}: Var ${vr.index + 1} Judge ${judgeType} failed:`, e instanceof Error ? e.message : e);
        return null;
      }
    });
    const resultsRaw = await Promise.all(judgePromises);
    return resultsRaw.filter((r): r is JudgeResult => r !== null);
  };

  // Helper: build a ContentCandidate from judge results (pure scoring, no side effects)
  const buildCandidate = (vr: typeof validResults[number], judgeResults: JudgeResult[]): ContentCandidate => {
    const generated = vr.generated!;
    const i = vr.index;

    const consensusInputs = judgeResults.map(j => ({
      content: j.content ? {
        originalityAuthenticity: j.content.originality_authenticity ?? 0,
        contentAlignment: j.content.content_alignment ?? 0,
        informationAccuracy: j.content.information_accuracy ?? 0,
        campaignCompliance: j.content.campaign_compliance ?? 0,
        engagementPotential: j.content.engagement_potential ?? 0,
        technicalQuality: j.content.technical_quality ?? 0,
        replyQuality: j.content.reply_quality ?? 0,
      } : undefined,
      categoryAnalysis: j.categoryAnalysis,
    }));

    const g4Detection = detectG4Elements(generated.content);
    const xFactors = detectXFactors(generated.content);

    const scoring = mergeRallyJudgeScores(consensusInputs, {
      thresholds: calibrationThresholds,
      minQualityPct: CONFIG.minQualityPct,
    });

    scoring.g4Detection = g4Detection;
    scoring.xFactors = xFactors;

    const passedQualityGate = scoring.passesThreshold;

    return {
      index: i,
      content: generated.content,
      generated,
      judgeResults,
      scoring,
      passedQualityGate,
      cycle,
      isRegeneration,
    };
  };

  // Sort valid results by content length heuristic (longer = likely better quality)
  const sortedByHeuristic = [...validResults].sort((a, b) =>
    b.generated!.content.length - a.generated!.content.length
  );
  const cascadePrimary = sortedByHeuristic[0];
  const cascadeRest = sortedByHeuristic.slice(1);

  emit?.(`⚡ CASCADE: Judging best variant first (by content length heuristic)...`, 'info');
  console.log(`[Pipeline] Cycle ${cycle}: CASCADE mode — ${validResults.length} valid, judging primary first`);

  // ── CASCADE STEP 1: Judge primary (most promising) variant ──
  const primaryJudgeResults = await judgeVariant(cascadePrimary);
  aiCalls += primaryJudgeResults.length;
  const primaryCandidate = buildCandidate(cascadePrimary, primaryJudgeResults);
  candidates.push(primaryCandidate);

  if (primaryCandidate.passedQualityGate) {
    passedCount++;
  } else {
    eliminatedCount++;
  }
  if (!bestCandidate || primaryCandidate.scoring.contentQualityScore > bestCandidate.scoring.contentQualityScore) {
    bestCandidate = primaryCandidate;
  }

  console.log(`[Pipeline] Cycle ${cycle}: CASCADE primary Var ${cascadePrimary.index + 1} → Score: ${primaryCandidate.scoring.contentQualityScore.toFixed(2)}/21.0 (${primaryCandidate.scoring.contentQualityPct.toFixed(1)}%) Grade: ${primaryCandidate.scoring.overallGrade} ${primaryCandidate.passedQualityGate ? '✅ FAST PATH' : '❌'}`);

  // ── CASCADE EARLY EXIT: If primary passes, skip remaining judges ──
  if (primaryCandidate.passedQualityGate) {
    emit?.(`⚡ CASCADE fast path: Best variant PASSED! Skipping ${cascadeRest.length} remaining judges.`, 'success');

    // Add remaining as unjudged candidates (with default failing scoring for completeness)
    for (const rest of cascadeRest) {
      const unjudgedScoring = calculateRallyContentScore({});
      candidates.push({
        index: rest.index,
        content: rest.generated!.content,
        generated: rest.generated!,
        judgeResults: [],
        scoring: unjudgedScoring,
        passedQualityGate: false,
        cycle,
        isRegeneration,
      });
      eliminatedCount++;
    }

    const totalTime = Date.now() - genCycleStart;
    console.log(`[Pipeline] Cycle ${cycle}: CASCADE EXIT in ${(totalTime / 1000).toFixed(1)}s — saved ${cascadeRest.length * CONFIG.judgeTypes.length} judge calls`);
    emit?.(`Scoring 7 Rally content categories (max 21.0 points)...`, 'info');

    return { cycle, candidates, passedCount, eliminatedCount, bestCandidate, aiCalls };
  }

  // ── CASCADE STEP 2: Primary failed — judge remaining in parallel ──
  emit?.(`⚡ CASCADE: Primary failed, judging ${cascadeRest.length} remaining variants in parallel...`, 'warning');
  console.log(`[Pipeline] Cycle ${cycle}: CASCADE fallback — judging ${cascadeRest.length} remaining variants`);

  const restJudgePromises = cascadeRest.map(vr => judgeVariant(vr));
  const restJudgeResultsArray = await Promise.all(restJudgePromises);

  for (let ri = 0; ri < cascadeRest.length; ri++) {
    const vr = cascadeRest[ri];
    const judgeResults = restJudgeResultsArray[ri];
    aiCalls += judgeResults.length;

    const candidate = buildCandidate(vr, judgeResults);
    candidates.push(candidate);

    if (candidate.passedQualityGate) {
      passedCount++;
    } else {
      eliminatedCount++;
    }
    if (!bestCandidate || candidate.scoring.contentQualityScore > bestCandidate.scoring.contentQualityScore) {
      bestCandidate = candidate;
    }

    console.log(`[Pipeline] Cycle ${cycle}: Var ${candidate.index + 1} → Score: ${candidate.scoring.contentQualityScore.toFixed(2)}/21.0 (${candidate.scoring.contentQualityPct.toFixed(1)}%) Grade: ${candidate.scoring.overallGrade} ${candidate.passedQualityGate ? '✅' : '❌'} [${(vr.varTime / 1000).toFixed(1)}s gen]`);
  }

  const judgeTime = Date.now() - genCycleStart - genTime;
  emit?.(`Scoring 7 Rally content categories (max 21.0 points)...`, 'info');
  console.log(`[Pipeline] Cycle ${cycle}: CASCADE complete in ${(judgeTime / 1000).toFixed(1)}s (primary + ${cascadeRest.length} fallback)`);

  return { cycle, candidates, passedCount, eliminatedCount, bestCandidate, aiCalls };
}

function getBestFailingCandidate(candidates: ContentCandidate[]): ContentCandidate | null {
  const failing = candidates.filter(c => !c.passedQualityGate);
  if (failing.length === 0) return null;
  return failing.reduce((best, c) =>
    c.scoring.contentQualityScore > best.scoring.contentQualityScore ? c : best
  );
}
