import { NextRequest, NextResponse } from 'next/server'
import { getPatternCache, getKnowledgeVault, getCurrentVariations, getCycleConsensus } from '@/lib/rally-data'
import { db } from '@/lib/db'

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvResponse(filename: string, csv: string) {
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'scores') {
      const patternCache = getPatternCache()
      const categories = patternCache?.category_averages || {}
      const topPerformers = patternCache?.top_performers_18 || []

      const dimensionRows = Object.entries(categories).map(([name, data]: [string, any]) => [
        name,
        data.max ?? 0,
        Number((data.avg ?? 0).toFixed(2)),
        data.max ?? 0,
        data.full_rate ?? '0%',
      ])

      const csv = [
        'Dimension,Max,Average,Max Seen,Full Rate',
        ...dimensionRows.map(row => row.map(escapeCSV).join(',')),
        '',
        'Top Performers,Score',
        ...topPerformers.map((p: any) => `${escapeCSV(p.username || p.name || '')},${escapeCSV(p.score ?? p.true_score ?? '')}`),
      ].join('\n')

      return csvResponse('rally-scores.csv', csv)
    }

    if (type === 'competitors') {
      const vault = getKnowledgeVault()
      const ci = vault?.competitive_intelligence || {}
      const topContent = ci.top_competitor_content || []

      const csv = [
        'Username,Score,Max Possible,Content,Campaign',
        ...topContent.map((c: any) => [
          escapeCSV(c.username),
          escapeCSV(c.true_score),
          escapeCSV(c.max_possible ?? 18),
          escapeCSV(c.content),
          escapeCSV(c.campaign),
        ].join(',')),
      ].join('\n')

      return csvResponse('rally-competitors.csv', csv)
    }

    if (type === 'content') {
      const rawVariations = getCurrentVariations()
      const cycleConsensus = getCycleConsensus()
      const rows: string[] = []

      if (rawVariations && typeof rawVariations === 'object') {
        for (const [id, content] of Object.entries(rawVariations)) {
          if (typeof content === 'string') {
            const consensus = cycleConsensus?.consensus?.[id] || null
            const total = consensus?.total ?? 0
            const scores = consensus?.gates || consensus?.quality || {}
            rows.push([
              escapeCSV(id),
              escapeCSV(content),
              escapeCSV(total),
              escapeCSV(scores.O ?? scores.originality ?? ''),
              escapeCSV(scores.A ?? scores.alignment ?? ''),
              escapeCSV(scores.Ac ?? scores.accuracy ?? ''),
              escapeCSV(scores.C ?? scores.compliance ?? ''),
              escapeCSV(scores.E ?? scores.engagement ?? ''),
              escapeCSV(scores.T ?? scores.technical ?? ''),
            ].join(','))
          }
        }
      }

      const csv = [
        'Variation,Content,Total,Originality,Alignment,Accuracy,Compliance,Engagement,Technical',
        ...rows,
      ].join('\n')

      return csvResponse('rally-content.csv', csv)
    }

    if (type === 'history') {
      const runs = await db.pipelineRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      const csv = [
        'ID,Status,Best Score,Verdict,Variations,Feedback Loops,Pipeline Time (s),Best Angle,Best Content,Created At',
        ...runs.map(r => [
          escapeCSV(r.id),
          escapeCSV(r.status),
          escapeCSV(r.bestScore),
          escapeCSV(r.verdict),
          escapeCSV(r.variations),
          escapeCSV(r.feedbackLoops),
          escapeCSV(r.pipelineTime),
          escapeCSV(r.bestAngle),
          escapeCSV(r.bestContent),
          escapeCSV(r.createdAt.toISOString()),
        ].join(',')),
      ].join('\n')

      return csvResponse('rally-history.csv', csv)
    }

    return NextResponse.json(
      { error: 'Invalid export type. Use: scores, competitors, content, or history' },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Export failed', message: error.message },
      { status: 500 }
    )
  }
}
