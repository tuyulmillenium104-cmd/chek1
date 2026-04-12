'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LayoutDashboard, FileText, BarChart3, Brain, Users, MessageSquare, Clock, Sparkles, GraduationCap, Search, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RallyHeader } from './rally-header'
import { DashboardStatsBar } from './dashboard-stats-bar'
import { OverviewTab } from './tabs/overview-tab'
import { ContentTab } from './tabs/content-tab'
import { ScoresTab } from './tabs/scores-tab'
import { KnowledgeTab } from './tabs/knowledge-tab'
import { CompetitorsTab } from './tabs/competitors-tab'
import { QnATab } from './tabs/qna-tab'
import { TimelineTab } from './tabs/timeline-tab'
import { RallyCoachTab } from './tabs/rally-coach-tab'
import { GeneratorTab } from './tabs/generator-tab'
import { CampaignsTab } from './tabs/campaigns-tab'
import { CommandPalette } from './command-palette'
import { QuickSettingsPanel } from './quick-settings'
import { SystemHealthIndicator } from './system-health-indicator'
import { CampaignDeadlineAlerts } from './campaign-deadline-alerts'

interface StatusData {
  campaign_status?: string
  campaign: {
    title: string
    status: string
    reward_pool: string
    deadline_countdown: string
    total_submissions: number
  }
  current_best: {
    score: number
    variation: string
    angle: string
  } | null
  pipeline: {
    status: string
    total_builds: number
  }
  campaign_avg: number
  last_updated: string
}

const tabVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
}

const tabTransition = { type: 'spring' as const, stiffness: 300, damping: 30 }

const tabTriggerClass = "gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 data-[state=active]:shadow-[0_0_8px_rgba(16,185,129,0.15)] transition-all duration-200 tab-active-indicator btn-press"

function FooterRelativeTime({ timestamp }: { timestamp: string }) {
  const [text, setText] = useState('just now')
  
  useEffect(() => {
    if (!timestamp) { const id = requestAnimationFrame(() => setText('—')); return () => cancelAnimationFrame(id) }
    const update = () => {
      try {
        const d = new Date(timestamp)
        const diff = Math.floor((Date.now() - d.getTime()) / 1000)
        if (diff < 10) setText('just now')
        else if (diff < 60) setText(`${Math.floor(diff / 10)}0s ago`)
        else if (diff < 3600) setText(`${Math.floor(diff / 60)}m ago`)
        else if (diff < 86400) setText(`${Math.floor(diff / 3600)}h ago`)
        else setText(`${Math.floor(diff / 86400)}d ago`)
      } catch { setText('—') }
    }
    update()
    const interval = setInterval(update, 10000)
    return () => clearInterval(interval)
  }, [timestamp])

  return <span>{text}</span>
}

