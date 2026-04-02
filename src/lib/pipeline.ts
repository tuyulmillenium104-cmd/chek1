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

// ─── Pipeline Configuration ─────────────────────────────────────────

const CONFIG = {
  variationsPerCycle: 5,    // 5 variations per cycle
  maxCycles: 2,             // Max 2 cycles (quality improves faster with rich prompts)
  minQualityPct: 45,        // 45% content quality to pass
  failFastCycle: 1,         // Fail fast after cycle 1 if no improvement
  judgeTypes: ['optimist', 'analyst', 'critic'] as const,  // 3-stage judge
  // Caddy default timeout = 300s. We MUST finish well under that.
  // Budget: pre-cycle ~60s + cycle1 ~80s + cycle2 ~80s = ~220s (safe margin)
  pipelineTimeoutMs: 240000, // 4 minutes hard limit (under 300s Caddy)
  cycleTimeoutMs: 90000,    // 90s max per cycle
  // Caddy gateway timeout — pipeline MUST finish before this
  gatewayTimeoutMs: 280000, // Leave 20s margin before Caddy's 300s
  skipCompetitiveAnalysis: false,  // ENABLED — competitive analysis (but with hard timeout)
  skipGroundTruthCalibration: false,  // ENABLED — ground truth calibration (but with hard timeout)
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

export async function runPipeline(job: PipelineJob): Promise<PipelineResult> {
  const startTime = Date.now();
  let totalAIcalls = 0;
  const allCandidates: ContentCandidate[] = [];

  // Declare these before try so they're accessible in catch
  let campaignAnalysisResult: Record<string, unknown> | null = null;
  let competitiveAnalysisResult: CompetitiveAnalysis | null = null;

  // Pipeline-level timeout guard
  const pipelineTimer = setTimeout(() => {
    console.error(`[Pipeline] TIMEOUT: Pipeline exceeded ${CONFIG.pipelineTimeoutMs / 1000}s limit`);
  }, CONFIG.pipelineTimeoutMs);

  try {
    // ═══════════════════════════════════════════════════════════════
    // PRE-CYCLE PHASE: ALL 3 STAGES RUN IN PARALLEL
    // Each uses a different rate limit bucket, so no waiting needed.
    // This reduces pre-cycle time from ~120s sequential to ~60s parallel.
    // ═══════════════════════════════════════════════════════════════
    console.log(`[Pipeline] Starting pre-cycle phase (3 stages in parallel)...`);

    const { analyzeCampaign } = await import('./ai-service');

    // Build ground truth fetch promise (async, non-AI — just API calls)
    const groundTruthPromise = (async () => {
      let groundTruthPrompt = '';
      let rallySubmissions: SubmissionsSummary | null = null;
      let calibrationThresholds: { top10Pct: number; top25Pct: number; top50Pct: number; averagePct: number } | undefined;

      if (!CONFIG.skipGroundTruthCalibration) {
        try {
          const campaignAddr = String(job.campaignData.intelligentContractAddress || '');
          if (campaignAddr && /^0x[a-fA-F0-9]{40}$/.test(campaignAddr)) {
            console.log('[Pipeline] Fetching REAL Rally submissions for calibration...');
            // Fetch with hard timeout (15s). Use limit=50 instead of 200 (faster, still sufficient).
            const gtResult = await Promise.race([
              getSubmissionsSummary(campaignAddr, { limit: 50 }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Ground truth timed out (15s)')), 15000)
              ),
            ]);
            rallySubmissions = gtResult;
            console.log(`[Pipeline] Ground truth: ${rallySubmissions.totalValid} valid submissions analyzed`);

            if (rallySubmissions.totalValid > 0) {
              calibrationThresholds = {
                top10Pct: rallySubmissions.stats.contentQuality.p90,
                top25Pct: rallySubmissions.stats.contentQuality.p75,
                top50Pct: rallySubmissions.stats.contentQuality.p50,
                averagePct: rallySubmissions.stats.contentQuality.mean,
              };

              // DON'T call runCalibration — it re-fetches the same submissions!
              // Build ground truth prompt directly from the summary we already have.
              const topScore = rallySubmissions.stats.contentQuality.max;
              const medianScore = rallySubmissions.stats.contentQuality.median;
              groundTruthPrompt = `═══ GROUND TRUTH FROM RALLY SUBMISSIONS ═══\nAnalyzed ${rallySubmissions.totalValid} valid submissions.\nTop 10% quality: ≥ ${rallySubmissions.stats.contentQuality.p90}%.\nMedian: ${medianScore}%. Max: ${topScore}%.\nWeak categories: ${rallySubmissions.weakCategories.join(', ')}.\nStrong categories: ${rallySubmissions.strongCategories.join(', ')}.\nTo be in top 10%, your content quality must be ≥ ${rallySubmissions.stats.contentQuality.p90}%.`;
            }
          }
        } catch (e) {
          console.warn('[Pipeline] Ground truth fetch failed (non-fatal):', e instanceof Error ? e.message : e);
        }
      }
      return { groundTruthPrompt, rallySubmissions, calibrationThresholds };
    })();

    // Build campaign analysis promise (1 AI call)
    const campaignAnalysisPromise = (async () => {
      try {
        const result = await analyzeCampaign(job.campaignData) as unknown as Record<string, unknown>;
        return { analysis: result, aiCalls: 1 };
      } catch (e) {
        console.error('[Pipeline] Campaign analysis failed, using raw data:', e);
        return { analysis: { fallback: true, ...job.campaignData } as Record<string, unknown>, aiCalls: 0 };
      }
    })();

    // Build competitive analysis promise (2 AI calls + web search)
    // CRITICAL: Competitive analysis is the #1 bottleneck (6 web searches + 10 web reads).
    // Hard cap at 50s — if it fails, pipeline continues without it.
    const competitiveAnalysisPromise = (async () => {
      try {
        const result = await Promise.race([
          runCompetitiveAnalysis(job.campaignData),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Competitive analysis timed out (50s)')), 50000)
          ),
        ]);
        console.log(`[Pipeline] Competitive analysis complete: ${result.totalCompetitorsAnalyzed} competitors, target ${result.differentiation.targetScore}/21`);
        return { analysis: result, aiCalls: 2 };
      } catch (e) {
        console.warn('[Pipeline] Competitive analysis failed (non-fatal):', e instanceof Error ? e.message : e);
        return { analysis: null as CompetitiveAnalysis | null, aiCalls: 0 };
      }
    })();

    // Run ALL 3 STAGES IN PARALLEL
    const [groundTruthResult, campaignResult, competitiveResult] = await Promise.all([
      groundTruthPromise,
      campaignAnalysisPromise,
      competitiveAnalysisPromise,
    ]);

    const campaignAnalysis = campaignResult.analysis;
    const { groundTruthPrompt, rallySubmissions, calibrationThresholds } = groundTruthResult;
    const competitiveAnalysis = competitiveResult.analysis;

    campaignAnalysisResult = campaignAnalysis;
    competitiveAnalysisResult = competitiveAnalysis;
    totalAIcalls += campaignResult.aiCalls + competitiveResult.aiCalls;

    console.log(`[Pipeline] Pre-cycle complete (${((Date.now() - startTime) / 1000).toFixed(1)}s). AI calls: campaign=${campaignResult.aiCalls}, competitive=${competitiveResult.aiCalls}`);

    // Merge analysis + competitive intelligence into campaign data
    const enrichedCampaignData = {
      ...job.campaignData,
      analysis: campaignAnalysis,
      _competitiveIntel: competitiveAnalysis?.pipelineInstructions || '',
      _phrasesToAvoid: competitiveAnalysis?.differentiation.phrasesToAvoid || [],
      _gapsToExploit: competitiveAnalysis?.differentiation.gapsToExploit || [],
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
    console.log(`[Pipeline] Pre-cycle complete in ${(preCycleElapsed / 1000).toFixed(1)}s. Time remaining before gateway: ${((CONFIG.gatewayTimeoutMs - preCycleElapsed) / 1000).toFixed(0)}s`);

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

      console.log(`[Pipeline] Cycle ${cycle}/${CONFIG.maxCycles} for job "${job.campaignName}" (${(elapsed / 1000).toFixed(1)}s elapsed)`);

      let cycleResult: CycleResult;
      try {
        cycleResult = await Promise.race([
          runGenerationCycle(
            enrichedCampaignData,
            cycle,
            allCandidates,
            memory,
            calibrationThresholds,
            competitiveAnalysis
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

      // Quality gate check
      if (bestOverall && bestOverall.passedQualityGate) {
        const elapsed = Date.now() - startTime;
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
          console.log(`[Pipeline] Smart fail-fast: 0/${CONFIG.variationsPerCycle} passed in cycle ${cycle}, no improvement trend`);
          break;
        }
      }
    }

    clearTimeout(pipelineTimer);
    const totalElapsed = Date.now() - startTime;
    console.log(`[Pipeline] Finished in ${(totalElapsed / 1000).toFixed(1)}s — ${allCandidates.length} candidates, ${totalAIcalls} AI calls`);

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
      competitiveAnalysis,
      groundTruth: rallySubmissions ? {
        totalValid: rallySubmissions.totalValid,
        contentQualityMean: rallySubmissions.stats.contentQuality.mean,
        contentQualityMedian: rallySubmissions.stats.contentQuality.median,
        contentCategories: rallySubmissions.contentCategories,
        engagementCategories: rallySubmissions.engagementCategories,
        weakCategories: rallySubmissions.weakCategories,
        strongCategories: rallySubmissions.strongCategories,
        top10Threshold: rallySubmissions.stats.contentQuality.p90,
        calibrationThresholds,
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
  competitiveAnalysis?: CompetitiveAnalysis | null
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
  console.log(`[Pipeline] Cycle ${cycle}: All ${CONFIG.variationsPerCycle} variations generated in ${(genTime / 1000).toFixed(1)}s (${genAiCalls} AI calls)`);

  // ═══════════════════════════════════════════════════════════════
  // PHASE B: COMPLIANCE CHECK (instant, no AI calls)
  // ═══════════════════════════════════════════════════════════════
  const validResults = genResults.filter(r => {
    if (!r.generated) return false;
    const compliance = checkCompliance(r.generated.content, campaignData as { description?: string; rules?: string });
    if (!compliance.passed) {
      const failedScoring = calculateRallyContentScore({});
      candidates.push({
        index: r.index,
        content: r.generated.content,
        generated: r.generated,
        judgeResults: [],
        scoring: failedScoring,
        passedQualityGate: false,
        cycle,
        isRegeneration,
      });
      eliminatedCount++;
      return false;
    }
    return true;
  });

  if (validResults.length === 0) {
    console.log(`[Pipeline] Cycle ${cycle}: All variations failed compliance check`);
    return { cycle, candidates, passedCount, eliminatedCount, bestCandidate, aiCalls };
  }

  console.log(`[Pipeline] Cycle ${cycle}: ${validResults.length}/${CONFIG.variationsPerCycle} passed compliance, starting PARALLEL judging...`);

  // ═══════════════════════════════════════════════════════════════
  // PHASE C: JUDGE ALL VALID VARIATIONS IN PARALLEL
  // Each variation gets 3 judges (optimist/analyst/critic), all running in parallel.
  // Total: up to 15 judge calls in parallel across different buckets.
  // This reduces judging time from ~300s sequential to ~30s parallel.
  // ═══════════════════════════════════════════════════════════════
  const aiClient = getAIClient();

  const judgeAllPromises = validResults.map(async (vr) => {
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

    const judgeResultsRaw = await Promise.all(judgePromises);
    const judgeResults: JudgeResult[] = judgeResultsRaw.filter((r): r is JudgeResult => r !== null);

    return { variationResult: vr, judgeResults };
  });

  const judgeAllResults = await Promise.all(judgeAllPromises);
  const judgeTime = Date.now() - genCycleStart - genTime;
  const judgeAiCalls = judgeAllResults.reduce((sum, r) => sum + r.judgeResults.length, 0);
  aiCalls += judgeAiCalls;
  console.log(`[Pipeline] Cycle ${cycle}: All judges complete in ${(judgeTime / 1000).toFixed(1)}s (${judgeAiCalls} AI calls)`);

  // ═══════════════════════════════════════════════════════════════
  // PHASE D: SCORE AND RANK (instant)
  // ═══════════════════════════════════════════════════════════════
  for (const { variationResult: vr, judgeResults } of judgeAllResults) {
    const generated = vr.generated!;
    const i = vr.index;

    // Map judge results to Rally content scores for consensus
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

    // Run G4 + X-Factor detection on the content
    const g4Detection = detectG4Elements(generated.content);
    const xFactors = detectXFactors(generated.content);

    // Merge scores using Rally-aligned consensus (median)
    const scoring = mergeRallyJudgeScores(consensusInputs, {
      thresholds: calibrationThresholds,
      minQualityPct: CONFIG.minQualityPct,
    });

    // Attach G4/X-Factor results
    scoring.g4Detection = g4Detection;
    scoring.xFactors = xFactors;

    if (!scoring.passesThreshold) eliminatedCount++;
    const passedQualityGate = scoring.passesThreshold;
    if (passedQualityGate) passedCount++;

    const candidate: ContentCandidate = {
      index: i,
      content: generated.content,
      generated,
      judgeResults,
      scoring,
      passedQualityGate,
      cycle,
      isRegeneration,
    };

    candidates.push(candidate);

    if (!bestCandidate || scoring.contentQualityScore > bestCandidate.scoring.contentQualityScore) {
      bestCandidate = candidate;
    }

    console.log(`[Pipeline] Cycle ${cycle}: Var ${i + 1} → Score: ${scoring.contentQualityScore.toFixed(2)}/21.0 (${scoring.contentQualityPct.toFixed(1)}%) Grade: ${scoring.overallGrade} ${passedQualityGate ? '✅' : '❌'} [${(vr.varTime / 1000).toFixed(1)}s gen]`);
  }

  return { cycle, candidates, passedCount, eliminatedCount, bestCandidate, aiCalls };
}

function getBestFailingCandidate(candidates: ContentCandidate[]): ContentCandidate | null {
  const failing = candidates.filter(c => !c.passedQualityGate);
  if (failing.length === 0) return null;
  return failing.reduce((best, c) =>
    c.scoring.contentQualityScore > best.scoring.contentQualityScore ? c : best
  );
}
