/**
 * Rally Brain Generate Runner v2.0
 * Runs the full generate loop: 3 variations × 5 loops → best ≥16 → output
 * Uses z-ai-web-dev-sdk for AI generation, built-in rules for evaluation
 */

const ZAI = require('z-ai-web-dev-sdk').default;

// ============ CAMPAIGN CONTEXT ============
const CAMPAIGN = {
  title: "MarbMarket — The First veDEX on MegaETH is Launching",
  contractAddress: "0x39a11fa3e86eA8AC53772F26AA36b07506fa7dDB",
  campaignId: "campaign-1775000340083-pyw7t815z",
  reward: "2000 USDC",
  creator: "Marb Market (@marb_market)",
  xUsername: "marbz564355"
};

const MISSION_0 = {
  id: "mission-0",
  title: "Explain the veDEX Model & Why MarbMarket Matters",
  description: "Create a post or short thread educating your audience about what a veDEX is and why MarbMarket's fair launch on MegaETH is a big deal for DeFi.",
  rules: [
    "Must explain what a veDEX is",
    "Must mention MarbMarket's upcoming launch",
    "Include either x.com/Marb_market or t.me/marbmarket",
    "Mention at least one key feature: vote-escrow, bribes, LP farming, or fair launch",
    "Content must be original and written in your own words",
    "Format: single post or short thread of 2-4 posts max",
    "Bonus: explain MARB flywheel or ve(3,3) model creatively"
  ]
};

const KNOWLEDGE_BASE = `
## What is MarbMarket?
MarbMarket is a veDEX (Vote-Escrowed DEX) launching on MegaETH in Q2. First of its kind on MegaETH. No presale, no VC backing — fully fair launch. Inspired by Solidly/Aerodrome.

## veDEX Mechanics:
- Users lock MARB tokens → gain veTokens (voting power)
- Longer lock = more influence + more rewards
- veHolders vote weekly on which LP pools get MARB emissions
- Projects can offer bribes to attract votes → decentralized incentive

## MARB Flywheel:
MARB Lockers direct emissions → LPs get rewards → Protocols pay bribes for votes → Incentives flow back to MARB Lockers

## Key Talking Points:
- Community-driven voting model
- First veDEX on MegaETH
- ve(3,3) model
- Fair launch: no presale, no VCs
- LP farming, voting, bribing at launch
`;

// ============ V3 LESSONS (built-in from Rally scoring) ============
const V3_LESSONS = {
  losses: {
    accuracy_exaggeration: "NEVER use absolute/exaggerated language ('zero cost', 'everyone', 'nobody') — use precise, verifiable claims",
    accuracy_vague: "NEVER use vague phrases ('figured it out') — be specific about what/how",
    compliance_mysterious: "NEVER use mysterious/thread openings — be direct and clear",
    compliance_whitespace: "NO extra whitespace before mentions, no double spaces, no trailing spaces",
    engagement_no_cta: "ALWAYS include a CTA — question, invitation, or direct ask"
  },
  rules: [
    "Every claim must be factually verifiable",
    "Use concrete numbers and specific mechanisms, not vague references",
    "Opening line must be directly relevant to the topic, not clickbait",
    "@RallyOnChain mention: natural, contextual, with concrete mechanism",
    "Include a CTA for engagement points",
    "No extra spaces, no formatting issues",
    "Stay tightly aligned with campaign theme"
  ]
};

// ============ CAMPAIGN-SPECIFIC RULES ============
const CAMPAIGN_RULES = [
  "Be authentic, no spam, respectful",
  "Use your own words, educational and specific",
  "Avoid price predictions, financial promises, generic hype",
  "Avoid copied wording or low effort submissions",
  "Style: Energetic and community-focused",
  "Speak to DeFi-native users who understand yield farming, liquidity, and governance"
];

// ============ MISSION-SPECIFIC REQUIREMENTS ============
const MISSION_REQUIREMENTS = [
  "Explain what a veDEX is (MUST)",
  "Mention MarbMarket's upcoming launch (MUST)",
  "Include x.com/Marb_market or t.me/marbmarket (MUST)",
  "Mention vote-escrow, bribes, LP farming, or fair launch (MUST — at least one)",
  "Original content in own words (MUST)",
  "Single post or 2-4 post thread",
  "BONUS: explain MARB flywheel or ve(3,3) creatively"
];

