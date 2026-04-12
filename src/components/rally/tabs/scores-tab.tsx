'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts'
import { BarChart3, TrendingUp, AlertTriangle, Crown, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface ScoresData {
  score_distribution: { count: number; min: number; max: number; avg: number; score_18: number; score_17: number; score_16_plus: number; score_below_16: number }
  dimensions: { name: string; key: string; max: number; avg: number; max_seen: number; full_rate: string }[]
  top_performers: { username: string; score: number }[]
  near_perfect: { total: number; weakness_breakdown: { lost_originality_O1: number; lost_engagement_E4: number } }
  key_findings: { hardest_dimension: string; quality_differentiator: string; strongest_dimension: string; competition_level: string }
  cross_campaign: { prev_avg: number; current_avg: number; avg_change: number; conclusion: string }
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

// Gradient color stops for progress bars
const GRADIENT_COLORS = [
  { from: '#10b981', to: '#34d399' },
  { from: '#3b82f6', to: '#60a5fa' },
  { from: '#8b5cf6', to: '#a78bfa' },
  { from: '#f59e0b', to: '#fbbf24' },
  { from: '#ef4444', to: '#f87171' },
  { from: '#06b6d4', to: '#22d3ee' },
]

function useAnimatedCounter(target: number, decimals = 0, duration = 800) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  useEffect(() => {
    if (target === 0) return
    startRef.current = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(parseFloat((target * eased).toFixed(decimals)))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, decimals, duration])
  return current
}

const scoresCard = "bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl shadow-sm hover:border-emerald-500/25 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)] transition-all duration-300"

// ─── CSS-only Radar / Spider Chart ──────────────────────────────────────────

interface DimensionData {
  name: string
  key: string
  max: number
  avg: number
  max_seen: number
  full_rate: string
}

function CssRadarChart({ dimensions }: { dimensions: DimensionData[] }) {
  const [animated, setAnimated] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const size = 280
  const center = size / 2
  const maxRadius = size / 2 - 45 // leave room for labels

  const angles = useMemo(() => {
    const n = dimensions.length
    return dimensions.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2) // start from top
  }, [dimensions])

  // Calculate polygon points for current scores
  const currentPoints = useMemo(() => {
    if (!dimensions.length) return ''
    return dimensions.map((d, i) => {
      const pct = d.max > 0 ? Math.min(d.avg / d.max, 1) : 0
      const r = animated ? pct * maxRadius : 0
      const x = center + r * Math.cos(angles[i])
      const y = center + r * Math.sin(angles[i])
      return `${x},${y}`
    }).join(' ')
  }, [dimensions, angles, center, maxRadius, animated])

  // Calculate polygon points for target (max) scores
  const targetPoints = useMemo(() => {
    if (!dimensions.length) return ''
    return dimensions.map((_, i) => {
      const r = animated ? maxRadius : 0
      const x = center + r * Math.cos(angles[i])
      const y = center + r * Math.sin(angles[i])
      return `${x},${y}`
    }).join(' ')
  }, [dimensions, angles, center, maxRadius, animated])

  // Grid lines (concentric hexagons at 25%, 50%, 75%, 100%)
  const gridPolygons = useMemo(() => {
    const levels = [0.25, 0.5, 0.75, 1.0]
    return levels.map(level => {
      return dimensions.map((_, i) => {
        const r = level * maxRadius
        const x = center + r * Math.cos(angles[i])
        const y = center + r * Math.sin(angles[i])
        return `${x},${y}`
      }).join(' ')
    })
  }, [dimensions, angles, center, maxRadius])

  // Axis lines from center to each vertex
  const axisLines = useMemo(() => {
    return dimensions.map((_, i) => {
      const x = center + maxRadius * Math.cos(angles[i])
      const y = center + maxRadius * Math.sin(angles[i])
      return { x1: center, y1: center, x2: x, y2: y }
    })
  }, [dimensions, angles, center, maxRadius])

  // Label positions
  const labels = useMemo(() => {
    return dimensions.map((d, i) => {
      const labelR = maxRadius + 22
      const x = center + labelR * Math.cos(angles[i])
      const y = center + labelR * Math.sin(angles[i])
      const isTop = angles[i] < -Math.PI / 2 + 0.01 && angles[i] > -Math.PI / 2 - 0.01
      const isRight = Math.cos(angles[i]) > 0.1
      const isLeft = Math.cos(angles[i]) < -0.1

      return {
        name: d.name,
        x,
        y,
        anchor: isRight ? 'start' : isLeft ? 'end' : 'middle',
        avg: d.avg,
        max: d.max,
        pct: d.max > 0 ? Math.round((d.avg / d.max) * 100) : 0,
      }
    })
  }, [dimensions, angles, center, maxRadius])

  // SVG vertex dots for current scores
  const currentDots = useMemo(() => {
    return dimensions.map((d, i) => {
      const pct = d.max > 0 ? Math.min(d.avg / d.max, 1) : 0
      const r = animated ? pct * maxRadius : 0
      const x = center + r * Math.cos(angles[i])
      const y = center + r * Math.sin(angles[i])
      return { x, y, key: d.key }
    })
  }, [dimensions, angles, center, maxRadius, animated])

  return (
    <div ref={containerRef} className="relative inline-block" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity={0.05} />
          </linearGradient>
          <filter id="radarGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid polygons */}
        {gridPolygons.map((pts, idx) => (
          <polygon
            key={idx}
            points={pts}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, idx) => (
          <line
            key={idx}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Target polygon (max, dashed) */}
        <polygon
          points={targetPoints}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />

        {/* Current score polygon */}
        <polygon
          points={currentPoints}
          fill="url(#radarFillGrad)"
          stroke="rgb(16, 185, 129)"
          strokeWidth="2"
          strokeLinejoin="round"
          style={{
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          filter="url(#radarGlow)"
        />

        {/* Current score vertex dots */}
        {currentDots.map((dot, idx) => (
          <circle
            key={dot.key}
            cx={dot.x}
            cy={dot.y}
            r="3"
            fill="rgb(16, 185, 129)"
            stroke="white"
            strokeWidth="1.5"
            style={{
              transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transitionDelay: `${idx * 60}ms`,
            }}
          />
        ))}

        {/* Labels */}
        {labels.map((label) => (
          <g key={label.name}>
            <text
              x={label.x}
              y={label.y - 6}
              textAnchor={label.anchor}
              className="fill-foreground/70"
              style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'system-ui' }}
            >
              {label.name}
            </text>
            <text
              x={label.x}
              y={label.y + 7}
              textAnchor={label.anchor}
              className="fill-emerald-400"
              style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'monospace' }}
            >
              {label.avg.toFixed(1)}/{label.max} ({label.pct}%)
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-5 rounded-sm bg-emerald-500/30 border border-emerald-500" />
          <span className="text-[10px] text-muted-foreground">Current Avg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-5 rounded-sm border border-dashed border-foreground/20" />
          <span className="text-[10px] text-muted-foreground">Max Possible</span>
        </div>
      </div>
    </div>
  )
}

function GradientProgressBar({ pct, colorIndex, className }: { pct: number; colorIndex: number; className?: string }) {
  const grad = GRADIENT_COLORS[colorIndex % GRADIENT_COLORS.length]
  const id = `grad-bar-${colorIndex}`
  return (
    <div className={cn("h-2 rounded-full bg-muted/20 overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out relative"
        style={{ width: `${Math.min(pct, 100)}%` }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${grad.from}, ${grad.to})`,
            boxShadow: `0 0 8px ${grad.from}40`,
          }}
        />
      </div>
    </div>
  )
}

export function ScoresTab() {
  const [data, setData] = useState<ScoresData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rally/scores')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Animated counters (hooks must be called unconditionally)
  const animAvg = useAnimatedCounter(data?.score_distribution.avg ?? 0, 2)
  const animScore18 = useAnimatedCounter(data?.score_distribution.score_18 ?? 0)
  const animNearPerfect = useAnimatedCounter(data?.near_perfect?.total ?? 0)

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return <Card className="bg-card/50 border border-border/50 rounded-xl p-8 text-center"><p className="text-sm text-muted-foreground">Data unavailable</p></Card>
  }

  // Radar data
  const radarData = data.dimensions.map(d => ({
    dimension: d.name,
    max: d.max,
    our: d.avg,
    fullRate: parseFloat(d.full_rate) || 0,
  }))

  // Bar data
  const barData = data.dimensions.map(d => ({
    name: d.name,
    avg: d.avg,
    max: d.max,
    fill: COLORS[data.dimensions.indexOf(d) % COLORS.length],
  }))

  // Pie data
  const pieData = [
    { name: '18/18 Perfect', value: data.score_distribution.score_18, color: '#10b981' },
    { name: '17/18 Near-perfect', value: data.score_distribution.score_17, color: '#3b82f6' },
    { name: '16+ Good', value: data.score_distribution.score_16_plus - data.score_distribution.score_18 - data.score_distribution.score_17, color: '#8b5cf6' },
    { name: 'Below 16', value: data.score_distribution.score_below_16, color: '#f59e0b' },
  ].filter(d => d.value > 0)

  const customTooltipStyle = {
    backgroundColor: 'rgba(15,15,15,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#e5e7eb',
  }

  return (
    <div className="space-y-4">
      {/* Summary Row */}
      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px] rounded-xl pointer-events-none" />
        {[
          { label: 'Campaign Avg', value: data ? String(animAvg) : '—', sub: `${data.score_distribution.count} analyzed`, accent: false },
          { label: 'Score Range', value: `${data.score_distribution.min} - ${data.score_distribution.max}`, sub: 'out of 18', accent: false },
          { label: '18/18 Count', value: data ? String(animScore18) : '—', sub: data.key_findings.competition_level, accent: true },
          { label: '17/18 Count', value: data ? String(animNearPerfect) : '—', sub: `${data.near_perfect.weakness_breakdown.lost_engagement_E4} lost Engagement`, accent: false },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
          >
            <Card className={cn(scoresCard, "relative", card.accent && "hover:border-emerald-500/40 hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.2)]")}>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">{card.label}</p>
                <p className={cn("text-lg font-bold font-mono", card.accent ? "text-emerald-400" : "text-foreground")}>{card.value}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* CSS-Only Radar / Spider Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.5 }}
      >
        <Card className={scoresCard}>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <RadarChart className="h-4 w-4 text-emerald-400" />
              Score Dimension Radar (CSS)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-center">
              <CssRadarChart dimensions={data.dimensions} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className={scoresCard}>
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  6-Dimension Score Breakdown
                </CardTitle>
                <button
                  className="h-6 w-6 p-0 rounded-md hover:bg-muted/50 transition-all duration-300 flex items-center justify-center text-muted-foreground hover:text-foreground relative overflow-hidden group"
                  onClick={() => { toast.success('Exporting scores data...'); window.open('/api/rally/export?type=scores', '_blank') }}
                  title="Download CSV"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Download className="h-3.5 w-3.5 relative z-10" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: '#6b7280', fontSize: 9 }} domain={[0, 'auto']} />
                    <Radar name="Average" dataKey="our" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Max" dataKey="max" stroke="#6b7280" fill="#6b7280" fillOpacity={0.05} strokeWidth={1} strokeDasharray="4 4" />
                    <RechartsTooltip contentStyle={customTooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <Card className={scoresCard}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Category Averages
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" domain={[0, 'auto']} tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <RechartsTooltip contentStyle={customTooltipStyle} />
                    <Bar dataKey="avg" name="Avg" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
                    <Bar dataKey="max" name="Max" fill="rgba(16,185,129,0.2)" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className={scoresCard}>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-emerald-400" />
                Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={customTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dimension Details + Key Findings */}
        <div className="space-y-4">
          {/* Dimension Detail Cards */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <Card className={scoresCard}>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Dimension Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {data.dimensions.map((dim, i) => {
                      const pct = dim.max > 0 ? (dim.avg / dim.max) * 100 : 0
                      return (
                      <motion.div
                        key={dim.key}
                        whileHover={{ x: 4, scale: 1.01 }}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 backdrop-blur-sm border border-border/20 hover:border-emerald-500/15 hover:bg-muted/30 hover:shadow-[0_0_10px_-3px_rgba(16,185,129,0.08)] transition-all duration-200 cursor-default"
                      >
                        <div className={cn('h-2.5 w-2.5 rounded-full shrink-0 border')} style={{ backgroundColor: COLORS[i % COLORS.length], borderColor: `${COLORS[i % COLORS.length]}40` }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium">{dim.name}</span>
                          </div>
                          <div className="mt-1">
                            <GradientProgressBar pct={pct} colorIndex={i} />
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">max {dim.max}</span>
                        <span className="text-[11px] font-bold font-mono">{dim.avg.toFixed(2)}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{dim.full_rate}</Badge>
                      </motion.div>
                    )})}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          {/* Key Findings */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Card className={scoresCard}>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Key Findings
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground shrink-0 w-16 font-medium">Hardest</span>
                  <span className="text-[11px] text-foreground/80">{data.key_findings.hardest_dimension}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground shrink-0 w-16 font-medium">Quality</span>
                  <span className="text-[11px] text-foreground/80">{data.key_findings.quality_differentiator}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground shrink-0 w-16 font-medium">Strongest</span>
                  <span className="text-[11px] text-foreground/80">{data.key_findings.strongest_dimension}</span>
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-emerald-400 shrink-0 w-16 font-medium">vs Prev</span>
                  <span className="text-[11px] text-foreground/80">{data.cross_campaign.conclusion}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Top Performers */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
      >
        <Card className={scoresCard}>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4 text-emerald-400" />
              Top Performers (18/18)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {data.top_performers.map((p, i) => (
                <motion.div
                  key={p.username}
                  whileHover={{ y: -3, scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                  className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 text-center hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] cursor-default"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-500/15 mx-auto mb-1.5 flex items-center justify-center">
                    <Crown className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[11px] font-semibold font-mono truncate">{p.username}</p>
                  <p className="text-sm font-bold font-mono text-emerald-400">{p.score}/18</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
