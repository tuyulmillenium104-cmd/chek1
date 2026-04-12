import { NextResponse } from 'next/server';
import { getKnowledgeVault, getPatternCache } from '@/lib/rally-data';

export async function GET() {
  try {
    const vault = getKnowledgeVault();
    const patternCache = getPatternCache();

    // Top competitor content from vault competitive_intelligence
    const ci = vault?.competitive_intelligence || {};
    const top_competitor_content = (ci.top_competitor_content || []).map((c: any) => ({
      username: c.username || '',
      content: c.content || '',
      true_score: c.true_score ?? 0,
      max_possible: c.max_possible ?? 18,
      scores: c.scores || {},
      campaign: c.campaign || '',
    }));

    // Score insights — normalize field names
    const rawInsights = ci.score_insights || {};
    const score_insights = {
      highest_true_score: rawInsights.highest_true_score_seen ?? rawInsights.highest_true_score ?? 0,
      average_top_10: rawInsights.average_true_score_top10 ?? rawInsights.average_top_10 ?? '0',
    };

    // Overused phrases from pattern_cache.inherited_patterns
    const inherited = patternCache?.inherited_patterns_from_prev_campaign || {};
    const overused_phrases = (inherited.overused_phrases || []).map((p: any) => {
      // Could be string or object
      if (typeof p === 'string') return { phrase: p, pct: 0, note: '' };
      return { phrase: p.phrase || '', pct: p.pct ?? 0, note: p.note || '' };
    });

    // Overused angles
    const overused_angles = inherited.overused_angles || [];

    // Unique gaps
    const unique_gaps = inherited.unique_gaps || [];

    // Inherited top performers — map to flat shape
    const inherited_top_performers = (inherited.top_performers || []).map((p: any) => {
      if (typeof p === 'string') return { username: p, score: 0, notes: '' };
      return { username: p.username || p.name || '', score: p.score ?? p.true_score ?? 0, notes: p.notes || p.note || '' };
    });

    // Total competitor entries
    const total_competitor_entries = vault?.total_competitor_entries || top_competitor_content.length;

    const data = {
      top_competitor_content,
      score_insights,
      overused_phrases,
      overused_angles,
      unique_gaps,
      inherited_top_performers,
      total_competitor_entries,
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load competitor data', message: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
