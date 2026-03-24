/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RALLY WORKFLOW V9.9.0 - PARALLEL PROCESSING WITH SMART TOKEN POOL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🚀 NEW FEATURES:
 * ✅ PARALLEL Content Generation (multiple contents at once)
 * ✅ PARALLEL Judging (immediately when content is ready)
 * ✅ SMART Token Pool with Locking System
 * ✅ Auto Token Switching when busy or rate limited
 * ✅ 3 AI Judges + Fail Fast + Highest Score Selection
 * ✅ HTTP-Only Mode (Direct HTTP to Gateway)
 * ✅ Real-time Quota Tracking
 * 
 * 🔄 WORKFLOW:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  PARALLEL GENERATE: Account 1, 2, 3 create content simultaneously│
 * │       ↓              ↓              ↓                          │
 * │   Content 1      Content 2      Content 3                      │
 * │   (selesai)      (selesai)      (selesai)                      │
 * │       ↓              ↓              ↓                          │
 * │   Judge 1         Judge 1        Judge 1                       │
 * │   (Token A)       (Token B)      (Token C)                     │
 * │       ↓              ↓              ↓                          │
 * │   Judge 2         Judge 2        Judge 2                       │
 * │   (Token D)       (Token E)      (Token A - released)          │
 * │       ↓              ↓              ↓                          │
 * │   Judge 3         Judge 3        Judge 3                       │
 * │       ↓              ↓              ↓                          │
 * │   SAVE + SCORE    SAVE + SCORE   SAVE + SCORE                  │
 * └─────────────────────────────────────────────────────────────────┘
 *                              ↓
 *                    PERINGKAT (Highest Score)
 *                              ↓
 *                       OUTPUT TERBAIK
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================================
// GATEWAY CONFIGURATION - HTTP-Only Mode
// ============================================================================

const GATEWAY_CONFIG = {
  endpoints: [
    'http://172.25.136.210:8080/v1',
    'http://172.25.136.193:8080/v1'
  ],
  currentIndex: 0
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  version: '9.9.0-parallel',
  
  // API endpoints
  baseUrl: 'https://app.rally.fun',
  
  // Gateway for HTTP-Only mode
  gateway: GATEWAY_CONFIG,
  
  // Parallel settings
  parallel: {
    maxConcurrentGenerate: 3,    // Generate 3 contents at once
    maxConcurrentJudges: 5,      // Max 5 judges running in parallel
    judgeTimeout: 60000          // 60 second timeout per judge
  },
  
  // Rate Limiter
  rateLimiter: {
    maxQPS: 5,           // 5 requests per second
    enabled: true
  },
  
  // 11 Tokens for rate limit handling
  tokens: [
    null, // Auto from .z-ai-config (Primary)
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtNTQ5ZmI5MTEtZWM0NS00NGJiLTg5YjEtMWY2MTljNTEzN2QzIn0.M6IQTOXasSbEw98a4R6p3LEPwJPCWyRZiJSUo8lr2PM',
      chatId: 'chat-549fb911-ec45-44bb-89b1-1f619c5137d3',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #1',
      isBackup: false
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtMTAyYTlkMGUtYTVkNy00MmY2LTk3ZjctNDk5NzFiNzcwNjVhIn0.6cDfQbTc2HHdtKXBfaUvpBsNLPbbjYkpJp6br0rYteA',
      chatId: 'chat-102a9d0e-a5d7-42f6-97f7-49971b77065a',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      label: 'Akun B #1',
      isBackup: false
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtMDAyOWJjNDYtZGI3Ny00ZmZkLWI4ZDItM2RlYzFlNWVkNDU3In0.CMthZytUFBpnqW3K52Q1AAgB9uvhyXf3AG-FQvaDoYI',
      chatId: 'chat-0029bc46-db77-4ffd-b8d2-3dec1e5ed457',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #2',
      isBackup: false
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtOTZlZTk1NmItMGYxMi00MGUxLWE0MzYtYTk4YmQwZjk0YzJhIn0.PgpMEiUr8a6Cu2vl9zFMggRsxQrx3JwkUCOjZCUIJnw',
      chatId: 'chat-96ee956b-0f12-40e1-a436-a98bd0f94c2a',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      label: 'Akun B #2',
      isBackup: false
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtOWJiMzAzOTMtYWE3Mi00Y2QzLWJkNzktYzJkZmI0ODVmNzgyIn0.jb35oqGKPB2FLC-X_mozORmvbBilwRc_pSZEkbyaRfw',
      chatId: 'chat-9bb30393-aa72-4cd3-bd79-c2dfb485f782',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #3',
      isBackup: true
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtYjBiMmFhMmUtZTg5My00NGMwLWEzMTktNTZlYTk0YzRkOTQxIn0.GQLbTpxXn-gcONVhEYr6Ozq7sTOdE5NJt5wIiGfVTQM',
      chatId: 'chat-b0b2aa2e-e893-44c0-a319-56ea94c4d941',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      label: 'Akun B #3',
      isBackup: true
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtZDE3ZGY4ODQtZGNlOC00MmU3LWEzMTctMDQzYjI0YmM3MjdmIn0.W8UQmOxVIqGsAicZc9n4r4jR3IVM5Yj9V-SWv8H_0ac',
      chatId: 'chat-d17df884-dce8-42e7-a317-043b24bc727f',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #4',
      isBackup: true
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtYzAwMTI0YWQtODk2Yy00NzBiLWE0OTYtOGFlNTYzMTQ0YTUwIn0.a0UXyTQ3z4D0g0mzHbVLpBMMN6cftW1W_-ELiObLqXY',
      chatId: 'chat-c00124ad-896c-470b-a496-8ae563144a50',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun C #1',
      isBackup: true
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtNTRjOTZlMTQtNzMyYy00NjA1LWIyZTQtNWU3NzI1MjlhNTQ3In0.VzXhIi9TLBZ_7H0c5pRP9AL7HSCaL3RwO7-j_dqH4FY',
      chatId: 'chat-54c96e14-732c-4605-b2e4-5e772529a547',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      label: 'Akun D #1',
      isBackup: true
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtYWYxZDE3YWQtZDI1NC00YmFkLWI5ZmMtN2YyOTIwOTExNjExIn0.xG3YxW5PNy_LJrO9JfPgPFv3U0f_46IY4NqxYTZfqIo',
      chatId: 'chat-af1d17ad-d254-4bad-b9fc-7f2920911611',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun E #1',
      isBackup: true
    }
  ],
  
  // Thresholds for 3 Judges
  thresholds: {
    gate1: { max: 20, pass: 14 },
    judge2: { max: 5, pass: 4 },
    judge3: { max: 80, pass: 70 },
    total: { max: 105, pass: 88 }
  },
  
  maxRegenerateCycles: 5,
  contentsPerCycle: 3,  // Reduced to 3 for parallel processing
  delays: {
    betweenJudges: 500,      // Minimal delay (parallel handles this)
    betweenContents: 0,      // No delay needed (parallel)
    beforeRegenerate: 2000,
    rateLimitWait: 5000
  },
  
  outputDir: '/home/z/my-project/download'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg, indent = 0) {
  console.log('   '.repeat(indent) + msg);
}

