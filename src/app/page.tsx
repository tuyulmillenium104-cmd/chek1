'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Zap,
  Search,
  BookOpen,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Play,
  Square,
  MessageSquare,
  Trophy,
  Target,
  Brain,
  Eye,
  Sparkles,
  BarChart3,
  ArrowRight,
  CircleDot,
  StopCircle,
  FileText,
  Terminal,
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
  [key: string]: unknown;
}

interface CampaignCard {
  title: string;
  description: string;
  address: string;
  url: string;
  status: string;
  endDate: string | null;
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
  missionTitle: string | null;
  missionGoal: string | null;
  missionNumber: number | null;
  contentType: string;
  characterLimit: number | null;
  category: string;
  campaignRewards: unknown[];
  [key: string]: unknown;
}

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'system';
}

interface ResultItem {
  id: string;
  source: 'pipeline' | 'historical' | 'memory';
  campaignName: string;
  content: string | null;
  score: number | null;
  grade: string | null;
  categories: Array<{ name: string; score: number; maxScore: number; percentage: number }>;
  qaPairs: Array<{ q: string; a: string }>;
  g4Reasons: string[];
  timestamp: string;
  metadata: Record<string, unknown>;
}

interface LearningResult {
  totalSubmissions: number;
  validSubmissions: number;
  patterns: Array<{ category: string; winnerAvg: number; loserAvg: number; gap: number; insight: string }>;
  rules: string[];
  weakCategories: string[];
  strongCategories: string[];
  topScorers: Array<{ rank: number; xUsername: string; contentQualityPct: number; contentQualityScore: number; tweetUrl: string }>;
  recommendations: string[];
}

type AppStatus = 'idle' | 'learning' | 'generating' | 'done';

// ─── Main Component ────────────────────────────────────────────────

