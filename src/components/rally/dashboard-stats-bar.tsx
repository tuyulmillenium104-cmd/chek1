'use client'

import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, Zap, Trophy, Activity, Timer, ChevronDown, ChevronUp, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsBarData {
  campaignTitle: string
  campaignStatus: string
  totalBuilds: number
  bestScore: number
  avgScore: number
  cronJobsActive: number
}

function useCountUp(target: number, duration = 1200, enabled = true) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled || target === 0) {
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }
    startRef.current = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4) // ease-out quartic
      setValue(Math.round(target * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, enabled])

  return value
}

export function DashboardStatsBar({ statsData, loading }: { statsData: StatsBarData | null; loading: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const [apiConnected, setApiConnected] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const stats = statsData || {
    campaignTitle: 'Loading...',
    campaignStatus: 'loading',
    totalBuilds: 0,
    bestScore: 0,
    avgScore: 0,
    cronJobsActive: 0,
  }

  // Animated counters
  const animTotalBuilds = useCountUp(stats.totalBuilds, 1000, mounted && !loading)
  const animBestScore = useCountUp(Math.round(stats.bestScore * 10) / 10 * 10, 1000, mounted && !loading)
  const animAvgScore = useCountUp(Math.round(stats.avgScore * 10) / 10 * 10, 1000, mounted && !loading)
  const animCronJobs = useCountUp(stats.cronJobsActive, 600, mounted && !loading)

  const metrics = [
    {
      label: 'Active Campaign',
      value: stats.campaignTitle || 'N/A',
      subValue: stats.campaignStatus === 'active' ? 'Active' : stats.campaignStatus,
      icon: Activity,
      color: stats.campaignStatus === 'active' ? 'text-emerald-400' : 'text-muted-foreground',
      bgColor: stats.campaignStatus === 'active' ? 'bg-emerald-500/10' : 'bg-muted/10',
      isPulse: stats.campaignStatus === 'active',
    },
    {
      label: 'Total Builds',
      value: String(animTotalBuilds),
      subValue: 'pipeline runs',
      icon: Zap,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Best Score',
      value: stats.bestScore > 0 ? `${(animBestScore / 10).toFixed(1)}/18` : '—',
      subValue: stats.bestScore >= 17 ? 'Elite' : stats.bestScore >= 15 ? 'Strong' : 'Building',
      icon: Trophy,
      color: stats.bestScore >= 17 ? 'text-emerald-400' : stats.bestScore >= 15 ? 'text-amber-400' : 'text-muted-foreground',
      bgColor: stats.bestScore >= 17 ? 'bg-emerald-500/10' : stats.bestScore >= 15 ? 'bg-amber-500/10' : 'bg-muted/10',
    },
    {
      label: 'Avg Score',
      value: stats.avgScore > 0 ? `${(animAvgScore / 10).toFixed(1)}/18` : '—',
      subValue: 'across runs',
      icon: BarChart3,
      color: stats.avgScore >= 14 ? 'text-emerald-400' : stats.avgScore > 0 ? 'text-amber-400' : 'text-muted-foreground',
      bgColor: stats.avgScore >= 14 ? 'bg-emerald-500/10' : stats.avgScore > 0 ? 'bg-amber-500/10' : 'bg-muted/10',
    },
    {
      label: 'Cron Jobs',
      value: `${animCronJobs} active`,
      subValue: 'automated',
      icon: Timer,
      color: stats.cronJobsActive > 0 ? 'text-emerald-400' : 'text-muted-foreground',
      bgColor: stats.cronJobsActive > 0 ? 'bg-emerald-500/10' : 'bg-muted/10',
    },
  ]

  return (
    <div className="border-b border-emerald-500/10 shadow-[0_2px_8px_rgba(16,185,129,0.06)] bg-card/50 backdrop-blur-sm glow-emerald relative">
      {/* Animated gradient border bottom with enhanced glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent stats-bar-glow" />
      <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent stats-bar-glow blur-sm" />
      <div className="absolute bottom-0 left-1/3 right-1/3 h-[3px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent stats-bar-glow blur-md" />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Mobile collapse toggle */}
        <div className="md:hidden flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-muted-foreground font-mono">Live Stats</span>
          </div>
          {/* Live API Status Indicator (mobile) */}
          <div className="flex items-center gap-1.5">
            <Wifi className={cn("h-2.5 w-2.5", apiConnected ? "text-emerald-400" : "text-red-400")} />
            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", apiConnected ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]")} />
            <span className={cn("text-[9px] font-mono", apiConnected ? "text-emerald-400/80" : "text-red-400/80")}>API</span>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
            aria-label={collapsed ? 'Expand stats' : 'Collapse stats'}
          >
            {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>

        {/* Stats bar content */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 md:gap-0 py-2 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory scrollbar-none">
                {/* Desktop: horizontal row, Mobile: scrollable row */}
                {/* Live API Status Indicator (desktop) */}
                <div className="hidden md:flex items-center gap-1.5 mr-4 shrink-0">
                  <Wifi className={cn("h-3 w-3", apiConnected ? "text-emerald-400" : "text-red-400")} />
                  <div className={cn("h-2 w-2 rounded-full animate-pulse", apiConnected ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]")} />
                  <span className={cn("text-[9px] font-mono font-medium", apiConnected ? "text-emerald-400/80" : "text-red-400/80")}>{apiConnected ? 'API Connected' : 'API Offline'}</span>
                </div>
                <div className="flex items-center gap-3 md:gap-0 md:flex-1 md:justify-between min-w-max md:min-w-0">
                  {metrics.map((metric, idx) => {
                    const Icon = metric.icon
                    return (
                      <div
                        key={metric.label}
                        className={cn(
                          'flex items-center gap-2 shrink-0 snap-start p-1.5 rounded-lg card-shimmer transition-all duration-200 hover:bg-muted/30 hover:-translate-y-px group',
                          idx < metrics.length - 1 && 'md:border-r md:border-border/30 md:pr-6',
                          'isPulse' in metric && metric.isPulse && 'relative'
                        )}
                      >
                        <div className={cn('h-6 w-6 rounded-md flex items-center justify-center transition-all duration-200', metric.bgColor, 'group-hover:shadow-sm', 'isPulse' in metric && metric.isPulse && !loading && 'animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]')}>
                          <Icon className={cn('h-3 w-3 transition-transform duration-200', metric.color, 'group-hover:scale-110')} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] md:text-[9px] text-muted-foreground uppercase tracking-wider leading-tight">
                            {metric.label}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              'text-[10px] md:text-[11px] font-bold font-mono stat-number truncate max-w-[120px] md:max-w-none tabular-nums',
                              metric.color,
                              'isPulse' in metric && metric.isPulse && 'text-gradient'
                            )}>
                              {loading && idx > 0 ? '...' : metric.value}
                            </span>
                            {/* Subtle pulse animation on Active Campaign metric */}
                            {'isPulse' in metric && metric.isPulse && stats.campaignStatus === 'active' && !loading && (
                              <motion.span
                                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
