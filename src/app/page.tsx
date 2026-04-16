'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Zap, Search, BookOpen, Copy, Check, CheckCircle2,
  Loader2, MessageSquare, Trophy, Target, Brain,
  Eye, Sparkles, BarChart3, ArrowRight, CircleDot,
  StopCircle, FileText, Terminal,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface RewardInfo { totalAmount: number; tokenSymbol: string }

interface CampaignCard {
  title: string; description: string; address: string; url: string;
  status: string; category: string; contentType: string;
  characterLimit: number | null; rewards: RewardInfo[];
  missionCount: number;
}

interface CampaignDetail {
  title: string; description: string; rules: string; style: string;
  requirements: string; additionalInfo: string; knowledgeBase: string;
  prohibitedItems: string; campaignUrl: string; url: string;
  intelligentContractAddress: string; missions: { title?: string; active?: boolean }[];
  status: string; missionTitle: string | null; missionGoal: string | null;
  missionNumber: number | null; contentType: string;
  characterLimit: number | null; category: string;
  [key: string]: unknown;
}

interface LogEntry {
  id: number; timestamp: string; message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'system';
}

interface ResultItem {
  id: string; source: 'pipeline' | 'historical' | 'memory';
  campaignName: string; content: string | null; score: number | null;
  grade: string | null;
  categories: Array<{ name: string; score: number; maxScore: number; percentage: number }>;
  qaPairs: Array<{ q: string; a: string }>; g4Reasons: string[];
  timestamp: string; metadata: Record<string, unknown>;
}

interface LearningResult {
  totalSubmissions: number; validSubmissions: number;
  patterns: Array<{ category: string; winnerAvg: number; loserAvg: number; gap: number; insight: string }>;
  rules: string[]; weakCategories: string[]; strongCategories: string[];
  topScorers: Array<{ rank: number; xUsername: string; contentQualityPct: number; contentQualityScore: number; tweetUrl: string }>;
  recommendations: string[];
}

type AppStatus = 'idle' | 'learning' | 'generating' | 'done';

// ─── Helpers ────────────────────────────────────────────────────────

const getLogColor = (t: LogEntry['type']) =>
  ({ success: 'text-emerald-400', error: 'text-red-400', warning: 'text-amber-400', system: 'text-violet-400', info: 'text-gray-400' })[t] ?? 'text-gray-400';

const getLogDot = (t: LogEntry['type']) =>
  ({ success: 'bg-emerald-400', error: 'bg-red-400', warning: 'bg-amber-400', system: 'bg-violet-400', info: 'bg-gray-500' })[t] ?? 'bg-gray-500';

const getGradeColor = (g: string) =>
  (!g) ? 'bg-gray-700 text-gray-300' :
  g.startsWith('S') ? 'bg-amber-900/50 text-amber-300 border-amber-700' :
  g.startsWith('A') ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700' :
  'bg-gray-700 text-gray-300 border-gray-600';

const getStepStatus = (active: number, step: number) =>
  active > step ? 'completed' : active === step ? 'active' : 'idle';

// ─── Main Component ────────────────────────────────────────────────

