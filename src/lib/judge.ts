import ZAI from 'z-ai-web-dev-sdk';
import { fetchCampaign } from './rally-api';
import type { JudgeRequest, JudgeResponse, JudgeScore } from './types';

const GATE_CATEGORIES = [
  'Content Alignment',
  'Information Accuracy',
  'Campaign Compliance',
  'Originality and Authenticity'
];

const QUALITY_CATEGORIES = [
  'Engagement Potential',
  'Technical Quality',
  'Reply Quality'
];

function calculateGrade(totalScore: number): string {
  if (totalScore >= 16) return 'S';
  if (totalScore >= 13) return 'A';
  if (totalScore >= 9) return 'B';
  return 'C';
}

export async function judge(request: JudgeRequest): Promise<JudgeResponse> {
  const { content, campaignAddress } = request;

  const campaign = await fetchCampaign(campaignAddress);

  let prompt = `You are an expert content judge for a social media campaign platform. You evaluate tweet submissions fairly and critically.\n\n`;

  prompt += `## Campaign Information\n`;
  prompt += `Campaign: ${campaign.title}\n`;
  if (campaign.goal) prompt += `Goal: ${campaign.goal}\n`;
  if (campaign.knowledgeBase) prompt += `Knowledge Base:\n${campaign.knowledgeBase.substring(0, 2000)}\n`;
  if (campaign.rules) prompt += `Rules: ${campaign.rules}\n`;
  if (campaign.style) prompt += `Expected Style: ${campaign.style}\n`;

  if (campaign.missions?.length) {
    prompt += `\n## Missions\n`;
    for (const mission of campaign.missions) {
      if (mission.active) {
        prompt += `- ${mission.title}: ${mission.description}\n  Requirements: ${mission.rules}\n\n`;
      }
    }
  }

  prompt += `## Scoring Rubric\n`;
  prompt += `### Gate Categories (score 0-2 each, 0 = fail):\n`;
  for (const cat of GATE_CATEGORIES) {
    const idx = GATE_CATEGORIES.indexOf(cat);
    const weight = campaign.gateWeights?.[idx] || 1;
    prompt += `- ${cat} (max 2, weight: ${weight})\n`;
  }
  prompt += `\n### Quality Categories (score 0-5 each):\n`;
  for (const cat of QUALITY_CATEGORIES) {
    prompt += `- ${cat} (max 5)\n`;
  }

  prompt += `\n## Content to Judge\n`;
  prompt += `"${content}"\n\n`;

  prompt += `## Instructions\n`;
  prompt += `Score each category honestly. For each category provide:\n`;
  prompt += `1. A score (number only)\n`;
  prompt += `2. A brief analysis explaining WHY you gave that score\n\n`;
  prompt += `After scoring all categories, provide:\n`;
  prompt += `- Total score\n`;
  prompt += `- Grade (S=16+, A=13-15, B=9-12, C=<9)\n`;
  prompt += `- Prediction: Will this get Grade S on the platform? (yes/no/maybe with reason)\n\n`;
  prompt += `Output your response in this EXACT JSON format:\n`;
  prompt += `{"scores":[{"category":"Category Name","score":0,"maxScore":2,"analysis":"explanation"}],"prediction":"yes/no/maybe with brief reason"}\n\n`;
  prompt += `Output ONLY the JSON, no other text.`;

  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are an impartial content judge. You score social media submissions objectively. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  let responseText = completion.choices[0]?.message?.content?.trim() || '';

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Judge returned invalid response: no JSON found');
  }

  let parsed: { scores: JudgeScore[]; prediction: string };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Judge returned invalid JSON');
  }

  const scores = parsed.scores || [];
  let totalScore = 0;
  let maxPossible = 0;

  for (const s of scores) {
    totalScore += s.score;
    maxPossible += s.maxScore;
  }

  const grade = calculateGrade(totalScore);
  const accepted = grade === 'S' || grade === 'A';

  let feedback = '';
  if (!accepted) {
    const weakCategories = scores.filter(s => s.score < s.maxScore * 0.6);
    feedback = `Content rejected (Grade ${grade}). Needs improvement in: `;
    feedback += weakCategories.map(s => `${s.category} (${s.score}/${s.maxScore})`).join(', ');
    feedback += '. ' + weakCategories.map(s => `→ ${s.analysis}`).join(' ');
  } else {
    feedback = `Content accepted (Grade ${grade}). Ready for submission.`;
  }

  return {
    scores,
    totalScore,
    maxScore: maxPossible,
    grade,
    accepted,
    feedback,
    gradeSPrediction: parsed.prediction || 'unknown',
  };
}
