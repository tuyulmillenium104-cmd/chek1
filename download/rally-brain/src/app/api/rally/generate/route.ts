/**
 * POST /api/rally/generate
 *
 * Starts the pipeline in the BACKGROUND and returns immediately with a job ID.
 * The caller then polls /api/rally/generate/status?jobId=xxx for progress.
 *
 * This solves the 502 Bad Gateway error because:
 * - The HTTP request completes in < 1 second (no proxy timeout)
 * - Pipeline runs in the background
 * - Progress is retrieved via short polling requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { startBackgroundJob } from '@/lib/background-job';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body?.campaignData || Object.keys(body.campaignData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No campaign data provided. Send campaignData in POST body.' },
        { status: 400 }
      );
    }

    const jobId = body.jobId || randomUUID();

    // Start pipeline in background — returns immediately
    startBackgroundJob({
      id: jobId,
      campaignName: body.campaignName || 'Untitled Campaign',
      campaignData: body.campaignData,
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Pipeline started. Poll /api/rally/generate/status?jobId=' + jobId + ' for progress.',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Generate error:', errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
