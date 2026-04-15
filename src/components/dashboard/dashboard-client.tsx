'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  BarChart3,
  Brain,
  History,
  Settings,
  Zap,
  Bot,
  Cpu,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PipelineStatus } from './pipeline-status';
import { CampaignCards } from './campaign-cards';
import { CampaignDetailDialog } from './campaign-detail-dialog';
import { PredictionPanel } from './prediction-panel';
import { GenerationHistory } from './generation-history';
import { SettingsPanel } from './settings-panel';

// ─── Dashboard Types ────────────────────────────────────────────────

export interface PipelineStatusData {
  lastRun: string | null;
  lastRunSuccess: boolean;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  campaignsProcessed: number;
  totalSubmissionsCollected: number;
  modelsTrained: number;
}

export interface CategoryAverage {
  name: string;
  avgPct: number;
  avgScore: number;
  maxScore: number;
}

export interface TopPattern {
  category: string;
  topAvgPct: number;
  overallAvgPct: number;
  delta: number;
  insight: string;
}

export interface ScoreStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface IntelligenceData {
  totalSubmissions: number;
  totalValid: number;
  scoreStats: ScoreStats;
  categoryAverages: CategoryAverage[];
  weakCategories: string[];
  strongCategories: string[];
  topPatterns: TopPattern[];
  top10Threshold: number;
  top25Threshold: number;
  top50Threshold: number;
  averageThreshold: number;
}

export interface PredictionModelData {
  coefficients: number[];
  intercept: number;
  featureNames: string[];
  mae: number;
  r2: number;
  lastTrainedAt: string;
  sampleCount: number;
}

export interface CampaignData {
  id: string;
  name: string;
  campaignAddress: string | null;
  isActive: boolean;
  intelligence: IntelligenceData | null;
  predictionModel: PredictionModelData | null;
  lastGeneration: {
    id: string;
    status: string;
    predictedScore: number | null;
    actualScore: number | null;
    processingTimeMs: number;
    createdAt: string;
  } | null;
  lastGeneratedAt: string | null;
  createdAt: string;
}

export interface TopSubmission {
  campaignId: string;
  campaignName: string;
  id: string;
  xUsername: string;
  tweetUrl: string;
  contentQualityScore: number;
  contentQualityPct: number;
  categoryScores: Array<{
    name: string;
    score: number;
    maxScore: number;
    pct: number;
    analysis: string;
    isContent: boolean;
  }>;
}

export interface GenerationRecord {
  id: string;
  campaignId: string;
  campaignName: string;
  status: string;
  predictedScore: number | null;
  actualScore: number | null;
  scoreDelta: number | null;
  processingTimeMs: number;
  antiAIScore: number;
  createdAt: string;
}

export interface PipelineRunRecord {
  id: string;
  runType: string;
  status: string;
  submissionsFetched: number;
  submissionsNew: number;
  analysisGenerated: boolean;
  modelTrained: boolean;
  processingTimeMs: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface DashboardData {
  pipelineStatus: PipelineStatusData;
  campaigns: CampaignData[];
  topSubmissions: TopSubmission[];
  recentGenerations: GenerationRecord[];
  recentPipelineRuns: PipelineRunRecord[];
}

// ─── Main Client Component ──────────────────────────────────────────

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v7/dashboard');
      if (!res.ok) throw new Error('Gagal memuat data dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleCampaignClick = (campaign: CampaignData) => {
    setSelectedCampaign(campaign);
    setDetailOpen(true);
  };

  const handleDataRefresh = () => {
    fetchDashboard();
  };

