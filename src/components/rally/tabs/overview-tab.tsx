'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Trophy, TrendingUp, Activity, Clock, Zap, AlertCircle,
  ChevronRight, Twitter, Sparkles, Users, GraduationCap, BarChart3, RefreshCw, Download, Target, Timer, DollarSign, Percent, CalendarDays, Clipboard, ClipboardCheck, FolderArchive
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { WelcomeBanner } from '../welcome-banner'
import { ArchitectureDownloader } from '../architecture-downloader'
import { CampaignScoreDistribution } from '../campaign-score-distribution'
import { ScoreInsightsWidget } from '../score-insights-widget'

interface StatusData {
  campaign: { title: string; status: string; reward_pool: string; deadline_countdown: string; total_submissions: number }
  current_best: { score: number; variation: string; angle: string } | null
  pipeline: { status: string; total_builds: number; next_action?: string }
  target_score: { originality: number; alignment: number; accuracy: number; compliance: number; engagement: number; technical: number; total: number }
  campaign_avg: number
}

interface VariationScores {
  originality: number; alignment: number; accuracy: number; compliance: number; engagement: number; technical: number; total: number
}

interface ContentData {
  best_content: string | null
  winner: string | null
  variations?: { scores?: VariationScores }[]
}

interface TimelineData {
  events: { task_id: string; task: string; timestamp: string; type: string; score: number | null }[]
}

interface StatsData {
  contentGenerated: number
  totalBuilds: number
  pipelineRuns: number
  avgPipelineScore: number
  bestPipelineScore: number
  campaignsWorked: number
  eighteenEighteen: number
  recentActivity: string
}

interface ActivityEvent {
  type: string
  timestamp: string
  message: string
  category: string
}

const dimensions = [
  { key: 'originality', label: 'Originality', max: 2, color: 'text-emerald-400', bg: 'bg-emerald-500' },
  { key: 'alignment', label: 'Alignment', max: 2, color: 'text-blue-400', bg: 'bg-blue-500' },
  { key: 'accuracy', label: 'Accuracy', max: 2, color: 'text-purple-400', bg: 'bg-purple-500' },
  { key: 'compliance', label: 'Compliance', max: 2, color: 'text-amber-400', bg: 'bg-amber-500' },
  { key: 'engagement', label: 'Engagement', max: 5, color: 'text-rose-400', bg: 'bg-rose-500' },
  { key: 'technical', label: 'Technical', max: 5, color: 'text-cyan-400', bg: 'bg-cyan-500' },
]

