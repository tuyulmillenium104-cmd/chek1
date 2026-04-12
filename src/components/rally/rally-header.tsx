'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Zap, RefreshCw, Activity, Sparkles, Sun, Moon, Settings, Download, HeartPulse } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { useState, useEffect, useCallback } from 'react'

interface RallyHeaderProps {
  statusData: {
    campaign_status?: string
    campaign: {
      title: string
      status: string
      reward_pool: string
      deadline_countdown: string
      total_submissions: number
    }
    current_best: {
      score: number
      variation: string
      angle: string
    } | null
    pipeline: {
      status: string
      total_builds: number
    }
    campaign_avg: number
  } | null
  lastUpdated: string
  isRefreshing: boolean
  bestScore: number
  scorePct: number
  circumference: number
  dashOffset: number
  onRefresh: () => void
  onGoToGenerate?: () => void
}

export function RallyHeader({
  statusData,
  lastUpdated,
  isRefreshing,
  bestScore,
  scorePct,
  circumference,
  dashOffset,
  onRefresh,
  onGoToGenerate,
}: RallyHeaderProps) {
  // Use computed campaign_status (not raw file status) to correctly detect expired campaigns
  const isActive = (statusData?.campaign_status || statusData?.campaign?.status) === 'active'

  // Live clock
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour12: false }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-50 glow-emerald">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.02] via-transparent to-teal-500/[0.02] pointer-events-none" />

      {/* Gradient divider line */}
      <div className="absolute bottom-0 left-0 right-0 h-px animate-header-gradient-line" />

      {/* Thin progress bar showing time until campaign deadline */}
      {statusData?.campaign?.deadline_countdown && statusData?.campaign?.deadline_countdown !== 'EXPIRED' && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] countdown-bar overflow-hidden">
          <div className="countdown-bar-fill" style={{ width: '15%' }} />
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Title */}
        <div className="flex items-center gap-2.5 shrink-0 group">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/10 group-hover:ring-emerald-500/25 group-hover:bg-emerald-500/20 transition-all duration-300">
            <Zap className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold tracking-tight relative">
              Rally Command Center
              {/* Animated gradient underline */}
              <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-emerald-500/60 via-teal-400/40 to-cyan-400/60 animate-header-gradient-line rounded-full" />
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono hidden sm:block">
              <span className="gradient-text font-semibold">v17.0</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400/60 ml-1.5 align-middle pulse-ring" />
            </p>
          </div>
        </div>

        {/* Center: Campaign + Clock */}
        <div className="hidden md:flex items-center gap-2 text-center min-w-0">
          <h2 className="text-sm font-semibold truncate max-w-xs">
            {statusData?.campaign.title || 'Loading...'}
          </h2>
          {time && (
            <span className="text-[10px] font-mono text-muted-foreground hidden lg:inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <LiveClock time={time} />
            </span>
          )}
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-2 py-0 shrink-0 transition-all duration-300',
              isActive
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                : 'border-destructive/50 text-destructive bg-destructive/10'
            )}
          >
            <Activity className="h-2.5 w-2.5 mr-1" />
          {isActive ? 'Active' : (statusData?.campaign_status === 'upcoming' ? 'Upcoming' : 'Expired')}
          </Badge>
        </div>

        {/* Right: Score + Refresh */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Score Ring with breathing glow */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("relative h-10 w-10 flex items-center justify-center", isActive && bestScore > 16 ? "score-ring-animated animate-glow-pulse" : isActive ? "score-ring-animated pulse-ring" : "score-ring-animated")}>

                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                    {/* Background ring with gradient */}
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(16, 185, 129, 0.15)" />
                        <stop offset="100%" stopColor="rgba(20, 184, 166, 0.15)" />
                      </linearGradient>
                      <linearGradient id="scoreGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="20" cy="20" r="18"
                      fill="none"
                      stroke="url(#scoreGrad)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="20" cy="20" r="18"
                      fill="none"
                      stroke="url(#scoreGradActive)"
                      strokeWidth="2.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-bold font-mono text-emerald-400">
                    {bestScore > 0 ? bestScore.toFixed(1) : '—'}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Best Score: {bestScore}/18 ({scorePct.toFixed(1)}%)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Generate CTA */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 hover-glow-emerald rounded-lg btn-scale"
            onClick={onGoToGenerate}
          >
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">Create</span>
          </Button>

          {/* Download Architecture Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-2 hover-glow-emerald rounded-lg btn-scale"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/rally/download-architecture?format=json')
                      if (!res.ok) throw new Error('Download failed')
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `rally-architecture-${new Date().toISOString().slice(0, 10)}.json`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    } catch {
                      console.error('Architecture download failed')
                    }
                  }}
                >
                  <Download className="h-3 w-3" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Download All Architecture Files</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Settings Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover-glow-emerald rounded-lg transition-colors duration-200 btn-scale"
                  onClick={() => window.dispatchEvent(new CustomEvent('rally:open-settings'))}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="sr-only">Quick settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Quick Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Self-Heal Button */}
          <SelfHealButton />

          {/* Refresh indicator */}
          <div className="flex flex-col items-end gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted/50 hover:text-foreground transition-colors duration-200 btn-scale"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </Button>
            {lastUpdated && (
              <span className="text-[9px] text-muted-foreground font-mono">
                {new Date(lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
        <Moon className="h-3.5 w-3.5" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover-glow-emerald rounded-lg transition-colors duration-200 btn-scale"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">Switch to {isDark ? 'light' : 'dark'} mode</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function LiveClock({ time }: { time: string }) {
  const parts = time.split(':')
  return (
    <span>
      {parts[0]}<span className="animate-colon-blink">:</span>{parts[1]}<span className="animate-colon-blink">:</span>{parts[2]}
    </span>
  )
}

function SelfHealButton() {
  const [healing, setHealing] = useState(false)
  const [lastStatus, setLastStatus] = useState<string | null>(null)

  const handleHeal = useCallback(async () => {
    if (healing) return
    setHealing(true)
    try {
      const res = await fetch('/api/rally/self-heal', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setLastStatus(data.status)
        if (data.status === 'healthy') {
          toast.success('System Healthy', { description: data.summary })
        } else if (data.status === 'healed' || data.status === 'partial') {
          toast.success('Auto-Repair Complete', {
            description: `${data.actionsTaken.length} fix(es) applied: ${data.actionsTaken.join(', ')}`,
          })
        } else {
          toast.error('Self-Heal Issues', { description: data.summary })
        }
      }
    } catch {
      toast.error('Self-heal failed', { description: 'Network error' })
    } finally {
      setHealing(false)
    }
  }, [healing])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 transition-colors duration-200 btn-scale',
              lastStatus === 'healthy'
                ? 'text-emerald-400 hover:bg-emerald-500/10'
                : lastStatus === 'healed'
                  ? 'text-amber-400 hover:bg-amber-500/10'
                  : lastStatus === 'partial'
                    ? 'text-orange-400 hover:bg-orange-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
            onClick={handleHeal}
            disabled={healing}
          >
            <HeartPulse className={cn('h-3.5 w-3.5', healing && 'animate-pulse')} />
            <span className="sr-only">Self-Heal System</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {healing ? 'Running self-heal...' : 'Self-Heal: Check & Auto-Fix'}
          </p>
          {lastStatus && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Last: {lastStatus}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
