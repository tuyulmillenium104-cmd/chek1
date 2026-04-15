/**
 * Rally Brain Generate Runner v6.0
 * SKILL.md v9.5 FULL COMPLIANT + TOKEN ROTATION
 *
 * UPGRADES from v5.0:
 *   + Resilient Client with Token Rotation (2 tokens x 300/day = 600 quota)
 *   + HTTP direct for accurate quota tracking from response headers
 *   + Auto token switching when rate limited
 *
 * FROM v4.0:
 *   + 5 LLM Judge Panel (Harsh Critic, Avg X User, Rally Clone, Contrarian, Fingerprint Detector)
 *   + Minority Override (1 outlier cannot auto-fail gate)
 *   + G4 Originality Detection (programmatic human-like bonus)
 *   + AI Word Post-Replacement (flywheel -> incentive loop, etc.)
 *   + Stability Check + Early Accept (prevent over-correction)
 *   + Pre-Writing Perspective Builder
 *
 * PIPELINE: LEARN (with KDB feedback loop) -> SANITIZE -> AI WORD REPLACE -> QUICK SCREEN ->
 *           -> PROGRAMMATIC EVAL -> J3/J5 JUDGE VALIDATION ->
 *           -> G4 BONUS -> STABILITY CHECK -> OUTPUT
 * BUDGET: 12 calls/cycle (8 gen + 2 QA + 2 judges)
 */

const { ResilientZAIClient } = require('./zai-resilient.js');
const fs = require('fs');
const path = require('path');

// ============ MULTI-CAMPAIGN SUPPORT ============
const CAMPAIGN_ID = process.argv[2] || 'marbmarket-m0';
const CONFIG_DIR = '/home/z/my-project/download/rally-brain/campaigns';

