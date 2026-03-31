/**
 * Multi-Vendor AI Service
 * 
 * Uses z-ai-web-dev-sdk with model selection to route to different AI vendors:
 * - OpenAI: gpt-4o, gpt-4, gpt-4o-mini
 * - Anthropic: claude-opus-4, claude-sonnet-4, claude-3.5-sonnet, claude-3.5-haiku
 * - Google: gemini-1.5-pro, gemini-1.5-flash
 * - Zhipu: glm-4-plus, glm-4-long
 * - DeepSeek: deepseek-chat
 */

import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZai() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// ─── MODEL CONFIGURATION ────────────────────────────────────────────────

export type VendorModel = {
  id: string;
  vendor: string;
  model: string;
  quality: 'highest' | 'high' | 'medium' | 'low';
  speed: 'slow' | 'medium' | 'fast';
  cost: 'high' | 'medium' | 'low' | 'free';
};

export const JUDGE_MODELS: Record<string, VendorModel> = {
  optimist: {
    id: 'gpt-4o',
    vendor: 'OpenAI',
    model: 'gpt-4o',
    quality: 'high',
    speed: 'fast',
    cost: 'medium',
  },
  analyst: {
    id: 'gemini-1.5-pro',
    vendor: 'Google',
    model: 'gemini-1.5-pro',
    quality: 'high',
    speed: 'medium',
    cost: 'medium',
  },
  critic: {
    id: 'claude-sonnet-4',
    vendor: 'Anthropic',
    model: 'claude-sonnet-4',
    quality: 'high',
    speed: 'medium',
    cost: 'medium',
  },
};

export const GENERATOR_MODEL: VendorModel = {
  id: 'claude-opus-4',
  vendor: 'Anthropic',
  model: 'claude-opus-4',
  quality: 'highest',
  speed: 'slow',
  cost: 'high',
};

export const PREWRITING_MODEL: VendorModel = {
  id: 'gpt-4o-mini',
  vendor: 'OpenAI',
  model: 'gpt-4o-mini',
  quality: 'medium',
  speed: 'fast',
  cost: 'low',
};

export const TIEBREAKER_MODEL: VendorModel = {
  id: 'deepseek-chat',
  vendor: 'DeepSeek',
  model: 'deepseek-chat',
  quality: 'medium',
  speed: 'medium',
  cost: 'free',
};

// ─── AI CALL FUNCTION ─────────────────────────────────────────────────────

export interface AICallOptions {
  systemPrompt?: string;
  userPrompt: string;
  model?: VendorModel;
  maxTokens?: number;
  temperature?: number;
}

export interface AICallResult {
  content: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export async function callAI(options: AICallOptions): Promise<AICallResult> {
  const zai = await getZai();
  const modelId = options.model?.model || 'glm-4-plus';

  const messages: Array<{ role: string; content: string }> = [];

  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.userPrompt });

  // Retry logic: up to 3 attempts with exponential backoff
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await zai.chat.completions.create({
        messages,
        model: modelId,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature ?? 0.7,
      });

      return {
        content: result.choices?.[0]?.message?.content || '',
        model: result.model || modelId,
        tokens: {
          prompt: result.usage?.prompt_tokens || 0,
          completion: result.usage?.completion_tokens || 0,
          total: result.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      lastError = error;
      const msg = error?.message || String(error);
      if (msg.includes('429') || msg.includes('500') || msg.includes('502') || msg.includes('503')) {
        const backoff = Math.min(3000 * Math.pow(2, attempt), 15000);
        console.log('[AI] Rate limited on ' + modelId + ' attempt ' + (attempt + 1) + ', retry in ' + backoff + 'ms');
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      break;
    }
  }
  throw lastError || new Error('AI call failed after retries');
}

// ─── JUDGE PROMPTS ────────────────────────────────────────────────────────

