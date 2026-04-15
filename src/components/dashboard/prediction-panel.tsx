'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Cpu,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Target,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CampaignData } from './dashboard-client';

interface PredictionResult {
  success: boolean;
  predictedScore: number;
  predictedPct: number;
  maxScore: number;
  campaignName: string;
  model: {
    mae: number;
    r2: number;
    sampleCount: number;
    lastTrainedAt: string;
  };
  thresholds: {
    top10: number | null;
    top25: number | null;
    top50: number | null;
    average: number | null;
  } | null;
  contentLength: number;
  wordCount: number;
  error?: string;
}

interface Props {
  campaigns: CampaignData[];
  onRefresh: () => void;
}

export function PredictionPanel({ campaigns, onRefresh }: Props) {
  const [content, setContent] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<PredictionResult & { content: string; timestamp: string }>>([]);

  const handlePredict = async () => {
    if (!content.trim()) {
      setError('Konten tidak boleh kosong');
      return;
    }
    if (!selectedCampaignId) {
      setError('Pilih campaign terlebih dahulu');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/v7/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          campaignId: selectedCampaignId,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Gagal memprediksi');
        return;
      }

      setResult(json);

      // Add to history
      setHistory((prev) => [
        {
          ...json,
          content: content.trim().slice(0, 100),
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 9),
      ]);
    } catch {
      setError('Gagal menghubungi server');
    } finally {
      setLoading(false);
    }
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  // Feature breakdown visualization
  const featureBreakdown = result
    ? [
        { fitur: 'Panjang', nilai: result.contentLength, max: 1000 },
        { fitur: 'Kata', nilai: result.wordCount, max: 200 },
        { fitur: 'Skor', nilai: result.predictedScore, max: 21 },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Prediction Form */}
      <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Prediksi Skor Konten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campaign Selector */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Pilih Campaign</label>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
                <SelectValue placeholder="Pilih campaign..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {campaigns
                  .filter((c) => c.isActive && c.predictionModel)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{c.name}</span>
                        <span className="text-xs text-zinc-500">
                          MAE: {c.predictionModel?.mae.toFixed(2)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                {campaigns.filter((c) => c.isActive && c.predictionModel).length === 0 && (
                  <SelectItem value="__none" disabled>
                    Tidak ada campaign dengan model
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Content Input */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Konten untuk Diprediksi</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tempel konten yang ingin Anda prediksi skornya..."
              className="bg-zinc-800 border-zinc-700 text-sm min-h-[150px] resize-y placeholder:text-zinc-600"
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-zinc-500">
                {content.length} karakter · {content.split(/\s+/).filter(Boolean).length} kata
              </span>
              {selectedCampaign && (
                <Badge variant="outline" className="text-[10px] text-zinc-500">
                  Model: {selectedCampaign.predictionModel?.mae.toFixed(2)} MAE
                </Badge>
              )}
            </div>
          </div>

          {/* Predict Button */}
          <Button
            onClick={handlePredict}
            disabled={loading || !content.trim() || !selectedCampaignId}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/20 border-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Prediksi Skor
          </Button>

          {/* Error */}
          {error && (
            <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prediction Result */}
      <div className="space-y-4">
        {result ? (
          <>
            {/* Score Display */}
            <Card className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className={`p-6 text-center ${
                result.predictedPct >= 70
                  ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5'
                  : result.predictedPct >= 50
                  ? 'bg-gradient-to-br from-amber-500/10 to-yellow-500/5'
                  : 'bg-gradient-to-br from-red-500/10 to-orange-500/5'
              }`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-zinc-400" />
                  <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
                    Skor Diprediksi
                  </span>
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-5xl font-bold ${
                    result.predictedPct >= 70 ? 'text-emerald-400' : result.predictedPct >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {result.predictedScore.toFixed(1)}
                  </span>
                  <span className="text-lg text-zinc-500">/21</span>
                </div>
                <div className="mt-2">
                  <Badge
                    className={`text-xs px-3 py-1 ${
                      result.predictedPct >= 70
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : result.predictedPct >= 50
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}
                  >
                    {result.predictedPct.toFixed(1)}% — {result.predictedPct >= 70 ? 'Baik' : result.predictedPct >= 50 ? 'Cukup' : 'Perlu Perbaikan'}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Thresholds */}
                {result.thresholds && (
                  <div>
                    <h4 className="text-xs text-zinc-500 mb-2 font-medium">Ambang Batas Campaign</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Top 10%', val: result.thresholds.top10 },
                        { label: 'Top 25%', val: result.thresholds.top25 },
                        { label: 'Top 50%', val: result.thresholds.top50 },
                        { label: 'Rata-rata', val: result.thresholds.average },
                      ].map((t) => (
                        <div key={t.label} className="bg-zinc-800/50 rounded-lg p-2 text-center">
                          <span className="text-[10px] text-zinc-500">{t.label}</span>
                          <p className="text-xs font-bold text-white mt-0.5">
                            {t.val !== null ? `${t.val.toFixed(0)}%` : '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="bg-zinc-800" />

                {/* Model Info */}
                <div>
                  <h4 className="text-xs text-zinc-500 mb-2 font-medium">Info Model</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <span className="text-[10px] text-zinc-500">MAE</span>
                      <p className="text-sm font-bold text-white">{result.model.mae.toFixed(2)}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <span className="text-[10px] text-zinc-500">R²</span>
                      <p className="text-sm font-bold text-white">{result.model.r2.toFixed(3)}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <span className="text-[10px] text-zinc-500">Sampel</span>
                      <p className="text-sm font-bold text-white">{result.model.sampleCount}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Feature Chart */}
            <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
              <CardContent className="p-4">
                <h4 className="text-xs text-zinc-500 mb-3 font-medium">Ringkasan Fitur</h4>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={featureBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" tick={{ fill: '#52525b', fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="fitur"
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="nilai" radius={[0, 4, 4, 0]}>
                      {featureBreakdown.map((_, index) => (
                        <Cell key={index} fill={index === 2 ? '#10b981' : '#3f3f46'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
              <Cpu className="w-6 h-6 text-zinc-600" />
            </div>
            <h4 className="text-sm font-medium text-zinc-400">Belum Ada Prediksi</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Masukkan konten dan pilih campaign untuk memprediksi skor konten Anda menggunakan model ML.
            </p>
          </Card>
        )}
      </div>

      {/* Prediction History */}
      {history.length > 0 && (
        <Card className="bg-zinc-900 border border-zinc-800 rounded-xl lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-zinc-400" />
              Riwayat Prediksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    h.predictedPct >= 70
                      ? 'bg-emerald-500/10'
                      : h.predictedPct >= 50
                      ? 'bg-amber-500/10'
                      : 'bg-red-500/10'
                  }`}>
                    <span className={`text-sm font-bold ${
                      h.predictedPct >= 70 ? 'text-emerald-400' : h.predictedPct >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {h.predictedScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{h.content}...</p>
                    <p className="text-xs text-zinc-500">{h.campaignName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        h.predictedPct >= 70
                          ? 'text-emerald-400 border-emerald-500/20'
                          : h.predictedPct >= 50
                          ? 'text-amber-400 border-amber-500/20'
                          : 'text-red-400 border-red-500/20'
                      }`}
                    >
                      {h.predictedPct.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
