/**
 * GET /api/rally-cli/result/[id]
 *
 * Read full result for a campaign: prediction + content + QA.
 */
import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const RALLY_DIR = '/home/z/my-project/download/rally-brain';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID campaign diperlukan' }, { status: 400 });
    }

    const outputDir = join(RALLY_DIR, 'campaign_data', `${id}_output`);
    const predictionPath = join(outputDir, 'prediction.json');
    const contentPath = join(outputDir, 'best_content.txt');
    const qaPath = join(outputDir, 'qa.json');
    const fullPath = join(outputDir, 'full_output.json');

    // Read campaign config
    let campaignConfig: Record<string, unknown> | null = null;
    const configPath = join(RALLY_DIR, 'campaigns', `${id}.json`);
    if (existsSync(configPath)) {
      try {
        campaignConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      } catch {}
    }

    let prediction: Record<string, unknown> | null = null;
    if (existsSync(predictionPath)) {
      try { prediction = JSON.parse(readFileSync(predictionPath, 'utf-8')); } catch {}
    }

    let content: string | null = null;
    if (existsSync(contentPath)) {
      try { content = readFileSync(contentPath, 'utf-8'); } catch {}
    }

    let qa: unknown = null;
    if (existsSync(qaPath)) {
      try { qa = JSON.parse(readFileSync(qaPath, 'utf-8')); } catch {}
    }

    let fullOutput: Record<string, unknown> | null = null;
    if (existsSync(fullPath)) {
      try { fullOutput = JSON.parse(readFileSync(fullPath, 'utf-8')); } catch {}
    }

    if (!prediction && !content) {
      return NextResponse.json(
        { error: `Tidak ada hasil untuk campaign "${id}"` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      campaignId: id,
      config: campaignConfig,
      prediction,
      content,
      qa,
      fullOutput,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
