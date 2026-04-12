import { NextResponse } from 'next/server'
import { getLearningLog, getWorklog } from '@/lib/rally-data'

function parseTimestamp(ts: string | undefined): number {
  if (!ts) return 0
  try {
    // Extract ISO date string from formats like "2026-04-10T23:00:00.000Z (WIB)"
    const iso = ts.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\.\d]*Z)/)?.[1]
    if (iso) return new Date(iso).getTime()
    return new Date(ts).getTime()
  } catch {
    return 0
  }
}

function categorize(entry: { type?: string; category?: string }): string {
  const t = entry.type?.toLowerCase() || entry.category?.toLowerCase() || ''
  if (t.includes('build') || t.includes('pipeline')) return 'pipeline'
  if (t.includes('score') || t.includes('judge') || t.includes('consensus')) return 'score'
  if (t.includes('learn') || t.includes('feedback') || t.includes('monitor')) return 'learning'
  return 'system'
}

export async function GET() {
  try {
    const learningLog = getLearningLog(30)
    const worklogText = getWorklog()

    const activities: Array<{
      type: string
      timestamp: string
      message: string
      category: string
    }> = []

    // Parse learning log (JSONL)
    for (const entry of learningLog) {
      const ts = entry.timestamp || ''
      const category = categorize(entry)

      let message = ''
      const type = entry.type || 'event'

      if (type === 'build_complete') {
        const score = entry.score ?? entry.max_score
        message = `Build complete — ${entry.campaign || 'campaign'} scored ${score}/${entry.max_score ?? 18}`
        if (entry.best_variation) message += ` (${entry.best_variation})`
      } else if (type === 'monitor_check') {
        const result = entry.result || 'completed'
        const subs = entry.details?.total_submissions_campaign
        message = `Monitor check: ${result.replace(/_/g, ' ')}`
        if (subs) message += ` (${subs} total submissions)`
      } else if (type === 'feedback_loop') {
        message = `Feedback loop ${entry.loop ?? '?'}: ${entry.action || 'improving'}`
      } else if (type === 'competitive_analysis') {
        message = `Competitive analysis: ${entry.details || 'completed'}`
      } else if (type === 'calibration') {
        message = `Calibration: ${entry.details || 'updated'}`
      } else {
        message = entry.details || entry.type || 'System event'
        if (entry.campaign) message = `[${entry.campaign}] ${message}`
      }

      activities.push({
        type,
        timestamp: ts,
        message,
        category,
      })
    }

    // Parse worklog (markdown lines starting with "- ")
    if (worklogText) {
      const lines = worklogText.split('\n')
      let currentTimestamp = ''

      for (const line of lines) {
        // Extract timestamps from "Timestamp: ..." lines
        const tsMatch = line.match(/^Timestamp:\s*(.+)/)
        if (tsMatch) {
          currentTimestamp = tsMatch[1].trim()
          continue
        }

        // Extract task headers for context
        if (line.startsWith('Task:')) {
          const taskName = line.replace(/^Task:\s*/, '').trim()
          activities.push({
            type: 'system',
            timestamp: currentTimestamp || '',
            message: `Task started: ${taskName}`,
            category: 'system',
          })
          continue
        }

        // Extract Stage Summary lines
        if (line.startsWith('Stage Summary:')) continue

        // Parse work log entries (lines starting with "- ")
        if (line.startsWith('- ')) {
          const msg = line.slice(2).trim()
          if (msg.length < 3) continue

          // Determine category from content
          let category = 'system'
          if (/\bbuild\b|pipeline|cron/i.test(msg)) category = 'pipeline'
          else if (/\bscore|judge|dimension|18\/18/i.test(msg)) category = 'score'
          else if (/\blearn|feedback|pattern|technique/i.test(msg)) category = 'learning'

          activities.push({
            type: 'worklog',
            timestamp: currentTimestamp || '',
            message: msg,
            category,
          })
        }
      }
    }

    // Sort newest first, take top 20
    const sorted = activities
      .sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp))
      .slice(0, 20)

    return NextResponse.json({ activities: sorted }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load activity feed', message: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
