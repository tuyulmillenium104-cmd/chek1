#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// MergeProof Multi-Variant Generator
// Generates 3 variants with different angles + picks best
// ═══════════════════════════════════════════════════════════════════

const fs = require('fs');
const http = require('http');

const GATEWAY = {
  hosts: ['172.25.136.210:8080', '172.25.136.193:8080'],
  currentIndex: 0
};

let TOKENS;
try {
  const configTokens = require('./config/tokens.js');
  TOKENS = configTokens.TOKENS;
} catch (e) {
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
    if (tokenData === null && CFG && CFG.token) {
      headers['X-Token'] = CFG.token || CFG.apiKey; headers['X-User-Id'] = CFG.userId || ''; headers['X-Chat-Id'] = CFG.chatId || '';
    } else if (tokenData) {
      headers['X-Token'] = tokenData.token; headers['X-User-Id'] = tokenData.userId; headers['X-Chat-Id'] = tokenData.chatId;
    }
    const [host, port] = GATEWAY.hosts[GATEWAY.currentIndex].split(':');
    GATEWAY.currentIndex = (GATEWAY.currentIndex + 1) % GATEWAY.hosts.length;
    const body = JSON.stringify({ model: options.model || 'glm-5', messages, max_tokens: maxTokens, temperature, ...(options.enableSearch ? { enable_search: true } : {}), ...(options.enableThinking !== false ? {} : { enable_thinking: false }) });
    const req = http.request({ hostname: host, port: parseInt(port), path: '/v1/chat/completions', method: 'POST', headers }, (res) => {
      let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => {
        if (res.statusCode === 200) { try { const json = JSON.parse(data); const msg = json.choices?.[0]?.message || {}; resolve({ content: msg.content || msg.reasoning_content || '', thinking: msg.thinking || null }); } catch (e) { reject(new Error('Parse: ' + data.substring(0, 100))); } }
        else if (res.statusCode === 429) { currentTokenIndex = (currentTokenIndex + 1) % TOKENS.length; if (currentTokenIndex === 0 && (!CFG || !CFG.token)) currentTokenIndex = 1; reject(new Error('Rate limit')); }
        else reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
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

function scoreContent(content) {
  let score = 0;
  const details = [];

  // Required: mergeproof.com
  if (content.toLowerCase().includes('mergeproof.com')) { score += 25; details.push('✅ mergeproof.com (+25)'); } else { details.push('❌ mergeproof.com MISSING (0)'); }

  // Required: vibe coding
  if (/vibe.?cod/i.test(content)) { score += 15; details.push('✅ vibe coding (+15)'); } else { details.push('⚠️ vibe coding missing (0)'); }

  // X-Factor: specific numbers with units
  if (/\$\d+/.test(content)) { score += 10; details.push('✅ dollar amounts (+10)'); }
  else if (/\d+(%|k|K|M|B)/.test(content)) { score += 8; details.push('✅ numbers with units (+8)'); }
  else if (/\d+/.test(content)) { score += 3; details.push('⚠️ bare numbers (+3)'); }
  else { details.push('❌ no numbers (0)'); }

  // X-Factor: time specificity
  if (/\d+\s*(am|pm|minutes?|hours?|days?|weeks?|months?)/i.test(content) || /\b(yesterday|last (week|month|night|tuesday|monday|wednesday|thursday|friday))\b/i.test(content)) { score += 8; details.push('✅ time specificity (+8)'); }
  else { details.push('⚠️ no time specificity (0)'); }

  // X-Factor: embarrassing honesty
  const honesty = ["i'll admit", "i gotta admit", 'embarrassing', 'not proud', "i'll be honest", 'not gonna lie', "can't believe i'm", 'tbh'];
  if (honesty.some(p => content.toLowerCase().includes(p))) { score += 8; details.push('✅ embarrassing honesty (+8)'); }
  else { details.push('⚠️ no embarrassing honesty (0)'); }

  // X-Factor: insider detail
  const insider = /refreshed|counted|went from|checked|pulled up|stared at|clicked through/i;
  if (insider.test(content)) { score += 8; details.push('✅ insider detail (+8)'); }
  else { details.push('⚠️ no insider detail (0)'); }

  // MergeProof explanation depth
  const mpWords = ['stake', 'stak', 'review', 'pull request', 'pr ', 'bug', 'incentiv', 'bounty', 'audit', 'skin in the game', 'adversarial', 'economic', 'verify'];
  const foundMP = mpWords.filter(k => content.toLowerCase().includes(k));
  if (foundMP.length >= 3) { score += 10; details.push(`✅ deep MergeProof explanation (+10) [${foundMP.length} keywords]`); }
  else if (foundMP.length >= 2) { score += 6; details.push(`⚠️ basic MergeProof explanation (+6) [${foundMP.length} keywords]`); }
  else { details.push(`❌ weak MergeProof explanation (+${foundMP.length * 2}) [${foundMP.length} keywords]`); score += foundMP.length * 2; }

  // Personal word ratio
  const personal = (content.match(/\b(I|my|me|we|us|our|i'd|i'll|i've|you|your)\b/gi) || []).length;
  const total = content.split(/\s+/).length;
  const ratio = total > 0 ? personal / total : 0;
  if (ratio > 0.08) { score += 5; details.push(`✅ personal ratio ${ratio > 0.12 ? 'high' : 'ok'} (+5) [${(ratio * 100).toFixed(1)}%]`); }
  else { details.push(`⚠️ low personal ratio (+1) [${(ratio * 100).toFixed(1)}%]`); score += 1; }

  // Contractions
  const contractions = (content.match(/\b(i'm|can't|won't|don't|didn't|that's|it's|you're|they're|we're|isn't|aren't|wasn't|couldn't|shouldn't|wouldn't|there's|i'd|i'll|i've|you've|they've)\b/gi) || []).length;
  if (contractions >= 4) { score += 5; details.push(`✅ contractions ${contractions} (+5)`); }
  else if (contractions >= 2) { score += 3; details.push(`⚠️ contractions ${contractions} (+3)`); }
  else { details.push(`⚠️ contractions ${contractions} (+${contractions})`); score += contractions; }

  // No banned items
  if (content.includes('\u2014') || content.includes('\u2013')) { score -= 10; details.push('❌ em dashes (-10)'); }
  if (/#\w+/.test(content)) { score -= 10; details.push('❌ hashtags (-10)'); }
  if (/^@/.test(content.trim())) { score -= 10; details.push('❌ starts with mention (-10)'); }
  const banned = ['revolutionary', 'game-changer', 'disruptive', 'unprecedented', 'amazing', 'incredible'];
  const fb = banned.filter(w => content.toLowerCase().includes(w));
  if (fb.length > 0) { score -= 5 * fb.length; details.push(`❌ banned words: ${fb.join(', ')} (-${5 * fb.length})`); }

  // Word count sweet spot (120-200 words)
  if (total >= 120 && total <= 250) { score += 3; details.push(`✅ word count ${total} (+3)`); }
  else if (total < 120) { details.push(`⚠️ too short ${total} words (0)`); }
  else { details.push(`⚠️ too long ${total} words (0)`); }

  // Narrative arc (question at end)
  if (/\?\s*$/.test(content.trim())) { score += 3; details.push('✅ ends with question (+3)'); }
  else if (/\?/.test(content)) { score += 1; details.push('⚠️ has question but not at end (+1)'); }

  return { score, details };
}

const ANGLES = [
  {
    name: 'Vibe Coding Discovery',
    angleInstruction: `ANGLE: "Vibe Coding" disaster + discovery of MergeProof as the fix.
Story: You personally experienced vibe coding going wrong (AI-generated PRs breaking prod). You were skeptical about MergeProof at first but something specific made you realize it's actually necessary. Include exact time, specific details about what broke, and the moment of realization.`
  },
  {
    name: 'Open Source Burnout',
    angleInstruction: `ANGLE: Open source maintainer burnout + MergeProof as sustainable solution.
Story: You maintain (or contribute to) an open source project and have experienced review fatigue firsthand. You found MergeProof and realized it could solve the economic problem of unpaid code review. Include specific numbers about your project or contributions.`
  },
  {
    name: 'Skeptical Developer',
    angleInstruction: `ANGLE: Skeptical developer who almost dismissed MergeProof + came back.
Story: Like the 362-point GRVT winner, you initially dismissed MergeProof as "another web3 thing." But something specific made you come back and actually look into it. Include the specific moment of reversal, what you found, and why it changed your mind. This should mirror the "i almost skipped @grvt_io" narrative structure EXACTLY.`
  }
];

async function generateVariant(angle) {
  const systemPrompt = `You are a REAL developer who writes casually on social media. Write like texting a friend. NOT a marketer.

CRITICAL PATTERNS TO FOLLOW:
1. HOOK: Start with "ok i'll admit something [embarrassing]" or "not gonna lie" or "tbh"
2. SPECIFICITY: Include exact time ("last tuesday at 10pm"), specific numbers ("$250", "40%", "500 lines"), specific actions ("pulled up their repo at 2am", "stared at a broken CI pipeline for 45 minutes")
3. NARRATIVE ARC: Skepticism → specific moment of discovery → concrete evidence → shift in thinking → genuine question
4. VOICE: lowercase, contractions everywhere (i'm, can't, won't, didn't, that's, it's), short sentences, fragments ok
5. STRUCTURE: 5-7 short paragraphs, each 1-2 sentences, separated by blank lines

ABSOLUTE RULES:
- MUST include "mergeproof.com" naturally in the text
- MUST explain what MergeProof does (staking on PRs, reviewers get paid for finding bugs)
- MUST mention "vibe coding" and why it makes MergeProof necessary NOW
- DO NOT start with @mention
- NO em dashes (use - or , instead)
- NO hashtags
- NO smart quotes
- NO banned words: revolutionary, game-changer, disruptive, unprecedented, amazing, incredible
- Keep it analytical and curious, not hyped
- End with a genuine question

MERGEPROOF FACTS TO WEAVE IN:
- Developers stake value behind their code (skin in the game)
- Reviewers earn rewards for finding valid bugs
- Creates adversarial audit model (paid to find problems, not approve)
- Transforms passive code review into active economic verification
- Mini-market for code quality: confidence measurable, effort compensated, risk priced
- Post-merge bugs are far more expensive than pre-merge fixes

Return ONLY the raw tweet text with \\n\\n between paragraphs. No JSON, no labels.`;

  const userPrompt = `Write a tweet about MergeProof using this angle:

${angle.angleInstruction}

REMEMBER:
- "ok i'll admit something" style opening
- Specific time (day of week, time of day)
- Specific numbers ($, %, counts)
- Personal story arc (not product review)
- mergeproof.com mention
- "vibe coding" context
- End with genuine question
- lowercase casual style
- 5-7 paragraphs

Just write the tweet. No explanation, no JSON, just the text.`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { temperature: 0.85, maxTokens: 3000, model: 'glm-5', enableSearch: true });

  return response.content.trim();
}

async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('🎯 MergeProof Multi-Variant Generator v3');
  console.log('════════════════════════════════════════════════════════');
  console.log('');

  const results = [];
  for (let i = 0; i < ANGLES.length; i++) {
    console.log(`\n🔥 Generating Variant ${i + 1}: ${ANGLES[i].name}...`);
    const start = Date.now();
    try {
      const content = await generateVariant(ANGLES[i]);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const scoring = scoreContent(content);
      results.push({ index: i, name: ANGLES[i].name, content, scoring, elapsed });
      console.log(`   ✅ Generated in ${elapsed}s | Score: ${scoring.score}/100`);
      scoring.details.forEach(d => console.log(`      ${d}`));
    } catch (e) {
      console.log(`   ❌ Failed: ${e.message}`);
    }
  }

  // Sort by score
  results.sort((a, b) => b.scoring.score - a.scoring.score);

  console.log('\n════════════════════════════════════════════════════════');
  console.log('🏆 RANKING:');
  results.forEach((r, i) => console.log(`   ${i + 1}. ${r.name}: ${r.scoring.score}/100 (${r.elapsed}s)`));
  console.log('');

  const best = results[0];
  console.log('════════════════════════════════════════════════════════');
  console.log(`🥇 BEST VARIANT: ${best.name} (${best.scoring.score}/100)`);
  console.log('════════════════════════════════════════════════════════');
  console.log('');
  console.log(best.content);
  console.log('');
  console.log('════════════════════════════════════════════════════════');

  // Also show runner-up if close
  if (results.length > 1 && results[1].scoring.score >= best.scoring.score - 10) {
    console.log(`🥈 RUNNER-UP: ${results[1].name} (${results[1].scoring.score}/100)`);
    console.log('════════════════════════════════════════════════════════');
    console.log('');
    console.log(results[1].content);
    console.log('');
  }

  // Save all variants
  const outputPath = '/home/z/my-project/download/mergeproof-variants-v3.txt';
  let output = `MergeProof Content Variants - Generated ${new Date().toISOString()}\n`;
  output += `Campaign: MergeProof: Ship With Confidence\n`;
  output += `Address: 0x1D68b125aE0D60F3D57fE0B320c674788cB8056a\n\n`;

  results.forEach((r, i) => {
    output += `${'═'.repeat(70)}\n`;
    output += `VARIANT ${i + 1}: ${r.name} | Score: ${r.scoring.score}/100\n`;
    output += `${'═'.repeat(70)}\n\n`;
    output += r.content + '\n\n';
    output += `Checks:\n${r.scoring.details.join('\n')}\n\n`;
  });

  output += `${'═'.repeat(70)}\n`;
  output += `RECOMMENDED: Variant #1 "${best.name}" (${best.scoring.score}/100)\n`;
  output += `${'═'.repeat(70)}\n`;

  fs.writeFileSync(outputPath, output, 'utf8');
  console.log(`📁 All variants saved to: ${outputPath}`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
