'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Trophy, ChevronRight, ChevronLeft, Loader2,
  Copy, Check, RotateCcw, Zap, Users, Target,
  BookOpen, Clock, ArrowRight, Sparkles, AlertCircle,
  FileText, Brain, Scale, Calculator
} from 'lucide-react';

// ── Types ──
interface Campaign {
  address: string;
  title: string;
  goal: string;
  missionCount: number;
  displayCreator: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

interface Mission {
  title: string;
  description: string;
  rules: string;
  style: string;
  contentType: string;
  characterLimit: number;
}

interface CampaignDetail {
  title: string;
  goal: string;
  style: string;
  rules: string;
  knowledgeBase: string;
  adminNotice: string;
  missions: Mission[];
  displayCreator: string;
  intelligentContractAddress: string;
  campaignRewards: any;
  gateWeights: any;
  metricWeights: any;
}

interface Leaderboard {
  entries: any[];
  totalSubmissions: number;
  topScore: number;
  avgScore: number;
}

interface RallyResult {
  success: boolean;
  status: string;
  phase?: string;
  content?: string;
  brief?: any;
  selfCheck?: any;
  antiAiScan?: any;
  optimist?: any;
  critic?: any;
  finalScore?: number;
  verdict?: string;
  gap?: number;
  severity?: string;
  dimensions?: any;
  timings?: any;
  error?: string;
  jobId?: string;
}

type WizardStep = 'search' | 'detail' | 'generating' | 'results';

// ── Helpers ──
function ScoreBar({ label, score, max = 100, color }: { label: string; score: number; max?: number; color?: string }) {
  const pct = Math.min(100, (score / max) * 100);
  const bgColor = color || (pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500');
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{score}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${bgColor} rounded-full transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const variants: Record<string, { label: string; cls: string }> = {
    APPROVE: { label: 'APPROVE', cls: 'bg-emerald-500/90 text-white border-emerald-400/50' },
    APPROVE_REVIEW: { label: 'APPROVE + REVIEW', cls: 'bg-amber-500/90 text-white border-amber-400/50' },
    REVISE: { label: 'REVISE', cls: 'bg-orange-500/90 text-white border-orange-400/50' },
    REJECT: { label: 'REJECT', cls: 'bg-red-500/90 text-white border-red-400/50' },
    REVIEW: { label: 'NEEDS REVIEW', cls: 'bg-amber-500/90 text-white border-amber-400/50' },
  };
  const v = variants[verdict] || { label: verdict || 'N/A', cls: 'bg-muted text-muted-foreground border-border' };
  return <span className={`${v.cls} px-3 py-1 rounded-full text-xs font-bold border`}>{v.label}</span>;
}

const PHASE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  queued: { icon: <Clock className="w-4 h-4" />, label: 'Menunggu dalam antrian...' },
  starting: { icon: <Zap className="w-4 h-4" />, label: 'Memulai pipeline...' },
  phase0: { icon: <Brain className="w-4 h-4" />, label: 'Phase 0: PreWriting Agent...' },
  phase1: { icon: <FileText className="w-4 h-4" />, label: 'Phase 1: Generator Agent...' },
  phase1_check: { icon: <Target className="w-4 h-4" />, label: 'Phase 1: Self-Correction...' },
  phase2: { icon: <Scale className="w-4 h-4" />, label: 'Phase 2: Dual Judges (paralel)...' },
  phase3: { icon: <Calculator className="w-4 h-4" />, label: 'Phase 3: Reconciliation...' },
  saving: { icon: <FileText className="w-4 h-4" />, label: 'Menyimpan hasil...' },
  completed: { icon: <Sparkles className="w-4 h-4" />, label: 'Selesai!' },
};

// ── Step Indicators ──
function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { key: 'search', label: 'Cari Campaign', num: 1 },
    { key: 'detail', label: 'Detail & Misi', num: 2 },
    { key: 'generating', label: 'Proses AI', num: 3 },
    { key: 'results', label: 'Hasil', num: 4 },
  ];
  const idx = steps.findIndex(s => s.key === current);
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6">
      {steps.map((s, i) => {
        const isActive = i === idx;
        const isDone = i < idx;
        return (
          <div key={s.key} className="flex items-center gap-1 sm:gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive ? 'bg-primary text-primary-foreground shadow-sm' :
              isDone ? 'bg-primary/15 text-primary' :
              'bg-muted text-muted-foreground'
            }`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                {isDone ? '✓' : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ──
export default function Home() {
  const [step, setStep] = useState<WizardStep>('search');

  // Step 1 state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Campaign[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Step 2 state
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);
  const [selectedMissionIndex, setSelectedMissionIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Step 3 state
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState('queued');
  const [elapsedTime, setElapsedTime] = useState(0);

  // Step 4 state
  const [result, setResult] = useState<RallyResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Timer for generating step
  useEffect(() => {
    if (step !== 'generating') return;
    const timer = setInterval(() => setElapsedTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, [step]);

  // ── Step 1: Search Campaigns ──
  async function handleSearch(query?: string) {
    const q = query || searchQuery;
    if (!q.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setError('');
    try {
      const res = await fetch(`/api/campaigns?q=${encodeURIComponent(q.trim())}&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mencari campaign');
      setSearchResults(data.campaigns || []);
    } catch (e: any) {
      setError(e.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function selectCampaign(campaign: Campaign) {
    setIsLoadingDetail(true);
    setStep('detail');
    setError('');
    setSelectedMissionIndex(0);

    fetch(`/api/campaigns/${campaign.address}`)
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || 'Gagal memuat detail');
        setSelectedCampaign(data.campaign);
        setLeaderboard(data.leaderboard);
      })
      .catch((e: any) => {
        setError(e.message);
        setStep('search');
      })
      .finally(() => setIsLoadingDetail(false));
  }

  // ── Step 2: Generate ──
  async function handleGenerate() {
    if (!selectedCampaign) return;
    setStep('generating');
    setElapsedTime(0);
    setCurrentPhase('queued');
    setJobId(null);
    setResult(null);
    setError('');
    setSubmitError('');

    try {
      const res = await fetch('/api/rally', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignData: selectedCampaign,
          missionIndex: selectedMissionIndex,
          leaderboardData: leaderboard,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim job');
      setJobId(data.jobId);
    } catch (e: any) {
      setError(e.message);
      setStep('detail');
    }
  }

  // ── Poll for results ──
  const pollStatus = useCallback(async (jid: string) => {
    try {
      const res = await fetch(`/api/rally/${jid}`);
      const data: RallyResult = await res.json();

      if (data.status === 'completed' && data.content) {
        setResult(data);
        setStep('results');
        return;
      }
      if (data.status === 'error') {
        setError(data.error || 'Job gagal diproses');
        setSubmitError(data.error || 'Job gagal diproses');
        setStep('detail');
        return;
      }
      if (data.status === 'processing') {
        setCurrentPhase(data.phase || 'starting');
      }
    } catch {
      // ignore poll errors
    }
  }, []);

  useEffect(() => {
    if (step !== 'generating' || !jobId) return;
    const interval = setInterval(() => pollStatus(jobId), 3000);
    pollStatus(jobId); // initial poll
    return () => clearInterval(interval);
  }, [step, jobId, pollStatus]);

  // ── Copy content ──
  function copyContent() {
    if (!result?.content) return;
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Generate again ──
  function handleGenerateAgain() {
    setStep('detail');
    setResult(null);
    setJobId(null);
  }

  // ── Back to search ──
  function handleBackToSearch() {
    setStep('search');
    setSelectedCampaign(null);
    setLeaderboard(null);
    setResult(null);
    setJobId(null);
    setError('');
  }

  // ── Format time ──
  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  // ─────────── RENDER ───────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">Rally AutoGen</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Content Competition Automation</p>
            </div>
          </div>
          {step === 'results' && (
            <Button variant="ghost" size="sm" onClick={handleBackToSearch} className="text-xs gap-1">
              <ChevronLeft className="w-3 h-3" /> Campaign Baru
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <StepIndicator current={step} />

        {/* Error Banner */}
        {error && step !== 'generating' && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">Error</p>
              <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setError('')}>✕</Button>
          </div>
        )}

        {/* ═══════ STEP 1: Search ═══════ */}
        {step === 'search' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-500" />
                  Cari Campaign Rally
                </CardTitle>
                <CardDescription>
                  Ketik nama campaign untuk mulai. Data diambil langsung dari Rally API.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Contoh: Bitcoin, Web3, AI..."
                    className="flex-1"
                  />
                  <Button onClick={() => handleSearch()} disabled={isSearching || !searchQuery.trim()}>
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span className="hidden sm:inline ml-2">Cari</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {hasSearched && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground px-1">
                  {isSearching ? 'Mencari...' : `${searchResults.length} campaign ditemukan`}
                </p>

                {isSearching ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Card key={i} className="opacity-60">
                        <CardContent className="p-4">
                          <Skeleton className="h-5 w-3/5 mb-2" />
                          <Skeleton className="h-3 w-4/5" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Tidak ada campaign ditemukan.</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Coba kata kunci lain atau pastikan campaign aktif.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((c) => (
                      <Card
                        key={c.address}
                        className="cursor-pointer hover:border-blue-300/50 hover:bg-blue-500/[0.02] transition-colors group"
                        onClick={() => selectCampaign(c)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors truncate">
                                {c.title}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" /> {c.displayCreator}
                                </span>
                                <span className="text-muted-foreground/40">|</span>
                                <span className="flex items-center gap-1">
                                  <Target className="w-3 h-3" /> {c.missionCount} misi
                                </span>
                              </p>
                              {c.goal && (
                                <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2">{c.goal}</p>
                              )}
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-blue-500 transition-colors mt-1 shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════ STEP 2: Campaign Detail ═══════ */}
        {step === 'detail' && (
          <div className="space-y-4">
            {isLoadingDetail ? (
              <div className="space-y-4">
                <Card><CardContent className="p-6"><Skeleton className="h-7 w-1/2 mb-4" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>
                <Card><CardContent className="p-6"><Skeleton className="h-5 w-1/3 mb-3" /><Skeleton className="h-20 w-full" /></CardContent></Card>
              </div>
            ) : selectedCampaign ? (
              <>
                {/* Campaign Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg leading-tight">{selectedCampaign.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <Users className="w-3 h-3" /> {selectedCampaign.displayCreator}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleBackToSearch} className="shrink-0 text-xs gap-1">
                        <ChevronLeft className="w-3 h-3" /> Kembali
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Goal */}
                    {selectedCampaign.goal && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Tujuan Campaign
                        </p>
                        <p className="text-sm leading-relaxed">{selectedCampaign.goal}</p>
                      </div>
                    )}

                    {/* Style */}
                    {selectedCampaign.style && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Gaya Penulisan
                        </p>
                        <p className="text-sm leading-relaxed">{selectedCampaign.style}</p>
                      </div>
                    )}

                    {/* Rules */}
                    {selectedCampaign.rules && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          📜 Aturan
                        </p>
                        <div className="text-sm leading-relaxed bg-muted/40 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {selectedCampaign.rules}
                        </div>
                      </div>
                    )}

                    {/* Knowledge Base */}
                    {selectedCampaign.knowledgeBase && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          📚 Knowledge Base
                        </p>
                        <div className="text-sm leading-relaxed bg-muted/40 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {selectedCampaign.knowledgeBase}
                        </div>
                      </div>
                    )}

                    {/* Admin Notice */}
                    {selectedCampaign.adminNotice && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          ⚠️ Admin Notice
                        </p>
                        <div className="text-sm leading-relaxed bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 whitespace-pre-wrap">
                          {selectedCampaign.adminNotice}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Mission Selector */}
                    {selectedCampaign.missions && selectedCampaign.missions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Pilih Misi ({selectedCampaign.missions.length} tersedia)
                        </p>
                        <div className="space-y-2">
                          {selectedCampaign.missions.map((mission, idx) => (
                            <Card
                              key={idx}
                              className={`cursor-pointer transition-all ${
                                selectedMissionIndex === idx
                                  ? 'border-blue-500 bg-blue-500/[0.04] ring-1 ring-blue-500/30'
                                  : 'hover:border-muted-foreground/20'
                              }`}
                              onClick={() => setSelectedMissionIndex(idx)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{mission.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mission.description}</p>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {mission.contentType && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{mission.contentType}</Badge>
                                      )}
                                      {mission.characterLimit && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          Max {mission.characterLimit} karakter
                                        </Badge>
                                      )}
                                      {mission.style && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{mission.style}</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                                    selectedMissionIndex === idx
                                      ? 'border-blue-500 bg-blue-500'
                                      : 'border-muted-foreground/30'
                                  }`}>
                                    {selectedMissionIndex === idx && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selected Mission Rules */}
                    {selectedCampaign.missions?.[selectedMissionIndex]?.rules && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">📜 Aturan Misi</p>
                        <div className="text-sm leading-relaxed bg-muted/40 rounded-lg p-3 max-h-24 overflow-y-auto whitespace-pre-wrap">
                          {selectedCampaign.missions[selectedMissionIndex].rules}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Leaderboard Stats */}
                    {leaderboard && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-500" /> Statistik Leaderboard
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-muted/40 rounded-lg p-3 text-center">
                            <p className="text-xl font-bold tabular-nums">{leaderboard.totalSubmissions}</p>
                            <p className="text-[10px] text-muted-foreground">Total Peserta</p>
                          </div>
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-center">
                            <p className="text-base font-bold text-amber-600">
                              @{leaderboard.entries[0]?.username || '?'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Peringkat #1</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Generate Button */}
                    <div className="pt-2">
                      <Button
                        onClick={handleGenerate}
                        size="lg"
                        className="w-full h-12 text-sm font-semibold gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
                      >
                        <Sparkles className="w-4 h-4" />
                        Generate Konten
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center mt-2">
                        AI akan menganalisis campaign, mempelajari leaderboard, dan menghasilkan konten yang dioptimasi.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit error from generate */}
                {submitError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                    {submitError}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* ═══════ STEP 3: Generating ═══════ */}
        {step === 'generating' && (
          <div className="space-y-4">
            <Card className="border-blue-200/30">
              <CardContent className="pt-6 pb-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-200/30 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                  <h2 className="text-lg font-semibold">Sedang Memproses...</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCampaign?.title} — {selectedCampaign?.missions?.[selectedMissionIndex]?.title}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1 tabular-nums">
                    {formatTime(elapsedTime)} {jobId && <span className="text-muted-foreground/40">| Job: {jobId}</span>}
                  </p>
                </div>

                {/* Pipeline Phases */}
                <div className="space-y-2 max-w-md mx-auto">
                  {Object.entries(PHASE_CONFIG).map(([key, config]) => {
                    const phaseOrder = ['queued', 'starting', 'phase0', 'phase1', 'phase1_check', 'phase2', 'phase3', 'saving', 'completed'];
                    const currentIdx = phaseOrder.indexOf(currentPhase);
                    const thisIdx = phaseOrder.indexOf(key);
                    const isDone = thisIdx < currentIdx;
                    const isCurrent = key === currentPhase;

                    if (key === 'queued' || key === 'completed') return null;

                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                          isCurrent ? 'bg-blue-500/10 border border-blue-500/20 text-foreground' :
                          isDone ? 'text-emerald-600' :
                          'text-muted-foreground/40'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isCurrent ? 'bg-blue-500 text-white' :
                          isDone ? 'bg-emerald-500/20 text-emerald-600' :
                          'bg-muted text-muted-foreground/40'
                        }`}>
                          {isDone ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : isCurrent ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            config.icon
                          )}
                        </div>
                        <span className={isCurrent ? 'font-medium' : ''}>{config.label}</span>
                        {isCurrent && (
                          <span className="ml-auto">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground/50">
                    Cron job memproses antrian setiap 5 menit. Silakan tunggu...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════ STEP 4: Results ═══════ */}
        {step === 'results' && result && (
          <div className="space-y-4">
            {/* Score Card */}
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Final Score</p>
                    <p className="text-5xl font-black tabular-nums">
                      {result.finalScore}<span className="text-xl text-muted-foreground font-normal">/100</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedCampaign?.title} — {selectedCampaign?.missions?.[selectedMissionIndex]?.title}
                    </p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <VerdictBadge verdict={result.verdict || ''} />
                    {result.gap !== undefined && (
                      <Badge variant={result.gap > 25 ? 'destructive' : 'secondary'} className="text-xs">
                        Gap: {result.gap} ({result.severity})
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Dimension Scores */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ScoreBar label="Perspective & Depth" score={result.dimensions?.perspective || 0} />
                  <ScoreBar label="Creativity & Originality" score={result.dimensions?.creativity || 0} />
                  <ScoreBar label="Engagement & Impact" score={result.dimensions?.engagement || 0} />
                  <ScoreBar label="Relevance & Alignment" score={result.dimensions?.relevance || 0} />
                  <ScoreBar label="Technical Quality" score={result.dimensions?.technical || 0} />
                  <ScoreBar label="Anti-AI Compliance" score={result.dimensions?.antiAi || 0} color="bg-teal-500" />
                </div>

                <Separator className="my-4" />

                {/* Timing */}
                {result.timings && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Phase 0: <b className="tabular-nums">{result.timings.phase0 || '-'}</b></span>
                    <span>Phase 1: <b className="tabular-nums">{result.timings.phase1 || '-'}</b></span>
                    <span>Phase 2: <b className="tabular-nums">{result.timings.phase2 || '-'}</b></span>
                    <span className="font-semibold">Total: <b className="tabular-nums">{result.timings.total || '-'}</b></span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content + Judges Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Generated Content */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Konten yang Dihasilkan</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Copy dan paste langsung ke Rally</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={copyContent}
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Tersalin!' : 'Salin'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-80">
                    <div className="bg-muted/40 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap pr-4">
                      {result.content}
                    </div>
                  </ScrollArea>
                  {result.antiAiScan && (
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant={result.antiAiScan.passed ? 'default' : 'destructive'} className="text-xs">
                        Anti-AI: {result.antiAiScan.score}/100
                      </Badge>
                      {result.antiAiScan.issues?.length > 0 && (
                        <span className="text-xs text-muted-foreground">{result.antiAiScan.issues.length} issues</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Judge Cards */}
              <div className="space-y-4">
                {/* Optimist */}
                {result.optimist && (
                  <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400">Judge Optimist</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {result.optimist.weightedScore}
                          </span>
                          <VerdictBadge verdict={result.optimist.verdict || 'N/A'} />
                        </div>
                      </div>
                      <CardDescription className="text-[10px]">Mencari KEKUATAN konten</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ScoreBar label="Perspective & Depth" score={result.optimist.perspective_depth || 0} color="bg-emerald-500" />
                      <ScoreBar label="Creativity" score={result.optimist.creativity_originality || 0} color="bg-emerald-500" />
                      <ScoreBar label="Engagement" score={result.optimist.engagement_impact || 0} color="bg-emerald-500" />
                      {result.optimist.strengths?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/10">
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">Strengths:</p>
                          {result.optimist.strengths.map((s: string, i: number) => (
                            <p key={i} className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">✓ {s}</p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Critic */}
                {result.critic && (
                  <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-orange-700 dark:text-orange-400">Judge Critic</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
                            {result.critic.weightedScore}
                          </span>
                          <VerdictBadge verdict={result.critic.verdict || 'N/A'} />
                        </div>
                      </div>
                      <CardDescription className="text-[10px]">Mencari KELEMAHAN konten</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ScoreBar label="Relevance" score={result.critic.relevance_alignment || 0} color="bg-orange-500" />
                      <ScoreBar label="Technical" score={result.critic.technical_quality || 0} color="bg-orange-500" />
                      <ScoreBar label="Anti-AI" score={result.critic.anti_ai_compliance || 0} color="bg-orange-500" />
                      {result.critic.weaknesses?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-orange-500/10">
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">Weaknesses:</p>
                          {result.critic.weaknesses.map((w: string, i: number) => (
                            <p key={i} className="text-xs text-orange-700 dark:text-orange-400 leading-relaxed">✗ {w}</p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Phase 0 Brief */}
            {result.brief && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-blue-500" />
                    Writing Brief (Phase 0)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-xs text-muted-foreground">Perspective:</span><p className="mt-0.5">{result.brief.perspective}</p></div>
                    <div><span className="text-xs text-muted-foreground">Persona:</span><p className="mt-0.5">{result.brief.persona}</p></div>
                    <div><span className="text-xs text-muted-foreground">Tone:</span><p className="mt-0.5">{result.brief.tone}</p></div>
                    <div><span className="text-xs text-muted-foreground">Unique Angle:</span><p className="mt-0.5">{result.brief.uniqueAngle}</p></div>
                  </div>
                  {result.brief.keyInsights?.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs text-muted-foreground">Key Insights:</span>
                      <ul className="mt-1 space-y-0.5">
                        {result.brief.keyInsights.map((k: string, i: number) => (
                          <li key={i} className="text-xs list-disc list-inside text-muted-foreground">{k}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Self Check */}
            {result.selfCheck && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Self-Check (Generator Agent)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <ScoreBar label="Relevance" score={result.selfCheck.relevance || 0} />
                    <ScoreBar label="Depth" score={result.selfCheck.depth || 0} />
                    <ScoreBar label="Naturalness" score={result.selfCheck.naturalness || 0} color="bg-teal-500" />
                    <ScoreBar label="Engagement" score={result.selfCheck.engagement || 0} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant={result.selfCheck.passed ? 'default' : 'destructive'} className="text-xs">
                      Overall: {result.selfCheck.overallScore} ({result.selfCheck.passed ? 'PASSED' : 'FAILED'})
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={handleGenerateAgain}
                variant="outline"
                className="flex-1 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Generate Ulang
              </Button>
              <Button
                onClick={handleBackToSearch}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Search className="w-4 h-4" />
                Campaign Lain
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
