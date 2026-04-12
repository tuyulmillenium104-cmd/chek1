'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface CampaignScore {
  title: string
  bestScore: number | null
  isActive: boolean
}

function getTrendIcon(avg: number) {
  if (avg >= 15) return TrendingUp
  if (avg >= 10) return Minus
  return TrendingDown
}

function getTrendColor(avg: number) {
  if (avg >= 15) return 'text-emerald-400'
  if (avg >= 10) return 'text-amber-400'
  return 'text-red-400'
}

function getBarColor(score: number) {
  if (score >= 17) return 'from-emerald-400 to-emerald-500'
  if (score >= 14) return 'from-teal-400 to-teal-500'
  if (score >= 10) return 'from-amber-400 to-amber-500'
  return 'from-red-400 to-red-500'
}

export function CampaignScoreDistribution() {
  const [campaigns, setCampaigns] = useState<CampaignScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch('/api/rally/campaigns')
        if (res.ok) {
          const data = await res.json()
          const camps = data.campaigns || []
          setCampaigns(
            camps
              .filter((c: { bestScore: number | null }) => c.bestScore != null)
              .map((c: CampaignScore) => ({
                title: c.title,
                bestScore: c.bestScore!,
                isActive: c.isActive,
              }))
              .sort((a: CampaignScore, b: CampaignScore) => (b.bestScore ?? 0) - (a.bestScore ?? 0))
              .slice(0, 8)
          )
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchCampaigns()
    const interval = setInterval(fetchCampaigns, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-end gap-1 h-20">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm skeleton-shimmer"
                style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (campaigns.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            Score Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <BarChart3 className="h-5 w-5 text-muted-foreground/30 mb-1.5" />
            <p className="text-[10px] text-muted-foreground/50">No scored campaigns yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const scores = campaigns.map(c => c.bestScore!)
  const maxScore = Math.max(...scores)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
  const TrendIcon = getTrendIcon(avgScore)
  const trendColor = getTrendColor(avgScore)

  return (
    <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl hover:border-emerald-500/20 transition-all duration-300 shine-sweep rally-card-hover">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          Score Distribution
          <span className="ml-auto flex items-center gap-1.5">
            <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
            <span className={cn('text-xs font-mono font-bold', trendColor)}>
              {avgScore.toFixed(1)}
            </span>
            <span className="text-[10px] text-muted-foreground">avg</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Bar chart */}
        <div className="flex items-end gap-[3px] h-20">
          {campaigns.map((campaign, idx) => {
            const score = campaign.bestScore!
            const heightPct = score > 0 ? Math.max(10, (score / 18) * 100) : 10
            const barColor = getBarColor(score)

            return (
              <TooltipProvider key={campaign.title}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05, ease: 'easeOut' }}
                      className="flex-1 flex flex-col items-center gap-0.5 cursor-default group"
                    >
                      <div
                        className={cn(
                          'w-full rounded-t-sm bg-gradient-to-t transition-all duration-200 group-hover:opacity-80 group-hover:shadow-sm',
                          barColor,
                          !campaign.isActive && 'opacity-40'
                        )}
                      />
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    <p className="font-semibold">{campaign.title}</p>
                    <p className="text-muted-foreground">
                      Score: {score.toFixed(1)}/18
                      {!campaign.isActive && ' (expired)'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>

        {/* Score scale */}
        <div className="flex items-center justify-between text-[8px] text-muted-foreground/50 font-mono px-0.5">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
        </div>

        {/* Quick stats */}
        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/30">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Top:</span>
            <span className="font-mono font-bold text-emerald-400">{Math.max(...scores).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Low:</span>
            <span className="font-mono font-bold text-red-400">{Math.min(...scores).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Spread:</span>
            <span className="font-mono font-bold text-amber-400">{(Math.max(...scores) - Math.min(...scores)).toFixed(1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
