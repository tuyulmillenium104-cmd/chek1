'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Target, AlertTriangle, Lightbulb, Sparkles, CheckCircle2, X, Zap, TrendingUp, Trophy, Gauge, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContentCompliance } from '@/components/rally/content-compliance'

// --- Types ---

interface ComplianceCheck {
  label: string
  passed: boolean
  detail: string
}

interface DimensionScore {
  name: string
  key: string
  score: number
  max: number
  recommendation: string
}

interface AnalysisResult {
  wordCount: number
  charCount: number
  paragraphCount: number
  paragraphCV: number
  contractions: number
  questions: number
  sentences: number
  avgWordsPerSentence: number
  compliance: ComplianceCheck[]
  antiAIScore: number
  antiAILabel: string
  dimensions: DimensionScore[]
  totalScore: number
}

// --- Constants ---

const DIMENSION_NAMES = [
  { name: 'Relevance & Accuracy', key: 'relevance', max: 3 },
  { name: 'Clarity & Structure', key: 'clarity', max: 3 },
  { name: 'Originality', key: 'originality', max: 3 },
  { name: 'Engagement & Hooks', key: 'engagement', max: 3 },
  { name: 'Value Proposition', key: 'value', max: 3 },
  { name: 'Compliance', key: 'compliance', max: 3 },
]

const AI_WORDS = [
  'delve', 'unlock', 'leverage', 'seamless', 'revolutionize', 'transform',
  'innovative', 'cutting-edge', 'game-changer', 'paradigm', 'ecosystem',
  'synergy', 'robust', 'streamline', 'empower', 'foster', 'elevate',
  'comprehensive', 'meticulous', 'tapestry', 'landscape', 'unleash',
  'navigate', 'embark', 'thriving', 'meticulously', 'captivating',
  'realm', 'dawn', 'pioneer', 'trailblazing',
]

const TEMPLATE_PHRASES = [
  'In today\'s world', 'In this thread', 'Let\'s dive in', 'Here\'s the thing',
  'At the end of the day', 'It goes without saying', 'Needless to say',
  'It\'s worth noting', 'The bottom line is', 'Let that sink in',
  'Thread 🧵', '🧵', '🔥', 'Read this', 'Must read',
]

const TOP_3_TIPS = [
  {
    title: 'Vary paragraph length aggressively',
    desc: 'Mix 1-line, 2-line, and 3-line paragraphs. High paragraph CV (>0.5) signals human writing. AI tends to write uniform blocks.',
    icon: Zap,
  },
  {
    title: 'Open with a contrarian question',
    desc: 'Start with something unexpected. "Why is nobody talking about X?" beats "X is important because..." every time. Hooks with "?" get 40% more engagement.',
    icon: Target,
  },
  {
    title: 'Use 2-3 contractions per 50 words',
    desc: 'Natural human speech uses contractions heavily. "Don\'t" not "Do not", "Can\'t" not "Cannot". This is the #1 anti-AI signal.',
    icon: Sparkles,
  },
]

const RED_FLAGS = [
  { category: 'AI Buzzwords', items: ['delve', 'unlock', 'leverage', 'seamless', 'revolutionize', 'ecosystem', 'tapestry', 'realm'] },
  { category: 'Template Openers', items: ['In today\'s world', 'Let\'s dive in', 'Here\'s the thing', 'At the end of the day'] },
  { category: 'Format Crutches', items: ['Thread 🧵', '🔥🔥🔥', 'Read this', 'Must read', 'Mind blown'] },
  { category: 'Overused Closers', items: ['Let that sink in', 'Think about that', 'Food for thought', 'Just saying'] },
]

const ENGAGEMENT_BOOSTERS = [
  { label: 'Ask questions', tip: '1-2 questions per tweet increases engagement score by ~0.5pts', icon: '❓' },
  { label: 'Use contractions', tip: '"Don\'t", "Can\'t", "It\'s" - natural human language', icon: '💬' },
  { label: 'Short paragraphs', tip: '1-2 sentence paragraphs, vary the length', icon: '📐' },
  { label: 'Personal voice', tip: '"I think", "My take", "I\'ve seen" - first person builds trust', icon: '🧑' },
  { label: 'Specific numbers', tip: '"3 reasons", "47%" beats "several reasons"', icon: '🔢' },
  { label: 'Mention @RallyOnChain', tip: 'Required for compliance (+1pt if present)', icon: '📌' },
]

// --- Analysis Engine ---

