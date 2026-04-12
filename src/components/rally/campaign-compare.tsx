'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitCompareArrows,
  ArrowLeft,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  X,
  Target,
  Crosshair,
  Sparkles,
  Database,
  Award,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Re-use the Campaign & VaultData types from campaigns-tab
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
}

interface Mission {
  id: number
  title: string
  directive: string
  reward: string
  status: string
  buildCount: number
}

interface Campaign {
  id: string
  title: string
  contractAddress: string
  creator: string
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
}

// --- Diff indicator ---
function DiffIndicator({ a, b, label, invert = false }: { a: number | null | undefined; b: number | null | undefined; label: string; invert?: boolean }) {
  const valA = a ?? 0
  const valB = b ?? 0
  const diff = valA - valB
  const pctDiff = valB !== 0 ? ((diff / valB) * 100).toFixed(1) : '—'

  if (diff === 0) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-foreground">{valA}</span>
          <Minus className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-[10px] font-mono text-foreground">{valB}</span>
          <Badge variant="outline" className="text-[8px] px-1 py-0 text-muted-foreground border-muted-foreground/30 ml-1">
            0%
          </Badge>
        </div>
      </div>
    )
  }

  const isPositive = invert ? diff < 0 : diff > 0

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-mono text-foreground">{valA}</span>
        <Minus className="h-2.5 w-2.5 text-muted-foreground" />
        <span className="text-[10px] font-mono text-foreground">{valB}</span>
        <Badge
          variant="outline"
          className={cn(
            'text-[8px] px-1 py-0 ml-1',
            isPositive
              ? 'text-emerald-400 border-emerald-500/30'
              : 'text-red-400 border-red-500/30'
          )}
        >
          {isPositive ? '+' : ''}{pctDiff}%
        </Badge>
      </div>
    </div>
  )
}

