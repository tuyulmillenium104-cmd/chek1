import { NextResponse } from 'next/server';
import {
  getMaster, getBestContent, parseBestContent, getCurrentVariations,
  getCycleConsensus, getCycleFinal, analyzeContent,
} from '@/lib/rally-data';

export async function GET() {
  try {
    const master = getMaster();
    const rawBestContent = getBestContent();
    const parsedBestContent = parseBestContent(rawBestContent);
    const rawVariations = getCurrentVariations();
    const cycleConsensus = getCycleConsensus();
    const cycleFinal = getCycleFinal();
    const mission = master?.active_campaign?.missions?.[0];
    const bestContentInfo = mission?.best_content || null;

    // Build variations array with analysis and consensus scores
    const variations: any[] = [];

    if (rawVariations && typeof rawVariations === 'object') {
      for (const [id, content] of Object.entries(rawVariations)) {
        if (typeof content === 'string') {
          const analysis = analyzeContent(content);
          const consensus = cycleConsensus?.consensus?.[id] || null;

          // Merge gate + quality scores into 6-dimension format
          const scores = consensus ? {
            originality: consensus.gates?.O ?? consensus.gates?.originality ?? 0,
            alignment: consensus.gates?.A ?? consensus.gates?.alignment ?? 0,
            accuracy: consensus.gates?.Ac ?? consensus.gates?.accuracy ?? 0,
            compliance: consensus.gates?.C ?? consensus.gates?.compliance ?? 0,
            engagement: consensus.quality?.E ?? consensus.quality?.engagement ?? 0,
            technical: consensus.quality?.T ?? consensus.quality?.technical ?? 0,
            total: consensus.total ?? 0,
          } : null;

          variations.push({
            id,
            text: content,
            word_count: analysis.wordCount,
            char_count: analysis.charCount,
            paragraph_cv: analysis.paragraphCV,
            question_count: analysis.questionCount,
            contraction_count: analysis.contractionCount,
            compliance: {
              no_em_dash: !analysis.hasEmDash,
              no_hashtag: !analysis.hasHashtag,
              has_rally_mention: analysis.hasRallyMention,
              no_start_mention: !analysis.startsWithMention,
              no_ai_words: analysis.foundAiWords.length === 0,
              no_template_phrases: analysis.foundTemplates.length === 0,
            },
            compliance_issues: analysis.complianceIssues,
            passed: analysis.passed,
            paragraph_lengths: analysis.paragraphLengths,
            scores,
          });
        }
      }
    }

    // Sort by score (highest first)
    variations.sort((a, b) => (b.scores?.total ?? 0) - (a.scores?.total ?? 0));

    const data = {
      best_content: parsedBestContent?.content || rawBestContent,
      best_content_meta: parsedBestContent?.meta || null,
      best_content_judge: parsedBestContent?.judgeSection || null,
      best_content_strengths: parsedBestContent?.strengths || [],
      best_content_weaknesses: parsedBestContent?.weaknesses || [],
      winner: cycleConsensus?.winner || cycleFinal?.winner || bestContentInfo?.variation || null,
      best_score: bestContentInfo?.score ?? null,
      best_variation: bestContentInfo?.variation ?? null,
      best_angle: bestContentInfo?.angle ?? null,
      variations,
      variation_count: variations.length,
      cycle_consensus: cycleConsensus,
      cycle_final: cycleFinal,
      mission_directive: mission?.directive || '',
      mission_rules: mission?.rules || [],
      mission_description: mission?.description || '',
      mission_proposed_angles: mission?.proposed_angles || [],
      mission_style: master?.active_campaign?.style || '',
      mission_goal: master?.active_campaign?.goal || '',
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load rally content', message: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
