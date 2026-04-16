/**
 * POST /api/rally/judge
 *
 * Judge a piece of content using the v2 Judge Engine.
 * Optionally enriches judging with learned patterns from a campaign's
 * knowledge data (when campaignAddress is provided).
 */

import { NextRequest, NextResponse } from 'next/server';
import { judgeContent, type JudgeResult, type PatternData } from '@/lib/judge-engine';
import { getStoredPatterns } from '@/lib/learn-engine';

// ─── POST: Judge Content ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body is required' },
        { status: 400 }
      );
    }

    const content = body?.content;
    const campaignData = body?.campaignData;
    const campaignAddress = body?.campaignAddress;

    // Validate required fields
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty "content" field. Provide the text to judge.' },
        { status: 400 }
      );
    }

    if (!campaignData || typeof campaignData !== 'object' || Object.keys(campaignData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty "campaignData" field. Provide campaign context.' },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Content too long (max 10,000 characters).' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Optionally fetch learned patterns for this campaign
    let learnedData: PatternData | undefined = undefined;

    if (campaignAddress && typeof campaignAddress === 'string') {
      try {
        const patterns = await getStoredPatterns(campaignAddress);
        if (patterns) {
          // Convert learn-engine's CampaignPatterns to judge-engine's PatternData
          learnedData = convertCampaignPatternsToPatternData(patterns);
          console.log(
            `[API] Judge: loaded learned patterns for ${campaignAddress.substring(0, 10)}... ` +
            `(${patterns.strengthPatterns?.length || 0} strengths, ${patterns.weaknessPatterns?.length || 0} weaknesses)`
          );
        }
      } catch (err) {
        // Non-fatal: judge works fine without learned data
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[API] Judge: failed to load learned patterns: ${errMsg}`);
      }
    }

    // Run the judge
    const judgeResult = await judgeContent(
      content.trim(),
      campaignData,
      campaignAddress || undefined,
      {
        learnedData,
      }
    );

    const duration = Date.now() - startTime;

    console.log(
      `[API] Judge completed: ${judgeResult.totalScore}/${judgeResult.maxScore} ` +
      `(${judgeResult.grade}) verdict=${judgeResult.verdict} ` +
      `predicted=${judgeResult.predictedRallyScorePct}% in ${duration}ms`
    );

    return NextResponse.json({
      success: true,
      judgeResult,
      duration,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Judge error:', errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Convert learn-engine's CampaignPatterns shape into the judge-engine's
 * PatternData shape that judgeContent expects.
 */
function convertCampaignPatternsToPatternData(
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
      what_winners_do: string;
      what_losers_do: string;
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
): {
  totalSubmissions: number;
  strengthPatterns: Array<{ pattern: string; frequency: number }>;
  weaknessPatterns: Array<{ pattern: string; frequency: number }>;
  bannedPhrases: Array<{ phrase: string; reason: string }>;
  benchmarks: {
    originality: { winnerAvg: number; loserAvg: number; target: number };
    alignment: { winnerAvg: number; loserAvg: number; target: number };
    accuracy: { winnerAvg: number; loserAvg: number; target: number };
    compliance: { winnerAvg: number; loserAvg: number; target: number };
    engagement: { winnerAvg: number; loserAvg: number; target: number };
    technical: { winnerAvg: number; loserAvg: number; target: number };
    replyQuality: { winnerAvg: number; loserAvg: number; target: number };
  };
  categoryInsights: Record<string, string>;
  topExamples: Array<{
    username: string;
    score: number;
    maxScore: number;
    strengths: string[];
  }>;
} {
  const benchmarks = patterns.scoringBenchmarks || {};

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
        winnerAvg: benchmarks.originality?.winner_avg || 0,
        loserAvg: benchmarks.originality?.loser_avg || 0,
        target: benchmarks.originality?.target || 0,
      },
      alignment: {
        winnerAvg: benchmarks.alignment?.winner_avg || 0,
        loserAvg: benchmarks.alignment?.loser_avg || 0,
        target: benchmarks.alignment?.target || 0,
      },
      accuracy: {
        winnerAvg: benchmarks.accuracy?.winner_avg || 0,
        loserAvg: benchmarks.accuracy?.loser_avg || 0,
        target: benchmarks.accuracy?.target || 0,
      },
      compliance: {
        winnerAvg: benchmarks.compliance?.winner_avg || 0,
        loserAvg: benchmarks.compliance?.loser_avg || 0,
        target: benchmarks.compliance?.target || 0,
      },
      engagement: {
        winnerAvg: benchmarks.engagement?.winner_avg || 0,
        loserAvg: benchmarks.engagement?.loser_avg || 0,
        target: benchmarks.engagement?.target || 0,
      },
      technical: {
        winnerAvg: benchmarks.technical?.winner_avg || 0,
        loserAvg: benchmarks.technical?.loser_avg || 0,
        target: benchmarks.technical?.target || 0,
      },
      replyQuality: {
        winnerAvg: benchmarks.reply_quality?.winner_avg || 0,
        loserAvg: benchmarks.reply_quality?.loser_avg || 0,
        target: benchmarks.reply_quality?.target || 0,
      },
    },
    categoryInsights: Object.fromEntries(
      Object.entries(patterns.categoryInsights || {}).map(([key, val]) => {
        const insight = val as {
          key_differentiator?: string;
          rally_judge_expects?: string;
        };
        return [key, `${insight.key_differentiator || ''} ${insight.rally_judge_expects || ''}`.trim()];
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
