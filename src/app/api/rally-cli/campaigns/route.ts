/**
 * GET /api/rally-cli/campaigns
 *
 * List all campaigns from file-based system.
 * Reads campaigns/ folder + campaign_data/*_output/prediction.json
 */
import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const RALLY_DIR = '/home/z/my-project/download/rally-brain';
const CAMPAIGNS_DIR = join(RALLY_DIR, 'campaigns');

interface PredictionData {
  score: number;
  grade: string;
  predictions?: Record<string, number>;
  valid_judges?: number;
  g4_bonus?: number;
  hard_fails?: string[];
  evaluation_method?: string;
}

interface CampaignResult {
  id: string;
  name: string;
  score: number | null;
  grade: string | null;
  predictions: Record<string, number> | null;
  judgeCount: number;
  g4Bonus: number;
  hardFails: string[];
  hasContent: boolean;
  hasQA: boolean;
  contentPreview: string | null;
}

export async function GET() {
  try {
    const { readdirSync } = await import('fs');

    // Read all campaign JSON files
    const files = readdirSync(CAMPAIGNS_DIR).filter(f => f.endsWith('.json'));

    const campaigns: CampaignResult[] = files.map(file => {
      const campaignId = file.replace('.json', '');
      const predictionPath = join(RALLY_DIR, 'campaign_data', `${campaignId}_output`, 'prediction.json');
      const contentPath = join(RALLY_DIR, 'campaign_data', `${campaignId}_output`, 'best_content.txt');
      const qaPath = join(RALLY_DIR, 'campaign_data', `${campaignId}_output`, 'qa.json');

      let campaignName = campaignId;
      let score: number | null = null;
      let grade: string | null = null;
      let predictions: Record<string, number> | null = null;
      let judgeCount = 0;
      let g4Bonus = 0;
      let hardFails: string[] = [];

      // Read campaign name
      try {
        const raw = JSON.parse(readFileSync(join(CAMPAIGNS_DIR, file), 'utf-8'));
        campaignName = raw.title || raw.name || campaignId;
      } catch {}

      // Read prediction
      if (existsSync(predictionPath)) {
        try {
          const pred: PredictionData = JSON.parse(readFileSync(predictionPath, 'utf-8'));
          score = pred.score;
          grade = pred.grade;
          predictions = pred.predictions || null;
          judgeCount = pred.valid_judges || 0;
          g4Bonus = pred.g4_bonus || 0;
          hardFails = pred.hard_fails || [];
        } catch {}
      }

      // Content preview
      let contentPreview: string | null = null;
      if (existsSync(contentPath)) {
        try {
          const content = readFileSync(contentPath, 'utf-8');
          contentPreview = content.length > 150 ? content.substring(0, 150) + '...' : content;
        } catch {}
      }

      return {
        id: campaignId,
        name: campaignName,
        score,
        grade,
        predictions,
        judgeCount,
        g4Bonus,
        hardFails,
        hasContent: existsSync(contentPath),
        hasQA: existsSync(qaPath),
        contentPreview,
      };
    });

    // Read rotation state
    let rotationState: Record<string, unknown> = {};
    try {
      rotationState = JSON.parse(readFileSync(join(RALLY_DIR, 'campaign_data', 'rotation_state.json'), 'utf-8'));
    } catch {}

    return NextResponse.json({
      campaigns,
      rotation: rotationState,
      total: campaigns.length,
    });
  } catch (error) {
    console.error('[rally-cli] Campaigns error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
