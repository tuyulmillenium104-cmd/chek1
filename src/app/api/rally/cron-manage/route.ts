import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper: safe access to RallyCronJob model (may not exist in cached Prisma client)
function getCronModel() {
  const model = (db as any).rallyCronJob
  if (model && typeof model.findMany === 'function') return model
  return null
}

// ---------------------------------------------------------------------------
// Helper: Compute next run time from schedule expression
// ---------------------------------------------------------------------------
function computeNextRun(scheduleExpr: string, scheduleKind: string, from: Date = new Date()): Date | null {
  try {
    if (scheduleKind === 'one_time') {
      const t = new Date(scheduleExpr)
      return t > from ? t : null
    }
    if (scheduleKind === 'fixed_rate') {
      const match = scheduleExpr.match(/^(\d+)(m|h)$/)
      if (match) {
        const value = parseInt(match[1], 10)
        const ms = match[2] === 'h' ? value * 3600000 : value * 60000
        return new Date(from.getTime() + ms)
      }
    }
    // For cron expressions, use a simple heuristic
    return computeNextCronRun(scheduleExpr, from)
  } catch {
    return null
  }
}

/** Simple cron next-run calculator (5 or 6 field expressions) */
function computeNextCronRun(cronExpr: string, from: Date): Date {
  const parts = cronExpr.trim().split(/\s+/)
  let fields: string[]
  if (parts.length === 6) fields = parts
  else if (parts.length === 5) fields = ['0', ...parts]
  else return new Date(from.getTime() + 15 * 60000)

  const [seconds, minutes, hours, days, months, weekdays] = fields
  const candidate = new Date(from.getTime())
  candidate.setSeconds(0, 0)
  candidate.setMinutes(candidate.getMinutes() + 1)
  const limit = new Date(from.getTime() + 366 * 86400000)

  while (candidate <= limit) {
    if (
      cronMatches(seconds, candidate.getSeconds(), 0, 59) &&
      cronMatches(minutes, candidate.getMinutes(), 0, 59) &&
      cronMatches(hours, candidate.getHours(), 0, 23) &&
      cronMatches(days, candidate.getDate(), 1, 31) &&
      cronMatches(months, candidate.getMonth() + 1, 1, 12) &&
      cronMatches(weekdays, candidate.getDay(), 0, 6)
    ) {
      return new Date(candidate.getTime())
    }
    candidate.setMinutes(candidate.getMinutes() + 1)
  }
  return new Date(from.getTime() + 15 * 60000)
}

function cronMatches(expr: string, value: number, min: number, max: number): boolean {
  if (expr === '*') return true
  if (expr.includes('/')) {
    const [rangePart, stepPart] = expr.split('/')
    const step = parseInt(stepPart, 10)
    if (isNaN(step) || step <= 0) return false
    let start = min, end = max
    if (rangePart !== '*') {
      if (rangePart.includes('-')) {
        const [s, e] = rangePart.split('-').map(Number)
        start = isNaN(s) ? min : s; end = isNaN(e) ? max : e
      } else {
        start = parseInt(rangePart, 10)
        if (isNaN(start)) return false
        end = start
      }
    }
    for (let v = start; v <= end; v += step) if (v === value) return true
    return false
  }
  if (expr.includes(',')) return expr.split(',').some(p => cronMatches(p.trim(), value, min, max))
  if (expr.includes('-')) {
    const [s, e] = expr.split('-').map(Number)
    if (isNaN(s) || isNaN(e)) return false
    return value >= s && value <= e
  }
  const num = parseInt(expr, 10)
  return !isNaN(num) && value === num
}

// GET: List all cron jobs
export async function GET() {
  try {
    const model = getCronModel()
    const jobs = model
      ? await model.findMany({
          where: { status: { not: 'deleted' } },
          orderBy: { createdAt: 'desc' },
        })
      : []
    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('Cron manage GET error:', error)
    return NextResponse.json({ jobs: [] })
  }
}

