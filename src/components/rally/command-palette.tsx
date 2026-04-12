'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FileText, BarChart3, Brain, Users,
  MessageSquare, Clock, Sparkles, GraduationCap, Search,
  RefreshCw, Sun, Moon, Play, Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard, shortcut: '1' },
  { value: 'content', label: 'Content Lab', icon: FileText, shortcut: '2' },
  { value: 'scores', label: 'Scores', icon: BarChart3, shortcut: '3' },
  { value: 'knowledge', label: 'Knowledge', icon: Brain, shortcut: '4' },
  { value: 'competitors', label: 'Competitors', icon: Users, shortcut: '5' },
  { value: 'coach', label: 'AI Coach', icon: GraduationCap, shortcut: '6' },
  { value: 'generator', label: 'Generate', icon: Sparkles, shortcut: '7' },
  { value: 'campaigns', label: 'Campaigns', icon: Target, shortcut: '8' },
  { value: 'qna', label: 'Q&A Hub', icon: MessageSquare, shortcut: '9' },
  { value: 'timeline', label: 'Timeline', icon: Clock, shortcut: '0' },
]

const actions = [
  { label: 'Run Pipeline', icon: Play, action: 'pipeline', shortcut: 'G' },
  { label: 'Refresh Data', icon: RefreshCw, action: 'refresh', shortcut: 'R' },
  { label: 'Toggle Theme', icon: Sun, action: 'theme', shortcut: 'T' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (tab: string) => void
  onAction?: (action: string) => void
}

function CommandPaletteInner({ open, onClose, onNavigate, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus input and reset when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  const filteredTabs = useMemo(() =>
    tabs.filter(t => t.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  )

  const filteredActions = useMemo(() =>
    actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  )

  const allItems = useMemo(() => [
    ...filteredTabs.map(t => ({ ...t, type: 'tab' as const })),
    ...filteredActions.map(a => ({ ...a, type: 'action' as const })),
  ], [filteredTabs, filteredActions])

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleSelect = useCallback((item: typeof allItems[0]) => {
    if (item.type === 'tab') onNavigate(item.value)
    else onAction?.(item.action)
    onClose()
  }, [onNavigate, onAction, onClose])

  // Keyboard handling
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, allItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = allItems[selectedIndex]
        if (item) handleSelect(item)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, allItems, selectedIndex, handleSelect, onClose])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setSelectedIndex(0)
  }

  if (!open) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed inset-x-0 top-[15%] z-[101] mx-auto w-full max-w-lg px-4"
      >
        <div className="rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden">
          <div className="flex items-center gap-3 px-4 border-b border-border/50">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search tabs, actions..."
              className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border/60 bg-muted/50 px-1.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          <div ref={listRef} className="max-h-72 overflow-y-auto py-2 scrollbar-thin">
            {allItems.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No results found</p>
            )}

            {filteredTabs.length > 0 && (
              <div className="px-2 pb-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-2 py-1.5">
                  Navigation
                </p>
                {filteredTabs.map((tab, i) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.value}
                      onClick={() => handleSelect({ ...tab, type: 'tab' })}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                        selectedIndex === i
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'text-foreground hover:bg-muted/50'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', selectedIndex === i ? 'text-emerald-400' : 'text-muted-foreground')} />
                      <span className="text-sm flex-1">{tab.label}</span>
                      <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/40 bg-muted/30 px-1.5 font-mono text-[9px] text-muted-foreground">
                        Cmd+{tab.shortcut}
                      </kbd>
                    </button>
                  )
                })}
              </div>
            )}

            {filteredActions.length > 0 && filteredTabs.length > 0 && (
              <div className="h-px bg-border/40 mx-4 my-1" />
            )}

            {filteredActions.length > 0 && (
              <div className="px-2 pt-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-2 py-1.5">
                  Actions
                </p>
                {filteredActions.map((action, i) => {
                  const globalIdx = filteredTabs.length + i
                  const Icon = action.icon
                  return (
                    <button
                      key={action.action}
                      onClick={() => handleSelect({ ...action, type: 'action', value: action.action })}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                        selectedIndex === globalIdx
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'text-foreground hover:bg-muted/50'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', selectedIndex === globalIdx ? 'text-emerald-400' : 'text-muted-foreground')} />
                      <span className="text-sm flex-1">{action.label}</span>
                      <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/40 bg-muted/30 px-1.5 font-mono text-[9px] text-muted-foreground">
                        Cmd+{action.shortcut}
                      </kbd>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 px-4 py-2 border-t border-border/30 bg-muted/20">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <kbd className="inline-flex h-4 items-center rounded border border-border/40 bg-muted/30 px-1 font-mono text-[8px]">↑↓</kbd>
              Navigate
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <kbd className="inline-flex h-4 items-center rounded border border-border/40 bg-muted/30 px-1 font-mono text-[8px]">↵</kbd>
              Select
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <kbd className="inline-flex h-4 items-center rounded border border-border/40 bg-muted/30 px-1 font-mono text-[8px]">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </motion.div>
    </>
  )
}

export function CommandPalette(props: CommandPaletteProps) {
  return (
    <AnimatePresence>
      {props.open && <CommandPaletteInner key={String(props.open)} {...props} />}
    </AnimatePresence>
  )
}
