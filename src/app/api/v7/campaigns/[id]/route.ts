/**
 * GET /api/v7/campaigns/[id] — Detailed campaign info with paginated submissions
 * DELETE /api/v7/campaigns/[id] — Deactivate a campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { CampaignIntelligence, PredictionModel } from '@/lib/v7/types';

// ─── Helpers ──────────────────────────────────────────────────────────

function parseIntelligence(intel: Record<string, unknown> | null) {
  if (!intel) return null;
  try {
    return {
      totalSubmissions: (intel.totalSubmissions as number) ?? 0,
      totalValid: (intel.totalValid as number) ?? 0,
      scoreStats: JSON.parse((intel.scoreStats as string) || '{}'),
      categoryAverages: JSON.parse((intel.categoryAverages as string) || '[]'),
      weakCategories: JSON.parse((intel.weakCategories as string) || '[]'),
      strongCategories: JSON.parse((intel.strongCategories as string) || '[]'),
      topPatterns: JSON.parse((intel.topPatterns as string) || '[]'),
      top10Threshold: (intel.top10Threshold as number) ?? 0,
      top25Threshold: (intel.top25Threshold as number) ?? 0,
      top50Threshold: (intel.top50Threshold as number) ?? 0,
      averageThreshold: (intel.averageThreshold as number) ?? 0,
    } as CampaignIntelligence;
  } catch {
    return null;
  }
}

function parseModelStatus(predictionModel: string | null) {
  if (!predictionModel) return { trained: false };
  try {
    const model = JSON.parse(predictionModel) as PredictionModel;
    return {
      trained: true,
      mae: model.mae ?? null,
      r2: model.r2 ?? null,
      sampleCount: model.sampleCount ?? 0,
      lastTrainedAt: model.lastTrainedAt ?? null,
    };
  } catch {
    return { trained: false };
  }
}

// ─── GET ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Pagination & sorting from query params
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const sort = url.searchParams.get('sort') || 'contentQualityScore';
    const order = (url.searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Validate sort field to prevent injection
    const allowedSortFields = [
      'contentQualityScore', 'engagementScore', 'rawScore',
      'fetchedAt', 'createdAt', 'periodIndex', 'xUsername',
    ];
    const sortField = allowedSortFields.includes(sort) ? sort : 'contentQualityScore';

    console.log(`[v7 API] Fetching campaign detail: ${id.substring(0, 8)} (page=${page}, limit=${limit})`);

    // Fetch campaign with intelligence
    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
        intelligence: {
          select: {
            totalSubmissions: true,
            totalValid: true,
            scoreStats: true,
            categoryAverages: true,
            weakCategories: true,
            strongCategories: true,
            topPatterns: true,
            top10Threshold: true,
            top25Threshold: true,
            top50Threshold: true,
            averageThreshold: true,
            predictionModel: true,
            featureStats: true,
            lastFetchedAt: true,
            version: true,
          },
        },
        generationResults: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            content: true,
            predictedScore: true,
            actualScore: true,
            scoreDelta: true,
            totalCycles: true,
            totalVariations: true,
            totalAICalls: true,
            processingTimeMs: true,
            errorMessage: true,
            createdAt: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, errorMessage: 'Campaign not found.' },
        { status: 404 }
      );
    }

    // Count total submissions for pagination
    const totalSubmissions = await db.rallySubmission.count({
      where: { campaignId: id },
    });

    // Fetch paginated submissions
    const submissions = await db.rallySubmission.findMany({
      where: { campaignId: id },
      orderBy: { [sortField]: order },
      skip: (page - 1) * limit,
      take: limit,
    });

    const formattedSubmissions = submissions.map((s) => ({
      id: s.id,
      rallyId: s.rallyId,
      xUsername: s.xUsername,
      tweetId: s.tweetId,
      tweetUrl: s.tweetUrl,
      contentQualityScore: s.contentQualityScore,
      contentQualityPct: s.contentQualityPct,
      engagementScore: s.engagementScore,
      rawScore: s.rawScore,
      isValid: s.isValid,
      isDisqualified: s.isDisqualified,
      isHidden: s.isHidden,
      categoryScores: (() => {
        try { return JSON.parse(s.categoryScores); } catch { return []; }
      })(),
      missionId: s.missionId,
      periodIndex: s.periodIndex,
      fetchedAt: s.fetchedAt.toISOString(),
    }));

    const intel = parseIntelligence(campaign.intelligence as unknown as Record<string, unknown> | null);
    const modelStatus = parseModelStatus(campaign.intelligence?.predictionModel ?? null);

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        campaignAddress: campaign.campaignAddress,
        isActive: campaign.isActive,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        lastGeneratedAt: campaign.lastGeneratedAt?.toISOString() ?? null,
      },
      intelligence: intel,
      model: modelStatus,
      recentGenerations: campaign.generationResults.map((g) => ({
        id: g.id,
        status: g.status,
        predictedScore: g.predictedScore,
        actualScore: g.actualScore,
        scoreDelta: g.scoreDelta,
        totalCycles: g.totalCycles,
        totalVariations: g.totalVariations,
        totalAICalls: g.totalAICalls,
        processingTimeMs: g.processingTimeMs,
        errorMessage: g.errorMessage,
        createdAt: g.createdAt.toISOString(),
      })),
      submissions: {
        data: formattedSubmissions,
        pagination: {
          page,
          limit,
          total: totalSubmissions,
          totalPages: Math.ceil(totalSubmissions / limit),
        },
      },
    });
  } catch (error) {
    console.error('[v7 API] Campaign detail error:', error);
    return NextResponse.json(
      { success: false, errorMessage: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`[v7 API] Deactivating campaign: ${id.substring(0, 8)}`);

    const campaign = await db.campaign.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, errorMessage: 'Campaign not found.' },
        { status: 404 }
      );
    }

    if (!campaign.isActive) {
      return NextResponse.json(
        { success: false, errorMessage: 'Campaign is already inactive.' },
        { status: 400 }
      );
    }

    const updated = await db.campaign.update({
      where: { id },
      data: { isActive: false },
    });

    console.log(`[v7 API] Campaign deactivated: ${updated.name}`);

    return NextResponse.json({
      success: true,
      campaign: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error('[v7 API] Campaign deactivate error:', error);
    return NextResponse.json(
      { success: false, errorMessage: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
