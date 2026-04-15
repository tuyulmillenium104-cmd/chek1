/**
 * POST /api/v7/predict
 *
 * Predict a content quality score (0-21) for given content without generating.
 * Uses the trained prediction model for the specified campaign.
 *
 * Returns:
 * - Predicted score (0-21)
 * - Feature breakdown
 * - Whether it would likely pass quality gate
 * - Category-level estimates based on intelligence data
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { predictScore, extractFeatures } from '@/lib/v7/predictor';
import { getStoredIntelligence } from '@/lib/v7/analyzer';
import type { PredictionModel, ContentFeatures, CampaignIntelligence } from '@/lib/v7/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const { campaignId, content } = body || {};

    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json(
        { success: false, errorMessage: 'campaignId is required.' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, errorMessage: 'content is required and must be non-empty.' },
        { status: 400 }
      );
    }

    console.log(`[v7 API] Predict requested for campaign: ${campaignId.substring(0, 8)} (${content.length} chars)`);

    // Load campaign and prediction model
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        isActive: true,
        intelligence: {
          select: {
            predictionModel: true,
            featureStats: true,
            weakCategories: true,
            strongCategories: true,
            categoryAverages: true,
            top10Threshold: true,
            top25Threshold: true,
            averageThreshold: true,
            topPatterns: true,
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

    // Parse prediction model
    let predictionModel: PredictionModel | null = null;
    if (campaign.intelligence?.predictionModel) {
      try {
        const parsed = JSON.parse(campaign.intelligence.predictionModel);
        if (campaign.intelligence.featureStats) {
          parsed.featureStats = JSON.parse(campaign.intelligence.featureStats);
        }
        predictionModel = parsed as PredictionModel;
      } catch {
        console.warn('[v7 API] Failed to parse stored prediction model');
      }
    }

    // Extract features from content
    const features = extractFeatures(content);

    // Run prediction if model is available
    let predictedScore: number | null = null;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (predictionModel) {
      predictedScore = predictScore(predictionModel, content);

      // Determine confidence based on R² and sample count
      if (predictionModel.r2 > 0.5 && predictionModel.sampleCount >= 30) {
        confidence = 'high';
      } else if (predictionModel.r2 > 0.2 && predictionModel.sampleCount >= 15) {
        confidence = 'medium';
      }
    }

    // Load full intelligence for category-level estimates
    const intelligence = await getStoredIntelligence(campaignId);

    // Build category-level estimates based on intelligence
    let categoryEstimates: Array<{
      category: string;
      estimatedPct: number;
      maxScore: number;
      insight: string;
    }> = [];

    if (intelligence && intelligence.categoryAverages.length > 0) {
      const topThreshold = intelligence.top10Threshold || intelligence.averageThreshold;
      categoryEstimates = intelligence.categoryAverages.map((cat) => {
        // Estimate this content's performance relative to average
        // Use content features to adjust estimates
        const basePct = cat.avgPct;

        // Simple heuristic adjustments based on features
        let adjustment = 0;
        if (features.wordCount > 50 && features.wordCount < 300) adjustment += 2;
        if (features.emojiCount > 0 && features.emojiCount <= 3) adjustment += 1;
        if (features.hasAtRally) adjustment += 3;
        if (features.hashtagCount > 0 && features.hashtagCount <= 3) adjustment += 1;
        if (features.bannedWordCount > 0) adjustment -= 10;
        if (features.aiWordCount > 2) adjustment -= 5;
        if (features.templatePhraseCount > 1) adjustment -= 4;
        if (features.contractionCount > 0) adjustment += 2;
        if (features.personalPronounCount > 1) adjustment += 2;
        if (features.questionCount > 0) adjustment += 1;
        if (features.readabilityScore > 40 && features.readabilityScore < 80) adjustment += 2;

        const estimatedPct = Math.max(0, Math.min(100, basePct + adjustment));

        return {
          category: cat.name,
          estimatedPct: Math.round(estimatedPct * 10) / 10,
          maxScore: cat.maxScore,
          insight: buildCategoryInsight(cat.name, estimatedPct, topThreshold, intelligence),
        };
      });
    }

    // Determine if content would likely pass quality gate
    const QUALITY_GATE_PCT = 25; // 25% minimum to pass
    const predictedPct = predictedScore !== null
      ? Math.round((predictedScore / 21) * 1000) / 10
      : null;

    const wouldPassQualityGate = predictedPct !== null
      ? predictedPct >= QUALITY_GATE_PCT
      : null;

    // Top threshold comparison
    const top10Pct = intelligence?.top10Threshold ?? null;
    const top25Pct = intelligence?.top25Threshold ?? null;
    const averagePct = intelligence?.averageThreshold ?? null;

    // Build feature breakdown (top-level summary)
    const featureBreakdown = {
      structure: {
        charCount: features.charCount,
        wordCount: features.wordCount,
        sentenceCount: features.sentenceCount,
        paragraphCount: features.paragraphCount,
      },
      style: {
        emojiCount: features.emojiCount,
        hashtagCount: features.hashtagCount,
        mentionCount: features.mentionCount,
        questionCount: features.questionCount,
        exclamationCount: features.exclamationCount,
      },
      quality: {
        readabilityScore: features.readabilityScore,
        uniqueWordRatio: features.uniqueWordRatio,
        avgWordLength: features.avgWordLength,
        avgSentenceLength: features.avgSentenceLength,
      },
      risks: {
        bannedWordCount: features.bannedWordCount,
        aiWordCount: features.aiWordCount,
        templatePhraseCount: features.templatePhraseCount,
      },
      engagement: {
        hasAtRally: features.hasAtRally,
        hasLink: features.hasLink,
        hasHashtag: features.hasHashtag,
        contractionCount: features.contractionCount,
        personalPronounCount: features.personalPronounCount,
      },
    };

    return NextResponse.json({
      success: true,
      campaignId,
      campaignName: campaign.name,
      contentPreview: content.length > 150 ? content.substring(0, 150) + '...' : content,
      contentLength: content.length,

      prediction: {
        score: predictedScore,
        scorePct: predictedPct,
        confidence,
        wouldPassQualityGate,
        qualityGateThreshold: QUALITY_GATE_PCT,
      },

      benchmarkComparison: {
        top10Threshold: top10Pct,
        top25Threshold: top25Pct,
        averageThreshold: averagePct,
        wouldBeTop10: predictedPct !== null && top10Pct !== null ? predictedPct >= top10Pct : null,
        wouldBeTop25: predictedPct !== null && top25Pct !== null ? predictedPct >= top25Pct : null,
        aboveAverage: predictedPct !== null && averagePct !== null ? predictedPct >= averagePct : null,
      },

      categoryEstimates,
      featureBreakdown,

      modelInfo: predictionModel
        ? {
            available: true,
            mae: predictionModel.mae,
            r2: predictionModel.r2,
            sampleCount: predictionModel.sampleCount,
            lastTrainedAt: predictionModel.lastTrainedAt,
          }
        : { available: false },
    });
  } catch (error) {
    console.error('[v7 API] Predict error:', error);
    return NextResponse.json(
      { success: false, errorMessage: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function buildCategoryInsight(
  category: string,
  estimatedPct: number,
  topThreshold: number,
  _intelligence: CampaignIntelligence
): string {
  if (estimatedPct >= topThreshold) {
    return `Strong performance expected (est. ${estimatedPct.toFixed(0)}%) — above top 10% threshold (${topThreshold.toFixed(0)}%).`;
  } else if (estimatedPct >= topThreshold * 0.75) {
    return `Good performance (est. ${estimatedPct.toFixed(0)}%) — close to top tier.`;
  } else if (estimatedPct >= 50) {
    return `Average performance (est. ${estimatedPct.toFixed(0)}%) — room for improvement.`;
  } else {
    return `Weak performance expected (est. ${estimatedPct.toFixed(0)}%) — this category needs improvement.`;
  }
}