function timestamp() {
  return new Date().toISOString().split('T')[1].split('.')[0];
}

// ============================================================================
// SMART TOKEN POOL - With Locking System for Parallel Processing
// ============================================================================

class SmartTokenPool {
  constructor(config) {
    this.rawTokens = config.tokens || [null];
    this.tokenStats = [];
    this.lockedTokens = new Map(); // tokenIndex -> { lockedAt, taskId, purpose }
    this.initializeTokens();
    this.loadAutoConfig();
  }
  
  initializeTokens() {
    this.tokenStats = this.rawTokens.map((t, idx) => ({
      index: idx,
      token: t,
      remainingDaily: 300,
      remainingUserDaily: 500,
      requestCount: 0,
      lastUsed: 0,
      isExhausted: false,
      label: t?.label || `Token #${idx}`,
      isBackup: t?.isBackup || false,
      lockCount: 0
    }));
  }
  
  loadAutoConfig() {
    try {
      const configPath = '/etc/.z-ai-config';
      if (fs.existsSync(configPath)) {
        const autoConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.tokenStats[0].token = {
          token: autoConfig.token,
          chatId: autoConfig.chatId,
          userId: autoConfig.userId,
          label: 'Auto-Config',
          isBackup: false
        };
        console.log('   ✅ Auto-token loaded from /etc/.z-ai-config');
      }
    } catch (e) {
      console.log('   ⚠️ Could not load auto-config');
    }
  }
  
  /**
   * Acquire a token for a specific task
   * Returns { tokenStats, release function }
   */
  async acquireToken(taskId, purpose = 'unknown', timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Find best available token
      const available = this.tokenStats.filter(t => 
        !t.isExhausted && 
        t.token !== null && 
        !this.lockedTokens.has(t.index)
      );
      
      if (available.length > 0) {
        // Sort: prefer primary, then highest quota
        available.sort((a, b) => {
          if (a.isBackup !== b.isBackup) return a.isBackup ? 1 : -1;
          return b.remainingDaily - a.remainingDaily;
        });
        
        const selected = available[0];
        
        // Lock the token
        this.lockedTokens.set(selected.index, {
          lockedAt: Date.now(),
          taskId,
          purpose
        });
        selected.lockCount++;
        
        console.log(`   🔒 [${timestamp()}] Token ${selected.label} ACQUIRED by ${taskId} (${purpose})`);
        
        // Return token with release function
        return {
          tokenStats: selected,
          release: () => this.releaseToken(selected.index, taskId)
        };
      }
      
      // No token available, wait and retry
      console.log(`   ⏳ [${timestamp()}] No token available for ${taskId}, waiting...`);
      await delay(500);
    }
    
