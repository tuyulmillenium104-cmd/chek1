/**
 * AI Service Layer
 * 
 * Wraps DirectAIClient with rally-specific functionality:
 * - analyzeCampaign(campaignData) — Deep campaign analysis
 * - generateContent(campaignData, variation) — Generate social media content
 * - judgeContent(content, criteria, judgeType) — 3-stage judging
 * - regenerateContent(content, feedback) — Content improvement
 * 
 * Also includes:
 * - Anti-AI patterns detection (banned words, template phrases, AI-sounding words)
 * - Banned sentence starter detection
 * - Content compliance checking
 * - Anti-fabrication from Knowledge Base
 * - Campaign type detection
 * - Pre-writing perspective builder
 * - System prompts for each function
 */

import { getAIClient, type ChatMessage, type TokenData } from './http-ai-client';

// ─── Anti-AI Configuration ──────────────────────────────────────────

const BANNED_WORDS = [
  'guaranteed', 'guarantee', '100%', 'risk-free', 'sure thing',
  'financial advice', 'investment advice', 'buy now', 'sell now',
  'get rich', 'quick money', 'easy money', 'passive income',
  'follow me', 'subscribe to my', 'check my profile',
  'click here', 'limited time offer', 'act now',
  'legally binding', 'court order', 'official ruling',
];

const RALLY_BANNED_PHRASES = [
  'vibe coding', 'skin in the game', 'intelligent contracts',
  'trust layer', 'agent era', 'agentic era', 'structural shift',
  'capital efficiency', 'how did I miss this', 'losing my mind',
  'how are we all sleeping on this', "don't miss out",
  'designed for creators that desire', 'transforming ideas into something sustainable',
  'entire week', 'frictionless', 'acceptable originality',
  'similar_tweets', 'bank stack', 'version control for disagreements',
];

const TEMPLATE_PHRASES = [
  'unpopular opinion:', 'hot take:', 'thread alert:', 'breaking:',
  'this is your sign', 'psa:', 'reminder that', 'quick thread:',
  'important thread:', 'drop everything', 'stop scrolling',
  'hear me out', 'let me explain', 'nobody is talking about',
  'story time:', 'in this thread i will', 'key takeaways:',
  "here's the thing", "imagine a world where", "picture this:",
  "let's dive in", "at the end of the day", "it goes without saying",
];

const AI_PATTERN_WORDS = [
  // Existing
  'delve', 'leverage', 'realm', 'tapestry', 'paradigm', 'landscape',
  'nuance', 'underscores', 'pivotal', 'crucial', 'embark', 'journey',
  'explore', 'unlock', 'harness',
  // NEW from v9.8.4
  'foster', 'utilize', 'elevate', 'streamline', 'empower',
  'moreover', 'furthermore', 'consequently', 'nevertheless',
  'notably', 'significantly', 'comprehensive',
];

const AI_PATTERN_PHRASES = [
  // Existing
  'picture this', 'lets dive in', 'in this thread', 'key takeaways',
  'heres the thing', 'imagine a world', 'it goes without saying',
  'at the end of the day', 'on the other hand', 'in conclusion',
  // NEW from v9.8.4
  'at its core', 'the reality is', 'its worth noting',
  'make no mistake', 'the bottom line is', 'heres what you need to know',
];

// Banned as sentence starters (not banned mid-sentence)
const BANNED_STARTERS = [
  'honestly', 'like', 'kind of wild', 'ngl', 'tbh', 'ngl',
  'tbf', 'fr fr', 'lowkey',
];

// ─── Anti-Fabrication from Knowledge Base ───────────────────────

/**
 * Extract verifiable facts from campaign Knowledge Base.
 * Returns facts whitelist (safe to use) and claims blacklist (do NOT fabricate).
 */
export function extractKBData(campaignData: Record<string, unknown>): {
  factsWhitelist: string[];
  claimsBlacklist: string[];
  vaguePhrases: string[];
} {
  const kb = String(
    campaignData.knowledgeBase ||
    campaignData.knowledge_base ||
    ''
  );

  if (!kb || kb.length < 20) {
    return {
      factsWhitelist: [],
      claimsBlacklist: [
        'Do NOT claim specific follower counts, TVL, partnership details, dates, or investor names',
      ],
      vaguePhrases: ['a bunch of', 'quite a few', 'some', 'a lot of', 'growing fast'],
    };
  }

  // Extract sentences with verifiable data (numbers, URLs, specific names)
  const sentences = kb.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const factsWhitelist: string[] = [];
  const vaguePhrases = ['a bunch of', 'quite a few', 'some', 'a lot of'];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    // Whitelist: sentences with numbers, URLs, or "is/are/has" patterns
    if (/\d+%|\d+\.\d+|https?:\/\/|\.com|\.io|\.eth/.test(trimmed)) {
      factsWhitelist.push(trimmed);
    } else if (/\b(is|are|has|was)\b/i.test(trimmed) && /\b(the|this|it)\b/i.test(trimmed)) {
      factsWhitelist.push(trimmed);
    }
  }

  const claimsBlacklist = [
    'Do NOT claim specific numbers, percentages, or metrics NOT found in the campaign knowledge base',
    'Do NOT claim partnership details, investor names, or specific dates not in the KB',
    'Do NOT claim follower counts, user numbers, or TVL figures not in the KB',
    'Do NOT claim specific team members or advisors not mentioned in the campaign brief',
    'If the KB does not have a specific number → use vague language like "a bunch of", "quite a few"',
  ];

  return { factsWhitelist, claimsBlacklist, vaguePhrases };
}

