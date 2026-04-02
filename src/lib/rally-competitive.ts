/**
 * Competitive Intelligence Module
 *
 * Fetches and analyzes competitor content from Rally.fun campaigns to:
 * 1. Discover what top performers are doing
 * 2. Analyze patterns (angles, hooks, structures, tones)
 * 3. Build differentiation strategy (what NOT to do, what to do DIFFERENTLY)
 * 4. Ensure our content is NOT similar to competitors
 * 5. Try to BEAT competitors on every metric
 *
 * Data sources:
 * - Rally.fun API: metricWeights & gateWeights (ACTUAL campaign scoring weights)
 * - Web Search: Find competitor tweets/posts about the campaign topic
 * - Web Reader: Read full competitor content
 * - AI Analysis: Analyze patterns, build differentiation strategy
 *
 * CRITICAL: We cannot directly fetch Rally.fun submissions (no public API).
 * Instead, we search the web for competitor content related to the campaign topic.
 */

import { getAIClient, type ChatMessage } from './http-ai-client';

// ─── Types ──────────────────────────────────────────────────────────

export interface CompetitorContent {
  source: string;
  url: string;
  author: string;
  content: string;
  /** Estimated engagement (likes, retweets, replies) */
  estimatedEngagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
  /** AI-analyzed traits */
  analysis?: CompetitorTrait;
}

export interface CompetitorTrait {
  angle: string;
  hook: string;
  structure: string;
  tone: string;
  keyPhrases: string[];
  strengths: string[];
  weaknesses: string[];
  estimatedContentScore: number;     // 0-21 Rally content quality
}

export interface CompetitiveAnalysis {
  /** Campaign's ACTUAL scoring weights from Rally.fun */
  campaignWeights: {
    metricWeights: number[] | null;
    gateWeights: number[] | null;
  };
  /** Competitor contents found */
  competitors: CompetitorContent[];
  /** Aggregated patterns across all competitors */
  patterns: {
    commonAngles: string[];
    commonHooks: string[];
    commonStructures: string[];
    commonTones: string[];
    overusedPhrases: string[];
    averageEstimatedScore: number;
    topScore: number;
    weakestCategories: string[];
  };
  /** Our differentiation strategy */
  differentiation: {
    recommendedAngle: string;
    recommendedHook: string;
    uniqueApproaches: string[];
    phrasesToAvoid: string[];
    gapsToExploit: string[];
    targetScore: number;
  };
  /** Summary for pipeline injection */
  pipelineInstructions: string;
  /** Metadata */
  searchQueries: string[];
  totalCompetitorsAnalyzed: number;
  analysisTimestamp: string;
}

// ─── Rally API: Fetch ACTUAL Campaign Weights ────────────────────────

