'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Gavel, Loader2 } from 'lucide-react';
import type { JudgeResponse } from '@/lib/types';

interface JudgePanelProps {
  campaignAddress: string;
}

export function JudgePanel({ campaignAddress }: JudgePanelProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JudgeResponse | null>(null);

  const handleJudge = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rally/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, campaignAddress }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Judge failed');
    } finally {
      setLoading(false);
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

  const scoreBarColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gavel className="size-5 text-violet-600" />
            Standalone Judge
          </CardTitle>
          <CardDescription>
            Paste any content to score it against the selected campaign criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your tweet content here to judge it..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
          <Button
            onClick={handleJudge}
            disabled={loading || !content.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Judging...
              </>
            ) : (
              <>
                <Gavel className="size-4" />
                Judge Content
              </>
            )}
          </Button>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Judge Results</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={gradeColor(result.grade)}>
                  Grade {result.grade}
                </Badge>
                <Badge variant={result.accepted ? 'default' : 'destructive'}>
                  {result.accepted ? 'Accepted' : 'Rejected'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.scores.map((score) => {
              const pct = Math.max(0, (score.score / score.maxScore) * 100);
              const isGate = score.maxScore <= 2;

              return (
                <div key={score.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{score.category}</span>
                      {isGate && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Gate
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono font-medium">
                      {score.score}/{score.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreBarColor(score.score, score.maxScore)}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{score.analysis}</p>
                </div>
              );
            })}

            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total Score</span>
                <span className="font-mono font-bold text-lg">
                  {result.totalScore}/{result.maxScore}
                </span>
              </div>
              {result.gradeSPrediction && (
                <p className="text-xs text-muted-foreground">
                  <strong>Grade S Prediction:</strong> {result.gradeSPrediction}
                </p>
              )}
              {result.feedback && (
                <p className="text-xs text-muted-foreground">{result.feedback}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
