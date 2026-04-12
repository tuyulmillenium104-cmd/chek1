'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  Settings,
  Sun,
  Moon,
  RefreshCw,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
  Layers,
  RotateCcw,
  Gauge,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

/* ── Settings Types ── */

interface DashboardSettings {
  autoRefreshInterval: number // seconds: 0 (off), 30, 60, 120
  compactMode: boolean
  showActivityFeed: boolean
  defaultVariations: number // 2-5
  defaultFeedbackLoops: number // 1-3
  animationSpeed: 'normal' | 'reduced' | 'off'
}

const DEFAULT_SETTINGS: DashboardSettings = {
  autoRefreshInterval: 60,
  compactMode: false,
  showActivityFeed: true,
  defaultVariations: 3,
  defaultFeedbackLoops: 2,
  animationSpeed: 'normal',
}

const STORAGE_KEY = 'rally-dashboard-settings'

function loadSettings(): DashboardSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: DashboardSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

/* ── Props ── */

interface QuickSettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/* ── Toggle Switch Component ── */

function ToggleSwitch({ checked, onCheckedChange, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer shrink-0',
        checked ? 'bg-emerald-500' : 'bg-muted',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <motion.div
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
        animate={{ left: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

/* ── Main Component ── */

export function QuickSettingsPanel({ open, onOpenChange }: QuickSettingsPanelProps) {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true)
      setSettings(loadSettings())
    })
  }, [])

  const updateSetting = useCallback(<K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
  }, [])

  const handleThemeToggle = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    toast.success(`Switched to ${newTheme} mode`)
  }, [theme, setTheme])

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
    toast.success('Settings reset to defaults')
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          <SheetHeader className="relative p-6 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Settings className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">Dashboard Settings</SheetTitle>
                <SheetDescription className="text-[10px]">
                  Customize your dashboard experience
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        <Separator className="opacity-50" />

        <div className="p-6 space-y-6">
          {/* ── Appearance ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Appearance
            </p>

            {/* Theme Toggle */}
            <div className="rounded-lg border border-border/30 bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {mounted && theme === 'dark' ? (
                    <Moon className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-400" />
                  )}
                  <div>
                    <Label className="text-xs font-medium cursor-default">Theme</Label>
                    <p className="text-[10px] text-muted-foreground">
                      {mounted ? (theme === 'dark' ? 'Dark mode active' : 'Light mode active') : 'Loading...'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 gap-1.5 text-xs border-border/50',
                    !mounted && 'opacity-50'
                  )}
                  onClick={handleThemeToggle}
                  disabled={!mounted}
                >
                  {mounted && theme === 'dark' ? (
                    <>
                      <Sun className="h-3 w-3" />
                      Light
                    </>
                  ) : (
                    <>
                      <Moon className="h-3 w-3" />
                      Dark
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Compact Mode */}
            <div className="rounded-lg border border-border/30 bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {settings.compactMode ? (
                    <List className="h-4 w-4 text-amber-400" />
                  ) : (
                    <LayoutGrid className="h-4 w-4 text-emerald-400" />
                  )}
                  <div>
                    <Label className="text-xs font-medium cursor-default">Compact Mode</Label>
                    <p className="text-[10px] text-muted-foreground">
                      {settings.compactMode
                        ? 'Minimal cards, hide descriptions'
                        : 'Full cards with descriptions'}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.compactMode}
                  onCheckedChange={(v) => {
                    updateSetting('compactMode', v)
                    toast.success(v ? 'Compact mode enabled' : 'Full mode enabled')
                  }}
                />
              </div>
            </div>

            {/* Animation Speed */}
            <div className="rounded-lg border border-border/30 bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Gauge className="h-4 w-4 text-emerald-400" />
                  <div>
                    <Label className="text-xs font-medium cursor-default">Animation Speed</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Control motion and transition effects
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={settings.animationSpeed}
                    onChange={(e) => {
                      const val = e.target.value as DashboardSettings['animationSpeed']
                      updateSetting('animationSpeed', val)
                      toast.success(`Animation speed: ${val}`)
                    }}
                    className="h-8 rounded-md border border-border/50 bg-background/50 px-3 pr-7 text-xs focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="reduced">Reduced</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Data ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Data
            </p>

            {/* Auto Refresh */}
            <div className="rounded-lg border border-border/30 bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <RefreshCw className={cn('h-4 w-4', settings.autoRefreshInterval > 0 ? 'text-emerald-400' : 'text-muted-foreground')} />
                  <div>
                    <Label className="text-xs font-medium cursor-default">Auto-Refresh Interval</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Automatically refresh dashboard data
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={settings.autoRefreshInterval}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      updateSetting('autoRefreshInterval', val)
                      toast.success(val === 0 ? 'Auto-refresh disabled' : `Auto-refresh every ${val}s`)
                    }}
                    className="h-8 rounded-md border border-border/50 bg-background/50 px-3 pr-7 text-xs focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value={0}>Off</option>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                    <option value={120}>120s</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Show Activity Feed */}
            <div className="rounded-lg border border-border/30 bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {settings.showActivityFeed ? (
                    <Eye className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <Label className="text-xs font-medium cursor-default">Show Activity Feed</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Display activity feed in the dashboard
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.showActivityFeed}
                  onCheckedChange={(v) => {
                    updateSetting('showActivityFeed', v)
                    toast.success(v ? 'Activity feed shown' : 'Activity feed hidden')
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Pipeline Defaults ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Pipeline Defaults
            </p>
            <div className="rounded-lg border border-border/30 bg-card/50 p-4 space-y-4">
              {/* Default Variations */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <div>
                    <Label className="text-xs font-medium cursor-default">Default Variations</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Number of content variations per run (2-5)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => updateSetting('defaultVariations', n)}
                      className={cn(
                        'h-7 w-8 rounded-md text-[11px] font-mono transition-all cursor-pointer',
                        settings.defaultVariations === n
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-muted/30 text-muted-foreground border border-border/30 hover:border-border/50'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="opacity-30" />

              {/* Default Feedback Loops */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="h-4 w-4 text-amber-400" />
                  <div>
                    <Label className="text-xs font-medium cursor-default">Default Feedback Loops</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Max feedback loops per pipeline (1-3)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => updateSetting('defaultFeedbackLoops', n)}
                      className={cn(
                        'h-7 w-8 rounded-md text-[11px] font-mono transition-all cursor-pointer',
                        settings.defaultFeedbackLoops === n
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-muted/30 text-muted-foreground border border-border/30 hover:border-border/50'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Reset ── */}
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={handleReset}
            >
              <Zap className="h-3 w-3" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ── Export hook for reading settings ── */

export function useDashboardSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => {
      setSettings(loadSettings())
      setMounted(true)
    })
  }, [])

  const updateSetting = useCallback(<K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
  }, [])

  return { settings, mounted, updateSetting }
}
