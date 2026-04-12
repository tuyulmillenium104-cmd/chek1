'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw, X, Loader2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface FailedRun {
  id: string
  status: string
  bestAngle: string | null
  bestContent: string | null
  createdAt: string
  bestScore: number | null
}

interface PipelineErrorPanelProps {
  onRetry?: (runId: string) => void
  isRunning?: boolean
}

function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return ''
  }
}

function truncateId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id
}

export function PipelineErrorPanel({ onRetry, isRunning = false }: PipelineErrorPanelProps) {
  const [failedRuns, setFailedRuns] = useState<FailedRun[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set())

  const fetchFailedRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/rally/pipeline-retry')
      if (res.ok) {
        const data = await res.json()
        setFailedRuns(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchFailedRuns()
    const interval = setInterval(fetchFailedRuns, 30000)
    return () => clearInterval(interval)
  }, [fetchFailedRuns])

  const handleRetry = async (runId: string) => {
    if (retryingId || isRunning) return

    setRetryingId(runId)
    toast.info('Retrying failed pipeline run...')

    try {
      const res = await fetch('/api/rally/pipeline-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      })

      if (res.ok) {
        // Trigger the retry via the parent's pipeline function
        onRetry?.(runId)
        // Remove from displayed list
        setFailedRuns(prev => prev.filter(r => r.id !== runId))
      } else {
        toast.error('Retry failed', { description: 'Could not fetch run parameters' })
      }
    } catch {
      toast.error('Retry failed', { description: 'Network error' })
    } finally {
      setRetryingId(null)
    }
  }

  const handleDismiss = async (runId: string) => {
    setDismissingIds(prev => new Set(prev).add(runId))

    try {
      const res = await fetch('/api/rally/pipeline-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, action: 'dismiss' }),
      })

      if (res.ok) {
        setFailedRuns(prev => prev.filter(r => r.id !== runId))
        toast.success('Run dismissed')
      }
    } catch {
      toast.error('Failed to dismiss run')
    } finally {
      setDismissingIds(prev => {
        const next = new Set(prev)
        next.delete(runId)
        return next
      })
    }
  }

  // Don't render if still loading or no failed runs
  if (loading) return null
  if (failedRuns.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Card className="bg-red-500/5 border border-red-500/20 rounded-xl backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <CardTitle className="text-xs font-semibold text-red-400">
                Failed Pipeline Runs
              </CardTitle>
              <Badge className="bg-red-500/15 text-red-400 text-[9px] px-1.5 py-0 border-0 font-mono ml-1 animate-[badge-pulse-red_2s_ease-in-out_infinite]">
                {failedRuns.length}
              </Badge>
              <div className="ml-auto flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground font-mono">auto-refresh 30s</span>
                <button
                  className="h-5 w-5 p-0 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 hover:scale-[1.1] transition-all duration-200"
                  onClick={fetchFailedRuns}
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {failedRuns.map((run, idx) => (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.3 }}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 hover:border-red-500/20 transition-colors group"
                >
                  {/* Status indicator */}
                  <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse shrink-0 mt-1 shadow-[0_0_6px_rgba(239,68,68,0.4)]" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {truncateId(run.id)}
                      </span>
                      {run.bestAngle && (
                        <Badge className="text-[8px] px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20 border truncate max-w-[120px]">
                          {run.bestAngle.substring(0, 30)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{timeAgo(run.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isRunning || !!retryingId}
                      onClick={() => handleRetry(run.id)}
                      className="h-7 px-2 text-[10px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 hover:scale-[1.04] hover:shadow-[0_0_8px_rgba(16,185,129,0.15)] transition-all duration-200"
                    >
                      {retryingId === run.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Retry
                    </Button>
                    <button
                      className={cn(
                        'h-7 w-7 p-0 rounded-md flex items-center justify-center transition-all duration-200',
                        'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 hover:scale-[1.08] hover:shadow-sm',
                        dismissingIds.has(run.id) && 'opacity-50'
                      )}
                      onClick={() => handleDismiss(run.id)}
                      disabled={dismissingIds.has(run.id)}
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
