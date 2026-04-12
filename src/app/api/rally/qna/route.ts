import { NextResponse } from 'next/server';
import { getQnA } from '@/lib/rally-data';

export async function GET() {
  try {
    const qna = getQnA();

    if (!qna) {
      return NextResponse.json(
        { error: 'Q&A data not found', campaign: '', mission: '', content_score: '', total_qna: 0, distribution: {}, qna: [] },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const items = qna.qna || [];
    const distribution = qna.distribution || {};

    const data = {
      campaign: qna.campaign || '',
      mission: qna.mission || '',
      content_score: qna.content_score || '',
      total_qna: qna.total_qna || items.length,
      distribution,
      sanitization: qna.sanitization || '',
      accuracy_verification: qna.accuracy_verification || '',
      quality_check: qna.quality_check || '',
      qna: items,
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load Q&A data', message: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