export default function RallyDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<CampaignCard[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [appStatus, setAppStatus] = useState<AppStatus>('idle');
  const [activeStep, setActiveStep] = useState(0);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const pollAbortRef = useRef(false);

  const [results, setResults] = useState<ResultItem[]>([]);
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [learningResult, setLearningResult] = useState<LearningResult | null>(null);
  const [copied, setCopied] = useState(false);

  const isRunning = appStatus === 'learning' || appStatus === 'generating';

  // ─── Load results ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setResultsLoading(true);
      try {
        const res = await fetch('/api/rally/results');
        const data = await res.json();
        if (data.success) {
          setResults(data.results || []);
          if (data.results?.length > 0) setSelectedResult(data.results[0]);
        }
      } catch { /* noop */ }
      finally { setResultsLoading(false); }
    })();
  }, []);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // ─── Logging ───────────────────────────────────────────────────
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { id: ++logIdRef.current, timestamp: ts, message, type }]);
  }, []);

  const clearLogs = useCallback(() => { setLogs([]); logIdRef.current = 0; }, []);

  // ─── Search ────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || searchLoading) return;
    setSearchLoading(true); setHasSearched(true);
    try {
      const res = await fetch(`/api/rally/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) { setSearchResults(data.results || []); addLog(`Found ${data.results.length} campaign(s)`, 'info'); }
      else addLog(`Search error: ${data.error}`, 'error');
    } catch { addLog('Network error during search', 'error'); }
    finally { setSearchLoading(false); }
  }, [searchQuery, searchLoading, addLog]);

  // ─── Select Campaign ───────────────────────────────────────────
  const handleSelectCampaign = useCallback(async (card: CampaignCard) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/rally/campaign/${card.address}`);
      const data = await res.json();
      if (data.success && data.campaign) {
        setSelectedCampaign(data.campaign as CampaignDetail);
        setActiveStep(1);
        addLog(`Selected: "${data.campaign.title}"`, 'success');
      }
    } catch { addLog('Error fetching campaign details', 'error'); }
    finally { setDetailLoading(false); }
  }, [addLog]);

  // ─── Poll helper ───────────────────────────────────────────────
  const pollJob = useCallback(async (url: string, onProgress: (msgs: LogEntry['type'][], messages: string[]) => void, onDone: (result: unknown) => void) => {
    let lastIdx = -1, polls = 0;
    while (polls < 300 && !pollAbortRef.current) {
      await new Promise(r => setTimeout(r, 2000)); polls++;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.progress) {
          const newMsgs: string[] = [], newTypes: LogEntry['type'][] = [];
          for (let i = lastIdx + 1; i < data.progress.length; i++) {
            newMsgs.push(data.progress[i].message); newTypes.push(data.progress[i].type || 'info');
          }
          if (newMsgs.length) onProgress(newTypes, newMsgs);
          lastIdx = data.progress.length - 1;
        }
        if (data.status === 'completed' || data.status === 'failed') {
          onDone(data); break;
        }
      } catch { /* continue polling */ }
    }
    if (pollAbortRef.current) { addLog('Stopped by user.', 'warning'); setAppStatus('idle'); }
  }, [addLog]);

  // ─── Start Learn ───────────────────────────────────────────────
  const handleStartLearn = useCallback(async () => {
    if (!selectedCampaign || isRunning) return;
    clearLogs(); setAppStatus('learning'); pollAbortRef.current = false; setActiveStep(1); setLearningResult(null);
    addLog('Starting learning pipeline...', 'system');
    try {
      const res = await fetch('/api/rally/learn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignAddress: selectedCampaign.intelligentContractAddress, campaignName: selectedCampaign.title }),
      });
      const data = await res.json();
      if (!data.success || !data.jobId) throw new Error(data.error || 'Failed to start learning');
      addLog('Learning job started, polling...', 'info');
      await pollJob(
        `/api/rally/learn?jobId=${data.jobId}`,
        (types, msgs) => msgs.forEach((m, i) => addLog(m, types[i])),
        (result: unknown) => {
          const r = result as { result?: LearningResult; error?: string };
          if (r.result) { setLearningResult(r.result); addLog(`Learning complete! ${r.result.validSubmissions} analyzed.`, 'success'); setActiveStep(2); }
          if (r.error) { addLog(`Learning failed: ${r.error}`, 'error'); }
          setAppStatus('idle');
        }
      );
    } catch (err) { addLog(`Learning error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error'); setAppStatus('idle'); }
  }, [selectedCampaign, isRunning, addLog, clearLogs, pollJob]);

  // ─── Start Generate ────────────────────────────────────────────
  const handleStartGenerate = useCallback(async () => {
    if (!selectedCampaign || isRunning) return;
    clearLogs(); setAppStatus('generating'); pollAbortRef.current = false; setActiveStep(2);
    addLog('Starting generation pipeline...', 'system');
    try {
      const res = await fetch('/api/rally/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignName: selectedCampaign.title, campaignAddress: selectedCampaign.intelligentContractAddress, campaignData: selectedCampaign }),
      });
      const data = await res.json();
      if (!data.success || !data.jobId) throw new Error(data.error || 'Failed to start generation');
      addLog('Generation pipeline started, polling...', 'info');
      await pollJob(
        `/api/rally/generate/status?jobId=${data.jobId}`,
        (types, msgs) => msgs.forEach((m, i) => addLog(m, types[i])),
        async (result: unknown) => {
          const r = result as { result?: { bestContent?: string; bestScoring?: { overallGrade?: string; contentQualityScore?: number } }; error?: string };
          if (r.result?.bestContent) {
            addLog(`Generation complete! Grade ${r.result.bestScoring?.overallGrade || '?'} — Score ${r.result.bestScoring?.contentQualityScore?.toFixed(2) || 0}/21.0`, 'success');
            setActiveStep(3); setAppStatus('done');
            const rr = await fetch('/api/rally/results'); const rd = await rr.json();
            if (rd.success && rd.results?.length > 0) { setResults(rd.results); setSelectedResult(rd.results[0]); }
          } else { addLog('Generation failed: no content produced', 'error'); setAppStatus('idle'); }
        }
      );
    } catch (err) { addLog(`Generation error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error'); setAppStatus('idle'); }
  }, [selectedCampaign, isRunning, addLog, clearLogs, pollJob]);

  const handleStop = useCallback(() => { pollAbortRef.current = true; addLog('Stop requested...', 'warning'); }, [addLog]);

  const handleCopy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, []);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* ═══ Header ═══ */}
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Rally Brain <span className="text-xs font-normal text-gray-500 ml-1">v7</span>
                </h1>
                <p className="text-[11px] text-gray-500 hidden sm:block">Search → Learn → Generate → Output</p>
              </div>
            </div>
            <Badge variant="outline" className={`gap-1.5 text-xs border-gray-700 ${
              appStatus === 'idle' || appStatus === 'done' ? 'text-emerald-400 border-emerald-800' :
              appStatus === 'learning' ? 'text-amber-400 border-amber-800' : 'text-orange-400 border-orange-800'
            }`}>
              <CircleDot className={`h-2.5 w-2.5 ${isRunning ? 'animate-pulse' : ''}`} />
              {appStatus === 'idle' ? 'Idle' : appStatus === 'learning' ? 'Learning...' : appStatus === 'generating' ? 'Generating...' : 'Done'}
            </Badge>
          </div>
        </div>
      </header>

      {/* ═══ Step Indicator ═══ */}
      <div className="bg-gray-900/50 border-b border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-2.5 md:px-6">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {[
              { label: 'Search', icon: Search, step: 0 },
              { label: 'Learn', icon: BookOpen, step: 1 },
              { label: 'Generate', icon: Zap, step: 2 },
              { label: 'Output', icon: Eye, step: 3 },
            ].map((s, i) => {
              const status = getStepStatus(activeStep, s.step);
              const Icon = s.icon;
              return (
                <React.Fragment key={s.step}>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    status === 'active' ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40' :
                    status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                    {status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                    {status === 'active' && isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                  {i < 3 && <ArrowRight className={`h-3.5 w-3.5 ${status === 'completed' ? 'text-emerald-500' : 'text-gray-700'}`} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ── LEFT: Campaigns ── */}
          <div className="lg:col-span-4 space-y-3">
            {/* Search */}
            <Card className="border-gray-800 bg-gray-900">
              <CardContent className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search campaigns..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    disabled={searchLoading}
                    className="h-10 pl-9 pr-10 text-sm bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:bg-gray-800"
                  />
                  <Button onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()} size="sm"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2.5 bg-orange-500 hover:bg-orange-600 text-white">
                    {searchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Campaign List */}
            <Card className="border-gray-800 bg-gray-900">
              <CardHeader className="px-4 py-2.5 border-b border-gray-800 bg-gray-800/50">
                <CardTitle className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" />
                  Campaigns
                  {searchResults.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-700 text-gray-300">{searchResults.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-64">
                  {!hasSearched ? (
                    <div className="p-6 text-center text-sm text-gray-500">Search for a campaign to start</div>
                  ) : searchLoading ? (
                    <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 text-orange-500 animate-spin" /></div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">No campaigns found</div>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {searchResults.map(card => (
                        <button key={card.address} onClick={() => handleSelectCampaign(card)} disabled={detailLoading}
                          className={`w-full text-left p-3 hover:bg-gray-800/70 transition-colors disabled:opacity-60 ${
                            selectedCampaign?.intelligentContractAddress === card.address ? 'bg-orange-500/10 border-l-2 border-l-orange-500' : ''
                          }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-200 truncate">{card.title}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{card.description}</p>
                            </div>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${card.status === 'active' ? 'text-emerald-400 border-emerald-700' : 'text-gray-500 border-gray-700'}`}>
                              {card.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            {card.rewards.length > 0 && (
                              <span className="text-[11px] text-amber-400 font-medium">
                                {card.rewards[0].totalAmount.toLocaleString()} {card.rewards[0].tokenSymbol}
                              </span>
                            )}
                            <span className="text-[11px] text-gray-500">{card.missionCount} missions</span>
                            {card.category && <span className="text-[11px] text-gray-600">{card.category}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Selected Campaign */}
            {selectedCampaign && (
              <Card className="border-orange-500/20 bg-gradient-to-b from-orange-500/5 to-gray-900">
                <CardHeader className="px-4 py-2.5 border-b border-orange-500/10 bg-orange-500/5">
                  <CardTitle className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-orange-400" /> Selected Campaign
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2.5">
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 text-orange-500 animate-spin" /></div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-100">{selectedCampaign.title}</h3>
                        {selectedCampaign.missionTitle && (
                          <p className="text-xs text-orange-400 mt-0.5">Mission {selectedCampaign.missionNumber}: {selectedCampaign.missionTitle}</p>
                        )}
                      </div>
                      <Separator className="bg-gray-800" />
                      <div className="space-y-1 text-xs text-gray-400">
                        {selectedCampaign.contentType && (
                          <div className="flex gap-2"><span className="w-14 shrink-0 text-gray-600">Type</span><span className="text-gray-300">{selectedCampaign.contentType}</span></div>
                        )}
                        {selectedCampaign.characterLimit && (
                          <div className="flex gap-2"><span className="w-14 shrink-0 text-gray-600">Limit</span><span className="text-gray-300">{selectedCampaign.characterLimit} chars</span></div>
                        )}
                        {selectedCampaign.rules && (
                          <div className="mt-2">
                            <p className="text-gray-600 mb-1">Rules (preview)</p>
                            <p className="text-[11px] text-gray-500 line-clamp-3 bg-gray-800/50 rounded p-2">
                              {typeof selectedCampaign.rules === 'string' ? selectedCampaign.rules : JSON.stringify(selectedCampaign.rules).substring(0, 300)}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Learning Insights */}
            {learningResult && (
              <Card className="border-emerald-500/20 bg-gray-900">
                <CardHeader className="px-4 py-2.5 border-b border-emerald-500/10 bg-emerald-500/5">
                  <CardTitle className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-400" /> Learning Insights
                    <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-0">{learningResult.validSubmissions} analyzed</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {learningResult.rules.length > 0 && (
                    <div className="space-y-0.5">
                      {learningResult.rules.slice(0, 4).map((rule, i) => (
                        <div key={i} className="text-[11px] text-gray-400 flex gap-1.5"><span className="text-orange-400 shrink-0">•</span><span>{rule}</span></div>
                      ))}
                    </div>
                  )}
                  <Separator className="bg-gray-800" />
                  {learningResult.patterns.length > 0 && (
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Top Differentiators</p>
                      {learningResult.patterns.slice(0, 3).map((p, i) => (
                        <div key={i} className="text-[11px]"><span className="font-medium text-gray-300">{p.category}</span><span className="text-gray-600 ml-1">(+{p.gap.toFixed(0)}% gap)</span></div>
                      ))}
                    </div>
                  )}
                  <Separator className="bg-gray-800" />
                  <div className="flex gap-4">
                    <div><p className="text-[10px] text-red-400 font-medium uppercase tracking-wider">Weak</p>
                      {learningResult.weakCategories.slice(0, 2).map((w, i) => <p key={i} className="text-[11px] text-gray-500">{w}</p>)}</div>
                    <div><p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Strong</p>
                      {learningResult.strongCategories.slice(0, 2).map((s, i) => <p key={i} className="text-[11px] text-gray-500">{s}</p>)}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── RIGHT: Actions + Results ── */}
          <div className="lg:col-span-8 space-y-3">
            {/* Control Panel */}
            <Card className="border-gray-800 bg-gray-900">
              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={handleStartLearn} disabled={!selectedCampaign || isRunning}
                    className="gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm">
                    {appStatus === 'learning' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                    Start Learn
                  </Button>
                  <Button onClick={handleStartGenerate} disabled={!selectedCampaign || isRunning}
                    className="gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm">
                    {appStatus === 'generating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Start Generate
                  </Button>
                  {isRunning && (
                    <Button onClick={handleStop} variant="outline"
                      className="gap-2 text-red-400 border-red-800 hover:bg-red-500/10 text-sm">
                      <StopCircle className="h-4 w-4" /> Stop
                    </Button>
                  )}
                  {!selectedCampaign && <span className="text-xs text-gray-500">← Select a campaign first</span>}
                </div>
              </CardContent>
            </Card>

            {/* Progress Log */}
            <Card className="border-gray-800 bg-gray-900">
              <CardHeader className="px-4 py-2 border-b border-gray-800 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5" />
                  Log Output
                  {logs.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-800 text-gray-400">{logs.length}</Badge>}
                </CardTitle>
                {logs.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearLogs} className="h-6 text-[11px] text-gray-500 hover:text-gray-300">Clear</Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-40 overflow-y-auto font-mono text-xs bg-gray-950 rounded-b-lg">
                  {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-600"><p>No logs yet. Start a pipeline to see progress.</p></div>
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

            {/* Results Viewer */}
            <Card className="border-gray-800 bg-gray-900 min-h-[300px]">
              <CardHeader className="px-4 py-2.5 border-b border-gray-800 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-orange-400" /> Results Viewer
                </CardTitle>
                <div className="flex items-center gap-2">
                  {selectedResult?.grade && (
                    <Badge className={`text-xs font-bold px-2.5 py-0.5 border ${getGradeColor(selectedResult.grade)}`}>
                      {selectedResult.grade}{selectedResult.score !== null && ` ${selectedResult.score.toFixed(1)}`}
                    </Badge>
                  )}
                  {selectedResult?.source && <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-700">{selectedResult.source}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="content" className="w-full">
                  <div className="border-b border-gray-800 px-4 pt-1">
                    <TabsList className="bg-transparent h-9 p-0 gap-0">
                      <TabsTrigger value="content"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3 text-gray-400">
                        <FileText className="h-3.5 w-3.5 mr-1" /> Content
                      </TabsTrigger>
                      <TabsTrigger value="qa"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3 text-gray-400">
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> Q&A
                        {selectedResult?.qaPairs && selectedResult.qaPairs.length > 0 && (
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4 bg-gray-700 text-gray-400">{selectedResult.qaPairs.length}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="history"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3 text-gray-400">
                        <BarChart3 className="h-3.5 w-3.5 mr-1" /> History
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Content Tab */}
                  <TabsContent value="content" className="mt-0">
                    <div className="p-4">
                      {!selectedResult && resultsLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-gray-600 animate-spin" /></div>
                      ) : selectedResult && selectedResult.content ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-300">{selectedResult.campaignName}</p>
                            <Button variant="outline" size="sm" onClick={() => handleCopy(selectedResult.content!)}
                              className="h-7 text-xs gap-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              {copied ? 'Copied' : 'Copy'}
                            </Button>
                          </div>
                          {selectedResult.categories.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-500">Score Breakdown</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {selectedResult.categories.map((cat, i) => (
                                  <div key={i} className="bg-gray-800/50 rounded-lg p-2.5">
                                    <p className="text-[11px] text-gray-500 truncate">{cat.name}</p>
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                      <span className={`text-sm font-bold ${cat.percentage >= 80 ? 'text-emerald-400' : cat.percentage >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {cat.score}
                                      </span>
                                      <span className="text-[11px] text-gray-600">/{cat.maxScore}</span>
                                    </div>
                                    <Progress value={cat.percentage} className="h-1 mt-1.5 bg-gray-800 [&>div]:bg-orange-500" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedResult.g4Reasons && selectedResult.g4Reasons.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">G4 Bonuses</p>
                              <div className="flex flex-wrap gap-1">
                                {selectedResult.g4Reasons.map((r, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-800">{r}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <Separator className="bg-gray-800" />
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">Generated Content</p>
                            <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedResult.content}</div>
                          </div>
                        </div>
                      ) : selectedResult ? (
                        <div className="text-center py-12 text-sm text-gray-500">No content available</div>
                      ) : (
                        <div className="text-center py-12 text-sm text-gray-600">
                          <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                          <p>Select a campaign and generate to see results</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Q&A Tab */}
                  <TabsContent value="qa" className="mt-0">
                    <div className="p-4">
                      {selectedResult?.qaPairs && selectedResult.qaPairs.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          <p className="text-xs font-medium text-gray-500">{selectedResult.qaPairs.length} Q&A pairs</p>
                          {selectedResult.qaPairs.map((qa, i) => (
                            <div key={i} className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                              <div className="flex gap-2">
                                <Badge className="text-[10px] bg-sky-500/20 text-sky-400 shrink-0 h-5 w-5 flex items-center justify-center p-0">Q</Badge>
                                <p className="text-sm text-gray-200 font-medium">{qa.q}</p>
                              </div>
                              <div className="flex gap-2">
                                <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 shrink-0 h-5 w-5 flex items-center justify-center p-0">A</Badge>
                                <p className="text-sm text-gray-400">{qa.a}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-sm text-gray-600">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                          <p>No Q&A pairs available</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history" className="mt-0">
                    <div className="p-4 max-h-96 overflow-y-auto">
                      {resultsLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-gray-600 animate-spin" /></div>
                      ) : results.length > 0 ? (
                        <div className="space-y-2">
                          {results.map(r => (
                            <button key={r.id} onClick={() => setSelectedResult(r)}
                              className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-800/70 ${
                                selectedResult?.id === r.id ? 'bg-orange-500/10 ring-1 ring-orange-500/30' : ''
                              }`}>
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 shrink-0">
                                <Trophy className={`h-4 w-4 ${r.grade?.startsWith('S') ? 'text-amber-400' : r.grade?.startsWith('A') ? 'text-emerald-400' : 'text-gray-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-200 truncate">{r.campaignName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge className={`text-[10px] px-1.5 py-0 border ${getGradeColor(r.grade || '')}`}>{r.grade || '?'}</Badge>
                                  {r.score !== null && <span className="text-[11px] text-gray-500">{r.score.toFixed(1)}/21</span>}
                                  <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-700">{r.source}</Badge>
                                </div>
                              </div>
                              {r.timestamp && (
                                <span className="text-[11px] text-gray-600 shrink-0 hidden sm:block">
                                  {new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-sm text-gray-600">No results yet</div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-gray-800 bg-gray-900 mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between text-[11px] text-gray-600">
            <span>Rally Brain v7 — AI Content Generation</span>
            <span>Rally.fun Campaign Dashboard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
