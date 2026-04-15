/**
 * GET /api/rally/submissions?address={campaignAddress}&limit={number}
 *
 * Fetches REAL submissions from Rally.fun and returns calibration data.
 * This provides "ground truth" data from Rally's actual scoring.
 *
 * Response includes:
 * - Top submissions with Rally's 12-category analysis
 * - Score distribution stats
 * - Category mapping (our scoring → Rally's real scoring)
 * - Calibration suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchRallySubmissions,
  parseSubmission,
  getSubmissionsSummary,
} from '@/lib/rally-submissions';
import {
  runCalibration,
  formatCalibrationForUI,
} from '@/lib/rally-calibration';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address')?.trim();
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const mode = searchParams.get('mode') || 'full'; // 'full' | 'summary' | 'calibrate'

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Valid campaign address (0x...) required' },
        { status: 400 }
      );
    }

    if (mode === 'calibrate') {
      // Full calibration mode
      const calibration = await runCalibration(address);
      const formatted = formatCalibrationForUI(calibration);

      return NextResponse.json({
        success: true,
        mode: 'calibrate',
        data: formatted,
      });
    }

    if (mode === 'summary') {
      // Summary mode (stats + top submissions)
      const summary = await getSubmissionsSummary(address, { limit: Math.min(limit, 200) });

      return NextResponse.json({
        success: true,
        mode: 'summary',
        data: {
          campaignAddress: address,
          totalFetched: summary.totalFetched,
          totalValid: summary.totalValid,
          stats: summary.stats,
          contentCategories: summary.contentCategories,
          engagementCategories: summary.engagementCategories,
          avgScorePerCategory: summary.avgScorePerCategory,
          weakCategories: summary.weakCategories,
          strongCategories: summary.strongCategories,
          topSubmissions: summary.topByContent.slice(0, 20).map((s) => ({
            xUsername: s.xUsername,
            tweetUrl: s.tweetUrl,
            contentQualityPct: s.contentQualityPct,
            missionId: s.missionId,
            categories: s.categories.map((c) => ({
              name: c.name,
              score: c.score,
              maxScore: c.maxScore,
              percentage: c.percentage,
              isContent: c.isContent,
            })),
          })),
        },
      });
    }

    // Default: full mode (raw parsed submissions)
    const rawSubmissions = await fetchRallySubmissions(address, { limit: Math.min(limit, 200) });
    const parsed = rawSubmissions.map(parseSubmission);

    // Sort by content quality
    parsed.sort((a, b) => b.contentQualityPct - a.contentQualityPct);

    return NextResponse.json({
      success: true,
      mode: 'full',
      data: {
        campaignAddress: address,
        totalFetched: parsed.length,
        validCount: parsed.filter((s) => s.isValid).length,
        submissions: parsed.slice(0, 50).map((s) => ({
          xUsername: s.xUsername,
          tweetUrl: s.tweetUrl,
          tweetId: s.raw.tweetId,
          isValid: s.isValid,
          contentQualityPct: s.contentQualityPct,
          contentQualityScore: s.contentQualityScore,
          rawScore: s.rawScore,
          missionId: s.missionId,
          disqualified: s.raw.disqualifiedAt !== null,
          categories: s.categories.map((c) => ({
            name: c.name,
            score: c.score,
            maxScore: c.maxScore,
            percentage: c.percentage,
            isContent: c.isContent,
          })),
        })),
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Submissions error:', errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
