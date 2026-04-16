import { NextResponse } from 'next/server';
import { fetchCampaign } from '@/lib/rally-api';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  try {
    const campaign = await fetchCampaign(address);
    return NextResponse.json(campaign);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}
