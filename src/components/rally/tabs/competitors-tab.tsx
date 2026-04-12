'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Users, Trophy, TrendingUp, AlertTriangle, Target, BarChart3, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface CompetitorData {
  top_competitor_content: { username: string; content: string; true_score: number; max_possible: number; scores: Record<string, number>; campaign: string }[]
  score_insights: { highest_true_score: number; average_top_10: string }
  writing_patterns: { common_hook_styles: string[]; common_angles: string[] }
  overused_phrases: { phrase: string; pct: number; note: string }[]
  overused_angles: string[]
  unique_gaps: string[]
  inherited_top_performers: { username: string; score: number; notes: string }[]
  total_competitor_entries: number
}

const tierConfig: Record<string, { borderColor: string; bgAccent: string; glowClass: string }> = {
  elite: { borderColor: 'border-l-emerald-500', bgAccent: 'bg-emerald-500/5', glowClass: 'hover:shadow-[0_0_16px_-4px_rgba(16,185,129,0.25)]' },
  strong: { borderColor: 'border-l-blue-500', bgAccent: 'bg-blue-500/5', glowClass: 'hover:shadow-[0_0_16px_-4px_rgba(59,130,246,0.25)]' },
  moderate: { borderColor: 'border-l-amber-500', bgAccent: 'bg-amber-500/5', glowClass: 'hover:shadow-[0_0_16px_-4px_rgba(245,158,11,0.25)]' },
  weak: { borderColor: 'border-l-red-500', bgAccent: 'bg-red-500/5', glowClass: 'hover:shadow-[0_0_16px_-4px_rgba(239,68,68,0.25)]' },
}

function getCompetitorTier(score: number): string {
  if (score === 18) return 'elite'
  if (score >= 16) return 'strong'
  if (score >= 14) return 'moderate'
  return 'weak'
}

function getRankBorderAccent(rank: number): string {
  if (rank < 3) return 'border-l-emerald-500'
  if (rank < 5) return 'border-l-amber-500'
  return 'border-l-zinc-500'
}

function AnimatedScoreBar({ score, max }: { score: number; max: number }) {
  const pct = (score / max) * 100
  const tier = getCompetitorTier(score)
  const color = tier === 'elite' ? 'bg-emerald-500' : tier === 'strong' ? 'bg-blue-500' : tier === 'moderate' ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="h-1.5 w-full rounded-full bg-muted/20 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        className={cn('h-full rounded-full score-bar-fill', color)}
        style={{ boxShadow: tier === 'elite' ? '0 0 8px rgba(16,185,129,0.4)' : 'none' }}
      />
    </div>
  )
}