export function getJudgePrompt(judgeRole: 'optimist' | 'analyst' | 'critic'): string {
  const prompts: Record<string, string> = {
    optimist: `You are Judge Optimist, a Rally campaign content evaluator. Your role is to find the STRENGTHS and give BENEFIT OF THE DOUBT.

SCORING GUIDELINES:
- When a submission is ambiguous but could be good, score HIGHER
- When creativity is attempted (even imperfectly), REWARD it
- If the content shows genuine effort, reflect that positively
- Focus on what works well, not what could be improved

RALLY GATES (score 0-2 for each):
- 0 = DISQUALIFIED (completely misses the point)
- 1 = ADEQUATE (covers the basics, some quality)
- 2 = EXCELLENT (strong, specific, impressive)

RALLY QUALITY METRICS (score 0-5 each):
- Engagement Potential: 0 = no hook/CTA, 3 = decent, 5 = viral potential
- Technical Quality: 0 = broken, 3 = competent, 5 = professional

You MUST respond with valid JSON only. No markdown, no code blocks. Just raw JSON.`,

    analyst: `You are Judge Analyst, a neutral Rally campaign content evaluator. Your role is to provide a BALANCED, FACTUAL assessment with NO bias toward positive or negative.

SCORING GUIDELINES:
- Score based on evidence, not feelings
- A mediocre submission gets a mediocre score (2/2 gates, 3/5 quality)
- An exceptional submission gets exceptional scores (2/2 gates, 5/5 quality)
- Be strict on factual accuracy — claims without evidence = lower score
- Focus on whether the content achieves the campaign goal

RALLY GATES (score 0-2 for each):
- 0 = DISQUALIFIED (factually wrong, completely off-topic)
- 1 = ADEQUATE (mostly correct, minor issues)
- 2 = EXCELLENT (accurate, specific, well-sourced)

RALLY QUALITY METRICS (score 0-5 each):
- Engagement Potential: 0 = no engagement driver, 3 = standard, 5 = exceptional
- Technical Quality: 0 = errors, 3 = clean, 5 = polished

You MUST respond with valid JSON only. No markdown, no code blocks. Just raw JSON.`,

    critic: `You are Judge Critic, the STRICTEST Rally campaign content evaluator. Your role is to find WEAKNESSES and hold submissions to the HIGHEST STANDARD. Every flaw must be identified.

SCORING GUIDELINES:
- Default to LOWER scores — high scores must be EARNED
- Vague claims without specifics get 0-1, not 2
- Generic/template content gets 0 for originality
- Missing required elements (mentions, hashtags) = automatic 0 on compliance
- Any sign of AI-generated boilerplate = penalize originality
- Overly promotional or spammy tone = penalize engagement potential

RALLY GATES (score 0-2 for each):
- 0 = DISQUALIFIED (wrong, off-topic, or spam)
- 1 = ADEQUATE (barely meets requirements)
- 2 = EXCELLENT (genuinely impressive)

RALLY QUALITY METRICS (score 0-5 each):
- Engagement Potential: 0 = no hook, 3 = average, 5 = must-read
- Technical Quality: 0 = issues, 3 = clean, 5 = flawless

You MUST respond with valid JSON only. No markdown, no code blocks. Just raw JSON.`,
  };

  return prompts[judgeRole];
}

export function getGeneratorPrompt(): string {
  return `You are an elite Rally content creator. Write HIGH-QUALITY content that scores in the TOP 5-10% of all campaign submissions.

CRITICAL RULES:
1. Follow campaign rules EXACTLY — every hashtag, mention, format requirement
2. Use knowledge base facts accurately — NEVER fabricate data
3. Write like a REAL PERSON — bold opinions, specific details, personal voice
4. VARY sentence length: mix short punchy sentences (5-8 words) with longer analytical ones (15-25 words)
5. Create a COMPELLING HOOK in the first line — this determines engagement
6. End with a clear CALL TO ACTION that sparks conversation
7. Be SPECIFIC, not generic — use concrete details over vague statements
8. Include a UNIQUE ANGLE — something other submissions won't cover

ANTI-AI TONE RULES (MANDATORY):
- NEVER use: "in today's world", "it's no secret that", "at the end of the day", "let's be honest", "here's the thing", "the truth is"
- NEVER start with "I think/feel/believe" — state things directly
- NEVER use hedging language ("arguably", "perhaps", "it seems")
- NEVER use过渡废话 like "furthermore", "moreover", "additionally", "in conclusion"
- NEVER use generic AI phrases like "revolutionize", "transform", "innovate" without specifics
- Write in CONVERSATIONAL tone — like talking to a knowledgeable friend
- Use EM DASHES (—) sparingly, not as decoration

QUALITY OVER QUANTITY:
- One strong, focused tweet beats three generic ones
- Specific details > vague claims
- Personal experience/insight > generic marketing speak`;
}

