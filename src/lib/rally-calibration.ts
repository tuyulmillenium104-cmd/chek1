/**
 * Rally Scoring Calibration
 *
 * Compares our local scoring with Rally's REAL scoring from actual submissions.
 * Uses fetchRallySubmissions() to get ground truth data, then provides:
 * 1. Category alignment mapping (our categories → Rally's real categories)
 * 2. Score comparison (our estimate vs Rally actual)
 * 3. Threshold calibration (what Rally actually considers "passing")
 * 4. Pattern analysis (what top submissions have in common)
 * 5. Calibration factor suggestions for our scoring system
 *
 * This is the KEY to increasing accuracy from ~55% to 75-80%.
 */

import {
  fetchRallySubmissions,
  parseSubmission,
  getSubmissionsSummary,
  type ParsedSubmission,
  type RallyAnalysisCategory,
  type SubmissionsSummary,
} from './rally-submissions';

// ─── Types ──────────────────────────────────────────────────────────

export interface CalibrationData {
  campaignAddress: string;
  timestamp: string;
  submissionsAnalyzed: number;
  /** Our current scoring structure */
  ourCategories: string[];
  /** Rally's actual scoring categories */
  rallyCategories: {
    content: string[];
    engagement: string[];
  };
  /** Category mapping: our category → Rally's closest category */
  categoryMapping: {
    ourCategory: string;
    rallyCategory: string;
    confidence: 'high' | 'medium' | 'low';
  }[];
  /** Score thresholds discovered from real data */
  thresholds: {
    /** Minimum content quality % to be in top 50% */
    top50Pct: number;
    /** Minimum content quality % to be in top 25% */
    top25Pct: number;
    /** Minimum content quality % to be in top 10% */
    top10Pct: number;
    /** Maximum content quality % (perfect score) */
    perfectPct: number;
    /** Average content quality % */
    averagePct: number;
  };
  /** Analysis of what top submissions have in common */
  topPatterns: {
    category: string;
    topAvgPct: number;
    overallAvgPct: number;
    delta: number;
    insight: string;
  }[];
  /** Categories where most submissions fail/struggle */
  weakPoints: string[];
  /** Suggested calibration adjustments */
  calibrationSuggestions: string[];
  /** Top submission examples with full analysis */
  topExamples: ParsedSubmission[];
}

// ─── Category Mapping ──────────────────────────────────────────────

/**
 * Map our scoring categories to Rally's real categories.
 * This is based on analysis of the actual Rally API data.
 */
const CATEGORY_MAPPING: {
  ourCategory: string;
  rallyCategory: string;
  confidence: 'high' | 'medium' | 'low';
}[] = [
  // Our gates → Rally's content categories
  { ourCategory: 'gateUtama (Campaign Match)', rallyCategory: 'Content Alignment', confidence: 'high' },
  { ourCategory: 'gateTambahan (Additional Quality)', rallyCategory: 'Engagement Potential', confidence: 'medium' },
  { ourCategory: 'g4Originality', rallyCategory: 'Originality and Authenticity', confidence: 'high' },
  { ourCategory: 'punctuation', rallyCategory: 'Technical Quality', confidence: 'medium' },

  // Our quality → Rally's content categories
  { ourCategory: 'factCheck', rallyCategory: 'Information Accuracy', confidence: 'high' },
  { ourCategory: 'internalQuality', rallyCategory: 'Technical Quality', confidence: 'medium' },

  // Our engagement → Rally's content + engagement categories
  { ourCategory: 'hook', rallyCategory: 'Engagement Potential', confidence: 'high' },
  { ourCategory: 'resonance', rallyCategory: 'Engagement Potential', confidence: 'medium' },
  { ourCategory: 'shareability', rallyCategory: 'Engagement Potential', confidence: 'low' },
  { ourCategory: 'commentTrigger', rallyCategory: 'Reply Quality', confidence: 'medium' },
  { ourCategory: 'viralPotential', rallyCategory: 'Impressions', confidence: 'low' },
];

// ─── Calibration Engine ─────────────────────────────────────────────

/**
 * Run full calibration by fetching real Rally submissions and comparing
 * their scoring structure with ours.
 */
export async function runCalibration(
  campaignAddress: string
): Promise<CalibrationData> {
  console.log(`[Calibration] Starting calibration for ${campaignAddress.substring(0, 10)}...`);

  const summary = await getSubmissionsSummary(campaignAddress, { limit: 200 });
  const validSubmissions = summary.topByContent;

  console.log(`[Calibration] Analyzed ${summary.totalValid} valid submissions`);

  // Analyze what top submissions have in common vs average
  const topN = Math.min(10, Math.max(5, Math.floor(validSubmissions.length * 0.1)));
  const topSubmissions = validSubmissions.slice(0, topN);
  const allSubmissions = validSubmissions;

  // Calculate per-category averages for top vs overall
  const topPatterns = analyzeTopPatterns(topSubmissions, allSubmissions);

  // Generate calibration suggestions
  const suggestions = generateCalibrationSuggestions(summary, topPatterns);

  return {
    campaignAddress,
    timestamp: new Date().toISOString(),
    submissionsAnalyzed: summary.totalValid,
    ourCategories: [
      'gateUtama', 'gateTambahan', 'g4Originality', 'punctuation',
      'factCheck', 'internalQuality',
      'hook', 'resonance', 'shareability', 'commentTrigger', 'viralPotential',
    ],
    rallyCategories: {
      content: summary.contentCategories,
      engagement: summary.engagementCategories,
    },
    categoryMapping: CATEGORY_MAPPING,
    thresholds: {
      top50Pct: summary.stats.contentQuality.p50,
      top25Pct: summary.stats.contentQuality.p75,
      top10Pct: summary.stats.contentQuality.p90,
      perfectPct: summary.stats.contentQuality.max,
      averagePct: summary.stats.contentQuality.mean,
    },
    topPatterns,
    weakPoints: summary.weakCategories,
    calibrationSuggestions: suggestions,
    topExamples: topSubmissions.slice(0, 5),
  };
}

