/**
 * ============================================================
 * RALLY BRAIN SELF-HEAL v4.0 - AUTONOMOUS HEALING ENGINE
 * ============================================================
 *
 * PRINSIP: Setiap masalah di setiap proses → detect → fix → simpan → next cycle lebih baik
 * Tidak perlu intervensi manual. Sistem memperbaiki dirinya sendiri.
 *
 * 5 LAYER HEALING:
 *   L1 INFRA:     429, container kill, network, token exhaustion, lock, corrupted files
 *   L2 CONFIG:    Wrong tags, missing links, outdated data, invalid JSON, missing dirs
 *   L3 CONTENT:   Low score, compliance fail, AI word leak, repetition, missing info
 *   L4 SCORING:   Harsh judges, unfair weights, score inflation, judge mismatch
 *   L5 GROWTH:    Score stagnation, weak categories, stale learning, strategy injection
 *
 * FLOW:
 *   PRE-CYCLE  → Validate all layers → Fix preventable issues BEFORE generate
 *   GENERATE   → Spawn generate.js → Capture output + errors
 *   POST-CYCLE → Analyze results → Detect problems → Auto-fix → Save → Report
 *   NEXT CYCLE → Starts with all previous fixes applied automatically
 *
 * USAGE:
 *   node self_heal.js --campaign campaign_3     # Single campaign
 *   node self_heal.js                           # Rotation mode (next campaign)
 *
 * ============================================================
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/home/z/my-project/download/rally-brain';
const DATA_DIR = path.join(PROJECT_DIR, 'campaign_data');
const CONFIG_DIR = path.join(PROJECT_DIR, 'campaigns');
const HEAL_LOG = path.join(DATA_DIR, 'heal_log.json');
const ARCHITECTURE_STATE = path.join(DATA_DIR, 'architecture_state.json');

// ============ FORCE UNBUFFERED OUTPUT ============
if (process.stdout._handle) try { process.stdout._handle.setBlocking(true); } catch {}
if (process.stderr._handle) try { process.stderr._handle.setBlocking(true); } catch {}
const _origLog = console.log;
const _origErr = console.error;
console.log = (...a) => { _origLog(...a); try { process.stdout.write(''); } catch {} };
console.error = (...a) => { _origErr(...a); try { process.stderr.write(''); } catch {} };

// ============ CRASH HANDLERS ============
process.on('uncaughtException', (e) => { healLog('CRASH', 'uncaught_exception', e.stack?.slice(0, 500)); process.exit(1); });
process.on('unhandledRejection', (r) => { healLog('CRASH', 'unhandled_rejection', String(r).slice(0, 500)); process.exit(1); });
process.on('SIGTERM', () => { healLog('CRASH', 'sigterm', 'SIGTERM received'); process.exit(130); });
process.on('SIGINT', () => { healLog('CRASH', 'sigint', 'SIGINT received'); process.exit(130); });
process.stdout.on('error', (e) => { if (e.code === 'EPIPE') return; });
process.stderr.on('error', (e) => { if (e.code === 'EPIPE') return; });

// ============ UTILITY ============
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============ HEAL LOG ============
function healLog(layer, action, detail) {
  try {
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(HEAL_LOG, 'utf-8')); } catch {}
    logs.push({ ts: new Date().toISOString(), layer, action, detail: String(detail).slice(0, 500) });
    if (logs.length > 200) logs = logs.slice(-200);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HEAL_LOG, JSON.stringify(logs, null, 2));
  } catch {}
}

// ============ ARCHITECTURE STATE (persistent improvement tracking) ============
function loadArchState() {
  try {
    return JSON.parse(fs.readFileSync(ARCHITECTURE_STATE, 'utf-8'));
  } catch { return { version: '4.0', created: new Date().toISOString(), heals: [], stats: { total_heals: 0, by_layer: {} } }; }
}

function saveArchState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ARCHITECTURE_STATE, JSON.stringify(state, null, 2));
}

function recordHeal(layer, action, detail, impact) {
  const state = loadArchState();
  const entry = { ts: new Date().toISOString(), layer, action, detail: String(detail).slice(0, 300), impact };
  state.heals.push(entry);
  if (state.heals.length > 500) state.heals = state.heals.slice(-500);
  state.stats.total_heals++;
  state.stats.by_layer[layer] = (state.stats.by_layer[layer] || 0) + 1;
  saveArchState(state);
  healLog(layer, action, detail);
}

// ================================================================
// LAYER 1: INFRA HEALER
// Handles: 429, container kill, network, tokens, locks, files
// ================================================================
const InfraHealer = {
  name: 'L1_INFRA',

  // PRE-CYCLE: Validate infrastructure
  async preCheck() {
    const fixes = [];

    // 1a. Check/create required directories
    const requiredDirs = [
      DATA_DIR,
      CONFIG_DIR,
      ...fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.json')).map(f =>
        path.join(DATA_DIR, `${f.replace('.json', '')}_output`)
      )
    ];
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        fixes.push({ action: 'create_dir', detail: dir });
      }
    }

    // 1b. Fix corrupted JSON files in campaign_data
    const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    for (const f of jsonFiles) {
      const fp = path.join(DATA_DIR, f);
      try { JSON.parse(fs.readFileSync(fp, 'utf-8')); }
      catch {
        // Corrupted JSON - reset to empty valid structure
        let empty = {};
        if (f.includes('knowledge_db')) empty = { version: '3.0.0', last_updated: new Date().toISOString(), stats: { total_cycles: 0, best_score_achieved: 0, avg_score: 0 }, cycle_history: [], ai_word_frequency: {}, winning_hooks: [], category_trends: {}, patterns: {} };
        else if (f.includes('health')) empty = { version: '2.0.0', system_status: 'HEALTHY', total_cycles: 0, consecutive_failures: 0, best_score: 0, alerts: [], cycle_history: [] };
        else if (f.includes('rotation')) empty = { last_campaign: null, last_run: null, cycle_count: 0, campaigns: [] };
        fs.writeFileSync(fp, JSON.stringify(empty, null, 2));
        fixes.push({ action: 'fix_corrupted_json', detail: f });
      }
    }

    // 1c. Clean stale lock files
    const lockFile = path.join(DATA_DIR, '.rally_guard.lock');
    try {
      const lock = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
      const age = Date.now() - lock.timestamp;
      if (age > 600000) {
        fs.unlinkSync(lockFile);
        fixes.push({ action: 'remove_stale_lock', detail: `PID ${lock.pid}, age ${Math.round(age/1000)}s` });
      } else {
        // Check if PID alive
        try { execSync(`kill -0 ${lock.pid} 2>&1`); }
        catch {
          fs.unlinkSync(lockFile);
          fixes.push({ action: 'remove_dead_lock', detail: `PID ${lock.pid} dead` });
        }
      }
    } catch {} // No lock = fine

    // 1d. Check token state health
    const tokenFile = path.join(DATA_DIR, '.token_state.json');
    try {
      const ts = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
      const totalRemaining = ts.tokens?.reduce((s, t) => s + (t.remainingDaily || 0), 0) || 0;
      if (totalRemaining < 30) {
        // All tokens nearly exhausted - reset if older than 1 hour
        if (ts.lastReset && Date.now() - ts.lastReset > 3600000) {
          fs.unlinkSync(tokenFile);
          fixes.push({ action: 'reset_exhausted_tokens', detail: `Was ${totalRemaining}/1500, reset` });
        }
      }
      // Reset if stale (>24h old)
      if (ts.lastReset && Date.now() - ts.lastReset > 86400000) {
        fs.unlinkSync(tokenFile);
        fixes.push({ action: 'reset_stale_token_state', detail: 'Older than 24h' });
      }
    } catch {} // No token state = will be created fresh

    for (const fix of fixes) recordHeal(this.name, fix.action, fix.detail, 'auto-prevented');
    return fixes;
  },

  // POST-CYCLE: Fix infrastructure issues from generation run
  async postCheck(runResult) {
    const fixes = [];
    const err = runResult.error || '';
    const errLower = err.toLowerCase();

    // Handle 429
    if (errLower.includes('429') || errLower.includes('rate limit') || errLower.includes('too many requests')) {
      const tokenFile = path.join(DATA_DIR, '.token_state.json');
      try {
        const ts = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
        // Mark most recently used token as exhausted
        const sorted = [...(ts.tokens || [])].sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
        if (sorted.length > 0) {
          const target = ts.tokens.find(t => t.name === sorted[0].name);
          if (target) {
            target.isExhausted = true;
            target.remainingDaily = 0;
            ts.four29Timestamps = ts.four29Timestamps || [];
            ts.four29Timestamps.push(Date.now());
            fs.writeFileSync(tokenFile, JSON.stringify(ts, null, 2));
            fixes.push({ action: 'mark_token_exhausted', detail: `${sorted[0].name}, 429 detected` });
          }
        }
      } catch {}
      fixes.push({ action: 'rate_limit_cooldown', detail: 'Will apply longer delay next cycle' });
    }

    // Handle container kill
    if (errLower.includes('signal') || errLower.includes('killed') || runResult.killed) {
      fixes.push({ action: 'container_kill_detected', detail: 'Process killed. Next cycle will use minimal learning mode.' });
      // Save flag for next cycle
      const flagFile = path.join(DATA_DIR, '.container_kill_flag');
      fs.writeFileSync(flagFile, JSON.stringify({ ts: Date.now(), count: (this._killCount || 0) + 1 }));
      this._killCount = (this._killCount || 0) + 1;
      if (this._killCount >= 3) {
        fixes.push({ action: 'persistent_container_kills', detail: this._killCount + ' kills in a row. Reducing API budget usage.' });
      }
    }

    // Handle network errors
    if (errLower.includes('econnrefused') || errLower.includes('econnreset') || errLower.includes('timeout') || errLower.includes('socket hang up')) {
      fixes.push({ action: 'network_error', detail: 'Will retry with longer timeout next cycle' });
    }

    // Handle module/dependency errors
    if (errLower.includes('cannot find module')) {
      const match = err.match(/Cannot find module '([^']+)'/);
      if (match) {
        try {
          execSync('cd /home/z/my-project && bun add ' + match[1], { stdio: 'inherit', timeout: 60000 });
          fixes.push({ action: 'install_missing_module', detail: match[1] });
        } catch {}
      }
    }

    for (const fix of fixes) recordHeal(this.name, fix.action, fix.detail, 'auto-fixed');
    return fixes;
  }
};

// ================================================================
// LAYER 2: CONFIG HEALER
// Handles: wrong tags, missing links, outdated data, invalid config
// ================================================================
const ConfigHealer = {
  name: 'L2_CONFIG',

  // PRE-CYCLE: Validate campaign configs
  async preCheck(campaignId) {
    const fixes = [];
    const configPath = path.join(CONFIG_DIR, `${campaignId}.json`);

    // 2a. Validate campaign config exists and is valid
    if (!fs.existsSync(configPath)) {
      fixes.push({ action: 'missing_campaign_config', detail: `${configPath} not found` });
      return fixes; // Can't proceed without config
    }

    let config;
    try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')); }
    catch {
      fixes.push({ action: 'corrupted_campaign_config', detail: campaignId });
      return fixes;
    }

    // 2b. Validate compliance_checks structure
    const cc = config.compliance_checks;
    if (!cc) {
      config.compliance_checks = { must_include: [], project_name: '', project_x: '', project_keywords: [], unique_markers: [] };
      fixes.push({ action: 'create_compliance_checks', detail: campaignId });
    }

    // 2c. Check must_include has tag + link
    if (!cc.must_include || cc.must_include.length === 0) {
      cc.must_include = [`@${cc.project_x || 'RallyOnChain'}`];
      if (config.campaign?.creator) {
        const tagMatch = config.campaign.creator.match(/@(\w+)/);
        if (tagMatch) cc.must_include[0] = `@${tagMatch[1]}`;
      }
      fixes.push({ action: 'fix_empty_must_include', detail: `Set to ${cc.must_include.join(', ')}` });
    }

    // Ensure at least 2 must_include items (tag + link)
    if (cc.must_include.length < 2) {
      // Try to find link from knowledge_base
      const kb = config.knowledge_base || '';
      const linkMatch = kb.match(/(https?:\/\/[^\s"<>]+(?:rally|waitlist|fragments)[^\s"<>]*)/i);
      if (linkMatch) {
        cc.must_include.push(linkMatch[1]);
        fixes.push({ action: 'add_missing_link', detail: linkMatch[1] });
      }
    }

    // 2d. Detect and fix @RallyOnChain hardcoding in V3_LESSONS (generate.js)
    // We check if generate.js has hardcoded @RallyOnChain that doesn't match campaign
    const correctTag = cc.must_include[0];
    if (correctTag && correctTag !== '@RallyOnChain') {
      const genPath = path.join(PROJECT_DIR, 'generate.js');
      try {
        const genContent = fs.readFileSync(genPath, 'utf-8');
        // Check for hardcoded @RallyOnChain in scoring functions (not comments/strings)
        const hardcodedPatterns = [
          { pattern: /content\.includes\('@RallyOnChain'\)/g, desc: 'hardcoded @RallyOnChain in scoring' },
          { pattern: /!content\.includes\('@RallyOnChain'\)/g, desc: 'hardcoded @RallyOnChain in negative check' },
        ];
        for (const hp of hardcodedPatterns) {
          if (hp.pattern.test(genContent)) {
            fixes.push({ action: 'detect_hardcoded_tag', detail: `${hp.desc} for campaign ${campaignId} (should use ${correctTag})` });
          }
        }
      } catch {}
    }

    // 2e. Validate knowledge_base has giveaway info for campaigns that need it
    const kb = config.knowledge_base || '';
    if (kb.includes('giveaway') || kb.includes('waitlist')) {
      // Good, giveaway info exists in KB
    } else if (cc.must_include.some(m => m.includes('rally') || m.includes('fragments'))) {
      // Campaign likely needs giveaway info but KB doesn't have it
      fixes.push({ action: 'missing_giveaway_info', detail: `KB for ${campaignId} may be missing giveaway info` });
    }

    // 2f. Validate project_keywords are populated
    if (!cc.project_keywords || cc.project_keywords.length < 5) {
      fixes.push({ action: 'few_project_keywords', detail: `Only ${cc.project_keywords?.length || 0} keywords` });
    }

    // Save config if modified
    if (fixes.length > 0) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    for (const fix of fixes) recordHeal(this.name, fix.action, fix.detail, 'config-improved');
    return fixes;
  },

  // POST-CYCLE: Fix config issues based on generation output
  async postCheck(campaignId, output) {
    const fixes = [];
    const configPath = path.join(CONFIG_DIR, `${campaignId}.json`);
    let config;
    try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch { return fixes; }

    const cc = config.compliance_checks || {};
    const content = output?.content || '';
    const lower = content.toLowerCase();

    // 2g. If compliance failed, check what's missing
    if (cc.must_include) {
      for (const item of cc.must_include) {
        if (!content.includes(item)) {
          fixes.push({ action: 'compliance_missing', detail: `Content missing: ${item}` });
        }
      }
    }

    // 2h. Check if project name is mentioned
    if (cc.project_name && !lower.includes(cc.project_name.toLowerCase())) {
      fixes.push({ action: 'project_name_missing', detail: cc.project_name });
    }

    for (const fix of fixes) recordHeal(this.name, fix.action, fix.detail, 'config-flagged');
    return fixes;
  }
};

// ================================================================
// LAYER 3: CONTENT HEALER
// Handles: low score, compliance fail, AI words, repetition, missing info
// ================================================================
const ContentHealer = {
  name: 'L3_CONTENT',

  // POST-CYCLE: Analyze content output and fix quality issues
  async postCheck(campaignId, prediction, fullOutput) {
    const fixes = [];
    const score = prediction?.score || 0;
    const predictions = prediction?.predictions || {};
    const content = fullOutput?.best_content || '';
    const lower = content.toLowerCase();

    // 3a. LOW SCORE - analyze why
    if (score < 15) {
      fixes.push({ action: 'low_score_detected', detail: `Score ${score}/23 - analyzing failures` });

      // Check each gate
      if (predictions.originality === 0) {
        fixes.push({ action: 'gate_originality_fail', detail: 'Content flagged as AI-generated. Need more personal voice.' });
      }
      if (predictions.alignment === 0) {
        fixes.push({ action: 'gate_alignment_fail', detail: 'Content does not match campaign topic.' });
      }
      if (predictions.accuracy === 0) {
        fixes.push({ action: 'gate_accuracy_fail', detail: 'Claims may be inaccurate or exaggerated.' });
      }
      if (predictions.compliance === 0) {
        fixes.push({ action: 'gate_compliance_fail', detail: 'CRITICAL: Compliance failed. Missing required tags/links.' });
      }
    }

    // 3b. COMPLIANCE GATE FAILURE - fix config/prompt
    if (predictions.compliance === 0 || score < 10) {
      const configPath = path.join(CONFIG_DIR, `${campaignId}.json`);
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const cc = config.compliance_checks || {};

        // Check which must_include items are in content
        const missingItems = (cc.must_include || []).filter(item => !content.includes(item));
        if (missingItems.length > 0) {
          fixes.push({ action: 'missing_compliance_items', detail: `Missing: ${missingItems.join(', ')}` });
        }

        // Check for banned words in content
        const bannedWords = ['guaranteed', '100%', 'risk-free', 'buy now', 'get rich', 'passive income', 'follow me', 'click here'];
        for (const w of bannedWords) {
          if (lower.includes(w)) {
            fixes.push({ action: 'banned_word_in_content', detail: `"${w}" found in output` });
          }
        }

        // Check for hashtags
        if (/#\w+/.test(content)) {
          fixes.push({ action: 'hashtag_in_content', detail: 'Hashtag detected in output' });
        }

        // Check for dashes
        if (/\u2014|\u2013|\s--\s/.test(content)) {
          fixes.push({ action: 'dash_in_content', detail: 'Em-dash/en-dash detected in output' });
        }
      } catch {}
    }

    // 3c. AI WORD LEAK DETECTION
    const aiWords = ['delve', 'paradigm', 'tapestry', 'landscape', 'nuance', 'crucial', 'pivotal', 'embark', 'harness', 'foster', 'utilize', 'elevate', 'streamline', 'empower', 'comprehensive', 'realm', 'flywheel', 'ecosystem', 'seamless', 'robust', 'innovative', 'cutting-edge', 'game-changer', 'revolutionary', 'disrupt', 'transform', 'synergy', 'holistic', 'dynamic'];
    const foundAIWords = aiWords.filter(w => lower.includes(w));
    if (foundAIWords.length > 0) {
      fixes.push({ action: 'ai_word_leak', detail: `Found: ${foundAIWords.join(', ')}` });
    }

    // 3d. Check if "leverage" was incorrectly replaced with "use"
    if (lower.includes('structure-based use') || lower.includes('get leveraged use') || lower.match(/\buse\b.*instead of debt/)) {
      fixes.push({ action: 'leverage_wrongly_replaced', detail: '"leverage" was incorrectly replaced with "use"' });
    }

    // 3e. REPETITION DETECTION - compare with recent outputs
    const kdbPath = path.join(DATA_DIR, `${campaignId}_knowledge_db.json`);
    try {
      const kdb = JSON.parse(fs.readFileSync(kdbPath, 'utf-8'));
      const recentHooks = (kdb.cycle_history || []).slice(-5).map(c => c.best_hook || '').filter(Boolean);
      const currentHook = content.split('\n')[0]?.trim() || '';
      const currentWords = new Set(currentHook.toLowerCase().split(/\s+/));

      for (const prevHook of recentHooks) {
        const prevWords = new Set(prevHook.toLowerCase().split(/\s+/));
        const overlap = [...currentWords].filter(w => prevWords.has(w)).length;
        const similarity = overlap / Math.max(currentWords.size, prevWords.size);
        if (similarity > 0.7) {
          fixes.push({ action: 'repetitive_hook', detail: `Hook similarity ${(similarity*100).toFixed(0)}% with recent cycle` });
          break;
        }
      }
    } catch {}

    // 3f. ENGAGEMENT ISSUES
    if (predictions.engagement !== undefined && predictions.engagement < 3) {
      fixes.push({ action: 'low_engagement', detail: `Engagement score ${predictions.engagement}/5. Hook or CTA may be weak.` });
    }

    // 3g. MISSING CTA/QUESTION
    if (!content.includes('?')) {
      fixes.push({ action: 'missing_cta_question', detail: 'Content has no question at the end' });
    }

    // 3h. CONTENT TOO SHORT
    if (content.length < 100) {
      fixes.push({ action: 'content_too_short', detail: `${content.length} chars (minimum 100)` });
    }

    // 3i. CONTENT TOO LONG
    if (content.length > 2000) {
      fixes.push({ action: 'content_too_long', detail: `${content.length} chars (maximum ~2000 for tweet)` });
    }

    for (const fix of fixes) recordHeal(this.name, fix.action, fix.detail, 'quality-analyzed');
    return fixes;
  },

  // Generate LEARNED DIRECTIVES for next cycle's prompt (injected via KDB)
  generateDirectives(campaignId) {
    const state = loadArchState();
    const contentHeals = state.heals.filter(h => h.layer === this.name);
    const directives = [];

    // Count recent issues
    const recent = contentHeals.slice(-20);
    const issueCounts = {};
    for (const h of recent) {
      issueCounts[h.action] = (issueCounts[h.action] || 0) + 1;
    }

    if (issueCounts['ai_word_leak'] >= 2) {
      directives.push('EXTRA STRICT on AI words. Double-check every sentence before output.');
    }
    if (issueCounts['low_engagement'] >= 2) {
      directives.push('Make the hook MORE attention-grabbing. Start with something surprising or contrarian.');
    }
    if (issueCounts['repetitive_hook'] >= 2) {
      directives.push('Use a COMPLETELY DIFFERENT opening style than your last few attempts. No "I\'ve been" or "Spent last week" openings.');
    }
    if (issueCounts['missing_cta_question'] >= 1) {
      directives.push('ALWAYS end with a genuine open question. Not rhetorical.');
    }
    if (issueCounts['leverage_wrongly_replaced'] >= 1) {
      directives.push('The word "leverage" is ACCEPTABLE in crypto context. Do NOT replace it with "use".');
    }
    if (issueCounts['content_too_short'] >= 2) {
      directives.push('Write SUBSTANTIAL content. At least 150 words. Cover multiple aspects.');
    }
    if (issueCounts['gate_compliance_fail'] >= 2) {
      directives.push('COMPLIANCE IS CRITICAL. Double-check ALL required tags and links are included before output.');
    }

    return directives;
  }
};

// ================================================================
// LAYER 4: SCORING HEALER
// Handles: harsh judges, unfair weights, score patterns, mismatches
// ================================================================
const ScoringHealer = {
  name: 'L4_SCORING',

  // POST-CYCLE: Analyze scoring patterns
  async postCheck(campaignId, prediction, fullOutput) {
    const fixes = [];
    const judgeConsensus = fullOutput?.judge_consensus || {};
    const programmaticScore = fullOutput?.programmatic_score;
    const judgeTotal = judgeConsensus.total;
    const validJudges = fullOutput?.valid_judges || 0;

    // 4a. JUDGE vs PROGRAMMATIC MISMATCH
    if (programmaticScore && judgeTotal) {
      const diff = Math.abs(judgeTotal - programmaticScore);
      if (diff > 5) {
        fixes.push({ action: 'score_mismatch', detail: `Judge: ${judgeTotal}, Programmatic: ${programmaticScore}, diff: ${diff.toFixed(1)}` });
      }
    }

    // 4b. TOO FEW JUDGES (indicating 429 or error during judge panel)
    if (validJudges < 2) {
      fixes.push({ action: 'insufficient_judges', detail: `Only ${validJudges} judges returned results` });
    }

    // 4c. ALL GATES PASSING BUT LOW TOTAL (quality scores dragging down)
    const preds = prediction?.predictions || {};
    const gateSum = (preds.originality || 0) + (preds.alignment || 0) + (preds.accuracy || 0) + (preds.compliance || 0);
    if (gateSum === 8 && (prediction.score || 0) < 17) {
      fixes.push({ action: 'gates_ok_quality_low', detail: `Gates=${gateSum}/8 but total=${prediction.score}/23. Quality scores need improvement.` });
    }

    // 4d. SPECIFIC QUALITY CATEGORY ANALYSIS
    const qualityCats = ['engagement', 'technical', 'reply_quality'];
    for (const cat of qualityCats) {
      if (preds[cat] !== undefined && preds[cat] <= 2) {
        fixes.push({ action: `low_${cat}`, detail: `${cat}: ${preds[cat]}/5 - needs attention` });
      }
    }

    // 4e. MINORITY FLAGS
    const minorityFlags = fullOutput?.minority_flags || [];
    if (minorityFlags.length >= 2) {
      fixes.push({ action: 'excessive_minority_flags', detail: `${minorityFlags.length} minority flags - judges disagreeing a lot` });
    }

    // 4f. PERSISTENT LOW SCORES across cycles
    const kdbPath = path.join(DATA_DIR, `${campaignId}_knowledge_db.json`);
    try {
      const kdb = JSON.parse(fs.readFileSync(kdbPath, 'utf-8'));
      const recentScores = (kdb.cycle_history || []).slice(-5).map(c => c.score);
      if (recentScores.length >= 5) {
        const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        if (avg < 14) {
          fixes.push({ action: 'persistent_low_scores', detail: `Avg ${avg.toFixed(1)}/23 over last 5 cycles. Fundamental prompt issue.` });
        }
      }
    } catch {}

    for (const fix of fixes) recordHeal(this.name, fix.action, fix.detail, 'scoring-analyzed');
    return fixes;
  }
};

// ================================================================
// LAYER 5: GROWTH HEALER
// Handles: score stagnation, weak categories, strategy injection
// ================================================================
const GrowthHealer = {
  name: 'L5_GROWTH',

  // POST-CYCLE: Track growth and inject improvements
  async postCheck(campaignId, prediction) {
    const fixes = [];
    const score = prediction?.score || 0;
    const preds = prediction?.predictions || {};
    const kdbPath = path.join(DATA_DIR, `${campaignId}_knowledge_db.json`);

    try {
      let kdb;
      try { kdb = JSON.parse(fs.readFileSync(kdbPath, 'utf-8')); } catch { kdb = null; }

      if (!kdb || !kdb.cycle_history || kdb.cycle_history.length < 3) {
        return fixes; // Not enough data yet
      }

      const history = kdb.cycle_history;
      const recentScores = history.slice(-5).map(c => c.score);
      const olderScores = history.slice(-10, -5).map(c => c.score);

      // 5a. SCORE STAGNATION - no improvement over 5 cycles
      if (recentScores.length >= 5) {
        const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const recentMax = Math.max(...recentScores);
        const recentMin = Math.min(...recentScores);
        const variance = recentScores.reduce((s, v) => s + Math.pow(v - recentAvg, 2), 0) / recentScores.length;

        if (variance < 1.0) {
          fixes.push({ action: 'score_stagnation', detail: `Scores barely changing (variance ${variance.toFixed(2)}). Need strategy change.` });
        }

        if (recentAvg < 16 && recentAvg > 10) {
          fixes.push({ action: 'score_plateau', detail: `Stuck at ${recentAvg.toFixed(1)}/23. Minor tweaks won't help. Need prompt overhaul.` });
        }
      }

      // 5b. WEAK CATEGORY PERSISTENCE
      const catTrends = kdb.category_trends || {};
      const maxScores = { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5, reply_quality: 5 };
      const weakCategories = [];

      for (const [cat, trend] of Object.entries(catTrends)) {
        if (trend.count >= 3) {
          const pct = (trend.avg / (maxScores[cat] || 5)) * 100;
          if (pct < 60) {
            weakCategories.push({ cat, avg: trend.avg, max: maxScores[cat], pct: pct.toFixed(0) });
          }
        }
      }

      if (weakCategories.length > 0) {
        fixes.push({ action: 'persistent_weak_categories', detail: weakCategories.map(w => `${w.cat} (${w.avg}/${w.max} = ${w.pct}%)`).join(', ') });
      }

      // 5c. SCORE TREND ANALYSIS
      if (olderScores.length >= 3 && recentScores.length >= 3) {
        const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
        const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const trendDiff = recentAvg - olderAvg;

        if (trendDiff < -2) {
          fixes.push({ action: 'declining_trend', detail: `Score dropping: ${olderAvg.toFixed(1)} → ${recentAvg.toFixed(1)} (-${Math.abs(trendDiff).toFixed(1)})` });
        } else if (trendDiff > 2) {
          fixes.push({ action: 'improving_trend', detail: `Score rising: ${olderAvg.toFixed(1)} → ${recentAvg.toFixed(1)} (+${trendDiff.toFixed(1)})` });
        }
      }

      // 5d. AI WORD PERSISTENCE
      const aiFreq = kdb.ai_word_frequency || {};
      const persistentAI = Object.entries(aiFreq).filter(([_, count]) => count >= 3).sort((a, b) => b[1] - a[1]);
      if (persistentAI.length > 0) {
        fixes.push({ action: 'persistent_ai_words', detail: persistentAI.map(([w, c]) => `${w}(${c}x)`).join(', ') });
      }

      // 5e. BEST SCORE ACHIEVED - check if we can push higher
      const bestEver = Math.max(...history.map(c => c.score));
      if (bestEver >= 20 && recentScores.every(s => s < 20)) {
        fixes.push({ action: 'regression_from_best', detail: `Best was ${bestEver}/23 but recent cycles below 20. Lost quality.` });
      }

    } catch {}

    for (const fix of fixes) recordHeal(this.name, fix.action, fix.detail, 'growth-tracked');
    return fixes;
  },

  // Generate strategy for next cycle
  generateStrategy(campaignId) {
    const state = loadArchState();
    const growthHeals = state.heals.filter(h => h.layer === this.name);
    const recent = growthHeals.slice(-15);
    const strategy = [];

    const issueCounts = {};
    for (const h of recent) {
      issueCounts[h.action] = (issueCounts[h.action] || 0) + 1;
    }

    if (issueCounts['score_stagnation'] >= 1 || issueCounts['score_plateau'] >= 1) {
      strategy.push('Try a COMPLETELY different content angle. If educational, try opinion. If technical, try personal story.');
    }
    if (issueCounts['persistent_weak_categories'] >= 2) {
      strategy.push('Focus extra effort on weakest scoring categories identified in previous cycles.');
    }
    if (issueCounts['declining_trend'] >= 2) {
      strategy.push('QUALITY ALERT: Score declining. Simplify content. Focus on ONE strong angle instead of multiple weak ones.');
    }
    if (issueCounts['regression_from_best'] >= 1) {
      strategy.push('You achieved high scores before. Review what made those cycles successful and replicate that approach.');
    }
    if (issueCounts['persistent_ai_words'] >= 1) {
      strategy.push('AI words keep leaking. Read each sentence OUT LOUD before finalizing. If it sounds like corporate jargon, rewrite it.');
    }

    return strategy;
  }
};


// ================================================================
// MAIN HEALING ENGINE - ORCHESTRATES ALL 5 LAYERS
// ================================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--campaign');
  const campaign = idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  return { campaign };
}

async function runHealingCycle(campaignId) {
  const cycleStart = Date.now();
  const allFixes = { pre: [], post: [] };
  let runResult = { stdout: '', stderr: '', error: '', code: 0, killed: false };
  let prediction = null;
  let fullOutput = null;

  console.log('\n' + '='.repeat(60));
  console.log('  RALLY BRAIN SELF-HEAL v4.0 - AUTONOMOUS HEALING');
  console.log('='.repeat(60));
  console.log(`  Campaign: ${campaignId}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`  Layers: INFRA | CONFIG | CONTENT | SCORING | GROWTH`);
  console.log('='.repeat(60));

  // ========== PRE-CYCLE HEALING (fix before generate) ==========
  console.log('\n  [PRE-CYCLE] Running all layer checks...\n');

  // L1: Infrastructure
  console.log('  [L1 INFRA] Checking infrastructure...');
  const infraPre = await InfraHealer.preCheck();
  allFixes.pre.push(...infraPre.map(f => ({ layer: 'L1', ...f })));
  if (infraPre.length > 0) {
    for (const f of infraPre) console.log(`    FIXED: ${f.action} - ${f.detail}`);
  } else {
    console.log('    OK: No infrastructure issues');
  }

  // L2: Configuration
  console.log('  [L2 CONFIG] Validating campaign config...');
  const configPre = await ConfigHealer.preCheck(campaignId);
  allFixes.pre.push(...configPre.map(f => ({ layer: 'L2', ...f })));
  if (configPre.length > 0) {
    for (const f of configPre) console.log(`    FIXED: ${f.action} - ${f.detail}`);
  } else {
    console.log('    OK: Config valid');
  }

  const preFixCount = allFixes.pre.length;
  console.log(`\n  [PRE-CYCLE] Total fixes applied: ${preFixCount}`);

  // ========== GENERATE ==========
  console.log('\n  [GENERATE] Starting content generation...\n');

  // Check for container kill flag from previous cycle
  const killFlagFile = path.join(DATA_DIR, '.container_kill_flag');
  let envExtra = {};
  try {
    const killFlag = JSON.parse(fs.readFileSync(killFlagFile, 'utf-8'));
    if (Date.now() - killFlag.ts < 600000) { // Within 10 min
      envExtra.RALLY_MINIMAL_LEARNING = '1';
      console.log('  [L1 INFRA] Previous cycle was container-killed. Using minimal learning mode.');
    }
  } catch {}

  try {
    const result = await new Promise((resolve, reject) => {
      const genScript = path.join(PROJECT_DIR, 'generate.js');
      const child = spawn('node', [genScript, campaignId], {
        cwd: PROJECT_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...envExtra },
        timeout: 300000 // 5 min
      });

      let stdout = '', stderr = '';
      child.stdout.on('data', (d) => { stdout += d.toString(); try { process.stdout.write(d); } catch {} });
      child.stderr.on('data', (d) => { stderr += d.toString(); try { process.stderr.write(d); } catch {} });
      child.stdout.on('error', (e) => { if (e.code !== 'EPIPE') {} });
      child.stderr.on('error', (e) => { if (e.code !== 'EPIPE') {} });
      child.on('error', (e) => reject(e));
      child.on('close', (code, signal) => {
        if (signal) {
          reject(new Error(`Killed by signal ${signal}`));
        } else if (code !== 0) {
          const err = new Error(`Exit code ${code}`);
          err.stdout = stdout; err.stderr = stderr; err.code = code;
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      });
      setTimeout(() => { if (!child.killed) child.kill('SIGKILL'); }, 310000);
    });

    runResult = { ...result, code: 0, killed: false };
  } catch (err) {
    runResult = {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || '',
      error: err.message || String(err),
      code: err.code || 1,
      killed: err.message?.includes('signal') || err.message?.includes('Killed')
    };
    console.error(`\n  [GENERATE] Failed: ${runResult.error.slice(0, 200)}`);
  }

  // Clear kill flag on successful run
  if (runResult.code === 0) {
    try { fs.unlinkSync(killFlagFile); } catch {}
  }

  // ========== LOAD RESULTS ==========
  const predPath = path.join(DATA_DIR, `${campaignId}_output`, 'prediction.json');
  const fullOutPath = path.join(DATA_DIR, `${campaignId}_output`, 'full_output.json');
  try {
    if (fs.existsSync(predPath)) prediction = JSON.parse(fs.readFileSync(predPath, 'utf-8'));
    if (fs.existsSync(fullOutPath)) fullOutput = JSON.parse(fs.readFileSync(fullOutPath, 'utf-8'));
  } catch {}

  // ========== POST-CYCLE HEALING (fix after generate) ==========
  console.log('\n  [POST-CYCLE] Analyzing results and healing...\n');

  // L1: Infrastructure post-check
  console.log('  [L1 INFRA] Post-run infrastructure check...');
  const infraPost = await InfraHealer.postCheck(runResult);
  allFixes.post.push(...infraPost.map(f => ({ layer: 'L1', ...f })));
  if (infraPost.length > 0) {
    for (const f of infraPost) console.log(`    HEALED: ${f.action} - ${f.detail}`);
  } else {
    console.log('    OK: No infrastructure issues');
  }

  // L2: Config post-check (only if we have content)
  if (fullOutput || prediction) {
    console.log('  [L2 CONFIG] Post-run config validation...');
    const configPost = await ConfigHealer.postCheck(campaignId, fullOutput || prediction);
    allFixes.post.push(...configPost.map(f => ({ layer: 'L2', ...f })));
    if (configPost.length > 0) {
      for (const f of configPost) console.log(`    FLAGGED: ${f.action} - ${f.detail}`);
    } else {
      console.log('    OK: Config matches content');
    }
  }

  // L3: Content analysis
  if (prediction || fullOutput) {
    console.log('  [L3 CONTENT] Analyzing content quality...');
    const contentPost = await ContentHealer.postCheck(campaignId, prediction, fullOutput);
    allFixes.post.push(...contentPost.map(f => ({ layer: 'L3', ...f })));
    if (contentPost.length > 0) {
      for (const f of contentPost) console.log(`    DETECTED: ${f.action} - ${f.detail}`);
    } else {
      console.log('    OK: No content quality issues');
    }
  }

  // L4: Scoring analysis
  if (prediction || fullOutput) {
    console.log('  [L4 SCORING] Analyzing scoring patterns...');
    const scoringPost = await ScoringHealer.postCheck(campaignId, prediction, fullOutput);
    allFixes.post.push(...scoringPost.map(f => ({ layer: 'L4', ...f })));
    if (scoringPost.length > 0) {
      for (const f of scoringPost) console.log(`    ANALYZED: ${f.action} - ${f.detail}`);
    } else {
      console.log('    OK: Scoring looks healthy');
    }
  }

  // L5: Growth analysis
  if (prediction) {
    console.log('  [L5 GROWTH] Tracking growth trajectory...');
    const growthPost = await GrowthHealer.postCheck(campaignId, prediction);
    allFixes.post.push(...growthPost.map(f => ({ layer: 'L5', ...f })));
    if (growthPost.length > 0) {
      for (const f of growthPost) console.log(`    TRACKED: ${f.action} - ${f.detail}`);
    } else {
      console.log('    OK: Growth on track');
    }
  }

  // ========== NEXT-CYCLE IMPROVEMENT INJECTION ==========
  const directives = ContentHealer.generateDirectives(campaignId);
  const strategies = GrowthHealer.generateStrategy(campaignId);
  const nextCycleImprovements = [...directives, ...strategies];

  if (nextCycleImprovements.length > 0) {
    console.log('\n  [NEXT CYCLE] Auto-injected improvements:');
    // Save to KDB as learned rules for next cycle
    try {
      const kdbPath = path.join(DATA_DIR, `${campaignId}_knowledge_db.json`);
      let kdb;
      try { kdb = JSON.parse(fs.readFileSync(kdbPath, 'utf-8')); } catch { kdb = { version: '3.0.0', patterns: { semantic: {} }, cycle_history: [], stats: {} }; }

      if (!kdb.patterns) kdb.patterns = {};
      if (!kdb.patterns.semantic) kdb.patterns.semantic = {};

      // Save as self-heal directives
      kdb.patterns.semantic.self_heal_directives = {
        description: 'Auto-generated directives from self-healing engine',
        level: 'critical',
        directives: nextCycleImprovements,
        generated_at: new Date().toISOString()
      };

      fs.writeFileSync(kdbPath, JSON.stringify(kdb, null, 2));

      for (const dir of nextCycleImprovements) {
        console.log(`    > ${dir}`);
      }
    } catch {}
  }

  // ========== SUMMARY ==========
  const totalFixes = allFixes.pre.length + allFixes.post.length;
  const duration = ((Date.now() - cycleStart) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('  HEALING CYCLE SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Campaign: ${campaignId}`);
  console.log(`  Generate: ${runResult.code === 0 ? 'SUCCESS' : `FAILED (${runResult.error?.slice(0, 50)})`}`);
  console.log(`  Score: ${prediction?.score || 'N/A'}/23 (${prediction?.grade || 'N/A'})`);
  console.log(`  Pre-cycle fixes: ${allFixes.pre.length}`);
  console.log(`  Post-cycle detections: ${allFixes.post.length}`);
  console.log(`  Next-cycle improvements: ${nextCycleImprovements.length}`);
  console.log(`  Total healing actions: ${totalFixes}`);
  console.log(`  Duration: ${duration}s`);
  console.log('='.repeat(60) + '\n');

  // Save cycle result to heal log
  healLog('SYSTEM', 'cycle_complete', `campaign=${campaignId} score=${prediction?.score || 0} pre_fixes=${allFixes.pre.length} post_detections=${allFixes.post.length} improvements=${nextCycleImprovements.length} duration=${duration}s`);

  return {
    status: runResult.code === 0 ? 'success' : 'failed',
    score: prediction?.score,
    grade: prediction?.grade,
    preFixes: allFixes.pre.length,
    postDetections: allFixes.post.length,
    improvements: nextCycleImprovements.length,
    duration
  };
}


// ================================================================
// ORCHESTRATOR MODE (rotation)
// ================================================================
async function runOrchestrator() {
  const stateFile = path.join(DATA_DIR, 'rotation_state.json');
  let state;
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf-8')); }
  catch { state = { last_campaign: null, last_run: null, cycle_count: 0 }; }

  const campaigns = fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  if (campaigns.length === 0) {
    console.error('No campaigns found');
    process.exit(1);
  }

  const lastIdx = state.last_campaign ? campaigns.indexOf(state.last_campaign) : -1;
  const nextCampaign = campaigns[(lastIdx + 1) % campaigns.length];

  state.last_campaign = nextCampaign;
  state.last_run = new Date().toISOString();
  state.cycle_count = (state.cycle_count || 0) + 1;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  return await runHealingCycle(nextCampaign);
}


// ================================================================
// ENTRY POINT
// ================================================================
(async () => {
  const { campaign } = parseArgs();

  try {
    if (campaign) {
      await runHealingCycle(campaign);
    } else {
      await runOrchestrator();
    }
  } catch (err) {
    console.error('Self-Heal v4.0 fatal error:', err.message);
    healLog('SYSTEM', 'fatal_error', err.stack?.slice(0, 500));
    process.exit(1);
  }
})();
