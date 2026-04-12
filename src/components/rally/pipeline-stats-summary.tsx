'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Activity, TrendingUp, CheckCircle2, Timer, RefreshCw } from 'lucide-react'
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

interface StatsData {
  totalRuns: number
  avgScore: number
  successRate: number
  totalTime: number
  trendDirection: 'up' | 'down' | 'neutral'
  trendValue: number
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function getScoreColor(avg: number): string {
  if (avg >= 16) return 'text-emerald-400'
  if (avg >= 13) return 'text-amber-400'
  if (avg >= 10) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreBorderColor(avg: number): string {
  if (avg >= 16) return 'border-l-emerald-500'
  if (avg >= 13) return 'border-l-amber-500'
  if (avg >= 10) return 'border-l-orange-500'
  return 'border-l-red-500'
}

function StatMiniCard({
  icon: Icon,
  value,
  label,
  sub,
  borderColor,
  iconColor,
  loading,
}: {
  icon: React.ElementType
  value: string
  label: string
  sub?: string
  borderColor: string
  iconColor: string
  loading?: boolean
}) {
  return (
    <motion.div variants={cardVariants} className={cn(
      'bg-card/60 backdrop-blur-sm border border-border/30 rounded-xl p-3 mini-stat cursor-default dark-mode-optimized',
      borderColor
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn('h-6 w-6 rounded-md flex items-center justify-center transition-all duration-200', iconColor)}>
          <Icon className="h-3 w-3" />
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-lg font-bold font-mono stat-number', loading && 'text-muted-foreground')}>
        {value}
      </p>
      {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  )
}

export function PipelineStatsSummary() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string>('')

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/rally/pipeline-history')
      if (res.ok) {
        const data: PipelineRun[] = await res.json()
        const runs = Array.isArray(data) ? data : []

        const totalRuns = runs.length
        const completed = runs.filter(r => r.status === 'completed')
        const scored = completed.filter(r => r.bestScore != null && r.bestScore > 0)

        const avgScore = scored.length > 0
          ? scored.reduce((sum, r) => sum + (r.bestScore ?? 0), 0) / scored.length
          : 0

        const successRate = totalRuns > 0
          ? Math.round((completed.length / totalRuns) * 100)
          : 0

        const totalTime = runs.reduce((sum, r) => sum + (r.pipelineTime ?? 0), 0)

        // Trend: compare first half vs second half average scores
        let trendDirection: 'up' | 'down' | 'neutral' = 'neutral'
        let trendValue = 0
        if (scored.length >= 4) {
          const mid = Math.floor(scored.length / 2)
          const firstHalfAvg = scored.slice(0, mid).reduce((s, r) => s + (r.bestScore ?? 0), 0) / mid
          const secondHalfAvg = scored.slice(mid).reduce((s, r) => s + (r.bestScore ?? 0), 0) / (scored.length - mid)
          const diff = secondHalfAvg - firstHalfAvg
          trendValue = Math.abs(diff)
          if (diff > 0.5) trendDirection = 'up'
          else if (diff < -0.5) trendDirection = 'down'
        }

        setStats({
          totalRuns,
          avgScore,
          successRate,
          totalTime,
          trendDirection,
          trendValue,
        })
        setLastRefresh(new Date().toLocaleTimeString())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [fetchStats])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-muted-foreground">Pipeline Stats</span>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[9px] text-muted-foreground/60 font-mono">updated {lastRefresh}</span>
          )}
          <button
            onClick={fetchStats}
            className="h-5 w-5 p-0 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 hover:scale-[1.1] transition-all duration-200"
            title="Refresh stats"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-2 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <StatMiniCard
          icon={Activity}
          value={loading ? '—' : String(stats?.totalRuns ?? 0)}
          label="Total Runs"
          sub={
            stats && stats.trendDirection !== 'neutral'
              ? `Trend: ${stats.trendDirection === 'up' ? '↑' : '↓'} ${stats.trendValue.toFixed(1)}pts`
              : undefined
          }
          borderColor="border-l-emerald-500/60"
          iconColor="bg-emerald-500/15 text-emerald-400"
          loading={loading}
        />

        <StatMiniCard
          icon={TrendingUp}
          value={loading ? '—' : stats && stats.avgScore > 0 ? stats.avgScore.toFixed(1) : 'N/A'}
          label="Avg Score"
          sub="/18"
          borderColor={loading ? 'border-l-muted-foreground/30' : getScoreBorderColor(stats?.avgScore ?? 0)}
          iconColor={loading ? 'bg-muted/30 text-muted-foreground' : (stats?.avgScore ?? 0) >= 16 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}
          loading={loading}
        />

        <StatMiniCard
          icon={CheckCircle2}
          value={loading ? '—' : `${stats?.successRate ?? 0}%`}
          label="Success Rate"
          sub={stats ? `${stats.totalRuns - (stats.totalRuns * stats.successRate / 100) | 0} failed` : undefined}
          borderColor={stats && stats.successRate >= 80 ? 'border-l-emerald-500/60' : stats && stats.successRate >= 50 ? 'border-l-amber-500/60' : 'border-l-red-500/60'}
          iconColor={stats && stats.successRate >= 80 ? 'bg-emerald-500/15 text-emerald-400' : stats && stats.successRate >= 50 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}
          loading={loading}
        />

        <StatMiniCard
          icon={Timer}
          value={loading ? '—' : stats && stats.totalTime > 0 ? formatTime(stats.totalTime) : '0s'}
          label="Total Time"
          sub={stats && stats.totalRuns > 0 ? `avg ${formatTime(stats.totalTime / stats.totalRuns)} per run` : undefined}
          borderColor="border-l-blue-500/60"
          iconColor="bg-blue-500/15 text-blue-400"
          loading={loading}
        />
      </motion.div>
    </motion.div>
  )
}