export function CompetitorsTab() {
  const [data, setData] = useState<CompetitorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rally/competitors')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setLoading(false); setData(null) })
  }, [])

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>
  }

  if (!data) {
    return <Card className="bg-card/50 border border-border/50 rounded-xl p-8 text-center"><p className="text-sm text-muted-foreground">Data unavailable</p></Card>
  }

  return (
    <div className="space-y-4">
      {/* Summary Row — glassmorphism with stagger entrance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Top Score Seen', value: `${data.score_insights?.highest_true_score ?? 0}/18`, accent: true },
          { label: 'Avg Top 10', value: data.score_insights?.average_top_10 ?? '0', accent: false },
          { label: 'Tracked Entries', value: String(data.total_competitor_entries ?? 0), accent: false },
          { label: 'Gap Angles', value: String(data.unique_gaps?.length ?? 0), accent: true },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
          >
            <Card className={cn(
              'bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl transition-all duration-300',
              'hover:border-emerald-500/20 hover:shadow-lg hover:-translate-y-0.5',
              stat.accent && 'hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]'
            )}>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
                <p className={cn('text-lg font-bold font-mono mt-0.5', stat.accent ? 'text-emerald-400' : 'text-foreground')}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Competitor Content — glassmorphism cards with tier borders */}
        <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl lg:col-span-2">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-400" />
                Top Competitor Content
              </CardTitle>
              <button
                className="h-6 w-6 p-0 rounded-md hover:bg-muted/50 transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => { toast.success('Exporting competitor data...'); window.open('/api/rally/export?type=competitors', '_blank') }}
                title="Download CSV"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-96">
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.05 } },
                }}
              >
                {(data.top_competitor_content || []).map((c, i) => {
                  const tier = getCompetitorTier(c.true_score)
                  const config = tierConfig[tier]
                  return (
                    <motion.div
                      key={i}
                      variants={{
                        hidden: { opacity: 0, x: -8 },
                        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
                      }}
                      className={cn(
                        'rounded-lg p-3 border border-l-[3px] bg-card/50 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-default',
                        getRankBorderAccent(i),
                        config.glowClass,
                        c.true_score === 18 && 'bg-emerald-500/5'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'h-7 w-7 rounded-full flex items-center justify-center shrink-0',
                            tier === 'elite' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                            tier === 'strong' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                            tier === 'moderate' ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                            'bg-gradient-to-br from-red-400 to-red-600'
                          )}>
                            <span className="text-white text-[10px] font-bold">{c.username[0]?.toUpperCase()}</span>
                          </div>
                          <span className="text-xs font-semibold font-mono">@{c.username}</span>
                          {c.true_score === 18 && <Trophy className="h-3 w-3 text-emerald-400" />}
                          <Badge variant="outline" className={cn(
                            'text-[9px] font-mono px-1.5 py-0',
                            tier === 'elite' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                            tier === 'strong' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                            tier === 'moderate' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                            'text-red-400 border-red-500/30 bg-red-500/10'
                          )}>
                            {c.true_score}/{c.max_possible}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[11px] text-foreground/70 line-clamp-2 leading-relaxed mb-2">{c.content}</p>
                      {/* Animated score bar */}
                      <AnimatedScoreBar score={c.true_score} max={c.max_possible} />
                      {c.scores && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {Object.entries(c.scores).map(([dim, score]) => (
                            <span key={dim} className="text-[9px] font-mono text-muted-foreground">
                              {dim.substring(0, 3)}:{score}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </motion.div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Inherited Top Performers — glassmorphism */}
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl hover:border-emerald-500/20 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              Top Performers (prev campaign)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-52">
              <div className="space-y-2">
                {(data.inherited_top_performers || []).map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                    className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 hover:scale-[1.005] transition-all duration-200"
                  >
                    <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-400 border-emerald-500/30 shrink-0">
                      {p.score}/18
                    </Badge>
                    <div>
                      <p className="text-[11px] font-semibold font-mono">@{p.username}</p>
                      <p className="text-[9px] text-muted-foreground">{p.notes}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Overused Phrases — glassmorphism */}
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl hover:border-amber-500/20 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Overused Phrases
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-52">
              <div className="space-y-1.5">
                {(data.overused_phrases || []).map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <span className={cn('text-[10px] font-mono font-semibold w-10 text-right', p.pct >= 80 ? 'text-destructive' : p.pct >= 60 ? 'text-amber-400' : 'text-foreground/70')}>{p.pct}%</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] truncate">{p.phrase}</p>
                      <p className="text-[9px] text-muted-foreground">{p.note}</p>
                    </div>
                    <div className="h-1 w-12 rounded-full bg-muted/30 overflow-hidden shrink-0">
                      <div
                        className={cn('h-full rounded-full', p.pct >= 80 ? 'bg-destructive' : p.pct >= 60 ? 'bg-amber-500' : 'bg-muted-foreground/40')}
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overused Angles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl hover:border-red-500/20 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Overused Angles (AVOID)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-1.5">
                {(data.overused_angles || []).map((angle, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                  >
                    <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-default">
                      {angle}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Unique Gaps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl hover:border-emerald-500/20 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)] hover:-translate-y-0.5 transition-all duration-300">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                Gap Opportunities (USE THESE)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-1.5">
                {(data.unique_gaps || []).map((gap, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                  >
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:shadow-[0_0_8px_-2px_rgba(16,185,129,0.2)] transition-all duration-200 cursor-default">
                      {gap}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