    throw new Error(`Token acquisition timeout for ${taskId}`);
  }
  
  /**
   * Release a locked token
   */
  releaseToken(tokenIndex, taskId) {
    const lock = this.lockedTokens.get(tokenIndex);
    if (lock && lock.taskId === taskId) {
      this.lockedTokens.delete(tokenIndex);
      const stats = this.tokenStats[tokenIndex];
      console.log(`   🔓 [${timestamp()}] Token ${stats?.label} RELEASED by ${taskId}`);
    }
  }
  
  /**
   * Get any available token (non-locking, for simple operations)
   */
  getAvailableToken() {
    const available = this.tokenStats.filter(t => 
      !t.isExhausted && 
      t.token !== null && 
      !this.lockedTokens.has(t.index)
    );
    
    if (available.length === 0) {
      // All locked or exhausted, reset exhausted
      this.tokenStats.forEach(t => {
        if (t.isExhausted) t.isExhausted = false;
      });
      return this.tokenStats.find(t => t.token !== null);
    }
    
    available.sort((a, b) => {
      if (a.isBackup !== b.isBackup) return a.isBackup ? 1 : -1;
      return b.remainingDaily - a.remainingDaily;
    });
    
    return available[0];
  }
  
  updateTokenStats(tokenIndex, headers) {
    const stats = this.tokenStats[tokenIndex];
    if (!stats || !headers) return;
    
    const dailyRemaining = parseInt(headers['x-ratelimit-remaining-daily'] || '300');
    const userDailyRemaining = parseInt(headers['x-ratelimit-user-daily-remaining'] || '500');
    
    stats.remainingDaily = dailyRemaining;
    stats.remainingUserDaily = userDailyRemaining;
    stats.requestCount++;
    stats.lastUsed = Date.now();
    
    if (dailyRemaining < 10) {
      stats.isExhausted = true;
      console.log(`   ⚠️ Token ${stats.label} nearly exhausted (${dailyRemaining} remaining)`);
    }
  }
  
  markTokenExhausted(tokenIndex) {
    const stats = this.tokenStats[tokenIndex];
    if (stats) {
      stats.isExhausted = true;
      // Release if locked
      this.lockedTokens.delete(tokenIndex);
    }
  }
  
  getStats() {
    const total = this.tokenStats.length;
    const locked = this.lockedTokens.size;
    const exhausted = this.tokenStats.filter(t => t.isExhausted).length;
    const available = total - locked - exhausted;
    
    return { total, locked, exhausted, available };
  }
  
  displayStatus() {
    const stats = this.getStats();
    
    console.log('\n   ╔════════════════════════════════════════════════════════════╗');
    console.log('   ║      🚀 SMART TOKEN POOL v9.9.0 - PARALLEL MODE           ║');
    console.log('   ╠════════════════════════════════════════════════════════════╣');
    console.log(`   ║  📊 Total: ${stats.total} | 🔒 Locked: ${stats.locked} | ✅ Available: ${stats.available}        ║`);
    console.log('   ╠════════════════════════════════════════════════════════════╣');
    
    this.tokenStats.forEach((t, idx) => {
      const isLocked = this.lockedTokens.has(idx);
      const lockInfo = isLocked ? ` 🔒 ${this.lockedTokens.get(idx).purpose.substring(0, 15)}` : '';
      const marker = t.isBackup ? '◇' : '▶';
      const status = t.isExhausted ? '❌ EXHAUSTED' : (isLocked ? '🔒 LOCKED' : (t.isBackup ? '[Backup]' : '[Primary]'));
      const label = (t.label || `Token #${idx}`).padEnd(16);
      console.log(`   ║ ${marker} #${idx.toString().padStart(2)}: ${label} ${status}${lockInfo}║`);
    });
    
    console.log('   ╚════════════════════════════════════════════════════════════╝');
  }
}

// ============================================================================
// RATE LIMITER - QPS Control
// ============================================================================

class RateLimiter {
  constructor(maxQPS = 5) {
    this.maxQPS = maxQPS;
    this.minInterval = 1000 / maxQPS;
    this.lastRequestTime = 0;
    this.queue = [];
  }
  
  async waitForSlot() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    if (elapsed < this.minInterval) {
      const waitTime = this.minInterval - elapsed;
      await delay(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }
}

// ============================================================================
// JUDGE QUEUE - For Parallel Judge Management
// ============================================================================

class JudgeQueue {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.activeJudges = new Map(); // judgeId -> { contentIndex, judgeType, startTime }
    this.queue = [];
    this.completed = [];
  }
  
  canStartJudge() {
    return this.activeJudges.size < this.maxConcurrent;
  }
  
  startJudge(judgeId, contentIndex, judgeType) {
    this.activeJudges.set(judgeId, {
      contentIndex,
      judgeType,
      startTime: Date.now()
    });
    console.log(`   ⚖️ [${timestamp()}] Judge ${judgeType} started for content ${contentIndex + 1}`);
  }
  
