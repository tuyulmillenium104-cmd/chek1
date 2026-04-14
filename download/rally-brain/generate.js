/**
 * Rally Brain Generate Runner v4.0
 * CONNECTED PIPELINE: LEARN (from Rally data) → SANITIZE → GENERATE → EVALUATE → OUTPUT
 * Updated per SKILL.md v9.5: 23/23 scoring, full banned lists, sanitization, Reply Quality
 */

const ZAI = require('z-ai-web-dev-sdk').default;
const fs = require('fs');
const path = require('path');

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
MarbMarket is a veDEX (Vote-Escrowed DEX) launching on MegaETH in Q2. First of its kind on MegaETH. No presale, no VC backing. Fully fair launch. Inspired by Solidly/Aerodrome.

## veDEX Mechanics:
- Users lock MARB tokens to gain veTokens (voting power)
- Longer lock = more influence + more rewards
- veHolders vote weekly on which LP pools get MARB emissions
- Projects can offer bribes to attract votes, creating decentralized incentive

## MARB Flywheel:
MARB Lockers direct emissions to LPs, LPs get rewards, Protocols pay bribes for votes, Incentives flow back to MARB Lockers.

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
    compliance_dash: "NEVER use em-dash (—), en-dash (–), or double-hyphen (--) — use period or comma instead",
    engagement_no_cta: "ALWAYS include a genuine open question that has NO obvious answer"
  },
  rules: [
    "Every claim must be factually verifiable",
    "Use concrete numbers and specific mechanisms, not vague references",
    "Opening line must be directly relevant to the topic, not clickbait",
    "@RallyOnChain mention: natural, contextual, with concrete mechanism",
    "End with genuine open question that author CANNOT answer",
    "No extra spaces, no formatting issues, NO dashes (use periods instead)",
    "Stay tightly aligned with campaign theme",
    "Varied paragraph/sentence lengths (mix 3-word + 15-word sentences)"
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

// ============ BANNED LISTS (from SKILL.md v9.5) ============

// TIER 1 — INSTANT GATE FAIL (Compliance 0)
const BANNED_WORDS_21 = ['guaranteed', 'guarantee', '100%', 'risk-free', 'sure thing', 'financial advice', 'investment advice', 'buy now', 'sell now', 'get rich', 'quick money', 'easy money', 'passive income', 'follow me', 'subscribe to my', 'check my profile', 'click here', 'limited time offer', 'act now', 'legally binding', 'court order', 'official ruling'];

const RALLY_BANNED_PHRASES_17 = ['vibe coding', 'skin in the game', 'trust layer', 'agent era', 'agentic era', 'structural shift', 'capital efficiency', 'how did I miss this', 'losing my mind', 'how are we all sleeping on this', "don't miss out", 'designed for creators that desire', 'transforming ideas into something sustainable', 'entire week', 'frictionless', 'acceptable originality'];

// TIER 2 — MUST FIX (score penalty)
const AI_WORDS_26 = ['delve', 'leverage', 'realm', 'tapestry', 'paradigm', 'landscape', 'nuance', 'underscores', 'pivotal', 'crucial', 'embark', 'journey', 'explore', 'unlock', 'harness', 'foster', 'utilize', 'elevate', 'streamline', 'empower', 'moreover', 'furthermore', 'consequently', 'nevertheless', 'notably', 'significantly', 'comprehensive'];

const TEMPLATE_PHRASES_21 = ['unpopular opinion:', 'hot take:', 'thread alert:', 'breaking:', 'this is your sign', 'psa:', 'reminder that', 'quick thread:', 'important thread:', 'drop everything', 'stop scrolling', 'hear me out', 'let me explain', 'nobody is talking about', 'story time:', 'in this thread i will', 'key takeaways:', "here's the thing", 'imagine a world where', 'picture this:', "let's dive in", 'at the end of the day', 'it goes without saying'];

const BANNED_STARTERS_8 = ['honestly', 'like, ', 'kind of wild', 'ngl', 'tbh', 'tbf', 'fr fr', 'lowkey'];

// TIER 3 — MINOR penalty
const AI_PATTERN_PHRASES_16 = ['picture this', "let's dive in", 'in this thread', 'key takeaways', "here's the thing", 'imagine a world', 'it goes without saying', 'at the end of the day', 'on the other hand', 'in conclusion', 'at its core', 'the reality is', "it's worth noting", 'make no mistake', 'the bottom line is', "here's what you need to know"];

// Additional AI words to avoid (from content-quality.md)
const EXTRA_AI_WORDS = ['flywheel', 'ecosystem', 'unpack', 'navigate', 'pioneering', 'seamless', 'robust', 'innovative', 'cutting-edge', 'game-changer', 'revolutionary', 'disrupt', 'transform', 'synergy', 'holistic', 'dynamic', 'bespoke', 'curated', 'impactful', 'resonate', 'propel', 'catalyst', 'unprecedented', 'multifaceted'];

// ============ SANITIZATION ENGINE (from SKILL.md v9.5) ============
function sanitizeContent(content) {
  let c = content;
  // 1. Remove em-dash characters (—, \u2014)
  c = c.replace(/\u2014/g, '. ');
  // 2. Remove en-dash characters (–, \u2013)
  c = c.replace(/\u2013/g, '. ');
  // 3. Remove double-hyphen used as dash substitute
  c = c.replace(/\s--\s/g, '. ');
  c = c.replace(/^--\s/g, '');
  c = c.replace(/\s--$/g, '');
  // 4. Replace smart/curly quotes with straight quotes
  c = c.replace(/\u201c/g, '"').replace(/\u201d/g, '"');
  c = c.replace(/\u2018/g, "'").replace(/\u2019/g, "'");
  // 5. Replace Unicode ellipsis with three dots
  c = c.replace(/\u2026/g, '...');
  // 6. Remove zero-width characters
  c = c.replace(/[\u200b\u200c\u200d\ufeff]/g, '');
  // 7. Trim leading/trailing whitespace per line
  c = c.split('\n').map(l => l.trim()).join('\n');
  // 8. Collapse multiple spaces to single space
  c = c.replace(/  +/g, ' ');
  // 9. Collapse multiple newlines to max 2
  c = c.replace(/\n{3,}/g, '\n\n');
  // 10. Strip wrapping quotes
  c = c.replace(/^["'`]+|["'`]+$/g, '');
  // 11. Remove markdown bold/italic
  c = c.replace(/\*\*/g, '').replace(/__/g, '').replace(/\*/g, '');
  // 12. Strip curly braces
  c = c.replace(/[{}]/g, '');
  return c;
}

// ============ LEARN PHASE — Load Rally Data ============
const DATA_DIR = '/home/z/my-project/upload/rally_logs_extracted';

function loadJson(filename) {
  try {
    const fp = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fp)) return null;
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch { return null; }
}

function extractLearnedKnowledge() {
  console.log('\n=== PHASE 0: LEARNING FROM RALLY DATA ===');

  const patternCache = loadJson('rally_pattern_cache.json');
  const knowledgeVault = loadJson('rally_knowledge_vault.json');
  const submissions = loadJson('rally_submissions_cache.json');
  const submissionsNew = loadJson('rally_submissions_cache_new.json');

  const learned = { patterns: [], techniques: [], antiAI: [], scoreData: null, topHooks: [], overused: [], failures: [], bestPractices: [] };

  if (patternCache) {
    console.log(`  Loaded pattern cache: ${patternCache.total_submissions_analyzed} submissions analyzed`);
    console.log(`  Score distribution: avg=${patternCache.score_distribution.avg}, 18/18 count=${patternCache.score_distribution.score_18}`);
    console.log(`  Category averages: ${JSON.stringify(patternCache.category_averages)}`);

    learned.scoreData = patternCache.score_distribution;
    learned.topHooks = patternCache.top_hooks || [];
    learned.overused = patternCache.overused_phrases || [];
    learned.failures = patternCache.common_failure_reasons || [];
    learned.bestPractices = patternCache.best_practices || [];

    if (patternCache.winning_patterns) {
      if (patternCache.winning_patterns.hook_styles) learned.patterns.push(...patternCache.winning_patterns.hook_styles);
      if (patternCache.winning_patterns.angle_success) learned.patterns.push(...patternCache.winning_patterns.angle_success);
      if (patternCache.winning_patterns.voice_traits) learned.patterns.push(...patternCache.winning_patterns.voice_traits);
      if (patternCache.winning_patterns.structure_traits) learned.patterns.push(...patternCache.winning_patterns.structure_traits);
    }

    console.log(`  Winning patterns: ${learned.patterns.length}`);
    console.log(`  Top hooks: ${learned.topHooks.length}`);
    console.log(`  Overused phrases: ${learned.overused.length}`);
    console.log(`  Common failures: ${learned.failures.length}`);
  }

  if (knowledgeVault) {
    console.log(`  Loaded knowledge vault: ${knowledgeVault.total_campaigns_worked} campaigns, ${knowledgeVault.total_18_18_achieved} perfect scores`);

    if (knowledgeVault.cross_campaign_lessons) {
      const lessons = knowledgeVault.cross_campaign_lessons;
      if (lessons.writing_techniques_ranked) {
        for (const t of lessons.writing_techniques_ranked) {
          learned.techniques.push(`${t.technique} (success: ${t.success_rate})`);
        }
      }
      if (lessons.anti_ai_checklist) {
        learned.antiAI = lessons.anti_ai_checklist;
      }
      if (lessons.hardest_dimensions_ranked) {
        console.log(`  Hardest dimensions: ${lessons.hardest_dimensions_ranked.map(d => d.dimension).join(', ')}`);
      }
      if (lessons.common_mistakes_to_avoid) {
        learned.overused.push(...lessons.common_mistakes_to_avoid);
      }
      if (lessons.best_hook_styles) {
        learned.topHooks.push(...lessons.best_hook_styles);
      }
    }

    console.log(`  Techniques learned: ${learned.techniques.length}`);
    console.log(`  Anti-AI rules: ${learned.antiAI.length}`);
  }

  const subCount = (submissions?.length || 0) + (submissionsNew?.length || 0);
  console.log(`  Total submission records loaded: ${subCount}`);

  console.log('  LEARNING COMPLETE ✓\n');
  return learned;
}

const LEARNED = extractLearnedKnowledge();

// ============ EVALUATION ENGINE (Updated per SKILL.md v9.5 — 23/23) ============
function evaluateContent(content) {
  const scores = { originality: 0, alignment: 0, accuracy: 0, compliance: 0, engagement: 0, technical: 0, reply_quality: 0 };
  const maxScores = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5, reply_quality: 5 };
  const feedback = [];
  let complianceFail = false;

  // ORIGINALITY (max 2)
  const uniqueMarkers = ['ve(3,3)', 'veDEX', 'vote-escrow', 'MARB', 'MegaETH', 'bribes'];
  const genericMarkers = ['crypto is the future', 'DeFi is changing', 'this is huge', 'massive opportunity'];
  let origScore = 1.2;
  let uniqueCount = 0;
  for (const m of uniqueMarkers) { if (content.toLowerCase().includes(m.toLowerCase())) uniqueCount++; }
  if (uniqueCount >= 3) origScore += 0.6;
  else if (uniqueCount >= 2) origScore += 0.4;
  else if (uniqueCount >= 1) origScore += 0.2;
  for (const m of genericMarkers) { if (content.toLowerCase().includes(m.toLowerCase())) origScore -= 0.2; }
  // AI words penalty (Tier 2)
  for (const w of AI_WORDS_26) { if (content.toLowerCase().includes(w.toLowerCase())) { origScore -= 0.3; feedback.push(`AI word: "${w}"`); } }
  // Extra AI words
  for (const w of EXTRA_AI_WORDS) { if (content.toLowerCase().includes(w.toLowerCase())) { origScore -= 0.2; feedback.push(`AI word: "${w}"`); } }
  // Template phrases penalty (Tier 2)
  for (const p of TEMPLATE_PHRASES_21) { if (content.toLowerCase().includes(p.toLowerCase())) { origScore -= 0.2; feedback.push(`Template phrase: "${p}"`); } }
  // AI pattern phrases (Tier 3)
  for (const p of AI_PATTERN_PHRASES_16) { if (content.toLowerCase().includes(p.toLowerCase())) { origScore -= 0.1; } }
  // Banned starters (Tier 2)
  const firstLine = content.split('\n')[0].trim().toLowerCase();
  for (const s of BANNED_STARTERS_8) { if (firstLine.startsWith(s)) { origScore -= 0.3; feedback.push(`Banned starter: "${s}"`); } }
  // Sentence variety check (CV > 0.30 = human)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length >= 3) {
    const lengths = sentences.map(s => s.trim().length);
    const mean = lengths.reduce((a, b) => a + b) / lengths.length;
    const stdDev = Math.sqrt(lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length);
    const cv = stdDev / mean;
    if (cv > 0.30) origScore += 0.2;
    else origScore -= 0.2;
  }
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
  if (content.toLowerCase().includes('lock') && (content.toLowerCase().includes('vote') || content.toLowerCase().includes('governance'))) accScore += 0.2;
  scores.accuracy = Math.max(0, Math.min(2, accScore));

  // COMPLIANCE (max 2)
  let compScore = 1.8;
  const hasMarbMarket = content.toLowerCase().includes('marbmarket') || content.toLowerCase().includes('marb market');
  const hasVedex = content.toLowerCase().includes('vedex') || content.toLowerCase().includes('ve dex');
  const hasLink = content.includes('x.com/Marb_market') || content.includes('t.me/marbmarket');
  const hasFeature = ['vote-escrow', 'bribes', 'lp farming', 'fair launch', 've(3,3)', 'liquidity pool'].some(f => content.toLowerCase().includes(f));
  const hasRallyMention = content.includes('@RallyOnChain');

  if (!hasMarbMarket) { compScore -= 0.5; feedback.push('Missing: MarbMarket mention'); }
  if (!hasVedex) { compScore -= 0.3; feedback.push('Missing: veDEX explanation'); }
  if (!hasLink) { compScore -= 0.3; feedback.push('Missing: x.com/Marb_market'); }
  if (!hasFeature) { compScore -= 0.3; feedback.push('Missing: key feature'); }
  if (!hasRallyMention) { compScore -= 0.3; feedback.push('Missing: @RallyOnChain mention'); }

  // TIER 1: Banned words (21) — INSTANT FAIL
  for (const w of BANNED_WORDS_21) { if (content.toLowerCase().includes(w.toLowerCase())) { compScore = 0; complianceFail = true; feedback.push(`BANNED: "${w}"`); break; } }
  // TIER 1: Rally banned phrases (17) — INSTANT FAIL
  if (!complianceFail) {
    for (const p of RALLY_BANNED_PHRASES_17) { if (content.toLowerCase().includes(p.toLowerCase())) { compScore = 0; complianceFail = true; feedback.push(`BANNED phrase: "${p}"`); break; } }
  }
  // EN-DASH / EM-DASH — Compliance 0
  if (/\u2014/.test(content) || /\u2013/.test(content)) { compScore = 0; complianceFail = true; feedback.push('EM-DASH/EN-DASH detected!'); }
  if (/\s--\s/.test(content) || /^--\s/.test(content)) { compScore = 0; complianceFail = true; feedback.push('DOUBLE-HYPHEN DASH detected!'); }
  // Hashtag — Compliance 0
  if (/#[A-Za-z]/.test(content)) { compScore = 0; complianceFail = true; feedback.push('HASHTAG detected!'); }
  // Starts with @mention
  const strippedFirst = content.split('\n')[0].trim();
  if (strippedFirst.startsWith('@')) { compScore -= 0.3; feedback.push('Starts with @mention'); }
  // Smart quotes
  if (/[\u201c\u201d\u2018\u2019]/.test(content)) { compScore -= 0.3; feedback.push('Smart/curly quotes'); }
  // Double spaces
  if (/  /.test(content)) { compScore -= 0.3; feedback.push('Double spaces'); }
  scores.compliance = Math.max(0, Math.min(2, compScore));

  // ENGAGEMENT (max 5)
  let engScore = 3.0;
  const hasCTA = /\?/.test(content) || /what about you/i.test(content) || /what do you think/i.test(content)
    || /share your/i.test(content) || /thoughts\?/i.test(content) || /agree\?/i.test(content)
    || /have you/i.test(content) || /try it/i.test(content);
  const hasHook = content.split('\n')[0].trim().length < 80 && content.split('\n')[0].trim().length > 10;
  const isPunchy = content.split('\n').some(line => line.trim().length > 0 && line.trim().length < 40);
  const hasRhythm = (content.match(/\./g) || []).length >= 3;

  if (hasCTA) engScore += 0.8; else { engScore -= 0.5; feedback.push('Missing: CTA (question)'); }
  if (hasHook) engScore += 0.4;
  if (isPunchy) engScore += 0.3;
  if (hasRhythm) engScore += 0.3;
  if (content.toLowerCase().includes('early') || content.toLowerCase().includes('first')) engScore += 0.2;
  scores.engagement = Math.max(0, Math.min(5, engScore));

  // TECHNICAL (max 5)
  let techScore = 4.5;
  if (!/  /.test(content) && content.trim() === content) techScore += 0.3;
  if (/  /.test(content)) { techScore -= 0.5; feedback.push('Extra whitespace'); }
  if (content.length > 50 && content.length < 2000) techScore += 0.2;
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length >= 3 && lines.length <= 15) techScore += 0.2;
  if (/[\u201c\u201d\u2018\u2019]/.test(content)) { techScore -= 0.5; feedback.push('Smart quotes'); }
  if (/\u2026/.test(content)) { techScore -= 0.3; feedback.push('Unicode ellipsis'); }
  if (/[\u200b\u200c\u200d\ufeff]/.test(content)) { techScore -= 0.3; feedback.push('Zero-width chars'); }
  const techSentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (techSentences.length >= 4) {
    const shortCount = techSentences.filter(s => s.trim().split(/\s+/).length <= 5).length;
    const longCount = techSentences.filter(s => s.trim().split(/\s+/).length >= 10).length;
    if (shortCount > 0 && longCount > 0) techScore += 0.2;
  }
  scores.technical = Math.max(0, Math.min(5, techScore));

  // REPLY QUALITY (max 5) — NEW per SKILL.md v9.5
  let replyScore = 3.0;
  const lastLine = content.split('\n').filter(l => l.trim()).pop() || '';
  const hasQuestion = /\?/.test(lastLine) || /\?/.test(content);
  const genuineQ = ['what about you', 'what do you think', 'thoughts?', 'agree?', 'have you', 'your take', "what's your", 'how about', 'anyone else', "can't figure out", 'maybe I', 'most overlooked', 'your experience'];
  const rhetoricalQ = ['right?', 'correct?', 'make sense?', 'obviously', 'clearly'];
  let hasGenuineQ = false;
  for (const q of genuineQ) { if (content.toLowerCase().includes(q)) { hasGenuineQ = true; break; } }
  let hasRhetoricalQ = false;
  for (const q of rhetoricalQ) { if (content.toLowerCase().includes(q)) { hasRhetoricalQ = true; break; } }
  if (hasGenuineQ && !hasRhetoricalQ) replyScore += 1.5;
  else if (hasQuestion && !hasRhetoricalQ) replyScore += 0.8;
  else if (hasRhetoricalQ) replyScore -= 0.5;
  else replyScore -= 1.0;
  // Vulnerability bonus
  const vulnerability = ["i can't", 'not sure', 'maybe', 'honestly', 'i might be', 'could be wrong'];
  for (const v of vulnerability) { if (content.toLowerCase().includes(v)) { replyScore += 0.3; break; } }
  // @RallyOnChain + question bonus
  if (content.includes('@RallyOnChain') && hasQuestion) replyScore += 0.5;
  scores.reply_quality = Math.max(0, Math.min(5, replyScore));

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxTotal = 23; // 2+2+2+2+5+5+5
  const grade = total >= 22 ? 'S+' : total >= 21 ? 'S' : total >= 19 ? 'A+' : total >= 17 ? 'A' : total >= 15 ? 'B+' : total >= 13 ? 'B' : total >= 11 ? 'C' : 'D';

  return { scores, maxScores, total: Math.round(total * 10) / 10, maxTotal, grade, feedback, complianceFail };
}