export function RallyDashboard() {
  const [statusData, setStatusData] = useState<StatusData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [statsBarData, setStatsBarData] = useState<{
    campaignTitle: string
    campaignStatus: string
    totalBuilds: number
    bestScore: number
    avgScore: number
    cronJobsActive: number
  } | null>(null)
  const [pipelineBestScore, setPipelineBestScore] = useState<number>(0)
  const expiryToastShown = useRef(false)

  const fetchStatus = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const [statusRes, statsRes, campaignsRes] = await Promise.allSettled([
        fetch('/api/rally/status'),
        fetch('/api/rally/stats'),
        fetch('/api/rally/campaigns'),
      ])

      // Parse campaigns data for enriched stats
      let campaignsBestScore = 0
      let campaignsAvgScore = 0
      let activeCampaignTitle = ''
      let campaignScores: number[] = []
      let campaignsParsed: { campaigns?: Array<{ endDate?: string | null; isActive?: boolean; title: string }> } | null = null

      if (campaignsRes.status === 'fulfilled' && campaignsRes.value.ok) {
        try {
          const raw = await campaignsRes.value.json()
          campaignsParsed = raw
          const camps = raw.campaigns || []
          if (camps.length > 0) {
            // Find best score across all campaigns (max of bestScore)
            const scores = camps
              .map((c: { bestScore: number | null }) => c.bestScore)
              .filter((s: number | null): s is number => s != null)
            if (scores.length > 0) {
              campaignsBestScore = Math.max(...scores)
              campaignScores = scores
              campaignsAvgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
            }
            // Find first active campaign title
            const activeCamp = camps.find((c: { isActive: boolean }) => c.isActive)
            if (activeCamp) {
              activeCampaignTitle = activeCamp.title
            } else if (camps.length > 0) {
              activeCampaignTitle = camps[0].title
            }
          }
        } catch { /* ignore parse errors */ }
      }

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const data = await statusRes.value.json()
        setStatusData(data)
        setLastUpdated(new Date().toISOString())

        // Check for campaigns expiring within 24h — show warning toast once per session
        if (!expiryToastShown.current) {
          const camps = campaignsParsed?.campaigns || []
          const now = Date.now()
          const twentyFourHours = 24 * 60 * 60 * 1000
          const expiring = camps.filter((c: { endDate?: string | null; isActive?: boolean }) =>
            c.isActive && c.endDate && new Date(c.endDate).getTime() > now && new Date(c.endDate).getTime() <= now + twentyFourHours
          )
          if (expiring.length > 0) {
            expiryToastShown.current = true
            toast.warning('Campaign expiry warning', {
              description: `${expiring.length} campaign${expiring.length > 1 ? 's are' : ' is'} expiring within 24 hours. Check the Campaigns tab for details.`,
              duration: 8000,
            })
          }
        }

        // Now update stats bar with current data
        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          const stats = await statsRes.value.json()
          // Use pipeline scores when available, otherwise fall back to status API file-based data
          const effectiveBest = stats.bestPipelineScore > 0 ? stats.bestPipelineScore : (data.current_best?.score ?? campaignsBestScore)
          const effectiveAvg = stats.avgPipelineScore > 0 ? stats.avgPipelineScore : (data.campaign_avg ?? campaignsAvgScore)
          setPipelineBestScore(stats.bestPipelineScore || 0)
          setStatsBarData({
            campaignTitle: data.campaign?.title || activeCampaignTitle || (stats.campaignsWorked ? `${stats.campaignsWorked} campaigns` : 'N/A'),
            campaignStatus: data.campaign_status || data.campaign?.status || 'unknown',
            totalBuilds: stats.totalBuilds > 0 ? stats.totalBuilds : (data.pipeline?.total_builds ?? 0),
            bestScore: effectiveBest,
            avgScore: effectiveAvg,
            cronJobsActive: data.pipeline?.status === 'active' ? 1 : 0,
          })
        } else {
          // Stats failed but status and campaigns succeeded — use status API data as source
          setPipelineBestScore(0)
          setStatsBarData({
            campaignTitle: data.campaign?.title || activeCampaignTitle || 'N/A',
            campaignStatus: data.campaign_status || data.campaign?.status || 'unknown',
            totalBuilds: data.pipeline?.total_builds ?? 0,
            bestScore: data.current_best?.score ?? campaignsBestScore,
            avgScore: data.campaign_avg ?? campaignsAvgScore,
            cronJobsActive: data.pipeline?.status === 'active' ? 1 : 0,
          })
        }
      } else if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        // Status failed but stats succeeded — use pipeline stats
        const stats = await statsRes.value.json()
        const effectiveBest = stats.bestPipelineScore > 0 ? stats.bestPipelineScore : campaignsBestScore
        const effectiveAvg = stats.avgPipelineScore > 0 ? stats.avgPipelineScore : campaignsAvgScore
        setPipelineBestScore(stats.bestPipelineScore || 0)
        setStatsBarData({
          campaignTitle: activeCampaignTitle || (stats.campaignsWorked ? `${stats.campaignsWorked} campaigns` : 'N/A'),
          campaignStatus: 'unknown',
          totalBuilds: stats.totalBuilds > 0 ? stats.totalBuilds : 0,
          bestScore: effectiveBest,
          avgScore: effectiveAvg,
          cronJobsActive: 0,
        })
      } else if (campaignsRes.status === 'fulfilled' && campaignsRes.value.ok) {
        // Only campaigns succeeded
        setStatsBarData({
          campaignTitle: activeCampaignTitle || 'N/A',
          campaignStatus: 'unknown',
          totalBuilds: 0,
          bestScore: campaignsBestScore,
          avgScore: campaignsAvgScore,
          cronJobsActive: 0,
        })
      }
    } catch {
      // Only show toast on repeated failures (not first load)
      if (statusData) {
        toast.error('Failed to refresh status data')
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // Listen for settings open event from header
  useEffect(() => {
    const handler = () => setSettingsOpen(true)
    window.addEventListener('rally:open-settings', handler)
    return () => window.removeEventListener('rally:open-settings', handler)
  }, [])

  // Keyboard shortcuts — defined as module-level constant to avoid stale closure
  const TAB_KEYS: Record<string, { tab: string; label: string }> = {
    '1': { tab: 'overview', label: 'Overview' },
    '2': { tab: 'content', label: 'Content Lab' },
    '3': { tab: 'scores', label: 'Scores' },
    '4': { tab: 'knowledge', label: 'Knowledge' },
    '5': { tab: 'competitors', label: 'Competitors' },
    '6': { tab: 'coach', label: 'AI Coach' },
    '7': { tab: 'generator', label: 'Generate' },
    '8': { tab: 'campaigns', label: 'Campaigns' },
    '9': { tab: 'qna', label: 'Q&A Hub' },
    '0': { tab: 'timeline', label: 'Timeline' },
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return

      // Number keys 0-9
      const numKey = e.key
      if (numKey >= '0' && numKey <= '9') {
        const mapping = TAB_KEYS[numKey]
        if (mapping && activeTab !== mapping.tab) {
          e.preventDefault()
          setActiveTab(mapping.tab)
          toast.info(`Switched to ${mapping.label}`, { description: `Keyboard shortcut: Ctrl+${numKey}` })
        }
        return
      }

      // Ctrl/Cmd + k → Command Palette
      if (e.key === 'k') {
        e.preventDefault()
        setCmdOpen(true)
        return
      }

      // Ctrl/Cmd + g or n → Generate tab
      if ((e.key === 'g' || e.key === 'n') && activeTab !== 'generator') {
        e.preventDefault()
        setActiveTab('generator')
        toast.info('Switched to Generate', { description: `Keyboard shortcut: Ctrl+${e.key.toUpperCase()}` })
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab])

  const handlePaletteAction = useCallback((action: string) => {
    if (action === 'pipeline') {
      setActiveTab('generator')
      toast.info('Navigating to Generate tab', { description: 'Run pipeline from there' })
    } else if (action === 'refresh') {
      fetchStatus()
      toast.success('Data refreshed')
    } else if (action === 'theme') {
      document.documentElement.classList.toggle('dark')
      const isDark = document.documentElement.classList.contains('dark')
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
      toast.success(`Switched to ${isDark ? 'dark' : 'light'} mode`)
    }
  }, [fetchStatus])

  // Track pipeline best score separately for header ring
  // Updated inside fetchStatus alongside statsBarData
  const bestScore = pipelineBestScore > 0
    ? pipelineBestScore
    : (statusData?.current_best?.score ?? 0)
  const scorePct = (bestScore / 18) * 100
  const circumference = 2 * Math.PI * 18
  const dashOffset = circumference - (scorePct / 100) * circumference

  return (
    <div className="min-h-screen flex flex-col noise-bg">
      <div className="relative z-10 flex flex-col min-h-screen">
        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNavigate={setActiveTab} onAction={handlePaletteAction} />
        <QuickSettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
        <CampaignDeadlineAlerts />
        <RallyHeader
          statusData={statusData}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          bestScore={bestScore}
          scorePct={scorePct}
          circumference={circumference}
          dashOffset={dashOffset}
          onRefresh={fetchStatus}
          onGoToGenerate={() => setActiveTab('generator')}
        />

        {/* Dashboard Stats Bar */}
        <DashboardStatsBar
          statsData={statsBarData}
          loading={!statsBarData && isRefreshing}
        />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 md:px-6 pb-20 md:pb-4 relative">
          {/* Dynamic ambient glow — reacts to best score */}
          <div className={cn(
            'ambient-glow',
            bestScore >= 16 ? 'score-high' :
            bestScore >= 10 ? 'score-mid' :
            bestScore > 0 ? 'score-low' : 'score-none'
          )} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Desktop tab bar — hidden on mobile */}
            <div className="hidden md:block overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="bg-card/50 backdrop-blur border border-border/50 h-auto p-1 gap-1 w-full md:w-auto inline-flex shadow-sm">
                <TabsTrigger value="overview" className={tabTriggerClass}>
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="content" className={tabTriggerClass}>
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Content Lab</span>
                </TabsTrigger>
                <TabsTrigger value="scores" className={tabTriggerClass}>
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Scores</span>
                </TabsTrigger>
                <TabsTrigger value="knowledge" className={tabTriggerClass}>
                  <Brain className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Knowledge</span>
                </TabsTrigger>
                <TabsTrigger value="competitors" className={tabTriggerClass}>
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Competitors</span>
                </TabsTrigger>
                <TabsTrigger value="coach" className={tabTriggerClass}>
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">AI Coach</span>
                </TabsTrigger>
                <div className="relative">
                  <TabsTrigger value="generator" className={tabTriggerClass}>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Generate</span>
                  </TabsTrigger>
                  <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/20" />
                </div>
                <TabsTrigger value="campaigns" className={tabTriggerClass}>
                  <Target className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Campaigns</span>
                </TabsTrigger>
                <TabsTrigger value="qna" className={tabTriggerClass}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Q&A Hub</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className={tabTriggerClass}>
                  <Clock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Timeline</span>
                </TabsTrigger>
              </TabsList>
              <div className="hidden md:flex items-center gap-2 ml-3 shrink-0">
                <button
                  onClick={() => setCmdOpen(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-muted/30 border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60 hover:shadow-sm transition-all cursor-pointer group"
                  title="Search commands (⌘K / Ctrl+K)"
                >
                  <Search className="h-3 w-3" />
                  <span className="text-[11px]">Search...</span>
                  <kbd className="ml-2 h-4 inline-flex items-center rounded border border-border/40 bg-background/50 px-1 font-mono text-[9px] group-hover:border-emerald-500/30 transition-colors">⌘K</kbd>
                </button>
                <span className="kbd-hint" title="Ctrl+G to open Generate tab">⌘G</span>
              </div>
            </div>

            {/* Active tab content area with subtle card shadow */}
            <div className="mt-4 relative rounded-xl content-shadow">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={tabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={tabTransition}
                >
                  <TabsContent value="overview" className="mt-0"><OverviewTab onNavigate={setActiveTab} /></TabsContent>
                  <TabsContent value="content" className="mt-0"><ContentTab /></TabsContent>
                  <TabsContent value="scores" className="mt-0"><ScoresTab /></TabsContent>
                  <TabsContent value="knowledge" className="mt-0"><KnowledgeTab /></TabsContent>
                  <TabsContent value="competitors" className="mt-0"><CompetitorsTab /></TabsContent>
                  <TabsContent value="coach" className="mt-0"><RallyCoachTab /></TabsContent>
                  <TabsContent value="generator" className="mt-0"><GeneratorTab /></TabsContent>
                  <TabsContent value="campaigns" className="mt-0"><CampaignsTab /></TabsContent>
                  <TabsContent value="qna" className="mt-0"><QnATab /></TabsContent>
                  <TabsContent value="timeline" className="mt-0"><TimelineTab /></TabsContent>
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </main>

        {/* Mobile Bottom Navigation — scrollable pill bar with all 10 tabs */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" aria-label="Mobile navigation">
          <div className="border-t border-border/40 bg-card/80 backdrop-blur-xl safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center h-14 px-2 overflow-x-auto mobile-nav-scroll">
              {[
                { key: 'overview', label: 'Overview', Icon: LayoutDashboard },
                { key: 'content', label: 'Content', Icon: FileText },
                { key: 'scores', label: 'Scores', Icon: BarChart3 },
                { key: 'knowledge', label: 'Knowledge', Icon: Brain },
                { key: 'competitors', label: 'Compete', Icon: Users },
                { key: 'coach', label: 'Coach', Icon: GraduationCap },
                { key: 'generator', label: 'Generate', Icon: Sparkles, highlight: true },
                { key: 'campaigns', label: 'Campaigns', Icon: Target },
                { key: 'qna', label: 'Q&A', Icon: MessageSquare },
                { key: 'timeline', label: 'Timeline', Icon: Clock },
              ].map(({ key, label, Icon, highlight }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`mobile-nav-item ${activeTab === key ? 'active' : ''}`}
                  aria-label={label}
                  aria-current={activeTab === key ? 'page' : undefined}
                >
                  <div className="relative">
                    <Icon className="h-4 w-4" />
                    {highlight && (
                      <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[9px] font-medium leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <footer className="mt-auto hidden md:block">
          {/* Animated gradient separator line above footer */}
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/40 via-50% to-transparent" />
          <div className="h-px animate-footer-gradient" />
          <div className="border-t border-border/30 bg-card/30 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 border-emerald-500/20 text-emerald-400/70 bg-emerald-500/5 cursor-default" title="Rally Command Center v17.0 — Micro-Interactions + Dynamic Ambient + Polish">
                  v17.0
                </Badge>
                <span className="font-mono hidden sm:inline footer-gradient-text">Rally Command Center</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">10 Campaigns | Live API Sync</span>
                <span className="hidden lg:inline">·</span>
                <span className="font-mono hidden lg:inline flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  Last synced: <FooterRelativeTime timestamp={lastUpdated} />
                </span>
              </div>
              <div className="flex items-center gap-3">
                <SystemHealthIndicator />
                <span className="font-mono hidden sm:inline">18 APIs</span>
                <div className="flex items-center gap-1">
                  <TooltipProvider delayDuration={0}>
                    {Array.from({ length: 18 }).map((_, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-emerald-400 cursor-pointer transition-transform hover:scale-150"
                            style={{
                              animation: `wave 2s ease-in-out ${i * 0.1}s infinite`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] font-mono px-2 py-1">
                          API {i + 1} — OK {i < 3 ? '· ~120ms' : ''}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
