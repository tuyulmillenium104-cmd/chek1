import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';

export async function POST(request: Request) {
  try {
    const { campaignAddress, missionId, customBrief } = await request.json();
    if (!campaignAddress) {
      return NextResponse.json({ error: 'campaignAddress is required' }, { status: 400 });
    }

    const result = await runPipeline(campaignAddress, missionId, customBrief);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pipeline failed' },
      { status: 500 }
    );
  }
}
