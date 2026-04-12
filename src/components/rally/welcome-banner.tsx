'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, BarChart3, Search, GraduationCap, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Sparkles,
    title: 'AI Pipeline',
    description: 'Generate content with 5-judge scoring panel',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
  },
  {
    icon: BarChart3,
    title: '6-Dimension Analysis',
    description: 'Track scores across Relevance, Clarity, Originality, Engagement, Value, Compliance',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
  },
  {
    icon: Search,
    title: 'Competitive Intel',
    description: 'Monitor competitors and find content gaps',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
  },
  {
    icon: GraduationCap,
    title: 'AI Coach',
    description: 'Get real-time writing feedback and score predictions',
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
  },
]

const shortcuts = [
  { keys: 'Cmd+1-9', label: 'Switch tabs' },
  { keys: 'Cmd+K', label: 'Command palette' },
  { keys: 'Cmd+G', label: 'Generate content' },
]

interface WelcomeBannerProps {
  visible: boolean
  onDismiss: () => void
  onNavigate?: (tab: string) => void
}

export function WelcomeBanner({ visible, onDismiss, onNavigate }: WelcomeBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative"
        >
          <div className="bg-gradient-to-br from-emerald-500/10 via-card/80 to-teal-500/10 backdrop-blur-xl border border-emerald-500/10 rounded-2xl p-5 md:p-6 overflow-hidden rally-card-glow">
            {/* Decorative gradient orbs */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-teal-500/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 z-10 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
              aria-label="Dismiss welcome banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Welcome message */}
            <div className="relative z-10 mb-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 bg-clip-text text-transparent">
                  Welcome to Rally Command Center
                </h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                Your all-in-one dashboard for creating high-scoring Rally content.
                Explore the features below or dive right in.
              </p>
            </div>

            {/* Feature highlight cards */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 rounded-xl bg-card/50 border border-border/30 p-3 hover:border-emerald-500/20 shine-sweep rally-hover-lift transition-all duration-200 cursor-default"
                >
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0 feature-icon-glow', feature.bg)}>
                    <feature.icon className={cn('h-4 w-4', feature.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{feature.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Keyboard shortcuts */}
            <div className="relative z-10 mb-5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2.5">
                Keyboard Shortcuts
              </p>
              <div className="flex flex-wrap gap-2.5">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 border-border/50 text-muted-foreground">
                      {shortcut.keys}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{shortcut.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Get Started button */}
            <div className="relative z-10 flex items-center gap-3">
              <Button
                onClick={() => { onDismiss(); onNavigate?.('generator'); }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-5 py-2 rounded-lg shadow-[0_0_16px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-200 btn-press"
              >
                <Sparkles className="h-3 w-3 mr-1.5" />
                Run Your First Pipeline
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-[11px] text-muted-foreground hover:text-foreground btn-press"
              >
                Explore Dashboard
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