  const formatTimestamp = (iso: string | null) => {
    if (!iso) return 'Belum pernah';
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Gagal Memuat Dashboard</h3>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Rally Brain
                </h1>
                <p className="text-[10px] font-mono text-emerald-400/80 -mt-0.5">v7.0 Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchDashboard}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 transition-all"
              >
                <Zap className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Muat Ulang
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 h-auto flex-wrap gap-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-600/20 rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-all flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Ikhtisar</span>
            </TabsTrigger>
            <TabsTrigger
              value="campaigns"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-600/20 rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-all flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Campaign</span>
            </TabsTrigger>
            <TabsTrigger
              value="predictions"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-600/20 rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-all flex items-center gap-2"
            >
              <Cpu className="w-4 h-4" />
              <span className="hidden sm:inline">Prediksi</span>
            </TabsTrigger>
            <TabsTrigger
              value="generations"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-600/20 rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-all flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Generasi</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-600/20 rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-all flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Pengaturan</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-6">
            {data && (
              <PipelineStatus
                data={data.pipelineStatus}
                recentRuns={data.recentPipelineRuns}
                onRefresh={handleDataRefresh}
                formatTimestamp={formatTimestamp}
              />
            )}
            {data && (
              <CampaignCards
                campaigns={data.campaigns}
                onClick={handleCampaignClick}
                formatTimestamp={formatTimestamp}
              />
            )}
            {data && (
              <RecentActivityFeed
                pipelineRuns={data.recentPipelineRuns}
                generations={data.recentGenerations}
                formatTimestamp={formatTimestamp}
              />
            )}
          </TabsContent>

          {/* Tab 2: Campaigns Detail */}
          <TabsContent value="campaigns" className="space-y-6">
            {data && (
              <CampaignsDetail
                campaigns={data.campaigns}
                topSubmissions={data.topSubmissions}
                onCampaignClick={handleCampaignClick}
                formatTimestamp={formatTimestamp}
              />
            )}
          </TabsContent>

          {/* Tab 3: Predictions */}
          <TabsContent value="predictions" className="space-y-6">
            {data && (
              <PredictionPanel
                campaigns={data.campaigns}
                onRefresh={handleDataRefresh}
              />
            )}
          </TabsContent>

          {/* Tab 4: Generation History */}
          <TabsContent value="generations" className="space-y-6">
            {data && (
              <GenerationHistory
                generations={data.recentGenerations}
                campaigns={data.campaigns}
                formatTimestamp={formatTimestamp}
              />
            )}
          </TabsContent>

          {/* Tab 5: Settings */}
          <TabsContent value="settings" className="space-y-6">
            {data && (
              <SettingsPanel
                pipelineStatus={data.pipelineStatus}
                campaigns={data.campaigns}
                onRefresh={handleDataRefresh}
                formatTimestamp={formatTimestamp}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Campaign Detail Dialog */}
      <CampaignDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        campaign={selectedCampaign}
        topSubmissions={
          data?.topSubmissions.filter(
            (s) => s.campaignId === selectedCampaign?.id
          ) ?? []
        }
      />

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-zinc-500">
          <span>Rally Brain v7.0 — Sistem Generasi Konten Cerdas</span>
          <span className="font-mono">
            {data?.pipelineStatus.lastRun
              ? `Terakhir: ${formatTimestamp(data.pipelineStatus.lastRun)}`
              : 'Belum ada data'}
          </span>
        </div>
      </footer>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg bg-zinc-800" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 bg-zinc-800" />
                <Skeleton className="h-3 w-20 bg-zinc-800" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-lg bg-zinc-800" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Skeleton className="h-10 w-full max-w-lg rounded-xl bg-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-zinc-800" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl bg-zinc-800" />
      </main>
    </div>
  );
}

// ─── Recent Activity Feed ───────────────────────────────────────────

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';

