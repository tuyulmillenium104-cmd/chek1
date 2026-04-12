'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Clock, CheckCircle2, Activity, AlertCircle, Zap, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface TimelineData {
  events: { task_id: string; agent: string; task: string; timestamp: string; type: string; summary: string[]; score: number | null }[]
  milestones: { label: string; completed: boolean; timestamp: string | null }[]
  total_events: number
  pipeline_status: string
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; glow: string }> = {
  build_complete: { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]' },
  monitor_check: { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]' },
  error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/30', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.3)]' },
  pipeline: { icon: GitBranch, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
}

const timelineCard = "bg-card/50 backdrop-blur-xl border border-border/30 rounded-xl shadow-sm hover:border-emerald-500/25 hover:shadow-[0_0_24px_-6px_rgba(16,185,129,0.12)] transition-all duration-300"

export function TimelineTab() {
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rally/timeline')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return <Card className="bg-card/50 border border-border/50 rounded-xl p-8 text-center"><p className="text-sm text-muted-foreground">Data unavailable</p></Card>
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Status Banner — glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className={cn(
          'bg-card/50 backdrop-blur-xl border rounded-xl shadow-sm',
          data.pipeline_status === 'working'
            ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_24px_-6px_rgba(16,185,129,0.18)]'
            : 'border-border/30'
        )}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-3.5 w-3.5 rounded-full transition-all duration-300',
                data.pipeline_status === 'working'
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                  : 'bg-muted-foreground/50'
              )} />
              <div>
                <p className="text-sm font-semibold">
                  Pipeline: <span className={cn('font-mono', data.pipeline_status === 'working' ? 'text-emerald-400' : 'text-muted-foreground')}>
                    {data.pipeline_status}
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground">{data.total_events} events logged</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {data.events[0]?.timestamp ? new Date(data.events[0].timestamp).toLocaleDateString() : ''}
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Campaign Milestones — glassmorphism + gradient connecting lines */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}
        >
          <Card className={cn(timelineCard, "lg:col-span-1 h-fit")}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Campaign Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <motion.div
                className="space-y-0"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.07 } },
                }}
              >
                {data.milestones.map((ms, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, x: i % 2 === 0 ? -12 : 12 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
                    }}
                    className="flex items-start gap-3 pb-3 group"
                  >
                    <div className="flex flex-col items-center">
                      {/* Timeline dot with hover glow */}
                      <div className={cn(
                        'h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 border-2 hover:shadow-[0_0_8px_rgba(16,185,129,0.4)]',
                        ms.completed
                          ? 'bg-emerald-500/20 border-emerald-500/40 group-hover:bg-emerald-500/30 group-hover:shadow-[0_0_14px_rgba(16,185,129,0.3)] group-hover:scale-110'
                          : 'bg-muted/30 border-border/40 group-hover:border-muted-foreground/40 group-hover:shadow-[0_0_8px_rgba(148,163,184,0.15)]'
                      )}>
                        {ms.completed ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                        )}
                      </div>
                      {/* Gradient connecting line */}
                      {i < data.milestones.length - 1 && (
                        <div className={cn(
                          'w-0.5 h-full min-h-[20px] rounded-full transition-colors duration-300',
                          ms.completed
                            ? 'bg-gradient-to-b from-emerald-500/40 via-emerald-500/20 to-emerald-500/5'
                            : 'bg-gradient-to-b from-border/20 to-border/10'
                        )} />
                      )}
                    </div>
                    <div className={cn(
                      'pb-1 flex-1 rounded-lg p-1.5 -m-1.5 transition-all duration-200 card-shimmer bg-card/50 backdrop-blur-sm',
                      ms.completed && 'hover:bg-emerald-500/5'
                    )}>
                      <p className={cn('text-[11px] transition-colors group-hover:text-foreground', ms.completed ? 'text-foreground/90 font-medium' : 'text-muted-foreground')}>
                        {ms.label}
                      </p>
                      {ms.timestamp && (
                        <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                          {new Date(ms.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Event Timeline — glassmorphism + gradient connecting lines */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
        >
          <Card className={cn(timelineCard, "lg:col-span-2")}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ScrollArea className="max-h-[500px]">
                <motion.div
                  className="space-y-0"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.03 } },
                  }}
                >
                  {data.events.map((event, i) => {
                    const config = typeConfig[event.type] || typeConfig.pipeline
                    const Icon = config.icon

                    return (
                      <motion.div
                        key={i}
                        variants={{
                          hidden: { opacity: 0, x: i % 2 === 0 ? -10 : 10 },
                          visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
                        }}
                        className="flex items-start gap-3 pb-4 relative group hover:bg-muted/10 -mx-1 px-1 rounded-lg transition-colors card-shimmer"
                      >
                        {/* Gradient connecting line */}
                        {i < data.events.length - 1 && (
                          <div className="absolute left-[14px] top-[30px] w-0.5 h-[calc(100%-14px)] bg-gradient-to-b from-border/30 via-border/15 to-border/5 group-hover:from-emerald-500/15 group-hover:to-emerald-500/5 transition-colors" />
                        )}

                        {/* Timeline dot with icon and hover glow */}
                        <div className={cn(
                          'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 relative z-10 transition-all duration-300 border hover:shadow-[0_0_8px_rgba(16,185,129,0.4)]',
                          config.bg, config.border,
                          'group-hover:scale-115 group-hover:' + config.glow
                        )}>
                          <Icon className={cn('h-3.5 w-3.5', config.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', config.border, config.color)}>
                              {event.type.replace('_', ' ')}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground font-mono">{event.task_id}</span>
                            {event.score && (
                              <Badge className="bg-emerald-500/15 text-emerald-400 text-[9px] px-1.5 py-0 shadow-[0_0_8px_rgba(16,185,129,0.12)]">
                                {event.score}/18
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-foreground/85 group-hover:text-foreground transition-colors">{event.task}</p>
                          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                            {event.agent}{event.timestamp ? ` · ${new Date(event.timestamp).toLocaleString()}` : ''}
                          </p>

                          {/* Summary items */}
                          {event.summary && event.summary.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {event.summary.slice(0, 3).map((s, si) => (
                                <p key={si} className="text-[9px] text-muted-foreground pl-2 border-l border-border/30 group-hover:border-emerald-500/20 transition-colors">
                                  {s.substring(0, 120)}{s.length > 120 ? '...' : ''}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}

                  {data.events.length === 0 && (
                    <motion.div
                      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">No events recorded</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Run the pipeline to start recording events.</p>
                    </motion.div>
                  )}
                </motion.div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
