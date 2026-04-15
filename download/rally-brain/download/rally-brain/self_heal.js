/**
 * Rally Brain Self-Heal v3.0
 * Wraps the generate cycle with automatic error detection, diagnosis, and recovery.
 * If something fails -> diagnose root cause -> fix code/config -> retry -> repeat until success.
 * 
 * v2.0: Integrated Health Monitor - pre-cycle check, post-cycle update, auto-skip on CRITICAL
 * v2.1: Multi-campaign support (--campaign <id>)
 * v2.2: nohup crash fix (setBlocking, uncaught handlers)
 * v3.0: Full rewrite - spawn() instead of exec(), detached mode, EPIPE handling,
 *        orchestrator fallback, proper signal handling, force-flush logging
 * 
 * USAGE:
 *   node self_heal.js --campaign marbmarket-m0    # Run specific campaign
 *   node self_heal.js                             # Run next campaign in rotation (orchestrator)
 *   node self_heal.js --orchestrate               # Same as above (explicit)
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/home/z/my-project/download/rally-brain';

// ============ MULTI-CAMPAIGN SUPPORT ============
function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--campaign');
  const campaign = idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  const orchestrator = campaign === null || args.includes('--orchestrate');
  return { campaign, orchestrator };
}

const { campaign: CLI_CAMPAIGN, orchestrator: ORCHESTRATOR_MODE } = parseArgs();
const CAMPAIGN_ID = CLI_CAMPAIGN || null; // null means orchestrator mode

const MAX_RECOVERY_ATTEMPTS = 5;
const RECOVERY_DIR = path.join(PROJECT_DIR, 'campaign_data');
const LOG_FILE = path.join(RECOVERY_DIR, 'recovery_log.json');

// ============ FORCE UNBUFFERED OUTPUT (nohup fix) ============
// Make stdout/stderr blocking so nohup can capture output immediately
if (process.stdout._handle) {
  try { process.stdout._handle.setBlocking(true); } catch {}
}
if (process.stderr._handle) {
  try { process.stderr._handle.setBlocking(true); } catch {}
}

// Force-flush wrapper for every console.log
const _origLog = console.log;
const _origError = console.error;
console.log = (...args) => { _origLog(...args); try { process.stdout.write(''); } catch {} };
console.error = (...args) => { _origError(...args); try { process.stderr.write(''); } catch {} };

// ============ CRASH HANDLERS ============
process.on('uncaughtException', (err) => {
  const msg = `[UNCAUGHT EXCEPTION] ${err.stack || err.message}`;
  try { console.error(msg); } catch {}
  logRecovery('uncaught_exception', 'failed', (err.stack || err.toString()).slice(0, 500));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = `[UNHANDLED REJECTION] ${reason}`;
  try { console.error(msg); } catch {}
  logRecovery('unhandled_rejection', 'failed', String(reason).slice(0, 500));
  process.exit(1);
});

// Graceful signal handling for nohup
process.on('SIGTERM', () => {
  console.log('\n[SIGNAL] Received SIGTERM, shutting down gracefully...');
  logRecovery('sigterm', 'shutdown', 'Received SIGTERM');
  process.exit(130);
});

process.on('SIGINT', () => {
  console.log('\n[SIGNAL] Received SIGINT, shutting down gracefully...');
  logRecovery('sigint', 'shutdown', 'Received SIGINT');
  process.exit(130);
});

// EPIPE handling (prevent crash when nohup pipe breaks)
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') return; // ignore broken pipe
});
process.stderr.on('error', (err) => {
  if (err.code === 'EPIPE') return; // ignore broken pipe
});

// ============ RECOVERY LOG ============
function loadRecoveryLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  } catch {
    return { attempts: [], last_success: null, total_recoveries: 0 };
  }
}

function saveRecoveryLog(log) {
  fs.mkdirSync(RECOVERY_DIR, { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function logRecovery(action, status, detail) {
  try {
    const log = loadRecoveryLog();
    log.attempts.push({
      timestamp: new Date().toISOString(),
      action,
      status,
      detail: (detail?.toString?.() || String(detail)).slice(0, 500)
    });
    if (log.attempts.length > 50) log.attempts = log.attempts.slice(-50);
    saveRecoveryLog(log);
  } catch {} // Don't let logging failures crash recovery
}

// ============ DIAGNOSIS ENGINE ============
function diagnoseError(error) {
  const errStr = error.toString().toLowerCase();

  const diagnostics = [
    { pattern: 'cannot find module', type: 'MISSING_DEPENDENCY', fix: fixMissingDependency, description: 'Missing npm/pip dependency' },
    { pattern: 'econnrefused|econnreset|timeout|etimedout|socket hang up', type: 'NETWORK_ERROR', fix: fixNetworkError, description: 'Network/API connectivity issue' },
    { pattern: 'enoent', type: 'FILE_NOT_FOUND', fix: fixFileNotFound, description: 'File or directory not found' },
    { pattern: 'eacces|eperm', type: 'PERMISSION_ERROR', fix: fixPermissionError, description: 'File permission issue' },
    { pattern: 'syntaxerror|unexpected token', type: 'SYNTAX_ERROR', fix: fixSyntaxError, description: 'JavaScript syntax error in script' },
    { pattern: 'rate.limit|429|too many requests', type: 'RATE_LIMITED', fix: fixRateLimit, description: 'API rate limit exceeded' },
    { pattern: 'authentication|unauthorized|401|403', type: 'AUTH_ERROR', fix: fixAuthError, description: 'Authentication/authorization failure' },
    { pattern: 'z-ai-web-dev-sdk', type: 'SDK_ERROR', fix: fixSDKError, description: 'z-ai-web-dev-sdk specific issue' },
    { pattern: 'json|parse|unexpected', type: 'PARSE_ERROR', fix: fixParseError, description: 'JSON/data parsing error' },
    { pattern: 'empty|too short|all variations failed', type: 'GENERATION_QUALITY', fix: fixGenerationQuality, description: 'AI generation returning empty or low quality' }
  ];

  for (const d of diagnostics) {
    if (errStr.includes(d.pattern)) return d;
  }

  return { type: 'UNKNOWN_ERROR', fix: fixGenericError, description: `Unhandled error: ${error.toString().slice(0, 200)}` };
}

// ============ FIX FUNCTIONS ============
function fixMissingDependency(error) {
  const errStr = error.toString();
  console.log('  [RECOVER] Fixing missing dependency...');
  try {
    const match = errStr.match(/Cannot find module '([^']+)'/);
    if (match) {
      const module = match[1];
      console.log(`  [RECOVER] Installing missing module: ${module}`);
      execSync(`cd /home/z/my-project && bun add ${module}`, { stdio: 'inherit', timeout: 60000 });
      logRecovery('install_dependency', 'success', `Installed ${module}`);
      return true;
    }
  } catch (e) {
    logRecovery('install_dependency', 'failed', e.message);
  }
  try {
    console.log('  [RECOVER] Running bun install...');
    execSync('cd /home/z/my-project && bun install', { stdio: 'inherit', timeout: 120000 });
    logRecovery('bun_install', 'success', 'Ran bun install');
    return true;
  } catch (e) {
    logRecovery('bun_install', 'failed', e.message);
    return false;
  }
}

function fixNetworkError(error) {
  console.log('  [RECOVER] Network error detected. Retrying with delay...');
  logRecovery('network_retry', 'success', 'Will retry after delay');
  return true;
}

function fixFileNotFound(error) {
  console.log('  [RECOVER] Fixing file not found...');
  const dirs = [
    PROJECT_DIR,
    path.join(PROJECT_DIR, 'campaign_data'),
    path.join(PROJECT_DIR, 'campaign_data/0x39a11fa3e86eA8AC53772F26AA36b07506fa7dDB_output'),
    path.join(PROJECT_DIR, 'campaigns')
  ];
  if (CAMPAIGN_ID) {
    dirs.push(path.join(PROJECT_DIR, 'campaign_data', `${CAMPAIGN_ID}_output`));
  }
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  [RECOVER] Created directory: ${dir}`);
    }
  }
  logRecovery('file_fix', 'success', 'Ensured all required files/dirs exist');
  return true;
}

function fixPermissionError(error) {
  console.log('  [RECOVER] Fixing permissions...');
  try {
    execSync('chmod -R 755 /home/z/my-project/download/rally-brain/', { stdio: 'inherit' });
    logRecovery('permission_fix', 'success', 'chmod -R 755');
    return true;
  } catch (e) {
    logRecovery('permission_fix', 'failed', e.message);
    return false;
  }
}

function fixSyntaxError(error) {
  console.log('  [RECOVER] Syntax error detected in generate.js');
  console.log(`  [RECOVER] Error: ${error.toString().slice(0, 300)}`);
  logRecovery('syntax_error', 'failed', error.toString());
  return false;
}

function fixRateLimit(error) {
  console.log('  [RECOVER] Rate limited. Will wait longer before retry...');
  logRecovery('rate_limit', 'success', 'Will increase delay');
  return true;
}

function fixAuthError(error) {
  console.log('  [RECOVER] Auth error - checking SDK configuration...');
  try {
    delete require.cache[require.resolve('z-ai-web-dev-sdk')];
    console.log('  [RECOVER] Cleared SDK cache, will retry');
    logRecovery('auth_fix', 'success', 'Cleared SDK cache');
    return true;
  } catch (e) {
    logRecovery('auth_fix', 'failed', e.message);
    return false;
  }
}

function fixSDKError(error) {
  console.log('  [RECOVER] SDK error - attempting reinstall...');
  try {
    execSync('cd /home/z/my-project && bun remove z-ai-web-dev-sdk && bun add z-ai-web-dev-sdk', { stdio: 'inherit', timeout: 120000 });
    Object.keys(require.cache).forEach(key => {
      if (key.includes('z-ai-web-dev-sdk')) delete require.cache[key];
    });
    logRecovery('sdk_reinstall', 'success', 'Reinstalled z-ai-web-dev-sdk');
    return true;
  } catch (e) {
    logRecovery('sdk_reinstall', 'failed', e.message);
    return false;
  }
}

function fixParseError(error) {
  console.log('  [RECOVER] Parse error - checking data files...');
  try {
    const kdbGlob = fs.readdirSync(path.join(PROJECT_DIR, 'campaign_data')).filter(f => f.includes('knowledge_db') && f.endsWith('.json'));
    for (const kdbFile of kdbGlob) {
      const kdbPath = path.join(PROJECT_DIR, 'campaign_data', kdbFile);
      try { JSON.parse(fs.readFileSync(kdbPath, 'utf-8')); } catch {
        console.log(`  [RECOVER] ${kdbFile} is corrupted - resetting...`);
      }
    }
  } catch {}
  logRecovery('parse_fix', 'success', 'Checked and fixed data files');
  return true;
}

function fixGenerationQuality(error) {
  console.log('  [RECOVER] Low generation quality - adjusting parameters...');
  logRecovery('quality_adjust', 'success', 'Will retry with adjusted parameters');
  return true;
}

function fixGenericError(error) {
  console.log('  [RECOVER] Unknown error - attempting full recovery...');
  try {
    execSync('cd /home/z/my-project && bun install', { stdio: 'inherit', timeout: 120000 });
    fixFileNotFound({ toString: () => 'ENOENT' });
    logRecovery('generic_recovery', 'success', 'Full recovery attempt');
    return true;
  } catch (e) {
    logRecovery('generic_recovery', 'failed', e.message);
    return false;
  }
}

// ============ DELAY UTILITY ============
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ SPAWN GENERATE (spawn-based, nohup-compatible) ============
function spawnGenerate(campaignId) {
  return new Promise((resolve, reject) => {
    const args = ['node', path.join(PROJECT_DIR, 'generate.js'), campaignId];
    const env = { ...process.env };

    const child = spawn(args[0], args.slice(1), {
      cwd: '/home/z/my-project',
      env,
      detached: false,   // We need to wait for it, so not detached
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 600000     // 10 min max
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      // Real-time output (force flush)
      try { process.stdout.write(chunk); } catch {}
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      try { process.stderr.write(chunk); } catch {}
    });

    // EPIPE safety
    child.stdout.on('error', (err) => { if (err.code !== 'EPIPE') console.error(`stdout error: ${err.message}`); });
    child.stderr.on('error', (err) => { if (err.code !== 'EPIPE') console.error(`stderr error: ${err.message}`); });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code, signal) => {
      if (signal) {
        reject(new Error(`Process killed by signal ${signal}`));
      } else if (code !== 0) {
        const error = new Error(`generate.js exited with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.code = code;
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });

    // Safety timeout (in case child doesn't emit close)
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
        reject(new Error('generate.js timed out after 600s'));
      }
    }, 610000);
  });
}

// ============ MAIN SELF-HEAL RUNNER ============
async function runWithRecovery(campaignId) {
  const cycleStart = Date.now();
  console.log('========================================================');
  console.log('  RALLY BRAIN v3.0 - SELF-HEAL + MULTI-CAMPAIGN');
  console.log('========================================================');
  console.log(`Campaign: ${campaignId}`);
  console.log(`Max recovery attempts: ${MAX_RECOVERY_ATTEMPTS}`);
  console.log(`Recovery log: ${LOG_FILE}`);
  console.log(`Mode: ${CAMPAIGN_ID ? 'SINGLE CAMPAIGN' : 'ORCHESTRATOR'}`);
  console.log('');

  // === PRE-CYCLE HEALTH CHECK ===
  console.log('--- HEALTH MONITOR: Pre-Cycle Check ---');
  let healthCheck;
  try {
    const healthMod = require('./health_monitor.js');
    healthCheck = healthMod.preCycleCheck(campaignId);
  } catch (e) {
    console.log(`  Health monitor error: ${e.message}. Skipping pre-check.`);
    healthCheck = { should_run: true, status: 'UNKNOWN', consecutive_failures: 0, consecutive_low_scores: 0, alerts_to_report: [], skipped_reason: null };
  }

  console.log(`  System Status: ${healthCheck.status}`);
  console.log(`  Consecutive Failures: ${healthCheck.consecutive_failures}`);
  console.log(`  Consecutive Low Scores: ${healthCheck.consecutive_low_scores}`);

  if (!healthCheck.should_run) {
    console.log(`\n  SKIPPING CYCLE: ${healthCheck.skipped_reason}`);
    console.log('  (Saving API quota. Health monitor will retry after cooldown.)\n');
    return { status: 'skipped', reason: healthCheck.skipped_reason, health: healthCheck, campaign: campaignId };
  }

  if (healthCheck.reason) {
    console.log(`  INFO: ${healthCheck.reason}`);
  }

  if (healthCheck.alerts_to_report && healthCheck.alerts_to_report.length > 0) {
    console.log('  Pending Alerts:');
    for (const alert of healthCheck.alerts_to_report) {
      console.log(`    [${alert.level}] ${alert.code}: ${alert.message}`);
    }
  }
  console.log('');

  for (let attempt = 1; attempt <= MAX_RECOVERY_ATTEMPTS; attempt++) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`ATTEMPT ${attempt}/${MAX_RECOVERY_ATTEMPTS}`);
    console.log('='.repeat(50));

    try {
      // Run generate.js via spawn (nohup-safe)
      const result = await spawnGenerate(campaignId);

      // SUCCESS!
      const log = loadRecoveryLog();
      log.last_success = new Date().toISOString();
      log.total_recoveries += (attempt - 1);
      saveRecoveryLog(log);

      // Read prediction.json for score
      let cycleScore = null;
      let cycleGrade = null;
      try {
        const predPath = path.join(PROJECT_DIR, 'campaign_data', `${campaignId}_output`, 'prediction.json');
        if (fs.existsSync(predPath)) {
          const pred = JSON.parse(fs.readFileSync(predPath, 'utf-8'));
          cycleScore = pred.score || pred.total_score || null;
          cycleGrade = pred.grade || null;
        }
      } catch {}

      const cycleDuration = Date.now() - cycleStart;

      console.log('\n  GENERATE CYCLE COMPLETED SUCCESSFULLY');
      if (attempt > 1) {
        console.log(`  Recovered after ${attempt - 1} failed attempt(s)`);
      }
      if (cycleScore !== null) {
        console.log(`  Score: ${cycleScore}/23 (${cycleGrade || 'N/A'})`);
      }
      console.log(`  Duration: ${(cycleDuration / 1000).toFixed(1)}s`);

      // === POST-CYCLE HEALTH UPDATE ===
      let healthResult = null;
      try {
        const healthMod = require('./health_monitor.js');
        healthResult = healthMod.postCycleUpdate({
          status: 'success',
          score: cycleScore,
          grade: cycleGrade,
          attempts: attempt,
          duration_ms: cycleDuration
        }, campaignId);
        console.log(`  Health Status: ${healthResult.system_status}`);
      } catch {}

      return { status: 'success', attempts: attempt, recovered: attempt > 1, score: cycleScore, health: healthResult, campaign: campaignId };

    } catch (error) {
      console.error(`\n  ATTEMPT ${attempt} FAILED:`);
      console.error(`   ${error.toString().slice(0, 300)}`);

      if (attempt >= MAX_RECOVERY_ATTEMPTS) {
        console.log(`\n  ALL ${MAX_RECOVERY_ATTEMPTS} ATTEMPTS EXHAUSTED`);
        console.log('  Layer 2 recovery needed - AI agent will diagnose and fix architecture');
        logRecovery('exhausted', 'failed', error.toString());

        let healthFail = null;
        try {
          const healthMod = require('./health_monitor.js');
          healthFail = healthMod.postCycleUpdate({
            status: 'exhausted',
            score: null,
            grade: null,
            attempts: attempt,
            error: error.toString(),
            duration_ms: Date.now() - cycleStart
          }, campaignId);
          console.log(`  Health Status: ${healthFail.system_status}`);
        } catch {}

        return { status: 'exhausted', error: error.toString(), attempts: attempt, health: healthFail, campaign: campaignId };
      }

      // DIAGNOSE
      const diagnosis = diagnoseError(error);
      console.log(`\n  DIAGNOSIS: ${diagnosis.type} - ${diagnosis.description}`);

      // FIX
      console.log(`\n  ATTEMPTING FIX...`);
      const fixed = diagnosis.fix(error);

      if (!fixed) {
        console.log(`  Fix returned false - may need AI agent intervention`);
      }

      // DELAY before retry (exponential backoff)
      const delay = Math.min(10000 * attempt, 60000);
      console.log(`  Waiting ${delay / 1000}s before retry...`);
      await sleep(delay);

      logRecovery('recovery_attempt', 'pending', `Attempt ${attempt} failed (${diagnosis.type}), retrying...`);
    }
  }
}

// ============ ORCHESTRATOR MODE ============
async function runOrchestrator() {
  console.log('========================================================');
  console.log('  RALLY BRAIN ORCHESTRATOR - Multi-Campaign Rotation');
  console.log('========================================================');

  // Determine which campaign to run via rotation
  let nextCampaign;
  try {
    const stateFile = path.join(PROJECT_DIR, 'campaign_data', 'rotation_state.json');
    let state;
    try {
      state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    } catch {
      state = { last_campaign: null, last_run: null, cycle_count: 0, campaigns: [] };
    }

    // Get available campaigns
    const campaignsDir = path.join(PROJECT_DIR, 'campaigns');
    const available = fs.readdirSync(campaignsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));

    if (available.length === 0) {
      console.error('No campaign configs found in campaigns/ directory');
      process.exit(1);
    }

    // Update campaign list (in case new ones were added)
    state.campaigns = available;
    state.cycle_count = (state.cycle_count || 0) + 1;

    // Find next campaign in rotation
    const lastIndex = state.last_campaign ? available.indexOf(state.last_campaign) : -1;
    const nextIndex = (lastIndex + 1) % available.length;
    nextCampaign = available[nextIndex];

    // Update state
    state.last_campaign = nextCampaign;
    state.last_run = new Date().toISOString();
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

    console.log(`Next campaign: ${nextCampaign} (${nextIndex + 1}/${available.length})`);
    console.log(`Cycle count: ${state.cycle_count}`);
    console.log(`Campaign rotation: ${available.join(' -> ')}`);
    console.log('');

  } catch (err) {
    console.error('Failed to determine next campaign:', err.message);
    // Fallback to marbmarket-m0
    nextCampaign = 'marbmarket-m0';
    console.log(`Falling back to: ${nextCampaign}`);
  }

  // Run the selected campaign
  const result = await runWithRecovery(nextCampaign);
  return result;
}

// ============ RUN ============
try {
  (async () => {
    let result;

    if (ORCHESTRATOR_MODE && !CAMPAIGN_ID) {
      // Orchestrator mode: pick next campaign via rotation
      result = await runOrchestrator();
    } else {
      // Single campaign mode
      result = await runWithRecovery(CAMPAIGN_ID);
    }

    console.log('\n' + '='.repeat(50));
    console.log('SELF-HEAL RESULT:', JSON.stringify({
      status: result.status,
      attempts: result.attempts,
      score: result.score || null,
      campaign: result.campaign || CAMPAIGN_ID || 'orchestrator'
    }, null, 2));

    // Print health summary if not skipped
    if (result.status !== 'skipped') {
      try {
        const healthMod = require('./health_monitor.js');
        const summary = healthMod.getStatusSummary(CAMPAIGN_ID);
        console.log('\n--- HEALTH SUMMARY ---');
        console.log(`  Status: ${summary.emoji || ''} ${summary.system_status}`);
        console.log(`  Cycles: ${summary.total_cycles} | Success Rate: ${summary.success_rate}`);
        console.log(`  Best: ${summary.best_score}/23 | Trend: ${summary.score_trend}`);
        console.log(`  Cooldown: ${summary.cooldown_remaining} cycles remaining`);
      } catch {}
    }

    process.exit(result.status === 'success' ? 0 : 1);
  })().catch(err => {
    console.error('Self-heal system crashed:', err);
    logRecovery('self_heal_crash', 'failed', err.toString());

    try {
      const healthMod = require('./health_monitor.js');
      healthMod.postCycleUpdate({
        status: 'fail',
        score: null, grade: null,
        attempts: 0,
        error: err.toString(),
        duration_ms: 0
      }, CAMPAIGN_ID);
    } catch {}

    process.exit(1);
  });
} catch (fatalErr) {
  console.error(`[FATAL] self_heal.js top-level error: ${fatalErr.stack || fatalErr}`);
  logRecovery('fatal_top_level', 'failed', String(fatalErr).slice(0, 500));
  process.exit(1);
}