// ============ EVALUATION ENGINE ============
function evaluateContent(content) {
  const scores = { originality: 0, alignment: 0, accuracy: 0, compliance: 0, engagement: 0, technical: 0 };
  const maxScores = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5 };
  const feedback = [];

  // ORIGINALITY (max 2)
  // Check for unique angle, not generic crypto talk
  const uniqueMarkers = ['ve(3,3)', 'veDEX', 'vote-escrow', 'MARB', 'MegaETH', 'flywheel', 'bribes'];
  const genericMarkers = ['crypto is the future', 'DeFi is changing', 'this is huge', 'massive opportunity'];
  let origScore = 1.2;
  let uniqueCount = 0;
  for (const m of uniqueMarkers) { if (content.toLowerCase().includes(m.toLowerCase())) uniqueCount++; }
  if (uniqueCount >= 3) origScore += 0.6;
  else if (uniqueCount >= 2) origScore += 0.4;
  else if (uniqueCount >= 1) origScore += 0.2;
  for (const m of genericMarkers) { if (content.toLowerCase().includes(m.toLowerCase())) origScore -= 0.2; }
  scores.originality = Math.max(0, Math.min(2, origScore));

  // ALIGNMENT (max 2)
  let alignScore = 0;
  if (content.toLowerCase().includes('vedex') || content.toLowerCase().includes('ve dex')) alignScore += 0.5;
  if (content.toLowerCase().includes('marbmarket') || content.toLowerCase().includes('marb market')) alignScore += 0.5;
  if (content.toLowerCase().includes('launch')) alignScore += 0.3;
  if (content.toLowerCase().includes('megaeth')) alignScore += 0.3;
  if (content.toLowerCase().includes('vote') || content.toLowerCase().includes('escrow')) alignScore += 0.2;
  if (content.toLowerCase().includes('fair launch')) alignScore += 0.2;
  scores.alignment = Math.max(0, Math.min(2, alignScore));

  // ACCURACY (max 2)
  let accScore = 1.8;
  const absWords = ['zero cost', 'everyone', 'nobody', 'always', 'never', 'impossible', 'guaranteed', '100%'];
  for (const w of absWords) { if (content.toLowerCase().includes(w)) { accScore -= 0.5; feedback.push(`Exaggeration: "${w}"`); } }
  const vaguePhrases = ['figured it out', 'something like that', 'kind of works', 'basically'];
  for (const p of vaguePhrases) { if (content.toLowerCase().includes(p)) { accScore -= 0.3; feedback.push(`Vague: "${p}"`); } }
  // Check if veDEX explanation is technically accurate
  if (content.toLowerCase().includes('lock') && (content.toLowerCase().includes('vote') || content.toLowerCase().includes('governance'))) accScore += 0.2;
  scores.accuracy = Math.max(0, Math.min(2, accScore));

  // COMPLIANCE (max 2)
  let compScore = 1.8;
  // Check required mission elements
  const hasMarbMarket = content.toLowerCase().includes('marbmarket') || content.toLowerCase().includes('marb market');
  const hasVedex = content.toLowerCase().includes('vedex') || content.toLowerCase().includes('ve dex');
  const hasLink = content.includes('x.com/Marb_market') || content.includes('t.me/marbmarket');
  const hasFeature = ['vote-escrow', 'bribes', 'lp farming', 'fair launch', 've(3,3)', 'liquidity pool'].some(f => content.toLowerCase().includes(f));

  if (!hasMarbMarket) { compScore -= 0.5; feedback.push('Missing: MarbMarket mention'); }
  if (!hasVedex) { compScore -= 0.3; feedback.push('Missing: veDEX explanation'); }
  if (!hasLink) { compScore -= 0.3; feedback.push('Missing: x.com/Marb_market or t.me/marbmarket'); }
  if (!hasFeature) { compScore -= 0.3; feedback.push('Missing: key feature (vote-escrow/bribes/LP/fair launch)'); }

  // Check formatting issues
  if (/  /.test(content)) { compScore -= 0.3; feedback.push('Double spaces detected'); }
  if (content.includes('Even this') || content.includes('What if I told')) { compScore -= 0.3; feedback.push('Mysterious/thread opening detected'); }
  scores.compliance = Math.max(0, Math.min(2, compScore));

  // ENGAGEMENT (max 5)
  let engScore = 3.0;
  const hasCTA = /\?/.test(content) || /what about you/i.test(content) || /what do you think/i.test(content)
    || /share your/i.test(content) || /thoughts\?/i.test(content) || /agree\?/i.test(content)
    || /have you/i.test(content) || /try it/i.test(content);
  const hasHook = content.split('\n')[0].trim().length < 80 && content.split('\n')[0].trim().length > 10;
  const isPunchy = content.split('\n').some(line => line.trim().length > 0 && line.trim().length < 40);
  const hasRhythm = (content.match(/\./g) || []).length >= 3;

  if (hasCTA) engScore += 0.8; else { engScore -= 0.5; feedback.push('Missing: CTA (question/invitation)'); }
  if (hasHook) engScore += 0.4;
  if (isPunchy) engScore += 0.3;
  if (hasRhythm) engScore += 0.3;
  // Bonus for emotional trigger
  if (content.toLowerCase().includes('early') || content.toLowerCase().includes('first') || content.toLowerCase().includes('opportunity')) engScore += 0.2;
  scores.engagement = Math.max(0, Math.min(5, engScore));

  // TECHNICAL (max 5)
  let techScore = 4.5;
  if (!/  /.test(content) && content.trim() === content) techScore += 0.3;
  if (/  /.test(content)) { techScore -= 0.5; feedback.push('Extra whitespace'); }
  if (content.length > 50 && content.length < 2000) techScore += 0.2;
  // Check line structure
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length >= 3 && lines.length <= 15) techScore += 0.2;
  scores.technical = Math.max(0, Math.min(5, techScore));

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const grade = total >= 17 ? 'A+' : total >= 16 ? 'A' : total >= 14 ? 'B+' : total >= 12 ? 'B' : total >= 10 ? 'C' : 'D';

  return { scores, maxScores, total: Math.round(total * 10) / 10, grade, feedback };
}