// POST: Create a new cron job configuration
export async function POST(req: NextRequest) {
  try {
    const model = getCronModel()
    if (!model) {
      return NextResponse.json({ error: 'Cron job model not available. Try restarting the server.' }, { status: 503 })
    }

    const body = await req.json()
    const {
      name,
      campaignId,
      campaignTitle,
      campaignAddress,
      mode,
      scheduleKind,
      scheduleExpr,
      timezone,
      payload,
    } = body

    if (!name || !campaignId || !campaignAddress || !scheduleExpr) {
      return NextResponse.json(
        { error: 'Missing required fields: name, campaignId, campaignAddress, scheduleExpr' },
        { status: 400 }
      )
    }

    const effectiveScheduleKind = scheduleKind || 'fixed_rate'
    const nextRunAt = computeNextRun(scheduleExpr, effectiveScheduleKind)

    const job = await model.create({
      data: {
        name,
        campaignId,
        campaignTitle: campaignTitle || 'Unknown Campaign',
        campaignAddress,
        mode: mode || 'BUILD',
        scheduleKind: effectiveScheduleKind,
        scheduleExpr,
        timezone: timezone || 'Asia/Jakarta',
        status: 'active',
        payload: JSON.stringify(payload || {}),
        ...(nextRunAt ? { nextRunAt } : {}),
      },
    })

    const executionUrl = `/api/rally/cron-trigger`

    return NextResponse.json({
      job,
      executionUrl,
      triggerPayload: { jobId: job.id },
      nextRunAt,
      message: 'Cron job configuration created successfully',
    })
  } catch (error) {
    console.error('Cron manage POST error:', error)
    return NextResponse.json({ error: 'Failed to create cron job' }, { status: 500 })
  }
}

// PUT: Update a cron job (pause/resume/configure)
export async function PUT(req: NextRequest) {
  try {
    const model = getCronModel()
    if (!model) {
      return NextResponse.json({ error: 'Cron job model not available. Try restarting the server.' }, { status: 503 })
    }

    const body = await req.json()
    const { id, status, name, scheduleExpr, mode, payload } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (status) updateData.status = status
    if (name) updateData.name = name
    if (scheduleExpr) updateData.scheduleExpr = scheduleExpr
    if (mode) updateData.mode = mode
    if (payload) updateData.payload = JSON.stringify(payload)

    // Recompute nextRunAt if schedule changed
    const effectiveScheduleExpr = scheduleExpr
    const effectiveScheduleKind = (updateData.scheduleExpr ? scheduleKind : undefined)
    if (effectiveScheduleExpr || (status === 'active' && !updateData.scheduleExpr)) {
      const existingJob = await model.findUnique({ where: { id } })
      if (existingJob) {
        const expr = effectiveScheduleExpr || (existingJob as any).scheduleExpr
        const kind = effectiveScheduleKind || (existingJob as any).scheduleKind || 'fixed_rate'
        const nextRun = computeNextRun(expr, kind)
        if (nextRun) {
          updateData.nextRunAt = nextRun
        } else if (status !== 'active') {
          updateData.nextRunAt = null
        }
      }
    }

    const job = await model.update({
      where: { id },
      data: updateData,
    })

    const executionUrl = `/api/rally/cron-trigger`

    return NextResponse.json({
      job,
      executionUrl,
      triggerPayload: { jobId: id },
      message: 'Cron job updated successfully',
    })
  } catch (error) {
    console.error('Cron manage PUT error:', error)
    return NextResponse.json({ error: 'Failed to update cron job' }, { status: 500 })
  }
}

// DELETE: Soft-delete a cron job
export async function DELETE(req: NextRequest) {
  try {
    const model = getCronModel()
    if (!model) {
      return NextResponse.json({ error: 'Cron job model not available' }, { status: 503 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 })
    }

    await model.update({
      where: { id },
      data: { status: 'deleted', updatedAt: new Date() },
    })

    return NextResponse.json({ message: 'Cron job deleted successfully' })
  } catch (error) {
    console.error('Cron manage DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete cron job' }, { status: 500 })
  }
}
