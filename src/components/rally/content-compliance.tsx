'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
  AlertTriangle,
  Gauge,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Types ──

interface ComplianceCheck {
  id: string
  label: string
  passed: boolean
  detail: string
  icon: typeof CheckCircle2
}

// ── Constants ──

const AI_BUZZWORDS = [
  'delve', 'leverage', 'elevate', 'streamline', 'cutting-edge',
  'revolutionary', 'innovative', 'transformative', 'game-changer',
  'unlock', 'seamless', 'ecosystem', 'synergy', 'robust',
  'empower', 'foster', 'comprehensive', 'meticulous',
  'tapestry', 'landscape', 'unleash', 'navigate', 'embark',
  'thriving', 'captivating', 'realm', 'pioneer', 'trailblazing',
]

const TEMPLATE_PHRASES = [
  "In today's world",
  "It's important to note",
  'At the end of the day',
  "Let's dive in",
  "Here's the thing",
  'It goes without saying',
  'Needless to say',
  "It's worth noting",
  'The bottom line is',
  'Let that sink in',
]

const MAX_TWEET_CHARS = 280

// ── Analysis Function ──

function runChecks(text: string, allowHashtags: boolean): ComplianceCheck[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const checks: ComplianceCheck[] = []

  // 1. No em-dashes
  const hasEmDash = /—/.test(trimmed)
  checks.push({
    id: 'em-dash',
    label: 'No em-dashes',
    passed: !hasEmDash,
    detail: hasEmDash ? 'Found em-dash (—). Replace with a comma or period.' : 'No em-dashes detected.',
    icon: CheckCircle2,
  })

  // 2. Mentions @RallyOnChain
  const hasRallyMention = /@RallyOnChain/i.test(trimmed)
  checks.push({
    id: 'rally-mention',
    label: 'Mentions @RallyOnChain',
    passed: hasRallyMention,
    detail: hasRallyMention ? '@RallyOnChain mention found.' : 'Missing @RallyOnChain mention. Add it for compliance.',
    icon: CheckCircle2,
  })

  // 3. Doesn't start with @ or #
   const firstChar = trimmed.charAt(0)
  const startsWithSymbol = firstChar === '@' || firstChar === '#'
  checks.push({
    id: 'start-char',
    label: "Doesn't start with @ or #",
    passed: !startsWithSymbol,
    detail: startsWithSymbol
      ? `Content starts with "${firstChar}". Open with a word or question instead.`
      : 'Content starts with a valid character.',
    icon: CheckCircle2,
  })

  // 4. No hashtags (configurable)
  const hasHashtag = /#\w+/.test(trimmed)
  if (allowHashtags) {
    checks.push({
      id: 'hashtag',
      label: 'No hashtags (allowed)',
      passed: true,
      detail: 'Hashtags are allowed for this campaign.',
      icon: CheckCircle2,
    })
  } else {
    checks.push({
      id: 'hashtag',
      label: 'No hashtags',
      passed: !hasHashtag,
      detail: hasHashtag
        ? 'Found hashtag (#). Remove for maximum compliance score.'
        : 'No hashtags detected.',
      icon: CheckCircle2,
    })
  }

  // 5. Word count in recommended range (50-200 words)
  const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length
  const wordCountInRange = wordCount >= 50 && wordCount <= 200
  checks.push({
    id: 'word-count',
    label: 'Word count (50-200)',
    passed: wordCountInRange,
    detail: wordCountInRange
      ? `${wordCount} words — within recommended range.`
      : `${wordCount} words — ${wordCount < 50 ? 'too short (min 50)' : 'too long (max 200)'}.`,
    icon: CheckCircle2,
  })

  // 6. No AI buzzwords
  const foundBuzzwords = AI_BUZZWORDS.filter(w =>
    new RegExp(`\\b${w}\\b`, 'i').test(trimmed)
  )
  checks.push({
    id: 'ai-buzzwords',
    label: 'No AI buzzwords',
    passed: foundBuzzwords.length === 0,
    detail: foundBuzzwords.length === 0
      ? 'No AI buzzwords detected.'
      : `Found: ${foundBuzzwords.join(', ')}. Replace with natural alternatives.`,
    icon: CheckCircle2,
  })

  // 7. No template phrases
  const foundTemplates = TEMPLATE_PHRASES.filter(p =>
    trimmed.toLowerCase().includes(p.toLowerCase())
  )
  checks.push({
    id: 'template-phrases',
    label: 'No template phrases',
    passed: foundTemplates.length === 0,
    detail: foundTemplates.length === 0
      ? 'No template phrases detected.'
      : `Found: "${foundTemplates[0]}"${foundTemplates.length > 1 ? ` +${foundTemplates.length - 1} more` : ''}. Rewrite for originality.`,
    icon: CheckCircle2,
  })

  return checks
}