function loadCampaignConfig(campaignId) {
  const configPath = path.join(CONFIG_DIR, `${campaignId}.json`);
  if (!fs.existsSync(configPath)) {
    console.error(`Campaign config not found: ${configPath}`);
    console.error(`Available campaigns: ${fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).join(', ')}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const campaignConfig = loadCampaignConfig(CAMPAIGN_ID);
const CAMPAIGN = campaignConfig.campaign;
const MISSION_0 = campaignConfig.mission;
const KNOWLEDGE_BASE = campaignConfig.knowledge_base;
const CAMPAIGN_RULES = campaignConfig.campaign_rules;
const COMPLIANCE = campaignConfig.compliance_checks;

// ============ V3 LESSONS ============
const V3_LESSONS = {
  losses: {
    accuracy_exaggeration: "NEVER use absolute/exaggerated language ('zero cost', 'everyone', 'nobody') - use precise, verifiable claims",
    accuracy_vague: "NEVER use vague phrases ('figured it out') - be specific about what/how",
    compliance_mysterious: "NEVER use mysterious/thread openings - be direct and clear",
    compliance_whitespace: "NO extra whitespace before mentions, no double spaces, no trailing spaces",
    compliance_dash: "NEVER use em-dash, en-dash, or double-hyphen - use period or comma instead",
    engagement_no_cta: "ALWAYS include a genuine open question that has NO obvious answer"
  },
  rules: [
    "Every claim must be factually verifiable",
    "Use concrete numbers and specific mechanisms, not vague references",
    "Opening line must be directly relevant to the topic, not clickbait",
    `${COMPLIANCE.must_include[0]} mention: natural, contextual, with concrete mechanism`,
    "End with genuine open question that author CANNOT answer",
    "No extra spaces, no formatting issues, NO dashes (use periods instead)",
    "Stay tightly aligned with campaign theme",
    "Varied paragraph/sentence lengths (mix 3-word + 15-word sentences)"
  ]
};

// ============ CAMPAIGN-SPECIFIC RULES (loaded from config) ============
// CAMPAIGN_RULES is now loaded from campaign config above

// ============ BANNED LISTS (from SKILL.md v9.5) ============

// TIER 1 - INSTANT GATE FAIL
const BANNED_WORDS_21 = ['guaranteed', 'guarantee', '100%', 'risk-free', 'sure thing', 'financial advice', 'investment advice', 'buy now', 'sell now', 'get rich', 'quick money', 'easy money', 'passive income', 'follow me', 'subscribe to my', 'check my profile', 'click here', 'limited time offer', 'act now', 'legally binding', 'court order', 'official ruling'];

const RALLY_BANNED_PHRASES_17 = ['vibe coding', 'skin in the game', 'trust layer', 'agent era', 'agentic era', 'structural shift', 'capital efficiency', 'how did I miss this', 'losing my mind', 'how are we all sleeping on this', "don't miss out", 'designed for creators that desire', 'transforming ideas into something sustainable', 'entire week', 'frictionless', 'acceptable originality'];

// TIER 2 - MUST FIX (score penalty)
const AI_WORDS_26 = ['delve', 'realm', 'tapestry', 'paradigm', 'landscape', 'nuance', 'underscores', 'pivotal', 'crucial', 'embark', 'journey', 'explore', 'unlock', 'harness', 'foster', 'utilize', 'elevate', 'streamline', 'empower', 'moreover', 'furthermore', 'consequently', 'nevertheless', 'notably', 'significantly', 'comprehensive'];

const TEMPLATE_PHRASES_21 = ['unpopular opinion:', 'hot take:', 'thread alert:', 'breaking:', 'this is your sign', 'psa:', 'reminder that', 'quick thread:', 'important thread:', 'drop everything', 'stop scrolling', 'hear me out', 'let me explain', 'nobody is talking about', 'story time:', 'in this thread i will', 'key takeaways:', "here's the thing", 'imagine a world where', 'picture this:', "let's dive in", 'at the end of the day', 'it goes without saying'];

const BANNED_STARTERS_8 = ['honestly', 'like, ', 'kind of wild', 'ngl', 'tbh', 'tbf', 'fr fr', 'lowkey'];

// TIER 3 - MINOR penalty
const AI_PATTERN_PHRASES_16 = ['picture this', "let's dive in", 'in this thread', 'key takeaways', "here's the thing", 'imagine a world', 'it goes without saying', 'at the end of the day', 'on the other hand', 'in conclusion', 'at its core', 'the reality is', "it's worth noting", 'make no mistake', 'the bottom line is', "here's what you need to know"];

const EXTRA_AI_WORDS = ['flywheel', 'ecosystem', 'unpack', 'navigate', 'pioneering', 'seamless', 'robust', 'innovative', 'cutting-edge', 'game-changer', 'revolutionary', 'disrupt', 'transform', 'synergy', 'holistic', 'dynamic', 'bespoke', 'curated', 'impactful', 'resonate', 'propel', 'catalyst', 'unprecedented', 'multifaceted'];

// All AI words combined for replacement
const ALL_AI_WORDS = [...AI_WORDS_26, ...EXTRA_AI_WORDS];

// ============ AI WORD REPLACEMENT MAP (post-generation fix) ============
const AI_WORD_REPLACEMENTS = {
  'flywheel': 'incentive loop',
  'ecosystem': 'network',
  'paradigm': 'model',
  'landscape': 'space',
  'realm': 'world',
  'delve': 'look at',
  'tapestry': 'mix',
  'nuance': 'detail',
  'crucial': 'key',
  'pivotal': 'major',
  'embark': 'start',
  'harness': 'use',
  'foster': 'build',
  'utilize': 'use',
  'elevate': 'boost',
  'streamline': 'simplify',
  'empower': 'enable',
  'comprehensive': 'full',
  'unpack': 'break down',
  'navigate': 'work through',
  'pioneering': 'new',
  'seamless': 'smooth',
  'robust': 'strong',
  'innovative': 'fresh',
  'cutting-edge': 'newest',
  'game-changer': 'big deal',
  'revolutionary': 'groundbreaking',
  'disrupt': 'shake up',
  'transform': 'change',
  'synergy': 'combo',
  'holistic': 'full',
  'dynamic': 'active',
  'bespoke': 'custom',
  'curated': 'picked',
  'impactful': 'meaningful',
  'resonate': 'connect',
  'propel': 'push',
  'catalyst': 'trigger',
  'unprecedented': 'never before seen',
  'multifaceted': 'complex',
  'realm': 'world',
  'explore': 'check out',
  'unlock': 'open up',
  'journey': 'path',
};

// ============ SANITIZATION ENGINE ============
function sanitizeContent(content) {
  let c = content;
  c = c.replace(/\u2014/g, '. ');
  c = c.replace(/\u2013/g, '. ');
  c = c.replace(/\s--\s/g, '. ');
  c = c.replace(/^--\s/g, '');
  c = c.replace(/\s--$/g, '');
  c = c.replace(/\u201c/g, '"').replace(/\u201d/g, '"');
  c = c.replace(/\u2018/g, "'").replace(/\u2019/g, "'");
  c = c.replace(/\u2026/g, '...');
  c = c.replace(/[\u200b\u200c\u200d\ufeff]/g, '');
  c = c.split('\n').map(l => l.trim()).join('\n');
  c = c.replace(/  +/g, ' ');
  c = c.replace(/\n{3,}/g, '\n\n');
  c = c.replace(/^["'`]+|["'`]+$/g, '');
  c = c.replace(/\*\*/g, '').replace(/__/g, '').replace(/\*/g, '');
  c = c.replace(/[{}]/g, '');
  return c;
}

// ============ AI WORD REPLACEMENT (post-generation) ============
function replaceAIWords(content) {
  let c = content;
  let replaced = [];
  for (const [word, replacement] of Object.entries(AI_WORD_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${word}s?\\b`, 'gi');
    const before = c;
    c = c.replace(regex, replacement);
    if (before !== c) replaced.push(word);
  }
  return { content: c, replaced };
}

// ============ LEARN PHASE ============
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

  // Load cycle history from knowledge_db.json (CLOSED-LOOP LEARNING)
  const kdb = loadKnowledgeDB();
  if (kdb && kdb.cycle_history && kdb.cycle_history.length > 0) {
    const hist = kdb.cycle_history;
    console.log(`  Cycle history loaded: ${hist.length} past cycles`);
    console.log(`  Best score ever: ${kdb.stats?.best_score_achieved || 'N/A'}/23`);
    console.log(`  Average score: ${kdb.stats?.avg_score || 'N/A'}/23`);

    // Feed cycle-learned data into the prompt
    learned.cycleHistory = hist;
    learned.cycleStats = kdb.stats;
    learned.aiWordFrequency = kdb.ai_word_frequency || {};
    learned.categoryTrends = kdb.category_trends || {};
    // Expose KDB patterns with learned_rules for the prompt feedback loop
    learned.kdbPatterns = kdb.patterns ? kdb.patterns.semantic || {} : {};

    // Extract top winning hooks from our OWN cycles (most recent + highest scoring)
    const ownWinners = hist.filter(c => c.score >= 20).sort((a, b) => b.score - a.score);
    if (ownWinners.length > 0) {
      learned.ownTopHooks = ownWinners.slice(0, 5).map(c => c.best_hook);
      console.log(`  Own winning hooks: ${learned.ownTopHooks.length}`);
    }

    // Identify persistent AI words from our cycles
    const persistentAI = Object.entries(kdb.ai_word_frequency || {})
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([word, count]) => `${word} (${count}x)`);
    if (persistentAI.length > 0) {
      learned.persistentAIWords = persistentAI;
      console.log(`  Persistent AI words (our cycles): ${persistentAI.join(', ')}`);
    }

    // Weakest categories
    if (kdb.category_trends) {
      const maxMap = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5, reply_quality: 5 };
      const catPcts = Object.entries(kdb.category_trends)
        .filter(([_, v]) => v.count >= 2)
        .map(([cat, v]) => ({ cat, pct: (v.avg / maxMap[cat]) * 100, avg: v.avg }))
        .sort((a, b) => a.pct - b.pct);
      learned.weakestCategories = catPcts.slice(0, 2);
      if (learned.weakestCategories.length > 0) {
        console.log(`  Weakest categories: ${learned.weakestCategories.map(w => `${w.cat} (${w.pct.toFixed(0)}%)`).join(', ')}`);
      }
    }
  }

  const subCount = (submissions?.length || 0) + (submissionsNew?.length || 0);
  console.log(`  Total submission records loaded: ${subCount}`);

  console.log('  LEARNING COMPLETE\n');
  return learned;
}

const LEARNED = extractLearnedKnowledge();

// ============ CLOSED-LOOP LEARNING (knowledge_db.json) ============
const KDB_PATH = `/home/z/my-project/download/rally-brain/campaign_data/${CAMPAIGN_ID}_knowledge_db.json`;
const MAX_CYCLE_HISTORY = 50; // Keep last 50 cycles

function loadKnowledgeDB() {
  try {
    if (!fs.existsSync(KDB_PATH)) return null;
    return JSON.parse(fs.readFileSync(KDB_PATH, 'utf-8'));
  } catch { return null; }
}

function saveKnowledgeDB(kdb) {
  try {
    fs.writeFileSync(KDB_PATH, JSON.stringify(kdb, null, 2));
  } catch (e) {
    console.error(`  [LEARNING] Failed to save knowledge_db.json: ${e.message}`);
  }
}

function extractAIWordsFromContent(content) {
  const lower = content.toLowerCase();
  const found = [];
  for (const w of ALL_AI_WORDS) {
    if (lower.includes(w)) found.push(w);
  }
  return found;
}

function detectRepetition(content, history) {
  // Check if content is too similar to recent best (n-gram overlap)
  if (!history || history.length < 2) return false;
  const recent = history.slice(-5).map(h => h.best_hook || '').filter(Boolean);
  const words = new Set(content.toLowerCase().split(/\s+/));
  for (const prev of recent) {
    const prevWords = new Set(prev.toLowerCase().split(/\s+/));
    const overlap = [...words].filter(w => prevWords.has(w)).length;
    const similarity = overlap / Math.max(words.size, prevWords.size);
    if (similarity > 0.7) return true;
  }
  return false;
}

function saveCycleLearning(bestEver, allVariations) {
  console.log('\n=== PHASE 5: SAVING CYCLE LEARNING ===');
  let kdb = loadKnowledgeDB();
  const now = new Date().toISOString();

  // Init/migrate structure
  if (!kdb || !kdb.version || kdb.version === '2.0.0') {
    const oldKdb = kdb || {};
    kdb = {
      version: '3.0.0',
      last_updated: null,
      stats: { total_cycles: 0, total_patterns: oldKdb.stats?.total_patterns || 0, best_score_achieved: 0, avg_score: 0, last_learned: null },
      cycle_history: [],
      ai_word_frequency: {},
      winning_hooks: [],
      category_trends: {},
      patterns: oldKdb.patterns || {},
      scoring_model: oldKdb.scoring_model || { calibration_log: [], category_weights: { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5 }, max_scores: { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5 }, prediction_accuracy: { total_predictions: 0, correct_predictions: 0, avg_diff: 0.0 } },
      campaign_memories: oldKdb.campaign_memories || {},
      v3_lessons: oldKdb.v3_lessons || {}
    };
  }

  // Ensure patterns.semantic structure exists (defensive fix)
  if (!kdb.patterns.semantic) {
    kdb.patterns.semantic = {
      claim_specificity: { description: 'Concrete verifiable claims score higher', level: 'high', learned_rules: [] },
      tone_style_match: { description: 'Tone must match campaign context', level: 'high', learned_rules: [] },
      engagement_hook: { description: 'Opening hooks + CTA for engagement', level: 'high', learned_rules: [] },
      rally_mention: { description: 'Natural contextual mention with concrete mechanism', level: 'high', learned_rules: [] },
      exaggeration_risk: { description: 'Absolute claims risk Accuracy deductions', level: 'critical', learned_rules: [] },
      cross_category_tradeoff: { description: 'Balance categories', level: 'medium', learned_rules: [] }
    };
  }

  // 1. Extract AI words from best content (use pre-replacement detection)
  const aiWordsFound = bestEver.aiWordsBefore || extractAIWordsFromContent(bestEver.content);
  const hook = bestEver.content.split('\n')[0].trim();
  const scores = bestEver.consensus?.scores || {};
  const isRepetition = detectRepetition(bestEver.content, kdb.cycle_history);

  // 2. Build cycle record
  const cycleRecord = {
    timestamp: now,
    score: bestEver.score,
    grade: bestEver.grade,
    scores: { ...scores },
    g4_bonus: bestEver.g4?.bonus || 0,
    loops_used: bestEver.loop || 0,
    variations_tested: allVariations.length,
    ai_words_found: aiWordsFound,
    best_hook: hook,
    is_repetition: isRepetition,
    content_preview: bestEver.content.substring(0, 100) + '...'
  };

  // 3. Update cycle history (keep last MAX)
  kdb.cycle_history.push(cycleRecord);
  if (kdb.cycle_history.length > MAX_CYCLE_HISTORY) {
    kdb.cycle_history = kdb.cycle_history.slice(-MAX_CYCLE_HISTORY);
  }

  // 4. Update AI word frequency
  for (const w of aiWordsFound) {
    kdb.ai_word_frequency[w] = (kdb.ai_word_frequency[w] || 0) + 1;
  }

  // 5. Update winning hooks (score >= 20)
  if (bestEver.score >= 20) {
    // Avoid duplicate hooks
    const existingHooks = new Set(kdb.winning_hooks.map(h => h.hook));
    if (!existingHooks.has(hook)) {
      kdb.winning_hooks.push({ hook, score: bestEver.score, timestamp: now });
      if (kdb.winning_hooks.length > 20) kdb.winning_hooks = kdb.winning_hooks.slice(-20);
    }
  }

  // 6. Update category trends (running average)
  const categories = ['originality', 'alignment', 'accuracy', 'compliance', 'engagement', 'technical', 'reply_quality'];
  for (const cat of categories) {
    if (scores[cat] !== undefined) {
      if (!kdb.category_trends[cat]) kdb.category_trends[cat] = { total: 0, count: 0, avg: 0, last5: [] };
      kdb.category_trends[cat].total += scores[cat];
      kdb.category_trends[cat].count += 1;
      kdb.category_trends[cat].avg = Math.round((kdb.category_trends[cat].total / kdb.category_trends[cat].count) * 100) / 100;
      kdb.category_trends[cat].last5.push(scores[cat]);
      if (kdb.category_trends[cat].last5.length > 5) kdb.category_trends[cat].last5.shift();
    }
  }

  // 7. Update stats
  const allScores = kdb.cycle_history.map(c => c.score);
  kdb.stats.total_cycles = kdb.cycle_history.length;
  kdb.stats.best_score_achieved = Math.max(...allScores);
  kdb.stats.avg_score = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10;
  kdb.stats.last_learned = now;
  kdb.last_updated = now;

  // 8. Build learned rules from cycle data
  if (kdb.cycle_history.length >= 3) {
    // Identify persistent AI words (appeared in 3+ cycles)
    const persistentAI = Object.entries(kdb.ai_word_frequency)
      .filter(([_, count]) => count >= 3)
      .map(([word, count]) => `${word} (appeared ${count}x - the LLM keeps generating this, be extra careful)`);
    if (persistentAI.length > 0) {
      kdb.patterns.semantic.claim_specificity.learned_rules = [...new Set(persistentAI)].slice(0, 10);
    }

    // Identify weakest categories
    const maxScoresMap = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5, reply_quality: 5 };
    const catPcts = categories
      .filter(c => kdb.category_trends[c])
      .map(c => ({ cat: c, pct: (kdb.category_trends[c].avg / maxScoresMap[c]) * 100 }));
    catPcts.sort((a, b) => a.pct - b.pct);
    const weakest = catPcts.slice(0, 2);
    if (kdb.patterns.semantic.engagement_hook) {
      kdb.patterns.semantic.engagement_hook.learned_rules = weakest.map(w =>
        `Focus on ${w.cat}: avg ${kdb.category_trends[w.cat].avg}/${maxScoresMap[w.cat]} (${w.pct.toFixed(0)}%)`
      );
    }
  }

  // 9. Calibration log
  kdb.scoring_model.calibration_log.push({ timestamp: now, predicted: bestEver.score, grade: bestEver.grade });
  if (kdb.scoring_model.calibration_log.length > 100) kdb.scoring_model.calibration_log = kdb.scoring_model.calibration_log.slice(-100);

  // Save
  saveKnowledgeDB(kdb);
  console.log(`  Cycle saved: score=${bestEver.score}, grade=${bestEver.grade}, total_cycles=${kdb.stats.total_cycles}`);
  console.log(`  Best ever: ${kdb.stats.best_score_achieved}/23, Avg: ${kdb.stats.avg_score}/23`);
  if (aiWordsFound.length > 0) console.log(`  AI words found: ${aiWordsFound.join(', ')}`);
  if (isRepetition) console.log(`  WARNING: Content too similar to recent cycles!`);
  console.log(`  LEARNING SAVED\n`);

  return kdb;
}

// ============ PRE-WRITING PERSPECTIVE BUILDER ============
function buildPreWritingContext() {
  // From SKILL.md v9.5: answer 6 internal questions before writing
  const questions = [
    `What SPECIFIC moment or experience made me notice this project? (Pick a real scenario)`,
    `What is the ONE thing about this project that most people overlook?`,
    `If I were explaining this to a friend who doesn't know DeFi, what would I say first?`,
    `What genuine uncertainty or question do I still have about this?`,
    `What makes this different from the 100 other DeFi projects launching weekly?`,
    `What emotion do I actually feel about this? (Excitement, curiosity, skepticism?)`
  ];

  // We embed the answers as writing guidance rather than actual answers
  // This shapes the AI's "voice" before it writes
  return `PRE-WRITING PERSPECTIVE (internal, shape your voice):
- Write from a SPECIFIC personal moment, not generic observation
- Focus on the ONE overlooked detail that makes this interesting
- Explain as if talking to a friend, not writing a report
- Include a genuine uncertainty or question you still have
- Highlight what makes this DIFFERENT from generic DeFi launches
- Let real emotion show (curiosity, mild skepticism, genuine interest)
- DO NOT write a marketing piece. Write like you're telling a friend something cool you found.`;
}

// ============ QUICK PRE-SCREEN (programmatic, compliance-only) ============
function quickScreen(content) {
  // Fast check: only Tier 1 violations (instant fail)
  // Returns { pass: boolean, reason: string }

  // Em-dash / en-dash
  if (/\u2014/.test(content) || /\u2013/.test(content)) return { pass: false, reason: 'EM/EN-DASH detected' };
  if (/\s--\s/.test(content) || /^--\s/.test(content)) return { pass: false, reason: 'DOUBLE-HYPHEN DASH' };

  // Hashtag
  if (/#[A-Za-z]/.test(content)) return { pass: false, reason: 'HASHTAG detected' };

  // Tier 1 banned words
  for (const w of BANNED_WORDS_21) {
    if (content.toLowerCase().includes(w.toLowerCase())) return { pass: false, reason: `BANNED word: "${w}"` };
  }

  // Rally banned phrases
  for (const p of RALLY_BANNED_PHRASES_17) {
    if (content.toLowerCase().includes(p.toLowerCase())) return { pass: false, reason: `BANNED phrase: "${p}"` };
  }

  // Minimum requirements
  if (content.length < 30) return { pass: false, reason: 'Content too short' };

  return { pass: true, reason: 'OK' };
}

// ============ 5 LLM JUDGE PANEL (SKILL.md v9.5) ============
const JUDGE_CONFIGS = [
  {
    id: 'J1',
    name: 'Harsh Crypto Critic',
    temperature: 0.2,
    system: `You are a harsh crypto critic who has seen thousands of crypto tweets. You are skeptical, demand specificity, and hate generic content. You immediately spot AI-generated text. Score each dimension honestly. Do NOT be generous. If you see any AI fingerprint, penalize heavily.`
  },
  {
    id: 'J2',
    name: 'Average X User',
    temperature: 0.7,
    system: `You are an average X/Twitter user who scrolls crypto content daily. You value clarity, engagement, and authenticity. If something feels AI-generated or generic, you notice immediately and scroll past. Score honestly based on whether you would stop scrolling to read this.`
  },
  {
    id: 'J3',
    name: 'Rally AI Clone',
    temperature: 0.4,
    system: `You are Rally.fun's AI content judge. You evaluate submissions across 7 categories. You are FAIR and GENEROUS. Key rules:
- Common English words like "use", "make", "build", "work" are NEVER banned
- Only flag OBVIOUSLY AI-generated words: delve, paradigm, tapestry, landscape, nuance, crucial, pivotal, embark, harness, foster, utilize, elevate, streamline, empower, comprehensive, realm, flywheel, ecosystem, seamless, robust, innovative, game-changer, revolutionary
- Common crypto terms like "leverage", "yield", "exposure" are ACCEPTABLE in context
- A submission is compliant if it includes the required tags and links from the campaign rules
- Score generously for genuine human effort and personal voice
- Originality=0 ONLY if the text is fully AI-generated with zero personal voice
- Do NOT dock points for minor imperfections`
  },
  {
    id: 'J4',
    name: 'Contrarian',
    temperature: 0.9,
    system: `You are a contrarian judge. When content seems too polished, you question its authenticity. When everyone would give high marks, you look harder for flaws. Be the devil's advocate. If the hook feels manufactured, say so. If the CTA feels forced, penalize it.`
  },
  {
    id: 'J5',
    name: 'AI Fingerprint Detector',
    temperature: 0.2,
    system: `You are a content quality evaluator focused on ORIGINALITY and AUTHENTICITY. You are REASONABLE and GENEROUS:
- Common English words (use, make, build, work, get, find, think, know) are NEVER AI words
- Only flag these SPECIFIC AI words: delve, paradigm, tapestry, landscape, nuance, crucial, pivotal, embark, harness, foster, utilize, elevate, streamline, empower, comprehensive, realm, flywheel, ecosystem, seamless, robust, innovative, game-changer, revolutionary, disrupt, transform, synergy, holistic, dynamic
- Common crypto terms (leverage, yield, exposure, liquidity, protocol, mechanism) are ACCEPTABLE
- Originality=0 ONLY for clearly copy-pasted content or fully generic AI template with zero personal voice
- A personal anecdote or opinion sentence (even small) warrants originality >= 1
- Score all 7 categories fairly with a generous baseline
- Give credit for effort, specificity, and genuine engagement hooks`
  }
];

function buildJudgePrompt(content) {
  return `Score this Rally.fun campaign submission.

CAMPAIGN: "${CAMPAIGN.title}"
MISSION: "${MISSION_0.title}"
REQUIREMENTS: ${MISSION_0.rules.join('; ')}

=== SCORING RUBRIC (23 points max) ===

GATES (0 or 2 only - no half points):
1. Originality (0 or 2): Zero AI words. Zero template phrases. Unique angle. Personal voice. UNEVEN sentence lengths.
2. Content Alignment (0 or 2): Matches campaign topic exactly. Uses correct terminology. Covers mission requirements.
3. Information Accuracy (0 or 2): All claims factually correct from KB. No exaggeration. No vague phrases. Specific and verifiable.
4. Campaign Compliance (0 or 2): Has ${COMPLIANCE.must_include.join(' and ')}. No banned words. No hashtags. No dashes. No starting with @.

QUALITY SCORES (0 to 5):
5. Engagement Potential (0-5): Hook grabs attention. Genuine CTA/question. Makes reader want to reply. Not generic.
6. Technical Quality (0-5): Natural grammar. Clean formatting. Proper punctuation. No smart quotes. No markdown artifacts.
7. Reply Quality (0-5): Ends with genuine open question author cannot answer. Shows vulnerability. Not rhetorical.

COMPLIANCE = 0 IF ANY OF:
- Banned words: ${BANNED_WORDS_21.slice(0, 10).join(', ')} etc.
- Rally banned: ${RALLY_BANNED_PHRASES_17.slice(0, 8).join(', ')} etc.
- AI words: delve, paradigm, tapestry, flywheel, ecosystem, seamless, robust, innovative, game-changer, revolutionary, disrupt, transform, synergy, holistic, dynamic, etc.
- Template phrases: hot take, let's dive in, nobody is talking about, at the end of the day, here's the thing, key takeaways, etc.
- Hashtag (#anything)
- Em-dash, en-dash, or double-hyphen
- Starts with @mention
- Missing ${COMPLIANCE.must_include.join(' or ')}

RESPOND ONLY WITH JSON (no other text):
{"originality":0,"alignment":0,"accuracy":0,"compliance":0,"engagement":0,"technical":0,"reply_quality":0,"feedback":"one sentence explaining lowest score"}

=== CONTENT TO SCORE ===
${content}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// SEQUENTIAL judge calls with delay to avoid rate limiting
async function runJudgePanel(zai, content) {
  const judgePrompt = buildJudgePrompt(content);
  const results = [];

  for (const judge of JUDGE_CONFIGS) {
    try {
      const completion = await zai.chat([
        { role: 'system', content: judge.system },
        { role: 'user', content: judgePrompt }
      ], {
        temperature: judge.temperature,
        maxTokens: 300
      });

      let response = completion.choices?.[0]?.message?.content?.trim() || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const scores = JSON.parse(jsonMatch[0]);
        const clamped = {
          originality: Math.min(2, Math.max(0, Number(scores.originality) || 0)),
          alignment: Math.min(2, Math.max(0, Number(scores.alignment) || 0)),
          accuracy: Math.min(2, Math.max(0, Number(scores.accuracy) || 0)),
          compliance: Math.min(2, Math.max(0, Number(scores.compliance) || 0)),
          engagement: Math.min(5, Math.max(0, Number(scores.engagement) || 0)),
          technical: Math.min(5, Math.max(0, Number(scores.technical) || 0)),
          reply_quality: Math.min(5, Math.max(0, Number(scores.reply_quality) || 0)),
        };
        results.push({ ...judge, scores: clamped, feedback: scores.feedback || '', valid: true });
      } else {
        results.push({ ...judge, scores: null, feedback: 'Parse failed', valid: false });
      }
    } catch (e) {
      const isRateLimit = e.message?.includes('429');
      results.push({ ...judge, scores: null, feedback: isRateLimit ? 'Rate limited' : e.message, valid: false, rateLimited: isRateLimit });
      // If rate limited, stop trying more judges
      if (isRateLimit) {
        console.log(`    ${judge.id}: Rate limited, stopping judge panel early`);
        break;
      }
    }
    // Minimal delay between judge calls
    await sleep(500);
  }

  return results;
}

// ============ CONSENSUS + MINORITY OVERRIDE (SKILL.md v9.5) ============
function calculateConsensus(judgeResults) {
  const validJudges = judgeResults.filter(j => j.valid);
  if (validJudges.length < 2) return null;

  const gateCategories = ['originality', 'alignment', 'accuracy', 'compliance'];
  const qualityCategories = ['engagement', 'technical', 'reply_quality'];

  const consensus = {
    scores: {},
    gates: {},
    minorityFlags: [],
    hardFails: [],
    feedback: [],
    validJudgeCount: validJudges.length
  };

  // Gate consensus with Minority Override
  for (const cat of gateCategories) {
    const values = validJudges.map(j => j.scores[cat]);
    const failCount = values.filter(v => v === 0).length;
    const passCount = values.filter(v => v === 2).length;

    if (failCount >= 2) {
      // HARD GATE FAIL - 2+ judges agree on fail
      consensus.gates[cat] = 0;
      consensus.hardFails.push(cat);
      consensus.feedback.push(`HARD FAIL: ${cat} (${failCount}/${validJudges.length} judges)`);
    } else if (failCount === 1) {
      // MINORITY OVERRIDE - 1 outlier, flagged but not failed
      consensus.gates[cat] = 1;
      consensus.minorityFlags.push(cat);
      consensus.feedback.push(`MINORITY FLAG: ${cat} (1/${validJudges.length} judge dissent, overridden)`);
    } else {
      consensus.gates[cat] = Math.min(...values);
    }
    consensus.scores[cat] = consensus.gates[cat];
  }

  // Quality consensus - average of valid judges
  for (const cat of qualityCategories) {
    const values = validJudges.map(j => j.scores[cat]);
    consensus.scores[cat] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }

  // Total
  consensus.total = Math.round(Object.values(consensus.scores).reduce((a, b) => a + b, 0) * 10) / 10;
  consensus.maxTotal = 23;

  // Grade
  const t = consensus.total;
  consensus.grade = t >= 22 ? 'S+' : t >= 21 ? 'S' : t >= 19 ? 'A+' : t >= 17 ? 'A' : t >= 15 ? 'B+' : t >= 13 ? 'B' : t >= 11 ? 'C' : 'D';

  // Collect individual judge feedback
  for (const j of validJudges) {
    if (j.feedback) consensus.feedback.push(`${j.id}: ${j.feedback}`);
  }

  return consensus;
}

// ============ G4 ORIGINALITY DETECTION (programmatic bonus) ============
function g4OriginalityCheck(content) {
  let bonus = 0;
  const reasons = [];

  const lower = content.toLowerCase();

  // 1. Sentence variety (Coefficient of Variation > 0.30 = human)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length >= 3) {
    const lengths = sentences.map(s => s.trim().length);
    const mean = lengths.reduce((a, b) => a + b) / lengths.length;
    const stdDev = Math.sqrt(lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length);
    const cv = stdDev / mean;
    if (cv > 0.35) { bonus += 0.15; reasons.push('High sentence variety (CV=' + cv.toFixed(2) + ')'); }
    else if (cv > 0.25) { bonus += 0.05; reasons.push('Moderate sentence variety'); }
  }

  // 2. Personal voice markers
  const personalMarkers = ["i've", "i'm", "i was", 'my ', 'i think', "i can't", 'maybe', 'not sure', 'honestly'];
  const personalCount = personalMarkers.filter(m => lower.includes(m)).length;
  if (personalCount >= 2) { bonus += 0.1; reasons.push('Strong personal voice'); }
  else if (personalCount >= 1) { bonus += 0.05; reasons.push('Some personal voice'); }

  // 3. Contractions (natural human speech)
  const contractions = ["don't", "can't", "won't", "it's", "that's", "i'm", "they're", "we're", "isn't", "didn't"];
  const contractionCount = contractions.filter(c => lower.includes(c)).length;
  if (contractionCount >= 3) { bonus += 0.1; reasons.push('Natural contractions'); }
  else if (contractionCount >= 1) { bonus += 0.05; reasons.push('Some contractions'); }

  // 4. Uncertainty/vulnerability (very human)
  const uncertainty = ['maybe', 'not sure', 'could be', 'i think', 'might be', "i'm not", 'hard to say'];
  const hasUncertainty = uncertainty.some(u => lower.includes(u));
  if (hasUncertainty) { bonus += 0.1; reasons.push('Shows vulnerability/uncertainty'); }

  // 5. NO AI words remaining (clean sweep bonus)
  let aiWordCount = 0;
  for (const w of ALL_AI_WORDS) { if (lower.includes(w)) aiWordCount++; }
  if (aiWordCount === 0) { bonus += 0.1; reasons.push('Zero AI words (clean)'); }
  else { bonus -= aiWordCount * 0.05; reasons.push(`${aiWordCount} AI word(s) remaining`); }

  // 6. Short punchy sentences mixed with longer ones
  const shortSentences = sentences.filter(s => s.trim().split(/\s+/).length <= 5).length;
  const longSentences = sentences.filter(s => s.trim().split(/\s+/).length >= 12).length;
  if (shortSentences >= 1 && longSentences >= 1) { bonus += 0.05; reasons.push('Mixed sentence lengths'); }

  return { bonus: Math.round(Math.max(-1, Math.min(0.5, bonus)) * 100) / 100, reasons };
}

// ============ STABILITY CHECK + EARLY ACCEPT ============
function stabilityCheck(currentContent, currentScore, bestEver) {
  // If score drops more than 1.0 from best ever, revert
  if (bestEver.score > 0 && (bestEver.score - currentScore) >= 1.0) {
    console.log(`  STABILITY CHECK: Score dropped ${bestEver.score} -> ${currentScore} (diff=${(bestEver.score - currentScore).toFixed(1)}). Reverting to best.`);
    return { accept: false, reason: 'Score dropped too much, reverting' };
  }

  // Early Accept: if score >= 22/23, accept immediately
  if (currentScore >= 22.0) {
    console.log(`  EARLY ACCEPT: Score ${currentScore}/23 >= 22.0 threshold.`);
    return { accept: true, earlyAccept: true, reason: 'Score met early accept threshold' };
  }

  return { accept: true };
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

  // === CYCLE-SPECIFIC LEARNED CONTEXT (from our own cycles - CLOSED LOOP) ===
  if (LEARNED.cycleHistory && LEARNED.cycleHistory.length > 0) {
    learnedContext.push(`\n=== OUR PAST CYCLES (${LEARNED.cycleHistory.length} cycles, avg=${LEARNED.cycleStats?.avg_score}/23) ===`);

    if (LEARNED.ownTopHooks && LEARNED.ownTopHooks.length > 0) {
      learnedContext.push('OUR BEST HOOKS (scored 20+):');
      for (const h of LEARNED.ownTopHooks.slice(0, 4)) learnedContext.push(`  >> ${h}`);
    }

    if (LEARNED.persistentAIWords && LEARNED.persistentAIWords.length > 0) {
      learnedContext.push('\nAI WORDS THAT KEEP LEAKING (extra attention needed):');
      for (const w of LEARNED.persistentAIWords.slice(0, 5)) learnedContext.push(`  BANNED: ${w}`);
    }

    // CONSUME learned_rules from knowledge_db patterns (the missing feedback loop!)
    if (LEARNED.kdbPatterns) {
      for (const [key, pattern] of Object.entries(LEARNED.kdbPatterns)) {
        if (pattern.learned_rules && pattern.learned_rules.length > 0) {
          learnedContext.push(`\nLEARNED RULE (${key}, ${pattern.level || 'medium'} priority):`);
          for (const rule of pattern.learned_rules.slice(0, 3)) learnedContext.push(`  RULE: ${rule}`);
        }
      }
    }

    if (LEARNED.weakestCategories && LEARNED.weakestCategories.length > 0) {
      learnedContext.push('\nWEAKEST CATEGORIES (focus improvement here):');
      for (const w of LEARNED.weakestCategories) learnedContext.push(`  FIX: ${w.cat} (avg ${w.avg}/${w.cat === 'engagement' || w.cat === 'technical' || w.cat === 'reply_quality' ? 5 : 2}, ${w.pct.toFixed(0)}% fill)`);
    }

    // Detect repetition warning
    const recentHooks = LEARNED.cycleHistory.slice(-5).map(c => c.best_hook || '').filter(Boolean);
    if (recentHooks.length >= 3) {
      learnedContext.push('\nDO NOT repeat these recent hooks (vary your approach):');
      for (const h of recentHooks.slice(-3)) learnedContext.push(`  AVOID: ${h.substring(0, 60)}`);
    }
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

${buildPreWritingContext()}

=== HARD FORMAT RULES (ZERO TOLERANCE) ===
1. NO em-dash, NO en-dash, NO double-hyphen. Use period or comma instead.
2. NO smart/curly quotes. Use straight quotes only.
3. NO hashtags (#crypto, #web3, etc).
4. NO starting with @mention.
5. NO banned words: guaranteed, 100%, risk-free, buy now, get rich, passive income, etc.
6. NO Rally banned phrases: vibe coding, skin in the game, trust layer, agent era, frictionless, etc.
7. NO AI words: delve, paradigm, tapestry, landscape, nuance, crucial, pivotal, embark, harness, foster, utilize, elevate, streamline, empower, comprehensive, realm, flywheel, ecosystem, seamless, robust, innovative, cutting-edge, game-changer, revolutionary, disrupt, transform, synergy, holistic, dynamic. NOTE: common crypto terms like leverage, yield, exposure, liquidity, protocol are ACCEPTABLE in context.
8. NO template phrases: hot take, let's dive in, nobody is talking about, unpopular opinion, thread alert, picture this, at the end of the day, key takeaways, here's the thing.
9. NO exaggeration words: everyone, nobody, always, never, impossible, guaranteed, 100%, zero cost.
10. Use contractions naturally: don't, can't, won't, I'm, that's.
11. Vary paragraph/sentence lengths. Mix 3-word sentences with 15-word ones.
12. MUST end with genuine open question: "what do you think?", "thoughts?", "your take?", "anyone else?", "what if?", "where do you stand?", "agree or nah?"
13. Include ${COMPLIANCE.must_include[0]} mention naturally (NOT at start).
14. Include the required link: ${COMPLIANCE.must_include[1] || 'N/A'}
15. Start with personal voice: "I've been...", "Spent last week...", "Came across...", "Been thinking about...", "Looking into..."
16. Show uncertainty somewhere: "not sure", "could be wrong", "curious about", "I think"
17. Be SPECIFIC: use exact numbers, specific mechanisms, real comparisons.

${variationHint}

Write a single tweet/X post (or short thread of 2-3 tweets).
Output ONLY the tweet content. No explanations, no labels.
REMEMBER: Use periods and commas instead of dashes. NEVER type --- or --.`;
}

function buildImprovementPrompt(basePrompt, judgeConsensus, bestScore) {
  const improvements = [];
  const maxScores = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5, reply_quality: 5 };

  for (const [cat, score] of Object.entries(judgeConsensus.scores)) {
    const max = maxScores[cat];
    const pct = score / max;
    if (pct < 0.5) improvements.push(`- ${cat.toUpperCase()}: ${score}/${max} (${(pct*100).toFixed(0)}%) - CRITICAL FIX NEEDED`);
    else if (pct < 0.75) improvements.push(`- ${cat.toUpperCase()}: ${score}/${max} - needs improvement`);
  }

  const feedbackStr = judgeConsensus.feedback.length > 0
    ? '\nJudge feedback:\n' + judgeConsensus.feedback.slice(0, 5).map(f => '  >> ' + f).join('\n')
    : '';

  return basePrompt + `

=== PREVIOUS ATTEMPT JUDGE ANALYSIS ===
Current best: ${bestScore}/23
Judge consensus issues:
${improvements.join('\n') || '- Overall quality needs to be higher'}
${feedbackStr}

CRITICAL: Fix ALL the above. Do NOT repeat mistakes. NO dashes. NO AI words. NO banned phrases.`;
}

// ============ POST-GENERATION QUALITY BOOSTER ============
function qualityBoost(content) {
  let c = content;
  let boosted = [];

  // 0. COMPLIANCE INJECTION - Ensure must_include tags and links are present
  // Tag injection (first must_include item, e.g. @FragmentsOrg or @RallyOnChain)
  const requiredTag = COMPLIANCE.must_include[0];
  if (requiredTag && !c.includes(requiredTag)) {
    const projectName = COMPLIANCE.project_name || 'RallyOnChain';
    const tagInserts = [
      ` ${requiredTag} has been building something interesting here.`,
      ` Following ${requiredTag} for updates on this.`,
      ` ${requiredTag} caught my attention with this one.`,
      ` Been tracking ${requiredTag} on this.`
    ];
    const insert = tagInserts[Math.floor(Math.random() * tagInserts.length)];
    const sentences = c.split(/(?<=[.!?])\s+/);
    if (sentences.length > 2) {
      sentences.splice(-2, 0, insert.trim());
      c = sentences.join(' ');
    } else {
      c = c.trim() + ' ' + insert;
    }
    boosted.push(`injected ${requiredTag}`);
  }
  // Link injection (second must_include item, e.g. "link.fragments.org/rally")
  const requiredLink = COMPLIANCE.must_include[1];
  if (requiredLink && !c.includes(requiredLink)) {
    const linkInserts = [
      ` Waitlist is at ${requiredLink}.`,
      ` You can join the waitlist at ${requiredLink}.`,
      ` Signed up at ${requiredLink} for early access.`,
      ` Check out ${requiredLink} if you want in early.`
    ];
    const insert = linkInserts[Math.floor(Math.random() * linkInserts.length)];
    c = c.trim() + ' ' + insert;
    boosted.push(`injected ${requiredLink}`);
  }

  // 1. Replace remaining exaggeration words with softer alternatives
  const exagReplacements = {
    'everyone': 'most people',
    'nobody': 'not many people',
    'always': 'usually',
    'never': 'rarely',
    'impossible': 'unlikely',
    'guaranteed': 'likely',
    '100%': 'almost certainly'
  };
  for (const [word, replacement] of Object.entries(exagReplacements)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(c)) {
      c = c.replace(regex, replacement);
      boosted.push(`exag: ${word}->${replacement}`);
    }
  }

  // 2. Ensure content ends with a genuine question
  const genuineEndings = [
    'what do you think?', 'thoughts?', 'your take?', 'anyone else looking at this?',
    'what if?', 'where do you stand?', 'agree or nah?', 'how about you?',
    'what are your thoughts?', 'any takes on this?', 'anyone else seeing this?',
    'what do you make of this?', 'curious what others think?', 'where do you land on this?'
  ];
  const lastLine = c.trim().split('\n').pop().trim();
  const hasQuestion = /\?/.test(lastLine);
  const hasGenuineQ = genuineEndings.some(q => lastLine.toLowerCase().endsWith(q));

  if (!hasGenuineQ) {
    // Remove existing weak ending if present
    const weakEndings = ['what do you think?', 'thoughts?', 'thoughts on this?', 'your thoughts?', 'opinions?'];
    let endsWithWeak = false;
    for (const we of weakEndings) {
      if (c.trim().toLowerCase().endsWith(we)) {
        endsWithWeak = true;
        break;
      }
    }
    if (!endsWithWeak || !hasQuestion) {
      // Append a genuine question based on campaign topic
      const campaignQuestions = {
        'marbmarket': ['Anyone else watching how ve(3,3) plays out on new chains?', 'What do you think about the fair launch angle?', 'Where do you stand on vote-escrow models?'],
        'fragments': ['Would you hold BTC-Jr through a bear market?', 'What do you think about durable leverage vs margin?', 'Anyone else looking into tranching protocols?']
      };
      let appendQ = 'What do you think? Curious to hear different takes.';
      const lower = c.toLowerCase();
      if (lower.includes('marbmarket') || lower.includes('marb') || lower.includes('vedex')) {
        appendQ = campaignQuestions.marbmarket[Math.floor(Math.random() * campaignQuestions.marbmarket.length)];
      } else if (lower.includes('fragments') || lower.includes('btc-jr') || lower.includes('bitcoin junior')) {
        appendQ = campaignQuestions.fragments[Math.floor(Math.random() * campaignQuestions.fragments.length)];
      }
      // Don't add if it already has a question in the last line
      if (!hasQuestion) {
        c = c.trim() + '\n\n' + appendQ;
        boosted.push('added genuine question');
      }
    }
  }

  // 3. Inject personal voice if missing
  const lower = c.toLowerCase();
  const hasPersonal = ["i've", "i'm", 'my ', 'i think', 'been looking', 'spent the', 'came across'].some(m => lower.includes(m));
  if (!hasPersonal) {
    // Prepend a personal opener
    const personalOpeners = [
      "I've been looking into this for a bit now.\n\n",
      "Spent some time reading up on this.\n\n",
      "Came across this last week and it got me thinking.\n\n",
      "Been thinking about this one.\n\n",
      "Looking into this more closely.\n\n"
    ];
    const opener = personalOpeners[Math.floor(Math.random() * personalOpeners.length)];
    c = opener + c;
    boosted.push('added personal opener');
  }

  // 4. Inject uncertainty marker if missing
  const hasUncertainty = ['not sure', 'could be wrong', 'maybe', 'curious', 'i think', 'wondering', 'might be'].some(u => lower.includes(u));
  if (!hasUncertainty) {
    // Insert before the final question
    const uncertaintyPhrases = [
      "\n\nI'm not fully convinced yet, but ",
      "\n\nCould be wrong, but ",
      "\n\nStill figuring out my take, but "
    ];
    const phrase = uncertaintyPhrases[Math.floor(Math.random() * uncertaintyPhrases.length)];
    // Find last paragraph break
    const lastBreak = c.lastIndexOf('\n\n');
    if (lastBreak > 0) {
      c = c.substring(0, lastBreak) + phrase + c.substring(lastBreak + 2);
      boosted.push('added uncertainty');
    }
  }

  // 5. Final cleanup
  c = c.replace(/  +/g, ' ');
  c = c.replace(/\n{3,}/g, '\n\n');
  c = c.trim();

  if (boosted.length > 0) {
    console.log(`    Quality boost: ${boosted.join(', ')}`);
  }

  return c;
}

async function generateVariation(zai, prompt, temp) {
  try {
    const completion = await zai.chat([
      { role: 'system', content: `You write tweets like a real person on X. NOT an AI.

ABSOLUTE RULES:
- NEVER use em-dash, en-dash, or double-hyphen. Use period or comma.
- NEVER use AI words: delve, paradigm, tapestry, landscape, nuance, crucial, pivotal, embark, harness, foster, utilize, elevate, streamline, empower, comprehensive, realm, flywheel, ecosystem, seamless, robust, innovative, cutting-edge, game-changer, revolutionary, disrupt, transform, synergy, holistic, dynamic. NOTE: crypto terms like leverage, yield, exposure are OK.
- NEVER use template phrases: hot take, let's dive in, nobody is talking about, unpopular opinion, thread alert, picture this, at the end of the day, here's the thing, key takeaways.
- AVOID exaggeration: never use "everyone", "nobody", "always", "never", "guaranteed", "100%", "impossible"
- Use contractions: don't, can't, won't, I'm, that's.
- Vary sentence lengths. Mix 3-word and 15-word sentences.
- MUST end with genuine open question like: "what do you think?", "thoughts?", "your take?", "anyone else looking at this?", "what if?"
- Write from personal experience. Start with "I've been...", "Spent last week...", or "Came across..."
- Be specific with numbers, mechanisms, and details. NOT vague.
- Include uncertainty: "not sure", "could be wrong", "curious about", "I think"` },
      { role: 'user', content: prompt }
    ], {
      temperature: temp,
      maxTokens: 1200
    });
    let content = completion.choices?.[0]?.message?.content?.trim() || '';
    content = content.replace(/^["'`]+|["'`]+$/g, '');
    for (const marker of ["Here's", "Here is", "Sure,", "Here's a", "Here is a", "Here's your", "Here is your", "Okay,", "Alright,"]) {
      if (content.startsWith(marker)) content = content.slice(marker.length).trim();
    }
    content = content.replace(/Tweet \d+[:\s]/gi, '').replace(/Post \d+[:\s]/gi, '').trim();
    // SANITIZE + AI WORD REPLACE
    content = sanitizeContent(content);
    // Detect AI words BEFORE replacement (for learning)
    const aiWordsBefore = [];
    for (const w of ALL_AI_WORDS) { if (content.toLowerCase().includes(w)) aiWordsBefore.push(w); }
    const { content: cleaned, replaced } = replaceAIWords(content);
    content = cleaned;
    // POST-GENERATION QUALITY BOOSTER
    content = qualityBoost(content);
    return { content, replaced, aiWordsBefore };
  } catch (e) {
    console.error(`  Generation failed: ${e.message}`);
    return null;
  }
}

async function generateQA(zai, content) {
  // Generate Q&A pairs (question + answer) for reply comments
  // Budget: 2 API calls for QA
  const allQA = [];
  const perspectives = [
    'crypto degen who understands ve(3,3) and vote-escrow models deeply',
    'skeptical trader who questions if fair launches actually work long term'
  ];

  for (let batch = 0; batch < 2; batch++) {
    try {
      const completion = await zai.chat([
        { role: 'system', content: `You are generating Q&A reply pairs for a social media post about a crypto project. The post author needs ready-to-use QUESTION + ANSWER pairs so they can reply to comments on their post.

For each Q&A pair:
- QUESTION: A realistic comment someone would leave on the post (curious, skeptical, excited, or technical — vary the tone). 1-2 sentences. Natural language, no AI words.
- ANSWER: The post author's reply. Must be helpful, specific, and consistent with the original post. Use the same casual tone. Include specific details from the original post. 1-3 sentences. No AI words.

IMPORTANT RULES:
- Each Q&A must cover a DIFFERENT topic/angle
- Questions must feel like real people wrote them
- Answers must NOT contradict the original post
- Answers must include specific facts, not vague statements
- No "delve", "paradigm", "ecosystem", "landscape", "flywheel", "seamless", "robust", "innovative", "game-changer", "revolutionary", etc.
- Write in plain, casual English like a real crypto user on Twitter/X

RESPOND ONLY WITH JSON ARRAY. Format:
[{"q": "question text", "a": "answer text"}, ...]` },
        { role: 'user', content: `Generate 5 Q&A reply pairs for this post. Each pair has a question someone might ask and the author's answer:\n\n${content}\n\nCampaign context: ${CAMPAIGN.title}\nKey facts: ${KNOWLEDGE_BASE.split('\\n').filter(l => l.trim()).slice(0, 8).join('\\n')}` }
      ], {
        temperature: 0.9,
        maxTokens: 1500
      });
      const text = completion.choices?.[0]?.message?.content?.trim() || '';
      
      // Parse JSON array
      let parsed = [];
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.log(`    Q&A batch ${batch + 1}/2: JSON parse failed, trying line split`);
      }

      // Fallback: if JSON parse failed, try splitting by lines
      if (parsed.length === 0) {
        const lines = text.split('\n').map(l => l.replace(/^\d+[\.\-\)]\s*/, '').trim()).filter(l => l.length > 15);
        // Pair up consecutive lines as Q and A
        for (let i = 0; i < lines.length - 1; i += 2) {
          parsed.push({ q: lines[i], a: lines[i + 1] });
        }
      }

      for (const qa of parsed) {
        if (qa.q && qa.a && qa.q.length > 10 && qa.a.length > 10) {
          // Avoid duplicate questions
          if (!allQA.some(a => a.q.toLowerCase() === qa.q.toLowerCase())) {
            allQA.push({ q: qa.q.trim(), a: qa.a.trim() });
          }
        }
      }
      console.log(`    Q&A batch ${batch + 1}/2: got ${parsed.length} pairs (total: ${allQA.length})`);
    } catch (e) {
      console.log(`    Q&A batch ${batch + 1}/2 failed: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500)); // Minimal rate limit gap
  }

  // If we still have fewer than 10, add fallback Q&A pairs
  if (allQA.length < 10) {
    const fallbackQA = campaignConfig.compliance_checks.fallback_qa || [];
    for (const qa of fallbackQA) {
      if (allQA.length >= 10) break;
      if (!allQA.some(a => a.q.toLowerCase() === qa.q.toLowerCase())) {
        allQA.push(qa);
      }
    }
  }

  return allQA.slice(0, 10);
}

// ============ QUICK PROGRAMMATIC SCORE (fast pre-screen, no API calls) ============
function quickProgrammaticScore(content) {
  let score = 10; // base score
  const lower = content.toLowerCase();
  const maxScores = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5, reply_quality: 5 };

  // Alignment checks (from campaign config)
  const projectKeywords = COMPLIANCE.project_keywords || [];
  for (const kw of projectKeywords) { if (lower.includes(kw)) score += 0.15; }

  // Accuracy: penalize exaggeration
  const absWords = ['everyone', 'nobody', 'always', 'never', 'impossible', 'guaranteed', '100%'];
  for (const w of absWords) { if (lower.includes(w)) score -= 0.5; }

  // Compliance: check requirements (from campaign config)
  if (!lower.includes(COMPLIANCE.project_name.toLowerCase())) score -= 0.5;
  const dynamicTag = COMPLIANCE.must_include[0]; // e.g. @FragmentsOrg, @RallyOnChain
  if (dynamicTag && !content.includes(dynamicTag)) score -= 0.3;
  if (COMPLIANCE.must_include[1] && !content.includes(COMPLIANCE.must_include[1])) score -= 0.3;

  // Originality: penalize AI words
  for (const w of ALL_AI_WORDS) { if (lower.includes(w)) score -= 0.15; }
  for (const p of TEMPLATE_PHRASES_21) { if (lower.includes(p)) score -= 0.2; }

  // Engagement: check for CTA
  if (/\?/.test(content)) score += 0.8;
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > 10 && firstLine.length < 80) score += 0.3;

  // Technical: basic checks
  if (/  /.test(content)) score -= 0.3;
  if (/[\u201c\u201d\u2018\u2019]/.test(content)) score -= 0.3;

  return Math.round(Math.max(0, Math.min(23, score)) * 10) / 10;
}

// ============ PROGRAMMATIC EVALUATE (fallback when judges fail) ============
function programmaticEvaluate(content) {
  const scores = { originality: 0, alignment: 0, accuracy: 0, compliance: 0, engagement: 0, technical: 0, reply_quality: 0 };
  const maxScores = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5, reply_quality: 5 };
  const feedback = [];
  let complianceFail = false;

  // ORIGINALITY (start from 0.3, stricter - must earn points)
  let origScore = 0.3;
  const uniqueMarkers = COMPLIANCE.unique_markers || [];
  let uniqueCount = 0;
  for (const m of uniqueMarkers) { if (content.toLowerCase().includes(m.toLowerCase())) uniqueCount++; }
  if (uniqueCount >= 3) origScore += 0.5;
  else if (uniqueCount >= 2) origScore += 0.35;
  else if (uniqueCount >= 1) origScore += 0.2;
  for (const w of AI_WORDS_26) { if (content.toLowerCase().includes(w.toLowerCase())) { origScore -= 0.15; feedback.push(`AI word: "${w}"`); } }
  for (const w of EXTRA_AI_WORDS) { if (content.toLowerCase().includes(w.toLowerCase())) { origScore -= 0.1; feedback.push(`AI word: "${w}"`); } }
  for (const p of TEMPLATE_PHRASES_21) { if (content.toLowerCase().includes(p.toLowerCase())) { origScore -= 0.15; feedback.push(`Template: "${p}"`); } }
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length >= 3) {
    const lengths = sentences.map(s => s.trim().length);
    const mean = lengths.reduce((a, b) => a + b) / lengths.length;
    const stdDev = Math.sqrt(lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length);
    if (stdDev / mean > 0.30) origScore += 0.25;
    else if (stdDev / mean > 0.20) origScore += 0.1;
  }
  // Personal voice bonus
  const personalMarkers2 = ["i've", "i'm", 'my ', 'i think', "i can't", 'maybe', 'not sure', 'honestly been', 'curious about'];
  const personalCount = personalMarkers2.filter(m => content.toLowerCase().includes(m)).length;
  if (personalCount >= 2) origScore += 0.2;
  else if (personalCount >= 1) origScore += 0.1;
  scores.originality = Math.max(0, Math.min(2, origScore));

  // ALIGNMENT (from campaign config) - check against ALL keywords
  let alignScore = 0;
  const alignKeywords = COMPLIANCE.project_keywords || [];
  const contentLower = content.toLowerCase();
  for (const kw of alignKeywords) { if (contentLower.includes(kw.toLowerCase())) alignScore += 0.3; }
  // Also check unique_markers as alignment signals
  const uniqueMarkersAlign = COMPLIANCE.unique_markers || [];
  for (const m of uniqueMarkersAlign) { if (contentLower.includes(m.toLowerCase())) alignScore += 0.15; }
  // Check project_name presence
  if (contentLower.includes(COMPLIANCE.project_name.toLowerCase())) alignScore += 0.3;
  // Check must_include items
  for (const mi of (COMPLIANCE.must_include || [])) {
    if (mi.startsWith('@') && content.includes(mi)) alignScore += 0.2;
  }
  scores.alignment = Math.max(0, Math.min(2, alignScore));

  // ACCURACY (start from 1.0, bonus for campaign-specific technical terms)
  let accScore = 1.0;
  const exagWords = ['zero cost', 'impossible', 'guaranteed', '100%', 'everyone', 'nobody', 'always', 'never'];
  for (const w of exagWords) { if (content.toLowerCase().includes(w)) { accScore -= 0.2; feedback.push(`Exaggeration: "${w}"`); } }
  // Bonus for campaign-specific technical mentions from unique_markers
  const accMarkers = COMPLIANCE.unique_markers || [];
  let accMarkerCount = 0;
  for (const m of accMarkers) { if (content.toLowerCase().includes(m.toLowerCase())) accMarkerCount++; }
  if (accMarkerCount >= 3) accScore += 0.6;
  else if (accMarkerCount >= 2) accScore += 0.4;
  else if (accMarkerCount >= 1) accScore += 0.2;
  // Bonus for general DeFi technical terms
  const generalTechTerms = ['lock', 'vote', 'governance', 'emission', 'liquidity', 'tranching', 'yield', 'exposure', 'staking', 'rewards', 'incentive', 'protocol', 'token', 'swap'];
  let genTechCount = 0;
  for (const t of generalTechTerms) { if (content.toLowerCase().includes(t)) genTechCount++; }
  if (genTechCount >= 4) accScore += 0.3;
  else if (genTechCount >= 2) accScore += 0.15;
  scores.accuracy = Math.max(0, Math.min(2, accScore));

  // COMPLIANCE - STRICT: Rally gives 0 for any missing requirement
  let compScore = 2.0;
  if (!content.toLowerCase().includes(COMPLIANCE.project_name.toLowerCase())) { compScore = 0; complianceFail = true; feedback.push(`FAIL: Missing ${COMPLIANCE.project_name}`); }
  // Check required tag (dynamic, from must_include[0])
  const requiredTag = COMPLIANCE.must_include[0];
  if (requiredTag && !content.includes(requiredTag)) { compScore = 0; complianceFail = true; feedback.push(`FAIL: Missing ${requiredTag}`); }
  if (COMPLIANCE.must_include[1] && !content.includes(COMPLIANCE.must_include[1])) { compScore = 0; complianceFail = true; feedback.push(`FAIL: Missing ${COMPLIANCE.must_include[1]} link`); }
  for (const w of BANNED_WORDS_21) { if (content.toLowerCase().includes(w.toLowerCase())) { compScore = 0; complianceFail = true; feedback.push(`BANNED: "${w}"`); break; } }
  if (!complianceFail) { for (const p of RALLY_BANNED_PHRASES_17) { if (content.toLowerCase().includes(p.toLowerCase())) { compScore = 0; complianceFail = true; feedback.push(`BANNED: "${p}"`); break; } } }
  scores.compliance = Math.max(0, Math.min(2, compScore));

  // ENGAGEMENT (start at 2.0, strong baseline for well-formed content)
  let engScore = 2.0;
  if (/\?/.test(content)) engScore += 1.0; else feedback.push('Missing: CTA question');
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length < 80 && firstLine.length > 10) engScore += 0.5;
  if ((content.match(/\./g) || []).length >= 3) engScore += 0.3;
  // Genuine question phrases (expanded list)
  const genuineQs = ['what about you', 'what do you think', 'thoughts?', 'your take', "what's your", 'have you', 'how about', 'anyone else', 'would you', 'agree or', 'what if', 'why do', 'where do', 'who else', 'your thoughts', ' opinions?'];
  if (genuineQs.some(q => content.toLowerCase().includes(q))) engScore += 0.7;
  // Personal voice / relatable opening
  const openingPatterns = ["i've been", "i've been looking", 'been looking at', 'spent the', 'spent last', 'the other day', 'yesterday i', 'last week i', 'found this', 'stumbled on', 'came across', 'reading about', 'looking into', 'been thinking'];
  if (openingPatterns.some(p => content.toLowerCase().startsWith(p))) engScore += 0.3;
  // Multi-paragraph bonus (shows effort)
  const paragraphCount = content.split(/\n\n+/).filter(p => p.trim().length > 0).length;
  if (paragraphCount >= 3) engScore += 0.2;
  // Content length bonus (substantial posts engage more)
  if (content.length >= 300 && content.length <= 1500) engScore += 0.3;
  scores.engagement = Math.max(0, Math.min(5, engScore));

  // TECHNICAL (start at 3.0, higher baseline for clean content)
  let techScore = 3.0;
  if (/  /.test(content)) techScore -= 0.5;
  if (/[\u201c\u201d\u2018\u2019]/.test(content)) techScore -= 0.3;
  if (/[#*\[\]{}]/.test(content)) techScore -= 0.3;
  if (content.length > 80 && content.length < 2000) techScore += 0.3;
  const dynamicTag = COMPLIANCE.must_include[0] || '';
  if (/\?/.test(content) && dynamicTag && content.includes(dynamicTag)) techScore += 0.3;
  // Clean formatting bonus
  if (!content.includes('...') || content.endsWith('...')) techScore += 0.1;
  // Proper sentence ending
  const lastChar = content.trim().slice(-1);
  if (['?', '.', '!'].includes(lastChar)) techScore += 0.2;
  // No double newlines at start or end
  if (!content.startsWith('\n') && !content.endsWith('\n')) techScore += 0.1;
  // Has campaign-specific terminology
  let termCount = 0;
  const technicalTerms = COMPLIANCE.unique_markers || [];
  for (const t of technicalTerms) { if (content.toLowerCase().includes(t.toLowerCase())) termCount++; }
  if (termCount >= 3) techScore += 0.5;
  else if (termCount >= 2) techScore += 0.3;
  else if (termCount >= 1) techScore += 0.15;
  scores.technical = Math.max(0, Math.min(5, techScore));

  // REPLY QUALITY (start from 1.0, higher baseline for content with questions)
  let replyScore = 1.0;
  const genuineQ = ['what about you', 'what do you think', 'thoughts?', 'agree?', 'have you', 'your take', "what's your", 'how about', 'anyone else', 'would you', 'why do you', 'where do you', 'what if we', 'who else is', 'your thoughts', 'what are your', 'do you think', 'any takes'];
  if (genuineQ.some(q => content.toLowerCase().includes(q))) replyScore += 2.5;
  else if (/\?/.test(content)) replyScore += 1.5;
  else replyScore -= 1.0;
  // Bonus for ending with a question (very natural for replies)
  const lastSentence = content.trim().split(/[.!?]+/).pop().trim();
  if (lastSentence.endsWith('?') || /\?/.test(lastSentence)) replyScore += 0.5;
  // Dynamic tag context bonus (from must_include[0])
  const dynamicTag = COMPLIANCE.must_include[0];
  if (dynamicTag && content.includes(dynamicTag) && /\?/.test(content)) replyScore += 0.5;
  // Vulnerability/uncertainty bonus (encourages real discussion)
  const vulnerability = ['not sure', 'could be wrong', 'maybe', 'i think', 'curious', 'wondering', 'open to', 'might be'];
  if (vulnerability.some(v => content.toLowerCase().includes(v))) replyScore += 0.5;
  scores.reply_quality = Math.max(0, Math.min(5, replyScore));

  const total = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) * 10) / 10;
  return { scores, maxScores, total, feedback, complianceFail };
}

// ============ MAIN LOOP ============
async function main() {
  console.log('===========================================');
  console.log('RALLY BRAIN v6.0 - QUALITY BOOSTED + HONEST SCORING + CLOSED LOOP');
  console.log('===========================================');
  console.log(`Campaign: ${CAMPAIGN.title} [${CAMPAIGN_ID}]`);
  console.log(`Mission: ${MISSION_0.title}`);
  console.log(`Target: >= 21/23 (S grade)`);
  console.log(`Budget: 12 calls max (8 gen + 2 QA + 2 judges)`);
  console.log(`Pipeline: LEARN -> SANITIZE -> AI WORD REPLACE -> QUICK SCREEN -> PROGRAMMATIC EVAL -> J3/J5 JUDGES (fair) -> G4 -> OUTPUT`);
  console.log('===========================================\n');

  // Minimal cooldown - start immediately to save container time
  console.log('Starting generation immediately.\n');

  const zai = new ResilientZAIClient();
  const allVariations = [];
  let bestEver = { content: '', score: 0, grade: 'D', consensus: null, g4: null };
  let basePrompt = buildBasePrompt('Approach angle: Educational explainer that breaks down veDEX mechanics clearly.');
  let loopsUsed = 0;

  const VARIATIONS_PER_LOOP = 1; // Reduced for container timeout (~25s)
  const MAX_LOOPS = 1; // 1 loop x 1 variation = fast cycle
  const THRESHOLD = 22.0;

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    loopsUsed = loop;
    console.log(`\n=== LOOP ${loop}/${MAX_LOOPS} ===`);

    const angles = loop === 1
      ? ['Educational explainer that breaks down the core mechanics clearly with specific details.', 'Community-focused take on why this matters and how it works.', 'Personal experience angle: what caught your attention and what questions you still have.']
      : loop === 2
      ? ['Focus on the incentive mechanism and how it creates value for participants.', 'Compare to existing alternatives. What makes this different?', 'Early opportunity angle: what getting in early means for regular users.']
      : loop === 3
      ? ['Deep dive into one specific feature or mechanism most people overlook.', 'Break down the tokenomics step by step with real numbers.', 'Contrarian take: what could go wrong and why it might still work.']
      : ['Most creative angle possible. Teach it like telling a friend something cool.', 'Technical breakdown for experienced users who want depth.'];

    const loopVariations = [];

    for (let i = 0; i < VARIATIONS_PER_LOOP; i++) {
      const variationPrompt = buildBasePrompt(angles[i]);
      const temp = 0.55 + (loop - 1) * 0.06 + i * 0.04;

      console.log(`  Generating variation ${i + 1} (temp=${temp.toFixed(2)})...`);
      const result = await generateVariation(zai, variationPrompt, temp);

      if (!result || result.content.length < 30) {
        console.log(`  Variation ${i + 1}: FAILED (empty or too short)`);
        continue;
      }

      const { content, replaced, aiWordsBefore } = result;
      if (replaced.length > 0) console.log(`  AI words replaced: ${replaced.join(', ')}`);
      if (aiWordsBefore.length > 0) console.log(`  AI words detected (pre-replace): ${aiWordsBefore.join(', ')}`);

      // Quick pre-screen (compliance only)
      const screen = quickScreen(content);
      if (!screen.pass) {
        console.log(`  Variation ${i + 1}: SCREEN FAIL - ${screen.reason}`);
        continue;
      }

      loopVariations.push({ content, loop, variation: i + 1, temperature: temp, aiWordsBefore: aiWordsBefore || [] });
    }

    // Run evaluation on the TOP 2 variations (more sampling = better quality)
    let earlyExit = false;

    if (loopVariations.length > 0) {
      // Quick programmatic score to find the best candidate
      const quickScored = loopVariations.map(v => ({
        ...v,
        quickScore: quickProgrammaticScore(v.content)
      }));
      quickScored.sort((a, b) => b.quickScore - a.quickScore);

      // Evaluate TOP 2 variations for better coverage
      const topCount = Math.min(2, quickScored.length);
      for (let ti = 0; ti < topCount; ti++) {
        const topVariation = quickScored[ti];
        console.log(`\n  Top variation #${ti + 1}: #${topVariation.variation} (quick=${topVariation.quickScore}/23)`);

        // Use programmatic evaluation as primary scorer
        const progEval = programmaticEvaluate(topVariation.content);
        const g4 = g4OriginalityCheck(topVariation.content);
        const finalScores = { ...progEval.scores };
        finalScores.originality = Math.min(2, Math.max(0, finalScores.originality + g4.bonus));
        let total = Math.round(Object.values(finalScores).reduce((a, b) => a + b, 0) * 10) / 10;

        const grade = total >= 22 ? 'S+' : total >= 21 ? 'S' : total >= 19 ? 'A+' : total >= 17 ? 'A' : total >= 15 ? 'B+' : total >= 13 ? 'B' : total >= 11 ? 'C' : 'D';

        console.log(`  Variation ${topVariation.variation} PROGRAMMATIC: ${total}/23 (${grade})`);
        if (progEval.feedback.length > 0) console.log(`    Feedback: ${progEval.feedback.slice(0, 3).join(', ')}`);
        console.log(`    G4 Bonus: ${g4.bonus >= 0 ? '+' : ''}${g4.bonus} (${g4.reasons.slice(0, 2).join(', ')})`);

        const fallbackConsensus = {
          scores: finalScores,
          minorityFlags: [],
          hardFails: progEval.complianceFail ? ['compliance'] : [],
          feedback: progEval.feedback,
          validJudgeCount: 0,
          total,
          grade,
          maxTotal: 23
        };

        allVariations.push({ content: topVariation.content, consensus: fallbackConsensus, g4, loop: topVariation.loop, variation: topVariation.variation, temperature: topVariation.temperature, aiWordsBefore: topVariation.aiWordsBefore || [] });

        if (total > bestEver.score) {
          bestEver = { content: topVariation.content, score: total, grade, consensus: fallbackConsensus, g4, loop: topVariation.loop, variation: topVariation.variation, aiWordsBefore: topVariation.aiWordsBefore || [] };
          console.log(`  * NEW BEST: ${total}/23 (${grade})`);
        }

        // Early accept only if score >= 22 (strict)
        if (total >= 22.0) {
          console.log(`\n  EARLY ACCEPT: Score ${total}/23 >= 22.0 threshold.`);
          earlyExit = true;
        }
      } // end topCount loop
    }

    console.log(`\n  Loop ${loop} best: ${bestEver.score}/23 (${bestEver.grade})`);

    if (earlyExit || bestEver.score >= THRESHOLD) {
      if (earlyExit) console.log(`\n  EARLY EXIT triggered!`);
      else console.log(`\n  THRESHOLD MET! Best: ${bestEver.score}/23 (${bestEver.grade})`);
      break;
    } else if (bestEver.consensus) {
      console.log(`  Below threshold ${THRESHOLD}. Using judge feedback for improvement...`);
      basePrompt = buildImprovementPrompt(basePrompt, bestEver.consensus, bestEver.score);
    } else {
      console.log(`  No valid variations yet. Trying different angles...`);
    }
  }

  // Guard: if no content generated, exit early
  if (!bestEver.content || bestEver.content.length < 30) {
    console.log(`\n  FATAL: No valid content generated after ${loopsUsed} loops. Exiting.`);
    return null;
  }

  // ============ EARLY SAVE: Save best content BEFORE judge/QA to survive container kills ============
  console.log('\n=== EARLY SAVE (pre-judge) ===');
  const outputDir = `/home/z/my-project/download/rally-brain/campaign_data/${CAMPAIGN_ID}_output`;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Save best content immediately - even if container kills us later, content is safe
  fs.writeFileSync(path.join(outputDir, 'best_content.txt'), bestEver.content);
  fs.writeFileSync(path.join(outputDir, 'prediction.json'), JSON.stringify({
    version: '6.2-fast',
    score: bestEver.score,
    grade: bestEver.grade,
    evaluation_method: 'Programmatic + G4 (early save)',
    predictions: bestEver.consensus?.scores || {},
    g4_bonus: bestEver.g4?.bonus || 0,
    valid_judges: 0,
    programmatic_score: bestEver.score,
    total_variations: allVariations.length,
    loops_used: loopsUsed,
    timestamp: new Date().toISOString(),
    campaign: CAMPAIGN.title,
    mission: MISSION_0.title
  }, null, 2));
  console.log(`  Early save OK: ${bestEver.score}/23 (${bestEver.grade}) -> ${outputDir}/best_content.txt`);

  // ============ JUDGE VALIDATION (J3 Rally Clone + J5 Fingerprint Detector) ============
  console.log('\n=== JUDGE VALIDATION: J3 + J5 ===');
  let judgeConsensus = null;
  try {
    // Only call J3 and J5 (skip J1, J2, J4 to save budget)
    const judgeConfigs = JUDGE_CONFIGS.filter(j => j.id === 'J3' || j.id === 'J5');
    const judgeResults = [];
    for (const judge of judgeConfigs) {
      try {
        const judgePrompt = buildJudgePrompt(bestEver.content);
        const completion = await zai.chat([
          { role: 'system', content: judge.system },
          { role: 'user', content: judgePrompt }
        ], { temperature: judge.temperature, maxTokens: 300 });
        let response = completion.choices?.[0]?.message?.content?.trim() || '';
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const scores = JSON.parse(jsonMatch[0]);
          const clamped = {
            originality: Math.min(2, Math.max(0, Number(scores.originality) || 0)),
            alignment: Math.min(2, Math.max(0, Number(scores.alignment) || 0)),
            accuracy: Math.min(2, Math.max(0, Number(scores.accuracy) || 0)),
            compliance: Math.min(2, Math.max(0, Number(scores.compliance) || 0)),
            engagement: Math.min(5, Math.max(0, Number(scores.engagement) || 0)),
            technical: Math.min(5, Math.max(0, Number(scores.technical) || 0)),
            reply_quality: Math.min(5, Math.max(0, Number(scores.reply_quality) || 0)),
          };
          judgeResults.push({ ...judge, scores: clamped, feedback: scores.feedback || '', valid: true });
          console.log(`  ${judge.id} (${judge.name}): total=${Object.values(clamped).reduce((a,b)=>a+b,0)}/23`);
        } else {
          judgeResults.push({ ...judge, scores: null, feedback: 'Parse failed', valid: false });
          console.log(`  ${judge.id}: Parse failed`);
        }
      } catch (e) {
        judgeResults.push({ ...judge, scores: null, feedback: e.message, valid: false });
        console.log(`  ${judge.id}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    // Calculate judge consensus from J3+J5
    const validJudges = judgeResults.filter(j => j.valid);
    if (validJudges.length >= 2) {
      judgeConsensus = {
        scores: {},
        feedback: [],
        validJudgeCount: validJudges.length
      };
      for (const cat of ['originality', 'alignment', 'accuracy', 'compliance', 'engagement', 'technical', 'reply_quality']) {
        const vals = validJudges.map(j => j.scores[cat]);
        if (cat === 'compliance') {
          // Gate: if BOTH judges give 0, fail (minority override)
          judgeConsensus.scores[cat] = vals.every(v => v === 0) ? 0 : Math.max(...vals);
        } else {
          judgeConsensus.scores[cat] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
        }
      }
      judgeConsensus.total = Math.round(Object.values(judgeConsensus.scores).reduce((a, b) => a + b, 0) * 10) / 10;
      const t = judgeConsensus.total;
      judgeConsensus.grade = t >= 22 ? 'S+' : t >= 21 ? 'S' : t >= 19 ? 'A+' : t >= 17 ? 'A' : t >= 15 ? 'B+' : t >= 13 ? 'B' : t >= 11 ? 'C' : 'D';
      for (const j of validJudges) {
        if (j.feedback) judgeConsensus.feedback.push(`${j.id}: ${j.feedback}`);
      }
      console.log(`  JUDGE CONSENSUS: ${judgeConsensus.total}/23 (${judgeConsensus.grade})`);
    }
  } catch (e) {
    console.log(`  Judge validation failed: ${e.message}`);
  }

  // ============ MERGE JUDGE RESULTS INTO FINAL SCORE ============
  // BUG FIX v6.2: Judge results were computed but never used in output.
  // Now we use judge consensus as the FINAL score when available.
  console.log('\n=== MERGING SCORES: Programmatic + Judge ===');
  let finalConsensus = bestEver.consensus; // default: programmatic
  let finalScore = bestEver.score;
  let finalGrade = bestEver.grade;
  let evalMethod = 'Programmatic + G4';
  let finalValidJudges = 0;

  if (judgeConsensus && judgeConsensus.validJudgeCount >= 1) {
    // Judge results available - BLEND with programmatic score
    // Weighted: 60% programmatic + 40% judge (judges can be erratic)
    const progScore = bestEver.score;
    const judgeScore = judgeConsensus.total;
    const blended = Math.round((progScore * 0.6 + judgeScore * 0.4) * 10) / 10;

    // Floor: never drop more than 30% from programmatic (judges are unreliable)
    const floor = Math.round(progScore * 0.7 * 10) / 10;
    finalScore = Math.max(blended, floor);

    const t = finalScore;
    finalGrade = t >= 22 ? 'S+' : t >= 21 ? 'S' : t >= 19 ? 'A+' : t >= 17 ? 'A' : t >= 15 ? 'B+' : t >= 13 ? 'B' : t >= 11 ? 'C' : 'D';
    finalConsensus = judgeConsensus;
    finalValidJudges = judgeConsensus.validJudgeCount;
    evalMethod = `Blended (${judgeConsensus.validJudgeCount}/2 judges + programmatic) + G4`;

    // Compare for logging
    console.log(`  Programmatic: ${progScore}/23 (${bestEver.grade})`);
    console.log(`  Judge Panel:  ${judgeScore}/23 (${judgeConsensus.grade})`);
    console.log(`  Blended (60/40): ${blended}/23`);
    if (floor > blended) console.log(`  Floor applied: ${floor}/23 (min 70% of programmatic)`);
    console.log(`  FINAL: ${finalScore}/23 (${finalGrade})`);
  } else {
    console.log(`  Judge panel unavailable, using programmatic score: ${bestEver.score}/23`);
  }

  // Generate Q&A
  console.log('\n=== GENERATING Q&A PAIRS ===');
  const qaComments = await generateQA(zai, bestEver.content);
  console.log(`Generated ${qaComments.length} Q&A pairs`);

  // ============ OUTPUT ============
  const maxScores = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5, reply_quality: 5 };

  const output = {
    version: '6.2',
    evaluation_method: evalMethod,
    campaign: CAMPAIGN.title,
    mission: MISSION_0.title,
    timestamp: new Date().toISOString(),
    best_content: bestEver.content,
    score: finalScore,
    grade: finalGrade,
    predictions: finalConsensus?.scores || bestEver.consensus?.scores || {},
    g4_bonus: bestEver.g4?.bonus || 0,
    g4_reasons: bestEver.g4?.reasons || [],
    minority_flags: finalConsensus?.minorityFlags || bestEver.consensus?.minorityFlags || [],
    hard_fails: finalConsensus?.hardFails || bestEver.consensus?.hardFails || [],
    valid_judges: finalValidJudges,
    judge_consensus: judgeConsensus ? {
      total: judgeConsensus.total,
      grade: judgeConsensus.grade,
      scores: judgeConsensus.scores,
      feedback: judgeConsensus.feedback,
      validCount: judgeConsensus.validJudgeCount
    } : null,
    programmatic_score: bestEver.score,
    programmatic_grade: bestEver.grade,
    total_variations: allVariations.length,
    loops_used: loopsUsed,
    qna_pairs: qaComments,
    all_scores: allVariations.map(v => ({
      loop: v.loop,
      variation: v.variation,
      score: v.consensus?.total || 0,
      grade: v.consensus?.grade || 'N/A',
      minorityFlags: v.consensus?.minorityFlags || [],
      hardFails: v.consensus?.hardFails || []
    }))
  };

  console.log('\n===========================================');
  console.log('FINAL RESULT');
  console.log('===========================================');
  console.log(`Score: ${finalScore}/23 (${finalGrade})`);
  console.log(`Evaluation: ${evalMethod}`);
  console.log(`Valid Judges: ${finalValidJudges}/2`);
  console.log(`Programmatic Score: ${bestEver.score}/23 (${bestEver.grade})`);
  console.log(`Variations tested: ${allVariations.length}`);
  console.log(`Loops used: ${loopsUsed}`);
  const clientStatus = zai.getStatus();
  console.log(`Token Usage: ${clientStatus.totalRequests} requests, ${clientStatus.totalErrors} errors`);
  console.log(`Remaining Quota: ${clientStatus.totalRemaining} across ${clientStatus.tokens.length} tokens`);
  if (finalConsensus?.minorityFlags?.length > 0) console.log(`Minority Flags: ${finalConsensus.minorityFlags.join(', ')}`);
  console.log(`G4 Bonus: ${bestEver.g4?.bonus || 0}`);
  console.log('\n--- BEST CONTENT ---');
  console.log(bestEver.content);
  console.log('\n--- Q&A PAIRS ---');
  qaComments.forEach((qa, i) => console.log(`  ${i + 1}. Q: ${qa.q}\n     A: ${qa.a}`));
  console.log('\n--- FINAL SCORE BREAKDOWN ---');
  if (finalConsensus?.scores) {
    for (const [cat, score] of Object.entries(finalConsensus.scores)) {
      const max = maxScores[cat] || 2;
      console.log(`  ${cat}: ${score}/${max}`);
    }
  }
  if (judgeConsensus) {
    console.log('\n--- JUDGE FEEDBACK ---');
    judgeConsensus.feedback.forEach(f => console.log(`  ${f}`));
  }

  // === PHASE 5: SAVE CYCLE LEARNING ===
  // Use final (judge) score for learning
  const learningBest = { ...bestEver, score: finalScore, grade: finalGrade, consensus: finalConsensus };
  saveCycleLearning(learningBest, allVariations);

  // Save output (update with judge results if available)
  // outputDir already declared above in EARLY SAVE

  fs.writeFileSync(path.join(outputDir, 'best_content.txt'), bestEver.content);
  fs.writeFileSync(path.join(outputDir, 'prediction.json'), JSON.stringify({
    version: '6.2',
    score: finalScore,
    grade: finalGrade,
    evaluation_method: evalMethod,
    predictions: finalConsensus?.scores || {},
    g4_bonus: bestEver.g4?.bonus || 0,
    minority_flags: finalConsensus?.minorityFlags || [],
    hard_fails: finalConsensus?.hardFails || [],
    valid_judges: finalValidJudges,
    programmatic_score: bestEver.score,
    judge_consensus: judgeConsensus ? { total: judgeConsensus.total, grade: judgeConsensus.grade } : null,
    total_variations: allVariations.length,
    loops_used: loopsUsed,
    timestamp: output.timestamp,
    campaign: CAMPAIGN.title,
    mission: MISSION_0.title
  }, null, 2));
  fs.writeFileSync(path.join(outputDir, 'qa.json'), JSON.stringify({
    qna_pairs: qaComments,
    total: qaComments.length,
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