function analyzeContent(text: string): AnalysisResult | null {
  if (!text.trim()) return null

  const trimmed = text.trim()

  // Basic counts
  const words = trimmed.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const charCount = trimmed.length

  // Paragraphs
  const paragraphs = trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  const paragraphCount = Math.max(paragraphs.length, 1)

  // Sentence analysis
  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const sentenceCount = Math.max(sentences.length, 1)
  const avgWordsPerSentence = wordCount / sentenceCount

  // Paragraph length variance (CV = std / mean)
  const paragraphLengths = paragraphs.map(p => p.trim().split(/\s+/).length)
  const meanParaLen = paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length
  const variance = paragraphLengths.reduce((sum, len) => sum + Math.pow(len - meanParaLen, 2), 0) / paragraphLengths.length
  const stdParaLen = Math.sqrt(variance)
  const paragraphCV = meanParaLen > 0 ? stdParaLen / meanParaLen : 0

  // Contractions
  const contractionsPattern = /\b(can't|won't|don't|doesn't|didn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|shouldn't|wouldn't|couldn't|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|let's|that's|there's|here's|what's|who's|how's|why's|where's|when's)\b/gi
  const contractionsMatches = trimmed.match(contractionsPattern)
  const contractions = contractionsMatches ? contractionsMatches.length : 0

  // Questions
  const questionMatches = trimmed.match(/[?]/g)
  const questions = questionMatches ? questionMatches.length : 0

  // Compliance checks
  const hasEmDash = /—|–|–/.test(trimmed)
  const hasHashtag = /#\w+/.test(trimmed)
  const hasMention = /@RallyOnChain/i.test(trimmed)
  const hasAIWords = AI_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(trimmed))
  const hasTemplatePhrases = TEMPLATE_PHRASES.some(p => trimmed.toLowerCase().includes(p.toLowerCase()))
  const foundAIWords = AI_WORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(trimmed))
  const foundTemplates = TEMPLATE_PHRASES.filter(p => trimmed.toLowerCase().includes(p.toLowerCase()))

  const compliance: ComplianceCheck[] = [
    { label: 'No em-dash', passed: !hasEmDash, detail: hasEmDash ? 'Found em-dash (—)' : 'Clean' },
    { label: 'No hashtag', passed: !hasHashtag, detail: hasHashtag ? 'Found # symbol' : 'Clean' },
    { label: '@RallyOnChain mention', passed: hasMention, detail: hasMention ? 'Mention found ✓' : 'Missing @RallyOnChain' },
    { label: 'No AI buzzwords', passed: !hasAIWords, detail: foundAIWords.length > 0 ? `Found: ${foundAIWords.join(', ')}` : 'Clean' },
    { label: 'No template phrases', passed: !hasTemplatePhrases, detail: foundTemplates.length > 0 ? `Found: ${foundTemplates.join(', ')}` : 'Clean' },
  ]

  // Anti-AI score (0-100, higher = more human-like)
  const contractionRate = wordCount > 0 ? contractions / wordCount : 0
  const questionRate = sentenceCount > 0 ? questions / sentenceCount : 0

  let antiAIScore = 50 // base
  // Contractions boost (good signal of human writing)
  antiAIScore += Math.min(contractionRate * 200, 15)
  // Questions boost
  antiAIScore += Math.min(questionRate * 30, 10)
  // Paragraph CV boost (variety = human)
  antiAIScore += Math.min(paragraphCV * 20, 10)
  // Sentence length variety boost
  if (avgWordsPerSentence > 5 && avgWordsPerSentence < 25) antiAIScore += 5
  // Word count in sweet spot (50-150 words)
  if (wordCount >= 50 && wordCount <= 150) antiAIScore += 5
  // Penalties
  if (hasAIWords) antiAIScore -= foundAIWords.length * 5
  if (hasTemplatePhrases) antiAIScore -= foundTemplates.length * 4
  if (hasEmDash) antiAIScore -= 3
  if (hasHashtag) antiAIScore -= 3
  if (!hasMention) antiAIScore -= 2
  // Clamp
  antiAIScore = Math.max(0, Math.min(100, Math.round(antiAIScore)))

  let antiAILabel: string
  if (antiAIScore >= 80) antiAILabel = 'Very Human-like'
  else if (antiAIScore >= 60) antiAILabel = 'Mostly Human'
  else if (antiAIScore >= 40) antiAILabel = 'Borderline'
  else if (antiAIScore >= 20) antiAILabel = 'AI-suspicious'
  else antiAILabel = 'Very AI-like'

  // Predict dimension scores
  const compliancePasses = compliance.filter(c => c.passed).length
  const complianceScore = compliancePasses / compliance.length * 3

  const relevanceScore = hasMention ? 2.5 : 2.0
  const clarityScore = Math.min(3, paragraphCV > 0.3 ? 2.5 : 2.0) + (sentences.length > 2 ? 0.3 : 0)
  const originalityScore = Math.max(1.5, 3 - foundAIWords.length * 0.5 - foundTemplates.length * 0.4)
  const engagementScore = Math.min(3, 1.5 + questions * 0.4 + (contractions > 2 ? 0.5 : 0) + (contractionRate > 0.03 ? 0.5 : 0))
  const valueScore = Math.min(3, 1.5 + (wordCount >= 60 ? 0.5 : 0) + (sentences.length >= 3 ? 0.5 : 0) + (avgWordsPerSentence > 8 ? 0.3 : 0))

  const clamp = (v: number) => Math.max(0, Math.min(3, v))

  const dimensions: DimensionScore[] = [
    {
      name: 'Relevance & Accuracy',
      key: 'relevance',
      score: clamp(relevanceScore),
      max: 3,
      recommendation: hasMention ? 'Good - mention present. Add more Rally-specific context.' : 'Missing @RallyOnChain mention. Add it and reference specific Rally features.',
    },
    {
      name: 'Clarity & Structure',
      key: 'clarity',
      score: clamp(clarityScore),
      max: 3,
      recommendation: paragraphCV > 0.3
        ? 'Good paragraph variety. Try a bold opening statement on its own line.'
        : 'Paragraphs are too uniform in length. Vary between 1-line and 3-line paragraphs.',
    },
    {
      name: 'Originality',
      key: 'originality',
      score: clamp(originalityScore),
      max: 3,
      recommendation: foundAIWords.length === 0
        ? 'Clean! Avoid generic angles. Find a unique entry point to the topic.'
        : `Remove AI-sounding words (${foundAIWords.slice(0, 3).join(', ')}). Use plain, direct language.`,
    },
    {
      name: 'Engagement & Hooks',
      key: 'engagement',
      score: clamp(engagementScore),
      max: 3,
      recommendation: questions > 0
        ? 'Questions help engagement. Add 1 more rhetorical question and use more contractions.'
        : 'No questions found. Add at least 1 question and use contractions like "don\'t" instead of "do not".',
    },
    {
      name: 'Value Proposition',
      key: 'value',
      score: clamp(valueScore),
      max: 3,
      recommendation: wordCount >= 80
        ? 'Good length. Include a specific number or data point for more credibility.'
        : 'Content feels thin. Expand to 80-120 words with a clear takeaway or insight.',
    },
    {
      name: 'Compliance',
      key: 'compliance',
      score: clamp(complianceScore),
      max: 3,
      recommendation: compliancePasses >= 4
        ? `Good (${compliancePasses}/5 checks pass). Fix remaining issues for full compliance.`
        : `Only ${compliancePasses}/5 checks pass. Fix: add @RallyOnChain, remove AI words and hashtags.`,
    },
  ]

  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0)

  return {
    wordCount,
    charCount,
    paragraphCount,
    paragraphCV: Math.round(paragraphCV * 100) / 100,
    contractions,
    questions,
    sentences: sentenceCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    compliance,
    antiAIScore,
    antiAILabel,
    dimensions,
    totalScore: Math.round(totalScore * 10) / 10,
  }
}