export function getPreWritingPrompt(): string {
  return `You are a campaign content strategist. Analyze the provided campaign context and generate a UNIQUE writing brief that will produce top 5-10% Rally content.

YOUR TASK:
1. Study the campaign brief, rules, and knowledge base thoroughly
2. Analyze top leaderboard submissions to understand what works
3. Identify gaps and opportunities that others haven't covered
4. Create a brief for a writer to follow

OUTPUT FORMAT (JSON only, no markdown):
{
  "perspective": "One-sentence core argument or thesis",
  "persona": "Who is writing this and why does their perspective matter?",
  "tone": "Described in 2-3 adjectives with an example",
  "keyInsights": ["Specific insight from KB", "Another specific insight", "Third insight from leaderboard analysis"],
  "uniqueAngle": "What makes this submission DIFFERENT from all others",
  "engagementHook": "Opening line idea designed to grab attention",
  "ctaStrategy": "Call-to-action approach to maximize replies/RTs"
}`;
}

// ─── PARSE JUDGE RESPONSE ──────────────────────────────────────────────

export interface ParsedJudgeResult extends JudgeResult {
  rawContent: string;
}

export function parseJudgeResponse(raw: string, judgeRole: string): ParsedJudgeResult {
  try {
    // Try to extract JSON from the response
    let jsonStr = raw.trim();
    
    // Remove markdown code blocks if present (avoid backtick in regex for Turbopack compat)
    const fence = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);
    const fenceStart = jsonStr.indexOf(fence);
    if (fenceStart >= 0) {
      let contentStart = fenceStart + 3;
      if (jsonStr.substring(contentStart, contentStart + 4) === 'json') contentStart += 4;
      while (contentStart < jsonStr.length && /\s/.test(jsonStr[contentStart])) contentStart++;
      const fenceEnd = jsonStr.indexOf(fence, contentStart);
      if (fenceEnd > contentStart) {
        jsonStr = jsonStr.substring(contentStart, fenceEnd).trim();
      }
    }
    
    // Remove any leading/trailing text around JSON
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      gates: {
        contentAlignment: clamp(parsed.gates?.contentAlignment ?? parsed.contentAlignment ?? 1, 0, 2),
        informationAccuracy: clamp(parsed.gates?.informationAccuracy ?? parsed.informationAccuracy ?? 1, 0, 2),
        campaignCompliance: clamp(parsed.gates?.campaignCompliance ?? parsed.campaignCompliance ?? 1, 0, 2),
        originalityAuthenticity: clamp(parsed.gates?.originalityAuthenticity ?? parsed.originality ?? 1, 0, 2),
      },
      quality: {
        engagementPotential: clamp(parsed.quality?.engagementPotential ?? parsed.engagementPotential ?? 2, 0, 5),
        technicalQuality: clamp(parsed.quality?.technicalQuality ?? parsed.technicalQuality ?? 2, 0, 5),
      },
      engagement: {
        retweets: parsed.engagement?.retweets ?? 0,
        likes: parsed.engagement?.likes ?? 0,
        replies: parsed.engagement?.replies ?? 0,
        qualityOfReplies: clamp(parsed.engagement?.qualityOfReplies ?? 0, 0, 1),
        followersOfRepliers: parsed.engagement?.followersOfRepliers ?? 0,
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      gateReasons: parsed.gateReasons || {},
      qualityReasons: parsed.qualityReasons || {},
      engagementReasons: parsed.engagementReasons || {},
      rawContent: raw,
    };
  } catch (e) {
    // If JSON parsing fails, try to extract scores from text
    const gateScores = extractScores(raw);
    return {
      gates: gateScores.gates,
      quality: gateScores.quality,
      engagement: gateScores.engagement,
      strengths: [],
      weaknesses: ['Could not parse structured response'],
      gateReasons: {},
      qualityReasons: {},
      engagementReasons: {},
      rawContent: raw,
    };
  }
}

