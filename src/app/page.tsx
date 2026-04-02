'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Activity,
  Zap,
  Server,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  Cpu,
  Shield,
  Send,
  Copy,
  Check,
  Terminal,
  Sparkles,
  ChevronRight,
  Lightbulb,
  Search,
  ArrowLeft,
  ExternalLink,
  Tag,
  BookOpen,
  ScrollText,
  Info,
  Ban,
  RotateCcw,
  Target,
  Type,
  Link2,
  CalendarDays,
  Trophy,
  Layers,
  Hash,
  ImageIcon,
  Gift,
  CircleDot,
  MessageSquare,
  Swords,
  Crosshair,
  TrendingUp,
  ShieldOff,
  Eye,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface RewardInfo {
  totalAmount: number;
  tokenSymbol: string;
}

interface MissionInfo {
  title?: string;
  goal?: string;
  description?: string;
  style?: string;
  rules?: string;
  knowledgeBase?: string;
  adminNotice?: string;
  characterLimit?: number | null;
  contentType?: string;
  active?: boolean;
  prohibitedItems?: string;
  additionalInfo?: string;
  requirements?: string;
}

interface CampaignCard {
  title: string;
  description: string;
  address: string;
  url: string;
  status: string;
  endDate: string | null;
  startDate: string | null;
  category: string;
  contentType: string;
  characterLimit: number | null;
  rewards: RewardInfo[];
  missionCount: number;
  activeMissionCount: number;
}

interface CampaignDetail {
  title: string;
  description: string;
  goal: string;
  rules: string;
  style: string;
  requirements: string;
  additionalInfo: string;
  knowledgeBase: string;
  prohibitedItems: string;
  campaignUrl: string;
  url: string;
  intelligentContractAddress: string;
  missions: MissionInfo[];
  status: string;
  adminNotice: string;
  // New fields
  missionTitle: string | null;
  missionGoal: string | null;
  missionNumber: number | null;
  contentType: string;
  characterLimit: number | null;
  endDate: string | null;
  startDate: string | null;
  category: string;
  campaignRewards: RewardInfo[];
  [key: string]: unknown;
}

interface TokenInfo {
  index: number;
  label: string;
  userId: string;
  remaining: number;
  status: 'active' | 'depleted' | 'auto';
}

interface GatewayHealth {
  host: string;
  status: string;
}

interface StatusResponse {
  status: string;
  timestamp: string;
  queue: {
    pendingJobs: number;
    processingJobs: number;
    totalResults: number;
  };
  tokenPool: {
    total: number;
    active: number;
    tokens: TokenInfo[];
  };
  gateways: {
    current: string;
    all: string[];
    health: GatewayHealth[];
  };
  rateLimits: {
    activeBuckets: number;
    totalBuckets: number;
    capacityPer10min: number;
  };
}

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'system';
}

// ─── View States ────────────────────────────────────────────────────

type ViewState =
  | { type: 'search' }
  | { type: 'results'; query: string; results: CampaignCard[] }
  | { type: 'detail'; campaign: CampaignDetail }
  | { type: 'generating'; campaign: CampaignDetail }
  | { type: 'result'; campaign: CampaignDetail; content: string; score: GenerationScore };

