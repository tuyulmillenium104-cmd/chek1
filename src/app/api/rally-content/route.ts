import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Read directly from campaign_data — always fresh from cron runs
const CONTENT_DIR = '/home/z/my-project/download/rally-brain/campaign_data';

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

function getLabel(dirName: string): string {
  const labels: Record<string, string> = {
    'marbmarket-m0_output': 'MarbMarket — veDEX on MegaETH',
    'marbmarket-m1_output': 'MarbMarket — ve(3,3) Fair Launch',
    'campaign_3_output': 'Fragments — Bitcoin Junior (BTC-Jr)',
    '0x39a11fa3e86eA8AC53772F26AA36b07506fa7dDB_output': 'MarbMarket — Legacy (0x39a1...)',
  };
  return labels[dirName] || dirName.replace(/_output$/, '').replace(/_/g, ' ');
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

// GET /api/rally-content — list all files or serve download
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

    // Use readable filename for download (strip _output from campaign dir)
    const safeName = campaign.replace(/_output$/, '');
    const downloadName = file.includes('.json') ? `${safeName}_${file}` : `${safeName}_${file}`;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentTypes[ext || ''] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  }

  // List all campaigns and files
  if (!fs.existsSync(CONTENT_DIR)) {
    return NextResponse.json({ campaigns: [], totalFiles: 0 });
  }

  const entries = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });
  const campaigns: CampaignGroup[] = [];

  // Only show output directories (end with _output)
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.endsWith('_output')) continue;

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
    }).sort((a, b) => {
      // Sort: best_content.txt first, then qa.json, then others
      const order: Record<string, number> = { 'best_content.txt': 0, 'qa.json': 1, 'full_output.json': 2, 'prediction.json': 3 };
      const aOrder = order[a.name] ?? 99;
      const bOrder = order[b.name] ?? 99;
      return aOrder - bOrder;
    });

    if (fileInfos.length > 0) {
      campaigns.push({
        campaign: entry.name,
        label: getLabel(entry.name),
        files: fileInfos,
      });
    }
  }

  // Sort campaigns: marbmarket first, then campaign_3, then others
  campaigns.sort((a, b) => {
    const order: Record<string, number> = {
      'marbmarket-m0_output': 0,
      'marbmarket-m1_output': 1,
      'campaign_3_output': 2,
    };
    return (order[a.campaign] ?? 99) - (order[b.campaign] ?? 99);
  });

  const totalFiles = campaigns.reduce((sum, c) => sum + c.files.length, 0);

  return NextResponse.json({
    campaigns,
    totalFiles,
    generatedAt: new Date().toISOString(),
  });
}
