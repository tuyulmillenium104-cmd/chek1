import { NextResponse } from 'next/server';

const cronTimers: Record<string, NodeJS.Timeout> = (globalThis as any).__rallyCronTimers = (globalThis as any).__rallyCronTimers || {};

export async function POST(request: Request) {
  try {
    const { campaignAddress, intervalMs = 6 * 60 * 60 * 1000 } = await request.json();
    if (!campaignAddress) {
      return NextResponse.json({ error: 'campaignAddress is required' }, { status: 400 });
    }

    // Clear existing timer
    if (cronTimers[campaignAddress]) {
      clearInterval(cronTimers[campaignAddress]);
    }

    const { learn } = await import('@/lib/learner');

    // Run immediately first
    await learn(campaignAddress);

    // Then set interval
    cronTimers[campaignAddress] = setInterval(async () => {
      try {
        await learn(campaignAddress);
      } catch (err) {
        console.error(`Cron learn error for ${campaignAddress}:`, err);
      }
    }, intervalMs);

    return NextResponse.json({
      success: true,
      message: `Cron learn started for ${campaignAddress} every ${intervalMs / 1000 / 60} minutes`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start cron' },
      { status: 500 }
    );
  }
}
