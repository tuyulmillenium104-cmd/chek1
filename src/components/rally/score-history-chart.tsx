'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/* ── Types ── */

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

interface ScoreHistoryChartProps {
  className?: string
}

/* ── Helpers ── */

function getBarColor(score: number | null): string {
  if (score == null) return 'bg-muted-foreground/30'
  if (score >= 16) return 'bg-emerald-500'
  if (score >= 13) return 'bg-amber-500'
  return 'bg-red-500'
}

function getBarGradient(score: number | null): string {
  if (score == null) return 'from-muted-foreground/20 to-muted-foreground/40'
  if (score >= 16) return 'from-emerald-400 to-emerald-600'
  if (score >= 13) return 'from-amber-400 to-amber-600'
  return 'from-red-400 to-red-600'
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/* ── Main Component ── */

export function ScoreHistoryChart({ className }: ScoreHistoryChartProps) {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rally/pipeline-history')
      if (res.ok) {
        const data = await res.json()
        const completed = (data || [])
          .filter((r: PipelineRun) => r.status === 'completed' && r.bestScore != null)
          .reverse() // oldest first for left-to-right chart
        setRuns(completed.slice(-20)) // last 20 runs
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

  // Calculate average
  const avgScore = runs.length > 0
    ? runs.reduce((sum, r) => sum + (r.bestScore || 0), 0) / runs.length
    : 0

  const maxScore = 18
  const chartHeight = 180

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-border/30 bg-card/50 p-4', className)}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold">Score History</span>
        </div>
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className={cn('rounded-lg border border-border/30 bg-card/50 p-4', className)}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold">Score History</span>
        </div>
        <div className="flex items-center justify-center h-[200px] text-center">
          <div>
            <BarChart3 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground">No pipeline runs yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Run the pipeline to see score history</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-border/30 bg-card/50 p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold">Score History</span>
        </div>
        <div className="flex items-center gap-3 text-[9px]">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">≥16</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">≥13</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">&lt;13</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3 text-[10px]">
        <span className="text-muted-foreground">
          {runs.length} runs
        </span>
        <span className="text-muted-foreground">·</span>
        <span className={cn(
          'font-mono font-medium',
          avgScore >= 16 ? 'text-emerald-400' : avgScore >= 13 ? 'text-amber-400' : 'text-red-400'
        )}>
          Avg: {avgScore.toFixed(1)}/18
        </span>
        {runs.length >= 2 && (() => {
          const first = runs[0].bestScore || 0
          const last = runs[runs.length - 1].bestScore || 0
          const diff = last - first
          if (Math.abs(diff) < 0.05) return null
          return (
            <span className={cn(
              'font-mono flex items-center gap-0.5',
              diff > 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              <TrendingUp className={cn('h-3 w-3', diff < 0 && 'rotate-90')} />
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
            </span>
          )
        })()}
      </div>

      {/* Chart */}
      <div ref={chartRef} className="relative" style={{ height: `${chartHeight + 30}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-[30px] w-8 flex flex-col justify-between text-[9px] text-muted-foreground font-mono">
          <span>18</span>
          <span>12</span>
          <span>6</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="absolute left-10 right-0 top-0 bottom-[30px]">
          {/* Grid lines */}
          {[0, 6, 12, 18].map(val => (
            <div
              key={val}
              className="absolute left-0 right-0 border-t border-dashed border-border/20"
              style={{ bottom: `${(val / maxScore) * 100}%` }}
            />
          ))}

          {/* Average line */}
          {avgScore > 0 && (
            <div
              className="absolute left-0 right-0 border-t border-emerald-500/30 border-dashed z-10"
              style={{ bottom: `${(avgScore / maxScore) * 100}%` }}
            >
              <span className="absolute -top-3 right-0 text-[8px] font-mono text-emerald-400/60">
                avg {avgScore.toFixed(1)}
              </span>
            </div>
          )}

          {/* Bars */}
          <div className="absolute left-0 right-0 bottom-0 top-0 flex items-end gap-[2px] sm:gap-1">
            {runs.map((run, idx) => {
              const score = run.bestScore || 0
              const barHeight = (score / maxScore) * 100
              const isHovered = hoveredIndex === idx

              return (
                <TooltipProvider key={run.id} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        className="relative flex-1 min-w-0 cursor-pointer group"
                        initial={{ height: 0 }}
                        animate={{ height: '100%' }}
                        transition={{ duration: 0.5, delay: idx * 0.04, ease: 'easeOut' }}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Bar */}
                        <motion.div
                          className={cn(
                            'absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-200',
                            getBarColor(run.bestScore),
                            isHovered && 'opacity-80 brightness-110'
                          )}
                          style={{ height: `${barHeight}%` }}
                          initial={{ height: 0 }}
                          animate={{ height: `${barHeight}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.04 + 0.1, ease: 'easeOut' }}
                        />

                        {/* Score label on top */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-mono font-medium whitespace-nowrap">
                          {score.toFixed(0)}
                        </div>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] px-2 py-1.5 max-w-[200px]">
                      <div className="space-y-0.5">
                        <p className="font-medium">{score.toFixed(1)}/18</p>
                        <p className="text-muted-foreground">{run.verdict || 'N/A'}</p>
                        <p className="text-muted-foreground">{formatDateShort(run.createdAt)} {formatTime(run.createdAt)}</p>
                        <p className="text-muted-foreground">
                          {run.variations} vars · {run.feedbackLoops} loops
                          {run.pipelineTime ? ` · ${Math.round(run.pipelineTime)}s` : ''}
                        </p>
                        {run.bestAngle && (
                          <p className="text-muted-foreground truncate max-w-[180px]">
                            {run.bestAngle}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        </div>

        {/* X-axis labels (date) */}
        <div className="absolute left-10 right-0 bottom-0 h-[30px] flex items-end gap-[2px] sm:gap-1">
          {runs.map((run, idx) => {
            // Show labels for first, last, and every 5th
            const showLabel = idx === 0 || idx === runs.length - 1 || idx % 5 === 0
            return (
              <div key={run.id} className="flex-1 min-w-0 text-center">
                {showLabel && (
                  <span className="text-[7px] text-muted-foreground font-mono truncate block">
                    {formatDateShort(run.createdAt)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