export default function RallyDashboard() {
  // ─── State ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<CampaignCard[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);
  const [selectedMissionNum, setSelectedMissionNum] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [appStatus, setAppStatus] = useState<AppStatus>('idle');
  const [activeStep, setActiveStep] = useState(0); // 0=Search, 1=Learn, 2=Generate, 3=Output
  const [learnJobId, setLearnJobId] = useState<string | null>(null);
  const [generateJobId, setGenerateJobId] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [shouldStop, setShouldStop] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const pollAbortRef = useRef(false);

  const [results, setResults] = useState<ResultItem[]>([]);
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [learningResult, setLearningResult] = useState<LearningResult | null>(null);

  const [copied, setCopied] = useState(false);

  // ─── Load initial results ──────────────────────────────────────

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const res = await fetch('/api/rally/results');
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        if (data.results.length > 0 && !selectedResult) {
          setSelectedResult(data.results[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setResultsLoading(false);
    }
  }, [selectedResult]);

  // ─── Auto-scroll logs ──────────────────────────────────────────

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ─── Logging ───────────────────────────────────────────────────

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const id = ++logIdRef.current;
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    setLogs(prev => [...prev, { id, timestamp, message, type }]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    logIdRef.current = 0;
  }, []);

  // ─── Search ────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query || searchLoading) return;
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/rally/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results || []);
        addLog(`Found ${data.results.length} campaign(s) for "${query}"`, 'info');
      } else {
        addLog(`Search error: ${data.error}`, 'error');
      }
    } catch {
      addLog('Network error during search', 'error');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, searchLoading, addLog]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  // ─── Select Campaign ───────────────────────────────────────────

  const handleSelectCampaign = useCallback(async (card: CampaignCard) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/rally/campaign/${card.address}`);
      const data = await res.json();
      if (data.success && data.campaign) {
        setSelectedCampaign(data.campaign as CampaignDetail);
        setSelectedMissionNum(data.campaign.missionNumber);
        setActiveStep(1);
        addLog(`Selected campaign: "${data.campaign.title}" (Mission ${data.campaign.missionNumber || 1})`, 'success');
      }
    } catch (err) {
      addLog('Error fetching campaign details', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [addLog]);

  const handleSwitchMission = useCallback(async (missionNum: number) => {
    if (!selectedCampaign) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/rally/campaign/${selectedCampaign.intelligentContractAddress}?mission=${missionNum}`);
      const data = await res.json();
      if (data.success && data.campaign) {
        setSelectedCampaign(data.campaign as CampaignDetail);
        setSelectedMissionNum(missionNum);
        addLog(`Switched to Mission ${missionNum}: ${data.campaign.missionTitle || 'Untitled'}`, 'info');
      }
    } catch {
      addLog('Error switching mission', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [selectedCampaign, addLog]);

  // ─── Start Learn ───────────────────────────────────────────────

  const handleStartLearn = useCallback(async () => {
    if (!selectedCampaign || appStatus === 'learning' || appStatus === 'generating') return;

    clearLogs();
    setAppStatus('learning');
    setShouldStop(false);
    pollAbortRef.current = false;
    setActiveStep(1);
    setLearningResult(null);

    addLog('Starting learning pipeline...', 'system');

    try {
      const res = await fetch('/api/rally/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignAddress: selectedCampaign.intelligentContractAddress,
          campaignName: selectedCampaign.title,
        }),
      });
      const data = await res.json();

      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Failed to start learning');
      }

      const jobId = data.jobId;
      setLearnJobId(jobId);
      setCurrentJobId(jobId);
      addLog('Learning job started, polling...', 'info');

      let lastProgressIdx = -1;
      let polls = 0;

      while (polls < 150 && !pollAbortRef.current) {
        await new Promise(r => setTimeout(r, 2000));
        polls++;

        try {
          const statusRes = await fetch(`/api/rally/learn?jobId=${jobId}`);
          const statusData = await statusRes.json();

          if (statusData.progress) {
            for (let i = lastProgressIdx + 1; i < statusData.progress.length; i++) {
              addLog(statusData.progress[i].message, statusData.progress[i].type || 'info');
            }
            lastProgressIdx = statusData.progress.length - 1;
          }

          if (statusData.status === 'completed' || statusData.status === 'failed') {
            if (statusData.result) {
              setLearningResult(statusData.result);
              addLog(`Learning complete! ${statusData.result.validSubmissions} valid submissions analyzed.`, 'success');
              setActiveStep(2);
              setAppStatus('idle');
            }
            if (statusData.error) {
              addLog(`Learning failed: ${statusData.error}`, 'error');
              setAppStatus('idle');
            }
            break;
          }
        } catch {
          // Poll error, continue
        }
      }

      if (pollAbortRef.current) {
        addLog('Learning stopped by user.', 'warning');
        setAppStatus('idle');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Learning error: ${msg}`, 'error');
      setAppStatus('idle');
    }
  }, [selectedCampaign, appStatus, addLog, clearLogs]);

  // ─── Start Generate ────────────────────────────────────────────

  const handleStartGenerate = useCallback(async () => {
    if (!selectedCampaign || appStatus === 'learning' || appStatus === 'generating') return;

    clearLogs();
    setAppStatus('generating');
    setShouldStop(false);
    pollAbortRef.current = false;
    setActiveStep(2);

    addLog('Starting generation pipeline...', 'system');

    try {
      const res = await fetch('/api/rally/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: selectedCampaign.title,
          campaignAddress: selectedCampaign.intelligentContractAddress,
          campaignData: selectedCampaign,
        }),
      });
      const data = await res.json();

      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Failed to start generation');
      }

      const jobId = data.jobId;
      setGenerateJobId(jobId);
      setCurrentJobId(jobId);
      addLog('Generation pipeline started, polling...', 'info');

      let lastProgressIdx = -1;
      let polls = 0;

      while (polls < 300 && !pollAbortRef.current) {
        await new Promise(r => setTimeout(r, 2000));
        polls++;

        try {
          const statusRes = await fetch(`/api/rally/generate/status?jobId=${jobId}`);
          const statusData = await statusRes.json();

          if (statusData.progress) {
            for (let i = lastProgressIdx + 1; i < statusData.progress.length; i++) {
              addLog(statusData.progress[i].message, statusData.progress[i].type || 'info');
            }
            lastProgressIdx = statusData.progress.length - 1;
          }

          if (statusData.status === 'completed' || statusData.status === 'failed') {
            if (statusData.result?.bestContent) {
              const result = statusData.result;
              addLog(
                `Generation complete! Grade ${result.bestScoring?.overallGrade || '?'} — Score ${result.bestScoring?.contentQualityScore?.toFixed(2) || 0}/21.0`,
                'success'
              );
              setActiveStep(3);
              setAppStatus('done');

              // Refresh results
              const resultsRes = await fetch('/api/rally/results');
              const resultsData = await resultsRes.json();
              if (resultsData.success && resultsData.results?.length > 0) {
                setResults(resultsData.results);
                setSelectedResult(resultsData.results[0]);
              }
            } else {
              addLog('Generation failed: no content produced', 'error');
              setAppStatus('idle');
            }
            break;
          }
        } catch {
          // Poll error, continue
        }
      }

      if (pollAbortRef.current) {
        addLog('Generation stopped by user.', 'warning');
        setAppStatus('idle');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Generation error: ${msg}`, 'error');
      setAppStatus('idle');
    }
  }, [selectedCampaign, appStatus, addLog, clearLogs]);

  // ─── Stop ──────────────────────────────────────────────────────

  const handleStop = useCallback(() => {
    pollAbortRef.current = true;
    setShouldStop(true);
    addLog('Stop requested...', 'warning');
  }, [addLog]);

  // ─── Copy ──────────────────────────────────────────────────────

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-amber-500';
      case 'system': return 'text-violet-500';
      default: return 'text-gray-500';
    }
  };

  const getLogDot = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'system': return 'bg-violet-500';
      default: return 'bg-gray-400';
    }
  };

  const getGradeColor = (grade: string) => {
    if (!grade) return 'bg-gray-100 text-gray-600';
    if (grade.startsWith('S')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getStepStatus = (step: number) => {
    if (activeStep > step) return 'completed';
    if (activeStep === step) return 'active';
    return 'idle';
  };

  const isRunning = appStatus === 'learning' || appStatus === 'generating';

  // ─── Mission tabs data ─────────────────────────────────────────

  const missions = selectedCampaign?.missions || [];
  const missionTabs = missions.length > 0
    ? missions.map((m, i) => ({
        num: i + 1,
        title: m.title || `Mission ${i + 1}`,
        active: m.active !== false,
      }))
    : [];

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ═══════ Header ═══════ */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Rally Brain <span className="text-xs font-normal text-muted-foreground ml-1.5">v7</span>
                </h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  Learn → Generate → Output
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`gap-1.5 text-xs ${
                appStatus === 'idle' || appStatus === 'done' ? 'border-emerald-300 text-emerald-700' :
                appStatus === 'learning' ? 'border-amber-300 text-amber-700' :
                'border-orange-300 text-orange-700'
              }`}>
                <CircleDot className={`h-2.5 w-2.5 ${
                  isRunning ? 'animate-pulse' : ''
                }`} />
                {appStatus === 'idle' ? 'Idle' :
                 appStatus === 'learning' ? 'Learning...' :
                 appStatus === 'generating' ? 'Generating...' : 'Done'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ Architecture Flow ═══════ */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {[
              { label: 'Search', icon: Search, step: 0 },
              { label: 'Learn', icon: BookOpen, step: 1 },
              { label: 'Generate', icon: Zap, step: 2 },
              { label: 'Output', icon: Eye, step: 3 },
            ].map((s, i) => {
              const status = getStepStatus(s.step);
              const Icon = s.icon;
              return (
                <React.Fragment key={s.step}>
                  <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    status === 'active'
                      ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-300'
                      : status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                    {status === 'completed' && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                    {status === 'active' && isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                  {i < 3 && (
                    <ArrowRight className={`h-3.5 w-3.5 ${
                      status === 'completed' ? 'text-emerald-500' : 'text-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════ Main Content ═══════ */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ── LEFT PANEL: Campaign Selector ── */}
          <div className="lg:col-span-4 space-y-3">
            {/* Search */}
            <Card className="border-gray-200">
              <CardContent className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search campaigns..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={searchLoading}
                    className="h-10 pl-9 pr-10 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={searchLoading || !searchQuery.trim()}
                    size="sm"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2.5 bg-orange-500 hover:bg-orange-600"
                  >
                    {searchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Campaign List */}
            <Card className="border-gray-200">
              <CardHeader className="px-4 py-2.5 border-b bg-gray-50/50">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" />
                  Campaigns
                  {searchResults.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{searchResults.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-80">
                  {!hasSearched ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Search for a campaign to get started
                    </div>
                  ) : searchLoading ? (
                    <div className="p-6 flex justify-center">
                      <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No campaigns found
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {searchResults.map(card => (
                        <button
                          key={card.address}
                          onClick={() => handleSelectCampaign(card)}
                          disabled={detailLoading}
                          className={`w-full text-left p-3 hover:bg-gray-50 transition-colors disabled:opacity-60 ${
                            selectedCampaign?.intelligentContractAddress === card.address ? 'bg-orange-50 border-l-2 border-l-orange-500' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{card.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{card.description}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] shrink-0 ${
                                card.status === 'active' ? 'text-emerald-700 border-emerald-200' : 'text-gray-500'
                              }`}
                            >
                              {card.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            {card.rewards.length > 0 && (
                              <span className="text-[11px] text-amber-700 font-medium">
                                {card.rewards[0].totalAmount.toLocaleString()} {card.rewards[0].tokenSymbol}
                              </span>
                            )}
                            <span className="text-[11px] text-gray-400">{card.missionCount} missions</span>
                            {card.category && (
                              <span className="text-[11px] text-gray-400">{card.category}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Selected Campaign Detail */}
            {selectedCampaign && (
              <Card className="border-orange-200 bg-gradient-to-b from-orange-50/30 to-white">
                <CardHeader className="px-4 py-2.5 border-b bg-orange-50/50">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-orange-500" />
                    Selected Campaign
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{selectedCampaign.title}</h3>
                        {selectedCampaign.missionTitle && (
                          <p className="text-xs text-orange-700 mt-0.5">Mission {selectedMissionNum}: {selectedCampaign.missionTitle}</p>
                        )}
                      </div>

                      {/* Mission Tabs */}
                      {missionTabs.length > 1 && (
                        <div className="flex flex-wrap gap-1">
                          {missionTabs.map(mt => (
                            <button
                              key={mt.num}
                              onClick={() => handleSwitchMission(mt.num)}
                              disabled={isRunning}
                              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                                selectedMissionNum === mt.num
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              } disabled:opacity-50`}
                            >
                              M{mt.num}: {mt.title.length > 20 ? mt.title.substring(0, 20) + '...' : mt.title}
                            </button>
                          ))}
                        </div>
                      )}

                      <Separator />

                      {/* Campaign Info */}
                      <div className="space-y-1.5 text-xs text-gray-600">
                        {selectedCampaign.contentType && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-16 shrink-0">Type</span>
                            <span className="font-medium">{selectedCampaign.contentType}</span>
                          </div>
                        )}
                        {selectedCampaign.characterLimit && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-16 shrink-0">Limit</span>
                            <span className="font-medium">{selectedCampaign.characterLimit} chars</span>
                          </div>
                        )}
                        {selectedCampaign.rules && (
                          <div className="mt-2">
                            <p className="text-gray-400 mb-1">Rules (preview)</p>
                            <p className="text-[11px] text-gray-500 line-clamp-3 bg-gray-50 rounded p-2">
                              {typeof selectedCampaign.rules === 'string'
                                ? selectedCampaign.rules
                                : JSON.stringify(selectedCampaign.rules).substring(0, 300)}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Learning Results */}
            {learningResult && (
              <Card className="border-emerald-200">
                <CardHeader className="px-4 py-2.5 border-b bg-emerald-50/50">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                    Learning Insights
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">
                      {learningResult.validSubmissions} analyzed
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {/* Rules */}
                  {learningResult.rules.length > 0 && (
                    <div className="space-y-1">
                      {learningResult.rules.slice(0, 5).map((rule, i) => (
                        <div key={i} className="text-[11px] text-gray-600 flex gap-1.5">
                          <span className="text-orange-500 shrink-0">•</span>
                          <span>{rule}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Separator />
                  {/* Patterns */}
                  {learningResult.patterns.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-gray-500">Top Differentiators</p>
                      {learningResult.patterns.slice(0, 3).map((p, i) => (
                        <div key={i} className="text-[11px]">
                          <span className="font-medium text-gray-700">{p.category}</span>
                          <span className="text-gray-400 ml-1">(+{p.gap.toFixed(0)}% gap)</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Separator />
                  {/* Weak/Strong */}
                  <div className="flex gap-3">
                    <div>
                      <p className="text-[10px] text-red-500 font-medium">Weak</p>
                      {learningResult.weakCategories.slice(0, 2).map((w, i) => (
                        <p key={i} className="text-[11px] text-gray-600">{w}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-500 font-medium">Strong</p>
                      {learningResult.strongCategories.slice(0, 2).map((s, i) => (
                        <p key={i} className="text-[11px] text-gray-600">{s}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── RIGHT PANEL: Results Viewer ── */}
          <div className="lg:col-span-8 space-y-3">
            <Card className="border-gray-200 min-h-[300px]">
              <CardHeader className="px-4 py-2.5 border-b bg-gray-50/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-orange-500" />
                  Results Viewer
                </CardTitle>
                <div className="flex items-center gap-2">
                  {selectedResult?.grade && (
                    <Badge className={`text-xs font-bold px-2.5 py-0.5 border ${getGradeColor(selectedResult.grade)}`}>
                      {selectedResult.grade}
                      {selectedResult.score !== null && ` ${selectedResult.score.toFixed(1)}`}
                    </Badge>
                  )}
                  {selectedResult?.source && (
                    <Badge variant="outline" className="text-[10px]">
                      {selectedResult.source}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="content" className="w-full">
                  <div className="border-b px-4 pt-1">
                    <TabsList className="bg-transparent h-9 p-0 gap-0">
                      <TabsTrigger
                        value="content"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Content
                      </TabsTrigger>
                      <TabsTrigger
                        value="qa"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        Q&A
                        {selectedResult?.qaPairs && selectedResult.qaPairs.length > 0 && (
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">
                            {selectedResult.qaPairs.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value="history"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3"
                      >
                        <BarChart3 className="h-3.5 w-3.5 mr-1" />
                        History
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Content Tab */}
                  <TabsContent value="content" className="mt-0">
                    <div className="p-4">
                      {!selectedResult && resultsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
                        </div>
                      ) : selectedResult && selectedResult.content ? (
                        <div className="space-y-4">
                          {/* Campaign Name */}
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">{selectedResult.campaignName}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(selectedResult.content!)}
                              className="h-7 text-xs gap-1"
                            >
                              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                              {copied ? 'Copied' : 'Copy'}
                            </Button>
                          </div>

                          {/* Score Breakdown */}
                          {selectedResult.categories.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-500">Score Breakdown</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {selectedResult.categories.map((cat, i) => (
                                  <div key={i} className="bg-gray-50 rounded-lg p-2.5">
                                    <p className="text-[11px] text-gray-500 truncate">{cat.name}</p>
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                      <span className={`text-sm font-bold ${
                                        cat.percentage >= 80 ? 'text-emerald-600' :
                                        cat.percentage >= 50 ? 'text-amber-600' : 'text-red-600'
                                      }`}>
                                        {cat.score}
                                      </span>
                                      <span className="text-[11px] text-gray-400">/{cat.maxScore}</span>
                                    </div>
                                    <Progress value={cat.percentage} className="h-1 mt-1.5" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* G4 Reasons */}
                          {selectedResult.g4Reasons && selectedResult.g4Reasons.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">G4 Originality Bonuses</p>
                              <div className="flex flex-wrap gap-1">
                                {selectedResult.g4Reasons.map((r, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* Content */}
                          <div className="relative">
                            <p className="text-xs font-medium text-gray-500 mb-2">Generated Content</p>
                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-[system-ui]">
                              {selectedResult.content}
                            </div>
                          </div>
                        </div>
                      ) : selectedResult ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                          No content available for this result
                        </div>
                      ) : (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                          <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>Select a campaign and generate content to see results</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Q&A Tab */}
                  <TabsContent value="qa" className="mt-0">
                    <div className="p-4">
                      {selectedResult?.qaPairs && selectedResult.qaPairs.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-gray-500">
                            {selectedResult.qaPairs.length} Q&A pairs generated
                          </p>
                          {selectedResult.qaPairs.map((qa, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                              <div className="flex gap-2">
                                <Badge className="text-[10px] bg-blue-100 text-blue-700 shrink-0 h-5 w-5 flex items-center justify-center p-0">
                                  Q
                                </Badge>
                                <p className="text-sm text-gray-800 font-medium">{qa.q}</p>
                              </div>
                              <div className="flex gap-2">
                                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 shrink-0 h-5 w-5 flex items-center justify-center p-0">
                                  A
                                </Badge>
                                <p className="text-sm text-gray-600">{qa.a}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>No Q&A pairs available. Generate content first.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history" className="mt-0">
                    <div className="p-4">
                      {resultsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
                        </div>
                      ) : results.length > 0 ? (
                        <div className="space-y-2">
                          {results.map((r, i) => (
                            <button
                              key={r.id}
                              onClick={() => setSelectedResult(r)}
                              className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50 ${
                                selectedResult?.id === r.id ? 'bg-orange-50 ring-1 ring-orange-200' : ''
                              }`}
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 shrink-0">
                                <Trophy className={`h-4 w-4 ${
                                  r.grade?.startsWith('S') ? 'text-amber-500' :
                                  r.grade?.startsWith('A') ? 'text-emerald-500' : 'text-gray-400'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{r.campaignName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge className={`text-[10px] px-1.5 py-0 border ${getGradeColor(r.grade || '')}`}>
                                    {r.grade || '?'}
                                  </Badge>
                                  {r.score !== null && (
                                    <span className="text-[11px] text-gray-500">{r.score.toFixed(1)}/21</span>
                                  )}
                                  <Badge variant="outline" className="text-[10px] text-gray-400">
                                    {r.source}
                                  </Badge>
                                </div>
                              </div>
                              {r.timestamp && (
                                <span className="text-[11px] text-gray-400 shrink-0 hidden sm:block">
                                  {new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                          No results yet
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Control Panel ── */}
        <div className="mt-4 space-y-3">
          <Card className="border-gray-200">
            <CardHeader className="px-4 py-2.5 border-b bg-gray-50/50">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-orange-500" />
                Control Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleStartLearn}
                  disabled={!selectedCampaign || isRunning}
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm"
                >
                  {appStatus === 'learning' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BookOpen className="h-4 w-4" />
                  )}
                  Start Learn
                </Button>
                <Button
                  onClick={handleStartGenerate}
                  disabled={!selectedCampaign || isRunning}
                  className="gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm"
                >
                  {appStatus === 'generating' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Start Generate
                </Button>
                {isRunning && (
                  <Button
                    onClick={handleStop}
                    variant="outline"
                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50 text-sm"
                  >
                    <StopCircle className="h-4 w-4" />
                    Stop
                  </Button>
                )}
                {!selectedCampaign && (
                  <span className="text-xs text-muted-foreground">Select a campaign first</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Log Panel ── */}
          <Card className="border-gray-200">
            <CardHeader className="px-4 py-2.5 border-b bg-gray-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-gray-500" />
                Log Output
                {logs.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{logs.length}</Badge>
                )}
              </CardTitle>
              {logs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLogs}
                  className="h-6 text-[11px] text-gray-400 hover:text-gray-600"
                >
                  Clear
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-48 overflow-y-auto font-mono text-xs bg-gray-900 rounded-b-lg">
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No logs yet. Start a pipeline to see progress.</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-0.5">
                    {logs.map(log => (
                      <div key={log.id} className="flex gap-2 items-start">
                        <span className="text-gray-600 shrink-0 w-16">{log.timestamp}</span>
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${getLogDot(log.type)}`} />
                        <span className={`${getLogColor(log.type)} break-all`}>{log.message}</span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* ═══════ Footer ═══════ */}
      <footer className="border-t bg-white mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Rally Brain v7 — AI Content Generation System</span>
            <span>Rally.fun Campaign Dashboard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
