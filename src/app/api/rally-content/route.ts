import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONTENT_DIR = '/home/z/my-project/download/rally-content';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: 'txt' | 'json' | 'unknown';
}

interface CampaignGroup {
  campaign: string;
  label: string;
  files: FileInfo[];
}

function getFileType(filename: string): 'txt' | 'json' | 'unknown' {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return 'txt';
  if (ext === 'json') return 'json';
  return 'unknown';
}

function getLabel(campaignName: string): string {
  const labels: Record<string, string> = {
    'marbmarket-m0': 'MarbMarket — veDEX on MegaETH',
    'marbmarket-m1': 'MarbMarket — ve(3,3) Fair Launch',
    'campaign_3-fragments-btcjr': 'Fragments — Bitcoin Junior (BTC-Jr)',
  };
  return labels[campaignName] || campaignName;
}

function getFileLabel(filename: string): string {
  const labels: Record<string, string> = {
    'best_content.txt': 'Best Content (siap post)',
    'qa.json': 'Q&A Pairs (10 pasangan)',
    'full_output.json': 'Full Output (lengkap + skor)',
    'prediction.json': 'Prediction Data',
  };
  return labels[filename] || filename;
}

// GET /api/rally-content — list all files
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  const campaign = searchParams.get('campaign');

  // If file requested → serve download
  if (file && campaign) {
    const filePath = path.join(CONTENT_DIR, campaign, file);
    // Security: ensure path doesn't escape CONTENT_DIR
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(CONTENT_DIR)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }
    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(resolved);
    const ext = file.split('.').pop()?.toLowerCase();

    const contentTypes: Record<string, string> = {
      txt: 'text/plain',
      json: 'application/json',
    };

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentTypes[ext || ''] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  }

  // List all campaigns and files
  if (!fs.existsSync(CONTENT_DIR)) {
    return NextResponse.json({ campaigns: [], totalFiles: 0 });
  }

  const entries = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });
  const campaigns: CampaignGroup[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const dirPath = path.join(CONTENT_DIR, entry.name);
    const files = fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));

    const fileInfos: FileInfo[] = files.map(f => {
      const fp = path.join(dirPath, f);
      const stat = fs.statSync(fp);
      return {
        name: f,
        path: `${entry.name}/${f}`,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        type: getFileType(f),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    if (fileInfos.length > 0) {
      campaigns.push({
        campaign: entry.name,
        label: getLabel(entry.name),
        files: fileInfos,
      });
    }
  }

  const totalFiles = campaigns.reduce((sum, c) => sum + c.files.length, 0);

  return NextResponse.json({
    campaigns,
    totalFiles,
    generatedAt: new Date().toISOString(),
  });
}
