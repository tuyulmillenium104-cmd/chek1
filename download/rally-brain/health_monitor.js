/**
 * ============================================================
 * Rally Brain Health Monitor v1.0
 * ============================================================
 * 
 * Tracks system health across cycles, detects degradation patterns,
 * and triggers alerts/escalation to prevent wasted API calls.
 * 
 * STATUS LEVELS:
 *   HEALTHY   → All good, run normally
 *   WARNING   → 3+ consecutive failures or 3+ low-score cycles
 *   CRITICAL  → 5+ consecutive failures (skip generate, save quota)
 *   EMERGENCY → 10+ consecutive failures (needs human/AI intervention)
 * 
 * INTEGRATION:
 *   - Called by self_heal.js BEFORE each generate cycle
 *   - Called by self_heal.js AFTER each generate cycle
 *   - Cron prompt reads health_status.json for status reporting
 * 
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

const HEALTH_DIR = '/home/z/my-project/download/rally-brain/campaign_data';
const HEALTH_FILE = path.join(HEALTH_DIR, 'health_status.json');

// ============ ESCALATION THRESHOLDS ============
const THRESHOLDS = {
  CONSECUTIVE_FAIL_WARNING: 3,       // 3 fails → WARNING
  CONSECUTIVE_FAIL_CRITICAL: 5,      // 5 fails → CRITICAL (skip generate)
  CONSECUTIVE_FAIL_EMERGENCY: 10,    // 10 fails → EMERGENCY
  CONSECUTIVE_FAIL_COOLDOWN: 3,      // After CRITICAL, wait 3 cycles before retry

  LOW_SCORE_THRESHOLD: 13,           // Score below this = "low quality"
  CONSECUTIVE_LOW_SCORE_WARNING: 3,  // 3 low scores → QUALITY_WARNING
  CONSECUTIVE_LOW_SCORE_CRITICAL: 6, // 6 low scores → QUALITY_CRITICAL

  STALE_CYCLE_HOURS: 2,             // If no cycle in 2+ hours → STALE warning
  MAX_ALERTS: 50,                    // Keep last 50 alerts
  MAX_HISTORY: 100,                  // Keep last 100 cycle records
};

// ============ LOAD / SAVE ============
function loadHealth() {
  try {
    if (!fs.existsSync(HEALTH_FILE)) return null;
    return JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function saveHealth(health) {
  fs.mkdirSync(HEALTH_DIR, { recursive: true });
  fs.writeFileSync(HEALTH_FILE, JSON.stringify(health, null, 2));
}

function getDefaultHealth() {
  return {
    version: '1.0.0',
    system_status: 'HEALTHY',
    last_updated: null,
    last_cycle_status: null,
    last_cycle_score: null,
    last_cycle_timestamp: null,
    last_success_timestamp: null,

    // Counters
    total_cycles: 0,
    total_successes: 0,
    total_failures: 0,
    total_skipped: 0,  // Skipped due to CRITICAL status

    // Consecutive tracking
    consecutive_failures: 0,
    consecutive_successes: 0,
    consecutive_low_scores: 0,
    consecutive_high_scores: 0,

    // Score tracking
    best_score: 0,
    worst_score: 23,
    avg_score_10: null,    // Rolling average of last 10 cycles
    avg_score_5: null,     // Rolling average of last 5 cycles

    // Quality trend
    score_trend: 'unknown', // improving / stable / declining / unknown

    // Critical cooldown
    critical_since: null,
    cooldown_cycles_remaining: 0,

    // Alerts log
    alerts: [],
    
    // Cycle history (compact)
    cycle_history: [],

    // Uptime
    started_at: new Date().toISOString()
  };
}

// ============ ALERT SYSTEM ============
function addAlert(health, level, code, message) {
  const alert = {
    timestamp: new Date().toISOString(),
    level,       // INFO, WARNING, CRITICAL, EMERGENCY
    code,        // MACHINE_READABLE_CODE
    message      // Human-readable description
  };

  health.alerts.push(alert);
  if (health.alerts.length > THRESHOLDS.MAX_ALERTS) {
    health.alerts = health.alerts.slice(-THRESHOLDS.MAX_ALERTS);
  }

  return alert;
}

// ============ PRE-CYCLE CHECK ============
function preCycleCheck() {
  let health = loadHealth();
  if (!health) {
    health = getDefaultHealth();
    saveHealth(health);
  }

  const result = {
    should_run: true,
    reason: '',
    status: health.system_status,
    consecutive_failures: health.consecutive_failures,
    consecutive_low_scores: health.consecutive_low_scores,
    alerts_to_report: [],
    skipped_reason: null
  };

  // Check 1: CRITICAL/EMERGENCY → skip generate
  if (health.system_status === 'CRITICAL' || health.system_status === 'EMERGENCY') {
    // Check cooldown
    if (health.cooldown_cycles_remaining > 0) {
      result.should_run = false;
      result.skipped_reason = `${health.system_status}: cooldown ${health.cooldown_cycles_remaining} cycles remaining`;
      result.alerts_to_report = health.alerts.slice(-5);

      // Decrement cooldown (we track this by checking last_updated)
      const lastUpdate = health.last_updated ? new Date(health.last_updated) : null;
      const now = new Date();
      if (lastUpdate) {
        const hoursSince = (now - lastUpdate) / (1000 * 60 * 60);
        // Rough: each cron cycle is 30 min, so 3 cycles ≈ 1.5 hours
        const cyclesPassed = Math.floor(hoursSince / 0.5);
        if (cyclesPassed >= health.cooldown_cycles_remaining) {
          // Cooldown expired, allow retry
          health.cooldown_cycles_remaining = 0;
          health.system_status = 'WARNING';
          addAlert(health, 'INFO', 'COOLDOWN_EXPIRED', 
            `Cooldown expired after ${cyclesPassed} cycles. Retrying with WARNING status.`);
          result.should_run = true;
          result.skipped_reason = null;
          result.status = 'WARNING';
          result.reason = 'Cooldown expired, attempting retry';
        }
      }

      health.total_skipped++;
      saveHealth(health);
      return result;
    }
  }

  // Check 2: Stale cycle (no cycle in 2+ hours when cron is active)
  if (health.last_cycle_timestamp) {
    const lastCycle = new Date(health.last_cycle_timestamp);
    const hoursSince = (Date.now() - lastCycle) / (1000 * 60 * 60);
    if (hoursSince > THRESHOLDS.STALE_CYCLE_HOURS && health.total_cycles > 0) {
      result.alerts_to_report.push({
        level: 'WARNING',
        code: 'STALE_CYCLE',
        message: `No cycle completed in ${hoursSince.toFixed(1)} hours`
      });
    }
  }

  // Check 3: Score trend
  if (health.score_trend === 'declining' && health.consecutive_low_scores >= 2) {
    result.alerts_to_report.push({
      level: 'WARNING',
      code: 'DECLINING_QUALITY',
      message: `Quality declining: ${health.consecutive_low_scores} consecutive low scores, avg_5=${health.avg_score_5}`
    });
  }

  // Check 4: Report any unacked CRITICAL alerts
  const criticalAlerts = health.alerts.filter(a => 
    a.level === 'CRITICAL' || a.level === 'EMERGENCY'
  );
  if (criticalAlerts.length > 0) {
    result.alerts_to_report.push(...criticalAlerts.slice(-3));
  }

  return result;
}

// ============ POST-CYCLE UPDATE ============
function postCycleUpdate(cycleResult) {
  /**
   * cycleResult: {
   *   status: 'success' | 'fail' | 'exhausted',
   *   score: number | null,
   *   grade: string | null,
   *   attempts: number,
   *   error: string | null,
   *   duration_ms: number | null
   * }
   */
  let health = loadHealth() || getDefaultHealth();

  const now = new Date().toISOString();
  const prevStatus = health.system_status;

  // Update counters
  health.total_cycles++;
  health.last_updated = now;
  health.last_cycle_timestamp = now;
  health.last_cycle_status = cycleResult.status;

  if (cycleResult.status === 'success') {
    health.total_successes++;
    health.last_success_timestamp = now;
    health.consecutive_failures = 0;
    health.consecutive_successes++;
    health.last_cycle_score = cycleResult.score;

    // Score tracking
    if (cycleResult.score !== null) {
      health.best_score = Math.max(health.best_score, cycleResult.score);
      health.worst_score = Math.min(health.worst_score, cycleResult.score);

      // Low score check
      if (cycleResult.score < THRESHOLDS.LOW_SCORE_THRESHOLD) {
        health.consecutive_low_scores++;
        health.consecutive_high_scores = 0;
      } else {
        health.consecutive_low_scores = 0;
        health.consecutive_high_scores++;
      }
    }

    // Record in history
    health.cycle_history.push({
      timestamp: now,
      status: 'success',
      score: cycleResult.score,
      grade: cycleResult.grade,
      attempts: cycleResult.attempts,
      duration_ms: cycleResult.duration_ms
    });

    // If we were in CRITICAL/WARNING, recovering
    if (prevStatus === 'CRITICAL' || prevStatus === 'EMERGENCY') {
      health.system_status = 'WARNING';
      addAlert(health, 'INFO', 'RECOVERING', 
        `Cycle succeeded after ${health.consecutive_successes} attempt(s). Status: WARNING (monitoring).`);
    } else if (prevStatus === 'WARNING') {
      // Need 2 consecutive successes to go back to HEALTHY
      if (health.consecutive_successes >= 2) {
        health.system_status = 'HEALTHY';
        addAlert(health, 'INFO', 'RECOVERED', 
          `System recovered to HEALTHY after ${health.consecutive_successes} consecutive successes.`);
      }
    } else {
      health.system_status = 'HEALTHY';
    }

  } else {
    // FAIL or EXHAUSTED
    health.total_failures++;
    health.consecutive_failures++;
    health.consecutive_successes = 0;
    health.last_cycle_score = cycleResult.score;

    health.cycle_history.push({
      timestamp: now,
      status: cycleResult.status,
      score: cycleResult.score,
      attempts: cycleResult.attempts,
      error: cycleResult.error?.slice(0, 200)
    });

    // Escalation based on consecutive failures
    if (health.consecutive_failures >= THRESHOLDS.CONSECUTIVE_FAIL_EMERGENCY) {
      health.system_status = 'EMERGENCY';
      health.cooldown_cycles_remaining = THRESHOLDS.CONSECUTIVE_FAIL_COOLDOWN + 2;
      addAlert(health, 'EMERGENCY', 'CONSECUTIVE_FAIL_EMERGENCY',
        `${health.consecutive_failures} consecutive failures! System EMERGENCY. Skipping next ${health.cooldown_cycles_remaining} cycles. Needs human/AI intervention.`);
    } else if (health.consecutive_failures >= THRESHOLDS.CONSECUTIVE_FAIL_CRITICAL) {
      health.system_status = 'CRITICAL';
      health.critical_since = now;
      health.cooldown_cycles_remaining = THRESHOLDS.CONSECUTIVE_FAIL_COOLDOWN;
      addAlert(health, 'CRITICAL', 'CONSECUTIVE_FAIL_CRITICAL',
        `${health.consecutive_failures} consecutive failures. System CRITICAL. Skipping next ${health.cooldown_cycles_remaining} cycles to save API quota.`);
    } else if (health.consecutive_failures >= THRESHOLDS.CONSECUTIVE_FAIL_WARNING) {
      health.system_status = 'WARNING';
      addAlert(health, 'WARNING', 'CONSECUTIVE_FAIL_WARNING',
        `${health.consecutive_failures} consecutive failures. System WARNING. Monitoring...`);
    }
  }

  // Quality escalation (independent of failure escalation)
  if (health.consecutive_low_scores >= THRESHOLDS.CONSECUTIVE_LOW_SCORE_CRITICAL) {
    addAlert(health, 'CRITICAL', 'QUALITY_CRITICAL',
      `${health.consecutive_low_scores} consecutive low scores (<${THRESHOLDS.LOW_SCORE_THRESHOLD}/23). Content quality is critically low.`);
  } else if (health.consecutive_low_scores >= THRESHOLDS.CONSECUTIVE_LOW_SCORE_WARNING) {
    addAlert(health, 'WARNING', 'QUALITY_WARNING',
      `${health.consecutive_low_scores} consecutive low scores (<${THRESHOLDS.LOW_SCORE_THRESHOLD}/23). Quality declining.`);
  }

  // Calculate rolling averages
  const successHistory = health.cycle_history.filter(c => c.status === 'success' && c.score !== null);
  if (successHistory.length >= 5) {
    const last5 = successHistory.slice(-5).map(c => c.score);
    health.avg_score_5 = Math.round((last5.reduce((a, b) => a + b, 0) / last5.length) * 10) / 10;
  }
  if (successHistory.length >= 10) {
    const last10 = successHistory.slice(-10).map(c => c.score);
    health.avg_score_10 = Math.round((last10.reduce((a, b) => a + b, 0) / last10.length) * 10) / 10;
  }

  // Score trend detection
  if (health.avg_score_5 !== null && health.avg_score_10 !== null) {
    const diff = health.avg_score_5 - health.avg_score_10;
    if (diff > 1.0) health.score_trend = 'improving';
    else if (diff < -1.0) health.score_trend = 'declining';
    else health.score_trend = 'stable';
  }

  // Trim history
  if (health.cycle_history.length > THRESHOLDS.MAX_HISTORY) {
    health.cycle_history = health.cycle_history.slice(-THRESHOLDS.MAX_HISTORY);
  }

  saveHealth(health);
  return health;
}

