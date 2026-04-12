import { NextResponse } from 'next/server';
import { getKnowledgeVault } from '@/lib/rally-data';

export async function GET() {
  try {
    const vault = getKnowledgeVault();

    if (!vault) {
      return NextResponse.json(
        {
          error: 'Knowledge vault not found',
          total_campaigns_worked: 0,
          total_18_18_achieved: 0,
          avg_score: 0,
          campaigns: [],
          cross_campaign: {
            hardest_dimensions_ranked: [],
            best_hook_styles: [],
            common_mistakes: [],
            writing_techniques_ranked: [],
            content_length_ideal: {},
            anti_ai_checklist: [],
            engagement_5_5_insights: {},
          },
          adaptive_system: {
            enabled: false,
            evolution_count: 0,
            patterns: [],
            staleness_score: 0,
            rule_decay: { hard_rules_count: 0, hard_rules: [], soft_rules: [] },
          },
          calibration: {
            global: { total_bias: 0, total_samples: 0, well_calibrated: false, note: '' },
            dimensions: {},
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Map campaigns: vault uses `campaign_name`, tab expects `name`
    const campaigns = (vault.campaigns || []).map((c: any) => ({
      name: c.campaign_name || c.name || '',
      final_score: c.final_score ?? 0,
      rally_actual_score: c.rally_actual_score ?? 0,
      achieved_18_18: c.achieved_18_18 ?? false,
      cycles_needed: c.cycles_needed ?? 0,
      winning_angle: c.winning_angle || '',
      winning_variation: c.winning_variation || '',
      winning_hook: c.winning_hook || '',
    }));

    // Cross-campaign lessons — vault uses `cross_campaign_lessons`, tab expects `cross_campaign`
    const lessons = vault.cross_campaign_lessons || {};
    const cross_campaign = {
      hardest_dimensions_ranked: lessons.hardest_dimensions_ranked || [],
      best_hook_styles: lessons.best_hook_styles || [],
      common_mistakes: lessons.common_mistakes_to_avoid || [],
      writing_techniques_ranked: (lessons.writing_techniques_ranked || []).map((t: any) => ({
        technique: t.technique || '',
        success_rate: t.success_rate || '',
        used_in: t.used_in || '',
        note: t.note || undefined,
      })),
      content_length_ideal: lessons.content_length_ideal || {},
      anti_ai_checklist: lessons.anti_ai_checklist || [],
      engagement_5_5_insights: lessons.engagement_5_5_insights || {},
    };

    // Adaptive system — extract patterns array and staleness score
    const adaptive = vault.adaptive_system || {};
    const patternTracker = adaptive.pattern_effectiveness_tracker || {};
    const rawPatterns = patternTracker.patterns || [];
    const patterns = rawPatterns.map((p: any) => ({
      id: p.id || '',
      name: p.pattern_name || p.name || '',
      category: p.category || '',
      description: p.base_description || p.description || '',
      weight: p.adaptive?.weight ?? p.weight ?? 0,
      confidence: p.adaptive?.confidence ?? p.confidence ?? 0,
      success_rate: p.adaptive?.success_rate ?? p.success_rate ?? 0,
      times_used: p.adaptive?.times_used ?? p.times_used ?? 0,
      status: (p.adaptive?.status ?? p.status) || 'active',
      overuse_flag: p.adaptive?.overuse_flag ?? p.overuse_flag ?? false,
    }));
    const antiStaleness = adaptive.anti_staleness || {};
    const ruleDecay = adaptive.rule_decay_system || {};

    const adaptive_system = {
      enabled: adaptive.enabled ?? false,
      evolution_count: adaptive.evolution_count ?? 0,
      patterns,
      staleness_score: antiStaleness.current_staleness_score ?? 0,
      rule_decay: {
        hard_rules_count: ruleDecay.hard_rules_count || 0,
        hard_rules: ruleDecay.hard_rules || [],
        soft_rules: (ruleDecay.soft_rules || []).map((r: any) => ({
          id: r.id || '',
          rule: r.rule || '',
          confidence: r.effective_confidence ?? r.base_confidence ?? r.confidence ?? 0,
          status: r.status || 'active',
        })),
      },
    };

    // Calibration — vault has `adaptive_system.calibration`
    const cal = adaptive.calibration || {};
    const globalCal = cal.global_calibration || {};
    const dimCal = cal.dimension_calibration || {};
    const calibration = {
      global: {
        total_bias: globalCal.total_bias || 0,
        total_samples: globalCal.total_samples || 0,
        well_calibrated: globalCal.well_calibrated ?? false,
        note: globalCal.note || '',
      },
      dimensions: Object.fromEntries(
        Object.entries(dimCal).map(([dim, data]: [string, any]) => [
          dim,
          {
            internal_bias: data.internal_bias || 0,
            trend: data.trend || 'stable',
            confidence: data.confidence ?? 0,
          },
        ])
      ),
    };

    const data = {
      total_campaigns_worked: vault.total_campaigns_worked ?? 0,
      total_18_18_achieved: vault.total_18_18_achieved ?? 0,
      avg_score: vault.avg_score_across_campaigns ?? 0,
      campaigns,
      cross_campaign,
      adaptive_system,
      calibration,
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load rally knowledge', message: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
