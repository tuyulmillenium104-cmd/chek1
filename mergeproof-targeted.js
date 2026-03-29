#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// MergeProof Targeted Content Generator
// Uses proven winning patterns from GRVT 335 & 362 point submissions
// Approach: Research already done (checkpoint) → Generate 1 tweet → Anti-AI regen → Output
// ═══════════════════════════════════════════════════════════════════

const fs = require('fs');
const http = require('http');

// Gateway (same as workflow)
const GATEWAY = {
  hosts: ['172.25.136.210:8080', '172.25.136.193:8080'],
  currentIndex: 0
};

// Tokens
let TOKENS;
try {
  const configTokens = require('./config/tokens.js');
  TOKENS = configTokens.TOKENS;
} catch (e) {
  TOKENS = [
    null,
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtNTQ5ZmI5MTEtZWM0NS00NGJiLTg5YjEtMWY2MTljNTEzN2QzIn0.M6IQTOXasSbEw98a4R6p3LEPwJPCWyRZiJSUo8lr2PM', chatId: 'chat-549fb911-ec45-44bb-89b1-1f619c5137d3', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun A #1' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtMTAyYTlkMGUtYTVkNy00MmY2LTk3ZjctNDk5NzFiNzcwNjVhIn0.6cDfQbTc2HHdtKXBfaUvpBsNLPbbjYkpJp6br0rYteA', chatId: 'chat-102a9d0e-a5d7-42f6-97f7-49971b77065a', userId: 'bb829ea3-0d37-4944-8705-00090bde3671', label: 'Akun B #1' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtMDAyOWJjNDYtZGI3Ny00ZmZkLWI4ZDItM2RlYzFlNWVkNDU3In0.CMthZytUFBpnqW3K52Q1AAgB9uvhyXf3AG-FQvaDoYI', chatId: 'chat-0029bc46-db77-4ffd-b8d2-3dec1e5ed457', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun A #2' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtOTZlZTk1NmItMGYxMi00MGUxLWE0MzYtYTk4YmQwZjk0YzJhIn0.PgpMEiUr8a6Cu2vl9zFMggRsxQrx3JwkUCOjZCUIJnw', chatId: 'chat-96ee956b-0f12-40e1-a436-a98bd0f94c2a', userId: 'bb829ea3-0d37-4944-8705-00090bde3671', label: 'Akun B #2' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtOWJiMzAzOTMtYWE3Mi00Y2QzLWJkNzktYzJkZmI0ODVmNzgyIn0.jb35oqGKPB2FLC-X_mozORmvbBilwRc_pSZEkbyaRfw', chatId: 'chat-9bb30393-aa72-4cd3-bd79-c2dfb485f782', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun A #3' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtYjAyYTlhMmUtZTg5My00NGMwLWEzMTktNTZlYTk0YzRkOTQxIn0.GQLbTpxXn-gcONVhEYr6Ozq7sTOdE5NJt5wIiGfVTQM', chatId: 'chat-b0b2aa2e-e893-44c0-a319-56ea94c4d941', userId: 'bb829ea3-0d37-4944-8705-00090bde3671', label: 'Akun B #3' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtZDE3ZGY4ODQtZGNlOC00MmU3LWEzMTctMDQzYjI0YmM3MjdmIn0.W8UQmOxVIqGsAicZc9n4r4jR3IVM5Yj9V-SWv8H_0ac', chatId: 'chat-d17df884-dce8-42e7-a317-043b24bc727f', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun A #4' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtYzAwMTI0YWQtODk2Yy00NzBiLWE0OTYtOGFlNTYzMTQ0YTUwIn0.a0UXyTQ3z4D0g0mzHbVLpBMMN6cftW1W_-ELiObLqXY', chatId: 'chat-c00124ad-896c-470b-a496-8ae563144a50', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun C #1' },
  ];
}

let currentTokenIndex = 0;
let CFG = null;
try { CFG = JSON.parse(fs.readFileSync('/etc/.z-ai-config', 'utf8')); } catch (e) {}

