import ZAI from 'z-ai-web-dev-sdk';
import { fetchCampaign } from './rally-api';
import { readPatterns } from './knowledge-db';
import { cleanContent } from './anti-detection';
import type { GenerateRequest, GenerateResponse } from './types';

export async function generate(request: GenerateRequest): Promise<GenerateResponse> {
  const { campaignAddress, missionId, customBrief } = request;

  const campaign = await fetchCampaign(campaignAddress);

  const slug = campaignAddress.toLowerCase().substring(0, 10);
  const patterns = readPatterns(slug);

  let prompt = `You are a creative social media content creator who specializes in crypto/DeFi content. You write engaging, authentic tweets that feel human and natural.\n\n`;

  prompt += `## Campaign Context\n`;
  prompt += `Project: ${campaign.title}\n`;
  if (campaign.goal) prompt += `Goal: ${campaign.goal}\n`;
  if (campaign.knowledgeBase) prompt += `Key Information:\n${campaign.knowledgeBase.substring(0, 2000)}\n`;
  if (campaign.style) prompt += `Tone: ${campaign.style}\n`;
  if (campaign.rules) prompt += `Rules: ${campaign.rules}\n`;

  if (missionId) {
    const mission = campaign.missions?.find(m => m.id === missionId);
    if (mission) {
      prompt += `\n## Specific Mission\n`;
      prompt += `Title: ${mission.title}\n`;
      prompt += `Description: ${mission.description}\n`;
      prompt += `Requirements: ${mission.rules}\n`;
    }
  }

  if (customBrief) {
    prompt += `\n## Additional Instructions\n${customBrief}\n`;
  }

  if (patterns && patterns.topPhrases.length > 0) {
    prompt += `\n## Content That Performs Well\n`;
    prompt += `Common themes in top submissions: ${patterns.topPhrases.slice(0, 10).map(p => p.phrase).join(', ')}\n`;
  }

  if (patterns && patterns.rejectionReasons.length > 0) {
    prompt += `\n## Things to Avoid\n`;
    prompt += `Common issues in low-scoring submissions: ${patterns.rejectionReasons.slice(0, 5).map(p => p.phrase).join(', ')}\n`;
  }

  if (patterns && patterns.categoryInsights) {
    const contentInsight = patterns.categoryInsights['Content Alignment'];
    if (contentInsight?.highScorePattern) {
      prompt += `\n## What Makes Great Content Here\n${contentInsight.highScorePattern}\n`;
    }
  }

  prompt += `\n## Your Task\nWrite ONE tweet (200-500 characters) for this campaign. Make it feel like a real person wrote it — not corporate, not AI-generated. Be conversational and specific. Use natural language.\n\n`;
  prompt += `IMPORTANT RULES:\n`;
  prompt += `- Do NOT use buzzwords like "revolutionary", "cutting-edge", "game-changing", "seamless", "innovative"\n`;
  prompt += `- Do NOT use template phrases like "In today's world" or "The future is here"\n`;
  prompt += `- Use conversational tone, like tweeting to friends who are into crypto\n`;
  prompt += `- Maximum 2 emojis\n`;
  prompt += `- Be specific about the project, not generic\n`;
  prompt += `- Include relevant links if the campaign requires them\n\n`;
  prompt += `Output ONLY the tweet text. No explanation, no preamble, no quotes around it.`;

  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a creative social media content writer. You write authentic, human-feeling tweets.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.9,
    max_tokens: 500,
  });

  let content = completion.choices[0]?.message?.content?.trim() || '';

  // Clean quotes if AI wrapped in them
  content = content.replace(/^["']|["']$/g, '').trim();

  const result = cleanContent(content);

  return {
    content,
    cleaned: result.clean,
    warnings: result.warnings,
  };
}