function estimateScoreRange(passedCount: number): { min: number; max: number; label: string } {
  if (passedCount >= 7) return { min: 16, max: 18, label: 'Elite Range' }
  if (passedCount >= 6) return { min: 14, max: 17, label: 'Strong Range' }
  if (passedCount >= 5) return { min: 12, max: 16, label: 'Moderate Range' }
  if (passedCount >= 4) return { min: 10, max: 14, label: 'Developing Range' }
  return { min: 6, max: 11, label: 'Needs Work' }
}

// ── Main Component ──

export function ContentCompliance() {
  const [content, setContent] = useState('')
  const [allowHashtags, setAllowHashtags] = useState(false)
  const [copied, setCopied] = useState(false)

  const wordCount = useMemo(() => {
    if (!content.trim()) return 0
    return content.trim().split(/\s+/).filter(w => w.length > 0).length
  }, [content])

  const checks = useMemo(
    () => runChecks(content, allowHashtags),
    [content, allowHashtags]
  )

  const passedCount = checks.filter(c => c.passed).length
  const totalChecks = 7
  const scoreEstimate = estimateScoreRange(passedCount)

  const handleCopy = async () => {
    if (!content.trim()) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleClear = () => {
    setContent('')
  }

  return (
    <Card className="bg-card/50 backdrop-blur border border-border/50 rounded-xl">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Content Compliance Checker
          <Badge variant="outline" className="text-[9px] ml-auto font-mono text-emerald-400 border-emerald-500/30">
            {passedCount}/{totalChecks} checks
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Textarea */}
        <div className="space-y-2">
          <Textarea
            placeholder="Paste or type your tweet content here to check Rally compliance rules..."
            className="min-h-[100px] text-xs bg-muted/20 border-border/50 resize-y placeholder:text-muted-foreground/50"
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={MAX_TWEET_CHARS * 4}
          />
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground font-mono">
              {wordCount} words · {content.length} chars
            </span>
            {content.length > MAX_TWEET_CHARS && (
              <Badge className="text-[9px] bg-red-500/15 text-red-400 border-0 gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Over {MAX_TWEET_CHARS} char tweet limit
              </Badge>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
                disabled={!content.trim()}
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </Button>
              <Button
                size="sm"
                className="h-7 text-[10px] gap-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                onClick={handleCopy}
                disabled={!content.trim() || copied}
              >
                {copied ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>

        {/* Hashtag Toggle */}
        <div className="flex items-center justify-between rounded-lg bg-muted/20 border border-border/30 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <Label htmlFor="allow-hashtags" className="text-[11px] font-medium cursor-default">
              Allow hashtags (campaign override)
            </Label>
          </div>
          <Switch
            id="allow-hashtags"
            checked={allowHashtags}
            onCheckedChange={setAllowHashtags}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>

        {/* Results */}
        {content.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <Separator className="bg-border/50" />

            {/* Overall Score */}
            <div className="bg-muted/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Gauge className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Overall Compliance
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs font-bold font-mono',
                    passedCount === totalChecks
                      ? 'text-emerald-400'
                      : passedCount >= 5
                        ? 'text-amber-400'
                        : 'text-red-400'
                  )}>
                    {passedCount}/{totalChecks}
                  </span>
                </div>
              </div>
              <Progress
                value={(passedCount / totalChecks) * 100}
                className={cn(
                  'h-2',
                  passedCount === totalChecks
                    ? '[&>div]:bg-emerald-500'
                    : passedCount >= 5
                      ? '[&>div]:bg-amber-500'
                      : '[&>div]:bg-red-500'
                )}
              />
              <div className="flex items-center justify-between mt-2">
                <span className={cn(
                  'text-[10px] font-medium',
                  passedCount === totalChecks
                    ? 'text-emerald-400'
                    : passedCount >= 5
                      ? 'text-amber-400'
                      : 'text-red-400'
                )}>
                  {scoreEstimate.label}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Est. Rally score: {scoreEstimate.min}-{scoreEstimate.max}/18
                </span>
              </div>
            </div>

            {/* Individual Checks */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Check Details
              </p>
              <AnimatePresence>
                {checks.map((check, i) => (
                  <motion.div
                    key={check.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    className={cn(
                      'flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors',
                      check.passed
                        ? 'bg-emerald-500/5 border-emerald-500/15'
                        : 'bg-red-500/5 border-red-500/15'
                    )}
                  >
                    {check.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium">{check.label}</span>
                      </div>
                      <p className={cn(
                        'text-[9px] mt-0.5',
                        check.passed ? 'text-muted-foreground' : 'text-red-400/80'
                      )}>
                        {check.detail}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!content.trim() && (
          <div className="text-center py-6">
            <ShieldCheck className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground font-medium">No content to check</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Paste your tweet content above to run 7 compliance checks
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
