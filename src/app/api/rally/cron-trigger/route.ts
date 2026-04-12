import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// Helper: safe access to RallyCronJob model
// ---------------------------------------------------------------------------
function getCronModel() {
  const model = (db as any).rallyCronJob
  if (model && typeof model.findMany === 'function') return model
  return null
}

// ---------------------------------------------------------------------------
// GET: List active cron jobs that need execution
// Returns jobs with status='active' and their parsed payload + execution URL
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const model = getCronModel()
    if (!model) {
      return NextResponse.json({ error: 'Cron job model not available' }, { status: 503 })
    }

    const jobs = await model.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    // Enrich each job with parsed payload and execution metadata
    const enriched = jobs.map((job: any) => {
      let parsedPayload: Record<string, unknown> = {}
      try {
        parsedPayload = JSON.parse(job.payload || '{}')
      } catch {
        parsedPayload = {}
      }

      return {
        id: job.id,
        name: job.name,
        campaignId: job.campaignId,
        campaignTitle: job.campaignTitle,
        mode: job.mode,
        scheduleKind: job.scheduleKind,
        scheduleExpr: job.scheduleExpr,
        timezone: job.timezone,
        lastRunAt: job.lastRunAt,
        nextRunAt: job.nextRunAt,
        runCount: job.runCount,
        payload: parsedPayload,
        executionUrl: `/api/rally/cron-trigger?jobId=${job.id}`,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      }
    })

    return NextResponse.json({ jobs: enriched, total: enriched.length })
  } catch (error) {
    console.error('Cron trigger GET error:', error)
    return NextResponse.json({ error: 'Failed to list cron jobs' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST: Execute the pipeline for a given cron job
// Body: { jobId: string }
//
// This endpoint:
// 1. Looks up the job from DB
// 2. Validates it's active
// 3. Parses its stored payload
// 4. Fires an internal request to /api/rally/pipeline with the job's config
// 5. Updates job metadata (lastRunAt, runCount, nextRunAt)
// 6. Returns the pipeline SSE stream (proxied from the pipeline API)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const model = getCronModel()
    if (!model) {
      return NextResponse.json({ error: 'Cron job model not available' }, { status: 503 })
    }

    const body = await req.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing required field: jobId' },
        { status: 400 }
      )
    }

    // ── 1. Look up the job ─────────────────────────────────────────────
    const job = await model.findUnique({ where: { id: jobId } })
    if (!job) {
      return NextResponse.json({ error: 'Cron job not found' }, { status: 404 })
    }

    if (job.status !== 'active') {
      return NextResponse.json(
        { error: `Cron job is not active (status: ${job.status})` },
        { status: 400 }
      )
    }

    // ── 2. Parse the stored payload ────────────────────────────────────
    let parsedPayload: Record<string, unknown> = {}
    try {
      parsedPayload = JSON.parse((job as any).payload || '{}')
    } catch {
      parsedPayload = {}
    }

    // Extract pipeline parameters from payload
    const campaignId = (job as any).campaignId || parsedPayload.campaignId
    const variationCount = parsedPayload.variationCount || 3
    const maxFeedbackLoops = parsedPayload.maxFeedbackLoops || 2
    const customInstructions = parsedPayload.customInstructions

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Cron job has no campaignId configured' },
        { status: 400 }
      )
    }

    // ── 3. Update job metadata BEFORE firing pipeline ──────────────────
    const now = new Date()
    const newRunCount = ((job as any).runCount || 0) + 1

    // Compute next run time from schedule expression
    let nextRunAt: Date | null = null
    try {
      nextRunAt = computeNextRun((job as any).scheduleExpr, (job as any).scheduleKind, now)
    } catch {
      // If we can't compute next run, just leave it null
    }

    await model.update({
      where: { id: jobId },
      data: {
        lastRunAt: now,
        runCount: newRunCount,
        ...(nextRunAt ? { nextRunAt } : {}),
        updatedAt: now,
      },
    })

    // ── 4. Fire the pipeline API internally ────────────────────────────
    const pipelinePayload: Record<string, unknown> = {
      campaignId,
      variationCount,
      maxFeedbackLoops,
    }
    if (customInstructions) {
      pipelinePayload.customInstructions = customInstructions
    }

    // We need to proxy the SSE stream from the pipeline endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const pipelineUrl = `${baseUrl}/api/rally/pipeline`

    try {
      const pipelineResponse = await fetch(pipelineUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pipelinePayload),
      })

      if (!pipelineResponse.ok) {
        const errorText = await pipelineResponse.text()
        console.error(`Pipeline returned ${pipelineResponse.status}: ${errorText}`)
        return NextResponse.json(
          {
            error: `Pipeline execution failed with status ${pipelineResponse.status}`,
            details: errorText,
            jobId,
            jobName: (job as any).name,
            runCount: newRunCount,
          },
          { status: pipelineResponse.status }
        )
      }

      // If the pipeline returns an SSE stream (ReadableStream), proxy it directly
      if (pipelineResponse.body && typeof pipelineResponse.body.getReader === 'function') {
        // Return the SSE stream as-is
        return new NextResponse(pipelineResponse.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Cron-Job-Id': jobId,
            'X-Cron-Run-Count': String(newRunCount),
          },
        })
      }

      // If not a stream, return the JSON response
      const result = await pipelineResponse.json()
      return NextResponse.json({
        ...result,
        cronJobId: jobId,
        cronJobName: (job as any).name,
        runCount: newRunCount,
        executedAt: now.toISOString(),
      })
    } catch (fetchError) {
      console.error('Failed to call pipeline API:', fetchError)
      return NextResponse.json(
        {
          error: 'Failed to reach pipeline API',
          message: 'The cron job was marked as run, but the pipeline execution failed.',
          jobId,
          jobName: (job as any).name,
          runCount: newRunCount,
        },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error('Cron trigger POST error:', error)
    return NextResponse.json({ error: 'Failed to execute cron job' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE: Cancel a scheduled execution (pause the job)
// Query: ?jobId=xxx
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  try {
    const model = getCronModel()
    if (!model) {
      return NextResponse.json({ error: 'Cron job model not available' }, { status: 503 })
    }

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId query parameter' }, { status: 400 })
    }

    const job = await model.findUnique({ where: { id: jobId } })
    if (!job) {
      return NextResponse.json({ error: 'Cron job not found' }, { status: 404 })
    }

    await model.update({
      where: { id: jobId },
      data: { status: 'paused', updatedAt: new Date() },
    })

    return NextResponse.json({
      message: 'Cron job paused, execution cancelled',
      jobId,
      jobName: (job as any).name,
    })
  } catch (error) {
    console.error('Cron trigger DELETE error:', error)
    return NextResponse.json({ error: 'Failed to cancel cron execution' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the next run time based on schedule expression.
 * Supports:
 *   - cron expressions (e.g., "0 every-15min * * * *")
 *   - fixed_rate in minutes (e.g., "15m", "1h", "30m")
 *   - one_time ISO date string
 */
function computeNextRun(scheduleExpr: string, scheduleKind: string, from: Date): Date {
  if (scheduleKind === 'one_time') {
    const scheduledTime = new Date(scheduleExpr)
    if (scheduledTime > from) {
      return scheduledTime
    }
    throw new Error('One-time schedule has already passed')
  }

  if (scheduleKind === 'fixed_rate') {
    const match = scheduleExpr.match(/^(\d+)(m|h)$/)
    if (match) {
      const value = parseInt(match[1], 10)
      const unit = match[2]
      const ms = unit === 'h' ? value * 60 * 60 * 1000 : value * 60 * 1000
      return new Date(from.getTime() + ms)
    }
  }

  // For cron expressions, compute the next occurrence
  return computeNextCronRun(scheduleExpr, from)
}

/**
 * Simple cron expression parser that computes the next run time.
 * Supports 6-field cron: second minute hour day month weekday
 * Also supports 5-field cron: minute hour day month weekday (second = 0)
 */
function computeNextCronRun(cronExpr: string, from: Date): Date {
  const parts = cronExpr.trim().split(/\s+/)

  let fields: string[]
  if (parts.length === 6) {
    fields = parts // second minute hour day month weekday
  } else if (parts.length === 5) {
    fields = ['0', ...parts] // prepend second=0
  } else {
    return new Date(from.getTime() + 15 * 60 * 1000)
  }

  const [seconds, minutes, hours, days, months, weekdays] = fields

  // Start checking from 1 minute after current time
  const candidate = new Date(from.getTime())
  candidate.setSeconds(0, 0)
  candidate.setMinutes(candidate.getMinutes() + 1)

  // Safety limit: don't search more than 1 year ahead
  const limit = new Date(from.getTime() + 366 * 24 * 60 * 60 * 1000)

  while (candidate <= limit) {
    const sec = candidate.getSeconds()
    const min = candidate.getMinutes()
    const hour = candidate.getHours()
    const day = candidate.getDate()
    const month = candidate.getMonth() + 1
    const weekday = candidate.getDay()

    if (
      matchesField(seconds, sec, 0, 59) &&
      matchesField(minutes, min, 0, 59) &&
      matchesField(hours, hour, 0, 23) &&
      matchesField(days, day, 1, 31) &&
      matchesField(months, month, 1, 12) &&
      matchesField(weekdays, weekday, 0, 6)
    ) {
      return new Date(candidate.getTime())
    }

    candidate.setMinutes(candidate.getMinutes() + 1)
  }

  return new Date(from.getTime() + 15 * 60 * 1000)
}

/**
 * Check if a value matches a cron field expression.
 * Supports: wildcard, specific value, comma-separated, ranges (1-5), step values (every-N)
 */
function matchesField(expr: string, value: number, min: number, max: number): boolean {
  if (expr === '*') return true

  if (expr.includes('/')) {
    const [rangePart, stepPart] = expr.split('/')
    const step = parseInt(stepPart, 10)
    if (isNaN(step) || step <= 0) return false

    let start = min
    let end = max
    if (rangePart !== '*') {
      if (rangePart.includes('-')) {
        const [s, e] = rangePart.split('-').map(Number)
        start = isNaN(s) ? min : s
        end = isNaN(e) ? max : e
      } else {
        start = parseInt(rangePart, 10)
        if (isNaN(start)) return false
        end = start
      }
    }

    for (let v = start; v <= end; v += step) {
      if (v === value) return true
    }
    return false
  }

  if (expr.includes(',')) {
    return expr.split(',').some(part => matchesField(part.trim(), value, min, max))
  }

  if (expr.includes('-')) {
    const [s, e] = expr.split('-').map(Number)
    if (isNaN(s) || isNaN(e)) return false
    return value >= s && value <= e
  }

  const num = parseInt(expr, 10)
  if (isNaN(num)) return false
  return value === num
}