// ─── Campaign Type Detection ──────────────────────────────────

export type CampaignType = 'general' | 'defi' | 'nft' | 'metrics' | 'community' | 'product';

export function detectCampaignType(campaignData: Record<string, unknown>): {
  type: CampaignType;
  strategy: string;
} {
  const text = [
    String(campaignData.title || ''),
    String(campaignData.description || ''),
    String(campaignData.goal || ''),
    String(campaignData.category || ''),
    String(campaignData.style || ''),
    String(campaignData.knowledgeBase || campaignData.knowledge_base || ''),
  ].join(' ').toLowerCase();

  if (/defi|yield|farm|pool|stake|liquidity|lending|borrow|swap|dex|amm|perp/i.test(text)) {
    return { type: 'defi', strategy: 'Focus on numbers, APY, impermanent loss, real use cases. Avoid hype language.' };
  }
  if (/nft|mint|collection|floor|opensea|erc-?721|erc-?1155|artist|drop/i.test(text)) {
    return { type: 'nft', strategy: 'Focus on art quality, community, creator story, cultural significance. Avoid speculation.' };
  }
  if (/vote|election|poll|referendum|ballot|democracy|governance/i.test(text)) {
    return { type: 'community', strategy: 'Focus on civic participation, community impact, personal stake. Avoid partisan language.' };
  }
  if (/metric|data|dashboard|analytics|report|chart|kpi|performance/i.test(text)) {
    return { type: 'metrics', strategy: 'Focus on specific numbers, comparisons, trends, benchmarks. Use precise figures.' };
  }
  if (/product|launch|app|tool|software|platform|feature|release/i.test(text)) {
    return { type: 'product', strategy: 'Focus on user experience, specific features, comparison, personal review. Avoid marketing speak.' };
  }
  return { type: 'general', strategy: 'Focus on genuine reaction, personal connection, specific details. Be authentic.' };
}

/**
 * Extract only the key fields from campaign data for the prompt.
 * Avoids dumping internal enrichment fields (_competitiveIntel, _groundTruth, etc.)
 * and Rally API metadata that bloats the prompt unnecessarily.
 * This prevents HTTP 400 "Prompt exceeds max length" without losing quality.
 */
function extractCampaignKeyFields(campaignData: Record<string, unknown>): string {
  const fields: string[] = [];
  
  const title = String(campaignData.title || campaignData.name || '');
  if (title) fields.push(`Title: ${title}`);
  
  const description = String(campaignData.description || '');
  if (description) fields.push(`Description: ${description}`);
  
  const goal = String(campaignData.goal || campaignData.mission || '');
  if (goal) fields.push(`Goal/Mission: ${goal}`);
  
  const rules = String(campaignData.rules || '');
  if (rules) fields.push(`Rules: ${rules}`);
  
  const style = String(campaignData.style || '');
  if (style) fields.push(`Style: ${style}`);
  
  const category = String(campaignData.category || '');
  if (category) fields.push(`Category: ${category}`);
  
  const xUsername = String(campaignData.xUsername || '');
  if (xUsername) fields.push(`X Account: ${xUsername}`);
  
  // Knowledge base — essential for anti-fabrication
  const kb = String(campaignData.knowledgeBase || campaignData.knowledge_base || '');
  if (kb.length > 20) fields.push(`Knowledge Base: ${kb.substring(0, 1500)}`);
  
  // Only include other string/number fields that look useful (exclude internal _ fields)
  for (const [key, value] of Object.entries(campaignData)) {
    if (key.startsWith('_')) continue; // Skip internal fields
    if (typeof value === 'string' && value.length > 10 && value.length < 500 && !fields.some(f => f.startsWith(`${key}:`))) {
      fields.push(`${key}: ${value}`);
    }
  }
  
  return fields.join('\n');
}

// ─── Pre-Writing Perspective Builder ────────────────────────────

/**
 * Build pre-writing instructions that force AI to think from a genuine perspective
 * BEFORE writing. Inspired by v9.8.3's 5 pre-writing questions.
 */
