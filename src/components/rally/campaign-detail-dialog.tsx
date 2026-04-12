'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ExternalLink,
  Copy,
  Check,
  Clock,
  Users,
  Target,
  Zap,
  BookOpen,
  Crosshair,
  CalendarClock,
  Globe,
  FileText,
  Database,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Trophy,
  Sparkles,
  Hash,
  Send,
  Shield,
  Loader2,
  History,
  Type,
  AlignLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/* ── Types ── */

interface VaultData {
  mission?: string
  rallyActualScore?: number | null
  rallyActualBreakdown?: Record<string, number> | null
  achieved18_18?: boolean | null
  cyclesNeeded?: number | null
  feedbackIterations?: number | null
  winningAngle?: string | null
  winningVariation?: string | null
  winningHook?: string | null
  keyWinningElements?: string[] | null
  failingDimensionsHistory?: Record<string, string> | null
  techniquesThatWorked?: string[] | null
  techniquesThatFailed?: string[] | null
  techniquesValidatedByRally?: { working?: string[]; needsImprovement?: string[] } | null
  overusedHooksFound?: string[] | null
  scoreDistributionObserved?: { submissionsAnalyzed?: number; avgScore?: number; hardestDimensions?: string[] } | null
  calibration?: { internalScore?: number | null; rallyScore?: number | null; gap?: number | null } | null
  qnaGenerated?: boolean | null
  qnaCount?: number | null
}

interface Mission {
  id: number
  title: string
  directive: string
  reward: string
  status: string
  buildCount: number
  contentCount?: number
}

export interface Campaign {
  id: string
  title: string
  contractAddress: string
  creator: string
  xUsername: string
  rewardPool: string
  startDate: string
  endDate: string
  status: string
  totalMissions: number
  bestScore: number | null
  missions: Mission[]
  isActive: boolean
  dataCompleteness: number
  campaignUrl: string
  vaultData?: VaultData
  description?: string
  source?: string
  dbId?: string
  headerImageUrl?: string
  rewardToken?: string
  minimumFollowers?: number
  knowledgeBase?: string
  rules?: string[]
  proposedAngles?: string[]
  missionsJson?: string | null
  proposedAnglesJson?: string | null
  rulesJson?: string | null
  style?: string | null
  goal?: string | null
}

interface DataField {
  key: string
  label: string
  available: boolean
}

interface SubmissionItem {
  id: string
  text: string
  wordCount: number
  charCount: number
  scores: { total: number } | null
  passed: boolean
}

interface ComplianceCheck {
  id: string
  label: string
  passed: boolean
  detail: string
}

/* ── Helpers ── */

function getDataAvailability(campaign: Campaign): DataField[] {
  const fields: DataField[] = []
  const v = campaign.vaultData

  fields.push({ key: 'title', label: 'Title', available: !!campaign.title })
  fields.push({ key: 'creator', label: 'Creator', available: !!campaign.creator })
  fields.push({ key: 'reward', label: 'Reward Pool', available: !!campaign.rewardPool && campaign.rewardPool !== 'N/A' })
  fields.push({ key: 'dates', label: 'Start/End Date', available: !!campaign.startDate || !!campaign.endDate })
  fields.push({ key: 'missions', label: 'Missions', available: campaign.missions.length > 0 })
  fields.push({ key: 'bestScore', label: 'Best Score', available: campaign.bestScore !== null })

  if (v) {
    fields.push({ key: 'rallyScore', label: 'Rally Actual Score', available: v.rallyActualScore != null })
    fields.push({ key: 'winningAngle', label: 'Winning Angle', available: !!v.winningAngle })
    fields.push({ key: 'winningHook', label: 'Winning Hook', available: !!v.winningHook })
    fields.push({ key: 'calibration', label: 'Calibration', available: !!v.calibration })
    fields.push({ key: 'techniques', label: 'Techniques', available: (v.techniquesThatWorked?.length ?? 0) > 0 })
    fields.push({ key: 'breakdown', label: 'Score Breakdown', available: !!v.rallyActualBreakdown && Object.keys(v.rallyActualBreakdown).length > 0 })
  } else {
    fields.push({ key: 'rallyScore', label: 'Rally Actual Score', available: false })
    fields.push({ key: 'winningAngle', label: 'Winning Angle', available: false })
    fields.push({ key: 'winningHook', label: 'Winning Hook', available: false })
    fields.push({ key: 'calibration', label: 'Calibration', available: false })
    fields.push({ key: 'techniques', label: 'Techniques', available: false })
    fields.push({ key: 'breakdown', label: 'Score Breakdown', available: false })
  }

  return fields
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function getSourceBadge(source?: string) {
  switch (source) {
    case 'file':
      return (
        <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/20 text-[10px] px-1.5 py-0">
          <FileText className="h-2.5 w-2.5 mr-0.5" />
          FILE
        </Badge>
      )
    case 'rally_live':
      return (
        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[10px] px-1.5 py-0">
          <Globe className="h-2.5 w-2.5 mr-0.5" />
          LIVE
        </Badge>
      )
    case 'db':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
          <Database className="h-2.5 w-2.5 mr-0.5" />
          DB
        </Badge>
      )
    default:
      return null
  }
}