  completeJudge(judgeId, result) {
    const judge = this.activeJudges.get(judgeId);
    if (judge) {
      const duration = Date.now() - judge.startTime;
      this.activeJudges.delete(judgeId);
      this.completed.push({
        judgeId,
        ...judge,
        result,
        duration
      });
      console.log(`   ✅ [${timestamp()}] Judge ${judge.judgeType} completed for content ${judge.contentIndex + 1} (${duration}ms)`);
    }
  }
  
  getStats() {
    return {
      active: this.activeJudges.size,
      queued: this.queue.length,
      completed: this.completed.length
    };
  }
}

// Global instances
let smartTokenPool = null;
let rateLimiter = null;
let judgeQueue = null;

function getSmartTokenPool() {
  if (!smartTokenPool) {
    smartTokenPool = new SmartTokenPool(CONFIG);
  }
  return smartTokenPool;
}

function getRateLimiter() {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter(CONFIG.rateLimiter.maxQPS);
  }
  return rateLimiter;
}

function getJudgeQueue() {
  if (!judgeQueue) {
    judgeQueue = new JudgeQueue(CONFIG.parallel.maxConcurrentJudges);
  }
  return judgeQueue;
}

// ============================================================================
// HTTP-ONLY AI CALL - With Token Acquisition
// ============================================================================

async function callAIviaHTTP(messages, options = {}, acquiredToken = null) {
  const rl = getRateLimiter();
  await rl.waitForSlot();
  
  let tokenRelease = null;
  let tokenStats = acquiredToken?.tokenStats;
  
  // If no token provided, acquire one
  if (!tokenStats) {
    const pool = getSmartTokenPool();
    const acquired = await pool.acquireToken(
      `api-call-${Date.now()}`,
      options.purpose || 'api-call'
    );
    tokenStats = acquired.tokenStats;
    tokenRelease = acquired.release;
  }
  
  if (!tokenStats || !tokenStats.token) {
    throw new Error('No tokens available');
  }
  
  const tokenData = tokenStats.token;
  const tokenIndex = tokenStats.index;
  const pool = getSmartTokenPool();
  
  // Select gateway (round-robin)
  const gateway = GATEWAY_CONFIG.endpoints[GATEWAY_CONFIG.currentIndex];
  GATEWAY_CONFIG.currentIndex = (GATEWAY_CONFIG.currentIndex + 1) % GATEWAY_CONFIG.endpoints.length;
  
  console.log(`   🔗 [${timestamp()}] HTTP: ${tokenStats.label} on ${gateway}`);
  
  return new Promise((resolve, reject) => {
    const url = new URL(`${gateway}/chat/completions`);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const requestBody = JSON.stringify({
      model: options.model || 'glm-4-flash',
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000
    });
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer Z.ai',
      'X-Z-AI-From': 'Z',
      'X-Token': tokenData.token,
      'X-User-Id': tokenData.userId,
      'X-Chat-Id': tokenData.chatId
    };
    
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: headers
    };
    
    const req = httpModule.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        // Update token stats from headers
        pool.updateTokenStats(tokenIndex, res.headers);
        
        // Release token if we acquired it
        if (tokenRelease) tokenRelease();
        
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log(`   ✅ [${timestamp()}] Response received (token: ${tokenStats.label})`);
            resolve({
              content: json.choices?.[0]?.message?.content || '',
              thinking: json.choices?.[0]?.message?.thinking || null,
              headers: res.headers
            });
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        } else if (res.statusCode === 429) {
          pool.markTokenExhausted(tokenIndex);
          reject(new Error(`Rate limited (429)`));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    
    req.on('error', (e) => {
      if (tokenRelease) tokenRelease();
      reject(new Error(`Request error: ${e.message}`));
    });
    
    req.setTimeout(60000, () => {
      req.destroy();
      if (tokenRelease) tokenRelease();
      reject(new Error('Request timeout'));
    });
    
    req.write(requestBody);
    req.end();
  });
}

