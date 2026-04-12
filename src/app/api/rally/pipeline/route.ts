import { NextRequest } from 'next/server'
import { getMaster, getKnowledgeVault, getPatternCache, analyzeContent } from '@/lib/rally-data'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'download', 'rally_system')
const BEST_CONTENT_FILE = path.join(DATA_DIR, 'rally_best_content.txt')

const AI_BANNED_WORDS = [
  'delve', 'leverage', 'paradigm', 'tapestry', 'landscape', 'nuance',
  'crucial', 'pivotal', 'embark', 'harness', 'foster', 'utilize',
  'elevate', 'streamline', 'empower', 'comprehensive', 'realm',
  'flywheel', 'ecosystem', 'unpack', 'navigate', 'pioneering',
]

const TEMPLATE_PHRASES = [
  'key takeaways', "let's dive in", 'nobody is talking about',
  "here's the thing", 'picture this', 'at the end of the day',
  'hot take', 'unpopular opinion', 'thread alert',
]

const BANNED_STARTERS = [
  'honestly', 'like', 'kind of wild', 'ngl', 'tbh', 'tbf', 'fr fr', 'lowkey',
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface JudgeScores {
  originality: number
  alignment: number
  accuracy: number
  compliance: number
  engagement: number
  technical: number
  total: number
}

interface JudgeResult {
  variationId: string
  judgeNum: number
  name: string
  scores: JudgeScores
  reasoning: string
  aiPatternsFound: string[]
  suggestions: string[]
  feedbackLoop?: number
}

interface ConsensusResult {
  variationId: string
  consensus: {
    total: number
    stdDev: number
    averageScores: {
      originality: number
      alignment: number
      accuracy: number
      compliance: number
      engagement: number
      technical: number
    }
    verdict: string
  }
  feedbackLoop?: number
}

interface VariationData {
  id: string
  text: string
  angle: string
  analysis: ReturnType<typeof analyzeContent>
  index: number
  feedbackLoop?: number
}

// ---------------------------------------------------------------------------
// SDK helper
// ---------------------------------------------------------------------------
async function getSdk() {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  return await ZAI.create()
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1500,
  label: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        console.warn(`[Retry] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, lastError.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError!
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// ---------------------------------------------------------------------------
// Score clamping
// ---------------------------------------------------------------------------
function clampScore(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(val * 100) / 100))
}

function clampJudgeScores(scores: Partial<JudgeScores>): JudgeScores {
  const o = clampScore(scores.originality ?? 0, 0, 2)
  const a = clampScore(scores.alignment ?? 0, 0, 2)
  const ac = clampScore(scores.accuracy ?? 0, 0, 2)
  const c = clampScore(scores.compliance ?? 0, 0, 2)
  const e = clampScore(scores.engagement ?? 0, 0, 5)
  const t = clampScore(scores.technical ?? 0, 0, 5)
  const total = clampScore(o + a + ac + c + e + t, 0, 18)
  return { originality: o, alignment: a, accuracy: ac, compliance: c, engagement: e, technical: t, total }
}

// ---------------------------------------------------------------------------
// Judge personas
// ---------------------------------------------------------------------------
const JUDGE_PERSONAS = [
  {
    num: 1,
    name: 'Originality Harsh',
    bias: 'Strict on AI patterns, formulaic structure, and template-like phrasing. Sensitive to manufactured anecdotes.',
  },
  {
    num: 2,
    name: 'Engagement Expert',
    bias: 'Prioritizes hook quality, discussion potential, emotional impact, and audience-targeted questions.',
  },
  {
    num: 3,
    name: 'Compliance Gate',
    bias: 'Zero tolerance for rule violations. Checks every rule meticulously. One violation = max 1/2 on compliance.',
  },
  {
    num: 4,
    name: 'Balanced',
    bias: 'Balanced across all dimensions. Considers overall quality and coherence. No extreme bias.',
  },
  {
    num: 5,
    name: 'Technical Writer',
    bias: 'Strict on writing craft: paragraph variation, readability, natural rhythm, proper sentence variety.',
  },
]

// ---------------------------------------------------------------------------
// Build the comprehensive generation system prompt
// ---------------------------------------------------------------------------
function buildGenerationPrompt(
  campaign: any,
  mission: any,
  vault: any,
  patternCache: any,
  customInstructions?: string,
  feedbackContext?: string,
): string {
  const learning = campaign.learning || {}
  const crossCampaign = vault?.cross_campaign_lessons || {}
  const adaptive = vault?.adaptive_system || {}
  const calibration = vault?.campaigns?.[0]?.calibration || {}

  // Extract overused angles / phrases from pattern cache
  const overusedAngles: string[] = patternCache?.inherited_patterns_from_prev_campaign?.overused_angles || learning.overused_angles || []
  const overusedPhrases: any[] = patternCache?.inherited_patterns_from_prev_campaign?.overused_phrases || []
  const winningPatterns: string[] = patternCache?.inherited_patterns_from_prev_campaign?.winning_patterns || []
  const uniqueGaps: string[] = patternCache?.inherited_patterns_from_prev_campaign?.unique_gaps || learning.unique_gaps || []
  const topHooks: string[] = patternCache?.inherited_patterns_from_prev_campaign?.top_hooks || learning.top_hooks || []
  const techniquesWorked: string[] = crossCampaign.writing_techniques_ranked
    ?.filter((t: any) => t.success_rate === 'high')
    .map((t: any) => `${t.technique} (${t.used_in})`) || []

  // Anti-AI checklist from cross-campaign lessons
  const antiAiChecklist = crossCampaign.anti_ai_checklist || []

  // Content length ideal
  const lengthIdeal = crossCampaign.content_length_ideal || {}
  const commonMistakes = crossCampaign.common_mistakes_to_avoid || []

  // Engagement calibration
  const engagementInsights = crossCampaign.engagement_5_5_insights || {}
  const engagementBias = engagementInsights.internal_bias ?? calibration.gap ?? -1.0

  // Adaptive patterns that are "proven"
  const provenPatterns = adaptive.pattern_effectiveness_tracker?.patterns
    ?.filter((p: any) => p.adaptive?.status === 'proven' && !p.adaptive?.overuse_flag)
    .map((p: any) => `${p.pattern_name}: ${p.base_description} (success rate: ${p.adaptive.success_rate})`) || []

  return `You are an elite Rally.fun content creator. Your ONLY goal is to write tweets that score 18/18 on ALL 6 dimensions.

═══════════════════════════════════════════════════════════
CAMPAIGN BRIEF
═══════════════════════════════════════════════════════════
Title: ${campaign.title}
Mission: ${mission.title}
Directive: ${mission.directive}
Style: ${campaign.style || 'Visionary and confident'}
Goal: ${(campaign.goal || '').substring(0, 300)}

═══════════════════════════════════════════════════════════
KNOWLEDGE BASE
═══════════════════════════════════════════════════════════
${campaign.knowledge_base || 'N/A'}

═══════════════════════════════════════════════════════════
CAMPAIGN RULES (ALL MUST BE FOLLOWED — ZERO TOLERANCE)
═══════════════════════════════════════════════════════════
${(mission.rules || []).map((r: string, i: number) => `${i + 1}. ${r} [ZERO TOLERANCE]`).join('\n')}

═══════════════════════════════════════════════════════════
OVERUSED ANGLES TO AVOID (used by many submissions)
═══════════════════════════════════════════════════════════
${overusedAngles.map((a: string) => `- "${a}"`).join('\n')}
${overusedPhrases.map((p: any) => `- "${p.phrase}" (${p.pct}% usage rate) ${p.note || ''}`).join('\n')}

═══════════════════════════════════════════════════════════
UNIQUE GAP ANGLES TO USE (underused, high differentiation)
═══════════════════════════════════════════════════════════
${uniqueGaps.map((g: string) => `- "${g}"`).join('\n')}

═══════════════════════════════════════════════════════════
WINNING PATTERNS (from 18/18 scorers)
═══════════════════════════════════════════════════════════
${winningPatterns.map((p: string) => `- ${p}`).join('\n')}

═══════════════════════════════════════════════════════════
TOP HOOK STYLES
═══════════════════════════════════════════════════════════
${topHooks.map((h: string) => `- "${h}"`).join('\n')}

═══════════════════════════════════════════════════════════
PROVEN TECHNIQUES (from adaptive tracking)
═══════════════════════════════════════════════════════════
${provenPatterns.length > 0 ? provenPatterns.map((p: string) => `- ${p}`).join('\n') : '- See winning patterns above'}
${techniquesWorked.map((t: string) => `- ${t}`).join('\n')}

═══════════════════════════════════════════════════════════
ANTI-AI RULES (MANDATORY)
═══════════════════════════════════════════════════════════
BANNED WORDS (instant AI detection): ${AI_BANNED_WORDS.join(', ')}
BANNED TEMPLATE PHRASES: ${TEMPLATE_PHRASES.join(', ')}
BANNED STARTERS: ${BANNED_STARTERS.join(', ')}
BANNED FORMATTING: No em-dashes (—), no en-dashes (–), no hashtags (#), no markdown
FORMAT RULES:
${antiAiChecklist.map((r: string) => `- ${r}`).join('\n')}

═══════════════════════════════════════════════════════════
COMMON MISTAKES TO AVOID
═══════════════════════════════════════════════════════════
${commonMistakes.map((m: string) => `- ${m}`).join('\n')}

═══════════════════════════════════════════════════════════
CALIBRATION DATA
═══════════════════════════════════════════════════════════
Engagement bias: ${engagementBias} (system tends to overestimate engagement by ~1 point)
Rally feedback: ${engagementInsights.rally_specific_feedback || 'Need more discussion prompts, keep technical explanations simple.'}
Recommendation: ${engagementInsights.recommendation || 'Add 2-3 genuine questions throughout. End with discussion-driving question, not just a link.'}

═══════════════════════════════════════════════════════════
IDEAL CONTENT SPECS
═══════════════════════════════════════════════════════════
Words: ${lengthIdeal.single_post_words || '180-220'}
Characters: ${lengthIdeal.single_post_chars || '1300-1700'}
Paragraphs: ${lengthIdeal.paragraph_count || '5-8 short paragraphs'}
Sentence variety: ${lengthIdeal.sentence_variety || 'mix 3-word and 20-word sentences'}
Paragraph CV: > 0.30 (HIGH variation in paragraph word counts)
Case: Mixed case (not all lowercase, not all uppercase)
${feedbackContext ? `\n═══════════════════════════════════════════════════════════\nFEEDBACK CONTEXT (from previous judge panel)\n═══════════════════════════════════════════════════════════\n${feedbackContext}` : ''}
${customInstructions ? `\n═══════════════════════════════════════════════════════════\nCUSTOM INSTRUCTIONS\n═══════════════════════════════════════════════════════════\n${customInstructions}` : ''}

═══════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════
Return ONLY the tweet text. No explanation, no prefix, no quotes, no markdown. Just the raw tweet content ready to copy-paste.`
}

// ---------------------------------------------------------------------------
// Build judge system prompt
// ---------------------------------------------------------------------------
function buildJudgePrompt(
  judge: typeof JUDGE_PERSONAS[number],
  campaign: any,
  mission: any,
  vault: any,
  engagementBias: number,
  variationText: string,
): string {
  const calibration = vault?.campaigns?.[0]?.calibration || {}
  const crossCampaign = vault?.cross_campaign_lessons || {}

  return `You are Judge ${judge.num} ("${judge.name}") on a Rally.fun content scoring panel.

═══════════════════════════════════════════════════════════
YOUR JUDGE PERSONA
═══════════════════════════════════════════════════════════
${judge.bias}

═══════════════════════════════════════════════════════════
SCORING RUBRIC (6 Dimensions, Max 18 Points)
═══════════════════════════════════════════════════════════
GATE DIMENSIONS (0-2 each):
1. ORIGINALITY (0-2): Is the content genuinely unique? Does it avoid template phrases, AI words, and formulaic structure? Does it have a distinct voice and fresh angle? Score 2 only if truly original.
2. ALIGNMENT (0-2): Does the content directly address the mission directive? Does it stay on-topic throughout? Does it use campaign terminology correctly?
3. ACCURACY (0-2): Are all facts about the project correct? Are claims verifiable? Is the knowledge base used accurately?
4. COMPLIANCE (0-2): Does the content follow ALL campaign rules? ZERO TOLERANCE: em-dash, hashtag, starting with @mention, missing @RallyOnChain = immediate compliance penalty.

QUALITY DIMENSIONS (0-5 each):
5. ENGAGEMENT POTENTIAL (0-5): Does the hook grab attention immediately? Are there genuine discussion prompts? Is there emotional impact? Does it make readers want to reply? Include specific questions for readers.
6. TECHNICAL QUALITY (0-5): Is the writing natural and human-like? Are paragraph lengths varied (CV > 0.30)? Is there proper sentence variety? Are there contractions? Does it read like a real person wrote it?

═══════════════════════════════════════════════════════════
CAMPAIGN CONTEXT
═══════════════════════════════════════════════════════════
Title: ${campaign.title}
Mission: ${mission.title}
Directive: ${mission.directive}
Style: ${campaign.style || 'Visionary and confident'}

Knowledge Base (key facts):
${(campaign.knowledge_base || '').substring(0, 600)}

Rules:
${(mission.rules || []).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

═══════════════════════════════════════════════════════════
ANTI-AI DETECTION
═══════════════════════════════════════════════════════════
Banned AI words: ${AI_BANNED_WORDS.join(', ')}
Banned template phrases: ${TEMPLATE_PHRASES.join(', ')}
Banned starters: ${BANNED_STARTERS.join(', ')}
Banned formatting: em-dashes (—), en-dashes (–), hashtags (#), markdown, numbered lists

═══════════════════════════════════════════════════════════
CALIBRATION NOTE
═══════════════════════════════════════════════════════════
Engagement bias: ${engagementBias} (our system historically overestimates engagement by ~1 point)
Rally's actual feedback: ${crossCampaign.engagement_5_5_insights?.rally_specific_feedback || 'Technical depth deters casual readers. Need more discussion prompts.'}
BE STRICT on engagement. Only give 5/5 if the content has MULTIPLE genuine questions/prompts that would drive real discussion.

═══════════════════════════════════════════════════════════
CONTENT TO SCORE
═══════════════════════════════════════════════════════════
${variationText}

═══════════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════════
Return ONLY valid JSON, no markdown, no explanation:
{
  "originality": <0-2>,
  "alignment": <0-2>,
  "accuracy": <0-2>,
  "compliance": <0-2>,
  "engagement": <0-5>,
  "technical": <0-5>,
  "total": <sum of above>,
  "reasoning": "<brief explanation of your scores>",
  "ai_patterns_found": ["<list any AI patterns detected>"],
  "suggestions": ["<list specific improvement suggestions>"]
}

BE HONEST AND STRICT. Do not inflate scores. A 5/5 on engagement should be EXTREMELY rare. Most content deserves 3-4 on engagement. If you see AI patterns, deduct originality. If rules are violated, compliance must be <= 1.`
}

// ---------------------------------------------------------------------------
// Pipeline implementation
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const startTime = Date.now()

  let controller: ReadableStreamDefaultController | null = null

  const stream = new ReadableStream({
    start(ctl) {
      controller = ctl
    },
    cancel() {
      controller = null
    },
  })

  function send(event: string, data: unknown) {
    if (!controller) return
    try {
      controller.enqueue(encoder.encode(sseEvent(event, data)))
    } catch {
      // Stream may have been closed
    }
  }

  // Run pipeline asynchronously
  ;(async () => {
    try {
      const body = await req.json()
      const variationCount = Math.min(Math.max(body.variationCount || 3, 1), 6)
      const customInstructions = body.customInstructions
      const maxFeedbackLoops = Math.min(Math.max(body.maxFeedbackLoops || 2, 0), 3)

      // ── Auto-save: Create PipelineRun record ──────────────────────
      let pipelineRunId: string | null = null
      try {
        const pipelineModel = (db as any).pipelineRun
        if (pipelineModel && typeof pipelineModel.create === 'function') {
          const run = await pipelineModel.create({
            data: {
              status: 'running',
              variations: variationCount,
              feedbackLoops: 0,
              requestParams: JSON.stringify({
                campaignId: body.campaignId,
                campaignAddress: body.campaignAddress,
                variationCount,
                customInstructions,
                maxFeedbackLoops,
              }),
            },
          })
          pipelineRunId = run.id
          send('pipeline_run', { runId: pipelineRunId, status: 'running' })
        }
      } catch (err) {
        console.error('Failed to create PipelineRun record:', err)
      }

      // ── Step 1: Campaign Picker ──────────────────────────────────────
      send('step_start', { step: 1, name: 'Campaign Picker', icon: '📋' })

      const campaignId: string | undefined = body.campaignId
      const campaignAddress: string | undefined = body.campaignAddress

      let campaign: any = null
      let mission: any = null
      let campaignSource: string = 'none'

      // 1a. Try DB lookup by campaignId
      if (campaignId) {
        try {
          const model = (db as any).rallyCampaign
          if (model && typeof model.findUnique === 'function') {
            const dbCampaign = await model.findUnique({ where: { id: campaignId } })
            if (dbCampaign) {
              // Parse missions JSON
              let parsedMissions: any[] = []
              if (dbCampaign.missionsJson) {
                try { parsedMissions = JSON.parse(dbCampaign.missionsJson) } catch { parsedMissions = [] }
              }
              // Parse rules JSON
              let parsedRules: string[] = []
              if (dbCampaign.rulesJson) {
                try { parsedRules = JSON.parse(dbCampaign.rulesJson) } catch { parsedRules = [] }
              }
              // Parse proposed angles JSON
              let parsedAngles: string[] = []
              if (dbCampaign.proposedAnglesJson) {
                try { parsedAngles = JSON.parse(dbCampaign.proposedAnglesJson) } catch { parsedAngles = [] }
              }
              const parsedMission = parsedMissions[0] || {}

              campaign = {
                title: dbCampaign.title,
                contract_address: dbCampaign.contractAddress,
                end_date: dbCampaign.endDate,
                status: dbCampaign.status,
                style: dbCampaign.style || 'Visionary and confident',
                goal: dbCampaign.goal || dbCampaign.description || '',
                knowledge_base: dbCampaign.knowledgeBase || '',
                campaign_url: dbCampaign.campaignUrl || '',
                reward_pool: dbCampaign.rewardPool || '',
                creator: dbCampaign.creator || '',
                x_username: dbCampaign.xUsername || '',
                start_date: dbCampaign.startDate || '',
              }
              mission = {
                title: parsedMission.title || 'DB Mission',
                directive: parsedMission.directive || dbCampaign.goal || dbCampaign.description || '',
                reward: parsedMission.reward || dbCampaign.rewardPool || '',
                rules: parsedRules.length > 0 ? parsedRules : (parsedMission.rules || []),
                proposed_angles: parsedAngles.length > 0 ? parsedAngles : (parsedMission.proposed_angles || []),
              }
              campaignSource = 'db'
            }
          }
        } catch (err) {
          console.error('Pipeline: DB campaign lookup failed, falling back to file:', err)
        }
      }

      // 1b. Fallback to file-based campaign
      if (!campaign) {
        const master = getMaster()
        if (!master || !master.active_campaign) {
          send('error', { message: 'No active campaign found. Provide campaignId or ensure rally_master.json has an active campaign.' })
          controller?.close()
          return
        }
        campaign = master.active_campaign
        mission = campaign.missions?.[0]
        if (!mission) {
          send('error', { message: 'No active mission found in campaign' })
          controller?.close()
          return
        }
        campaignSource = 'file'
      }

      if (!mission) {
        send('error', { message: 'No mission data available for campaign' })
        controller?.close()
        return
      }

      send('step_complete', {
        step: 1,
        result: {
          campaignTitle: campaign.title,
          missionTitle: mission.title,
          directive: mission.directive,
          reward: mission.reward,
          deadline: campaign.end_date,
          contractAddress: campaign.contract_address,
          status: campaign.status,
          source: campaignSource,
        },
      })

      // ── Auto-save: Update PipelineRun with campaign info ────────────────
      if (pipelineRunId) {
        try {
          const pipelineModel = (db as any).pipelineRun
          if (pipelineModel && typeof pipelineModel.update === 'function') {
            await pipelineModel.update({
              where: { id: pipelineRunId },
              data: { bestAngle: campaign.title },
            })
          }
        } catch (dbErr) {
          console.error('Failed to update PipelineRun step 1:', dbErr)
        }
      }

      // ── Step 2: Data Fetch ──────────────────────────────────────────
      send('step_start', { step: 2, name: 'Data Fetch', icon: '📂' })

      const vault = getKnowledgeVault()
      const patternCache = getPatternCache()

      const kbSize = vault ? JSON.stringify(vault).length : 0
      const patternsCount = patternCache?.score_distribution?.count ?? 0

      send('step_complete', {
        step: 2,
        result: {
          knowledgeVaultLoaded: !!vault,
          patternCacheLoaded: !!patternCache,
          kbSizeBytes: kbSize,
          patternCacheSubmissions: patternsCount,
          totalCampaignsWorked: vault?.total_campaigns_worked ?? 0,
          total1818: vault?.total_18_18_achieved ?? 0,
        },
      })

      // ── Step 3: Calibrate ───────────────────────────────────────────
      send('step_start', { step: 3, name: 'Calibrate', icon: '🎯' })

      const calib = vault?.campaigns?.[0]?.calibration || {}
      const engagementBias = calib.gap ?? vault?.adaptive_system?.calibration?.global_calibration?.total_bias ?? -1.0
      const dimCalibration = vault?.adaptive_system?.calibration?.dimension_calibration || {}

      send('step_complete', {
        step: 3,
        result: {
          calibrated: calib.calibrated ?? false,
          internalScore: calib.internal_score ?? 'N/A',
          rallyActualScore: calib.rally_actual_score ?? 'N/A',
          gap: calib.gap ?? engagementBias,
          gapPerDimension: calib.gap_per_dimension || {},
          engagementBias,
          engagementTrend: dimCalibration.engagement_potential?.trend || 'unknown',
          rallyFeedbackSummary: calib.rally_feedback_summary
            ? {
                engagement45Reasons: calib.rally_feedback_summary.engagement_4_5_reasons || [],
                praisedElements: calib.rally_feedback_summary.praised_elements || [],
              }
            : null,
        },
      })

      // ── Step 4: Competitive Analysis ────────────────────────────────
      send('step_start', { step: 4, name: 'Competitive Analysis', icon: '🔍' })

      const inherited = patternCache?.inherited_patterns_from_prev_campaign || {}
      const overusedAngles = inherited.overused_angles || campaign.learning?.overused_angles || []
      const overusedPhrases = inherited.overused_phrases || []
      const uniqueGaps = inherited.unique_gaps || campaign.learning?.unique_gaps || []
      const winningPats = inherited.winning_patterns || []
      const topHookStyles = inherited.top_hooks || campaign.learning?.top_hooks || []

      send('step_complete', {
        step: 4,
        result: {
          overusedAngles: overusedAngles.length,
          overusedPhrases: overusedPhrases.length,
          uniqueGaps: uniqueGaps.length,
          winningPatterns: winningPats.length,
          topHooks: topHookStyles.length,
          topHookList: topHookStyles.slice(0, 5),
          uniqueGapList: uniqueGaps.slice(0, 5),
          perfectScorers: patternCache?.top_performers_18?.length ?? 0,
          nearPerfect17: patternCache?.near_perfect_17_analysis?.total ?? 0,
          avgScore: patternCache?.score_distribution?.avg ?? 'N/A',
        },
      })

      // ── Step 5: Deep Analysis ───────────────────────────────────────
      send('step_start', { step: 5, name: 'Deep Analysis', icon: '🧠' })

      const crossCampaign = vault?.cross_campaign_lessons || {}
      const hardestDims = crossCampaign.hardest_dimensions_ranked || []
      const techniquesWorked = crossCampaign.writing_techniques_ranked
        ?.filter((t: any) => t.success_rate === 'high')
        .map((t: any) => t.technique) || []

      const guidance = [
        `Mission: ${mission.directive}`,
        `Style: ${campaign.style || 'Visionary and confident'}`,
        `Hardest dimensions: ${hardestDims.slice(0, 3).map((d: any) => `${d.dimension} (${d.fail_rate})`).join(', ')}`,
        `High-value techniques: ${techniquesWorked.slice(0, 4).join(', ')}`,
        `Engagement bias to counter: ${engagementBias} (need EXTRA engagement signals)`,
        `Target: 180-220 words, 5-8 paragraphs, CV > 0.30, mixed case`,
      ].join('\n')

      send('step_complete', {
        step: 5,
        result: {
          hardestDimensions: hardestDims.slice(0, 3).map((d: any) => ({
            dimension: d.dimension,
            failRate: d.fail_rate,
            why: d.why,
            fix: d.how_to_fix,
          })),
          highValueTechniques: techniquesWorked.slice(0, 6),
          bestHookStyles: crossCampaign.best_hook_styles || [],
          idealLength: crossCampaign.content_length_ideal || {},
          guidance,
        },
      })

      // ── Step 6: Generate Variations ─────────────────────────────────
      send('step_start', { step: 6, name: 'Generate Variations', icon: '✍️' })

      const sdk = await getSdk()
      const angles = mission.proposed_angles?.length > 0
        ? mission.proposed_angles.slice(0, variationCount)
        : Array.from({ length: variationCount }, (_, i) => `Angle ${i + 1}: general analysis`)

      const allVariations: VariationData[] = []

      for (let i = 0; i < variationCount; i++) {
        const angle = angles[i] || `General angle ${i + 1}`
        const sysPrompt = buildGenerationPrompt(campaign, mission, vault, patternCache, customInstructions)

        const userPrompt = `Write ONE tweet variation for this Rally campaign.

ANGLE: ${angle}

${i > 0 ? 'CRITICAL: This must be COMPLETELY DIFFERENT from any previous variation. Use a different hook, structure, and voice.' : ''}

Return ONLY the tweet text. No explanation, no prefix.`

        let text = ''
        try {
          const completion = await retryWithBackoff(
            () => sdk.createChatCompletion({
              messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: userPrompt },
              ],
            }),
            2, 1500, `Generate variation ${i + 1}`
          )
          text = completion.choices?.[0]?.message?.content?.trim() || ''
        } catch (genErr) {
          const errMsg = genErr instanceof Error ? genErr.message : String(genErr)
          send('warning', { step: 6, variation: i + 1, message: `Failed to generate variation ${i + 1} after retries: ${errMsg}` })
          continue
        }
        if (!text) continue

        const analysis = analyzeContent(text)
        const varId = `var_${String.fromCharCode(65 + i)}_initial`

        allVariations.push({
          id: varId,
          text,
          angle,
          analysis,
          index: i,
        })

        send('variation', {
          id: varId,
          text,
          angle,
          analysis,
          index: i,
        })
      }

      if (allVariations.length === 0) {
        send('error', { message: 'Failed to generate any variations' })
        controller?.close()
        return
      }

      send('step_complete', {
        step: 6,
        result: {
          generatedCount: allVariations.length,
          variationIds: allVariations.map(v => v.id),
        },
      })

      // ── Step 7: Verification ────────────────────────────────────────
      send('step_start', { step: 7, name: 'Verification', icon: '✅' })

      for (const variation of allVariations) {
        const a = variation.analysis
        send('verification', {
          id: variation.id,
          passed: a.passed,
          issues: a.complianceIssues,
          hasEmDash: a.hasEmDash,
          hasHashtag: a.hasHashtag,
          startsWithMention: a.startsWithMention,
          hasRallyMention: a.hasRallyMention,
          aiWordCount: a.foundAiWords.length,
          templateCount: a.foundTemplates.length,
          paragraphCV: a.paragraphCV,
          wordCount: a.wordCount,
        })
      }

      const passCount = allVariations.filter(v => v.analysis.passed).length
      send('step_complete', {
        step: 7,
        result: {
          totalChecked: allVariations.length,
          passed: passCount,
          failed: allVariations.length - passCount,
          complianceRate: `${Math.round((passCount / allVariations.length) * 100)}%`,
        },
      })

      // ── Step 8: Judge Panel ─────────────────────────────────────────
      send('step_start', { step: 8, name: 'Judge Panel', icon: '⚖️' })

      const allJudgeResults: JudgeResult[] = []

      for (const variation of allVariations) {
        const judgePromises = JUDGE_PERSONAS.map(async (judge) => {
          try {
            const judgeSysPrompt = buildJudgePrompt(judge, campaign, mission, vault, engagementBias, variation.text)

            const completion = await retryWithBackoff(
              () => sdk.createChatCompletion({
                messages: [
                  { role: 'system', content: judgeSysPrompt },
                  { role: 'user', content: `Score this content as Judge ${judge.num} (${judge.name}). Return ONLY valid JSON.` },
                ],
              }),
              1, 1000, `Judge ${judge.num} (${judge.name})`
            )

            const raw = completion.choices?.[0]?.message?.content?.trim() || ''

            // Extract JSON from possible markdown fences
            let jsonStr = raw
            const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (jsonMatch) jsonStr = jsonMatch[1].trim()

            const parsed = JSON.parse(jsonStr)
            const scores = clampJudgeScores(parsed)

            return {
              variationId: variation.id,
              judgeNum: judge.num,
              name: judge.name,
              scores,
              reasoning: parsed.reasoning || 'No reasoning provided.',
              aiPatternsFound: Array.isArray(parsed.ai_patterns_found) ? parsed.ai_patterns_found : [],
              suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
            } satisfies JudgeResult
          } catch {
            // On parse failure, return default low scores
            return {
              variationId: variation.id,
              judgeNum: judge.num,
              name: judge.name,
              scores: clampJudgeScores({}),
              reasoning: 'Failed to parse judge response. Default scores applied.',
              aiPatternsFound: [],
              suggestions: ['Judge response parsing failed. Review content manually.'],
            } satisfies JudgeResult
          }
        })

        // Run 5 judges IN PARALLEL
        const results = await Promise.all(judgePromises)
        allJudgeResults.push(...results)

        for (const r of results) {
          send('judge', r)
        }
      }

      send('step_complete', {
        step: 8,
        result: {
          totalJudgments: allJudgeResults.length,
          variationsJudged: allVariations.length,
          judgesPerVariation: JUDGE_PERSONAS.length,
        },
      })

      // ── Step 9: Consensus ───────────────────────────────────────────
      send('step_start', { step: 9, name: 'Consensus', icon: '📊' })

      const consensusResults: ConsensusResult[] = []

      for (const variation of allVariations) {
        const varJudges = allJudgeResults.filter(j => j.variationId === variation.id)
        if (varJudges.length === 0) continue

        const n = varJudges.length
        const avgScores = {
          originality: varJudges.reduce((s, j) => s + j.scores.originality, 0) / n,
          alignment: varJudges.reduce((s, j) => s + j.scores.alignment, 0) / n,
          accuracy: varJudges.reduce((s, j) => s + j.scores.accuracy, 0) / n,
          compliance: varJudges.reduce((s, j) => s + j.scores.compliance, 0) / n,
          engagement: varJudges.reduce((s, j) => s + j.scores.engagement, 0) / n,
          technical: varJudges.reduce((s, j) => s + j.scores.technical, 0) / n,
        }

        // Apply engagement bias
        avgScores.engagement = clampScore(avgScores.engagement + engagementBias, 0, 5)

        const total = avgScores.originality + avgScores.alignment + avgScores.accuracy + avgScores.compliance + avgScores.engagement + avgScores.technical
        const totalRounded = Math.round(total * 100) / 100

        // Standard deviation
        const totals = varJudges.map(j => j.scores.total)
        const mean = totals.reduce((a, b) => a + b, 0) / n
        const variance = totals.reduce((a, b) => a + (b - mean) ** 2, 0) / n
        const stdDev = Math.round(Math.sqrt(variance) * 100) / 100

        let verdict = 'weak'
        if (totalRounded >= 17) verdict = 'elite'
        else if (totalRounded >= 16) verdict = 'strong'
        else if (totalRounded >= 14) verdict = 'moderate'

        const consensus: ConsensusResult = {
          variationId: variation.id,
          consensus: {
            total: totalRounded,
            stdDev,
            averageScores: {
              originality: Math.round(avgScores.originality * 100) / 100,
              alignment: Math.round(avgScores.alignment * 100) / 100,
              accuracy: Math.round(avgScores.accuracy * 100) / 100,
              compliance: Math.round(avgScores.compliance * 100) / 100,
              engagement: Math.round(avgScores.engagement * 100) / 100,
              technical: Math.round(avgScores.technical * 100) / 100,
            },
            verdict,
          },
        }

        consensusResults.push(consensus)
        send('consensus', consensus)
      }

      // Sort by total to find best
      consensusResults.sort((a, b) => b.consensus.total - a.consensus.total)
      const initialBest = consensusResults[0]

      send('step_complete', {
        step: 9,
        result: {
          consensusCount: consensusResults.length,
          bestVariationId: initialBest?.variationId,
          bestScore: initialBest?.consensus.total,
          bestVerdict: initialBest?.consensus.verdict,
          scoreRange: consensusResults.length > 0
            ? `${consensusResults[consensusResults.length - 1].consensus.total} - ${consensusResults[0].consensus.total}`
            : 'N/A',
          allScores: consensusResults.map(c => ({
            id: c.variationId,
            total: c.consensus.total,
            verdict: c.consensus.verdict,
          })),
        },
      })

      // ── Step 10: Feedback Loop ──────────────────────────────────────
      send('step_start', { step: 10, name: 'Feedback Loop', icon: '🔄' })

      let feedbackLoopsRun = 0
      let bestConsensus = initialBest

      if (bestConsensus && bestConsensus.consensus.total < 16 && maxFeedbackLoops > 0) {
        for (let loop = 1; loop <= maxFeedbackLoops; loop++) {
          if (!bestConsensus || bestConsensus.consensus.total >= 16) break

          const currentBest = bestConsensus.consensus.total

          // Find worst variation and weak dimensions
          const worstConsensus = consensusResults[consensusResults.length - 1]
          const worstVariation = allVariations.find(v => v.id === worstConsensus?.variationId)
          const worstJudges = allJudgeResults.filter(j => j.variationId === worstConsensus?.variationId)

          // Compute weak dimensions from worst
          const dimAvgs: Record<string, number> = {}
          for (const j of worstJudges) {
            for (const dim of ['originality', 'alignment', 'accuracy', 'compliance', 'engagement', 'technical'] as const) {
              dimAvgs[dim] = (dimAvgs[dim] || 0) + j.scores[dim]
            }
          }
          const judgeCount = worstJudges.length || 1
          for (const dim of Object.keys(dimAvgs)) {
            dimAvgs[dim] = dimAvgs[dim] / judgeCount
          }

          const dimMax: Record<string, number> = {
            originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5,
          }

          const weakDimensions = Object.entries(dimAvgs)
            .map(([name, score]) => ({
              name,
              score: Math.round(score * 100) / 100,
              max: dimMax[name],
              gap: Math.round((dimMax[name] - score) * 100) / 100,
              gapPct: Math.round(((dimMax[name] - score) / dimMax[name]) * 100),
              reason: getWeaknessReason(name, score, dimMax[name]),
            }))
            .filter(d => d.gapPct > 10)
            .sort((a, b) => b.gapPct - a.gapPct)

          send('feedback_start', {
            loop,
            currentBest,
            weakDimensions: weakDimensions.slice(0, 5),
            worstVariation: worstVariation?.text?.substring(0, 200) || 'N/A',
          })

          // Collect feedback from all judges for the worst variation
          const feedbackText = worstJudges.map(j => {
            const dimStr = `O:${j.scores.originality} A:${j.scores.alignment} Ac:${j.scores.accuracy} C:${j.scores.compliance} E:${j.scores.engagement} T:${j.scores.technical}`
            return `[${j.name}] ${dimStr}/18\nReasoning: ${j.reasoning}\nAI patterns: ${j.aiPatternsFound.join(', ') || 'none'}\nSuggestions: ${j.suggestions.join('; ')}`
          }).join('\n\n')

          const feedbackContext = `PREVIOUS SCORE: ${currentBest}/18 (below 16 threshold)\n\nFEEDBACK FROM JUDGE PANEL ON WORST VARIATION:\n${feedbackText}\n\nWEAKEST DIMENSIONS:\n${weakDimensions.slice(0, 4).map(d => `- ${d.name}: ${d.score}/${d.max} (gap: ${d.gapPct}%) - ${d.reason}`).join('\n')}\n\nIMPROVEMENT FOCUS: ${weakDimensions.slice(0, 3).map(d => d.name).join(', ')}`

          // Generate 2 improved variations
          const newAngles = mission.proposed_angles?.length > 0
            ? [mission.proposed_angles[loop % mission.proposed_angles.length], uniqueGaps[0] || 'Unique angle']
            : ['Improved angle A', 'Improved angle B']

          for (let ni = 0; ni < 2; ni++) {
            const angle = newAngles[ni] || `Feedback loop ${loop} variation ${ni + 1}`
            const sysPrompt = buildGenerationPrompt(campaign, mission, vault, patternCache, customInstructions, feedbackContext)

            const userPrompt = `Write ONE improved tweet for this Rally campaign. Address the specific weaknesses identified below.

ANGLE: ${angle}
${ni > 0 ? 'IMPORTANT: Make this DIFFERENT from the other feedback variation. Use a completely different approach.' : ''}

${feedbackContext}

Return ONLY the tweet text. No explanation, no prefix.`

            const completion = await retryWithBackoff(
              () => sdk.createChatCompletion({
                messages: [
                  { role: 'system', content: sysPrompt },
                  { role: 'user', content: userPrompt },
                ],
              }),
              2, 1500, `Feedback loop ${loop} variation ${ni + 1}`
            )

            const text = completion.choices?.[0]?.message?.content?.trim() || ''
            if (!text) continue

            const analysis = analyzeContent(text)
            const varId = `var_FB${loop}_${String.fromCharCode(65 + ni)}`

            const newVariation: VariationData = {
              id: varId,
              text,
              angle,
              analysis,
              index: allVariations.length + ni,
              feedbackLoop: loop,
            }

            allVariations.push(newVariation)
            send('variation', {
              id: varId,
              text,
              angle,
              analysis,
              index: newVariation.index,
              feedbackLoop: loop,
            })

            // Verification
            send('verification', {
              id: varId,
              passed: analysis.passed,
              issues: analysis.complianceIssues,
              hasEmDash: analysis.hasEmDash,
              hasHashtag: analysis.hasHashtag,
              startsWithMention: analysis.startsWithMention,
              hasRallyMention: analysis.hasRallyMention,
              aiWordCount: analysis.foundAiWords.length,
              templateCount: analysis.foundTemplates.length,
              paragraphCV: analysis.paragraphCV,
              wordCount: analysis.wordCount,
            })

            // Judge panel for this feedback variation (parallel)
            const fbJudgePromises = JUDGE_PERSONAS.map(async (judge) => {
              try {
                const judgeSysPrompt = buildJudgePrompt(judge, campaign, mission, vault, engagementBias, text)

                const comp = await retryWithBackoff(
                  () => sdk.createChatCompletion({
                    messages: [
                      { role: 'system', content: judgeSysPrompt },
                      { role: 'user', content: `Score this content as Judge ${judge.num} (${judge.name}). Return ONLY valid JSON.` },
                    ],
                  }),
                  1, 1000, `Feedback Judge ${judge.num}`
                )

                const raw = comp.choices?.[0]?.message?.content?.trim() || ''
                let jsonStr = raw
                const jm = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
                if (jm) jsonStr = jm[1].trim()

                const parsed = JSON.parse(jsonStr)
                const scores = clampJudgeScores(parsed)

                const result: JudgeResult = {
                  variationId: varId,
                  judgeNum: judge.num,
                  name: judge.name,
                  scores,
                  reasoning: parsed.reasoning || 'No reasoning provided.',
                  aiPatternsFound: Array.isArray(parsed.ai_patterns_found) ? parsed.ai_patterns_found : [],
                  suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
                  feedbackLoop: loop,
                }

                return result
              } catch {
                return {
                  variationId: varId,
                  judgeNum: judge.num,
                  name: judge.name,
                  scores: clampJudgeScores({}),
                  reasoning: 'Failed to parse judge response.',
                  aiPatternsFound: [],
                  suggestions: ['Judge response parsing failed.'],
                  feedbackLoop: loop,
                } satisfies JudgeResult
              }
            })

            const fbResults = await Promise.all(fbJudgePromises)
            allJudgeResults.push(...fbResults)

            for (const r of fbResults) {
              send('judge', r)
            }

            // Consensus for this feedback variation
            const fbVarJudges = allJudgeResults.filter(j => j.variationId === varId)
            if (fbVarJudges.length > 0) {
              const fn = fbVarJudges.length
              const fbAvgScores = {
                originality: fbVarJudges.reduce((s, j) => s + j.scores.originality, 0) / fn,
                alignment: fbVarJudges.reduce((s, j) => s + j.scores.alignment, 0) / fn,
                accuracy: fbVarJudges.reduce((s, j) => s + j.scores.accuracy, 0) / fn,
                compliance: fbVarJudges.reduce((s, j) => s + j.scores.compliance, 0) / fn,
                engagement: fbVarJudges.reduce((s, j) => s + j.scores.engagement, 0) / fn,
                technical: fbVarJudges.reduce((s, j) => s + j.scores.technical, 0) / fn,
              }

              fbAvgScores.engagement = clampScore(fbAvgScores.engagement + engagementBias, 0, 5)

              const fbTotal = fbAvgScores.originality + fbAvgScores.alignment + fbAvgScores.accuracy + fbAvgScores.compliance + fbAvgScores.engagement + fbAvgScores.technical
              const fbTotalRounded = Math.round(fbTotal * 100) / 100

              const fbTotals = fbVarJudges.map(j => j.scores.total)
              const fbMean = fbTotals.reduce((a, b) => a + b, 0) / fn
              const fbVariance = fbTotals.reduce((a, b) => a + (b - fbMean) ** 2, 0) / fn
              const fbStdDev = Math.round(Math.sqrt(fbVariance) * 100) / 100

              let fbVerdict = 'weak'
              if (fbTotalRounded >= 17) fbVerdict = 'elite'
              else if (fbTotalRounded >= 16) fbVerdict = 'strong'
              else if (fbTotalRounded >= 14) fbVerdict = 'moderate'

              const fbConsensus: ConsensusResult = {
                variationId: varId,
                consensus: {
                  total: fbTotalRounded,
                  stdDev: fbStdDev,
                  averageScores: {
                    originality: Math.round(fbAvgScores.originality * 100) / 100,
                    alignment: Math.round(fbAvgScores.alignment * 100) / 100,
                    accuracy: Math.round(fbAvgScores.accuracy * 100) / 100,
                    compliance: Math.round(fbAvgScores.compliance * 100) / 100,
                    engagement: Math.round(fbAvgScores.engagement * 100) / 100,
                    technical: Math.round(fbAvgScores.technical * 100) / 100,
                  },
                  verdict: fbVerdict,
                },
                feedbackLoop: loop,
              }

              consensusResults.push(fbConsensus)
              send('consensus', fbConsensus)

              // Update best if this is better
              if (fbTotalRounded > (bestConsensus?.consensus.total ?? 0)) {
                bestConsensus = fbConsensus
              }
            }
          }

          feedbackLoopsRun = loop

          // Re-sort consensus
          consensusResults.sort((a, b) => b.consensus.total - a.consensus.total)
          bestConsensus = consensusResults[0]

          send('feedback_end', {
            loop,
            newBest: bestConsensus?.consensus.total ?? 0,
          })

          if (bestConsensus && bestConsensus.consensus.total >= 16) break
        }
      } else {
        send('feedback_end', {
          loop: 0,
          newBest: bestConsensus?.consensus.total ?? 0,
        })
      }

      send('step_complete', {
        step: 10,
        result: {
          feedbackLoopsRun,
          maxFeedbackLoops,
          bestScore: bestConsensus?.consensus.total ?? 0,
          bestVerdict: bestConsensus?.consensus.verdict ?? 'N/A',
          bestVariationId: bestConsensus?.variationId ?? 'N/A',
          totalVariations: allVariations.length,
          totalJudgments: allJudgeResults.length,
        },
      })

      // ── Step 11: Save Output ────────────────────────────────────────
      send('step_start', { step: 11, name: 'Save Output', icon: '💾' })

      // Find best variation
      const bestVar = allVariations.find(v => v.id === bestConsensus?.variationId)
      if (!bestVar) {
        send('error', { message: 'Best variation not found for saving' })
        controller?.close()
        return
      }

      const bestCons = bestConsensus.consensus
      const pipelineTime = Date.now() - startTime

      // Format output for file
      const timestamp = new Date().toISOString()
      const separator = '='.repeat(60)
      const output = [
        separator,
        `RALLY CONTENT BUILD OUTPUT`,
        separator,
        `Timestamp: ${timestamp}`,
        `Campaign: ${campaign.title}`,
        `Mission: ${mission.title}`,
        `Score: ${bestCons.total}/18 (${bestCons.verdict})`,
        `Variation: ${bestVar.id}`,
        `Feedback Loops: ${feedbackLoopsRun}`,
        `Pipeline Time: ${Math.round(pipelineTime / 1000)}s`,
        separator,
        '',
        `CONTENT READY FOR COPY-PASTE:`,
        '',
        bestVar.text,
        '',
        separator,
        `JUDGE PANEL VERIFICATION`,
        separator,
        `Consensus Score: ${bestCons.total}/18`,
        `Standard Deviation: ${bestCons.stdDev}`,
        `Verdict: ${bestCons.verdict}`,
        '',
        `Average Dimension Scores:`,
        `  Originality:      ${bestCons.averageScores.originality}/2`,
        `  Alignment:        ${bestCons.averageScores.alignment}/2`,
        `  Accuracy:         ${bestCons.averageScores.accuracy}/2`,
        `  Compliance:       ${bestCons.averageScores.compliance}/2`,
        `  Engagement:       ${bestCons.averageScores.engagement}/5`,
        `  Technical:        ${bestCons.averageScores.technical}/5`,
        '',
        `Individual Judge Scores:`,
        ...allJudgeResults
          .filter(j => j.variationId === bestVar.id)
          .map(j => `  ${j.name} (J${j.judgeNum}): ${j.scores.total}/18 [O:${j.scores.originality} A:${j.scores.alignment} Ac:${j.scores.accuracy} C:${j.scores.compliance} E:${j.scores.engagement} T:${j.scores.technical}]`),
        '',
        separator,
        `CONTENT ANALYSIS:`,
        separator,
        `Words: ${bestVar.analysis.wordCount}`,
        `Characters: ${bestVar.analysis.charCount}`,
        `Paragraphs: ${bestVar.analysis.paragraphCount}`,
        `Paragraph CV: ${bestVar.analysis.paragraphCV}`,
        `Questions: ${bestVar.analysis.questionCount}`,
        `Contractions: ${bestVar.analysis.contractionCount}`,
        `Compliance: ${bestVar.analysis.passed ? 'PASSED' : 'FAILED'}`,
        ...(bestVar.analysis.complianceIssues.length > 0
          ? [`Issues: ${bestVar.analysis.complianceIssues.join('; ')}`]
          : []),
        '',
        separator,
        `ALL VARIATIONS (${allVariations.length} total):`,
        separator,
        ...allVariations.map((v, idx) => {
          const vc = consensusResults.find(c => c.variationId === v.id)
          return `[${idx + 1}] ${v.id} | Score: ${vc?.consensus.total ?? 'N/A'}/18 | Angle: ${v.angle} | ${v.feedbackLoop ? `Feedback Loop ${v.feedbackLoop}` : 'Initial'}\n${v.text.substring(0, 100)}...`
        }),
        '',
        separator,
        '',
      ].join('\n')

      // Append to file
      try {
        const dir = path.dirname(BEST_CONTENT_FILE)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        fs.appendFileSync(BEST_CONTENT_FILE, output + '\n')
      } catch (err) {
        console.error('Failed to save best content:', err)
      }

      send('step_complete', {
        step: 11,
        result: {
          saved: true,
          filePath: BEST_CONTENT_FILE,
          fileSize: output.length,
        },
      })

      // ── Auto-generate latest report JSON ──────────────────────────────
      const latestReportPath = path.join(DATA_DIR, 'latest_report.json')
      try {
        const reportData = {
          generatedAt: new Date().toISOString(),
          campaignTitle: campaign.title,
          bestScore: bestConsensus.consensus.total,
          verdict: bestConsensus.consensus.verdict,
          pipelineTime: Math.round(pipelineTime / 1000),
          feedbackLoops: feedbackLoopsRun,
          bestContent: bestVar.text,
          bestAngle: bestVar.angle,
          bestVariationId: bestVar.id,
          allVariations: allVariations.map(v => {
            const vc = consensusResults.find(c => c.variationId === v.id)
            return { id: v.id, angle: v.angle, text: v.text, score: vc?.consensus.total ?? 0, verdict: vc?.consensus.verdict ?? 'N/A' }
          }),
          consensusScores: bestConsensus.consensus.averageScores,
          judgeBreakdown: allJudgeResults.filter(j => j.variationId === bestVar.id).map(j => ({
            name: j.name, total: j.scores.total, scores: j.scores,
          })),
          campaign: { title: campaign.title, mission: mission.title, contractAddress: campaign.contract_address },
        }
        const reportDir = path.dirname(latestReportPath)
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })
        fs.writeFileSync(latestReportPath, JSON.stringify(reportData, null, 2))
        send('download_ready', { filePath: latestReportPath, fileName: 'latest_report.json', fileSize: JSON.stringify(reportData).length })
      } catch (reportErr) {
        console.error('Failed to generate latest report:', reportErr)
        send('warning', { message: 'Latest report JSON generation failed (non-critical)' })
      }

      // ── Auto-save: Update PipelineRun to completed ──────────────────────
      if (pipelineRunId) {
        try {
          const pipelineModel = (db as any).pipelineRun
          if (pipelineModel && typeof pipelineModel.update === 'function') {
            await pipelineModel.update({
              where: { id: pipelineRunId },
              data: {
                status: 'completed',
                bestScore: bestConsensus.consensus.total,
                verdict: bestConsensus.consensus.verdict,
                variations: allVariations.length,
                feedbackLoops: feedbackLoopsRun,
                pipelineTime: Math.round(pipelineTime / 100) / 10,
                bestAngle: bestVar.angle,
                bestContent: bestVar.text,
              },
            })
          }
        } catch (dbErr) {
          console.error('Failed to update PipelineRun on completion:', dbErr)
        }
      }

      // ── Complete Event ──────────────────────────────────────────────
      send('complete', {
        bestVariation: {
          id: bestVar.id,
          text: bestVar.text,
          angle: bestVar.angle,
          analysis: bestVar.analysis,
          consensus: bestConsensus.consensus,
          judgeBreakdown: allJudgeResults
            .filter(j => j.variationId === bestVar.id)
            .reduce<Record<string, number>>((acc, j) => {
              acc[`J${j.judgeNum}`] = j.scores.total
              return acc
            }, {}),
          feedbackLoop: bestVar.feedbackLoop,
        },
        allVariations: allVariations.map(v => {
          const vc = consensusResults.find(c => c.variationId === v.id)
          return {
            id: v.id,
            angle: v.angle,
            text: v.text,
            score: vc?.consensus.total ?? 0,
            verdict: vc?.consensus.verdict ?? 'N/A',
            feedbackLoop: v.feedbackLoop,
          }
        }),
        pipelineTime,
        feedbackLoops: feedbackLoopsRun,
        campaign: {
          title: campaign.title,
          mission: mission.title,
          reward: mission.reward,
          contractAddress: campaign.contract_address,
          campaignUrl: campaign.campaign_url,
        },
      })

      controller?.close()
    } catch (err) {
      console.error('Pipeline error:', err)
      const errMsg = err instanceof Error ? err.message : String(err)
      send('error', { message: `Pipeline error: ${errMsg}` })

      // ── Auto-save: Update PipelineRun to failed ──────────────────────
      if (pipelineRunId) {
        try {
          const pipelineModel = (db as any).pipelineRun
          if (pipelineModel && typeof pipelineModel.update === 'function') {
            await pipelineModel.update({
              where: { id: pipelineRunId },
              data: { status: 'error', errorMessage: errMsg.substring(0, 500) },
            })
          }
        } catch (dbSaveErr) {
          console.error('Failed to update PipelineRun on error:', dbSaveErr)
        }
      }

      controller?.close()
    }
  })()

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ---------------------------------------------------------------------------
// Helper: Get human-readable reason for weak dimension
// ---------------------------------------------------------------------------
function getWeaknessReason(name: string, score: number, max: number): string {
  const reasons: Record<string, string[]> = {
    originality: [
      'Content uses AI-sounding language or template phrases',
      'Structure is formulaic or predictable',
      'Lacks personal voice or unique angle',
    ],
    alignment: [
      'Content drifts from the mission directive',
      'Does not address the core topic',
      'Missing key campaign terminology',
    ],
    accuracy: [
      'Contains incorrect facts about the project',
      'Claims not verifiable from knowledge base',
      'Speculative statements presented as facts',
    ],
    compliance: [
      'Violates campaign rules (em-dash, hashtag, missing mention)',
      'Does not follow formatting requirements',
      'Rule violation detected by programmatic check',
    ],
    engagement: [
      'Hook does not grab attention',
      'Lacks genuine discussion prompts',
      'No emotional impact or specific questions',
      'Too technical for casual readers',
    ],
    technical: [
      'Paragraph lengths too uniform (CV < 0.30)',
      'Sentence variety lacking',
      'Missing contractions, reads unnaturally',
      'Forced fragments or awkward rhythm',
    ],
  }

  const dimReasons = reasons[name] || ['Score below maximum']
  const gapPct = ((max - score) / max) * 100

  if (gapPct > 50) return dimReasons[0]
  if (gapPct > 25) return dimReasons[Math.min(1, dimReasons.length - 1)]
  return dimReasons[Math.min(2, dimReasons.length - 1)]
}
