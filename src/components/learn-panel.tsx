'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Play, Square, RefreshCw, Database } from 'lucide-react';
import type { LearnResult, CampaignMetadata, Patterns } from '@/lib/types';

interface LearnPanelProps {
  campaignAddress: string;
}

export function LearnPanel({ campaignAddress }: LearnPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LearnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cronStatus, setCronStatus] = useState<'idle' | 'starting' | 'active'>('idle');
  const [metadata, setMetadata] = useState<CampaignMetadata | null>(null);
  const [patterns, setPatterns] = useState<Patterns | null>(null);

  const slug = campaignAddress.toLowerCase().substring(0, 10);

  const fetchKnowledge = async () => {
    try {
      const res = await fetch(`/api/rally/knowledge/${slug}`);
      const data = await res.json();
      setMetadata(data.metadata);
      setPatterns(data.patterns);
    } catch {
      // Knowledge may not exist yet
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, [campaignAddress]);

  const handleLearn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rally/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignAddress }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      await fetchKnowledge();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Learn failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCron = async () => {
    setCronStatus('starting');
    setError(null);
    try {
      const res = await fetch('/api/rally/learn/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignAddress, intervalMs: 6 * 60 * 60 * 1000 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCronStatus('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start auto-learn');
      setCronStatus('idle');
    }
  };

  const handleStopCron = async () => {
    try {
      const res = await fetch('/api/rally/learn/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignAddress }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCronStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop auto-learn');
    }
  };

  const gradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'bg-emerald-600 text-white';
      case 'A': return 'bg-sky-600 text-white';
      case 'B': return 'bg-amber-500 text-white';
      case 'C': return 'bg-red-500 text-white';
      default: return '';
    }
  };

  const totalSubmissions = metadata?.totalSubmissions || result?.totalSubmissions || 0;
  const gradeDist = metadata?.gradeDistribution || { S: 0, A: 0, B: 0, C: 0 };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="size-5 text-emerald-600" />
            Learn from Submissions
          </CardTitle>
          <CardDescription>
            Fetch real submissions from Rally.fun, extract patterns, and build knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleLearn}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Brain className="size-4" />
              )}
              {loading ? 'Learning...' : 'Run Learn'}
            </Button>

            <Button
              onClick={handleStartCron}
              disabled={cronStatus === 'active' || cronStatus === 'starting'}
              variant="outline"
            >
              <Play className="size-4" />
              {cronStatus === 'starting' ? 'Starting...' : cronStatus === 'active' ? 'Auto-Learn Active' : 'Auto-Learn (6h)'}
            </Button>

            {cronStatus === 'active' && (
              <Button
                onClick={handleStopCron}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Square className="size-4" />
                Stop
              </Button>
            )}
          </div>

          {cronStatus === 'active' && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Auto-learn running every 6 hours
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg border bg-emerald-50 p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-800">
                Learn complete!
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-emerald-700">
                <span><strong>{result.newSubmissions}</strong> new submissions</span>
                <span><strong>{result.totalSubmissions}</strong> total in knowledge base</span>
                <span>Patterns: {result.patternsExtracted ? '✓' : '✗'}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Stats */}
      {metadata && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="size-4 text-zinc-500" />
                Knowledge Base Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{totalSubmissions}</p>
                  <p className="text-xs text-muted-foreground">Total Submissions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {metadata.lastLearnAt
                      ? new Date(metadata.lastLearnAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Never'}
                  </p>
                  <p className="text-xs text-muted-foreground">Last Learn</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Grade Distribution</p>
                <div className="space-y-1.5">
                  {(['S', 'A', 'B', 'C'] as const).map((grade) => {
                    const count = gradeDist[grade];
                    const pct = totalSubmissions > 0 ? (count / totalSubmissions) * 100 : 0;
                    return (
                      <div key={grade} className="flex items-center gap-2">
                        <Badge className={`${gradeColor(grade)} w-8 justify-center`}>{grade}</Badge>
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-12 text-right">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {patterns && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Extracted Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-80 overflow-y-auto">
                {patterns.topPhrases.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-emerald-700 mb-2">Top Performing Themes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {patterns.topPhrases.slice(0, 10).map((p) => (
                        <Badge key={p.phrase} variant="secondary" className="text-xs">
                          {p.phrase} <span className="text-muted-foreground ml-1">×{p.frequency}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {patterns.rejectionReasons.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-2">Common Issues</p>
                    <div className="flex flex-wrap gap-1.5">
                      {patterns.rejectionReasons.slice(0, 8).map((p) => (
                        <Badge key={p.phrase} variant="outline" className="text-xs border-red-200 text-red-700">
                          {p.phrase} <span className="text-muted-foreground ml-1">×{p.frequency}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {patterns.categoryInsights && Object.keys(patterns.categoryInsights).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Category Insights</p>
                    <div className="space-y-2">
                      {Object.entries(patterns.categoryInsights).slice(0, 4).map(([cat, insight]) => (
                        <div key={cat} className="text-xs space-y-0.5">
                          <p className="font-medium">{cat}</p>
                          {insight.highScorePattern && (
                            <p className="text-emerald-700 truncate">✓ {insight.highScorePattern}</p>
                          )}
                          {insight.lowScorePattern && (
                            <p className="text-red-600 truncate">✗ {insight.lowScorePattern}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Last extracted: {new Date(patterns.lastExtractedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!metadata && !loading && !result && (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="size-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Run &ldquo;Learn&rdquo; to build the knowledge base for this campaign</p>
        </div>
      )}
    </div>
  );
}