/**
 * Analyze what top-performing submissions have in common compared to average.
 */
function analyzeTopPatterns(
  topSubmissions: ParsedSubmission[],
  allSubmissions: ParsedSubmission[]
): CalibrationData['topPatterns'] {
  const patterns: CalibrationData['topPatterns'] = [];

  // Get all content category names
  const categoryNames = new Set<string>();
  for (const s of allSubmissions) {
    for (const c of s.categories) {
      if (c.isContent) categoryNames.add(c.name);
    }
  }

  for (const catName of categoryNames) {
    // Top submissions average for this category
    let topTotal = 0;
    let topCount = 0;
    for (const s of topSubmissions) {
      const cat = s.categories.find((c) => c.name === catName && c.isContent);
      if (cat) {
        topTotal += cat.percentage;
        topCount++;
      }
    }
    const topAvg = topCount > 0 ? topTotal / topCount : 0;

    // Overall average for this category
    let allTotal = 0;
    let allCount = 0;
    for (const s of allSubmissions) {
      const cat = s.categories.find((c) => c.name === catName && c.isContent);
      if (cat) {
        allTotal += cat.percentage;
        allCount++;
      }
    }
    const allAvg = allCount > 0 ? allTotal / allCount : 0;

    const delta = topAvg - allAvg;

    let insight: string;
    if (delta > 10) {
      insight = `Top submissions score ${delta.toFixed(0)}% higher — this is a KEY differentiator. Focus here.`;
    } else if (delta > 5) {
      insight = `Slightly higher in top submissions (+${delta.toFixed(0)}%). Worth optimizing.`;
    } else if (delta < -5) {
      insight = `Top submissions actually score LOWER here (${delta.toFixed(0)}%). May not be critical.`;
    } else {
      insight = `Similar scores across the board. This is a baseline requirement.`;
    }

    patterns.push({
      category: catName,
      topAvgPct: Math.round(topAvg * 10) / 10,
      overallAvgPct: Math.round(allAvg * 10) / 10,
      delta: Math.round(delta * 10) / 10,
      insight,
    });
  }

  // Sort by delta (biggest differentiators first)
  patterns.sort((a, b) => b.delta - a.delta);

  return patterns;
}

/**
 * Generate actionable calibration suggestions based on real data.
 */
function generateCalibrationSuggestions(
  summary: SubmissionsSummary,
  patterns: CalibrationData['topPatterns']
): string[] {
  const suggestions: string[] = [];

  // 1. Threshold calibration
  const median = summary.stats.contentQuality.median;
  const top25 = summary.stats.contentQuality.p75;

  if (median < 90) {
    suggestions.push(
      `THRESHOLD: Rally median content quality is ${median}%. Set our quality gate CP to reflect this reality (not our arbitrary 3.0).`
    );
  }

  // 2. Category emphasis
  const topDiff = patterns.filter((p) => p.delta > 10);
  if (topDiff.length > 0) {
    suggestions.push(
      `EMPHASIS: Top submissions differentiate most on: ${topDiff.map((p) => p.category).join(', ')}. Our pipeline should heavily weight these.`
    );
  }

  // 3. Weak categories to address
  if (summary.weakCategories.length > 0) {
    suggestions.push(
      `WEAK POINT: Most submissions struggle with: ${summary.weakCategories.join(', ')}. If we can excel here, we gain an edge.`
    );
  }

  // 4. Strong categories (baseline requirements)
  if (summary.strongCategories.length > 0) {
    suggestions.push(
      `BASELINE: Nearly all submissions score high on: ${summary.strongCategories.join(', ')}. These are table stakes — failing here = elimination.`
    );
  }

  // 5. Gate alignment
  suggestions.push(
    `GATE ALIGNMENT: Rally uses 7 content categories (Originality, Content Alignment, Info Accuracy, Campaign Compliance, Engagement Potential, Technical Quality, Reply Quality). We should map our 4 gates to these 7.`
  );

  // 6. Score normalization
  const perfectPct = summary.stats.contentQuality.max;
  if (perfectPct === 100) {
    suggestions.push(
      `NORMALIZATION: Perfect score = 100%. Our 0-2 gate scale should map: 0 = below 50%, 1 = 50-85%, 2 = above 85%.`
    );
  }

  // 7. Engagement separation
  suggestions.push(
    `ENGAGEMENT: Rally separates CONTENT QUALITY (atemporal) from ENGAGEMENT (temporal). Our scoring should do the same — judge content independently, don't mix in engagement projections.`
  );

  return suggestions;
}

