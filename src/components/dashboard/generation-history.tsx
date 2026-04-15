'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { GenerationRecord, CampaignData } from './dashboard-client';

interface Props {
  generations: GenerationRecord[];
  campaigns: CampaignData[];
  formatTimestamp: (iso: string | null) => string;
}

export function GenerationHistory({ generations, campaigns, formatTimestamp }: Props) {
  // Score trend data — group by campaign
  const scoreTrendData: Array<{ name: string; campaign: string; date: string }> = [];
  const completedGens = generations.filter(
    (g) => g.status === 'completed' && g.predictedScore !== null
  );

  completedGens.forEach((g) => {
    const date = new Date(g.createdAt);
    scoreTrendData.push({
      name: `${date.getDate()}/${date.getMonth() + 1}`,
      campaign: g.campaignName,
      date: g.createdAt,
      skor: g.predictedScore!,
    });
  });

  // Calibration data (predicted vs actual)
  const calibrationData = generations
    .filter((g) => g.predictedScore !== null && g.actualScore !== null)
    .map((g) => ({
      name: g.campaignName,
      diprediksi: g.predictedScore!,
      aktual: g.actualScore!,
    }));

  // Group score trend by campaign for multi-line chart
  const campaignNames = [...new Set(scoreTrendData.map((d) => d.campaign))];
  const uniqueDates = [...new Set(scoreTrendData.map((d) => d.name))];

  const multiLineData = uniqueDates.map((date) => {
    const point: Record<string, unknown> = { name: date };
    campaignNames.forEach((campaign) => {
      const match = scoreTrendData.find(
        (d) => d.name === date && d.campaign === campaign
      );
      point[campaign] = match?.skor ?? null;
    });
    return point;
  });

  const chartColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <CardContent className="p-4">
            <span className="text-xs text-zinc-500 block mb-1">Total Generasi</span>
            <p className="text-xl font-bold text-white">{generations.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <CardContent className="p-4">
            <span className="text-xs text-zinc-500 block mb-1">Berhasil</span>
            <p className="text-xl font-bold text-emerald-400">
              {generations.filter((g) => g.status === 'completed').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <CardContent className="p-4">
            <span className="text-xs text-zinc-500 block mb-1">Rata-rata Skor</span>
            <p className="text-xl font-bold text-white">
              {completedGens.length > 0
                ? (completedGens.reduce((sum, g) => sum + (g.predictedScore ?? 0), 0) / completedGens.length).toFixed(1)
                : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <CardContent className="p-4">
            <span className="text-xs text-zinc-500 block mb-1">Waktu Proses Rata-rata</span>
            <p className="text-xl font-bold text-white">
              {generations.length > 0
                ? `${Math.round(generations.reduce((sum, g) => sum + g.processingTimeMs, 0) / generations.length)}ms`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Generation Results Table */}
      <Card className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-zinc-400" />
            Riwayat Generasi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400 text-xs">Tanggal</TableHead>
                  <TableHead className="text-zinc-400 text-xs">Campaign</TableHead>
                  <TableHead className="text-zinc-400 text-xs text-right hidden sm:table-cell">Prediksi</TableHead>
                  <TableHead className="text-zinc-400 text-xs text-right hidden md:table-cell">Aktual</TableHead>
                  <TableHead className="text-zinc-400 text-xs text-center hidden lg:table-cell">Delta</TableHead>
                  <TableHead className="text-zinc-400 text-xs text-center">Status</TableHead>
                  <TableHead className="text-zinc-400 text-xs text-right">Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generations.length === 0 ? (
                  <TableRow className="border-zinc-800">
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500 text-sm">
                      Belum ada riwayat generasi.
                    </TableCell>
                  </TableRow>
                ) : (
                  generations.map((gen) => (
                    <TableRow key={gen.id} className="border-zinc-800/50 hover:bg-zinc-800/30">
                      <TableCell className="text-xs text-zinc-400 font-mono">
                        {formatTimestamp(gen.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-200 font-medium">
                        {gen.campaignName}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden sm:table-cell">
                        {gen.predictedScore !== null ? (
                          <span className="text-emerald-400 font-medium">
                            {gen.predictedScore.toFixed(1)}/21
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell">
                        {gen.actualScore !== null ? (
                          <span className="text-white font-medium">
                            {gen.actualScore.toFixed(1)}/21
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {gen.scoreDelta !== null ? (
                          <span className={`text-xs font-medium flex items-center justify-center gap-0.5 ${
                            Math.abs(gen.scoreDelta) < 1
                              ? 'text-emerald-400'
                              : gen.scoreDelta < 0
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}>
                            {gen.scoreDelta > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : gen.scoreDelta < 0 ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : null}
                            {gen.scoreDelta > 0 ? '+' : ''}{gen.scoreDelta.toFixed(2)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {gen.status === 'completed' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Selesai
                          </Badge>
                        ) : gen.status === 'failed' ? (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Gagal
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Proses
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-zinc-500 font-mono">
                        {gen.processingTimeMs > 0 ? `${gen.processingTimeMs}ms` : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Trend */}
        <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-zinc-400" />
              Tren Skor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {multiLineData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-zinc-500">
                Belum ada data tren
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={multiLineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 10 }} />
                  <YAxis domain={[0, 21]} tick={{ fill: '#52525b', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#a1a1aa' }} />
                  {campaignNames.map((campaign, i) => (
                    <Line
                      key={campaign}
                      type="monotone"
                      dataKey={campaign}
                      stroke={chartColors[i % chartColors.length]}
                      strokeWidth={2}
                      dot={{ fill: chartColors[i % chartColors.length], r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Calibration Chart */}
        <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-zinc-400" />
              Kalibrasi: Prediksi vs Aktual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calibrationData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-zinc-500">
                Belum ada data kalibrasi (butuh skor aktual dari Rally.fun)
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    type="number"
                    dataKey="diprediksi"
                    name="Prediksi"
                    tick={{ fill: '#52525b', fontSize: 10 }}
                    domain={[0, 21]}
                    label={{ value: 'Diprediksi', position: 'bottom', fill: '#52525b', fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="aktual"
                    name="Aktual"
                    tick={{ fill: '#52525b', fontSize: 10 }}
                    domain={[0, 21]}
                    label={{ value: 'Aktual', angle: -90, position: 'left', fill: '#52525b', fontSize: 10 }}
                  />
                  <ZAxis range={[40, 40]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => value.toFixed(2)}
                  />
                  <ReferenceLine
                    segment={[
                      { x: 0, y: 0 },
                      { x: 21, y: 21 },
                    ]}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                  <Scatter
                    data={calibrationData}
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
