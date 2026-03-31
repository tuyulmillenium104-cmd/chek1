import { NextRequest, NextResponse } from 'next/server';

const RALLY_API = 'https://app.rally.fun/api';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

// GET /api/campaigns/[address]
export async function GET(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  try {
    // Fetch campaign detail + leaderboard in parallel
    const [campaignRes, leaderboardRes] = await Promise.all([
      fetch(`${RALLY_API}/campaigns/${address}`, { headers: HEADERS }),
      fetch(`${RALLY_API}/leaderboard?campaignAddress=${address}&limit=100`, { headers: HEADERS }),
    ]);

    if (!campaignRes.ok) {
      return NextResponse.json(
        { error: `Rally API error: ${campaignRes.status}` },
        { status: 502 }
      );
    }

    const campaign = await campaignRes.json();

    // Normalize displayCreator to string
    if (campaign.displayCreator && typeof campaign.displayCreator !== 'string') {
      campaign.displayCreator = campaign.displayCreator.displayName || campaign.displayCreator.name || campaign.displayCreator.xUsername || 'Unknown';
    }

    const leaderboardData = leaderboardRes.ok ? await leaderboardRes.json() : [];

    // Extract leaderboard stats
    const leaderboard = Array.isArray(leaderboardData) ? leaderboardData : (leaderboardData.submissions || []);
    const topScore = leaderboard.length > 0
      ? Math.max(...leaderboard.map((s: any) => s.totalScore || s.points || 0))
      : 0;
    const avgScore = leaderboard.length > 0
      ? Math.round(leaderboard.reduce((sum: number, s: any) => sum + (s.totalScore || s.points || 0), 0) / leaderboard.length)
      : 0;

    return NextResponse.json({
      success: true,
      campaign,
      leaderboard: {
        entries: leaderboard.slice(0, 20), // top 20 for reference
        totalSubmissions: leaderboard.length,
        topScore,
        avgScore,
      },
    });
  } catch (error: any) {
    console.error('[CAMPAIGN DETAIL ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