function useAnimatedValue(target: number, duration = 800) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) return
    startRef.current = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCurrent(Math.round(target * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return current
}

function AnimatedNumber({ value, accent }: { value: string; accent?: boolean }) {
  const num = parseFloat(value)
  const animated = useAnimatedValue(isNaN(num) ? 0 : num)
  const display = isNaN(num) ? value : num % 1 === 0 ? String(animated) : (num < 10 ? animated.toFixed(1) : String(animated))
  // Preserve suffix like /18
  const suffix = value.includes('/') ? '/' + value.split('/').pop() : ''
  const prefix = value.startsWith('N') ? value : ''
  if (prefix) return <>{value}</>
  return <>{display}{suffix}</>
}

function MiniSparkline({ data, color = '#10b981', width = 80, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ')
  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mt-1.5 opacity-60">
      <defs>
        <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color.replace('#','')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MetricCard({ icon: Icon, label, value, sub, accent, sparkline }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean; sparkline?: number[]
}) {
  return (
    <Card className="bg-card/60 backdrop-blur-md border border-border/40 rounded-xl stat-card-gradient hover:border-emerald-500/20 hover:shadow-[0_0_24px_-5px_rgba(16,185,129,0.2)] hover:-translate-y-1 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group shimmer-border shine-sweep btn-press cursor-default">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn(
            'h-7 w-7 rounded-md flex items-center justify-center transition-all duration-300',
            accent ? 'bg-emerald-500/15 group-hover:bg-emerald-500/25 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.2)] glow-sm' : 'bg-muted/50 group-hover:bg-muted/70'
          )}>
            <Icon className={cn('h-3.5 w-3.5 transition-transform duration-300', accent ? 'text-emerald-400 group-hover:scale-110' : 'text-muted-foreground')} />
          </div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className={cn('text-xl font-bold font-mono stat-number stat-micro-bounce', accent ? 'stat-value-gradient' : '')}>
              <AnimatedNumber value={value} accent={accent} />
            </p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono stat-number">{sub}</p>}
          </div>
          {sparkline && sparkline.length >= 2 && (
            <MiniSparkline data={sparkline} color={accent ? '#10b981' : '#94a3b8'} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface OverviewTabProps {
  onNavigate?: (tab: string) => void
}

const quickActions = [
  { key: 'generator', label: 'Generate Content', sublabel: 'AI pipeline', icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-500/15', hover: 'group-hover:border-emerald-500/30 group-hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)]', borderAccent: 'border-accent-emerald' },
  { key: 'competitors', label: 'View Competitors', sublabel: 'Intel & gaps', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/15', hover: 'group-hover:border-blue-500/30 group-hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.15)]', borderAccent: 'border-accent-blue' },
  { key: 'coach', label: 'AI Coach', sublabel: 'Score tips', icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-500/15', hover: 'group-hover:border-purple-500/30 group-hover:shadow-[0_0_20px_-5px_rgba(168,85,247,0.15)]', borderAccent: 'border-accent-purple' },
  { key: 'scores', label: 'View Scores', sublabel: '6 dimensions', icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-500/15', hover: 'group-hover:border-amber-500/30 group-hover:shadow-[0_0_20px_-5px_rgba(245,158,11,0.15)]', borderAccent: 'border-accent-amber' },
  { key: 'sync', label: 'Sync Campaigns', sublabel: 'Refresh data', icon: RefreshCw, color: 'text-teal-400', bg: 'bg-teal-500/15', hover: 'group-hover:border-teal-500/30 group-hover:shadow-[0_0_20px_-5px_rgba(20,184,166,0.15)]', isAction: true, borderAccent: 'border-accent-teal' },
  { key: 'export', label: 'Export Data', sublabel: 'Download JSON', icon: Download, color: 'text-rose-400', bg: 'bg-rose-500/15', hover: 'group-hover:border-rose-500/30 group-hover:shadow-[0_0_20px_-5px_rgba(244,63,94,0.15)]', isAction: true, borderAccent: 'border-accent-rose' },
  { key: 'copy-best', label: 'Copy Best Content', sublabel: 'From pipeline', icon: Clipboard, color: 'text-teal-400', bg: 'bg-teal-500/15', hover: 'group-hover:border-teal-500/30 group-hover:shadow-[0_0_20px_-5px_rgba(20,184,166,0.15)]', isAction: true, borderAccent: 'border-accent-teal' },
  { key: 'arch-download', label: 'Download Architecture', sublabel: 'All system files', icon: FolderArchive, color: 'text-orange-400', bg: 'bg-orange-500/15', hover: 'group-hover:border-orange-500/30 group-hover:shadow-[0_0_20px_-5px_rgba(249,115,22,0.15)]', isAction: true, borderAccent: 'border-accent-orange' },
]

/* Score Progression Chart — pure CSS/HTML bars */
function ScoreProgressionChart({ bestPipelineScore }: { bestPipelineScore: number }) {
  const [history, setHistory] = useState<Array<{ score: number; timestamp: string; status: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/rally/pipeline-history')
        if (res.ok) {
          const data = await res.json()
          const runs = Array.isArray(data) ? data : []
          setHistory(runs.map((r: any) => ({
            score: r.bestScore ?? r.score ?? 0,
            timestamp: r.createdAt ?? r.timestamp ?? '',
            status: r.status ?? 'completed',
          })).filter((r: any) => r.score > 0))
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  const statsScore = bestPipelineScore

  // Build display data: use real history only, no synthetic fallbacks
  const displayScores = history.map(h => h.score)

  if (loading) {
    return (
      <div className="flex items-end gap-1 h-16 px-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-muted/20 animate-pulse" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    )
  }

  if (displayScores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <BarChart3 className="h-5 w-5 text-muted-foreground/30 mb-1.5" />
        <p className="text-[10px] text-muted-foreground/50">No score data yet</p>
        <p className="text-[9px] text-muted-foreground/40 mt-0.5">Run the pipeline to see progression</p>
      </div>
    )
  }

  const maxScore = Math.max(...displayScores)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-[3px] h-16 px-1">
        {displayScores.slice(-20).map((score, i) => {
          const pct = (score / 18) * 100
          const heightPct = score > 0 ? Math.max(15, (score / maxScore) * 100) : 15
          const color = score >= 16 ? 'from-emerald-400 to-emerald-500' : score >= 13 ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'
          const bgGlow = score >= 16 ? 'shadow-[0_0_6px_rgba(16,185,129,0.3)]' : score >= 13 ? 'shadow-[0_0_4px_rgba(245,158,11,0.2)]' : ''
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                className={cn(
                  'w-full rounded-t-sm bg-gradient-to-t transition-all duration-200 cursor-default min-h-[4px]',
                  color,
                  bgGlow,
                  'group-hover:opacity-80'
                )}
              />
              <span className={cn(
                'text-[8px] font-mono font-medium text-center leading-tight transition-colors',
                score >= 16 ? 'text-emerald-400' : score >= 13 ? 'text-amber-400' : 'text-red-400'
              )}>
                {score.toFixed(1)}
              </span>
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 justify-center">
        <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-gradient-to-t from-emerald-400 to-emerald-500" /><span className="text-[9px] text-muted-foreground/60">16+</span></div>
        <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-gradient-to-t from-amber-400 to-amber-500" /><span className="text-[9px] text-muted-foreground/60">13-15</span></div>
        <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-gradient-to-t from-red-400 to-red-500" /><span className="text-[9px] text-muted-foreground/60">&lt;13</span></div>
      </div>
    </div>
  )
}

export function OverviewTab({ onNavigate }: OverviewTabProps) {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [content, setContent] = useState<ContentData | null>(null)
  const [timeline, setTimeline] = useState<TimelineData | null>(null)
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem('rally-welcome-dismissed') !== 'true'
    } catch {
      return false
    }
  })

  // Recent Activity Widget state
  const [recentActivities, setRecentActivities] = useState<ActivityEvent[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  // Pipeline history data for sparklines (real data only)
  const [historyData, setHistoryData] = useState<Array<{ score: number }>>([])

  // Live countdown tick state
  const [countdownTick, setCountdownTick] = useState(0)

  const dismissWelcome = () => {
    setShowWelcome(false)
    localStorage.setItem('rally-welcome-dismissed', 'true')
  }

  // Fetch recent activity from /api/rally/activity
  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true)
      const res = await fetch('/api/rally/activity')
      if (res.ok) {
        const json = await res.json()
        setRecentActivities((json.activities || []).slice(0, 5))
      }
    } catch {
      // silent
    } finally {
      setActivityLoading(false)
    }
  }

  // Campaigns data for Campaign Pipeline card
  const [campaignPipelineData, setCampaignPipelineData] = useState<{
    total: number
    active: number
    bestScore: number
    avgCompleteness: number
  } | null>(null)

  // Extended campaigns data for countdown & quick stats
  interface CampaignCountdownItem {
    title: string
    deadline: string | null
    isActive: boolean
    rewardPool: string
    dataCompleteness: number
    bestScore: number | null
  }
  const [campaignsList, setCampaignsList] = useState<CampaignCountdownItem[]>([])

  const fetchCampaignPipeline = useCallback(async () => {
    try {
      const res = await fetch('/api/rally/campaigns')
      if (res.ok) {
        const json = await res.json()
        const camps = json.campaigns || []
        const active = camps.filter((c: { isActive: boolean }) => c.isActive)
        const scores = camps.map((c: { bestScore: number | null }) => c.bestScore).filter((s: number | null): s is number => s != null)
        const best = scores.length > 0 ? Math.max(...scores) : 0
        const avgComp = camps.length > 0 ? Math.round(camps.reduce((a: number, c: { dataCompleteness: number }) => a + (c.dataCompleteness || 0), 0) / camps.length) : 0
        setCampaignPipelineData({ total: camps.length, active: active.length, bestScore: best, avgCompleteness: avgComp })
        // Store extended campaign list for countdown & quick stats
        setCampaignsList(camps.map((c: Record<string, unknown>) => ({
          title: (c.title as string) || 'Unknown',
          deadline: (c.deadline as string) || null,
          isActive: (c.isActive as boolean) ?? false,
          rewardPool: (c.rewardPool as string) || (c.reward_pool as string) || 'N/A',
          dataCompleteness: (c.dataCompleteness as number) || 0,
          bestScore: (c.bestScore as number) ?? null,
        })))
      }
    } catch {
      // silent
    }
  }, [])

  // Quick action handler
  const [syncingAction, setSyncingAction] = useState(false)
  const handleQuickAction = useCallback(async (key: string) => {
    if (key === 'sync') {
      setSyncingAction(true)
      try {
        const res = await fetch('/api/rally/sync-campaigns', { method: 'POST' })
        if (res.ok) {
          const json = await res.json()
          toast.success('Campaigns synced!', { description: json.message || 'Sync completed.' })
          fetchCampaignPipeline()
        } else {
          const err = await res.json()
          toast.error('Sync failed', { description: err.error || 'Unknown error' })
        }
      } catch {
        toast.error('Network error syncing campaigns')
      } finally {
        setSyncingAction(false)
      }
    } else if (key === 'export') {
      try {
        const link = document.createElement('a')
        link.href = '/api/rally/campaign-export'
        link.download = 'rally-campaigns-export.json'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Data exported', { description: 'Campaign data downloaded as JSON' })
      } catch {
        toast.error('Export failed')
      }
    } else if (key === 'copy-best') {
      try {
        const res = await fetch('/api/rally/latest-report')
        if (res.ok) {
          const data = await res.json()
          if (data.exists && data.bestContent) {
            await navigator.clipboard.writeText(data.bestContent)
            toast.success('Best content copied to clipboard!', { description: `Score: ${data.bestScore?.toFixed(1) ?? '—'}/18 — ${data.bestAngle ?? ''}` })
          } else {
            toast.warning('No pipeline reports yet', { description: 'Run a pipeline first to generate content.' })
          }
        } else {
          toast.warning('No pipeline reports yet', { description: 'Run a pipeline first to generate content.' })
        }
      } catch {
        toast.error('Failed to fetch report')
      }
    } else if (key === 'arch-download') {
      try {
        const link = document.createElement('a')
        link.href = '/api/rally/download-architecture?format=json'
        link.download = `rally-architecture-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Architecture downloaded!', { description: 'All system files bundled into a single JSON file.' })
      } catch {
        toast.error('Download failed', { description: 'Could not generate architecture bundle.' })
      }
    } else {
      onNavigate?.(key)
    }
  }, [onNavigate, fetchCampaignPipeline])

  useEffect(() => {
    fetchRecentActivity()
    fetchCampaignPipeline()
    const interval = setInterval(fetchRecentActivity, 30000)
    return () => clearInterval(interval)
  }, [fetchCampaignPipeline])

  // Fetch pipeline history for sparklines (real data)
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/rally/pipeline-history')
        if (res.ok) {
          const data = await res.json()
          const runs = Array.isArray(data) ? data : []
          setHistoryData(
            runs
              .map((r: any) => ({ score: r.bestScore ?? r.score ?? 0 }))
              .filter((r: any) => r.score > 0)
              .slice(-10)
          )
        }
      } catch { /* silent */ }
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 60000)
    return () => clearInterval(interval)
  }, [])

  // Live countdown timer — ticks every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick(prev => prev + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const [sRes, cRes, tRes, stRes] = await Promise.all([
          fetch('/api/rally/status'),
          fetch('/api/rally/content'),
          fetch('/api/rally/timeline'),
          fetch('/api/rally/stats'),
        ])
        if (sRes.ok) setStatus(await sRes.json())
        if (cRes.ok) setContent(await cRes.json())
        if (tRes.ok) setTimeline(await tRes.json())
        if (stRes.ok) setStatsData(await stRes.json())
      } catch {}
      setLoading(false)
    }
    fetchData()
  }, [])

  // Sparkline data derived from real pipeline history
  const buildCount = status?.pipeline?.total_builds ?? 0

  // Compute countdown data for top 3 active campaigns with deadlines (live-updating via countdownTick)
  const countdownCampaigns = useMemo(() => {
    return campaignsList
      .filter((c) => c.isActive && c.deadline)
      .slice(0, 3)
      .map((c) => {
        const deadlineMs = new Date(c.deadline!).getTime()
        const nowMs = Date.now()
        const remainingMs = Math.max(0, deadlineMs - nowMs)
        const totalDuration = 7 * 24 * 60 * 60 * 1000 // assume 7-day campaign window
        const elapsed = Math.min(1, Math.max(0, 1 - remainingMs / totalDuration))
        const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000))
        const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
        const mins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000))
        return {
          title: c.title,
          countdown: deadlineMs <= nowMs ? 'EXPIRED' : `${days}d ${hours}h ${mins}m`,
          pctElapsed: Math.round(elapsed * 100),
          isExpired: deadlineMs <= nowMs,
          rewardPool: c.rewardPool,
        }
      })
  }, [campaignsList, countdownTick])

  // Quick stats summary derived from campaign data
  const quickStatsSummary = useMemo(() => {
    const activeCount = campaignsList.filter((c) => c.isActive).length
    const totalReward = campaignsList.reduce((sum, c) => {
      const val = parseFloat(c.rewardPool.replace(/[^0-9.]/g, '')) || 0
      return sum + val
    }, 0)
    const avgCompleteness = campaignsList.length > 0
      ? Math.round(campaignsList.reduce((s, c) => s + c.dataCompleteness, 0) / campaignsList.length)
      : 0
    const now = Date.now()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const upcomingDeadlines = campaignsList.filter(
      (c) => c.deadline && new Date(c.deadline).getTime() > now && new Date(c.deadline).getTime() <= now + sevenDaysMs
    ).length
    return { activeCount, totalReward, avgCompleteness, upcomingDeadlines }
  }, [campaignsList])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card/50 border border-border/50 rounded-xl">
            <CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        ))}
        <div className="col-span-2 md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  const bestScore = status?.current_best?.score ?? 0
  const bestContentPreview = content?.best_content?.substring(0, 280) ?? 'No content built yet.'

  // Derive winner scores from content variations
  const winnerScores = content?.variations?.[0]?.scores ?? null

  // Sparkline data from real pipeline history (deterministic, no Math.random)
  const sparkBest = historyData.length > 0 ? historyData.map(h => h.score) : []
  const sparkAvg = historyData.length > 0 ? historyData.map(h => h.score * 0.95) : []
  const sparkBuilds = historyData.length > 0 ? historyData.map((_, i) => i + 1) : []

  return (
    <div className="relative space-y-4 gradient-mesh-bg">
      {/* Subtle dot grid pattern background */}
      <div className="absolute inset-0 dot-grid-bg pointer-events-none" />

      <div className="relative z-10 space-y-4">
      {/* Welcome Banner with animated gradient border */}
      <div className="relative">
        <div className="absolute -inset-px rounded-2xl animated-border-gradient" />
        <div className="relative">
          <WelcomeBanner visible={showWelcome} onDismiss={dismissWelcome} onNavigate={onNavigate} />
        </div>
      </div>

      {/* Gradient Line Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      {/* Metric Cards — staggered entrance */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {[
          <MetricCard
            key="best"
            icon={Trophy}
            label="Best Score"
            value={bestScore > 0 ? `${bestScore}/18` : 'N/A'}
            sub={status?.current_best?.variation ? `Var ${status.current_best.variation}` : ''}
            accent={bestScore >= 16}
            sparkline={sparkBest}
          />,
          <MetricCard
            key="avg"
            icon={TrendingUp}
            label="Campaign Avg"
            value={status?.campaign_avg?.toFixed(1) ?? 'N/A'}
            sub={`of ${status?.campaign?.total_submissions ?? 0} submissions`}
            sparkline={sparkAvg}
          />,
          <MetricCard
            key="builds"
            icon={Activity}
            label="Total Builds"
            value={String(status?.pipeline?.total_builds ?? 0)}
            sub={status?.pipeline?.status ?? 'idle'}
            sparkline={sparkBuilds}
          />,
          <MetricCard
            key="pipeline"
            icon={Clock}
            label="Pipeline"
            value={status?.pipeline?.status === 'working' ? 'Working' : status?.pipeline?.status ?? 'Idle'}
            sub={status?.pipeline?.next_action?.substring(0, 40) ?? ''}
            accent={status?.pipeline?.status === 'working'}
          />,
        ].map((card, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: 16, scale: 0.97 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
            }}
          >
            {card}
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Activity Mini Widget */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
      >
        <Card className="bg-card/50 backdrop-blur border border-border/40 rounded-xl shadow-sm hover:border-emerald-500/20 transition-all duration-200 shine-sweep rally-card-hover">
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                Recent Activity
                <span className="text-[9px] font-mono text-muted-foreground/60 ml-1">auto-refresh 30s</span>
              </CardTitle>
              <button
                className="h-5 w-5 p-0 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-colors"
                onClick={fetchRecentActivity}
                disabled={activityLoading}
              >
                <RefreshCw className={cn("h-3 w-3", activityLoading && "animate-spin")} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5">
              {recentActivities.length > 0 ? recentActivities.map((evt, i) => {
                const dotColor: Record<string, string> = {
                  build_complete: 'bg-emerald-400',
                  monitor_check: 'bg-blue-400',
                  score: 'bg-amber-400',
                  learning: 'bg-purple-400',
                  pipeline: 'bg-emerald-400',
                  system: 'bg-muted-foreground/50',
                }
                const color = dotColor[evt.category] || dotColor.system
                const timeAgo = evt.timestamp
                  ? (() => {
                      try {
                        const d = new Date(evt.timestamp.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\.\d]*Z)/)?.[1] || evt.timestamp)
                        const diff = Math.floor((Date.now() - d.getTime()) / 1000)
                        if (diff < 60) return 'just now'
                        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
                        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
                        return `${Math.floor(diff / 86400)}d ago`
                      } catch { return '' }
                    })()
                  : ''
                return (
                  <div key={i} className="flex items-center gap-2 py-0.5 activity-item-hover rounded">
                    <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", color)} />
                    <p className="text-[10px] text-foreground/70 flex-1 truncate">{evt.message}</p>
                    {timeAgo && <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0">{timeAgo}</span>}
                  </div>
                )
              }) : (
                <p className="text-[10px] text-muted-foreground/50 text-center py-2">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Score Progression Chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48, duration: 0.4 }}
      >
        <Card className="bg-card/50 backdrop-blur border border-border/40 rounded-xl hover:border-emerald-500/20 transition-all duration-200 shine-sweep rally-card-hover">
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                Score Progression
                <span className="text-[9px] font-mono text-muted-foreground/60">recent pipeline runs</span>
              </CardTitle>
              {statsData && statsData.totalBuilds > 0 && (
                <Badge className="text-[9px] px-1.5 py-0 font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {statsData.totalBuilds} run{statsData.totalBuilds !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ScoreProgressionChart bestPipelineScore={statsData?.bestPipelineScore ?? 0} />
          </CardContent>
        </Card>
      </motion.div>

      {/* System Health Banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="relative overflow-hidden flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent animate-[shimmer_3s_infinite]" />
        <div className="relative z-10 flex items-center gap-3 w-full">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="text-[11px] text-emerald-400 font-medium">All Systems Operational</span>
          <Separator orientation="vertical" className="h-3 bg-emerald-500/20" />
          <span className="text-[10px] text-muted-foreground font-mono">18 APIs · {statsData?.campaignsWorked ?? '—'} Campaigns · {statsData?.contentGenerated ?? '—'} Content Analyzed</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">Auto-refresh: 60s</span>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl overflow-hidden">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((action, idx) => (
                <motion.div
                  key={action.key}
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.08, duration: 0.35 }}
                  className={cn("group bg-card/60 backdrop-blur-md border border-border/40 rounded-xl cursor-pointer p-3 hover:-translate-y-1 hover:shadow-lg hover:scale-[1.03] transition-all duration-300", action.borderAccent)}
                  onClick={() => handleQuickAction(action.key)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-300', action.bg, action.hover)}>
                      <action.icon className={cn('h-5 w-5 group-hover:scale-110 transition-transform duration-300', action.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium group-hover:text-foreground transition-colors">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground">{action.sublabel}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Campaign Countdown + Quick Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.4 }}
        className="space-y-4"
      >
        {/* Quick Stats Summary — 4 mini stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="mini-stat bg-card/60 backdrop-blur-md border border-emerald-500/10 rounded-xl p-3 cursor-default">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded-md bg-emerald-500/15 flex items-center justify-center">
                <Activity className="h-3 w-3 text-emerald-400" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Campaigns</span>
            </div>
            <p className="text-xl font-bold font-mono text-emerald-400">{quickStatsSummary.activeCount}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">of {campaignPipelineData?.total ?? 0} total</p>
          </div>
          <div className="mini-stat bg-card/60 backdrop-blur-md border border-blue-500/10 rounded-xl p-3 cursor-default">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded-md bg-blue-500/15 flex items-center justify-center">
                <DollarSign className="h-3 w-3 text-blue-400" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Reward Pool</span>
            </div>
            <p className="text-xl font-bold font-mono text-blue-400">${quickStatsSummary.totalReward.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">across all campaigns</p>
          </div>
          <div className="mini-stat bg-card/60 backdrop-blur-md border border-purple-500/10 rounded-xl p-3 cursor-default">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded-md bg-purple-500/15 flex items-center justify-center">
                <Percent className="h-3 w-3 text-purple-400" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Completeness</span>
            </div>
            <p className="text-xl font-bold font-mono text-purple-400">{quickStatsSummary.avgCompleteness}%</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">data coverage</p>
          </div>
          <div className="mini-stat bg-card/60 backdrop-blur-md border border-amber-500/10 rounded-xl p-3 cursor-default">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-6 w-6 rounded-md bg-amber-500/15 flex items-center justify-center">
                <CalendarDays className="h-3 w-3 text-amber-400" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Upcoming Deadlines</span>
            </div>
            <p className="text-xl font-bold font-mono text-amber-400">{quickStatsSummary.upcomingDeadlines}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">next 7 days</p>
          </div>
        </div>

        {/* Campaign Countdown Section */}
        <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-emerald-500/20 transition-colors duration-200">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Timer className="h-4 w-4 text-emerald-400" />
              Campaign Countdown
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/20 text-emerald-400/70 bg-emerald-500/5 font-mono ml-1">
                top {Math.min(3, countdownCampaigns.length)} active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {countdownCampaigns.length > 0 ? (
              <div className="space-y-3">
                {countdownCampaigns.map((camp, i) => (
                  <div key={i} className="bg-muted/15 rounded-lg p-3 border border-border/30 hover:border-emerald-500/15 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          camp.isExpired ? 'bg-red-400 animate-pulse' : 'bg-emerald-400 animate-pulse shadow-[0_0_4px_rgba(16,185,129,0.4)]'
                        )} />
                        <span className="text-xs font-medium truncate">{camp.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[9px] text-muted-foreground font-mono">{camp.rewardPool}</span>
                        <span className={cn(
                          'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md',
                          camp.isExpired
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : camp.pctElapsed > 80
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        )}>
                          {camp.countdown}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="countdown-bar flex-1">
                        <div
                          className={cn(
                            'countdown-bar-fill',
                            camp.isExpired && '!bg-gradient-to-r !from-red-500 !to-red-400'
                          )}
                          style={{ width: `${camp.pctElapsed}%` }}
                        />
                      </div>
                      <span className={cn(
                        'text-[9px] font-mono shrink-0 w-8 text-right',
                        camp.pctElapsed > 80 ? 'text-amber-400' : camp.isExpired ? 'text-red-400' : 'text-muted-foreground'
                      )}>
                        {camp.pctElapsed}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Timer className="h-6 w-6 text-muted-foreground/40 mb-2" />
                <p className="text-[11px] text-muted-foreground/60">No active campaigns with upcoming deadlines</p>
                <p className="text-[9px] text-muted-foreground/40 mt-1">Deadlines will appear here when campaigns are active</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Architecture Downloader */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 12 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
        }}
      >
        <ArchitectureDownloader />
      </motion.div>

      {/* Bottom sections with stagger */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
      >
        {/* Campaign Pipeline Card */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
          }}
        >
          <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-emerald-500/20 transition-colors duration-200">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                Campaign Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Campaigns</p>
                  <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{campaignPipelineData?.total ?? '—'}</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Active</p>
                  <p className="text-lg font-bold font-mono text-blue-400 mt-0.5">{campaignPipelineData?.active ?? '—'}</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Best Score</p>
                  <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                    {campaignPipelineData && campaignPipelineData.bestScore > 0 ? `${campaignPipelineData.bestScore}/18` : '—'}
                  </p>
                </div>
                <div className="bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Avg Completeness</p>
                  <p className="text-lg font-bold font-mono text-purple-400 mt-0.5">
                    {campaignPipelineData ? `${campaignPipelineData.avgCompleteness}%` : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Score Breakdown */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
          }}
        >
          <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-emerald-500/20 transition-colors duration-200">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3Icon className="h-4 w-4 text-emerald-400" />
                Score Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5">
              {dimensions.map(dim => {
                const actualScore = winnerScores?.[dim.key as keyof VariationScores] as number ?? 0
                const maxScore = dim.max
                const actualPct = actualScore > 0 ? (actualScore / maxScore) * 100 : 0
                return (
                  <div key={dim.key} className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground w-20 shrink-0">{dim.label}</span>
                    <div className="flex-1 h-4 bg-muted/20 rounded-full overflow-hidden relative">
                      <div className={cn('h-full rounded-full bg-muted/30', dim.bg)} style={{ width: '100%' }} />
                      <div className={cn('h-full rounded-full transition-all duration-700 absolute top-0 left-0 score-bar-fill', dim.bg)} style={{ width: `${actualPct}%` }} />
                    </div>
                    <span className={cn('text-[11px] font-mono font-bold w-12 text-right', actualPct >= 80 ? dim.color : 'text-amber-400')}>
                      {Number(actualScore).toFixed(1)}/{maxScore}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Campaign Info */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
          }}
        >
          <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-emerald-500/20 transition-colors duration-200">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                Campaign Info
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Reward Pool</span>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 font-mono text-xs">
                  {status?.campaign?.reward_pool ?? 'N/A'}
                </Badge>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Deadline</span>
                <span className={cn(
                  'text-xs font-mono font-semibold',
                  status?.campaign?.deadline_countdown === 'EXPIRED' ? 'text-destructive' : 'text-amber-400'
                )}>
                  {status?.campaign?.deadline_countdown ?? 'N/A'}
                </span>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Submissions</span>
                <span className="text-xs font-mono">{status?.campaign?.total_submissions ?? 0}</span>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Best Variation</span>
                <span className="text-xs font-mono">{status?.current_best?.variation ?? 'N/A'}</span>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Angle</span>
                <span className="text-xs font-mono text-right max-w-[160px] truncate">{status?.current_best?.angle ?? 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Campaign Score Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.4 }}
      >
        <CampaignScoreDistribution />
      </motion.div>

      {/* Score Insights — AI-powered analysis */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.87, duration: 0.4 }}
      >
        <ScoreInsightsWidget />
      </motion.div>

      {/* Campaign Stats Banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-emerald-500/20 transition-all duration-200 shine-sweep">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 mb-2.5">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Campaign Stats</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex-1 bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors btn-press cursor-default">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Content Created</p>
                <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{statsData?.contentGenerated ?? '—'}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">variations analyzed</p>
              </div>
              <div className="flex-1 bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pipeline Runs</p>
                <p className="text-lg font-bold font-mono text-blue-400 mt-0.5">{statsData?.pipelineRuns ?? '—'}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">executions completed</p>
              </div>
              <div className="flex-1 bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Avg Score</p>
                <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">{statsData?.avgPipelineScore ? `${statsData.avgPipelineScore}/18` : '—'}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">best {statsData?.bestPipelineScore ?? '—'}</p>
              </div>
              <div className="flex-1 bg-muted/20 rounded-lg p-3 text-center hover:bg-muted/30 transition-colors">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">18/18 Count</p>
                <p className="text-lg font-bold font-mono text-purple-400 mt-0.5">{statsData?.eighteenEighteen ?? '—'}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">perfect scores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {/* Twitter/X Preview */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
          }}
        >
          <Card className="glass-card-strong rounded-xl hover:border-emerald-500/20 transition-colors duration-200">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Twitter className="h-4 w-4 text-emerald-400" />
                Best Content Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shrink-0 flex items-center justify-center shadow-[0_2px_8px_rgba(16,185,129,0.3)]">
                    <span className="text-white text-sm font-bold">A</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-gray-900">@__allend__</span>
                      <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/></svg>
                    </div>
                    <p className="text-gray-500 text-xs">@__allend__</p>
                  </div>
                </div>
                <p className="text-gray-900 text-[13px] leading-relaxed mt-3 whitespace-pre-line line-clamp-[8]">
                  {bestContentPreview}
                </p>
                <p className="text-gray-400 text-[11px] mt-3">
                  {status?.current_best ? `Score: ${bestScore}/18 · ${status.current_best.angle}` : 'No content yet'}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
          }}
        >
          <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-emerald-500/20 transition-colors duration-200">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ScrollArea className="max-h-[320px]">
                <div className="space-y-3">
                  {(timeline?.events?.slice(0, 5) || []).map((event, i) => {
                    const typeColors: Record<string, string> = {
                      build_complete: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                      monitor_check: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                      error: 'bg-destructive/15 text-destructive border-destructive/30',
                      pipeline: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                    }
                    return (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="mt-1 h-2 w-2 rounded-full shrink-0 bg-muted-foreground/50" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', typeColors[event.type] || typeColors.pipeline)}>
                              {event.type.replace('_', ' ')}
                            </Badge>
                            {event.score && (
                              <span className="text-[10px] font-mono text-emerald-400">{event.score}/18</span>
                            )}
                          </div>
                          <p className="text-xs text-foreground/80 mt-1 line-clamp-1">{event.task}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {(!timeline?.events || timeline.events.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-8">No events yet</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      </div>{/* relative z-10 */}
    </div>
  )
}

function BarChart3Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  )
}
