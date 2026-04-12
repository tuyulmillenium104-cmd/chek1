'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Brain, BookOpen, Shield, Gauge, CheckCircle2, Lightbulb, AlertTriangle, Trophy, TrendingUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface KnowledgeData {
  total_campaigns_worked: number
  total_18_18_achieved: number
  avg_score: number
  campaigns: { name: string; final_score: number; rally_actual_score: number; achieved_18_18: boolean; cycles_needed: number; winning_angle: string; winning_variation: string; winning_hook: string }[]
  cross_campaign: {
    hardest_dimensions_ranked: { dimension: string; fail_rate: string; why: string; how_to_fix: string }[]
    best_hook_styles: string[]
    common_mistakes: string[]
    writing_techniques_ranked: { technique: string; success_rate: string; used_in: string; note?: string }[]
    content_length_ideal: { single_post_chars: string; single_post_words: string; paragraph_count: string }
    anti_ai_checklist: string[]
    engagement_5_5_insights: { why_hard: string; recommendation: string; internal_bias: number }
  }
  adaptive_system: {
    enabled: boolean
    evolution_count: number
    patterns: { id: string; name: string; category: string; description: string; weight: number; confidence: number; success_rate: number; times_used: number; status: string; overuse_flag: boolean }[]
    staleness_score: number
    rule_decay: {
      hard_rules_count: number
      hard_rules: string[]
      soft_rules: { id: string; rule: string; confidence: number; status: string }[]
    }
  }
  calibration: {
    global: { total_bias: number; total_samples: number; well_calibrated: boolean; note: string }
    dimensions: Record<string, { internal_bias: number; trend: string; confidence: number }>
  }
}

const sectionFade = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const knowledgeCard = "bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl shadow-sm hover:border-emerald-500/25 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)] transition-all duration-300"

