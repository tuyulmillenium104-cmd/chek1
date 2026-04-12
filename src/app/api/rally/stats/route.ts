import { NextResponse } from 'next/server'
import { getKnowledgeVault, getPatternCache } from '@/lib/rally-data'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Fetch in-memory data
    const vault = getKnowledgeVault()
    const patternCache = getPatternCache()

    // Fetch pipeline runs from database
    let pipelineRuns: any[] = []
    try {
      pipelineRuns = await db.pipelineRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    } catch {
      // DB might not be available
    }

    // Pipeline stats from DB
    const scoredRuns = pipelineRuns.filter((r: any) => r.bestScore != null)
    const pipelineCount = pipelineRuns.length
    const avgPipelineScore =
      scoredRuns.length > 0
        ? Math.round((scoredRuns.reduce((sum: number, r: any) => sum + r.bestScore, 0) / scoredRuns.length) * 10) / 10
        : 0
    const bestPipelineScore =
      scoredRuns.length > 0
        ? Math.round(Math.max(...scoredRuns.map((r: any) => r.bestScore)) * 10) / 10
        : 0

    // Content generated from pattern cache
    const contentGenerated = patternCache?.score_distribution?.count ?? 0

    // Campaign stats from vault
    const campaignsWorked = vault?.total_campaigns_worked ?? 1
    const eighteenEighteen = vault?.total_18_18_achieved ?? 0

    // Dimension stats from pattern cache category averages
    const catAvg = patternCache?.category_averages ?? {}
    const dimensionMap: Record<string, string> = {
      'Originality and Authenticity': 'originality',
      'Content Alignment': 'alignment',
      'Information Accuracy': 'accuracy',
      'Campaign Compliance': 'compliance',
      'Engagement Potential': 'engagement',
      'Technical Quality': 'technical',
    }

    const dimensions: Record<string, { avg: number; max: number; full_rate: string }> = {}
    for (const [category, data] of Object.entries(catAvg)) {
      const key = dimensionMap[category]
      if (key && data && typeof data === 'object') {
        const d = data as { avg?: number; max?: number; full_rate?: string }
        dimensions[key] = {
          avg: Math.round((d.avg ?? 0) * 10) / 10,
          max: d.max ?? 0,
          full_rate: d.full_rate ?? '0%',
        }
      }
    }

    // Recent activity from pipeline runs
    let recentActivity = 'No recent activity'
    if (pipelineRuns.length > 0) {
      const latest = pipelineRuns[0]
      const ago = getTimeAgo(new Date(latest.createdAt))
      const status = latest.status === 'completed' ? 'completed' : latest.status
      recentActivity = `Pipeline ${status} ${ago}`
    }

    // Total builds from pattern cache monitor checks
    const totalBuilds = patternCache?.monitor_checks?.length ?? (pipelineRuns.length > 0 ? pipelineRuns.length : 0)

    const stats = {
      contentGenerated,
      totalBuilds,
      pipelineRuns: pipelineCount,
      avgPipelineScore,
      bestPipelineScore,
      campaignsWorked,
      eighteenEighteen,
      dimensions,
      recentActivity,
    }

    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load stats' },
      { status: 500 }
    )
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return `${diffDay}d ago`
}
