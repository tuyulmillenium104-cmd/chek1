import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const runs = await db.pipelineRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(runs)
  } catch (error: any) {
    console.error('Pipeline history GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch pipeline history' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const run = await db.pipelineRun.create({
      data: {
        status: body.status || 'completed',
        bestScore: body.bestScore ?? null,
        verdict: body.verdict ?? null,
        variations: body.variations ?? 0,
        feedbackLoops: body.feedbackLoops ?? 0,
        pipelineTime: body.pipelineTime ?? null,
        bestAngle: body.bestAngle ?? null,
        bestContent: body.bestContent ?? null,
      },
    })

    return NextResponse.json(run, { status: 201 })
  } catch (error: any) {
    console.error('Pipeline history POST error:', error)
    return NextResponse.json({ error: 'Failed to save pipeline run' }, { status: 500 })
  }
}
