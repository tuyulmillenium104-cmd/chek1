/**
 * ============================================================
 * RALLY GUARD v1.0 - Permanent Solution for 429 + Container Kill
 * ============================================================
 *
 * PROBLEM SOLVED:
 * 1. 429 Rate Limited → Global lock + persistent token state + single process
 * 2. Container Kill   → Pre-flight API check + minimal learning mode
 * 3. Wrong Compliance → Campaign scraper + Rally page fetcher
 * 4. Overlapping Cron → PID lock file + stale process detection
 *
 * USAGE:
 *   node rally-guard.js                    # Run next campaign (safe)
 *   node rally-guard.js campaign_3         # Run specific campaign
 *   node rally-guard.js --preflight        # Only check API health
 *   node rally-guard.js --status           # Show token + lock status
 *   node rally-guard.js --scrape campaign_3  # Fetch fresh data from Rally
 *   node rally-guard.js --reset            # Clear lock + reset tokens
 *
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const http = require('http');

const PROJECT_DIR = '/home/z/my-project/download/rally-brain';
const STATE_DIR = path.join(PROJECT_DIR, 'campaign_data');
const LOCK_FILE = path.join(STATE_DIR, '.rally_guard.lock');
const TOKEN_STATE_FILE = path.join(STATE_DIR, '.token_state.json');
const API_STATE_FILE = path.join(STATE_DIR, '.api_health.json');

// ============ TOKEN CONFIG (same as zai-resilient.js) ============
const TOKENS = [
  {
    name: 'TOKEN_1',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtOWJiMzAzOTMtYWE3Mi00Y2QzLWJkNzktYzJkZmI0ODVmNzgyIn0.jb35oqGKPB2FLC-X_mozORmvbBilwRc_pSZEkbyaRfw',
    userId: '97631263-5dba-4e16-b127-19212e012a9b',
    chatId: 'chat-9bb30393-aa72-4cd3-bd79-c2dfb485f782',
  },
  {
    name: 'TOKEN_2',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMWNkY2Y1NzktYzZlNS00ZWY3LTgyZDUtZDg2OWQ4Yzg1YTVlIiwiY2hhdF9pZCI6ImNoYXQtMDQ4YTVhODItZWRhMi00ZTQ0LTk4YWEtZmM5YTk0Y2UyNWZmIn0.asZolcXMp4kvy_2UqeA4BHvYx0gAsw7mNgNrRXKJrtw',
    userId: '1cdcf579-c6e5-4ef7-82d5-d869d8c85a5e',
    chatId: 'chat-048a5a82-eda2-4e44-98aa-fc9a94ce25ff',
  },
  {
    name: 'TOKEN_3',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtNTQ5ZmI5MTEtZWM0NS00NGJiLTg5YjEtMWY2MTljNTEzN2QzIn0.M6IQTOXasSbEw98a4R6p3LEPwJPCWyRZiJSUo8lr2PM',
    userId: '97631263-5dba-4e16-b127-19212e012a9b',
    chatId: 'chat-549fb911-ec45-44bb-89b1-1f619c5137d3',
  },
  {
    name: 'TOKEN_4',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtYmJlNzk2ZjItOTM1Yy00NTY5LTk3YjYtZjFiNTA4N2IxOTQ2IiwicGxhdGZvcm0iOiIifQ.KKYhRmTOx_dfMSYygKLVsJuXiJq7u_8t4JfzZHGQpQs',
    userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
    chatId: 'chat-bbe796f2-935c-4569-97b6-f1b5087b1946',
  },
  {
    name: 'TOKEN_5',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNGYzZGUzMDgtNzAzZi00YzgyLTg5YTQtOGE4Y2FiY2QzNmY5IiwiY2hhdF9pZCI6ImNoYXQtYTJmNTU3ZDgtNDA2Zi00MzhhLTg1MzUtYTQyMWM2YmZlMjk2IiwicGxhdGZvcm0iOiJ6YWkifQ.dIzeokZuG15aIhvXF9468qKe2TyK9EgbySJhFFVcQJI',
    userId: '4f3de308-703f-4c82-89a4-8a8cabcd36f9',
    chatId: 'chat-a2f557d8-406f-438a-8535-a421c6bfe296',
  }
];

const GATEWAYS = [
  'http://172.25.136.210:8080/v1',
  'http://172.25.136.193:8080/v1'
];

// ============ PERSISTENT TOKEN STATE ============
function loadTokenState() {
  try {
    const state = JSON.parse(fs.readFileSync(TOKEN_STATE_FILE, 'utf-8'));
    // Reset if stale (older than 24h)
    if (Date.now() - state.lastReset > 86400000) {
      return resetTokenState();
    }
    return state;
  } catch {
    return resetTokenState();
  }
}

function resetTokenState() {
  const state = {
    lastReset: Date.now(),
    tokens: TOKENS.map(t => ({
      name: t.name,
      remainingDaily: 300,
      remainingUserDaily: 500,
      isExhausted: false,
      requestCount: 0,
      lastUsed: 0,
      totalUsed: 0
    })),
    globalLastRequest: 0,
    totalRequests: 0,
    totalErrors: 0,
    four29Timestamps: [] // Track 429 events for adaptive cooldown
  };
  fs.writeFileSync(TOKEN_STATE_FILE, JSON.stringify(state, null, 2));
  return state;
}

function saveTokenState(state) {
  fs.writeFileSync(TOKEN_STATE_FILE, JSON.stringify(state, null, 2));
}

function getHealthyToken(state) {
  // Find token with most remaining quota that hasn't been used recently
  const healthy = state.tokens.filter(t => !t.isExhausted && t.remainingDaily > 5);
  if (healthy.length === 0) return null;
  // Sort by: remaining desc, then lastUsed asc (pick least recently used)
  healthy.sort((a, b) => {
    if (b.remainingDaily !== a.remainingDaily) return b.remainingDaily - a.remainingDaily;
    return a.lastUsed - b.lastUsed;
  });
  return healthy[0];
}

function recordRequest(state, tokenName, responseHeaders, isError, is429) {
  const token = state.tokens.find(t => t.name === tokenName);
  if (!token) return;

  // Update from response headers
  if (responseHeaders) {
    const daily = parseInt(responseHeaders['x-ratelimit-remaining-daily'] || '0');
    const userDaily = parseInt(responseHeaders['x-ratelimit-user-daily-remaining'] || '0');
    if (!isNaN(daily)) token.remainingDaily = daily;
    if (!isNaN(userDaily)) token.remainingUserDaily = userDaily;
  }

  token.requestCount++;
  token.totalUsed++;
  token.lastUsed = Date.now();
  state.globalLastRequest = Date.now();
  state.totalRequests++;

  if (isError) state.totalErrors++;
  if (is429) {
    token.isExhausted = true;
    state.four29Timestamps.push(Date.now());
    // Keep only last 10
    if (state.four29Timestamps.length > 10) state.four29Timestamps = state.four29Timestamps.slice(-10);
  }

  saveTokenState(state);
}

// ============ ADAPTIVE COOLDOWN (learns from 429 patterns) ============
function getAdaptiveCooldown(state) {
  const now = Date.now();
  const recent429s = state.four29Timestamps.filter(t => now - t < 600000); // Last 10 min

  if (recent429s.length >= 3) return 30000;      // 3+ recent 429s → 30s cooldown
  if (recent429s.length >= 2) return 15000;      // 2 recent 429s → 15s cooldown
  if (recent429s.length >= 1) return 8000;       // 1 recent 429 → 8s cooldown
  return 3000;                                    // Normal → 3s cooldown
}

function getMinInterval(state) {
  const now = Date.now();
  const elapsed = now - state.globalLastRequest;
  const cooldown = getAdaptiveCooldown(state);
  return Math.max(0, cooldown - elapsed);
}

// ============ GLOBAL PROCESS LOCK ============
function acquireLock(argv) {
  const args = argv || process.argv.slice(2);
  fs.mkdirSync(STATE_DIR, { recursive: true });

  // Check for existing lock
  try {
    const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));

    // Check if process is still alive
    const age = Date.now() - lock.timestamp;
    if (age < 600000) { // Less than 10 min = still active
      try {
        // Check if PID is still running
        const result = execSync(`kill -0 ${lock.pid} 2>&1`, { encoding: 'utf-8' });
        // Process still alive
        return { locked: true, pid: lock.pid, campaign: lock.campaign, age: Math.round(age / 1000) };
      } catch {
        // PID not found → stale lock, remove it
        console.log(`  [GUARD] Stale lock detected (PID ${lock.pid} dead, age ${Math.round(age / 1000)}s). Cleaning up.`);
        fs.unlinkSync(LOCK_FILE);
      }
    } else {
      // Lock older than 10 min → stale (container killed it)
      console.log(`  [GUARD] Expired lock detected (age ${Math.round(age / 1000)}s). Cleaning up.`);
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {
    // No lock file → good
  }

  // Create new lock
  const campaignArg = args.find(a => !a.startsWith('--'));
  const lock = {
    pid: process.pid,
    timestamp: Date.now(),
    campaign: campaignArg || 'rotation'
  };
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2));
  return { locked: false, pid: lock.pid };
}

function releaseLock() {
  try {
    const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
    if (lock.pid === process.pid) {
      fs.unlinkSync(LOCK_FILE);
      console.log('  [GUARD] Lock released.');
    }
  } catch {}
}

// ============ PRE-FLIGHT API HEALTH CHECK ============
function preflightCheck(token, gateway) {
  return new Promise((resolve) => {
    const url = new URL(`${gateway}/chat/completions`);
    const body = JSON.stringify({
      messages: [{ role: 'user', content: 'OK' }],
      model: 'glm-4-flash',
      max_tokens: 5,
      temperature: 0,
      thinking: { type: 'disabled' }
    });
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer Z.ai',
      'X-Z-AI-From': 'Z',
      'X-Token': token.token,
      'X-User-Id': token.userId,
      'X-Chat-Id': token.chatId
    };

    const req = http.request({
      hostname: url.hostname, port: url.port || 80,
      path: url.pathname, method: 'POST',
      headers, timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode === 200,
          status: res.statusCode,
          remaining: parseInt(res.headers['x-ratelimit-remaining-daily'] || '0'),
          userRemaining: parseInt(res.headers['x-ratelimit-user-daily-remaining'] || '0'),
          headers: res.headers,
          body: data.slice(0, 100)
        });
      });
    });
    req.on('error', (e) => resolve({ ok: false, status: 'error', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

async function checkAPIHealth(state) {
  console.log('  [GUARD] Pre-flight API health check...');

  let healthyToken = null;
  let healthyGateway = null;
  let healthyCheck = null;

  // Try each token+gateway combo until we find a working one
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = getHealthyToken(state);
    if (!token) {
      console.log('  [GUARD] All tokens exhausted.');
      break;
    }

    const tokenConfig = TOKENS.find(t => t.name === token.name);
    const gateway = GATEWAYS[attempt % GATEWAYS.length];

    // Wait before checking
    if (attempt > 0) {
      const wait = getMinInterval(state) + 2000;
      console.log(`  [GUARD] Waiting ${Math.round(wait / 1000)}s before check ${attempt + 1}...`);
      await new Promise(r => setTimeout(r, wait));
    }

    const check = await preflightCheck(tokenConfig, gateway);

    if (check.ok) {
      healthyToken = token;
      healthyGateway = gateway;
      healthyCheck = check;
      console.log(`  [GUARD] ${token.name} via ${new URL(gateway).hostname}: OK (${check.remaining} daily remaining)`);
      break;
    } else if (check.status === 429) {
      recordRequest(state, token.name, null, true, true);
      console.log(`  [GUARD] ${token.name}: 429 Rate Limited. Marking exhausted.`);
    } else {
      recordRequest(state, token.name, null, true, false);
      console.log(`  [GUARD] ${token.name}: ${check.status} ${check.error || check.body || ''}`);
    }
  }

  // Save API health for debugging
  const apiHealth = {
    timestamp: new Date().toISOString(),
    healthy: !!healthyToken,
    token: healthyToken?.name,
    gateway: healthyGateway,
    remaining: healthyCheck?.remaining,
    tokenState: state.tokens.map(t => ({
      name: t.name,
      remainingDaily: t.remainingDaily,
      isExhausted: t.isExhausted,
      totalUsed: t.totalUsed
    }))
  };
  fs.writeFileSync(API_STATE_FILE, JSON.stringify(apiHealth, null, 2));

  return { ok: !!healthyToken, token: healthyToken, gateway: healthyGateway, state };
}

// ============ MINIMAL LEARNING (skip heavy stuff) ============
function shouldSkipLearning(state) {
  // Skip heavy learning if we've had recent 429s (save API budget)
  const recent429s = state.four29Timestamps.filter(t => Date.now() - t < 600000);
  return recent429s.length >= 1;
}

// ============ CAMPAIGN SCRAPER ============
function scrapeRallyPage(url) {
  return new Promise((resolve) => {
    console.log(`  [SCRAPER] Fetching: ${url}`);

    const gateways = ['http://172.25.136.210:8080/v1', 'http://172.25.136.193:8080/v1'];
    const token = TOKENS[4];

    const body = JSON.stringify({
      function_name: 'page_reader',
      arguments: { url }
    });
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer Z.ai',
      'X-Z-AI-From': 'Z',
      'X-Token': token.token,
      'X-User-Id': token.userId
    };

    let gwIdx = 0;
    function tryNextGateway() {
      if (gwIdx >= gateways.length) { resolve(null); return; }
      const gw = gateways[gwIdx++];
      const gwUrl = new URL(`${gw}/functions/invoke`);
      const req = http.request({
        hostname: gwUrl.hostname, port: gwUrl.port || 80,
        path: gwUrl.pathname, method: 'POST',
        headers, timeout: 30000
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          if (response.statusCode === 200) {
            try { resolve(JSON.parse(data)); }
            catch { tryNextGateway(); }
          } else {
            console.log(`  [SCRAPER] Gateway ${gwUrl.hostname} returned ${response.statusCode}`);
            tryNextGateway();
          }
        });
      });
      req.on('error', (e) => { console.log(`  [SCRAPER] Gateway ${gwUrl.hostname} error: ${e.message}`); tryNextGateway(); });
      req.on('timeout', () => { req.destroy(); console.log(`  [SCRAPER] Gateway ${gwUrl.hostname} timeout`); tryNextGateway(); });
      req.write(body);
      req.end();
    }
    tryNextGateway();
  });
}

async function fetchAndUpdateCampaign(campaignId) {
  const configPath = path.join(PROJECT_DIR, 'campaigns', `${campaignId}.json`);
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    console.error(`  [SCRAPER] Config not found: ${configPath}`);
    return false;
  }

  // Known Rally campaign URLs - try multiple patterns
  const campaignIdMap = {
    'campaign_3': 'fragments-btcjr-phase2',
    'marbmarket-m0': 'marbmarket-vedex-launch',
    'marbmarket-m1': 'marbmarket-marb-token'
  };

  const slug = campaignIdMap[campaignId] || campaignId;
  const urls = [
    `https://rally.onchain/campaign/${slug}`,
    `https://rally.onchain/campaign/${slug}`,
  ];

  console.log(`  [SCRAPER] Attempting to scrape Rally page for ${campaignId}...`);

  for (const url of urls) {
    const result = await scrapeRallyPage(url);
    if (!result) continue;

    const html = result.result?.html || result.data?.html || '';
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    if (text.length < 100) {
      console.log(`  [SCRAPER] Page too short (${text.length} chars), likely blocked or empty.`);
      continue;
    }

    console.log(`  [SCRAPER] Got ${text.length} chars from Rally page.`);

    // Extract key information using text analysis
    const scraped = {
      raw_text: text,
      scraped_at: new Date().toISOString(),
      url
    };

    // Save raw scraped data
    const scrapeFile = path.join(STATE_DIR, `${campaignId}_scraped.json`);
    fs.writeFileSync(scrapeFile, JSON.stringify(scraped, null, 2));
    console.log(`  [SCRAPER] Saved to ${scrapeFile}`);

    // Try to extract compliance requirements
    const extracted = extractRequirements(text);
    if (extracted.tags.length > 0 || extracted.links.length > 0) {
      console.log(`  [SCRAPER] Extracted requirements:`);
      console.log(`    Tags: ${extracted.tags.join(', ')}`);
      console.log(`    Links: ${extracted.links.join(', ')}`);
      console.log(`    Giveaway: ${extracted.giveaway || 'None found'}`);

      // Update config with extracted data
      config._rally_scraped = extracted;
      config._last_scraped = new Date().toISOString();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`  [SCRAPER] Updated config with scraped data.`);
    }

    return true;
  }

  console.log('  [SCRAPER] All URLs failed or returned empty content.');
  console.log('  [SCRAPER] NOTE: Rally pages may require auth. Manual update recommended.');
  return false;
}

function extractRequirements(text) {
  const result = { tags: [], links: [], giveaway: '', rules: [] };

  // Extract @mentions
  const tagRegex = /@[\w]+/g;
  const tags = text.match(tagRegex) || [];
  result.tags = [...new Set(tags)].filter(t =>
    t.toLowerCase().includes('fragment') ||
    t.toLowerCase().includes('rally') ||
    t.toLowerCase().includes('marb') ||
    t.toLowerCase().includes('ampleforth')
  );

  // Extract URLs
  const urlRegex = /https?:\/\/[^\s"<>]+/g;
  const urls = text.match(urlRegex) || [];
  result.links = [...new Set(urls)].filter(u =>
    u.includes('fragments.org') ||
    u.includes('rally.onchain') ||
    u.includes('marb.market')
  );

  // Extract giveaway info
  const giveawayPatterns = [
    /(\$\d[\d,]+)\s*(usdc|usdt|reward|prize)/gi,
    /(\d+)\s*(random|winner|signup|sign.up)/gi,
    /win\s+(a\s+)?(\$\d[\d,]+)/gi,
    /giveaway/gi,
  ];
  for (const pattern of giveawayPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.giveaway = match[0];
      break;
    }
  }

  return result;
}

// ============ STATUS DISPLAY ============
function showStatus() {
  const state = loadTokenState();
  let apiHealth = {};
  try { apiHealth = JSON.parse(fs.readFileSync(API_STATE_FILE, 'utf-8')); } catch {}

  console.log('========================================================');
  console.log('  RALLY GUARD STATUS');
  console.log('========================================================');
  console.log(`  Last reset: ${new Date(state.lastReset).toISOString()}`);
  console.log(`  Total requests: ${state.totalRequests}`);
  console.log(`  Total errors: ${state.totalErrors}`);
  console.log(`  Recent 429s (10min): ${state.four29Timestamps.filter(t => Date.now() - t < 600000).length}`);
  console.log(`  Adaptive cooldown: ${getAdaptiveCooldown(state) / 1000}s`);
  console.log('');

  console.log('  TOKEN STATUS:');
  for (const t of state.tokens) {
    const status = t.isExhausted ? 'EXHAUSTED' : (t.remainingDaily > 50 ? 'OK' : 'LOW');
    console.log(`    ${t.name}: ${t.remainingDaily}/300 daily | ${t.requestCount} requests | ${status}`);
  }

  const totalRemaining = state.tokens.reduce((s, t) => s + t.remainingDaily, 0);
  console.log(`\n  TOTAL REMAINING: ${totalRemaining}/1500`);
  console.log(`  ESTIMATED CYCLES LEFT: ${Math.floor(totalRemaining / 12)}`);

  // Lock status
  console.log('\n  LOCK STATUS:');
  try {
    const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
    const age = Math.round((Date.now() - lock.timestamp) / 1000);
    let alive = false;
    try { execSync(`kill -0 ${lock.pid} 2>&1`); alive = true; } catch {}
    console.log(`    PID: ${lock.pid} (${alive ? 'ALIVE' : 'DEAD'}) | Campaign: ${lock.campaign} | Age: ${age}s`);
  } catch {
    console.log('    No active lock.');
  }

  // API health
  if (apiHealth.timestamp) {
    console.log(`\n  LAST API CHECK: ${apiHealth.timestamp}`);
    console.log(`  Status: ${apiHealth.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    if (apiHealth.token) console.log(`  Working token: ${apiHealth.token} (${apiHealth.remaining} remaining)`);
  }

  console.log('========================================================');
}

// ============ MAIN ============
async function main() {
  const args = process.argv.slice(2);

  // --status: show current status
  if (args.includes('--status')) {
    showStatus();
    process.exit(0);
  }

  // --reset: clear lock + reset tokens
  if (args.includes('--reset')) {
    resetTokenState();
    try { fs.unlinkSync(LOCK_FILE); } catch {}
    console.log('  [GUARD] Lock cleared, token state reset.');
    process.exit(0);
  }

  // --preflight: only check API health
  if (args.includes('--preflight')) {
    const state = loadTokenState();
    const health = await checkAPIHealth(state);
    if (health.ok) {
      console.log(`  [GUARD] API HEALTHY - can proceed with ${health.token.name}`);
      process.exit(0);
    } else {
      console.log('  [GUARD] API UNHEALTHY - all tokens exhausted or failing');
      console.log('  [GUARD] Waiting 5 min before next attempt recommended.');
      process.exit(1);
    }
  }

  // --scrape <campaign>: fetch Rally page
  if (args.includes('--scrape')) {
    const campaignId = args.find(a => a !== '--scrape' && !a.startsWith('--'));
    if (!campaignId) {
      console.error('Usage: node rally-guard.js --scrape <campaign_id>');
      process.exit(1);
    }
    await fetchAndUpdateCampaign(campaignId);
    process.exit(0);
  }

  // DEFAULT: Safe campaign execution
  const specificCampaign = args.find(a => !a.startsWith('--'));

  // Step 1: Acquire global lock (prevent overlapping)
  console.log('========================================================');
  console.log('  RALLY GUARD v1.0 - Safe Campaign Runner');
  console.log('========================================================');
  const lockResult = acquireLock();
  if (lockResult.locked) {
    console.log(`  [GUARD] BLOCKED: Process PID ${lockResult.pid} already running (${lockResult.campaign}, ${lockResult.age}s ago)`);
    console.log('  [GUARD] Skipping this cycle to prevent API exhaustion.');
    process.exit(0);
  }
  console.log(`  [GUARD] Lock acquired (PID ${lockResult.pid})`);

  // Step 2: Check API health
  const state = loadTokenState();

  // If we had recent 429s, apply mandatory cooldown
  const recent429s = state.four29Timestamps.filter(t => Date.now() - t < 600000);
  if (recent429s.length >= 3) {
    const oldest429 = Math.min(...recent429s);
    const cooldownRemaining = Math.max(0, 300000 - (Date.now() - oldest429));
    if (cooldownRemaining > 0) {
      console.log(`  [GUARD] COOLDOWN: ${recent429s.length} recent 429s. Need ${Math.round(cooldownRemaining / 1000)}s more cooldown.`);
      releaseLock();
      process.exit(0);
    }
  }

  const health = await checkAPIHealth(state);
  if (!health.ok) {
    console.log('  [GUARD] ABORT: No healthy API tokens available.');
    console.log('  [GUARD] Token state saved. Will retry next cycle.');
    releaseLock();
    process.exit(1);
  }

  // Step 3: Determine which campaign to run
  let campaignId = specificCampaign;
  if (!campaignId) {
    // Rotation mode - pick next campaign
    let rotationState = {};
    try { rotationState = JSON.parse(fs.readFileSync(path.join(STATE_DIR, 'rotation_state.json'), 'utf-8')); } catch {}
    const campaigns = fs.readdirSync(path.join(PROJECT_DIR, 'campaigns')).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    const lastIdx = rotationState.last_campaign ? campaigns.indexOf(rotationState.last_campaign) : -1;
    campaignId = campaigns[(lastIdx + 1) % campaigns.length];
    console.log(`  [GUARD] Rotation: next campaign = ${campaignId}`);
  }

  // Step 4: Run generate.js with minimal learning
  console.log(`  [GUARD] Starting ${campaignId} via self_heal.js v4.0...`);
  console.log(`  [GUARD] Adaptive cooldown: ${getAdaptiveCooldown(state) / 1000}s`);

  const skipLearning = shouldSkipLearning(state);
  if (skipLearning) {
    console.log('  [GUARD] Minimal learning mode (recent 429s detected)');
  }

  // Run self_heal.js v4.0 (autonomous healing engine) as child process
  const healScript = path.join(PROJECT_DIR, 'self_heal.js');
  const env = { ...process.env };
  if (skipLearning) env.RALLY_MINIMAL_LEARNING = '1';

  return new Promise((resolve) => {
    const child = spawn('node', [healScript, '--campaign', campaignId], {
      cwd: PROJECT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      timeout: 300000 // 5 min max (generous for container)
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

    child.on('error', (err) => {
      console.error(`  [GUARD] Process error: ${err.message}`);
      releaseLock();
      resolve();
    });

    child.on('close', (code, signal) => {
      if (signal) {
        console.log(`\n  [GUARD] Process killed by signal ${signal} (container limit).`);
      } else if (code !== 0) {
        console.log(`\n  [GUARD] Process exited with code ${code}.`);
      } else {
        console.log(`\n  [GUARD] Process completed successfully.`);
      }

      // Update rotation state on success
      if (code === 0) {
        try {
          const rotState = JSON.parse(fs.readFileSync(path.join(STATE_DIR, 'rotation_state.json'), 'utf-8'));
          rotState.last_campaign = campaignId;
          rotState.last_run = new Date().toISOString();
          rotState.cycle_count = (rotState.cycle_count || 0) + 1;
          fs.writeFileSync(path.join(STATE_DIR, 'rotation_state.json'), JSON.stringify(rotState, null, 2));
        } catch {}
      }

      releaseLock();
      resolve();
    });

    // Safety timeout
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
        console.log('  [GUARD] Safety timeout reached (5 min).');
      }
    }, 310000);
  });
}

main().catch(err => {
  console.error('[GUARD] Fatal error:', err.message);
  releaseLock();
  process.exit(1);
});