function extractScores(text: string): {
  gates: GateScores;
  quality: QualityScores;
  engagement: EngagementMetrics;
} {
  // Try to find gate scores in text patterns like "Content Alignment: 2/2"
  const gatePatterns: [keyof GateScores][] = [
    'contentAlignment', 'informationAccuracy', 'campaignCompliance', 'originalityAuthenticity',
  ];
  
  const gates: Record<string, number> = {};
  for (const key of gatePatterns) {
    const label = key.replace(/([A-Z])/g, ' $1');
    const patterns = [
      new RegExp(label + ':\\s*(\\d)\\s*/?/?\\s*(\\d)', 'i'),
      new RegExp(label + ':\\s*(\\d)', 'i'),
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) { gates[key] = parseInt(m[1]); break; }
    }
  }

  // Try quality patterns
  const qualityPatterns: [keyof QualityScores][] = ['engagementPotential', 'technicalQuality'];
  const quality: Record<string, number> = {};
  for (const key of qualityPatterns) {
    const label = key.replace(/([A-Z])/g, ' $1');
    const patterns = [
      new RegExp(label + ':\\s*(\\d)', 'i'),
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) { quality[key] = parseInt(m[1]); break; }
    }
  }

  return {
    gates: {
      contentAlignment: gates.contentAlignment || 1,
      informationAccuracy: gates.informationAccuracy || 1,
      campaignCompliance: gates.campaignCompliance || 1,
      originalityAuthenticity: gates.originalityAuthenticity || 1,
    },
    quality: {
      engagementPotential: quality.engagementPotential || 2,
      technicalQuality: quality.technicalQuality || 2,
    },
    engagement: {
      retweets: 0, likes: 0, replies: 0,
      qualityOfReplies: 0, followersOfRepliers: 0,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

// ─── RATE LIMITER ──────────────────────────────────────────────────────

class RateLimiter {
  private lastCallTime: Record<string, number> = {};
  private minIntervalMs: number;

  constructor(minIntervalMs = 2000) {
    this.minIntervalMs = minIntervalMs;
  }

  async wait(modelId: string): Promise<void> {
    const now = Date.now();
    const last = this.lastCallTime[modelId] || 0;
    const elapsed = now - last;
    if (elapsed < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastCallTime[modelId] = Date.now();
  }
}

export const rateLimiter = new RateLimiter(2000);

// ─── HELPER: Run a single judge ──────────────────────────────────────────

export async function runJudge(
  judgeRole: 'optimist' | 'analyst' | 'critic',
  context: {
    content: string;
    campaignTitle: string;
    campaignGoal: string;
    campaignStyle: string;
    campaignRules: string[];
    missionTitle?: string;
    missionDescription?: string;
    missionRules?: string[];
    knowledgeBase: string;
    gateWeights?: number[];
    metricWeights?: number[];
  },
  modelOverride?: VendorModel,
): Promise<ParsedJudgeResult> {
  const model = modelOverride || JUDGE_MODELS[judgeRole];
  
  await rateLimiter.wait(model.id);

  const systemPrompt = getJudgePrompt(judgeRole);
  
  const promptParts: string[] = [];
  promptParts.push('CAMPAIGN: "' + context.campaignTitle + '"');
  promptParts.push('GOAL: ' + context.campaignGoal);
  promptParts.push('STYLE: ' + context.campaignStyle);
  promptParts.push('');
  promptParts.push('RULES:');
  promptParts.push(context.campaignRules.join('\n'));
  promptParts.push('');
  if (context.missionTitle) {
    promptParts.push('MISSION: "' + context.missionTitle + '"');
    promptParts.push('MISSION DESCRIPTION: ' + context.missionDescription);
    promptParts.push('MISSION RULES: ' + (context.missionRules?.join('\n') || 'None'));
    promptParts.push('');
  }
  promptParts.push('KNOWLEDGE BASE (use these facts — do NOT fabricate):');
  promptParts.push(context.knowledgeBase.substring(0, 3000));
  promptParts.push('');
  promptParts.push('CONTENT TO EVALUATE:');
  promptParts.push('"""');
  promptParts.push(context.content);
  promptParts.push('"""');
  promptParts.push('');
  promptParts.push('EVALUATE the content above using Rally\'s scoring system. Respond with a JSON object containing:');
  promptParts.push('');
  promptParts.push('{');
  promptParts.push('  "gates": {');
  promptParts.push('    "contentAlignment": <0-2>,');
  promptParts.push('    "informationAccuracy": <0-2>,');
  promptParts.push('    "campaignCompliance": <0-2>,');
  promptParts.push('    "originalityAuthenticity": <0-2>');
  promptParts.push('  },');
  promptParts.push('  "quality": {');
  promptParts.push('    "engagementPotential": <0-5>,');
  promptParts.push('    "technicalQuality": <0-5>');
  promptParts.push('  },');
  promptParts.push('  "engagement": {');
  promptParts.push('    "retweets": <projected 0-10>,');
  promptParts.push('    "likes": <projected 0-50>,');
  promptParts.push('    "replies": <projected 0-20>,');
  promptParts.push('    "qualityOfReplies": <0-1>,');
  promptParts.push('    "followersOfRepliers": <projected 0-10>');
  promptParts.push('  },');
  promptParts.push('  "gateReasons": {');
  promptParts.push('    "contentAlignment": "one sentence explanation",');
  promptParts.push('    "informationAccuracy": "one sentence explanation",');
  promptParts.push('    "campaignCompliance": "one sentence explanation",');
  promptParts.push('    "originalityAuthenticity": "one sentence explanation"');
  promptParts.push('  },');
  promptParts.push('  "qualityReasons": {');
  promptParts.push('    "engagementPotential": "one sentence explanation",');
  promptParts.push('    "technicalQuality": "one sentence explanation"');
  promptParts.push('  },');
  promptParts.push('  "strengths": ["strength 1", "strength 2", "strength 3"],');
  promptParts.push('  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"]');
  promptParts.push('}');
  promptParts.push('');
  const judgeNote = judgeRole === 'optimist'
    ? 'Look for strengths. Give benefit of doubt on borderline cases.'
    : judgeRole === 'analyst'
      ? 'Score factually and neutrally. No bias.'
      : 'Be strict. Find every flaw. Penalize generic/template content.';
  promptParts.push('Remember: You are the ' + judgeRole.toUpperCase() + ' judge. ' + judgeNote);

  const userPrompt = promptParts.join('\n');

  const result = await callAI({
    systemPrompt,
    userPrompt,
    model,
    temperature: judgeRole === 'optimist' ? 0.7 : judgeRole === 'analyst' ? 0.4 : 0.2,
    maxTokens: 2000,
  });

  return parseJudgeResponse(result.content, judgeRole);
}

// ─── HELPER: Run content generator ──────────────────────────────────────

export async function runGenerator(
  context: {
    writingBrief: string;
    campaignTitle: string;
    campaignGoal: string;
    campaignStyle: string;
    campaignRules: string[];
    missionTitle?: string;
    missionDescription?: string;
    missionRules?: string[];
    knowledgeBase: string;
    contentType?: string;
    characterLimit?: number;
  },
  modelOverride?: VendorModel,
): Promise<string> {
  const model = modelOverride || GENERATOR_MODEL;
  
  await rateLimiter.wait(model.id);

  const systemPrompt = getGeneratorPrompt();
  
  const genParts: string[] = [];
  genParts.push('CAMPAIGN: "' + context.campaignTitle + '"');
  genParts.push('GOAL: ' + context.campaignGoal);
  genParts.push('STYLE: ' + context.campaignStyle);
  genParts.push('');
  genParts.push('RULES:');
  genParts.push(context.campaignRules.join('\n'));
  if (context.characterLimit) {
    genParts.push('CHARACTER LIMIT: ' + context.characterLimit + ' characters MAX');
  }
  genParts.push('');
  if (context.missionTitle) {
    genParts.push('MISSION: "' + context.missionTitle + '"');
    genParts.push('MISSION DESCRIPTION: ' + context.missionDescription);
    genParts.push('MISSION RULES: ' + (context.missionRules?.join('\n') || 'None'));
    genParts.push('');
  }
  genParts.push('CONTENT TYPE: ' + (context.contentType || 'tweet'));
  genParts.push('');
  genParts.push('KNOWLEDGE BASE (use these facts — do NOT fabricate):');
  genParts.push(context.knowledgeBase.substring(0, 3000));
  genParts.push('');
  genParts.push('WRITING BRIEF TO FOLLOW:');
  genParts.push(context.writingBrief);
  genParts.push('');
  genParts.push('Write the content now. Output ONLY the content text, nothing else. No explanation, no labels.');

  const userPrompt = genParts.join('\n');

  const result = await callAI({
    systemPrompt,
    userPrompt,
    model,
    temperature: 0.8, // Slightly creative
    max_tokens: 1000,
  });

  return result.content.trim();
}

// ──────────────────────────────────────────────────────────────────