export function buildPreWritingPerspective(campaignData: Record<string, unknown>): string {
  const campType = detectCampaignType(campaignData);
  const title = String(campaignData.title || 'this campaign');
  const style = String(campaignData.style || '');
  const kb = String(campaignData.knowledgeBase || campaignData.knowledge_base || '').substring(0, 500);

  return `═══ PRE-WRITING: Build Your Genuine Perspective FIRST ═══

Before writing, answer these 5 questions internally (DO NOT include answers in output):

1. PERSONAL CONNECTION: What is YOUR genuine reaction to "${title}"? Have you seen something similar before? What surprised you?

2. SKEPTICISM: What makes you doubtful or uncertain about this? What could go wrong? What doesn't add up?

3. SPECIFIC AUDIENCE: Who exactly are you talking to? Not "crypto people" but a specific person with specific concerns.

4. COUNTER-NARRATIVE: What does everyone get WRONG about this topic? What's the unpopular take?

5. SPECIFIC MOMENT: What's ONE specific detail, number, or moment that made this real for you?

Campaign type: ${campType.type}
Campaign style hint: ${style || 'default'}
${kb ? `Key facts available in knowledge base — use them, don't fabricate.` : ''}

Strategy: ${campType.strategy}

IMPORTANT: Write from WITHIN this perspective. You are a real person sharing a genuine thought, NOT an AI generating marketing content.`;
}

// ─── Anti-AI Detection ──────────────────────────────────────────────

export interface AntiAIResult {
  clean: boolean;
  violations: string[];
  aiScore: number; // 0-100, higher = more AI-like
  bannedWordsFound: string[];
  templatePhrasesFound: string[];
  aiPatternsFound: string[];
}

export function detectAIPatterns(content: string): AntiAIResult {
  const lower = content.toLowerCase();
  const violations: string[] = [];
  const bannedWordsFound: string[] = [];
  const templatePhrasesFound: string[] = [];
  const aiPatternsFound: string[] = [];

  // Check banned words
  for (const word of BANNED_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      bannedWordsFound.push(word);
      violations.push(`Banned word: "${word}"`);
    }
  }

  // Check Rally banned phrases
  for (const phrase of RALLY_BANNED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      bannedWordsFound.push(phrase);
      violations.push(`Rally banned phrase: "${phrase}"`);
    }
  }

  // Check template phrases
  for (const phrase of TEMPLATE_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      templatePhrasesFound.push(phrase);
      violations.push(`Template phrase: "${phrase}"`);
    }
  }

  // Check AI pattern words
  for (const word of AI_PATTERN_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      aiPatternsFound.push(word);
    }
  }

  // Check AI pattern phrases
  for (const phrase of AI_PATTERN_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      aiPatternsFound.push(phrase);
    }
  }

  // Check banned sentence starters
  const sentences = content.split(/[.!?]+/);
  const bannedStartersFound: string[] = [];
  for (const sentence of sentences) {
    const trimmed = sentence.trim().toLowerCase();
    for (const starter of BANNED_STARTERS) {
      if (trimmed.startsWith(starter)) {
        bannedStartersFound.push(starter);
        violations.push(`Banned sentence starter: "${starter}"`);
      }
    }
  }

  // Calculate AI score
  const aiScore = Math.min(
    100,
    (bannedWordsFound.length * 15) +
    (templatePhrasesFound.length * 12) +
    (aiPatternsFound.length * 5)
  );

  return {
    clean: violations.length === 0 && aiScore < 30,
    violations,
    aiScore,
    bannedWordsFound,
    templatePhrasesFound,
    aiPatternsFound,
  };
}

// ─── Content Compliance Check ───────────────────────────────────────

export interface ComplianceResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
    isHardCheck?: boolean;
  }[];
}

export function checkCompliance(
  content: string,
  campaignData?: { description?: string; rules?: string }
): ComplianceResult {
  const checks: ComplianceResult['checks'] = [];
  const lower = content.toLowerCase();

  // ═══ SOFT COMPLIANCE (v7): Only truly critical violations block candidates.
  // AI patterns, template phrases, and AI-sounding words are SOFT warnings —
  // the AI judges should decide quality, not a regex-based filter.
  // Previous version blocked ALL content before judging could run.
  // ═══

  // HARD CHECKS: These WILL block a candidate

  // Check 1: Content not empty (minimum 30 chars — tweets can be short)
  checks.push({
    name: 'Content Not Empty',
    passed: content.trim().length > 30,
    message: content.trim().length > 30 ? 'OK' : 'Content too short (< 30 chars)',
    isHardCheck: true,
  });

  // Check 2: No banned financial/legal words (these get you banned on Rally)
  const bannedFound = BANNED_WORDS.filter((w) => lower.includes(w.toLowerCase()));
  checks.push({
    name: 'No Banned Words',
    passed: bannedFound.length === 0,
    message: bannedFound.length === 0 ? 'OK' : `Found: ${bannedFound.join(', ')}`,
    isHardCheck: true,
  });

  // Check 3: No Rally banned phrases (known overused spam on Rally)
  const rallyFound = RALLY_BANNED_PHRASES.filter((p) => lower.includes(p.toLowerCase()));
  checks.push({
    name: 'No Rally Banned Phrases',
    passed: rallyFound.length === 0,
    message: rallyFound.length === 0 ? 'OK' : `Found: ${rallyFound.join(', ')}`,
    isHardCheck: true,
  });

  // Check 4: Reasonable length (30-5000 chars)
  checks.push({
    name: 'Reasonable Length',
    passed: content.length >= 30 && content.length <= 5000,
    message: `Length: ${content.length} chars`,
    isHardCheck: true,
  });

  // SOFT CHECKS: These are informational — do NOT block candidates

  // Check 5: Template phrases (soft warning — judges will penalize)
  const templateFound = TEMPLATE_PHRASES.filter((p) => lower.includes(p.toLowerCase()));
  checks.push({
    name: 'No Template Phrases',
    passed: templateFound.length === 0,
    message: templateFound.length === 0 ? 'OK' : `Soft warning: ${templateFound.join(', ')}`,
    isHardCheck: false,
  });

  // Check 6: AI patterns (soft warning — judges handle this)
  const aiResult = detectAIPatterns(content);
  checks.push({
    name: 'AI Score',
    passed: aiResult.aiScore < 50,
    message: `AI Score: ${aiResult.aiScore}/100 (soft warning — judges decide)`,
    isHardCheck: false,
  });

  // Only HARD checks can fail compliance
  const hardChecks = checks.filter((c) => c.isHardCheck);
  return {
    passed: hardChecks.every((c) => c.passed),
    checks,
  };
}

// ─── System Prompts ─────────────────────────────────────────────────

const ANALYZE_CAMPAIGN_PROMPT = `You are a deep campaign analyst for Rally.fun social media content. Analyze the campaign brief and extract:

1. CORE MESSAGE: The single most important message the campaign wants to convey
2. TARGET AUDIENCE: Who is this for? What do they care about?
3. TONE: The emotional register (serious, funny, urgent, inspiring, etc.)
4. KEY CLAIMS: What specific claims or facts should be included?
5. CTA TYPE: What action should readers take?
6. PAIN POINTS: What problems does this solve?
7. DIFFERENTIATOR: What makes this unique vs competitors?

Respond in JSON format:
{
  "core_message": "...",
  "target_audience": "...",
  "tone": "...",
  "key_claims": ["..."],
  "cta_type": "...",
  "pain_points": ["..."],
  "differentiator": "...",
  "suggested_angles": ["angle1", "angle2", "angle3"],
  "emotional_hooks": ["hook1", "hook2"]
}`;

const GENERATE_CONTENT_PROMPT = `You are a viral social media content creator. Write a tweet-style post that feels AUTHENTICALLY HUMAN — like someone who just discovered something and is sharing it raw.

═══ MANDATORY HUMAN ARTIFACTS (pick at least 3) ═══
Your content MUST include at least 3 of these human imperfections:
- Tangential digression: briefly mention something unrelated then come back
- Self-correction mid-thought: "eh wait actually..."
- Genuine uncertainty: "nggak terlalu yakin sih tapi..."
- A run-on sentence: one long casual sentence without proper grammar breaks
- Parenthetical thought: (dan ini yang bikin gw mikir)
- A sentence fragment: one very short standalone sentence (2-4 words) after a long paragraph
- Lowercase for emphasis on a word that's normally capitalized
- Stream-of-consciousness: a raw thinking moment before concluding

═══ MANDATORY COUNTER-ARGUMENT ═══
Your content MUST include at least one genuine doubt, caveat, or counter-point. NEVER be 100% positive about anything. Real humans always have doubts.

═══ CRITICAL RULES ═══
- Write like a REAL PERSON, NOT an AI. Use casual language, imperfect grammar.
- NO AI-sounding words: delving, leveraging, tapestry, paradigm, crucial, embark, landscape, nuance, harness, explore, unlock, foster, utilize, elevate, streamline, empower
- NO template phrases: "Here's the thing", "Let's dive in", "Key takeaways", "Picture this", "At the end of the day", "It goes without saying", "At its core", "The reality is"
- NO banned words: guaranteed, 100%, risk-free, financial advice, get rich, buy now, vibe coding, skin in the game, intelligent contracts, agent era
- DO NOT start sentences with: "Honestly", "Like,", "Kind of wild", "Tbh", "Ngl", "Lowkey"
- DO NOT use numbered lists or bullet points in the tweet itself
- Vary sentence length WILDLY — mix 2-word fragments with 25-word run-ons
- Include at least ONE specific detail that shows real knowledge
- The tweet should be 1-3 paragraphs (NOT a thread format)

═══ NARRATIVE STRUCTURE ═══
Write in the voice of: {persona}
Use narrative structure: {structure}
Target emotion: {emotion}

═══ HUMAN ARTIFACT INJECTION ═══
{human_artifacts}

Campaign Context:
{campaign_context}

Generate ONLY the tweet content. No explanation, no metadata, no preamble.`;

const JUDGE_OPTIMIST_PROMPT = `You are the OPTIMIST judge — a supportive evaluator who looks for what works.

Your job: Review the content and give it the BENEFIT OF THE DOUBT. If something is borderline, give it a passing score.

You score based on Rally.fun's ACTUAL 7 content categories (atemporal scoring):

BINARY GATES (0-2 each, 0 = FAIL):
1. Originality and Authenticity (0-2): Is this genuinely original and human? Not templated or AI-sounding?
2. Content Alignment (0-2): Does it match the campaign's core message and requirements?
3. Information Accuracy (0-2): Are all claims accurate and verifiable?
4. Campaign Compliance (0-2): Does it follow all campaign rules and guidelines?

QUALITY SCORES (0-5 each):
5. Engagement Potential (0-5): How likely is this to generate likes, RTs, and replies?
6. Technical Quality (0-5): Writing quality, flow, readability, coherence?
7. Reply Quality (0-5): If this is a reply, how good is the response? If not a reply, score based on conversational quality.

Respond in JSON:
{
  "originality_authenticity": N,
  "content_alignment": N,
  "information_accuracy": N,
  "campaign_compliance": N,
  "engagement_potential": N,
  "technical_quality": N,
  "reply_quality": N,
  "verdict": "pass" or "fail",
  "feedback": "Brief feedback",
  "improvements": ["improvement1", "improvement2"],
  "category_analysis": {
    "Originality and Authenticity": "why you gave this score",
    "Content Alignment": "why you gave this score",
    "Information Accuracy": "why you gave this score",
    "Campaign Compliance": "why you gave this score",
    "Engagement Potential": "why you gave this score",
    "Technical Quality": "why you gave this score",
    "Reply Quality": "why you gave this score"
  }
}`;

const JUDGE_ANALYST_PROMPT = `You are the ANALYST judge — a meticulous data-driven evaluator.

Your job: Review the content with PRECISION. Score accurately, no inflated grades.

You score based on Rally.fun's ACTUAL 7 content categories (atemporal scoring):

BINARY GATES (0-2 each, 0 = FAIL):
1. Originality and Authenticity (0-2): Truly original or derivative? Any AI patterns detected?
2. Content Alignment (0-2): Exact match to campaign requirements?
3. Information Accuracy (0-2): All claims verified? Any unverifiable statements?
4. Campaign Compliance (0-2): Follows all campaign rules? No prohibited content?

QUALITY SCORES (0-5 each):
5. Engagement Potential (0-5): How engaging is this for the target audience?
6. Technical Quality (0-5): Flow, readability, coherence, grammar quality?
7. Reply Quality (0-5): Conversational quality and response depth?

Respond in JSON:
{
  "originality_authenticity": N,
  "content_alignment": N,
  "information_accuracy": N,
  "campaign_compliance": N,
  "engagement_potential": N,
  "technical_quality": N,
  "reply_quality": N,
  "verdict": "pass" or "fail",
  "feedback": "Detailed analysis",
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "category_analysis": {
    "Originality and Authenticity": "detailed analysis",
    "Content Alignment": "detailed analysis",
    "Information Accuracy": "detailed analysis",
    "Campaign Compliance": "detailed analysis",
    "Engagement Potential": "detailed analysis",
    "Technical Quality": "detailed analysis",
    "Reply Quality": "detailed analysis"
  }
}`;

const JUDGE_CRITIC_PROMPT = `You are the CRITIC judge — a harsh, uncompromising evaluator.

Your job: Find EVERY flaw. If anything is wrong, penalize it. Be extremely strict.

You score based on Rally.fun's ACTUAL 7 content categories (atemporal scoring):

BINARY GATES (0-2 each, 0 = FAIL — use 0 liberally):
1. Originality and Authenticity (0-2): Must be TRULY unique. ANY AI pattern = 0. Template phrases = 0.
2. Content Alignment (0-2): Perfect campaign alignment required. Any deviation = 0.
3. Information Accuracy (0-2): Every claim must be verifiable. Any speculation = 0.
4. Campaign Compliance (0-2): Follows ALL rules. Any violation = 0.

QUALITY SCORES (0-5 each — scores above 3 are EXCEPTIONAL):
5. Engagement Potential (0-5): Must be EXCEPTIONAL to score above 3. Generic = 0-1.
6. Technical Quality (0-5): Any flow/grammar issue = penalty. Average = 2 max.
7. Reply Quality (0-5): Must provoke real thought. Generic responses = 0-1.

Respond in JSON:
{
  "originality_authenticity": N,
  "content_alignment": N,
  "information_accuracy": N,
  "campaign_compliance": N,
  "engagement_potential": N,
  "technical_quality": N,
  "reply_quality": N,
  "verdict": "pass" or "fail",
  "feedback": "All flaws identified",
  "improvements": ["improvement1", "improvement2", "improvement3", "improvement4"],
  "category_analysis": {
    "Originality and Authenticity": "what's wrong",
    "Content Alignment": "what's wrong",
    "Information Accuracy": "what's wrong",
    "Campaign Compliance": "what's wrong",
    "Engagement Potential": "what's wrong",
    "Technical Quality": "what's wrong",
    "Reply Quality": "what's wrong"
  }
}`;

const REGENERATE_CONTENT_PROMPT = `You are improving a social media post. The previous content failed quality review.

═══ FAILURE PATTERN ANALYSIS ═══
From {total_previous} previous attempts, here is what keeps failing:
{pattern_analysis}

═══ ACCUMULATED FEEDBACK (from ALL cycles) ═══
{accumulated_feedback}

═══ ORIGINAL CONTENT (best failing) ═══
{original_content}

═══ CAMPAIGN CONTEXT ═══
{campaign_context}

INSTRUCTIONS:
Based on the failure pattern above, FIX the specific issues that keep causing failure.
Do NOT repeat the same mistakes. Write a COMPLETELY NEW version that addresses ALL accumulated feedback.

RULES:
- Write like a REAL person, NOT an AI
- NO AI-sounding words: delving, leveraging, tapestry, paradigm, crucial, embark, landscape, nuance, harness, foster, utilize, elevate, streamline, empower
- NO template phrases: "Here's the thing", "Let's dive in", "Key takeaways", "Picture this", "In this thread", "At its core", "The reality is"
- NO banned words: guaranteed, 100%, risk-free, financial advice, get rich, buy now
- NO banned phrases: vibe coding, skin in the game, intelligent contracts, agent era
- Use contractions, abbreviations, casual punctuation
- Include genuine doubt, self-correction, or uncertainty
- Vary sentence length — mix very short and longer ones
- Include at least ONE specific detail that shows real knowledge
- The tweet should be 1-3 paragraphs (NOT a thread format)
- Include at least 3 human imperfections (tangential digression, self-correction, sentence fragment, etc.)

Write the improved tweet NOW. Output ONLY the tweet content.`;

// ─── AI Service Functions ───────────────────────────────────────────

export interface CampaignAnalysis {
  core_message: string;
  target_audience: string;
  tone: string;
  key_claims: string[];
  cta_type: string;
  pain_points: string[];
  differentiator: string;
  suggested_angles: string[];
  emotional_hooks: string[];
}

/**
 * Deep campaign analysis — extracts key information from campaign brief
 */
export async function analyzeCampaign(
  campaignData: Record<string, unknown>
): Promise<CampaignAnalysis> {
  const client = getAIClient();

  const campaignContext = JSON.stringify(campaignData, null, 2);

  const messages: ChatMessage[] = [
    { role: 'system', content: ANALYZE_CAMPAIGN_PROMPT },
    {
      role: 'user',
      content: `Analyze this campaign brief:\n\n${campaignContext}`,
    },
  ];

  const response = await client.chat(messages, {
    temperature: 0.3,
    maxTokens: 2000,
    enableThinking: false, // Campaign analysis doesn't need deep reasoning
  });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback
  }

  return {
    core_message: String(campaignData.description || campaignData.name || 'Unknown'),
    target_audience: 'General audience',
    tone: 'informative',
    key_claims: [],
    cta_type: 'awareness',
    pain_points: [],
    differentiator: '',
    suggested_angles: ['personal_story', 'data_driven', 'contrarian'],
    emotional_hooks: ['curiosity', 'surprise'],
  };
}

// ─── Content Generation ─────────────────────────────────────────────

const PERSONAS = [
  'The Skeptic (doubt → discovery → conversion)',
  'Victim → Hero (pain → solution → redemption)',
  'The Insider (behind-the-scenes revelation)',
  'The Newbie (fresh, relatable perspective)',
  'The Contrarian (bold, challenges status quo)',
  'The Storyteller (narrative-driven, human interest)',
  'The Burned Veteran (been hurt, cautiously optimistic)',
  'The Accidental Discoverer (stumbled on it, now hooked)',
];

const STRUCTURES = [
  "Hero's Journey (challenge → struggle → discovery → victory)",
  'Problem-Agitation-Solution (problem → make worse → solution → proof)',
  'Before-After-Bridge (before → after → how to bridge)',
  'Contrast Frame (what most think → what actually is → proof)',
  'Mystery Reveal (curiosity → cliffhanger → reveal)',
];

const NONLINEAR_STRUCTURES = [
  'Doubt-First (start with genuine doubt → what changed your mind → remaining uncertainty)',
  'Mid-Thought (no intro, start mid-sentence as if walking up on someone thinking)',
  'Tangent-Entry (start with unrelated tangent → organically connect to main topic)',
  'Fragment-Storm (very short fragments 2-8 words, no long sentences initially, then build)',
  'Asymmetric (one long rambling paragraph 6-10 sentences → 2-3 very short afterthoughts)',
];

const EMOTIONS = [
  'curiosity + surprise',
  'fear + hope',
  'frustration + vindication',
  'confusion + clarity',
  'boredom + excitement',
];

const HUMAN_ARTIFACTS = [
  'tangential digression — briefly mention something unrelated then come back ("btw ini juga bikin saya mikir...")',
  'self-correction mid-thought — ("eh wait actually...")',
  'genuine uncertainty — ("nggak terlalu yakin sih tapi...")',
  'run-on sentence — one long sentence without proper breaks, casual flow',
  'parenthetical thought — (dan ini yang paling bikin gw mikir)',
  'sentence fragment — one very short standalone sentence 2-4 words after a long paragraph',
  'lowercase for emphasis — use lowercase for words that are normally capitalized to show casual tone',
  'stream-of-consciousness — a moment of raw thinking before concluding',
];

export interface GeneratedContent {
  content: string;
  persona: string;
  structure: string;
  emotion: string;
  antiAIResult: AntiAIResult;
  complianceResult: ComplianceResult;
}

/**
 * Generate a social media content variation
 */
export async function generateContent(
  campaignData: Record<string, unknown>,
  variation?: {
    persona?: string;
    structure?: string;
    emotion?: number;
  }
): Promise<GeneratedContent> {
  const client = getAIClient();

  const persona = variation?.persona || PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
  // Combine linear + nonlinear structures for maximum variety
  const ALL_STRUCTURES = [...STRUCTURES, ...NONLINEAR_STRUCTURES];
  const structure = variation?.structure || ALL_STRUCTURES[Math.floor(Math.random() * ALL_STRUCTURES.length)];
  const emotionIdx = variation?.emotion ?? Math.floor(Math.random() * EMOTIONS.length);
  const emotion = EMOTIONS[emotionIdx % EMOTIONS.length];

  // Pick 3 random human artifacts to inject
  const shuffledArtifacts = [...HUMAN_ARTIFACTS].sort(() => Math.random() - 0.5);
  const selectedArtifacts = shuffledArtifacts.slice(0, 3).map((a, i) => `${i + 1}. ${a}`);

  // Smart prompt building: extract key fields instead of dumping full JSON
  // This prevents HTTP 400 "Prompt exceeds max length" while keeping all quality context
  const keyFields = extractCampaignKeyFields(campaignData);

  // Inject competitive intelligence if available (full quality, no truncation)
  const competitiveIntel = String(campaignData._competitiveIntel || '');

  // Inject anti-fabrication rules from Knowledge Base
  const kbData = extractKBData(campaignData);
  const kbSection = kbData.factsWhitelist.length > 0
    ? `\n\n═══ VERIFIED FACTS FROM KNOWLEDGE BASE (ONLY use these) ═══\n${kbData.factsWhitelist.slice(0, 8).map((f, i) => `${i + 1}. ${f}`).join('\n')}`
    : '';
  const kbBlacklist = kbData.claimsBlacklist.join('\n');

  // Build pre-writing perspective for genuine voice (full quality)
  const preWriting = buildPreWritingPerspective(campaignData);

  // Build ground truth prompt (full quality)
  const groundTruth = String(campaignData._groundTruth || '');

  const enhancedContext = [competitiveIntel, kbSection, kbBlacklist, preWriting, groundTruth, `═══ CAMPAIGN CONTEXT ═══\n${keyFields}`]
    .filter(Boolean)
    .join('\n\n');

  const prompt = GENERATE_CONTENT_PROMPT
    .replace('{persona}', persona)
    .replace('{structure}', structure)
    .replace('{emotion}', emotion)
    .replace('{human_artifacts}', selectedArtifacts.join('\n'))
    .replace('{campaign_context}', enhancedContext);

  const userMessage = competitiveIntel
    ? `Generate the tweet now. CRITICAL: Your content must be COMPLETELY DIFFERENT from competitors. Follow the competitive intelligence above strictly. Target CP: ${campaignData._targetCP || 'maximum'}. Include mandatory counter-argument and human artifacts.`
    : 'Generate the tweet now. Remember: include at least one doubt/caveat and 3 human imperfections.';

  const messages: ChatMessage[] = [
    { role: 'system', content: prompt },
    {
      role: 'user',
      content: userMessage,
    },
  ];

  // IMPORTANT: enableThinking: false for content generation.
  // With thinking ON, glm-4-plus consumes all tokens for reasoning,
  // leaving the content field empty. Quality comes from the detailed prompt
  // (human artifacts, counter-arguments, pre-writing perspective), NOT from thinking.
  // OPTIMIZED: 2500 tokens (tweets are 200-500 chars, 2500 is plenty — faster response)
  const response = await client.chat(messages, {
    temperature: 0.85,
    maxTokens: 2500,
    enableThinking: false,
  });

  let content = response.content.trim();

  // Safety net: if content is still empty for any reason, retry once
  if (content.length < 50) {
    console.warn(`[AI] Content empty (${content.length} chars). Retrying with higher temperature...`);
    const retryResponse = await client.chat(messages, {
      temperature: 0.95,
      maxTokens: 2500,
      enableThinking: false,
    });
    content = retryResponse.content.trim();
  }

  // Run anti-AI detection
  const antiAIResult = detectAIPatterns(content);
  const complianceResult = checkCompliance(content, campaignData as { description?: string; rules?: string });

  return {
    content,
    persona,
    structure,
    emotion,
    antiAIResult,
    complianceResult,
  };
}

// ─── 3-Stage Judging ────────────────────────────────────────────────

export type JudgeType = 'optimist' | 'analyst' | 'critic';

export interface JudgeResult {
  judgeType: JudgeType;
  rawResponse: string;
  verdict: string;
  feedback: string;
  improvements: string[];
  /** Rally's 7 content category scores (PRIMARY) */
  content?: {
    originality_authenticity?: number;
    content_alignment?: number;
    information_accuracy?: number;
    campaign_compliance?: number;
    engagement_potential?: number;
    technical_quality?: number;
    reply_quality?: number;
  };
  /** Per-category analysis text from the judge */
  categoryAnalysis?: Record<string, string>;
  /** Legacy scores (deprecated — kept for backward compat) */
  scores?: {
    gates?: Record<string, number>;
    quality?: Record<string, number>;
    engagement?: Record<string, number>;
  };
}

/**
 * Judge content from a specific perspective.
 * Accepts optional judgeToken for forced token isolation (different token per judge).
 */
export async function judgeContent(
  content: string,
  campaignData: Record<string, unknown>,
  judgeType: JudgeType,
  judgeToken?: TokenData | null
): Promise<JudgeResult> {
  const client = getAIClient();

  const systemPrompt = {
    optimist: JUDGE_OPTIMIST_PROMPT,
    analyst: JUDGE_ANALYST_PROMPT,
    critic: JUDGE_CRITIC_PROMPT,
  }[judgeType];

  // Use key fields for judge context (not full JSON dump — causes HTTP 400 with enriched data)
  const campaignContext = (() => {
    const raw = JSON.stringify(campaignData, null, 2);
    return raw.length > 3000 ? raw.substring(0, 3000) + '\n... (truncated)' : raw;
  })();

  // Generate a unique session ID to prevent context bleeding between judges
  const sessionId = `judge-${judgeType}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `[Session: ${sessionId}]\n\nJudge this content independently. Do NOT reference any previous evaluations.\n\nCONTENT:\n${content}\n\nCAMPAIGN CONTEXT:\n${campaignContext}`,
    },
  ];

  // Temperature diversity: create genuine variance between judge evaluations
  // Higher temp = more creative/varied, Lower temp = more deterministic/strict
  const temperatureMap: Record<JudgeType, number> = {
    optimist: 0.7,   // Creative, generous — benefit of doubt with natural variance
    analyst: 0.5,    // Balanced — precise but not rigid
    critic: 0.3,     // Strict, deterministic — harsh evaluation
  };

  // OPTIMIZED: 2000 tokens for both judges — enough for full JSON scores + feedback
  const judgeTokenBudget = 2000;
  const response = await client.chat(messages, {
    temperature: temperatureMap[judgeType],
    maxTokens: judgeTokenBudget,
    enableThinking: false, // Judges MUST output JSON to content, not reasoning
    ...(judgeToken ? { forceTokenIndex: getTokenIndex(judgeToken) } : {}),
  });

  let responseContent = response.content;

  // Fallback: if content is empty, try to extract JSON from reasoning_content
  if (responseContent.trim().length < 20 && response.thinking) {
    const thinkingText = response.thinking.trim();
    const jsonMatch = thinkingText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      responseContent = jsonMatch[0];
      console.warn(`[AI] Judge ${judgeType}: Extracted JSON from reasoning_content (${responseContent.length} chars)`);
    }
  }

  // Parse the response — extract Rally's 7 content categories
  try {
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        judgeType,
        rawResponse: responseContent,
        verdict: parsed.verdict || 'fail',
        feedback: parsed.feedback || '',
        improvements: parsed.improvements || [],
        content: {
          originality_authenticity: parsed.originality_authenticity ?? parsed.originalityAuthenticity,
          content_alignment: parsed.content_alignment ?? parsed.contentAlignment,
          information_accuracy: parsed.information_accuracy ?? parsed.informationAccuracy,
          campaign_compliance: parsed.campaign_compliance ?? parsed.campaignCompliance,
          engagement_potential: parsed.engagement_potential ?? parsed.engagementPotential,
          technical_quality: parsed.technical_quality ?? parsed.technicalQuality,
          reply_quality: parsed.reply_quality ?? parsed.replyQuality,
        },
        categoryAnalysis: parsed.category_analysis ?? parsed.categoryAnalysis,
        // Legacy mapping for backward compat
        scores: {
          gates: parsed.gates || undefined,
          quality: parsed.quality || undefined,
          engagement: parsed.engagement || undefined,
        },
      };
    }
  } catch {
    // Parse failed, use raw response
  }

  // Fallback: extract verdict from text
  const lower = responseContent.toLowerCase();
  const verdict = lower.includes('"pass"') || lower.includes('verdict: pass') || lower.includes('"verdict": "pass"')
    ? 'pass'
    : 'fail';

  return {
    judgeType,
    rawResponse: responseContent,
    verdict,
    feedback: responseContent.substring(0, 500),
    improvements: [],
    content: undefined,
    categoryAnalysis: undefined,
    scores: {},
  };
}