// Retry wrapper with automatic token switching
async function callAIWithRetry(messages, options = {}, maxRetries = 5) {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callAIviaHTTP(messages, options);
    } catch (error) {
      lastError = error;
      
      if (error.message.includes('429') || error.message.includes('Rate limited')) {
        console.log(`   ⚠️ [${timestamp()}] Rate limited! Auto-switching token (attempt ${attempt + 1}/${maxRetries})`);
        await delay(500);
      } else if (error.message.includes('Token acquisition timeout')) {
        console.log(`   ⚠️ [${timestamp()}] All tokens busy! Waiting... (attempt ${attempt + 1}/${maxRetries})`);
        await delay(1000);
      } else {
        console.log(`   ⚠️ [${timestamp()}] Error: ${error.message}. Retry ${attempt + 1}/${maxRetries}`);
        await delay(500 * (attempt + 1));
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// CAMPAIGN FUNCTIONS
// ============================================================================

async function fetchAllCampaigns() {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.baseUrl}/api/campaigns?limit=100`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.campaigns || json.data || json || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchCampaign(address) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.baseUrl}/api/campaigns/${address}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.campaigns || json.data || json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function isEthereumAddress(str) {
  return /^0x[a-fA-F0-9]{40}$/.test(str);
}

async function resolveCampaign(input) {
  if (isEthereumAddress(input)) {
    return await fetchCampaign(input);
  }
  
  const campaigns = await fetchAllCampaigns();
  const inputLower = input.toLowerCase();
  
  return campaigns.find(c => 
    c.title?.toLowerCase().includes(inputLower) ||
    c.intelligentContractAddress?.toLowerCase() === inputLower
  ) || null;
}

// ============================================================================
// PARALLEL CONTENT GENERATION
// ============================================================================

async function generateSingleContent(campaignData, index) {
  const angles = ['personal_story', 'data_driven', 'contrarian', 'insider_perspective', 'case_study'];
  const emotions = [
    ['curiosity', 'surprise'],
    ['fear', 'hope'],
    ['anger', 'trust'],
    ['sadness', 'anticipation'],
    ['surprise', 'joy']
  ];
  const structures = ['hero_journey', 'problem_solution', 'before_after', 'mystery_reveal', 'case_study'];
  
  const selectedAngle = angles[index % angles.length];
  const selectedEmotion = emotions[index % emotions.length];
  const selectedStructure = structures[index % structures.length];
  
  const taskId = `gen-content-${index + 1}`;
  
  console.log(`\n📝 [${timestamp()}] Generating Content ${index + 1}...`);
  console.log(`   🎭 Angle: ${selectedAngle}`);
  console.log(`   💫 Emotions: ${selectedEmotion[0]} → ${selectedEmotion[1]}`);
  
  const systemPrompt = `You are an expert content creator for Rally.fun campaigns. Create viral, engaging Twitter/X content.

RULES:
- Write in casual, conversational tone (use contractions, lowercase for emphasis)
- Be specific with numbers and details
- Include the campaign URL naturally
- Avoid AI-sounding phrases (delve, leverage, realm, etc.)
- No em dashes (—) or smart quotes
- Start with a hook (tbh, ngl, fun story, etc.)
- End with engagement question
- Include parenthetical asides like (not gonna lie) or (embarrassing to admit)

Campaign: ${campaignData.title}
URL: https://app.rally.fun/campaign/${campaignData.intelligentContractAddress}
Goal: ${campaignData.goal || 'N/A'}
Style: ${campaignData.style || 'Post a banger!'}

Angle: ${selectedAngle}
Emotions: ${selectedEmotion[0]} → ${selectedEmotion[1]}
Structure: ${selectedStructure}`;

  const userPrompt = `Create a tweet (under 280 chars) for this Rally campaign.
Use the ${selectedAngle} angle with ${selectedEmotion[0]} → ${selectedEmotion[1]} emotions.
Structure: ${selectedStructure}.
Include the URL naturally.`;

  try {
    const result = await callAIWithRetry([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { temperature: 0.8, maxTokens: 500, purpose: taskId });
    
    console.log(`   ✅ [${timestamp()}] Content ${index + 1} generated`);
    return { index, content: result.content, success: true };
  } catch (error) {
    console.log(`   ❌ [${timestamp()}] Content ${index + 1} failed: ${error.message}`);
    return { index, content: null, success: false, error: error.message };
  }
}

/**
 * Generate multiple contents in PARALLEL
 */
async function generateContentsParallel(campaignData) {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🚀 PARALLEL CONTENT GENERATION');
  console.log(`   Generating ${CONFIG.contentsPerCycle} contents simultaneously...`);
  console.log('════════════════════════════════════════════════════════════');
  
  const startTime = Date.now();
  
  // Create parallel generation tasks
  const tasks = [];
  for (let i = 0; i < CONFIG.contentsPerCycle; i++) {
    tasks.push(generateSingleContent(campaignData, i));
  }
  
  // Wait for all to complete
  const results = await Promise.all(tasks);
  
  // Sort by index
  results.sort((a, b) => a.index - b.index);
  
  const successful = results.filter(r => r.success);
  const duration = Date.now() - startTime;
  
  console.log(`\n📊 [${timestamp()}] Generated ${successful.length}/${CONFIG.contentsPerCycle} contents in ${duration}ms`);
  
  return results.map(r => r.content);
}

// ============================================================================
// PARALLEL JUDGING SYSTEM
// ============================================================================

/**
 * Judge 1: Gate (Campaign Requirements)
 */
async function runJudge1Parallel(content, campaignData, contentIndex) {
  const judgeId = `judge1-content-${contentIndex}`;
  const jq = getJudgeQueue();
  
  // Wait for slot in judge queue
  while (!jq.canStartJudge()) {
    await delay(100);
  }
  
  jq.startJudge(judgeId, contentIndex, 'GATE');
  
  try {
    let score = 0;
    const details = {};
    
    // Programmatic checks
    const urlPattern = /https?:\/\/[^\s]+/g;
    const hasURL = urlPattern.test(content);
    details.urlPresent = hasURL ? 2 : 0;
    score += details.urlPresent;
    
    const bannedWords = ['amazing', 'incredible', 'revolutionary', 'game-changing', 'groundbreaking'];
    const hasBanned = bannedWords.some(word => content.toLowerCase().includes(word));
    details.bannedWords = !hasBanned ? 2 : 0;
    score += details.bannedWords;
    
    // AI-based checks
    const systemPrompt = `You are Judge 1 for Rally.fun content. Score this content against campaign requirements.

Campaign:
- Title: ${campaignData.title}
- Goal: ${campaignData.goal || 'N/A'}
- Style: ${campaignData.style || 'Post a banger!'}
- Rules: ${campaignData.rules || 'N/A'}

Score each (0-max):
1. Description Alignment (0-4): Does content match campaign goal?
2. Rules Compliance (0-4): Does it follow campaign rules?
3. Style Match (0-3): Does it match requested style?
4. Knowledge Base (0-3): Is information accurate?
5. Additional Info (0-2): Extra relevant details?

Reply in JSON format only:
{"description":X,"rules":X,"style":X,"knowledgeBase":X,"additionalInfo":X}`;

    const result = await callAIWithRetry([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ], { temperature: 0.2, maxTokens: 200, purpose: judgeId });
    
    const match = result.content.match(/\{[^}]+\}/);
    if (match) {
      const aiScores = JSON.parse(match[0]);
      details.description = aiScores.description || 0;
      details.rules = aiScores.rules || 0;
      details.style = aiScores.style || 0;
      details.knowledgeBase = aiScores.knowledgeBase || 0;
      details.additionalInfo = aiScores.additionalInfo || 0;
      
      score += details.description + details.rules + details.style + 
               details.knowledgeBase + details.additionalInfo;
    }
    
    const passed = score >= CONFIG.thresholds.gate1.pass;
    
    const judgeResult = { score, max: CONFIG.thresholds.gate1.max, passed, details };
    jq.completeJudge(judgeId, judgeResult);
    
    console.log(`   📊 [${timestamp()}] JUDGE 1 Content ${contentIndex + 1}: ${score}/${CONFIG.thresholds.gate1.max} (${passed ? '✅ PASS' : '❌ FAIL'})`);
    
    return judgeResult;
    
  } catch (error) {
    jq.completeJudge(judgeId, { error: error.message });
    console.log(`   ⚠️ [${timestamp()}] JUDGE 1 Content ${contentIndex + 1} error: ${error.message}`);
    return { score: 0, max: CONFIG.thresholds.gate1.max, passed: false, error: error.message };
  }
}

/**
 * Judge 2: Fact-Check
 */
async function runJudge2Parallel(content, campaignData, contentIndex) {
  const judgeId = `judge2-content-${contentIndex}`;
  const jq = getJudgeQueue();
  
  while (!jq.canStartJudge()) {
    await delay(100);
  }
  
  jq.startJudge(judgeId, contentIndex, 'FACTS');
  
  try {
    const systemPrompt = `You are Judge 2: Fact-Checker for Rally.fun content.

Extract claims from the content and verify each one. A claim is any factual statement.

For each claim:
1. Extract the claim
2. Assess if it's verifiable
3. Check if it seems accurate

Reply in JSON format:
{"claims":[{"claim":"...","verifiable":true/false,"verified":true/false}]}

Maximum 5 claims to verify.`;

    const result = await callAIWithRetry([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ], { temperature: 0.2, maxTokens: 500, purpose: judgeId });
    
    const match = result.content.match(/\{[^}]+\[[\s\S]*?\][^}]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      const claims = parsed.claims || [];
      const verified = claims.filter(c => c.verified).length;
      
      const passed = verified >= CONFIG.thresholds.judge2.pass;
      
      const judgeResult = { score: verified, max: CONFIG.thresholds.judge2.max, passed, claims };
      jq.completeJudge(judgeId, judgeResult);
      
      console.log(`   📊 [${timestamp()}] JUDGE 2 Content ${contentIndex + 1}: ${verified}/${claims.length} claims (${passed ? '✅ PASS' : '❌ FAIL'})`);
      
      return judgeResult;
    }
  } catch (error) {
    jq.completeJudge(judgeId, { error: error.message });
    console.log(`   ⚠️ [${timestamp()}] JUDGE 2 Content ${contentIndex + 1} error: ${error.message}`);
  }
  
  return { score: 0, max: CONFIG.thresholds.judge2.max, passed: false };
}

/**
 * Judge 3: Quality Assessment
 */
async function runJudge3Parallel(content, campaignData, contentIndex) {
  const judgeId = `judge3-content-${contentIndex}`;
  const jq = getJudgeQueue();
  
  while (!jq.canStartJudge()) {
    await delay(100);
  }
  
  jq.startJudge(judgeId, contentIndex, 'QUALITY');
  
  try {
    const systemPrompt = `You are Judge 3: Quality Assessor for Rally.fun content.

Score this content (0-max for each):

1. Originality (0-20): Unique angle, fresh perspective?
2. Engagement Potential (0-20): Would people interact?
3. Clarity & Flow (0-15): Easy to understand, good rhythm?
4. Emotional Impact (0-10): Does it evoke feelings?
5. X-Factor (0-15): Memorable, shareable quality?

Reply in JSON format only:
{"originality":X,"engagement":X,"clarity":X,"emotional":X,"xFactor":X}`;

    const result = await callAIWithRetry([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ], { temperature: 0.2, maxTokens: 200, purpose: judgeId });
    
    const match = result.content.match(/\{[^}]+\}/);
    if (match) {
      const scores = JSON.parse(match[0]);
      
      const total = (scores.originality || 0) + 
                   (scores.engagement || 0) + 
                   (scores.clarity || 0) + 
                   (scores.emotional || 0) + 
                   (scores.xFactor || 0);
      
      const passed = total >= CONFIG.thresholds.judge3.pass;
      
      const judgeResult = { score: total, max: CONFIG.thresholds.judge3.max, passed, components: scores };
      jq.completeJudge(judgeId, judgeResult);
      
      console.log(`   📊 [${timestamp()}] JUDGE 3 Content ${contentIndex + 1}: ${total}/${CONFIG.thresholds.judge3.max} (${passed ? '✅ PASS' : '❌ FAIL'})`);
      
      return judgeResult;
    }
  } catch (error) {
    jq.completeJudge(judgeId, { error: error.message });
    console.log(`   ⚠️ [${timestamp()}] JUDGE 3 Content ${contentIndex + 1} error: ${error.message}`);
  }
  
  return { score: 0, max: CONFIG.thresholds.judge3.max, passed: false };
}

/**
 * Full judging process for a single content (FAIL FAST)
 */
async function judgeContentParallel(content, campaignData, contentIndex) {
  const results = {
    content,
    contentIndex,
    scores: {},
    passed: false,
    totalScore: 0,
    failedAt: null
  };
  
  if (!content) {
    results.failedAt = 'generation';
    return results;
  }
  
  console.log(`\n⚖️ [${timestamp()}] Starting judging for Content ${contentIndex + 1}`);
  
  // Judge 1: Gate (FAIL FAST)
  results.scores.judge1 = await runJudge1Parallel(content, campaignData, contentIndex);
  
  if (!results.scores.judge1.passed) {
    results.failedAt = 'judge1';
    results.passed = false;
    console.log(`   ❌ [${timestamp()}] Content ${contentIndex + 1} FAILED at Judge 1`);
    return results;
  }
  
  // Judge 2: Fact-Check (FAIL FAST)
  results.scores.judge2 = await runJudge2Parallel(content, campaignData, contentIndex);
  
  if (!results.scores.judge2.passed) {
    results.failedAt = 'judge2';
    results.passed = false;
    console.log(`   ❌ [${timestamp()}] Content ${contentIndex + 1} FAILED at Judge 2`);
    return results;
  }
  
  // Judge 3: Quality
  results.scores.judge3 = await runJudge3Parallel(content, campaignData, contentIndex);
  
  if (!results.scores.judge3.passed) {
    results.failedAt = 'judge3';
    results.passed = false;
    console.log(`   ❌ [${timestamp()}] Content ${contentIndex + 1} FAILED at Judge 3`);
    return results;
  }
  
  // Calculate total
  results.totalScore = results.scores.judge1.score + 
                       results.scores.judge2.score + 
                       results.scores.judge3.score;
  
  results.passed = results.totalScore >= CONFIG.thresholds.total.pass;
  
  console.log(`   ✅ [${timestamp()}] Content ${contentIndex + 1} PASSED! Total: ${results.totalScore}/${CONFIG.thresholds.total.max}`);
  
  return results;
}

/**
 * Judge all contents in PARALLEL
 * Each content is judged independently as soon as it's ready
 */
async function judgeAllContentsParallel(contents, campaignData) {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('⚖️  PARALLEL JUDGING');
  console.log(`   Judging ${contents.length} contents simultaneously...`);
  console.log('════════════════════════════════════════════════════════════');
  
  const startTime = Date.now();
  
  // Create parallel judging tasks
  const tasks = contents.map((content, index) => 
    judgeContentParallel(content, campaignData, index)
  );
  
  // Wait for all to complete
  const results = await Promise.all(tasks);
  
  const duration = Date.now() - startTime;
  const passed = results.filter(r => r.passed);
  
  console.log(`\n📊 [${timestamp()}] Judging complete: ${passed.length}/${contents.length} passed in ${duration}ms`);
  
  return results;
}

// ============================================================================
// SELECT BEST CONTENT (Highest Score)
// ============================================================================

function selectBestContent(judgeResults) {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🏆 SELECTING BEST CONTENT (Highest Score)');
  console.log('════════════════════════════════════════════════════════════');
  
  const passed = judgeResults.filter(r => r.passed);
  
  if (passed.length === 0) {
    console.log('   ❌ No content passed all judges');
    return null;
  }
  
  // Sort by total score (highest first)
  passed.sort((a, b) => b.totalScore - a.totalScore);
  
  console.log(`\n   📊 Passing contents: ${passed.length}`);
  passed.forEach((r, i) => {
    console.log(`   ${i + 1}. Content ${r.contentIndex + 1}: Score ${r.totalScore}/${CONFIG.thresholds.total.max}`);
  });
  
  const best = passed[0];
  console.log(`\n   🏆 BEST: Content ${best.contentIndex + 1} with Score ${best.totalScore}/${CONFIG.thresholds.total.max}`);
  
  return best;
}

// ============================================================================
// SAVE OUTPUT
// ============================================================================

async function saveOutput(bestContent, campaignData, allResults) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `rally-output-${campaignData.intelligentContractAddress?.substring(0, 8) || 'campaign'}-${timestamp}.json`;
  const filepath = path.join(CONFIG.outputDir, filename);
  
  const output = {
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    campaign: {
      title: campaignData.title,
      address: campaignData.intelligentContractAddress
    },
    bestContent: bestContent ? {
      content: bestContent.content,
      score: bestContent.totalScore,
      components: bestContent.scores
    } : null,
    allResults: allResults.map(r => ({
      contentIndex: r.contentIndex,
      passed: r.passed,
      totalScore: r.totalScore,
      failedAt: r.failedAt
    }))
  };
  
  fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Output saved to: ${filepath}`);
  
  return filepath;
}