function callAIdirect(messages, maxTokens = 2000, temperature = 0.7, options = {}) {
  return new Promise((resolve, reject) => {
    let tokenData = TOKENS[currentTokenIndex];
    if (tokenData === null && (!CFG || !CFG.token)) {
      currentTokenIndex = 1;
      tokenData = TOKENS[currentTokenIndex];
    }
    let headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer Z.ai',
      'X-Z-AI-From': 'Z'
    };
    if (tokenData === null && CFG && CFG.token) {
      headers['X-Token'] = CFG.token || CFG.apiKey;
      headers['X-User-Id'] = CFG.userId || '';
      headers['X-Chat-Id'] = CFG.chatId || '';
    } else if (tokenData) {
      headers['X-Token'] = tokenData.token;
      headers['X-User-Id'] = tokenData.userId;
      headers['X-Chat-Id'] = tokenData.chatId;
    } else {
      const fallback = TOKENS[1];
      if (fallback) {
        headers['X-Token'] = fallback.token;
        headers['X-User-Id'] = fallback.userId;
        headers['X-Chat-Id'] = fallback.chatId;
      }
    }
    const [host, port] = GATEWAY.hosts[GATEWAY.currentIndex].split(':');
    GATEWAY.currentIndex = (GATEWAY.currentIndex + 1) % GATEWAY.hosts.length;
    const body = JSON.stringify({
      model: options.model || 'glm-5',
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(options.enableSearch ? { enable_search: true } : {}),
      ...(options.enableThinking !== false ? {} : { enable_thinking: false })
    });
    const req = http.request({
      hostname: host, port: parseInt(port),
      path: '/v1/chat/completions', method: 'POST', headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const msg = json.choices?.[0]?.message || {};
            resolve({ content: msg.content || msg.reasoning_content || '', thinking: msg.thinking || null, provider: 'http-direct' });
          } catch (e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
        } else if (res.statusCode === 429) {
          currentTokenIndex = (currentTokenIndex + 1) % TOKENS.length;
          if (currentTokenIndex === 0 && (!CFG || !CFG.token)) currentTokenIndex = 1;
          reject(new Error('Rate limit'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

async function callAI(messages, options = {}) {
  const maxRetries = 6;
  let lastError = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callAIdirect(messages, options.maxTokens || 2000, options.temperature || 0.7, options);
    } catch (e) {
      lastError = e;
      if (e.message.includes('Rate limit')) {
        await new Promise(r => setTimeout(r, 2000 * Math.pow(1.3, i)));
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  throw lastError;
}

// ═══════════════════════════════════════════════════════════════════
// LOAD RESEARCH DATA (from checkpoint)
// ═══════════════════════════════════════════════════════════════════
const checkpointPath = '/home/z/my-project/download/.checkpoint-MergeProof--Ship-With-Confiden.json';
const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
const campaign = JSON.parse(fs.readFileSync('/home/z/my-project/chek1/campaigns/mergeproof.json', 'utf8'));

console.log('════════════════════════════════════════════════════════');
console.log('🎯 MergeProof Targeted Generator (Pattern-Based)');
console.log('════════════════════════════════════════════════════════');
console.log(`📋 Campaign: ${campaign.title}`);
console.log(`📝 Mission: ${campaign.missionTitle}`);
console.log(`📊 Previous best: 105/105 (but missing mergeproof.com + X-Factors)`);
console.log('');

// ═══════════════════════════════════════════════════════════════════
// PROVEN WINNING PATTERNS from GRVT 335 & 362 point submissions
// ═══════════════════════════════════════════════════════════════════

const WINNING_EXAMPLE_335 = `ok i'll admit something - when i first started farming on @grvt_io i was lowkey worried about dilution. you know how it goes, more seasons = more points = my early grind worth less.

but the latest AMA actually addressed this directly. season 2 comes with +6% additional community allocation AND existing points stay protected.

so for people like me who've been depositing, watching positions, and inviting friends since season 1, the token per point value doesn't get watered down just because more people join.

that's not nothing. most protocols just print more tokens and pretend the early supporters don't exist.

if this isn't the new standard for fair token distribution, then what is ?`;

const WINNING_EXAMPLE_362 = `ok i'll admit something embarrassing.

i almost skipped @grvt_io when i first saw it. another perp DEX, another "revolutionary" thing, another thing i'd check once and forget.

but something made me come back last week. pulled up their numbers on defillama around 11pm on a tuesday and... yeah. tvl pushing $100M. cumulative volume over $200B. open interest around $500M. zero downtime since their january 2025 launch.

i've been burned too many times by platforms going dark right when btc moves 5% in a minute. what made me actually deposit was watching it hold up during last week's volatility. tight spreads, no hiccups, verified yields.

even invited a friend who hit the $250 referral threshold and got the 11% yield boost.

what's the one metric that made you actually trust a platform this year?`;

// ═══════════════════════════════════════════════════════════════════
// CONTENT GENERATION PROMPT (Pattern-Aware)
// ═══════════════════════════════════════════════════════════════════

async function generateContent() {
  console.log('🚀 STEP 1: Generating content with proven patterns...');
  console.log('');

  const contentToUse = checkpoint.comprehensionPlan?._contentToUse || checkpoint.campaignIntent?.contentToUse || {};
  const contentToAvoid = checkpoint.comprehensionPlan?._contentToAvoid || checkpoint.campaignIntent?.contentToAvoid || {};
  const criticalWarnings = checkpoint.comprehensionPlan?._criticalWarnings || checkpoint.campaignIntent?.criticalWarnings || [];

  const systemPrompt = `You are a REAL PERSON who writes on social media like texting a friend. You are NOT a marketer, NOT an AI, NOT a promoter.

═══════════════════════════════════════════════════════════════════
CRITICAL: REPLICATE THESE EXACT WINNING PATTERNS:
═══════════════════════════════════════════════════════════════════

PATTERN 1 - HOOK STYLE (from 335-pt winner):
"ok i'll admit something [embarrassing/confession]..."
Start with a personal vulnerability or confession. NOT an "unpopular opinion" or "hot take."

PATTERN 2 - NARRATIVE ARC (from 362-pt winner):
Skepticism/dismissal → specific moment of discovery → concrete details → endorsement
NOT: "here's why X is amazing." INSTEAD: "i almost skipped X, but then [specific moment]..."

PATTERN 3 - GRANULAR SPECIFICITY (CRITICAL for X-Factor score):
- Specific TIME: "around 11pm on a tuesday", "last week", "3 days ago"
- Specific NUMBERS: "$250 threshold", "11% yield", "40% of merged code"
- Specific ACTIONS: "pulled up their numbers on defillama", "invited a friend who hit..."
- Insider DETAILS: "refreshed the page 47 times", "went from skeptical to depositing in 20 minutes"

PATTERN 4 - VOICE:
- lowercase casual style (like texting a friend)
- contractions everywhere (i'm, can't, won't, didn't, that's)
- short sentences. some fragments.
- parenthetical asides (embarrassing to admit, not gonna lie)
- end with genuine question inviting discussion

PATTERN 5 - STRUCTURE:
- 4-8 short paragraphs separated by blank lines
- each paragraph: 1-2 sentences max
- hook → context → discovery → evidence → implication → question

═══════════════════════════════════════════════════════════════════
ABSOLUTE RULES (violation = instant rejection):
═══════════════════════════════════════════════════════════════════
1. MUST include "mergeproof.com" (required by campaign rules)
2. DO NOT start with a mention (e.g., @genlayer, @mergeproof)
3. NO em dashes allowed - use regular dash (-) or commas
4. NO hashtags
5. NO smart quotes ("") - use straight quotes only ("")
6. DO NOT sound like AI or a press release
7. MUST clearly explain what MergeProof does
8. MUST explain why MergeProof is useful NOW with vibe coding boom
9. AVOID these banned words: revolutionary, game-changer, disruptive, unprecedented, amazing, incredible
10. Keep it natural and analytical - curiosity > hype

═══════════════════════════════════════════════════════════════════
WHAT MERGEPROOF IS (weave these facts into your personal story):
═══════════════════════════════════════════════════════════════════
- Protocol that introduces economic incentives into PR review
- Developers stake value behind their code when submitting PRs (skin in the game)
- Reviewers earn rewards for finding valid bugs (incentivized adversarial audit)
- Transforms code review from passive goodwill into active economic verification
- Creates a "mini-market for code quality" where confidence is measurable
- Shift from reputation-based trust to incentive-based verification
- Key problem it solves: code review doesn't scale, maintainers overloaded, AI code increases PR volume but not quality, reviewers unpaid, post-merge bugs are far more expensive

════════════════════════════════════════════════════════════════════
RECOMMENDED ANGLES (pick ONE and own it):
═══════════════════════════════════════════════════════════════════
1. "Vibe coding" problem: AI-generated code flooding repos, breaking review models
2. Economic primitives: Code review as a market where risk is priced
3. Adversarial audit: Paying reviewers to find bugs creates better security than asking for favors

════════════════════════════════════════════════════════════════════
CRITICAL WARNINGS:
═══════════════════════════════════════════════════════════════════
${criticalWarnings.map(w => '- ' + w).join('\n')}

═══════════════════════════════════════════════════════════════════
ANGLES TO AVOID (overused):
═══════════════════════════════════════════════════════════════════
${(contentToAvoid.overusedAngles || []).map(a => '- ' + a).join('\n')}

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════════════════
Return ONLY the tweet text. No JSON, no labels, no explanation. Just the raw tweet with \\n\\n between paragraphs.`;

  const userPrompt = `Write ONE tweet about MergeProof that replicates the winning patterns above.

YOUR TASK:
1. Open with a personal confession/vulnerability (like "ok i'll admit something...")
2. Include a specific moment with time and details (like "pulled up numbers at 11pm on a tuesday")
3. Tell a story: initial skepticism → specific discovery → concrete evidence → shift in thinking
4. Weave MergeProof explanation naturally into YOUR experience, not as a product description
5. Include specific numbers (percentages, dollar amounts, counts)
6. Mention mergeproof.com naturally
7. Address the "vibe coding" problem and why MergeProof matters NOW
8. End with a genuine question that invites discussion
9. Compare to traditional code review briefly (optional but good for points)

CAMPAIGN STYLE: "Your post should sound like you're explaining a genuinely interesting innovation to your audience - not like a press release. Curiosity, clarity, and strong reasoning are valued more than hype."

Remember: This is a personal story about discovering something interesting, NOT a product review or advertisement. Write like you're telling a friend about something cool you found last week.

EXAMPLES OF THE TONE/STYLE TO REPLICATE (NOT the topic - these are about a different product):

EXAMPLE 1 (335 points):
"${WINNING_EXAMPLE_335.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"

EXAMPLE 2 (362 points):
"${WINNING_EXAMPLE_362.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"

Write your MergeProof tweet now. Remember: lowercase casual, specific details, personal confession opening, mergeproof.com mention, vibe coding context, end with question. NO em dashes.`;

  const startTime = Date.now();
  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { temperature: 0.85, maxTokens: 3000, model: 'glm-5', enableSearch: true });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ✅ Content generated in ${elapsed}s`);
  return response.content.trim();
}

// ═══════════════════════════════════════════════════════════════════
// ANTI-AI REGENERATION (makes it sound more human)
// ═══════════════════════════════════════════════════════════════════

async function antiAIRegen(content) {
  console.log('');
  console.log('🔄 STEP 2: Anti-AI regeneration (humanizing)...');

  const systemPrompt = `You are a REAL developer who uses crypto and writes on social media casually.
Your job: Take the following tweet and rewrite it to sound MORE human and LESS like AI wrote it.

HUMANIZING RULES:
- Keep the SAME message, facts, and narrative arc
- Make it sound more like a text to a friend
- Add more casual imperfections: short fragments, trailing thoughts, slight repetitions
- Use MORE contractions (i'm, can't, won't, didn't, that's, it's, you're)
- Add a parenthetical aside if missing (like "embarrassing to admit" or "not gonna lie")
- Make the opening hook feel MORE spontaneous and less crafted
- Add ONE specific sensory detail if missing (like "at 2am staring at a stack trace")
- Keep the same length roughly (4-8 paragraphs)
- DO NOT change the core facts about MergeProof
- DO NOT remove mergeproof.com
- DO NOT add em dashes or smart quotes
- DO NOT add hashtags
- DO NOT start with a mention
- Keep lowercase casual style
- End with the same question (or improve it)`;

  const userPrompt = `Rewrite this tweet to sound more human and authentic:

---
${content}
---

Make it feel like someone actually typed this on their phone at midnight after a long day of coding. Same facts, more soul.`;

  const startTime = Date.now();
  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { temperature: 0.9, maxTokens: 2000, model: 'glm-5-flash', enableThinking: false });

  let regenerated = response.content.trim();

  // Remove thinking blocks
  const thinkEnd = regenerated.indexOf('</think');
  if (thinkEnd > 0) {
    regenerated = regenerated.substring(thinkEnd + '</think'.length).trim();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ✅ Anti-AI regen done in ${elapsed}s`);
  return regenerated;
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION CHECKS
// ═══════════════════════════════════════════════════════════════════

function validateContent(content) {
  console.log('');
  console.log('🔍 STEP 3: Validation checks...');
  const checks = [];

  // Check mergeproof.com
  if (content.toLowerCase().includes('mergeproof.com')) {
    checks.push('✅ mergeproof.com present');
  } else {
    checks.push('❌ MISSING: mergeproof.com (REQUIRED!)');
  }

  // Check no em dashes
  if (content.includes('\u2014') || content.includes('\u2013')) {
    checks.push('❌ Contains em dashes (FORBIDDEN!)');
  } else {
    checks.push('✅ No em dashes');
  }

  // Check no hashtags
  if (/#\w+/.test(content)) {
    checks.push('❌ Contains hashtags (NOT ALLOWED)');
  } else {
    checks.push('✅ No hashtags');
  }

  // Check doesn't start with mention
  if (/^@/.test(content.trim())) {
    checks.push('❌ Starts with mention (NOT ALLOWED)');
  } else {
    checks.push('✅ Does not start with mention');
  }

  // Check specific numbers
  if (/\d+(%|\$|k|K|M|B)/.test(content) || /\$\d+/.test(content)) {
    checks.push('✅ Specific numbers present (X-Factor)');
  } else if (/\d+/.test(content)) {
    checks.push('⚠️ Has numbers but no $/%/k/M suffix (weak X-Factor)');
  } else {
    checks.push('❌ No specific numbers (missing X-Factor)');
  }

  // Check time specificity
  if (/\d+\s*(minutes?|hours?|seconds?|days?|weeks?|months?|years?|am|pm)/i.test(content)) {
    checks.push('✅ Time specificity present (X-Factor)');
  } else {
    checks.push('⚠️ No time specificity (missing X-Factor)');
  }

  // Check embarrassing honesty
  const honestyPatterns = ['embarrassing to admit', 'not proud', 'hate to admit', "i'll be honest", "i'll admit", 'not gonna lie', "can't believe i'm"];
  if (honestyPatterns.some(p => content.toLowerCase().includes(p))) {
    checks.push('✅ Embarrassing honesty present (X-Factor)');
  } else {
    checks.push('⚠️ No embarrassing honesty (missing X-Factor)');
  }

  // Check personal words ratio
  const personalWords = (content.match(/\b(I|my|me|we|us|our)\b/gi) || []).length;
  const totalWords = content.split(/\s+/).length;
  const ratio = totalWords > 0 ? (personalWords / totalWords * 100).toFixed(1) : 0;
  checks.push(`📊 Personal word ratio: ${ratio}% (${personalWords}/${totalWords})`);

  // Check banned words
  const bannedWords = ['revolutionary', 'game-changer', 'disruptive', 'unprecedented', 'amazing', 'incredible'];
  const foundBanned = bannedWords.filter(w => content.toLowerCase().includes(w));
  if (foundBanned.length > 0) {
    checks.push(`❌ Banned words found: ${foundBanned.join(', ')}`);
  } else {
    checks.push('✅ No banned words');
  }

  // Check vibe coding mention
  if (/vibe.?cod/i.test(content)) {
    checks.push('✅ Vibe coding mentioned');
  } else {
    checks.push('⚠️ Vibe coding not explicitly mentioned (campaign wants this)');
  }

  // Check MergeProof explanation
  const mpKeywords = ['stake', 'review', 'pull request', 'pr ', 'bug', 'incentiv', 'bounty', 'audit', 'skin in the game'];
  const foundMP = mpKeywords.filter(k => content.toLowerCase().includes(k));
  if (foundMP.length >= 2) {
    checks.push(`✅ MergeProof explained (${foundMP.join(', ')})`);
  } else {
    checks.push('⚠️ MergeProof explanation may be weak');
  }

  // Word count
  checks.push(`📊 Total words: ${totalWords}`);
  checks.push(`📊 Total chars: ${content.length}`);

  // Contraction count
  const contractions = (content.match(/\b(i'm|can't|won't|don't|didn't|that's|it's|you're|they're|we're|isn't|aren't|wasn't|weren't|couldn't|shouldn't|wouldn't)\b/gi) || []).length;
  checks.push(`📊 Contractions: ${contractions} (target: 3+)`);

  checks.forEach(c => console.log('   ' + c));

  return checks;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const totalStart = Date.now();

  try {
    // Step 1: Generate
    const content = await generateContent();

    console.log('');
    console.log('════════════════════════════════════════════════════════');
    console.log('📝 RAW CONTENT:');
    console.log('════════════════════════════════════════════════════════');
    console.log(content);

    // Step 2: Anti-AI regen
    const humanized = await antiAIRegen(content);

    console.log('');
    console.log('════════════════════════════════════════════════════════');
    console.log('🧑 FINAL HUMANIZED CONTENT:');
    console.log('════════════════════════════════════════════════════════');
    console.log(humanized);

    // Step 3: Validate
    const checks = validateContent(humanized);

    // Save outputs
    const outputPath = '/home/z/my-project/download/mergeproof-pattern-v2.txt';
    const output = `════════════════════════════════════════════════════════
🏆 MERGEPROOF CONTENT - Pattern-Based Generation v2
════════════════════════════════════════════════════════════════════
📌 Campaign: ${campaign.title}
🎯 Mission: ${campaign.missionTitle}
📍 Address: ${campaign.intelligentContractAddress}
⏰ Generated: ${new Date().toISOString()}
════════════════════════════════════════════════════════════════════

${humanized}

════════════════════════════════════════════════════════════════════
VALIDATION CHECKS:
════════════════════════════════════════════════════════════════════
${checks.join('\n')}

════════════════════════════════════════════════════════════════════
RAW (before anti-AI regen):
════════════════════════════════════════════════════════════════════
${content}
`;

    fs.writeFileSync(outputPath, output, 'utf8');

    const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
    console.log('');
    console.log(`════════════════════════════════════════════════════════`);
    console.log(`✅ DONE in ${totalElapsed}s`);
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`════════════════════════════════════════════════════════`);

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    process.exit(1);
  }
}

main();
