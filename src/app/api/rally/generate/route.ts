import { NextRequest, NextResponse } from 'next/server'
import { getMaster, getKnowledgeVault, analyzeContent } from '@/lib/rally-data'
import { db } from '@/lib/db'

async function getSdk() {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  return await ZAI.create()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode = 'generate', prompt, count = 3, angle, style, campaignId, campaignAddress } = body

    let campaign: any = null
    let mission: any = null

    // 1. Try DB lookup by campaignId
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
            }
            mission = {
              title: parsedMission.title || 'DB Mission',
              directive: parsedMission.directive || dbCampaign.goal || dbCampaign.description || '',
              reward: parsedMission.reward || dbCampaign.rewardPool || '',
              rules: parsedRules.length > 0 ? parsedRules : (parsedMission.rules || []),
              proposed_angles: parsedAngles.length > 0 ? parsedAngles : (parsedMission.proposed_angles || []),
            }
          }
        }
      } catch (err) {
        console.error('Generate: DB campaign lookup failed, falling back to file:', err)
      }
    }

    // 2. Fallback to file-based campaign
    if (!campaign) {
      const master = getMaster()
      if (!master) {
        return NextResponse.json({ error: 'No rally data found' }, { status: 404 })
      }
      campaign = master.active_campaign
      mission = campaign?.missions?.[0]
      if (!mission) {
        return NextResponse.json({ error: 'No active mission found' }, { status: 404 })
      }
    }

    if (!mission) {
      return NextResponse.json({ error: 'No mission data available for campaign' }, { status: 404 })
    }

    const vault = getKnowledgeVault()

    // Build system prompt from rally knowledge
    const systemPrompt = buildSystemPrompt(campaign, mission, vault)

    if (mode === 'improve' && prompt) {
      // Improve existing content
      const userPrompt = `Improve this tweet for Rally campaign "${campaign.title}". Keep the core message but make it score higher. Fix any compliance issues.

Original tweet:
${prompt}

Rules to follow:
${(mission.rules || []).map((r: string) => `- ${r}`).join('\n')}

Return ONLY the improved tweet text. No explanation.`

      const sdk = await getSdk()
      const completion = await sdk.createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const improvedText = completion.choices?.[0]?.message?.content?.trim() || ''
      const analysis = analyzeContent(improvedText)

      return NextResponse.json({
        content: improvedText,
        analysis,
        mode: 'improve',
      })
    }

    // Generate new content variations
    const variations: Array<{ text: string; analysis: ReturnType<typeof analyzeContent>; angle: string }> = []

    const angles = angle
      ? [angle]
      : mission.proposed_angles?.length > 0
        ? mission.proposed_angles.slice(0, count)
        : ['general analysis', 'personal experience', 'contrarian take']

    const sdk = await getSdk()

    for (let i = 0; i < Math.min(count, angles.length); i++) {
      const angleText = angles[i]
      const styleHint = style || (vault?.cross_campaign?.best_hook_styles?.[0] || 'natural and conversational')

      const userPrompt = `Write ONE tweet for this Rally campaign.

Campaign: ${campaign.title}
Mission: ${mission.directive}
Angle: ${angleText}
Style: ${styleHint}
Knowledge base: ${(campaign.knowledge_base || '').substring(0, 500)}

${i > 0 ? 'IMPORTANT: Make this DIFFERENT from previous variations. Use a completely different hook and structure.' : ''}

Rules (MUST follow ALL):
${(mission.rules || []).map((r: string) => `- ${r}`).join('\n')}

Anti-AI rules:
- No em-dashes (—)
- No hashtags
- Don't start with @mention
- Use contractions (don't, can't, it's, that's)
- Vary paragraph length (short, medium, long mix)
- Write like a real human on Twitter, NOT like an AI
- Use specific numbers, personal voice, questions
- Target: 1300-1700 characters
- Paragraph CV > 0.30 (high variation in paragraph word counts)

Previous best content scored 14.2/18. Target is 18/18.

Return ONLY the tweet text. No explanation, no prefix.`

      const completion = await sdk.createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const text = completion.choices?.[0]?.message?.content?.trim() || ''

      if (text) {
        const analysis = analyzeContent(text)
        variations.push({ text, analysis, angle: angleText })
      }
    }

    return NextResponse.json({
      variations,
      campaign: {
        title: campaign.title,
        mission: mission.directive,
        rules: mission.rules || [],
        reward: mission.reward,
        deadline: campaign.end_date,
        contract: campaign.contract_address,
        campaignUrl: campaign.campaign_url || '',
        style: campaign.style || '',
        goal: campaign.goal || '',
        knowledgeBase: campaign.knowledge_base || '',
      },
      mode: 'generate',
    })
  } catch (error) {
    console.error('Error generating content:', error)
    return NextResponse.json(
      { error: 'Failed to generate content', details: String(error) },
      { status: 500 }
    )
  }
}

function buildSystemPrompt(campaign: any, mission: any, vault: any): string {
  const master = getMaster()
  const learning = master?.learning || {}

  return `You are an elite Rally.fun content creator. Your ONLY goal is to write tweets that score 18/18 on ALL 6 dimensions.

SCORING DIMENSIONS (max 18 total):
- Originality (0-2): Must be unique, not generic. No template phrases.
- Alignment (0-2): Must directly address the mission directive.
- Accuracy (0-2): Must use correct facts about Rally/GenLayer/Base.
- Compliance (0-2): Must follow ALL campaign rules exactly.
- Engagement Potential (0-5): Hook must grab attention. Include questions, specific numbers, personal voice.
- Technical Quality (0-5): Proper structure, paragraph variation, readable, no errors.

KEY PATTERNS FROM ${learning.submission_count_analyzed || 200}+ ANALYZED SUBMISSIONS:
${(learning.patterns_discovered || []).map((p: string) => `- ${p}`).join('\n')}

COMMON FAILURES TO AVOID:
${(learning.common_failures || []).map((f: string) => `- ${f}`).join('\n')}

TOP SCORING HOOKS:
${(learning.top_hooks || []).map((h: string) => `- "${h}"`).join('\n')}

OVERUSED ANGLES (DO NOT USE):
${(learning.overused_angles || []).map((a: string) => `- "${a}"`).join('\n')}

UNIQUE GAP ANGLES (USE THESE):
${(learning.unique_gaps || []).map((g: string) => `- "${g}"`).join('\n')}

STYLE: ${campaign.style || 'Visionary and confident'}
KNOWLEDGE: ${(campaign.knowledge_base || '').substring(0, 400)}

CRITICAL: Write exactly like a real person on Twitter. NOT like ChatGPT. Use imperfect sentences, contractions, questions, specific details, and varied paragraph lengths.`
}