const RALLY_API_BASE = 'https://app.rally.fun/api';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch the ACTUAL metricWeights and gateWeights from Rally.fun API.
 * These are the REAL weights the campaign uses for scoring.
 * 
 * metricWeights: array of 8 numbers (mapped to Rally's 8 engagement metrics)
 * gateWeights: array of 4 numbers (mapped to the 4 gates)
 */
export async function fetchCampaignWeights(
  campaignAddress: string
): Promise<{ metricWeights: number[] | null; gateWeights: number[] | null }> {
  try {
    if (!campaignAddress || !/^0x[a-fA-F0-9]{40}$/.test(campaignAddress)) {
      console.warn('[Competitive] Invalid campaign address, skipping weight fetch');
      return { metricWeights: null, gateWeights: null };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${RALLY_API_BASE}/campaigns/${campaignAddress}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Competitive] Rally API returned ${response.status} for weight fetch`);
      return { metricWeights: null, gateWeights: null };
    }

    const data = await response.json();

    const metricWeights = Array.isArray(data.metricWeights) ? data.metricWeights : null;
    const gateWeights = Array.isArray(data.gateWeights) ? data.gateWeights : null;

    console.log('[Competitive] Fetched campaign weights:', {
      metricWeights: metricWeights ? `${metricWeights.length} weights` : 'none',
      gateWeights: gateWeights ? `${gateWeights.length} weights` : 'none',
    });

    return { metricWeights, gateWeights };
  } catch (error) {
    console.warn('[Competitive] Failed to fetch campaign weights:', error instanceof Error ? error.message : error);
    return { metricWeights: null, gateWeights: null };
  }
}

// ─── Web Search: Find Competitor Content ────────────────────────────

/**
 * Build search queries to find competitor content for a campaign.
 * Uses multiple query strategies for broader coverage.
 */
function buildSearchQueries(campaignData: Record<string, unknown>): string[] {
  const title = String(campaignData.title || campaignData.name || '');
  const description = String(campaignData.description || campaignData.goal || '');
  const category = String(campaignData.category || '');
  const xUsername = String(campaignData.xUsername || '');

  const queries: string[] = [];

  // Strategy 1: Campaign name + rally.fun (find tweets about this specific campaign)
  if (title) {
    queries.push(`"${title}" rally.fun site:x.com OR site:twitter.com`);
    queries.push(`"${title}" ${category} tweet`);
  }

  // Strategy 2: Creator's X username (find tweets mentioning the project)
  if (xUsername) {
    queries.push(`@${xUsername.replace('@', '')} ${category} opinion tweet`);
    queries.push(`${xUsername.replace('@', '')} ${description.substring(0, 60)}`);
  }

  // Strategy 3: Topic-based search (find general content about the topic)
  if (description) {
    const keywords = description.split(/\s+/).filter((w: string) => w.length > 4).slice(0, 4);
    if (keywords.length > 0) {
      queries.push(`${keywords.join(' ')} ${category} crypto viral tweet`);
      queries.push(`${keywords.join(' ')} best explanation thread`);
    }
  }

  // Strategy 4: Category + viral content patterns
  if (category) {
    queries.push(`${category} crypto viral content examples 2025`);
  }

  // Deduplicate and limit — fewer queries = faster
  return [...new Set(queries)].slice(0, 3);
}

/**
 * Search the web for competitor content using z-ai-web-dev-sdk.
 * Returns search results that may contain competitor tweets/posts.
 */
async function webSearchWithTimeout(query: string, numResults = 5, timeoutMs = 8000): Promise<Array<{
  url: string;
  title: string;
  snippet: string;
}>> {
  try {
    // Dynamic import to avoid bundling in client
    const ZAI = await import('z-ai-web-dev-sdk').then((m) => m.default || m);

    const zai = await ZAI.create();
    const results = await Promise.race([
      zai.functions.invoke('web_search', { query, num: numResults }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Web search timed out (${timeoutMs}ms)`)), timeoutMs)
      ),
    ]);
    

    if (Array.isArray(results)) {
      return results.map((r: Record<string, unknown>) => ({
        url: String(r.url || ''),
        title: String(r.name || r.title || ''),
        snippet: String(r.snippet || ''),
      }));
    }

    return [];
  } catch (error) {
    console.warn(`[Competitive] Web search failed for "${query}":`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Read a web page to extract content.
 */
async function webReadWithTimeout(url: string, timeoutMs = 10000): Promise<string> {
  try {
    const ZAI = await import('z-ai-web-dev-sdk').then((m) => m.default || m);

    const zai = await ZAI.create();
    const result = await Promise.race([
      zai.functions.invoke('page_reader', { url }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Web read timed out (${timeoutMs}ms)`)), timeoutMs)
      ),
    ]);

    if (result?.data?.html) {
      // Strip HTML tags and get plain text
      const text = result.data.html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

      return text.substring(0, 3000); // Limit to 3000 chars
    }

    return '';
  } catch (error) {
    console.warn(`[Competitive] Web read failed for "${url}":`, error instanceof Error ? error.message : error);
    return '';
  }
}

// ─── AI Analysis ────────────────────────────────────────────────────

const ANALYZE_COMPETITORS_PROMPT = `You are a competitive intelligence analyst for Rally.fun content campaigns.

Analyze the following competitor content pieces and identify:
1. What ANGLES/PERSPECTIVES they use
2. What HOOK types (opening lines) they use
3. What narrative STRUCTURES they follow
4. What TONES they employ
5. KEY PHRASES that appear frequently (to AVOID repeating)
6. STRENGTHS — what makes their content work
7. WEAKNESSES — what could be better
8. ESTIMATED SCORES based on Rally.fun's ACTUAL 7 content categories (max 21.0):
   - Binary Gates (0-2 each): Originality/Authenticity, Content Alignment, Info Accuracy, Campaign Compliance
   - Quality (0-5 each): Engagement Potential, Technical Quality, Reply Quality
   - Total Content Quality Score = sum of all 7 categories

Respond in JSON format:
{
  "competitors": [
    {
      "source": "source description",
      "angle": "e.g., personal experience, contrarian take, data-driven analysis",
      "hook": "e.g., provocative question, surprising statistic, bold claim",
      "structure": "e.g., problem-solution, before-after, story-driven",
      "tone": "e.g., casual, urgent, humorous, analytical",
      "keyPhrases": ["phrase1", "phrase2"],
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"],
      "estimatedScores": {
        "originality_authenticity": 1,
        "content_alignment": 1,
        "information_accuracy": 1,
        "campaign_compliance": 1,
        "engagement_potential": 3,
        "technical_quality": 3,
        "reply_quality": 3
      },
      "estimatedTotalScore": 13.0
    }
  ],
  "patterns": {
    "commonAngles": ["angle1", "angle2"],
    "commonHooks": ["hook1", "hook2"],
    "commonStructures": ["structure1"],
    "commonTones": ["tone1", "tone2"],
    "overusedPhrases": ["phrase1", "phrase2", "phrase3"],
    "averageEstimatedScore": 10.5,
    "topScore": 16.0,
    "weakestCategories": ["Reply Quality", "Engagement Potential"]
  }
}`;

const DIFFERENTIATION_STRATEGY_PROMPT = `You are a content strategist for Rally.fun campaigns. Given competitor analysis, build a differentiation strategy.

═══ COMPETITOR PATTERNS ═══
{competitor_patterns}

═══ CAMPAIGN CONTEXT ═══
{campaign_context}

═══ COMPETITOR'S AVERAGE SCORE: {avg_score} ═══
═══ COMPETITOR'S TOP SCORE: {top_score} ═══

Build a strategy to BEAT the top competitor content. Focus on:
1. What UNIQUE ANGLE can we take that nobody else has?
2. What HOOK type would stand out from the crowd?
3. What GAPS in competitor content can we exploit?
4. What PHRASES must we AVOID to not sound like everyone else?
5. What's our TARGET SCORE to beat the top competitor?

Respond in JSON:
{
  "recommendedAngle": "A unique, differentiated angle that no competitor uses",
  "recommendedHook": "A hook type that stands out from all competitors",
  "uniqueApproaches": [
    "Approach 1: Do X differently by doing Y",
    "Approach 2: Instead of common pattern A, try pattern B"
  ],
  "phrasesToAvoid": ["phrase competitors overuse", "another overused phrase"],
  "gapsToExploit": [
    "Gap 1: None of the competitors address X, we should",
    "Gap 2: All competitors miss the opportunity to mention Y"
  ],
  "targetScore": 15.0,
  "pipelineInstructions": "A concise instruction block (3-5 sentences) that will be injected into content generation to ensure differentiation and quality."
}`;

// ─── Main Competitive Analysis Function ─────────────────────────────

/**
 * Run full competitive intelligence analysis for a campaign.
 * 
 * Steps:
 * 1. Fetch ACTUAL campaign weights from Rally.fun API
 * 2. Search web for competitor content (multiple queries)
 * 3. Read competitor pages for full content
 * 4. AI-analyze competitor patterns
 * 5. Build differentiation strategy
 * 6. Generate pipeline instructions
 */
export async function runCompetitiveAnalysis(
  campaignData: Record<string, unknown>
): Promise<CompetitiveAnalysis> {
  console.log('[Competitive] Starting competitive analysis...');

  // Step 1: Fetch campaign weights
  const campaignAddress = String(campaignData.intelligentContractAddress || '');
  const campaignWeights = await fetchCampaignWeights(campaignAddress);

  // Step 2: Build search queries
  const searchQueries = buildSearchQueries(campaignData);
  console.log(`[Competitive] Built ${searchQueries.length} search queries`);

  // Step 3: Execute searches (parallel, with per-call timeout)
  const searchPromises = searchQueries.map((q) => webSearchWithTimeout(q, 5, 8000));
  const searchResults = await Promise.all(searchPromises);

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueResults: Array<{ url: string; title: string; snippet: string; query: string }> = [];
  for (let qi = 0; qi < searchResults.length; qi++) {
    for (const result of searchResults[qi]) {
      if (!seenUrls.has(result.url) && result.url) {
        seenUrls.add(result.url);
        uniqueResults.push({ ...result, query: searchQueries[qi] });
      }
    }
  }

  console.log(`[Competitive] Found ${uniqueResults.length} unique results from search`);

  // Step 4: Read top results for full content (limit to 3 to manage time)
  const topResults = uniqueResults.slice(0, 3);
  const readPromises = topResults.map(async (r) => {
    // Prefer X/Twitter URLs, or read any result with a meaningful snippet
    const isTwitter = r.url.includes('x.com') || r.url.includes('twitter.com');
    const content = isTwitter ? r.snippet : await webReadWithTimeout(r.url, 10000);

    return {
      source: r.title || r.url,
      url: r.url,
      author: extractAuthorFromUrl(r.url),
      content: content || r.snippet,
      estimatedEngagement: { likes: 0, retweets: 0, replies: 0 },
    } as CompetitorContent;
  });

  const competitors = await Promise.all(readPromises);
  const validCompetitors = competitors.filter((c) => c.content.length > 30);

  console.log(`[Competitive] Read ${validCompetitors.length} competitor contents`);

  // Step 5: AI analysis of competitors
  let patterns = {
    commonAngles: [] as string[],
    commonHooks: [] as string[],
    commonStructures: [] as string[],
    commonTones: [] as string[],
    overusedPhrases: [] as string[],
    averageEstimatedScore: 10.0,
    topScore: 14.0,
    weakestCategories: [] as string[],
  };

  if (validCompetitors.length > 0) {
    patterns = await analyzeCompetitorPatterns(validCompetitors, campaignData);
  }

  // Step 6: Build differentiation strategy
  const differentiation = await buildDifferentiationStrategy(
    patterns,
    campaignData,
    validCompetitors
  );

  // Step 7: Generate pipeline instructions
  const pipelineInstructions = buildPipelineInstructions(patterns, differentiation, campaignData);

  console.log(`[Competitive] Analysis complete. ${validCompetitors.length} competitors analyzed.`);
  console.log(`[Competitive] Target score: ${differentiation.targetScore}/21 (competitor avg: ${patterns.averageEstimatedScore.toFixed(1)}, top: ${patterns.topScore.toFixed(1)})`);

  return {
    campaignWeights,
    competitors: validCompetitors,
    patterns,
    differentiation,
    pipelineInstructions,
    searchQueries,
    totalCompetitorsAnalyzed: validCompetitors.length,
    analysisTimestamp: new Date().toISOString(),
  };
}

// ─── Helper Functions ───────────────────────────────────────────────

function extractAuthorFromUrl(url: string): string {
  try {
    if (url.includes('x.com/') || url.includes('twitter.com/')) {
      const match = url.match(/(?:x|twitter)\.com\/([^\/?]+)/);
      return match ? `@${match[1]}` : 'unknown';
    }
    const hostname = new URL(url).hostname;
    return hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * AI-analyze competitor patterns
 */
async function analyzeCompetitorPatterns(
  competitors: CompetitorContent[],
  _campaignData: Record<string, unknown>
): Promise<CompetitiveAnalysis['patterns']> {
  try {
    const client = getAIClient();

    const competitorTexts = competitors
      .map((c, i) => `--- Competitor ${i + 1} (${c.source}) ---\n${c.content.substring(0, 1500)}`)
      .join('\n\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: ANALYZE_COMPETITORS_PROMPT },
      {
        role: 'user',
        content: `Analyze these ${competitors.length} competitor content pieces:\n\n${competitorTexts}`,
      },
    ];

    const response = await client.chat(messages, {
      temperature: 0.3,
      maxTokens: 3000,
      enableThinking: false,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Extract estimated scores from competitors
        let avgScore = 5.0;
        let topScore = 8.0;
        const weakestCategories: string[] = [];

        if (Array.isArray(parsed.competitors)) {
          const scores = parsed.competitors
            .map((c: Record<string, unknown>) => Number(c.estimatedTotalScore) || 0)
            .filter((s: number) => s > 0);

          if (scores.length > 0) {
            avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
            topScore = Math.max(...scores);
          }

          // Find weakest categories across all competitors
          const categoryAvgs: Record<string, number[]> = {};
          for (const comp of parsed.competitors) {
            const estimatedScores = (comp as Record<string, unknown>).estimatedScores as Record<string, number> | undefined;
            if (estimatedScores) {
              for (const [category, score] of Object.entries(estimatedScores)) {
                if (!categoryAvgs[category]) categoryAvgs[category] = [];
                categoryAvgs[category].push(Number(score) || 0);
              }
            }
          }

          // Find categories with lowest average
          const sortedCategories = Object.entries(categoryAvgs)
            .map(([category, scores]) => ({
              category,
              avg: scores.reduce((a, b) => a + b, 0) / scores.length,
            }))
            .sort((a, b) => a.avg - b.avg);

          for (const c of sortedCategories.slice(0, 2)) {
            weakestCategories.push(c.category);
          }
        }

        return {
          commonAngles: Array.isArray(parsed.patterns?.commonAngles) ? parsed.patterns.commonAngles : [],
          commonHooks: Array.isArray(parsed.patterns?.commonHooks) ? parsed.patterns.commonHooks : [],
          commonStructures: Array.isArray(parsed.patterns?.commonStructures) ? parsed.patterns.commonStructures : [],
          commonTones: Array.isArray(parsed.patterns?.commonTones) ? parsed.patterns.commonTones : [],
          overusedPhrases: Array.isArray(parsed.patterns?.overusedPhrases) ? parsed.patterns.overusedPhrases : [],
          averageEstimatedScore: Math.round(avgScore * 100) / 100,
          topScore: Math.round(topScore * 100) / 100,
          weakestCategories,
        };
      }
    } catch {
      // JSON parse failed
    }

    // Fallback: basic pattern extraction
    return {
      commonAngles: ['general_overview'],
      commonHooks: ['statement'],
      commonStructures: ['linear'],
      commonTones: ['informative'],
      overusedPhrases: [],
      averageEstimatedScore: 5.0,
      topScore: 8.0,
      weakestCategories: ['replyQuality'],
    };
  } catch (error) {
    console.warn('[Competitive] Pattern analysis failed:', error instanceof Error ? error.message : error);
    return {
      commonAngles: [],
      commonHooks: [],
      commonStructures: [],
      commonTones: [],
      overusedPhrases: [],
      averageEstimatedScore: 5.0,
      topScore: 8.0,
      weakestCategories: [],
    };
  }
}

/**
 * Build differentiation strategy using AI
 */
async function buildDifferentiationStrategy(
  patterns: CompetitiveAnalysis['patterns'],
  campaignData: Record<string, unknown>,
  _competitors: CompetitorContent[]
): Promise<CompetitiveAnalysis['differentiation']> {
  try {
    const client = getAIClient();

    const messages: ChatMessage[] = [
      { role: 'system', content: DIFFERENTIATION_STRATEGY_PROMPT },
      {
        role: 'user',
        content: DIFFERENTIATION_STRATEGY_PROMPT
          .replace('{competitor_patterns}', JSON.stringify(patterns, null, 2))
          .replace('{campaign_context}', JSON.stringify(campaignData, null, 2).substring(0, 2000))
          .replace('{avg_score}', String(patterns.averageEstimatedScore))
          .replace('{top_score}', String(patterns.topScore)),
      },
    ];

    const response = await client.chat(messages, {
      temperature: 0.6,
      maxTokens: 2000,
      enableThinking: false,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          recommendedAngle: String(parsed.recommendedAngle || 'unique_perspective'),
          recommendedHook: String(parsed.recommendedHook || 'surprising_reveal'),
          uniqueApproaches: Array.isArray(parsed.uniqueApproaches) ? parsed.uniqueApproaches : [],
          phrasesToAvoid: Array.isArray(parsed.phrasesToAvoid) ? parsed.phrasesToAvoid : [],
          gapsToExploit: Array.isArray(parsed.gapsToExploit) ? parsed.gapsToExploit : [],
          targetScore: Number(parsed.targetScore) || Math.ceil(patterns.topScore * 1.3),
          pipelineInstructions: String(parsed.pipelineInstructions || ''),
        };
      }
    } catch {
      // JSON parse failed
    }

    // Fallback
    return {
      recommendedAngle: 'contrarian_take',
      recommendedHook: 'provocative_question',
      uniqueApproaches: ['Use personal story instead of generic analysis', 'Add controversial hot take'],
      phrasesToAvoid: [],
      gapsToExploit: ['Competitors lack emotional depth'],
      targetScore: Math.ceil(patterns.topScore * 1.3),
      pipelineInstructions: `Create unique content that beats the average competitor score of ${patterns.averageEstimatedScore.toFixed(1)}. Use a different angle than what competitors commonly use. Focus on the weakest competitor categories: ${patterns.weakestCategories.join(', ')}.`,
    };
  } catch (error) {
    console.warn('[Competitive] Differentiation strategy failed:', error instanceof Error ? error.message : error);
    return {
      recommendedAngle: 'unique_perspective',
      recommendedHook: 'surprising_reveal',
      uniqueApproaches: [],
      phrasesToAvoid: [],
      gapsToExploit: [],
      targetScore: Math.ceil(patterns.topScore * 1.3),
      pipelineInstructions: '',
    };
  }
}

/**
 * Build pipeline injection instructions from competitive analysis.
 * This will be injected into the content generation prompt.
 */
function buildPipelineInstructions(
  patterns: CompetitiveAnalysis['patterns'],
  differentiation: CompetitiveAnalysis['differentiation'],
  campaignData: Record<string, unknown>
): string {
  const parts: string[] = [];

  parts.push(`═══ COMPETITIVE INTELLIGENCE ═══`);
  parts.push(`Analyzed ${patterns.averageEstimatedScore} avg competitor content pieces.`);
  parts.push(`Target: BEAT competitor avg score of ${patterns.averageEstimatedScore.toFixed(1)} and top score of ${patterns.topScore.toFixed(1)}.`);

  if (patterns.commonAngles.length > 0) {
    parts.push(`\n⚠️ Angles competitors overuse: ${patterns.commonAngles.join(', ')}`);
    parts.push(`→ USE INSTEAD: ${differentiation.recommendedAngle}`);
  }

  if (patterns.commonHooks.length > 0) {
    parts.push(`\n⚠️ Hooks competitors overuse: ${patterns.commonHooks.join(', ')}`);
    parts.push(`→ USE INSTEAD: ${differentiation.recommendedHook}`);
  }

  if (patterns.overusedPhrases.length > 0) {
    parts.push(`\n🚫 PHRASES TO AVOID (competitors use these): ${patterns.overusedPhrases.slice(0, 5).join(' | ')}`);
  }

  if (differentiation.gapsToExploit.length > 0) {
    parts.push(`\n🎯 GAPS TO EXPLOIT:`);
    for (const gap of differentiation.gapsToExploit.slice(0, 3)) {
      parts.push(`  - ${gap}`);
    }
  }

  if (patterns.weakestCategories.length > 0) {
    parts.push(`\n💪 FOCUS AREAS (competitors are weak here): ${patterns.weakestCategories.join(', ')}`);
  }

  if (differentiation.uniqueApproaches.length > 0) {
    parts.push(`\n💡 UNIQUE APPROACHES:`);
    for (const approach of differentiation.uniqueApproaches.slice(0, 3)) {
      parts.push(`  - ${approach}`);
    }
  }

  // Campaign-specific context
  const title = String(campaignData.title || '');
  const style = String(campaignData.style || '');
  if (title) {
    parts.push(`\n📋 Campaign: "${title}"`);
  }
  if (style) {
    parts.push(`🎨 Required style: ${style}`);
  }

  parts.push(`\n⚡ TARGET SCORE: ${differentiation.targetScore} (30% higher than top competitor)`);
  parts.push(`YOUR CONTENT MUST BE COMPLETELY DIFFERENT FROM ALL COMPETITORS.`);

  // Use AI-generated instructions if available
  if (differentiation.pipelineInstructions) {
    parts.push(`\n🧠 AI STRATEGY: ${differentiation.pipelineInstructions}`);
  }

  return parts.join('\n');
}

/**
 * Check content similarity against competitors.
 * Returns a similarity score (0-100) where higher = more similar (bad).
 * Also returns specific phrases that overlap with competitors.
 */
export function checkContentSimilarity(
  ourContent: string,
  competitors: CompetitorContent[]
): {
  similarityScore: number;
  overlappingPhrases: string[];
  isTooSimilar: boolean;
  warnings: string[];
} {
  if (competitors.length === 0) {
    return { similarityScore: 0, overlappingPhrases: [], isTooSimilar: false, warnings: [] };
  }

  const ourLower = ourContent.toLowerCase();
  const ourWords = new Set(ourLower.split(/\s+/).filter((w) => w.length > 3));

  let totalSimilarity = 0;
  const overlappingPhrases: string[] = [];
  const warnings: string[] = [];

  for (const competitor of competitors) {
    const compLower = competitor.content.toLowerCase();
    const compWords = compLower.split(/\s+/).filter((w) => w.length > 3);

    // Word overlap
    const compWordSet = new Set(compWords);
    const overlapWords = [...ourWords].filter((w) => compWordSet.has(w));
    const wordSimilarity = ourWords.size > 0 ? overlapWords.length / ourWords.size : 0;

    // N-gram overlap (bigrams)
    const ourBigrams = new Set<string>();
    for (let i = 0; i < ourLower.split(/\s+/).length - 1; i++) {
      const words = ourLower.split(/\s+/);
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (bigram.split(/\s+/).every((w) => w.length > 2)) {
        ourBigrams.add(bigram);
      }
    }

    const compBigrams = new Set<string>();
    for (let i = 0; i < compLower.split(/\s+/).length - 1; i++) {
      const words = compLower.split(/\s+/);
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (bigram.split(/\s+/).every((w) => w.length > 2)) {
        compBigrams.add(bigram);
      }
    }

    const overlapBigrams = [...ourBigrams].filter((b) => compBigrams.has(b));

    // Track overlapping phrases
    for (const bigram of overlapBigrams) {
      if (!overlappingPhrases.includes(bigram)) {
        overlappingPhrases.push(bigram);
      }
    }

    // Combined similarity (bigram overlap is weighted more heavily)
    const bigramSimilarity = ourBigrams.size > 0 ? overlapBigrams.length / ourBigrams.size : 0;
    const combinedSimilarity = (wordSimilarity * 0.3 + bigramSimilarity * 0.7) * 100;

    totalSimilarity += combinedSimilarity;

    if (combinedSimilarity > 30) {
      warnings.push(`High similarity (${combinedSimilarity.toFixed(0)}%) with ${competitor.source}`);
    }
  }

  const avgSimilarity = totalSimilarity / competitors.length;
  const isTooSimilar = avgSimilarity > 25 || overlappingPhrases.length > 10;

  return {
    similarityScore: Math.round(avgSimilarity * 100) / 100,
    overlappingPhrases: overlappingPhrases.slice(0, 20),
    isTooSimilar,
    warnings,
  };
}

/**
 * Convert Rally.fun metricWeights array to our MetricWeights format.
 * 
 * Rally uses 8 metric weights (for their internal metrics).
 * We map them to our 5 engagement metrics as best we can.
 * 
 * The 8 Rally metrics are (approximately):
 * [0] hook, [1] resonance, [2] shareability, 
 * [3] comment_trigger, [4] viral_potential,
 * [5-7] additional metrics (quality gates, etc.)
 */
export function convertRallyMetricWeights(
  rallyWeights: number[]
): Partial<Record<string, number>> {
  if (!Array.isArray(rallyWeights) || rallyWeights.length < 5) {
    return undefined;
  }

  // Direct mapping for first 5 engagement metrics
  const mapping: Record<string, number> = {
    hook: rallyWeights[0] || 0.2,
    resonance: rallyWeights[1] || 0.2,
    shareability: rallyWeights[2] || 0.2,
    commentTrigger: rallyWeights[3] || 0.2,
    viralPotential: rallyWeights[4] || 0.2,
  };

  // Normalize to sum = 1.0
  const total = Object.values(mapping).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const key of Object.keys(mapping)) {
      mapping[key] /= total;
    }
  }

  return mapping;
}