// ============ GENERATION ============
function buildBasePrompt(variationHint) {
  return `You are a Rally.fun content creator. Your philosophy: "Rally minta 1, kita beri 2" — exceed quality expectations.

CAMPAIGN: "${CAMPAIGN.title}"
Reward: ${CAMPAIGN.reward}
Creator: ${CAMPAIGN.creator}

MISSION 0: "${MISSION_0.title}"
${MISSION_0.description}

MISSION RULES:
${MISSION_0.rules.map(r => '- ' + r).join('\n')}

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}

CAMPAIGN RULES:
${CAMPAIGN_RULES.map(r => '- ' + r).join('\n')}

MANDATORY QUALITY RULES (from Rally scoring experience):
${V3_LESSONS.rules.map(r => '- ' + r).join('\n')}

PAST MISTAKES TO AVOID:
${Object.values(V3_LESSONS.losses).map(l => '- ' + l).join('\n')}

CONTENT REQUIREMENTS:
1. Open directly — no mysterious/thread openings, no clickbait
2. Explain veDEX model in your own words with specific mechanisms
3. Mention MarbMarket's launch on MegaETH naturally
4. Include x.com/Marb_market link
5. Mention at least one feature: vote-escrow, bribes, LP farming, or fair launch
6. Include a clear CTA (question, invitation, direct ask)
7. No extra spaces, no formatting issues
8. Stay tightly aligned with veDEX education theme
9. Every claim must be verifiable — no "zero cost", "everyone", "nobody"
10. Maximum impact per word — punchy sentences, strong rhythm
11. BONUS: explain MARB flywheel or ve(3,3) model

${variationHint}

Write a single tweet/X post (or short thread of 2-3 tweets) that would score 16+/18 on Rally.
Output ONLY the tweet content. No explanations, no meta-commentary, no "Here's your post".`;
}

function buildImprovementPrompt(basePrompt, allVariations, bestScore) {
  const weakCategories = {};
  for (const v of allVariations) {
    for (const [cat, score] of Object.entries(v.evaluation.scores)) {
      if (!weakCategories[cat]) weakCategories[cat] = [];
      weakCategories[cat].push(score);
    }
  }

  const improvements = [];
  const maxScores = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5 };
  for (const [cat, scores] of Object.entries(weakCategories)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const pct = avg / maxScores[cat];
    if (pct < 0.7) {
      improvements.push(`- ${cat.toUpperCase()}: avg ${avg.toFixed(1)}/${maxScores[cat]} (${(pct*100).toFixed(0)}%) — needs significant improvement`);
    } else if (pct < 0.85) {
      improvements.push(`- ${cat.toUpperCase()}: avg ${avg.toFixed(1)}/${maxScores[cat]} — could be better`);
    }
  }

  // Collect feedback from failed ones
  const allFeedback = [...new Set(allVariations.flatMap(v => v.evaluation.feedback))];
  const feedbackStr = allFeedback.length > 0 ? '\nSpecific issues from previous attempts:\n' + allFeedback.map(f => '  ⚠ ' + f).join('\n') : '';

  return basePrompt + `

=== PREVIOUS ATTEMPTS ANALYSIS ===
Current best score: ${bestScore}/18 — below 16/18 threshold
Weak areas to fix:
${improvements.join('\n') || '- Overall quality needs to be higher'}
${feedbackStr}

CRITICAL: Fix ALL the above issues in your next attempt. Do NOT repeat the same mistakes.
Remember: "Rally minta 1, kita beri 2" — every category must exceed Rally's expectations.`;
}

