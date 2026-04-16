/**
 * POST /api/rally/generate-v2
 *
 * Starts the v2 generate pipeline with learned data injection and
 * judge validation. Fire-and-forget pattern: returns jobId immediately,
 * poll for status.
 *
 * Pipeline:
 *   1. Fetch learned data from KnowledgeDB (if not provided)
 *   2. Generate N content variations using AI
 *   3. Judge ALL variations using the v2 Judge Engine
 *   4. Select best variation
 *   5. If best score < target (Grade A = 18/23), regenerate with feedback
 *   6. Max 2 regeneration attempts
 *   7. Return best content + all results
 *
 * GET /api/rally/generate-v2?jobId=xxx
 *
 * Polls generate status for a running/completed/failed job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { generateContent } from '@/lib/ai-service';
import {
  judgeAndSelect,
  generateJudgeFeedback,
  type JudgeResult,
  type PatternData,
} from '@/lib/judge-engine';
import { getKnowledgeDB } from '@/lib/knowledge-db';
import { getStoredPatterns } from '@/lib/learn-engine';

// ─── Types ──────────────────────────────────────────────────────────

interface GenerateProgress {
  phase: 'initializing' | 'loading-knowledge' | 'generating' | 'judging' | 'regenerating' | 'selecting' | 'done';
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

interface GenerateVariation {
  content: string;
  score: number;
  grade: string;
  judgeResult: JudgeResult;
}

interface GenerateV2Result {
  bestContent: string;
  bestScore: number;
  grade: string;
  judgeResult: JudgeResult;
  allVariations: GenerateVariation[];
  regenerateAttempts: number;
  duration: number;
}

interface GenerateV2Job {
  id: string;
  status: 'running' | 'completed' | 'failed';
  campaignAddress: string;
  campaignName: string;
  progress: GenerateProgress[];
  result: GenerateV2Result | null;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
}

// ─── Constants ──────────────────────────────────────────────────────

const GRADE_A_THRESHOLD = 18; // Score needed for Grade A out of 23
const DEFAULT_VARIATIONS = 4;
const DEFAULT_MAX_REGENERATE_ATTEMPTS = 2;

// ─── HMR-Safe Store ────────────────────────────────────────────────

const GLOBAL_KEY = '__rally_generate_v2_jobs';
const JOB_TTL_MS = 20 * 60 * 1000; // 20 minutes

function getGenerateV2Store(): Map<string, GenerateV2Job> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, GenerateV2Job>();
    if (typeof setInterval === 'function') {
      setInterval(() => {
        const store = g[GLOBAL_KEY] as Map<string, GenerateV2Job>;
        const now = Date.now();
        for (const [id, job] of store) {
          if (job.completedAt && now - job.completedAt > JOB_TTL_MS) {
            console.log(`[GenerateV2] Cleaning up completed job ${id} (TTL ${JOB_TTL_MS / 1000}s)`);
            store.delete(id);
          }
        }
      }, 60000);
    }
  }
  return g[GLOBAL_KEY] as Map<string, GenerateV2Job>;
}

// ─── POST: Start Generate Pipeline ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body is required' },
        { status: 400 }
      );
    }

    const campaignAddress = body?.campaignAddress;
    const campaignName = body?.campaignName;
    const campaignData = body?.campaignData;
    const learnedData = body?.learnedData;
    const options = body?.options;

    // Validate required fields
    if (!campaignAddress || typeof campaignAddress !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "campaignAddress"' },
        { status: 400 }
      );
    }

    if (!campaignName || typeof campaignName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "campaignName"' },
        { status: 400 }
      );
    }

    if (!campaignData || typeof campaignData !== 'object' || Object.keys(campaignData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty "campaignData"' },
        { status: 400 }
      );
    }

    const jobId = randomUUID();
    const store = getGenerateV2Store();

    const job: GenerateV2Job = {
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

    // Fire-and-forget
    runGenerateV2Pipeline(job, {
      campaignData,
      learnedData,
      variations: options?.variations || DEFAULT_VARIATIONS,
      judgeEnabled: options?.judgeEnabled !== false, // default true
      maxRegenerateAttempts: options?.maxRegenerateAttempts || DEFAULT_MAX_REGENERATE_ATTEMPTS,
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: `Generate v2 pipeline started for "${campaignName}". Poll /api/rally/generate-v2?jobId=${jobId}`,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Generate-v2 error:', errorMsg);
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
      { success: false, error: 'Missing jobId query parameter' },
      { status: 400 }
    );
  }

  const store = getGenerateV2Store();
  const job = store.get(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Generate v2 job not found. It may have expired (20 min TTL).' },
      { status: 404 }
    );
  }

  const elapsed = ((job.completedAt || Date.now()) - job.startedAt) / 1000;

  const response: Record<string, unknown> = {
    status: job.status,
    elapsed: Math.round(elapsed * 10) / 10,
  };

  if (job.status === 'running') {
    response.progress = job.progress;
  }

  if (job.status === 'completed' && job.result) {
    response.result = job.result;
  }

  if (job.status === 'failed') {
    response.error = job.error;
  }

  return NextResponse.json(response);
}

// ─── Background Pipeline ──────────────────────────────────────────

interface PipelineOptions {
  campaignData: Record<string, unknown>;
  learnedData?: unknown;
  variations: number;
  judgeEnabled: boolean;
  maxRegenerateAttempts: number;
}

async function runGenerateV2Pipeline(job: GenerateV2Job, options: PipelineOptions) {
  const addProgress = (
    phase: GenerateProgress['phase'],
    message: string,
    details?: Record<string, unknown>
  ) => {
    job.progress.push({ phase, message, timestamp: Date.now(), details });
    console.log(`[GenerateV2] [${phase}] ${message}`);
  };

  const pipelineStartTime = Date.now();
  let learnedData: PatternData | undefined;

  try {
    // ── Phase 1: Initialize ──
    addProgress('initializing', `Initializing generate pipeline for "${job.campaignName}"...`);

    // ── Phase 2: Load learned data ──
    addProgress('loading-knowledge', 'Loading learned patterns from knowledge base...');

    // If learned data was provided in the request, use it directly
    if (options.learnedData && typeof options.learnedData === 'object') {
      learnedData = options.learnedData as PatternData;
      addProgress('loading-knowledge', 'Using provided learned data', {
        totalSubmissions: learnedData.totalSubmissions,
      });
    } else {
      // Try to load from KnowledgeDB first, then fall back to learn-engine
      try {
        const kb = getKnowledgeDB(job.campaignAddress, job.campaignName);
        const kbPatterns = await kb.getPatterns();
        if (kbPatterns) {
          learnedData = convertKnowledgeDBToPatternData(kbPatterns);
          addProgress('loading-knowledge', 'Loaded patterns from KnowledgeDB', {
            totalSubmissionsAnalyzed: kbPatterns.total_submissions_analyzed,
            strengthPatterns: kbPatterns.strength_patterns?.length || 0,
            weaknessPatterns: kbPatterns.weakness_patterns?.length || 0,
          });
        }
      } catch (err) {
        console.warn(`[GenerateV2] KnowledgeDB read failed: ${err instanceof Error ? err.message : err}`);
      }

      // Fallback to learn-engine patterns
      if (!learnedData) {
        try {
          const enginePatterns = await getStoredPatterns(job.campaignAddress);
          if (enginePatterns) {
            learnedData = convertEnginePatternsToPatternData(enginePatterns);
            addProgress('loading-knowledge', 'Loaded patterns from learn-engine (fallback)', {
              strengthPatterns: enginePatterns.strengthPatterns?.length || 0,
            });
          }
        } catch (err) {
          console.warn(`[GenerateV2] Learn-engine pattern load failed: ${err instanceof Error ? err.message : err}`);
        }
      }

      if (!learnedData) {
        addProgress('loading-knowledge', 'No learned patterns found — generating without learned data');
      }
    }

    // ── Phase 3: Generate variations ──
    addProgress('generating', `Generating ${options.variations} content variations...`);

    const generatedContents: string[] = [];
    for (let i = 0; i < options.variations; i++) {
      try {
        addProgress('generating', `Generating variation ${i + 1}/${options.variations}...`);
        const result = await generateContent(options.campaignData);
        generatedContents.push(result.content);

        // Log anti-AI and compliance info
        addProgress('generating', `Variation ${i + 1} generated (${result.content.length} chars)`, {
          antiAIScore: result.antiAIResult.aiScore,
          compliancePassed: result.complianceResult.passed,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[GenerateV2] Variation ${i + 1} generation failed: ${errMsg}`);
        // Continue with whatever variations we have
      }
    }

    if (generatedContents.length === 0) {
      throw new Error('All content variations failed to generate');
    }

    // ── Phase 4: Judge variations ──
    let bestResult: { best: JudgeResult; all: JudgeResult[]; bestIndex: number };
    let allVariations: GenerateVariation[] = [];

    if (options.judgeEnabled) {
      addProgress('judging', `Judging ${generatedContents.length} variations...`);

      bestResult = await judgeAndSelect(
        generatedContents,
        options.campaignData,
        job.campaignAddress,
        {
          learnedData,
          minScore: 0, // Don't set minimum initially — we want the best regardless
        }
      );

      allVariations = bestResult.all.map((jr, idx) => ({
        content: generatedContents[idx],
        score: jr.totalScore,
        grade: jr.grade,
        judgeResult: jr,
      }));

      addProgress('judging', `Best variation: score=${bestResult.best.totalScore}/23 (${bestResult.best.grade})`, {
        allScores: bestResult.all.map((r) => r.totalScore),
        verdict: bestResult.best.verdict,
      });
    } else {
      // No judging — just pick the first variation
      bestResult = {
        best: {
          totalScore: 0,
          maxScore: 23,
          verdict: 'fail' as const,
          grade: 'N/A',
          scores: { originality: 0, alignment: 0, accuracy: 0, compliance: 0, engagement: 0, technical: 0, reply_quality: 0 },
          categoryAnalysis: {},
          strengths: [],
          weaknesses: [],
          improvements: [],
          predictedRallyScorePct: 0,
          antiAIDetected: false,
          bannedPhrasesFound: [],
          templateStructureDetected: false,
          learnedPatternsUsed: !!learnedData,
          aiSessionId: 'no-judge',
        } as JudgeResult,
        all: [],
        bestIndex: 0,
      };

      allVariations = generatedContents.map((content) => ({
        content,
        score: 0,
        grade: 'N/A',
        judgeResult: bestResult.best,
      }));
    }

    // ── Phase 5: Regenerate if below target ──
    let regenerateAttempts = 0;

    if (
      options.judgeEnabled &&
      bestResult.best.totalScore < GRADE_A_THRESHOLD &&
      regenerateAttempts < options.maxRegenerateAttempts
    ) {
      addProgress('regenerating', `Best score ${bestResult.best.totalScore}/23 below Grade A threshold (${GRADE_A_THRESHOLD}). Regenerating...`);

      for (let attempt = 0; attempt < options.maxRegenerateAttempts; attempt++) {
        regenerateAttempts++;
        addProgress(
          'regenerating',
          `Regeneration attempt ${regenerateAttempts}/${options.maxRegenerateAttempts}...`,
          { previousBest: bestResult.best.totalScore }
        );

        try {
          // Generate feedback from the judge
          const feedback = generateJudgeFeedback(bestResult.best);
          console.log(`[GenerateV2] Judge feedback for regeneration:\n${feedback.substring(0, 500)}`);

          // Generate new variations with the feedback context
          const regenCampaignData = {
            ...options.campaignData,
            _judgeFeedback: feedback,
            _previousScore: bestResult.best.totalScore,
            _previousGrade: bestResult.best.grade,
            _regenerationAttempt: regenerateAttempts,
          };

          const regenContents: string[] = [];
          for (let i = 0; i < options.variations; i++) {
            try {
              const regenResult = await generateContent(regenCampaignData);
              regenContents.push(regenResult.content);
            } catch {
              // Continue with whatever we get
            }
          }

          if (regenContents.length === 0) {
            console.warn(`[GenerateV2] Regeneration attempt ${regenerateAttempts}: no variations generated`);
            continue;
          }

          // Judge the regenerated variations
          addProgress('judging', `Judging ${regenContents.length} regenerated variations...`);
          const regenResult = await judgeAndSelect(
            regenContents,
            regenCampaignData,
            job.campaignAddress,
            { learnedData }
          );

          // Add regen variations to the pool
          for (let idx = 0; idx < regenResult.all.length; idx++) {
            allVariations.push({
              content: regenContents[idx],
              score: regenResult.all[idx].totalScore,
              grade: regenResult.all[idx].grade,
              judgeResult: regenResult.all[idx],
            });
          }

          // Check if we improved
          if (regenResult.best.totalScore > bestResult.best.totalScore) {
            addProgress(
              'regenerating',
              `Improved from ${bestResult.best.totalScore} to ${regenResult.best.totalScore}/23 (${regenResult.best.grade})`,
              { improvement: regenResult.best.totalScore - bestResult.best.totalScore }
            );
            bestResult = regenResult;
          } else {
            addProgress(
              'regenerating',
              `Regeneration did not improve (still ${bestResult.best.totalScore}/23).`,
              { regenScore: regenResult.best.totalScore }
            );
          }

          // Stop if we hit Grade A
          if (bestResult.best.totalScore >= GRADE_A_THRESHOLD) {
            addProgress('regenerating', `Grade A achieved (${bestResult.best.totalScore}/23)!`);
            break;
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[GenerateV2] Regeneration attempt ${regenerateAttempts} failed: ${errMsg}`);
          addProgress('regenerating', `Regeneration attempt ${regenerateAttempts} failed: ${errMsg}`);
        }
      }
    }

    // ── Phase 6: Final selection ──
    addProgress('selecting', 'Selecting best content from all variations...');

    // Re-select from the full pool of variations (originals + regens)
    let finalBest = bestResult.best;
    let finalBestContent = generatedContents[bestResult.bestIndex] || allVariations[0]?.content || '';

    // If we have regenerations, re-evaluate the full pool
    if (regenerateAttempts > 0 && allVariations.length > generatedContents.length) {
      // Find the variation with the highest score
      let maxScore = -1;
      for (const v of allVariations) {
        if (v.score > maxScore) {
          maxScore = v.score;
          finalBest = v.judgeResult;
          finalBestContent = v.content;
        }
      }
    }

    const duration = Date.now() - pipelineStartTime;

    const result: GenerateV2Result = {
      bestContent: finalBestContent,
      bestScore: finalBest.totalScore,
      grade: finalBest.grade,
      judgeResult: finalBest,
      allVariations,
      regenerateAttempts,
      duration,
    };

    job.result = result;
    job.status = 'completed';
    job.completedAt = Date.now();

    addProgress(
      'done',
      `Generate pipeline complete: ${finalBest.totalScore}/23 (${finalBest.grade}), ` +
      `${allVariations.length} variations, ${regenerateAttempts} regen attempts, ${duration}ms`
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    job.status = 'failed';
    job.error = errorMsg;
    job.completedAt = Date.now();
    addProgress('done', `Generate pipeline failed: ${errorMsg}`);
    console.error(`[GenerateV2] Pipeline crashed for job ${job.id}: ${errorMsg}`);
  }
}

// ─── Knowledge Data Converters ─────────────────────────────────────

/**
 * Convert KnowledgeDB's PatternData to judge-engine's PatternData.
 */
