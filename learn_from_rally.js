#!/usr/bin/env node
/**
 * Rally Brain v7.1 — Learn from REAL Rally.fun Campaign
 * 
 * Fetches submissions from Rally.fun API, runs deep pattern analysis,
 * and generates learned_rules.json for content generation.
 * 
 * Usage:
 *   node learn_from_rally.js <campaignAddress> [missionId]
 *   node learn_from_rally.js 0xF9C91... mission-0
 * 
 * Supports STOP via: touch campaign_data/.stop_learning
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const RALLY_DIR = __dirname;
const DATA_DIR = path.join(RALLY_DIR, 'campaign_data');
const STOP_FILE = path.join(DATA_DIR, '.stop_learning');
const STATUS_FILE = path.join(DATA_DIR, '.learning_status.json');

// ─── Helpers ─────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  console.log(line);
  writeStatus({ lastLog: line });
}

function writeStatus(data) {
  try {
    let current = {};
    if (fs.existsSync(STATUS_FILE)) {
      current = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
    fs.writeFileSync(STATUS_FILE, JSON.stringify({ ...current, ...data, updatedAt: new Date().toISOString() }, null, 2));
  } catch {}
}

function isStopped() {
  if (fs.existsSync(STOP_FILE)) {
    fs.unlinkSync(STOP_FILE);
    return true;
  }
  return false;
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Feature Extraction ──────────────────────────────────────────

function extractFeatures(analysis) {
  const f = {};
  const allText = Object.values(analysis).join(' ').toLowerCase();
  
  const orig = (analysis.originality || '').toLowerCase();
  f.personal_touch = matchCount(orig, /personal|anecdote|experience|tried|my first|my own/i);
  f.unique_angle = matchCount(orig, /unique|fresh|distinctive|standout|differentiate|refram/i);
  f.not_generic = matchCount(orig, /avoids? generic|not generic|not templated|not formulaic/i);
  f.authentic_tone = matchCount(orig, /authentic|genuine|natural|conversational|not ai/i);
  f.specific_examples = matchCount(orig, /specific examples|concrete details|actual.*number/i);
  f.creative = matchCount(orig, /creative|imaginative|novel|innovative|clever/i);
  
  const align = (analysis.alignment || '').toLowerCase();
  f.covers_mechanism = matchCount(align, /how.*works|mechanism|submit.*scor/i);
  f.covers_rewards = matchCount(align, /usdc|stable.*coin|earning|payout|rally points/i);
  f.covers_ai_scoring = matchCount(align, /ai scor|ai evaluat|intelligent contract/i);
  f.covers_fairness = matchCount(align, /fair|quality.*over|small.*account|no.*follower/i);
  
  const eng = (analysis.engagement || '').toLowerCase();
  f.strong_hook = matchCount(eng, /strong hook|compelling|grab|attention|immediately/i);
  f.clear_cta = matchCount(eng, /clear cta|call.to.action|encourag/i);
  f.fomo_element = matchCount(eng, /fomo|urgency|miss out|window.*clos/i);
  f.conversation_starter = matchCount(eng, /conversation|debate|discuss|spark/i);
  f.value_delivery = matchCount(eng, /value delivery|explains.*mechanism|informative/i);
  f.emotional_resonance = matchCount(eng, /emotional|resonat|passionate|enthusiastic/i);
  f.challenges_norms = matchCount(eng, /challenge|disrupt|questioning|norms|paradigm/i);
  f.has_referral = matchCount(eng, /referral|link.*join|signup/i);
  
  const tech = (analysis.technical || '').toLowerCase();
  f.good_grammar = matchCount(tech, /grammar.*correct|solid.*grammar|no spelling/i);
  f.good_formatting = matchCount(tech, /paragraph break|line break|well.?structured/i);
  f.not_ai_sounding = matchCount(tech, /not ai|avoids? ai|doesn't sound ai|non.?robotic/i);
  
  const reply = (analysis.reply_quality || '').toLowerCase();
  f.has_substantive_replies = matchCount(reply, /substantive|critical thinking|in.depth|thoughtful/i);
  f.replies_not_generic = !matchCount(reply, /generic|shallow|repetitive/i) ? 1 : 0;
  
  f.is_longform = matchCount(allText, /long.?form|lengthy|extended/i);
  f.includes_media = matchCount(allText, /media|photo|image|screenshot/i);
  f.hook_type = detectHook(eng);
  f.content_angle = detectAngle(orig, align);
  
  return f;
}

function matchCount(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

function detectHook(eng) {
  if (/announc|live|launch|beta.*live/i.test(eng)) return 'announcement';
  if (/personal|anecdote|experience|story/i.test(eng)) return 'personal_story';
  if (/contrast|however|while.*most|noise.*system/i.test(eng)) return 'contrast';
  if (/question|what if|wonder/i.test(eng)) return 'question';
  if (/provocative|hot take|unpopular/i.test(eng)) return 'provocative';
  if (/data|statistic|number|metric/i.test(eng)) return 'data_driven';
  return 'direct_statement';
}

function detectAngle(orig, align) {
  const combined = orig + ' ' + align;
  if (/gamer|persona/i.test(combined)) return 'persona_driven';
  if (/philosophical|reframe|paradigm|mental model/i.test(combined)) return 'philosophical';
  if (/personal|anecdote|experience|tried/i.test(combined)) return 'personal_experience';
  if (/explanatory|explains|breaks? down/i.test(combined)) return 'educational';
  if (/review|honest.*take|opinion/i.test(combined)) return 'review_opinion';
  if (/story|narrative|journey/i.test(combined)) return 'storytelling';
  return 'standard_promotional';
}

// ─── Pattern Analysis ────────────────────────────────────────────

function analyzePatterns(submissions) {
  const S = submissions.filter(s => s.score >= 21);
  const C = submissions.filter(s => s.score < 16);
  
  if (S.length === 0 || C.length === 0) {
    log(`Peringatan: Tidak cukup data untuk perbandingan (S:${S.length}, C:${C.length})`);
    // Use median split instead
    const sorted = [...submissions].sort((a, b) => a.score - b.score);
    const mid = Math.floor(sorted.length / 2);
    return analyzePatternsSimple(sorted.slice(0, mid), sorted.slice(mid));
  }
  
  return analyzePatternsSimple(C, S);
}

function analyzePatternsSimple(low, high) {
  const allFeatures = Object.keys(high[0]?.features || {});
  const results = {};
  
  for (const key of allFeatures) {
    if (typeof high[0].features[key] === 'string') {
      results[key] = { type: 'categorical', high: freq(high.map(s => s.features[key])), low: freq(low.map(s => s.features[key])) };
    } else {
      const hAvg = high.reduce((sum, s) => sum + (s.features[key] || 0), 0) / high.length;
      const lAvg = low.reduce((sum, s) => sum + (s.features[key] || 0), 0) / low.length;
      const hPct = high.filter(s => s.features[key] > 0).length / high.length * 100;
      const lPct = low.filter(s => s.features[key] > 0).length / low.length * 100;
      results[key] = { type: 'numeric', high_avg: hAvg.toFixed(2), low_avg: lAvg.toFixed(2), high_pct: hPct.toFixed(0), low_pct: lPct.toFixed(0), diff_pct: (hPct - lPct).toFixed(0) };
    }
  }
  
  return results;
}

function freq(arr) {
  const c = {};
  for (const v of arr) c[v] = (c[v] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const campaignAddress = process.argv[2];
  const missionId = process.argv[3] || null;
  
  if (!campaignAddress) {
    console.error('Usage: node learn_from_rally.js <campaignAddress> [missionId]');
    console.error('Example: node learn_from_rally.js 0xF9C91BA80320b5334266e50EbdfdDeC90a7583d0 mission-0');
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('  Rally Brain v7.1 — Learn from Rally.fun');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Campaign: ${campaignAddress}`);
  console.log(`  Mission:  ${missionId || 'ALL'}`);
  console.log('═══════════════════════════════════════════════════\n');
  
  // Clear old status
  writeStatus({
    status: 'running',
    campaignAddress,
    missionId,
    step: 'fetching_campaign',
    progress: 5,
    startTime: new Date().toISOString()
  });
  
  // ── Step 1: Fetch campaign info ──
  log('Step 1: Fetch campaign info...');
  let campaignInfo;
  try {
    campaignInfo = await fetchJSON(`https://app.rally.fun/api/campaigns/${campaignAddress}`);
  } catch (e) {
    log(`ERROR: Gagal fetch campaign: ${e.message}`);
    writeStatus({ status: 'failed', error: e.message });
    process.exit(1);
  }
  
  const campaignTitle = campaignInfo.title || campaignAddress;
  const missions = campaignInfo.missions || [];
  
  log(`Campaign: ${campaignTitle}`);
  log(`Missions tersedia: ${missions.length}`);
  
  if (isStopped()) { log('STOPPED by user'); writeStatus({ status: 'stopped' }); process.exit(0); }
  
  writeStatus({ step: 'fetching_submissions', progress: 15 });
  
  // ── Step 2: Fetch all submissions ──
  log('Step 2: Fetch submissions dari Rally.fun API...');
  let allSubmissions = [];
  let page = 0;
  const limit = 100;
  const targetMissions = missionId ? [missionId] : missions.map(m => m.id);
  
  log(`Missions target: ${targetMissions.join(', ') || 'ALL'}`);
  
  while (true) {
    if (isStopped()) { log('STOPPED by user'); writeStatus({ status: 'stopped' }); process.exit(0); }
    
    const url = `https://app.rally.fun/api/submissions?campaignAddress=${campaignAddress}&limit=${limit}&offset=${page * limit}`;
    log(`  Fetch page ${page + 1}...`);
    
    let subs;
    try {
      subs = await fetchJSON(url);
    } catch (e) {
      log(`  Warning: Page ${page + 1} gagal: ${e.message}`);
      break;
    }
    
    if (!Array.isArray(subs) || subs.length === 0) break;
    
    // Filter by mission if specified
    let filtered = subs;
    if (targetMissions.length > 0) {
      filtered = subs.filter(s => targetMissions.includes(s.missionId));
    }
    
    allSubmissions.push(...filtered);
    log(`  Got ${subs.length} submissions (${filtered.length} match mission)`);
    
    if (subs.length < limit) break;
    page++;
    await sleep(500); // Rate limit
  }
  
  log(`Total submissions collected: ${allSubmissions.length}`);
  
  if (allSubmissions.length === 0) {
    log('ERROR: Tidak ada submissions ditemukan');
    writeStatus({ status: 'failed', error: 'No submissions found' });
    process.exit(1);
  }
  
  if (isStopped()) { log('STOPPED by user'); writeStatus({ status: 'stopped' }); process.exit(0); }
  
  writeStatus({ step: 'extracting_features', progress: 40 });
  
  // ── Step 3: Extract features from AI judge analysis ──
  log('Step 3: Extract features dari AI judge analysis...');
  
  const processed = [];
  let skipped = 0;
  
  for (const sub of allSubmissions) {
    if (isStopped()) { log('STOPPED by user'); writeStatus({ status: 'stopped' }); process.exit(0); }
    
    const analysis = {};
    const scores = {};
    
    if (Array.isArray(sub.analysis)) {
      for (const a of sub.analysis) {
        analysis[a.category] = a.analysis || '';
        scores[a.category] = a.atto_score ? parseFloat(a.atto_score) / 1e18 : 0;
      }
    }
    
    if (Object.keys(analysis).length === 0) {
      skipped++;
      continue;
    }
    
    const totalScore = sub.attoRawScore ? parseFloat(sub.attoRawScore) / 1e18 : 
                       Object.values(scores).reduce((s, v) => s + v, 0);
    
    const features = extractFeatures(analysis);
    
    processed.push({
      id: sub.id,
      tweet_id: sub.tweetId,
      x_username: sub.xUsername,
      mission_id: sub.missionId,
      score: totalScore,
      category_scores: scores,
      category_analysis: analysis,
      features,
      engagement_metrics: sub.engagement_metrics || {},
      timestamp: sub.timestamp
    });
  }
  
  log(`Processed: ${processed.length}, Skipped (no analysis): ${skipped}`);
  
  // Score distribution
  const distribution = {};
  for (const s of processed) {
    const bucket = Math.floor(s.score);
    distribution[bucket] = (distribution[bucket] || 0) + 1;
  }
  log('Score distribution:');
  for (const [score, count] of Object.entries(distribution).sort((a,b) => b[0] - a[0])) {
    log(`  ${score}: ${count}x ${'█'.repeat(count)}`);
  }
  
  if (isStopped()) { log('STOPPED by user'); writeStatus({ status: 'stopped' }); process.exit(0); }
  
  writeStatus({ step: 'analyzing_patterns', progress: 60 });
  
  // ── Step 4: Analyze patterns ──
  log('Step 4: Analyzing patterns...');
  const patterns = analyzePatterns(processed);
  
  // Generate rules
  const rules = [];
  for (const [key, data] of Object.entries(patterns)) {
    if (data.type === 'numeric' && Math.abs(parseFloat(data.diff_pct)) >= 10) {
      const positive = parseFloat(data.diff_pct) > 0;
      rules.push({
        feature: key,
        action: positive ? 'EMPHASIZE' : 'MINIMIZE',
        strength: Math.abs(parseFloat(data.diff_pct)) >= 20 ? 'STRONG' : 'MODERATE',
        high_pct: data.high_pct,
        low_pct: data.low_pct,
        diff_pct: data.diff_pct
      });
    }
  }
  rules.sort((a, b) => (b.strength === 'STRONG' ? 1 : 0) - (a.strength === 'STRONG' ? 1 : 0));
  
  log(`Generated ${rules.length} rules`);
  for (const r of rules) {
    const icon = r.action === 'EMPHASIZE' ? '🟢' : '🔴';
    log(`  ${icon} ${r.feature}: ${r.action} (${r.diff_pct}% diff)`);
  }
  
  if (isStopped()) { log('STOPPED by user'); writeStatus({ status: 'stopped' }); process.exit(0); }
  
  writeStatus({ step: 'generating_rules', progress: 80 });
  
  // ── Step 5: Top scorers analysis ──
  log('Step 5: Top scorers analysis...');
  const topScorers = [...processed].sort((a, b) => b.score - a.score).slice(0, 5);
  
  const topAngles = freq(topScorers.map(s => s.features.content_angle));
  const topHooks = freq(topScorers.map(s => s.features.hook_type));
  
  log('Top angles: ' + topAngles.map(a => `${a[0]}(${a[1]}x)`).join(', '));
  log('Top hooks: ' + topHooks.map(h => `${h[0]}(${h[1]}x)`).join(', '));
  
  // ── Step 6: Build directives ──
  const directives = [];
  if (topAngles.length > 0) {
    directives.push(`Gunakan content angle: ${topAngles.slice(0, 3).map(a => a[0]).join(', ')}`);
  }
  if (topHooks.length > 0) {
    directives.push(`Gunakan hook type: ${topHooks.slice(0, 3).map(h => h[0]).join(', ')}`);
  }
  for (const r of rules.filter(r => r.strength === 'STRONG')) {
    const feature = r.feature.replace(/_/g, ' ');
    directives.push(r.action === 'EMPHASIZE' ? `Emphasize: ${feature}` : `Hindari berlebihan: ${feature}`);
  }
  
  // ── Step 7: Save results ──
  writeStatus({ step: 'saving', progress: 90 });
  
  const safeName = campaignTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 30);
  
  const outputDir = path.join(DATA_DIR, `${safeName}_learned`);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  // Save full learning DB
  const learningDB = {
    version: 'v7.1',
    generated_at: new Date().toISOString(),
    source: 'rally_fun_api',
    campaign_address: campaignAddress,
    campaign_title: campaignTitle,
    mission_filter: missionId || 'ALL',
    total_submissions: processed.length,
    score_distribution: distribution,
    avg_score: (processed.reduce((s, x) => s + x.score, 0) / processed.length).toFixed(1),
    patterns,
    rules,
    directives,
    top_angles: topAngles,
    top_hooks: topHooks,
    top_scorers: topScorers.map(s => ({
      score: s.score, username: s.x_username, mission: s.mission_id,
      features: s.features,
      analysis_preview: {
        originality: (s.category_analysis.originality || '').slice(0, 200),
        engagement: (s.category_analysis.engagement || '').slice(0, 200),
      }
    })),
    all_submissions: processed.map(s => ({
      score: s.score, username: s.x_username, mission: s.mission_id, features: s.features,
      category_scores: s.category_scores
    }))
  };
  
  fs.writeFileSync(path.join(outputDir, 'learning_db.json'), JSON.stringify(learningDB, null, 2));
  
  // Save compact rules for generate.js
  const rulesFile = {
    version: 'v7.1',
    updated_at: new Date().toISOString(),
    source: campaignAddress,
    campaign_title: campaignTitle,
    mission_filter: missionId || 'ALL',
    from_submissions: processed.length,
    directives,
    rules: rules.map(r => ({ feature: r.feature, action: r.action, strength: r.strength })),
    top_angles: topAngles.slice(0, 5),
    top_hooks: topHooks.slice(0, 5),
    emphasize_patterns: rules.filter(r => r.action === 'EMPHASIZE').map(r => r.feature),
    avoid_patterns: rules.filter(r => r.action === 'MINIMIZE').map(r => r.feature)
  };
  
  fs.writeFileSync(path.join(outputDir, 'learned_rules.json'), JSON.stringify(rulesFile, null, 2));
  
  // Also save as global (latest)
  fs.writeFileSync(path.join(DATA_DIR, 'learned_rules.json'), JSON.stringify(rulesFile, null, 2));
  
  // Save raw submissions
  fs.writeFileSync(path.join(outputDir, 'submissions.jsonl'), 
    processed.map(s => JSON.stringify(s)).join('\n'));
  
  writeStatus({
    status: 'completed',
    step: 'done',
    progress: 100,
    campaignTitle,
    totalSubmissions: processed.length,
    totalRules: rules.length,
    totalDirectives: directives.length,
    avgScore: learningDB.avg_score,
    topAngles,
    topHooks,
    rules: rules.map(r => ({ feature: r.feature, action: r.action, strength: r.strength })),
    directives,
    outputFile: outputDir
  });
  
  log('\n═══════════════════════════════════════════════════');
  log('  LEARNING COMPLETE');
  log('═══════════════════════════════════════════════════');
  log(`  Campaign: ${campaignTitle}`);
  log(`  Submissions: ${processed.length}`);
  log(`  Rules: ${rules.length}`);
  log(`  Directives: ${directives.length}`);
  log(`  Avg Score: ${learningDB.avg_score}`);
  log(`  Output: ${outputDir}`);
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  writeStatus({ status: 'failed', error: e.message });
  process.exit(1);
});
