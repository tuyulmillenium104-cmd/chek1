/**
 * GET /api/rally/generate/status?jobId=xxx
 *
 * Returns the current progress and/or final result of a background pipeline job.
 * Short-lived request — returns in < 100ms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/background-job';

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Missing jobId parameter' },
      { status: 400 }
    );
  }

  const job = getJobStatus(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Job not found. It may have expired (jobs are kept for 10 minutes).' },
      { status: 404 }
    );
  }

  // Build response
  const response: Record<string, unknown> = {
    success: true,
    jobId: job.id,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    progress: job.progress,
    elapsed: job.completedAt
      ? ((job.completedAt - job.startedAt) / 1000).toFixed(1) + 's'
      : ((Date.now() - job.startedAt) / 1000).toFixed(1) + 's',
  };

  if (job.error) {
    response.error = job.error;
  }

  if (job.result) {
    const result = job.result;
    response.result = {
      status: result.status,
      bestContent: result.bestContent,
      bestScoring: result.bestScoring
        ? {
            contentQualityScore: result.bestScoring.contentQualityScore,
            contentQualityPct: result.bestScoring.contentQualityPct,
            passesThreshold: result.bestScoring.passesThreshold,
            overallGrade: result.bestScoring.overallGrade,
            estimatedPosition: result.bestScoring.estimatedPosition,
            categories: result.bestScoring.categories,
            g4Detection: result.bestScoring.g4Detection,
            xFactors: result.bestScoring.xFactors,
            categoryAnalysis: result.bestScoring.categoryAnalysis,
          }
        : null,
      totalCycles: result.totalCycles,
      totalVariationsGenerated: result.totalVariationsGenerated,
      totalAIcalls: result.totalAIcalls,
      processingTime: result.processingTime,
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
    };
  }

  return NextResponse.json(response);
}