export function KnowledgeTab() {
  const [data, setData] = useState<KnowledgeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rally/knowledge')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-60 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>
  }

  if (!data) {
    return <Card className="bg-card/50 border border-border/50 rounded-xl p-8 text-center"><p className="text-sm text-muted-foreground">Data unavailable</p></Card>
  }

  return (
    <div className="space-y-4">
      {/* Campaign History */}
      <motion.div custom={0} initial="hidden" animate="visible" variants={sectionFade}>
        <Card className={knowledgeCard}>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-400" />
              Campaign History
              <Badge variant="outline" className="text-[9px] ml-auto font-mono">{data.total_campaigns_worked} campaigns</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {data.campaigns.map((c, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={cn(
                    'rounded-lg p-3 border backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
                    c.achieved_18_18
                      ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]'
                      : 'border-border/50 bg-muted/20 hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        'text-[10px] font-mono',
                        c.achieved_18_18 ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'
                      )}>
                        {c.final_score}/18
                      </Badge>
                      {c.rally_actual_score !== c.final_score && (
                        <span className="text-[9px] font-mono text-muted-foreground">(Rally: {c.rally_actual_score})</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    <span>Cycles: {c.cycles_needed}</span>
                    <span>Winner: {c.winning_variation}</span>
                    <span className="truncate max-w-[200px]">{c.winning_angle}</span>
                  </div>
                  {c.winning_hook && (
                    <p className="text-[10px] text-emerald-400/80 mt-1 italic">&quot;{c.winning_hook}&quot;</p>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hardest Dimensions */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={sectionFade}>
          <Card className={knowledgeCard}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-emerald-400" />
                Hardest Dimensions Ranked
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {data.cross_campaign.hardest_dimensions_ranked.map((dim, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ x: 4, scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 rounded-lg p-2 -mx-2 hover:bg-muted/20 cursor-default transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-400 border-amber-500/30">
                            #{i + 1}
                          </Badge>
                          <span className="text-xs font-semibold">{dim.dimension}</span>
                          <span className="text-[10px] font-mono text-amber-400">({dim.fail_rate} fail)</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground pl-7">{dim.why}</p>
                      <p className="text-[10px] text-emerald-400/80 pl-7">Fix: {dim.how_to_fix}</p>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Best Hooks */}
        <motion.div custom={2} initial="hidden" animate="visible" variants={sectionFade}>
          <Card className={knowledgeCard}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-emerald-400" />
                Best Hook Styles & Writing Techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Hooks</p>
                    {data.cross_campaign.best_hook_styles.map((hook, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ x: 3 }}
                        className="text-[11px] text-foreground/80 mb-1.5 flex items-start gap-2 rounded px-1.5 py-0.5 hover:bg-emerald-500/5 transition-colors"
                      >
                        <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                        <span className="italic">{hook}</span>
                      </motion.div>
                    ))}
                  </div>
                  <Separator className="bg-border/50" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Techniques</p>
                    {data.cross_campaign.writing_techniques_ranked.map((t, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ x: 3 }}
                        className="mb-1.5 flex items-start gap-2 rounded px-1.5 py-0.5 hover:bg-muted/20 transition-colors"
                      >
                        <Badge variant="outline" className={cn(
                          'text-[8px] px-1 py-0 shrink-0 mt-0.5',
                          t.success_rate === 'high' ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'
                        )}>
                          {t.success_rate}
                        </Badge>
                        <span className="text-[10px] text-foreground/80">{t.technique}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Anti-AI Checklist */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={sectionFade}>
          <Card className={knowledgeCard}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                Anti-AI Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ScrollArea className="max-h-52">
                <div className="space-y-1.5">
                  {data.cross_campaign.anti_ai_checklist.map((rule, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ x: 3, backgroundColor: 'rgba(16,185,129,0.05)' }}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/20 backdrop-blur-sm border border-transparent hover:border-emerald-500/15 cursor-default"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[10px] text-foreground/80">{rule}</span>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Common Mistakes */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={sectionFade}>
          <Card className={knowledgeCard}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Common Mistakes to Avoid
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ScrollArea className="max-h-52">
                <div className="space-y-1.5">
                  {data.cross_campaign.common_mistakes.map((mistake, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ x: 3, backgroundColor: 'rgba(245,158,11,0.05)' }}
                      className="flex items-start gap-2 p-1.5 rounded-lg bg-muted/20 backdrop-blur-sm border border-transparent hover:border-amber-500/15 cursor-default"
                    >
                      <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-[10px] text-foreground/80">{mistake}</span>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Adaptive System */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={sectionFade}>
          <Card className={knowledgeCard}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Gauge className="h-4 w-4 text-emerald-400" />
                Adaptive System Status
                <Badge variant={data.adaptive_system.enabled ? 'default' : 'secondary'} className={cn('text-[9px] ml-auto', data.adaptive_system.enabled && 'bg-emerald-500/15 text-emerald-400')}>
                  {data.adaptive_system.enabled ? 'Active' : 'Inactive'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <motion.div whileHover={{ scale: 1.03 }} className="bg-muted/20 backdrop-blur-sm rounded-lg p-2 text-center border border-border/20 hover:border-emerald-500/15 transition-all">
                  <p className="text-[9px] text-muted-foreground uppercase">Patterns</p>
                  <p className="text-sm font-bold font-mono">{data.adaptive_system.patterns.length}</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} className="bg-muted/20 backdrop-blur-sm rounded-lg p-2 text-center border border-border/20 hover:border-emerald-500/15 transition-all">
                  <p className="text-[9px] text-muted-foreground uppercase">Staleness</p>
                  <p className={cn('text-sm font-bold font-mono', data.adaptive_system.staleness_score > 50 ? 'text-amber-400' : 'text-emerald-400')}>
                    {data.adaptive_system.staleness_score}
                  </p>
                </motion.div>
              </div>
              <ScrollArea className="max-h-36">
                <div className="space-y-1.5">
                  {data.adaptive_system.patterns.map(p => (
                    <motion.div
                      key={p.id}
                      whileHover={{ x: 3 }}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/20 backdrop-blur-sm border border-transparent hover:border-border/30 cursor-default transition-all"
                    >
                      <Badge variant="outline" className={cn(
                        'text-[8px] px-1 py-0 shrink-0',
                        p.status === 'proven' ? 'text-emerald-400 border-emerald-500/30' : 'text-blue-400 border-blue-500/30'
                      )}>
                        {p.status}
                      </Badge>
                      <span className="text-[10px] flex-1 truncate">{p.name}</span>
                      <span className="text-[9px] font-mono text-muted-foreground">{(p.weight * 100).toFixed(0)}%</span>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Calibration */}
        <motion.div custom={6} initial="hidden" animate="visible" variants={sectionFade}>
          <Card className={knowledgeCard}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Calibration
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="bg-muted/20 backdrop-blur-sm rounded-lg p-3 border border-border/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Total Bias</span>
                  <span className={cn('text-sm font-bold font-mono', data.calibration.global.total_bias === 0 ? 'text-emerald-400' : 'text-amber-400')}>
                    {data.calibration.global.total_bias > 0 ? '+' : ''}{data.calibration.global.total_bias}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Samples</span>
                  <span className="text-sm font-bold font-mono">{data.calibration.global.total_samples}/3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">Status</span>
                  <Badge variant="outline" className={cn(
                    'text-[9px]',
                    data.calibration.global.well_calibrated ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'
                  )}>
                    {data.calibration.global.well_calibrated ? 'Calibrated' : 'Needs data'}
                  </Badge>
                </div>
              </div>

              {/* Dimension biases */}
              <ScrollArea className="max-h-32">
                <div className="space-y-1">
                  {Object.entries(data.calibration.dimensions).map(([dim, cal]) => (
                    <motion.div
                      key={dim}
                      whileHover={{ x: 3 }}
                      className="flex items-center gap-2 text-[10px] rounded px-1.5 py-0.5 hover:bg-muted/20 cursor-default transition-colors"
                    >
                      <span className="text-muted-foreground w-24 shrink-0">{dim.replace(/_/g, ' ')}</span>
                      <span className={cn('font-mono font-semibold', cal.internal_bias === 0 ? 'text-emerald-400' : 'text-amber-400')}>
                        {cal.internal_bias > 0 ? '+' : ''}{cal.internal_bias}
                      </span>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 text-muted-foreground">
                        {cal.trend}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