// ============ GENERATION ============
function buildBasePrompt(variationHint) {
  const learnedContext = [];

  if (LEARNED.patterns.length > 0) {
    learnedContext.push(`WINNING PATTERNS (from ${LEARNED.scoreData?.count || 0}+ Rally submissions analyzed):`);
    for (const p of LEARNED.patterns.slice(0, 8)) learnedContext.push(`  + ${p}`);
  }

  if (LEARNED.topHooks.length > 0) {
    learnedContext.push('\nTOP HOOKS that scored 18/18:');
    for (const h of LEARNED.topHooks.slice(0, 5)) learnedContext.push(`  >> ${h}`);
  }

  if (LEARNED.techniques.length > 0) {
    learnedContext.push('\nTECHNIQUES THAT WORKED:');
    for (const t of LEARNED.techniques.slice(0, 6)) learnedContext.push(`  OK: ${t}`);
  }

  if (LEARNED.overused.length > 0) {
    learnedContext.push('\nOVERUSED PHRASES (NEVER use these):');
    for (const o of LEARNED.overused.slice(0, 10)) learnedContext.push(`  X: ${o}`);
  }

  if (LEARNED.failures.length > 0) {
    learnedContext.push('\nCOMMON FAILURE REASONS:');
    for (const f of LEARNED.failures.slice(0, 5)) {
      learnedContext.push(`  WARN: ${f.issue} (${f.count} submissions failed). Fix: ${f.fix}`);
    }
  }

  if (LEARNED.antiAI.length > 0) {
    learnedContext.push('\nANTI-AI RULES:');
    for (const rule of LEARNED.antiAI.slice(0, 6)) learnedContext.push(`  NO: ${rule}`);
  }

  return `You are a Rally.fun content creator. Write like a human DeFi native, NOT an AI.

CAMPAIGN: "${CAMPAIGN.title}"
Reward: ${CAMPAIGN.reward}
Creator: ${CAMPAIGN.creator}

MISSION: "${MISSION_0.title}"
${MISSION_0.description}

MISSION RULES:
${MISSION_0.rules.map(r => '- ' + r).join('\n')}

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}

CAMPAIGN RULES:
${CAMPAIGN_RULES.map(r => '- ' + r).join('\n')}

=== LEARNED FROM RALLY DATA ===
${learnedContext.join('\n')}

=== V3 LESSONS (our own scoring experience) ===
${V3_LESSONS.rules.map(r => '- ' + r).join('\n')}

PAST MISTAKES:
${Object.values(V3_LESSONS.losses).map(l => '- ' + l).join('\n')}

=== HARD FORMAT RULES (ZERO TOLERANCE) ===
1. NO em-dash (---), NO en-dash (--), NO double-hyphen (--) as dash. Use period or comma instead.
2. NO smart/curly quotes. Use straight quotes only.
3. NO hashtags (#crypto, #web3, etc).
4. NO starting with @mention.
5. NO banned words: guaranteed, 100%, risk-free, buy now, get rich, passive income, etc.
6. NO Rally banned phrases: vibe coding, skin in the game, trust layer, agent era, frictionless, don't miss out, etc.
7. NO AI words: delve, leverage, paradigm, tapestry, landscape, nuance, crucial, pivotal, embark, harness, foster, utilize, elevate, streamline, empower, comprehensive, realm, flywheel, ecosystem, seamless, robust, innovative, cutting-edge, game-changer, revolutionary, disrupt, transform, synergy, holistic, dynamic.
8. NO template phrases: hot take, let's dive in, nobody is talking about, unpopular opinion, thread alert, picture this, at the end of the day, key takeaways, here's the thing.
9. Use contractions naturally: don't, can't, won't, I'm, that's.
10. Vary paragraph/sentence lengths. Mix 3-word sentences with 15-word ones.
11. End with genuine open question that has NO obvious answer.
12. Include @RallyOnChain mention naturally (NOT at start).
13. Include x.com/Marb_market link.

${variationHint}

Write a single tweet/X post (or short thread of 2-3 tweets).
Output ONLY the tweet content. No explanations, no labels.
REMEMBER: Use periods and commas instead of dashes. NEVER type --- or -- or --.`;
}

