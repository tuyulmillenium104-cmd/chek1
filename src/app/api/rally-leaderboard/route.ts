import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const campaignAddress = searchParams.get('campaignAddress');
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    // Build URL for Rally leaderboard API
    let url = `https://app.rally.fun/api/leaderboard?limit=${limit}`;
    if (campaignAddress) {
      url += `&campaignAddress=${campaignAddress}`;
    }

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: response.status });
    }

    const data = await response.json();

    // Get total count
    const totalParticipants = Array.isArray(data) ? data.length : (data.total || 0);

    // Return full leaderboard with all relevant data
    const leaderboard = (Array.isArray(data) ? data : data.leaderboard || data.items || []).map((entry: any) => ({
      rank: entry.rank,
      username: entry.user?.xUsername || entry.username || 'Unknown',
      displayName: entry.user?.xName || entry.username || 'Unknown',
      avatar: entry.user?.xAvatar || '',
      verified: entry.user?.xVerified || false,
      followersCount: entry.user?.xFollowersCount || 0,
      totalPoints: parseFloat(entry.points || entry.totalPoints || 0) / 1e18,
      referralBonus: parseFloat(entry.referralBonus || 0) / 1e18,
      totalSubmissions: entry.totalSubmissions || 1,
      topPercent: totalParticipants > 0 ? (entry.rank / totalParticipants) * 100 : 0,
    }));

    return NextResponse.json({
      total: totalParticipants,
      leaderboard: leaderboard,
    });
  } catch (error) {
    console.error('Failed to fetch Rally leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
