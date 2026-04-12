'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, X, Trophy, Twitter, ArrowLeftRight, FileText, Download, Copy, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface Variation {
  id: string
  text: string
  word_count: number
  char_count: number
  paragraph_cv: number
  question_count: number
  compliance: {
    no_em_dash: boolean
    no_hashtag: boolean
    has_rally_mention: boolean
    no_start_mention: boolean
    no_ai_words: boolean
    no_template_phrases: boolean
  }
  scores: {
    originality: number
    alignment: number
    accuracy: number
    compliance: number
    engagement: number
    technical: number
    total: number
  } | null
}

interface ContentData {
  variations: Variation[]
  winner: string | null
  best_content: string | null
  mission_directive: string
  mission_rules: string[]
}

const complianceLabels: Record<string, string> = {
  no_em_dash: 'No em-dashes',
  no_hashtag: 'No hashtags',
  has_rally_mention: '@RallyOnChain',
  no_start_mention: 'No start mention',
  no_ai_words: 'No AI words',
  no_template_phrases: 'No templates',
}

const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

export function ContentTab() {
  const [data, setData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeVar, setActiveVar] = useState('E')
  const [compareMode, setCompareMode] = useState(false)
  const [compareVar, setCompareVar] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [scoreFilter, setScoreFilter] = useState('all')

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Content copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // fallback
    }
  }

  useEffect(() => {
    fetch('/api/rally/content')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>
  }

  if (!data) {
    return <Card className="bg-card/50 border border-border/50 rounded-xl p-8 text-center"><p className="text-sm text-muted-foreground">Data unavailable</p></Card>
  }

  const vars = data.variations || []
  const filteredVars = vars.filter(v => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!v.text.toLowerCase().includes(q) && !v.id.toLowerCase().includes(q)) return false
    }
    if (scoreFilter === '16+') return v.scores && v.scores.total >= 16
    if (scoreFilter === '17+') return v.scores && v.scores.total >= 17
    if (scoreFilter === '18') return v.scores && v.scores.total >= 17.9
    return true
  })
  const currentVar = filteredVars.find(v => v.id === activeVar) || filteredVars[0]
  const compareVarData = compareMode && compareVar ? filteredVars.find(v => v.id === compareVar) : null

  return (
    <div className="space-y-4 transition-all duration-300">
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 flex-col sm:flex-row">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search content variations..."
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-muted/30 border border-border/50 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {['all', '16+', '17+', '18'].map(f => (
            <button
              key={f}
              onClick={() => setScoreFilter(f)}
              className={cn(
                'h-7 px-2.5 rounded-lg text-[10px] font-mono transition-colors border',
                scoreFilter === f
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-muted/20 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/40'
              )}
            >
              {f === 'all' ? 'All' : `${f}`}
            </button>
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">
            {filteredVars.length}/{vars.length}
          </span>
        </div>
      </div>

      {/* Variation Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {filteredVars.map((v, i) => (
          <motion.div
            key={v.id}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <Button
              size="sm"
              variant={activeVar === v.id ? 'default' : 'outline'}
              className={cn(
                'text-xs font-mono h-8 px-3',
                activeVar === v.id && 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30',
                v.id === data.winner && 'ring-1 ring-emerald-400/50'
              )}
              onClick={() => { setActiveVar(v.id); if (compareMode) setCompareVar(v.id) }}
            >
              {v.id}
              {v.scores && <span className="ml-1.5 opacity-60">{v.scores.total.toFixed(1)}</span>}
              {v.id === data.winner && <>
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <Trophy className="h-3 w-3 text-emerald-400" />
              </>}
            </Button>
          </motion.div>
        ))}
        {filteredVars.length === 0 && (
          <p className="text-xs text-muted-foreground py-4">No variations match your search.</p>
        )}
        <Separator orientation="vertical" className="h-6" />
        <Button
          size="sm"
          variant={compareMode ? 'default' : 'outline'}
          className={cn('text-xs h-8', compareMode && 'bg-amber-500/20 text-amber-400 border-amber-500/30')}
          onClick={() => { setCompareMode(!compareMode); setCompareVar(null) }}
        >
          <ArrowLeftRight className="h-3 w-3 mr-1" />
          Compare
        </Button>
      </div>

      {/* Content Cards */}
      <div className={cn('grid gap-4', compareMode && compareVarData ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>
        {[currentVar, compareMode && compareVarData ? compareVarData : null].filter(Boolean).map((v, idx) => {
          const variation = v as Variation
          const isWinner = variation.id === data.winner
          return (
            <motion.div
              key={`${variation.id}-${idx}`}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-3"
            >
              {/* Header */}
              <Card className={cn(
                "rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
                isWinner
                  ? "bg-gradient-to-br from-emerald-500/10 via-card/80 to-card/80 backdrop-blur-xl border-2 border-emerald-400/40 shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)]"
                  : "bg-card/60 backdrop-blur-xl border border-border/40 shadow-sm hover:border-emerald-500/25 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)]"
              )}>
                <CardHeader className="pb-2 px-4 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      Variation {variation.id}
                      {isWinner && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] shadow-[0_0_8px_rgba(16,185,129,0.15)]">Winner</Badge>}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <button
                        className="h-6 w-6 p-0 rounded-md hover:bg-muted/50 transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(variation.text, variation.id)}
                        title="Copy content"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="h-6 w-6 p-0 rounded-md hover:bg-muted/50 transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => window.open('/api/rally/export?type=content', '_blank')}
                        title="Download CSV"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {variation.scores && (
                        <div className="text-right">
                          <p className={cn('text-lg font-bold font-mono', variation.scores.total >= 16 ? 'text-emerald-400' : 'text-amber-400')}>
                            {variation.scores.total.toFixed(1)}<span className="text-muted-foreground text-xs">/18</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {/* Content Text */}
                  <ScrollArea className="max-h-48 mb-4">
                    <p className="text-xs leading-relaxed whitespace-pre-line text-foreground/85">
                      {variation.text.substring(0, 1000)}{variation.text.length > 1000 ? '...' : ''}
                    </p>
                  </ScrollArea>

                  <Separator className="bg-border/50 mb-3" />

                  {/* Analysis Metrics — glassmorphism pills */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {[
                      { label: 'Words', value: variation.word_count, accent: false },
                      { label: 'Chars', value: variation.char_count, accent: false },
                      { label: 'Para CV', value: variation.paragraph_cv.toFixed(2), accent: variation.paragraph_cv >= 0.30 },
                      { label: 'Questions', value: variation.question_count, accent: false },
                    ].map((m) => (
                      <motion.div
                        key={m.label}
                        className="bg-muted/20 backdrop-blur-sm rounded-lg p-2 text-center border border-border/20 hover:bg-muted/30 hover:border-emerald-500/15 transition-all duration-200"
                        whileHover={{ scale: 1.03 }}
                      >
                        <p className="text-[9px] text-muted-foreground uppercase">{m.label}</p>
                        <p className={cn("text-sm font-bold font-mono", m.accent ? "text-emerald-400" : "")}>{m.value}</p>
                      </motion.div>
                    ))}
                  </div>

                  <Separator className="bg-border/50 mb-3" />

                  {/* Compliance */}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Compliance Check</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(variation.compliance).map(([key, passed]) => (
                        <TooltipProvider key={key}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] backdrop-blur-sm transition-all duration-200',
                                passed
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15'
                                  : 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15'
                              )}>
                                {passed ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                                {complianceLabels[key]}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-[10px]">{complianceLabels[key]}: {passed ? 'PASS' : 'FAIL'}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Twitter/X Preview */}
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl shadow-sm hover:border-emerald-500/25 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)] transition-all duration-300">
                  <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Twitter className="h-4 w-4 text-emerald-400" />
                      X/Twitter Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shrink-0 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">A</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-gray-900">@__allend__</span>
                            <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/></svg>
                          </div>
                          <p className="text-gray-500 text-xs">@__allend__</p>
                        </div>
                      </div>
                      <p className="text-gray-900 text-[13px] leading-relaxed mt-3 whitespace-pre-line line-clamp-[6]">
                        {variation.text}
                      </p>
                      <p className="text-gray-400 text-[11px] mt-3 font-mono">
                        {variation.scores ? `${variation.scores.total.toFixed(1)}/18` : 'Unscored'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )
        })}
      </div>

      {/* Mission Rules Reference */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl shadow-sm hover:border-emerald-500/25 transition-all duration-300">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Mission Rules</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-32">
              <ul className="space-y-1">
                {(data.mission_rules || []).map((rule, i) => (
                  <li key={i} className="text-[11px] text-foreground/70 flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