function convertKnowledgeDBToPatternData(
  kbPatterns: {
    total_submissions_analyzed: number;
    strength_patterns: Array<{
      pattern: string;
      frequency_in_winners: number;
      category: string;
    }>;
    weakness_patterns: Array<{
      pattern: string;
      frequency_in_losers: number;
      category: string;
    }>;
    banned_phrases: Array<{
      phrase: string;
      reason: string;
    }>;
    scoring_benchmarks: {
      originality?: { winner_avg: number; loser_avg: number; target: number };
      alignment?: { winner_avg: number; loser_avg: number; target: number };
      accuracy?: { winner_avg: number; loser_avg: number; target: number };
      compliance?: { winner_avg: number; loser_avg: number; target: number };
      engagement?: { winner_avg: number; loser_avg: number; target: number };
      technical?: { winner_avg: number; loser_avg: number; target: number };
      reply_quality?: { winner_avg: number; loser_avg: number; target: number };
    };
    category_insights: Record<string, {
      key_differentiator: string;
      rally_judge_expects: string;
    }>;
    top_examples: Array<{
      rank: number;
      x_username: string;
      score: number;
      key_strengths: string[];
    }>;
  }
): PatternData {
  const b = kbPatterns.scoring_benchmarks || {};
  return {
    totalSubmissions: kbPatterns.total_submissions_analyzed,
    strengthPatterns: (kbPatterns.strength_patterns || []).map((sp) => ({
      pattern: sp.pattern,
      frequency: sp.frequency_in_winners || 0,
    })),
    weaknessPatterns: (kbPatterns.weakness_patterns || []).map((wp) => ({
      pattern: wp.pattern,
      frequency: wp.frequency_in_losers || 0,
    })),
    bannedPhrases: (kbPatterns.banned_phrases || []).map((bp) => ({
      phrase: bp.phrase,
      reason: bp.reason,
    })),
    benchmarks: {
      originality: {
        winnerAvg: b.originality?.winner_avg || 0,
        loserAvg: b.originality?.loser_avg || 0,
        target: b.originality?.target || 0,
      },
      alignment: {
        winnerAvg: b.alignment?.winner_avg || 0,
        loserAvg: b.alignment?.loser_avg || 0,
        target: b.alignment?.target || 0,
      },
      accuracy: {
        winnerAvg: b.accuracy?.winner_avg || 0,
        loserAvg: b.accuracy?.loser_avg || 0,
        target: b.accuracy?.target || 0,
      },
      compliance: {
        winnerAvg: b.compliance?.winner_avg || 0,
        loserAvg: b.compliance?.loser_avg || 0,
        target: b.compliance?.target || 0,
      },
      engagement: {
        winnerAvg: b.engagement?.winner_avg || 0,
        loserAvg: b.engagement?.loser_avg || 0,
        target: b.engagement?.target || 0,
      },
      technical: {
        winnerAvg: b.technical?.winner_avg || 0,
        loserAvg: b.technical?.loser_avg || 0,
        target: b.technical?.target || 0,
      },
      replyQuality: {
        winnerAvg: b.reply_quality?.winner_avg || 0,
        loserAvg: b.reply_quality?.loser_avg || 0,
        target: b.reply_quality?.target || 0,
      },
    },
    categoryInsights: Object.fromEntries(
      Object.entries(kbPatterns.category_insights || {}).map(([key, val]) => {
        return [key, `${val.key_differentiator} ${val.rally_judge_expects}`.trim()];
      })
    ),
    topExamples: (kbPatterns.top_examples || []).map((ex) => ({
      username: ex.x_username,
      score: ex.score,
      maxScore: 23,
      strengths: ex.key_strengths || [],
    })),
  };
}

