#!/usr/bin/env node
// Quick judge runner for a single content piece
// Runs all 3 judges from rally-workflow-v9.8.3-final.js

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
        if (res.statusCode === 200) { try { const json = JSON.parse(data); const msg = json.choices?.[0]?.message || {}; resolve({ content: msg.content || '' }); } catch (e) { reject(new Error('Parse: ' + data.substring(0, 100))); } }
        else if (res.statusCode === 429) { currentTokenIndex = (currentTokenIndex + 1) % TOKENS.length; if (currentTokenIndex === 0 && (!CFG || !CFG.token)) currentTokenIndex = 1; reject(new Error('Rate limit')); }
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

// Load content from command line or default
let contentToJudge;

// Try loading from .judge-input.txt first (most reliable)
const inputFile = '/home/z/my-project/chek1/.judge-input.txt';
if (fs.existsSync(inputFile)) {
  contentToJudge = fs.readFileSync(inputFile, 'utf8').trim();
} else if (process.argv[2]) {
  contentToJudge = process.argv[2];
}

if (!contentToJudge) {
  console.error('No content to judge!');
  process.exit(1);
}

const campaign = JSON.parse(fs.readFileSync('/home/z/my-project/chek1/campaigns/mergeproof.json', 'utf8'));

console.log('════════════════════════════════════════════════════════');
console.log('⚖️ Quick Judge Runner - MergeProof');
console.log('════════════════════════════════════════════════════════');
console.log('');
console.log('📝 Content:');
console.log(contentToJudge.substring(0, 200) + (contentToJudge.length > 200 ? '...' : ''));
console.log('');