interface RallyContentCategory {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface G4DetectionResult {
  score: number;
  bonuses: string[];
  penalties: string[];
}

interface XFactorResult {
  score: number;
  factors: string[];
}

interface GenerationScore {
  // New Rally-aligned scoring
  overallGrade: string;
  contentQualityScore: number;   // max 21.0
  contentQualityPct: number;     // 0-100%
  estimatedPosition: string;     // e.g., "Top 10%"
  passesThreshold: boolean;
  categories: RallyContentCategory[];
  g4Detection: G4DetectionResult | null;
  xFactors: XFactorResult | null;
  categoryAnalysis?: Record<string, string>;
  // Pipeline stats
  cycles: number;
  variations: number;
  aiCalls: number;
  time: number;
  competitorBeatScore?: number;
  competitorAvgScore?: number;
  competitorTopScore?: number;
  targetScore?: number;
  // Ground truth calibration
  groundTruth?: {
    totalValid: number;
    top10Pct?: number;
    top25Pct?: number;
    top50Pct?: number;
    averagePct?: number;
    weakCategories: string[];
    strongCategories: string[];
  };
}

// ─── Quick Hint Presets ─────────────────────────────────────────────

const QUICK_HINTS = [
  { label: 'Internet Court', icon: '⚖️' },
  { label: 'DeFi Yield', icon: '💰' },
  { label: 'AI Governance', icon: '🤖' },
  { label: 'Crypto Regulation', icon: '📜' },
  { label: 'NFT Market', icon: '🖼️' },
  { label: 'Web3 Social', icon: '🌐' },
  { label: 'Privacy Tech', icon: '🔒' },
  { label: 'Token Launch', icon: '🚀' },
];

// ─── Simulated Pipeline Stages ─────────────────────────────────────

const PIPELINE_STAGES = [
  { label: 'Analyzing campaign brief + detecting campaign type...', duration: 1200 },
  { label: '🔍 Scanning competitors — searching web for rival content...', duration: 3000 },
  { label: '🧠 Analyzing competitor patterns (angles, hooks, tones)...', duration: 2500 },
  { label: '🎯 Building differentiation strategy — finding gaps to exploit...', duration: 2000 },
  { label: '📊 Fetching REAL Rally submissions for calibration...', duration: 1500 },
  { label: '📖 Building pre-writing perspective (5 internal questions)...', duration: 1500 },
  { label: '🧬 Extracting verified facts from Knowledge Base...', duration: 800 },
  { label: 'Generating 5 content variations (Cycle 1) — BEAT MODE + human artifacts...', duration: 5000 },
  { label: '🎭 Random non-linear structure + 3 human artifacts per variant...', duration: 1500 },
  { label: 'Running 3-stage judge: Optimist -> Analyst -> Critic...', duration: 8000 },
  { label: 'Scoring 7 Rally content categories (max 21.0 points)...', duration: 800 },
  { label: '🔎 G4 Originality scan + X-Factor viral detection...', duration: 800 },
  { label: 'Quality threshold check...', duration: 600 },
  { label: '🛡️ Similarity check: ensuring content is NOT like competitors...', duration: 1500 },
  { label: '🧪 Anti-AI detection (40+ red flags)...', duration: 1000 },
  { label: 'Anti-fabrication check: verifying claims...', duration: 800 },
  { label: 'Finalizing result...', duration: 800 },
] as const;

// ─── Helper: shorten address ───────────────────────────────────────

function shortenAddress(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function isCampaignActive(endDate: string | null): boolean {
  if (!endDate) return true;
  return new Date(endDate) > new Date();
}

// ─── Main Dashboard Component ───────────────────────────────────────

export default function RallyDashboard() {
  // View state
  const [view, setView] = useState<ViewState>({ type: 'search' });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Detail loading
  const [detailLoading, setDetailLoading] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [pipelineStageIndex, setPipelineStageIndex] = useState(-1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  // Result state
  const [copied, setCopied] = useState(false);

  // Status auto-refresh
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [statusLoading, setStatusLoading] = useState(true);

  // ─── Fetch status ──────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/rally/status');
      const data: StatusResponse = await res.json();
      setStatusData(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  // Auto-scroll log panel
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ─── Logging Helpers ───────────────────────────────────────────

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const id = ++logIdRef.current;
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => [...prev, { id, timestamp, message, type }]);
  }, []);

  // ─── Search Handler ────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query || searchLoading) return;

    setSearchLoading(true);
    setSearchError('');

    try {
      const res = await fetch(`/api/rally/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success && data.results.length > 0) {
        setView({ type: 'results', query, results: data.results });
      } else if (data.success && data.results.length === 0) {
        setSearchError(`No campaigns found for "${query}". Try a different search term.`);
      } else {
        setSearchError(data.error || 'Search failed. Please try again.');
      }
    } catch {
      setSearchError('Network error. Please check your connection and try again.');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, searchLoading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !searchLoading && searchQuery.trim()) {
        handleSearch();
      }
    },
    [searchLoading, searchQuery, handleSearch]
  );

  // ─── Select Campaign -> Fetch Detail ───────────────────────────

  const handleSelectCampaign = useCallback(async (card: CampaignCard) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/rally/campaign/${card.address}`);
      const data = await res.json();

      if (data.success && data.campaign) {
        setView({ type: 'detail', campaign: data.campaign as CampaignDetail });
      } else {
        console.error('Failed to fetch campaign details:', data.error);
      }
    } catch (err) {
      console.error('Error fetching campaign detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ─── Switch Mission ────────────────────────────────────────────

  const handleSwitchMission = useCallback(async (missionNum: number, campaign: CampaignDetail) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/rally/campaign/${campaign.intelligentContractAddress}?mission=${missionNum}`);
      const data = await res.json();

      if (data.success && data.campaign) {
        setView({ type: 'detail', campaign: data.campaign as CampaignDetail });
      }
    } catch (err) {
      console.error('Error switching mission:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ─── Generate Content ──────────────────────────────────────────

  const handleGenerate = useCallback(async (campaign: CampaignDetail) => {
    setGenerating(true);
    setView({ type: 'generating', campaign });
    setLogs([]);
    setPipelineStageIndex(-1);
    logIdRef.current = 0;

    addLog(`Pipeline started for campaign: "${campaign.title}"`, 'system');
    if (campaign.missionTitle) {
      addLog(`Mission: ${campaign.missionTitle}`, 'info');
    }
    addLog(`Fetching campaign data from Rally.fun API...`, 'info');

    // Start simulated pipeline stages
    let stageIdx = 0;
    const runStage = () => {
      if (stageIdx >= PIPELINE_STAGES.length) return;
      const stage = PIPELINE_STAGES[stageIdx];
      setPipelineStageIndex(stageIdx);
      addLog(stage.label, 'info');
      stageIdx++;
      if (stageIdx < PIPELINE_STAGES.length) {
        setTimeout(runStage, stage.duration);
      }
    };
    setTimeout(runStage, 600);

    try {
      const res = await fetch('/api/rally/process-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: campaign.title,
          campaignAddress: campaign.intelligentContractAddress,
          campaignData: campaign,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const jobStatus = data.job?.status || 'success';
        const elapsed = data.job ? ((data.job.processingTime || 0) / 1000).toFixed(1) : '?';

        if (jobStatus === 'success') {
          addLog(`Pipeline completed successfully in ${elapsed}s`, 'success');
        } else if (jobStatus === 'partial') {
          addLog(`Pipeline completed with partial results in ${elapsed}s (timeout or cycle limit)`, 'warning');
          if (data.job?.error) {
            addLog(`Note: ${data.job.error}`, 'warning');
          }
        } else {
          addLog(`Pipeline failed in ${elapsed}s`, 'error');
          if (data.job?.error) {
            addLog(`Error: ${data.job.error}`, 'error');
          }
        }

        if (data.job?.bestScoring) {
          addLog(
            `Best result: Grade ${data.job.bestScoring.overallGrade} -- Score ${data.job.bestScoring.contentQualityScore.toFixed(2)} / 21.0 (${data.job.bestScoring.contentQualityPct.toFixed(1)}%)`,
            'success'
          );
          if (data.job.bestScoring.estimatedPosition) {
            addLog(`Estimated Rally Position: ${data.job.bestScoring.estimatedPosition}`, 'success');
          }
        }

        // Competitive analysis logs
        if (data.job?.competitorBeatScore !== undefined) {
          const beatPct = data.job.competitorBeatScore;
          if (beatPct > 0) {
            addLog(`🏆 Beat competitors by ${beatPct}%! (Our score vs competitor avg)`, 'success');
          } else if (beatPct > -20) {
            addLog(`📊 Competitive score: ${beatPct}% (close to competitor average)`, 'warning');
          } else {
            addLog(`⚠️ Below competitor average by ${Math.abs(beatPct)}%`, 'warning');
          }
        }

        // Stats log
        if (data.job) {
          addLog(`Stats: ${data.job.totalVariationsGenerated || 0} variations, ${data.job.totalCycles || 0} cycles, ${data.job.totalAIcalls || 0} AI calls`, 'info');
        }

        // Only show result view if we have content
        if (data.job?.bestContent) {
          // Transition to result view
          setPipelineStageIndex(PIPELINE_STAGES.length);
          setGenerating(false);

          setView({
            type: 'result',
            campaign,
            content: data.job?.bestContent || 'No content generated.',
            score: {
              overallGrade: data.job?.bestScoring?.overallGrade || '?',
              contentQualityScore: data.job?.bestScoring?.contentQualityScore || 0,
              contentQualityPct: data.job?.bestScoring?.contentQualityPct || 0,
              estimatedPosition: data.job?.bestScoring?.estimatedPosition || '?',
              passesThreshold: data.job?.bestScoring?.passesThreshold ?? false,
              categories: data.job?.bestScoring?.categories || [],
              g4Detection: data.job?.bestScoring?.g4Detection || null,
              xFactors: data.job?.bestScoring?.xFactors || null,
              categoryAnalysis: data.job?.bestScoring?.categoryAnalysis,
              cycles: data.job?.totalCycles || 1,
              variations: data.job?.totalVariationsGenerated || 1,
              aiCalls: data.job?.totalAIcalls || 1,
              time: data.job?.processingTime || 0,
              competitorBeatScore: data.job?.competitorBeatScore,
              competitorAvgScore: data.job?.competitiveAnalysis?.patterns?.averageEstimatedScore ?? data.job?.competitiveAnalysis?.patterns?.averageEstimatedCP,
              competitorTopScore: data.job?.competitiveAnalysis?.patterns?.topScore ?? data.job?.competitiveAnalysis?.patterns?.topCP,
              targetScore: data.job?.competitiveAnalysis?.differentiation?.targetScore ?? data.job?.competitiveAnalysis?.differentiation?.targetCP,
              groundTruth: data.job?.groundTruth,
            },
          });
        } else {
          // No content — show error state with retry option
          addLog(`No content generated. ${data.job?.error || 'All candidates failed quality threshold.'}`, 'error');
          setPipelineStageIndex(PIPELINE_STAGES.length);
          setGenerating(false);
          // Show the result view with error info so user can see logs + retry
          setView({
            type: 'result',
            campaign,
            content: '',
            score: {
              overallGrade: '?',
              contentQualityScore: 0,
              contentQualityPct: 0,
              estimatedPosition: 'N/A',
              passesThreshold: false,
              categories: [],
              g4Detection: null,
              xFactors: null,
              cycles: data.job?.totalCycles || 0,
              variations: data.job?.totalVariationsGenerated || 0,
              aiCalls: data.job?.totalAIcalls || 0,
              time: data.job?.processingTime || 0,
            },
            _noContent: true,
          });
        }
      } else {
        addLog(`Pipeline failed: ${data.error || data.message}`, 'error');
        setPipelineStageIndex(PIPELINE_STAGES.length);
        setGenerating(false);
      }

      setTimeout(fetchStatus, 1000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      // Detect gateway timeout (HTML instead of JSON)
      const isGatewayTimeout = errorMsg.includes('is not valid JSON') || errorMsg.includes('Unexpected token');
      if (isGatewayTimeout) {
        addLog('Pipeline took too long — gateway timeout (server needs more time)', 'error');
        addLog('The pipeline may have completed on the server. Try again — rate limit cooldown may be needed.', 'warning');
      } else {
        addLog(`Request failed: ${errorMsg}`, 'error');
      }
      setPipelineStageIndex(PIPELINE_STAGES.length);
      setGenerating(false);
    }
  }, [addLog, fetchStatus]);

  // ─── Copy to clipboard ─────────────────────────────────────────

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // ─── Copy address ──────────────────────────────────────────────

  const [copiedAddr, setCopiedAddr] = useState('');
  const handleCopyAddress = useCallback(async (addr: string) => {
    await handleCopy(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(''), 2000);
  }, [handleCopy]);

  // ─── Render Helpers ─────────────────────────────────────────────

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      case 'system': return 'text-violet-400 font-medium';
      default: return 'text-gray-400';
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
      case 'error': return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
      case 'system': return <Zap className="h-3.5 w-3.5 text-violet-500 shrink-0" />;
      default: return <ChevronRight className="h-3.5 w-3.5 text-gray-500 shrink-0" />;
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'S+' || grade === 'S') return 'text-amber-600 font-bold';
    if (grade === 'A') return 'text-emerald-600 font-bold';
    if (grade === 'B') return 'text-blue-600';
    if (grade === 'C') return 'text-gray-600';
    return 'text-red-600';
  };

  // ─── Loading Overlay ───────────────────────────────────────────

  if (detailLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ═══════ Header ═══════ */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 py-3 md:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {/* Back button (results/detail/result views) */}
              {view.type !== 'search' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (view.type === 'result') {
                      setView({ type: 'detail', campaign: view.campaign });
                    } else if (view.type === 'generating') {
                      setView({ type: 'detail', campaign: view.campaign });
                    } else if (view.type === 'detail') {
                      setView({ type: 'search' });
                      setSearchQuery('');
                    } else if (view.type === 'results') {
                      setView({ type: 'search' });
                      setSearchQuery('');
                    }
                  }}
                  className="h-8 w-8 p-0 -ml-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                  <Zap className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight md:text-xl">
                    Rally Content Pipeline <span className="text-xs font-normal text-muted-foreground ml-1.5">v5</span>
                  </h1>
                  <p className="text-[11px] text-muted-foreground hidden sm:block">
                    Rally-aligned scoring — 7 content categories, max 21.0 points
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusData && (
                <Badge variant="outline" className="gap-1.5 text-xs">
                  {statusData.status === 'online' ? (
                    <Wifi className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  {statusData.status}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="gap-1.5 text-xs h-8"
              >
                <RefreshCw
                  className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''} transition-all duration-1000`}
                />
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>
              {lastUpdated && (
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  {lastUpdated}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 space-y-6">
        {/* ═══════════════════════════════════════════════════════════
            STATE 1: SEARCH VIEW
        ═══════════════════════════════════════════════════════════ */}
        {view.type === 'search' && (
          <>
            {/* Hero Section */}
            <div className="text-center py-8 md:py-12">
              <div className="mx-auto max-w-2xl space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-200">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Find Your Campaign
                </h2>
                <p className="text-muted-foreground text-base md:text-lg">
                  Search from Rally.fun campaigns, review the details, and generate
                  AI-powered social media content.
                </p>
              </div>
            </div>

            {/* Search Input */}
            <Card className="border-2 border-orange-200/60 bg-gradient-to-br from-white via-orange-50/30 to-white relative">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 rounded-t-lg" />
              <CardContent className="pt-6 pb-6 relative">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder='Search campaigns... e.g. "Internet Court", "DeFi Yield"'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={searchLoading}
                      className="h-12 text-base pl-11 pr-4 bg-white border-gray-300 focus:border-orange-400 focus:ring-orange-400/20 disabled:opacity-60"
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={searchLoading || !searchQuery.trim()}
                    size="lg"
                    className="h-12 px-8 gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-orange-200 disabled:opacity-50 transition-all"
                  >
                    {searchLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>

                {/* Error Message */}
                {searchError && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {searchError}
                  </div>
                )}

                {/* Quick Hint Chips */}
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Popular campaigns
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_HINTS.map((hint) => (
                      <button
                        key={hint.label}
                        onClick={() => {
                          setSearchQuery(hint.label);
                          setTimeout(() => {
                            setSearchQuery(hint.label);
                            setSearchLoading(true);
                            setSearchError('');
                            fetch(`/api/rally/search?q=${encodeURIComponent(hint.label)}`)
                              .then((r) => r.json())
                              .then((data) => {
                                if (data.success && data.results.length > 0) {
                                  setView({ type: 'results', query: hint.label, results: data.results });
                                } else if (data.success) {
                                  setSearchError(`No campaigns found for "${hint.label}".`);
                                } else {
                                  setSearchError(data.error || 'Search failed.');
                                }
                              })
                              .catch(() => setSearchError('Network error.'))
                              .finally(() => setSearchLoading(false));
                          }, 0);
                        }}
                        disabled={searchLoading}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      >
                        <span>{hint.icon}</span>
                        {hint.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STATE 2: RESULTS VIEW
        ═══════════════════════════════════════════════════════════ */}
        {view.type === 'results' && (
          <>
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-bold">
                  Results for &ldquo;{view.query}&rdquo;
                </h2>
              </div>
              <Badge variant="secondary" className="w-fit">
                {view.results.length} campaign{view.results.length !== 1 ? 's' : ''} found
              </Badge>
            </div>

            {/* Campaign Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {view.results.map((campaign) => {
                const isActive = isCampaignActive(campaign.endDate);
                return (
                  <Card
                    key={campaign.address}
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-orange-300 hover:-translate-y-0.5 group"
                    onClick={() => handleSelectCampaign(campaign)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug group-hover:text-orange-600 transition-colors">
                          {campaign.title}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] ${
                            isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                        >
                          {isActive ? 'Active' : 'Ended'}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs line-clamp-2">
                        {campaign.description?.substring(0, 120) || 'No description'}
                        {(campaign.description?.length || 0) > 120 ? '...' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {/* Meta info row */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {campaign.endDate && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Ends {formatDate(campaign.endDate)}
                          </span>
                        )}
                        {campaign.rewards?.length > 0 && campaign.rewards[0]?.tokenSymbol && (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <Gift className="h-3 w-3" />
                            {campaign.rewards[0].totalAmount} {campaign.rewards[0].tokenSymbol}
                          </span>
                        )}
                        {campaign.missionCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {campaign.activeMissionCount}/{campaign.missionCount} missions
                          </span>
                        )}
                      </div>
                      {/* Address + chevron */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px]">
                          {shortenAddress(campaign.address)}
                        </code>
                        <ChevronRight className="h-3.5 w-3.5 ml-auto text-gray-300 group-hover:text-orange-400 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STATE 3, 4, 5: DETAIL / GENERATING / RESULT VIEW
        ═══════════════════════════════════════════════════════════ */}
        {(view.type === 'detail' || view.type === 'generating' || view.type === 'result') && (
          <>
            {/* ═══ Campaign Header Card ═══ */}
            <Card className="border-2 border-orange-200/60 bg-gradient-to-br from-white via-orange-50/20 to-white relative">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 rounded-t-lg" />
              <CardHeader className="relative">
                <div className="flex flex-col gap-3">
                  {/* Title + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                          {view.campaign.title}
                        </h2>
                        <Badge
                          variant="outline"
                          className={
                            isCampaignActive(view.campaign.endDate)
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 bg-gray-50 text-gray-500'
                          }
                        >
                          {isCampaignActive(view.campaign.endDate) ? 'Active' : 'Ended'}
                        </Badge>
                      </div>

                      {/* Mission title if active */}
                      {view.campaign.missionTitle && (
                        <div className="flex items-center gap-1.5 text-sm text-orange-700 font-medium">
                          <Target className="h-3.5 w-3.5" />
                          Mission {view.campaign.missionNumber}: {view.campaign.missionTitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meta info grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {/* Contract Address */}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Hash className="h-3 w-3 shrink-0" />
                      <div className="flex items-center gap-1 min-w-0">
                        <code className="truncate font-mono">
                          {shortenAddress(view.campaign.intelligentContractAddress)}
                        </code>
                        <button
                          onClick={() => handleCopyAddress(view.campaign.intelligentContractAddress)}
                          className="text-muted-foreground hover:text-orange-600 transition-colors shrink-0"
                        >
                          {copiedAddr === view.campaign.intelligentContractAddress ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* End Date */}
                    {view.campaign.endDate && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span>Ends {formatDate(view.campaign.endDate)}</span>
                      </div>
                    )}

                    {/* Start Date */}
                    {view.campaign.startDate && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>Starts {formatDate(view.campaign.startDate)}</span>
                      </div>
                    )}

                    {/* Content Type */}
                    {view.campaign.contentType && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Type className="h-3 w-3 shrink-0" />
                        <span className="capitalize">{view.campaign.contentType}</span>
                      </div>
                    )}

                    {/* Character Limit */}
                    {view.campaign.characterLimit && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <FileText className="h-3 w-3 shrink-0" />
                        <span>Max {view.campaign.characterLimit} chars</span>
                      </div>
                    )}

                    {/* Category */}
                    {view.campaign.category && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Tag className="h-3 w-3 shrink-0" />
                        <span className="capitalize">{view.campaign.category}</span>
                      </div>
                    )}

                    {/* Rewards */}
                    {Array.isArray(view.campaign.campaignRewards) && view.campaign.campaignRewards.length > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                        <Gift className="h-3 w-3 shrink-0" />
                        <span>
                          {(view.campaign.campaignRewards as RewardInfo[]).map((r) =>
                            `${r.totalAmount} ${r.tokenSymbol}`
                          ).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Rally.fun Link */}
                    {view.campaign.campaignUrl && (
                      <div className="flex items-center gap-1.5">
                        <Link2 className="h-3 w-3 shrink-0 text-orange-500" />
                        <a
                          href={view.campaign.campaignUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-0.5"
                        >
                          Rally.fun <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Admin Notice (if present) */}
            {view.campaign.adminNotice && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap">{String(view.campaign.adminNotice)}</span>
              </div>
            )}

            {/* ═══ Missions Section ═══ */}
            {Array.isArray(view.campaign.missions) && view.campaign.missions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-orange-500" />
                      <CardTitle className="text-sm">
                        Available Missions ({view.campaign.missions.length})
                      </CardTitle>
                    </div>
                    {view.campaign.missionNumber && (
                      <Badge variant="outline" className="text-[10px] border-orange-200 bg-orange-50 text-orange-700">
                        Mission {view.campaign.missionNumber} selected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {view.campaign.missions.map((mission, idx) => {
                      const missionNum = idx + 1;
                      const isActive = mission.active !== false;
                      const isSelected = view.campaign.missionNumber === missionNum;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (!isSelected) {
                              handleSwitchMission(missionNum, view.campaign);
                            }
                          }}
                          disabled={isSelected || view.type === 'generating'}
                          className={`text-left rounded-lg border p-3 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200'
                              : isActive
                                ? 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/50'
                                : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold truncate">
                              M{missionNum}: {mission.title || 'Untitled'}
                            </span>
                            <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-orange-200 text-orange-800'
                                : isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-200 text-gray-500'
                            }`}>
                              {isSelected ? 'Active' : isActive ? 'Available' : 'Inactive'}
                            </span>
                          </div>
                          {(mission.goal || mission.description) && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {mission.goal || mission.description}
                            </p>
                          )}
                          {mission.characterLimit && (
                            <span className="text-[10px] text-gray-400 mt-1 inline-block">
                              Max {mission.characterLimit} chars
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ═══ Campaign Detail Sections — Accordion ═══ */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-orange-500" />
                  <CardTitle className="text-sm">Campaign Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Accordion type="multiple" defaultValue={['description', 'rules', 'style']} className="w-full">
                  {/* Description */}
                  <AccordionItem value="description">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-orange-500" />
                        <span>Description</span>
                        {view.campaign.missionTitle && (
                          <Badge variant="secondary" className="text-[10px] ml-1">Mission: {view.campaign.missionTitle}</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="max-h-96">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {view.campaign.description || view.campaign.goal || 'No description available.'}
                        </p>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Rules */}
                  <AccordionItem value="rules">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-blue-500" />
                        <span>Rules</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {view.campaign.rules ? (
                        <ScrollArea className="max-h-96">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {view.campaign.rules}
                          </p>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No rules specified.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Style Guide */}
                  <AccordionItem value="style">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-purple-500" />
                        <span>Style / Tone Guide</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {view.campaign.style ? (
                        <ScrollArea className="max-h-96">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {view.campaign.style}
                          </p>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No style guide specified.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Requirements */}
                  <AccordionItem value="requirements">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <ScrollText className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Requirements</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {view.campaign.requirements ? (
                        <ScrollArea className="max-h-96">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {view.campaign.requirements}
                          </p>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No explicit requirements specified.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Knowledge Base */}
                  <AccordionItem value="knowledge">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Knowledge Base</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {view.campaign.knowledgeBase ? (
                        <ScrollArea className="max-h-96">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {view.campaign.knowledgeBase}
                          </p>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No knowledge base provided.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Additional Info */}
                  <AccordionItem value="additional">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 text-cyan-500" />
                        <span>Additional Info / Admin Notice</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {view.campaign.additionalInfo ? (
                        <ScrollArea className="max-h-96">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {view.campaign.additionalInfo}
                          </p>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No additional info.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Prohibited Items */}
                  <AccordionItem value="prohibited">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Ban className="h-3.5 w-3.5 text-red-500" />
                        <span>Prohibited Items</span>
                        {view.campaign.prohibitedItems && (
                          <Badge variant="destructive" className="text-[10px] ml-1">!</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {view.campaign.prohibitedItems ? (
                        <ScrollArea className="max-h-96">
                          <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-red-900">
                              {view.campaign.prohibitedItems}
                            </p>
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No prohibited items specified.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Campaign Goal (if different from description) */}
                  {view.campaign.goal && view.campaign.goal !== view.campaign.description && (
                    <AccordionItem value="goal">
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Target className="h-3.5 w-3.5 text-amber-500" />
                          <span>Campaign Goal (Original)</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ScrollArea className="max-h-96">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {view.campaign.goal}
                          </p>
                        </ScrollArea>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Content Constraints */}
                  {(view.campaign.contentType || view.campaign.characterLimit) && (
                    <AccordionItem value="constraints">
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                          <span>Content Constraints</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {view.campaign.contentType && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">Content Type:</span>
                              <Badge variant="outline" className="capitalize text-xs">
                                {view.campaign.contentType}
                              </Badge>
                            </div>
                          )}
                          {view.campaign.characterLimit && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">Char Limit:</span>
                              <Badge variant="outline" className="text-xs">
                                {view.campaign.characterLimit} characters
                              </Badge>
                            </div>
                          )}
                          {view.campaign.campaignUrl && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">Campaign URL:</span>
                              <code className="text-xs text-orange-600 break-all">
                                {view.campaign.campaignUrl}
                              </code>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>

            {/* ═══ Mission Detail (if different from campaign-level data) ═══ */}
            {view.campaign.missionTitle && Array.isArray(view.campaign.missions) && view.campaign.missions.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-500" />
                    <CardTitle className="text-sm">
                      Mission {view.campaign.missionNumber} Details: {view.campaign.missionTitle}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Showing data merged from this mission (overrides campaign-level data).
                  </p>
                  {view.campaign.missionGoal && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-muted-foreground">Mission Goal:</span>
                      <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{view.campaign.missionGoal}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Style: </span>
                      <span>{view.campaign.style || 'Default'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Char Limit: </span>
                      <span>{view.campaign.characterLimit || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Content Type: </span>
                      <span className="capitalize">{view.campaign.contentType || 'Default'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* ═══ Generate Button ═══ */}
            {view.type === 'detail' && (
              <Card className="border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50/60 to-white">
                <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-200">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Ready to Generate</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      All campaign information above will be used to generate optimized content.
                      {view.campaign.missionTitle && ` Currently targeting Mission ${view.campaign.missionNumber}: "${view.campaign.missionTitle}".`}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleGenerate(view.campaign)}
                    size="lg"
                    className="px-10 gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-orange-200 transition-all"
                  >
                    <Send className="h-4 w-4" />
                    Generate Content
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ═══════════════════════════════════════════════════════════
                STATE 4: GENERATING
            ═══════════════════════════════════════════════════════════ */}
            {(view.type === 'generating') && (
              <>
                {/* Progress Indicator */}
                <Card className="border-2 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                        <span className="text-sm font-semibold text-orange-800">
                          Pipeline Running...
                        </span>
                      </div>
                      <span className="text-xs text-orange-600 font-medium">
                        Stage {Math.max(pipelineStageIndex + 1, 1)}/{PIPELINE_STAGES.length}
                      </span>
                    </div>
                    <Progress
                      value={
                        pipelineStageIndex >= 0
                          ? ((pipelineStageIndex + 1) / PIPELINE_STAGES.length) * 100
                          : 5
                      }
                      className="h-2.5 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-orange-400 [&>[data-slot=progress-indicator]]:to-red-500"
                    />
                    {pipelineStageIndex >= 0 && pipelineStageIndex < PIPELINE_STAGES.length && (
                      <p className="mt-2 text-xs text-orange-700 truncate">
                        {PIPELINE_STAGES[pipelineStageIndex].label}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Live Log Panel */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-gray-600" />
                        <CardTitle className="text-sm">Pipeline Log</CardTitle>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {logs.length} entries
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-64 overflow-y-auto bg-gray-900 rounded-b-lg font-mono text-xs">
                      <div className="divide-y divide-gray-800/50">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-start gap-2 px-4 py-1.5 hover:bg-gray-800/30 transition-colors"
                          >
                            <span className="text-gray-500 shrink-0 select-none w-16">
                              {log.timestamp}
                            </span>
                            <div className="shrink-0 mt-0.5">{getLogIcon(log.type)}</div>
                            <span className={getLogColor(log.type)}>{log.message}</span>
                          </div>
                        ))}
                        <div ref={logEndRef} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════
                STATE 5: RESULT VIEW
            ═══════════════════════════════════════════════════════════ */}
            {view.type === 'result' && (
              <>
                {/* ═══ Score Header — Big Grade + Key Metrics ═══ */}
                <Card className={`border-2 ${
                  view.score.passesThreshold
                    ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white'
                    : 'border-red-200 bg-gradient-to-br from-red-50/40 to-white'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          view.score.passesThreshold ? 'bg-emerald-100' : 'bg-red-100'
                        }`}>
                          {view.score.passesThreshold ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Ban className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            Generation Complete
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {view.score.passesThreshold
                              ? 'Quality threshold passed — ready for submission'
                              : 'Below minimum quality threshold — consider regenerating'}
                          </CardDescription>
                        </div>
                      </div>
                      {/* Key Metrics Row */}
                      <div className="flex items-center gap-3">
                        {/* Big Grade */}
                        <div className="text-center">
                          <div className={`text-3xl font-black ${getGradeColor(view.score.overallGrade)}`}>
                            {view.score.overallGrade}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Grade</div>
                        </div>
                        <Separator orientation="vertical" className="h-12" />
                        {/* Content Quality Score */}
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600">
                            {view.score.contentQualityScore.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">/ 21.0</div>
                        </div>
                        <Separator orientation="vertical" className="h-12" />
                        {/* Quality % */}
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            view.score.contentQualityPct >= 76 ? 'text-emerald-600' : view.score.contentQualityPct >= 48 ? 'text-blue-600' : 'text-amber-600'
                          }`}>
                            {view.score.contentQualityPct.toFixed(1)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">Quality</div>
                        </div>
                        <Separator orientation="vertical" className="h-12" />
                        {/* Estimated Position */}
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            view.score.estimatedPosition === 'Top 10%' ? 'text-emerald-600' :
                            view.score.estimatedPosition === 'Top 25%' ? 'text-blue-600' :
                            view.score.estimatedPosition === 'Top 50%' ? 'text-gray-700' :
                            'text-amber-600'
                          }`}>
                            {view.score.estimatedPosition}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Position</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {/* Overall Quality Bar */}
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Content Quality</span>
                        <span className="font-medium text-orange-600">{view.score.contentQualityScore.toFixed(2)} / 21.0</span>
                      </div>
                      <Progress
                        value={view.score.contentQualityPct}
                        className="h-2.5 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-orange-400 [&>[data-slot=progress-indicator]]:to-red-500"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>0</span>
                        <span>5.25 (25%)</span>
                        <span>10.5 (50%)</span>
                        <span>15.75 (75%)</span>
                        <span className="text-emerald-500 font-medium">21.0 (100%)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ═══ 7 Content Categories Breakdown ═══ */}
                {view.score.categories && view.score.categories.length > 0 && (
                  <Card className="border-2 border-orange-200/60 bg-gradient-to-br from-white via-orange-50/20 to-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-orange-500" />
                          <CardTitle className="text-sm">Rally Content Categories</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-orange-200 text-orange-700">
                          7 of 7 Rally scoring categories
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {view.score.categories.map((cat, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                                {cat.maxScore <= 2 && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-200 text-blue-600">Binary Gate</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${
                                  cat.percentage >= 75 ? 'text-emerald-600' :
                                  cat.percentage >= 50 ? 'text-blue-600' :
                                  cat.percentage > 0 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  {cat.score.toFixed(1)} / {cat.maxScore}
                                </span>
                                <span className="text-[10px] text-muted-foreground w-10 text-right">
                                  {cat.percentage.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  cat.percentage >= 75 ? 'bg-emerald-500' :
                                  cat.percentage >= 50 ? 'bg-blue-400' :
                                  cat.percentage > 0 ? 'bg-amber-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                              />
                            </div>
                          </div>
                        ))}

                        {/* Category Analysis from Judges */}
                        {view.score.categoryAnalysis && Object.keys(view.score.categoryAnalysis).length > 0 && (
                          <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <div className="text-[11px] font-medium text-blue-700 mb-2 flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Judge Feedback by Category
                            </div>
                            <div className="space-y-1.5">
                              {Object.entries(view.score.categoryAnalysis).map(([category, analysis]) => (
                                <div key={category}>
                                  <span className="text-[10px] font-semibold text-gray-700">{category}:</span>
                                  <p className="text-[11px] text-gray-600 ml-1">{analysis}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ═══ G4 Originality Detection ═══ */}
                {view.score.g4Detection && (
                  <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50/40 to-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-cyan-500" />
                          <CardTitle className="text-sm">G4 Originality Detection</CardTitle>
                        </div>
                        <Badge className={
                          view.score.g4Detection.score > 2
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : view.score.g4Detection.score > 0
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                              : 'bg-red-100 text-red-700 hover:bg-red-100'
                        }>
                          Score: {view.score.g4Detection.score > 0 ? '+' : ''}{view.score.g4Detection.score.toFixed(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Bonuses */}
                        <div className="p-2 bg-emerald-50/50 rounded-lg">
                          <div className="text-[10px] font-medium text-emerald-700 mb-1">✅ Human Signals Detected</div>
                          <div className="space-y-0.5">
                            {view.score.g4Detection.bonuses.length > 0 ? (
                              view.score.g4Detection.bonuses.map((b) => (
                                <div key={b} className="text-[10px] text-emerald-600">• {b}</div>
                              ))
                            ) : (
                              <div className="text-[10px] text-gray-400 italic">None detected</div>
                            )}
                          </div>
                        </div>
                        {/* Penalties */}
                        <div className="p-2 bg-red-50/50 rounded-lg">
                          <div className="text-[10px] font-medium text-red-700 mb-1">⚠️ AI Red Flags</div>
                          <div className="space-y-0.5">
                            {view.score.g4Detection.penalties.length > 0 ? (
                              view.score.g4Detection.penalties.map((p) => (
                                <div key={p} className="text-[10px] text-red-600">• {p}</div>
                              ))
                            ) : (
                              <div className="text-[10px] text-gray-400 italic">Clean — no AI flags</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ═══ X-Factor Viral Detection ═══ */}
                {view.score.xFactors && view.score.xFactors.factors.length > 0 && (
                  <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/40 to-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          <CardTitle className="text-sm">X-Factor Viral Indicators</CardTitle>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                          {view.score.xFactors.factors.length} factor{view.score.xFactors.factors.length !== 1 ? 's' : ''} detected
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {view.score.xFactors.factors.map((factor) => (
                          <Badge key={factor} variant="outline" className="text-[10px] font-normal px-2 py-0.5 border-purple-200 text-purple-700">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Generated Content */}
                <Card className="border-2 border-emerald-200/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-emerald-500" />
                        <CardTitle className="text-sm">Generated Content</CardTitle>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(view.content)}
                        className="gap-1.5 text-xs h-7"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-gray-50 border p-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {view.content}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border bg-white p-3 text-center">
                    <div className="text-lg font-bold text-gray-800">{view.score.cycles}</div>
                    <div className="text-[10px] text-muted-foreground">Cycles</div>
                  </div>
                  <div className="rounded-lg border bg-white p-3 text-center">
                    <div className="text-lg font-bold text-gray-800">{view.score.variations}</div>
                    <div className="text-[10px] text-muted-foreground">Variations</div>
                  </div>
                  <div className="rounded-lg border bg-white p-3 text-center">
                    <div className="text-lg font-bold text-gray-800">{view.score.aiCalls}</div>
                    <div className="text-[10px] text-muted-foreground">AI Calls</div>
                  </div>
                  <div className="rounded-lg border bg-white p-3 text-center">
                    <div className="text-lg font-bold text-gray-800">{(view.score.time / 1000).toFixed(1)}s</div>
                    <div className="text-[10px] text-muted-foreground">Time</div>
                  </div>
                </div>

                {/* ═══ Competitive Beat Score ═══ */}
                {view.score.competitorBeatScore !== undefined && (
                  <Card className={`border-2 ${
                    view.score.competitorBeatScore > 0
                      ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white'
                      : 'border-amber-200 bg-gradient-to-br from-amber-50/40 to-white'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Swords className="h-4 w-4 text-orange-500" />
                          <CardTitle className="text-sm">Competitor Beat Analysis</CardTitle>
                        </div>
                        <Badge className={
                          view.score.competitorBeatScore > 50
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : view.score.competitorBeatScore > 0
                              ? 'bg-green-100 text-green-700 hover:bg-green-100'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                        }>
                          {view.score.competitorBeatScore > 0 ? '+' : ''}
                          {view.score.competitorBeatScore}% vs competitors
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {/* Our Score */}
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground mb-1">Our Score</div>
                          <div className="text-xl font-bold text-orange-600">
                            {view.score.contentQualityScore.toFixed(2)}
                          </div>
                        </div>
                        {/* Competitor Avg */}
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground mb-1">Competitor Avg</div>
                          <div className="text-xl font-bold text-gray-500">
                            {view.score.competitorAvgScore?.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                        {/* Target Score */}
                        <div className="text-center">
                          <div className="text-[10px] text-muted-foreground mb-1">Target Score</div>
                          <div className="text-xl font-bold text-emerald-600">
                            {view.score.targetScore?.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                      </div>
                      {/* Beat meter */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Beat Score</span>
                          <span className={`font-medium ${
                            view.score.competitorBeatScore > 0 ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {view.score.competitorBeatScore > 0 ? '🟢 Above average' : '🟡 Below average'}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              view.score.competitorBeatScore > 50
                                ? 'bg-emerald-500'
                                : view.score.competitorBeatScore > 0
                                  ? 'bg-green-400'
                                  : 'bg-amber-400'
                            }`}
                            style={{ width: `${Math.max(Math.min(50 + view.score.competitorBeatScore, 100), 5)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>-50%</span>
                          <span className="text-orange-500 font-medium">Competitor Average</span>
                          <span>+100%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ═══ Ground Truth Calibration ═══ */}
                {view.score.groundTruth && view.score.groundTruth.totalValid > 0 && (
                  <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50/40 to-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-violet-500" />
                          <CardTitle className="text-sm">Ground Truth Calibration</CardTitle>
                        </div>
                        <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                          {view.score.groundTruth.totalValid} real submissions
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Calibration Thresholds */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {view.score.groundTruth.top10Pct !== undefined && (
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">Top 10% Bar</div>
                            <div className="text-lg font-bold text-violet-600">{view.score.groundTruth.top10Pct}%</div>
                          </div>
                        )}
                        {view.score.groundTruth.top25Pct !== undefined && (
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">Top 25% Bar</div>
                            <div className="text-lg font-bold text-violet-600">{view.score.groundTruth.top25Pct}%</div>
                          </div>
                        )}
                        {view.score.groundTruth.top50Pct !== undefined && (
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">Top 50% Bar</div>
                            <div className="text-lg font-bold text-violet-600">{view.score.groundTruth.top50Pct}%</div>
                          </div>
                        )}
                        {view.score.groundTruth.averagePct !== undefined && (
                          <div className="text-center p-2 bg-white/60 rounded-lg">
                            <div className="text-[10px] text-muted-foreground">Average</div>
                            <div className="text-lg font-bold text-violet-600">{view.score.groundTruth.averagePct}%</div>
                          </div>
                        )}
                      </div>

                      {/* Weak & Strong Categories */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 bg-red-50/50 rounded-lg">
                          <div className="text-[10px] font-medium text-red-700 mb-1">⚠️ Weak Categories (opportunity)</div>
                          <div className="space-y-0.5">
                            {view.score.groundTruth.weakCategories.length > 0 ? (
                              view.score.groundTruth.weakCategories.map((cat) => (
                                <div key={cat} className="text-[10px] text-red-600">• {cat}</div>
                              ))
                            ) : (
                              <div className="text-[10px] text-gray-400 italic">No weak categories identified</div>
                            )}
                          </div>
                        </div>
                        <div className="p-2 bg-emerald-50/50 rounded-lg">
                          <div className="text-[10px] font-medium text-emerald-700 mb-1">✅ Strong Categories (baseline)</div>
                          <div className="space-y-0.5">
                            {view.score.groundTruth.strongCategories.length > 0 ? (
                              view.score.groundTruth.strongCategories.map((cat) => (
                                <div key={cat} className="text-[10px] text-emerald-600">• {cat}</div>
                              ))
                            ) : (
                              <div className="text-[10px] text-gray-400 italic">No strong categories identified</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Calibration Note */}
                      <div className="text-[10px] text-muted-foreground italic bg-violet-50/50 p-2 rounded-lg">
                        💡 This data comes from REAL Rally.fun submissions analyzed via the Ground Truth Calibration endpoint.
                        Our scoring is calibrated against Rally's actual 7 content categories (max 21.0 points).
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => {
                      setLogs([]);
                      setPipelineStageIndex(-1);
                      logIdRef.current = 0;
                      handleGenerate(view.campaign);
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Generate Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setView({ type: 'detail', campaign: view.campaign })}
                  >
                    Back to Campaign
                  </Button>
                </div>

                {/* Collapsible Pipeline Log */}
                <Card>
                  <CollapsibleLog logs={logs} />
                </Card>
              </>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            STATUS FOOTER (always visible)
        ═══════════════════════════════════════════════════════════ */}
        <Separator />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-[11px] font-medium text-muted-foreground">Token Pool</span>
            </div>
            {statusLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {statusData?.tokenPool?.active || 0}/{statusData?.tokenPool?.total || 0}
                </span>
                <Progress
                  value={statusData?.tokenPool?.total ? ((statusData?.tokenPool?.active || 0) / statusData?.tokenPool.total) * 100 : 0}
                  className="h-1.5 flex-1 max-w-16"
                />
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Server className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-[11px] font-medium text-muted-foreground">Gateways</span>
            </div>
            {statusLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {(statusData?.gateways?.health?.filter(g => g.status === 'connected') || []).length}/{statusData?.gateways?.all?.length || 0}
                </span>
                <Badge variant="outline" className={`text-[10px] ${
                  (statusData?.gateways?.health?.filter(g => g.status === 'connected') || []).length === (statusData?.gateways?.all?.length || 0)
                    ? 'border-emerald-200 text-emerald-700'
                    : 'border-amber-200 text-amber-700'
                }`}>
                  All Up
                </Badge>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-[11px] font-medium text-muted-foreground">Rate Limit</span>
            </div>
            {statusLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {statusData?.rateLimits?.activeBuckets || 0}/{statusData?.rateLimits?.totalBuckets || 0}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {(statusData?.rateLimits?.capacityPer10min || 0)}/10min
                </Badge>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-[11px] font-medium text-muted-foreground">Completed</span>
            </div>
            {statusLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="text-lg font-bold">
                {statusData?.queue?.totalResults || 0}
              </span>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

// ─── Collapsible Log Component ────────────────────────────────────

function CollapsibleLog({ logs }: { logs: LogEntry[] }) {
  const [open, setOpen] = useState(false);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      case 'system': return 'text-violet-400 font-medium';
      default: return 'text-gray-400';
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
      case 'error': return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
      case 'system': return <Zap className="h-3.5 w-3.5 text-violet-500 shrink-0" />;
      default: return <ChevronRight className="h-3.5 w-3.5 text-gray-500 shrink-0" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5" />
          <span>Pipeline Log ({logs.length} entries)</span>
        </div>
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border-t">
          <div className="max-h-48 overflow-y-auto bg-gray-900 rounded-b-lg font-mono text-xs">
            <div className="divide-y divide-gray-800/50">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 px-4 py-1.5 hover:bg-gray-800/30 transition-colors"
                >
                  <span className="text-gray-500 shrink-0 select-none w-16">
                    {log.timestamp}
                  </span>
                  <div className="shrink-0 mt-0.5">{getLogIcon(log.type)}</div>
                  <span className={getLogColor(log.type)}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