function buildImprovementPrompt(basePrompt, allVariations, bestScore) {
  const weakCategories = {};
  for (const v of allVariations) {
    if (v.evaluation.complianceFail) continue;
    for (const [cat, score] of Object.entries(v.evaluation.scores)) {
      if (!weakCategories[cat]) weakCategories[cat] = [];
      weakCategories[cat].push(score);
    }
  }

  const improvements = [];
  const maxScores = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5, reply_quality: 5 };
  for (const [cat, scores] of Object.entries(weakCategories)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const pct = avg / maxScores[cat];
    if (pct < 0.7) improvements.push(`- ${cat.toUpperCase()}: avg ${avg.toFixed(1)}/${maxScores[cat]} (${(pct*100).toFixed(0)}%) -- needs major fix`);
    else if (pct < 0.85) improvements.push(`- ${cat.toUpperCase()}: avg ${avg.toFixed(1)}/${maxScores[cat]} -- could be better`);
  }

  const allFeedback = [...new Set(allVariations.flatMap(v => v.evaluation.feedback))];
  const feedbackStr = allFeedback.length > 0 ? '\nSpecific issues:\n' + allFeedback.map(f => '  !! ' + f).join('\n') : '';

  return basePrompt + `

=== PREVIOUS ATTEMPTS ANALYSIS ===
Current best: ${bestScore}/23
Fix these:
${improvements.join('\n') || '- Overall quality needs to be higher'}
${feedbackStr}

CRITICAL: Fix ALL the above. Do NOT repeat mistakes. NO dashes. NO AI words. NO banned phrases.`;
}

