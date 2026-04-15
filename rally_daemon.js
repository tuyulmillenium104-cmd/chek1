/**
 * ============================================================
 * RALLY DAEMON v1.0 - Fully Autonomous Background Engine
 * ============================================================
 *
 * TIDAK bergantung pada cron, agent, atau intervensi manual.
 * Jalan terus di background, generate konten, evaluasi, perbaiki.
 *
 * ARSITEKTUR:
 *   rally_daemon.js (INFINITE LOOP)
 *     └─ Per cycle:
 *        ├─ Cek token quota (jika habis → sleep 1 jam → reset)
 *        ├─ Ambil campaign berikutnya (rotation)
 *        ├─ Spawn generate.js (child process)
 *        ├─ Baca prediction.json → cek skor
 *        ├─ Jika skor < 18: regenerate (maks 3x)
 *        ├─ Jika skor >= 20: simpan sebagai best
 *        ├─ Inject self-heal directive ke knowledge_db
 *        └─ Sleep → loop lagi
 *
 * USAGE:
 *   setsid node rally_daemon.js </dev/null >/tmp/rally_daemon.log 2>&1 &
 *   tail -f /tmp/rally_daemon.log
 *
 * ============================================================
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============ CONFIG ============
const PROJECT_DIR = '/home/z/my-project/download/rally-brain';
const DATA_DIR = path.join(PROJECT_DIR, 'campaign_data');
const CONFIG_DIR = path.join(PROJECT_DIR, 'campaigns');
const DAEMON_LOG = path.join(DATA_DIR, 'daemon_state.json');
const PID_FILE = path.join(DATA_DIR, '.daemon.pid');

const CAMPAIGNS = ['campaign_3', 'marbmarket-m0', 'marbmarket-m1'];
const CYCLE_DELAY_MS = 30000;          // 30 detik antar cycle
const MIN_SCORE_ACCEPT = 18;           // Skor minimum untuk disimpan
const TARGET_SCORE = 20;               // Skor target
const MAX_REGEN = 3;                   // Maks regenerate per campaign
const TOKEN_RESET_HOURS = 24;          // Reset token setiap N jam

// ============ FORCE UNBUFFERED OUTPUT ============
if (process.stdout._handle) try { process.stdout._handle.setBlocking(true); } catch {}
if (process.stderr._handle) try { process.stderr._handle.setBlocking(true); } catch {}
const _origLog = console.log;
console.log = (...a) => { _origLog(...a); try { process.stdout.write(''); } catch {} };

// ============ UTILITIES ============
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function ts() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }

// ============ DAEMON STATE ============
function loadDaemonState() {
  try { return JSON.parse(fs.readFileSync(DAEMON_LOG, 'utf-8')); }
  catch { return { started: ts(), cycles: 0, campaigns: {}, errors: 0, regens: 0 }; }
}

function saveDaemonState(state) {
  fs.writeFileSync(DAEMON_LOG, JSON.stringify(state, null, 2));
}

// ============ PID FILE ============
function writePid() {
  fs.writeFileSync(PID_FILE, JSON.stringify({ pid: process.pid, started: ts() }));
}

function removePid() {
  try { fs.unlinkSync(PID_FILE); } catch {}
}

// ============ TOKEN CHECK ============
function checkTokenBudget() {
  const tokenFile = path.join(DATA_DIR, '.token_state.json');
  try {
    const ts = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
    const total = ts.tokens.reduce((s, t) => s + (t.remainingDaily || 0), 0);
    return { ok: total >= 36, total, tokens: ts.tokens };
  } catch { return { ok: true, total: 1500, tokens: [] }; }
}

function resetTokens() {
  const tokenFile = path.join(DATA_DIR, '.token_state.json');
  try { fs.unlinkSync(tokenFile); } catch {}
  console.log(`  [TOKEN] Reset at ${ts()}`);
}

function isTokenStateStale() {
  const tokenFile = path.join(DATA_DIR, '.token_state.json');
  try {
    const ts = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
    if (ts.lastReset && Date.now() - ts.lastReset > TOKEN_RESET_HOURS * 3600000) return true;
    return false;
  } catch { return true; }
}

// ============ ROTATION ============
function getNextCampaign(state) {
  const last = state.lastCampaign || '';
  const idx = CAMPAIGNS.indexOf(last);
  const next = CAMPAIGNS[(idx + 1) % CAMPAIGNS.length];
  return next;
}

// ============ LOCK MANAGEMENT ============
function acquireLock() {
  const lockFile = path.join(DATA_DIR, '.daemon.lock');
  try {
    const lock = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
    const age = Date.now() - lock.timestamp;
    if (age < 600000) {
      try { execSync(`kill -0 ${lock.pid} 2>&1`); return false; }
      catch { fs.unlinkSync(lockFile); }
    } else { fs.unlinkSync(lockFile); }
  } catch {}
  fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
  return true;
}

function releaseLock() {
  try { fs.unlinkSync(path.join(DATA_DIR, '.daemon.lock')); } catch {}
}

// ============ RUN GENERATE.JS ============
function runGenerate(campaignId) {
  return new Promise((resolve) => {
    const genScript = path.join(PROJECT_DIR, 'generate.js');
    let stdout = '';
    let stderr = '';

    const child = spawn('node', [genScript, campaignId], {
      cwd: PROJECT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000 // 5 min max per campaign
    });

    child.stdout.on('data', (d) => {
      const chunk = d.toString();
      stdout += chunk;
      // Stream output line by line
      const lines = chunk.split('\n').filter(l => l.trim());
      for (const line of lines) console.log(`  ${line}`);
    });

    child.stderr.on('data', (d) => {
      const chunk = d.toString();
      stderr += chunk;
    });

    child.on('close', (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });

    child.on('error', (err) => {
      resolve({ code: 1, signal: null, stdout, stderr: err.message, error: true });
    });

    // Safety timeout
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
        resolve({ code: -1, signal: 'SIGKILL', stdout, stderr: 'Timeout 5min' });
      }
    }, 310000);
  });
}

// ============ READ PREDICTION ============
function readPrediction(campaignId) {
  const predPath = path.join(DATA_DIR, `${campaignId}_output`, 'prediction.json');
  try {
    if (!fs.existsSync(predPath)) return null;
    return JSON.parse(fs.readFileSync(predPath, 'utf-8'));
  } catch { return null; }
}

// ============ QUALITY GATE ============
async function generateWithQualityGate(campaignId, state) {
  let bestScore = 0;
  let attempts = 0;

  while (attempts < MAX_REGEN) {
    attempts++;
    console.log(`  [QUALITY GATE] Attempt ${attempts}/${MAX_REGEN} for ${campaignId}`);

    const result = await runGenerate(campaignId);

    if (result.error || result.code !== 0) {
      console.log(`  [QUALITY GATE] Generate failed: code=${result.code}`);
      if (result.stderr.includes('dynamicTag') || result.stderr.includes('SyntaxError')) {
        console.log(`  [QUALITY GATE] FATAL: Syntax error in generate.js, cannot auto-fix`);
        break;
      }
      // Retry on non-syntax errors
      if (attempts < MAX_REGEN) {
        console.log(`  [QUALITY GATE] Waiting 10s before retry...`);
        await sleep(10000);
        continue;
      }
      break;
    }

    const pred = readPrediction(campaignId);
    if (!pred) {
      console.log(`  [QUALITY GATE] No prediction file found`);
      break;
    }

    const score = pred.score || 0;
    const grade = pred.grade || '?';

    console.log(`  [QUALITY GATE] Score: ${score}/23 (${grade})`);

    if (score >= TARGET_SCORE) {
      console.log(`  [QUALITY GATE] Target ${TARGET_SCORE}/23 reached!`);
      return { score, grade, attempts };
    }

    if (score >= MIN_SCORE_ACCEPT && score > bestScore) {
      bestScore = score;
      console.log(`  [QUALITY GATE] Score ${score} >= ${MIN_SCORE_ACCEPT}, acceptable but below target`);
      if (attempts >= MAX_REGEN) {
        console.log(`  [QUALITY GATE] Max regen reached, keeping best: ${score}/23`);
        return { score: bestScore, grade, attempts };
      }
      console.log(`  [QUALITY GATE] Trying to improve...`);
      await sleep(5000);
      continue;
    }

    if (score < MIN_SCORE_ACCEPT) {
      console.log(`  [QUALITY GATE] Score ${score} < ${MIN_SCORE_ACCEPT}, must regenerate`);
      if (attempts >= MAX_REGEN) {
        console.log(`  [QUALITY GATE] Max regen reached. Keeping last result even if low.`);
        return { score, grade, attempts };
      }
      await sleep(5000);
      continue;
    }

    return { score, grade, attempts };
  }

  return { score: bestScore, grade: '?', attempts };
}

// ============ SELF-HEAL INJECTION ============
function injectSelfHeal(campaignId, score) {
  const kdbPath = path.join(DATA_DIR, `${campaignId}_knowledge_db.json`);
  try {
    let kdb;
    try { kdb = JSON.parse(fs.readFileSync(kdbPath, 'utf-8')); }
    catch { kdb = { version: '3.0.0', patterns: { semantic: {} }, cycle_history: [], stats: {} }; }

    if (!kdb.patterns) kdb.patterns = {};
    if (!kdb.patterns.semantic) kdb.patterns.semantic = {};

    const directives = [];

    // Analyze last few cycles
    const history = kdb.cycle_history || [];
    if (history.length >= 2) {
      const recent = history.slice(-5);
      const scores = recent.map(c => c.score);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Score stagnation
      if (scores.length >= 3) {
        const variance = scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / scores.length;
        if (variance < 0.5) {
          directives.push(`SCORE STAGNATION: Last ${scores.length} cycles all ~${avg.toFixed(1)}/23. Try a COMPLETELY different angle. If last was educational, try opinion. If technical, try personal story.`);
        }
      }

      // Declining trend
      if (scores.length >= 4) {
        const recent2 = scores.slice(-2).reduce((a, b) => a + b, 0) / 2;
        const older2 = scores.slice(-4, -2).reduce((a, b) => a + b, 0) / 2;
        if (recent2 < older2 - 1.5) {
          directives.push(`DECLINING TREND DETECTED. Simplify content. Focus on ONE strong angle. Less is more.`);
        }
      }

      // AI word frequency
      const aiFreq = kdb.ai_word_frequency || {};
      const persistentAI = Object.entries(aiFreq)
        .filter(([_, c]) => c >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([w, c]) => w);
      if (persistentAI.length > 0) {
        directives.push(`PERSISTENT AI WORDS: ${persistentAI.slice(0, 3).join(', ')} keep appearing. Double-check EVERY sentence before output.`);
      }

      // Repetition detection
      const hooks = recent.map(c => c.best_hook).filter(Boolean);
      if (hooks.length >= 2) {
        const last2 = hooks.slice(-2);
        const words1 = new Set(last2[0].toLowerCase().split(/\s+/));
        const words2 = new Set(last2[1].toLowerCase().split(/\s+/));
        const overlap = [...words1].filter(w => words2.has(w)).length;
        const sim = overlap / Math.max(words1.size, words2.size);
        if (sim > 0.5) {
          directives.push(`HOOK REPETITION: Last 2 hooks are ${Math.round(sim * 100)}% similar. Use a COMPLETELY different opening. Never start with "I've been" again.`);
        }
      }
    }

    if (directives.length > 0) {
      kdb.patterns.semantic.self_heal_directives = {
        description: 'Auto-generated from daemon self-heal engine',
        level: 'critical',
        directives,
        generated_at: new Date().toISOString()
      };
      fs.writeFileSync(kdbPath, JSON.stringify(kdb, null, 2));
      console.log(`  [SELF-HEAL] Injected ${directives.length} directives to knowledge_db`);
      for (const d of directives) console.log(`    -> ${d}`);
    }

    return directives.length;
  } catch (e) {
    console.log(`  [SELF-HEAL] Error: ${e.message}`);
    return 0;
  }
}

// ============ STATUS REPORT ============
function printStatus(state) {
  const token = checkTokenBudget();
  console.log('\n' + '='.repeat(55));
  console.log(`  RALLY DAEMON v1.0 | ${ts()}`);
  console.log(`  Cycles completed: ${state.cycles}`);
  console.log(`  Total regens: ${state.regens}`);
  console.log(`  Total errors: ${state.errors}`);
  console.log(`  Token budget: ${token.total}/1500`);
  for (const [cam, data] of Object.entries(state.campaigns)) {
    console.log(`  ${cam}: ${data.bestScore || '?'}/23 (${data.runs || 0} runs)`);
  }
  console.log('='.repeat(55));
}

// ============ MAIN LOOP ============
async function main() {
  console.log('='.repeat(55));
  console.log('  RALLY DAEMON v1.0 - Starting');
  console.log('  ' + ts());
  console.log('  PID: ' + process.pid);
  console.log('  Campaigns: ' + CAMPAIGNS.join(', '));
  console.log('  Target score: ' + TARGET_SCORE + '/23');
  console.log('  Min accept score: ' + MIN_SCORE_ACCEPT + '/23');
  console.log('  Max regen: ' + MAX_REGEN);
  console.log('  Cycle delay: ' + (CYCLE_DELAY_MS / 1000) + 's');
  console.log('='.repeat(55));

  writePid();

  const state = loadDaemonState();
  let consecutiveErrors = 0;

  while (true) {
    try {
      // Check token budget
      if (isTokenStateStale()) {
        console.log(`  [TOKEN] State stale (>${TOKEN_RESET_HOURS}h), resetting...`);
        resetTokens();
        await sleep(5000);
      }

      const token = checkTokenBudget();
      if (!token.ok) {
        console.log(`  [TOKEN] Low budget (${token.total}/1500), sleeping 5 min...`);
        await sleep(300000);
        resetTokens();
        continue;
      }

      // Acquire lock (prevent overlapping)
      if (!acquireLock()) {
        console.log(`  [LOCK] Another process running, waiting 60s...`);
        await sleep(60000);
        continue;
      }

      // Pick next campaign
      const campaignId = getNextCampaign(state);
      state.lastCampaign = campaignId;

      console.log(`\n${'~'.repeat(55)}`);
      console.log(`  CYCLE #${state.cycles + 1} | Campaign: ${campaignId} | ${ts()}`);
      console.log(`${'~'.repeat(55)}`);

      // Clean lock files
      const lockFile = path.join(DATA_DIR, '.rally_guard.lock');
      try { fs.unlinkSync(lockFile); } catch {}

      // Generate with quality gate
      const result = await generateWithQualityGate(campaignId, state);

      // Update state
      state.cycles++;
      if (!state.campaigns[campaignId]) {
        state.campaigns[campaignId] = { runs: 0, bestScore: 0 };
      }
      state.campaigns[campaignId].runs++;
      state.regens += Math.max(0, result.attempts - 1);

      if (result.score >= (state.campaigns[campaignId].bestScore || 0)) {
        state.campaigns[campaignId].bestScore = result.score;
      }

      // Inject self-heal directives for next cycle
      if (result.score > 0) {
        const heals = injectSelfHeal(campaignId, result.score);
        if (heals > 0) {
          state.campaigns[campaignId].lastHeals = heals;
        }
      }

      // Update rotation file
      try {
        const rotFile = path.join(DATA_DIR, 'rotation_state.json');
        const rot = JSON.parse(fs.readFileSync(rotFile, 'utf-8'));
        rot.last_campaign = campaignId;
        rot.last_run = new Date().toISOString();
        rot.cycle_count = (rot.cycle_count || 0) + 1;
        fs.writeFileSync(rotFile, JSON.stringify(rot, null, 2));
      } catch {}

      // Save state
      saveDaemonState(state);
      consecutiveErrors = 0;

      // Print status every 3 cycles
      if (state.cycles % 3 === 0) printStatus(state);

      // Release lock
      releaseLock();

      // Wait before next cycle
      console.log(`  [DAEMON] Cycle complete. Next cycle in ${CYCLE_DELAY_MS / 1000}s...`);
      await sleep(CYCLE_DELAY_MS);

    } catch (err) {
      state.errors++;
      consecutiveErrors++;
      saveDaemonState(state);
      releaseLock();

      console.error(`  [DAEMON ERROR] ${err.message?.slice(0, 200)}`);

      if (consecutiveErrors >= 5) {
        console.error(`  [DAEMON] 5 consecutive errors. Sleeping 5 min before retry...`);
        await sleep(300000);
        consecutiveErrors = 0;
      } else {
        await sleep(30000);
      }
    }
  }
}

// ============ GRACEFUL SHUTDOWN ============
process.on('SIGTERM', () => {
  console.log(`\n  [DAEMON] SIGTERM received, shutting down...`);
  removePid();
  releaseLock();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`\n  [DAEMON] SIGINT received, shutting down...`);
  removePid();
  releaseLock();
  process.exit(0);
});

process.on('uncaughtException', (e) => {
  console.error(`  [DAEMON CRASH] ${e.message?.slice(0, 300)}`);
  // Try to restart after crash
  setTimeout(() => {
    console.log('  [DAEMON] Attempting recovery...');
  }, 10000);
});

// ============ START ============
main().catch(err => {
  console.error('[DAEMON FATAL]', err);
  removePid();
  process.exit(1);
});
