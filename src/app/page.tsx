'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  Brain,
  Clock,
  Trophy,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  score: number | null;
  grade: string | null;
  predictions: Record<string, number> | null;
  judgeCount: number;
  g4Bonus: number;
  hardFails: string[];
  hasContent: boolean;
  hasQA: boolean;
  contentPreview: string | null;
}

interface JobStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  jobId?: string;
  campaign?: string;
  step?: string;
  score?: number | null;
  grade?: string | null;
  exitCode?: number;
  processingTimeMs?: number;
  outputLines?: string[];
  elapsed?: number;
}

interface CampaignResult {
  campaignId: string;
  content: string | null;
  qa: unknown;
  prediction: Record<string, unknown> | null;
}

// ─── Helpers ────────────────────────────────────────────

function getGradeColor(grade: string | null): string {
  if (!grade) return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  if (grade.startsWith('S')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (grade.startsWith('A')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (grade.startsWith('B')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-red-500/10 text-red-400 border-red-500/20';
}

function getScoreColor(score: number): string {
  if (score >= 21) return 'text-emerald-400';
  if (score >= 18) return 'text-blue-400';
  if (score >= 15) return 'text-amber-400';
  return 'text-red-400';
}

function getStepLabel(step: string): string {
  const map: Record<string, string> = {
    starting: 'Memulai...',
    generating: 'Generating variasi...',
    evaluating: 'Evaluasi skor...',
    qa_generation: 'Generate Q&A pairs...',
    finalizing: 'Finalisasi...',
    done: 'Selesai',
    error: 'Error',
  };
  return map[step] || step;
}

function getStepProgress(step: string): number {
  const map: Record<string, number> = {
    starting: 5,
    generating: 30,
    evaluating: 60,
    qa_generation: 80,
    finalizing: 95,
    done: 100,
    error: 0,
  };
  return map[step] || 10;
}

function formatMs(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ─── Component ──────────────────────────────────────────

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [job, setJob] = useState<JobStatus>({ status: 'idle' });
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/rally-cli/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        if (!selectedCampaign && data.campaigns.length > 0) {
          setSelectedCampaign(data.campaigns[0].id);
        }
      }
    } catch {}
  }, [selectedCampaign]);

  // Fetch result for a campaign
  const fetchResult = useCallback(async (campaignId: string) => {
    try {
      const res = await fetch(`/api/rally-cli/result/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch {}
  }, []);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/rally-cli/status');
      if (res.ok) {
        const data = await res.json();
        setJob(data);
        if (data.status === 'completed' || data.status === 'failed') {
          setRunning(false);
          fetchCampaigns();
          if (data.campaign) {
            fetchResult(data.campaign);
          }
        }
      }
    } catch {}
  }, [fetchCampaigns, fetchResult]);

  // Initial load
  useEffect(() => {
    (async () => {
      await fetchCampaigns();
      await fetchStatus();
      setLoading(false);
    })();
  }, []);

  // Poll when running
  useEffect(() => {
    if (running) {
      pollRef.current = setInterval(fetchStatus, 3000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [running, fetchStatus]);

  // Trigger generation
  const handleRun = async () => {
    if (!selectedCampaign || running) return;
    setRunning(true);
    setResult(null);
    setShowQA(false);
    setShowLog(false);

    try {
      const res = await fetch('/api/rally-cli/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: selectedCampaign }),
      });
      const data = await res.json();

      if (!res.ok) {
        setRunning(false);
        alert(data.error || 'Gagal memulai generasi');
        return;
      }

      setJob({ status: 'running', campaign: selectedCampaign, jobId: data.jobId });
      fetchStatus();
    } catch {
      setRunning(false);
      alert('Koneksi gagal');
    }
  };

  // Copy content
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Load result when campaign changes
  const handleCampaignChange = (id: string) => {
    setSelectedCampaign(id);
    setShowQA(false);
    setShowLog(false);
    fetchResult(id);
  };

  // ─── Render ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">Rally Brain</h1>
                <p className="text-[10px] font-mono text-emerald-400/70 -mt-0.5">v7.0 CLI Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${job.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${job.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                {job.status === 'running' ? 'LIVE' : 'IDLE'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
        {/* ── TRIGGER ─────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Trigger Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select value={selectedCampaign} onValueChange={handleCampaignChange}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-sm flex-1">
                  <SelectValue placeholder="Pilih campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                        {c.name}
                        {c.score !== null && (
                          <span className="text-zinc-500 text-xs ml-auto">{c.score}/23</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleRun}
                disabled={running || !selectedCampaign}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Processing...</>
                ) : (
                  <><Play className="w-4 h-4 mr-1.5" /> Jalankan</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── STATUS ───────────────────────────── */}
        {job.status === 'running' && (
          <Card className="bg-zinc-900 border-emerald-500/20 shadow-lg shadow-emerald-500/5">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-sm font-medium text-white">
                    {getStepLabel(job.step || 'starting')}
                  </span>
                </div>
                <span className="text-xs text-zinc-500 font-mono">
                  {job.elapsed ? formatMs(job.elapsed) : '...'}
                </span>
              </div>
              <Progress
                value={getStepProgress(job.step || 'starting')}
                className="h-1.5 bg-zinc-800"
              />
              {job.outputLines && job.outputLines.length > 0 && (
                <button
                  onClick={() => setShowLog(!showLog)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showLog ? 'Sembunyikan log' : 'Lihat log'}
                </button>
              )}
              {showLog && job.outputLines && (
                <div className="bg-zinc-950 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-[10px] font-mono text-zinc-400 space-y-0.5">
                    {job.outputLines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── RESULT ───────────────────────────── */}
        {result && job.status !== 'running' && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Hasil — {result.prediction?.grade || '?'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {job.processingTimeMs && (
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatMs(job.processingTimeMs)}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Score */}
              {result.prediction?.score && (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(result.prediction.score as number)}`}>
                      {result.prediction.score as number}
                    </div>
                    <div className="text-xs text-zinc-500">/23</div>
                  </div>
                  <Badge variant="outline" className={getGradeColor(result.prediction.grade as string)}>
                    {result.prediction.grade as string}
                  </Badge>
                  {result.prediction.valid_judges && (
                    <span className="text-xs text-zinc-500">
                      {result.prediction.valid_judges} judge(s)
                    </span>
                  )}
                </div>
              )}

              {/* Dimension Breakdown */}
              {result.prediction?.predictions && (
                <div className="space-y-1.5">
                  {Object.entries(result.prediction.predictions as Record<string, number>).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="w-28 text-zinc-400 capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500/70 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (val / (key === 'reply_quality' ? 5 : key === 'technical' ? 5 : key === 'engagement' ? 4 : 2)) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-zinc-300 font-mono">{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Content */}
              {result.content && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <FileText className="w-3.5 h-3.5" />
                      Generated Content
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(result.content!)}
                      className="h-6 px-2 text-[10px] text-zinc-400 hover:text-white"
                    >
                      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800/50">
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {result.content}
                    </p>
                  </div>
                </div>
              )}

              {/* QA Pairs */}
              {result.qa && Array.isArray(result.qa) && result.qa.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowQA(!showQA)}
                    className="flex items-center justify-between w-full text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Q&A Pairs ({result.qa.length})
                    </div>
                    {showQA ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {showQA && (
                    <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800/50 max-h-64 overflow-y-auto space-y-3">
                      {(result.qa as Array<{question: string; answer: string}>).map((item, i) => (
                        <div key={i} className="space-y-1">
                          <div className="text-xs text-emerald-400 font-medium">Q{i + 1}: {item.question}</div>
                          <div className="text-xs text-zinc-400">A: {item.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── ALL CAMPAIGNS ────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white">
                Semua Campaign ({campaigns.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { fetchCampaigns(); fetchStatus(); }}
                className="h-7 px-2 text-[10px] text-zinc-400 hover:text-white"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {campaigns.map((c) => (
              <div
                key={c.id}
                onClick={() => handleCampaignChange(c.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-zinc-800/50 ${
                  selectedCampaign === c.id
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'border-zinc-800 bg-zinc-800/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.score !== null ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    <span className="text-sm text-white font-medium truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {c.score !== null && (
                      <>
                        <span className={`text-sm font-bold ${getScoreColor(c.score)}`}>
                          {c.score}
                        </span>
                        <span className="text-[10px] text-zinc-500">/23</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getGradeColor(c.grade)}`}>
                          {c.grade}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                {c.contentPreview && (
                  <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">{c.contentPreview}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between text-[10px] text-zinc-600">
          <span>Rally Brain v7.0 — File-based CLI</span>
          <span className="font-mono">{campaigns.length} campaign(s)</span>
        </div>
      </footer>
    </div>
  );
}
