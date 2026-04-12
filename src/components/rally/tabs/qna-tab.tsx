'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts'
import { MessageSquare, CheckCircle2, Shield, BookOpen, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface QnAData {
  campaign: string
  mission: string
  content_score: string
  total_qna: number
  distribution: Record<string, number>
  sanitization: string
  accuracy_verification: string
  quality_check: string
  qna: { id: number; category: string; context: string; question: string; answer: string }[]
}

const CATEGORY_COLORS: Record<string, string> = {
  REPLY: '#10b981',
  ORIGINALITY: '#10b981',
  ENGAGEMENT: '#f59e0b',
  DEPTH: '#8b5cf6',
}

const CATEGORIES = ['ALL', 'REPLY', 'ORIGINALITY', 'ENGAGEMENT', 'DEPTH'] as const

const qnaCard = "bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl shadow-sm hover:border-emerald-500/25 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)] transition-all duration-300"

export function QnATab() {
  const [data, setData] = useState<QnAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>('ALL')

  useEffect(() => {
    fetch('/api/rally/qna')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
  }

  if (!data) {
    return (
      <Card className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl p-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No Q&A data available</p>
          <p className="text-[11px] text-muted-foreground/60">Run the pipeline to generate Q&A pairs for your content.</p>
        </div>
      </Card>
    )
  }

  const filteredQna = activeFilter === 'ALL'
    ? data.qna
    : data.qna.filter(q => q.category === activeFilter)

  const pieData = Object.entries(data.distribution).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || '#6b7280',
  }))

  const customTooltipStyle = {
    backgroundColor: 'rgba(15,15,15,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '12px',
  }

  return (
    <div className="space-y-4">
      {/* Quality Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Q&A', value: data.total_qna, sub: data.content_score, icon: MessageSquare, color: 'text-foreground' },
          { label: 'Sanitization', value: data.sanitization.includes('PASSED') ? 'Passed' : 'Failed', sub: '', icon: CheckCircle2, color: data.sanitization.includes('PASSED') ? 'text-emerald-400' : 'text-destructive' },
          { label: 'Accuracy', value: data.accuracy_verification.includes('PASSED') ? 'Verified' : 'Issues', sub: '', icon: Shield, color: data.accuracy_verification.includes('PASSED') ? 'text-emerald-400' : 'text-destructive' },
          { label: 'Quality', value: data.quality_check.includes('PASSED') ? 'All passed' : 'Issues', sub: '', icon: BookOpen, color: data.quality_check.includes('PASSED') ? 'text-emerald-400' : 'text-destructive' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
          >
            <Card className={qnaCard}>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">{stat.label}</p>
                <p className={cn("text-lg font-bold flex items-center gap-1", stat.color)}>
                  {i > 0 && <stat.icon className="h-3.5 w-3.5" />}
                  {stat.value}
                </p>
                {stat.sub && <p className="text-[9px] text-muted-foreground font-mono">{stat.sub}</p>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Filter + Q&A Cards */}
        <div className="lg:col-span-2 space-y-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map(cat => {
              const count = cat === 'ALL' ? data.total_qna : (data.distribution[cat] || 0)
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant={activeFilter === cat ? 'default' : 'outline'}
                  className={cn(
                    'text-xs h-7 px-2.5 transition-all duration-200',
                    activeFilter === cat && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_-3px_rgba(16,185,129,0.15)]'
                  )}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat}
                  <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-4">
                    {count}
                  </Badge>
                </Button>
              )
            })}
          </div>

          {/* Q&A Cards */}
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-2 pr-3">
              {filteredQna.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                >
                  <Card className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl hover:border-emerald-500/25 hover:shadow-[0_0_15px_-5px_rgba(16,185,129,0.1)] hover:-translate-y-0.5 transition-all duration-200">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0"
                          style={{
                            color: CATEGORY_COLORS[q.category] || '#9ca3af',
                            borderColor: `${CATEGORY_COLORS[q.category]}40`,
                            backgroundColor: `${CATEGORY_COLORS[q.category]}10`,
                          }}
                        >
                          {q.category}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">#{q.id}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto">{q.context.substring(0, 40)}...</span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-medium mb-1.5">
                        Q: {q.question}
                      </p>
                      <p className="text-[11px] text-foreground/75 leading-relaxed">
                        A: {q.answer}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {filteredQna.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                    <Inbox className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">No Q&A for this category</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Try selecting a different filter above.</p>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className={cn(qnaCard, "h-fit")}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={customTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-[10px]">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="flex-1">{d.name}</span>
                    <span className="font-mono font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
