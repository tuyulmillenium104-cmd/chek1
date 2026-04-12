'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Download, Clock, Zap, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LatestReportData {
  exists: boolean
  bestScore?: number
  verdict?: string
  campaignTitle?: string
  pipelineTime?: number
  feedbackLoops?: number
  bestContent?: string
  bestAngle?: string
  timestamp?: string
  [key: string]: unknown
}

function getScoreBadgeClass(score: number | undefined): string {
  if (!score) return 'bg-muted/30 text-muted-foreground border-border/50'
  if (score >= 16) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (score >= 13) return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  if (score >= 10) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  return 'bg-red-500/15 text-red-400 border-red-500/30'
}

function getVerdictBadgeClass(verdict: string | undefined): string {
  if (!verdict) return 'bg-muted/30 text-muted-foreground border-border/50'
  const v = verdict.toLowerCase()
  if (v.includes('elite')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (v.includes('strong')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (v.includes('moderate')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  return 'bg-red-500/15 text-red-400 border-red-500/30'
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function LatestReportCard() {
  const [report, setReport] = useState<LatestReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch('/api/rally/latest-report')
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      } else {
        setReport({ exists: false })
      }
    } catch {
      setReport({ exists: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handleDownloadJSON = async () => {
    if (!report) return
    try {
      const res = await fetch('/api/rally/latest-report')
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'rally-latest-report.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Report downloaded')
      }
    } catch {
      toast.error('Download failed')
    }
  }

  const handleDownloadCSV = () => {
    try {
      const link = document.createElement('a')
      link.href = '/api/rally/export?type=history'
      link.download = 'rally-history.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('CSV download started')
    } catch {
      toast.error('CSV download failed')
    }
  }

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading latest report...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!report?.exists) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-muted/30 flex items-center justify-center">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Latest Report</span>
            </div>
            <div className="text-center py-4">
              <div className="mx-auto w-12 h-12 mb-2 rounded-full bg-muted/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground/30" />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">No reports yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Run the pipeline to generate your first report
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const bestContent = report.bestContent || ''
  const contentPreview = bestContent.length > 200
    ? bestContent.substring(0, 200) + '...'
    : bestContent

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-emerald-400" />
            </div>
            <CardTitle className="text-xs font-semibold text-foreground">
              Latest Report
            </CardTitle>
            {report.timestamp && (
              <Badge variant="outline" className="text-[9px] font-mono ml-auto text-muted-foreground border-border/50">
                {new Date(report.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-3">
          {/* Score & Verdict badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {report.bestScore != null && (
              <Badge className={cn('text-[11px] font-bold font-mono px-2 py-0.5 border', getScoreBadgeClass(report.bestScore))}>
                {report.bestScore.toFixed(1)}/18
              </Badge>
            )}
            {report.verdict && (
              <Badge className={cn('text-[9px] px-1.5 py-0 border capitalize', getVerdictBadgeClass(report.verdict))}>
                {report.verdict}
              </Badge>
            )}
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Campaign name */}
            {report.campaignTitle && (
              <div className="bg-muted/10 rounded-lg p-2.5 border border-border/20">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Campaign</p>
                <p className="text-[11px] font-medium truncate">{report.campaignTitle}</p>
              </div>
            )}
            {/* Pipeline time */}
            {report.pipelineTime != null && (
              <div className="bg-muted/10 rounded-lg p-2.5 border border-border/20">
                <div className="flex items-center gap-1 mb-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pipeline Time</p>
                </div>
                <p className="text-[11px] font-medium font-mono">{formatTime(report.pipelineTime)}</p>
              </div>
            )}
            {/* Feedback loops */}
            {(report.feedbackLoops ?? 0) > 0 && (
              <div className="bg-muted/10 rounded-lg p-2.5 border border-border/20">
                <div className="flex items-center gap-1 mb-0.5">
                  <Zap className="h-3 w-3 text-amber-400" />
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Feedback Loops</p>
                </div>
                <p className="text-[11px] font-medium font-mono">{report.feedbackLoops}</p>
              </div>
            )}
          </div>

          {/* Best angle */}
          {report.bestAngle && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Best Angle</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{report.bestAngle}</p>
            </div>
          )}

          {/* Best content preview */}
          {bestContent && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Best Content</p>
              <div className="bg-muted/5 rounded-lg p-2.5 border border-border/20">
                <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line">
                  {expanded ? bestContent : contentPreview}
                </p>
                {bestContent.length > 200 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 mt-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 transition-all duration-200 hover:translate-x-0.5"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Read more
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadJSON}
              className="h-8 text-[10px] gap-1.5 border-border/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-muted-foreground hover:text-foreground hover:scale-[1.03] hover:shadow-[0_0_8px_rgba(16,185,129,0.12)] active:scale-[0.98] transition-all duration-200"
            >
              <Download className="h-3 w-3" />
              Download Full Report
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadCSV}
              className="h-8 text-[10px] gap-1.5 border-border/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-muted-foreground hover:text-foreground hover:scale-[1.03] hover:shadow-[0_0_8px_rgba(16,185,129,0.12)] active:scale-[0.98] transition-all duration-200"
            >
              <Download className="h-3 w-3" />
              Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
