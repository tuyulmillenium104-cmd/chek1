/**
 * Rally-Style Scoring Engine
 * 
 * Implements Rally's actual scoring system:
 * - 4 Gates (0-2): Content Alignment, Info Accuracy, Campaign Compliance, Originality
 * - 2 Quality Metrics (0-5): Engagement Potential, Technical Quality
 * - 5 Engagement Metrics (projected): RT, Likes, Replies, QR, FR
 * - Gate Multiplier: M = 1 + 0.5 × (avg_gates - 1)
 * - Campaign Points: CP = M × Σ(W[i] × normalized[i])
 * - Distribution Curves: Balanced (α=1), Default (α=3), Extreme (α=8)
 * - Top % Estimation from leaderboard data
 */

// ─── TYPES ───────────────────────────────────────────────────────────

export interface GateScores {
  contentAlignment: number;   // 0-2
  informationAccuracy: number;  // 0-2
  campaignCompliance: number;   // 0-2
  originalityAuthenticity: number; // 0-2
}

export interface QualityScores {
  engagementPotential: number;  // 0-5
  technicalQuality: number;     // 0-5
}

export interface EngagementMetrics {
  retweets: number;           // log-scaled projected
  likes: number;              // log-scaled projected
  replies: number;            // log-scaled projected
  qualityOfReplies: number;    // 0-1
  followersOfRepliers: number; // log-scaled projected
}

export interface CampaignWeights {
  // gateWeights: [ContentAlignment, InfoAccuracy, CampaignCompliance, Originality]
  gateWeights: number[];
  // metricWeights: [EP, TQ, RT, LK, RP, QR, FR, ...]
  metricWeights: number[];
}

export interface LeaderboardEntry {
  content?: string;
  campaignPoints?: number;
  score?: number;
  quality?: number;
  engagement?: number;
  correctness?: number;
  [key: string]: unknown;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  totalSubmissions?: number;
  topScore?: number;
}

export type DistributionCurve = 'balanced' | 'default' | 'extreme';

export const DISTRIBUTION_CURVE_ALPHA: Record<DistributionCurve, number> = {
  balanced: 1.0,
  default: 3.0,
  extreme: 8.0,
};

export interface JudgeResult {
  gates: GateScores;
  quality: QualityScores;
  engagement: EngagementMetrics;
  strengths: string[];
  weaknesses: string[];
  gateReasons: Record<keyof GateScores, string>;
  qualityReasons: Record<keyof QualityScores, string>;
  engagementReasons: Partial<Record<keyof EngagementMetrics, string>>;
}

export interface ConsensusResult {
  gates: GateScores;
  quality: QualityScores;
  engagement: EngagementMetrics;
  passed: boolean;
  disqualifiedReason: string | null;
  gateMultiplier: number;
  campaignPoints: number;
  topPercentile: { low: number; high: number };
  distributionShare: number;
  consensus: {
    overallVariance: number;
    metricVariances: Record<string, number>;
    flags: string[];
    confidence: 'high' | 'medium' | 'low';
  };
}

export interface FinalResult {
  judges: {
    optimist: JudgeResult;
    analyst: JudgeResult;
    critic: JudgeResult;
  };
  consensus: ConsensusResult;
  distributionCurve: DistributionCurve;
  estimatedTopPercent: { low: number; high: number };
  verdict: 'APPROVE' | 'REVISE' | 'REJECT' | 'DISQUALIFIED';
  verdictReason: string;
}

// ─── GATE CHECKER ──────────────────────────────────────────────────────

export interface GateCheckInput {
  content: string;
  rules: string[];
  knowledgeBase: string;
  requiredMentions?: string[];
  requiredHashtags?: string[];
  characterLimit?: number;
  missionRules?: string[];
}

export interface GateCheckResult {
  compliance: {
    hasRequiredMentions: boolean;
    missingMentions: string[];
    hasRequiredHashtags: boolean;
    missingHashtags: string[];
    withinCharLimit: boolean;
    charCount: number;
    followsRules: boolean;
    ruleViolations: string[];
  };
}

