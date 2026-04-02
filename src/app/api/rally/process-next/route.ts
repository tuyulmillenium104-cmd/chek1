/**
 * POST /api/rally/process-next — SSE Streaming Architecture
 *
 * SOLVES: Gateway timeout (~300s) by streaming pipeline progress via Server-Sent Events.
 * The connection stays alive with heartbeats (every 10s), completely bypassing the timeout.
 *
 * Flow:
 * 1. Read request body immediately (before creating stream)
 * 2. Return SSE stream with Content-Type: text/event-stream
 * 3. Send heartbeat comments every 10s to keep connection alive
 * 4. Pipeline runs with onProgress callback → sends real-time progress events
 * 5. Final result sent as 'result' event when pipeline completes
 * 6. Connection closed
 *
 * Events:
 * - progress: { message: string, type: 'info'|'success'|'warning'|'error'|'system' }
 * - result: { success: boolean, job: {...}, message: string }
 * - error: { message: string }
 * - done: {}
 */

import { NextRequest } from 'next/server';
import { saveResult, type JobResult } from '@/lib/rally-jobs';
import { runPipeline, type PipelineJob } from '@/lib/pipeline';
import { getAIClient } from '@/lib/http-ai-client';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  // Step 1: Read body FIRST — can only read once before creating ReadableStream
  const body = await request.json().catch(() => null);

  const encoder = new TextEncoder();

  // Step 2: Create SSE streaming response
  const stream = new ReadableStream({
    async start(controller) {
      // ── SSE Helper: send an event to the client ──
      const send = (event: string, data: unknown) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream already closed — ignore
        }
      };

      // ── Heartbeat: keep connection alive every 10s ──
      // This is THE key to defeating the gateway timeout.
      // Even during long AI waits, the heartbeat keeps data flowing.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 10000);

      try {
        const client = getAIClient();
        const tokenPoolStatus = client.getTokenPoolStatus();

        // Step 3: Determine job source
        let pipelineJob: PipelineJob;
        const hasInlineCampaign = body?.campaignData && Object.keys(body.campaignData).length > 0;

        if (hasInlineCampaign) {
          const jobId = body.jobId || randomUUID();
          pipelineJob = {
            id: jobId,
            campaignName: body.campaignName || 'Untitled Campaign',
            campaignData: body.campaignData,
          };
          send('progress', { message: `Pipeline started for campaign: "${pipelineJob.campaignName}"`, type: 'system' });
          if (body.campaignData?.missionTitle) {
            send('progress', { message: `Mission: ${body.campaignData.missionTitle}`, type: 'info' });
          }
        } else {
          send('error', { message: 'No campaign data provided. Send campaignData in POST body.' });
          return;
        }

        send('progress', { message: 'Fetching campaign data from Rally.fun API...', type: 'info' });

        // Step 4: Run pipeline with real-time progress callback
        const result = await runPipeline(pipelineJob, {
          onProgress: (message: string, type: string) => {
            send('progress', { message, type: type || 'info' });
          },
        });

        // Step 5: Build job result
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
                categories: result.bestScoring.categories.map((c) => ({
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

        // Save to DB in background (non-blocking)
        saveResult(result.jobId, jobResult).catch((e) => {
          console.warn('[API] DB save failed (non-blocking):', e instanceof Error ? e.message : e);
        });

        // Step 6: Send final result event
        send('result', {
          success: true,
          job: {
            ...jobResult,
            competitorBeatScore: result.competitorBeatScore,
            competitiveAnalysis: result.competitiveAnalysis
              ? {
                  competitorsAnalyzed: result.competitiveAnalysis.totalCompetitorsAnalyzed,
                  patterns: result.competitiveAnalysis.patterns,
                  differentiation: result.competitiveAnalysis.differentiation,
                  campaignWeights: result.competitiveAnalysis.campaignWeights,
                }
              : null,
            groundTruth: result.groundTruth,
          },
          tokenPool: tokenPoolStatus,
          message:
            result.status === 'success'
              ? `Pipeline completed successfully in ${(result.processingTime / 1000).toFixed(1)}s`
              : result.status === 'partial'
                ? `Pipeline completed with partial results in ${(result.processingTime / 1000).toFixed(1)}s`
                : `Pipeline failed: ${result.error || 'Unknown error'}`,
        });

        send('done', {});
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[API] Process-next error:', errorMsg);
        send('error', { message: errorMsg });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });

  // Return SSE response with headers that prevent buffering
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
