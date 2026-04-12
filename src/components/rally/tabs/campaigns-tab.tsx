'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ActivityFeed } from '@/components/rally/activity-feed'
import { CampaignQuickStats } from '@/components/rally/campaign-quick-stats'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CampaignCompareView } from '@/components/rally/campaign-compare'
import {
  Target,
  Clock,
  Zap,
  Play,
  Pause,
  Trash2,
  Plus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Timer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings,
  Globe,
  Shield,
  CalendarClock,
  Activity,
  Database,
  Users,
  Trophy,
  Award,
  TrendingUp,
  TrendingDown,
  Star,
  BookOpen,
  Sparkles,
  Crosshair,
  Hash,
  ArrowRight,
  Search,
  Filter,
  Check,
  X,
  Info,
  GitCompareArrows,
  FileText,
  FolderSync,
  RefreshCw,
  Eye,
  EyeOff,
  Link,
  Download,
  Pencil,
} from 'lucide-react'
import { RallyLiveFetcher } from '@/components/rally/rally-live-fetcher'
import type { CampaignDetail } from '@/components/rally/rally-live-fetcher'
import { CampaignDetailDialog } from '@/components/rally/campaign-detail-dialog'
import { CampaignEditDialog } from '@/components/rally/campaign-edit-dialog'
import type { CampaignEditData } from '@/components/rally/campaign-edit-dialog'
import { cn } from '@/lib/utils'
import { CampaignDeadlineTracker } from '@/components/rally/campaign-deadline-tracker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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

interface Campaign {
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
  source?: string  // 'file' | 'db' | 'rally_live'
  dbId?: string
  // Extended campaign fields (optional, from Rally API)
  headerImageUrl?: string
  rewardToken?: string
  minimumFollowers?: number
  knowledgeBase?: string
  rules?: string[]
  proposedAngles?: string[]
  // Pipeline raw JSON fields (for edit pre-fill)
  missionsJson?: string | null
  proposedAnglesJson?: string | null
  rulesJson?: string | null
  style?: string | null
  goal?: string | null
}

interface CronJob {
  id: string
  name: string
  campaignId: string
  campaignTitle: string
  campaignAddress: string
  mode: string
  scheduleKind: string
  scheduleExpr: string
  timezone: string
  status: string
  systemJobId: string | null
  lastRunAt: string | null
  nextRunAt: string | null
  runCount: number
  payload: string
  createdAt: string
  updatedAt: string
}

interface CronConfig {
  buildJobId: number | null
  buildSchedule: string | null
  buildStatus: string | null
  monitorJobId: number | null
  monitorSchedule: string | null
  monitorStatus: string | null
  timezone: string
  campaignAddress: string | null
}

interface CampaignsData {
  campaigns: Campaign[]
  cronConfig: CronConfig
  cronJobs: CronJob[]
  pipelineState: {
    status: string
    total_builds: number
    last_build_at: string | null
    next_action: string
  }
}

const SCHEDULE_PRESETS = [
  { label: 'Every 15 min', kind: 'fixed_rate', expr: '900', icon: Timer },
  { label: 'Every 30 min', kind: 'fixed_rate', expr: '1800', icon: Timer },
  { label: 'Every 1 hour', kind: 'fixed_rate', expr: '3600', icon: Clock },
  { label: 'Every 4 hours', kind: 'cron', expr: '0 0 */4 * * ?', icon: CalendarClock },
  { label: 'Every 6 hours', kind: 'cron', expr: '0 0 */6 * * ?', icon: CalendarClock },
  { label: 'Daily at 09:00', kind: 'cron', expr: '0 0 9 * * ?', icon: CalendarClock },
  { label: 'Daily at 21:00', kind: 'cron', expr: '0 0 21 * * ?', icon: CalendarClock },
]

const MODE_OPTIONS = [
  { value: 'BUILD', label: 'BUILD', desc: 'Generate content with full pipeline (5-judge panel, feedback loops)', icon: Zap, color: 'text-emerald-400' },
  { value: 'MONITOR', label: 'MONITOR', desc: 'Competitive intelligence check without generating', icon: Shield, color: 'text-blue-400' },
  { value: 'BUILD+MONITOR', label: 'BUILD + MONITOR', desc: 'Full build pipeline + competitive monitoring', icon: Activity, color: 'text-amber-400' },
]

type StatusFilter = 'all' | 'active' | 'ended'

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'Unknown'
  }
}

function formatScheduleExpr(expr: string, kind: string): string {
  const preset = SCHEDULE_PRESETS.find(p => p.expr === expr)
  if (preset) return preset.label
  if (kind === 'fixed_rate') {
    const secs = parseInt(expr)
    if (secs >= 3600) return `Every ${secs / 3600} hour${secs / 3600 > 1 ? 's' : ''}`
    if (secs >= 60) return `Every ${secs / 60} min`
    return `Every ${secs}s`
  }
  return expr
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'ended': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    case 'paused': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
}

function getVerdictBadge(score: number | null) {
  if (score === null) return null
  if (score === 18) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">18/18</Badge>
  if (score >= 17) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Elite</Badge>
  if (score >= 16) return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">Strong</Badge>
  if (score >= 14) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Moderate</Badge>
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Weak</Badge>
}