export function checkGateCompliance(input: GateCheckInput): GateCheckResult {
  const { content, requiredMentions, requiredHashtags, characterLimit } = input;
  
  const result: GateCheckResult = {
    compliance: {
      hasRequiredMentions: true,
      missingMentions: [],
      hasRequiredHashtags: true,
      missingHashtags: [],
      withinCharLimit: true,
      charCount: content.length,
      followsRules: true,
      ruleViolations: [],
    }
  };

  // Check required mentions
  if (requiredMentions && requiredMentions.length > 0) {
    for (const mention of requiredMentions) {
      if (!content.includes(mention)) {
        result.compliance.hasRequiredMentions = false;
        result.compliance.missingMentions.push(mention);
      }
    }
  }

  // Check required hashtags
  if (requiredHashtags && requiredHashtags.length > 0) {
    for (const tag of requiredHashtags) {
      if (!content.includes(tag)) {
        result.compliance.hasRequiredHashtags = false;
        result.compliance.missingHashtags.push(tag);
      }
    }
  }

  // Check character limit
  if (characterLimit) {
    result.compliance.withinCharLimit = content.length <= characterLimit;
    result.compliance.charCount = content.length;
  }

  // Check campaign rules
  const allRules = [...(input.rules || []), ...(input.missionRules || [])];
  result.compliance.ruleViolations = [];

  // AI evaluation of rules (simplified - will be done by AI judge)
  // This is a pre-check before AI evaluation

  return result;
}

// ─── GATE MULTIPLIER ────────────────────────────────────────────────────

export function calculateGateMultiplier(gates: GateScores): number {
  const values = [
    gates.contentAlignment,
    gates.informationAccuracy,
    gates.campaignCompliance,
    gates.originalityAuthenticity,
  ];
  
  // Check if any gate is 0 (disqualified)
  const minGate = Math.min(...values);
  if (minGate <= 0) {
    return 0; // Disqualified
  }
  
  const avgGates = values.reduce((a, b) => a + b, 0) / values.length;
  const multiplier = 1 + 0.5 * (avgGates - 1);
  
  return Math.max(0, multiplier);
}

// ─── CAMPAIGN POINTS ────────────────────────────────────────────────────

export interface CampaignPointsInput {
  gates: GateScores;
  quality: QualityScores;
  engagement: EngagementMetrics;
  weights: CampaignWeights;
}

export function calculateCampaignPoints(input: CampaignPointsInput): {
  multiplier: number;
  weightedScore: number;
  disqualified: boolean;
} {
  const multiplier = calculateGateMultiplier(input.gates);
  
  if (multiplier === 0) {
    return { multiplier: 0, weightedScore: 0, disqualified: true };
  }

  // Normalize gates (0-2 → 0-1)
  const normalizedGates = [
    input.gates.contentAlignment / 2,
    input.gates.informationAccuracy / 2,
    input.gates.campaignCompliance / 2,
    input.gates.originalityAuthenticity / 2,
  ];

  // Normalize quality (0-5 → 0-1)
  const normalizedQuality = [
    input.quality.engagementPotential / 5,
    input.quality.technicalQuality / 5,
  ];

  // Normalize engagement (log-scaled → 0-1 estimate)
  const normalizedEngagement = [
    input.engagement.retweets > 0 ? Math.min(1, Math.log10(input.engagement.retweets + 1) / 3) : 0,
    input.engagement.likes > 0 ? Math.min(1, Math.log10(input.engagement.likes + 1) / 3) : 0,
    input.engagement.replies > 0 ? Math.min(1, Math.log10(input.engagement.replies + 1) / 3) : 0,
    input.engagement.qualityOfReplies, // already 0-1
    input.engagement.followersOfRepliers > 0 ? Math.min(1, Math.log10(input.engagement.followersOfRepliers + 1) / 4) : 0,
  ];

  // Combine all normalized metrics
  const allNormalized = [...normalizedGates, ...normalizedQuality, ...normalizedEngagement];

  // Apply weights
  const gateWeights = input.weights.gateWeights || [0.9, 0.8, 1, 0.7];
  const metricWeights = input.weights.metricWeights || [];
  
  // Pad weights if needed
  const fullWeights: number[] = [];
  for (let i = 0; i < allNormalized.length; i++) {
    if (i < gateWeights.length) {
      fullWeights.push(gateWeights[i]);
    } else if (i < gateWeights.length + metricWeights.length) {
      fullWeights.push(metricWeights[i - gateWeights.length]);
    } else {
      fullWeights.push(0.5); // default weight for unweighted metrics
    }
  }

  const weightedScore = allNormalized.reduce((sum, val, i) => {
    return sum + val * (fullWeights[i] || 0);
  }, 0);

  return {
    multiplier,
    weightedScore,
    disqualified: false,
  };
}

// ─── DISTRIBUTION CURVE ───────────────────────────────────────────────────