// --- Bar comparison ---
function BarCompare({ a, b, max, label }: { a: number | null | undefined; b: number | null | undefined; max: number; label: string }) {
  const valA = a ?? 0
  const valB = b ?? 0
  const pctA = (valA / max) * 100
  const pctB = (valB / max) * 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2 text-[9px] font-mono">
          <span className={cn(valA >= valB ? 'text-emerald-400' : 'text-muted-foreground')}>{valA}</span>
          <span className="text-muted-foreground">vs</span>
          <span className={cn(valB >= valA ? 'text-emerald-400' : 'text-muted-foreground')}>{valB}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500/70 rounded-l-full transition-all duration-500"
            style={{ width: `${pctA}%` }}
          />
        </div>
        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-amber-500/70 rounded-r-full transition-all duration-500"
            style={{ width: `${pctB}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// --- Campaign column ---
function CampaignColumn({ campaign, side }: { campaign: Campaign | null; side: 'A' | 'B' }) {
  if (!campaign) {
    return (
      <div className="flex-1 bg-muted/5 rounded-lg border border-dashed border-border/30 p-4 flex items-center justify-center min-h-[200px]">
        <p className="text-[11px] text-muted-foreground text-center">
          Select a campaign for side {side}
        </p>
      </div>
    )
  }

  const v = campaign.vaultData
  const color = side === 'A' ? 'emerald' : 'amber'
  const colorClass = color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'
  const bgClass = color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'

  return (
    <div className={cn('flex-1 rounded-lg border p-3 space-y-3', bgClass)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Badge className={cn('text-[9px] px-1.5 py-0', bgClass)}>
          {side}
        </Badge>
        <h4 className="text-xs font-semibold truncate flex-1">{campaign.title}</h4>
      </div>

      {/* Core metrics */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Status</span>
          <Badge className={cn(
            'text-[9px] px-1.5 py-0',
            campaign.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-500/20 text-zinc-400'
          )}>
            {campaign.isActive ? 'Active' : 'Ended'}
          </Badge>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Best Score</span>
          <span className={cn('font-mono font-bold', campaign.bestScore !== null && campaign.bestScore >= 16 ? colorClass : 'text-foreground')}>
            {campaign.bestScore !== null ? `${campaign.bestScore}/18` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Reward</span>
          <span className="font-mono text-foreground">{campaign.rewardPool || 'N/A'}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Missions</span>
          <span className="font-mono text-foreground">{campaign.totalMissions}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Data Completeness</span>
          <span className={cn('font-mono', campaign.dataCompleteness >= 75 ? colorClass : 'text-amber-400')}>
            {campaign.dataCompleteness}%
          </span>
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Vault data */}
      <div className="space-y-1.5">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Vault Data</p>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Rally Score</span>
          <span className={cn('font-mono', v?.rallyActualScore != null ? colorClass : 'text-muted-foreground')}>
            {v?.rallyActualScore != null ? `${v.rallyActualScore}/18` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">18/18 Achieved</span>
          {v?.achieved18_18 ? (
            <Trophy className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <span className="text-muted-foreground text-[10px]">No</span>
          )}
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Winning Angle</span>
          <span className="text-foreground text-[10px] text-right max-w-[120px] truncate">
            {v?.winningAngle || 'N/A'}
          </span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Winning Hook</span>
          <span className="text-foreground text-[10px] text-right max-w-[120px] truncate">
            {v?.winningHook || 'N/A'}
          </span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Techniques</span>
          <span className="font-mono text-foreground">
            {(v?.techniquesThatWorked?.length ?? 0)} working
          </span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Calibration Gap</span>
          <span className="font-mono text-foreground">
            {v?.calibration?.gap != null ? `${v.calibration.gap.toFixed(1)}` : 'N/A'}
          </span>
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Score Breakdown */}
      {v?.rallyActualBreakdown && Object.keys(v.rallyActualBreakdown).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Score Breakdown</p>
          {Object.entries(v.rallyActualBreakdown).map(([dim, score]) => (
            <div key={dim} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-20 truncate">{dim}</span>
              <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    score >= 2.5 ? 'bg-emerald-500' : score >= 1.5 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${(score / 3) * 100}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-foreground w-6 text-right">{score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mission */}
      {campaign.missions[0] && (
        <>
          <Separator className="bg-border/30" />
          <div className="space-y-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Mission</p>
            <p className="text-[10px] text-foreground font-medium">{campaign.missions[0].title}</p>
            <p className="text-[9px] text-muted-foreground line-clamp-3">{campaign.missions[0].directive}</p>
          </div>
        </>
      )}
    </div>
  )
}

// --- Main Compare View ---
export function CampaignCompareView({
  campaigns,
  onClose,
}: {
  campaigns: Campaign[]
  onClose: () => void
}) {
  const [selectedA, setSelectedA] = useState<Campaign | null>(null)
  const [selectedB, setSelectedB] = useState<Campaign | null>(null)

  // Auto-select first two if available
  const handleAutoSelect = () => {
    if (!selectedA && campaigns.length >= 1) setSelectedA(campaigns[0])
    if (!selectedB && campaigns.length >= 2) setSelectedB(campaigns[1])
  }

  const canCompare = selectedA && selectedB
  const vA = selectedA?.vaultData
  const vB = selectedB?.vaultData

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Header */}
      <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-card to-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2 flex-1">
              <GitCompareArrows className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold">Campaign Comparison</h3>
            </div>
          </div>

          {/* Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Campaign A</label>
              <select
                value={selectedA?.id || ''}
                onChange={(e) => setSelectedA(campaigns.find(c => c.id === e.target.value) || null)}
                className="w-full h-8 rounded-lg border border-border/40 bg-background/50 px-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value="">Select campaign...</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.isActive ? '(Active)' : '(Ended)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Campaign B</label>
              <select
                value={selectedB?.id || ''}
                onChange={(e) => setSelectedB(campaigns.find(c => c.id === e.target.value) || null)}
                className="w-full h-8 rounded-lg border border-border/40 bg-background/50 px-3 text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
              >
                <option value="">Select campaign...</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.isActive ? '(Active)' : '(Ended)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedA && !selectedB && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-emerald-400 hover:text-emerald-300 text-xs h-7"
              onClick={handleAutoSelect}
            >
              Auto-select first two campaigns
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Side by side columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CampaignColumn campaign={selectedA} side="A" />
        <CampaignColumn campaign={selectedB} side="B" />
      </div>

      {/* Comparison analysis */}
      {canCompare && (
        <Card className="border-border/30">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-400" />
              Comparison Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Score comparison bars */}
            <div className="space-y-2.5">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Score Metrics</p>
              <BarCompare
                a={selectedA.bestScore}
                b={selectedB.bestScore}
                max={18}
                label="Best Score"
              />
              <BarCompare
                a={vA?.rallyActualScore}
                b={vB?.rallyActualScore}
                max={18}
                label="Rally Actual Score"
              />
              <BarCompare
                a={vA?.calibration?.internalScore}
                b={vB?.calibration?.internalScore}
                max={18}
                label="Calibration Internal"
              />
            </div>

            <Separator className="bg-border/30" />

            {/* Dimension diffs */}
            <div className="space-y-2">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Score Breakdown Diff</p>
              {vA?.rallyActualBreakdown && vB?.rallyActualBreakdown && (
                <div>
                  {Object.keys({ ...vA.rallyActualBreakdown, ...vB.rallyActualBreakdown }).map(dim => {
                    const scoreA = vA.rallyActualBreakdown?.[dim]
                    const scoreB = vB.rallyActualBreakdown?.[dim]
                    if (scoreA == null && scoreB == null) return null
                    return (
                      <BarCompare
                        key={dim}
                        a={scoreA}
                        b={scoreB}
                        max={3}
                        label={dim}
                      />
                    )
                  })}
                </div>
              )}
              {(!vA?.rallyActualBreakdown || !vB?.rallyActualBreakdown) && (
                <p className="text-[10px] text-muted-foreground italic">
                  Score breakdown not available for one or both campaigns
                </p>
              )}
            </div>

            <Separator className="bg-border/30" />

            {/* Data completeness */}
            <div className="space-y-2">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Data Completeness</p>
              <DiffIndicator a={selectedA.dataCompleteness} b={selectedB.dataCompleteness} label="Completeness %" />
              <DiffIndicator a={vA?.techniquesThatWorked?.length} b={vB?.techniquesThatWorked?.length} label="Working Techniques" />
              <DiffIndicator a={vA?.techniquesThatFailed?.length} b={vB?.techniquesThatFailed?.length} label="Failed Techniques" invert />
              <DiffIndicator a={selectedA.totalMissions} b={selectedB.totalMissions} label="Total Missions" />
            </div>

            <Separator className="bg-border/30" />

            {/* Winning angles comparison */}
            <div className="space-y-2">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Winning Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[9px] text-emerald-400 font-medium">Campaign A</p>
                  <p className="text-[10px] text-foreground">{vA?.winningAngle || 'No winning angle'}</p>
                  <p className="text-[10px] text-muted-foreground">{vA?.winningHook || 'No winning hook'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-amber-400 font-medium">Campaign B</p>
                  <p className="text-[10px] text-foreground">{vB?.winningAngle || 'No winning angle'}</p>
                  <p className="text-[10px] text-muted-foreground">{vB?.winningHook || 'No winning hook'}</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
              <p className="text-[10px] text-emerald-400 font-semibold mb-1">Quick Verdict</p>
              <p className="text-[10px] text-foreground/80 leading-relaxed">
                {(selectedA.bestScore ?? 0) > (selectedB.bestScore ?? 0) ? (
                  <><span className="font-semibold">{selectedA.title}</span> has the higher best score ({selectedA.bestScore ?? 'N/A'} vs {selectedB.bestScore ?? 'N/A'}). </>
                ) : (selectedB.bestScore ?? 0) > (selectedA.bestScore ?? 0) ? (
                  <><span className="font-semibold">{selectedB.title}</span> has the higher best score ({selectedB.bestScore ?? 'N/A'} vs {selectedA.bestScore ?? 'N/A'}). </>
                ) : (
                  <>Both campaigns have the same best score ({selectedA.bestScore ?? 'N/A'}). </>
                )}
                Data completeness is {selectedA.dataCompleteness > selectedB.dataCompleteness ? 'higher' : selectedA.dataCompleteness < selectedB.dataCompleteness ? 'lower' : 'equal'} for {selectedA.title}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
