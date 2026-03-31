/**
 * Rally Pipeline Orchestrator (v2) — Rally-Style Scoring
 * 
 * Pipeline flow:
 * Phase 0: PreWriting Agent (generates writing brief)
 * Phase 1: Content Generator (writes tweet/post)
 * Phase 2: 3 AI Judges from different vendors (GPT, Gemini, Claude)
 * Phase 3: Consensus + Campaign Points + Top % estimation + Verdict
 * Phase 4: (Optional) Auto-revise if REVISE verdict
 * 
 * Uses rally-scoring.ts for Rally-accurate scoring
 * Uses ai-service.ts for multi-vendor AI model routing
 */

import { callAI, getPreWritingPrompt, getGeneratorPrompt, runGenerator, runJudge, rateLimiter, JUDGE_MODELS, GENERATOR_MODEL } from './ai-service';
import {
  checkGateCompliance,
  calculateConsensus,
  generateVerdict,
  estimateTopPercentile,
  calculateCampaignPoints,
  calculateGateMultiplier,
  type GateScores,
  type QualityScores,
  type EngagementMetrics,
  type CampaignWeights,
  type JudgeResult,
  type ConsensusResult,
  type LeaderboardData,
  type FinalResult,
} from './rally-scoring';

// ─── JOB INTERFACES ────────────────────────────────────────────────────

export interface CampaignJob {
  id: string;
  campaignData: {
    title: string;
    goal: string;
    style: string;
    rules: string[];
    knowledgeBase: string;
    adminNotice?: string;
    displayCreator?: string;
    intelligentContractAddress: string;
    gateWeights: number[];
    metricWeights: number[];
  };
  mission: {
    title?: string;
    description?: string;
    rules?: string[];
    style?: string;
    contentType?: string;
    characterLimit?: number;
  } | null;
  missionIndex: number;
  leaderboardData: {
    entries: Array<{
      content?: string;
      campaignPoints?: number;
      score?: number;
      quality?: number;
      engagement?: number;
      correctness?: number;
      [key: string]: unknown;
    }>;
    totalSubmissions?: number;
    topScore?: number;
  } | null;
}

export interface PipelineResult {
  success: boolean;
  jobId: string;
  content: string;
  brief: Record<string, unknown>;
  judges: {
    optimist: JudgeResult & { rawContent: string };
    analyst: JudgeResult & { rawContent: string };
    critic: JudgeResult & { rawContent: string };
  };
  consensus: ConsensusResult;
  finalResult: FinalResult;
  gateCompliance: {
    hasRequiredMentions: boolean;
    missingMentions: string[];
    hasRequiredHashtags: boolean;
    missingHashtags: string[];
    withinCharLimit: boolean;
    charCount: number;
  };
  verdict: string;
  verdictReason: string;
  timings: {
    phase0: number;
    phase1: number;
    phase2: number;
    phase3: number;
    total: number;
  };
}

// ─── EXTRACT CAMPAIGN RULES ────────────────────────────────────────────

