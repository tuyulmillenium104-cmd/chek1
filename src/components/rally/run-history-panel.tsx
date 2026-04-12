'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  BarChart3,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PipelineRun {
  id: string
  status: string
  bestScore: number | null
  verdict: string | null
  variations: number
  feedbackLoops: number
  pipelineTime: number | null
  bestAngle: string | null
  bestContent: string | null
  createdAt: string
}

interface RunStats {
  total: number
  completed: number
  failed: number
  avgScore: number
  bestScore: number
  improvementRate: number
}

function formatTime(seconds: number | null): string {
  if (!seconds) return 'N/A'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return `${diffDay}d ago`
}

function getVerdictColor(verdict: string | null): string {
  if (!verdict) return 'text-muted-foreground'
  const v = verdict.toLowerCase()
  if (v.includes('elite')) return 'text-emerald-400'
  if (v.includes('strong')) return 'text-emerald-400'
  if (v.includes('moderate')) return 'text-amber-400'
  return 'text-red-400'
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground'
  if (score >= 17) return 'text-emerald-400'
  if (score >= 15) return 'text-emerald-400'
  if (score >= 13) return 'text-amber-400'
  return 'text-red-400'
}

// --- CSS-only Score Trend Line ---
function ScoreTrendLine({ runs }: { runs: PipelineRun[] }) {
  const scoredRuns = runs.filter(r => r.bestScore != null && r.status === 'completed').reverse()
  if (scoredRuns.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center text-[10px] text-muted-foreground">
        Need at least 2 scored runs to show trend
      </div>
    )
  }

  const scores = scoredRuns.map(r => r.bestScore!)
  const maxScore = 18
  const minScore = Math.max(0, Math.min(...scores) - 1)
  const range = Math.max(maxScore - minScore, 1)

  // Generate SVG points
  const width = 100
  const height = 100
  const padding = 5
  const usableWidth = width - padding * 2
  const usableHeight = height - padding * 2

  const points = scores.map((score, i) => {
    const x = padding + (i / Math.max(scores.length - 1, 1)) * usableWidth
    const y = padding + usableHeight - ((score - minScore) / range) * usableHeight
    return `${x},${y}`
  })

  const linePath = `M ${points.join(' L ')}`
  const areaPath = `${linePath} L ${padding + usableWidth},${height - padding} L ${padding},${height - padding} Z`

  // Calculate improvement
  const lastScore = scores[scores.length - 1]
  const firstScore = scores[0]
  const trend = lastScore - firstScore

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Score Trend ({scoredRuns.length} runs)</span>
        <div className="flex items-center gap-1">
          {trend > 0 ? (
            <ArrowUpRight className="h-3 w-3 text-emerald-400" />
          ) : trend < 0 ? (
            <ArrowDownRight className="h-3 w-3 text-red-400" />
          ) : (
            <Minus className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={cn('text-[10px] font-mono font-bold', trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-muted-foreground')}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="relative h-24 w-full bg-muted/10 rounded-lg overflow-hidden">
        {/* Grid lines */}
        {[0, 6, 12, 18].map(score => {
          const y = padding + usableHeight - ((score - minScore) / range) * usableHeight
          return (
            <div
              key={score}
              className="absolute left-0 right-0 border-t border-border/20"
              style={{ top: `${y}%` }}
            >
              <span className="absolute -top-2 -left-1 text-[7px] text-muted-foreground font-mono">{score}</span>
            </div>
          )
        })}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#trendGradient)" />
          <path
            d={linePath}
            fill="none"
            stroke="rgb(16 185 129)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.split(',')[0]}
              cy={p.split(',')[1]}
              r="2.5"
              fill={i === points.length - 1 ? 'rgb(16 185 129)' : 'rgb(16 185 129)'}
              fillOpacity={i === points.length - 1 ? 1 : 0.6}
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

// --- Stats Cards ---
function StatsCards({ stats }: { stats: RunStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="bg-muted/20 rounded-lg p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <BarChart3 className="h-3 w-3 text-emerald-400" />
          <p className="text-[9px] text-muted-foreground uppercase">Total Runs</p>
        </div>
        <p className="text-sm font-bold font-mono">{stats.total}</p>
        <p className="text-[8px] text-muted-foreground">
          {stats.completed} done, {stats.failed} failed
        </p>
      </div>
      <div className="bg-muted/20 rounded-lg p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <Trophy className="h-3 w-3 text-amber-400" />
          <p className="text-[9px] text-muted-foreground uppercase">Best Score</p>
        </div>
        <p className={cn('text-sm font-bold font-mono', getScoreColor(stats.bestScore))}>
          {stats.bestScore > 0 ? `${stats.bestScore.toFixed(1)}` : '—'}
        </p>
        <p className="text-[8px] text-muted-foreground">out of 18</p>
      </div>
      <div className="bg-muted/20 rounded-lg p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <Zap className="h-3 w-3 text-emerald-400" />
          <p className="text-[9px] text-muted-foreground uppercase">Avg Score</p>
        </div>
        <p className={cn('text-sm font-bold font-mono', getScoreColor(stats.avgScore))}>
          {stats.avgScore > 0 ? `${stats.avgScore.toFixed(1)}` : '—'}
        </p>
        <p className="text-[8px] text-muted-foreground">per run</p>
      </div>
      <div className="bg-muted/20 rounded-lg p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <TrendingUp className="h-3 w-3 text-emerald-400" />
          <p className="text-[9px] text-muted-foreground uppercase">Improvement</p>
        </div>
        <p className={cn(
          'text-sm font-bold font-mono',
          stats.improvementRate > 0 ? 'text-emerald-400' :
          stats.improvementRate < 0 ? 'text-red-400' : 'text-muted-foreground'
        )}>
          {stats.improvementRate !== 0 ? `${stats.improvementRate > 0 ? '+' : ''}${stats.improvementRate.toFixed(1)}%` : '—'}
        </p>
        <p className="text-[8px] text-muted-foreground">first → last</p>
      </div>
    </div>
  )
}

// --- Timeline Item ---
function TimelineItem({ run, index }: { run: PipelineRun; index: number }) {
  const isSuccess = run.status === 'completed'
  const isError = run.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex gap-3 group"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold border',
          isSuccess ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
          isError ? 'bg-red-500/15 text-red-400 border-red-500/30' :
          'bg-muted/30 text-muted-foreground border-border/30'
        )}>
          {isSuccess ? <Zap className="h-3 w-3" /> : isError ? <X className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
        </div>
        <div className={cn(
          'w-px flex-1 min-h-[20px] mt-1',
          isSuccess ? 'bg-emerald-500/20' : 'bg-border/20'
        )} />
      </div>

      {/* Content */}
      <div className={cn(
        'flex-1 pb-3 min-w-0 rounded-lg border p-2.5 transition-colors',
        isSuccess ? 'bg-card/30 border-border/30 hover:border-emerald-500/20' :
        'bg-card/30 border-border/30'
      )}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-muted-foreground font-mono">{formatRelativeTime(run.createdAt)}</span>
            {run.verdict && (
              <Badge variant="outline" className={cn(
                'text-[8px] px-1 py-0',
                getVerdictColor(run.verdict)
              )}>
                {run.verdict}
              </Badge>
            )}
          </div>
          {run.bestScore !== null && (
            <span className={cn('text-xs font-bold font-mono shrink-0', getScoreColor(run.bestScore))}>
              {run.bestScore.toFixed(1)}/18
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[9px] text-muted-foreground">
          <span>{run.variations} variations</span>
          {run.feedbackLoops > 0 && <span>{run.feedbackLoops} feedback loops</span>}
          {run.pipelineTime !== null && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2 w-2" />
              {formatTime(run.pipelineTime)}
            </span>
          )}
        </div>

        {run.bestAngle && (
          <p className="text-[9px] text-foreground/60 mt-1 truncate">
            Angle: {run.bestAngle}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// --- Main Export ---
export function RunHistoryPanel() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/rally/pipeline-history')
      if (res.ok) {
        const data = await res.json()
        setRuns(Array.isArray(data) ? data : [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  // Compute stats
  const stats: RunStats = (() => {
    const completed = runs.filter(r => r.status === 'completed')
    const failed = runs.filter(r => r.status === 'error')
    const scored = completed.filter(r => r.bestScore != null)
    const avgScore = scored.length > 0
      ? scored.reduce((s, r) => s + r.bestScore!, 0) / scored.length
      : 0
    const bestScore = scored.length > 0
      ? Math.max(...scored.map(r => r.bestScore!))
      : 0

    // Improvement rate: first scored vs last scored
    let improvementRate = 0
    if (scored.length >= 2) {
      const sorted = [...scored].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      const first = sorted[0].bestScore!
      const last = sorted[sorted.length - 1].bestScore!
      if (first > 0) {
        improvementRate = ((last - first) / first) * 100
      }
    }

    return {
      total: runs.length,
      completed: completed.length,
      failed: failed.length,
      avgScore,
      bestScore,
      improvementRate,
    }
  })()

  if (loading) {
    return (
      <Card className="border-border/30">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-2/3 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (runs.length === 0) {
    return (
      <Card className="border-border/30">
        <CardContent className="p-6 text-center">
          <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs font-medium text-muted-foreground">No pipeline runs yet</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Run the pipeline to see your score history here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-400" />
          Run History
          <Badge variant="outline" className="text-[9px] ml-auto font-mono text-emerald-400 border-emerald-500/30">
            {runs.length} runs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Score Trend Line */}
        <ScoreTrendLine runs={runs} />

        <Separator className="bg-border/30" />

        {/* Timeline */}
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-0">
            {runs.slice(0, 20).map((run, idx) => (
              <TimelineItem key={run.id} run={run} index={idx} />
            ))}
          </div>
        </ScrollArea>

        {runs.length > 20 && (
          <p className="text-[9px] text-muted-foreground text-center">
            Showing latest 20 of {runs.length} runs
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Already imported above via the main import block
