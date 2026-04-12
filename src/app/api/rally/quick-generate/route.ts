import { NextRequest, NextResponse } from 'next/server'
import { getMaster, getKnowledgeVault, getPatternCache, analyzeContent } from '@/lib/rally-data'

async function getSdk() {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  return await ZAI.create()
}

const QUICK_SYSTEM_PROMPT = `You are an elite Rally.fun content creator. Write ONE tweet that scores 18/18.

RULES:
- Mention @RallyOnChain
- No em-dashes (—), no en-dashes (–), no hashtags (#), no markdown
- No AI words: delve, leverage, paradigm, tapestry, landscape, nuance, crucial, pivotal, embark, harness, foster, utilize, elevate, streamline, empower, comprehensive, realm, flywheel, ecosystem, unpack, navigate, pioneering
- No template phrases: key takeaways, let's dive in, nobody is talking about, here's the thing, picture this, at the end of the day, hot take, unpopular opinion, thread alert
- No banned starters: honestly, like, kind of wild, ngl, tbh, tbf, fr fr, lowkey
- 180-220 words, 5-8 paragraphs, paragraph CV > 0.30
- Mixed case, include contractions, include 2-3 genuine questions
- Natural human voice, not corporate`

export async function POST(req: NextRequest) {
  try {
    const { prompt, campaignId, customInstructions } = await req.json()

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json({ error: 'Prompt is required (min 5 chars)' }, { status: 400 })
    }

    const master = getMaster()
    const vault = getKnowledgeVault()
    const patternCache = getPatternCache()

    const campaign = master?.active_campaign
    const mission = campaign?.missions?.[0]

    const context = campaign
      ? `\n\nCAMPAIGN: ${campaign.title}\nMISSION: ${mission?.title || 'N/A'}\nDIRECTIVE: ${mission?.directive || 'N/A'}\nRULES: ${(mission?.rules || []).join('\n')}`
      : ''

    const overused = patternCache?.inherited_patterns_from_prev_campaign?.overused_angles || []
    const avoidStr = overused.length > 0 ? `\n\nANGLES TO AVOID (overused): ${overused.join(', ')}` : ''

    const sdk = await getSdk()

    const completion = await sdk.createChatCompletion({
      messages: [
        { role: 'system', content: QUICK_SYSTEM_PROMPT + context + avoidStr + (customInstructions ? `\n\nCUSTOM: ${customInstructions}` : '') },
        { role: 'user', content: `Write a tweet about: ${prompt}` },
      ],
    })

    const text = completion.choices?.[0]?.message?.content?.trim() || ''
    const analysis = analyzeContent(text)

    return NextResponse.json({
      success: true,
      content: text,
      analysis,
      campaign: campaign?.title || 'N/A',
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
