'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, AlertTriangle, Copy, Check } from 'lucide-react';
import type { RallyCampaign, PipelineResult, JudgeResponse } from '@/lib/types';

interface GeneratePanelProps {
  campaign: RallyCampaign;
  onResult: (result: PipelineResult | null) => void;
}

export function GeneratePanel({ campaign, onResult }: GeneratePanelProps) {
  const [missionId, setMissionId] = useState<string>('');
  const [customBrief, setCustomBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [copied, setCopied] = useState(false);

  const activeMissions = campaign.missions?.filter(m => m.active) || [];

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    onResult(null);
    try {
      const res = await fetch('/api/rally/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignAddress: campaign.intelligentContractAddress,
          missionId: missionId || undefined,
          customBrief: customBrief || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      onResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const copyContent = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-amber-500" />
            Generate Content
          </CardTitle>
          <CardDescription>
            AI-powered content generation with automatic quality judging and retry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeMissions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Mission</label>
              <Select value={missionId} onValueChange={setMissionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a mission (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific mission</SelectItem>
                  {activeMissions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Brief (optional)</label>
            <Textarea
              placeholder="Add specific instructions, topics, or angles for the content..."
              value={customBrief}
              onChange={(e) => setCustomBrief(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating & Judging...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate & Judge
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
        <div className="space-y-4">
          {/* Generated Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Generated Content</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={result.judgeResult.accepted ? 'default' : 'destructive'}>
                    Grade {result.judgeResult.grade}
                    {!result.judgeResult.accepted && ' — Rejected'}
                  </Badge>
                  {result.retries > 0 && (
                    <Badge variant="outline">
                      {result.retries} retr{result.retries === 1 ? 'y' : 'ies'}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.content}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyContent}
                  className="absolute top-2 right-2"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </Button>
              </div>

              {/* Quick Score Summary */}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div>
                  <span className="font-medium">Score:</span>{' '}
                  <span className={result.judgeResult.totalScore >= 13 ? 'text-emerald-600' : 'text-red-600'}>
                    {result.judgeResult.totalScore}/{result.judgeResult.maxScore}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className={`size-3.5 ${result.judgeResult.accepted ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <span>{result.judgeResult.feedback}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Judge Detail passed to parent */}
          <JudgeResultCard judgeResult={result.judgeResult} />
        </div>
      )}
    </div>
  );
}

function JudgeResultCard({ judgeResult }: { judgeResult: JudgeResponse }) {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Judge Results</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={gradeColor(judgeResult.grade)}>
              Grade {judgeResult.grade}
            </Badge>
            <Badge variant={judgeResult.accepted ? 'default' : 'destructive'}>
              {judgeResult.accepted ? 'Accepted' : 'Rejected'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Per-category scores */}
        {judgeResult.scores.map((score) => {
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

        {/* Summary */}
        <div className="mt-4 pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total Score</span>
            <span className="font-mono font-bold text-lg">
              {judgeResult.totalScore}/{judgeResult.maxScore}
            </span>
          </div>
          {judgeResult.gradeSPrediction && (
            <p className="text-xs text-muted-foreground">
              <strong>Grade S Prediction:</strong> {judgeResult.gradeSPrediction}
            </p>
          )}
          {judgeResult.feedback && (
            <p className="text-xs text-muted-foreground mt-1">
              {judgeResult.feedback}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
