/**
 * Rally Brain Multi-Campaign Orchestrator v1.0
 * Runs all configured campaigns sequentially.
 * Called by cron job every 45 minutes.
 * 
 * Usage:
 *   node run_all.js                    # Run all campaigns
 *   node run_all.js marbmarket-m0      # Run specific campaign only
 *   node run_all.js --list             # List available campaigns
 * 
 * Architecture:
 *   CRON (45 min) -> run_all.js -> self_heal.js --campaign <id> -> generate.js <id>
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/home/z/my-project/download/rally-brain';
const CAMPAIGNS_DIR = path.join(PROJECT_DIR, 'campaigns');

// Campaign execution order
const CAMPAIGN_ORDER = [
  'marbmarket-m0',
  'marbmarket-m1',
  'second-campaign'
];

function getCampaigns() {
  try {
    const files = fs.readdirSync(CAMPAIGNS_DIR).filter(f => f.endsWith('.json'));
    return files.map(f => f.replace('.json', ''));
  } catch {
    console.error('Campaigns directory not found:', CAMPAIGNS_DIR);
    return [];
  }
}

function getCampaignsToRun() {
  const args = process.argv.slice(2);
  
  if (args.includes('--list')) {
    const campaigns = getCampaigns();
    console.log('Available campaigns:');
    for (const c of campaigns) {
      const config = JSON.parse(fs.readFileSync(path.join(CAMPAIGNS_DIR, `${c}.json`), 'utf-8'));
      console.log(`  ${c} - ${config.campaign.title}`);
      console.log(`    Mission: ${config.mission.title}`);
      console.log(`    Contract: ${config.campaign.contractAddress}`);
      console.log('');
    }
    process.exit(0);
  }
  
  // Specific campaign requested
  const specific = args.find(a => !a.startsWith('--'));
  if (specific) return [specific];
  
  // All campaigns in order
  return CAMPAIGN_ORDER.filter(c => {
    const configPath = path.join(CAMPAIGNS_DIR, `${c}.json`);
    return fs.existsSync(configPath);
  });
}

async function main() {
  const startTime = Date.now();
  const campaigns = getCampaignsToRun();
  
  console.log('========================================================');
  console.log('  RALLY BRAIN MULTI-CAMPAIGN ORCHESTRATOR v1.0');
  console.log('========================================================');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Campaigns to run: ${campaigns.join(', ')}`);
  console.log(`Order: ${campaigns.map((c, i) => `${i + 1}. ${c}`).join(' -> ')}`);
  console.log(`Token budget: ~${campaigns.length * 12} API calls this cycle`);
  console.log('========================================================\n');
  
  const results = [];
  
  for (let i = 0; i < campaigns.length; i++) {
    const campaignId = campaigns[i];
    const campaignStart = Date.now();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  CAMPAIGN ${i + 1}/${campaigns.length}: ${campaignId}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      const result = execSync(
        `cd /home/z/my-project && node ${PROJECT_DIR}/self_heal.js --campaign ${campaignId}`,
        { 
          timeout: 600000, // 10 min max per campaign
          maxBuffer: 10 * 1024 * 1024,
          stdio: 'inherit'
        }
      );
      
      const duration = ((Date.now() - campaignStart) / 1000).toFixed(0);
      results.push({ campaign: campaignId, status: 'success', duration: `${duration}s` });
      console.log(`\n  [OK] ${campaignId} completed in ${duration}s`);
      
    } catch (error) {
      const duration = ((Date.now() - campaignStart) / 1000).toFixed(0);
      results.push({ campaign: campaignId, status: 'failed', duration: `${duration}s`, error: error.message?.slice(0, 200) });
      console.error(`\n  [FAIL] ${campaignId} failed after ${duration}s: ${error.message?.slice(0, 200)}`);
    }
    
    // Wait between campaigns to avoid rate limit clash
    if (i < campaigns.length - 1) {
      const waitTime = 15000; // 15 seconds between campaigns
      console.log(`\n  Waiting ${waitTime / 1000}s before next campaign...`);
      await new Promise(r => setTimeout(r, waitTime));
    }
  }
  
  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log('\n\n========================================================');
  console.log('  ORCHESTRATOR SUMMARY');
  console.log('========================================================');
  console.log(`Total time: ${totalTime}s (${(totalTime / 60).toFixed(1)} min)`);
  console.log(`Campaigns: ${results.length}`);
  
  for (const r of results) {
    const icon = r.status === 'success' ? 'OK' : 'FAIL';
    console.log(`  [${icon}] ${r.campaign} (${r.duration})${r.error ? ` - ${r.error}` : ''}`);
  }
  
  const successCount = results.filter(r => r.status === 'success').length;
  console.log(`\nSuccess rate: ${successCount}/${results.length}`);
  
  // Save orchestrator log
  const logEntry = {
    timestamp: new Date().toISOString(),
    campaigns_run: campaigns,
    results: results,
    total_duration_s: parseInt(totalTime)
  };
  
  const logPath = path.join(PROJECT_DIR, 'campaign_data', 'orchestrator_log.json');
  let logs = [];
  try { logs = JSON.parse(fs.readFileSync(logPath, 'utf-8')); } catch {}
  logs.push(logEntry);
  if (logs.length > 100) logs = logs.slice(-100);
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
  
  process.exit(successCount > 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Orchestrator crashed:', err);
  process.exit(1);
});