// --- Components ---

function ComplianceBadge({ passed }: { passed: boolean }) {
  return passed ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
  ) : (
    <X className="h-3.5 w-3.5 text-red-400 shrink-0" />
  )
}

function DimensionBar({ dim }: { dim: DimensionScore }) {
  const pct = (dim.score / dim.max) * 100
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-foreground/80 flex-1 truncate">{dim.name}</span>
        <span className={cn(
          'text-[11px] font-bold font-mono ml-2',
          dim.score >= 2.5 ? 'text-emerald-400' : dim.score >= 1.5 ? 'text-amber-400' : 'text-red-400'
        )}>
          {dim.score}/{dim.max}
        </span>
      </div>
      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            dim.score >= 2.5 ? 'bg-emerald-500' : dim.score >= 1.5 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[9px] text-muted-foreground leading-tight">{dim.recommendation}</p>
    </div>
  )
}

// --- Main Tab ---

export function RallyCoachTab() {
  const [content, setContent] = useState('')
  const [analyzed, setAnalyzed] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

  // Simulated current best score for gap analysis
  const currentBest = 15.2
  const targetScore = 18

  const handleAnalyze = () => {
    setAnalyzed(true)
    setAnalysis(analyzeContent(content))
  }

  const handleClear = () => {
    setContent('')
    setAnalyzed(false)
    setAnalysis(null)
  }

  const gapPerDimension = useMemo(() => {
    // Simulated current dimension scores based on 15.2/18 total
    return DIMENSION_NAMES.map((dim, i) => {
      const scores = [2.8, 2.5, 2.0, 2.9, 2.5, 2.5] // sum = 15.2
      return {
        ...dim,
        current: scores[i],
        gap: dim.max - scores[i],
      }
    })
  }, [])

  return (
    <div className="space-y-4">
      {/* Content Simulation Panel */}
      <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-emerald-400" />
            Content Simulation
            <Badge variant="outline" className="text-[9px] ml-auto font-mono text-emerald-400 border-emerald-500/30">
              Client-side Analysis
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <Textarea
            placeholder="Paste or type your tweet content here to run a simulated Rally scoring analysis..."
            className="min-h-[100px] text-xs bg-muted/20 border-border/50 resize-y placeholder:text-muted-foreground/50"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-7"
              onClick={handleAnalyze}
              disabled={!content.trim()}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Run Analysis
            </Button>
            {analyzed && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground h-7"
                onClick={handleClear}
              >
                Clear
              </Button>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
              {content.length} chars
            </span>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <Separator className="bg-border/50" />

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Words</p>
                  <p className="text-sm font-bold font-mono">{analysis.wordCount}</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Chars</p>
                  <p className="text-sm font-bold font-mono">{analysis.charCount}</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Para CV</p>
                  <p className={cn('text-sm font-bold font-mono', analysis.paragraphCV > 0.3 ? 'text-emerald-400' : 'text-amber-400')}>
                    {analysis.paragraphCV}
                  </p>
                </div>
                <div className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Sentences</p>
                  <p className="text-sm font-bold font-mono">{analysis.sentences}</p>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Contractions</p>
                  <p className={cn('text-sm font-bold font-mono', analysis.contractions >= 2 ? 'text-emerald-400' : 'text-amber-400')}>
                    {analysis.contractions}
                  </p>
                </div>
                <div className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Questions</p>
                  <p className={cn('text-sm font-bold font-mono', analysis.questions >= 1 ? 'text-emerald-400' : 'text-amber-400')}>
                    {analysis.questions}
                  </p>
                </div>
                <div className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase">Avg W/S</p>
                  <p className="text-sm font-bold font-mono">{analysis.avgWordsPerSentence}</p>
                </div>
              </div>

              {/* Compliance Checks */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Compliance Checks</p>
                <div className="space-y-1.5">
                  {analysis.compliance.map((check, i) => (
                    <div key={i} className={cn(
                      'flex items-center gap-2 p-2 rounded-lg',
                      check.passed ? 'bg-emerald-500/5 border border-emerald-500/15' : 'bg-red-500/5 border border-red-500/15'
                    )}>
                      <ComplianceBadge passed={check.passed} />
                      <span className="text-[10px] font-medium flex-1">{check.label}</span>
                      <span className="text-[9px] text-muted-foreground">{check.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anti-AI Score */}
              <div className="bg-muted/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Anti-AI Detection Score</span>
                  </div>
                  <span className={cn(
                    'text-xs font-bold font-mono',
                    analysis.antiAIScore >= 60 ? 'text-emerald-400' : analysis.antiAIScore >= 40 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {analysis.antiAIScore}/100
                  </span>
                </div>
                <Progress
                  value={analysis.antiAIScore}
                  className={cn(
                    'h-2',
                    analysis.antiAIScore >= 60 ? '[&>div]:bg-emerald-500' : analysis.antiAIScore >= 40 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                  )}
                />
                <p className={cn(
                  'text-[10px] mt-1 font-medium',
                  analysis.antiAIScore >= 60 ? 'text-emerald-400' : analysis.antiAIScore >= 40 ? 'text-amber-400' : 'text-red-400'
                )}>
                  {analysis.antiAILabel}
                </p>
              </div>

              {/* Predicted Dimension Scores */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Predicted Scores</p>
                  <Badge variant="outline" className={cn(
                    'text-[11px] font-mono',
                    analysis.totalScore >= 16 ? 'text-emerald-400 border-emerald-500/30' :
                    analysis.totalScore >= 13 ? 'text-amber-400 border-amber-500/30' : 'text-red-400 border-red-500/30'
                  )}>
                    Total: {analysis.totalScore}/18
                  </Badge>
                </div>
                <div className="space-y-2.5">
                  {analysis.dimensions.map(dim => (
                    <DimensionBar key={dim.key} dim={dim} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Tips */}
        <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-emerald-400" />
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-[420px]">
              <div className="space-y-4">
                {/* Top 3 Techniques */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Trophy className="h-3 w-3 text-amber-400" />
                    Top 3 Techniques for 18/18
                  </p>
                  <div className="space-y-2">
                    {TOP_3_TIPS.map((tip, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 text-emerald-400 border-emerald-500/30 font-mono">
                            #{i + 1}
                          </Badge>
                          <span className="text-[11px] font-semibold text-foreground/90">{tip.title}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed pl-7">{tip.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Red Flags */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-red-400" />
                    Red Flags to Avoid
                  </p>
                  <div className="space-y-2">
                    {RED_FLAGS.map((group, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/15">
                        <p className="text-[10px] font-semibold text-red-400/80 mb-1">{group.category}</p>
                        <div className="flex flex-wrap gap-1">
                          {group.items.map((item, j) => (
                            <Badge key={j} variant="outline" className="text-[8px] px-1.5 py-0 text-red-400/70 border-red-500/20 bg-red-500/5">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Engagement Boosters */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-amber-400" />
                    Engagement Boosters
                  </p>
                  <div className="space-y-1.5">
                    {ENGAGEMENT_BOOSTERS.map((booster, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20">
                        <span className="text-xs shrink-0 mt-0.5">{booster.icon}</span>
                        <div>
                          <span className="text-[10px] font-semibold text-foreground/80">{booster.label}</span>
                          <p className="text-[9px] text-muted-foreground">{booster.tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Score Gap Analysis */}
        <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Score Gap Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Gap Overview */}
            <div className="bg-muted/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Current Best</span>
                <span className="text-lg font-bold font-mono text-emerald-400">{currentBest}/18</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">Target</span>
                <span className="text-lg font-bold font-mono text-foreground/50">18/18</span>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(currentBest / targetScore) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px] text-muted-foreground">{(currentBest / targetScore * 100).toFixed(1)}% of target</span>
                <span className="text-[9px] font-mono text-amber-400">
                  Gap: {(targetScore - currentBest).toFixed(1)} pts
                </span>
              </div>
            </div>

            {/* Per-Dimension Gaps */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Dimension Breakdown</p>
              <ScrollArea className="max-h-[180px]">
                <div className="space-y-3">
                  {gapPerDimension.map(dim => (
                    <div key={dim.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-foreground/80">{dim.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-400">{dim.current}</span>
                          <span className="text-[9px] text-muted-foreground">→</span>
                          <span className="text-[10px] font-mono text-foreground/40">{dim.max}</span>
                          {dim.gap > 0 && (
                            <Badge variant="outline" className={cn(
                              'text-[8px] px-1 py-0 font-mono',
                              dim.gap >= 1 ? 'text-red-400 border-red-500/30' : 'text-amber-400 border-amber-500/30'
                            )}>
                              -{dim.gap.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${(dim.current / dim.max) * 100}%` }} />
                        </div>
                        <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500/40 rounded-full" style={{ width: `${(dim.gap / dim.max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Actionable Recommendations */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                Actionable Recommendations
              </p>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {gapPerDimension
                    .filter(d => d.gap > 0)
                    .sort((a, b) => b.gap - a.gap)
                    .map(dim => (
                      <div key={dim.key} className={cn(
                        'p-2.5 rounded-lg border',
                        dim.gap >= 1 ? 'border-red-500/15 bg-red-500/5' : 'border-amber-500/15 bg-amber-500/5'
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={cn(
                            'text-[8px] px-1 py-0 font-mono',
                            dim.gap >= 1 ? 'text-red-400 border-red-500/30' : 'text-amber-400 border-amber-500/30'
                          )}>
                            -{dim.gap.toFixed(1)} pts
                          </Badge>
                          <span className="text-[11px] font-semibold text-foreground/80">{dim.name}</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground leading-relaxed">
                          {getRecommendation(dim.key, dim.current)}
                        </p>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* Priority Actions */}
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
              <p className="text-[10px] text-emerald-400 font-semibold mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                Priority Actions (highest impact first)
              </p>
              <div className="space-y-1.5">
                {gapPerDimension
                  .filter(d => d.gap > 0)
                  .sort((a, b) => b.gap - a.gap)
                  .slice(0, 3)
                  .map((dim, i) => (
                    <div key={dim.key} className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[8px] px-1 py-0 text-emerald-400 border-emerald-500/30 font-mono shrink-0 mt-0.5">
                        {i + 1}
                      </Badge>
                      <span className="text-[10px] text-foreground/80">
                        <span className="font-semibold">{dim.name}</span> — {getQuickAction(dim.key)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smart Content Score Predictor */}
        <ScorePredictor />
      </div>

      {/* Content Compliance Checker */}
      <ContentCompliance />
    </div>
  )
}

// --- Helper Functions ---

function getRecommendation(key: string, current: number): string {
  const recs: Record<string, string> = {
    relevance: 'Strengthen the Rally.fun connection. Reference specific features, the $RLY token, or the mission. Make it clear this content is for the Rally community specifically.',
    clarity: 'Restructure for readability. Start with the hook, keep paragraphs 1-2 sentences. Use line breaks between thoughts. Let key points breathe.',
    originality: 'Find a unique angle nobody else has. Look at competitor gaps — topics others miss. Avoid common crypto narratives. Be specific, not generic.',
    engagement: 'Add more questions and contractions. Open with a bold statement or question. Use "you" and "your" to pull readers in. End with a call-to-action.',
    value: 'Include a specific insight, number, or framework. "3 reasons" beats "several reasons". Add a clear takeaway the reader can act on.',
    compliance: 'Double-check all rules: no em-dash, no hashtag, include @RallyOnChain, no AI words, no template phrases. This is the easiest dimension to perfect.',
  }
  return recs[key] || 'Review this dimension and improve.'
}

function getQuickAction(key: string): string {
  const actions: Record<string, string> = {
    relevance: 'Add @RallyOnChain + specific Rally feature reference',
    clarity: 'Break into 1-2 sentence paragraphs, add bold opener',
    originality: 'Remove AI words, find unique angle, be specific',
    engagement: 'Add 1-2 questions, use contractions, speak directly to reader',
    value: 'Include a specific number/insight and clear takeaway',
    compliance: 'Run compliance checklist, fix any failing checks',
  }
  return actions[key] || 'Review and improve'
}

// --- Smart Content Score Predictor ---

interface ChecklistCategory {
  name: string
  key: string
  maxScore: number
  items: {
    id: string
    label: string
    description: string
    scoreWeight: number
  }[]
}

const PREDICTOR_CATEGORIES: ChecklistCategory[] = [
  {
    name: 'Originality',
    key: 'originality',
    maxScore: 3,
    items: [
      { id: 'orig-1', label: 'No AI buzzwords', description: 'Avoid: delve, leverage, seamless, ecosystem, tapestry, realm', scoreWeight: 0.6 },
      { id: 'orig-2', label: 'No template phrases', description: 'Avoid: "In today\'s world", "Let\'s dive in", "Here\'s the thing"', scoreWeight: 0.5 },
      { id: 'orig-3', label: 'Unique angle', description: 'Find a specific entry point nobody else has used', scoreWeight: 0.6 },
      { id: 'orig-4', label: 'Personal voice', description: 'Use "I think", "My take", first person perspective', scoreWeight: 0.4 },
      { id: 'orig-5', label: 'No generic crypto narrative', description: 'Avoid: "Web3 is the future", "DeFi is revolutionizing"', scoreWeight: 0.5 },
      { id: 'orig-6', label: 'Specific & concrete', description: 'Use numbers, names, specific details instead of vague statements', scoreWeight: 0.4 },
    ],
  },
  {
    name: 'Alignment',
    key: 'alignment',
    maxScore: 3,
    items: [
      { id: 'align-1', label: '@RallyOnChain mentioned', description: 'Include @RallyOnChain in the content', scoreWeight: 0.7 },
      { id: 'align-2', label: 'References Rally features', description: 'Mention specific Rally.fun features or concepts', scoreWeight: 0.5 },
      { id: 'align-3', label: 'Addresses mission directive', description: 'Directly responds to the campaign mission statement', scoreWeight: 0.6 },
      { id: 'align-4', label: 'On-topic & focused', description: 'Content stays on the Rally topic without straying', scoreWeight: 0.4 },
      { id: 'align-5', label: 'Community-relevant', description: 'Content speaks to the Rally.fun community specifically', scoreWeight: 0.4 },
    ],
  },
  {
    name: 'Accuracy',
    key: 'accuracy',
    maxScore: 3,
    items: [
      { id: 'acc-1', label: 'Factual claims correct', description: 'No false or misleading statements about Rally or crypto', scoreWeight: 0.7 },
      { id: 'acc-2', label: 'No exaggerated claims', description: 'Avoid "best", "first", "only" without evidence', scoreWeight: 0.5 },
      { id: 'acc-3', label: 'Accurate terminology', description: 'Correct use of blockchain/crypto/Rally terms', scoreWeight: 0.5 },
      { id: 'acc-4', label: 'Credible sources', description: 'References verifiable data or features', scoreWeight: 0.4 },
    ],
  },
  {
    name: 'Compliance',
    key: 'compliance',
    maxScore: 3,
    items: [
      { id: 'comp-1', label: 'No em-dash (—)', description: 'Do not use em-dashes or en-dashes', scoreWeight: 0.5 },
      { id: 'comp-2', label: 'No hashtag (#)', description: 'Do not include any # symbols', scoreWeight: 0.5 },
      { id: 'comp-3', label: '@RallyOnChain present', description: 'Must include @RallyOnChain mention', scoreWeight: 0.7 },
      { id: 'comp-4', label: 'No AI buzzwords', description: 'Same as originality check — no AI-sounding words', scoreWeight: 0.5 },
      { id: 'comp-5', label: 'No template phrases', description: 'Same as originality check — no template openers/closers', scoreWeight: 0.4 },
      { id: 'comp-6', label: 'Appropriate length', description: 'Content is 50-150 words, not too short or too long', scoreWeight: 0.3 },
    ],
  },
  {
    name: 'Engagement Potential',
    key: 'engagement',
    maxScore: 3,
    items: [
      { id: 'eng-1', label: 'Contains questions', description: '1-2 rhetorical or direct questions to engage the reader', scoreWeight: 0.5 },
      { id: 'eng-2', label: 'Uses contractions', description: '"Don\'t", "Can\'t", "It\'s" — natural human language', scoreWeight: 0.4 },
      { id: 'eng-3', label: 'Strong hook opening', description: 'First line grabs attention: question, bold claim, or contrarian statement', scoreWeight: 0.6 },
      { id: 'eng-4', label: 'Varied paragraph lengths', description: 'Mix 1-line and 2-3 line paragraphs for visual rhythm', scoreWeight: 0.4 },
      { id: 'eng-5', label: 'Call-to-action ending', description: 'Ends with a clear CTA or thought-provoking statement', scoreWeight: 0.4 },
      { id: 'eng-6', label: 'Uses "you"/"your"', description: 'Direct address to pull the reader in', scoreWeight: 0.3 },
    ],
  },
  {
    name: 'Technical Quality',
    key: 'technical',
    maxScore: 3,
    items: [
      { id: 'tech-1', label: 'Good word count (50-150)', description: 'Not too thin, not too long', scoreWeight: 0.4 },
      { id: 'tech-2', label: 'Proper sentence variety', description: 'Mix short and long sentences', scoreWeight: 0.3 },
      { id: 'tech-3', label: 'Clean formatting', description: 'Proper line breaks, no awkward formatting', scoreWeight: 0.4 },
      { id: 'tech-4', label: 'No spelling/grammar issues', description: 'Proofread for typos and grammar errors', scoreWeight: 0.4 },
      { id: 'tech-5', label: 'Reads naturally', description: 'Content flows smoothly when read aloud', scoreWeight: 0.4 },
    ],
  },
]

function ScorePredictor() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const resetAll = () => {
    setCheckedItems(new Set())
  }

  // Calculate scores per category
  const categoryScores = useMemo(() => {
    return PREDICTOR_CATEGORIES.map(cat => {
      const totalWeight = cat.items.reduce((s, item) => s + item.scoreWeight, 0)
      const earnedWeight = cat.items
        .filter(item => checkedItems.has(item.id))
        .reduce((s, item) => s + item.scoreWeight, 0)
      const rawScore = totalWeight > 0 ? (earnedWeight / totalWeight) * cat.maxScore : 0
      return {
        ...cat,
        rawScore: Math.round(rawScore * 10) / 10,
        checked: cat.items.filter(item => checkedItems.has(item.id)).length,
        total: cat.items.length,
      }
    })
  }, [checkedItems])

  const totalPredictedScore = categoryScores.reduce((s, c) => s + c.rawScore, 0)
  const totalMax = categoryScores.reduce((s, c) => s + c.maxScore, 0)
  const totalPct = (totalPredictedScore / totalMax) * 100

  const getScoreLabel = (score: number, max: number) => {
    const pct = score / max
    if (pct >= 0.85) return { text: 'Excellent', color: 'text-emerald-400' }
    if (pct >= 0.65) return { text: 'Good', color: 'text-emerald-400' }
    if (pct >= 0.45) return { text: 'Fair', color: 'text-amber-400' }
    return { text: 'Needs Work', color: 'text-red-400' }
  }

  const totalChecked = checkedItems.size
  const totalCheckable = PREDICTOR_CATEGORIES.reduce((s, c) => s + c.items.length, 0)

  return (
    <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-400" />
            Smart Score Predictor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] font-mono text-emerald-400 border-emerald-500/30">
              Client-side
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={resetAll}
              title="Reset all checks"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Check quality items to predict your Rally score range
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Predicted Score Display */}
        <motion.div
          className="bg-gradient-to-r from-emerald-500/10 to-amber-500/10 rounded-lg p-3"
          key={totalPredictedScore}
          animate={{ scale: [1, 1.01, 1] }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Predicted Score</p>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  'text-2xl font-bold font-mono',
                  totalPredictedScore >= 16 ? 'text-emerald-400' :
                  totalPredictedScore >= 12 ? 'text-amber-400' : 'text-red-400'
                )}>
                  {totalPredictedScore.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground font-mono">/{totalMax}</span>
              </div>
            </div>
            <div className="text-right">
              <Badge
                className={cn(
                  'text-[10px] px-2 py-0.5 border',
                  totalPredictedScore >= 16 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                  totalPredictedScore >= 12 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                  'bg-red-500/15 text-red-400 border-red-500/30'
                )}
              >
                {getScoreLabel(totalPredictedScore, totalMax).text}
              </Badge>
              <p className="text-[9px] text-muted-foreground mt-1 font-mono">
                {totalChecked}/{totalCheckable} checks
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                totalPredictedScore >= 16 ? 'bg-emerald-500' :
                totalPredictedScore >= 12 ? 'bg-amber-500' : 'bg-red-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${totalPct}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            />
          </div>
        </motion.div>

        {/* Category breakdown bars */}
        <div className="space-y-1.5">
          {categoryScores.map(cat => {
            const pct = (cat.rawScore / cat.maxScore) * 100
            return (
              <div key={cat.key} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-1.5 text-[10px] text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => setExpandedCategory(expandedCategory === cat.key ? null : cat.key)}
                  >
                    <span className={cn(
                      'h-2 w-2 rounded-full',
                      pct >= 85 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                    )} />
                    {cat.name}
                    <span className="text-[9px] text-muted-foreground">({cat.checked}/{cat.total})</span>
                  </button>
                  <span className={cn(
                    'text-[10px] font-mono font-bold',
                    cat.rawScore >= cat.maxScore * 0.85 ? 'text-emerald-400' :
                    cat.rawScore >= cat.maxScore * 0.5 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {cat.rawScore}/{cat.maxScore}
                  </span>
                </div>
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      pct >= 85 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 15 }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Expanded checklist */}
        <AnimatePresence>
          {expandedCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <ScrollArea className="max-h-[250px]">
                <div className="space-y-2 pt-1">
                  {PREDICTOR_CATEGORIES.filter(c => c.key === expandedCategory).map(cat => (
                    <div key={cat.key}>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
                        {cat.name} Checklist
                      </p>
                      {cat.items.map(item => {
                        const isChecked = checkedItems.has(item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className={cn(
                              'w-full flex items-start gap-2 p-2 rounded-lg border text-left transition-all duration-200 cursor-pointer mb-1',
                              isChecked
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-muted/10 border-border/30 hover:border-border/50'
                            )}
                          >
                            <div className={cn(
                              'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-muted-foreground/40'
                            )}>
                              {isChecked && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={cn(
                                'text-[10px] font-medium block',
                                isChecked ? 'text-foreground' : 'text-foreground/70'
                              )}>
                                {item.label}
                              </span>
                              <span className="text-[9px] text-muted-foreground block">
                                {item.description}
                              </span>
                            </div>
                            <span className="text-[8px] font-mono text-muted-foreground shrink-0 mt-0.5">
                              +{item.scoreWeight.toFixed(1)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {!expandedCategory && (
          <p className="text-[9px] text-muted-foreground text-center">
            Click a dimension to expand its checklist
          </p>
        )}

        {/* Quick summary */}
        {totalChecked > 0 && (
          <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <p className="text-[9px] text-emerald-400 font-medium">
              💡 Tip: Focus on the dimensions with the lowest score bars. Each checked item directly increases your predicted score.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
