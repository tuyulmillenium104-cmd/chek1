import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Read directly from campaign_data — always fresh from cron runs
const CONTENT_DIR = '/home/z/my-project/download/rally-brain/campaign_data';
const CONSOLIDATED_FILE = '/home/z/my-project/download/rally-all-content.txt';

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

interface ListResponse {
  campaigns: CampaignGroup[];
  consolidatedFile?: FileInfo;
  totalFiles: number;
  generatedAt: string;
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

// GET /api/rally-content — list all files or serve download
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  const campaign = searchParams.get('campaign');

  // ── Special: consolidated file download ──
  if (file === 'rally-all-content.txt' && campaign === '__all__') {
    if (!fs.existsSync(CONSOLIDATED_FILE)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const fileBuffer = fs.readFileSync(CONSOLIDATED_FILE);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="rally-all-content.txt"',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  }

  // ── Individual file download ──
  if (file && campaign) {
    const filePath = path.join(CONTENT_DIR, campaign, file);
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

    const safeName = campaign.replace(/_output$/, '');
    const downloadName = `${safeName}_${file}`;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentTypes[ext || ''] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  }

  // ── List all campaigns and files ──
  if (!fs.existsSync(CONTENT_DIR)) {
    return NextResponse.json({ campaigns: [], totalFiles: 0 });
  }

  const entries = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });
  const campaigns: CampaignGroup[] = [];

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
      const order: Record<string, number> = { 'best_content.txt': 0, 'qa.json': 1, 'full_output.json': 2, 'prediction.json': 3 };
      return (order[a.name] ?? 99) - (order[b.name] ?? 99);
    });

    if (fileInfos.length > 0) {
      campaigns.push({
        campaign: entry.name,
        label: getLabel(entry.name),
        files: fileInfos,
      });
    }
  }

  campaigns.sort((a, b) => {
    const order: Record<string, number> = {
      'marbmarket-m0_output': 0,
      'marbmarket-m1_output': 1,
      'campaign_3_output': 2,
    };
    return (order[a.campaign] ?? 99) - (order[b.campaign] ?? 99);
  });

  // Build consolidated file info if exists
  let consolidatedFile: FileInfo | undefined;
  if (fs.existsSync(CONSOLIDATED_FILE)) {
    const stat = fs.statSync(CONSOLIDATED_FILE);
    consolidatedFile = {
      name: 'rally-all-content.txt',
      path: '__all__/rally-all-content.txt',
      size: stat.size,
      modified: stat.mtime.toISOString(),
      type: 'txt',
    };
  }

  const campaignFiles = campaigns.reduce((sum, c) => sum + c.files.length, 0);

  const response: ListResponse = {
    campaigns,
    consolidatedFile,
    totalFiles: campaignFiles + (consolidatedFile ? 1 : 0),
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