/**
 * Convert learn-engine's CampaignPatterns to judge-engine's PatternData.
 */
function convertEnginePatternsToPatternData(
  patterns: {
    strengthPatterns: Array<{
      pattern: string;
      examples: string[];
      frequency_in_winners: number;
      frequency_in_losers: number;
      category: string;
    }>;
    weaknessPatterns: Array<{
      pattern: string;
      red_flag_phrases: string[];
      frequency_in_losers: number;
      frequency_in_winners: number;
      category: string;
    }>;
    bannedPhrases: Array<{
      phrase: string;
      reason: string;
    }>;
    scoringBenchmarks: Record<string, {
      winner_avg: number;
      loser_avg: number;
      target: number;
    }>;
    categoryInsights: Record<string, {
      key_differentiator: string;
      rally_judge_expects: string;
    }>;
    topExamples: Array<{
      rank: number;
      username: string;
      score: number;
      key_strengths: string[];
    }>;
  }
): PatternData {
  const b = patterns.scoringBenchmarks || {};
  return {
    totalSubmissions: patterns.topExamples?.length || 0,
    strengthPatterns: (patterns.strengthPatterns || []).map((sp) => ({
      pattern: sp.pattern,
      frequency: sp.frequency_in_winners || 0,
    })),
    weaknessPatterns: (patterns.weaknessPatterns || []).map((wp) => ({
      pattern: wp.pattern,
      frequency: wp.frequency_in_losers || 0,
    })),
    bannedPhrases: (patterns.bannedPhrases || []).map((bp) => ({
      phrase: bp.phrase,
      reason: bp.reason,
    })),
    benchmarks: {
      originality: {
        winnerAvg: b.originality?.winner_avg || 0,
        loserAvg: b.originality?.loser_avg || 0,
        target: b.originality?.target || 0,
      },
      alignment: {
        winnerAvg: b.alignment?.winner_avg || 0,
        loserAvg: b.alignment?.loser_avg || 0,
        target: b.alignment?.target || 0,
      },
      accuracy: {
        winnerAvg: b.accuracy?.winner_avg || 0,
        loserAvg: b.accuracy?.loser_avg || 0,
        target: b.accuracy?.target || 0,
      },
      compliance: {
        winnerAvg: b.compliance?.winner_avg || 0,
        loserAvg: b.compliance?.loser_avg || 0,
        target: b.compliance?.target || 0,
      },
      engagement: {
        winnerAvg: b.engagement?.winner_avg || 0,
        loserAvg: b.engagement?.loser_avg || 0,
        target: b.engagement?.target || 0,
      },
      technical: {
        winnerAvg: b.technical?.winner_avg || 0,
        loserAvg: b.technical?.loser_avg || 0,
        target: b.technical?.target || 0,
      },
      replyQuality: {
        winnerAvg: b.reply_quality?.winner_avg || 0,
        loserAvg: b.reply_quality?.loser_avg || 0,
        target: b.reply_quality?.target || 0,
      },
    },
    categoryInsights: Object.fromEntries(
      Object.entries(patterns.categoryInsights || {}).map(([key, val]) => {
        return [key, `${val.key_differentiator} ${val.rally_judge_expects}`.trim()];
      })
    ),
    topExamples: (patterns.topExamples || []).map((ex) => ({
      username: ex.username,
      score: ex.score,
      maxScore: 23,
      strengths: ex.key_strengths || [],
    })),
  };
}
