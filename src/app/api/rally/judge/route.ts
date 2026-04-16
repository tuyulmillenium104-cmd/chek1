import { NextResponse } from 'next/server';
import { judge } from '@/lib/judge';

export async function POST(request: Request) {
  try {
    const { content, campaignAddress } = await request.json();
    if (!content || !campaignAddress) {
      return NextResponse.json({ error: 'content and campaignAddress are required' }, { status: 400 });
    }

    const result = await judge({ content, campaignAddress });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Judge failed' },
      { status: 500 }
    );
  }
}
