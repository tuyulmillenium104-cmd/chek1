import fs from 'fs';
import path from 'path';
import type { KnowledgeSubmission, Patterns, CampaignMetadata } from './types';

const DATA_DIR = path.join(process.cwd(), 'campaign_data');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getCampaignDir(slug: string) {
  return path.join(DATA_DIR, slug);
}

// --- Submissions (JSONL) ---
export function appendSubmission(slug: string, submission: KnowledgeSubmission): void {
  const dir = getCampaignDir(slug);
  ensureDir(dir);
  const filePath = path.join(dir, 'submissions.jsonl');
  const line = JSON.stringify(submission) + '\n';
  fs.appendFileSync(filePath, line, 'utf-8');
}

export function readSubmissions(slug: string): KnowledgeSubmission[] {
  const filePath = path.join(getCampaignDir(slug), 'submissions.jsonl');
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) return [];
  return content.split('\n').map(line => JSON.parse(line));
}

// --- Seen Hashes ---
export function readSeenHashes(slug: string): string[] {
  const filePath = path.join(getCampaignDir(slug), 'seen_hashes.json');
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function addSeenHashes(slug: string, hashes: string[]): void {
  const dir = getCampaignDir(slug);
  ensureDir(dir);
  const filePath = path.join(dir, 'seen_hashes.json');
  const existing = readSeenHashes(slug);
  const merged = [...new Set([...existing, ...hashes])];
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
}

// --- Patterns ---
export function readPatterns(slug: string): Patterns | null {
  const filePath = path.join(getCampaignDir(slug), 'patterns.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writePatterns(slug: string, patterns: Patterns): void {
  const dir = getCampaignDir(slug);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'patterns.json'), JSON.stringify(patterns, null, 2), 'utf-8');
}

// --- Metadata ---
export function readMetadata(slug: string): CampaignMetadata | null {
  const filePath = path.join(getCampaignDir(slug), 'metadata.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeMetadata(slug: string, metadata: CampaignMetadata): void {
  const dir = getCampaignDir(slug);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
}

// --- Init Campaign ---
export function initCampaign(slug: string, campaignAddress: string, campaignName: string): void {
  const dir = getCampaignDir(slug);
  ensureDir(dir);
  const existing = readMetadata(slug);
  if (!existing) {
    writeMetadata(slug, {
      campaignAddress,
      campaignName,
      slug,
      totalSubmissions: 0,
      lastLearnAt: null,
      gradeDistribution: { S: 0, A: 0, B: 0, C: 0 },
      cronActive: false,
      cronInterval: '6h',
      lastCronRun: null,
      nextCronRun: null,
    });
  }
}

// --- Pattern Extraction ---
function calculateGrade(totalScore: number): string {
  if (totalScore >= 16) return 'S';
  if (totalScore >= 13) return 'A';
  if (totalScore >= 9) return 'B';
  return 'C';
}

export function extractPatterns(slug: string): Patterns {
  const submissions = readSubmissions(slug);
  if (submissions.length === 0) {
    return {
      topPhrases: [],
      rejectionReasons: [],
      winningStructures: { avgLength: 0, commonFormats: [], topHashtags: [] },
      categoryInsights: {},
      lastExtractedAt: new Date().toISOString(),
    };
  }

  const topPhrases: Record<string, { count: number; totalScore: number }> = {};
  const rejectionReasons: Record<string, { count: number; totalScore: number }> = {};
  const winningLengths: number[] = [];
  const hashtagCounts: Record<string, number> = {};
  const categoryInsights: Record<string, { high: string[]; low: string[] }> = {};

  for (const sub of submissions) {
    const isHighGrade = sub.grade === 'S' || sub.grade === 'A';
    const isLowGrade = sub.grade === 'C';

    for (const score of sub.scores) {
      if (!categoryInsights[score.category]) {
        categoryInsights[score.category] = { high: [], low: [] };
      }
      if (score.score >= score.maxScore * 0.8) {
        categoryInsights[score.category].high.push(score.analysis.substring(0, 200));
      } else if (score.score < score.maxScore * 0.5) {
        categoryInsights[score.category].low.push(score.analysis.substring(0, 200));
      }
    }

    if (isHighGrade) {
      for (const score of sub.scores) {
        const words = score.analysis.split(/\s+/).filter(w => w.length > 4);
        for (const word of words) {
          const lower = word.toLowerCase().replace(/[^a-z]/g, '');
          if (lower.length > 4) {
            if (!topPhrases[lower]) topPhrases[lower] = { count: 0, totalScore: 0 };
            topPhrases[lower].count++;
            topPhrases[lower].totalScore += sub.totalScore;
          }
        }
      }
    }

    if (isLowGrade) {
      for (const score of sub.scores) {
        const words = score.analysis.split(/\s+/).filter(w => w.length > 4);
        for (const word of words) {
          const lower = word.toLowerCase().replace(/[^a-z]/g, '');
          if (lower.length > 4) {
            if (!rejectionReasons[lower]) rejectionReasons[lower] = { count: 0, totalScore: 0 };
            rejectionReasons[lower].count++;
            rejectionReasons[lower].totalScore += sub.totalScore;
          }
        }
      }
    }

    if (isHighGrade) {
      winningLengths.push(0);
    }
  }

  const sortedPhrases = Object.entries(topPhrases)
    .map(([phrase, data]) => ({ phrase, frequency: data.count, avgScore: data.totalScore / data.count }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);

  const sortedRejections = Object.entries(rejectionReasons)
    .map(([reason, data]) => ({ phrase: reason, frequency: data.count, avgScore: data.totalScore / data.count }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);

  const insights: Record<string, { highScorePattern: string; lowScorePattern: string }> = {};
  for (const [cat, data] of Object.entries(categoryInsights)) {
    insights[cat] = {
      highScorePattern: data.high.slice(0, 3).join(' | '),
      lowScorePattern: data.low.slice(0, 3).join(' | '),
    };
  }

  return {
    topPhrases: sortedPhrases,
    rejectionReasons: sortedRejections,
    winningStructures: {
      avgLength: winningLengths.length > 0 ? winningLengths.reduce((a, b) => a + b, 0) / winningLengths.length : 0,
      commonFormats: [],
      topHashtags: Object.entries(hashtagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h]) => h),
    },
    categoryInsights: insights,
    lastExtractedAt: new Date().toISOString(),
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}
