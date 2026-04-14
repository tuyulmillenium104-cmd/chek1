/**
 * ============================================================
 * Rally Brain Health Monitor v2.0
 * ============================================================
 * 
 * Tracks system health across cycles, detects degradation patterns,
 * and triggers alerts/escalation to prevent wasted API calls.
 * 
 * v2.0: Per-campaign health tracking
 *   - Accepts --campaign <name> argument
 *   - Health state stored as: campaign_data/<campaign_name>_health.json
 *   - If no campaign specified, uses default health_status.json (backward compat)
 *   - Exported functions accept optional campaignId parameter
 * 
 * STATUS LEVELS:
 *   HEALTHY   -> All good, run normally
 *   WARNING   -> 3+ consecutive failures or 3+ low-score cycles
 *   CRITICAL  -> 5+ consecutive failures (skip generate, save quota)
 *   EMERGENCY -> 10+ consecutive failures (needs human/AI intervention)
 * 
 * INTEGRATION:
 *   - Called by self_heal.js BEFORE each generate cycle
 *   - Called by self_heal.js AFTER each generate cycle
 *   - CLI: node health_monitor.js [status|check|reset] [--campaign <name>]
 * 
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = '/home/z/my-project/download/rally-brain/campaign_data';

// ============ ESCALATION THRESHOLDS ============
const THRESHOLDS = {
  CONSECUTIVE_FAIL_WARNING: 3,
  CONSECUTIVE_FAIL_CRITICAL: 5,
  CONSECUTIVE_FAIL_EMERGENCY: 10,
  CONSECUTIVE_FAIL_COOLDOWN: 3,

  LOW_SCORE_THRESHOLD: 13,
  CONSECUTIVE_LOW_SCORE_WARNING: 3,
  CONSECUTIVE_LOW_SCORE_CRITICAL: 6,

  STALE_CYCLE_HOURS: 2,
  MAX_ALERTS: 50,
  MAX_HISTORY: 100,
};

// ============ CAMPAIGN-AWARE HEALTH PATH ============
function getHealthFile(campaignId) {
  if (campaignId) {
    return path.join(BASE_DIR, `${campaignId}_health.json`);
  }
  // Default: global health (backward compatible)
  return path.join(BASE_DIR, 'health_status.json');
}

// ============ LOAD / SAVE ============
function loadHealth(campaignId) {
  const healthFile = getHealthFile(campaignId);
  try {
    if (!fs.existsSync(healthFile)) return null;
    return JSON.parse(fs.readFileSync(healthFile, 'utf-8'));
  } catch {
    return null;
  }
}

function saveHealth(health, campaignId) {
  const healthFile = getHealthFile(campaignId);
  fs.mkdirSync(path.dirname(healthFile), { recursive: true });
  fs.writeFileSync(healthFile, JSON.stringify(health, null, 2));
}

function getDefaultHealth() {
  return {
    version: '2.0.0',
    system_status: 'HEALTHY',
    last_updated: null,
    last_cycle_status: null,
    last_cycle_score: null,
    last_cycle_timestamp: null,
    last_success_timestamp: null,

    total_cycles: 0,
    total_successes: 0,
    total_failures: 0,
    total_skipped: 0,

    consecutive_failures: 0,
    consecutive_successes: 0,
    consecutive_low_scores: 0,
    consecutive_high_scores: 0,

    best_score: 0,
    worst_score: 23,
    avg_score_10: null,
    avg_score_5: null,

    score_trend: 'unknown',

    critical_since: null,
    cooldown_cycles_remaining: 0,

    alerts: [],
    cycle_history: [],

    started_at: new Date().toISOString()
  };
}

// ============ ALERT SYSTEM ============
function addAlert(health, level, code, message) {
  const alert = {
    timestamp: new Date().toISOString(),
    level,
    code,
    message
  };

  health.alerts.push(alert);
  if (health.alerts.length > THRESHOLDS.MAX_ALERTS) {
    health.alerts = health.alerts.slice(-THRESHOLDS.MAX_ALERTS);
  }

  return alert;
}

// ============ PRE-CYCLE CHECK ============
function preCycleCheck(campaignId) {
  let health = loadHealth(campaignId);
  if (!health) {
    health = getDefaultHealth();
    saveHealth(health, campaignId);
  }

  const result = {
    should_run: true,
    reason: '',
    status: health.system_status,
    consecutive_failures: health.consecutive_failures,
    consecutive_low_scores: health.consecutive_low_scores,
    alerts_to_report: [],
    skipped_reason: null,
    campaign: campaignId || 'global'
  };

  // Check 1: CRITICAL/EMERGENCY -> skip generate
  if (health.system_status === 'CRITICAL' || health.system_status === 'EMERGENCY') {
    if (health.cooldown_cycles_remaining > 0) {
      result.should_run = false;
      result.skipped_reason = `${health.system_status}: cooldown ${health.cooldown_cycles_remaining} cycles remaining`;
      result.alerts_to_report = health.alerts.slice(-5);

      const lastUpdate = health.last_updated ? new Date(health.last_updated) : null;
      const now = new Date();
      if (lastUpdate) {
        const hoursSince = (now - lastUpdate) / (1000 * 60 * 60);
        const cyclesPassed = Math.floor(hoursSince / 0.5);
        if (cyclesPassed >= health.cooldown_cycles_remaining) {
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
      saveHealth(health, campaignId);
      return result;
    }
  }

  // Check 2: Stale cycle
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

  // Check 4: Unacked CRITICAL alerts
  const criticalAlerts = health.alerts.filter(a =>
    a.level === 'CRITICAL' || a.level === 'EMERGENCY'
  );
  if (criticalAlerts.length > 0) {
    result.alerts_to_report.push(...criticalAlerts.slice(-3));
  }

  return result;
}

// ============ POST-CYCLE UPDATE ============
function postCycleUpdate(cycleResult, campaignId) {
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
  let health = loadHealth(campaignId) || getDefaultHealth();

  const now = new Date().toISOString();
  const prevStatus = health.system_status;

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

    if (cycleResult.score !== null) {
      health.best_score = Math.max(health.best_score, cycleResult.score);
      health.worst_score = Math.min(health.worst_score, cycleResult.score);

      if (cycleResult.score < THRESHOLDS.LOW_SCORE_THRESHOLD) {
        health.consecutive_low_scores++;
        health.consecutive_high_scores = 0;
      } else {
        health.consecutive_low_scores = 0;
        health.consecutive_high_scores++;
      }
    }

    health.cycle_history.push({
      timestamp: now,
      status: 'success',
      score: cycleResult.score,
      grade: cycleResult.grade,
      attempts: cycleResult.attempts,
      duration_ms: cycleResult.duration_ms
    });

    if (prevStatus === 'CRITICAL' || prevStatus === 'EMERGENCY') {
      health.system_status = 'WARNING';
      addAlert(health, 'INFO', 'RECOVERING',
        `Cycle succeeded after ${health.consecutive_successes} attempt(s). Status: WARNING (monitoring).`);
    } else if (prevStatus === 'WARNING') {
      if (health.consecutive_successes >= 2) {
        health.system_status = 'HEALTHY';
        addAlert(health, 'INFO', 'RECOVERED',
          `System recovered to HEALTHY after ${health.consecutive_successes} consecutive successes.`);
      }
    } else {
      health.system_status = 'HEALTHY';
    }

  } else {
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

    if (health.consecutive_failures >= THRESHOLDS.CONSECUTIVE_FAIL_EMERGENCY) {
      health.system_status = 'EMERGENCY';
      health.cooldown_cycles_remaining = THRESHOLDS.CONSECUTIVE_FAIL_COOLDOWN + 2;
      addAlert(health, 'EMERGENCY', 'CONSECUTIVE_FAIL_EMERGENCY',
        `${health.consecutive_failures} consecutive failures! System EMERGENCY. Skipping next ${health.cooldown_cycles_remaining} cycles.`);
    } else if (health.consecutive_failures >= THRESHOLDS.CONSECUTIVE_FAIL_CRITICAL) {
      health.system_status = 'CRITICAL';
      health.critical_since = now;
      health.cooldown_cycles_remaining = THRESHOLDS.CONSECUTIVE_FAIL_COOLDOWN;
      addAlert(health, 'CRITICAL', 'CONSECUTIVE_FAIL_CRITICAL',
        `${health.consecutive_failures} consecutive failures. System CRITICAL. Skipping next ${health.cooldown_cycles_remaining} cycles.`);
    } else if (health.consecutive_failures >= THRESHOLDS.CONSECUTIVE_FAIL_WARNING) {
      health.system_status = 'WARNING';
      addAlert(health, 'WARNING', 'CONSECUTIVE_FAIL_WARNING',
        `${health.consecutive_failures} consecutive failures. System WARNING.`);
    }
  }

  // Quality escalation
  if (health.consecutive_low_scores >= THRESHOLDS.CONSECUTIVE_LOW_SCORE_CRITICAL) {
    addAlert(health, 'CRITICAL', 'QUALITY_CRITICAL',
      `${health.consecutive_low_scores} consecutive low scores (<${THRESHOLDS.LOW_SCORE_THRESHOLD}/23).`);
  } else if (health.consecutive_low_scores >= THRESHOLDS.CONSECUTIVE_LOW_SCORE_WARNING) {
    addAlert(health, 'WARNING', 'QUALITY_WARNING',
      `${health.consecutive_low_scores} consecutive low scores (<${THRESHOLDS.LOW_SCORE_THRESHOLD}/23).`);
  }

  // Rolling averages
  const successHistory = health.cycle_history.filter(c => c.status === 'success' && c.score !== null);
  if (successHistory.length >= 5) {
    const last5 = successHistory.slice(-5).map(c => c.score);
    health.avg_score_5 = Math.round((last5.reduce((a, b) => a + b, 0) / last5.length) * 10) / 10;
  }
  if (successHistory.length >= 10) {
    const last10 = successHistory.slice(-10).map(c => c.score);
    health.avg_score_10 = Math.round((last10.reduce((a, b) => a + b, 0) / last10.length) * 10) / 10;
  }

  // Score trend
  if (health.avg_score_5 !== null && health.avg_score_10 !== null) {
    const diff = health.avg_score_5 - health.avg_score_10;
    if (diff > 1.0) health.score_trend = 'improving';
    else if (diff < -1.0) health.score_trend = 'declining';
    else health.score_trend = 'stable';
  }

  if (health.cycle_history.length > THRESHOLDS.MAX_HISTORY) {
    health.cycle_history = health.cycle_history.slice(-THRESHOLDS.MAX_HISTORY);
  }

  saveHealth(health, campaignId);
  return health;
}

// ============ GET STATUS SUMMARY ============
function getStatusSummary(campaignId) {
  const health = loadHealth(campaignId);
  if (!health) {
    return {
      status: 'NO_DATA',
      message: 'No health data yet.',
      campaign: campaignId || 'global'
    };
  }

  return {
    system_status: health.system_status,
    emoji: health.system_status === 'HEALTHY' ? 'OK'
         : health.system_status === 'WARNING' ? 'WARN'
         : health.system_status === 'CRITICAL' ? 'CRIT'
         : 'EMERG',
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
      : null,
    campaign: campaignId || 'global'
  };
}

// ============ RESET ============
function resetHealth(campaignId) {
  const health = getDefaultHealth();
  const oldHealth = loadHealth(campaignId);
  if (oldHealth) {
    addAlert(health, 'INFO', 'MANUAL_RESET',
      `Health monitor manually reset. Previous: ${oldHealth.total_cycles} cycles, best=${oldHealth.best_score}`);
  }
  saveHealth(health, campaignId);
  return health;
}

// ============ CLI INTERFACE ============
if (require.main === module) {
  const args = process.argv.slice(2);
  const campaignIdx = args.indexOf('--campaign');
  const campaignId = campaignIdx !== -1 && args[campaignIdx + 1] ? args[campaignIdx + 1] : null;

  const command = args.find(a => !a.startsWith('--')) || 'status';

  switch (command) {
    case 'status': {
      const summary = getStatusSummary(campaignId);
      console.log('========================================================');
      console.log('     RALLY BRAIN HEALTH MONITOR v2.0');
      console.log('========================================================');
      console.log(`  Campaign: ${campaignId || 'global (default)'}`);
      console.log(`\n  Status: ${summary.emoji} ${summary.system_status}`);
      console.log(`  Cycles: ${summary.total_cycles} (OK:${summary.successes} FAIL:${summary.failures} SKIP:${summary.skipped})`);
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
    }

    case 'check': {
      const check = preCycleCheck(campaignId);
      console.log(JSON.stringify(check, null, 2));
      break;
    }

    case 'reset': {
      resetHealth(campaignId);
      console.log(`Health monitor reset to defaults. Campaign: ${campaignId || 'global'}`);
      break;
    }

    case 'all': {
      // Show status for ALL campaigns
      const campaignsDir = path.join('/home/z/my-project/download/rally-brain', 'campaigns');
      try {
        const files = fs.readdirSync(campaignsDir).filter(f => f.endsWith('.json'));
        console.log('========================================================');
        console.log('     RALLY BRAIN HEALTH MONITOR v2.0 - ALL CAMPAIGNS');
        console.log('========================================================');
        for (const f of files) {
          const cid = f.replace('.json', '');
          const summary = getStatusSummary(cid);
          console.log(`\n  [${cid}] ${summary.emoji} ${summary.system_status}`);
          console.log(`    Cycles: ${summary.total_cycles} | Best: ${summary.best_score}/23 | Avg: ${summary.avg_score_5 || 'N/A'} | Trend: ${summary.score_trend}`);
        }
        // Also show global
        const globalSummary = getStatusSummary(null);
        console.log(`\n  [global] ${globalSummary.emoji} ${globalSummary.system_status}`);
        console.log('');
      } catch {
        console.log('No campaigns found.');
      }
      break;
    }

    default:
      console.log('Usage: node health_monitor.js [status|check|reset|all] [--campaign <name>]');
      console.log('  status  - Show health status (default)');
      console.log('  check   - Pre-cycle check (JSON output)');
      console.log('  reset   - Reset health monitor');
      console.log('  all     - Show status for all campaigns');
      console.log('  --campaign <name> - Target specific campaign');
      break;
  }
}

module.exports = { preCycleCheck, postCycleUpdate, getStatusSummary, resetHealth, THRESHOLDS, getHealthFile };
