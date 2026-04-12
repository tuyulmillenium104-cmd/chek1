import { NextResponse } from 'next/server';
import { getMaster, getPatternCache, getKnowledgeVault } from '@/lib/rally-data';

export async function GET() {
  try {
    const master = getMaster();
    const patternCache = getPatternCache();
    const vault = getKnowledgeVault();

    // Campaign status calculation
    let campaignStatus: 'active' | 'expired' | 'upcoming' = 'upcoming';
    let daysToDeadline: number | null = null;
    const now = new Date();

    if (master?.active_campaign) {
      const end = new Date(master.active_campaign.end_date);
      const start = new Date(master.active_campaign.start_date);
      if (now > end) {
        campaignStatus = 'expired';
      } else if (now >= start) {
        campaignStatus = 'active';
        daysToDeadline = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      } else {
        campaignStatus = 'upcoming';
        daysToDeadline = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Quick stats
    const totalPatterns = patternCache?.total_submissions_fetched || 0;
    const totalSubmissions = patternCache?.total_submissions_total || 0;
    const avgScore = patternCache?.score_distribution?.avg ?? null;
    const perfectScorers = patternCache?.score_distribution?.score_18 ?? 0;
    const totalBuilds = master?.pipeline_state?.total_builds ?? 0;
    const totalImprovements = master?.pipeline_state?.total_improvements ?? 0;

    // Best content info from mission
    const bestContentInfo = master?.active_campaign?.missions?.[0]?.best_content || null;

    const data = {
      master,
      pipeline_state: master?.pipeline_state || null,
      active_campaign: master?.active_campaign || null,
      campaign_status: campaignStatus,
      days_to_deadline: daysToDeadline,
      cron_config: master?.cron_config || null,
      knowledge_system: master?.knowledge_system || null,
      competitive_learning: master?.competitive_learning || null,
      quick_stats: {
        total_patterns: totalPatterns,
        total_submissions: totalSubmissions,
        avg_score: avgScore,
        perfect_scorers: perfectScorers,
        total_builds: totalBuilds,
        total_improvements: totalImprovements,
        total_campaigns_worked: vault?.total_campaigns_worked ?? 0,
        total_18_achieved: vault?.total_18_18_achieved ?? 0,
        avg_score_across_campaigns: vault?.avg_score_across_campaigns ?? null,
      },
      // Flattened helpers for frontend dashboard header
      campaign: {
        title: master?.active_campaign?.title || '',
        status: campaignStatus,
        reward_pool: master?.active_campaign?.reward_pool || '',
        deadline_countdown: daysToDeadline !== null ? `${daysToDeadline}d left` : (campaignStatus === 'expired' ? 'EXPIRED' : 'N/A'),
        total_submissions: patternCache?.total_submissions_total || 0,
      },
      current_best: {
        score: bestContentInfo?.score ?? 0,
        variation: bestContentInfo?.variation ?? null,
        angle: bestContentInfo?.angle ?? null,
      },
      pipeline: master?.pipeline_state || null,
      target_score: master?.target_score || null,
      campaign_avg: patternCache?.score_distribution?.avg ?? null,
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load rally status', message: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