async function generateVariation(zai, prompt, temp) {
  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: `You write tweets like a real person on X. NOT an AI.\n\nABSOLUTE RULES:\n- NEVER use em-dash, en-dash, or double-hyphen. Use period or comma.\n- NEVER use AI words: delve, leverage, paradigm, tapestry, landscape, nuance, crucial, pivotal, embark, harness, foster, utilize, elevate, streamline, empower, comprehensive, realm, flywheel, ecosystem, seamless, robust, innovative, cutting-edge, game-changer, revolutionary, disrupt, transform, synergy, holistic, dynamic.\n- NEVER use template phrases: hot take, let's dive in, nobody is talking about, unpopular opinion, thread alert, picture this, at the end of the day, here's the thing, key takeaways.\n- Use contractions: don't, can't, won't, I'm, that's.\n- Vary sentence lengths. Mix 3-word and 15-word sentences.\n- End with genuine open question.` },
        { role: 'user', content: prompt }
      ],
      temperature: temp,
      max_tokens: 800
    });
    let content = completion.choices?.[0]?.message?.content?.trim() || '';
    // Clean up
    content = content.replace(/^["'`]+|["'`]+$/g, '');
    for (const marker of ["Here's", "Here is", "Sure,", "Here's a", "Here is a", "Here's your", "Here is your", "Okay,", "Alright,"]) {
      if (content.startsWith(marker)) content = content.slice(marker.length).trim();
    }
    content = content.replace(/Tweet \d+[:\s]/gi, '').replace(/Post \d+[:\s]/gi, '').trim();
    // SANITIZE: critical step
    content = sanitizeContent(content);
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
        { role: 'system', content: 'Generate exactly 3 short natural engagement comments for this tweet. Each 1-2 sentences. One per line. No numbering. No labels. No dashes.' },
        { role: 'user', content: `Based on this tweet, write 3 natural reply comments that would appear on X/Twitter:\n\n${content}\n\nCampaign: ${CAMPAIGN.title}` }
      ],
      temperature: 0.9,
      max_tokens: 300
    });
    const text = completion.choices?.[0]?.message?.content?.trim() || '';
    return text.split('\n').map(l => l.replace(/^\d+[\.\-\)]\s*/, '').trim()).filter(l => l.length > 0).slice(0, 3);
  } catch (e) {
    return [
      'This veDEX model is interesting. How does the bribe mechanism work in practice?',
      'Fair launch with no VCs is the way to go. What chain has the most veDEX activity right now?',
      'The lock duration mechanic creates good incentive alignment. Would love to see emission data after launch.'
    ];
  }
}

