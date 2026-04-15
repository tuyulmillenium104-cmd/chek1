#!/usr/bin/env node
/**
 * Rally Brain v7.1 — Deep Learning Pipeline
 * 
 * Extracts structured features from Rally.fun submissions using
 * the rich AI judge category_analysis (7 dimensions, each 200-500 words).
 * 
 * Generates actionable learned_rules that can be injected into generate.js.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'campaign_data/v7_collected/all_submissions.jsonl');
const OUTPUT_DB = path.join(__dirname, 'campaign_data/v7_learning_db.json');
const OUTPUT_RULES = path.join(__dirname, 'campaign_data/learned_rules.json');

// ─── Deep Feature Extractors ──────────────────────────────────────

function deepExtract(analysis, scores) {
  const f = {};
  const allText = Object.values(analysis).join(' ').toLowerCase();
  
  // ── ORIGINALITY features ──
  const orig = (analysis.originality || '').toLowerCase();
  f.personal_touch = countMatches(orig, /personal|anecdote|experience|tried|my first|my own/i);
  f.unique_angle = countMatches(orig, /unique|fresh|distinctive|standout|differentiate|refram/i);
  f.not_generic = countMatches(orig, /avoids? generic|not generic|not templated|not formulaic|breaks?.*mold/i);
  f.authentic_tone = countMatches(orig, /authentic|genuine|natural|conversational|not ai/i);
  f.specific_examples = countMatches(orig, /specific examples|concrete details|actual.*number|real.*example/i);
  f.creative_approach = countMatches(orig, /creative|imaginative|novel|innovative|clever/i);
  f.insightful = countMatches(orig, /insight|observation|perspective|nuance|depth/i);
  
  // ── ALIGNMENT features ──
  const align = (analysis.alignment || '').toLowerCase();
  f.covers_mechanism = countMatches(align, /how.*works|mechanism|process|submit.*scor|how rally/i);
  f.covers_rewards = countMatches(align, /usdc|stable.*coin|earning|payout|rally points|reward/i);
  f.covers_ai_scoring = countMatches(align, /ai scor|ai evaluat|intelligent contract|genlayer/i);
  f.covers_fairness = countMatches(align, /fair|quality.*over|small.*account|no.*follower.*minimum/i);
  f.covers_urgency = countMatches(align, /early|first mover|being early|don't miss|opportunity|window/i);
  f.covers_ecosystem = countMatches(align, /ecosystem|infrastructure|protocol|layer|base|zksync/i);
  f.tone_match = countMatches(align, /tone.*match|fits.*directive|align.*style|appropriate.*tone/i);
  f.terminology_correct = countMatches(align, /correct.*terminology|contextually appropriate|proper.*term/i);
  
  // ── ACCURACY features ──
  const acc = (analysis.accuracy || '').toLowerCase();
  f.no_false_claims = countMatches(acc, /no false|no misleading|accurate|correctly states?|consistent/i);
  f.factual_depth = countMatches(acc, /explains?|details?|elaborates?|specific|nuance/i);
  
  // ── COMPLIANCE features ──
  const comp = (analysis.compliance || '').toLowerCase();
  f.tags_rally = countMatches(comp, /rallyonchain|@rally/i);
  f.no_hashtags = countMatches(comp, /no hashtag|zero hashtags/i);
  f.no_emdash = countMatches(comp, /no em dash|em dashes? absent/i);
  f.not_start_mention = countMatches(comp, /does not start with/i);
  
  // ── ENGAGEMENT features ──
  const eng = (analysis.engagement || '').toLowerCase();
  f.strong_hook = countMatches(eng, /strong hook|compelling|grab|attention|immediately/i);
  f.clear_cta = countMatches(eng, /clear cta|call.to.action|encourag|prompt|invit/i);
  f.fomo_element = countMatches(eng, /fomo|urgency|miss out|time.*running|window.*clos/i);
  f.conversation_starter = countMatches(eng, /conversation|debate|discuss|prompt|encourage.*engagement/i);
  f.value_delivery = countMatches(eng, /value delivery|explains.*mechanism|provides.*insight|informative/i);
  f.emotional_resonance = countMatches(eng, /emotional|resonat|passionate|enthusiastic|excit/i);
  f.relatable = countMatches(eng, /relatable|accessible|familiar|understandable/i);
  f.challenges_status_quo = countMatches(eng, /challenge|disrupt|questioning|norms|paradigm/i);
  f.has_referral = countMatches(eng, /referral|link.*join|signup|sign up/i);
  
  // ── TECHNICAL features ──
  const tech = (analysis.technical || '').toLowerCase();
  f.good_grammar = countMatches(tech, /grammar.*correct|solid.*grammar|no spelling|proper grammar/i);
  f.good_formatting = countMatches(tech, /paragraph break|line break|well.?structured|formatting/i);
  f.readable_flow = countMatches(tech, /logical flow|narrative progression|builds.*logically|smooth flow/i);
  f.not_ai_sounding = countMatches(tech, /not ai|avoids? ai|doesn't sound ai|non.?robotic/i);
  f.platform_optimized = countMatches(tech, /platform.*optim|optimal.*length|appropriate.*length|well.?suited/i);
  
  // ── REPLY QUALITY features ──
  const reply = (analysis.reply_quality || '').toLowerCase();
  f.has_substantive_replies = countMatches(reply, /substantive|critical thinking|in.depth|thoughtful/i);
  f.replies_not_generic = !countMatches(reply, /generic|shallow|repetitive|templated/i) ? 1 : 0;
  
  // ── Content structure features ──
  f.is_longform = countMatches(allText, /long.?form|lengthy|extended|191 words|200.*char/i);
  f.includes_media = countMatches(allText, /media|photo|image|screenshot/i);
  f.is_thread = countMatches(allText, /thread|multi.?tweet/i);
  
  // ── Detect hook type ──
  f.hook_type = detectHook(eng);
  
  // ── Detect content angle ──
  f.content_angle = detectAngle(orig, align, eng);
  
  return f;
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function detectHook(engText) {
  if (/announc|live|launch|beta.*live/i.test(engText)) return 'announcement';
  if (/personal|anecdote|experience|story/i.test(engText)) return 'personal_story';
  if (/contrast|however|while.*most|noise.*system/i.test(engText)) return 'contrast';
  if (/question|what if|wonder|asking/i.test(engText)) return 'question';
  if (/provocative|hot take|unpopular|counter/i.test(engText)) return 'provocative';
  if (/statistic|number|data|metric|percentage/i.test(engText)) return 'data_driven';
  if (/imagine|picture this|scenario/i.test(engText)) return 'imagination';
  return 'direct_statement';
}

function detectAngle(origText, alignText, engText) {
  const combined = origText + ' ' + alignText;
  if (/gamer|persona|blending.*persona/i.test(combined)) return 'persona_driven';
  if (/philosophical|reframe|paradigm|mental model/i.test(combined)) return 'philosophical';
  if (/personal|anecdote|experience|tried|my first/i.test(combined)) return 'personal_experience';
  if (/explanatory|explains|breaks? down|how.*works/i.test(combined)) return 'educational';
  if (/review|honest.*take|opinion|assessment/i.test(combined)) return 'review_opinion';
  if (/comparison|compare|vs|versus|traditional/i.test(combined)) return 'comparison';
  if (/list|numbered|reasons|ways|things/i.test(combined)) return 'listicle';
  if (/story|narrative|journey/i.test(combined)) return 'storytelling';
  return 'standard_promotional';
}

// ─── Statistical Analysis ─────────────────────────────────────────

function analyzePatterns(submissions) {
  // Split into tiers
  const S = submissions.filter(s => s.score >= 21);  // Top tier
  const A = submissions.filter(s => s.score >= 18 && s.score < 21);
  const C = submissions.filter(s => s.score < 16);   // Bottom tier
  
  const allFeatures = Object.keys(S[0]?.features || {});
  
  const results = {};
  
  for (const key of allFeatures) {
    if (typeof S[0].features[key] === 'string') {
      // Categorical feature
      const sVals = S.map(s => s.features[key]);
      const aVals = A.map(s => s.features[key]);
      const cVals = C.map(s => s.features[key]);
      
      results[key] = {
        type: 'categorical',
        S: frequency(sVals),
        A: frequency(aVals),
        C: frequency(cVals)
      };
    } else {
      // Numeric feature (0, 1, 2, 3...)
      const sAvg = S.reduce((sum, s) => sum + (s.features[key] || 0), 0) / S.length;
      const aAvg = A.reduce((sum, s) => sum + (s.features[key] || 0), 0) / A.length;
      const cAvg = C.reduce((sum, s) => sum + (s.features[key] || 0), 0) / C.length;
      const sPct = S.filter(s => s.features[key] > 0).length / S.length * 100;
      const cPct = C.filter(s => s.features[key] > 0).length / C.length * 100;
      
      results[key] = {
        type: 'numeric',
        S_avg: sAvg.toFixed(2),
        A_avg: aAvg.toFixed(2),
        C_avg: cAvg.toFixed(2),
        S_pct: sPct.toFixed(0),
        C_pct: cPct.toFixed(0),
        diff_pct: (sPct - cPct).toFixed(0),
        s_count: S.filter(s => s.features[key] > 0).length,
        c_count: C.filter(s => s.features[key] > 0).length
      };
    }
  }
  
  return results;
}

function frequency(arr) {
  const counts = {};
  for (const v of arr) counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// ─── Rule Generation ──────────────────────────────────────────────

function generateRules(patterns, submissions) {
  const rules = [];
  const S = submissions.filter(s => s.score >= 21);
  const C = submissions.filter(s => s.score < 16);
  
  for (const [key, data] of Object.entries(patterns)) {
    if (data.type === 'numeric' && Math.abs(parseFloat(data.diff_pct)) >= 12) {
      const positive = parseFloat(data.diff_pct) > 0;
      const strength = Math.abs(parseFloat(data.diff_pct)) >= 25 ? 'STRONG' : 'MODERATE';
      
      rules.push({
        feature: key,
        action: positive ? 'EMPHASIZE' : 'MINIMIZE',
        strength,
        evidence: {
          winners_pct: `${data.S_pct}% have this`,
          losers_pct: `${data.C_pct}% have this`,
          diff: `${data.diff_pct}% difference`
        }
      });
    }
  }
  
  // Sort by strength and diff
  rules.sort((a, b) => {
    const strengthOrder = { STRONG: 3, MODERATE: 2 };
    return (strengthOrder[b.strength] || 0) - (strengthOrder[a.strength] || 0);
  });
  
  return rules;
}

function generateActionableDirectives(rules, patterns, submissions) {
  const S = submissions.filter(s => s.score >= 21);
  const directives = [];
  
  // ── Content Strategy Directives ──
  const topAngles = frequency(S.map(s => s.features.content_angle)).slice(0, 3);
  if (topAngles.length > 0) {
    directives.push({
      category: 'content_strategy',
      priority: 'HIGH',
      directive: `Use content angles that win: ${topAngles.map(a => a[0]).join(', ')}`,
      evidence: `Top scorers use these angles: ${topAngles.map(a => `${a[0]} (${a[1]}x)`).join(', ')}`
    });
  }
  
  const topHooks = frequency(S.map(s => s.features.hook_type)).slice(0, 3);
  if (topHooks.length > 0) {
    directives.push({
      category: 'hook_strategy',
      priority: 'HIGH',
      directive: `Use these hook types: ${topHooks.map(a => a[0]).join(', ')}`,
      evidence: `Winning hooks: ${topHooks.map(a => `${a[0]} (${a[1]}x)`).join(', ')}`
    });
  }
  
  // ── Convert rules to natural language directives ──
  for (const rule of rules) {
    let directive = '';
    const feature = rule.feature.replace(/_/g, ' ');
    
    if (rule.action === 'EMPHASIZE') {
      directive = `Emphasize ${feature} in content`;
    } else {
      directive = `Avoid over-focusing on ${feature} — it correlates with lower scores`;
    }
    
    directives.push({
      category: 'writing_technique',
      priority: rule.strength === 'STRONG' ? 'HIGH' : 'MEDIUM',
      directive,
      evidence: rule.evidence.winners_pct + ' vs ' + rule.evidence.losers_pct
    });
  }
  
  return directives;
}

// ─── Main Pipeline ─────────────────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Rally Brain v7.1 — Deep Learning Pipeline');
  console.log('═══════════════════════════════════════════════\n');
  
  // 1. Load
  const rawLines = fs.readFileSync(DATA_FILE, 'utf-8').trim().split('\n');
  console.log(`📂 Loaded ${rawLines.length} submissions`);
  
  const submissions = [];
  
  for (const line of rawLines) {
    try {
      const d = JSON.parse(line);
      
      let analysis = d.category_analysis || {};
      if (typeof analysis === 'string') try { analysis = JSON.parse(analysis); } catch { analysis = {}; }
      
      let scores = d.category_scores || {};
      if (typeof scores === 'string') try { scores = JSON.parse(scores); } catch { scores = {}; }
      
      if (!analysis || Object.keys(analysis).length === 0) continue;
      
      const features = deepExtract(analysis, scores);
      
      submissions.push({
        id: d.id,
        tweet_id: d.tweet_id,
        x_username: d.x_username,
        score: d.total_score,
        max_score: d.max_score,
        category_scores: scores,
        category_analysis: analysis,
        features
      });
    } catch {}
  }
  
  console.log(`✅ Processed: ${submissions.length} submissions\n`);
  
  // 2. Score distribution
  const tiers = { 'S+ (23)': 0, 'S (22)': 0, 'A+ (21)': 0, 'A (20)': 0, 'B+ (19)': 0, 'B (18)': 0, 'C+ (17)': 0, 'C (16)': 0, 'D (15)': 0, 'F (<15)': 0 };
  for (const s of submissions) {
    const sc = s.score;
    if (sc >= 23) tiers['S+ (23)']++;
    else if (sc >= 22) tiers['S (22)']++;
    else if (sc >= 21) tiers['A+ (21)']++;
    else if (sc >= 20) tiers['A (20)']++;
    else if (sc >= 19) tiers['B+ (19)']++;
    else if (sc >= 18) tiers['B (18)']++;
    else if (sc >= 17) tiers['C+ (17)']++;
    else if (sc >= 16) tiers['C (16)']++;
    else if (sc >= 15) tiers['D (15)']++;
    else tiers['F (<15)']++;
  }
  
  console.log('📊 Score Distribution:');
  for (const [label, count] of Object.entries(tiers)) {
    if (count > 0) {
      const bar = '█'.repeat(count);
      console.log(`  ${label}: ${String(count).padStart(3)} ${bar}`);
    }
  }
  
  // 3. Pattern analysis
  console.log('\n🔍 Deep pattern analysis...');
  const patterns = analyzePatterns(submissions);
  
  // 4. Generate rules
  const rules = generateRules(patterns, submissions);
  console.log(`\n📋 Generated ${rules.length} learned rules:\n`);
  
  for (const rule of rules) {
    const icon = rule.action === 'EMPHASIZE' ? '🟢' : '🔴';
    const strength = rule.strength === 'STRONG' ? '⚡' : '  ';
    console.log(`  ${strength}${icon} [${rule.strength}] ${rule.feature.replace(/_/g, ' ').toUpperCase()}`);
    console.log(`       Action: ${rule.action} | ${rule.evidence.diff}`);
  }
  
  // 5. Generate directives
  console.log('\n📝 Generating actionable directives...');
  const directives = generateActionableDirectives(rules, patterns, submissions);
  
  console.log('\n═══ ACTIONABLE DIRECTIVES FOR GENERATION ═══\n');
  for (const d of directives) {
    const icon = d.priority === 'HIGH' ? '🔥' : '💡';
    console.log(`  ${icon} [${d.priority}] ${d.directive}`);
    console.log(`     ↳ ${d.evidence}\n`);
  }
  
  // 6. Save learning database
  const db = {
    version: 'v7.1',
    generated_at: new Date().toISOString(),
    total_submissions: submissions.length,
    tiers: {
      S_plus: submissions.filter(s => s.score >= 23).length,
      S: submissions.filter(s => s.score >= 22 && s.score < 23).length,
      A_plus: submissions.filter(s => s.score >= 21 && s.score < 22).length,
      A: submissions.filter(s => s.score >= 20 && s.score < 21).length,
      B_plus: submissions.filter(s => s.score >= 19 && s.score < 20).length,
      B: submissions.filter(s => s.score >= 18 && s.score < 19).length,
      C_and_below: submissions.filter(s => s.score < 18).length,
    },
    stats: {
      avg_score: (submissions.reduce((s, x) => s + x.score, 0) / submissions.length).toFixed(1),
      avg_S: submissions.filter(s => s.score >= 21).length > 0 
        ? (submissions.filter(s => s.score >= 21).reduce((s, x) => s + x.score, 0) / submissions.filter(s => s.score >= 21).length).toFixed(1) 
        : 'N/A',
    },
    patterns,
    rules,
    directives,
    all_submissions: submissions.map(s => ({
      score: s.score,
      username: s.x_username,
      features: s.features
    }))
  };
  
  fs.writeFileSync(OUTPUT_DB, JSON.stringify(db, null, 2));
  
  // 7. Save learned rules (compact format for injection into generate.js)
  const rulesForGeneration = {
    version: 'v7.1',
    updated_at: new Date().toISOString(),
    from_submissions: submissions.length,
    directives: directives.filter(d => d.priority === 'HIGH').map(d => d.directive),
    rules: rules.map(r => ({
      feature: r.feature,
      action: r.action,
      strength: r.strength
    })),
    // Content angle recommendations
    top_angles: frequency(submissions.filter(s => s.score >= 21).map(s => s.features.content_angle)).slice(0, 5),
    top_hooks: frequency(submissions.filter(s => s.score >= 21).map(s => s.features.hook_type)).slice(0, 5),
    // Negative signals (what to avoid)
    avoid_patterns: rules.filter(r => r.action === 'MINIMIZE').map(r => r.feature),
    // Positive signals (what to emphasize)
    emphasize_patterns: rules.filter(r => r.action === 'EMPHASIZE').map(r => r.feature)
  };
  
  fs.writeFileSync(OUTPUT_RULES, JSON.stringify(rulesForGeneration, null, 2));
  
  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅ LEARNING COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  📁 Learning DB: ${OUTPUT_DB}`);
  console.log(`  📁 Learned Rules: ${OUTPUT_RULES}`);
  console.log(`  📊 ${submissions.length} submissions → ${rules.length} rules → ${directives.length} directives`);
  
  return db;
}

const db = main();