function countWords(text: string): number {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

function runComplianceChecks(text: string): ComplianceCheck[] {
  if (!text.trim()) return []

  const wordCount = countWords(text)
  const charCount = text.length

  return [
    {
      id: 'no_em_dash',
      label: 'No Em-dashes',
      passed: !text.includes('—'),
      detail: text.includes('—') ? 'Contains em-dash (—). Remove it.' : 'No em-dashes found ✓',
    },
    {
      id: 'rally_mention',
      label: '@RallyOnChain Mention',
      passed: text.includes('@RallyOnChain'),
      detail: text.includes('@RallyOnChain') ? '@RallyOnChain found ✓' : 'Missing @RallyOnChain mention',
    },
    {
      id: 'no_start_mention',
      label: 'No Leading Mention/Hashtag',
      passed: !/^[#@]/.test(text.trim()),
      detail: /^[#@]/.test(text.trim()) ? 'Content starts with @ or # — move to body' : 'Content starts naturally ✓',
    },
    {
      id: 'word_count',
      label: 'Word Count (50–280)',
      passed: wordCount >= 50 && wordCount <= 280,
      detail: `${wordCount} words. ${wordCount < 50 ? 'Too short (min 50)' : wordCount > 280 ? 'Too long (max 280)' : 'In range ✓'}`,
    },
  ]
}

/* ── Countdown Timer Hook ── */

function useCountdown(endDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, elapsed: 0 })

  useEffect(() => {
    if (!endDate) return

    const update = () => {
      const now = Date.now()
      const end = new Date(endDate).getTime()
      const start = end - 30 * 24 * 60 * 60 * 1000
      const totalMs = Math.max(0, end - now)
      const elapsed = totalMs <= 0 ? 100 : Math.round(((now - start) / (end - start)) * 100)

      setTimeLeft({
        days: Math.floor(totalMs / (1000 * 60 * 60 * 24)),
        hours: Math.floor((totalMs / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((totalMs / (1000 * 60)) % 60),
        seconds: Math.floor((totalMs / 1000) % 60),
        totalMs,
        elapsed: Math.min(100, Math.max(0, elapsed)),
      })
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endDate])

  return timeLeft
}

/* ── Copy Button ── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0"
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

/* ── Main Component ── */

interface CampaignDetailDialogProps {
  campaign: Campaign | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (campaign: Campaign) => void
}

export function CampaignDetailDialog({
  campaign,
  open,
  onOpenChange,
  onEdit,
}: CampaignDetailDialogProps) {
  const [kbExpanded, setKbExpanded] = useState(false)
  const [submitExpanded, setSubmitExpanded] = useState(false)
  const [submissionText, setSubmissionText] = useState('')
  const [complianceResults, setComplianceResults] = useState<ComplianceCheck[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [copiedText, setCopiedText] = useState(false)

  const countdown = useCountdown(campaign?.endDate || '')
  const dataFields = useMemo(() => (campaign ? getDataAvailability(campaign) : []), [campaign])

  const availableCount = dataFields.filter(f => f.available).length
  const totalFields = dataFields.length

  const wordCount = useMemo(() => countWords(submissionText), [submissionText])
  const charCount = submissionText.length

  // Fetch submission history from content API
  const fetchSubmissions = useCallback(async () => {
    if (!campaign) return
    setLoadingSubmissions(true)
    try {
      const res = await fetch('/api/rally/content')
      if (res.ok) {
        const data = await res.json()
        const vars: SubmissionItem[] = (data.variations || []).slice(0, 5).map((v: any) => ({
          id: v.id,
          text: v.text || '',
          wordCount: v.word_count || 0,
          charCount: v.char_count || 0,
          scores: v.scores || null,
          passed: v.passed || false,
        }))
        // Also add best content if available
        if (data.best_content) {
          vars.unshift({
            id: 'best',
            text: data.best_content,
            wordCount: countWords(data.best_content),
            charCount: data.best_content.length,
            scores: data.best_content_meta?.scores || { total: data.best_score || 0 },
            passed: true,
          })
        }
        setSubmissions(vars)
      }
    } catch {
      // ignore
    } finally {
      setLoadingSubmissions(false)
    }
  }, [campaign])

  useEffect(() => {
    if (open && campaign) {
      fetchSubmissions()
    }
  }, [open, campaign, fetchSubmissions])

  // Handle compliance check
  const handleComplianceCheck = useCallback(() => {
    if (!submissionText.trim()) {
      toast.warning('Enter text first before checking compliance')
      return
    }
    setIsChecking(true)
    // Simulate slight processing delay for UX
    setTimeout(() => {
      const results = runComplianceChecks(submissionText)
      setComplianceResults(results)
      setIsChecking(false)
      const passCount = results.filter(r => r.passed).length
      toast.info(`Compliance: ${passCount}/${results.length} checks passed`, {
        description: passCount === results.length ? 'All checks passed! Ready to submit.' : 'Some checks failed. Review below.',
      })
    }, 400)
  }, [submissionText])

  // Handle copy to clipboard
  const handleCopyText = useCallback(async () => {
    if (!submissionText.trim()) return
    try {
      await navigator.clipboard.writeText(submissionText)
      setCopiedText(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [submissionText])

  // Reset submission state when dialog closes
  useEffect(() => {
    if (!open) {
      setSubmitExpanded(false)
      setSubmissionText('')
      setComplianceResults([])
      setSubmissions([])
    }
  }, [open])

  if (!campaign) return null

  const rulesCount = campaign.rules?.length ?? 0
  const anglesCount = campaign.proposedAngles?.length ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden"
        showCloseButton={true}
      >
        {/* Glassmorphism Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent backdrop-blur-xl" />
          <DialogHeader className="relative p-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <DialogTitle className="text-lg font-semibold truncate max-w-[280px] sm:max-w-none">
                    {campaign.title}
                  </DialogTitle>
                  <Badge className={
                    campaign.isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]'
                      : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-[10px]'
                  }>
                    {campaign.isActive ? 'Active' : 'Ended'}
                  </Badge>
                  {getSourceBadge(campaign.source)}
                </div>
                <DialogDescription className="text-xs">
                  {campaign.creator}
                  {campaign.xUsername && <span className="ml-1.5 text-muted-foreground">@{campaign.xUsername}</span>}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Separator className="opacity-50" />

        {/* Scrollable Content */}
        <ScrollArea className="h-[50vh] sm:h-[55vh]">
          <div className="p-5 space-y-5">

            {/* ── Overview Grid ── */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-3 w-3 text-emerald-400" />
                Overview
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                    <Users className="h-2.5 w-2.5" />
                    Creator
                  </p>
                  <p className="text-xs font-medium">{campaign.creator || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                    <Globe className="h-2.5 w-2.5" />
                    X Username
                  </p>
                  <p className="text-xs font-medium">
                    {campaign.xUsername ? `@${campaign.xUsername}` : 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                    <Hash className="h-2.5 w-2.5" />
                    Contract Address
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-mono truncate">{truncateAddress(campaign.contractAddress)}</p>
                    {campaign.contractAddress && <CopyButton text={campaign.contractAddress} />}
                  </div>
                  <p className="text-[9px] text-muted-foreground font-mono mt-0.5 truncate">{campaign.contractAddress}</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                    <ExternalLink className="h-2.5 w-2.5" />
                    Campaign URL
                  </p>
                  {campaign.campaignUrl ? (
                    <a
                      href={campaign.campaignUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline truncate block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open on Rally.fun
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">N/A</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                    <Zap className="h-2.5 w-2.5" />
                    Reward Pool
                  </p>
                  <p className="text-xs font-medium text-amber-400">{campaign.rewardPool || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                    <Trophy className="h-2.5 w-2.5" />
                    Token Symbol
                  </p>
                  <p className="text-xs font-medium">
                    {campaign.rewardToken ? campaign.rewardToken.toUpperCase() : 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                    <Users className="h-2.5 w-2.5" />
                    Min Followers
                  </p>
                  <p className="text-xs font-medium">
                    {campaign.minimumFollowers ? campaign.minimumFollowers.toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                    <CalendarClock className="h-2.5 w-2.5" />
                    Start Date
                  </p>
                  <p className="text-xs font-medium">{formatDate(campaign.startDate)}</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
                  <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    End Date
                  </p>
                  <p className="text-xs font-medium">{formatDate(campaign.endDate)}</p>
                </div>
              </div>
            </div>

            {/* ── Campaign Progress ── */}
            {campaign.isActive && campaign.endDate && (
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-emerald-400" />
                  Campaign Progress
                </p>
                <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium">Time Remaining</p>
                    <div className="flex items-center gap-1.5 font-mono text-sm">
                      {countdown.totalMs > 0 ? (
                        <>
                          {countdown.days > 0 && (
                            <span className="text-emerald-400">
                              {countdown.days}d {String(countdown.hours).padStart(2, '0')}h
                            </span>
                          )}
                          {countdown.days === 0 && countdown.hours > 0 && (
                            <span className="text-emerald-400">
                              {countdown.hours}h {String(countdown.minutes).padStart(2, '0')}m
                            </span>
                          )}
                          {countdown.days === 0 && countdown.hours === 0 && (
                            <span className="text-amber-400">
                              {String(countdown.minutes).padStart(2, '0')}m {String(countdown.seconds).padStart(2, '0')}s
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-400">Ended</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Elapsed</span>
                      <span className={`font-medium ${countdown.elapsed >= 80 ? 'text-red-400' : countdown.elapsed >= 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {Math.min(100, countdown.elapsed)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          countdown.elapsed >= 80 ? 'bg-red-500' : countdown.elapsed >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, countdown.elapsed)}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Mission Details ── */}
            {campaign.missions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="h-3 w-3 text-emerald-400" />
                  Missions ({campaign.missions.length})
                </p>
                <div className="space-y-2">
                  {campaign.missions.map((mission) => (
                    <motion.div
                      key={mission.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * mission.id }}
                      className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold">#{mission.id}</span>
                        <span className="text-xs font-medium truncate">{mission.title}</span>
                        <Badge className="bg-muted/50 text-muted-foreground text-[9px] px-1.5 py-0 ml-auto shrink-0">
                          {mission.status}
                        </Badge>
                      </div>
                      {mission.directive && (
                        <p className="text-[11px] text-foreground/70 line-clamp-3 mb-1.5">{mission.directive}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        {mission.reward && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Zap className="h-2.5 w-2.5" />
                            {mission.reward}
                          </span>
                        )}
                        {mission.buildCount > 0 && (
                          <span className="flex items-center gap-1">
                            {mission.buildCount} builds
                          </span>
                        )}
                        {rulesCount > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-2.5 w-2.5" />
                            {rulesCount} rules
                          </span>
                        )}
                        {anglesCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            {anglesCount} angles
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Submission History ── */}
            <div className="space-y-2">
              <button
                onClick={() => fetchSubmissions()}
                className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors w-full"
              >
                <History className="h-3 w-3 text-emerald-400" />
                Submission History
                {!loadingSubmissions && submissions.length > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 text-[9px] px-1.5 py-0 border-0">
                    {submissions.length}
                  </Badge>
                )}
              </button>

              {loadingSubmissions ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : submissions.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {submissions.map((sub, idx) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn(
                          'text-[9px] px-1.5 py-0 border-0',
                          sub.id === 'best' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted/50 text-muted-foreground'
                        )}>
                          {sub.id === 'best' ? '🏆 Best' : `#${idx}`}
                        </Badge>
                        {sub.scores && (
                          <Badge className={cn(
                            'text-[9px] px-1.5 py-0 border-0',
                            sub.scores.total >= 16 ? 'bg-emerald-500/15 text-emerald-400' :
                            sub.scores.total >= 13 ? 'bg-amber-500/15 text-amber-400' :
                            'bg-red-500/15 text-red-400'
                          )}>
                            {sub.scores.total.toFixed(1)}/18
                          </Badge>
                        )}
                        <div className="ml-auto flex items-center gap-2 text-[9px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Type className="h-2 w-2" />{sub.wordCount}w</span>
                          <span className="flex items-center gap-0.5"><AlignLeft className="h-2 w-2" />{sub.charCount}c</span>
                        </div>
                        <CopyButton text={sub.text} />
                      </div>
                      <p className="text-[10px] text-foreground/70 line-clamp-2">{sub.text}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/40 bg-muted/5 p-4 text-center">
                  <p className="text-[10px] text-muted-foreground">No submissions found for this campaign</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">Run the pipeline to generate content</p>
                </div>
              )}
            </div>

            {/* ── Quick Submit ── */}
            <div className="space-y-2">
              <button
                onClick={() => setSubmitExpanded(!submitExpanded)}
                className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors w-full"
              >
                <Send className="h-3 w-3 text-emerald-400" />
                Quick Submit
                {submitExpanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
              </button>
              <AnimatePresence>
                {submitExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                      <Textarea
                        placeholder="Compose your tweet content here..."
                        value={submissionText}
                        onChange={(e) => {
                          setSubmissionText(e.target.value)
                          if (complianceResults.length > 0) {
                            setComplianceResults(runComplianceChecks(e.target.value))
                          }
                        }}
                        className="min-h-[100px] text-xs bg-background/50 border-border/50 resize-none placeholder:text-muted-foreground/50"
                        maxLength={1000}
                      />

                      {/* Word & Character Count */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className={cn('font-mono', wordCount < 50 && submissionText.length > 0 ? 'text-amber-400' : 'text-muted-foreground')}>
                            {wordCount} words
                          </span>
                          <span className="font-mono text-muted-foreground">·</span>
                          <span className={cn('font-mono', charCount > 280 ? 'text-red-400' : 'text-muted-foreground')}>
                            {charCount}/280
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Copy button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                            onClick={handleCopyText}
                            disabled={!submissionText.trim()}
                          >
                            {copiedText ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            {copiedText ? 'Copied' : 'Copy'}
                          </Button>
                          {/* Check Compliance button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            onClick={handleComplianceCheck}
                            disabled={!submissionText.trim() || isChecking}
                          >
                            {isChecking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                            Check Compliance
                          </Button>
                        </div>
                      </div>

                      {/* Character count bar */}
                      {charCount > 0 && (
                        <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-200',
                              charCount <= 280 ? 'bg-emerald-500' :
                              charCount <= 300 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                            style={{ width: `${Math.min((charCount / 280) * 100, 100)}%` }}
                          />
                        </div>
                      )}

                      {/* Compliance Results */}
                      <AnimatePresence>
                        {complianceResults.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="space-y-1.5"
                          >
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Compliance Results</p>
                            <div className="space-y-1">
                              {complianceResults.map((check) => (
                                <div
                                  key={check.id}
                                  className={cn(
                                    'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[10px]',
                                    check.passed ? 'bg-emerald-500/10' : 'bg-red-500/10'
                                  )}
                                >
                                  {check.passed ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                                  )}
                                  <span className={cn('font-medium', check.passed ? 'text-emerald-400' : 'text-red-400')}>
                                    {check.label}
                                  </span>
                                  <span className="text-muted-foreground ml-auto truncate max-w-[200px]">
                                    {check.detail}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!submitExpanded && (
                <p className="text-[10px] text-muted-foreground line-clamp-2 rounded-lg border border-border/30 bg-card/50 p-3">
                  Compose and validate your tweet content before submitting to Rally.fun
                </p>
              )}
            </div>

            {/* ── Knowledge Base ── */}
            {campaign.knowledgeBase && campaign.knowledgeBase.trim().length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setKbExpanded(!kbExpanded)}
                  className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors w-full"
                >
                  <BookOpen className="h-3 w-3 text-blue-400" />
                  Knowledge Base
                  {kbExpanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                </button>
                <AnimatePresence>
                  {kbExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                        <p className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
                          {campaign.knowledgeBase}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!kbExpanded && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2 rounded-lg border border-border/30 bg-card/50 p-3">
                    {campaign.knowledgeBase}
                  </p>
                )}
              </div>
            )}

            {/* ── Data Completeness ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="h-3 w-3 text-emerald-400" />
                  Data Completeness
                </p>
                <span className={`text-[11px] font-bold ${
                  (availableCount / totalFields) >= 0.75 ? 'text-emerald-400' :
                  (availableCount / totalFields) >= 0.5 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {availableCount}/{totalFields}
                </span>
              </div>
              <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3">
                <div className="h-1.5 rounded-full bg-muted/30 mb-3 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      (availableCount / totalFields) >= 0.75 ? 'bg-emerald-500' :
                      (availableCount / totalFields) >= 0.5 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(availableCount / totalFields) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {dataFields.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-center gap-1.5 text-[10px]"
                    >
                      {field.available ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-400/60 shrink-0" />
                      )}
                      <span className={field.available ? 'text-foreground/80' : 'text-muted-foreground'}>
                        {field.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Best Score + Rally Score ── */}
            {(campaign.bestScore !== null || campaign.vaultData?.rallyActualScore != null) && (
              <div className="grid grid-cols-2 gap-2.5">
                {campaign.bestScore !== null && (
                  <div className="rounded-lg border border-border/30 bg-card/50 backdrop-blur-sm p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Best Internal Score</p>
                    <p className="text-xl font-bold font-mono text-emerald-400">{campaign.bestScore}/18</p>
                  </div>
                )}
                {campaign.vaultData?.rallyActualScore != null && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Rally Actual Score</p>
                    <p className="text-xl font-bold font-mono text-emerald-400">{campaign.vaultData.rallyActualScore}/18</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator className="opacity-50" />

        {/* ── Footer Actions ── */}
        <DialogFooter className="p-4 pt-3">
          <div className="flex items-center gap-2 w-full">
            {onEdit && campaign.dbId && (
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => {
                  onEdit(campaign)
                  onOpenChange(false)
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Campaign
              </Button>
            )}
            {campaign.campaignUrl && (
              <a
                href={campaign.campaignUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border/40 bg-card/50 hover:bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Open on Rally
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
