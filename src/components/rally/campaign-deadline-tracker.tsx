'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, AlertTriangle, CheckCircle2, Timer } from 'lucide-react'

interface Campaign {
  id: string
  title: string
  endDate: string
  startDate: string
  isActive: boolean
}

interface TimeLeft {
  total: number
  days: number
  hours: number
  minutes: number
  seconds: number
  ended: boolean
}

function calcTimeLeft(endDate: string): TimeLeft {
  const now = Date.now()
  const end = new Date(endDate).getTime()
  const diff = end - now

  if (diff <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ended: true }
  }

  return {
    total: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    ended: false,
  }
}

function getDeadlineUrgency(tl: TimeLeft): {
  text: string
  bg: string
  border: string
  bar: string
  label: string
  ringColor: string
  ringBg: string
  isPulsing: boolean
} {
  if (tl.ended) {
    return {
      text: 'text-zinc-400', bg: 'bg-zinc-500/5', border: 'border-zinc-500/20',
      bar: 'bg-zinc-500', label: 'Ended', ringColor: '#71717a', ringBg: 'rgba(113,113,122,0.1)',
      isPulsing: false,
    }
  }
  const totalHours = tl.total / (1000 * 60 * 60)
  if (totalHours < 1) {
    return {
      text: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20',
      bar: 'bg-red-500', label: '< 1h CRITICAL', ringColor: '#ef4444', ringBg: 'rgba(239,68,68,0.1)',
      isPulsing: true,
    }
  }
  if (totalHours < 6) {
    return {
      text: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20',
      bar: 'bg-red-500', label: '< 6h', ringColor: '#ef4444', ringBg: 'rgba(239,68,68,0.1)',
      isPulsing: false,
    }
  }
  if (totalHours < 24) {
    return {
      text: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20',
      bar: 'bg-amber-500', label: '< 24h', ringColor: '#f59e0b', ringBg: 'rgba(245,158,11,0.1)',
      isPulsing: false,
    }
  }
  if (tl.days < 2) {
    return {
      text: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20',
      bar: 'bg-amber-500', label: '< 2 days', ringColor: '#f59e0b', ringBg: 'rgba(245,158,11,0.1)',
      isPulsing: false,
    }
  }
  if (tl.days < 7) {
    return {
      text: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20',
      bar: 'bg-amber-500', label: '< 7 days', ringColor: '#f59e0b', ringBg: 'rgba(245,158,11,0.1)',
      isPulsing: false,
    }
  }
  return {
    text: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20',
    bar: 'bg-emerald-500', label: 'On Track', ringColor: '#10b981', ringBg: 'rgba(16,185,129,0.1)',
    isPulsing: false,
  }
}

function formatCountdown(tl: TimeLeft): string {
  if (tl.ended) return 'Ended'
  const parts: string[] = []
  if (tl.days > 0) parts.push(`${tl.days}d`)
  parts.push(`${tl.hours}h`)
  parts.push(`${tl.minutes}m`)
  if (tl.days === 0) parts.push(`${tl.seconds}s`)
  return parts.join(' ')
}

function calcProgress(startDate: string, endDate: string): number {
  const now = Date.now()
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  if (now >= end) return 100
  if (now <= start) return 0
  return Math.round(((now - start) / (end - start)) * 100)
}

/* Circular Countdown Progress Ring */
function CountdownRing({ progress, color, size = 40, strokeWidth = 3 }: { progress: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="countdown-ring">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="ring-progress"
        />
      </svg>
    </div>
  )
}

function SingleDeadline({ campaign }: { campaign: Campaign }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(campaign.endDate))
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(campaign.endDate))
    }, 1000)
    return () => clearInterval(interval)
  }, [campaign.endDate])

  const colors = getDeadlineUrgency(timeLeft)
  const progress = calcProgress(campaign.startDate, campaign.endDate)
  const isUrgent = !timeLeft.ended && timeLeft.total < 24 * 60 * 60 * 1000
  const isCritical = !timeLeft.ended && timeLeft.total < 1 * 60 * 60 * 1000

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-lg border p-3 transition-all duration-300 relative overflow-hidden',
        colors.border, colors.bg
      )}
    >
      {/* Animated shimmer when deadline approaching */}
      {isUrgent && (
        <div className="absolute inset-0 animate-[shimmer_2s_infinite] pointer-events-none">
          <div className={cn(
            'absolute inset-0 bg-gradient-to-r',
            isCritical ? 'from-red-500/10 via-transparent to-red-500/10' : 'from-amber-500/10 via-transparent to-amber-500/10'
          )} />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {timeLeft.ended ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            ) : isCritical ? (
              <motion.div animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}>
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              </motion.div>
            ) : isUrgent ? (
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              </motion.div>
            ) : (
              <Clock className={cn('h-3.5 w-3.5', colors.text, 'shrink-0')} />
            )}
            <span className="text-[11px] font-medium truncate">{campaign.title}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded', colors.bg, colors.text, 'border', colors.border)}>
              {colors.label}
            </span>
            {isCritical && (
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="h-2 w-2 rounded-full bg-red-500" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          {/* Countdown ring */}
          <div className="relative">
            <CountdownRing
              progress={timeLeft.ended ? 100 : progress}
              color={colors.ringColor}
              size={40}
              strokeWidth={3}
            />
            <span className={cn('absolute inset-0 flex items-center justify-center text-[9px] font-bold', colors.text)}>
              {timeLeft.ended ? '✓' : `${progress}%`}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Timer className="h-3 w-3 text-muted-foreground" />
              <span className={cn('text-xs font-mono font-bold tabular-nums', colors.text)}>
                {formatCountdown(timeLeft)}
              </span>
            </div>
            {!timeLeft.ended && (
              <span className="text-[9px] text-muted-foreground block mt-0.5">
                ends {new Date(campaign.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!timeLeft.ended && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">Time elapsed</span>
              <span className="text-[9px] text-muted-foreground font-mono">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn('h-full rounded-full', colors.bar)}
                style={{
                  boxShadow: isUrgent ? '0 0 8px rgba(239, 68, 68, 0.4)' : isUrgent ? '0 0 6px rgba(245,158,11,0.3)' : 'none',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

import { cn } from '@/lib/utils'

export function CampaignDeadlineTracker() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch('/api/rally/campaigns')
        if (res.ok && active) {
          const json = await res.json()
          setCampaigns(
            (json.campaigns || [])
              .filter((c: Campaign) => c.isActive && c.endDate)
              .map((c: Campaign) => ({
                id: c.id, title: c.title, endDate: c.endDate,
                startDate: c.startDate, isActive: c.isActive,
              }))
          )
        }
      } catch { /* ignore */ }
    }
    load()
    const interval = setInterval(load, 60_000)
    return () => { active = false; clearInterval(interval) }
  }, [])

  const [sortTick, setSortTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => { setSortTick(t => t + 1) }, 1000)
    return () => clearInterval(interval)
  }, [])

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      const tlA = calcTimeLeft(a.endDate)
      const tlB = calcTimeLeft(b.endDate)
      if (tlA.ended && !tlB.ended) return 1
      if (!tlA.ended && tlB.ended) return -1
      return tlA.total - tlB.total
    })
  }, [campaigns, sortTick])

  if (sortedCampaigns.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold">Campaign Deadlines</span>
            <span className="text-[10px] text-muted-foreground">
              ({sortedCampaigns.length} active)
            </span>
          </div>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="text-[9px] text-muted-foreground flex items-center gap-1"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {sortedCampaigns.slice(0, 6).map(c => (
            <SingleDeadline key={c.id} campaign={c} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
