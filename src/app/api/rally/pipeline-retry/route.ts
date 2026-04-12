import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: fetch failed (non-dismissed) pipeline runs
export async function GET() {
  try {
    const failedRuns = await db.pipelineRun.findMany({
      where: {
        status: 'error',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json(failedRuns)
  } catch (error: any) {
    console.error('Pipeline retry GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch failed runs' }, { status: 500 })
  }
}

// POST: handle retry or dismiss actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { runId, action } = body

    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 })
    }

    // Dismiss action: update status to 'dismissed'
    if (action === 'dismiss') {
      const updated = await db.pipelineRun.update({
        where: { id: runId },
        data: { status: 'dismissed' },
      })
      return NextResponse.json({ success: true, run: updated })
    }

    // Default: get run params for retry
    const run = await db.pipelineRun.findUnique({
      where: { id: runId },
    })

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: run.id,
      bestAngle: run.bestAngle,
      bestContent: run.bestContent,
      createdAt: run.createdAt,
      status: run.status,
    })
  } catch (error: any) {
    console.error('Pipeline retry POST error:', error)
    return NextResponse.json({ error: 'Failed to process retry request' }, { status: 500 })
  }
}
