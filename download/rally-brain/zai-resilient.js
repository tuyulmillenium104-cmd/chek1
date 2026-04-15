/**
 * ============================================================
 * Z-AI RESILIENT CLIENT v2.0 - Token Rotation + Rate Limiting
 * ============================================================
 *
 * UPGRADED from v1.0:
 *   + Persistent token state (syncs with rally-guard.js)
 *   + Adaptive cooldown (learns from 429 patterns)
 *   + No more blind resets - respects real quota limits
 *
 * KEY FEATURES:
 * 1. Token Rotation - 5 tokens x 300/day = 1,500 daily quota
 * 2. Quota Tracking - ACCURATE from response headers + persistent file
 * 3. Rate Limiting - Adaptive interval (3s-30s based on 429 history)
 * 4. Auto Retry - Exponential backoff on failure (3x)
 * 5. SDK-compatible interface for drop-in replacement
 *
 * ============================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TOKEN_STATE_FILE = path.join('/home/z/my-project/download/rally-brain/campaign_data', '.token_state.json');

// ============ CONFIGURATION ============
const CONFIG = {
  gateways: [
    'http://172.25.136.210:8080/v1',
    'http://172.25.136.193:8080/v1'
  ],

  // Token pool - each token has 300 daily quota SEPARATELY
  // To add a new token: copy any block, change name/token/userId/chatId/priority
  // Each token = +300 daily quota = +25 cycles/day (12 calls/cycle)
  tokens: [
    {
      name: 'TOKEN_1',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtOWJiMzAzOTMtYWE3Mi00Y2QzLWJkNzktYzJkZmI0ODVmNzgyIn0.jb35oqGKPB2FLC-X_mozORmvbBilwRc_pSZEkbyaRfw',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      chatId: 'chat-9bb30393-aa72-4cd3-bd79-c2dfb485f782',
      priority: 1,
      remainingDaily: 300,
      remainingUserDaily: 500,
      requestCount: 0,
      isExhausted: false
    },
    {
      name: 'TOKEN_2',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMWNkY2Y1NzktYzZlNS00ZWY3LTgyZDUtZDg2OWQ4Yzg1YTVlIiwiY2hhdF9pZCI6ImNoYXQtMDQ4YTVhODItZWRhMi00ZTQ0LTk4YWEtZmM5YTk0Y2UyNWZmIn0.asZolcXMp4kvy_2UqeA4BHvYx0gAsw7mNgNrRXKJrtw',
      userId: '1cdcf579-c6e5-4ef7-82d5-d869d8c85a5e',
      chatId: 'chat-048a5a82-eda2-4e44-98aa-fc9a94ce25ff',
      priority: 2,
      remainingDaily: 300,
      remainingUserDaily: 500,
      requestCount: 0,
      isExhausted: false
    },
    {
      name: 'TOKEN_3',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtNTQ5ZmI5MTEtZWM0NS00NGJiLTg5YjEtMWY2MTljNTEzN2QzIn0.M6IQTOXasSbEw98a4R6p3LEPwJPCWyRZiJSUo8lr2PM',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      chatId: 'chat-549fb911-ec45-44bb-89b1-1f619c5137d3',
      priority: 3,
      remainingDaily: 300,
      remainingUserDaily: 500,
      requestCount: 0,
      isExhausted: false
    },
    {
      name: 'TOKEN_4',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtYmJlNzk2ZjItOTM1Yy00NTY5LTk3YjYtZjFiNTA4N2IxOTQ2IiwicGxhdGZvcm0iOiIifQ.KKYhRmTOx_dfMSYygKLVsJuXiJq7u_8t4JfzZHGQpQs',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      chatId: 'chat-bbe796f2-935c-4569-97b6-f1b5087b1946',
      priority: 4,
      remainingDaily: 300,
      remainingUserDaily: 500,
      requestCount: 0,
      isExhausted: false
    },
    {
      name: 'TOKEN_5_AUTO',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNGYzZGUzMDgtNzAzZi00YzgyLTg5YTQtOGE4Y2FiY2QzNmY5IiwiY2hhdF9pZCI6ImNoYXQtYTJmNTU3ZDgtNDA2Zi00MzhhLTg1MzUtYTQyMWM2YmZlMjk2IiwicGxhdGZvcm0iOiJ6YWkifQ.dIzeokZuG15aIhvXF9468qKe2TyK9EgbySJhFFVcQJI',
      userId: '4f3de308-703f-4c82-89a4-8a8cabcd36f9',
      chatId: 'chat-a2f557d8-406f-438a-8535-a421c6bfe296',
      priority: 5,
      remainingDaily: 300,
      remainingUserDaily: 500,
      requestCount: 0,
      isExhausted: false
    }
  ],

  rateLimit: {
    qps: 1,
    minInterval: 3000, // 3 seconds base (safer default)
  },

  ipRateLimit: {
    window: 600000, // 10 minutes
    max: 10,
  },

  retry: {
    maxRetries: 3,
    baseDelay: 10000,
    maxDelay: 60000
  }
};

// ============ PERSISTENT STATE SYNC ============
function loadPersistedState() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_STATE_FILE, 'utf-8'));
  } catch { return null; }
}

function savePersistedState(state) {
  try {
    fs.writeFileSync(TOKEN_STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

// Sync token state from persistent file (set by rally-guard.js)
function syncFromPersistedState() {
  const persisted = loadPersistedState();
  if (!persisted || !persisted.tokens) return;
  for (const pt of persisted.tokens) {
    const local = CONFIG.tokens.find(t => t.name === pt.name);
    if (local) {
      local.remainingDaily = pt.remainingDaily || 0;
      local.remainingUserDaily = pt.remainingUserDaily || 0;
      local.isExhausted = pt.isExhausted || false;
      local.requestCount = pt.requestCount || 0;
    }
  }
}

// Get adaptive cooldown from 429 history
function getAdaptiveCooldown() {
  const persisted = loadPersistedState();
  if (!persisted || !persisted.four29Timestamps) return CONFIG.rateLimit.minInterval;
  const now = Date.now();
  const recent429s = persisted.four29Timestamps.filter(t => now - t < 600000);
  if (recent429s.length >= 3) return 30000;
  if (recent429s.length >= 2) return 15000;
  if (recent429s.length >= 1) return 8000;
  return CONFIG.rateLimit.minInterval;
}

// ============ RATE LIMITER ============
class RateLimiter {
  constructor() {
    this.requestTimes = [];
  }

  async waitForSlot() {
    const interval = getAdaptiveCooldown();
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(t => now - t < interval);

    if (this.requestTimes.length >= 1) {
      const oldest = Math.min(...this.requestTimes);
      const wait = interval - (now - oldest) + 100;
      if (wait > 0) {
        await new Promise(r => setTimeout(r, wait));
      }
    }
    this.requestTimes.push(Date.now());
  }
}

// ============ RESILIENT Z-AI CLIENT ============
class ResilientZAIClient {
  constructor() {
    this.rateLimiter = new RateLimiter();
    this.gatewayIndex = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;
    // Sync persistent state on init (respects rally-guard.js tracking)
    syncFromPersistedState();
  }

  getBestToken() {
    // Re-sync from persistent state before picking token
    syncFromPersistedState();
    const available = CONFIG.tokens.filter(t => !t.isExhausted && t.remainingDaily > 3);
    if (available.length === 0) {
      // DO NOT blindly reset - check persisted state first
      const persisted = loadPersistedState();
      const anyHealthy = persisted?.tokens?.find(t => !t.isExhausted && t.remainingDaily > 3);
      if (!anyHealthy) {
        console.log('    [Client] ALL TOKENS TRULY EXHAUSTED - aborting to prevent 429 loop');
        return null;
      }
      // If persisted says healthy but local says exhausted, sync
      syncFromPersistedState();
      const resynced = CONFIG.tokens.filter(t => !t.isExhausted && t.remainingDaily > 3);
      if (resynced.length === 0) {
        console.log('    [Client] All tokens exhausted. Waiting for quota reset.');
        return null;
      }
      return resynced.sort((a, b) => b.remainingDaily - a.remainingDaily)[0];
    }
    return available.sort((a, b) => b.remainingDaily - a.remainingDaily)[0];
  }

  updateTokenStats(token, headers, is429 = false) {
    const daily = parseInt(headers['x-ratelimit-remaining-daily'] || '0');
    const userDaily = parseInt(headers['x-ratelimit-user-daily-remaining'] || '0');
    token.remainingDaily = isNaN(daily) ? token.remainingDaily : daily;
    token.remainingUserDaily = isNaN(userDaily) ? token.remainingUserDaily : userDaily;
    token.requestCount++;
    if (is429) {
      token.isExhausted = true;
      console.log(`    [Client] ${token.name} got 429 - marked EXHAUSTED`);
    } else if (daily > 0 && daily < 5) {
      token.isExhausted = true;
      console.log(`    [Client] ${token.name} near exhaustion (${daily} remaining)`);
    }
    this.totalRequests++;
    // Sync to persistent file
    this.syncToPersistent(token);
  }

  syncToPersistent(changedToken) {
    const persisted = loadPersistedState();
    if (!persisted || !persisted.tokens) return;
    const pt = persisted.tokens.find(t => t.name === changedToken.name);
    if (pt) {
      pt.remainingDaily = changedToken.remainingDaily;
      pt.remainingUserDaily = changedToken.remainingUserDaily;
      pt.isExhausted = changedToken.isExhausted;
      pt.requestCount = changedToken.requestCount;
      pt.lastUsed = Date.now();
      pt.totalUsed = (pt.totalUsed || 0) + 1;
    }
    persisted.globalLastRequest = Date.now();
    persisted.totalRequests = (persisted.totalRequests || 0) + 1;
    savePersistedState(persisted);
  }

  getGateway() {
    const gateway = CONFIG.gateways[this.gatewayIndex];
    this.gatewayIndex = (this.gatewayIndex + 1) % CONFIG.gateways.length;
    return gateway;
  }

  makeRequest(gateway, token, messages, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${gateway}/chat/completions`);
      const body = JSON.stringify({
        messages,
        model: options.model || 'glm-4-flash',
        max_tokens: options.maxTokens || options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
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
      const req = http.request({ hostname: url.hostname, port: url.port || 80, path: url.pathname, method: 'POST', headers, timeout: 60000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          this.updateTokenStats(token, res.headers);
          if (res.statusCode === 200) { try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`JSON parse: ${e.message}`)); } }
          else if (res.statusCode === 429) {
            this.updateTokenStats(token, res.headers, true);
            this.totalErrors++;
            // Record 429 in persistent state
            const persisted = loadPersistedState();
            if (persisted) {
              persisted.four29Timestamps = persisted.four29Timestamps || [];
              persisted.four29Timestamps.push(Date.now());
              if (persisted.four29Timestamps.length > 20) persisted.four29Timestamps = persisted.four29Timestamps.slice(-20);
              persisted.totalErrors = (persisted.totalErrors || 0) + 1;
              savePersistedState(persisted);
            }
            reject(new Error('RATE_LIMITED_429'));
          }
          else { this.totalErrors++; reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`)); }
        });
      });
      req.on('error', (e) => { this.totalErrors++; reject(new Error(`Request error: ${e.message}`)); });
      req.on('timeout', () => { req.destroy(); this.totalErrors++; reject(new Error('Timeout')); });
      req.write(body);
      req.end();
    });
  }

  async chat(messages, options = {}) {
    let lastError = null;
    for (let attempt = 0; attempt < CONFIG.retry.maxRetries; attempt++) {
      try {
        await this.rateLimiter.waitForSlot();
        const token = this.getBestToken();
        if (!token) {
          throw new Error('ALL_TOKENS_EXHAUSTED');
        }
        const gateway = this.getGateway();
        const result = await this.makeRequest(gateway, token, messages, options);
        this.totalRequests++;
        return result;
      } catch (error) {
        lastError = error;
        const errMsg = error.message?.toString() || '';
        if (errMsg.includes('ALL_TOKENS_EXHAUSTED')) {
          console.log('    [ZAI] All tokens exhausted. Cannot proceed.');
          throw error; // Fatal - don't retry
        }
        if (errMsg.includes('429') || errMsg.includes('RATE_LIMITED')) {
          const cooldown = getAdaptiveCooldown();
          console.log(`    [ZAI] Token rate limited, rotating (attempt ${attempt + 1}/${CONFIG.retry.maxRetries}), cooldown: ${cooldown/1000}s`);
          await new Promise(r => setTimeout(r, cooldown));
          continue;
        }
        this.totalErrors++;
        const delay = Math.min(CONFIG.retry.baseDelay * Math.pow(2, attempt), CONFIG.retry.maxDelay);
        console.log(`    [ZAI] Error: ${errMsg.slice(0, 80)}, retrying in ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError || new Error('All retry attempts failed');
  }

  async webSearch(query, num = 10) {
    await this.rateLimiter.waitForSlot();
    const token = this.getBestToken();
    const gateway = this.getGateway();
    return new Promise((resolve, reject) => {
      const url = new URL(`${gateway}/functions/invoke`);
      const body = JSON.stringify({ function_name: 'web_search', arguments: { query, num } });
      const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer Z.ai', 'X-Z-AI-From': 'Z', 'X-Token': token.token };
      const req = http.request({ hostname: url.hostname, port: url.port || 80, path: url.pathname, method: 'POST', headers, timeout: 60000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => { this.updateTokenStats(token, res.headers); if (res.statusCode === 200) { try { resolve(JSON.parse(data).result); } catch (e) { reject(new Error(`JSON: ${e.message}`)); } } else { reject(new Error(`HTTP ${res.statusCode}`)); } });
      });
      req.on('error', reject); req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(body); req.end();
    });
  }

  getStatus() {
    return {
      tokens: CONFIG.tokens.map(t => ({ name: t.name, remainingDaily: t.remainingDaily, remainingUserDaily: t.remainingUserDaily, requestCount: t.requestCount, isExhausted: t.isExhausted })),
      totalRemaining: CONFIG.tokens.reduce((s, t) => s + t.remainingDaily, 0),
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      gateways: CONFIG.gateways
    };
  }
}

module.exports = { ResilientZAIClient, CONFIG };
