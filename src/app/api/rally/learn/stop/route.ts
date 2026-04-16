import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { campaignAddress } = await request.json();
    if (!campaignAddress) {
      return NextResponse.json({ error: 'campaignAddress is required' }, { status: 400 });
    }

    const globalTimers = (globalThis as any).__rallyCronTimers as Record<string, NodeJS.Timeout> || {};

    if (globalTimers[campaignAddress]) {
      clearInterval(globalTimers[campaignAddress]);
      delete globalTimers[campaignAddress];
      return NextResponse.json({ success: true, message: `Cron stopped for ${campaignAddress}` });
    }

    return NextResponse.json({ success: true, message: `No active cron for ${campaignAddress}` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop cron' },
      { status: 500 }
    );
  }
}