function extractRequiredElements(rules: string[]): { mentions: string[]; hashtags: string[] } {
  const mentions: string[] = [];
  const hashtags: string[] = [];

  for (const rule of rules) {
    // Pattern: "must mention @Username"
    const mentionMatch = rule.match(/must\s+(?:include|mention|tag)\s+@(\w[\w.]+)/i);
    if (mentionMatch) mentions.push(`@${mentionMatch[1]}`);

    // Pattern: "must include hashtag #TagName" or "must use #TagName"
    const tagMatch = rule.match(/(?:include|use|add)\s+#(\w[\w.]+)/i);
    if (tagMatch) hashtags.push(`#${tagMatch[1]}`);
  }

  return { mentions, hashtags };
}

// ─── MAIN PIPELINE ────────────────────────────────────────────────────

export async function runPipeline(job: CampaignJob): Promise<PipelineResult> {
  const startTime = Date.now();
  const timings = { phase0: 0, phase1: 0, phase2: 0, phase3: 0, total: 0 };

  try {
    // ── CONTEXT PREPARATION ──────────────────────────────────────────
    const { campaignData, mission, leaderboardData } = job;
    const { mentions, hashtags } = extractRequiredElements(campaignData.rules);

    const campaignContext = {
      campaignTitle: campaignData.title,
      campaignGoal: campaignData.goal,
      campaignStyle: campaignData.style,
      campaignRules: campaignData.rules,
      missionTitle: mission?.title || '',
      missionDescription: mission?.description || '',
      missionRules: mission?.rules || [],
      knowledgeBase: campaignData.knowledgeBase,
      contentType: mission?.contentType || 'tweet',
      characterLimit: mission?.characterLimit,
      gateWeights: campaignData.gateWeights,
      metricWeights: campaignData.metricWeights,
    };

    // Extract top 5 leaderboard entries
    const topEntries = (leaderboardData?.entries || []).slice(0, 5);
    const leaderboardText = topEntries
      .map((e, i) => `#${i + 1}: ${e.content || '(no content)'}`)
      .join('\n');

    // ── PHASE 0: PRE-WRITING AGENT ──────────────────────────────────
    const phase0Start = Date.now();
    
    const pwParts: string[] = [getPreWritingPrompt()];
    pwParts.push('');
    pwParts.push('CAMPAIGN CONTEXT:');
    pwParts.push('Title: ' + campaignData.title);
    pwParts.push('Goal: ' + campaignData.goal);
    pwParts.push('Style: ' + campaignData.style);
    pwParts.push('');
    pwParts.push('RULES:');
    pwParts.push(campaignData.rules.join('\n'));
    pwParts.push('');
    if (mission) {
      pwParts.push('MISSION: ' + mission.title);
      pwParts.push('Description: ' + mission.description);
      pwParts.push('Mission Rules: ' + (mission.rules || []).join('\n'));
    } else {
      pwParts.push('No specific mission');
    }
    pwParts.push('');
    pwParts.push('KNOWLEDGE BASE:');
    pwParts.push(campaignData.knowledgeBase.substring(0, 3000));
    pwParts.push('');
    pwParts.push('TOP LEADERBOARD SUBMISSIONS (study what works):');
    pwParts.push(leaderboardText || 'No leaderboard data available');
    pwParts.push('');
    pwParts.push('CHARACTER LIMIT: ' + (mission?.characterLimit || 'None specified'));

    const preWritingPrompt = pwParts.join('\n');

    const preWritingResult = await callAI({
      systemPrompt: preWritingPrompt,
      userPrompt: preWritingPrompt,
      model: { id: 'gpt-4o-mini', model: 'gpt-4o-mini', vendor: 'OpenAI', quality: 'medium', speed: 'fast', cost: 'low' },
      temperature: 0.8,
      maxTokens: 1500,
    });

    let brief: Record<string, unknown>;
    try {
      let briefStr = preWritingResult.content.trim();
      const fence = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);
      const fs = briefStr.indexOf(fence);
      if (fs >= 0) {
        let cs = fs + 3;
        if (briefStr.substring(cs, cs + 4) === 'json') cs += 4;
        while (cs < briefStr.length && /\s/.test(briefStr[cs])) cs++;
        const fe = briefStr.indexOf(fence, cs);
        if (fe > cs) briefStr = briefStr.substring(cs, fe).trim();
      }
      const jsonStart = briefStr.indexOf('{');
      const jsonEnd = briefStr.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        briefStr = briefStr.substring(jsonStart, jsonEnd + 1);
      }
      brief = JSON.parse(briefStr);
    } catch (e) {
      brief = { error: 'Failed to parse brief', raw: preWritingResult.content.substring(0, 200) };
    }

    timings.phase0 = Date.now() - phase0Start;

    // ── GATE COMPLIANCE CHECK ─────────────────────────────────────
    // This is a pre-generation check — we'll validate after generation too

    // ── PHASE 1: CONTENT GENERATOR ──────────────────────────────────
    const phase1Start = Date.now();

    const generatorContext = {
      writingBrief: JSON.stringify(brief, null, 2),
      ...campaignContext,
    };

    let content = await runGenerator(generatorContext);

    // Post-generation compliance check
    const postCompliance = checkGateCompliance({
      content,
      rules: campaignData.rules,
      knowledgeBase: campaignData.knowledgeBase,
      requiredMentions: mentions,
      requiredHashtags: hashtags,
      characterLimit: mission?.characterLimit,
      missionRules: mission?.rules,
    });

    // Auto-fix missing mentions/hashtags if possible
    if (!postCompliance.compliance.hasRequiredMentions && mentions.length > 0) {
      const missing = postCompliance.compliance.missingMentions;
      if (missing.length > 0 && content.length + missing.join(' ') + 2 < (mission?.characterLimit || 500)) {
        content = content + ' ' + missing.join(' ');
      }
    }
    if (!postCompliance.compliance.hasRequiredHashtags && hashtags.length > 0) {
      const missing = postCompliance.compliance.missingHashtags;
      if (missing.length > 0 && content.length + missing.join(' ') + 2 < (mission?.characterLimit || 500)) {
        content = content + ' ' + missing.join(' ');
      }
    }

    // Trim if over limit
    if (mission?.characterLimit && content.length > mission.characterLimit) {
      content = content.substring(0, mission.characterLimit);
    }

    timings.phase1 = Date.now() - phase1Start;

    // ── PHASE 2: THREE AI JUDGES ──────────────────────────────────
    const phase2Start = Date.now();

    const judgeContext = {
      ...campaignContext,
      content,
    };

    // Run all 3 judges in parallel
    const [optimistResult, analystResult, criticResult] = await Promise.all([
      runJudge('optimist', judgeContext),
      runJudge('analyst', judgeContext),
      runJudge('critic', judgeContext),
    ]);

    timings.phase2 = Date.now() - phase2Start;

    // ── PHASE 3: CONSENSUS + SCORING ──────────────────────────────
    const phase3Start = Date.now();

    const weights: CampaignWeights = {
      gateWeights: campaignData.gateWeights || [0.9, 0.8, 1, 0.7],
      metricWeights: campaignData.metricWeights || [0.1, 0.3, 0, 0, 0, 0, 0, 0.9],
    };

    const consensus = calculateConsensus(
      [optimistResult, analystResult, criticResult],
      weights,
      leaderboardData,
      leaderboardData?.totalSubmissions,
    );

    const finalResult: FinalResult = {
      judges: {
        optimist: optimistResult,
        analyst: analystResult,
        critic: criticResult,
      },
      consensus,
      distributionCurve: 'default',
      estimatedTopPercent: consensus.topPercentile,
      verdict: 'APPROVE',
      verdictReason: '',
    };

    // Generate verdict
    const { verdict, reason } = generateVerdict(consensus, 0);
    finalResult.verdict = verdict;
    finalResult.verdictReason = reason;

    timings.phase3 = Date.now() - phase3Start;
    timings.total = Date.now() - startTime;

    // ── BUILD RESULT ────────────────────────────────────────────────
    return {
      success: true,
      jobId: job.id,
      content,
      brief,
      judges: {
        optimist: optimistResult,
        analyst: analystResult,
        critic: criticResult,
      },
      consensus,
      finalResult,
      gateCompliance: postCompliance.compliance,
      verdict,
      verdictReason: reason,
      timings,
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      success: false,
      jobId: job.id,
      content: '',
      brief: {},
      judges: {} as any,
      consensus: {} as any,
      finalResult: {} as any,
      gateCompliance: {
        hasRequiredMentions: false,
        missingMentions: [],
        hasRequiredHashtags: false,
        missingHashtags: [],
        withinCharLimit: false,
        charCount: 0,
      },
      verdict: 'REJECT',
      verdictReason: `Pipeline error: ${error instanceof Error ? error.message : String(error)}`,
      timings: { phase0: 0, phase1: 0, phase2: 0, phase3: 0, total: endTime - startTime },
    };
  }
}

// ──────────────────────────────────────────────────────────────────
