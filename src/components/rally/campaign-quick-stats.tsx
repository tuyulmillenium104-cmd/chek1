'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Target,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Database,
  BarChart3,
} from 'lucide-react'

interface CampaignSummary {
  id: string
  title: string
  isActive: boolean
  dataCompleteness: number
  vaultData?: Record<string, unknown> | null
}

interface QuickStats {
  total: number
  active: number
  ended: number
  avgCompleteness: number
  withVaultData: number
}

export function CampaignQuickStats() {
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/rally/campaigns')
        if (res.ok) {
          const data = await res.json()
          const campaigns: CampaignSummary[] = data.campaigns || []
          const active = campaigns.filter(c => c.isActive).length
          const ended = campaigns.length - active
          const avgCompleteness = campaigns.length > 0
            ? Math.round(campaigns.reduce((sum: number, c: CampaignSummary) => sum + (c.dataCompleteness || 0), 0) / campaigns.length)
            : 0
          const withVaultData = campaigns.filter(c => !!c.vaultData).length

          setStats({ total: campaigns.length, active, ended, avgCompleteness, withVaultData })
        }
      } catch {
        // silently fail, show nothing
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !stats || stats.total === 0) return null

  const statItems = [
    {
      icon: BarChart3,
      label: 'Total Campaigns',
      value: stats.total,
      color: 'text-foreground',
      bgColor: 'bg-muted/30',
      iconColor: 'text-muted-foreground',
    },
    {
      icon: CheckCircle2,
      label: 'Active',
      value: stats.active,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
    },
    {
      icon: XCircle,
      label: 'Ended',
      value: stats.ended,
      color: 'text-zinc-400',
      bgColor: 'bg-zinc-500/10',
      iconColor: 'text-zinc-400',
    },
    {
      icon: TrendingUp,
      label: 'Avg Completeness',
      value: `${stats.avgCompleteness}%`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
    },
    {
      icon: Database,
      label: 'With Vault Data',
      value: stats.withVaultData,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {statItems.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.06, duration: 0.3 }}
            className="rounded-lg border border-border/30 bg-card/60 backdrop-blur-sm p-3 flex items-center gap-2.5 hover:border-border/50 transition-colors"
          >
            <div className={`h-8 w-8 rounded-lg ${item.bgColor} flex items-center justify-center shrink-0`}>
              <item.icon className={`h-4 w-4 ${item.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-base font-semibold leading-tight ${item.color}`}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{item.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
