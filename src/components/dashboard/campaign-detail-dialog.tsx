'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  ExternalLink,
  BarChart3,
  PieChart,
} from 'lucide-react';
import type { CampaignData, TopSubmission } from './dashboard-client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignData | null;
  topSubmissions: TopSubmission[];
}

export function CampaignDetailDialog({ open, onOpenChange, campaign, topSubmissions }: Props) {
  if (!campaign) return null;

  const intel = campaign.intelligence;
  const model = campaign.predictionModel;

  // Score distribution data for histogram
  const scoreDistribution = generateScoreDistribution(intel?.scoreStats);

  // Category comparison data for radar chart
  const categoryComparisonData = (intel?.categoryAverages ?? []).map((cat) => ({
    category: shortenCatName(cat.name),
    rata_rata: cat.avgPct,
    batas_top10: intel?.top10Threshold ? Math.min(intel.top10Threshold * 1.2, 100) : cat.avgPct + 15,
    batas_rata: intel?.averageThreshold ?? cat.avgPct,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-zinc-900 border-zinc-800 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800">
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                campaign.isActive ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
            />
            {campaign.name}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            {campaign.campaignAddress && (
              <span className="text-xs text-zinc-500 font-mono">
                {campaign.campaignAddress.slice(0, 6)}...{campaign.campaignAddress.slice(-4)}
              </span>
            )}
            <Badge
              variant="outline"
              className={`text-xs ${
                campaign.isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700'
              }`}
            >
              {campaign.isActive ? 'Aktif' : 'Nonaktif'}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Stats Cards */}
            {intel && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MiniStat label="Total Submisi" value={String(intel.totalSubmissions)} icon={<Target className="w-3.5 h-3.5 text-zinc-400" />} />
                <MiniStat label="Valid" value={String(intel.totalValid)} icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />} />
                <MiniStat label="Rata-rata" value={`${intel.scoreStats.mean.toFixed(1)}/21`} icon={<BarChart3 className="w-3.5 h-3.5 text-blue-400" />} />
                <MiniStat label="Median" value={`${intel.scoreStats.median.toFixed(1)}/21`} icon={<PieChart className="w-3.5 h-3.5 text-purple-400" />} />
                <MiniStat label="Rentang" value={`${intel.scoreStats.min.toFixed(1)}-${intel.scoreStats.max.toFixed(1)}`} icon={<TrendingDown className="w-3.5 h-3.5 text-amber-400" />} />
              </div>
            )}

            {/* Percentile Thresholds */}
            {intel && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Ambang Batas Skor</h4>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Top 10%', value: intel.top10Threshold, color: 'emerald' },
                    { label: 'Top 25%', value: intel.top25Threshold, color: 'teal' },
                    { label: 'Top 50%', value: intel.top50Threshold, color: 'blue' },
                    { label: 'Rata-rata', value: intel.averageThreshold, color: 'zinc' },
                  ].map((t) => (
                    <div key={t.label} className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <span className="text-[10px] text-zinc-500 uppercase">{t.label}</span>
                      <p className="text-lg font-bold text-white mt-0.5">{t.value.toFixed(0)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Averages */}
            {intel && intel.categoryAverages.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Rata-rata Kategori</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category Bars */}
                  <div className="space-y-2">
                    {intel.categoryAverages.map((cat) => (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400 w-28 truncate flex-shrink-0" title={cat.name}>
                          {shortenCatName(cat.name)}
                        </span>
                        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              cat.avgPct >= 70
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : cat.avgPct >= 50
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                : 'bg-gradient-to-r from-red-500 to-orange-400'
                            }`}
                            style={{ width: `${Math.min(cat.avgPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-zinc-400 w-10 text-right">
                          {cat.avgPct}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Radar Chart */}
                  <div className="bg-zinc-800/30 rounded-xl p-3">
                    <ResponsiveContainer width="100%" height={240}>
                      <RadarChart data={categoryComparisonData}>
                        <PolarGrid stroke="#27272a" />
                        <PolarAngleAxis
                          dataKey="category"
                          tick={{ fill: '#a1a1aa', fontSize: 10 }}
                        />
                        <PolarRadiusAxis
                          tick={{ fill: '#52525b', fontSize: 9 }}
                          domain={[0, 100]}
                        />
                        <Radar
                          name="Rata-rata Kamu"
                          dataKey="rata_rata"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                        <Radar
                          name="Batas Top 10%"
                          dataKey="batas_top10"
                          stroke="#f59e0b"
                          fill="#f59e0b"
                          fillOpacity={0.05}
                          strokeDasharray="4 4"
                          strokeWidth={1}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 10, color: '#a1a1aa' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Strong/Weak Categories */}
            {intel && (intel.strongCategories.length > 0 || intel.weakCategories.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {intel.strongCategories.length > 0 && (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Kategori Kuat
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {intel.strongCategories.map((cat) => (
                        <Badge key={cat} className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {intel.weakCategories.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Kategori Lemah
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {intel.weakCategories.map((cat) => (
                        <Badge key={cat} className="text-xs bg-red-500/10 text-red-400 border-red-500/20">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Model Info */}
            {model && (
              <>
                <Separator className="bg-zinc-800" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    Model Prediksi
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <span className="text-[10px] text-zinc-500 uppercase">MAE</span>
                      <p className={`text-lg font-bold mt-0.5 ${model.mae < 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {model.mae.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <span className="text-[10px] text-zinc-500 uppercase">R²</span>
                      <p className={`text-lg font-bold mt-0.5 ${model.r2 > 0.5 ? 'text-emerald-400' : model.r2 > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                        {model.r2.toFixed(3)}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <span className="text-[10px] text-zinc-500 uppercase">Sampel</span>
                      <p className="text-lg font-bold text-white mt-0.5">{model.sampleCount}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Top Submissions Table */}
            {topSubmissions.length > 0 && (
              <>
                <Separator className="bg-zinc-800" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    Top Submisi ({topSubmissions.length})
                  </h4>
                  <div className="bg-zinc-800/30 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-700/50 hover:bg-transparent">
                          <TableHead className="text-zinc-400 text-xs">#</TableHead>
                          <TableHead className="text-zinc-400 text-xs">Pengguna</TableHead>
                          <TableHead className="text-zinc-400 text-xs text-right">Skor</TableHead>
                          <TableHead className="text-zinc-400 text-xs text-right hidden sm:table-cell">Persentase</TableHead>
                          <TableHead className="text-zinc-400 text-xs text-right">Tautan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topSubmissions.map((sub, i) => (
                          <TableRow key={sub.id} className="border-zinc-800/50 hover:bg-zinc-800/30">
                            <TableCell className="text-zinc-500 text-xs">
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                            </TableCell>
                            <TableCell className="text-sm text-white font-medium">
                              @{sub.xUsername}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm font-bold text-emerald-400">
                                {sub.contentQualityScore.toFixed(1)}
                              </span>
                              <span className="text-xs text-zinc-500">/21</span>
                            </TableCell>
                            <TableCell className="text-right text-sm text-zinc-300 hidden sm:table-cell">
                              {sub.contentQualityPct.toFixed(0)}%
                            </TableCell>
                            <TableCell className="text-right">
                              <a
                                href={sub.tweetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 inline" />
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-zinc-500 uppercase">{label}</span>
      </div>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function shortenCatName(name: string): string {
  const map: Record<string, string> = {
    'Originality and Authenticity': 'Orisinalitas',
    'Content Alignment': 'Kesesuaian',
    'Information Accuracy': 'Akurasi',
    'Campaign Compliance': 'Kepatuhan',
    'Engagement Potential': 'Engagement',
    'Technical Quality': 'Teknis',
    'Reply Quality': 'Balasan',
  };
  return map[name] ?? name;
}

function generateScoreDistribution(stats?: { mean: number; median: number; min: number; max: number; p10: number; p25: number; p50: number; p75: number; p90: number }) {
  if (!stats || stats.mean === 0) return [];
  
  // Create synthetic distribution buckets
  const buckets = [];
  for (let i = 0; i <= 21; i++) {
    const lower = i - 0.5;
    const upper = i + 0.5;
    let count = 0;
    
    // Simulate a normal-ish distribution centered around mean
    const std = (stats.p90 - stats.p10) / 2.56;
    const z = (i - stats.mean) / Math.max(std, 1);
    const density = Math.exp(-0.5 * z * z);
    count = Math.round(density * 10);
    
    if (count > 0) {
      buckets.push({
        skor: String(i),
        jumlah: count,
        range: `${lower.toFixed(0)}-${upper.toFixed(0)}`,
      });
    }
  }
  
  return buckets;
}
