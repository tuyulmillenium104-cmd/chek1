/**
 * POST /api/rally/process-next
 * 
 * Processes a campaign content generation job.
 * Accepts campaign data directly in the POST body (from frontend),
 * OR falls back to reading from the job queue if no body provided.
 * 
 * Body: { campaignName, campaignAddress, campaignData }
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveResult, getNextJob, type JobResult } from '@/lib/rally-jobs';
import { runPipeline, type PipelineJob } from '@/lib/pipeline';
import { getAIClient } from '@/lib/http-ai-client';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const client = getAIClient();
    const tokenPoolStatus = client.getTokenPoolStatus();

    // Step 1: Determine job source — inline from body OR from queue
    let pipelineJob: PipelineJob;

    const body = await request.json().catch(() => null);
    const hasInlineCampaign = body?.campaignData && Object.keys(body.campaignData).length > 0;

    if (hasInlineCampaign) {
      // DIRECT MODE: Campaign data sent directly from frontend
      const jobId = body.jobId || randomUUID();
      pipelineJob = {
        id: jobId,
        campaignName: body.campaignName || 'Untitled Campaign',
        campaignData: body.campaignData,
      };
      console.log(`[API] Direct mode: processing campaign "${pipelineJob.campaignName}" (${jobId.substring(0, 8)}...)`);
    } else {
      // QUEUE MODE: Read next pending job from queue
      const job = await getNextJob();

      if (!job) {
        return NextResponse.json({
          success: false,
          message: 'No pending jobs in queue and no campaign data provided',
          tokenPool: tokenPoolStatus,
        });
      }

      pipelineJob = {
        id: job.id,
        campaignName: job.campaignName,
        campaignData: job.campaignData,
      };
      console.log(`[API] Queue mode: processing job "${job.campaignName}" (${job.id.substring(0, 8)}...)`);
    }

    // Step 2: Run the pipeline
    const result = await runPipeline(pipelineJob);

    // Step 3: Save result (non-blocking — DB failure shouldn't kill the response)
    const jobResult: JobResult = {
      jobId: result.jobId,
      campaignName: result.campaignName,
      status: result.status,
      bestContent: result.bestContent,
      bestScoring: result.bestScoring
        ? {
            contentQualityScore: result.bestScoring.contentQualityScore,
            contentQualityPct: result.bestScoring.contentQualityPct,
            passesThreshold: result.bestScoring.passesThreshold,
            overallGrade: result.bestScoring.overallGrade,
            estimatedPosition: result.bestScoring.estimatedPosition,
            categories: result.bestScoring.categories.map(c => ({
              name: c.name,
              score: c.score,
              maxScore: c.maxScore,
              percentage: c.percentage,
            })),
          }
        : null,
      totalCycles: result.totalCycles,
      totalVariationsGenerated: result.totalVariationsGenerated,
      totalAIcalls: result.totalAIcalls,
      processingTime: result.processingTime,
      error: result.error,
      completedAt: new Date().toISOString(),
    };

    // Save to DB in background (don't block response)
    saveResult(result.jobId, jobResult).catch((e) => {
      console.warn('[API] DB save failed (non-blocking):', e instanceof Error ? e.message : e);
    });

    // Step 4: Return result (include competitive analysis summary)
    return NextResponse.json({
      success: true,
      job: {
        ...jobResult,
        competitorBeatScore: result.competitorBeatScore,
        competitiveAnalysis: result.competitiveAnalysis ? {
          competitorsAnalyzed: result.competitiveAnalysis.totalCompetitorsAnalyzed,
          patterns: result.competitiveAnalysis.patterns,
          differentiation: result.competitiveAnalysis.differentiation,
          campaignWeights: result.competitiveAnalysis.campaignWeights,
        } : null,
        groundTruth: result.groundTruth,
      },
      tokenPool: tokenPoolStatus,
      message: result.status === 'success'
        ? `Pipeline completed successfully in ${(result.processingTime / 1000).toFixed(1)}s`
        : result.status === 'partial'
          ? `Pipeline completed with partial results in ${(result.processingTime / 1000).toFixed(1)}s`
          : `Pipeline failed: ${result.error || 'Unknown error'}`,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Process-next error:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        message: 'Pipeline processing failed',
      },
      { status: 500 }
    );
  }
}
