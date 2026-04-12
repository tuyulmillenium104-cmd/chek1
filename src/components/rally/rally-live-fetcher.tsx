'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Globe,
  RefreshCw,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  Target,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Loader2,
} from 'lucide-react'

interface LiveCampaign {
  rallyId: string
  contractAddress: string
  title: string
  creator: string
  xUsername: string
  avatarUrl: string
  creatorProfileUrl: string
  missionCount: number
  totalReward: number
  rewardTokens: string
  tokenSymbol: string
  tokenPrice: number | null
  startDate: string
  endDate: string
  isActive: boolean
  minimumFollowers: number
  onlyVerifiedUsers: boolean
  participating: boolean
  gasPaymentVerification: boolean
  headerImageUrl: string
  campaignUrl: string
  source: 'rally_live'
}

export interface CampaignDetail {
  contractAddress: string
  title: string
  goal: string
  knowledgeBase: string
  style: string
  rules: string[]
  missions: Array<{
    id: number
    title: string
    description: string
    rules: string[]
    active: boolean
    directive: string
    proposedAngles: string[]
    reward: string
  }>
  creator: string
  xUsername: string
  tokenSymbol: string
  totalReward: number
  rewardBreakdown: Array<{ amount: number; token: string; source: string }>
  startDate: string
  endDate: string
  minimumFollowers: number
  dataCompleteness: number
  headerImageUrl: string
}

function formatReward(amount: number, token: string): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M ${token}`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K ${token}`
  return `${amount.toLocaleString()} ${token}`
}