/**
 * Regenerate content based on judge feedback — WITH accumulated cross-cycle memory
 * 
 * Difference from original:
 * - Uses ALL candidates' feedback (not just best failing)
 * - Includes failure pattern analysis
 * - Accumulates feedback across cycles
 */
export async function regenerateContent(
  originalContent: string,
  feedback: string,
  improvements: string[],
  campaignData: Record<string, unknown>,
  options?: {
    accumulatedFeedback?: string[];  // All feedback from previous cycles
    failurePattern?: string;         // Pattern analysis text
    totalPreviousAttempts?: number;   // How many total attempts so far
  }
): Promise<GeneratedContent> {
  const client = getAIClient();

  // Truncate campaign context to avoid HTTP 400
  const rawContext = JSON.stringify(campaignData, null, 2);
  const campaignContext = rawContext.length > 4000
    ? rawContext.substring(0, 4000) + '\n... (truncated)'
    : rawContext;

  // Build pattern analysis section
  const patternAnalysis = options?.failurePattern || 'No pattern analysis available';

  // Build accumulated feedback from ALL cycles
  let accumulatedFeedback: string;
  if (options?.accumulatedFeedback && options.accumulatedFeedback.length > 0) {
    accumulatedFeedback = options.accumulatedFeedback
      .map((fb, i) => `[Cycle ${Math.floor(i / 3) + 1}] ${fb}`)
      .join('\n');
  } else {
    accumulatedFeedback = feedback;
  }

  const prompt = REGENERATE_CONTENT_PROMPT
    .replace('{total_previous}', String(options?.totalPreviousAttempts ?? 5))
    .replace('{pattern_analysis}', patternAnalysis)
    .replace('{accumulated_feedback}', accumulatedFeedback)
    .replace('{original_content}', originalContent)
    .replace('{campaign_context}', campaignContext);

  const messages: ChatMessage[] = [
    { role: 'system', content: prompt },
    {
      role: 'user',
      content: 'Rewrite the content now, addressing ALL the failure patterns identified.',
    },
  ];

  // Same as generateContent: enableThinking: false to prevent empty content
  const response = await client.chat(messages, {
    temperature: 0.9, // Slightly higher for more creative divergence from failed patterns
    maxTokens: 4000,
    enableThinking: false,
  });

  let content = response.content.trim();

  // Safety net: retry once if still empty
  if (content.length < 50) {
    console.warn(`[AI] Regenerated content empty (${content.length} chars). Retrying...`);
    const retryResponse = await client.chat(messages, {
      temperature: 0.95,
      maxTokens: 4000,
      enableThinking: false,
    });
    content = retryResponse.content.trim();
  }
  const antiAIResult = detectAIPatterns(content);
  const complianceResult = checkCompliance(content, campaignData as { description?: string; rules?: string });

  return {
    content,
    persona: 'regenerated',
    structure: 'improved',
    emotion: 'feedback-driven',
    antiAIResult,
    complianceResult,
  };
}

/**
 * Extract token index from TokenData's label.
 * Maps judge tokens to specific indices for bucket isolation.
 * Falls back to undefined (no force) so client picks best bucket.
 */
function getTokenIndex(token: TokenData): number | undefined {
  const label = token?.label || '';
  // Map known token labels to indices for judge isolation
  const labelToIndex: Record<string, number> = {
    'Akun A #1': 1, 'Akun A #2': 3, 'Akun A #3': 5, 'Akun A #4': 7, 'Akun C #1': 8, 'Akun E #1': 10,
    'Akun B #1': 2, 'Akun B #2': 4, 'Akun B #3': 6, 'Akun D #1': 9, 'Extra User #1': 11,
  };
  const idx = labelToIndex[label];
  return idx !== undefined ? idx : undefined; // undefined = no force
}