// ============ MAIN LOOP ============
async function main() {
  console.log('===========================================');
  console.log('RALLY BRAIN v4.0 — LEARN + SANITIZE + GENERATE');
  console.log('===========================================');
  console.log(`Campaign: ${CAMPAIGN.title}`);
  console.log(`Mission: ${MISSION_0.title}`);
  console.log(`Target: >= 16/23 (Level 2 Quality)`);
  console.log(`Scoring: 7 categories, max 23/23 per SKILL.md v9.5`);
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
      ? ['Focus on the MARB incentive loop and how rewards compound.', 'Compare veDEX model to traditional DEX. Why vote-escrow wins.', 'Early opportunity angle: what getting in on a fair launch veDEX means.']
      : loop === 3
      ? ['Deep dive into how bribes work in ve(3,3) and why it matters.', 'Break down each feature of MarbMarket step by step.', 'Contrarian take: why most DEX models fail and ve(3,3) is different.']
      : loop === 4
      ? ['Simplify veDEX to basics anyone can understand.', 'Focus on MegaETH as the chain and MarbMarket as the killer app.', 'Emotional angle: why community ownership beats VC-backed launches.']
      : ['Most creative angle possible. Teach veDEX like telling a story.', 'Technical breakdown for experienced DeFi users.', 'Combine fair launch + governance + yield in one narrative.'];

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

      // Check for em-dash/en-dash in output
      if (/\u2014/.test(content) || /\u2013/.test(content) || /\s--\s/.test(content)) {
        console.log(`  Variation ${i + 1}: REJECTED (contains dash character after sanitization)`);
        continue;
      }

      // Skip compliance fails
      if (evaluation.complianceFail) {
        console.log(`  Variation ${i + 1}: COMPLIANCE FAIL (${evaluation.feedback.filter(f => f.includes('BANNED') || f.includes('DASH') || f.includes('HASHTAG')).join(', ')})`);
        allVariations.push({ content, evaluation, loop, variation: i + 1, temperature: temp });
        continue;
      }

      console.log(`  Variation ${i + 1}: ${evaluation.total}/23 (${evaluation.grade})`);
      if (evaluation.feedback.length > 0) {
        console.log(`    Feedback: ${evaluation.feedback.slice(0, 3).join(', ')}`);
      }

      const variation = { content, evaluation, loop, variation: i + 1, temperature: temp };
      allVariations.push(variation);

      if (evaluation.total > bestEver.score) {
        bestEver = { content, score: evaluation.total, grade: evaluation.grade, evaluation, loop, variation: i + 1 };
        console.log(`  * NEW BEST: ${evaluation.total}/23 (${evaluation.grade})`);
      }
    }

    console.log(`\n  Loop ${loop} best: ${bestEver.score}/23`);

    if (bestEver.score >= THRESHOLD) {
      console.log(`\n  THRESHOLD MET! Best: ${bestEver.score}/23 (${bestEver.grade})`);
      break;
    } else {
      console.log(`  Below threshold ${THRESHOLD}. Improving...`);
      basePrompt = buildImprovementPrompt(basePrompt, allVariations, bestEver.score);
    }
  }

  // Generate Q&A
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
      grade: v.evaluation.grade,
      complianceFail: v.evaluation.complianceFail || false
    }))
  };

  console.log('\n===========================================');
  console.log('FINAL RESULT');
  console.log('===========================================');
  console.log(`Score: ${bestEver.score}/23 (${bestEver.grade})`);
  console.log(`Variations tested: ${allVariations.length}`);
  console.log(`Compliance fails: ${allVariations.filter(v => v.evaluation.complianceFail).length}`);
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
  fs.writeFileSync(path.join(outputDir, 'full_output.json'), JSON.stringify(output, null, 2));

  console.log(`\nOutput saved to: ${outputDir}/`);

  return output;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
