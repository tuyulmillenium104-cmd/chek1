'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Play,
  RefreshCw,
  Database,
  TrendingUp,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { PipelineStatusData, PipelineRunRecord } from './dashboard-client';

interface Props {
  data: PipelineStatusData;
  recentRuns: PipelineRunRecord[];
  onRefresh: () => void;
  formatTimestamp: (iso: string | null) => string;
}

export function PipelineStatus({ data, recentRuns, onRefresh, formatTimestamp }: Props) {
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);

  const handleRunPipeline = async () => {
    setRunningPipeline(true);
    setPipelineResult(null);
    try {
      const res = await fetch('/api/v7/pipeline/run', { method: 'POST' });
      const json = await res.json();
      setPipelineResult(json.message || (json.success ? 'Berhasil' : 'Gagal'));
      if (json.success) {
        setTimeout(() => onRefresh(), 1000);
      }
    } catch {
      setPipelineResult('Gagal menghubungi server');
    } finally {
      setRunningPipeline(false);
    }
  };

  const successRatePct = Math.round(data.successRate * 100);

  return (
    <div className="space-y-4">
      {/* Pipeline Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          label="Total Eksekusi"
          value={String(data.totalRuns)}
          sub={`Berhasil: ${data.successfulRuns}`}
          color="emerald"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
          label="Tingkat Keberhasilan"
          value={`${successRatePct}%`}
          sub={<Progress value={successRatePct} className="h-1.5 mt-1" />}
          color="blue"
        />
        <StatCard
          icon={<Database className="w-4 h-4 text-purple-400" />}
          label="Submisi Terkumpul"
          value={String(data.totalSubmissionsCollected)}
          sub={`${data.campaignsProcessed} campaign`}
          color="purple"
        />
        <StatCard
          icon={<Zap className="w-4 h-4 text-amber-400" />}
          label="Model Terlatih"
          value={String(data.modelsTrained)}
          sub={data.lastRun ? formatTimestamp(data.lastRun) : 'Belum ada'}
          color="amber"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleRunPipeline}
          disabled={runningPipeline}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/20 border-0"
        >
          {runningPipeline ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Jalankan Pipeline
        </Button>

        {data.lastRunSuccess ? (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Terakhir: Berhasil
          </Badge>
        ) : data.totalRuns > 0 ? (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Terakhir: Gagal
          </Badge>
        ) : null}
      </div>

      {/* Pipeline Result Message */}
      {pipelineResult && (
        <div className={`px-4 py-2.5 rounded-lg text-sm border ${
          pipelineResult.includes('berhasil') || pipelineResult.includes('Berhasil')
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {pipelineResult}
        </div>
      )}

      {/* Last Run Info */}
      <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            Pipeline Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500 text-xs">Waktu</span>
              <p className="text-zinc-200 font-mono text-xs mt-0.5">
                {data.lastRun ? formatTimestamp(data.lastRun) : 'Belum pernah dijalankan'}
              </p>
            </div>
            <div>
              <span className="text-zinc-500 text-xs">Status</span>
              <p className="mt-0.5">
                {data.totalRuns === 0 ? (
                  <span className="text-zinc-500 text-xs">Belum ada eksekusi</span>
                ) : data.lastRunSuccess ? (
                  <span className="text-emerald-400 text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Berhasil
                  </span>
                ) : (
                  <span className="text-red-400 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Gagal
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-zinc-500 text-xs">Berhasil</span>
              <p className="text-zinc-200 text-xs mt-0.5">{data.successfulRuns} eksekusi</p>
            </div>
            <div>
              <span className="text-zinc-500 text-xs">Gagal</span>
              <p className="text-zinc-200 text-xs mt-0.5">{data.failedRuns} eksekusi</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs text-zinc-500 font-medium">{label}</span>
        </div>
        <p className="text-xl font-bold text-white">{value}</p>
        <div className="mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}
