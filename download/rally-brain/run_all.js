/**
 * Rally Brain Multi-Campaign Orchestrator v2.0
 * Runs ONE campaign per invocation using round-robin rotation.
 * Each cron call picks the NEXT campaign in the rotation cycle.
 * 
 * Usage:
 *   node run_all.js                    # Run next campaign in rotation (default)
 *   node run_all.js --list             # List available campaigns
 *   node run_all.js marbmarket-m0      # Run specific campaign
 *   node run_all.js --all              # Run ALL campaigns sequentially (legacy mode)
 * 
 * Architecture:
 *   CRON (45 min) -> run_all.js (picks next) -> self_heal.js --campaign <id> -> generate.js <id>
 * 
 * Rotation state stored in: campaign_data/rotation_state.json
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/home/z/my-project/download/rally-brain';
const CAMPAIGNS_DIR = path.join(PROJECT_DIR, 'campaigns');
const STATE_FILE = path.join(PROJECT_DIR, 'campaign_data', 'rotation_state.json');
const LOG_FILE = path.join(PROJECT_DIR, 'campaign_data', 'orchestrator_log.json');

// ============ HELPERS ============
function getCampaigns() {
  try {
    return fs.readdirSync(CAMPAIGNS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    console.error('Campaigns directory not found:', CAMPAIGNS_DIR);
    return [];
  }
}

function loadRotationState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { last_campaign: null, last_run: null, cycle_count: 0, campaigns: [] };
  }
}

function saveRotationState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function logOrchestrator(entry) {
  let logs = [];
  try { logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')); } catch {}
  logs.push(entry);
  if (logs.length > 100) logs = logs.slice(-100);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

// ============ RUN SINGLE CAMPAIGN VIA SPAWN ============
function runCampaign(campaignId) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PROJECT_DIR, 'self_heal.js');
    const child = spawn('node', [scriptPath, '--campaign', campaignId], {
      cwd: '/home/z/my-project',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 600000
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      try { process.stdout.write(chunk); } catch {}
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      try { process.stderr.write(chunk); } catch {}
    });

    child.stdout.on('error', (err) => { if (err.code !== 'EPIPE') {} });
    child.stderr.on('error', (err) => { if (err.code !== 'EPIPE') {} });

    child.on('error', (err) => reject(err));
    child.on('close', (code, signal) => {
      if (signal) {
        reject(new Error(`Process killed by signal ${signal}`));
      } else if (code !== 0) {
        reject(new Error(`self_heal.js exited with code ${code}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
        reject(new Error('Campaign timed out after 600s'));
      }
    }, 610000);
  });
}

// ============ ROTATION LOGIC ============
function getNextCampaign() {
  const state = loadRotationState();
  const campaigns = getCampaigns();

  if (campaigns.length === 0) {
    console.error('No campaigns found in campaigns/ directory');
    return null;
  }

  // Update campaign list
  state.campaigns = campaigns;

  // Find next campaign in rotation
  const lastIndex = state.last_campaign ? campaigns.indexOf(state.last_campaign) : -1;
  const nextIndex = (lastIndex + 1) % campaigns.length;
  const nextCampaign = campaigns[nextIndex];

  // Update state
  state.last_campaign = nextCampaign;
  state.last_run = new Date().toISOString();
  state.cycle_count = (state.cycle_count || 0) + 1;
  saveRotationState(state);

  return { campaign: nextCampaign, state, allCampaigns: campaigns, nextIndex: nextIndex + 1 };
}

// ============ MAIN ============
async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);

  // --list: show available campaigns
  if (args.includes('--list')) {
    const campaigns = getCampaigns();
    const state = loadRotationState();
    console.log('Available campaigns:');
    for (const c of campaigns) {
      const configPath = path.join(CAMPAIGNS_DIR, `${c}.json`);
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        console.log(`  ${c} - ${config.campaign?.title || 'Unknown'}`);
        console.log(`    Mission: ${config.mission?.title || 'Unknown'}`);
        console.log(`    Contract: ${config.campaign?.contractAddress || 'N/A'}`);
        console.log('');
      } catch {
        console.log(`  ${c} - (failed to load config)`);
      }
    }
    console.log(`Last run: ${state.last_campaign || 'Never'} (cycle ${state.cycle_count || 0})`);
    process.exit(0);
  }

  // Specific campaign requested
  const specific = args.find(a => !a.startsWith('--'));
  if (specific && specific !== '--all') {
    // Run single specific campaign
    console.log(`Running specific campaign: ${specific}`);
    const campaignStart = Date.now();
    try {
      await runCampaign(specific);
      const duration = ((Date.now() - campaignStart) / 1000).toFixed(0);
      console.log(`\n  [OK] ${specific} completed in ${duration}s`);
      logOrchestrator({ timestamp: new Date().toISOString(), campaign: specific, status: 'success', duration_s: parseInt(duration) });
      process.exit(0);
    } catch (err) {
      const duration = ((Date.now() - campaignStart) / 1000).toFixed(0);
      console.error(`\n  [FAIL] ${specific} failed: ${err.message}`);
      logOrchestrator({ timestamp: new Date().toISOString(), campaign: specific, status: 'failed', error: err.message, duration_s: parseInt(duration) });
      process.exit(1);
    }
  }

  // --all: run ALL campaigns sequentially (legacy mode)
  if (args.includes('--all')) {
    const campaigns = getCampaigns();
    console.log('========================================================');
    console.log('  RALLY BRAIN ORCHESTRATOR v2.0 - ALL CAMPAIGNS MODE');
    console.log('========================================================');
    console.log(`Campaigns: ${campaigns.join(', ')}`);
    console.log(`Token budget: ~${campaigns.length * 12} API calls`);
    console.log('========================================================\n');

    const results = [];
    for (let i = 0; i < campaigns.length; i++) {
      const cid = campaigns[i];
      const cStart = Date.now();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`  CAMPAIGN ${i + 1}/${campaigns.length}: ${cid}`);
      console.log(`${'='.repeat(60)}\n`);
      try {
        await runCampaign(cid);
        const d = ((Date.now() - cStart) / 1000).toFixed(0);
        results.push({ campaign: cid, status: 'success', duration: `${d}s` });
      } catch (err) {
        const d = ((Date.now() - cStart) / 1000).toFixed(0);
        results.push({ campaign: cid, status: 'failed', duration: `${d}s`, error: err.message?.slice(0, 200) });
      }
      if (i < campaigns.length - 1) {
        console.log(`\n  Waiting 15s before next campaign...`);
        await new Promise(r => setTimeout(r, 15000));
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n\n========================================================');
    console.log('  ORCHESTRATOR SUMMARY');
    console.log('========================================================');
    for (const r of results) {
      console.log(`  [${r.status === 'success' ? 'OK' : 'FAIL'}] ${r.campaign} (${r.duration})${r.error ? ` - ${r.error}` : ''}`);
    }
    console.log(`Total: ${totalTime}s (${(totalTime / 60).toFixed(1)} min)`);
    const ok = results.filter(r => r.status === 'success').length;
    logOrchestrator({ timestamp: new Date().toISOString(), mode: 'all', results, total_duration_s: parseInt(totalTime) });
    process.exit(ok > 0 ? 0 : 1);
  }

  // DEFAULT: Rotation mode - run ONE campaign per invocation
  const rotation = getNextCampaign();
  if (!rotation) {
    process.exit(1);
  }

  const { campaign: campaignId, state: rotState, allCampaigns, nextIndex } = rotation;

  console.log('========================================================');
  console.log('  RALLY BRAIN ORCHESTRATOR v2.0 - ROTATION MODE');
  console.log('========================================================');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Cycle: #${rotState.cycle_count}`);
  console.log(`Running: ${campaignId} (${nextIndex}/${allCampaigns.length})`);
  console.log(`Rotation: ${allCampaigns.join(' -> ')}`);
  console.log(`Last run was: ${rotState.last_campaign || 'Never'}`);
  console.log('========================================================\n');

  const campaignStart = Date.now();
  let status = 'success';
  let error = null;

  try {
    await runCampaign(campaignId);
  } catch (err) {
    status = 'failed';
    error = err.message;
  }

  const duration = ((Date.now() - campaignStart) / 1000).toFixed(0);
  const icon = status === 'success' ? 'OK' : 'FAIL';

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ORCHESTRATOR RESULT: [${icon}] ${campaignId} (${duration}s)`);
  if (error) console.log(`  Error: ${error}`);
  console.log(`  Next in rotation: ${allCampaigns[(allCampaigns.indexOf(campaignId) + 1) % allCampaigns.length]}`);
  console.log(`${'='.repeat(50)}\n`);

  logOrchestrator({
    timestamp: new Date().toISOString(),
    mode: 'rotation',
    campaign: campaignId,
    status,
    cycle: rotState.cycle_count,
    duration_s: parseInt(duration),
    error
  });

  process.exit(status === 'success' ? 0 : 1);
}

main().catch(err => {
  console.error('Orchestrator crashed:', err);
  logOrchestrator({ timestamp: new Date().toISOString(), status: 'crash', error: err.message });
  process.exit(1);
});
