import { NextResponse } from 'next/server';
import { readMetadata, readPatterns, readSubmissions } from '@/lib/knowledge-db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const metadata = readMetadata(slug);
    const patterns = readPatterns(slug);
    const submissions = readSubmissions(slug);

    return NextResponse.json({
      metadata,
      patterns,
      totalSubmissions: submissions.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read knowledge DB' },
      { status: 500 }
    );
  }
}