async function generateVariation(zai, prompt, temp) {
  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert Rally.fun content creator. Output ONLY the tweet/thread content. No meta-commentary, no explanations, no labels like "Tweet 1:".' },
        { role: 'user', content: prompt }
      ],
      temperature: temp,
      max_tokens: 800
    });
    let content = completion.choices?.[0]?.message?.content?.trim() || '';
    // Clean up
    content = content.replace(/^["'`]+|["'`]+$/g, '');
    // Remove leading meta-text
    for (const marker of ["Here's", "Here is", "Sure,", "Here's a", "Here is a", "Here's your", "Here is your", "Okay,", "Alright,"]) {
      if (content.startsWith(marker)) content = content.slice(marker.length).trim();
    }
    // Remove any "Tweet 1:", "Tweet 2:" labels
    content = content.replace(/Tweet \d+[:\s]/gi, '').replace(/Post \d+[:\s]/gi, '').trim();
    return content;
  } catch (e) {
    console.error(`Generation failed: ${e.message}`);
    return null;
  }
}

async function generateQA(zai, content) {
  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Generate exactly 3 short natural engagement comments for this tweet. Each 1-2 sentences. One per line. No numbering, no labels.' },
        { role: 'user', content: `Based on this tweet, write 3 natural reply comments that would appear on X/Twitter:\n\n${content}\n\nCampaign: ${CAMPAIGN.title}` }
      ],
      temperature: 0.9,
      max_tokens: 300
    });
    const text = completion.choices?.[0]?.message?.content?.trim() || '';
    return text.split('\n').map(l => l.replace(/^\d+[\.\-\)]\s*/, '').trim()).filter(l => l.length > 0).slice(0, 3);
  } catch (e) {
    return [
      'Great thread on veDEX mechanics. The vote-escrow model is underrated.',
      'How does MarbMarket compare to Aerodrome in terms of emissions?',
      'Fair launch with no VCs is the way. Getting in early on this one.'
    ];
  }
}

