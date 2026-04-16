import { NextResponse } from 'next/server';
import { learn } from '@/lib/learner';

export async function POST(request: Request) {
  try {
    const { campaignAddress } = await request.json();
    if (!campaignAddress) {
      return NextResponse.json({ error: 'campaignAddress is required' }, { status: 400 });
    }
    const result = await learn(campaignAddress);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Learn failed' },
      { status: 500 }
    );
  }
}
