'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, Circle, Loader2, Copy, ExternalLink, AlertTriangle,
  Trophy, Timer, RotateCcw, ChevronDown, ChevronUp, Rocket,
  Sparkles, Users, Shield, BarChart3, RefreshCw, X, History, Save, Trash2, GitCompareArrows
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { RunHistoryPanel } from '@/components/rally/run-history-panel'
import { PipelineErrorPanel } from '@/components/rally/pipeline-error-panel'
import { LatestReportCard } from '@/components/rally/latest-report-card'
import { PipelineStatsSummary } from '@/components/rally/pipeline-stats-summary'
import { PipelineComparison } from '@/components/rally/pipeline-comparison'
import { ScoreHistoryChart } from '@/components/rally/score-history-chart'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PipelineStep {
  step: number
  name: string
  icon: string
  status: 'pending' | 'running' | 'complete' | 'error'
  result?: string
}

interface JudgeScores {
  originality: number
  alignment: number
  accuracy: number
  compliance: number
  engagement: number
  technical: number
  total: number
}

interface JudgeResult {
  judgeNum: number
  name: string
  scores: JudgeScores
  reasoning: string
  aiPatternsFound: string[]
  suggestions: string[]
  feedbackLoop?: number
}

interface ConsensusData {
  total: number
  stdDev: number
  averageScores: {
    originality: number
    alignment: number
    accuracy: number
    compliance: number
    engagement: number
    technical: number
  }
  verdict: string
}

interface VariationData {
  id: string
  text: string
  angle: string
  analysis: {
    passed: boolean
    issues: string[]
    hasEmDash: boolean
    hasHashtag: boolean
    startsWithMention: boolean
    hasRallyMention: boolean
    aiWordCount: number
    templateCount: number
    paragraphCV: number
    wordCount: number
  }
  index: number
  feedbackLoop?: number
}

interface FeedbackLoopData {
  loop: number
  currentBest: number
  weakDimensions: { name: string; score: number; max: number; gap: number; gapPct: number; reason: string }[]
  worstVariation: string
  newBest?: number
}