// ============ GET STATUS SUMMARY (for cron reporting) ============
function getStatusSummary() {
  const health = loadHealth();
  if (!health) {
    return {
      status: 'NO_DATA',
      message: 'No health data yet. System has not completed any cycles.'
    };
  }

  const summary = {
    system_status: health.system_status,
    emoji: health.system_status === 'HEALTHY' ? '✅' 
         : health.system_status === 'WARNING' ? '⚠️'
         : health.system_status === 'CRITICAL' ? '🔴'
         : '🚨',
    total_cycles: health.total_cycles,
    successes: health.total_successes,
    failures: health.total_failures,
    skipped: health.total_skipped,
    success_rate: health.total_cycles > 0 
      ? Math.round((health.total_successes / health.total_cycles) * 100) + '%' 
      : 'N/A',
    consecutive_failures: health.consecutive_failures,
    consecutive_successes: health.consecutive_successes,
    consecutive_low_scores: health.consecutive_low_scores,
    best_score: health.best_score,
    worst_score: health.worst_score,
    avg_score_5: health.avg_score_5,
    avg_score_10: health.avg_score_10,
    score_trend: health.score_trend,
    last_cycle: health.last_cycle_timestamp,
    last_success: health.last_success_timestamp,
    last_cycle_status: health.last_cycle_status,
    last_cycle_score: health.last_cycle_score,
    cooldown_remaining: health.cooldown_cycles_remaining,
    recent_alerts: health.alerts.slice(-5).map(a => `[${a.level}] ${a.code}: ${a.message}`),
    uptime_hours: health.started_at 
      ? Math.round((Date.now() - new Date(health.started_at)) / (1000 * 60 * 60) * 10) / 10
      : null
  };

  return summary;
}

