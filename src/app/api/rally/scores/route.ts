import { NextResponse } from 'next/server';
import { getPatternCache } from '@/lib/rally-data';

export async function GET() {
  try {
    const patternCache = getPatternCache();

    const sd = patternCache?.score_distribution || {};
    const categories = patternCache?.category_averages || {};
    const topPerformers = patternCache?.top_performers_18 || [];
    const nearPerfectAnalysis = patternCache?.near_perfect_17_analysis || {};
    const keyFindings = patternCache?.key_findings || {};
    const crossCampaign = patternCache?.cross_campaign_comparison || {};

    // Score distribution — exact shape the tab expects
    const score_distribution = {
      count: sd.count || 0,
      min: sd.min || 0,
      max: sd.max || 0,
      avg: sd.avg || 0,
      score_18: sd.score_18 || 0,
      score_17: sd.score_17 || 0,
      score_16_plus: sd.score_16_plus || 0,
      score_below_16: sd.score_below_16 || 0,
    };

    // Map category averages to dimensions array
    const dimensions = Object.entries(categories).map(([name, data]: [string, any]) => ({
      name,
      key: name.toLowerCase().replace(/[^a-z]/g, '_'),
      max: data.max ?? 0,
      avg: data.avg ?? 0,
      max_seen: data.max ?? 0,
      full_rate: data.full_rate ?? '0%',
    }));

    // Near-perfect analysis — flatten to match tab interface
    const near_perfect = {
      total: nearPerfectAnalysis.total || 0,
      weakness_breakdown: nearPerfectAnalysis.weakness_breakdown || { lost_originality_O1: 0, lost_engagement_E4: 0 },
    };

    // Key findings — pass through (already matches)
    const key_findings = {
      hardest_dimension: keyFindings.hardest_dimension || '',
      quality_differentiator: keyFindings.quality_differentiator || '',
      strongest_dimension: keyFindings.strongest_dimension || '',
      competition_level: keyFindings.competition_level || '',
    };

    // Cross-campaign comparison — normalize to match tab interface
    const cross_campaign = {
      prev_avg: crossCampaign.prev_avg || 0,
      current_avg: crossCampaign.current_avg || 0,
      avg_change: crossCampaign.avg_change || 0,
      conclusion: crossCampaign.conclusion || '',
    };

    const data = {
      score_distribution,
      dimensions,
      top_performers: topPerformers,
      near_perfect,
      key_findings,
      cross_campaign,
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load rally scores', message: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