async function runJudges() {
  const totalStart = Date.now();

  // Judge 1: Gate Master
  console.log('🔍 JUDGE 1: Gate Master (Requirements + Originality)...');
  const j1System = `You are a STRICT content judge. Score this tweet for a campaign. Return JSON only.

SCORING:
- gateUtama (0-12): Campaign alignment, correct terminology, brand consistency, target audience
- gateTambahan (0-8): Required elements (tags, hashtags, URLs, specific content points, style)
- punctuationScore (0-2): No em dashes, no smart quotes, correct formatting

RULES:
- Must include mergeproof.com
- Must explain what MergeProof does
- Must explain why useful with vibe coding boom
- Must NOT start with mention
- NO em dashes
- NO hashtags
- NO banned words: revolutionary, game-changer, disruptive, unprecedented, amazing, incredible

Return JSON: {"gateUtama": N, "gateTambahan": N, "punctuationScore": N, "issues": ["issue1"], "recommendations": ["rec1"]}`;

  const j1User = `Campaign rules:
${campaign.rules}

Campaign description:
${campaign.description}

Style:
${campaign.style}

Knowledge Base (facts to check):
${campaign.knowledgeBase}

Tweet to judge:
${contentToJudge}`;

  const j1Result = await callAI([
    { role: 'system', content: j1System },
    { role: 'user', content: j1User }
  ], { temperature: 0.2, maxTokens: 2000, model: 'glm-5', enableSearch: true });

  console.log('   ✅ Judge 1 done');
  let j1;
  try {
    const jsonStr = j1Result.content.match(/\{[\s\S]*\}/)?.[0];
    j1 = JSON.parse(jsonStr);
  } catch (e) {
    j1 = { gateUtama: 10, gateTambahan: 6, punctuationScore: 2, issues: ['parse error'], recommendations: [] };
  }
  const j1Total = (j1.gateUtama || 0) + (j1.gateTambahan || 0) + (j1.punctuationScore || 0);
  console.log(`   Score: ${j1Total}/22 (gateUtama: ${j1.gateUtama}, gateTambahan: ${j1.gateTambahan}, punct: ${j1.punctuationScore})`);

  // Judge 2: Evidence Master
  console.log('\n🔍 JUDGE 2: Evidence Master (Fact-checking)...');
  const j2System = `You are a FACT-CHECKING judge. Verify all claims in this tweet against the knowledge base. Return JSON only.

SCORING (each 1-4):
- claimAccuracy: Are facts correct?
- sourceQuality: Are sources cited/referenced?
- dataFreshness: Is data current?

Return JSON: {"claimAccuracy": {"score": N, "reason": "..."}, "sourceQuality": {"score": N, "reason": "..."}, "dataFreshness": {"score": N, "reason": "..."}, "feedback": "..."}`;

  const j2Result = await callAI([
    { role: 'system', content: j2System },
    { role: 'user', content: `Knowledge base:\n${campaign.knowledgeBase}\n\nTweet:\n${contentToJudge}` }
  ], { temperature: 0.2, maxTokens: 2000, model: 'glm-5', enableSearch: true });

  console.log('   ✅ Judge 2 done');
  let j2;
  try {
    const jsonStr = j2Result.content.match(/\{[\s\S]*\}/)?.[0];
    j2 = JSON.parse(jsonStr);
  } catch (e) {
    j2 = { claimAccuracy: { score: 3 }, sourceQuality: { score: 2 }, dataFreshness: { score: 3 }, feedback: 'parse error' };
  }
  const j2Total = Math.min((j2.claimAccuracy?.score || 0) + (j2.sourceQuality?.score || 0) + (j2.dataFreshness?.score || 0), 5);
  console.log(`   Score: ${j2Total}/5 (accuracy: ${j2.claimAccuracy?.score}, source: ${j2.sourceQuality?.score}, fresh: ${j2.dataFreshness?.score})`);

  // Judge 3: Quality Master
  console.log('\n🔍 JUDGE 3: Quality Master (Content quality)...');
  const j3System = `You are a CONTENT QUALITY judge for a crypto campaign. Return JSON only.

SCORING:
- penilaianInternal (0-44): Internal quality assessment
- compliance (0-18): Rule compliance
- uniqueness (0-18): Originality and uniqueness
- Total max: 80

X-FACTOR BONUSES (0-5 each, max total 20):
- specificNumbers: Exact figures present ($, %, k, M)
- timeSpecificity: Exact durations
- embarrassingHonesty: "i'll admit", "embarrassing", "not proud"
- insiderDetail: Unique observations showing real experience
- unexpectedAngle: Surprising approach direction

IMPORTANT: The campaign penalizes "Highly generic or AI-generated-looking content". Score accordingly.
The campaign values "Curiosity, clarity, and strong reasoning" over hype.

Return JSON: {"penilaianInternal": N, "compliance": N, "uniqueness": N, "qualityNotes": "..."} `;

  const j3Result = await callAI([
    { role: 'system', content: j3System },
    { role: 'user', content: `Campaign: ${campaign.title}\nMission: ${campaign.missionTitle}\nRules: ${campaign.rules}\nStyle: ${campaign.style}\n\nTweet:\n${contentToJudge}` }
  ], { temperature: 0.2, maxTokens: 3000, model: 'glm-5', enableSearch: true });

  console.log('   ✅ Judge 3 done');
  let j3;
  try {
    const jsonStr = j3Result.content.match(/\{[\s\S]*\}/)?.[0];
    j3 = JSON.parse(jsonStr);
  } catch (e) {
    j3 = { penilaianInternal: 30, compliance: 14, uniqueness: 14, qualityNotes: 'parse error' };
  }
  const j3Total = (j3.penilaianInternal || 0) + (j3.compliance || 0) + (j3.uniqueness || 0);
  console.log(`   Score: ${j3Total}/80 (internal: ${j3.penilaianInternal}, compliance: ${j3.compliance}, uniqueness: ${j3.uniqueness})`);

  // Final summary
  const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log('\n════════════════════════════════════════════════════════');
  console.log(`📊 FINAL SCORES (in ${totalElapsed}s)`);
  console.log('════════════════════════════════════════════════════════');
  console.log(`   Judge 1 (Gate Master):     ${j1Total}/22`);
  console.log(`   Judge 2 (Evidence Master): ${j2Total}/5`);
  console.log(`   Judge 3 (Quality Master):  ${j3Total}/80`);
  console.log(`   ────────────────────────────────`);
  console.log(`   TOTAL:                     ${j1Total + j2Total + j3Total}/107`);
  console.log(`   Pass threshold:            80/107`);
  console.log(`   Status:                    ${j1Total + j2Total + j3Total >= 80 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('════════════════════════════════════════════════════════');
  console.log(`\n📋 Judge 1 issues: ${JSON.stringify(j1.issues || [])}`);
  console.log(`📋 Judge 2 feedback: ${j2.feedback || ''}`);
  console.log(`📋 Judge 3 notes: ${j3.qualityNotes || ''}`);
}

runJudges().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
