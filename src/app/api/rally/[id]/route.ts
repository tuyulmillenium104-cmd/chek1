import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const QUEUE_DIR = '/home/z/my-project/rally-jobs/queue';
const RESULTS_DIR = '/home/z/my-project/rally-jobs/results';
const PROCESSING_DIR = '/home/z/my-project/rally-jobs/processing';

// GET /api/rally/[id] - Get job status/result
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Check if result exists
    const resultPath = path.join(RESULTS_DIR, `${id}.json`);
    if (existsSync(resultPath)) {
      const result = JSON.parse(await readFile(resultPath, 'utf-8'));
      return NextResponse.json({ success: true, status: 'completed', ...result });
    }

    // Check if processing
    const processingPath = path.join(PROCESSING_DIR, `${id}.json`);
    if (existsSync(processingPath)) {
      const processing = JSON.parse(await readFile(processingPath, 'utf-8'));
      return NextResponse.json({ success: true, status: 'processing', phase: processing.phase || 'starting', startedAt: processing.startedAt });
    }

    // Check if queued
    const queuePath = path.join(QUEUE_DIR, `${id}.json`);
    if (existsSync(queuePath)) {
      const queued = JSON.parse(await readFile(queuePath, 'utf-8'));
      return NextResponse.json({ success: true, status: 'queued', createdAt: queued.createdAt });
    }

    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
