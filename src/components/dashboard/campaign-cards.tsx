'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  TrendingUp,
  Brain,
  Clock,
  ChevronRight,
} from 'lucide-react';
import type { CampaignData } from './dashboard-client';

interface Props {
  campaigns: CampaignData[];
  onClick: (campaign: CampaignData) => void;
  formatTimestamp: (iso: string | null) => string;
}

export function CampaignCards({ campaigns, onClick, formatTimestamp }: Props) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <Target className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-zinc-400">Belum Ada Campaign</h3>
        <p className="text-xs text-zinc-500 mt-1">
          Tambahkan campaign di tab Pengaturan untuk memulai.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-semibold text-white">Ringkasan Campaign</h3>
        <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
          {campaigns.length}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((campaign) => {
          const intel = campaign.intelligence;
          const avgScore = intel?.scoreStats.mean ?? 0;
          const avgPct = Math.round((avgScore / 21) * 100);
          const modelMae = campaign.predictionModel?.mae;

          return (
            <Card
              key={campaign.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-500/5 group"
              onClick={() => onClick(campaign)}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        campaign.isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-600'
                      }`}
                    />
                    <h4 className="text-sm font-semibold text-white truncate max-w-[180px]">
                      {campaign.name}
                    </h4>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                </div>

                {/* Score */}
                <div className="flex items-end gap-2 mb-3">
                  <span className={`text-2xl font-bold ${
                    avgPct >= 70 ? 'text-emerald-400' : avgPct >= 50 ? 'text-amber-400' : avgPct > 0 ? 'text-red-400' : 'text-zinc-600'
                  }`}>
                    {avgScore.toFixed(1)}
                  </span>
                  <span className="text-sm text-zinc-500 mb-0.5">/21</span>
                  <div className="ml-auto">
                    <Badge
                      variant="outline"
                      className={`text-xs px-2 py-0.5 ${
                        avgPct >= 70
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : avgPct >= 50
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : avgPct > 0
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}
                    >
                      {avgPct}%
                    </Badge>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-1 text-zinc-500">
                      <Target className="w-3 h-3" />
                      <span className="text-[10px]">Submisi</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-300 mt-0.5">
                      {intel?.totalSubmissions ?? 0}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-zinc-500">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-[10px]">Valid</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-300 mt-0.5">
                      {intel?.totalValid ?? 0}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-zinc-500">
                      <Brain className="w-3 h-3" />
                      <span className="text-[10px]">MAE</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-300 mt-0.5">
                      {modelMae ? modelMae.toFixed(2) : '—'}
                    </p>
                  </div>
                </div>

                {/* Last Generated */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 pt-3 border-t border-zinc-800">
                  <Clock className="w-3 h-3" />
                  {formatTimestamp(campaign.lastGeneratedAt)}
                </div>

                {/* Category Strengths */}
                {intel && (intel.strongCategories.length > 0 || intel.weakCategories.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {intel.strongCategories.slice(0, 2).map((cat) => (
                      <Badge
                        key={cat}
                        className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400/80 border-emerald-500/15"
                      >
                        ↑ {shortenCat(cat)}
                      </Badge>
                    ))}
                    {intel.weakCategories.slice(0, 2).map((cat) => (
                      <Badge
                        key={cat}
                        className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-400/80 border-red-500/15"
                      >
                        ↓ {shortenCat(cat)}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function shortenCat(name: string): string {
  const map: Record<string, string> = {
    'Originality and Authenticity': 'Orisinalitas',
    'Content Alignment': 'Kesesuaian',
    'Information Accuracy': 'Akurasi',
    'Campaign Compliance': 'Kepatuhan',
    'Engagement Potential': 'Engagement',
    'Technical Quality': 'Teknis',
    'Reply Quality': 'Kualitas Balas',
  };
  return map[name] ?? name.split(' ')[0];
}
