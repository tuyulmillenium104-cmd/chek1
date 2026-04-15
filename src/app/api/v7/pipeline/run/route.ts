/**
 * POST /api/v7/pipeline/run
 *
 * Trigger the data pipeline for a specific campaign or all campaigns.
 * - If campaignId is provided, runs for that campaign only.
 * - If omitted, runs for all active campaigns sequentially.
 *
 * Pipeline stages: collect submissions → analyze → train prediction model
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDataPipeline, runFullPipeline } from '@/lib/v7/pipeline';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { campaignId } = body;

    if (campaignId) {
      console.log(`[v7 API] Pipeline run triggered for campaign: ${campaignId.substring(0, 8)}`);
      const result = await runDataPipeline(campaignId);
      return NextResponse.json(result);
    } else {
      console.log('[v7 API] Full pipeline run triggered for all active campaigns');
      const results = await runFullPipeline();
      return NextResponse.json({ runs: results });
    }
  } catch (error) {
    console.error('[v7 API] Pipeline run error:', error);
    return NextResponse.json(
      { success: false, errorMessage: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
