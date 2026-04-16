'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import type { CampaignMetadata, Patterns } from '@/lib/types';

interface KnowledgeStatsProps {
  campaignAddress: string;
}

export function KnowledgeStats({ campaignAddress }: KnowledgeStatsProps) {
  const [metadata, setMetadata] = useState<CampaignMetadata | null>(null);
  const [patterns, setPatterns] = useState<Patterns | null>(null);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [loading, setLoading] = useState(true);

  const slug = campaignAddress.toLowerCase().substring(0, 10);

  useEffect(() => {
    const fetchKnowledge = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rally/knowledge/${slug}`);
        const data = await res.json();
        setMetadata(data.metadata);
        setPatterns(data.patterns);
        setTotalSubmissions(data.totalSubmissions);
      } catch {
        // Knowledge may not exist yet
      } finally {
        setLoading(false);
      }
    };
    fetchKnowledge();
  }, [campaignAddress, slug]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metadata && !patterns) {
    return null;
  }

  const gradeDist = metadata?.gradeDistribution || { S: 0, A: 0, B: 0, C: 0 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-zinc-500" />
          Knowledge Insights
        </CardTitle>
        {metadata?.lastLearnAt && (
          <CardDescription>
            Last updated: {new Date(metadata.lastLearnAt).toLocaleString()}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {/* Grade Distribution Mini */}
        {totalSubmissions > 0 && (
          <div className="flex flex-wrap gap-2">
            {(['S', 'A', 'B', 'C'] as const).map((g) => {
              const count = gradeDist[g];
              if (count === 0) return null;
              const color = g === 'S' ? 'bg-emerald-600 text-white' : g === 'A' ? 'bg-sky-600 text-white' : g === 'B' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white';
              return (
                <Badge key={g} className={color}>
                  {g}: {count}
                </Badge>
              );
            })}
            <Badge variant="outline">{totalSubmissions} total</Badge>
          </div>
        )}

        {/* Category Insights Summary */}
        {patterns?.categoryInsights && Object.keys(patterns.categoryInsights).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Category Insights</p>
            {Object.entries(patterns.categoryInsights).slice(0, 4).map(([cat, insight]) => (
              <div key={cat} className="rounded-lg border p-2 text-xs space-y-1">
                <p className="font-medium text-sm">{cat}</p>
                {insight.highScorePattern && (
                  <p className="text-emerald-700 line-clamp-2">✓ {insight.highScorePattern}</p>
                )}
                {insight.lowScorePattern && (
                  <p className="text-red-600 line-clamp-2">✗ {insight.lowScorePattern}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
