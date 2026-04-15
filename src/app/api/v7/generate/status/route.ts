/**
 * GET /api/v7/generate/status
 *
 * Returns generation status and history:
 * - Recent generation results (last 20)
 * - Success rate
 * - Average predicted/actual scores
 * - Score distribution
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    console.log('[v7 API] Fetching generation status...');

    // Get recent generation results (last 20)
    const recentResults = await db.generationResult.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        campaign: {
          select: { id: true, name: true },
        },
      },
    });

    const formatted = recentResults.map((r) => ({
      id: r.id,
      campaignId: r.campaignId,
      campaignName: r.campaign?.name ?? 'Unknown',
      status: r.status,
      content: r.content
        ? r.content.length > 200
          ? r.content.substring(0, 200) + '...'
          : r.content
        : null,
      predictedScore: r.predictedScore,
      actualScore: r.actualScore,
      scoreDelta: r.scoreDelta,
      totalCycles: r.totalCycles,
      totalVariations: r.totalVariations,
      totalAICalls: r.totalAICalls,
      processingTimeMs: r.processingTimeMs,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt.toISOString(),
    }));

    // Aggregate stats across all generation results
    const allResults = await db.generationResult.findMany({
      where: { status: { in: ['completed', 'partial'] } },
      select: {
        status: true,
        predictedScore: true,
        actualScore: true,
        processingTimeMs: true,
      },
    });

    const totalGenerations = allResults.length;
    const successfulGenerations = allResults.filter(
      (r) => r.status === 'completed' || r.status === 'partial'
    ).length;
    const failedGenerations = allResults.length - successfulGenerations;

    // Success rate
    const successRate = totalGenerations > 0
      ? Math.round((successfulGenerations / totalGenerations) * 1000) / 10
      : 0;

    // Average predicted score
    const withPredictedScore = allResults.filter((r) => r.predictedScore !== null);
    const avgPredictedScore = withPredictedScore.length > 0
      ? Math.round(
          (withPredictedScore.reduce((sum, r) => sum + r.predictedScore!, 0) / withPredictedScore.length) * 100
        ) / 100
      : null;

    // Average actual score
    const withActualScore = allResults.filter((r) => r.actualScore !== null);
    const avgActualScore = withActualScore.length > 0
      ? Math.round(
          (withActualScore.reduce((sum, r) => sum + r.actualScore!, 0) / withActualScore.length) * 100
        ) / 100
      : null;

    // Average processing time
    const avgProcessingTime = totalGenerations > 0
      ? Math.round(allResults.reduce((sum, r) => sum + r.processingTimeMs, 0) / totalGenerations)
      : 0;

    // Score distribution for predicted scores
    const predictedScores = allResults
      .map((r) => r.predictedScore)
      .filter((s): s is number => s !== null);

    const scoreDistribution = {
      '0-5': predictedScores.filter((s) => s < 5).length,
      '5-10': predictedScores.filter((s) => s >= 5 && s < 10).length,
      '10-15': predictedScores.filter((s) => s >= 10 && s < 15).length,
      '15-18': predictedScores.filter((s) => s >= 15 && s < 18).length,
      '18-21': predictedScores.filter((s) => s >= 18).length,
    };

    // Score trend over time (last 30 results)
    const trendResults = await db.generationResult.findMany({
      where: { status: { in: ['completed', 'partial'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        predictedScore: true,
        actualScore: true,
        createdAt: true,
        campaignId: true,
      },
    });

    const scoreTrend = trendResults.reverse().map((r) => ({
      date: r.createdAt.toISOString().split('T')[0],
      predictedScore: r.predictedScore,
      actualScore: r.actualScore,
    }));

    return NextResponse.json({
      recentGenerations: formatted,
      stats: {
        totalGenerations,
        successfulGenerations,
        failedGenerations,
        successRate,
        avgPredictedScore,
        avgActualScore,
        avgProcessingTimeMs: avgProcessingTime,
      },
      scoreDistribution,
      scoreTrend,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[v7 API] Generate status error:', error);
    return NextResponse.json(
      { success: false, errorMessage: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