function RecentActivityFeed({
  pipelineRuns,
  generations,
  formatTimestamp,
}: {
  pipelineRuns: PipelineRunRecord[];
  generations: GenerationRecord[];
  formatTimestamp: (iso: string | null) => string;
}) {
  const allActivity: Array<{
    type: 'pipeline' | 'generation';
    id: string;
    title: string;
    subtitle: string;
    status: 'success' | 'warning' | 'error' | 'pending';
    timestamp: string;
  }> = [];

  pipelineRuns.slice(0, 3).forEach((run) => {
    allActivity.push({
      type: 'pipeline',
      id: run.id,
      title: `Pipeline ${run.runType === 'data_pipeline' ? 'Data' : 'Analisis'}`,
      subtitle: `${run.submissionsNew} baru | ${run.processingTimeMs}ms`,
      status: run.status === 'completed' ? 'success' : run.status === 'failed' ? 'error' : 'pending',
      timestamp: run.createdAt,
    });
  });

  generations.slice(0, 3).forEach((gen) => {
    allActivity.push({
      type: 'generation',
      id: gen.id,
      title: `Generasi: ${gen.campaignName}`,
      subtitle: gen.predictedScore
        ? `Skor diprediksi: ${gen.predictedScore.toFixed(1)}/21`
        : 'Menunggu...',
      status: gen.status === 'completed' ? 'success' : gen.status === 'failed' ? 'error' : 'pending',
      timestamp: gen.createdAt,
    });
  });

  allActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Aktivitas Terbaru</h3>
        </div>
        <span className="text-xs text-zinc-500 font-mono">{allActivity.length} aktivitas</span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {allActivity.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-500">
            Belum ada aktivitas. Jalankan pipeline untuk memulai.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {allActivity.map((activity) => (
              <div key={activity.id} className="px-5 py-3 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors">
                {statusIcon(activity.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {activity.type === 'pipeline' ? (
                      <ArrowDownToLine className="w-3 h-3 text-zinc-500" />
                    ) : (
                      <ArrowUpFromLine className="w-3 h-3 text-zinc-500" />
                    )}
                    <span className="text-sm text-zinc-200 truncate">{activity.title}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{activity.subtitle}</p>
                </div>
                <span className="text-xs text-zinc-600 font-mono whitespace-nowrap">
                  {formatTimestamp(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campaigns Detail (Tab 2) ───────────────────────────────────────

function CampaignsDetail({
  campaigns,
  topSubmissions,
  onCampaignClick,
  formatTimestamp,
}: {
  campaigns: CampaignData[];
  topSubmissions: TopSubmission[];
  onCampaignClick: (c: CampaignData) => void;
  formatTimestamp: (iso: string | null) => string;
}) {
  // Table, Badge, Button are imported at the top of the file

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Detail Campaign ({campaigns.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400 font-medium text-xs">Nama</TableHead>
              <TableHead className="text-zinc-400 font-medium text-xs hidden md:table-cell">Alamat</TableHead>
              <TableHead className="text-zinc-400 font-medium text-xs text-right">Submisi</TableHead>
              <TableHead className="text-zinc-400 font-medium text-xs text-right">Rata-rata</TableHead>
              <TableHead className="text-zinc-400 font-medium text-xs text-right hidden sm:table-cell">Top 10%</TableHead>
              <TableHead className="text-zinc-400 font-medium text-xs text-right hidden lg:table-cell">MAE</TableHead>
              <TableHead className="text-zinc-400 font-medium text-xs hidden xl:table-cell">Terakhir</TableHead>
              <TableHead className="text-zinc-400 font-medium text-xs text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow className="border-zinc-800">
                <TableCell colSpan={8} className="text-center py-8 text-zinc-500 text-sm">
                  Belum ada campaign. Tambahkan campaign di tab Pengaturan.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => (
                <TableRow
                  key={c.id}
                  className="border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  onClick={() => onCampaignClick(c)}
                >
                  <TableCell className="font-medium text-white text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${c.isActive ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                      {c.name}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-zinc-500 font-mono">
                      {c.campaignAddress
                        ? `${c.campaignAddress.slice(0, 6)}...${c.campaignAddress.slice(-4)}`
                        : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-zinc-300">
                    {c.intelligence?.totalSubmissions ?? 0}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <span className={`font-medium ${
                      (c.intelligence?.scoreStats.mean ?? 0) / 21 >= 0.7
                        ? 'text-emerald-400'
                        : (c.intelligence?.scoreStats.mean ?? 0) / 21 >= 0.5
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}>
                      {c.intelligence?.scoreStats.mean?.toFixed(1) ?? '—'}/21
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-zinc-400 hidden sm:table-cell">
                    {c.intelligence?.top10Threshold?.toFixed(0) ?? '—'}%
                  </TableCell>
                  <TableCell className="text-right text-sm text-zinc-400 hidden lg:table-cell">
                    {c.predictionModel?.mae ? (
                      c.predictionModel.mae < 2 ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                          {c.predictionModel.mae.toFixed(2)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                          {c.predictionModel.mae.toFixed(2)}
                        </Badge>
                      )
                    ) : '—'}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-xs text-zinc-500">
                      {formatTimestamp(c.lastGeneratedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-zinc-400 hover:text-white"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onCampaignClick(c);
                      }}
                    >
                      Detail →
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