function formatDateString(dateStr: string): string {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function timeUntilEnd(endDate: string): string {
  const end = new Date(endDate).getTime()
  const now = Date.now()
  const diff = end - now
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h left`
  return '< 1h left'
}

function getRewardColor(token: string): string {
  const t = token.toUpperCase()
  if (t === 'RLP' || t === 'RALLY') return 'text-emerald-400'
  if (t === 'USDC' || t === 'USDT') return 'text-blue-400'
  if (t === 'ETH' || t === 'WETH') return 'text-purple-400'
  return 'text-amber-400'
}

/**
 * Main Rally Live Fetcher — renders the button AND panel as siblings.
 * Place this in the campaign list area (NOT in a tight toolbar flex).
 */
export function RallyLiveFetcher({ onImport }: { onImport: (detail: CampaignDetail) => void }) {
  const [liveCampaigns, setLiveCampaigns] = useState<LiveCampaign[]>([])
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, CampaignDetail>>({})
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'active' | 'ended'>('active')
  const [showPanel, setShowPanel] = useState(false)

  const fetchLiveCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rally/fetch-live?status=${statusFilter}`)
      if (!res.ok) {
        const err = await res.json()
        toast.error('Failed to fetch from Rally', { description: err.error || 'Unknown error' })
        return
      }
      const data = await res.json()
      setLiveCampaigns(data.campaigns || [])
      setLastFetched(data.fetchedAt)
      toast.success(`Fetched ${data.campaigns?.length || 0} campaigns from Rally`, {
        description: `${data.activeCount || 0} active, ${data.endedCount || 0} ended`,
      })
    } catch {
      toast.error('Network error', { description: 'Could not reach Rally API' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const fetchCampaignDetail = useCallback(async (campaign: LiveCampaign) => {
    if (detailCache[campaign.contractAddress]) {
      setExpandedId(prev => prev === campaign.contractAddress ? null : campaign.contractAddress)
      return
    }

    setDetailLoading(campaign.contractAddress)
    try {
      const res = await fetch(`/api/rally/fetch-campaign-detail?address=${campaign.contractAddress}`)
      if (!res.ok) {
        toast.error('Failed to load detail', { description: `Could not fetch detail for "${campaign.title}"` })
        return
      }
      const data = await res.json()
      setDetailCache(prev => ({ ...prev, [campaign.contractAddress]: data.campaign }))
      setExpandedId(campaign.contractAddress)
    } catch {
      toast.error('Network error loading detail')
    } finally {
      setDetailLoading(null)
    }
  }, [detailCache])

  const handleImport = useCallback((campaign: LiveCampaign) => {
    const detail = detailCache[campaign.contractAddress]
    if (!detail) {
      toast.error('Load detail first', { description: 'Click the campaign to fetch full details before importing' })
      return
    }
    onImport(detail)
    toast.success('Campaign data loaded!', {
      description: `"${detail.title}" data has been loaded into the Add Campaign form`,
    })
  }, [detailCache, onImport])

  return (
    <>
      {/* Trigger Button */}
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-[11px] gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
        onClick={() => {
          if (!showPanel) {
            setShowPanel(true)
            if (liveCampaigns.length === 0) fetchLiveCampaigns()
          } else {
            setShowPanel(false)
          }
        }}
      >
        <Globe className="h-3 w-3" />
        {showPanel ? 'Hide Live' : 'Rally Live'}
      </Button>

      {/* Live Campaigns Panel — renders below the toolbar */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/[0.03] via-card to-card mb-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        Rally Live Campaigns
                        {lastFetched && (
                          <span className="text-[9px] font-normal text-muted-foreground">
                            {new Date(lastFetched).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-[10px] mt-0.5">
                        Real-time from Rally API — click to load details &amp; import to database
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Status filter */}
                    <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
                      {(['active', 'ended'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => { setStatusFilter(s); setLiveCampaigns([]); setExpandedId(null) }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all duration-200 cursor-pointer ${
                            statusFilter === s
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {s === 'active' ? 'Active' : 'Ended'}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 px-2"
                      onClick={fetchLiveCampaigns}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPanel(false)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin mr-2" />
                    <span className="text-xs text-muted-foreground">Fetching from Rally.fun API...</span>
                  </div>
                ) : liveCampaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">No campaigns found. Try switching filter above.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 rally-live-scroll">
                    {liveCampaigns.map((campaign) => (
                      <LiveCampaignCard
                        key={campaign.contractAddress}
                        campaign={campaign}
                        isExpanded={expandedId === campaign.contractAddress}
                        isLoading={detailLoading === campaign.contractAddress}
                        detail={detailCache[campaign.contractAddress] || null}
                        onToggle={() => fetchCampaignDetail(campaign)}
                        onImport={() => handleImport(campaign)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function LiveCampaignCard({
  campaign,
  isExpanded,
  isLoading,
  detail,
  onToggle,
  onImport,
}: {
  campaign: LiveCampaign
  isExpanded: boolean
  isLoading: boolean
  detail: CampaignDetail | null
  onToggle: () => void
  onImport: () => void
}) {
  return (
    <div className="rounded-lg border border-border/40 hover:border-blue-500/30 transition-all duration-200 overflow-hidden">
      {/* Campaign Row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-2.5 text-left cursor-pointer hover:bg-muted/10 transition-colors"
      >
        {/* Avatar */}
        <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 bg-muted/30">
          {campaign.avatarUrl ? (
            <img src={campaign.avatarUrl} alt={campaign.creator} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Globe className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-[11px] font-medium truncate">{campaign.title}</h4>
            {campaign.isActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] text-muted-foreground truncate">
              by {campaign.creator}
            </span>
            <span className="text-muted-foreground/20">|</span>
            <span className={`text-[9px] font-medium ${getRewardColor(campaign.tokenSymbol)} shrink-0`}>
              {formatReward(campaign.totalReward, campaign.rewardTokens)}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              <Layers className="h-2.5 w-2.5 text-muted-foreground/60" />
              <span className="text-[9px] text-muted-foreground">{campaign.missionCount}</span>
            </div>
            <span className="text-[8px] text-muted-foreground">
              {campaign.isActive ? timeUntilEnd(campaign.endDate) : 'Ended'}
            </span>
          </div>
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
          ) : isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && !isLoading && detail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 px-3 py-2.5 space-y-2.5">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[8px] border-blue-500/30 text-blue-400 py-0">
                  <Shield className="h-2.5 w-2.5 mr-1" />
                  {campaign.minimumFollowers} min followers
                </Badge>
                {campaign.onlyVerifiedUsers && (
                  <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-400 py-0">
                    Verified only
                  </Badge>
                )}
                <Badge variant="outline" className="text-[8px] border-muted/50 text-muted-foreground py-0">
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  {formatDateString(campaign.startDate)} — {formatDateString(campaign.endDate)}
                </Badge>
                <Badge variant="outline" className="text-[8px] border-muted/50 text-muted-foreground py-0">
                  Data: {detail.dataCompleteness}%
                </Badge>
              </div>

              {/* Missions */}
              {detail.missions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Target className="h-2.5 w-2.5" />
                    Missions ({detail.missions.length})
                  </p>
                  {detail.missions.map((mission, idx) => (
                    <div key={idx} className="rounded-md border border-border/20 bg-muted/10 px-2.5 py-1.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-medium truncate">{mission.title}</p>
                        {mission.reward && (
                          <span className={`text-[9px] font-medium shrink-0 ml-2 ${getRewardColor(campaign.tokenSymbol)}`}>
                            {mission.reward}
                          </span>
                        )}
                      </div>
                      {mission.rules.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {mission.rules.slice(0, 3).map((rule, ri) => (
                            <span key={ri} className="text-[7px] text-muted-foreground bg-muted/30 rounded px-1 py-0.5 truncate max-w-[160px]">
                              {rule}
                            </span>
                          ))}
                          {mission.rules.length > 3 && (
                            <span className="text-[7px] text-muted-foreground">+{mission.rules.length - 3} more</span>
                          )}
                        </div>
                      )}
                      {mission.proposedAngles.length > 0 && (
                        <p className="text-[8px] text-emerald-400/70 truncate">
                          Angles: {mission.proposedAngles.slice(0, 2).join(' | ')}
                          {mission.proposedAngles.length > 2 && ` +${mission.proposedAngles.length - 2}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Data completeness grid */}
              <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                {[
                  { label: 'Goal', ok: !!detail.goal },
                  { label: 'Knowledge Base', ok: !!detail.knowledgeBase },
                  { label: 'Style', ok: !!detail.style },
                  { label: `Rules (${detail.rules.length})`, ok: detail.rules.length > 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1">
                    {item.ok
                      ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                      : <AlertTriangle className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                    }
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-0.5">
                <Button
                  size="sm"
                  className="h-6 text-[10px] gap-1 bg-blue-500 hover:bg-blue-600 text-white px-2.5"
                  onClick={(e) => { e.stopPropagation(); onImport() }}
                >
                  <Download className="h-2.5 w-2.5" />
                  Import to DB
                </Button>
                <a
                  href={campaign.campaignUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[9px] text-muted-foreground hover:text-blue-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  Open on Rally
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
