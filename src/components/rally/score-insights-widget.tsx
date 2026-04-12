'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Lightbulb, TrendingUp, TrendingDown, Minus, Target, Flame, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface PipelineRun {
  score: number
  timestamp: string
  variation?: string
  prompt?: string
}

interface Insight {
  icon: typeof Lightbulb
  title: string
  description: string
  type: 'tip' | 'warning' | 'success' | 'info'
}

export function ScoreInsightsWidget() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [bestScore, setBestScore] = useState(0)
  const [totalRuns, setTotalRuns] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/rally/pipeline-history')
        if (res.ok) {
          const data = await res.json()
          const runs: PipelineRun[] = data.runs || []

          if (runs.length > 0) {
            const scores = runs.map(r => r.score)
            const max = Math.max(...scores)
            const min = Math.min(...scores)
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length
            const latestScore = scores[0]

            setBestScore(max)
            setTotalRuns(runs.length)

            const generated: Insight[] = []

            // Score trend analysis
            if (runs.length >= 3) {
              const recent = scores.slice(0, 3)
              const older = scores.slice(3, 6)
              if (older.length > 0) {
                const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
                const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
                if (recentAvg > olderAvg + 1) {
                  generated.push({
                    icon: TrendingUp,
                    title: 'Score Trending Up',
                    description: `Recent avg (${recentAvg.toFixed(1)}) is ${(recentAvg - olderAvg).toFixed(1)} points higher than previous runs. Your approach is improving!`,
                    type: 'success',
                  })
                } else if (recentAvg < olderAvg - 1) {
                  generated.push({
                    icon: TrendingDown,
                    title: 'Score Declining',
                    description: `Recent avg (${recentAvg.toFixed(1)}) dropped ${(olderAvg - recentAvg).toFixed(1)} points. Consider adjusting your prompt or feedback loops.`,
                    type: 'warning',
                  })
                } else {
                  generated.push({
                    icon: Minus,
                    title: 'Stable Performance',
                    description: `Scores are consistent around ${recentAvg.toFixed(1)}. Try varying your angles to break through.`,
                    type: 'info',
                  })
                }
              }
            }

            // Gap to perfect score
            if (max < 18) {
              generated.push({
                icon: Target,
                title: `${18 - max} Points to Perfect`,
                description: max >= 15
                  ? `You're close to a perfect 18/18! Focus on originality and engagement dimensions.`
                  : max >= 12
                  ? `Good progress. Target the Relevance and Clarity dimensions for the biggest impact.`
                  : `Room to grow. Try increasing feedback loops and experimenting with different content angles.`,
                type: 'tip',
              })
            } else {
              generated.push({
                icon: Flame,
                title: 'Perfect Score Achieved!',
                description: `You hit 18/18 — that's elite-level content! Keep this quality and maintain consistency across campaigns.`,
                type: 'success',
              })
            }

            // Consistency check
            if (runs.length >= 5) {
              const spread = max - min
              if (spread > 6) {
                generated.push({
                  icon: BarChart3,
                  title: 'High Score Variance',
                  description: `Score spread is ${spread.toFixed(1)} points (${min.toFixed(1)}–${max.toFixed(1)}). More consistent prompts will stabilize results.`,
                  type: 'warning',
                })
              } else if (spread <= 3) {
                generated.push({
                  icon: BarChart3,
                  title: 'Consistent Quality',
                  description: `Score spread is only ${spread.toFixed(1)} points. Your pipeline produces reliable results.`,
                  type: 'success',
                })
              }
            }

            setInsights(generated.slice(0, 3))
          } else {
            setInsights([{
              icon: Lightbulb,
              title: 'No Pipeline Data Yet',
              description: 'Run the pipeline to generate score insights and personalized recommendations.',
              type: 'info',
            }])
          }
        }
      } catch {
        setInsights([{
          icon: Lightbulb,
          title: 'Insights Available',
          description: 'Run the pipeline to unlock AI-powered score analysis and improvement tips.',
          type: 'info',
        }])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 120000)
    return () => clearInterval(interval)
  }, [])

  const typeConfig: Record<string, { color: string; iconBg: string; border: string }> = {
    tip: { color: 'text-blue-400', iconBg: 'bg-blue-500/15', border: 'border-blue-500/20' },
    warning: { color: 'text-amber-400', iconBg: 'bg-amber-500/15', border: 'border-amber-500/20' },
    success: { color: 'text-emerald-400', iconBg: 'bg-emerald-500/15', border: 'border-emerald-500/20' },
    info: { color: 'text-muted-foreground', iconBg: 'bg-muted/50', border: 'border-border/40' },
  }

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
        <CardContent className="p-4">
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-1 skeleton-shimmer rounded-lg h-16" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-emerald-500/20 transition-all duration-300 shine-sweep rally-card-hover">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Score Insights
          {totalRuns > 0 && (
            <span className="ml-auto flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{totalRuns} runs analyzed</span>
              {bestScore >= 16 && (
                <span className="badge-float text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                  {bestScore}/18
                </span>
              )}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {insights.map((insight, idx) => {
            const config = typeConfig[insight.type]
            const Icon = insight.icon
            return (
              <TooltipProvider key={idx}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.08 }}
                      className={cn(
                        'flex items-start gap-2.5 p-3 rounded-xl border cursor-default transition-all duration-200 hover:scale-[1.02]',
                        config.border,
                        'bg-card/40',
                        'hover:shadow-sm'
                      )}
                    >
                      <div className={cn('h-6 w-6 rounded-md flex items-center justify-center shrink-0 feature-icon-glow', config.iconBg)}>
                        <Icon className={cn('h-3 w-3', config.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-foreground leading-tight">{insight.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{insight.description}</p>
                      </div>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                    <p>{insight.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
