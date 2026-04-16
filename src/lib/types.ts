// Rally API types
export interface RallyCampaign {
  id: string;
  intelligentContractAddress: string;
  title: string;
  goal?: string;
  knowledgeBase?: string;
  rules?: string;
  style?: string;
  startDate: string;
  endDate: string;
  periodLengthDays: number;
  campaignDurationPeriods: number;
  currentPeriodIndex?: number;
  alpha?: number;
  gateWeights?: number[];
  metricWeights?: number[];
  minimumFollowers: number;
  onlyVerifiedUsers: boolean;
  token: { symbol: string; address: string; chainId: number; logoUri?: string; usdPrice?: number };
  campaignRewards: { totalAmount: number; token: { symbol: string; logoUri?: string } }[];
  missions: RallyMission[];
  participating?: boolean;
  displayCreator: {
    displayName: string;
    xUsername: string;
    avatarUrl?: string;
    organization?: { slug: string; name: string };
  };
  headerImageUrl?: string;
  lastSyncedSubmissionCount?: number;
}

export interface RallyMission {
  id: string;
  title: string;
  description: string;
  rules: string;
  active: boolean;
}

export interface RallySubmission {
  id: string;
  campaignAddress: string;
  periodIndex: number;
  missionId: string;
  xUsername: string;
  tweetId: string;
  atemporalPoints: string;
  temporalPoints: string;
  attoRawScore: string;
  timestamp: string;
  analysis: RallyAnalysisItem[];
  mission?: RallyMission;
  referrer?: string;
  disqualifiedAt?: string | null;
  invalidatedAt?: string | null;
}

export interface RallyAnalysisItem {
  category: string;
  atto_score: string;
  atto_max_score: string;
  analysis: string;
}

// Knowledge DB types
export interface KnowledgeSubmission {
  id: string;
  campaignAddress: string;
  xUsername: string;
  tweetId: string;
  totalScore: number;
  grade: string;
  scores: { category: string; score: number; maxScore: number; analysis: string }[];
  timestamp: string;
  learnedAt: string;
}

export interface PatternPhrase {
  phrase: string;
  frequency: number;
  avgScore: number;
}

export interface CategoryInsight {
  highScorePattern: string;
  lowScorePattern: string;
}

export interface Patterns {
  topPhrases: PatternPhrase[];
  rejectionReasons: PatternPhrase[];
  winningStructures: {
    avgLength: number;
    commonFormats: string[];
    topHashtags: string[];
  };
  categoryInsights: Record<string, CategoryInsight>;
  lastExtractedAt: string;
}

export interface CampaignMetadata {
  campaignAddress: string;
  campaignName: string;
  slug: string;
  totalSubmissions: number;
  lastLearnAt: string | null;
  gradeDistribution: { S: number; A: number; B: number; C: number };
  cronActive: boolean;
  cronInterval: string;
  lastCronRun: string | null;
  nextCronRun: string | null;
}

// Pipeline types
export interface GenerateRequest {
  campaignAddress: string;
  missionId?: string;
  customBrief?: string;
}

export interface GenerateResponse {
  content: string;
  cleaned: string;
  warnings: string[];
}

export interface JudgeScore {
  category: string;
  score: number;
  maxScore: number;
  analysis: string;
}

export interface JudgeRequest {
  content: string;
  campaignAddress: string;
}

export interface JudgeResponse {
  scores: JudgeScore[];
  totalScore: number;
  maxScore: number;
  grade: string;
  accepted: boolean;
  feedback: string;
  gradeSPrediction: string;
}

export interface PipelineResult {
  content: string;
  judgeResult: JudgeResponse;
  retries: number;
}

export interface LearnResult {
  newSubmissions: number;
  totalSubmissions: number;
  patternsExtracted: boolean;
}