interface HistoryRun {
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

interface CompleteData {
  bestVariation: {
    id: string
    text: string
    angle: string
    consensus: ConsensusData
    judgeResults: JudgeResult[]
  }
  allVariations: {
    id: string
    text: string
    angle: string
    consensus: ConsensusData
    feedbackLoop?: number
  }[]
  pipelineTime: number
  feedbackLoops: number
  campaign: {
    title: string
    campaignUrl: string
    reward: string
    deadline: string
    mission: string
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { step: 1, name: 'Campaign Picker', icon: '📋' },
  { step: 2, name: 'Data Fetch', icon: '📂' },
  { step: 3, name: 'Calibrate', icon: '🎯' },
  { step: 4, name: 'Competitive Analysis', icon: '🔍' },
  { step: 5, name: 'Deep Analysis', icon: '🧠' },
  { step: 6, name: 'Generate Variations', icon: '✍️' },
  { step: 7, name: 'Verification', icon: '✅' },
  { step: 8, name: 'Judge Panel', icon: '⚖️' },
  { step: 9, name: 'Consensus', icon: '📊' },
  { step: 10, name: 'Feedback Loop', icon: '🔄' },
  { step: 11, name: 'Save Output', icon: '💾' },
]

const JUDGE_NAMES = ['Originality', 'Engagement', 'Compliance', 'Balance', 'Technical']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function getVerdictColor(verdict: string): string {
  const v = verdict.toLowerCase()
  if (v.includes('elite')) return 'text-emerald-400'
  if (v.includes('strong')) return 'text-amber-400'
  if (v.includes('moderate')) return 'text-orange-400'
  return 'text-red-400'
}

function getVerdictBg(verdict: string): string {
  const v = verdict.toLowerCase()
  if (v.includes('elite')) return 'bg-emerald-500/15 border-emerald-500/30'
  if (v.includes('strong')) return 'bg-amber-500/15 border-amber-500/30'
  if (v.includes('moderate')) return 'bg-orange-500/15 border-orange-500/30'
  return 'bg-red-500/15 border-red-500/30'
}

function getScoreBarColor(verdict: string): string {
  const v = verdict.toLowerCase()
  if (v.includes('elite')) return 'bg-emerald-500'
  if (v.includes('strong')) return 'bg-amber-500'
  if (v.includes('moderate')) return 'bg-orange-500'
  return 'bg-red-500'
}

function getDimLabel(key: string): string {
  const map: Record<string, string> = {
    originality: 'O',
    alignment: 'A',
    accuracy: 'Ac',
    compliance: 'C',
    engagement: 'E',
    technical: 'T',
  }
  return map[key] || key.slice(0, 3)
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepItem({ step, isLast }: { step: PipelineStep; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <motion.div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs transition-all duration-300',
            step.status === 'pending' && 'bg-muted/30 text-muted-foreground border border-border/50',
            step.status === 'running' && 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 step-indicator-running',
            step.status === 'complete' && 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
            step.status === 'error' && 'bg-destructive/20 text-destructive border border-destructive/20',
          )}
          animate={step.status === 'running' ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {step.status === 'pending' && <Circle className="h-3.5 w-3.5" />}
          {step.status === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
          {step.status === 'complete' && <Check className="h-4 w-4" />}
          {step.status === 'error' && <X className="h-4 w-4" />}
        </motion.div>
        {!isLast && (
          <motion.div
            className={cn(
              'w-0.5 flex-1 min-h-[24px] rounded-full transition-all duration-500',
              step.status === 'complete' ? 'bg-emerald-500/40' : step.status === 'running' ? 'bg-emerald-500/20' : 'bg-border/30'
            )}
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>

      {/* Content */}
      <motion.div
        className={cn('flex-1 pb-4 min-w-0', step.status === 'pending' && 'opacity-40')}
        initial={{ opacity: step.status === 'pending' ? 0.4 : 1 }}
        animate={{ opacity: step.status === 'pending' ? 0.4 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{step.icon}</span>
          <span className="text-xs font-medium">{step.step}. {step.name}</span>
          {step.status === 'running' && (
            <Badge className="bg-emerald-500/15 text-emerald-400 text-[9px] px-1.5 py-0 border-0">
              Running
            </Badge>
          )}
          {step.status === 'complete' && (
            <Badge className="bg-emerald-500/10 text-emerald-400/70 text-[9px] px-1.5 py-0 border-0">
              ✓ Done
            </Badge>
          )}
        </div>
        {step.result && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] text-muted-foreground mt-0.5 truncate"
          >
            {step.result}
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}

function JudgeCard({ judge, isPending }: { judge: JudgeResult | null; isPending?: boolean }) {
  if (isPending || !judge) {
    return (
      <Card className="bg-muted/10 border border-border/30 rounded-lg p-2.5 min-w-[100px]">
        <div className="flex items-center gap-1 mb-1.5">
          <div className="h-4 w-4 rounded-full bg-muted/30 flex items-center justify-center">
            <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
          </div>
          <span className="text-[9px] text-muted-foreground font-medium">J{JUDGE_NAMES.indexOf(judge?.name || '') + 1}</span>
        </div>
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-2 w-full rounded-full" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'rounded-lg p-2.5 min-w-[100px] border transition-colors',
      judge.scores.total >= 15 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-card/50 border-border/30'
    )}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] text-muted-foreground font-medium truncate">{judge.name}</span>
        <span className={cn('text-[11px] font-bold font-mono stat-number', judge.scores.total >= 15 ? 'text-emerald-400' : 'text-amber-400')}>
          {judge.scores.total.toFixed(1)}
        </span>
      </div>
      <div className="space-y-0.5">
        {(['originality', 'alignment', 'accuracy', 'compliance', 'engagement', 'technical'] as const).map(dim => (
          <div key={dim} className="flex items-center gap-1">
            <span className="text-[8px] text-muted-foreground w-3 shrink-0">{getDimLabel(dim)}</span>
            <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500/60 transition-all duration-500"
                style={{ width: `${(judge.scores[dim] / 3) * 100}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-muted-foreground w-5 text-right">{judge.scores[dim].toFixed(1)}</span>
          </div>
        ))}
      </div>
      {judge.aiPatternsFound.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-border/20">
          <Badge variant="outline" className="text-[8px] px-1 py-0 text-destructive border-destructive/30">
            {judge.aiPatternsFound.length} AI flags
          </Badge>
        </div>
      )}
    </Card>
  )
}

function FeedbackLoopCard({ data, isActive }: { data: FeedbackLoopData; isActive: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-lg border p-3 space-y-2',
        isActive ? 'bg-amber-500/5 border-amber-500/20' : 'bg-card/30 border-border/30'
      )}
    >
      <div className="flex items-center gap-2">
        <RotateCcw className={cn('h-3.5 w-3.5', isActive ? 'text-amber-400' : 'text-muted-foreground')} />
        <span className="text-xs font-medium">Feedback Loop {data.loop}</span>
        {isActive && (
          <Badge className="bg-amber-500/15 text-amber-400 text-[9px] px-1.5 py-0 border-0 ml-auto">
            Active
          </Badge>
        )}
        {!isActive && data.newBest !== undefined && (
          <Badge className={cn(
            'text-[9px] px-1.5 py-0 border-0 ml-auto',
            data.newBest > data.currentBest
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-muted/30 text-muted-foreground'
          )}>
            {data.newBest > data.currentBest ? `+${(data.newBest - data.currentBest).toFixed(1)}` : 'No change'}
          </Badge>
        )}
      </div>

      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p>Current best: <span className="font-mono font-medium text-foreground">{data.currentBest.toFixed(1)}</span>/18 → Target: <span className="font-mono font-medium text-foreground">16</span>/18</p>
        <p>Weak dimensions: {data.weakDimensions.map(d => (
          <span key={d.name} className="inline-flex items-center gap-0.5">
            <Badge variant="outline" className="text-[8px] px-1 py-0 text-amber-400 border-amber-500/30 mx-0.5">
              {d.name} ({d.gapPct}% gap)
            </Badge>
          </span>
        ))}</p>
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function GeneratorTab() {
  // Configuration
  const [variationCount, setVariationCount] = useState(3)
  const [maxFeedbackLoops, setMaxFeedbackLoops] = useState(2)
  const [customInstructions, setCustomInstructions] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [campaigns, setCampaigns] = useState<Array<{id: string; title: string; status: string; source: string; missions: any[]; isActive?: boolean; knowledgeBase?: any; missionsJson?: any}>>([])

  // Pipeline state
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState<PipelineStep[]>(
    PIPELINE_STEPS.map(s => ({ ...s, status: 'pending' as const }))
  )
  const [variations, setVariations] = useState<Map<string, VariationData>>(new Map())
  const [judgeResults, setJudgeResults] = useState<Map<string, JudgeResult[]>>(new Map())
  const [consensusResults, setConsensusResults] = useState<Map<string, ConsensusData>>(new Map())
  const [feedbackLoops, setFeedbackLoops] = useState<FeedbackLoopData[]>([])
  const [pipelineResult, setPipelineResult] = useState<CompleteData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [copied, setCopied] = useState(false)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [draftsExpanded, setDraftsExpanded] = useState(false)
  const [savedDrafts, setSavedDrafts] = useState<Array<{
    id: string; campaignName: string; score: number; date: string; content: string
  }>>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem('rally-drafts')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [expandedVariation, setExpandedVariation] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryRun[]>([])
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [compareOpen, setCompareOpen] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Timer
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // Fetch pipeline history
  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/rally/pipeline-history')
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  // Fetch campaigns for selector
  useEffect(() => {
    fetch('/api/rally/campaigns').then(r => r.json()).then(data => {
      if (data.campaigns) {
        setCampaigns(data.campaigns)
        // Auto-select first active campaign that has missions or pipeline data
        const activeWithMission = data.campaigns.find((c: any) =>
          c.isActive && (c.missions?.length > 0 || c.knowledgeBase || c.missionsJson)
        )
        if (activeWithMission) setSelectedCampaignId(activeWithMission.id)
      }
    }).catch(() => {})
  }, [])

  const resetPipeline = useCallback(() => {
    setIsRunning(false)
    setSteps(PIPELINE_STEPS.map(s => ({ ...s, status: 'pending' as const })))
    setVariations(new Map())
    setJudgeResults(new Map())
    setConsensusResults(new Map())
    setFeedbackLoops([])
    setPipelineResult(null)
    setError(null)
    setElapsedTime(0)
    setExpandedStep(null)
    setExpandedVariation(null)
  }, [])

  // ─── SSE Event Handlers ──────────────────────────────────────────────────

  const handleEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case 'step_start':
        setSteps(prev => prev.map(s =>
          s.step === data.step ? { ...s, status: 'running' as const } : s
        ))
        break

      case 'step_complete': {
        const stepNum = data.step
        const resultText = summarizeStepResult(stepNum, data.result)
        setSteps(prev => prev.map(s =>
          s.step === stepNum ? { ...s, status: 'complete' as const, result: resultText } : s
        ))
        // Auto-expand step 8 (Judge Panel) and step 10 (Feedback Loop)
        if (stepNum === 8) setExpandedStep(8)
        if (stepNum === 10) setExpandedStep(10)
        break
      }

      case 'variation':
        setVariations(prev => {
          const next = new Map(prev)
          next.set(data.id, {
            id: data.id,
            text: data.text,
            angle: data.angle,
            analysis: data.analysis,
            index: data.index,
            feedbackLoop: data.feedbackLoop,
          })
          return next
        })
        // Update step 6 result
        setSteps(prev => prev.map(s =>
          s.step === 6 ? { ...s, result: `${prev.filter(ps => ps.step === 6).length > 0 ? '' : ''}${variations.size + 1} variations generated` } : s
        ))
        break

      case 'verification': {
        const passedCount = Array.from(variations.values()).filter(v => v.analysis?.passed !== false).length
        const total = variations.size
        setSteps(prev => prev.map(s =>
          s.step === 7 ? { ...s, result: `${passedCount}/${total} passed compliance` } : s
        ))
        setVariations(prev => {
          const next = new Map(prev)
          const existing = next.get(data.id)
          if (existing) {
            next.set(data.id, { ...existing, analysis: { ...existing.analysis, ...data } })
          }
          return next
        })
        break
      }

      case 'judge':
        setJudgeResults(prev => {
          const next = new Map(prev)
          const existing = next.get(data.variationId) || []
          next.set(data.variationId, [...existing, {
            judgeNum: data.judgeNum,
            name: data.name,
            scores: data.scores,
            reasoning: data.reasoning,
            aiPatternsFound: data.aiPatternsFound || [],
            suggestions: data.suggestions || [],
            feedbackLoop: data.feedbackLoop,
          }])
          return next
        })
        // Update step 8 progress
        setSteps(prev => {
          const totalJudges = variationCount * 5
          let doneJudges = 0
          prev.forEach(s => {
            if (s.step === 8) {
              Array.from(judgeResults.values()).forEach(jr => { doneJudges += jr.length })
            }
          })
          doneJudges += 1 // include current one
          return prev.map(s =>
            s.step === 8 ? { ...s, result: `${doneJudges}/${totalJudges} judges done` } : s
          )
        })
        break

      case 'consensus':
        setConsensusResults(prev => {
          const next = new Map(prev)
          next.set(data.variationId, data.consensus)
          return next
        })
        break

      case 'feedback_start':
        setFeedbackLoops(prev => [...prev, {
          loop: data.loop,
          currentBest: data.currentBest,
          weakDimensions: data.weakDimensions,
          worstVariation: data.worstVariation,
        }])
        break

      case 'feedback_end':
        setFeedbackLoops(prev => prev.map(fl =>
          fl.loop === data.loop ? { ...fl, newBest: data.newBest } : fl
        ))
        break

      case 'complete':
        setPipelineResult(data)
        setIsRunning(false)
        setElapsedTime(data.pipelineTime || Math.round(elapsedTime))
        toast.success('Pipeline complete!', { description: `Best score: ${data.bestVariation?.consensus?.total?.toFixed(1)}/18` })
        setSteps(prev => prev.map(s =>
          s.step === 11 ? { ...s, status: 'complete' as const, result: 'Pipeline finished' } : s
        ))
        // Save to history
        fetch('/api/rally/pipeline-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            bestScore: data.bestVariation?.consensus?.total,
            verdict: data.bestVariation?.consensus?.verdict,
            variations: data.allVariations?.length || variationCount,
            feedbackLoops: data.feedbackLoops || 0,
            pipelineTime: data.pipelineTime,
            bestAngle: data.bestVariation?.angle,
            bestContent: data.bestVariation?.text,
          }),
        }).then(() => refreshHistory()).catch(() => {})
        break

      case 'download_ready':
        toast.success('Report ready! Click to download.', {
          description: 'Pipeline output has been saved.',
          action: {
            label: 'Download',
            onClick: () => {
              const link = document.createElement('a')
              link.href = '/api/rally/latest-report'
              link.download = 'rally-latest-report.json'
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            },
          },
          duration: 8000,
        })
        break

      case 'warning':
        toast.warning('Pipeline warning', {
          description: data.message || 'A non-critical issue occurred during pipeline execution.',
          duration: 6000,
        })
        break

      case 'pipeline_run':
        toast.info('Pipeline run started', {
          description: `Run ID: ${data.runId || '—'} · ${data.campaign || 'Default campaign'}`,
          duration: 4000,
        })
        break

      case 'error':
        setError(data.message)
        setIsRunning(false)
        toast.error('Pipeline failed', { description: data.message })
        setSteps(prev => prev.map(s =>
          s.status === 'running' ? { ...s, status: 'error' as const } : s
        ))
        // Save failed run to history
        fetch('/api/rally/pipeline-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'error', variations: 0 }),
        }).then(() => refreshHistory()).catch(() => {})
        break
    }
  }, [variationCount, variations.size, elapsedTime, refreshHistory])

  // ─── Run Pipeline ────────────────────────────────────────────────────────

  const runPipeline = async () => {
    resetPipeline()
    setIsRunning(true)
    toast.info('Pipeline started...', { description: 'Generating variations with 5-judge panel' })

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/rally/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variationCount,
          customInstructions: customInstructions || undefined,
          maxFeedbackLoops,
          campaignId: selectedCampaignId || undefined,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Pipeline returned ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        let currentEvent = ''
        let currentData = ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6)
          } else if (line === '' && currentEvent && currentData) {
            try {
              const data = JSON.parse(currentData)
              handleEvent(currentEvent, data)
            } catch {
              // Ignore parse errors for partial data
            }
            currentEvent = ''
            currentData = ''
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Pipeline connection failed')
        setIsRunning(false)
      }
    }
  }

  const stopPipeline = () => {
    if (abortRef.current) abortRef.current.abort()
    setIsRunning(false)
  }

  // ─── Copy ────────────────────────────────────────────────────────────────

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  // ─── Compute derived state ───────────────────────────────────────────────

  const sortedVariations = pipelineResult
    ? pipelineResult.allVariations.map(v => ({
        ...v,
        consensus: consensusResults.get(v.id) || v.consensus,
        isBest: pipelineResult.bestVariation.id === v.id,
      })).sort((a, b) => (b.consensus?.total || 0) - (a.consensus?.total || 0))
    : []

  const bestVariation = pipelineResult?.bestVariation

  const totalJudgesDone = Array.from(judgeResults.values()).reduce((sum, jr) => sum + jr.length, 0)
  const totalJudgesExpected = variationCount * 5

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Failed Runs Panel (above config when errors exist) ── */}
      <PipelineErrorPanel onRetry={runPipeline} isRunning={isRunning} />

      {/* ── Pipeline Stats Summary ── */}
      <PipelineStatsSummary />

      {/* ── Configure Pipeline Card ── */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
      <Card className="glass-card-strong border-gradient rounded-xl overflow-hidden backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Rocket className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-emerald-400">🏁 Rally Pipeline v14.0</h3>
                <Badge className="bg-emerald-500/15 text-emerald-400 text-[9px] px-1.5 py-0 border-0">
                  SSE Live
                </Badge>
              </div>
              <p className="text-[11px] text-foreground/70 leading-relaxed">
                Full autonomous content generation pipeline with multi-judge scoring, competitive analysis, and feedback loop optimization.
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              {/* Campaign selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Campaign</span>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  disabled={isRunning}
                  className="h-7 rounded-lg border border-border/50 bg-background/50 px-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-all max-w-[250px] truncate search-ring"
                >
                  <option value="">Default (file-based active)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.source === 'db' ? '(DB)' : '(File)'}
                      {!c.isActive ? ' [ended]' : ''}
                      {c.missions?.length > 0 || c.knowledgeBase ? ' ✓' : ' ⚠'}
                    </option>
                  ))}
                </select>
                {selectedCampaignId && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 text-[9px] px-1.5 py-0 border-0">
                    Selected
                  </Badge>
                )}
              </div>

              {/* Variation count */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Variations</span>
                <div className="flex items-center gap-1">
                  {[2, 3, 4].map(n => (
                    <Button
                      key={n}
                      size="sm"
                      variant={variationCount === n ? 'default' : 'outline'}
                      disabled={isRunning}
                      className={cn(
                        'h-7 w-8 p-0 text-[11px] font-mono transition-colors',
                        variationCount === n
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'border-border/50 hover:border-border'
                      )}
                      onClick={() => setVariationCount(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Feedback loops */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Feedback Loops</span>
                <div className="flex items-center gap-1">
                  {[1, 2].map(n => (
                    <Button
                      key={n}
                      size="sm"
                      variant={maxFeedbackLoops === n ? 'default' : 'outline'}
                      disabled={isRunning}
                      className={cn(
                        'h-7 w-8 p-0 text-[11px] font-mono transition-colors',
                        maxFeedbackLoops === n
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                          : 'border-border/50 hover:border-border'
                      )}
                      onClick={() => setMaxFeedbackLoops(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom instructions */}
            <Textarea
              placeholder="Optional: Add custom instructions (e.g., 'use personal story about agency experience', 'focus on GenLayer AI scoring', 'write in Indonesian')..."
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              disabled={isRunning}
              className="min-h-[56px] text-xs bg-muted/20 border-border/50 resize-none placeholder:text-muted-foreground/50"
            />

            {/* Run/Stop button */}
            <div className="flex items-center gap-2">
              {!isRunning ? (
                <Button
                  onClick={runPipeline}
                  disabled={isRunning}
                  className={cn(
                    "h-10 px-5 text-sm bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border gap-2 font-medium rounded-lg transition-all duration-300 pulse-glow-emerald"
                  )}
                >
                  <Rocket className={cn("h-4 w-4", "animate-pulse")} />
                  Run Pipeline
                </Button>
              ) : (
                <>
                  <Button
                    onClick={stopPipeline}
                    variant="outline"
                    className="h-9 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
                  >
                    <X className="h-4 w-4" />
                    Stop
                  </Button>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                    Pipeline running...
                  </div>
                </>
              )}
              {pipelineResult && !isRunning && (
                <>
                  <Button
                    onClick={() => {
                      const best = pipelineResult.bestVariation
                      if (!best) return
                      const draft = {
                        id: crypto.randomUUID(),
                        campaignName: pipelineResult.campaign?.title || 'Unknown Campaign',
                        score: best.consensus.total,
                        date: new Date().toISOString(),
                        content: best.text,
                      }
                      const updated = [draft, ...savedDrafts].slice(0, 20)
                      setSavedDrafts(updated)
                      localStorage.setItem('rally-drafts', JSON.stringify(updated))
                      toast.success('Draft saved!', { description: `${draft.campaignName} — ${draft.score.toFixed(1)}/18` })
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1.5"
                  >
                    <Save className="h-3 w-3" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={resetPipeline}
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5 ml-auto"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reset
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* ── Saved Drafts ── */}
      {savedDrafts.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border border-border/40 rounded-xl">
          <CardContent className="p-3">
            <button
              className="flex items-center gap-2 w-full text-left"
              onClick={() => setDraftsExpanded(!draftsExpanded)}
            >
              <History className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold">Saved Drafts</span>
              <Badge variant="outline" className="text-[9px] font-mono text-emerald-400 border-emerald-500/30">{savedDrafts.length}</Badge>
              <ChevronDown className={cn('h-3 w-3 ml-auto text-muted-foreground transition-transform duration-200', draftsExpanded && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {draftsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {savedDrafts.map(draft => (
                      <div key={draft.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/30 hover:border-emerald-500/15 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-semibold truncate">{draft.campaignName}</span>
                            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border-0 px-1.5 py-0">{draft.score.toFixed(1)}/18</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{draft.content.substring(0, 100)}</p>
                          <p className="text-[9px] text-muted-foreground/60 font-mono mt-0.5">{new Date(draft.date).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            className="h-6 w-6 p-0 rounded-md hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => {
                              navigator.clipboard.writeText(draft.content)
                              toast.success('Draft content copied!')
                            }}
                            title="Copy content"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            className="h-6 w-6 p-0 rounded-md hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              const updated = savedDrafts.filter(d => d.id !== draft.id)
                              setSavedDrafts(updated)
                              localStorage.setItem('rally-drafts', JSON.stringify(updated))
                              toast.success('Draft deleted')
                            }}
                            title="Delete draft"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card className="bg-destructive/5 border border-destructive/30 rounded-xl">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-destructive font-medium">Pipeline Error</p>
                  <p className="text-[11px] text-destructive/80 mt-0.5">{error}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setError(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pipeline Progress (when running or completed) ── */}
      {(isRunning || steps.some(s => s.status !== 'pending')) && (
        <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl overflow-hidden">
          <CardContent className="p-4">
            {/* Timer header */}
            <div className="flex items-center gap-2 mb-4">
              <Timer className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium">
                {isRunning ? 'Pipeline Running' : pipelineResult ? 'Pipeline Complete' : 'Pipeline'}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono ml-auto">
                ⏱️ {formatTime(elapsedTime)}
              </Badge>
            </div>

            {/* Steps */}
            <div className="space-y-0">
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1
                const isStep8 = step.step === 8
                const isStep10 = step.step === 10
                const isExpanded = expandedStep === step.step

                return (
                  <div key={step.step}>
                    {/* Step row */}
                    <div
                      className={cn(
                        'cursor-pointer rounded-lg -mx-1 px-1 py-0.5 transition-colors',
                        (isStep8 || isStep10) && 'hover:bg-muted/10',
                        isExpanded && 'bg-muted/10',
                      )}
                      onClick={() => {
                        if (isStep8 || isStep10) {
                          setExpandedStep(isExpanded ? null : step.step)
                        }
                      }}
                    >
                      <StepItem step={step} isLast={isLast} />
                    </div>

                    {/* ── Step 8 Expanded: Judge Panel ── */}
                    {isStep8 && isExpanded && (step.status === 'running' || step.status === 'complete') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="ml-10 mb-3"
                      >
                        <Card className="bg-muted/5 border border-border/30 rounded-lg overflow-hidden">
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-[11px] font-medium">Judge Panel Results</span>
                              <Badge variant="outline" className="text-[9px] font-mono ml-auto">
                                {totalJudgesDone}/{totalJudgesExpected}
                              </Badge>
                            </div>

                            {Array.from(variations.entries()).map(([varId, varData], varIdx) => (
                              <div key={varId} className={cn(varIdx > 0 && 'mt-3 pt-3 border-t border-border/20')}>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-5 w-5 rounded-md bg-muted/30 flex items-center justify-center text-[9px] font-bold">
                                    {String.fromCharCode(65 + varIdx)}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                    {varData.angle?.substring(0, 40) || `Variation ${varIdx + 1}`}
                                  </span>
                                  {consensusResults.get(varId) && (
                                    <Badge className={cn(
                                      'text-[9px] px-1.5 py-0 border-0 ml-auto',
                                      consensusResults.get(varId)!.total >= 15
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : 'bg-amber-500/15 text-amber-400'
                                    )}>
                                      {consensusResults.get(varId)!.total.toFixed(1)}/18
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                  {Array.from({ length: 5 }).map((_, jIdx) => {
                                    const judges = judgeResults.get(varId) || []
                                    const judge = judges.find(j => j.judgeNum === jIdx + 1)
                                    const isPending = !judge && step.status === 'running'
                                    return <JudgeCard key={jIdx} judge={judge || null} isPending={isPending} />
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </motion.div>
                    )}

                    {/* ── Step 10 Expanded: Feedback Loops ── */}
                    {isStep10 && isExpanded && feedbackLoops.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="ml-10 mb-3 space-y-2"
                      >
                        {feedbackLoops.map(fl => (
                          <FeedbackLoopCard
                            key={fl.loop}
                            data={fl}
                            isActive={fl.newBest === undefined}
                          />
                        ))}
                        {step.status === 'running' && feedbackLoops.every(fl => fl.newBest !== undefined) && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                            Evaluating feedback results...
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Final Results ── */}
      <AnimatePresence>
        {pipelineResult && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* Best Variation */}
            {bestVariation && (
              <Card className={cn(
                'border rounded-xl overflow-hidden',
                getVerdictBg(bestVariation.consensus?.verdict || 'strong'),
                'border-border/50',
              )}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    <h3 className="text-sm font-bold">🏆 Pipeline Complete!</h3>
                    <Badge variant="outline" className="text-[10px] font-mono ml-auto">
                      ⏱️ {formatTime(pipelineResult.pipelineTime)}
                    </Badge>
                    {pipelineResult.feedbackLoops > 0 && (
                      <Badge className="bg-amber-500/15 text-amber-400 text-[10px] px-1.5 py-0 border-0">
                        {pipelineResult.feedbackLoops} feedback loops
                      </Badge>
                    )}
                  </div>

                  <Separator className="bg-border/30 mb-3" />

                  {/* Best Variation Label */}
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">BEST VARIATION</span>
                  </div>

                  {/* Score bar */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn(
                      'text-lg font-bold font-mono',
                      getVerdictColor(bestVariation.consensus?.verdict || 'strong')
                    )}>
                      {bestVariation.consensus?.total.toFixed(1)}<span className="text-muted-foreground text-sm">/18</span>
                    </span>
                    <div className="flex-1">
                      <div className="h-3 bg-muted/20 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', getScoreBarColor(bestVariation.consensus?.verdict || 'strong'))}
                          style={{ width: `${((bestVariation.consensus?.total || 0) / 18) * 100}%` }}
                        />
                      </div>
                    </div>
                    {bestVariation.consensus?.verdict && (
                      <Badge className={cn(
                        'text-[10px] px-2 py-0.5 border capitalize',
                        getVerdictBg(bestVariation.consensus.verdict),
                        getVerdictColor(bestVariation.consensus.verdict),
                      )}>
                        {bestVariation.consensus.verdict}
                      </Badge>
                    )}
                  </div>

                  {/* Dimension scores */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {bestVariation.consensus?.averageScores && Object.entries(bestVariation.consensus.averageScores).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground">{getDimLabel(key)}:</span>
                        <span className="text-[10px] font-mono font-medium">{(val as number).toFixed(1)}</span>
                      </div>
                    ))}
                    <Separator orientation="vertical" className="h-3 bg-border/30" />
                    <span className="text-[9px] text-muted-foreground">σ {bestVariation.consensus?.stdDev.toFixed(1)}</span>
                    <span className="text-[9px] text-muted-foreground">5-Judge Panel</span>
                  </div>

                  {/* Angle badge */}
                  {bestVariation.angle && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-400 border-amber-500/30 mb-2">
                      {bestVariation.angle.substring(0, 60)}
                    </Badge>
                  )}

                  {/* Content */}
                  <div className="bg-muted/5 rounded-lg p-3 mb-3">
                    <ScrollArea className="max-h-[200px]">
                      <p className="text-xs leading-relaxed whitespace-pre-line text-foreground/90">
                        {bestVariation.text}
                      </p>
                    </ScrollArea>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-[11px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0 gap-1.5"
                      onClick={() => handleCopy(bestVariation.text)}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    {pipelineResult.campaign?.campaignUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] gap-1.5"
                        onClick={() => window.open(pipelineResult.campaign.campaignUrl, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Submit to Rally
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Variations Comparison */}
            {sortedVariations.length > 0 && (
              <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-xs font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-400" />
                    All Variations
                    <Badge variant="outline" className="text-[9px] font-mono ml-auto">
                      {sortedVariations.length} total
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {/* Quick comparison bars */}
                  <div className="flex items-end gap-2 h-8">
                    {sortedVariations.map((v, i) => {
                      const score = v.consensus?.total || 0
                      const isBest = v.isBest
                      return (
                        <div key={v.id} className="flex-1 flex flex-col items-center gap-0.5">
                          <span className={cn(
                            'text-[9px] font-mono font-bold',
                            isBest ? 'text-emerald-400' : 'text-muted-foreground'
                          )}>
                            {score.toFixed(1)}
                          </span>
                          <div className="w-full">
                            <div className="h-6 bg-muted/20 rounded-md overflow-hidden relative">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: '100%' }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className={cn(
                                  'absolute bottom-0 w-full rounded-md',
                                  isBest ? 'bg-emerald-500/40' : 'bg-amber-500/30'
                                )}
                                style={{ width: `${(score / 18) * 100}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-[8px] font-mono text-muted-foreground">
                            {String.fromCharCode(65 + i)}
                            {v.feedbackLoop !== undefined && <span className="text-amber-400">L{v.feedbackLoop}</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Individual variation cards */}
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2 pt-2">
                      {sortedVariations.map((v, i) => {
                        const varData = variations.get(v.id)
                        const isBest = v.isBest
                        const isOpen = expandedVariation === v.id
                        const verdict = v.consensus?.verdict || 'moderate'

                        return (
                          <motion.div
                            key={v.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <Card className={cn(
                              'border rounded-lg overflow-hidden transition-colors',
                              isBest ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/30 bg-card/30',
                            )}>
                              <div className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {/* Letter badge */}
                                  <div className={cn(
                                    'h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0',
                                    isBest ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted/50 text-muted-foreground'
                                  )}>
                                    {String.fromCharCode(65 + i)}
                                  </div>

                                  {/* Angle */}
                                  <span className="text-[10px] text-foreground/70 truncate flex-1">
                                    {varData?.angle?.substring(0, 50) || v.angle?.substring(0, 50)}
                                  </span>

                                  {/* Score */}
                                  <span className={cn(
                                    'text-xs font-bold font-mono shrink-0',
                                    getVerdictColor(verdict)
                                  )}>
                                    {v.consensus?.total.toFixed(1)}<span className="text-muted-foreground text-[10px]">/18</span>
                                  </span>

                                  {/* Verdict */}
                                  <Badge className={cn(
                                    'text-[8px] px-1.5 py-0 border capitalize shrink-0',
                                    getVerdictBg(verdict),
                                    getVerdictColor(verdict),
                                  )}>
                                    {verdict}
                                  </Badge>

                                  {/* Feedback loop badge */}
                                  {v.feedbackLoop !== undefined && (
                                    <Badge className="bg-amber-500/10 text-amber-400 text-[8px] px-1.5 py-0 border-0 shrink-0">
                                      L{v.feedbackLoop}
                                    </Badge>
                                  )}

                                  {/* Expand toggle */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 shrink-0"
                                    onClick={() => setExpandedVariation(isOpen ? null : v.id)}
                                  >
                                    {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </Button>
                                </div>

                                {/* Score bar */}
                                <div className="h-1 bg-muted/20 rounded-full overflow-hidden mt-2">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((v.consensus?.total || 0) / 18) * 100}%` }}
                                    transition={{ duration: 0.7, delay: i * 0.05 + 0.2 }}
                                    className={cn('h-full rounded-full', getScoreBarColor(verdict))}
                                  />
                                </div>
                              </div>

                              {/* Expanded content */}
                              <AnimatePresence>
                                {isOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="border-t border-border/20 px-3 py-3 space-y-3">
                                      {/* Dimension scores */}
                                      <div className="flex items-center gap-3 flex-wrap">
                                        {v.consensus?.averageScores && Object.entries(v.consensus.averageScores).map(([key, val]) => (
                                          <div key={key} className="flex items-center gap-1">
                                            <span className="text-[9px] text-muted-foreground">{getDimLabel(key)}</span>
                                            <span className="text-[10px] font-mono font-medium">{(val as number).toFixed(1)}</span>
                                          </div>
                                        ))}
                                        <Separator orientation="vertical" className="h-3 bg-border/30" />
                                        <span className="text-[9px] text-muted-foreground">σ {v.consensus?.stdDev.toFixed(1)}</span>
                                      </div>

                                      {/* Content */}
                                      <div className="bg-muted/5 rounded-lg p-2.5">
                                        <ScrollArea className="max-h-[150px]">
                                          <p className="text-[11px] leading-relaxed whitespace-pre-line text-foreground/85">
                                            {varData?.text || v.text || ''}
                                          </p>
                                        </ScrollArea>
                                      </div>

                                      {/* Verification */}
                                      {varData?.analysis && (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-[9px] text-muted-foreground">Compliance:</span>
                                          <Badge variant="outline" className={cn(
                                            'text-[8px] px-1 py-0',
                                            varData.analysis.passed
                                              ? 'text-emerald-400 border-emerald-500/30'
                                              : 'text-destructive border-destructive/30'
                                          )}>
                                            {varData.analysis.passed ? 'Passed' : 'Issues'}
                                          </Badge>
                                          {varData.analysis.hasEmDash && (
                                            <Badge variant="outline" className="text-[8px] px-1 py-0 text-destructive border-destructive/30">Em-dash</Badge>
                                          )}
                                          {varData.analysis.hasHashtag && (
                                            <Badge variant="outline" className="text-[8px] px-1 py-0 text-destructive border-destructive/30">Hashtag</Badge>
                                          )}
                                          {varData.analysis.startsWithMention && (
                                            <Badge variant="outline" className="text-[8px] px-1 py-0 text-destructive border-destructive/30">Starts @</Badge>
                                          )}
                                          {varData.analysis.aiWordCount > 0 && (
                                            <Badge variant="outline" className="text-[8px] px-1 py-0 text-amber-400 border-amber-500/30">
                                              {varData.analysis.aiWordCount} AI words
                                            </Badge>
                                          )}
                                          <span className="text-[8px] text-muted-foreground font-mono">{varData.analysis.wordCount}w</span>
                                        </div>
                                      )}

                                      {/* Judge details */}
                                      {judgeResults.get(v.id) && (
                                        <div className="space-y-1.5">
                                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Judge Details</span>
                                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                                            {judgeResults.get(v.id)!.map(judge => (
                                              <JudgeCard key={judge.judgeNum} judge={judge} />
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Copy button */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                        onClick={() => handleCopy(varData?.text || v.text || '')}
                                      >
                                        <Copy className="h-3 w-3" />
                                        Copy variation
                                      </Button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Campaign Info */}
            {pipelineResult.campaign && (
              <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold">Campaign Details</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {pipelineResult.campaign.title && (
                      <div className="bg-muted/20 rounded-lg p-2">
                        <p className="text-[9px] text-muted-foreground uppercase">Campaign</p>
                        <p className="text-[11px] font-medium truncate">{pipelineResult.campaign.title}</p>
                      </div>
                    )}
                    {pipelineResult.campaign.reward && (
                      <div className="bg-muted/20 rounded-lg p-2">
                        <p className="text-[9px] text-muted-foreground uppercase">Reward</p>
                        <p className="text-[11px] font-bold font-mono text-emerald-400">{pipelineResult.campaign.reward}</p>
                      </div>
                    )}
                    {pipelineResult.campaign.deadline && (
                      <div className="bg-muted/20 rounded-lg p-2">
                        <p className="text-[9px] text-muted-foreground uppercase">Deadline</p>
                        <p className="text-[11px] font-mono">{pipelineResult.campaign.deadline}</p>
                      </div>
                    )}
                    {pipelineResult.campaign.mission && (
                      <div className="bg-muted/20 rounded-lg p-2 col-span-2 md:col-span-1">
                        <p className="text-[9px] text-muted-foreground uppercase">Mission</p>
                        <p className="text-[10px] text-foreground/70 line-clamp-2">{pipelineResult.campaign.mission}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ── */}
      {!isRunning && !pipelineResult && !error && !steps.some(s => s.status !== 'pending') && (
        <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
          <CardContent className="p-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <Rocket className="h-6 w-6 text-emerald-400/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Ready to Run Pipeline</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Configure your pipeline settings above and click &quot;Run Pipeline&quot; to start the autonomous content generation process with multi-judge scoring and feedback optimization.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-emerald-400/50" />
                {variationCount} Variations
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-emerald-400/50" />
                {variationCount * 5} Judges
              </span>
              <span className="flex items-center gap-1">
                <RotateCcw className="h-3 w-3 text-amber-400/50" />
                {maxFeedbackLoops} Feedback Loops
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Pipeline Quick Score Cards ── */}
      {!loadingHistory && history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl overflow-hidden">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-emerald-400" />
                  Quick Score Cards
                </CardTitle>
                <button
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  onClick={() => {
                    document.getElementById('pipeline-history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  View All
                  <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {history.slice(0, 5).map((run, idx) => {
                  const isExpanded = expandedHistoryId === run.id
                  const verdict = run.verdict || ''
                  const isError = run.status === 'error'
                  const runDate = new Date(run.createdAt)
                  const dateStr = runDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const timeStr = runDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

                  return (
                    <motion.div
                      key={run.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.3 }}
                      className={cn(
                        'min-w-[180px] max-w-[200px] shrink-0 rounded-lg border p-3 cursor-pointer transition-all duration-200 hover:shadow-md',
                        isError
                          ? 'bg-destructive/5 border-destructive/20 hover:border-destructive/40'
                          : run.bestScore != null && run.bestScore >= 16
                            ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                            : run.bestScore != null && run.bestScore >= 14
                              ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                              : 'bg-card border-border/30 hover:border-border/50'
                      )}
                      onClick={() => setExpandedHistoryId(isExpanded ? null : run.id)}
                    >
                      {/* Score badge */}
                      <div className="flex items-center justify-between mb-2">
                        {run.bestScore != null ? (
                          <div className={cn(
                            'h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold font-mono',
                            run.bestScore >= 17 ? 'bg-emerald-500/20 text-emerald-400' :
                            run.bestScore >= 15 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/15 text-red-400'
                          )}>
                            {run.bestScore.toFixed(0)}
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted/20 flex items-center justify-center">
                            <X className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className={cn(
                          'text-[8px] px-1.5 py-0 border capitalize',
                          isError
                            ? 'bg-destructive/15 text-destructive border-destructive/30'
                            : `${getVerdictBg(verdict)} ${getVerdictColor(verdict)}`
                        )}>
                          {isError ? 'Error' : verdict || 'N/A'}
                        </Badge>
                      </div>

                      {/* Meta */}
                      <p className="text-[10px] text-muted-foreground truncate">
                        {dateStr} {timeStr}
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                        {run.variations} var{run.variations !== 1 ? 's' : ''}
                        {run.feedbackLoops > 0 ? ` • ${run.feedbackLoops} loop${run.feedbackLoops !== 1 ? 's' : ''}` : ''}
                      </p>

                      {/* Expanded: dimension breakdown placeholder */}
                      <AnimatePresence>
                        {isExpanded && run.bestScore != null && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 pt-2 border-t border-border/20 space-y-1">
                              {run.bestAngle && (
                                <p className="text-[9px] text-muted-foreground truncate">
                                  <span className="text-foreground/60">Angle:</span> {run.bestAngle}
                                </p>
                              )}
                              <div className="grid grid-cols-3 gap-1 mt-1">
                                {['O', 'A', 'Ac', 'C', 'E', 'T'].map((dim, di) => {
                                  const dimScore = run.bestScore ? (run.bestScore / 6) * (0.7 + Math.sin(di * 1.5) * 0.3) : 0
                                  return (
                                    <div key={dim} className="text-center">
                                      <p className="text-[7px] text-muted-foreground">{dim}</p>
                                      <div className="h-1 bg-muted/20 rounded-full mt-0.5 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-emerald-500/60"
                                          style={{ width: `${Math.min((dimScore / 3) * 100, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Run History with Visualization ── */}
      <RunHistoryPanel />

      {/* ── Score History Chart ── */}
      <ScoreHistoryChart />

      {/* ── Pipeline Comparison Dialog ── */}
      <PipelineComparison open={compareOpen} onOpenChange={setCompareOpen} />

      {/* ── Pipeline History ── */}
      <Card id="pipeline-history-section" className="bg-card/50 backdrop-blur border border-border/50 rounded-xl overflow-hidden">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-400" />
              Pipeline History
            </CardTitle>
            {!loadingHistory && (
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => setCompareOpen(true)}
                  disabled={history.length < 2}
                >
                  <GitCompareArrows className="h-3 w-3" />
                  Compare Runs
                </Button>
                <Badge variant="outline" className="text-[9px] font-mono">
                  {history.length} run{history.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <div className="relative mx-auto w-14 h-14 mb-3">
                <div className="absolute inset-0 bg-emerald-500/5 rounded-full animate-float" />
                <div className="relative h-full flex items-center justify-center">
                  <History className="h-6 w-6 text-emerald-400/30" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">No pipeline runs yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Execute the pipeline above to see results here</p>
              <div className="mt-3 flex items-center justify-center gap-1">
                <div className="h-1 w-1 rounded-full bg-emerald-400/30" />
                <div className="h-1 w-8 rounded-full bg-gradient-to-r from-emerald-400/20 via-emerald-400/40 to-emerald-400/20" />
                <div className="h-1 w-1 rounded-full bg-emerald-400/30" />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {(showAllHistory ? history : history.slice(0, 10)).map((run) => {
                const isExpanded = expandedHistoryId === run.id
                const runDate = new Date(run.createdAt)
                const dateStr = runDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const timeStr = runDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                const isError = run.status === 'error'
                const verdict = run.verdict || ''

                return (
                  <motion.div
                    key={run.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                        isExpanded ? 'bg-muted/10' : 'hover:bg-muted/5'
                      )}
                      onClick={() => setExpandedHistoryId(isExpanded ? null : run.id)}
                    >
                      {/* Status indicator */}
                      <div className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        isError ? 'bg-destructive' : 'bg-emerald-400'
                      )} />

                      {/* Date/Time */}
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {dateStr} {timeStr}
                      </span>

                      {/* Score */}
                      {run.bestScore != null && (
                        <span className={cn(
                          'text-[11px] font-bold font-mono',
                          getVerdictColor(verdict)
                        )}>
                          {run.bestScore.toFixed(1)}<span className="text-muted-foreground text-[9px]">/18</span>
                        </span>
                      )}

                      {/* Verdict badge */}
                      {verdict && (
                        <Badge className={cn(
                          'text-[8px] px-1.5 py-0 border capitalize',
                          getVerdictBg(verdict),
                          getVerdictColor(verdict),
                        )}>
                          {verdict}
                        </Badge>
                      )}

                      {isError && (
                        <Badge className="text-[8px] px-1.5 py-0 bg-destructive/15 text-destructive border-destructive/30 border capitalize">
                          Error
                        </Badge>
                      )}

                      {/* Meta info */}
                      {!isError && (
                        <>
                          <span className="text-[9px] text-muted-foreground ml-auto">
                            {run.variations} var
                          </span>
                          {run.feedbackLoops > 0 && (
                            <span className="text-[9px] text-amber-400">
                              {run.feedbackLoops} loop{run.feedbackLoops !== 1 ? 's' : ''}
                            </span>
                          )}
                          {run.pipelineTime != null && (
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {formatTime(run.pipelineTime)}
                            </span>
                          )}
                        </>
                      )}

                      {/* Expand toggle */}
                      <div className="shrink-0 ml-1">
                        {isExpanded
                          ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                          : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        }
                      </div>
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border/20 px-2.5 py-2.5 ml-4 space-y-2">
                            {/* Angle */}
                            {run.bestAngle && (
                              <p className="text-[10px] text-muted-foreground">
                                <span className="text-foreground/60 font-medium">Angle:</span> {run.bestAngle.substring(0, 80)}
                              </p>
                            )}
                            {/* Content */}
                            {run.bestContent && (
                              <div className="bg-muted/5 rounded-lg p-2.5">
                                <ScrollArea className="max-h-[150px]">
                                  <p className="text-[11px] leading-relaxed whitespace-pre-line text-foreground/85">
                                    {run.bestContent}
                                  </p>
                                </ScrollArea>
                              </div>
                            )}
                            {/* Copy button */}
                            {run.bestContent && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopy(run.bestContent || '')
                                }}
                              >
                                <Copy className="h-3 w-3" />
                                Copy content
                              </Button>
                            )}
                            {!run.bestContent && isError && (
                              <p className="text-[10px] text-muted-foreground italic">
                                No content captured for this run.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}

              {/* Show All / Show Less */}
              {history.length > 10 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[10px] text-muted-foreground hover:text-foreground gap-1 mt-1"
                  onClick={() => setShowAllHistory(!showAllHistory)}
                >
                  {showAllHistory ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show All ({history.length} runs)
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Latest Report Card ── */}
      <LatestReportCard />

      {/* ── Copy Toast ── */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-4 py-2 flex items-center gap-2 backdrop-blur-sm"
          >
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-medium">Copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Helper: summarize step results for display ──────────────────────────────

function summarizeStepResult(step: number, result: any): string {
  if (!result) return 'Complete'

  switch (step) {
    case 1:
      return result.title || result.campaignTitle || 'Campaign selected'
    case 2:
      return result.patterns ? `${result.patterns} patterns loaded` : result.count ? `${result.count} records loaded` : 'Data fetched'
    case 3:
      return result.bias !== undefined ? `Bias: ${result.bias}` : result.calibrated !== undefined ? 'Calibration done' : 'Calibrated'
    case 4:
      return result.overused !== undefined || result.gaps !== undefined
        ? `${result.overused || 0} overused, ${result.gaps || 0} gaps`
        : 'Analysis complete'
    case 5:
      return result.hardestDimensions !== undefined
        ? `${result.hardestDimensions} hardest dims`
        : result.dimensions ? `${result.dimensions} dimensions analyzed` : 'Deep analysis done'
    case 6:
      return result.count ? `${result.count} variations` : 'Variations generated'
    case 7:
      return result.passed !== undefined ? `${result.passed}/${result.total} passed` : 'Verification done'
    case 8:
      return result.done !== undefined ? `${result.done}/${result.total} judges` : 'Judging complete'
    case 9:
      return result.consensusCount ? `${result.consensusCount} consensuses` : 'Consensus reached'
    case 10:
      return result.improved ? `Improved by ${result.improved}` : 'Feedback loop done'
    case 11:
      return result.saved ? 'Output saved' : 'Complete'
    default:
      return 'Complete'
  }
}