// ============ MAIN LOOP ============
async function main() {
  console.log('===========================================');
  console.log('RALLY BRAIN v2.0 — GENERATE CYCLE');
  console.log('===========================================');
  console.log(`Campaign: ${CAMPAIGN.title}`);
  console.log(`Mission: ${MISSION_0.title}`);
  console.log(`Target: ≥16/18 (Level 2 Quality)`);
  console.log('===========================================\n');

  const zai = await ZAI.create();
  const allVariations = [];
  let bestEver = { content: '', score: 0, grade: 'D', evaluation: {} };
  let basePrompt = buildBasePrompt('Approach angle: Educational explainer that breaks down veDEX mechanics clearly.');
  let loopsUsed = 0;

  const VARIATIONS_PER_LOOP = 3;
  const MAX_LOOPS = 5;
  const THRESHOLD = 16.0;

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    loopsUsed = loop;
    console.log(`\n=== LOOP ${loop}/${MAX_LOOPS} ===`);

    const angles = loop === 1
      ? ['Educational explainer that breaks down veDEX mechanics for DeFi users.', 'Community-focused take on why fair launch matters and how ve(3,3) works.', 'Short punchy thread highlighting MarbMarket as first mover on MegaETH.']
      : loop === 2
      ? ['Focus on the MARB flywheel and how incentives compound.', 'Compare veDEX model to traditional DEX — why vote-escrow wins.', 'Early opportunity angle: what getting in on a fair launch veDEX means.']
      : loop === 3
      ? ['Deep dive into how bribes work in ve(3,3) and why it matters.', 'Thread format: break down each feature of MarbMarket step by step.', 'Contrarian take: why most DEX models fail and ve(3,3) is different.']
      : loop === 4
      ? ['Simplify veDEX to basics anyone can understand — no jargon overload.', 'Focus on MegaETH as the chain and MarbMarket as the killer app.', 'Emotional angle: why community ownership beats VC-backed launches.']
      : ['Most creative angle possible — teach veDEX like telling a story.', 'Technical breakdown for experienced DeFi users — get into emissions math.', 'Combine fair launch + governance + yield in one compelling narrative.'];

    for (let i = 0; i < VARIATIONS_PER_LOOP; i++) {
      const variationPrompt = buildBasePrompt(angles[i]);
      const temp = 0.75 + (loop - 1) * 0.05 + i * 0.03;

      console.log(`  Generating variation ${i + 1} (temp=${temp.toFixed(2)})...`);
      const content = await generateVariation(zai, variationPrompt, temp);

      if (!content || content.length < 30) {
        console.log(`  Variation ${i + 1}: FAILED (empty or too short)`);
        continue;
      }

      const evaluation = evaluateContent(content);
      console.log(`  Variation ${i + 1}: ${evaluation.total}/18 (${evaluation.grade})`);
      if (evaluation.feedback.length > 0) {
        console.log(`    Feedback: ${evaluation.feedback.join(', ')}`);
      }

      const variation = {
        content,
        evaluation,
        loop,
        variation: i + 1,
        temperature: temp
      };
      allVariations.push(variation);

      if (evaluation.total > bestEver.score) {
        bestEver = {
          content,
          score: evaluation.total,
          grade: evaluation.grade,
          evaluation,
          loop,
          variation: i + 1
        };
        console.log(`  ★ NEW BEST: ${evaluation.total}/18 (${evaluation.grade})`);
      }
    }

    console.log(`\n  Loop ${loop} best: ${bestEver.score}/18`);

    if (bestEver.score >= THRESHOLD) {
      console.log(`\n  ✅ THRESHOLD MET! Best: ${bestEver.score}/18 (${bestEver.grade})`);
      break;
    } else {
      console.log(`  ⏳ Below threshold ${THRESHOLD}. Improving prompt...`);
      basePrompt = buildImprovementPrompt(basePrompt, allVariations, bestEver.score);
    }
  }

  // Generate Q&A for best content
  console.log('\n=== GENERATING Q&A COMMENTS ===');
  const qaComments = await generateQA(zai, bestEver.content);
  console.log(`Generated ${qaComments.length} engagement comments`);

  // ============ OUTPUT ============
  const output = {
    campaign: CAMPAIGN.title,
    mission: MISSION_0.title,
    timestamp: new Date().toISOString(),
    best_content: bestEver.content,
    score: bestEver.score,
    grade: bestEver.grade,
    predictions: bestEver.evaluation.scores,
    total_variations: allVariations.length,
    loops_used: loopsUsed,
    qa_comments: qaComments,
    all_scores: allVariations.map(v => ({
      loop: v.loop,
      variation: v.variation,
      score: v.evaluation.total,
      grade: v.evaluation.grade
    }))
  };

  console.log('\n===========================================');
  console.log('FINAL RESULT');
  console.log('===========================================');
  console.log(`Score: ${bestEver.score}/18 (${bestEver.grade})`);
  console.log(`Variations tested: ${allVariations.length}`);
  console.log(`Loops used: ${loopsUsed}`);
  console.log('\n--- BEST CONTENT ---');
  console.log(bestEver.content);
  console.log('\n--- Q&A COMMENTS ---');
  qaComments.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  console.log('\n--- SCORE BREAKDOWN ---');
  for (const [cat, score] of Object.entries(bestEver.evaluation.scores)) {
    const max = bestEver.evaluation.maxScores[cat];
    console.log(`  ${cat}: ${score}/${max}`);
  }

  // Save output
  const fs = require('fs');
  const path = require('path');
  const outputDir = '/home/z/my-project/download/rally-brain/campaign_data/0x39a11fa3e86eA8AC53772F26AA36b07506fa7dDB_output';

  fs.writeFileSync(path.join(outputDir, 'best_content.txt'), bestEver.content);
  fs.writeFileSync(path.join(outputDir, 'prediction.json'), JSON.stringify({
    score: bestEver.score,
    grade: bestEver.grade,
    predictions: bestEver.evaluation.scores,
    total_variations: allVariations.length,
    loops_used: loopsUsed,
    timestamp: output.timestamp,
    campaign: CAMPAIGN.title,
    mission: MISSION_0.title
  }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'qa.json'), JSON.stringify({
    comments: qaComments,
    content: bestEver.content,
    timestamp: output.timestamp
  }, null, 2));

  // Save campaign data
  fs.writeFileSync(path.join(outputDir, 'full_output.json'), JSON.stringify(output, null, 2));

  console.log(`\n📁 Output saved to: ${outputDir}/`);

  return output;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