export function calculateDistributionShare(
  campaignPoints: number,
  allCampaignPoints: number[],
  curve: DistributionCurve = 'default'
): number {
  const alpha = DISTRIBUTION_CURVE_ALPHA[curve];
  const poweredScore = Math.max(0, campaignPoints) ** alpha;
  
  const totalPowered = allCampaignPoints.reduce((sum, cp) => {
    return sum + Math.max(0, cp) ** alpha;
  }, 0);
  
  if (totalPowered === 0) return 0;
  return poweredScore / totalPowered;
}

// ─── TOP % ESTIMATOR ─────────────────────────────────────────────────────

export function estimateTopPercentile(
  campaignPoints: number,
  leaderboardData: LeaderboardData | null,
  totalSubmissions?: number
): { low: number; high: number } {
  if (!leaderboardData || !leaderboardData.entries || leaderboardData.entries.length === 0) {
    return { low: 50, high: 50 }; // No data, assume median
  }

  const entries = leaderboardData.entries;
  const scores = entries
    .map(e => e.campaignPoints || e.score || e.quality || e.correctness || 0)
    .filter(s => s > 0)
    .sort((a, b) => b - a); // Descending

  if (scores.length === 0) {
    return { low: 50, high: 50 };
  }

  // Find where our score would rank
  const totalSubs = totalSubmissions || leaderboardData.totalSubmissions || scores.length;
  let rank = totalSubs; // Default: worst position
  
  for (let i = 0; i < scores.length; i++) {
    if (campaignPoints >= scores[i]) {
      rank = i + 1;
      break;
    }
  }

  // Percentile: rank 1 = top 0%, rank N = top (N/N * 100)%
  const percentile = (rank / totalSubs) * 100;
  
  // Add uncertainty margin (±5%)
  return {
    low: Math.max(1, Math.round(percentile - 5)),
    high: Math.min(99, Math.round(percentile + 5)),
  };
}

// ─── VERDICT ENGINE ──────────────────────────────────────────────────────

export function generateVerdict(
  consensus: ConsensusResult,
  judgeGap: number
): { verdict: FinalResult['verdict']; reason: string } {
  // DISQUALIFIED: Any gate = 0
  if (consensus.disqualifiedReason) {
    return {
      verdict: 'DISQUALIFIED',
      reason: consensus.disqualifiedReason,
    };
  }

  // REJECT: No campaign points
  if (consensus.campaignPoints <= 0) {
    return { verdict: 'REJECT', reason: 'Zero campaign points' };
  }

  // APPROVE: Good campaign points + high confidence
  if (consensus.campaignPoints > 0.3 && consensus.consensus.confidence === 'high') {
    return { verdict: 'APPROVE', reason: `Strong consensus (variance: ${consensus.consensus.overallVariance.toFixed(2)})` };
  }

  // APPROVE: Decent campaign points
  if (consensus.campaignPoints > 0.15) {
    return { verdict: 'APPROVE', reason: `Adequate quality` };
  }

  // REVISE: Low points or low confidence
  return { verdict: 'REVISE', reason: `Low confidence (variance: ${consensus.consensus.overallVariance.toFixed(2)}) or low points` };
}

// ─── CONSENSUS MECHANISM ──────────────────────────────────────────────

