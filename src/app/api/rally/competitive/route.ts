/**
 * POST /api/rally/competitive
 *
 * Runs competitive intelligence analysis for a campaign.
 * Fetches competitor content, analyzes patterns, builds differentiation strategy.
 * Can be called standalone before pipeline, or is auto-run inside the pipeline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runCompetitiveAnalysis } from '@/lib/rally-competitive';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignData } = body;

    if (!campaignData || !campaignData.title) {
      return NextResponse.json(
        { success: false, error: 'Missing campaignData with at least a title' },
        { status: 400 }
      );
    }

    console.log(`[API] Running competitive analysis for: "${campaignData.title}"`);

    const analysis = await runCompetitiveAnalysis(campaignData);

    return NextResponse.json({
      success: true,
      analysis: {
        // Summary data (not full competitor contents — too large for response)
        competitorsAnalyzed: analysis.totalCompetitorsAnalyzed,
        searchQueriesUsed: analysis.searchQueries,
        patterns: analysis.patterns,
        differentiation: analysis.differentiation,
        campaignWeights: analysis.campaignWeights,
        pipelineInstructions: analysis.pipelineInstructions,
        analysisTimestamp: analysis.analysisTimestamp,
        // Competitor summaries (not full content)
        competitorSummaries: analysis.competitors.map((c) => ({
          source: c.source,
          url: c.url,
          author: c.author,
          contentLength: c.content.length,
          analysis: c.analysis ? {
            angle: c.analysis.angle,
            hook: c.analysis.hook,
            tone: c.analysis.tone,
            estimatedCP: c.analysis.estimatedCP,
          } : null,
        })),
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Competitive analysis error:', errorMsg);

    return NextResponse.json(
      { success: false, error: `Competitive analysis failed: ${errorMsg}` },
      { status: 500 }
    );
  }
}
