/**
 * Rally Brain Self-Heal v2.0
 * Wraps the generate cycle with automatic error detection, diagnosis, and recovery.
 * If something fails → diagnose root cause → fix code/config → retry → repeat until success.
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_RECOVERY_ATTEMPTS = 5;
const RECOVERY_DIR = '/home/z/my-project/download/rally-brain/campaign_data';
const LOG_FILE = path.join(RECOVERY_DIR, 'recovery_log.json');

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
  const log = loadRecoveryLog();
  log.attempts.push({
    timestamp: new Date().toISOString(),
    action,
    status,
    detail: detail?.toString?.()?.slice(0, 500) || String(detail).slice(0, 500)
  });
  // Keep only last 50 entries
  if (log.attempts.length > 50) log.attempts = log.attempts.slice(-50);
  saveRecoveryLog(log);
  return log;
}

// ============ DIAGNOSIS ENGINE ============
function diagnoseError(error) {
  const errStr = error.toString().toLowerCase();

  const diagnostics = [
    {
      pattern: 'cannot find module',
      type: 'MISSING_DEPENDENCY',
      fix: fixMissingDependency,
      description: 'Missing npm/pip dependency'
    },
    {
      pattern: 'econnrefused|econnreset|timeout|etimedout|socket hang up',
      type: 'NETWORK_ERROR',
      fix: fixNetworkError,
      description: 'Network/API connectivity issue'
    },
    {
      pattern: 'enoent',
      type: 'FILE_NOT_FOUND',
      fix: fixFileNotFound,
      description: 'File or directory not found'
    },
    {
      pattern: 'eacces|eperm',
      type: 'PERMISSION_ERROR',
      fix: fixPermissionError,
      description: 'File permission issue'
    },
    {
      pattern: 'syntaxerror|unexpected token',
      type: 'SYNTAX_ERROR',
      fix: fixSyntaxError,
      description: 'JavaScript syntax error in script'
    },
    {
      pattern: 'rate.limit|429|too many requests',
      type: 'RATE_LIMITED',
      fix: fixRateLimit,
      description: 'API rate limit exceeded'
    },
    {
      pattern: 'authentication|unauthorized|401|403',
      type: 'AUTH_ERROR',
      fix: fixAuthError,
      description: 'Authentication/authorization failure'
    },
    {
      pattern: 'z-ai-web-dev-sdk',
      type: 'SDK_ERROR',
      fix: fixSDKError,
      description: 'z-ai-web-dev-sdk specific issue'
    },
    {
      pattern: 'json|parse|unexpected',
      type: 'PARSE_ERROR',
      fix: fixParseError,
      description: 'JSON/data parsing error'
    },
    {
      pattern: 'empty|too short|all variations failed',
      type: 'GENERATION_QUALITY',
      fix: fixGenerationQuality,
      description: 'AI generation returning empty or low quality'
    }
  ];

  for (const d of diagnostics) {
    if (errStr.includes(d.pattern)) {
      return d;
    }
  }

  return {
    type: 'UNKNOWN_ERROR',
    fix: fixGenericError,
    description: `Unhandled error: ${error.toString().slice(0, 200)}`
  };
}

// ============ FIX FUNCTIONS ============
function fixMissingDependency(error) {
  const errStr = error.toString();
  console.log('  [RECOVER] Fixing missing dependency...');

  try {
    // Extract module name
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

  // Fallback: install all dependencies
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
  // Nothing to fix code-wise, just signal to retry with delay
  logRecovery('network_retry', 'success', 'Will retry after delay');
  return true;
}

function fixFileNotFound(error) {
  const errStr = error.toString();
  console.log('  [RECOVER] Fixing file not found...');

  // Ensure all required directories exist
  const dirs = [
    '/home/z/my-project/download/rally-brain',
    '/home/z/my-project/download/rally-brain/campaign_data',
    '/home/z/my-project/download/rally-brain/campaign_data/0x39a11fa3e86eA8AC53772F26AA36b07506fa7dDB_output'
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  [RECOVER] Created directory: ${dir}`);
    }
  }

  // Ensure knowledge_db.json exists
  const kdbPath = '/home/z/my-project/download/rally-brain/knowledge_db.json';
  if (!fs.existsSync(kdbPath)) {
    const defaultKDB = {
      version: "2.0.0", last_updated: null,
      stats: { total_patterns: 0, total_campaigns_analyzed: 0, total_submissions_analyzed: 0, avg_prediction_diff: 0, last_learned: null, best_score_achieved: 0 },
      patterns: {
        surface: {}, structural: {},
        semantic: {
          claim_specificity: { description: "Concrete verifiable claims score higher", level: "high", learned_rules: [] },
          tone_style_match: { description: "Tone must match campaign context", level: "high", learned_rules: [] },
          engagement_hook: { description: "Opening hooks + CTA for engagement", level: "high", learned_rules: [] },
          rally_mention: { description: "Natural contextual mention with concrete mechanism", level: "high", learned_rules: [] },
          exaggeration_risk: { description: "Absolute claims risk Accuracy deductions", level: "critical", learned_rules: [] },
          cross_category_tradeoff: { description: "Balance categories", level: "medium", learned_rules: [] }
        }
      },
      scoring_model: {
        calibration_log: [],
        category_weights: { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5 },
        max_scores: { originality: 2, alignment: 2, accuracy: 2, compliance: 2, engagement: 5, technical: 5 },
        prediction_accuracy: { total_predictions: 0, avg_diff: 0 }
      },
      campaign_memories: {},
      v3_lessons: {
        source: "Rally actual scoring of v3 content (14/18 predicted 17.5)",
        losses: {
          accuracy_minus_1: "Exaggerated claim 'zero cost' — use precise language",
          accuracy_minus_05: "Vague phrase 'figured it out' — be specific",
          compliance_minus_1_mysterious_thread: "Mysterious thread opening flagged as violation",
          compliance_minus_1_extra_space: "Extra whitespace before @RallyOnChain",
          engagement_minus_05: "No CTA included — direct ask improves engagement"
        },
        generalized_rules: [
          "Never use absolute/exaggerated language unless factually verifiable",
          "Always include concrete mechanisms, not vague references",
          "Opening must be directly relevant, not mysterious",
          "Check formatting: no extra spaces, no trailing whitespace",
          "Always include a CTA for engagement points"
        ]
      }
    };
    fs.writeFileSync(kdbPath, JSON.stringify(defaultKDB, null, 2));
    console.log('  [RECOVER] Recreated knowledge_db.json');
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
  // Cannot auto-fix syntax errors easily — log and report
  logRecovery('syntax_error', 'failed', error.toString());
  return false; // Needs manual intervention (AI agent will handle via Layer 2)
}

function fixRateLimit(error) {
  console.log('  [RECOVER] Rate limited. Will wait longer before retry...');
  logRecovery('rate_limit', 'success', 'Will increase delay');
  return true;
}

function fixAuthError(error) {
  console.log('  [RECOVER] Auth error — checking SDK configuration...');
  // Try re-importing the SDK
  try {
    // Delete require cache
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
  console.log('  [RECOVER] SDK error — attempting reinstall...');
  try {
    execSync('cd /home/z/my-project && bun remove z-ai-web-dev-sdk && bun add z-ai-web-dev-sdk', { stdio: 'inherit', timeout: 120000 });
    // Clear cache
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
  console.log('  [RECOVER] Parse error — checking data files...');
  const kdbPath = '/home/z/my-project/download/rally-brain/knowledge_db.json';
  try {
    JSON.parse(fs.readFileSync(kdbPath, 'utf-8'));
    console.log('  [RECOVER] knowledge_db.json is valid JSON');
  } catch {
    console.log('  [RECOVER] knowledge_db.json is corrupted — resetting...');
    fixFileNotFound({ toString: () => 'ENOENT' });
  }
  logRecovery('parse_fix', 'success', 'Checked and fixed data files');
  return true;
}

function fixGenerationQuality(error) {
  console.log('  [RECOVER] Low generation quality — adjusting parameters...');
  // This is handled by the generate loop itself (increasing loops, changing temp)
  // Just log it
  logRecovery('quality_adjust', 'success', 'Will retry with adjusted parameters');
  return true;
}

function fixGenericError(error) {
  console.log('  [RECOVER] Unknown error — attempting full recovery...');
  // Nuclear option: ensure all deps installed, all files exist, clear caches
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

// ============ MAIN SELF-HEAL RUNNER ============
async function runWithRecovery() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  RALLY BRAIN v2.0 — SELF-HEAL MODE  ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`Max recovery attempts: ${MAX_RECOVERY_ATTEMPTS}`);
  console.log(`Recovery log: ${LOG_FILE}\n`);

  for (let attempt = 1; attempt <= MAX_RECOVERY_ATTEMPTS; attempt++) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`ATTEMPT ${attempt}/${MAX_RECOVERY_ATTEMPTS}`);
    console.log('='.repeat(50));

    try {
      // Clear module cache for fresh import
      Object.keys(require.cache).forEach(key => {
        if (key.includes('generate') || key.includes('z-ai-web-dev-sdk')) {
          delete require.cache[key];
        }
      });

      // Run generate.js as a child process for isolation
      const result = await new Promise((resolve, reject) => {
        const child = exec(
          'cd /home/z/my-project && node /home/z/my-project/download/rally-brain/generate.js',
          { timeout: 300000, maxBuffer: 10 * 1024 * 1024 },
          (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
          }
        );
      });

      console.log(result.stdout);
      if (result.stderr) console.error(result.stderr);

      // SUCCESS!
      const log = loadRecoveryLog();
      log.last_success = new Date().toISOString();
      log.total_recoveries += (attempt - 1); // Number of recoveries needed
      saveRecoveryLog(log);

      console.log('\n✅ GENERATE CYCLE COMPLETED SUCCESSFULLY');
      if (attempt > 1) {
        console.log(`⚡ Recovered after ${attempt - 1} failed attempt(s)`);
      }
      return { status: 'success', attempts: attempt, recovered: attempt > 1 };

    } catch (error) {
      console.error(`\n❌ ATTEMPT ${attempt} FAILED:`);
      console.error(`   ${error.toString().slice(0, 300)}`);

      if (attempt >= MAX_RECOVERY_ATTEMPTS) {
        console.log(`\n🚨 ALL ${MAX_RECOVERY_ATTEMPTS} ATTEMPTS EXHAUSTED`);
        console.log('⚠ Layer 2 recovery needed — AI agent will diagnose and fix architecture');
        logRecovery('exhausted', 'failed', error.toString());
        return { status: 'exhausted', error: error.toString(), attempts: attempt };
      }

      // DIAGNOSE
      const diagnosis = diagnoseError(error);
      console.log(`\n🔍 DIAGNOSIS: ${diagnosis.type} — ${diagnosis.description}`);

      // FIX
      console.log(`\n🔧 ATTEMPTING FIX...`);
      const fixed = diagnosis.fix(error);

      if (!fixed) {
        console.log(`  ⚠ Fix returned false — may need AI agent intervention`);
      }

      // DELAY before retry (exponential backoff)
      const delay = Math.min(10000 * attempt, 60000); // 10s, 20s, 30s, 40s, 50s
      console.log(`  ⏳ Waiting ${delay / 1000}s before retry...`);
      await sleep(delay);

      logRecovery('recovery_attempt', 'pending', `Attempt ${attempt} failed (${diagnosis.type}), retrying...`);
    }
  }
}

// ============ RUN ============
runWithRecovery().then(result => {
  console.log('\n' + '='.repeat(50));
  console.log('SELF-HEAL RESULT:', JSON.stringify(result, null, 2));
  process.exit(result.status === 'success' ? 0 : 1);
}).catch(err => {
  console.error('Self-heal system crashed:', err);
  logRecovery('self_heal_crash', 'failed', err.toString());
  process.exit(1);
});
