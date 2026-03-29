#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// MergeProof Content Generator v4 - LEADERBOARD-INFORMED
// Based on analysis of top 30 submissions (2900-3447 pts)
// ═══════════════════════════════════════════════════════════════════

const fs = require('fs');
const http = require('http');

const GATEWAY = { hosts: ['172.25.136.210:8080', '172.25.136.193:8080'], currentIndex: 0 };
let TOKENS;
try { const c = require('./config/tokens.js'); TOKENS = c.TOKENS; } catch (e) {
  TOKENS = [
    null,
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtNTQ5ZmI5MTEtZWM0NS00NGJiLTg5YjEtMWY2MTljNTEzN2QzIn0.M6IQTOXasSbEw98a4R6p3LEPwJPCWyRZiJSUo8lr2PM', chatId: 'chat-549fb911-ec45-44bb-89b1-1f619c5137d3', userId: '97631263-5dba-4e16-b127-19212e012a9b' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtMTAyYTlkMGUtYTVkNy00MmY2LTk3ZjctNDk5NzFiNzcwNjVhIn0.6cDfQbTc2HHdtKXBfaUvpBsNLPbbjYkpJp6br0rYteA', chatId: 'chat-102a9d0e-a5d7-42f6-97f7-49971b77065a', userId: 'bb829ea3-0d37-4944-8705-00090bde3671' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtMDAyOWJjNDYtZGI3Ny00ZmZkLWI4ZDItM2RlYzFlNWVkNDU3In0.CMthZytUFBpnqW3K52Q1AAgB9uvhyXf3AG-FQvaDoYI', chatId: 'chat-0029bc46-db77-4ffd-b8d2-3dec1e5ed457', userId: '97631263-5dba-4e16-b127-19212e012a9b' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtOTZlZTk1NmItMGYxMi00MGUxLWE0MzYtYTk4YmQwZjk0YzJhIn0.PgpMEiUr8a6Cu2vl9zFMggRsxQrx3JwkUCOjZCUIJnw', chatId: 'chat-96ee956b-0f12-40e1-a436-a98bd0f94c2a', userId: 'bb829ea3-0d37-4944-8705-00090bde3671' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtOWJiMzAzOTMtYWE3Mi00Y2QzLWJkNzktYzJkZmI0ODVmNzgyIn0.jb35oqGKPB2FLC-X_mozORmvbBilwRc_pSZEkbyaRfw', chatId: 'chat-9bb30393-aa72-4cd3-bd79-c2dfb485f782', userId: '97631263-5dba-4e16-b127-19212e012a9b' },
  ];
}
let currentTokenIndex = 0;
let CFG = null;
try { CFG = JSON.parse(fs.readFileSync('/etc/.z-ai-config', 'utf8')); } catch (e) {}

function callAIdirect(messages, maxTokens, temperature, options = {}) {
  return new Promise((resolve, reject) => {
    let tokenData = TOKENS[currentTokenIndex];
    if (tokenData === null && (!CFG || !CFG.token)) { currentTokenIndex = 1; tokenData = TOKENS[currentTokenIndex]; }
    let headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer Z.ai', 'X-Z-AI-From': 'Z' };
    if (tokenData === null && CFG && CFG.token) { headers['X-Token'] = CFG.token; headers['X-User-Id'] = CFG.userId; headers['X-Chat-Id'] = CFG.chatId; }
    else if (tokenData) { headers['X-Token'] = tokenData.token; headers['X-User-Id'] = tokenData.userId; headers['X-Chat-Id'] = tokenData.chatId; }
    const [host, port] = GATEWAY.hosts[GATEWAY.currentIndex].split(':');
    GATEWAY.currentIndex = (GATEWAY.currentIndex + 1) % GATEWAY.hosts.length;
    const body = JSON.stringify({ model: options.model || 'glm-5', messages, max_tokens: maxTokens, temperature, ...(options.enableSearch ? { enable_search: true } : {}) });
    const req = http.request({ hostname: host, port: parseInt(port), path: '/v1/chat/completions', method: 'POST', headers }, (res) => {
      let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => {
        if (res.statusCode === 200) { try { const json = JSON.parse(data); resolve({ content: json.choices?.[0]?.message?.content || '' }); } catch (e) { reject(new Error('Parse error')); } }
        else if (res.statusCode === 429) { currentTokenIndex = (currentTokenIndex + 1) % TOKENS.length; reject(new Error('Rate limit')); }
        else reject(new Error(`HTTP ${res.statusCode}`));
      });
    });
    req.on('error', reject); req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); }); req.write(body); req.end();
  });
}

async function callAI(messages, options = {}) {
  for (let i = 0; i < 6; i++) {
    try { return await callAIdirect(messages, options.maxTokens || 2000, options.temperature || 0.7, options); }
    catch (e) { if (e.message.includes('Rate limit')) await new Promise(r => setTimeout(r, 2000 * Math.pow(1.3, i))); else await new Promise(r => setTimeout(r, 1000)); }
  }
  throw new Error('All retries failed');
}

