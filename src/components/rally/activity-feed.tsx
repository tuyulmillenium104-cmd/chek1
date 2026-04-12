'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import {
  Activity,
  Zap,
  BarChart3,
  BookOpen,
  Cog,
  Loader2,
  RefreshCw,
  Inbox,
} from 'lucide-react'

interface ActivityItem {
  type: string
  timestamp: string
  message: string
  category: string
}

const CATEGORY_CONFIG: Record<string, { color: string; dotColor: string; icon: typeof Activity }> = {
  pipeline: { color: 'border-emerald-500/40', dotColor: 'bg-emerald-400', icon: Zap },
  score: { color: 'border-amber-500/40', dotColor: 'bg-amber-400', icon: BarChart3 },
  learning: { color: 'border-blue-500/40', dotColor: 'bg-blue-400', icon: BookOpen },
  system: { color: 'border-zinc-500/40', dotColor: 'bg-zinc-400', icon: Cog },
}

function relativeTime(ts: string): string {
  if (!ts) return ''
  try {
    // Extract ISO date from formats like "2026-04-10T23:00:00.000Z (WIB)"
    const iso = ts.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\.\d]*Z)/)?.[1]
    if (!iso) return ''
    const date = new Date(iso)
    if (isNaN(date.getTime())) return ''

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    if (diffMin < 1) return 'now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDay < 30) return `${diffDay}d ago`
    return `${Math.floor(diffDay / 30)}mo ago`
  } catch {
    return ''
  }
}

export function ActivityFeed({ className }: { className?: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchActivities = useCallback(async () => {
    try {
      setError(false)
      const res = await fetch('/api/rally/activity')
      if (res.ok) {
        const json = await res.json()
        setActivities(json.activities?.slice(0, 8) ?? [])
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [fetchActivities])

  return (
    <Card className={`border-border/30 hover:border-emerald-500/20 transition-all duration-200 shine-sweep ${className ?? ''}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          Activity Feed
          <span className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-normal">
              auto-refresh 30s
            </span>
            <button
              className="h-5 w-5 p-0 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-colors"
              onClick={fetchActivities}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <Activity className="h-6 w-6 text-muted-foreground/30" />
            <p className="text-[11px] text-muted-foreground">Failed to load activity</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              onClick={fetchActivities}
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Inbox className="h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-[11px] text-muted-foreground font-medium">No recent activity</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              Activity will appear here as you run the pipeline
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin">
            {activities.map((item, idx) => {
              const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.system
              const Icon = config.icon
              const time = relativeTime(item.timestamp)
              const isTruncated = item.message.length > 60

              return (
                <motion.div
                  key={`${item.timestamp}-${idx}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  className="flex items-start gap-2 py-1.5 border-l-2 pl-3 activity-item-hover"
                  style={{
                    borderLeftColor: config.dotColor.replace('bg-', '').replace('-400', '-500/40'),
                  }}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor} mt-1.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                      {isTruncated ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[11px] text-foreground/80 truncate max-w-[350px] cursor-default">
                                {item.message}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-sm">
                              <p className="text-xs">{item.message}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-[11px] text-foreground/80">
                          {item.message}
                        </span>
                      )}
                    </div>
                    {time && (
                      <span className="text-[10px] text-muted-foreground/60 ml-[18px]">
                        {time}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