// ============ RESET (manual intervention) ============
function resetHealth() {
  const health = getDefaultHealth();
  const oldHealth = loadHealth();
  if (oldHealth) {
    addAlert(health, 'INFO', 'MANUAL_RESET', 
      `Health monitor manually reset. Previous: ${oldHealth.total_cycles} cycles, best=${oldHealth.best_score}`);
  }
  saveHealth(health);
  return health;
}

// ============ CLI INTERFACE ============
if (require.main === module) {
  const command = process.argv[2] || 'status';

  switch (command) {
    case 'status':
      const summary = getStatusSummary();
      console.log('╔══════════════════════════════════════╗');
      console.log('║     RALLY BRAIN HEALTH MONITOR       ║');
      console.log('╚══════════════════════════════════════╝');
      console.log(`\n  Status: ${summary.emoji} ${summary.system_status}`);
      console.log(`  Cycles: ${summary.total_cycles} (✅${summary.successes} ❌${summary.failures} ⏭${summary.skipped})`);
      console.log(`  Success Rate: ${summary.success_rate}`);
      console.log(`  Consecutive: ${summary.consecutive_successes} wins / ${summary.consecutive_failures} fails`);
      console.log(`  Low Scores: ${summary.consecutive_low_scores} in a row`);
      console.log(`  Best: ${summary.best_score}/23 | Worst: ${summary.worst_score}/23`);
      console.log(`  Avg (5): ${summary.avg_score_5 || 'N/A'} | Avg (10): ${summary.avg_score_10 || 'N/A'}`);
      console.log(`  Trend: ${summary.score_trend}`);
      console.log(`  Last Cycle: ${summary.last_cycle || 'Never'}`);
      console.log(`  Last Success: ${summary.last_success || 'Never'}`);
      console.log(`  Last Score: ${summary.last_cycle_score || 'N/A'}`);
      console.log(`  Cooldown: ${summary.cooldown_remaining} cycles remaining`);
      console.log(`  Uptime: ${summary.uptime_hours || 'N/A'} hours`);
      
      if (summary.recent_alerts && summary.recent_alerts.length > 0) {
        console.log('\n  Recent Alerts:');
        for (const a of summary.recent_alerts) {
          console.log(`    ${a}`);
        }
      }
      console.log('');
      break;

    case 'check':
      const check = preCycleCheck();
      console.log(JSON.stringify(check, null, 2));
      break;

    case 'reset':
      resetHealth();
      console.log('Health monitor reset to defaults.');
      break;

    default:
      console.log('Usage: node health_monitor.js [status|check|reset]');
  }
}

module.exports = { preCycleCheck, postCycleUpdate, getStatusSummary, resetHealth, THRESHOLDS };
