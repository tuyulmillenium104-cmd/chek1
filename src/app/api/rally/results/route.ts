/**
 * GET /api/rally/results
 *
 * Returns generated results:
 * - ?jobId=xxx — get specific result from in-memory background job
 * - Without params — list recent results from filesystem and historical data
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getJobStatus } from '@/lib/background-job';

const RESULTS_DIR = '/home/z/my-project/rally-jobs/results';
const HISTORICAL_DIR = '/tmp/chek1/campaign_data';

interface ResultItem {
  id: string;
  source: 'pipeline' | 'historical' | 'memory';
  campaignName: string;
  content: string | null;
  score: number | null;
  grade: string | null;
  categories: Array<{ name: string; score: number; maxScore: number; percentage: number }>;
  qaPairs: Array<{ q: string; a: string }>;
  g4Reasons: string[];
  timestamp: string;
  metadata: Record<string, unknown>;
}

interface HistoricalOutput {
  campaign?: string;
  mission?: string;
  best_content?: string;
  score?: number;
  grade?: string;
  predictions?: Record<string, number>;
  g4_reasons?: string[];
  qna_pairs?: Array<{ q: string; a: string }>;
  timestamp?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId');

    if (jobId) {
      const job = getJobStatus(jobId);
      if (job && job.result) {
        const result = job.result;
        return NextResponse.json({
          success: true,
          source: 'memory',
          result: {
            id: jobId,
            source: 'memory',
            campaignName: result.campaignName,
            content: result.bestContent,
            score: result.bestScoring?.contentQualityScore ?? null,
            grade: result.bestScoring?.overallGrade ?? null,
            categories: (result.bestScoring?.categories || []).map((c) => ({
              name: c.name,
              score: c.score,
              maxScore: c.maxScore,
              percentage: c.percentage,
            })),
            qaPairs: [],
            g4Reasons: result.bestScoring?.g4Detection?.bonuses || [],
            timestamp: new Date(job.startedAt).toISOString(),
            metadata: {
              totalCycles: result.totalCycles,
              totalVariations: result.totalVariationsGenerated,
              totalAIcalls: result.totalAIcalls,
              processingTime: result.processingTime,
              status: result.status,
              estimatedPosition: result.bestScoring?.estimatedPosition,
              passesThreshold: result.bestScoring?.passesThreshold,
            },
          },
        });
      }

      const fsResult = await readResultFromFile(jobId);
      if (fsResult) {
        return NextResponse.json({ success: true, source: 'pipeline', result: fsResult });
      }

      return NextResponse.json(
        { success: false, error: 'Result not found for jobId: ' + jobId },
        { status: 404 }
      );
    }

    const results: ResultItem[] = [];

    try {
      const files = await fs.readdir(RESULTS_DIR);
      const jsonFiles = files.filter((f) => f.endsWith('.json')).sort().reverse();
      for (const file of jsonFiles.slice(0, 20)) {
        try {
          const content = await fs.readFile(path.join(RESULTS_DIR, file), 'utf-8');
          const data = JSON.parse(content);
          results.push({
            id: data.jobId || file.replace('.json', ''),
            source: 'pipeline',
            campaignName: data.campaignName || 'Unknown',
            content: data.bestContent || null,
            score: data.bestScoring?.contentQualityScore ?? null,
            grade: data.bestScoring?.overallGrade ?? null,
            categories: (data.bestScoring?.categories || []).map((c: Record<string, unknown>) => ({
              name: c.name,
              score: c.score,
              maxScore: c.maxScore,
              percentage: c.percentage,
            })),
            qaPairs: [],
            g4Reasons: [],
            timestamp: data.completedAt || new Date().toISOString(),
            metadata: {
              status: data.status,
              totalCycles: data.totalCycles,
              totalVariations: data.totalVariationsGenerated,
              processingTime: data.processingTime,
            },
          });
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Results dir may be empty
    }

    try {
      const dirs = await fs.readdir(HISTORICAL_DIR);
      for (const dir of dirs) {
        if (dir.startsWith('.')) continue;
        const outputDir = path.join(HISTORICAL_DIR, dir, 'output');
        try {
          const outputFiles = await fs.readdir(outputDir);
          const fullOutputFile = outputFiles.find((f) => f === 'full_output.json');
          const qaFile = outputFiles.find((f) => f === 'qa.json');
          if (!fullOutputFile) continue;

          const fullContent = await fs.readFile(path.join(outputDir, fullOutputFile), 'utf-8');
          const fullData: HistoricalOutput = JSON.parse(fullContent);

          let qaPairs: Array<{ q: string; a: string }> = [];
          if (qaFile) {
            try {
              const qaContent = await fs.readFile(path.join(outputDir, qaFile), 'utf-8');
              const qaData = JSON.parse(qaContent);
              qaPairs = qaData.qna_pairs || qaData.qaPairs || [];
            } catch {
              // Skip
            }
          }
          if (qaPairs.length === 0 && fullData.qna_pairs) {
            qaPairs = fullData.qna_pairs;
          }

          const predCategories = fullData.predictions
            ? Object.entries(fullData.predictions).map(([key, value]) => ({
                name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                score: value as number,
                maxScore: key === 'engagement' || key === 'technical' || key === 'reply_quality' ? 5 : 2,
                percentage: key === 'engagement' || key === 'technical' || key === 'reply_quality'
                  ? Math.round(((value as number) / 5) * 100)
                  : Math.round(((value as number) / 2) * 100),
              }))
            : [];

          results.push({
            id: 'historical-' + dir,
            source: 'historical',
            campaignName: fullData.campaign || dir,
            content: fullData.best_content || null,
            score: fullData.score ?? null,
            grade: fullData.grade ?? null,
            categories: predCategories,
            qaPairs,
            g4Reasons: fullData.g4_reasons || [],
            timestamp: fullData.timestamp || '',
            metadata: {
              mission: fullData.mission,
              version: fullData.version,
              validJudges: fullData.valid_judges,
              totalVariations: fullData.total_variations,
              loopsUsed: fullData.loops_used,
              programmaticScore: fullData.programmatic_score,
              programmaticGrade: fullData.programmatic_grade,
            },
          });
        } catch {
          // Output dir may not exist
        }
      }
    } catch {
      // Historical dir may not exist
    }

    results.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json({
      success: true,
      total: results.length,
      results: results.slice(0, 30),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Results error:', errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

async function readResultFromFile(jobId: string): Promise<ResultItem | null> {
  try {
    const filePath = path.join(RESULTS_DIR, jobId + '.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return {
      id: data.jobId || jobId,
      source: 'pipeline',
      campaignName: data.campaignName || 'Unknown',
      content: data.bestContent || null,
      score: data.bestScoring?.contentQualityScore ?? null,
      grade: data.bestScoring?.overallGrade ?? null,
      categories: (data.bestScoring?.categories || []).map((c: Record<string, unknown>) => ({
        name: c.name,
        score: c.score,
        maxScore: c.maxScore,
        percentage: c.percentage,
      })),
      qaPairs: [],
      g4Reasons: [],
      timestamp: data.completedAt || '',
      metadata: {
        status: data.status,
        totalCycles: data.totalCycles,
        processingTime: data.processingTime,
      },
    };
  } catch {
    return null;
  }
}