/**
 * Get a "ground truth prompt" for content generation based on
 * analysis of what top Rally submissions look like.
 * This can be injected into our content generation pipeline.
 */
export function buildGroundTruthPrompt(
  calibration: CalibrationData
): string {
  const parts: string[] = [];

  parts.push('═══ GROUND TRUTH FROM RALLY REAL SUBMISSIONS ═══');
  parts.push(`Analyzed ${calibration.submissionsAnalyzed} real submissions.`);
  parts.push(`To be in top 10%, content quality must be ≥ ${calibration.thresholds.top10Pct}%.`);
  parts.push(`Average content quality: ${calibration.thresholds.averagePct}%.`);

  // Top differentiators
  const topDiff = calibration.topPatterns.filter((p) => p.delta > 5);
  if (topDiff.length > 0) {
    parts.push(`\n🎯 KEY DIFFERENTIATORS (what separates top from average):`);
    for (const p of topDiff.slice(0, 5)) {
      parts.push(`  • ${p.category}: Top = ${p.topAvgPct}%, Average = ${p.overallAvgPct}% (Δ${p.delta > 0 ? '+' : ''}${p.delta.toFixed(0)}%)`);
    }
  }

  // Baseline requirements
  const strong = calibration.topPatterns.filter((p) => p.overallAvgPct > 90);
  if (strong.length > 0) {
    parts.push(`\n✅ BASELINE REQUIREMENTS (must score high on these):`);
    for (const p of strong) {
      parts.push(`  • ${p.category}: ${p.overallAvgPct}% average — failing here = likely elimination`);
    }
  }

  // Weak points (opportunity)
  if (calibration.weakPoints.length > 0) {
    parts.push(`\n💡 OPPORTUNITY (most submissions struggle here):`);
    for (const wp of calibration.weakPoints) {
      parts.push(`  • ${wp} — if we excel here, we stand out`);
    }
  }

  // Rally's actual scoring categories
  parts.push(`\n📊 RALLY'S ACTUAL SCORING CATEGORIES:`);
  parts.push(`  Content: ${calibration.rallyCategories.content.join(', ')}`);
  parts.push(`  Engagement: ${calibration.rallyCategories.engagement.join(', ')}`);

  // Examples from top submissions
  if (calibration.topExamples.length > 0) {
    parts.push(`\n📝 TOP SUBMISSION PATTERNS:`);
    for (let i = 0; i < Math.min(3, calibration.topExamples.length); i++) {
      const ex = calibration.topExamples[i];
      parts.push(`  Example ${i + 1}: @${ex.xUsername} — ${ex.contentQualityPct}% quality`);
      // Find the strongest and weakest categories for this submission
      const contentCats = ex.categories.filter((c) => c.isContent);
      contentCats.sort((a, b) => b.percentage - a.percentage);
      if (contentCats.length > 0) {
        const best = contentCats[0];
        const worst = contentCats[contentCats.length - 1];
        parts.push(`    Strongest: ${best.name} (${best.percentage}%), Weakest: ${worst.name} (${worst.percentage}%)`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Format calibration data for display in the UI.
 */
export function formatCalibrationForUI(calibration: CalibrationData): {
  summary: { total: number; timestamp: string };
  thresholds: { label: string; value: number }[];
  patterns: { category: string; topPct: number; avgPct: number; delta: number; insight: string }[];
  categoryMap: { ours: string; rally: string; confidence: string }[];
  suggestions: string[];
  topExamples: { username: string; quality: number; url: string; categories: { name: string; pct: number }[] }[];
} {
  return {
    summary: {
      total: calibration.submissionsAnalyzed,
      timestamp: calibration.timestamp,
    },
    thresholds: [
      { label: 'Perfect Score', value: calibration.thresholds.perfectPct },
      { label: 'Top 10% Threshold', value: calibration.thresholds.top10Pct },
      { label: 'Top 25% Threshold', value: calibration.thresholds.top25Pct },
      { label: 'Top 50% (Median)', value: calibration.thresholds.top50Pct },
      { label: 'Average', value: calibration.thresholds.averagePct },
    ],
    patterns: calibration.topPatterns.map((p) => ({
      category: p.category,
      topPct: p.topAvgPct,
      avgPct: p.overallAvgPct,
      delta: p.delta,
      insight: p.insight,
    })),
    categoryMap: calibration.categoryMapping.map((m) => ({
      ours: m.ourCategory,
      rally: m.rallyCategory,
      confidence: m.confidence,
    })),
    suggestions: calibration.calibrationSuggestions,
    topExamples: calibration.topExamples.map((ex) => ({
      username: ex.xUsername,
      quality: ex.contentQualityPct,
      url: ex.tweetUrl,
      categories: ex.categories
        .filter((c) => c.isContent)
        .map((c) => ({ name: c.name, pct: c.percentage })),
    })),
  };
}