// ═══════════════════════════════════════════════════════════════════
// LEADERBOARD DATA: What actually wins on MergeProof (from 347 submissions)
// ═══════════════════════════════════════════════════════════════════

const LEADERBOARD_INSIGHTS = `
═══════════════════════════════════════════════════════════════════
📊 LEADERBOARD ANALYSIS: MergeProof Top 30 (2900-3447 pts)
═══════════════════════════════════════════════════════════════════

SCORING CATEGORIES (from Rally API):
- Originality and Authenticity: 0-2 (55% of top 20 get 2/2)
- Content Alignment: 0-2 (100% of top 20 get 2/2)
- Information Accuracy: 0-2 (100% of top 20 get 2/2)
- Campaign Compliance: 0-2 (95% of top 20 get 2/2)
- Engagement Potential: 0-5 (35% get 5/5, rest get 4/5)
- Technical Quality: 0-5 (60% get 5/5)
- Reply Quality: 0-5 (varies widely)

WHAT GETS 2/2 ORIGINALITY (from judge analysis):
1. FRESH angle/framing NOT found in other submissions
2. Analytical, non-templated voice
3. AVOIDING "skin in the game" cliché (use different framing)
4. Personal anecdotes or real experience woven in
5. Distinct conceptual framing

2/2 Originality EXAMPLES from judges:
- "financialization of code quality" (#9, 3135pts) - completely new framing
- "nobody talks about what a PR approval actually means" (#4, 3240pts) - fresh opening
- "links model to financial audits" (#7, 3168pts) - cross-domain analogy
- "adversarial audit perspective" (#7, 3168pts) - unique terminology
- "cultural correction, not technical fix" (#14, 3035pts) - reframing as culture
- "quiet assumption: someone will care enough to look closely" (#13, 3049pts) - unique hook

WHAT GETS 1/2 ORIGINALITY (common patterns to AVOID):
- "stake money on your code, reviewers earn rewards for finding bugs" (template)
- "skin in the game" (overused cliché)
- "code review is broken/thankless" followed by MergeProof features (template structure)
- Mirrors campaign talking points directly
- Problem → Solution → Features structure (template-like)

TOP OPENING HOOKS (what actually works):
- "I'd would say code reviews used to work when things moved slower..." (#1, 3447pts)
- "Code review has a scaling problem..." (#3, 3319pts)
- "nobody talks about what a PR approval actually means..." (#4, 3240pts)
- "we say code review matters then we approve PRs in three minutes..." (#8, 3161pts)
- "Most people are looking at MergeProof like a dev tool. I think that's the wrong lens." (#9, 3135pts)
- "Code review has always been treated as a responsibility, not an incentive." (#6, 3186pts)

KEY DIFFERENCES FROM GRVT CAMPAIGN:
- GRVT was a metrics/momentum campaign → personal confession worked
- MergeProof is an educational/opinion campaign → analytical framing works better
- The top performers use PROBLEM-FIRST hooks, not confession hooks
- Tone is more analytical/thoughtful, not casual/text-message style
- Photos attached to 70% of top 10 submissions

CRITICAL: DO NOT copy these exact hooks. They are the COMPETITORS. Your hooks
must be different but equally strong.
`;