function getCompletenessColor(pct: number): string {
  if (pct >= 75) return 'text-emerald-400'
  if (pct >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function getCompletenessBar(pct: number): string {
  if (pct >= 75) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function getCompletenessBadge(pct: number): string {
  if (pct >= 75) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
  if (pct >= 50) return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
  return 'bg-red-500/15 text-red-400 border-red-500/20'
}

/* Data availability check for a campaign */
interface DataField {
  key: string
  label: string
  available: boolean
}

function getDataAvailability(campaign: Campaign): DataField[] {
  const fields: DataField[] = []
  const v = campaign.vaultData

  // Core fields
  fields.push({ key: 'title', label: 'Title', available: !!campaign.title })
  fields.push({ key: 'creator', label: 'Creator', available: !!campaign.creator })
  fields.push({ key: 'reward', label: 'Reward Pool', available: !!campaign.rewardPool && campaign.rewardPool !== 'N/A' })
  fields.push({ key: 'dates', label: 'Start/End Date', available: !!campaign.startDate || !!campaign.endDate })
  fields.push({ key: 'missions', label: 'Missions', available: campaign.missions.length > 0 })
  fields.push({ key: 'bestScore', label: 'Best Score', available: campaign.bestScore !== null })

  // Vault fields (only for campaigns with vault data)
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

/* Data availability indicator component */
function DataAvailabilityIndicator({ campaign }: { campaign: Campaign }) {
  const fields = getDataAvailability(campaign)
  const available = fields.filter(f => f.available).length
  const total = fields.length
  const missing = fields.filter(f => !f.available)

  if (missing.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        <span>All {total} data fields available</span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted/30">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getCompletenessBar(Math.round((available / total) * 100))}`}
            style={{ width: `${Math.round((available / total) * 100)}%` }}
          />
        </div>
        <span className={`text-[10px] font-medium ${getCompletenessColor(Math.round((available / total) * 100))}`}>
          {available}/{total}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {missing.slice(0, 5).map(f => (
          <span
            key={f.key}
            className="inline-flex items-center gap-0.5 text-[9px] text-amber-400/80 bg-amber-500/10 rounded px-1.5 py-0.5"
            title={`Missing: ${f.label}`}
          >
            <X className="h-2 w-2" />
            {f.label}
          </span>
        ))}
        {missing.length > 5 && (
          <span className="text-[9px] text-muted-foreground">
            +{missing.length - 5} more
          </span>
        )}
      </div>
    </div>
  )
}

/* Animated SVG Completeness Ring component */
function CompletenessRing({ percentage, size = 32 }: { percentage: number; size?: number }) {
  const radius = 12
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const color = percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="completeness-ring ring-animated">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="ring-progress"
        />
      </svg>
      <span
        className={`absolute text-[9px] font-bold ${percentage >= 75 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-red-400'}`}
      >
        {percentage}
      </span>
    </div>
  )
}

/* Reward token color mapping */
function getRewardTokenColor(token: string): string {
  const t = token.toUpperCase()
  if (t === 'RLP' || t === 'RALLY') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
  if (t === 'USDC' || t === 'USDT') return 'bg-blue-500/15 text-blue-400 border-blue-500/25'
  if (t === 'ETH' || t === 'WETH') return 'bg-purple-500/15 text-purple-400 border-purple-500/25'
  if (t === 'SOL') return 'bg-violet-500/15 text-violet-400 border-violet-500/25'
  return 'bg-amber-500/15 text-amber-400 border-amber-500/25'
}

/* Campaign preview card for the Add Campaign form */
function CampaignPreviewCard({ campaign }: { campaign: { title: string; creator: string; rewardPool: string; status: string; campaignUrl: string; description: string } }) {
  const hasContent = campaign.title.trim().length > 0
  if (!hasContent) return null

  return (
    <div className="rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 p-3">
      <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
        <Eye className="h-3 w-3" />
        Preview
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h5 className="text-xs font-medium truncate">{campaign.title || 'Untitled Campaign'}</h5>
          <Badge className={`${campaign.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-500/20 text-zinc-400'} text-[9px] px-1.5 py-0`}>
            {campaign.status || 'active'}
          </Badge>
        </div>
        {campaign.creator && (
          <p className="text-[10px] text-muted-foreground">by {campaign.creator}</p>
        )}
        {campaign.rewardPool && (
          <p className="text-[10px] text-amber-400">{campaign.rewardPool}</p>
        )}
        {campaign.campaignUrl && (
          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
            <Link className="h-2.5 w-2.5" />
            {campaign.campaignUrl}
          </p>
        )}
        {campaign.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2">{campaign.description}</p>
        )}
      </div>
    </div>
  )
}

const TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
]

export function CampaignsTab() {
  const [data, setData] = useState<CampaignsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Form state
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [selectedMode, setSelectedMode] = useState('BUILD')
  const [selectedSchedule, setSelectedSchedule] = useState(SCHEDULE_PRESETS[1]) // Every 30 min
  const [customName, setCustomName] = useState('')
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Jakarta')

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false)

  // AlertDialog state for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<CronJob | null>(null)

  // Add Campaign form state
  const [showAddCampaign, setShowAddCampaign] = useState(false)
  const [addingCampaign, setAddingCampaign] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    contractAddress: '',
    campaignUrl: '',
    creator: '',
    xUsername: '',
    rewardPool: '',
    startDate: '',
    endDate: '',
    status: 'active' as string,
    description: '',
    // Pipeline fields:
    knowledgeBase: '',
    style: '',
    goal: '',
    missionTitle: '',
    missionDirective: '',
    missionReward: '',
    rulesText: '',
    anglesText: '',
  })

  // Campaign delete dialog state
  const [campaignDeleteDialogOpen, setCampaignDeleteDialogOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)

  // Edit campaign state
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)

  // Advanced options collapse state for Add Campaign form
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Campaign detail dialog state
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Campaign edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editCampaignData, setEditCampaignData] = useState<CampaignEditData | null>(null)

  // Sync campaigns state
  const [syncing, setSyncing] = useState(false)
  const [liveSyncStatus, setLiveSyncStatus] = useState<string | null>(null)

  // Import campaign detail from Rally Live fetcher into Add Campaign form
  const handleImportFromRally = useCallback((detail: CampaignDetail) => {
    const firstMission = detail.missions[0]
    setNewCampaign({
      title: detail.title,
      contractAddress: detail.contractAddress,
      campaignUrl: `https://app.rally.fun/campaigns/${detail.contractAddress}`,
      creator: detail.creator,
      xUsername: detail.xUsername,
      rewardPool: detail.rewardBreakdown.map(r => `${r.amount.toLocaleString()} ${r.token}`).join(' + '),
      startDate: detail.startDate ? new Date(detail.startDate).toISOString().split('T')[0] : '',
      endDate: detail.endDate ? new Date(detail.endDate).toISOString().split('T')[0] : '',
      status: 'active',
      description: detail.goal || '',
      knowledgeBase: detail.knowledgeBase || '',
      style: detail.style || '',
      goal: detail.goal || '',
      missionTitle: firstMission?.title || '',
      missionDirective: firstMission?.directive || '',
      missionReward: firstMission?.reward || '',
      rulesText: firstMission?.rules?.join('\n') || detail.rules?.join('\n') || '',
      anglesText: firstMission?.proposedAngles?.join('\n') || '',
    })
    setShowAddCampaign(true)
    // Scroll to add campaign form
    setTimeout(() => {
      document.getElementById('add-campaign-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 200)
  }, [])

  // Use ref to track if initial auto-select has been done
  const initialAutoSelected = useRef(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/rally/campaigns')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        // Auto-select active campaign ONLY on first load
        if (!initialAutoSelected.current) {
          const active = json.campaigns?.find((c: Campaign) => c.isActive)
          if (active) {
            setSelectedCampaign(active.id)
            setCustomName(`Auto-Build: ${active.title.substring(0, 30)}`)
          }
          initialAutoSelected.current = true
        }
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-sync campaigns on first load: sync from Rally API, then from file, then fetch
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      // Step 1: Sync all campaigns from Rally.fun LIVE API
      try {
        if (!cancelled) setSyncing(true)
        const liveSyncRes = await fetch('/api/rally/sync-live', { method: 'POST' })
        if (liveSyncRes.ok && !cancelled) {
          const liveSync = await liveSyncRes.json()
          setLiveSyncStatus(liveSync.message || '')
          if (liveSync.synced > 0 || liveSync.updated > 0) {
            toast.success('Live campaigns synced from Rally.fun', {
              description: `${liveSync.synced} new, ${liveSync.updated} updated (${liveSync.totalFromApi} total from API)`,
            })
          }
        }
      } catch {
        // Live sync failed — still continue with file sync and DB data
      }

      // Step 2: Sync file-based campaigns (rally_master.json) to DB
      try {
        const syncCheckRes = await fetch('/api/rally/sync-campaigns')
        if (syncCheckRes.ok && !cancelled) {
          const syncCheck = await syncCheckRes.json()
          if (syncCheck.syncStatus?.missingFromDb > 0) {
            const syncRes = await fetch('/api/rally/sync-campaigns', { method: 'POST' })
            if (!cancelled && syncRes.ok) {
              const syncJson = await syncRes.json()
              toast.info('File campaigns synced', {
                description: syncJson.message || `${syncCheck.syncStatus.missingFromDb} file campaign(s) synced.`,
              })
            }
          }
        }
      } catch {
        // File sync failed silently
      }

      // Step 3: Always fetch campaigns (after all syncs)
      if (!cancelled) setSyncing(false)
      if (!cancelled) fetchData()
    }
    init()
    return () => { cancelled = true }
  }, [])

  // Manual sync handler — syncs both live + file campaigns
  const handleSyncCampaigns = async () => {
    setSyncing(true)
    try {
      // Sync from Rally.live API first
      const liveRes = await fetch('/api/rally/sync-live', { method: 'POST' })
      if (liveRes.ok) {
        const liveJson = await liveRes.json()
        setLiveSyncStatus(liveJson.message || '')
        toast.success('Live campaigns synced from Rally.fun', {
          description: `${liveJson.synced} new, ${liveJson.updated} updated (${liveJson.totalFromApi} total from API)`,
        })
      }
      // Also sync file-based campaigns
      const res = await fetch('/api/rally/sync-campaigns', { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        toast.success('All campaigns synced!', {
          description: json.message || 'Live + file campaigns synced to database.',
        })
        fetchData()
      } else {
        const err = await res.json()
        toast.error('Sync failed', { description: err.error || 'Unknown error' })
      }
    } catch {
      toast.error('Network error syncing campaigns')
    } finally {
      setSyncing(false)
    }
  }

  // Filter campaigns by search and status
  const filteredCampaigns = useMemo(() => {
    if (!data) return []
    let result = data.campaigns

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter(c => c.isActive)
    } else if (statusFilter === 'ended') {
      result = result.filter(c => !c.isActive)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.creator.toLowerCase().includes(q) ||
        c.contractAddress.toLowerCase().includes(q) ||
        (c.missions[0]?.title?.toLowerCase().includes(q) ?? false)
      )
    }

    return result
  }, [data, searchQuery, statusFilter])

  const filteredActive = useMemo(() => filteredCampaigns.filter(c => c.isActive), [filteredCampaigns])
  const filteredHistorical = useMemo(() => filteredCampaigns.filter(c => !c.isActive), [filteredCampaigns])

  const handleCreateCron = async () => {
    if (!selectedCampaign || !customName.trim()) {
      toast.error('Please select a campaign and enter a job name')
      return
    }

    const campaign = data?.campaigns.find(c => c.id === selectedCampaign)
    if (!campaign) return

    setCreating(true)
    try {
      const res = await fetch('/api/rally/cron-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName.trim(),
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          campaignAddress: campaign.contractAddress,
          mode: selectedMode,
          scheduleKind: selectedSchedule.kind,
          scheduleExpr: selectedSchedule.expr,
          timezone: selectedTimezone,
          payload: {
            description: `${selectedMode} Agent v14.0 — ${selectedSchedule.label} in ${selectedTimezone}. Campaign: ${campaign.title}. Address: ${campaign.contractAddress}`,
            variationCount: 3,
            maxFeedbackLoops: 2,
            missionId: campaign.missions[0]?.id ?? 0,
          },
        }),
      })

      if (res.ok) {
        toast.success('Cron job configuration created!', {
          description: `${customName} — ${selectedMode} mode, ${selectedSchedule.label}`,
        })
        setShowCreateForm(false)
        fetchData()
      } else {
        const err = await res.json()
        toast.error('Failed to create cron job', { description: err.error })
      }
    } catch {
      toast.error('Network error creating cron job')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleStatus = async (job: CronJob, newStatus: string) => {
    try {
      const res = await fetch('/api/rally/cron-manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, status: newStatus }),
      })
      if (res.ok) {
        toast.success(`Cron job ${newStatus === 'active' ? 'resumed' : 'paused'}`)
        fetchData()
      }
    } catch {
      toast.error('Failed to update cron job')
    }
  }

  // Open delete dialog instead of native confirm
  const handleDeleteClick = (job: CronJob) => {
    setJobToDelete(job)
    setDeleteDialogOpen(true)
  }

  // Perform the actual delete
  const handleConfirmDelete = async () => {
    if (!jobToDelete) return
    try {
      const res = await fetch(`/api/rally/cron-manage?id=${jobToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Cron job deleted')
        fetchData()
      }
    } catch {
      toast.error('Failed to delete cron job')
    } finally {
      setDeleteDialogOpen(false)
      setJobToDelete(null)
    }
  }

  const handleSelectCampaignForCron = (campaign: Campaign) => {
    setSelectedCampaign(campaign.id)
    setCustomName(`Auto-${selectedMode}: ${campaign.title.substring(0, 30)}`)
    setShowCreateForm(true)
    // Scroll to create form
    setTimeout(() => {
      document.getElementById('cron-create-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleCampaignClickInForm = (campaign: Campaign) => {
    setSelectedCampaign(campaign.id)
    setCustomName(`Auto-${selectedMode}: ${campaign.title.substring(0, 30)}`)
  }

  const handleModeChange = (modeValue: string) => {
    setSelectedMode(modeValue)
    const campaign = data?.campaigns.find(c => c.id === selectedCampaign)
    if (campaign) {
      setCustomName(`Auto-${modeValue}: ${campaign.title.substring(0, 30)}`)
    }
  }

  const isEditMode = editingCampaignId !== null

  // Reset form to blank state
  const resetFormState = useCallback(() => {
    setNewCampaign({
      title: '',
      contractAddress: '',
      campaignUrl: '',
      creator: '',
      xUsername: '',
      rewardPool: '',
      startDate: '',
      endDate: '',
      status: 'active',
      description: '',
      knowledgeBase: '',
      style: '',
      goal: '',
      missionTitle: '',
      missionDirective: '',
      missionReward: '',
      rulesText: '',
      anglesText: '',
    })
    setEditingCampaignId(null)
    setShowAddCampaign(false)
    setShowAdvancedOptions(false)
  }, [])

  // Add / Update Campaign handler (dual-mode)
  const handleAddCampaign = async () => {
    if (!newCampaign.title.trim()) {
      toast.error('Campaign title is required')
      return
    }
    setAddingCampaign(true)
    try {
      // Build missions JSON from form fields
      const missionTitle = newCampaign.missionTitle.trim() || newCampaign.title
      const missionDirective = newCampaign.missionDirective.trim() || newCampaign.description || `Create content about ${newCampaign.title}`
      const missionReward = newCampaign.missionReward.trim() || ''
      const rulesArray = newCampaign.rulesText.split('\n').map(r => r.trim()).filter(Boolean)
      const anglesArray = newCampaign.anglesText.split('\n').map(a => a.trim()).filter(Boolean)

      const missions = [{
        id: 1,
        title: missionTitle,
        directive: missionDirective,
        reward: missionReward,
        rules: rulesArray,
        proposed_angles: anglesArray,
      }]

      const payload: Record<string, unknown> = {
        ...newCampaign,
        missionsJson: JSON.stringify(missions),
        rulesJson: rulesArray.length > 0 ? JSON.stringify(rulesArray) : null,
        proposedAnglesJson: anglesArray.length > 0 ? JSON.stringify(anglesArray) : null,
      }
      // Remove form-only fields that the API doesn't expect directly
      delete payload.missionTitle
      delete payload.missionDirective
      delete payload.missionReward
      delete payload.rulesText
      delete payload.anglesText

      const method = isEditMode ? 'PUT' : 'POST'
      const body = isEditMode ? { ...payload, id: editingCampaignId } : payload

      const res = await fetch('/api/rally/campaign-manage', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        if (isEditMode) {
          toast.success('Campaign updated successfully!', {
            description: `"${newCampaign.title}" has been updated in the database.`,
          })
        } else {
          toast.success('Campaign added successfully!', {
            description: `"${newCampaign.title}" has been added to the database.`,
          })
        }
        resetFormState()
        fetchData()
      } else {
        const err = await res.json()
        toast.error(isEditMode ? 'Failed to update campaign' : 'Failed to add campaign', { description: err.error })
      }
    } catch {
      toast.error(isEditMode ? 'Network error updating campaign' : 'Network error adding campaign')
    } finally {
      setAddingCampaign(false)
    }
  }

  // Edit Campaign handler — opens the dialog with pre-filled data
  const handleEditCampaign = useCallback((campaign: Campaign, e?: React.MouseEvent) => {
    e?.stopPropagation()
    // Parse missions JSON to extract form fields
    let missionTitle = ''
    let missionDirective = ''
    let missionReward = ''
    let rulesText = ''
    let anglesText = ''

    if (campaign.missionsJson) {
      try {
        const parsed = JSON.parse(campaign.missionsJson)
        const firstMission = Array.isArray(parsed) ? parsed[0] : null
        if (firstMission) {
          missionTitle = firstMission.title || ''
          missionDirective = firstMission.directive || ''
          missionReward = firstMission.reward || ''
        }
      } catch { /* ignore parse errors */ }
    } else if (campaign.missions.length > 0) {
      missionTitle = campaign.missions[0].title || ''
      missionDirective = campaign.missions[0].directive || ''
      missionReward = campaign.missions[0].reward || ''
    }

    // Parse rules JSON or use rules array
    if (campaign.rulesJson) {
      try {
        rulesText = JSON.parse(campaign.rulesJson).join('\n')
      } catch { rulesText = '' }
    } else if (campaign.rules?.length) {
      rulesText = campaign.rules.join('\n')
    }

    // Parse proposed angles JSON or use proposedAngles array
    if (campaign.proposedAnglesJson) {
      try {
        anglesText = JSON.parse(campaign.proposedAnglesJson).join('\n')
      } catch { anglesText = '' }
    } else if (campaign.proposedAngles?.length) {
      anglesText = campaign.proposedAngles.join('\n')
    }

    setEditCampaignData({
      id: campaign.dbId || '',
      title: campaign.title || '',
      creator: campaign.creator || '',
      xUsername: campaign.xUsername || '',
      rewardPool: campaign.rewardPool || '',
      startDate: campaign.startDate || '',
      endDate: campaign.endDate || '',
      status: campaign.status || 'active',
      description: campaign.description || '',
      knowledgeBase: campaign.knowledgeBase || '',
      missionTitle,
      missionDirective,
      missionReward,
      writingStyle: campaign.style || '',
      goal: campaign.goal || '',
      rulesText,
      anglesText,
    })
    setEditDialogOpen(true)
  }, [])

  // Delete Campaign handler
  const handleDeleteCampaignClick = (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation()
    setCampaignToDelete(campaign)
    setCampaignDeleteDialogOpen(true)
  }

  const handleConfirmDeleteCampaign = async () => {
    if (!campaignToDelete?.dbId) return
    try {
      const res = await fetch(`/api/rally/campaign-manage?id=${campaignToDelete.dbId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Campaign deleted', {
          description: `"${campaignToDelete.title}" has been removed from the database.`,
        })
        fetchData()
      } else {
        const err = await res.json()
        toast.error('Failed to delete campaign', { description: err.error })
      }
    } catch {
      toast.error('Network error deleting campaign')
    } finally {
      setCampaignDeleteDialogOpen(false)
      setCampaignToDelete(null)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-border/30">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-2/3 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const { campaigns, cronConfig, cronJobs, pipelineState } = data

  // Compare mode renders a completely different view
  if (compareMode) {
    return (
      <CampaignCompareView
        campaigns={campaigns}
        onClose={() => setCompareMode(false)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* System Cron Status Banner */}
      <div className="rounded-lg bg-gradient-to-r from-emerald-500/40 via-emerald-500/15 to-transparent p-px">
        <Card className="border-0 bg-gradient-to-r from-emerald-500/5 via-card to-card rounded-[calc(0.5rem-1px)] cron-pattern-bg">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Activity className="h-4.5 w-4.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">System Cron Status</p>
                  <p className="text-[11px] text-muted-foreground">
                    Pipeline: {pipelineState.total_builds} builds total
                    {pipelineState.next_action && (
                      <span className="ml-1">• Next: {pipelineState.next_action.substring(0, 60)}...</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cronConfig.buildStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-500/20 text-zinc-400'}>
                  {cronConfig.buildStatus === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />}
                  BUILD {cronConfig.buildSchedule ? `(${cronConfig.buildSchedule})` : ''}
                </Badge>
                <Badge className={cronConfig.monitorStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-500/20 text-zinc-400'}>
                  {cronConfig.monitorStatus === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />}
                  MONITOR {cronConfig.monitorSchedule ? `(${cronConfig.monitorSchedule})` : ''}
                </Badge>
                <Badge className="bg-muted/50 text-muted-foreground">
                  <Globe className="h-3 w-3 mr-1" />
                  {cronConfig.timezone}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Sync Indicator */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/50 border border-border/30">
          <div className="flex items-center gap-1.5 shrink-0">
            <motion.span
              animate={syncing ? { opacity: [0.4, 1, 0.4] } : { scale: [1, 1.2, 1] }}
              transition={syncing ? { repeat: Infinity, duration: 0.8 } : { repeat: Infinity, duration: 2 }}
              className={cn(
                'h-2 w-2 rounded-full',
                syncing ? 'bg-amber-400' :
                liveSyncStatus ? 'bg-emerald-400' : 'bg-muted-foreground'
              )}
            />
            <span className="text-[10px] text-muted-foreground">Last live sync:</span>
            <span className={cn(
              'text-[10px] font-medium',
              liveSyncStatus ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {liveSyncStatus || 'Not yet'}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 ml-auto"
            onClick={handleSyncCampaigns}
            disabled={syncing}
          >
            <RefreshCw className={cn('h-2.5 w-2.5', syncing && 'animate-spin')} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </motion.div>

      {/* Deadline Warning Banner */}
      {(() => {
        const now = Date.now()
        const fortyEightHours = 48 * 60 * 60 * 1000
        const expiringSoon = campaigns.filter(c => {
          if (!c.isActive || !c.endDate) return false
          const end = new Date(c.endDate).getTime()
          return end > now && end <= now + fortyEightHours
        })
        if (expiringSoon.length === 0) return null
        return (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="rounded-lg bg-gradient-to-r from-amber-500/40 via-amber-500/15 to-transparent p-px">
              <Card className="border-0 bg-gradient-to-r from-amber-500/5 via-card to-card rounded-[calc(0.5rem-1px)]">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-amber-400">
                        ⚠️ {expiringSoon.length} campaign{expiringSoon.length !== 1 ? 's' : ''} expiring within 48 hours
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {expiringSoon.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setDetailCampaign(c)
                              setDetailDialogOpen(true)
                            }}
                            className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 rounded-md px-2 py-0.5 transition-colors cursor-pointer"
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {c.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )
      })()}

      {/* Campaign Quick Stats Summary */}
      <CampaignQuickStats />

      {/* Activity Feed */}
      <ActivityFeed />

      {/* Add Campaign Form (inline card) */}
      <AnimatePresence>
        {showAddCampaign && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            id="add-campaign-form"
          >
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {isEditMode ? (
                        <Pencil className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <FolderSync className="h-4 w-4 text-emerald-400" />
                      )}
                      {isEditMode ? 'Edit Campaign' : 'Add New Campaign'}
                    </CardTitle>
                    <CardDescription className="text-[11px] mt-1">
                      {isEditMode
                        ? 'Modify campaign details and pipeline configuration — changes are saved to the database'
                        : 'Manually add a campaign to the database — it will appear alongside file-based campaigns'}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={resetFormState}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* Title (required) with char count */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] text-muted-foreground">
                        Title <span className="text-red-400">*</span>
                      </Label>
                      <span className={`text-[10px] ${newCampaign.title.length > 200 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {newCampaign.title.length}/200
                      </span>
                    </div>
                    <Input
                      value={newCampaign.title}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, title: e.target.value.slice(0, 200) }))}
                      placeholder="e.g. Base Ecosystem Campaign"
                      className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Contract Address</Label>
                    <Input
                      value={newCampaign.contractAddress}
                      onChange={(e) => {
                        const addr = e.target.value
                        setNewCampaign(prev => ({
                          ...prev,
                          contractAddress: addr,
                          campaignUrl: prev.campaignUrl || (addr ? `https://app.rally.fun/campaigns/${addr}` : ''),
                        }))
                      }}
                      placeholder="0x..."
                      className="h-8 text-xs font-mono bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Campaign URL</Label>
                    <Input
                      value={newCampaign.campaignUrl}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, campaignUrl: e.target.value }))}
                      placeholder="https://app.rally.fun/campaigns/..."
                      className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                    />
                    {newCampaign.contractAddress && !newCampaign.campaignUrl && (
                      <p className="text-[9px] text-muted-foreground truncate">
                        Auto: https://app.rally.fun/campaigns/{newCampaign.contractAddress.slice(0, 10)}...
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Creator</Label>
                    <Input
                      value={newCampaign.creator}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, creator: e.target.value }))}
                      placeholder="Project Name"
                      className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">X/Twitter Username</Label>
                    <Input
                      value={newCampaign.xUsername}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, xUsername: e.target.value.replace('@', '') }))}
                      placeholder="username (without @)"
                      className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Reward Pool</Label>
                    <Input
                      value={newCampaign.rewardPool}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, rewardPool: e.target.value }))}
                      placeholder="e.g. 5,000 USDC"
                      className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Start Date</Label>
                    <Input
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, startDate: e.target.value }))}
                      className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, endDate: e.target.value }))}
                      className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Status</Label>
                    <select
                      value={newCampaign.status}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full h-8 rounded-lg border border-border/40 bg-background/50 px-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="ended">Ended</option>
                    </select>
                  </div>
                </div>

                {/* Description with char count */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">Description</Label>
                    <span className={`text-[10px] ${newCampaign.description.length > 500 ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {newCampaign.description.length}/500
                    </span>
                  </div>
                  <Textarea
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value.slice(0, 500) }))}
                    placeholder="Brief description of the campaign..."
                    rows={2}
                    className="text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50 resize-none"
                  />
                </div>

                {/* Pipeline Data Section */}
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] overflow-hidden">
                  <div className="px-3 py-2 bg-emerald-500/5 border-b border-emerald-500/10">
                    <p className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                      <Zap className="h-3 w-3" />
                      Pipeline Data (required for content generation)
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      Fill this to enable the pipeline for this campaign
                    </p>
                  </div>
                  <div className="px-3 py-3 space-y-3">
                    {/* Knowledge Base */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">
                        Knowledge Base <span className="text-emerald-400">(important)</span>
                      </Label>
                      <Textarea
                        value={newCampaign.knowledgeBase}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, knowledgeBase: e.target.value }))}
                        placeholder="Campaign context, key facts, terminology, background info... This helps the AI write accurate content."
                        rows={3}
                        className="text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50 resize-none"
                      />
                    </div>

                    {/* Mission */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">
                          Mission Title <span className="text-emerald-400">*</span>
                        </Label>
                        <Input
                          value={newCampaign.missionTitle}
                          onChange={(e) => setNewCampaign(prev => ({ ...prev, missionTitle: e.target.value }))}
                          placeholder="e.g. Create engaging tweet about Base ecosystem"
                          className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Mission Directive</Label>
                        <Input
                          value={newCampaign.missionDirective}
                          onChange={(e) => setNewCampaign(prev => ({ ...prev, missionDirective: e.target.value }))}
                          placeholder="e.g. Write a tweet promoting Base's unique features"
                          className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Reward</Label>
                        <Input
                          value={newCampaign.missionReward}
                          onChange={(e) => setNewCampaign(prev => ({ ...prev, missionReward: e.target.value }))}
                          placeholder="e.g. $500 USDC"
                          className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Writing Style</Label>
                        <Input
                          value={newCampaign.style}
                          onChange={(e) => setNewCampaign(prev => ({ ...prev, style: e.target.value }))}
                          placeholder="e.g. Visionary and confident"
                          className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                        />
                      </div>
                    </div>

                    {/* Goal */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Campaign Goal</Label>
                      <Textarea
                        value={newCampaign.goal}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, goal: e.target.value }))}
                        placeholder="What is the main goal of this campaign?"
                        rows={2}
                        className="text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50 resize-none"
                      />
                    </div>

                    {/* Rules (newline-separated) */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">
                        Campaign Rules <span className="text-[9px] text-muted-foreground">(one per line)</span>
                      </Label>
                      <Textarea
                        value={newCampaign.rulesText}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, rulesText: e.target.value }))}
                        placeholder={"Include @RallyOnChain mention\nNo em-dashes (—)\nNo hashtags\n1300-1700 characters target"}
                        rows={3}
                        className="text-xs font-mono bg-background/50 border-border/40 focus-visible:border-emerald-500/50 resize-none"
                      />
                    </div>

                    {/* Proposed Angles (newline-separated) */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">
                        Proposed Angles <span className="text-[9px] text-muted-foreground">(one per line)</span>
                      </Label>
                      <Textarea
                        value={newCampaign.anglesText}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, anglesText: e.target.value }))}
                        placeholder={"Personal experience with the product\nTechnical deep dive angle\nCommunity impact perspective\nContrarian take on common narratives"}
                        rows={3}
                        className="text-xs font-mono bg-background/50 border-border/40 focus-visible:border-emerald-500/50 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Options (collapsible) */}
                <div className="rounded-lg border border-border/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Settings className="h-3 w-3" />
                      Advanced Options
                    </span>
                    {showAdvancedOptions ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  <div
                    className={`form-section-collapse ${showAdvancedOptions ? '[data-open=true]' : ''}`}
                    data-open={showAdvancedOptions}
                  >
                    <div>
                      <div className="px-3 pb-3 space-y-3 border-t border-border/20 pt-3">
                        {/* Contract Address in Advanced (with auto URL preview) */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Contract Address (detailed)</Label>
                          <Input
                            value={newCampaign.contractAddress}
                            onChange={(e) => {
                              const addr = e.target.value
                              setNewCampaign(prev => ({
                                ...prev,
                                contractAddress: addr,
                                campaignUrl: prev.campaignUrl || (addr ? `https://app.rally.fun/campaigns/${addr}` : ''),
                              }))
                            }}
                            placeholder="0x..."
                            className="h-8 text-xs font-mono bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                          />
                          {newCampaign.contractAddress && (
                            <p className="text-[9px] text-emerald-400/70 truncate">
                              Generated URL: https://app.rally.fun/campaigns/{newCampaign.contractAddress}
                            </p>
                          )}
                        </div>
                        {/* Campaign URL in Advanced */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Campaign URL (manual)</Label>
                          <Input
                            value={newCampaign.campaignUrl}
                            onChange={(e) => setNewCampaign(prev => ({ ...prev, campaignUrl: e.target.value }))}
                            placeholder="https://app.rally.fun/campaigns/..."
                            className="h-8 text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50"
                          />
                        </div>
                        {/* Description in Advanced (extended) */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Extended Description</Label>
                          <Textarea
                            value={newCampaign.description}
                            onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value.slice(0, 500) }))}
                            placeholder="Provide a detailed description of the campaign goals, target audience, and key messaging..."
                            rows={4}
                            className="text-xs bg-background/50 border-border/40 focus-visible:border-emerald-500/50 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Card */}
                <CampaignPreviewCard campaign={newCampaign} />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    size="sm"
                    onClick={handleAddCampaign}
                    disabled={addingCampaign || !newCampaign.title.trim()}
                  >
                    {addingCampaign ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                      </motion.div>
                    ) : isEditMode ? (
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {addingCampaign ? (isEditMode ? 'Updating...' : 'Adding...') : isEditMode ? 'Update Campaign' : 'Add Campaign'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={resetFormState}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campaign Deadline Tracker */}
      <CampaignDeadlineTracker />

      {/* Search & Filter Bar */}
      <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 z-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
              <Input
                placeholder="Search campaigns by title, creator, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-9 pr-3 text-xs bg-background/50 border-emerald-500/10 focus-visible:border-emerald-500/40 focus-visible:shadow-[0_0_0_3px_rgba(16,185,129,0.1)] transition-all duration-300 rounded-lg relative z-0 search-ring"
              />
            </div>
            <div className="flex items-center gap-1.5 relative z-10 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-wait relative z-10"
                onClick={handleSyncCampaigns}
                disabled={syncing}
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : 'transition-transform duration-300 group-hover:rotate-180'}`} />
                {syncing ? 'Syncing...' : 'Sync Campaigns'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={`h-8 text-[11px] gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 relative z-10 group ${!campaigns.some(c => c.source === 'db') ? 'add-campaign-pulse' : ''}`}
                onClick={(e) => { e.stopPropagation(); setShowAddCampaign(!showAddCampaign); if (showCreateForm) setShowCreateForm(false) }}
              >
                <FolderSync className="h-3 w-3 transition-transform duration-300 group-hover:rotate-180" />
                Add Campaign
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                onClick={() => setCompareMode(true)}
                disabled={campaigns.length < 2}
              >
                <GitCompareArrows className="h-3 w-3" />
                Compare
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = '/api/rally/campaign-export'
                  link.download = 'rally-campaigns-export.json'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  toast.success('Campaigns exported', { description: `${campaigns.length} campaigns saved as JSON` })
                }}
              >
                <Download className="h-3 w-3" />
                Export
              </Button>
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
                {(['all', 'active', 'ended'] as StatusFilter[]).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                      statusFilter === filter
                        ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {filter === 'all' ? `All (${campaigns.length})` : filter === 'active' ? `Active (${campaigns.filter(c => c.isActive).length})` : `Ended (${campaigns.filter(c => !c.isActive).length})`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {(searchQuery.trim() || statusFilter !== 'all') && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>Showing {filteredCampaigns.length} of {campaigns.length} campaigns</span>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all') }}
                className="text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rally Live Fetcher — button renders inline, panel renders full-width */}
      <RallyLiveFetcher onImport={handleImportFromRally} />

      {/* Active Campaigns */}
      {filteredActive.length > 0 && (
        <Card className="border-border/30 hover:border-emerald-500/20 transition-colors duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-400" />
                  Active Campaigns
                </CardTitle>
                <CardDescription className="text-[11px] mt-1">
                  {filteredActive.length} active campaign{filteredActive.length !== 1 ? 's' : ''} available for cron jobs
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="h-8 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Cron Job
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 custom-scrollbar max-h-[600px] overflow-y-auto">
              {filteredActive.map((campaign, idx) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  idx={idx}
                  isExpanded={expandedCampaign === campaign.id}
                  cronJobs={cronJobs}
                  isSystemCron={cronConfig.campaignAddress === campaign.contractAddress}
                  onToggleExpand={() => setExpandedCampaign(expandedCampaign === campaign.id ? null : campaign.id)}
                  onSelectForCron={handleSelectCampaignForCron}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDeleteClick}
                  onCampaignDelete={handleDeleteCampaignClick}
                  onCampaignEdit={handleEditCampaign}
                  selectedMode={selectedMode}
                  onDetail={(c) => { setDetailCampaign(c); setDetailDialogOpen(true) }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Campaigns */}
      {filteredHistorical.length > 0 && (
        <Card className="border-border/30 hover:border-emerald-500/20 transition-colors duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  Historical Campaigns
                </CardTitle>
                <CardDescription className="text-[11px] mt-1">
                  {filteredHistorical.length} completed campaign{filteredHistorical.length !== 1 ? 's' : ''} — can still configure cron jobs for analysis
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="h-8 bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25 border border-zinc-500/20"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Cron Job
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 custom-scrollbar max-h-[600px] overflow-y-auto">
              {filteredHistorical.map((campaign, idx) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  idx={idx}
                  isExpanded={expandedCampaign === campaign.id}
                  cronJobs={cronJobs}
                  isSystemCron={cronConfig.campaignAddress === campaign.contractAddress}
                  onToggleExpand={() => setExpandedCampaign(expandedCampaign === campaign.id ? null : campaign.id)}
                  onSelectForCron={handleSelectCampaignForCron}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDeleteClick}
                  onCampaignDelete={handleDeleteCampaignClick}
                  onCampaignEdit={handleEditCampaign}
                  selectedMode={selectedMode}
                  onDetail={(c) => { setDetailCampaign(c); setDetailDialogOpen(true) }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State — No campaigns at all */}
      {campaigns.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-emerald-500/5 rounded-full" />
                <div className="relative flex items-center justify-center h-full">
                  <Target className="h-8 w-8 text-emerald-400/40" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Search className="h-4 w-4 text-muted-foreground/30" />
                </div>
                <div className="absolute -bottom-0.5 -left-0.5">
                  <Database className="h-4 w-4 text-muted-foreground/30" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground">No campaigns found</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Campaigns will appear here when rally data is loaded from the system.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                onClick={() => setShowAddCampaign(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add a Campaign Manually
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State — Filter returned no results */}
      {campaigns.length > 0 && filteredCampaigns.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-amber-500/5 rounded-full" />
                <div className="relative flex items-center justify-center h-full">
                  <Search className="h-8 w-8 text-amber-400/40" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Filter className="h-4 w-4 text-amber-400/30" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground">No campaigns match your search</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Try adjusting your search query or filters.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                onClick={() => { setSearchQuery(''); setStatusFilter('all') }}
              >
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Create Cron Job Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            id="cron-create-form"
          >
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4 text-emerald-400" />
                      Create Cron Job
                    </CardTitle>
                    <CardDescription className="text-[11px] mt-1">
                      Configure an automated task for the selected campaign
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCreateForm(false)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* Step 1: Select Campaign — show ALL campaigns */}
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                    Select Campaign
                    <Badge className="bg-muted/50 text-muted-foreground text-[10px]">{campaigns.length} available</Badge>
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {campaigns.map(campaign => {
                      const isSelected = selectedCampaign === campaign.id
                      return (
                        <button
                          key={campaign.id}
                          onClick={() => handleCampaignClickInForm(campaign)}
                          className={`rounded-lg border p-3 text-left transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : campaign.isActive
                                ? 'border-border/40 hover:border-emerald-500/20 bg-card/50'
                                : 'border-border/30 hover:border-border/60 bg-card/30 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full border-2 shrink-0 ${
                              isSelected
                                ? 'bg-emerald-400 border-emerald-400'
                                : 'border-muted-foreground/40'
                            }`} />
                            <span className="text-xs font-medium truncate flex-1">{campaign.title}</span>
                            {/* Source badge in form selector */}
                            {campaign.source === 'file' ? (
                              <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/20 text-[8px] px-1 py-0 shrink-0">FILE</Badge>
                            ) : campaign.source === 'rally_live' ? (
                              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[8px] px-1 py-0 shrink-0">LIVE</Badge>
                            ) : campaign.source === 'db' ? (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[8px] px-1 py-0 shrink-0">DB</Badge>
                            ) : null}
                            {campaign.isActive ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 shrink-0">ACTIVE</Badge>
                            ) : (
                              <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-[9px] px-1.5 py-0 shrink-0">ENDED</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 ml-5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Zap className="h-2.5 w-2.5" />
                              {campaign.rewardPool || 'No reward info'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-2.5 w-2.5" />
                              {campaign.totalMissions} mission{campaign.totalMissions !== 1 ? 's' : ''}
                            </span>
                            {campaign.vaultData?.rallyActualScore != null ? (
                              <span className="flex items-center gap-1">
                                <Award className="h-2.5 w-2.5 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">{campaign.vaultData.rallyActualScore}/18 Rally</span>
                              </span>
                            ) : campaign.bestScore !== null ? (
                              <span className="flex items-center gap-1">
                                <Trophy className="h-2.5 w-2.5" />
                                {campaign.bestScore}/18
                              </span>
                            ) : null}
                            {campaign.vaultData?.winningAngle && (
                              <span className="flex items-center gap-1">
                                <Crosshair className="h-2.5 w-2.5 text-blue-400" />
                                <span className="truncate max-w-[80px]">{campaign.vaultData.winningAngle}</span>
                              </span>
                            )}
                            <span className={`flex items-center gap-1 ${getCompletenessColor(campaign.dataCompleteness)}`}>
                              <Database className="h-2.5 w-2.5" />
                              {campaign.dataCompleteness}%
                            </span>
                          </div>
                          {/* Data completeness indicator inside form cards */}
                          <div className="mt-2 ml-5">
                            <DataAvailabilityIndicator campaign={campaign} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {campaigns.length === 0 && (
                    <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3" />
                      No campaigns available. <button onClick={() => { setShowAddCampaign(true); setShowCreateForm(false) }} className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer ml-1">Add a campaign manually.</button>
                    </p>
                  )}
                </div>

                {/* Step 2: Choose Mode */}
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                    Choose Mode
                  </label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {MODE_OPTIONS.map(mode => {
                      const Icon = mode.icon
                      return (
                        <button
                          key={mode.value}
                          onClick={() => handleModeChange(mode.value)}
                          className={`rounded-lg border p-3 text-left transition-all duration-200 cursor-pointer ${
                            selectedMode === mode.value
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-border/40 hover:border-emerald-500/20 bg-card/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${mode.color}`} />
                            <span className="text-xs font-medium">{mode.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{mode.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Step 3: Schedule */}
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                    Schedule
                  </label>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                    {SCHEDULE_PRESETS.map((preset, idx) => {
                      const Icon = preset.icon
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedSchedule(preset)}
                          className={`rounded-lg border p-2.5 text-center transition-all duration-200 cursor-pointer ${
                            selectedSchedule.expr === preset.expr
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : 'border-border/40 hover:border-emerald-500/20 bg-card/50'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                          <p className="text-[11px] font-medium mt-1">{preset.label}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Step 4: Configuration */}
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
                    Configuration
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground">Job Name</label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full h-8 rounded-lg border border-border/40 bg-background/50 px-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-colors"
                        placeholder="Enter a descriptive name..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground">Timezone</label>
                      <select
                        value={selectedTimezone}
                        onChange={(e) => setSelectedTimezone(e.target.value)}
                        className="w-full h-8 rounded-lg border border-border/40 bg-background/50 px-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-colors"
                      >
                        {TIMEZONES.map(tz => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Summary & Create */}
                <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">Summary</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Campaign:</span>
                      <p className="font-medium truncate mt-0.5">
                        {campaigns.find(c => c.id === selectedCampaign)?.title || 'None selected'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mode:</span>
                      <p className="font-medium mt-0.5">{selectedMode}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Schedule:</span>
                      <p className="font-medium mt-0.5">{selectedSchedule.label}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timezone:</span>
                      <p className="font-medium mt-0.5">{selectedTimezone}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    size="sm"
                    onClick={handleCreateCron}
                    disabled={creating || !selectedCampaign || !customName.trim()}
                  >
                    {creating ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                      </motion.div>
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {creating ? 'Creating...' : 'Create Cron Job'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing Cron Jobs Table */}
      {cronJobs.length > 0 && (
        <Card className="border-border/30 hover:border-emerald-500/20 transition-colors duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4 text-emerald-400" />
              Configured Cron Jobs
              <Badge className="bg-muted/50 text-muted-foreground text-[10px]">{cronJobs.length}</Badge>
            </CardTitle>
            <CardDescription className="text-[11px]">
              All campaign cron job configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {cronJobs.map(job => {
                const ModeIcon = MODE_OPTIONS.find(m => m.value === job.mode)?.icon || Zap
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-card/50 p-3 hover:border-emerald-500/15 transition-colors duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ModeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium truncate">{job.name}</span>
                        <Badge className={`${getStatusColor(job.status)} text-[10px] px-1.5 py-0`}>
                          {job.status}
                        </Badge>
                        <Badge className="bg-muted/50 text-muted-foreground text-[10px] px-1.5 py-0">
                          {job.mode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                        <span className="truncate max-w-[200px]">{job.campaignTitle}</span>
                        <span className="flex items-center gap-1">
                          <Timer className="h-2.5 w-2.5" />
                          {formatScheduleExpr(job.scheduleExpr, job.scheduleKind)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-2.5 w-2.5" />
                          {job.timezone}
                        </span>
                        <span>Runs: {job.runCount}</span>
                        <span>Created: {formatDateTime(job.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {job.status === 'active' ? (
                        <button
                          onClick={() => handleToggleStatus(job, 'paused')}
                          className="h-7 w-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 hover:bg-amber-500/25 transition-colors cursor-pointer"
                          title="Pause"
                          aria-label="Pause cron job"
                        >
                          <Pause className="h-3 w-3" />
                        </button>
                      ) : job.status === 'paused' ? (
                        <button
                          onClick={() => handleToggleStatus(job, 'active')}
                          className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                          title="Resume"
                          aria-label="Resume cron job"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDeleteClick(job)}
                        className="h-7 w-7 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400 hover:bg-red-500/25 transition-colors cursor-pointer"
                        title="Delete"
                        aria-label="Delete cron job"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Cron Jobs Empty State */}
      {cronJobs.length === 0 && (
        <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="relative mx-auto w-16 h-16 mb-3">
              <div className="absolute inset-0 bg-emerald-500/5 rounded-full" />
              <div className="relative flex items-center justify-center h-full">
                <Timer className="h-7 w-7 text-emerald-400/30" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Clock className="h-4 w-4 text-muted-foreground/30" />
              </div>
              <div className="absolute -bottom-0.5 -left-0.5">
                <Zap className="h-4 w-4 text-muted-foreground/30" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">No cron jobs configured yet</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Click the &quot;⚡ Assign Cron&quot; button on any campaign card to create your first automated job.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-400" />
              Delete Cron Job
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">&quot;{jobToDelete?.name}&quot;</span>?
              This action cannot be undone. The cron job will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
            {jobToDelete && (
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Campaign:</span>
                  <p className="font-medium truncate mt-0.5">{jobToDelete.campaignTitle}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mode:</span>
                  <p className="font-medium mt-0.5">{jobToDelete.mode}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Schedule:</span>
                  <p className="font-medium mt-0.5">{formatScheduleExpr(jobToDelete.scheduleExpr, jobToDelete.scheduleKind)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Runs:</span>
                  <p className="font-medium mt-0.5">{jobToDelete.runCount}</p>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign Detail Dialog */}
      <CampaignDetailDialog
        campaign={detailCampaign}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={handleEditCampaign}
      />

      {/* Campaign Edit Dialog */}
      <CampaignEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        campaign={editCampaignData}
        onSaved={fetchData}
      />

      {/* Campaign Delete Confirmation AlertDialog */}
      <AlertDialog open={campaignDeleteDialogOpen} onOpenChange={setCampaignDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-400" />
              Remove Campaign
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-medium text-foreground">&quot;{campaignToDelete?.title}&quot;</span>?
              This will only remove the campaign from the database. File-based campaigns cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
            {campaignToDelete && (
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <p className="font-medium mt-0.5">{campaignToDelete.source === 'db' ? 'Database' : 'File'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium mt-0.5">{campaignToDelete.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Creator:</span>
                  <p className="font-medium mt-0.5 truncate">{campaignToDelete.creator || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Address:</span>
                  <p className="font-mono font-medium mt-0.5 truncate">{campaignToDelete.contractAddress || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteCampaign}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remove campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ============================================================
   Knowledge Base Section (expandable, shown in campaign detail)
   ============================================================ */
function KnowledgeBaseSection({ knowledgeBase }: { knowledgeBase: string }) {
  const [showFull, setShowFull] = useState(false)
  const truncated = knowledgeBase.length > 200
  const displayText = showFull || !truncated ? knowledgeBase : knowledgeBase.slice(0, 200) + '...'

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/30 p-4 space-y-2 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="h-3 w-3 text-blue-400" />
          Knowledge Base
        </p>
        {truncated && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowFull(!showFull) }}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            {showFull ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
      <p className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed">{displayText}</p>
    </div>
  )
}

/* ============================================================
   Mission Details Section (rules, angles, directive)
   ============================================================ */
function MissionDetailsSection({ campaign }: { campaign: Campaign }) {
  const mission = campaign.missions[0]
  const rules = campaign.rules || (mission as Mission)?.rules?.length ? (mission as Mission).rules : []
  const angles = campaign.proposedAngles || []

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/30 p-4 space-y-3 animate-fade-in-up">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Crosshair className="h-3 w-3 text-emerald-400" />
        Mission Details
      </p>

      {/* Mission Directive */}
      {mission?.directive && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Directive</p>
          <p className="text-[11px] text-foreground/80 line-clamp-4 leading-relaxed">{mission.directive}</p>
        </div>
      )}

      {/* Rules List */}
      {rules.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Rules ({rules.length})</p>
          <ul className="space-y-1">
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                <span className="leading-relaxed">{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Proposed Angles as Tags/Chips */}
      {angles.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Proposed Angles ({angles.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {angles.map((angle, i) => (
              <Badge key={i} className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] px-2 py-0.5 hover:bg-purple-500/15 transition-colors">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                {angle}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Vault Data Summary (if available) */}
      {campaign.vaultData && (
        <VaultDataSummary vaultData={campaign.vaultData} />
      )}
    </div>
  )
}

/* ============================================================
   Vault Data Summary (shown in mission details)
   ============================================================ */
function VaultDataSummary({ vaultData }: { vaultData: VaultData }) {
  return (
    <div className="border-t border-border/20 pt-3 mt-1">
      <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1.5">
        <Trophy className="h-3 w-3 text-amber-400" />
        Vault Data
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {vaultData.winningAngle && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Winning Angle</p>
            <p className="text-[11px] text-emerald-400 mt-0.5 line-clamp-2">{vaultData.winningAngle}</p>
          </div>
        )}
        {vaultData.techniquesThatWorked && vaultData.techniquesThatWorked.length > 0 && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Working Techniques</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {vaultData.techniquesThatWorked.slice(0, 3).map((t, i) => (
                <span key={i} className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5">{t}</span>
              ))}
              {vaultData.techniquesThatWorked.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{vaultData.techniquesThatWorked.length - 3}</span>
              )}
            </div>
          </div>
        )}
        {vaultData.calibration && (vaultData.calibration.internalScore != null || vaultData.calibration.rallyScore != null) && (
          <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Calibration</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
              {vaultData.calibration.internalScore != null && (
                <span className="text-muted-foreground">Internal: {vaultData.calibration.internalScore}/18</span>
              )}
              {vaultData.calibration.rallyScore != null && (
                <span className="text-emerald-400">Rally: {vaultData.calibration.rallyScore}/18</span>
              )}
            </div>
            {vaultData.calibration.gap != null && vaultData.calibration.gap !== 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Gap: <span className={Math.abs(vaultData.calibration.gap) <= 1 ? 'text-emerald-400' : 'text-amber-400'}>
                  {vaultData.calibration.gap > 0 ? '+' : ''}{vaultData.calibration.gap}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Campaign Card Component (enhanced with visible actions)
   ============================================================ */
function CampaignCard({
  campaign,
  idx,
  isExpanded,
  cronJobs,
  isSystemCron,
  onToggleExpand,
  onSelectForCron,
  onToggleStatus,
  onDelete,
  selectedMode,
  onCampaignEdit,
}: {
  campaign: Campaign
  idx: number
  isExpanded: boolean
  cronJobs: CronJob[]
  isSystemCron: boolean
  onToggleExpand: () => void
  onSelectForCron: (c: Campaign) => void
  onToggleStatus: (job: CronJob, status: string) => void
  onDelete: (job: CronJob) => void
  onCampaignDelete?: (campaign: Campaign, e: React.MouseEvent) => void
  onCampaignEdit?: (campaign: Campaign, e?: React.MouseEvent) => void
  selectedMode: string
  onDetail?: (campaign: Campaign) => void
}) {
  const campaignJobs = cronJobs.filter(j => j.campaignId === campaign.id && j.status !== 'deleted')
  const hasMissingData = campaign.dataCompleteness < 100
  const missionTitle = campaign.missions[0]?.title
  const completenessPct = campaign.dataCompleteness || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      <div
        className={`rounded-xl border border-border/40 p-3 hover:border-emerald-500/20 hover:scale-[1.005] cursor-pointer transition-all duration-200 card-shimmer ${campaign.isActive ? 'campaign-card-active campaign-card-hover' : 'campaign-card-ended-amber campaign-card-hover'}`}
        onClick={() => { if (onDetail) { onDetail(campaign) } else { onToggleExpand() } }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') { if (onDetail) { onDetail(campaign) } else { onToggleExpand() } } }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Row 1: Title + badges + header image */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Header image preview */}
              {campaign.headerImageUrl && (
                <img
                  src={campaign.headerImageUrl}
                  alt=""
                  className="h-[32px] w-[48px] rounded object-cover shrink-0 border border-border/30"
                  loading="lazy"
                />
              )}
              <h4 className="text-sm font-medium truncate">{campaign.title}</h4>
              <Badge className={`${getStatusColor(campaign.status)} text-[10px] px-1.5 py-0`}>
                {campaign.status}
              </Badge>
              {campaign.isActive && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 badge-glow">
                  ACTIVE
                </Badge>
              )}
              {isSystemCron && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">
                  SYSTEM CRON
                </Badge>
              )}
              {getVerdictBadge(campaign.bestScore)}
              {campaign.vaultData?.rallyActualScore != null && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                  {campaign.vaultData.rallyActualScore}/18 Rally
                </Badge>
              )}
              {/* Source badge: FILE, LIVE, or DB */}
              {campaign.source === 'file' ? (
                <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/20 text-[9px] px-1.5 py-0" title="Data from rally system files">
                  <FileText className="h-2 w-2 mr-0.5" />
                  FILE
                </Badge>
              ) : campaign.source === 'rally_live' ? (
                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[9px] px-1.5 py-0" title="Fetched from Rally.fun live API">
                  <Globe className="h-2 w-2 mr-0.5" />
                  LIVE
                </Badge>
              ) : campaign.source === 'db' ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0" title="Manually added to database">
                  <Database className="h-2 w-2 mr-0.5" />
                  DB
                </Badge>
              ) : null}
              {/* Edit and Delete + Quick View buttons for DB/LIVE-sourced campaigns */}
              {campaign.dbId && (
                <div className="flex items-center gap-0.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="h-5 w-5 rounded flex items-center justify-center text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                        title="Quick view campaign"
                        aria-label="Quick view campaign"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye className="h-2.5 w-2.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3 bg-popover/95 backdrop-blur-xl border-border/50" side="right" align="start">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold truncate pr-2">{campaign.title}</h4>
                          <Badge className={cn('text-[9px] px-1.5 py-0 shrink-0', getStatusColor(campaign.status))}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <Zap className="h-3 w-3 text-amber-400" />
                          <span className="text-muted-foreground">{campaign.rewardPool || 'N/A'}</span>
                          {campaign.rewardToken && (
                            <Badge className={cn('text-[8px] px-1 py-0', getRewardTokenColor(campaign.rewardToken))}>
                              {campaign.rewardToken.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        {campaign.knowledgeBase && (
                          <div className="space-y-1">
                            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Knowledge Base</p>
                            <p className="text-[10px] text-foreground/70 line-clamp-3 leading-relaxed">{campaign.knowledgeBase.substring(0, 200)}{campaign.knowledgeBase.length > 200 ? '...' : ''}</p>
                          </div>
                        )}
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>{campaign.rules?.length || 0} rules</span>
                          <span>·</span>
                          <span>{campaign.proposedAngles?.length || 0} angles</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-muted-foreground">Data completeness</span>
                            <span className={cn('font-mono font-medium', getCompletenessColor(campaign.dataCompleteness))}>{campaign.dataCompleteness}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all duration-500', getCompletenessBar(campaign.dataCompleteness))} style={{ width: `${campaign.dataCompleteness}%` }} />
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          {onCampaignEdit && (
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2" onClick={(e) => { e.stopPropagation(); onCampaignEdit(campaign, e) }}>
                              <Pencil className="h-2.5 w-2.5" />Edit
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2" onClick={(e) => { e.stopPropagation(); if (onDetail) onDetail(campaign); }}>
                            <Sparkles className="h-2.5 w-2.5" />Generate
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {onCampaignEdit && (
                    <button
                      onClick={(e) => onCampaignEdit(campaign, e)}
                      className="h-5 w-5 rounded flex items-center justify-center text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                      title="Edit campaign"
                      aria-label="Edit campaign"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => onCampaignDelete && onCampaignDelete(campaign, e)}
                    className="h-5 w-5 rounded flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete campaign from database"
                    aria-label="Delete campaign"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Row 2: Meta info with reward token badge and min followers */}
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span className="text-foreground/70 font-medium">{campaign.creator}</span>
                {campaign.xUsername && (
                  <span className="text-muted-foreground">@{campaign.xUsername}</span>
                )}
              </span>
              {campaign.rewardPool && campaign.rewardPool !== 'N/A' && (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {campaign.rewardPool}
                  {/* Reward token badge */}
                  {campaign.rewardToken && (
                    <Badge className={`text-[9px] px-1 py-0 ml-0.5 ${getRewardTokenColor(campaign.rewardToken)}`}>
                      {campaign.rewardToken.toUpperCase()}
                    </Badge>
                  )}
                </span>
              )}
              {campaign.endDate && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {campaign.status === 'active' ? 'Deadline: ' : 'Ended: '}
                  {formatDate(campaign.endDate)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {campaign.totalMissions} mission{campaign.totalMissions !== 1 ? 's' : ''}
              </span>
              {campaign.bestScore !== null && (
                <span className="font-mono font-medium text-amber-400">
                  Best: {campaign.bestScore}/18
                </span>
              )}
              {/* Minimum followers indicator */}
              {campaign.minimumFollowers && campaign.minimumFollowers > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Users className="h-2.5 w-2.5" />
                  Min {campaign.minimumFollowers.toLocaleString()} followers
                </span>
              )}
            </div>

            {/* Row 3: Mission title (visible without expansion) */}
            {missionTitle && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                <Crosshair className="h-3 w-3 text-emerald-400/60 shrink-0" />
                <span className="text-foreground/60 truncate">{missionTitle}</span>
              </div>
            )}

            {/* Row 4: Data completeness ring + info chips */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Animated completeness ring */}
              <CompletenessRing percentage={completenessPct} size={32} />

              {/* Knowledge base chip */}
              {campaign.knowledgeBase && campaign.knowledgeBase.trim().length > 0 && (
                <span
                  className="chip bg-blue-500/10 text-blue-400 border-blue-500/20 tooltip-card"
                  data-tooltip={campaign.knowledgeBase.slice(0, 100)}
                >
                  <BookOpen className="h-2.5 w-2.5" />
                  KB
                </span>
              )}

              {/* Rules count chip */}
              {campaign.rules && campaign.rules.length > 0 && (
                <span className="chip bg-amber-500/10 text-amber-400 border-amber-500/20">
                  <FileText className="h-2.5 w-2.5" />
                  {campaign.rules.length} rules
                </span>
              )}

              {/* Proposed angles chip */}
              {campaign.proposedAngles && campaign.proposedAngles.length > 0 && (
                <span className="chip bg-purple-500/10 text-purple-400 border-purple-500/20">
                  <Crosshair className="h-2.5 w-2.5" />
                  {campaign.proposedAngles.length} angles
                </span>
              )}
            </div>

            {/* Row 5: Existing cron jobs count */}
            {campaignJobs.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Timer className="h-3 w-3 text-emerald-400" />
                <span className="text-[11px] text-emerald-400">
                  {campaignJobs.length} cron job{campaignJobs.length !== 1 ? 's' : ''} configured
                </span>
              </div>
            )}
          </div>

          {/* Right side: Actions column */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            {/* ⚡ Assign Cron button — ALWAYS VISIBLE */}
            <Button
              size="sm"
              className="h-7 px-2.5 text-[11px] font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 whitespace-nowrap hover-glow-emerald transition-all duration-300 hover:shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]"
              onClick={(e) => {
                e.stopPropagation()
                onSelectForCron(campaign)
              }}
            >
              <Zap className="h-3 w-3 mr-1" />
              Assign Cron
            </Button>

            {/* External link button */}
            {campaign.campaignUrl && (
              <a
                href={campaign.campaignUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 w-7 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                onClick={(e) => e.stopPropagation()}
                aria-label="Open campaign externally"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {/* Expand chevron */}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Campaign Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-3 mt-1 pl-4 border-l-[3px] border-emerald-500/30 space-y-3 pb-2 rounded-r-lg">
              {/* Contract address */}
              <div className="text-[11px] font-mono text-muted-foreground break-all bg-muted/20 rounded-lg p-2">
                {campaign.contractAddress}
              </div>

              {/* Campaign Dates */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-border/20 bg-card/30 p-2">
                  <span className="text-muted-foreground">Start Date</span>
                  <p className="font-medium mt-0.5">{formatDate(campaign.startDate)}</p>
                </div>
                <div className="rounded-lg border border-border/20 bg-card/30 p-2">
                  <span className="text-muted-foreground">End Date</span>
                  <p className="font-medium mt-0.5">{formatDate(campaign.endDate)}</p>
                </div>
              </div>

              {/* Knowledge Base Section */}
              {campaign.knowledgeBase && campaign.knowledgeBase.trim().length > 0 && (
                <KnowledgeBaseSection knowledgeBase={campaign.knowledgeBase} />
              )}

              {/* Mission Details Section */}
              {(campaign.missions.length > 0 || campaign.rules?.length || campaign.proposedAngles?.length) && (
                <MissionDetailsSection campaign={campaign} />
              )}

              {/* Campaign Cron Jobs */}
              {campaignJobs.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Cron Jobs for this campaign
                  </p>
                  {campaignJobs.map(job => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-card/50 p-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">{job.name}</span>
                          <Badge className={`${getStatusColor(job.status)} text-[10px] px-1.5 py-0`}>
                            {job.status}
                          </Badge>
                          <Badge className="bg-muted/50 text-muted-foreground text-[10px] px-1.5 py-0">
                            {job.mode}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Timer className="h-2.5 w-2.5" />
                            {formatScheduleExpr(job.scheduleExpr, job.scheduleKind)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-2.5 w-2.5" />
                            {job.timezone}
                          </span>
                          <span>Runs: {job.runCount}</span>
                          <span>Created: {formatDateTime(job.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {job.status === 'active' ? (
                          <button
                            onClick={() => onToggleStatus(job, 'paused')}
                            className="h-7 w-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 hover:bg-amber-500/25 transition-colors cursor-pointer"
                            title="Pause"
                            aria-label="Pause cron job"
                          >
                            <Pause className="h-3 w-3" />
                          </button>
                        ) : job.status === 'paused' ? (
                          <button
                            onClick={() => onToggleStatus(job, 'active')}
                            className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                            title="Resume"
                            aria-label="Resume cron job"
                          >
                            <Play className="h-3 w-3" />
                          </button>
                        ) : null}
                        <button
                          onClick={() => onDelete(job)}
                          className="h-7 w-7 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400 hover:bg-red-500/25 transition-colors cursor-pointer"
                          title="Delete"
                          aria-label="Delete cron job"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Vault Data Panel (historical campaigns with rich data) */}
              {campaign.vaultData && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Campaign Vault Data
                    </p>
                    {campaign.vaultData.achieved18_18 && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                        <Star className="h-2.5 w-2.5 mr-0.5" />
                        18/18 Achieved
                      </Badge>
                    )}
                  </div>

                  {/* Vault Mission Description */}
                  {campaign.vaultData.mission && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                      <p className="text-[10px] text-emerald-400 font-medium mb-1 flex items-center gap-1">
                        <Crosshair className="h-2.5 w-2.5" />
                        Mission
                      </p>
                      <p className="text-[11px] text-foreground/80 line-clamp-3">{campaign.vaultData.mission}</p>
                    </div>
                  )}

                  {/* Winning Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Winning Hook */}
                    {campaign.vaultData.winningHook && (
                      <div className="rounded-lg border border-border/20 bg-card/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          Winning Hook
                        </p>
                        <p className="text-[11px] text-foreground/80 line-clamp-2">{campaign.vaultData.winningHook}</p>
                      </div>
                    )}
                    {/* Winning Angle */}
                    {campaign.vaultData.winningAngle && (
                      <div className="rounded-lg border border-border/20 bg-card/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                          <Crosshair className="h-2.5 w-2.5" />
                          Winning Angle
                        </p>
                        <p className="text-[11px] text-foreground/80 line-clamp-2">{campaign.vaultData.winningAngle}</p>
                      </div>
                    )}
                    {/* Winning Variation */}
                    {campaign.vaultData.winningVariation && (
                      <div className="rounded-lg border border-border/20 bg-card/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                          <Hash className="h-2.5 w-2.5" />
                          Variation
                        </p>
                        <p className="text-[11px] text-foreground/80 line-clamp-2">{campaign.vaultData.winningVariation}</p>
                      </div>
                    )}
                  </div>

                  {/* Key Winning Elements */}
                  {campaign.vaultData.keyWinningElements && campaign.vaultData.keyWinningElements.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Award className="h-2.5 w-2.5 text-emerald-400" />
                        Key Winning Elements
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {campaign.vaultData.keyWinningElements.map((el, i) => (
                          <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0">
                            {el}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Score Breakdown + Calibration */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Rally Actual Score Breakdown */}
                    {campaign.vaultData.rallyActualBreakdown && Object.keys(campaign.vaultData.rallyActualBreakdown).length > 0 && (
                      <div className="rounded-lg border border-border/20 bg-card/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                          <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
                          Rally Score Breakdown
                        </p>
                        <div className="space-y-1">
                          {Object.entries(campaign.vaultData.rallyActualBreakdown).map(([dim, score]) => (
                            <div key={dim} className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-muted-foreground truncate capitalize">{dim.replace(/_/g, ' ')}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="h-1 w-12 rounded-full bg-muted/30">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{ width: `${(score / 3) * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono font-medium text-emerald-400 w-5 text-right">{Number(score).toFixed(1)}</span>
                              </div>
                            </div>
                          ))}
                          {campaign.vaultData.rallyActualScore != null && (
                            <div className="flex items-center justify-between gap-2 pt-1 mt-1 border-t border-border/20">
                              <span className="text-[10px] font-medium">Total</span>
                              <span className="text-[11px] font-mono font-bold text-emerald-400">{campaign.vaultData.rallyActualScore}/18</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Calibration Panel */}
                    {campaign.vaultData.calibration && (campaign.vaultData.calibration.internalScore != null || campaign.vaultData.calibration.rallyScore != null) && (
                      <div className="rounded-lg border border-border/20 bg-card/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Target className="h-2.5 w-2.5 text-blue-400" />
                          Calibration
                        </p>
                        <div className="space-y-1.5">
                          {campaign.vaultData.calibration.internalScore != null && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Internal Score</span>
                              <span className="text-[10px] font-mono font-medium">{campaign.vaultData.calibration.internalScore}/18</span>
                            </div>
                          )}
                          {campaign.vaultData.calibration.rallyScore != null && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Rally Actual</span>
                              <span className="text-[10px] font-mono font-medium text-emerald-400">{campaign.vaultData.calibration.rallyScore}/18</span>
                            </div>
                          )}
                          {campaign.vaultData.calibration.gap != null && campaign.vaultData.calibration.gap !== 0 && (
                            <div className="flex items-center justify-between pt-1 mt-1 border-t border-border/20">
                              <span className="text-[10px] text-muted-foreground">Gap</span>
                              <Badge className={`text-[10px] px-1.5 py-0 ${Math.abs(campaign.vaultData.calibration.gap) <= 1 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : Math.abs(campaign.vaultData.calibration.gap) <= 2 ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}`}>
                                {campaign.vaultData.calibration.gap > 0 ? '+' : ''}{campaign.vaultData.calibration.gap}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Score Distribution */}
                    {campaign.vaultData.scoreDistributionObserved && (
                      <div className="rounded-lg border border-border/20 bg-card/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                          <BookOpen className="h-2.5 w-2.5 text-amber-400" />
                          Score Distribution
                        </p>
                        <div className="space-y-1.5">
                          {campaign.vaultData.scoreDistributionObserved.submissionsAnalyzed != null && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Submissions Analyzed</span>
                              <span className="text-[10px] font-mono font-medium">{campaign.vaultData.scoreDistributionObserved.submissionsAnalyzed}</span>
                            </div>
                          )}
                          {campaign.vaultData.scoreDistributionObserved.avgScore != null && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Avg Score</span>
                              <span className="text-[10px] font-mono font-medium">{campaign.vaultData.scoreDistributionObserved.avgScore}/18</span>
                            </div>
                          )}
                          {campaign.vaultData.scoreDistributionObserved.hardestDimensions && campaign.vaultData.scoreDistributionObserved.hardestDimensions.length > 0 && (
                            <div>
                              <span className="text-[10px] text-muted-foreground">Hardest Dimensions</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {campaign.vaultData.scoreDistributionObserved.hardestDimensions.map((dim, i) => (
                                  <Badge key={i} className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] px-1.5 py-0">
                                    {dim}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Campaign Stats */}
                    {(campaign.vaultData.cyclesNeeded != null || campaign.vaultData.feedbackIterations != null || campaign.vaultData.qnaCount != null) && (
                      <div className="rounded-lg border border-border/20 bg-card/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Activity className="h-2.5 w-2.5 text-purple-400" />
                          Campaign Stats
                        </p>
                        <div className="space-y-1.5">
                          {campaign.vaultData.cyclesNeeded != null && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Cycles Needed</span>
                              <span className="text-[10px] font-mono font-medium">{campaign.vaultData.cyclesNeeded}</span>
                            </div>
                          )}
                          {campaign.vaultData.feedbackIterations != null && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Feedback Iterations</span>
                              <span className="text-[10px] font-mono font-medium">{campaign.vaultData.feedbackIterations}</span>
                            </div>
                          )}
                          {campaign.vaultData.qnaCount != null && campaign.vaultData.qnaCount > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">Q&A Generated</span>
                              <span className="text-[10px] font-mono font-medium">{campaign.vaultData.qnaCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Techniques: Worked vs Failed */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Techniques That Worked */}
                    {campaign.vaultData.techniquesThatWorked && campaign.vaultData.techniquesThatWorked.length > 0 && (
                      <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-2.5">
                        <p className="text-[10px] text-emerald-400 font-medium mb-1.5 flex items-center gap-1">
                          <TrendingUp className="h-2.5 w-2.5" />
                          Techniques That Worked
                        </p>
                        <div className="space-y-1">
                          {campaign.vaultData.techniquesThatWorked.map((t, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <ArrowRight className="h-2 w-2 text-emerald-400 mt-0.5 shrink-0" />
                              <span className="text-[10px] text-foreground/80">{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Techniques That Failed */}
                    {campaign.vaultData.techniquesThatFailed && campaign.vaultData.techniquesThatFailed.length > 0 && (
                      <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-2.5">
                        <p className="text-[10px] text-red-400 font-medium mb-1.5 flex items-center gap-1">
                          <TrendingDown className="h-2.5 w-2.5" />
                          Techniques That Failed
                        </p>
                        <div className="space-y-1">
                          {campaign.vaultData.techniquesThatFailed.map((t, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <XCircle className="h-2 w-2 text-red-400 mt-0.5 shrink-0" />
                              <span className="text-[10px] text-foreground/80">{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Techniques Validated by Rally */}
                  {campaign.vaultData.techniquesValidatedByRally && (
                    <div className="rounded-lg border border-border/20 bg-card/30 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 text-amber-400" />
                        Validated by Rally
                      </p>
                      <div className="space-y-2">
                        {campaign.vaultData.techniquesValidatedByRally.working && campaign.vaultData.techniquesValidatedByRally.working.length > 0 && (
                          <div>
                            <span className="text-[9px] text-emerald-400 font-medium uppercase tracking-wider">Confirmed Working</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {campaign.vaultData.techniquesValidatedByRally.working.map((t, i) => (
                                <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {campaign.vaultData.techniquesValidatedByRally.needsImprovement && campaign.vaultData.techniquesValidatedByRally.needsImprovement.length > 0 && (
                          <div>
                            <span className="text-[9px] text-amber-400 font-medium uppercase tracking-wider">Needs Improvement</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {campaign.vaultData.techniquesValidatedByRally.needsImprovement.map((t, i) => (
                                <Badge key={i} className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] px-1.5 py-0">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Overused Hooks */}
                  {campaign.vaultData.overusedHooksFound && campaign.vaultData.overusedHooksFound.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                        Overused Hooks Found
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {campaign.vaultData.overusedHooksFound.map((h, i) => (
                          <Badge key={i} className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] px-1.5 py-0">
                            {h}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Missions */}
              {campaign.missions.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Missions ({campaign.missions.length})
                  </p>
                  {campaign.missions.map(mission => (
                    <div
                      key={mission.id}
                      className="rounded-lg border border-border/30 bg-card/50 p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">Mission {mission.id}</span>
                        <Badge className="bg-muted/50 text-muted-foreground text-[10px] px-1.5 py-0">
                          {mission.status}
                        </Badge>
                        {mission.buildCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {mission.buildCount} build{mission.buildCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {mission.contentCount != null && mission.contentCount > 0 && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <Hash className="h-2.5 w-2.5" />
                            {mission.contentCount} content{mission.contentCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/80 mt-1">{mission.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {mission.directive}
                      </p>
                      {mission.reward && (
                        <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5" />
                          {mission.reward}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                  <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    No mission data available — data completeness: {campaign.dataCompleteness}%
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
