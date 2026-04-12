'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  GitCompareArrows,
  Trophy,
  Clock,
  Layers,
  RotateCcw,
  Check,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  Zap,
  XCircle,
  Sparkles,
  Copy,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
  errorMessage?: string | null
}

interface PipelineComparisonProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/* ── Helpers ── */

function formatTime(seconds: number | null): string {
  if (!seconds) return 'N/A'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

function getScoreColor(score: number | null): string {
  if (score == null) return 'text-muted-foreground'
  if (score >= 16) return 'text-emerald-400'
  if (score >= 13) return 'text-amber-400'
  return 'text-red-400'
}

function getVerdictColor(verdict: string | null): string {
  if (!verdict) return 'text-muted-foreground'
  const v = verdict.toLowerCase()
  if (v.includes('elite')) return 'text-emerald-400'
  if (v.includes('strong')) return 'text-amber-400'
  return 'text-orange-400'
}

function DiffIndicator({ value, prev }: { value: number | null; prev: number | null }) {
  if (value == null || prev == null) return <Minus className="h-3 w-3 text-muted-foreground" />
  const diff = value - prev
  if (Math.abs(diff) < 0.05) return <Minus className="h-3 w-3 text-muted-foreground" />
  if (diff > 0) return <ArrowUp className="h-3 w-3 text-emerald-400" />
  return <ArrowDown className="h-3 w-3 text-red-400" />
}

function DiffBadge({ value, prev }: { value: number | null; prev: number | null }) {
  if (value == null || prev == null) return null
  const diff = value - prev
  if (Math.abs(diff) < 0.05) return null
  const isImprovement = diff > 0
  return (
    <Badge className={cn(
      'text-[9px] px-1.5 py-0 border-0 gap-0.5',
      isImprovement ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
    )}>
      {isImprovement ? <ArrowUp className="h-2 w-2" /> : <ArrowDown className="h-2 w-2" />}
      {Math.abs(diff).toFixed(1)}
    </Badge>
  )
}

/* ── Main Component ── */

export function PipelineComparison({ open, onOpenChange }: PipelineComparisonProps) {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [runAId, setRunAId] = useState<string>('')
  const [runBId, setRunBId] = useState<string>('')
  const [showContentDiff, setShowContentDiff] = useState(false)

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rally/pipeline-history')
      if (res.ok) {
        const data = await res.json()
        const scoredRuns = (data || []).filter((r: PipelineRun) => r.status === 'completed' && r.bestScore != null)
        setRuns(scoredRuns)
        // Auto-select last two runs
        if (scoredRuns.length >= 2) {
          setRunAId(scoredRuns[1].id)
          setRunBId(scoredRuns[0].id)
        } else if (scoredRuns.length === 1) {
          setRunAId(scoredRuns[0].id)
          setRunBId('')
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchRuns()
  }, [open, fetchRuns])

  const runA = runs.find(r => r.id === runAId) || null
  const runB = runs.find(r => r.id === runBId) || null

  const canCompare = runA && runB && runA.id !== runB.id

  // Simple diff highlighting between two texts
  const getDiffParts = (textA: string, textB: string): { text: string; added: boolean; removed: boolean }[] => {
    if (!textA || !textB) return []
    const wordsA = textA.split(/(\s+)/)
    const wordsB = textB.split(/(\s+)/)
    const setB = new Set(wordsB.filter(w => w.trim()))
    return wordsA.map(word => ({
      text: word,
      added: false,
      removed: word.trim() ? !setB.has(word) : false,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-teal-500/10 backdrop-blur-xl" />
          <DialogHeader className="relative p-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <GitCompareArrows className="h-5 w-5 text-emerald-400" />
              <DialogTitle className="text-lg font-semibold">Pipeline Run Comparison</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Compare two pipeline runs side-by-side to track improvements
            </DialogDescription>
          </DialogHeader>
        </div>

        <Separator className="opacity-50" />

        <ScrollArea className="h-[65vh]">
          <div className="p-5 space-y-4">
            {/* Run Selectors */}
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : runs.length < 2 ? (
              <div className="text-center py-8">
                <GitCompareArrows className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Need at least 2 completed pipeline runs to compare</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Run A Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Run A (Earlier)
                    </label>
                    <div className="relative">
                      <select
                        value={runAId}
                        onChange={(e) => setRunAId(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border/50 bg-background/50 px-3 pr-8 text-xs focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select a run...</option>
                        {runs.map((run) => (
                          <option key={run.id} value={run.id}>
                            {formatDate(run.createdAt)} — {run.bestScore?.toFixed(1)}/18 {run.verdict || ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Run B Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Run B (Later)
                    </label>
                    <div className="relative">
                      <select
                        value={runBId}
                        onChange={(e) => setRunBId(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border/50 bg-background/50 px-3 pr-8 text-xs focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select a run...</option>
                        {runs.map((run) => (
                          <option key={run.id} value={run.id}>
                            {formatDate(run.createdAt)} — {run.bestScore?.toFixed(1)}/18 {run.verdict || ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Comparison Results */}
                <AnimatePresence mode="wait">
                  {canCompare ? (
                    <motion.div
                      key="comparison"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-4"
                    >
                      {/* Score Comparison Header */}
                      <div className="grid grid-cols-3 gap-3 items-center">
                        {/* Run A Score */}
                        <div className="text-center p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                          <p className="text-[9px] text-muted-foreground uppercase mb-1">Run A</p>
                          <p className={cn('text-2xl font-bold font-mono', getScoreColor(runA.bestScore))}>
                            {runA.bestScore?.toFixed(1)}<span className="text-muted-foreground text-sm">/18</span>
                          </p>
                          <p className={cn('text-[10px] font-medium mt-0.5', getVerdictColor(runA.verdict))}>
                            {runA.verdict || 'N/A'}
                          </p>
                        </div>

                        {/* Diff */}
                        <div className="text-center p-3 rounded-lg border border-dashed border-border/40 bg-muted/5">
                          <p className="text-[9px] text-muted-foreground uppercase mb-1">Change</p>
                          <div className="flex items-center justify-center gap-1">
                            {runB.bestScore != null && runA.bestScore != null && (() => {
                              const diff = runB.bestScore - runA.bestScore
                              if (Math.abs(diff) < 0.05) return <Minus className="h-5 w-5 text-muted-foreground" />
                              return (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className={cn(
                                    'flex items-center gap-1 text-lg font-bold font-mono',
                                    diff > 0 ? 'text-emerald-400' : 'text-red-400'
                                  )}
                                >
                                  {diff > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                  {Math.abs(diff).toFixed(1)}
                                </motion.div>
                              )
                            })()}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {runB.bestScore != null && runA.bestScore != null ? (
                              runB.bestScore > runA.bestScore ? 'Improved' :
                              runB.bestScore < runA.bestScore ? 'Declined' : 'No change'
                            ) : '—'}
                          </p>
                        </div>

                        {/* Run B Score */}
                        <div className="text-center p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                          <p className="text-[9px] text-muted-foreground uppercase mb-1">Run B</p>
                          <p className={cn('text-2xl font-bold font-mono', getScoreColor(runB.bestScore))}>
                            {runB.bestScore?.toFixed(1)}<span className="text-muted-foreground text-sm">/18</span>
                          </p>
                          <p className={cn('text-[10px] font-medium mt-0.5', getVerdictColor(runB.verdict))}>
                            {runB.verdict || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Metrics Comparison Grid */}
                      <div className="rounded-lg border border-border/30 bg-card/50 overflow-hidden">
                        <div className="grid grid-cols-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30">
                          <div className="p-2.5">Metric</div>
                          <div className="p-2.5 text-center flex items-center justify-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Run A
                          </div>
                          <div className="p-2.5 text-center flex items-center justify-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Run B
                          </div>
                        </div>
                        {[
                          { label: 'Best Score', icon: Trophy, key: 'bestScore', format: (v: number | null) => v != null ? `${v.toFixed(1)}/18` : 'N/A' },
                          { label: 'Variations', icon: Layers, key: 'variations', format: (v: number | null) => v != null ? `${v}` : 'N/A' },
                          { label: 'Feedback Loops', icon: RotateCcw, key: 'feedbackLoops', format: (v: number | null) => v != null ? `${v}` : 'N/A' },
                          { label: 'Pipeline Time', icon: Clock, key: 'pipelineTime', format: (v: number | null) => formatTime(v) },
                        ].map((metric) => {
                          const valA = runA[metric.key as keyof PipelineRun] as number | null
                          const valB = runB[metric.key as keyof PipelineRun] as number | null
                          return (
                            <div key={metric.key} className="grid grid-cols-3 text-xs border-b border-border/10 last:border-0">
                              <div className="p-2.5 flex items-center gap-1.5 text-foreground/70">
                                <metric.icon className="h-3 w-3 text-muted-foreground" />
                                {metric.label}
                              </div>
                              <div className="p-2.5 text-center flex items-center justify-center gap-1.5">
                                <span className="font-mono">{metric.format(valA)}</span>
                                <DiffBadge value={valB} prev={valA} />
                              </div>
                              <div className="p-2.5 text-center flex items-center justify-center gap-1.5">
                                <span className="font-mono">{metric.format(valB)}</span>
                              </div>
                            </div>
                          )
                        })}
                        {/* Verdict row */}
                        <div className="grid grid-cols-3 text-xs">
                          <div className="p-2.5 flex items-center gap-1.5 text-foreground/70">
                            <Sparkles className="h-3 w-3 text-muted-foreground" />
                            Verdict
                          </div>
                          <div className="p-2.5 text-center">
                            <span className={cn('font-medium', getVerdictColor(runA.verdict))}>
                              {runA.verdict || 'N/A'}
                            </span>
                          </div>
                          <div className="p-2.5 text-center">
                            <span className={cn('font-medium', getVerdictColor(runB.verdict))}>
                              {runB.verdict || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Angle Comparison */}
                      {(runA.bestAngle || runB.bestAngle) && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Best Angles</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                              <p className="text-[9px] text-muted-foreground uppercase mb-1">Run A</p>
                              <p className="text-[11px] text-foreground/80 line-clamp-3">
                                {runA.bestAngle || 'No angle recorded'}
                              </p>
                            </div>
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                              <p className="text-[9px] text-muted-foreground uppercase mb-1">Run B</p>
                              <p className="text-[11px] text-foreground/80 line-clamp-3">
                                {runB.bestAngle || 'No angle recorded'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Content Comparison */}
                      {(runA.bestContent || runB.bestContent) && (
                        <div className="space-y-2">
                          <button
                            onClick={() => setShowContentDiff(!showContentDiff)}
                            className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium cursor-pointer hover:text-foreground transition-colors w-full"
                          >
                            <FileText className="h-3 w-3 text-emerald-400" />
                            Content Comparison
                            <ChevronDown className={cn('h-3 w-3 ml-auto transition-transform', showContentDiff && 'rotate-180')} />
                          </button>
                          <AnimatePresence>
                            {showContentDiff && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-2 gap-3">
                                  {/* Run A Content */}
                                  <div className="rounded-lg border border-border/30 bg-card/50 p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                      <p className="text-[9px] text-muted-foreground uppercase font-medium">Run A Content</p>
                                      {runA.bestContent && (
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(runA.bestContent!)
                                            toast.success('Run A content copied!')
                                          }}
                                          className="ml-auto h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                        >
                                          <Copy className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                    </div>
                                    <ScrollArea className="max-h-[200px]">
                                      <p className="text-[10px] leading-relaxed whitespace-pre-line text-foreground/80">
                                        {runA.bestContent || 'No content recorded'}
                                      </p>
                                    </ScrollArea>
                                  </div>
                                  {/* Run B Content */}
                                  <div className="rounded-lg border border-border/30 bg-card/50 p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                      <p className="text-[9px] text-muted-foreground uppercase font-medium">Run B Content</p>
                                      {runB.bestContent && (
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(runB.bestContent!)
                                            toast.success('Run B content copied!')
                                          }}
                                          className="ml-auto h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                        >
                                          <Copy className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                    </div>
                                    <ScrollArea className="max-h-[200px]">
                                      <p className="text-[10px] leading-relaxed whitespace-pre-line text-foreground/80">
                                        {runB.bestContent || 'No content recorded'}
                                      </p>
                                    </ScrollArea>
                                  </div>
                                </div>

                                {/* Highlighted Diff */}
                                {runA.bestContent && runB.bestContent && (
                                  <div className="mt-3 rounded-lg border border-dashed border-border/40 bg-muted/5 p-3">
                                    <p className="text-[9px] text-muted-foreground uppercase font-medium mb-2">Diff Highlighting (Run A)</p>
                                    <ScrollArea className="max-h-[150px]">
                                      <p className="text-[10px] leading-relaxed">
                                        {getDiffParts(runA.bestContent, runB.bestContent).map((part, i) => (
                                          <span
                                            key={i}
                                            className={cn(
                                              part.removed && 'bg-red-500/20 text-red-400 line-through rounded-sm px-0.5'
                                            )}
                                          >
                                            {part.text}
                                          </span>
                                        ))}
                                      </p>
                                    </ScrollArea>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Summary Verdict */}
                      <div className="rounded-lg border border-border/30 bg-card/50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-semibold">Comparison Summary</span>
                        </div>
                        {runB.bestScore != null && runA.bestScore != null ? (
                          <div className="space-y-1.5 text-[11px]">
                            {runB.bestScore > runA.bestScore ? (
                              <p className="text-emerald-400">
                                <Check className="h-3 w-3 inline mr-1" />
                                Run B improved by <strong>{(runB.bestScore - runA.bestScore).toFixed(1)}</strong> points ({((runB.bestScore - runA.bestScore) / runA.bestScore * 100).toFixed(1)}% improvement)
                              </p>
                            ) : runB.bestScore < runA.bestScore ? (
                              <p className="text-red-400">
                                <XCircle className="h-3 w-3 inline mr-1" />
                                Run B declined by <strong>{Math.abs(runB.bestScore - runA.bestScore).toFixed(1)}</strong> points
                              </p>
                            ) : (
                              <p className="text-muted-foreground">
                                <Minus className="h-3 w-3 inline mr-1" />
                                Scores are identical
                              </p>
                            )}
                            {runB.variations !== runA.variations && (
                              <p className="text-muted-foreground">
                                {runB.variations > runA.variations
                                  ? `+${runB.variations - runA.variations} more variations in Run B`
                                  : `${runA.variations - runB.variations} fewer variations in Run B`}
                              </p>
                            )}
                            {runB.feedbackLoops !== runA.feedbackLoops && (
                              <p className="text-muted-foreground">
                                {runB.feedbackLoops > runA.feedbackLoops
                                  ? `+${runB.feedbackLoops - runA.feedbackLoops} more feedback loops in Run B`
                                  : `${runA.feedbackLoops - runB.feedbackLoops} fewer feedback loops in Run B`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Select two completed runs to see comparison</p>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 rounded-lg border border-dashed border-border/40 bg-muted/5"
                    >
                      <GitCompareArrows className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">Select two runs to compare</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        Choose an earlier run (A) and a later run (B) from the dropdowns above
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}