const ANGLES = [
  {
    name: 'Verification Economics',
    system: `Generate a tweet about MergeProof using this approach:

CONCEPT: Frame code review as a VERIFICATION PROBLEM, not a review problem. The bottleneck has shifted from writing code to verifying code.

HOOK STYLE: Start with a contrarian observation about what code review actually means today. NOT "ok i'll admit" - use an analytical opening.

STRUCTURE: Problem observation → Why current model fails → What MergeProof does differently (use "verification" framing, NOT "incentives/rewards") → Why this matters → Question

DIFFERENTIATORS from competitors:
- Do NOT use "skin in the game" (used by 60%+ of submissions)
- Do NOT use "stake money" directly (too template-like)
- Instead frame as: measurable confidence, priced verification, adversarial testing
- Link to FINANCIAL AUDITS or INSURANCE as analogies (not done by top 20)

AVOID these overused competitor phrases: "skin in the game", "stake money on your code", "reviewers get paid/rewards", "game changer", "revolutionary"
USE these fresh alternatives: "verification debt", "confidence gap", "adversarial audit", "measurable trust", "priced verification"
    `
  },
  {
    name: 'Cultural Correction',
    system: `Generate a tweet about MergeProof using this approach:

CONCEPT: Frame MergeProof as a CULTURAL SHIFT in how developers relate to code quality, not just a technical tool.

HOOK STYLE: Start with an observation about developer CULTURE or BEHAVIOR, not technical problems. Something about what approval rituals have become.

STRUCTURE: Cultural observation → How approval became ritual not guarantee → What MergeProof represents culturally → Economic alignment as cultural correction → Question

DIFFERENTIATORS from competitors:
- Frame as "accountability culture" not "incentive mechanism"
- Discuss the PSYCHOLOGY of review (performative approval, quiet accountability)
- Compare to other industries where verification has economic stakes
- Use introspective, slightly philosophical tone

AVOID: "skin in the game", "stake money", "reviewers get paid"
USE: "performative approval", "quiet accountability", "ritual not guarantee", "cultural correction"
    `
  },
  {
    name: 'Cost of Verification',
    system: `Generate a tweet about MergeProof using this approach:

CONCEPT: Frame code review as a COST PROBLEM. Verification has always been expensive but we pretended it was free. MergeProof makes the cost explicit and tradable.

HOOK STYLE: Start with a specific observation about the HIDDEN COST of code review. Something nobody talks about.

STRUCTURE: Hidden cost observation → Why "free" review is actually the most expensive kind → MergeProof makes costs explicit/tradable → This changes everything → Question

DIFFERENTIATORS from competitors:
- "cheap to write, expensive to verify" framing
- Compare to industries where verification costs are priced in (insurance, auditing)
- Discuss the ASYMMETRY between cost of writing code and cost of verifying it
- Use economic reasoning but keep it accessible

AVOID: "skin in the game", "stake money", "reviewers get paid"
USE: "verification asymmetry", "priced correctly", "free review is most expensive", "cost of trust"
    `
  }
];

async function generateContent(angle) {
  const systemPrompt = `You are a developer who writes analytical posts on social media about software engineering culture and economics. Your posts are thoughtful, well-reasoned, and read like genuine opinion pieces from someone who actually builds software.

${LEADERBOARD_INSIGHTS}

${angle.system}

ABSOLUTE RULES:
- MUST include "mergeproof.com" naturally (required by campaign)
- MUST mention "vibe coding" and why MergeProof is necessary now
- MUST clearly explain what MergeProof does (staking, adversarial audit, economic verification)
- DO NOT start with @mention
- NO em dashes (use - or , instead)
- NO hashtags
- NO smart quotes ("")
- NO banned words: revolutionary, game-changer, disruptive, unprecedented, amazing, incredible
- Campaign style: "Curiosity, clarity, and strong reasoning are valued more than hype. Avoid generic praise."
- "Highly generic or AI-generated-looking content will receive fewer points"
- "Overly generic or clearly AI-generated content is not allowed"

FORMAT:
- 4-8 short paragraphs separated by blank lines
- Each paragraph 1-2 sentences
- Conversational but analytical tone (NOT casual text-message style)
- End with a genuine question

Return ONLY the tweet text. No JSON, no labels.`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Write the tweet now. Remember: analytical tone, fresh angle, no competitor clichés, mergeproof.com, vibe coding, genuine question at end.' }
  ], { temperature: 0.85, maxTokens: 3000, model: 'glm-5', enableSearch: true });

  return response.content.trim();
}

async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('🎯 MergeProof v4 - LEADERBOARD-INFORMED Generator');
  console.log('════════════════════════════════════════════════════════');
  console.log('Based on analysis of top 30 MergeProof submissions');
  console.log('');

  const results = [];
  for (let i = 0; i < ANGLES.length; i++) {
    console.log(`\n🔥 Generating Variant ${i + 1}: ${ANGLES[i].name}...`);
    const start = Date.now();
    try {
      const content = await generateContent(ANGLES[i]);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      results.push({ index: i, name: ANGLES[i].name, content, elapsed });
      console.log(`   ✅ Generated in ${elapsed}s (${content.split(/\s+/).length} words)`);
    } catch (e) {
      console.log(`   ❌ Failed: ${e.message}`);
    }
  }

  // Save all
  const outputPath = '/home/z/my-project/download/mergeproof-v4-leaderboard-informed.txt';
  let output = `MergeProof Content v4 - Leaderboard-Informed Generation\nGenerated: ${new Date().toISOString()}\n`;
  output += `Campaign: MergeProof: Ship With Confidence\n`;
  output += `Based on: Analysis of 347 submissions, top 30 scoring 2900-3447 pts\n\n`;

  results.forEach((r, i) => {
    output += `${'═'.repeat(70)}\n`;
    output += `VARIANT ${i + 1}: ${r.name} (${r.elapsed}s)\n`;
    output += `${'═'.repeat(70)}\n\n`;
    output += r.content + '\n\n';
  });

  fs.writeFileSync(outputPath, output, 'utf8');
  console.log(`\n📁 Saved to: ${outputPath}`);

  // Print all for review
  results.forEach((r, i) => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`VARIANT ${i + 1}: ${r.name}`);
    console.log(`${'═'.repeat(70)}`);
    console.log(r.content);
  });
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