// ============================================================================
// MAIN WORKFLOW - PARALLEL VERSION
// ============================================================================

async function runParallelWorkflow(campaignInput) {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     RALLY WORKFLOW V9.9.0 - PARALLEL PROCESSING ENGINE        ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  🚀 Parallel Generate: YES                                    ║');
  console.log('║  ⚖️  Parallel Judge: YES                                       ║');
  console.log('║  🔄 Auto Token Switch: YES                                    ║');
  console.log('║  🎯 Fail Fast: YES                                            ║');
  console.log('║  🏆 Highest Score Selection: YES                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const totalStartTime = Date.now();
  
  // Initialize token pool
  const pool = getSmartTokenPool();
  pool.displayStatus();
  
  // Resolve campaign
  console.log(`\n🔍 Resolving campaign: ${campaignInput}`);
  const campaignData = await resolveCampaign(campaignInput);
  
  if (!campaignData) {
    console.log('   ❌ Campaign not found');
    return null;
  }
  
  console.log(`   ✅ Found: ${campaignData.title}`);
  console.log(`   📍 Address: ${campaignData.intelligentContractAddress}`);
  
  // PHASE 1: PARALLEL GENERATE
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 1: PARALLEL CONTENT GENERATION                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const contents = await generateContentsParallel(campaignData);
  
  // PHASE 2: PARALLEL JUDGE
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 2: PARALLEL JUDGING (IMMEDIATE START)                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const judgeResults = await judgeAllContentsParallel(contents, campaignData);
  
  // PHASE 3: SELECT BEST
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 3: RANKING & SELECTION                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  const bestContent = selectBestContent(judgeResults);
  
  // Display final token status
  pool.displayStatus();
  
  // Save output
  await saveOutput(bestContent, campaignData, judgeResults);
  
  // Final summary
  const totalDuration = Date.now() - totalStartTime;
  
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    WORKFLOW COMPLETE                           ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  ⏱️  Total Time: ${(totalDuration / 1000).toFixed(1)}s                                    ║`);
  console.log(`║  📊 Contents Generated: ${contents.filter(c => c).length}/${CONFIG.contentsPerCycle}                             ║`);
  console.log(`║  ✅ Contents Passed: ${judgeResults.filter(r => r.passed).length}/${contents.length}                                  ║`);
  
  if (bestContent) {
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║  🏆 BEST CONTENT:                                              ║');
    console.log(`║  Score: ${bestContent.totalScore}/${CONFIG.thresholds.total.max}                                             ║`);
    console.log(`║  "${bestContent.content.substring(0, 50)}..."                       ║`);
  }
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  return bestContent;
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('\nUsage: node rally-workflow-v9.9.0-parallel.js <campaign-address-or-name>');
    console.log('\nExample:');
    console.log('  node rally-workflow-v9.9.0-parallel.js 0x1234...');
    console.log('  node rally-workflow-v9.9.0-parallel.js "Campaign Name"');
    process.exit(1);
  }
  
  const campaignInput = args.join(' ');
  await runParallelWorkflow(campaignInput);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for module usage
module.exports = {
  runParallelWorkflow,
  generateContentsParallel,
  judgeAllContentsParallel,
  selectBestContent,
  SmartTokenPool,
  JudgeQueue
};