export function calculateConsensus(
  judges: [JudgeResult, JudgeResult, JudgeResult],
  weights?: CampaignWeights,
  leaderboardData?: LeaderboardData | null,
  totalSubmissions?: number,
  distributionCurve: DistributionCurve = 'default'
): ConsensusResult {
  // 1. Calculate per-metric averages and variances
  const allGateKeys: (keyof GateScores)[] = [
    'contentAlignment', 'informationAccuracy', 'campaignCompliance', 'originalityAuthenticity'
  ];
  const allQualityKeys: (keyof QualityScores)[] = ['engagementPotential', 'technicalQuality'];
  const allEngagementKeys: (keyof EngagementMetrics)[] = [
    'retweets', 'likes', 'replies', 'qualityOfReplies', 'followersOfRepliers'
  ];

  const metricVariances: Record<string, number> = {};
  let flags: string[] = [];
  let totalVariance = 0;
  let metricCount = 0;

  // Gate consensus
  const gateAverages: Partial<Record<keyof GateScores, number>> = {};
  for (const key of allGateKeys) {
    const scores = judges.map(j => j.gates[key]);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = Math.max(...scores) - Math.min(...scores);
    gateAverages[key] = avg;
    metricVariances[`gate_${key}`] = variance;
    totalVariance += variance;
    metricCount++;

    if (variance > 1.5) {
      flags.push(`High variance on gate: ${key} (${variance.toFixed(2)})`);
    }
  }

  // Quality consensus
  const qualityAverages: Partial<Record<keyof QualityScores, number>> = {};
  for (const key of allQualityKeys) {
    const scores = judges.map(j => j.quality[key]);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = Math.max(...scores) - Math.min(...scores);
    qualityAverages[key] = avg;
    metricVariances[`quality_${key}`] = variance;
    totalVariance += variance;
    metricCount++;

    if (variance > 2.0) {
      flags.push(`High variance on quality: ${key} (${variance.toFixed(2)})`);
    }
  }

  // Engagement consensus (projected)
  const engagementAverages: Partial<Record<keyof EngagementMetrics, number>> = {};
  for (const key of allEngagementKeys) {
    const scores = judges.map(j => j.engagement[key]);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = Math.max(...scores) - Math.min(...scores);
    engagementAverages[key] = avg;
    metricVariances[`engagement_${key}`] = variance;
    totalVariance += variance;
    metricCount++;
  }

  // Build final scores
  const finalGates: GateScores = {
    contentAlignment: Math.round(gateAverages.contentAlignment! * 10) / 10,
    informationAccuracy: Math.round(gateAverages.informationAccuracy! * 10) / 10,
    campaignCompliance: Math.round(gateAverages.campaignCompliance! * 10) / 10,
    originalityAuthenticity: Math.round(gateAverages.originalityAuthenticity! * 10) / 10,
  };

  const finalQuality: QualityScores = {
    engagementPotential: Math.round(qualityAverages.engagementPotential! * 10) / 10,
    technicalQuality: Math.round(qualityAverages.technicalQuality! * 10) / 10,
  };

  const finalEngagement: EngagementMetrics = {
    retweets: engagementAverages.retweets! || 0,
    likes: engagementAverages.likes! || 0,
    replies: engagementAverages.replies! || 0,
    qualityOfReplies: engagementAverages.qualityOfReplies! || 0,
    followersOfRepliers: engagementAverages.followersOfRepliers! || 0,
  };

  // Check disqualification
  const disqualifiedReason = checkDisqualification(finalGates);

  // Calculate gate multiplier
  const gateMultiplier = calculateGateMultiplier(finalGates);

  // Calculate campaign points
  const cpResult = calculateCampaignPoints({
    gates: finalGates,
    quality: finalQuality,
    engagement: finalEngagement,
    weights: weights || { gateWeights: [0.9, 0.8, 1, 0.7], metricWeights: [0.1, 0.3, 0, 0, 0, 0, 0, 0.9] },
  });

  // Estimate top percentile
  const topPercentile = estimateTopPercentile(
    cpResult.weightedScore,
    leaderboardData || null,
    totalSubmissions
  );

  // Overall variance
  const overallVariance = metricCount > 0 ? totalVariance / metricCount : 0;

  // Confidence level
  const confidence: 'high' | 'medium' | 'low' =
    overallVariance < 0.5 ? 'high' :
    overallVariance < 1.0 ? 'medium' : 'low';

  return {
    gates: finalGates,
    quality: finalQuality,
    engagement: finalEngagement,
    passed: !disqualifiedReason,
    disqualifiedReason,
    gateMultiplier,
    campaignPoints: cpResult.weightedScore,
    topPercentile,
    distributionShare: 0, // calculated separately if needed
    consensus: {
      overallVariance,
      metricVariances,
      flags,
      confidence,
    },
  };
}

function checkDisqualification(gates: GateScores): string | null {
  if (gates.contentAlignment <= 0) return 'Content Alignment gate failed (score = 0)';
  if (gates.informationAccuracy <= 0) return 'Information Accuracy gate failed (score = 0)';
  if (gates.campaignCompliance <= 0) return 'Campaign Compliance gate failed (score = 0)';
  if (gates.originalityAuthenticity <= 0) return 'Originality gate failed (score = 0)';
  return null;
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────

export type {
  GateScores,
  QualityScores,
  EngagementMetrics,
  CampaignWeights,
  LeaderboardEntry,
  LeaderboardData,
  DistributionCurve,
  JudgeResult,
  ConsensusResult,
  FinalResult,
  GateCheckInput,
  GateCheckResult,
  CampaignPointsInput,
} from './rally-scoring';
