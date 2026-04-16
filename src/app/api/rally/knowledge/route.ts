/**
 * GET /api/rally/knowledge?campaignAddress=xxx
 *
 * Get knowledge data for a specific campaign:
 *   - Stats (submissions, learn history, cron status)
 *   - Learned patterns
 *   - Recent submissions (last 20)
 *   - Top submissions (top 10 by score)
 *
 * GET /api/rally/knowledge
 *
 * List all campaigns with knowledge data.
 *
 * POST /api/rally/knowledge
 *
 * Configure cron scheduling for a campaign.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getKnowledgeDB,
  listAllCampaigns,
  type SubmissionRecord,
  type PatternData,
  type CronConfig,
  type CronCampaignConfig,
} from '@/lib/knowledge-db';
import { getLearnStatus, configureCron } from '@/lib/learn-engine';

// ─── GET: Fetch Knowledge ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const campaignAddress = request.nextUrl.searchParams.get('campaignAddress');

    if (!campaignAddress) {
      return listAllCampaignsData();
    }

    return getCampaignKnowledge(campaignAddress);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Knowledge GET error:', errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * List all campaigns that have knowledge data on disk.
 */
async function listAllCampaignsData(): Promise<NextResponse> {
  try {
    const campaigns = await listAllCampaigns();

    // Enrich each campaign with cron status
    const enrichedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          const status = await getLearnStatus(campaign.campaign_address);
          return {
            campaign_address: campaign.campaign_address,
            campaign_name: campaign.campaign_name,
            submission_count: campaign.submission_count,
            last_learn_at: status.lastLearnAt,
            cron_enabled: status.cronEnabled,
          };
        } catch {
          return {
            campaign_address: campaign.campaign_address,
            campaign_name: campaign.campaign_name,
            submission_count: campaign.submission_count,
            last_learn_at: null,
            cron_enabled: false,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      campaigns: enrichedCampaigns,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Knowledge list error:', errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * Get comprehensive knowledge data for a specific campaign.
 */
async function getCampaignKnowledge(campaignAddress: string): Promise<NextResponse> {
  if (!campaignAddress || typeof campaignAddress !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Invalid campaignAddress parameter' },
      { status: 400 }
    );
  }

  const db = getKnowledgeDB(campaignAddress);

  try {
    // Gather all data in parallel
    const [stats, patterns, allSubmissions, cronConfig, learnStatus] = await Promise.all([
      db.getStats(),
      db.getPatterns(),
      db.getAllSubmissions(),
      db.getCronConfig(),
      getLearnStatus(campaignAddress),
    ]);

    // Extract recent submissions (last 20)
    const recentSubmissions = allSubmissions.slice(0, 20);

    // Extract top submissions by score (top 10)
    const topSubmissions = [...allSubmissions]
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 10);

    // Build stats object
    const cronCampaign = cronConfig?.campaigns?.find(
      (c: CronCampaignConfig) => c.campaign_address === campaignAddress
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalSubmissions: stats.submission_count,
        lastLearnAt: learnStatus.lastLearnAt,
        cronEnabled: learnStatus.cronEnabled,
        cronIntervalHours: learnStatus.cronIntervalHours,
        nextScheduledLearn: learnStatus.nextScheduledLearn,
        hasPatterns: stats.has_patterns,
        totalSubmissionsAnalyzed: stats.total_submissions_analyzed,
        lastPatternUpdate: stats.last_pattern_update,
        learnSessionCount: stats.learn_session_count,
        diskUsageBytes: stats.disk_usage_bytes,
      },
      patterns: patterns,
      recentSubmissions,
      topSubmissions,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[API] Knowledge fetch error for ${campaignAddress.substring(0, 10)}...: ${errorMsg}`);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

// ─── POST: Configure Cron ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Request body is required' },
        { status: 400 }
      );
    }

    const { campaignAddress, campaignName, enabled, intervalHours } = body;

    // Validate required fields
    if (!campaignAddress || typeof campaignAddress !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "campaignAddress"' },
        { status: 400 }
      );
    }

    if (!campaignName || typeof campaignName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "campaignName"' },
        { status: 400 }
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "enabled" (must be boolean)' },
        { status: 400 }
      );
    }

    if (intervalHours !== undefined) {
      const validIntervals = [6, 12, 24];
      if (!validIntervals.includes(intervalHours)) {
        return NextResponse.json(
          { success: false, error: `Invalid "intervalHours": must be one of ${validIntervals.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Configure via learn-engine (which persists to disk)
    await configureCron(campaignAddress, campaignName, {
      enabled,
      intervalHours: intervalHours || 6,
    });

    // Read back the cron config to return
    const db = getKnowledgeDB(campaignAddress, campaignName);
    const cronConfig = await db.getCronConfig();

    // Read learn status for complete picture
    const learnStatus = await getLearnStatus(campaignAddress);

    const config: CronConfig = cronConfig || {
      campaigns: [],
    };

    // Ensure the campaign entry exists in the config
    if (!config.campaigns.find((c) => c.campaign_address === campaignAddress)) {
      config.campaigns.push({
        campaign_address: campaignAddress,
        campaign_name: campaignName,
        enabled,
        interval_hours: intervalHours || 6,
        last_run: null,
        next_run: enabled ? new Date(Date.now() + ((intervalHours || 6) * 3600_000)).toISOString() : null,
        total_runs: 0,
        total_submissions_collected: 0,
      });
    }

    console.log(
      `[API] Knowledge cron configured for ${campaignAddress.substring(0, 10)}... ` +
      `(enabled=${enabled}, interval=${intervalHours || 6}h)`
    );

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        _meta: {
          campaignAddress,
          campaignName,
          enabled,
          intervalHours: intervalHours || 6,
          nextScheduledLearn: learnStatus.nextScheduledLearn,
        },
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Knowledge POST error:', errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
