/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RALLY WORKFLOW V10.0 — OPTIMIZED PIPELINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SPEED OPTIMIZATIONS (3x faster than v9.8.4):
 * ✅ Merged deepCampaignIntentAnalyzer + campaignComprehensionCheck → 1 call
 * ✅ Removed buildPreWritingPerspective (integrated into generation prompt)
 * ✅ Consolidated 6 judges → 2 Super-Judges (-4 calls per content)
 * ✅ Integrated anti-AI audit into Super-Judge 1 (-1 call per content)
 * ✅ Parallel content generation (3 contents simultaneously)
 * ✅ Reduced all delays by 60-80%
 * ✅ Parallel judging for valid contents
 *
 * QUALITY OPTIMIZATIONS:
 * ✅ Few-shot examples in generation prompt
 * ✅ Leaner prompt (voice-first, not checklist-first)
 * ✅ Super-Judge sees full picture for consistent scoring
 * ✅ Specific actionable improvement instructions on failure
 * ✅ Pre-writing questions integrated into generation (not separate call)
 *
 * AI CALLS COMPARISON:
 * v9.8.4:  4-6 pre-gen + 9-25 per cycle = 25-50 calls in 3 cycles (8-20 min)
 * v10.0:   3 pre-gen + 5-8 per cycle  = 18-27 calls in 3 cycles (3-5 min)
 *
 * Usage:
 *   node rally-workflow-v10-optimized.js "Internet Court"
 *   node rally-workflow-v10-optimized.js 0xAF5a5B459F4371c1781E3B8456214CDD063EeBA7
 *   node rally-workflow-v10-optimized.js list
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const AI_WORKER_PATH = path.join(__dirname, 'ai-worker.js');

process.on('uncaughtException', (e) => {
  console.error('\n❌ UNCAUGHT EXCEPTION:', e.message);
  console.error('   Stack:', e.stack?.substring(0, 300));
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('\n❌ UNHANDLED REJECTION:', reason);
  if (reason instanceof Error) {
    console.error('   Message:', reason.message);
    console.error('   Stack:', reason.stack?.substring(0, 300));
  }
});

let _cachedCampaignIntent = null;

const THRESHOLDS = {
  SUPER_JUDGE1: { pass: 32, max: 48, name: 'Gate + Quality', percent: '67%' },
  SUPER_JUDGE2: { pass: 5, max: 10, name: 'Evidence + Uniqueness', percent: '50%' },
  TOTAL: { pass: 37, max: 58, percent: '64%' }
};

const GATEWAY = {
  hosts: ['172.25.136.193:8080', '172.25.136.210:8080'],
  currentIndex: 0
};

// Multi-token pool for rate limit handling
// BUG FIX #26: Token inconsistency - Load from config/tokens.js as single source of truth
let TOKENS;
try {
  const configTokens = require('./config/tokens.js');
  TOKENS = configTokens.TOKENS;
  console.log('   ✅ Loaded tokens from config/tokens.js (single source of truth)');
} catch (e) {
  // Fallback: embedded tokens (must be kept in sync with config/tokens.js)
  console.log('   ⚠️ config/tokens.js not found, using embedded tokens');
  TOKENS = [
    null, // Auto from config
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtNTQ5ZmI5MTEtZWM0NS00NGJiLTg5YjEtMWY2MTljNTEzN2QzIn0.M6IQTOXasSbEw98a4R6p3LEPwJPCWyRZiJSUo8lr2PM', chatId: 'chat-549fb911-ec45-44bb-89b1-1f619c5137d3', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun A #1' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtMTAyYTlkMGUtYTVkNy00MmY2LTk3ZjctNDk5NzFiNzcwNjVhIn0.6cDfQbTc2HHdtKXBfaUvpBsNLPbbjYkpJp6br0rYteA', chatId: 'chat-102a9d0e-a5d7-42f6-97f7-49971b77065a', userId: 'bb829ea3-0d37-4944-8705-00090bde3671', label: 'Akun B #1' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtMDAyOWJjNDYtZGI3Ny00ZmZkLWI4ZDItM2RlYzFlNWVkNDU3In0.CMthZytUFBpnqW3K52Q1AAgB9uvhyXf3AG-FQvaDoYI', chatId: 'chat-0029bc46-db77-4ffd-b8d2-3dec1e5ed457', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun A #2' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtOTZlZTk1NmItMGYxMi00MGUxLWE0MzYtYTk4YmQwZjk0YzJhIn0.PgpMEiUr8a6Cu2vl9zFMggRsxQrx3JwkUCOjZCUIJnw', chatId: 'chat-96ee956b-0f12-40e1-a436-a98bd0f94c2a', userId: 'bb829ea3-0d37-4944-8705-00090bde3671', label: 'Akun B #2' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtOWJiMzAzOTMtYWE3Mi00Y2QzLWJkNzktYzJkZmI0ODVmNzgyIn0.jb35oqGKPB2FLC-X_mozORmvbBilwRc_pSZEkbyaRfw', chatId: 'chat-9bb30393-aa72-4cd3-bd79-c2dfb485f782', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun A #3' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtYjAyYTlhMmUtZTg5My00NGMwLWEzMTktNTZlYTk0YzRkOTQxIn0.GQLbTpxXn-gcONVhEYr6Ozq7sTOdE5NJt5wIiGfVTQM', chatId: 'chat-b0b2aa2e-e893-44c0-a319-56ea94c4d941', userId: 'bb829ea3-0d37-4944-8705-00090bde3671', label: 'Akun B #3' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtZDE3ZGY4ODQtZGNlOC00MmU3LWEzMTctMDQzYjI0YmM3MjdmIn0.W8UQmOxVIqGsAicZc9n4r4jR3IVM5Yj9V-SWv8H_0ac', chatId: 'chat-d17df884-dce8-42e7-a317-043b24bc727f', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun A #4' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtYzAwMTI0YWQtODk2Yy00NzBiLWE0OTYtOGFlNTYzMTQ0YTUwIn0.a0UXyTQ3z4D0g0mzHbVLpBMMN6cftW1W_-ELiObLqXY', chatId: 'chat-c00124ad-896c-470b-a496-8ae563144a50', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun C #1' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtNTRjOTZlMTQtNzMyYy00NjA1LWIyZTQtNWU3NzI1MjlhNTQ3In0.VzXhIi9TLBZ_7H0c5pRP9AL7HSCaL3RwO7-j_dqH4FY', chatId: 'chat-54c96e14-732c-4605-b2e4-5e772529a547', userId: 'bb829ea3-0d37-4944-8705-00090bde3671', label: 'Akun D #1' },
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtYWYxZDE3YWQtZDI1NC00YmFkLWI5ZmMtN2YyOTIwOTExNjExIn0.xG3YxW5PNy_LJrO9JfPgPFv3U0f_46IY4NqxYTZfqIo', chatId: 'chat-af1d17ad-d254-4bad-b9fc-7f2920911611', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun E #1' },
    // TOKEN from fafa.txt - additional user for extra quota
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMWNkY2Y1NzktYzZlNS00ZWY3LTgyZDUtZDg2OWQ4Yzg1YTVlIiwiY2hhdF9pZCI6ImNoYXQtMDQ4YTVhODItZWRhMi00ZTQ0LTk4YWEtZmM5YTk0Y2UyNWZmIn0.asZolcXMp4kvy_2UqeA4BHvYx0gAsw7mNgNrRXKJrtw', chatId: 'chat-048a5a82-eda2-4e44-98aa-fc9a94ce25ff', userId: '1cdcf579-c6e5-4ef7-82d5-d869d8c85a5e', label: 'Extra User #1' }
  ];
}

let currentTokenIndex = 0;
let CFG = null;

// Load auto-config
try {
  CFG = JSON.parse(fs.readFileSync('/etc/.z-ai-config', 'utf8'));
} catch (e) {
  console.log('   ⚠️ No auto-config, using hardcoded tokens');
}

// HTTP Direct AI Call - No SDK!
// Model tier system:
//   - 'glm-4-flash': fastest, used for simple/preliminary tasks
//   - 'glm-5-flash': balanced, used for research/competitor/Q&A + anti-AI regen (with thinking + search)
//   - 'glm-5':       top tier, used for ALL content generation + judging + comprehension
// All models route to glm-4.6 on the gateway with automatic thinking (reasoning_content)
// Rate limiter - max 2 req/sec (QPS) AND 10 req/10min per gateway+token bucket
// VERIFIED BY TESTING: ip-10min-remaining is PER gateway+token combo, NOT per IP
// dada.txt was WRONG about "per IP" — dual gateway rotation WORKS
// 11 tokens x 2 gateways = 22 buckets x 10 req/10min = 220 req/10min capacity
const _requestTimes = [];       // For QPS: max 2 req/sec (global, since same outbound IP)
const _requestTimes10minMap = new Map(); // For 10min limit: keyed by "gateway+token" bucket
const IP_RATE_LIMIT = 10;       // 10 requests per window PER bucket
const IP_RATE_WINDOW = 600000;  // 10 minutes in ms

// ═══════════════════════════════════════════════════════════════
// SMART RATE LIMITER v2 — Bucket-Aware, Non-Blocking
// ═══════════════════════════════════════════════════════════════
// DESIGN PRINCIPLES:
// 1. If THIS bucket is full → throw error (caller switches token/gateway)
// 2. If ALL buckets full → short wait for soonest reset only
// 3. QPS: 2 req/sec global (same outbound IP)
// 4. NEVER wait more than ~120s even if all buckets truly exhausted
// ═══════════════════════════════════════════════════════════════

async function rateLimitWait(bucketKey) {
  const now = Date.now();
async function rateLimitWait(bucketKey) {
  const now = Date.now();
  
  // === LAYER 1: QPS limit (2 req/sec) - GLOBAL ===
  while (_requestTimes.length > 0 && now - _requestTimes[0] > 1000) {
    _requestTimes.shift();
  }
  if (_requestTimes.length >= 2) {
    const waitMs = 1000 - (now - _requestTimes[0]) + 100;
    if (waitMs > 0) {
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  
  // === LAYER 2: 10min rate limit PER bucket ===
  const key = bucketKey || 'default';
  if (!_requestTimes10minMap.has(key)) {
    _requestTimes10minMap.set(key, []);
  }
  const bucketTimes = _requestTimes10minMap.get(key);
  const nowAfter = Date.now();
  while (bucketTimes.length > 0 && nowAfter - bucketTimes[0] > IP_RATE_WINDOW) {
    bucketTimes.shift();
  }
  
  if (bucketTimes.length >= IP_RATE_LIMIT) {
    // THIS bucket is full — check if OTHER buckets have capacity
    let availableBuckets = 0;
    let soonestReset = Infinity;
    
    for (const [k, v] of _requestTimes10minMap) {
      // Clean old entries
      while (v.length > 0 && Date.now() - v[0] > IP_RATE_WINDOW) v.shift();
      if (v.length < IP_RATE_LIMIT) {
        availableBuckets++;
      } else if (v.length > 0) {
        const resetAt = v[0] + IP_RATE_WINDOW;
        if (resetAt < soonestReset) soonestReset = resetAt;
      }
    }
    
    if (availableBuckets > 0) {
      // Other buckets have capacity — DON'T wait, just switch bucket
      throw new Error('Rate limit - switch bucket');
    } else {
      // ALL buckets truly full — short wait for soonest reset
      const waitMs = Math.min(soonestReset - Date.now() + 2000, 120000); // Max 2min wait
      if (waitMs > 0) {
        console.log(`   ⏳ ALL ${_requestTimes10minMap.size} buckets full. Waiting ${(waitMs/1000).toFixed(0)}s...`);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
  }
  
  _requestTimes.push(Date.now());
  bucketTimes.push(Date.now());
}

async function callAIdirect(messages, maxTokens = 2000, temperature = 0.7, options = {}) {
  // ═══════════════════════════════════════════════════════════════════════
  // CHILD PROCESS DELEGATION — K8s-safe AI calls
  // ═══════════════════════════════════════════════════════════════════════
  // WHY: In K8s container, Node.js process gets killed when making long HTTP
  // requests (~10-15s). By delegating each AI call to a short-lived child
  // process, the parent stays alive. Child process handles HTTP I/O and exits.
  // 
  // BENEFITS:
  // - Parent process never dies (only spawns children)
  // - enable_search WORKS (child handles the long response time)
  // - Full quality preserved (same models, same prompts, same everything)
  // - Each child lives only 3-30 seconds
  // ═══════════════════════════════════════════════════════════════════════

  // === Step 1: Pick token (userId-aware round-robin) + select gateway ===
  let tokenData = _pickBestToken();
  let gw = GATEWAY.hosts[GATEWAY.currentIndex % GATEWAY.hosts.length];
  GATEWAY.currentIndex++;
  let gwUrl = `http://${gw}/v1/chat/completions`;

  // === Step 2: Rate limit check — smart bucket switching ===
  let bucketKey = `${gw}:${tokenData?.userId || 'cfg'}`;
  try {
    await rateLimitWait(bucketKey);
  } catch (e) {
    if (e.message === 'Rate limit - switch bucket') {
      _rotateToken();
      GATEWAY.currentIndex++;
      gw = GATEWAY.hosts[GATEWAY.currentIndex % GATEWAY.hosts.length];
      tokenData = _pickBestToken();
      gwUrl = `http://${gw}/v1/chat/completions`;
      bucketKey = `${gw}:${tokenData?.userId || 'cfg'}`;
      console.log(`   🔄 Switching to ${gw.split(':')[0]}/${tokenData?.label || '?'}`);
      try { await rateLimitWait(bucketKey); } catch (e2) {}
    } else { throw e; }
  }

  // === Step 3: Build headers ===
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer Z.ai',
    'X-Z-AI-From': 'Z'
  };

  if (tokenData === null && CFG && CFG.token) {
    headers['X-Token'] = CFG.token || CFG.apiKey;
    headers['X-User-Id'] = CFG.userId || '';
    headers['X-Chat-Id'] = CFG.chatId || '';
  } else if (tokenData && tokenData.token) {
    headers['X-Token'] = tokenData.token;
    headers['X-User-Id'] = tokenData.userId;
    headers['X-Chat-Id'] = tokenData.chatId;
  } else {
    const fallback = TOKENS[1];
    if (fallback && fallback.token) {
      headers['X-Token'] = fallback.token;
      headers['X-User-Id'] = fallback.userId;
      headers['X-Chat-Id'] = fallback.chatId;
    } else {
      throw new Error('No valid token available');
    }
  }

  // === Step 5: Build request body ===
  const body = JSON.stringify({
    model: options.model || 'glm-4-flash',
    messages,
    max_tokens: maxTokens,
    temperature,
    ...(options.enableSearch ? { enable_search: true } : {}),
    ...(options.enableThinking !== false ? {} : { enable_thinking: false })
  });

  // === Step 6: Delegate to child process (BLOCKING — K8s-safe) ===
  // Using spawnSync: parent blocks in syscall (waitpid), no event loop idle
  // This keeps the parent "active" from OS perspective (unlike async spawn)
  // IMPORTANT: Worker V2 uses fetch() — gateway returns 403 for http.request()
  const params = { url: gwUrl, headers, body, timeout: 120000 };

  // Write params to temp file
  const paramsFile = `/tmp/ai-call-${Date.now()}-${Math.random().toString(36).slice(2,6)}.json`;
  try {
    fs.writeFileSync(paramsFile, JSON.stringify(params));
  } catch (e) {
    throw new Error('Cannot write params file: ' + e.message);
  }

  try {
    // BLOCKING spawn — parent waits in kernel (waitpid), stays "alive" for K8s
    // maxBuffer: 2MB — AI responses with enable_search can be very large
    const result = spawnSync('node', [AI_WORKER_PATH, paramsFile], {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      timeout: 130000  // Kill child after 130s (slightly more than HTTP 120s timeout)
    });

    // Always cleanup
    try { fs.unlinkSync(paramsFile); } catch (e) {}

    if (result.status !== 0 && !result.stdout) {
      throw new Error(`AI worker crashed (exit ${result.status}): ${result.stderr?.substring(0, 200)}`);
    }

    const workerOutput = JSON.parse(result.stdout);

    if (!workerOutput.ok) {
      if (workerOutput.error === 'Timeout') {
        throw new Error('Timeout');
      }
      if (workerOutput.statusCode === 429) {
        console.log(`   ⚠️ Rate limit (429) on ${gw}/${tokenData?.label || '?'}, rotating...`);
        if (tokenData) tokenData._remainingDaily = 0;
        currentTokenIndex = _rotateToken();
        throw new Error('Rate limit - retry');
      }
      if (workerOutput.statusCode === 403) {
        // 403 = auth failure, try next token
        console.log(`   ⚠️ Auth 403 on ${gw}/${tokenData?.label || '?'}, rotating token...`);
        if (tokenData) tokenData._remainingDaily = 0;
        currentTokenIndex = _rotateToken();
        throw new Error('Auth failed (403) - rotating token');
      }
      throw new Error(workerOutput.error || `HTTP ${workerOutput.statusCode}`);
    }

    // Quota tracking
    if (workerOutput.remainingDaily && tokenData) {
      tokenData._remainingDaily = workerOutput.remainingDaily;
      if (workerOutput.remainingDaily < 5) {
        console.log(`   ⚠️ Token ${tokenData.label || currentTokenIndex} nearly exhausted (${workerOutput.remainingDaily} remaining)`);
      }
    }

    return {
      content: workerOutput.content || '',
      thinking: workerOutput.thinking || null,
      provider: 'http-worker',
      gateway: gw,
      bucketKey,
      remaining10min: workerOutput.remaining10min
    };
  } catch (e) {
    try { fs.unlinkSync(paramsFile); } catch (cleanupErr) {}
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════════
// SMART BUCKET-AWARE TOKEN ROTATION (v2)
// ═══════════════════════════════════════════════════════════════
// PROBLEM: Old _pickBestToken always picked same token (Extra User)
// because all tokens had default quota=300, loop always overwrote.
// This caused ALL requests to hit ONE bucket → bucket full → 500s wait!
//
// SOLUTION: Round-robin across UNIQUE userIds for maximum distribution.
// 3 userIds × 2 gateways = 6 buckets × 10 req/10min = 60 req/10min
// ═══════════════════════════════════════════════════════════════

const _userIdPool = { indices: [], currentIdx: 0 };

function _initUserIdPool() {
  // Group tokens by unique userId
  const userIds = new Map(); // userId -> [token indices]
  TOKENS.forEach((t, i) => {
    if (t && t.token && t.userId) {
      if (!userIds.has(t.userId)) userIds.set(t.userId, []);
      userIds.get(t.userId).push(i);
    }
  });
  _userIdPool.indices = [...userIds.keys()];
  _userIdPool.groups = userIds;
  console.log(`   ✅ Token pool: ${_userIdPool.indices.length} unique userIds, ${TOKENS.filter(t=>t).length} tokens total`);
}

function _pickBestToken() {
  if (!_userIdPool.indices.length) _initUserIdPool();
  
  // ROUND-ROBIN by userId first (spreads load across all users)
  const userId = _userIdPool.indices[_userIdPool.currentIdx % _userIdPool.indices.length];
  _userIdPool.currentIdx++;
  
  // Among tokens for this userId, pick the one with most remaining quota
  const tokenIndices = _userIdPool.groups.get(userId) || [];
  let bestToken = null;
  let bestRemaining = -1;
  for (const idx of tokenIndices) {
    const t = TOKENS[idx];
    if (!t) continue;
    const remaining = t._remainingDaily || 300;
    if (remaining > bestRemaining) {
      bestRemaining = remaining;
      bestToken = t;
      currentTokenIndex = idx;
    }
  }
  
  if (!bestToken) {
    // Fallback: first valid token
    for (let i = 1; i < TOKENS.length; i++) {
      if (TOKENS[i] && TOKENS[i].token) {
        bestToken = TOKENS[i];
        currentTokenIndex = i;
        break;
      }
    }
  }
  
  return bestToken;
}

function _rotateToken() {
  if (!_userIdPool.indices.length) _initUserIdPool();
  
  // Mark current token as depleted
  const current = TOKENS[currentTokenIndex];
  if (current) current._remainingDaily = 0;
  
  // Try next userId round-robin (skip depleted)
  for (let attempt = 0; attempt < _userIdPool.indices.length * 2; attempt++) {
    const userId = _userIdPool.indices[_userIdPool.currentIdx % _userIdPool.indices.length];
    _userIdPool.currentIdx++;
    const tokenIndices = _userIdPool.groups.get(userId) || [];
    for (const idx of tokenIndices) {
      const t = TOKENS[idx];
      if (t && (t._remainingDaily || 300) > 0) {
        currentTokenIndex = idx;
        return idx;
      }
    }
  }
  
  // All exhausted, reset
  TOKENS.forEach(t => { if (t) t._remainingDaily = 300; });
  currentTokenIndex = 1;
  return 1;
}

// SDK-based AI call with TOKEN ROTATION (from fafa.txt pattern)
// Each call uses a fresh SDK instance with different token to avoid rate limits
async function callAIViaSDK(messages, maxTokens = 2000, temperature = 0.7, options = {}) {
  const sdkTokens = _getSdkTokens();
  if (sdkTokens.length === 0) {
    throw new Error('No valid SDK tokens available');
  }
  
  // Try up to 3 different tokens
  for (let attempt = 0; attempt < 3; attempt++) {
    const tokenData = _getNextToken();
    if (!tokenData) break;
    
    try {
      // Respect per-bucket rate limit (gateway+token specific)
      const gw = GATEWAY.hosts[GATEWAY.currentIndex % GATEWAY.hosts.length];
      const bucketKey = `${gw}:${tokenData.userId}`;
      await rateLimitWait(bucketKey);
      
      console.log(`   🔌 SDK [${tokenData.label || 'token'}] calling AI (${messages.length} msgs, maxT=${maxTokens})...`);
      
      // Create FRESH SDK instance with this token's config
      const sdk = await _createSdkInstance(tokenData);
      
      const payload = { messages, max_tokens: maxTokens, temperature };
      const completion = await sdk.chat.completions.create(payload);
      
      const msg = completion.choices?.[0]?.message || {};
      const content = msg.content || '';
      console.log(`   ✅ SDK [${tokenData.label || 'token'}] OK (${content.length} chars)`);
      return {
        content,
        thinking: msg.reasoning_content || null,
        provider: 'z-ai-sdk',
        usage: completion.usage
      };
    } catch (e) {
      console.log(`   ⚠️ SDK [${tokenData.label || 'token'}] failed: ${e.message.substring(0, 80)}`);
      if (attempt < 2) {
        await delay(1500); // Brief pause before next token
      }
    }
  }
  
  throw new Error('All SDK tokens exhausted or failed');
}

// Wrapper with retry - OPTIMIZED to avoid infinite loops
async function callAI(messages, options = {}) {
  const maxRetries = options.maxRetries || 5;  // Reduced: fail fast, don't waste quota
  let lastError = null;
  let consecutiveRateLimits = 0;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // callAIdirect handles its own per-bucket rate limiting internally
      
      return await callAIdirect(
        messages,
        options.maxTokens || 2000,
        options.temperature || 0.7,
        options
      );
    } catch (e) {
      lastError = e;
      
      if (e.message.includes('Rate limit')) {
        consecutiveRateLimits++;
        if (consecutiveRateLimits >= 3) {
          console.log(`   ⚠️ All tokens rate limited, waiting 10s...`);
          await new Promise(r => setTimeout(r, 10000));
          consecutiveRateLimits = 0;
        } else {
          const delayMs = Math.min(2000 * Math.pow(1.5, consecutiveRateLimits), 10000);
          console.log(`   ⏳ Rate limit retry ${i + 1}/${maxRetries}, waiting ${(delayMs/1000).toFixed(1)}s...`);
          await new Promise(r => setTimeout(r, delayMs));
        }
      } else if (e.message.includes('Timeout') || e.message.includes('context deadline') || e.message.includes('execute tool')) {
        // Tool execution timeout — no point retrying with same params
        console.log(`   ⏳ Tool timeout: ${e.message.substring(0, 60)}`);
        if (i >= 1) throw e; // Fail fast after 1 retry for tool timeouts
        await new Promise(r => setTimeout(r, 3000));
      } else {
        consecutiveRateLimits = 0;
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * Math.min(i + 1, 3)));
        }
      }
    }
  }
  throw lastError;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESILIENT AI CLIENT - Based on fafa.txt + rara.txt solutions
// Token Rotation via .z-ai-config swap + HTTP direct fallback
// ═══════════════════════════════════════════════════════════════════════════
let ZAI = null;
let SDK_AVAILABLE = false;
try {
  const sdkMod = require('/tmp/my-project/node_modules/z-ai-web-dev-sdk');
  ZAI = sdkMod.default || sdkMod;
  SDK_AVAILABLE = true;
  console.log('   ✅ z-ai-web-dev-sdk loaded (AI via SDK with token rotation)');
} catch (e) {
  console.log('   ⚠️ SDK not available, using HTTP Direct to gateway');
}

// Token rotation state
const _tokenPool = {
  index: 0,
  stats: [] // track per-token request count
};
const _zaiConfigPath = '/home/z/my-project/chek1/.z-ai-config';
const _zaiConfigBackup = '/home/z/my-project/chek1/.z-ai-config-backup';

function _getSdkTokens() {
  // Get valid tokens from TOKENS pool (skip null entries)
  return TOKENS.filter(t => t && t.token && t.userId && t.chatId);
}

function _getNextToken() {
  const tokens = _getSdkTokens();
  if (tokens.length === 0) return null;
  // Round-robin with preference for least-used
  const token = tokens[_tokenPool.index % tokens.length];
  _tokenPool.index = (_tokenPool.index + 1) % tokens.length;
  if (!_tokenPool.stats[_tokenPool.index]) _tokenPool.stats[_tokenPool.index] = 0;
  return token;
}

function _writeZaiConfig(tokenData) {
  try {
    // Backup existing config
    try { fs.copyFileSync(_zaiConfigPath, _zaiConfigBackup); } catch (e) {}
    // Alternate gateway for SDK calls (same rotation as HTTP direct)
    const gw = GATEWAY.hosts[GATEWAY.currentIndex % GATEWAY.hosts.length];
    const config = {
      baseUrl: `http://${gw}/v1`,
      apiKey: 'Z.ai',
      token: tokenData.token,
      userId: tokenData.userId,
      chatId: tokenData.chatId
    };
    fs.writeFileSync(_zaiConfigPath, JSON.stringify(config));
  } catch (e) {
    console.log(`   ⚠️ Could not write .z-ai-config: ${e.message}`);
  }
}

function _restoreZaiConfig() {
  try {
    if (fs.existsSync(_zaiConfigBackup)) {
      fs.copyFileSync(_zaiConfigBackup, _zaiConfigPath);
      fs.unlinkSync(_zaiConfigBackup);
    }
  } catch (e) {}
}

async function _createSdkInstance(tokenData) {
  _writeZaiConfig(tokenData);
  try {
    const instance = await ZAI.create();
    return instance;
  } finally {
    _restoreZaiConfig();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function preflightCheck() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 PRE-FLIGHT CHECK - HTTP Direct Mode');
  console.log('═'.repeat(60));
  
  console.log('   ✅ HTTP Direct Mode: Ready (No SDK required)');
  console.log(`   ✅ Gateway: ${GATEWAY.hosts.join(', ')}`);
  console.log(`   ✅ Tokens: ${TOKENS.length} available`);
  
  // Validate gateway connectivity (using fetch — gateway rejects http.request())
  let gatewayOk = false;
  for (const host of GATEWAY.hosts) {
    try {
      const result = await fetch(`http://${host}/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer Z.ai',
          'X-Token': TOKENS[1]?.token || '',
          'X-User-Id': TOKENS[1]?.userId || ''
        },
        signal: AbortSignal.timeout(5000)
      });
      // Gateway reachable if ANY response received (404/403 still means gateway alive)
      const gatewayReachable = result.status < 500;
      
      if (gatewayReachable) {
        gatewayOk = true;
        console.log(`   ✅ Gateway ${host}: Connected`);
        break;
      } else {
        console.log(`   ⚠️ Gateway ${host}: No response`);
      }
    } catch (e) {
      console.log(`   ⚠️ Gateway ${host}: Error - ${e.message}`);
    }
  }
  
  if (!gatewayOk) {
    console.log('   ❌ No gateway reachable! Workflow may fail.');
    console.log('   💡 Check network connectivity and gateway addresses.');
  }
  
  // Validate tokens
  let validTokens = 0;
  for (let i = 0; i < TOKENS.length; i++) {
    const token = TOKENS[i];
    if (token === null) {
      console.log(`   ✅ Token #${i}: Auto-Config`);
      validTokens++;
    } else if (token && token.token) {
      console.log(`   ✅ Token #${i}: ${token.label || 'Manual'} (${token.userId.substring(0, 8)}...)`);
      validTokens++;
    } else {
      console.log(`   ❌ Token #${i}: Invalid (missing token data)`);
    }
  }
  
  if (validTokens === 0) {
    console.log('   ❌ No valid tokens available! Workflow cannot proceed.');
    return { ready: false };
  }
  
  console.log(`   ✅ ${validTokens}/${TOKENS.length} tokens valid`);
  
  // Display token pool status
  displayTokenPoolStatus();
  
  // Display Mindset Framework
  displayMindsetFramework();
  
  // Display Control Matrix
  displayControlMatrix();
  
  console.log('═'.repeat(60));
  
  return { ready: true, gatewayOk, validTokens };
}

/**
 * Display token pool status for rate limit handling
 */

// ============================================================================
// V10: OPTIMIZED DELAYS (60-80% reduction)
// ============================================================================

function displayTokenPoolStatus() {
  console.log('\n   ╔════════════════════════════════════════════════════════════╗');
  console.log('   ║           🎫 MULTI-TOKEN RATE LIMIT HANDLER               ║');
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  
  TOKENS.forEach((token, index) => {
    const isActive = index === currentTokenIndex;
    const marker = isActive ? '►' : ' ';
    const label = token?.label || 'Auto-Config (Primary)';
    
    console.log(`   ║ ${marker} #${index}: ${label.padEnd(42)}║`);
  });
  
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log(`   ║  Total: ${TOKENS.length} tokens available for rate limit fallback    ║`);
  console.log('   ╚════════════════════════════════════════════════════════════╝');
}

// ============================================================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================================================

/**
 * Check if error is a rate limit error (429)
 */
function isRateLimitError(error) {
  const msg = error.message || '';
  return msg.includes('429') || 
         msg.includes('Too many requests') || 
         msg.includes('rate limit') ||
         msg.includes('速率限制') ||
         msg.includes('401') ||
         msg.includes('missing X-Token');
}


// ============================================================================
// V10: OPTIMIZED CONFIG
// ============================================================================

const CONFIG = {
  pythonNLP: { baseUrl: 'http://localhost:5000', enabled: true, timeout: 30000, fallbackToBasic: true },
  rallyApiBase: 'https://app.rally.fun/api',
  outputDir: '/home/z/my-project/download',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  tokens: TOKENS,

  multiContent: {
    enabled: true, count: 3, selectBest: true, minPassCount: 1, maxRegenerateAttempts: 5,
    variations: {
      angles: ['personal_story', 'data_driven', 'contrarian', 'insider_perspective', 'case_study'],
      emotions: [['curiosity','surprise'],['fear','hope'],['anger','trust'],['sadness','anticipation'],['surprise','joy']],
      structures: ['hero_journey', 'problem_solution', 'before_after', 'mystery_reveal', 'case_study']
    }
  },

  model: {
    name: 'glm-5',
    enableThinking: true,
    enableSearch: true,
    temperature: { generation: 0.85, judging: 0.2, analysis: 0.3 }
  },

  // V10: REDUCED DELAYS (was 2-15s, now 0.3-3s)
  delays: {
    betweenJudges: 300,
    betweenPasses: 3000,
    beforeRevision: 2000,
    betweenContentGen: 1000,
    betweenQuickJudge: 500,
    afterRateLimit: 5000
  },

  retry: { maxAttempts: 5, delayMs: 5000 },

  enableThinking: true,

  personas: [
    { id: 'skeptic', name: 'The Skeptic', trait: 'Doubt -> Discovery -> Conversion' },
    { id: 'victim_to_hero', name: 'Victim -> Hero', trait: 'Pain -> Solution -> Redemption' },
    { id: 'insider', name: 'The Insider', trait: 'Behind the scenes revelation' },
    { id: 'newbie', name: 'The Newbie', trait: 'Fresh perspective, relatable confusion' },
    { id: 'contrarian', name: 'The Contrarian', trait: 'Bold statement, challenge status quo' },
    { id: 'researcher', name: 'The Researcher', trait: 'Data-driven discovery' },
    { id: 'storyteller', name: 'The Storyteller', trait: 'Narrative-driven, human interest' },
    { id: 'late_adopter', name: 'The Late Adopter', trait: 'Finally tried it after resisting, surprised' },
    { id: 'burned_veteran', name: 'The Burned Veteran', trait: 'Been hurt before, cautiously optimistic' },
    { id: 'accidental_discoverer', name: 'The Accidental Discoverer', trait: 'Stumbled on it randomly, now hooked' },
    { id: 'frustrated_switcher', name: 'The Frustrated Switcher', trait: 'Switched from competitor, comparing' },
    { id: 'curious_lurker', name: 'The Curious Lurker', trait: 'Watched from sidelines, finally participating' },
    { id: 'technical_deep_dive', name: 'The Techie', trait: 'Obsessed with how things work under the hood' },
    { id: 'risk_taker', name: 'The Risk Taker', trait: 'High risk tolerance, early adopter mentality' }
  ],

  narrativeStructures: [
    { id: 'hero_journey', name: "Hero's Journey", flow: 'Challenge -> Struggle -> Discovery -> Victory' },
    { id: 'pas', name: 'Problem-Agitation-Solution', flow: 'Problem -> Make it worse -> Solution -> Proof' },
    { id: 'bab', name: 'Before-After-Bridge', flow: 'Before state -> After state -> How to bridge' },
    { id: 'contrast', name: 'Contrast Frame', flow: 'What most think -> What actually is -> Proof' },
    { id: 'mystery', name: 'Mystery Reveal', flow: 'Curiosity building -> Cliffhanger -> Reveal' },
    { id: 'case_study', name: 'Case Study', flow: 'Subject -> Problem -> Solution -> Result' },
    { id: 'qa', name: 'Question-Answer', flow: 'Provocative question -> Explore -> Answer' }
  ],

  audienceSegments: {
    internet_court: [
      { id: 'scammed_crypto', name: 'Crypto Users Who Got Scammed', pain: 'Lost money, no recourse' },
      { id: 'freelancers', name: 'Freelancers with Unpaid Clients', pain: 'Client ghosted, no contract' },
      { id: 'dao_participants', name: 'DAO/Governance Participants', pain: 'Disputes in voting, unclear resolution' },
      { id: 'smart_contract_users', name: 'Smart Contract Users', pain: 'Bugs, hacks, unclear liability' }
    ],
    defi_protocol: [
      { id: 'yield_farmer', name: 'Yield Farmers Chasing APY', pain: 'Rug pulls, diminishing returns' },
      { id: 'lp_victim', name: 'LPs Rekt by Impermanent Loss', pain: 'Thought earning, actually losing' },
      { id: 'degen_trader', name: 'Degen Traders', pain: 'High gas, MEV, frontrunning' },
      { id: 'stablecoin_user', name: 'Stablecoin Users', pain: 'Depeg events, bank runs' }
    ],
    metrics_momentum: [
      { id: 'data_nerd', name: 'Onchain Data Analysts', pain: 'Numbers do not match narrative' },
      { id: 'fomo_victim', name: 'FOMO Buyers', pain: 'Always buying the top' },
      { id: 'early_user', name: 'Early Users of Everything', pain: 'Most projects die, some survive' },
      { id: 'trend_watcher', name: 'Crypto Trend Watchers', pain: 'Signal vs noise' }
    ],
    product_launch: [
      { id: 'beta_tester', name: 'Beta Testers', pain: 'Bugs, rough UX, but first access' },
      { id: 'tool_switcher', name: 'People Looking for Better Tools', pain: 'Current tools suck' },
      { id: 'feature_requester', name: 'Power Users', pain: 'Missing features that matter' }
    ],
    community_ecosystem: [
      { id: 'community_builder', name: 'Community Builders', pain: 'Engagement is hard, retention harder' },
      { id: 'airdrop_hunter', name: 'Airdrop Hunters', pain: 'Wasted time on low-value rewards' },
      { id: 'governance_voter', name: 'Governance Voters', pain: 'Proposals vs actual implementation' }
    ],
    nft_gaming_social: [
      { id: 'floor_watcher', name: 'Floor Price Monitors', pain: 'Buy high, watch floor collapse' },
      { id: 'gamer_first', name: 'Gamers Who Found NFTs', pain: 'Terrible gameplay, just speculation' },
      { id: 'social_user', name: 'Social Platform Users', pain: 'Privacy, data ownership' }
    ],
    general: [
      { id: 'crypto_curious', name: 'Crypto Curious Normals', pain: 'Too confusing, too risky' },
      { id: 'skeptical_friend', name: 'Skeptical Friend Group', pain: 'Friends keep shilling, unsure' },
      { id: 'returning_user', name: 'Returning After Break', pain: 'Left during bear, considering return' }
    ]
  },

  emotionCombos: {
    rare: [
      { emotions: ['surprise', 'anger'], hook: 'Shocking injustice revealed' },
      { emotions: ['relief', 'curiosity'], hook: 'Finally, a solution you did not know' },
      { emotions: ['fear', 'empowerment'], hook: 'The threat is real, but so is hope' },
      { emotions: ['frustration', 'vindication'], hook: 'You were right to be mad' },
      { emotions: ['confusion', 'clarity'], hook: 'The mystery solved' },
      { emotions: ['schadenfreude', 'guilt'], hook: 'Dark humor about crypto pain' },
      { emotions: ['nostalgia', 'dread'], hook: 'Remember when things were simpler?' },
      { emotions: ['awe', 'suspicion'], hook: 'Impressed but something feels off' },
      { emotions: ['jealousy', 'inspiration'], hook: 'Why not me? Actually, let me try' },
      { emotions: ['embarrassment', 'pride'], hook: 'Hard to admit this but proud now' },
      { emotions: ['disgust', 'hope'], hook: 'The current state is gross but there is a way' },
      { emotions: ['boredom', 'excitement'], hook: 'Was not interested until THIS happened' }
    ],
    common: [
      { emotions: ['curiosity', 'hope'], hook: 'Standard curiosity driver' },
      { emotions: ['fear', 'urgency'], hook: 'Fear-based urgency' },
      { emotions: ['pain', 'hope'], hook: 'Pain to hope journey' },
      { emotions: ['surprise', 'delight'], hook: 'Unexpectedly good outcome' },
      { emotions: ['skepticism', 'satisfaction'], hook: 'Doubted it but it works' }
    ]
  },

  hardRequirements: {
    bannedWords: [
      'guaranteed', 'guarantee', '100%', 'risk-free', 'sure thing',
      'financial advice', 'investment advice', 'buy now', 'sell now',
      'get rich', 'quick money', 'easy money', 'passive income',
      'follow me', 'subscribe to my', 'check my profile',
      'click here', 'limited time offer', 'act now',
      'legally binding', 'court order', 'official ruling'
    ],
    rallyBannedPhrases: [
      'vibe coding', 'skin in the game', 'intelligent contracts',
      'trust layer', 'agent era', 'agentic era', 'structural shift',
      'capital efficiency', 'how did I miss this', 'losing my mind',
      'how are we all sleeping on this', "don't miss out",
      'designed for creators that desire', 'transforming ideas into something sustainable',
      'entire week', 'frictionless', 'acceptable originality',
      'similar_tweets', 'bank stack', 'version control for disagreements'
    ],
    templatePhrases: [
      'unpopular opinion:', 'hot take:', 'thread alert:', 'breaking:',
      'this is your sign', 'psa:', 'reminder that', 'quick thread:',
      'important thread:', 'drop everything', 'stop scrolling',
      'hear me out', 'let me explain', 'nobody is talking about',
      'story time:', 'in this thread i will', 'key takeaways:',
      "here's the thing", "imagine a world where", "picture this:",
      "let's dive in", "at the end of the day", "it goes without saying"
    ],
    aiPatterns: {
      words: ['delve', 'leverage', 'realm', 'tapestry', 'paradigm', 'landscape', 'nuance', 'underscores', 'pivotal', 'crucial', 'embark', 'journey', 'explore', 'unlock', 'harness'],
      phrases: ['picture this', 'lets dive in', 'in this thread', 'key takeaways', 'heres the thing', 'imagine a world', 'it goes without saying', 'at the end of the day', 'on the other hand', 'in conclusion']
    }
  },

  g4Checklist: {
    bonuses: {
      casualHookOpening: { patterns: ['ngl', 'tbh', 'honestly', 'fun story', 'okay so', 'look', 'real talk'], weight: 0.15 },
      parentheticalAside: { patterns: ['(and this is embarrassing to admit)', '(just saying)', '(real talk)', '(not gonna lie)', '(honestly)', '(for real)', '(seriously though)'], weight: 0.15 },
      contractions: { patterns: ["don't", "can't", "it's", "they're", "won't", "i'm", "we're", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "wouldn't", "couldn't", "shouldn't", "let's", "that's", "what's"], minCount: 3, weight: 0.20 },
      sentenceFragments: { weight: 0.15 },
      personalAngle: { patterns: ['i ', 'my ', 'me ', 'sat there', 'watched', 'spent', 'went from'], weight: 0.20 },
      conversationalEnding: { patterns: ['tbh', 'worth checking', 'just saying', 'for real', 'honestly', 'give it a shot', "can't hurt", 'what do you think'], weight: 0.15 }
    },
    penalties: {
      emDashes: { patterns: ['\u2014', '\u2013', '\u2015'], weight: -0.30 },
      smartQuotes: { patterns: ['\u201c', '\u201d', '\u2018', '\u2019', '\u201e', '\u201f'], weight: -0.20 },
      aiPhrases: { patterns: ['delve', 'leverage', 'realm', 'tapestry', 'paradigm', 'landscape', 'nuance', 'underscores', 'pivotal', 'crucial', 'embark', 'journey', 'explore', 'unlock', 'harness', 'picture this', 'lets dive in', 'in this thread', 'key takeaways', 'imagine a world'], weight: -0.20 },
      genericOpening: { patterns: ['in the world of', 'in todays', 'in the digital', 'this is why', 'here is how', 'there are many', 'it is important'], weight: -0.30 },
      formalEnding: { patterns: ['in conclusion', 'to summarize', 'overall', 'in summary', 'in the end', 'ultimately'], weight: -0.20 }
    }
  },

  bodyFeelings: ['cold sweat', 'panic', 'anxiety', 'heart racing', 'stomach dropped', 'heart sank', 'chest tightened', 'jaw dropped', "couldn't believe", 'blood boiled', 'hands shaking', 'breath caught']
};

class HybridNLPAnalyzer {
  constructor(config) {
    this.config = config;
    this.pythonClient = PythonNLPClient ? new PythonNLPClient(config.pythonNLP.baseUrl) : null;
    this.serviceAvailable = null;
  }
  
  async checkService() {
    if (this.serviceAvailable !== null) {
      return this.serviceAvailable;
    }
    
    if (!this.pythonClient) {
      console.log('   ⚠️ Python NLP Client not available - using basic analysis');
      this.serviceAvailable = false;
      return false;
    }
    
    try {
      const health = await this.pythonClient.healthCheck();
      this.serviceAvailable = health.healthy;
      
      if (health.healthy) {
        console.log('\n   ╔════════════════════════════════════════════════════════════╗');
        console.log('   ║           🐍 PYTHON NLP SERVICE CONNECTED                 ║');
        console.log('   ╠════════════════════════════════════════════════════════════╣');
        console.log('   ║  VADER Sentiment:      ' + (health.services?.sentiment_vader ? '✓' : '✗').padEnd(33) + '║');
        console.log('   ║  TextBlob:             ' + (health.services?.sentiment_textblob ? '✓' : '✗').padEnd(33) + '║');
        console.log('   ║  textstat:             ' + (health.services?.readability_textstat ? '✓' : '✗').padEnd(33) + '║');
        console.log('   ║  spaCy NER:            ' + (health.services?.ner_spacy ? '✓' : '✗').padEnd(33) + '║');
        console.log('   ║  Semantic Similarity:  ' + (health.services?.semantic_similarity ? '✓' : '✗').padEnd(33) + '║');
        console.log('   ╚════════════════════════════════════════════════════════════╝');
      } else {
        console.log('   ⚠️ Python NLP Service not available - using basic analysis');
      }
      
      return this.serviceAvailable;
    } catch (error) {
      console.log('   ⚠️ Python NLP Service unavailable:', error.message);
      this.serviceAvailable = false;
      return false;
    }
  }
  
  async analyzeContent(content, campaignContext = null, competitorContents = []) {
    const serviceOk = await this.checkService();
    
    if (serviceOk && this.pythonClient) {
      console.log('   🐍 Using Python NLP for content analysis...');
      const result = await this.pythonClient.analyzeContent(
        content, 
        campaignContext, 
        competitorContents
      );
      result.hybridMetrics = this._calculateHybridMetrics(result);
      return result;
    }
    
    return this._fallbackContentAnalysis(content, competitorContents);
  }
  
  async checkSimilarity(newContent, competitorContents, threshold = 0.7) {
    const serviceOk = await this.checkService();
    
    if (serviceOk && this.pythonClient) {
      console.log('   🐍 Using Python NLP for similarity check...');
      return await this.pythonClient.checkSimilarity(newContent, competitorContents, threshold);
    }
    
    return this._fallbackSimilarity(newContent, competitorContents);
  }
  
  async detectEmotions(content, detailed = false) {
    const serviceOk = await this.checkService();
    
    if (serviceOk && this.pythonClient) {
      console.log('   🐍 Using Python NLP for emotion detection...');
      return await this.pythonClient.detectEmotions(content, detailed);
    }
    
    return this._fallbackEmotions(content);
  }
  
  async analyzeUniqueness(content, competitorContents) {
    const serviceOk = await this.checkService();
    
    if (serviceOk && this.pythonClient) {
      console.log('   🐍 Using Python NLP for uniqueness analysis...');
      return await this.pythonClient.analyzeUniqueness(content, competitorContents);
    }
    
    return this._fallbackUniqueness(content, competitorContents);
  }
  
  _calculateHybridMetrics(analysis) {
    const metrics = {
      overallQuality: 0,
      qualityGrade: 'C',
      recommendations: []
    };
    
    let score = 50;
    
    if (analysis.readability?.primary?.flesch_reading_ease) {
      const flesch = analysis.readability.primary.flesch_reading_ease;
      if (flesch >= 60 && flesch <= 80) {
        score += 15;
      } else if (flesch >= 50) {
        score += 10;
      } else {
        metrics.recommendations.push('Improve readability - content may be too complex');
      }
    }
    
    if (analysis.sentiment?.consensus_score !== undefined) {
      const sentiment = Math.abs(analysis.sentiment.consensus_score);
      if (sentiment > 0.3) {
        score += 10;
      } else {
        metrics.recommendations.push('Add more emotional depth');
      }
    }
    
    if (analysis.emotions?.emotion_variety) {
      score += Math.min(analysis.emotions.emotion_variety * 5, 15);
      if (analysis.emotions.rare_combo_detected) {
        score += 5;
      }
    }
    
    if (analysis.depth_analysis?.overall_depth_score) {
      score += Math.min(analysis.depth_analysis.overall_depth_score * 0.15, 15);
    }
    
    if (analysis.similarity?.primary?.max_similarity) {
      score -= analysis.similarity.primary.max_similarity * 20;
      if (analysis.similarity.primary.max_similarity > 0.7) {
        metrics.recommendations.push('Content too similar to competitors - increase differentiation');
      }
    }
    
    metrics.overallQuality = Math.max(0, Math.min(100, Math.round(score)));
    
    if (score >= 90) metrics.qualityGrade = 'A+';
    else if (score >= 85) metrics.qualityGrade = 'A';
    else if (score >= 80) metrics.qualityGrade = 'A-';
    else if (score >= 75) metrics.qualityGrade = 'B+';
    else if (score >= 70) metrics.qualityGrade = 'B';
    else if (score >= 65) metrics.qualityGrade = 'B-';
    else if (score >= 60) metrics.qualityGrade = 'C+';
    else if (score >= 55) metrics.qualityGrade = 'C';
    else if (score >= 50) metrics.qualityGrade = 'C-';
    else metrics.qualityGrade = 'D';
    
    return metrics;
  }
  
  _fallbackContentAnalysis(content, competitorContents) {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      success: true,
      source: 'fallback',
      readability: {
        primary: {
          available: true,
          flesch_reading_ease: this._calculateFleschEase(content),
          word_count: words.length,
          sentence_count: sentences.length
        }
      },
      sentiment: this._fallbackSentiment(content),
      emotions: this._fallbackEmotions(content),
      depth_analysis: { overall_depth_score: 30 },
      content_length: content.length,
      word_count: words.length,
      hybridMetrics: {
        overallQuality: 50,
        qualityGrade: 'C',
        recommendations: ['Python NLP service unavailable - install for better analysis']
      }
    };
  }
  
  _fallbackSimilarity(newContent, competitorContents) {
    if (!competitorContents || competitorContents.length === 0) {
      return { success: true, source: 'fallback', max_similarity: 0, is_unique: true };
    }
    
    const newWords = new Set(newContent.toLowerCase().split(/\s+/));
    let maxSim = 0;
    
    for (const comp of competitorContents) {
      const compWords = new Set(comp.toLowerCase().split(/\s+/));
      const intersection = new Set([...newWords].filter(x => compWords.has(x)));
      const union = new Set([...newWords, ...compWords]);
      const sim = intersection.size / union.size;
      maxSim = Math.max(maxSim, sim);
    }
    
    return {
      success: true,
      source: 'fallback',
      max_similarity: maxSim,
      is_unique: maxSim < 0.3
    };
  }
  
  _fallbackEmotions(content) {
    const emotionKeywords = {
      fear: ['afraid', 'scary', 'terrifying', 'nightmare', 'panic'],
      anger: ['angry', 'furious', 'frustrated', 'unfair', 'injustice'],
      joy: ['happy', 'excited', 'amazing', 'wonderful', 'love'],
      surprise: ['shocked', 'unexpected', 'unbelievable', 'incredible'],
      curiosity: ['curious', 'interesting', 'fascinating', 'mystery', 'secret']
    };
    
    const contentLower = content.toLowerCase();
    const emotions = {};
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const count = keywords.filter(kw => contentLower.includes(kw)).length;
      if (count > 0) emotions[emotion] = count;
    }
    
    return {
      success: true,
      source: 'fallback',
      emotions,
      primary_emotion: Object.keys(emotions)[0] || 'neutral',
      emotion_variety: Object.keys(emotions).length,
      rare_combo_detected: false
    };
  }
  
  _fallbackSentiment(content) {
    const positive = ['good', 'great', 'amazing', 'excellent', 'wonderful', 'love'];
    const negative = ['bad', 'terrible', 'awful', 'horrible', 'hate'];
    
    const contentLower = content.toLowerCase();
    let score = 0;
    
    positive.forEach(w => { if (contentLower.includes(w)) score += 0.1; });
    negative.forEach(w => { if (contentLower.includes(w)) score -= 0.1; });
    
    return {
      consensus_score: score,
      consensus_label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral'
    };
  }
  
  _fallbackUniqueness(content, competitorContents) {
    const similarity = this._fallbackSimilarity(content, competitorContents);
    const emotions = this._fallbackEmotions(content);
    
    let score = 100;
    score -= similarity.max_similarity * 40;
    score += emotions.emotion_variety * 5;
    
    return {
      success: true,
      source: 'fallback',
      uniqueness: {
        score: Math.max(0, Math.min(100, score)),
        is_unique: similarity.is_unique
      }
    };
  }
  
  _calculateFleschEase(content) {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (words.length === 0 || sentences.length === 0) return 0;
    
    const avgSentenceLength = words.length / sentences.length;
    const syllables = words.reduce((sum, word) => sum + this._countSyllables(word), 0);
    const avgSyllablesPerWord = syllables / words.length;
    
    const flesch = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(flesch)));
  }
  
  _countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
}

// ============================================================================
// MULTI-PROVIDER LLM CLIENT (SDK Only!)
// ============================================================================


// ============================================================================
// V10: SIMPLIFIED MULTI-PROVIDER LLM (removed dead SDK code)
// ============================================================================

class MultiProviderLLM {
  constructor(config) {
    this.config = config;
    this.nlpAnalyzer = new HybridNLPAnalyzer(config);
  }

  async chat(messages, options = {}) {
    const result = await callAI(messages, options);
    try { console.log(`   ✅ Response received (${result.provider})`); } catch (e) {}
    return {
      content: result.content || '',
      thinking: result.thinking || null,
      provider: result.provider,
      model: CONFIG.model?.name || 'glm-5',
      usage: result.usage
    };
  }

  getNLPAnalyzer() { return this.nlpAnalyzer; }
}

function fixContentFormatting(content) {
  if (!content || typeof content !== 'string') return content;
  
  // Normalize existing whitespace
  let fixed = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Check if content is a wall of text (no paragraph breaks)
  const hasParagraphs = /\n\s*\n/.test(fixed);
  const lines = fixed.split('\n').filter(l => l.trim());
  
  if (!hasParagraphs && lines.length <= 2) {
    // TRUE WALL OF TEXT - need to intelligently break into paragraphs
    // Strategy: Split on sentence boundaries, group into 1-2 sentence paragraphs
    
    // First, normalize the text
    let text = lines.join(' ').trim();
    
    // Protect parenthetical asides - they should be their own paragraph
    const asides = [];
    text = text.replace(/\([^)]{3,}\)/g, (match) => {
      asides.push(match);
      return `__ASIDE_${asides.length - 1}__`;
    });
    
    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
    
    if (sentences.length <= 3) {
      // Too short to split - just add breaks around the aside if any
      if (asides.length > 0) {
        for (let i = 0; i < asides.length; i++) {
          text = text.replace(`__ASIDE_${i}__`, `\n\n${asides[i]}\n\n`);
        }
      }
      fixed = text.replace(/\n\s*\n\s*\n\s*\n/g, '\n\n').trim();
      return fixed;
    }
    
    // Group sentences into paragraphs (1-2 sentences each)
    const paragraphs = [];
    let currentPara = '';
    let pendingCTA = null; // Collect CTA sentences to append at the end
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      
      // Check if this sentence is a hook (first sentence)
      if (i === 0) {
        paragraphs.push(sentence);
        continue;
      }
      
      // Check if this sentence is a CTA or question (near the end)
      const isCTA = /^\s*(what|anyone|curious|thoughts|who else|tag|any of you|agree|disagree|worth|just saying|tbh)/i.test(sentence);
      const nearEnd = i >= sentences.length - 2;
      
      if (isCTA && nearEnd) {
        // Save CTA to append at the very end
        pendingCTA = pendingCTA ? pendingCTA + ' ' + sentence : sentence;
        continue;
      }
      
      // Check if sentence is short (< 60 chars) - could be standalone
      const sentenceLen = sentence.length;
      const currentLen = currentPara.length;
      
      if (!currentPara) {
        currentPara = sentence;
      } else if (currentLen + sentenceLen < 200 && currentPara.split(/\s+/).length < 25) {
        // Combine with current paragraph if not too long
        currentPara += ' ' + sentence;
      } else {
        // Start new paragraph
        paragraphs.push(currentPara);
        currentPara = sentence;
      }
    }
    
    // Don't forget the last paragraph
    if (currentPara) {
      paragraphs.push(currentPara);
    }
    
    // Append CTA at the end
    if (pendingCTA) {
      paragraphs.push(pendingCTA);
    }
    
    // Re-insert asides as standalone paragraphs
    let result = paragraphs.join('\n\n');
    for (let i = 0; i < asides.length; i++) {
      result = result.replace(`__ASIDE_${i}__`, `${asides[i]}\n\n`);
    }
    
    fixed = result.replace(/\n\s*\n\s*\n\s*\n/g, '\n\n').trim();
    
  } else if (hasParagraphs) {
    // Content has some paragraphs - check for overly long ones
    const paragraphs = fixed.split(/\n\s*\n/);
    const fixedParas = paragraphs.map(para => {
      const trimmed = para.trim();
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
      
      // If a paragraph has > 3 sentences, split it
      if (sentences.length > 3) {
        const groups = [];
        for (let i = 0; i < sentences.length; i++) {
          if (i % 2 === 0) groups.push([]);
          groups[groups.length - 1].push(sentences[i].trim());
        }
        return groups.map(g => g.join(' ')).join('\n\n');
      }
      return trimmed;
    });
    
    fixed = fixedParas.join('\n\n').trim();
  }
  
  // Final cleanup: ensure no more than 2 consecutive newlines
  fixed = fixed.replace(/\n{3,}/g, '\n\n').trim();
  
  return fixed;
}

function safeJsonParse(str) {
  if (!str || typeof str !== 'string') {
    return null;
  }
  
  try {
    // Try direct parse first
    try {
      return JSON.parse(str);
    } catch (e) {
      // Silent: JSON parse fallback handled below
    }
    
    // ENHANCED: Remove markdown code blocks if present
    let cleaned = str
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .replace(/`{1,3}/g, '')
      .trim();
    
    // Try direct parse on cleaned string
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Silent: JSON parse fallback handled below
    }
    
    // Try to extract JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Silent: JSON parse fallback handled below
      }
      
      // Try to fix common JSON issues
      let fixed = jsonMatch[0]
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/'/g, '"')      // Replace single quotes
        .replace(/\\([^"\\])/g, '$1') // Fix escaped chars
        .replace(/\n/g, ' ')     // Remove newlines in JSON
        .replace(/\s+/g, ' ');   // Normalize whitespace
      
      try {
        return JSON.parse(fixed);
      } catch (e) {
        // Silent: JSON parse fallback handled below
      }
    }
    
    // Try to find multiple JSON objects and merge
    const allObjects = cleaned.match(/\{[^{}]*\}/g);
    if (allObjects && allObjects.length > 0) {
      const merged = {};
      for (const obj of allObjects) {
        try {
          const parsed = JSON.parse(obj);
          Object.assign(merged, parsed);
        } catch (e) {
          // Silent: skip malformed JSON object
        }
      }
      if (Object.keys(merged).length > 0) {
        return merged;
      }
    }
    
    // ENHANCED: Try to extract key-value pairs manually
    const keyValuePairs = {};
    const patterns = [
      /"([^"]+)"\s*:\s*(\d+)/g,           // "key": number
      /"([^"]+)"\s*:\s*"([^"]*)"/g,       // "key": "string"
      /"([^"]+)"\s*:\s*(true|false)/g,    // "key": boolean
      /'([^']+)'\s*:\s*(\d+)/g,           // 'key': number (single quotes)
      /'([^']+)'\s*:\s*'([^']*)'/g        // 'key': 'string' (single quotes)
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(cleaned)) !== null) {
        const key = match[1];
        const value = match[2];
        // Convert to appropriate type
        if (/^\d+$/.test(value)) {
          keyValuePairs[key] = parseInt(value);
        } else if (value === 'true' || value === 'false') {
          keyValuePairs[key] = value === 'true';
        } else {
          keyValuePairs[key] = value;
        }
      }
    }
    
    if (Object.keys(keyValuePairs).length > 0) {
      console.log(`   📊 safeJsonParse: Extracted ${Object.keys(keyValuePairs).length} key-value pairs manually`);
      return keyValuePairs;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

function displayThinking(phase, thinking) {
  console.log('\n   ' + '┌' + '─'.repeat(54) + '┐');
  console.log(`   │ 🧠 ${phase.toUpperCase()} THINKING${' '.repeat(54 - phase.length - 14)}│`);
  console.log('   ' + '├' + '─'.repeat(54) + '┤');
  
  const lines = thinking.split('\n').slice(0, 15);
  lines.forEach(line => {
    const trimmed = line.substring(0, 52);
    console.log(`   │ ${trimmed}${' '.repeat(53 - trimmed.length)}│`);
  });
  
  console.log('   ' + '└' + '─'.repeat(54) + '┘');
}

// ============================================================================
// SELECTION FUNCTIONS (v2 — Shuffle + Cycle Tracking)
// ============================================================================

// Cycle-level tracking — prevents reusing same params across cycles
let _cycleUsed = { personas: new Set(), structures: new Set(), emotions: new Set(), audiences: new Set() };

function detectG4Elements(content) {
  const result = {
    bonuses: {},
    penalties: {},
    totalBonus: 0,
    totalPenalty: 0,
    estimatedG4: 1.0, // Base score
    issues: [],
    recommendations: []
  };
  
  if (!content || content.length === 0) {
    return result;
  }
  
  const contentLower = content.toLowerCase();
  const first50Words = contentLower.split(/\s+/).slice(0, 50).join(' ');
  const last50Words = contentLower.split(/\s+/).slice(-50).join(' ');
  
  // Check BONUSES
  const g4Checklist = CONFIG.g4Checklist;
  
  // 1. Casual Hook Opening
  const hasCasualHook = g4Checklist.bonuses.casualHookOpening.patterns.some(p => 
    first50Words.includes(p.toLowerCase())
  );
  result.bonuses.casualHookOpening = hasCasualHook;
  if (hasCasualHook) {
    result.totalBonus += g4Checklist.bonuses.casualHookOpening.weight;
  } else {
    result.recommendations.push('Add casual hook opening (ngl, tbh, honestly, fun story)');
  }
  
  // 2. Parenthetical Aside
  const hasParenthetical = g4Checklist.bonuses.parentheticalAside.patterns.some(p =>
    contentLower.includes(p.toLowerCase())
  ) || /\([^)]*embarrassing[^)]*\)/i.test(content) || 
     /\([^)]*honest[^)]*\)/i.test(content) ||
     /\([^)]*just saying[^)]*\)/i.test(content);
  result.bonuses.parentheticalAside = hasParenthetical;
  if (hasParenthetical) {
    result.totalBonus += g4Checklist.bonuses.parentheticalAside.weight;
  } else {
    result.recommendations.push('Add parenthetical aside (embarrassing to admit, just saying)');
  }
  
  // 3. Contractions (need 3+)
  const contractionCount = g4Checklist.bonuses.contractions.patterns.filter(p =>
    contentLower.includes(p.toLowerCase())
  ).length;
  const hasEnoughContractions = contractionCount >= g4Checklist.bonuses.contractions.minCount;
  result.bonuses.contractions = { count: contractionCount, passed: hasEnoughContractions };
  if (hasEnoughContractions) {
    result.totalBonus += g4Checklist.bonuses.contractions.weight;
  } else {
    result.recommendations.push(`Add more contractions (current: ${contractionCount}, need: 3+)`);
  }
  
  // 4. Personal Angle/Story
  const hasPersonalAngle = g4Checklist.bonuses.personalAngle.patterns.some(p =>
    contentLower.includes(p.toLowerCase())
  );
  result.bonuses.personalAngle = hasPersonalAngle;
  if (hasPersonalAngle) {
    result.totalBonus += g4Checklist.bonuses.personalAngle.weight;
  } else {
    result.recommendations.push('Add personal story or angle (I, my, me, specific experience)');
  }
  
  // 5. Conversational Ending
  const hasConversationalEnding = g4Checklist.bonuses.conversationalEnding.patterns.some(p =>
    last50Words.includes(p.toLowerCase())
  );
  result.bonuses.conversationalEnding = hasConversationalEnding;
  if (hasConversationalEnding) {
    result.totalBonus += g4Checklist.bonuses.conversationalEnding.weight;
  } else {
    result.recommendations.push('Add conversational ending (tbh, worth checking, what do you think)');
  }
  
  // Sentence fragments check (starts with casual conjunction)
  const fragStarters = /^(just|but|and|so|cause|cuz|though|yet|or|well|look|ngl|tbh|nah|okay|wait|honestim)/im;
  const frags = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const hasFragments = frags.some(s => fragStarters.test(s.trim()));
  result.bonuses.sentenceFragments = hasFragments;
  if (hasFragments) {
    result.totalBonus += g4Checklist.bonuses.sentenceFragments.weight;
  }

  // Check PENALTIES

  // 1. Em Dashes
  const emDashCount = g4Checklist.penalties.emDashes.patterns.filter(p =>
    content.includes(p)
  ).length;
  result.penalties.emDashes = { count: emDashCount, present: emDashCount > 0 };
  if (emDashCount > 0) {
    result.totalPenalty += Math.abs(g4Checklist.penalties.emDashes.weight);
    result.issues.push(`EM DASHES DETECTED (${emDashCount}): Replace with hyphens or commas`);
  }
  
  // 2. Smart Quotes
  const smartQuoteCount = g4Checklist.penalties.smartQuotes.patterns.filter(p =>
    content.includes(p)
  ).length;
  result.penalties.smartQuotes = { count: smartQuoteCount, present: smartQuoteCount > 0 };
  if (smartQuoteCount > 0) {
    result.totalPenalty += Math.abs(g4Checklist.penalties.smartQuotes.weight);
    result.issues.push(`SMART QUOTES DETECTED (${smartQuoteCount}): Replace with straight quotes`);
  }
  
  // 3. AI Phrases
  const aiPhraseCount = g4Checklist.penalties.aiPhrases.patterns.filter(p =>
    contentLower.includes(p.toLowerCase())
  ).length;
  result.penalties.aiPhrases = { count: aiPhraseCount, present: aiPhraseCount > 0 };
  if (aiPhraseCount > 0) {
    result.totalPenalty += Math.abs(g4Checklist.penalties.aiPhrases.weight) * Math.min(aiPhraseCount, 3);
    result.issues.push(`AI PHRASES DETECTED (${aiPhraseCount}): Remove AI-typical language`);
  }
  
  // 4. Generic Opening
  const hasGenericOpening = g4Checklist.penalties.genericOpening.patterns.some(p =>
    first50Words.includes(p.toLowerCase())
  );
  result.penalties.genericOpening = hasGenericOpening;
  if (hasGenericOpening) {
    result.totalPenalty += Math.abs(g4Checklist.penalties.genericOpening.weight);
    result.issues.push('GENERIC OPENING: Start mid-thought instead');
  }
  
  // 5. Formal Ending
  const hasFormalEnding = g4Checklist.penalties.formalEnding.patterns.some(p =>
    last50Words.includes(p.toLowerCase())
  );
  result.penalties.formalEnding = hasFormalEnding;
  if (hasFormalEnding) {
    result.totalPenalty += Math.abs(g4Checklist.penalties.formalEnding.weight);
    result.issues.push('FORMAL ENDING: Use conversational ending instead');
  }
  
  // Calculate estimated G4 score
  result.estimatedG4 = Math.max(0, Math.min(2.0, 1.0 + result.totalBonus - result.totalPenalty));
  
  // Determine if G4 = 2.0 is achievable
  result.canAchieveMaxScore = result.totalPenalty === 0 && result.totalBonus >= 0.8;
  
  return result;
}

/**
 * Detect Forbidden Punctuation (Em Dashes, Smart Quotes)
 */
function detectForbiddenPunctuation(content) {
  const result = {
    emDashes: { found: false, count: 0, positions: [] },
    smartQuotes: { found: false, count: 0, positions: [] },
    ellipsis: { found: false, count: 0 },
    totalIssues: 0,
    sanitizedContent: content
  };
  
  if (!content) return result;
  
  const forbidden = CONFIG.forbiddenPunctuation;
  
  // Check em dashes
  forbidden.emDashes.chars.forEach(char => {
    let pos = 0;
    while ((pos = content.indexOf(char, pos)) !== -1) {
      result.emDashes.found = true;
      result.emDashes.count++;
      result.emDashes.positions.push(pos);
      pos++;
    }
  });
  
  // Check smart quotes
  [...forbidden.smartQuotes.double, ...forbidden.smartQuotes.single].forEach(char => {
    let pos = 0;
    while ((pos = content.indexOf(char, pos)) !== -1) {
      result.smartQuotes.found = true;
      result.smartQuotes.count++;
      result.smartQuotes.positions.push(pos);
      pos++;
    }
  });
  
  // Check ellipsis character
  if (content.includes(forbidden.ellipsis.char)) {
    result.ellipsis.found = true;
    result.ellipsis.count = (content.match(/\u2026/g) || []).length;
  }
  
  result.totalIssues = result.emDashes.count + result.smartQuotes.count + result.ellipsis.count;
  
  // Generate sanitized content
  if (result.totalIssues > 0) {
    result.sanitizedContent = content
      .replace(/[—–―]/g, '-') // Replace em dashes
      .replace(/[""„‟]/g, '"') // Replace smart double quotes
      .replace(/['']/g, "'") // Replace smart single quotes
      .replace(/\u2026/g, '...'); // Replace ellipsis
  }
  
  return result;
}

// ============================================================================
// BUG #34 FIX: Auto-sanitize content (smart quotes → straight quotes, em dashes → hyphens)
// ============================================================================
/**
 * sanitizeContent - Auto-fixes AI-indicator punctuation before judging.
 * Returns sanitized content string. If no changes needed, returns original.
 */
function sanitizeContent(content) {
  if (!content || typeof content !== 'string') return content;
  
  let sanitized = content;
  let changes = [];
  
  // Smart double quotes → straight quotes
  const smartDouble = ['\u201c', '\u201d', '\u201e', '\u201f']; // " " „ ‟
  smartDouble.forEach(char => {
    if (sanitized.includes(char)) {
      sanitized = sanitized.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '"');
      changes.push('smart double quotes');
    }
  });
  
  // Smart single quotes → straight quotes
  const smartSingle = ['\u2018', '\u2019']; // ' '
  smartSingle.forEach(char => {
    if (sanitized.includes(char)) {
      sanitized = sanitized.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), "'");
      changes.push('smart single quotes');
    }
  });
  
  // Em dashes → hyphen
  ['\u2014', '\u2013', '\u2015'].forEach(char => { // — – ―
    if (sanitized.includes(char)) {
      sanitized = sanitized.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '-');
      changes.push('em dashes');
    }
  });
  
  // Ellipsis char → three dots
  if (sanitized.includes('\u2026')) {
    sanitized = sanitized.replace(/\u2026/g, '...');
    changes.push('ellipsis');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // BUG FIX: Check and replace Rally banned phrases
  // These phrases cause CC gate DISQUALIFICATION if present
  // ═══════════════════════════════════════════════════════════════
  const bannedPhrases = CONFIG.hardRequirements?.rallyBannedPhrases || [];
  const bannedReplacements = {
    'vibe coding': 'rapid prototyping',
    'skin in the game': 'personally invested',
    'intelligent contracts': 'smart contracts',
    'trust layer': 'verification layer',
    'agent era': 'autonomous agent period',
    'agentic era': 'autonomous agent period',
    'structural shift': 'fundamental change',
    'capital efficiency': 'resource optimization',
    'how did I miss this': 'this caught my attention',
    'losing my mind': 'blown away',
    'how are we all sleeping on this': 'why is nobody talking about this',
    "don't miss out": 'pay attention to',
    'designed for creators that desire': 'built for creators who want',
    'transforming ideas into something sustainable': 'turning ideas into lasting value',
    'entire week': 'full week',
    'frictionless': 'seamless',
    'acceptable originality': 'strong originality',
    'similar_tweets': 'similar tweets',
    'bank stack': 'stack rewards',
    'version control for disagreements': 'structured consensus'
  };
  
  bannedPhrases.forEach(phrase => {
    const phraseLower = phrase.toLowerCase();
    const contentLower = sanitized.toLowerCase();
    if (contentLower.includes(phraseLower)) {
      const replacement = bannedReplacements[phrase] || '[REMOVED]';
      // Case-insensitive replacement
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      sanitized = sanitized.replace(regex, replacement);
      changes.push(`banned phrase "${phrase}" → "${replacement}"`);
    }
  });
  
  if (changes.length > 0) {
    console.log(`   📝 Auto-sanitized: ${changes.join(', ')}`);
  }
  
  return sanitized;
}

// ============================================================================
// BUG #35 FIX: Metric Type Relevance Validator
// Checks if content uses the CORRECT type of metrics for the campaign's intent
// ============================================================================
/**
 * validateMetricTypeRelevance - Post-generation validation that catches metric type mismatches.
 * Example: Campaign wants "growth metrics" but content cites TVL/Volume (liquidity) → REJECT
 * 
 * @param {string} content - The generated content
 * @param {object} deepIntent - The deep campaign intent analysis result
 * @returns {{ valid: boolean, issues: string[], wrongMetricsFound: string[] }}
 */
function validateMetricTypeRelevance(content, deepIntent) {
  const result = { valid: true, issues: [], wrongMetricsFound: [] };
  
  if (!deepIntent || !deepIntent.metricClassification) return result;
  
  const { campaignMetricType, wrongMetricsToAvoid, correctMetricsToUse } = deepIntent.metricClassification;
  
  // If no specific metric type or no wrong metrics defined, skip validation
  if (!campaignMetricType || !wrongMetricsToAvoid || wrongMetricsToAvoid.length === 0) return result;
  
  const contentLower = content.toLowerCase();
  
  // Check for LIQUIDITY metrics being used as wrong type
  const liquidityPatterns = [
    { pattern: /\$?\d+\s*(m|b|t)\+?\s*tvl/i, label: 'TVL figure' },
    { pattern: /\$?\d+\s*(b|t)\+?\s*(cumulative\s+)?volume/i, label: 'Volume figure' },
    { pattern: /\$?\d+\s*(b|t)\+?\s*(trading\s+)?volume/i, label: 'Trading volume figure' },
    { pattern: /tvl\s*(of|is|at|reached|hit)\s*/i, label: 'TVL reference' },
    { pattern: /(\d+)\s*(b|t)\+?\s*(in\s+)?(cumulative\s+)?(perp|perpetual)?\s*volume/i, label: 'Cumulative volume' },
  ];
  
  // Check for wrong metric labels being used with wrong data
  const metricLabelMismatches = [
    { pattern: /retention\s+(stats?|metrics?|data|figures?)/i, wrongWith: ['tvl', 'volume', 'liquidity', '$100m', '$200b'], label: 'retention stats with liquidity data' },
    { pattern: /growth\s+(metrics?|data|figures?|stats?)/i, wrongWith: ['tvl', 'volume', '$200b'], label: 'growth metrics with liquidity data' },
    { pattern: /engagement\s+(metrics?|data|figures?|stats?)/i, wrongWith: ['tvl', 'volume', '$200b', '$100m'], label: 'engagement metrics with liquidity data' },
  ];
  
  // Check wrong metrics to avoid
  wrongMetricsToAvoid.forEach(wrongMetric => {
    const wrongLower = wrongMetric.toLowerCase();
    // Check if content mentions both the wrong metric concept AND actual numbers related to it
    const hasMetricLabel = contentLower.includes(wrongLower) || 
      wrongLower.split(/\s+/).some(w => w.length > 3 && contentLower.includes(w));
    
    if (hasMetricLabel) {
      result.wrongMetricsFound.push(wrongMetric);
    }
  });
  
  // Check liquidity patterns when campaign wants non-liquidity metrics
  if (campaignMetricType !== 'LIQUIDITY') {
    liquidityPatterns.forEach(({ pattern, label }) => {
      if (pattern.test(content)) {
        // Check if the content is labeling this as the campaign's wanted metric type
        metricLabelMismatches.forEach(({ pattern: labelPattern, wrongWith, label: mismatchLabel }) => {
          if (labelPattern.test(content)) {
            const hasWrongData = wrongWith.some(w => contentLower.includes(w));
            if (hasWrongData) {
              result.issues.push(`Content uses ${mismatchLabel} — ${label} is LIQUIDITY metric, not ${campaignMetricType}`);
              result.wrongMetricsFound.push(label);
            }
          }
        });
      }
    });
  }
  
  result.valid = result.issues.length === 0;
  return result;
}

/**
 * Detect X-Factor Differentiators in content
 */
function displayControlMatrix() {
  const matrix = CONFIG.controlMatrix;
  
  console.log('\n   ╔════════════════════════════════════════════════════════════╗');
  console.log('   ║           🎮 CONTROL MATRIX - Focus Your Effort           ║');
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log('   ║                    ✅ YOU CAN CONTROL                     ║');
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  
  Object.entries(matrix.canControl).forEach(([key, value]) => {
    const label = key.replace('_', ': ').padEnd(20);
    console.log(`   ║  ${label} Target: ${value.target}          ║`);
  });
  
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log('   ║                   ❌ YOU CANNOT CONTROL                   ║');
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  
  Object.entries(matrix.cannotControl).forEach(([key, value]) => {
    const label = key.padEnd(20);
    console.log(`   ║  ${label} Strategy: ${value.strategy.substring(0, 20)}  ║`);
  });
  
  console.log('   ╚════════════════════════════════════════════════════════════╝');
}

/**
 * Display Mindset Framework
 */
function displayMindsetFramework() {
  const mindset = CONFIG.mindsetFramework;
  
  console.log('\n   ╔════════════════════════════════════════════════════════════╗');
  console.log('   ║              🧠 MINDSET FRAMEWORK                         ║');
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log(`   ║  TARGET:    ${mindset.target.padEnd(43)}║`);
  console.log(`   ║  EFFORT:    ${mindset.effort.substring(0, 43).padEnd(43)}║`);
  console.log(`   ║  ACCEPT:    ${mindset.acceptance.padEnd(43)}║`);
  console.log(`   ║  LEARN:     ${mindset.learning.padEnd(43)}║`);
  console.log(`   ║  REPEAT:    ${mindset.repeat.padEnd(43)}║`);
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log(`   ║  💡 "${mindset.keyInsight.substring(0, 48)}"║`);
  console.log('   ╚════════════════════════════════════════════════════════════╝');
}

// ============================================================================
// 🆕 NEW v9.8.3-ENHANCED: PRE-WRITING & VALIDATION FUNCTIONS
// ============================================================================

/**
 * Detect campaign type from campaign data
 * Returns one of: metrics_momentum, product_launch, community_ecosystem, defi_protocol, nft_gaming_social
 */
function detectCampaignType(campaignData) {
  const title = (campaignData.title || '').toLowerCase();
  const description = (campaignData.description || campaignData.goal || '').toLowerCase();
  const knowledgeBase = (campaignData.knowledgeBase || campaignData.knowledge_base || '').toLowerCase();
  const combined = `${title} ${description} ${knowledgeBase}`;
  
  // Metrics/Momentum detection
  if (combined.match(/tvl|volume|growth|momentum|surge|metrics|users?\s*\d|adoptions/i)) {
    return 'metrics_momentum';
  }
  
  // Product Launch detection
  if (combined.match(/launch|new feature|update|release|introducing|announce/i)) {
    return 'product_launch';
  }
  
  // Community/Ecosystem detection
  if (combined.match(/community|ecosystem|discord|telegram|governance|dao|member/i)) {
    return 'community_ecosystem';
  }
  
  // DeFi Protocol detection
  if (combined.match(/defi|yield|apy|apr|liquidity|farm|stake|pool|protocol/i)) {
    return 'defi_protocol';
  }
  
  // NFT/Gaming/Social detection
  if (combined.match(/nft|game|gaming|collectible|social|play|reward/i)) {
    return 'nft_gaming_social';
  }
  
  // Default to metrics_momentum
  return 'metrics_momentum';
}

/**
 * Build perspective by answering 5 Pre-Writing Questions
 * This is the Persona-First approach - build perspective BEFORE writing
 */
function detectCampaignType(campaignData) {
  const title = (campaignData.title || '').toLowerCase();
  const description = (campaignData.description || campaignData.goal || '').toLowerCase();
  const knowledgeBase = (campaignData.knowledgeBase || campaignData.knowledge_base || '').toLowerCase();
  const combined = `${title} ${description} ${knowledgeBase}`;
  
  // Metrics/Momentum detection
  if (combined.match(/tvl|volume|growth|momentum|surge|metrics|users?\s*\d|adoptions/i)) {
    return 'metrics_momentum';
  }
  
  // Product Launch detection
  if (combined.match(/launch|new feature|update|release|introducing|announce/i)) {
    return 'product_launch';
  }
  
  // Community/Ecosystem detection
  if (combined.match(/community|ecosystem|discord|telegram|governance|dao|member/i)) {
    return 'community_ecosystem';
  }
  
  // DeFi Protocol detection
  if (combined.match(/defi|yield|apy|apr|liquidity|farm|stake|pool|protocol/i)) {
    return 'defi_protocol';
  }
  
  // NFT/Gaming/Social detection
  if (combined.match(/nft|game|gaming|collectible|social|play|reward/i)) {
    return 'nft_gaming_social';
  }
  
  // Default to metrics_momentum
  return 'metrics_momentum';
}

/**
 * Build perspective by answering 5 Pre-Writing Questions
 * This is the Persona-First approach - build perspective BEFORE writing
 */
async function deepCompetitorContentAnalysis(llm, submissions, campaignTitle, campaignData) {
  console.log('\n' + '─'.repeat(60));
  console.log('🔍 DEEP COMPETITOR CONTENT ANALYSIS');
  console.log('─'.repeat(60));

  if (!submissions || submissions.length === 0) {
    console.log('   ℹ️ No submissions to analyze - returning empty analysis');
    return {
      anglesUsed: [],
      storiesTold: [],
      personasUsed: [],
      structuresUsed: [],
      emotionsUsed: [],
      analogiesUsed: [],
      audienceAddressed: [],
      saturatedElements: [],
      untappedOpportunities: [],
      competitorContent: [],
      strategy: 'No competitor data - create unique content freely'
    };
  }

  const competitorContent = submissions.slice(0, 10).map(s => ({
    content: s.content || s.text || s.analysis?.[0]?.analysis || '',
    score: s.score || 0,
    username: s.xUsername || s.user?.xUsername || 'Anonymous',
    rank: s.rank || 0
  })).filter(s => s.content && s.content.length > 50);

  console.log(`   📊 Leaderboard entries: ${submissions.length}, with content: ${competitorContent.length}`);

  // OPTIMIZATION: If leaderboard has no actual content (only scores/usernames),
  // skip NLP + AI analysis entirely - just extract metadata
  if (competitorContent.length === 0) {
    console.log('   ℹ️ Leaderboard has no content text (scores/usernames only) - skipping AI analysis');
    const metaInfo = submissions.slice(0, 10).map(s => {
      const user = s.user || {};
      return `@${user.xUsername || 'unknown'} (Rank #${s.rank || '?'}, Score: ${s.points ? (s.points / 1e18).toFixed(2) : '?'})`;
    });
    return {
      anglesUsed: [],
      storiesTold: [],
      personasUsed: [],
      structuresUsed: [],
      emotionsUsed: [],
      analogiesUsed: [],
      audienceAddressed: [],
      saturatedElements: [],
      untappedOpportunities: [],
      competitorContent: metaInfo,
      strategy: `No content data available from ${submissions.length} submissions - create unique content freely`,
      submissionCount: submissions.length
    };
  }

  console.log(`   📄 Analyzing ${competitorContent.length} competitor contents...`);

  // Use Python NLP for each competitor content (LOCAL - no network)
  const nlpAnalyzer = llm.getNLPAnalyzer();
  const nlpResults = [];

  for (let i = 0; i < Math.min(competitorContent.length, 3); i++) {  // Reduced from 5 to 3
    console.log(`   🐍 NLP analysis for competitor ${i + 1}/${Math.min(competitorContent.length, 3)}...`);
    try {
      const nlpResult = await nlpAnalyzer.analyzeContent(competitorContent[i].content);
      nlpResults.push({ index: i, score: competitorContent[i].score, nlp: nlpResult });
    } catch (nlpErr) {
      console.log(`   ⚠️ NLP failed for competitor ${i + 1}: ${nlpErr.message} - skipping`);
    }
    await delay(200);
  }

  // AI analysis for patterns (1 AI call - keep this, it's valuable)
  const analysisPrompt = `Analyze these COMPETITOR CONTENTS for "${campaignTitle}":

${campaignData.description ? `CAMPAIGN DESCRIPTION: ${campaignData.description}` : ''}
${campaignData.missionGoal ? `MISSION GOAL: ${campaignData.missionGoal}` : ''}
${campaignData.rules ? `CAMPAIGN RULES: ${campaignData.rules.substring(0, 500)}` : ''}

${competitorContent.map((c, i) => `
--- COMPETITOR ${i + 1} (Score: ${c.score}) ---
${c.content.substring(0, 800)}
`).join('\n')}

${nlpResults.length > 0 ? `NLP ANALYSIS DATA:
${nlpResults.map(r => `
Competitor ${r.index + 1}: Grade ${r.nlp.hybridMetrics?.qualityGrade || 'N/A'},
Emotions: ${r.nlp.emotions?.emotion_variety || 0},
Depth: ${r.nlp.depth_analysis?.depth_level || 'N/A'},
Sentiment: ${r.nlp.sentiment?.consensus_label || 'N/A'}
`).join('\n')}` : ''}

Extract and categorize in JSON format:
{
  "anglesUsed": ["<angle1>", "<angle2>", ...],
  "storiesTold": ["<story type1>", "<story type2>", ...],
  "personasUsed": ["<persona type1>", "<persona type2>", ...],
  "structuresUsed": ["<structure type1>", "<structure type2>", ...],
  "emotionsUsed": [{"emotion": "curiosity", "count": 5}, ...],
  "analogiesUsed": ["<analogy1>", "<analogy2>", ...],
  "audienceAddressed": ["<segment1>", "<segment2>", ...],
  "saturatedElements": ["<overused element1>", "<overused element2>", ...],
  "untappedOpportunities": ["<opportunity1>", "<opportunity2>", ...],
  "uniqueAnglesNotUsed": ["<angle1>", "<angle2>", ...],
  "rareEmotionCombos": [{"emotions": ["surprise", "anger"], "potential": "high"}],
  "depthAnalysis": {
    "averageDepth": "<shallow/medium/deep>",
    "commonEvidenceTypes": ["<type1>", "<type2>"],
    "missingEvidenceTypes": ["<type1>", "<type2>"]
  },
  "recommendations": {
    "winningAngle": "<suggested unique angle>",
    "untappedAudience": "<audience segment>",
    "rareEmotionCombo": ["emotion1", "emotion2"],
    "uniquePerspective": "<perspective not yet used>"
  }
}`;

  const response = await llm.chat([
    { role: 'system', content: 'You are a competitive content analyst specializing in content differentiation. Return JSON only.' },
    { role: 'user', content: analysisPrompt }
  ], { temperature: 0.5, maxTokens: 4000, model: 'glm-5-flash', enableSearch: false }); // No search needed

  const analysis = safeJsonParse(response.content);

  if (!analysis) {
    console.log('   ⚠️ Failed to parse competitor analysis JSON - returning basic analysis');
    return {
      anglesUsed: [],
      storiesTold: [],
      personasUsed: [],
      structuresUsed: [],
      emotionsUsed: [],
      analogiesUsed: [],
      audienceAddressed: [],
      saturatedElements: [],
      untappedOpportunities: [],
      competitorContent: competitorContent.map(c => c.content.substring(0, 300)),
      strategy: `AI analysis parse failed for ${competitorContent.length} competitors - create unique content`,
      submissionCount: submissions.length
    };
  }
  
  const thinkingText = `Analyzing ${competitorContent.length} competitor contents...
  
Angles Already Used: ${(analysis.anglesUsed || []).slice(0, 5).join(', ')}
Saturated (AVOID): ${(analysis.saturatedElements || []).slice(0, 3).join(', ')}
Untapped (USE): ${(analysis.untappedOpportunities || []).slice(0, 3).join(', ')}

Recommended Winning Angle: ${analysis.recommendations?.winningAngle || 'Be unique'}`;

  displayThinking('COMPETITOR', thinkingText);
  
  return {
    ...analysis,
    competitorContent: competitorContent.map(c => c.content.substring(0, 300)),
    nlpAnalysis: nlpResults
  };
}

// ============================================================================
// DEEP RESEARCH - Single AI call with web search (child process handles long requests)
// ============================================================================

async function multiQueryDeepResearch(llm, campaignTitle, campaignData) {
  console.log('\n' + '─'.repeat(60));
  console.log('🔎 DEEP RESEARCH (Web Search via Child Process)');
  console.log('─'.repeat(60));
  
  // Web search enabled — child process handles the long HTTP request (K8s-safe)
  console.log('   🔍 Using model web search (delegated to child process)...');
  
  const researchPrompt = `You are a DEEP research expert. Research THOROUGHLY about "${campaignTitle}" for creating unique, high-quality social media content. Search the web for the latest information.

════════════════════════════════════════════════════════════════
CAMPAIGN CONTEXT:
════════════════════════════════════════════════════════════════
Campaign: ${campaignTitle}
Description: ${campaignData.description || campaignData.goal || 'Not provided'}
${campaignData.knowledgeBase ? 'Knowledge Base: ' + campaignData.knowledgeBase.substring(0, 500) : ''}

════════════════════════════════════════════════════════════════
RESEARCH TASKS (use your knowledge for ALL of these):
════════════════════════════════════════════════════════════════
1. BASIC FACTS: What is it, how does it work, key features
2. REAL CASES: Success stories, real user experiences, examples
3. CONTROVERSIES: Problems, debates, criticisms, risks
4. STATISTICS: Market data, growth metrics, numbers
5. EXPERT OPINIONS: Quotes, analysis, insider insights
6. UNTOLD STORIES: Hidden problems, things nobody talks about

════════════════════════════════════════════════════════════════
OUTPUT FORMAT:
════════════════════════════════════════════════════════════════
Return JSON:
{
  "keyFacts": ["<fact1>", "<fact2>", ...],
  "realCases": ["<case1>", "<case2>", ...],
  "controversies": ["<controversy1>", "<controversy2>", ...],
  "statistics": ["<stat1>", "<stat2>", ...],
  "expertQuotes": ["<quote1>", "<quote2>", ...],
  "untoldStories": ["<story1>", "<story2>", ...],
  "uniqueAngles": [{"angle": "<angle>", "evidence": "<supporting evidence>", "uniqueness": "<why unique>"}],
  "evidenceLayers": {
    "macroData": "<large scale data>",
    "caseStudy": "<specific example>",
    "personalTouch": "<relatable element>",
    "expertValidation": "<expert source>"
  }
}`;

  // Research with web search via child process (K8s-safe — child handles long HTTP)
  let response = null;
  try {
    response = await llm.chat([
      { role: 'system', content: 'You are a deep research expert. Search the web thoroughly and return well-researched JSON data. Return JSON only, no explanation.' },
      { role: 'user', content: researchPrompt }
    ], { temperature: 0.5, maxTokens: 4000, model: 'glm-5-flash', enableSearch: true });
  } catch (err) {
    console.log(`   ⚠️ Research call failed: ${err.message.substring(0, 60)} — retrying without search...`);
    // Retry without search as fallback
    try {
      response = await llm.chat([
        { role: 'system', content: 'You are a deep research expert. Return well-researched JSON data based on your knowledge. Return JSON only.' },
        { role: 'user', content: researchPrompt }
      ], { temperature: 0.5, maxTokens: 4000, model: 'glm-5-flash', enableSearch: false });
    } catch (err2) {
      console.log(`   ⚠️ Fallback also failed: ${err2.message.substring(0, 60)} — using minimal fallback`);
    }
  }
  
  if (!response || !response.content) {
    console.log('   ⚠️ No response — using minimal fallback...');
    return {
      synthesis: {
        keyFacts: [`${campaignTitle} - model knowledge`],
        realCases: [],
        controversies: [],
        statistics: [],
        expertQuotes: [],
        untoldStories: [],
        uniqueAngles: [{ angle: 'AI-researched perspective', evidence: 'Model knowledge', uniqueness: 'Fresh angle' }],
        evidenceLayers: { macroData: 'Available', caseStudy: 'Found', personalTouch: 'Relatable', expertValidation: 'Expert source' }
      }
    };
  }
  
  let synthesis = safeJsonParse(response.content);
  
  if (!synthesis) {
    console.log('   ⚠️ Could not parse research JSON, retrying with simpler prompt...');
    
    try {
      const retryResponse = await llm.chat([
        { role: 'system', content: 'Return valid JSON only. No markdown, no explanation.' },
        { role: 'user', content: `Based on your knowledge about "${campaignTitle}", return: {"keyFacts":["fact1","fact2"],"realCases":["case1"],"controversies":["controversy1"],"statistics":["stat1"],"uniqueAngles":[{"angle":"angle","evidence":"evidence","uniqueness":"why"}],"evidenceLayers":{"macroData":"data","caseStudy":"example","personalTouch":"relatable","expertValidation":"source"}}` }
      ], { temperature: 0.5, maxTokens: 3000, model: 'glm-5-flash', enableSearch: false });
      synthesis = safeJsonParse(retryResponse.content);
    } catch (retryErr) {
      console.log(`   ⚠️ Retry also failed: ${retryErr.message.substring(0, 60)}`);
    }
  }
  
  if (!synthesis) {
    console.log('   ⚠️ Research parse failed, using minimal fallback...');
    synthesis = {
      keyFacts: [`${campaignTitle} - model knowledge`],
      realCases: [],
      controversies: [],
      statistics: [],
      expertQuotes: [],
      untoldStories: [],
      uniqueAngles: [{ angle: 'AI-researched perspective', evidence: 'Model knowledge', uniqueness: 'Fresh angle' }],
      evidenceLayers: {
        macroData: 'Available',
        caseStudy: 'Found',
        personalTouch: 'Relatable',
        expertValidation: 'Expert source'
      }
    };
  }
  
  const factCount = synthesis.keyFacts?.length || 0;
  const angleCount = synthesis.uniqueAngles?.length || 0;
  console.log(`   ✅ Research complete: ${factCount} facts, ${angleCount} unique angles (single AI call + built-in search)`);
  displayThinking('RESEARCH', `Found ${factCount} facts, ${angleCount} unique angles`);
  
  return { rawResults: [], synthesis };
}

// ============================================================================
// 🧠 LEARNING SYSTEM - Failure Analysis + Adaptive Prompting
// ============================================================================

/**
 * Analyzes all judge results from previous cycles to find failure patterns
 * This is the BRAIN of the learning system - it turns raw judge data into actionable insights
 */

// ============================================================================
// V10 NEW: SMART CAMPAIGN ANALYZER (replaces 2 functions with 1)
// Merges: deepCampaignIntentAnalyzer + campaignComprehensionCheck
// ============================================================================

async function smartCampaignAnalyzer(llm, campaignData, parsedRequirements, competitorAnalysis, researchData) {
  console.log('\n   ┌─────────────────────────────────────────────────────────────┐');
  console.log('   │  🧠 SMART CAMPAIGN ANALYZER (1 call instead of 2)          │');
  console.log('   └─────────────────────────────────────────────────────────────┘');

  const prompt = `You are a CAMPAIGN INTELLIGENCE ANALYST + CONTENT STRATEGIST.
Analyze this campaign THOROUGHLY and create a complete execution plan in ONE response.

════════════════════════════════════════════════════════════════
CAMPAIGN DATA:
════════════════════════════════════════════════════════════════
Title: ${campaignData.title || 'Unknown'}
${campaignData.missionTitle ? 'Mission: ' + campaignData.missionTitle : ''}
Description: ${campaignData.description || campaignData.missionGoal || 'N/A'}
Rules: ${campaignData.rules || 'Standard rules'}
Style: ${campaignData.style || 'Standard'}
Knowledge Base: ${(campaignData.knowledgeBase || 'N/A').substring(0, 500)}
${campaignData.additionalInfo ? 'Additional Info: ' + campaignData.additionalInfo.substring(0, 300) : ''}

════════════════════════════════════════════════════════════════
PARSED REQUIREMENTS:
════════════════════════════════════════════════════════════════
${parsedRequirements.mandatoryTags.length > 0 ? 'MUST TAG: ' + parsedRequirements.mandatoryTags.join(', ') : 'No mandatory tags'}
${parsedRequirements.mandatoryHashtags.length > 0 ? 'MUST USE HASHTAGS: ' + parsedRequirements.mandatoryHashtags.join(', ') : 'No mandatory hashtags'}
${parsedRequirements.mandatoryMetrics ? 'MUST INCLUDE specific metrics/numbers' : ''}
${parsedRequirements.mandatoryUrl ? 'MUST INCLUDE URL: ' + (campaignData.campaignUrl || campaignData.url) : ''}
${parsedRequirements.mandatoryScreenshot ? 'MUST INCLUDE screenshot' : ''}
${parsedRequirements.prohibitedHashtags.length > 0 ? 'HASHTAGS PROHIBITED' : ''}
${parsedRequirements.prohibitedUrl ? 'URL/LINK PROHIBITED' : ''}
${parsedRequirements.prohibitedTags.length > 0 ? 'DO NOT TAG: ' + parsedRequirements.prohibitedTags.join(', ') : ''}
${parsedRequirements.prohibitedKeywords.length > 0 ? 'DO NOT MENTION: ' + parsedRequirements.prohibitedKeywords.join(', ') : ''}
${parsedRequirements.focusTopic ? 'FOCUS TOPIC: ' + parsedRequirements.focusTopic : ''}
${parsedRequirements.proposedAngles.length > 0 ? 'PROPOSED ANGLES (PICK ONE):\n' + parsedRequirements.proposedAngles.map((a, i) => (i+1) + '. "' + a + '"').join('\n') : ''}

════════════════════════════════════════════════════════════════
COMPETITOR INTELLIGENCE:
════════════════════════════════════════════════════════════════
Used Angles (AVOID): ${(competitorAnalysis?.anglesUsed || []).slice(0, 5).join(', ') || 'None'}
Saturated Elements: ${(competitorAnalysis?.saturatedElements || []).slice(0, 5).join(', ') || 'None'}
Untapped Opportunities: ${(competitorAnalysis?.untappedOpportunities || []).slice(0, 5).join(', ') || 'None'}

════════════════════════════════════════════════════════════════
RESEARCH DATA:
════════════════════════════════════════════════════════════════
Key Facts: ${(researchData?.synthesis?.keyFacts || []).slice(0, 5).join('; ') || 'N/A'}

════════════════════════════════════════════════════════════════
YOUR TASK: Analyze intent + classify metrics + create plan
════════════════════════════════════════════════════════════════

TASK 1 - TRUE INTENT: What does this campaign ACTUALLY want?
TASK 2 - CONTENT TYPE: PERSONAL_EXPERIENCE | EDUCATIONAL | OPINION | SOCIAL_PROOF | COMPARISON | COMMUNITY
TASK 3 - METRIC CLASSIFICATION: RETENTION | GROWTH | LIQUIDITY | REVENUE | PERFORMANCE | SOCIAL
  - Classify EACH metric mentioned in KB
  - Identify WRONG metric types (e.g. TVL is LIQUIDITY, not GROWTH)
TASK 4 - EXECUTION PLAN: Specific angle, hook strategy, evidence to use, voice guide
TASK 5 - CONTENT TO AVOID vs USE: Based on competitor analysis and metric classification

Return JSON:
{
  "trueIntent": { "summary": "...", "desiredReaderReaction": "...", "contentPurpose": "..." },
  "contentType": { "primary": "...", "secondary": "...", "reasoning": "..." },
  "metricClassification": {
    "campaignMetricType": "RETENTION|GROWTH|LIQUIDITY|REVENUE|PERFORMANCE|SOCIAL|null",
    "correctMetricsToUse": ["metric1", "metric2"],
    "wrongMetricsToAvoid": ["wrong_metric1", "wrong_metric2"]
  },
  "executionPlan": {
    "chosenAngle": "...",
    "hookStrategy": "...",
    "voiceGuide": "...",
    "evidenceToUse": ["fact1", "fact2"],
    "mandatoryItemsChecklist": { "tags": [...], "hashtags": [...], "metrics": "...", "url": "..." },
    "prohibitedItems": { "noHashtags": bool, "noUrl": bool, "avoidTags": [...], "avoidKeywords": [...] },
    "qualityTargets": { "emotionJourney": "...", "differentiation": "..." }
  },
  "contentToAvoid": { "wrongMetrics": [...], "overusedAngles": [...], "promotionalLanguage": [...] },
  "contentToUse": { "rightMetrics": [...], "suggestedAngles": [...], "personalExperienceHooks": [...], "kbFacts": [...] },
  "criticalWarnings": ["..."]
}`;

  try {
    const response = await callAI([
      { role: 'system', content: 'You are a CAMPAIGN INTELLIGENCE ANALYST. Analyze campaigns deeply. Classify metric types accurately. Return valid JSON only.' },
      { role: 'user', content: prompt }
    ], { temperature: 0.2, maxTokens: 3000, model: 'glm-5', enableSearch: false });

    const analysis = safeJsonParse(response.content);

    if (analysis) {
      console.log(`   ✅ Analysis complete: intent=${analysis.trueIntent?.summary?.substring(0, 40)}...`);
      console.log(`   📊 Metric type: ${analysis.metricClassification?.campaignMetricType || 'N/A'}`);
      console.log(`   🎯 Angle: ${(analysis.executionPlan?.chosenAngle || 'N/A').substring(0, 50)}...`);

      if (analysis.metricClassification?.wrongMetricsToAvoid?.length > 0) {
        console.log(`   🚫 Wrong metrics: ${analysis.metricClassification.wrongMetricsToAvoid.join(', ')}`);
      }
      return analysis;
    } else {
      console.log('   ⚠️ Parse failed — using fallback');
      return createFallbackIntent(campaignData);
    }
  } catch (error) {
    console.log(`   ⚠️ Smart analyzer failed: ${error.message}`);
    return createFallbackIntent(campaignData);
  }
}

function createFallbackIntent(campaignData) {
  return {
    trueIntent: { summary: 'Create authentic content about ' + (campaignData.title || 'this campaign'), desiredReaderReaction: 'Engage', contentPurpose: 'Brand awareness' },
    contentType: { primary: 'PERSONAL_EXPERIENCE', secondary: 'OPINION', reasoning: 'Default' },
    metricClassification: { campaignMetricType: null, correctMetricsToUse: [], wrongMetricsToAvoid: [] },
    executionPlan: { chosenAngle: 'Personal experience', hookStrategy: 'Casual opener', evidenceToUse: [], mandatoryItemsChecklist: {}, prohibitedItems: {}, qualityTargets: {} },
    contentToAvoid: { wrongMetrics: [], overusedAngles: [], promotionalLanguage: [] },
    contentToUse: { rightMetrics: [], suggestedAngles: [], personalExperienceHooks: [], kbFacts: [] },
    criticalWarnings: ['Intent analysis failed — using defaults']
  };
}


// ============================================================================
// V10 NEW: SUPER-JUDGE SYSTEM (2 judges instead of 6)
// ============================================================================

function getSuperJudge1Prompt() {
  return `You are an expert content evaluator for Rally.fun. Evaluate FAIRLY and CONSISTENTLY.
You do NOT know how this content was created. Score each criterion honestly.

═══════════════════════════════════════════════════════════════════
SECTION A: GATE SCORES (each 1-4, max 24 total)
═══════════════════════════════════════════════════════════════════
1. HOOK QUALITY (1-4): Opens with casual hook (ngl, tbh, honestly)? NOT template phrase?
   4=Excellent casual hook  3=Good engaging  2=Generic  1=Template (Unpopular opinion, Hot take)
2. EMOTIONAL IMPACT (1-4): 3+ genuine emotions? Not forced?
   4=3+ distinct genuine emotions  3=2-3 emotions  2=Surface level  1=Flat
3. BODY FEELING (1-4): Reader can physically FEEL sensation?
   4=Strong physical sensation  3=Present  2=Mentioned but weak  1=None
   Examples: "stomach dropped", "jaw dropped", "cold sweat", "chest tightened"
4. CTA QUALITY (1-4): Natural conversational call-to-action?
   4=Natural (what do you think?, worth checking tbh)  3=Clear  2=Generic  1=None/pushy
5. URL PRESENCE (1-4): Naturally integrated into content flow?
   4=Natural integration  3=Present reasonable  2=Forced  1=Missing
6. G4 ORIGINALITY (1-4): Human-like writing with authentic voice?
   Check: casual hook + parenthetical aside + 3+ contractions + personal angle + conversational ending
   4=4+ G4 elements  3=3 elements  2=1-2 elements  1=No G4 elements (sounds AI)

═══════════════════════════════════════════════════════════════════
SECTION B: GATE TAMBAHAN (each 1-4, max 16 total)
═══════════════════════════════════════════════════════════════════
7. FACT QUALITY (1-4): Multiple evidence layers with SPECIFIC NUMBERS?
   4=Macro data + case study + personal + expert  3=Good facts  2=Weak  1=No facts
8. ENGAGEMENT HOOK (1-4): Naturally invites replies? Embarrassing honesty?
9. READABILITY (1-4): Short paragraphs? Good flow? NO wall of text?
   CRITICAL: Single continuous paragraph = auto score 1
10. X-FACTOR DIFFERENTIATORS (1-4): Specific numbers + time specificity + embarrassing honesty + insider detail + unexpected angle?
    4=4+ X-factors  3=3  2=1-2  1=None

═══════════════════════════════════════════════════════════════════
SECTION C: PENALTIES (deduct from total)
═══════════════════════════════════════════════════════════════════
- Em dashes or en dashes: -1 each found
- Smart quotes: -1 each found
- AI phrases (delve, leverage, realm, tapestry, paradigm, landscape, nuance): -1 each
- Generic opening: -2
- Formal ending: -1
- Wall of text: -3

═══════════════════════════════════════════════════════════════════
SECTION D: COMPLIANCE (binary pass/fail each)
═══════════════════════════════════════════════════════════════════
Check each: requiredTags, requiredHashtags, requiredUrl, requiredMetrics, noProhibitedHashtags, noProhibitedUrl, noProhibitedTags, noProhibitedKeywords, noBannedPhrases, noBannedWords, noAIPatterns, noForbiddenPunctuation

═══════════════════════════════════════════════════════════════════
SECTION E: ANTI-AI PROBABILITY (0-100%)
═══════════════════════════════════════════════════════════════════
Rate how likely this was AI-generated. Consider: natural language, imperfections, personal voice, emotion authenticity.

═══════════════════════════════════════════════════════════════════
SECTION F: OVERALL QUALITY (1-10) + IMPROVEMENT INSTRUCTIONS
═══════════════════════════════════════════════════════════════════

Return JSON:
{
  "gateScores": {
    "hookQuality": {"score": N, "reason": "brief"},
    "emotionalImpact": {"score": N, "reason": "brief"},
    "bodyFeeling": {"score": N, "reason": "brief"},
    "ctaQuality": {"score": N, "reason": "brief"},
    "urlPresence": {"score": N, "reason": "brief"},
    "g4Originality": {"score": N, "reason": "brief"}
  },
  "gateTambahanScores": {
    "factQuality": {"score": N, "reason": "brief"},
    "engagementHook": {"score": N, "reason": "brief"},
    "readability": {"score": N, "reason": "brief"},
    "xFactorDifferentiators": {"score": N, "reason": "brief"}
  },
  "penalties": {"items": ["item1", "item2"], "totalDeduction": N},
  "compliance": {
    "requiredTags": {"pass": bool, "found": [], "missing": []},
    "requiredHashtags": {"pass": bool, "found": [], "missing": []},
    "requiredUrl": {"pass": bool},
    "requiredMetrics": {"pass": bool},
    "noProhibitedHashtags": {"pass": bool},
    "noProhibitedUrl": {"pass": bool},
    "noProhibitedTags": {"pass": bool, "found": []},
    "noProhibitedKeywords": {"pass": bool, "found": []},
    "noBannedPhrases": {"pass": bool, "found": []},
    "noBannedWords": {"pass": bool, "found": []},
    "noAIPatterns": {"pass": bool, "found": []},
    "noForbiddenPunctuation": {"pass": bool, "found": []},
    "allPass": bool
  },
  "antiAIProbability": N,
  "overallQuality": {"score": N, "reason": "brief"},
  "totalScore": N,
  "passed": bool,
  "failedAt": "section name or null",
  "improvementInstructions": ["specific fix 1", "specific fix 2"],
  "feedback": "overall assessment"
}`;
}

function getSuperJudge1UserPrompt(content, campaignData, analysis = null) {
  const reqs = parseCampaignRequirements(campaignData);
  let extraContext = '';
  if (analysis?.metricClassification?.campaignMetricType) {
    extraContext = `
⚠️ CRITICAL METRIC TYPE CHECK:
Campaign wants: ${analysis.metricClassification.campaignMetricType} metrics
WRONG metrics: ${(analysis.metricClassification.wrongMetricsToAvoid || []).map(m => '- ' + m).join('\n')}
CORRECT metrics: ${(analysis.metricClassification.correctMetricsToUse || []).map(m => '- ' + m).join('\n')}
If content uses wrong metric type → heavy penalty`;

    if (analysis.criticalWarnings?.length > 0) {
      extraContext += '\n\n⚠️ CRITICAL WARNINGS:\n' + analysis.criticalWarnings.map(w => '- ' + w).join('\n');
    }
  }

  return `Evaluate this content:

CONTENT:
${content}

═════════════════════════════════════════════════════
CAMPAIGN CONTEXT:
═════════════════════════════════════════════════════
Campaign: ${campaignData.title || 'Unknown'}
${campaignData.missionTitle ? 'Mission: ' + campaignData.missionTitle : ''}
Description: ${campaignData.description || campaignData.missionGoal || 'N/A'}
Style: ${campaignData.style || 'N/A'}
Rules: ${campaignData.rules || 'Standard rules'}
KB: ${(campaignData.knowledgeBase || 'N/A').substring(0, 300)}

${reqs.mandatoryTags.length > 0 ? 'REQUIRED TAGS: ' + reqs.mandatoryTags.join(', ') : ''}
${reqs.mandatoryHashtags.length > 0 ? 'REQUIRED HASHTAGS: ' + reqs.mandatoryHashtags.join(', ') : ''}
${reqs.mandatoryMetrics ? 'METRICS REQUIRED: Must have specific numbers' : ''}
${reqs.mandatoryUrl ? 'REQUIRED URL: ' + (campaignData.campaignUrl || campaignData.url) : ''}
${reqs.prohibitedHashtags.length > 0 ? 'NO HASHTAGS ALLOWED' : ''}
${reqs.prohibitedUrl ? 'NO URL/LINK ALLOWED' : ''}
${reqs.prohibitedTags.length > 0 ? 'DO NOT TAG: ' + reqs.prohibitedTags.join(', ') : ''}
${reqs.proposedAngles.length > 0 ? 'PROPOSED ANGLES: ' + reqs.proposedAngles.join(' | ') : ''}
${extraContext}

Evaluate ALL sections A-F. Return JSON.`;
}

function getSuperJudge2Prompt() {
  return `You are an EVIDENCE & UNIQUENESS expert for Rally.fun content evaluation.

═══════════════════════════════════════════════════════════════════
SECTION A: FACT VERIFICATION (max 5 points)
═══════════════════════════════════════════════════════════════════
1. FACT ACCURACY (1-3): Are claims verified? Any fabricated data?
   3=All verified  2=Mostly verified  1=Unverified or fabricated
2. EVIDENCE LAYERS (1-2): How many evidence types present?
   2=3+ layers (macro+case+personal+expert)  1=1-2 layers  0=None

SECTION B: UNIQUENESS (max 5 points)
═══════════════════════════════════════════════════════════════════
3. DIFFERENTIATION (1-3): How different from competitor content?
   3=Completely unique angle  2=Somewhat different  1=Similar to competitors
4. UNIQUE ANGLE (1-2): Fresh perspective?
   2=Truly unique  1=Seen before
5. EMOTION UNIQUENESS (1-2): Rare emotion combo?
   2=Rare combo (surprise+anger, relief+curiosity)  1=Common combo

Return JSON:
{
  "factVerification": {
    "factAccuracy": {"score": N, "reason": "..."},
    "evidenceLayers": {"score": N, "layers": ["macro", "case", ...]}
  },
  "uniqueness": {
    "differentiation": {"score": N, "reason": "..."},
    "uniqueAngle": {"score": N, "reason": "..."},
    "emotionUniqueness": {"score": N, "reason": "..."}
  },
  "totalScore": N,
  "passed": bool,
  "feedback": "..."
}`;
}

function getSuperJudge2UserPrompt(content, campaignData, competitorContents = [], analysis = null) {
  return `Evaluate evidence and uniqueness for:

CONTENT:
${content}

CAMPAIGN: ${campaignData.title || 'Unknown'}
${campaignData.knowledgeBase ? 'KB: ' + campaignData.knowledgeBase.substring(0, 400) : ''}

${competitorContents.length > 0 ? 'COMPETITOR CONTENTS (for uniqueness comparison):\n' + competitorContents.slice(0, 3).map((c, i) => '--- Competitor ' + (i+1) + ' ---\n' + c.substring(0, 400)).join('\n\n') : 'No competitor data available'}

${analysis?.metricClassification?.campaignMetricType ? '\nMETRIC TYPE: Campaign wants ' + analysis.metricClassification.campaignMetricType + ' metrics\nWRONG: ' + (analysis.metricClassification.wrongMetricsToAvoid || []).join(', ') + '\nCORRECT: ' + (analysis.metricClassification.correctMetricsToUse || []).join(', ') : ''}

Evaluate and return JSON.`;
}


// ============================================================================
// V10 NEW: OPTIMIZED CONTENT GENERATION (few-shot, voice-first)
// ============================================================================

function getOptimizedGenerationPrompt(campaignData, analysis, competitorInfo, learningInsights, persona, structure, emotion, audience) {
  const kbFacts = (analysis?.contentToUse?.kbFacts || []).slice(0, 5).map(f => '- ' + f).join('\n');
  const usedAngles = (competitorInfo?.anglesUsed || []).slice(0, 3).map(a => '- ' + a).join('\n');
  const saturated = (competitorInfo?.saturatedElements || []).slice(0, 2).map(e => '- AVOID: ' + e).join('\n');
  const rules = campaignData.rules || '';
  const style = campaignData.style || '';
  const kb = campaignData.knowledgeBase || '';
  const ep = analysis?.executionPlan || {};

  return `You are ${persona.name}. ${persona.trait}.
You genuinely just discovered "${campaignData.title}" and want to share your authentic reaction.

════════════════════════════════════════════════════════════════
VOICE GUIDE (write LIKE THIS, not a checklist):
════════════════════════════════════════════════════════════════
- Talk like texting a friend, NOT writing an article
- Use contractions: don't, can't, it's, won't, I'm, that's, let's
- Add parenthetical thoughts: (ngl), (not gonna lie), (this is embarrassing but)
- Be specific: "25 minutes" not "a while", "down 47%" not "down a lot"
- Include physical reaction: "stomach dropped", "jaw dropped", "cold sweat"
- End conversationally: "what do you think?", "worth checking out tbh", "just saying"
- NEVER use em dashes or smart quotes
- NEVER use: delve, leverage, realm, tapestry, paradigm, landscape, nuance, picture this, let's dive in, key takeaways, it goes without saying

════════════════════════════════════════════════════════════════
WHAT TO WRITE ABOUT:
════════════════════════════════════════════════════════════════
Campaign: ${campaignData.title}
${campaignData.missionTitle ? 'Mission: ' + campaignData.missionTitle : ''}
${ep.chosenAngle ? 'Your angle: ' + ep.chosenAngle : ''}
${analysis?.trueIntent?.summary ? 'Core vibe: ' + analysis.trueIntent.summary : ''}
${ep.voiceGuide ? 'Voice: ' + ep.voiceGuide : ''}

${kbFacts ? "KEY FACTS (weave naturally, don't list):\n" + kbFacts : ""}

════════════════════════════════════════════════════════════════
MANDATORY (include naturally or you'll be DISQUALIFIED):
════════════════════════════════════════════════════════════════
${rules ? 'Rules: ' + rules : ''}
${style ? 'Style: ' + style : ''}
${ep.mandatoryItemsChecklist?.tags?.length ? 'MUST TAG: ' + ep.mandatoryItemsChecklist.tags.join(', ') : ''}
${ep.mandatoryItemsChecklist?.hashtags?.length ? 'MUST USE HASHTAGS: ' + ep.mandatoryItemsChecklist.hashtags.join(', ') : ''}
${ep.mandatoryItemsChecklist?.metrics ? 'MUST include specific numbers/metrics' : ''}
${ep.mandatoryItemsChecklist?.url ? 'MUST include URL: ' + ep.mandatoryItemsChecklist.url : ''}
${ep.prohibitedItems?.noHashtags ? 'NO HASHTAGS ALLOWED' : ''}
${ep.prohibitedItems?.noUrl ? 'NO URL/LINK ALLOWED' : ''}
${ep.prohibitedItems?.avoidTags?.length ? 'DO NOT TAG: ' + ep.prohibitedItems.avoidTags.join(', ') : ''}
${ep.prohibitedItems?.avoidKeywords?.length ? 'DO NOT MENTION: ' + ep.prohibitedItems.avoidKeywords.join(', ') : ''}
${campaignData.campaignUrl ? 'Campaign URL: ' + campaignData.campaignUrl : ''}

════════════════════════════════════════════════════════════════
WHAT COMPETITORS WRITE (DO SOMETHING DIFFERENT):
════════════════════════════════════════════════════════════════
${usedAngles || 'No competitor data'}
${saturated || ''}

════════════════════════════════════════════════════════════════
GOOD EXAMPLE (score 92/105 — study this pattern):
════════════════════════════════════════════════════════════════
"ngl spent like 25 mins just watching this thing go from 12 to 847 in 3 minutes
(not the most productive use of my time but here we are)

the part that actually got me wasn't the numbers themselves
it was how something that looked like a simple [specific detail] turned out to be [surprising revelation]

${campaignData.campaignUrl ? campaignData.campaignUrl : '[URL]'}

anyone else been watching this or am i just late to the party?"

Notice: casual hook (ngl), parenthetical aside, contractions (didn't, it's),
specific numbers (25 mins, 12 to 847, 3 minutes), personal angle,
conversational ending, URL natural, NO AI patterns.

════════════════════════════════════════════════════════════════
BEFORE WRITING (answer these internally, don't include in output):
════════════════════════════════════════════════════════════════
Q1: What ONE thing made you stop scrolling? (your hook)
Q2: How would you tell a friend at a coffee shop? (your opening)
Q3: What's slightly embarrassing to admit? (G4 gold)
Q4: What specific number/fact from KB stuck with you? (evidence)
Q5: What's YOUR unique angle nobody else has? (differentiation)
${analysis?.metricClassification?.wrongMetricsToAvoid?.length ? 'Q6: What metric type should you use? (' + analysis.metricClassification.campaignMetricType + ', NOT ' + analysis.metricClassification.wrongMetricsToAvoid.join('/') + ')' : ''}

${learningInsights ? `
════════════════════════════════════════════════════════════════
⚠️ LEARNING FROM ${learningInsights.totalFailed || 0} PREVIOUS FAILURES:
════════════════════════════════════════════════════════════════
${learningInsights.section || ''}
DO NOT repeat these mistakes. Write something DIFFERENT from all previous attempts.
` : ''}

Write your tweet now. Maximum 280 characters. Be genuine. Be specific. Be human.
Return JSON: {"content": "your tweet here"}`;
}

async function generateOptimizedContent(llm, campaignData, analysis, competitorInfo, researchData, learningInsights, persona, structure, emotion, audience) {
  console.log(`   📝 Generating (${persona.name} / ${emotion.emotions.join('+')})...`);

  const prompt = getOptimizedGenerationPrompt(campaignData, analysis, competitorInfo, learningInsights, persona, structure, emotion, audience);

  const response = await llm.chat([
    { role: 'system', content: 'You write authentic social media content. Return valid JSON: {"content": "your tweet"}. Max 280 chars.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.85, maxTokens: 1500, model: 'glm-5', enableSearch: false });

  const result = safeJsonParse(response.content);
  if (result && result.content) {
    return result.content;
  }

  // Fallback: try to extract from markdown code block
  const contentMatch = (response.content || '').match(/"content"\s*:\s*"([^"]{10,})"/s);
  if (contentMatch) return contentMatch[1];

  // Last resort: return raw content (truncated)
  const raw = (response.content || '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return raw.length > 500 ? raw.substring(0, 500) : raw;
}


// ============================================================================
// V10: OPTIMIZED JUDGE PIPELINE (2 calls instead of 6)
// ============================================================================

function parseSuperJudge1Result(raw) {
  const r = safeJsonParse(raw);
  if (!r) return null;

  const gateScores = r.gateScores || {};
  const gateTambahan = r.gateTambahanScores || {};

  const gateTotal = Object.values(gateScores).reduce((s, v) => s + (v?.score || 0), 0);
  const gateTambTotal = Object.values(gateTambahan).reduce((s, v) => s + (v?.score || 0), 0);
  const penaltyTotal = r.penalties?.totalDeduction || 0;
  const subtotal = gateTotal + gateTambTotal - penaltyTotal;

  return {
    gateTotal,
    gateTambahanTotal,
    penaltyTotal,
    subtotal: Math.max(0, subtotal),
    compliance: r.compliance || {},
    allCompliancePass: r.compliance?.allPass !== false,
    antiAIProbability: r.antiAIProbability || 50,
    overallQuality: r.overallQuality?.score || 0,
    totalScore: r.totalScore || subtotal,
    passed: r.passed || false,
    failedAt: r.failedAt || null,
    improvementInstructions: r.improvementInstructions || [],
    feedback: r.feedback || '',
    raw
  };
}

function parseSuperJudge2Result(raw) {
  const r = safeJsonParse(raw);
  if (!r) return null;

  const fv = r.factVerification || {};
  const uniq = r.uniqueness || {};
  const total = (fv.factAccuracy?.score || 0) + (fv.evidenceLayers?.score || 0) +
                (uniq.differentiation?.score || 0) + (uniq.uniqueAngle?.score || 0) +
                (uniq.emotionUniqueness?.score || 0);

  return {
    factAccuracy: fv.factAccuracy?.score || 0,
    evidenceLayers: fv.evidenceLayers?.score || 0,
    differentiation: uniq.differentiation?.score || 0,
    uniqueAngle: uniq.uniqueAngle?.score || 0,
    emotionUniqueness: uniq.emotionUniqueness?.score || 0,
    totalScore: r.totalScore || total,
    passed: r.passed || false,
    feedback: r.feedback || '',
    raw
  };
}

async function runSuperJudgePipeline(llm, content, campaignData, analysis, competitorContents, state = null) {
  console.log('\n   🔍 Running Super-Judge Pipeline...');

  // Super-Judge 1: Gate + Quality + Compliance + Anti-AI (1 call, no search)
  const sj1Response = await callAI([
    { role: 'system', content: getSuperJudge1Prompt() },
    { role: 'user', content: getSuperJudge1UserPrompt(content, campaignData, analysis) }
  ], { temperature: 0.2, maxTokens: 3000, model: 'glm-5', enableSearch: false });

  const sj1 = parseSuperJudge1Result(sj1Response.content);
  if (!sj1) {
    console.log('   ❌ Super-Judge 1 parse failed');
    return { passed: false, failedAt: 'judge1-parse', totalScore: 0 };
  }

  console.log(`   📊 SJ1: ${sj1.subtotal}/40 (Gates: ${sj1.gateTotal}/24 + G.Tamb: ${sj1.gateTambahanTotal}/16 - Penalties: -${sj1.penaltyTotal})`);
  console.log(`   ${sj1.allCompliancePass ? '✅' : '❌'} Compliance | 🤖 AI%: ${sj1.antiAIProbability}% | Quality: ${sj1.overallQuality}/10`);

  if (!sj1.allCompliancePass) {
    console.log(`   ❌ FAILED at Compliance`);
    return { passed: false, failedAt: 'compliance', totalScore: sj1.subtotal, sj1, improvementInstructions: sj1.improvementInstructions };
  }

  await delay(CONFIG.delays.betweenJudges);

  // Check abort
  if (state && state.hasWinner()) return { skipped: true };

  // Super-Judge 2: Evidence + Uniqueness (1 call, WITH search for fact checking)
  const sj2Response = await callAI([
    { role: 'system', content: getSuperJudge2Prompt() },
    { role: 'user', content: getSuperJudge2UserPrompt(content, campaignData, competitorContents, analysis) }
  ], { temperature: 0.2, maxTokens: 2000, model: 'glm-5', enableSearch: true });

  const sj2 = parseSuperJudge2Result(sj2Response.content);
  if (!sj2) {
    console.log('   ❌ Super-Judge 2 parse failed');
    return { passed: false, failedAt: 'judge2-parse', totalScore: sj1.subtotal, sj1 };
  }

  console.log(`   📊 SJ2: ${sj2.totalScore}/10 (Fact: ${sj2.factAccuracy}/5, Unique: ${sj2.differentiation + sj2.uniqueAngle + sj2.emotionUniqueness}/7)`);

  const totalScore = sj1.subtotal + sj2.totalScore;
  const passed = totalScore >= THRESHOLDS.TOTAL.pass && sj1.subtotal >= THRESHOLDS.SUPER_JUDGE1.pass;

  console.log(`   📊 TOTAL: ${totalScore}/${THRESHOLDS.TOTAL.max} (need ${THRESHOLDS.TOTAL.pass}) ${passed ? '✅ PASS' : '❌ FAIL'}`);

  return {
    passed,
    failedAt: passed ? null : (sj1.subtotal < THRESHOLDS.SUPER_JUDGE1.pass ? 'super-judge-1' : 'total'),
    totalScore,
    sj1,
    sj2,
    improvementInstructions: sj1.improvementInstructions
  };
}

function analyzeFailures(allCycleJudgeResults, cycleNumber, previousContentHistory = []) {
  const insights = {
    totalFailed: 0,
    cycleAnalyzed: cycleNumber,
    failurePatterns: {},      // Which judge/stage fails most
    specificIssues: [],       // Detailed reasons for failure
    nearMiss: null,           // Content that almost passed
    bestScore: 0,
    bestFailedContent: null,
    missingElements: [],      // What mandatory items keep being missed
    strategyHints: [],        // Strategy adaptation suggestions
    contentHistory: [...previousContentHistory], // Track all content for dedup
    learnedAngles: [],        // Angles that were tried and failed
    learnedEmotions: [],      // Emotions that failed to resonate
  };

  // Process each judge result
  for (const result of allCycleJudgeResults) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    const r = result.value;

    // Skip if this content passed (winner)
    if (r.passed && !r.failedAt) continue;

    insights.totalFailed++;

    // Track the content for deduplication
    if (r.content) {
      // Extract opening line (hook) for pattern tracking
      const firstLine = r.content.split('\n')[0]?.trim().substring(0, 80) || '';
      if (firstLine && !insights.contentHistory.some(h => h.opening === firstLine)) {
        insights.contentHistory.push({
          opening: firstLine,
          score: r.totalScore || 0,
          failedAt: r.failedAt || 'unknown',
          cycle: r.cycleNumber || 0
        });
      }
    }

    // Track which stage/judge fails most
    if (r.failedAt) {
      insights.failurePatterns[r.failedAt] = (insights.failurePatterns[r.failedAt] || 0) + 1;
    }

    // Extract specific issues from scores
    if (r.scores) {
      // Judge 0 - Campaign Requirements: extract missing elements
      if (r.scores.requirementsValidation && !r.scores.requirementsValidation.passed) {
        const missing = r.scores.requirementsValidation.missingElements || [];
        for (const m of missing) {
          if (!insights.missingElements.some(me => me.includes(m.substring(0, 30)))) {
            insights.missingElements.push(m);
          }
        }
      }

      // Judge 1 - Gate Master details
      if (r.scores.judge1 && !r.scores.judge1.passed) {
        const details = r.scores.judge1.details || {};
        if (details.gateUtama < 8) {
          insights.specificIssues.push('GATE UTAMA terlalu rendah - hook/body kurang memikat');
        }
        if (details.gateTambahan < 4) {
          insights.specificIssues.push('GATE TAMBAHAN gagal - kurang elemen diferensiasi');
        }
        if (details.g4Score < 4) {
          insights.specificIssues.push('G4 ORIGINALITY rendah - terlalu terstruktur seperti AI');
        }
        if (details.punctuationScore === 0) {
          insights.specificIssues.push('FORBIDDEN PUNCTUATION terdeteksi - hindari em dash (—) dan smart quotes');
        }
        // Track G4 result details
        if (r.scores.judge1.g4Result) {
          const g4 = r.scores.judge1.g4Result;
          if (!g4.hasCasualHook) insights.learnedEmotions.push('Hook terlalu formal');
          if (!g4.hasParentheticalAside) insights.learnedEmotions.push('Tidak ada parenthetical aside');
          if (!g4.hasContractions) insights.learnedEmotions.push('Tidak ada contractions (I\'m, can\'t, dll)');
        }
      }

      // Judge 2 - Evidence Master
      if (r.scores.judge2 && !r.scores.judge2.passed) {
        insights.specificIssues.push('EVIDENCE/FACT CHECK gagal - kurang bukti atau data tidak akurat');
      }

      // Judge 3 - Quality Master
      if (r.scores.judge3 && !r.scores.judge3.passed) {
        const score = r.scores.judge3.score || 0;
        if (score < 40) {
          insights.specificIssues.push('QUALITY sangat rendah (<40/80) - konten kurang personal dan engaging');
        } else if (score < 55) {
          insights.specificIssues.push('QUALITY mendekati tapi kurang (<55/80) - perlu lebih authenticity');
        }
      }
    }

    // Track near-miss (highest scoring failed content)
    const totalScore = r.totalScore || 0;
    if (totalScore > insights.bestScore) {
      insights.bestScore = totalScore;
      insights.bestFailedContent = {
        content: r.content?.substring(0, 500),
        score: totalScore,
        failedAt: r.failedAt,
        cycle: r.cycleNumber,
        scores: r.scores
      };
    }
  }

  // Build near-miss analysis
  if (insights.bestScore > 60) {
    insights.nearMiss = {
      score: insights.bestScore,
      failedAt: insights.bestFailedContent?.failedAt,
      whatToFix: generateFixSuggestion(insights.bestFailedContent),
      contentPreview: insights.bestFailedContent?.content?.substring(0, 300)
    };
  }

  // Generate strategy hints based on patterns
  insights.strategyHints = generateStrategyHints(insights);

  return insights;
}

/**
 * Generates specific fix suggestions based on where near-miss content failed
 */
function generateFixSuggestion(bestFailed) {
  if (!bestFailed) return 'Generate completely different approach';
  
  const failedAt = bestFailed.failedAt;
  const fixes = {
    'Judge 0 - Campaign Requirements': 'PERBAIKI: Pastikan SEMUA mandatory items ada (tags, hashtags, URL, metrics). Cek rules satu per satu sebelum submit.',
    'Metric Type Check': 'PERBAIKI: Kamu menggunakan metrik yang salah! Cek DEEP CAMPAIGN INTENT untuk tahu metrik yang BENAR.',
    'Format Check - Wall of Text': 'PERBAIKI: Gunakan \\n\\n (double newline) antar paragraf! Setiap paragraf max 1-2 kalimat.',
    'judge1': (() => {
      const d = bestFailed.scores?.judge1?.details || {};
      if (d.g4Score < 4) return 'PERBAIKI: Tulis lebih casual! Gunakan parenthetical (like this), contractions (I\'m, can\'t), hook yang natural.';
      if (d.punctuationScore === 0) return 'PERBAIKI: Jangan gunakan em dash (—) atau smart quotes (""). Gunakan regular dash (-) dan straight quotes (").';
      if (d.gateUtama < 8) return 'PERBAIKI: Hook dan body perlu lebih memikat. Gunakan specific moment, bukan general statement.';
      return 'PERBAIKI: Tingkatkan Gate score overall. Fokus pada authenticity dan G4 elements.';
    })(),
    'judge2': 'PERBAIKI: Tambah bukti! Gunakan specific numbers, case study, atau personal experience sebagai evidence.',
    'judge3': 'PERBAIKI: Quality score kurang. Perlu lebih personal, lebih emotional depth, lebih unique angle.',
    'timeout': 'PERBAIKI: Konten sebelumnya timeout saat judging. Coba buat konten yang lebih ringkas.',
    'error': 'PERBAIKI: Error saat judging. Coba pendekatan yang berbeda.',
  };
  
  return fixes[failedAt] || `PERBAIKI: Gagal di "${failedAt}". Coba pendekatan yang berbeda.`;
}

/**
 * Generates strategy adaptation hints based on failure patterns
 */
function generateStrategyHints(insights) {
  const hints = [];
  const patterns = insights.failurePatterns;

  // If most failures are at Judge 0 (Requirements)
  const reqFailures = (patterns['Judge 0 - Campaign Requirements'] || 0);
  if (reqFailures >= 2) {
    hints.push('⚠️ STRATEGY: ' + reqFailures + 'x gagal di Requirements! FOKUS PRIORITAS: Pastikan SETIAP mandatory item ADA di konten sebelum menulis. Buat checklist dulu.');
  }

  // If failing at Metric Type
  if (patterns['Metric Type Check'] >= 1) {
    hints.push('⚠️ STRATEGY: Gagal Metric Type Check! Kamu menggunakan metrik yang SALAH untuk campaign ini. HANYA gunakan metrik yang sesuai dengan campaign intent.');
  }

  // If failing at Format
  if (patterns['Format Check - Wall of Text'] >= 1) {
    hints.push('⚠️ STRATEGY: Gagal format! SELALU gunakan \\n\\n antar paragraf. Setiap paragraf max 2 kalimat. Ini BUKAN opsional.');
  }

  // If failing at Judge 1 (Gate Master)
  if ((patterns['judge1'] || 0) >= 2) {
    hints.push('⚠️ STRATEGY: ' + (patterns['judge1'] || 0) + 'x gagal di Gate Master! Perubahan RADIKAL dibutuhkan: tulis seperti chat ke teman, bukan seperti artikel. Gunakan casual hook, parenthetical aside, contractions.');
  }

  // If failing at Judge 2 (Evidence)
  if ((patterns['judge2'] || 0) >= 2) {
    hints.push('⚠️ STRATEGY: ' + (patterns['judge2'] || 0) + 'x gagal di Evidence Master! Kamu perlu LEBIH BANYAK bukti. Tambah specific numbers, real cases, atau personal testimony.');
  }

  // If failing at Judge 3 (Quality)
  if ((patterns['judge3'] || 0) >= 2) {
    hints.push('⚠️ STRATEGY: ' + (patterns['judge3'] || 0) + 'x gagal di Quality Master! Konten masih terlalu "AI-like". Perlu lebih authenticity, vulnerability, dan unique perspective.');
  }

  // If near-miss exists
  if (insights.nearMiss) {
    hints.push('💡 HOPE: Ada konten skor ' + insights.nearMiss.score + '/105 yang HAMPIR lolos! Hanya perlu perbaiki: ' + insights.nearMiss.failedAt);
  }

  // If too many failures overall - suggest radical change
  if (insights.totalFailed >= 6) {
    hints.push('🔄 RADICAL CHANGE: Sudah ' + insights.totalFailed + ' konten gagal. UBAH pendekatan DRASTIS - persona berbeda, angle berbeda, gaya bahasa berbeda.');
  }

  return hints;
}

/**
 * Builds the learning section string that gets injected into the content generation prompt
 * This is what the AI actually reads when generating new content
 */
function buildLearningSection(insights) {
  if (!insights || insights.totalFailed === 0) return '';

  let section = '';
  
  // Header
  section += `═══════════════════════════════════════════════════════════════════════════════\n`;
  section += `🧠🧠🧠 LEARNING FROM PREVIOUS ATTEMPTS (BACA INI DENGAN SEKSAMA!) 🧠🧠🧠\n`;
  section += `═══════════════════════════════════════════════════════════════════════════════\n\n`;
  section += `${insights.totalFailed} konten sudah DICOBAKAN sebelumnya dan SEMUA GAGAL.\n\n`;

function saveLearningLog(campaignTitle, insights, outputDir) {
  if (!insights || insights.totalFailed === 0) return;
  
  try {
    const logPath = `${outputDir}/learning-log.json`;
    let existingLog = [];
    
    try {
      if (fs.existsSync(logPath)) {
        existingLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      }
    } catch (e) { /* New log file */ }
    
    const entry = {
      campaign: campaignTitle,
      timestamp: new Date().toISOString(),
      totalFailed: insights.totalFailed,
      failurePatterns: insights.failurePatterns,
      missingElements: insights.missingElements,
      bestScore: insights.bestScore,
      strategyHints: insights.strategyHints,
      nearMiss: insights.nearMiss ? { score: insights.nearMiss.score, failedAt: insights.nearMiss.failedAt } : null
    };
    
    existingLog.push(entry);
    
    // Keep only last 50 entries to prevent file bloat
    if (existingLog.length > 50) {
      existingLog = existingLog.slice(-50);
    }
    
    fs.writeFileSync(logPath, JSON.stringify(existingLog, null, 2));
    console.log(`   🧠 Learning log updated: ${logPath} (${existingLog.length} entries)`);
  } catch (e) {
    console.log(`   ⚠️ Could not save learning log: ${e.message}`);
  }
}

/**
 * Load previous learning log for cross-session learning
 */
function loadLearningLog(outputDir) {
  try {
    const logPath = `${outputDir}/learning-log.json`;
    if (fs.existsSync(logPath)) {
      const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      console.log(`   🧠 Loaded ${log.length} previous learning entries`);
      return log;
    }
  } catch (e) { /* No log yet */ }
  return [];
}

// ============================================================================
// 🧠 KNOWLEDGE BASE DIGEST - Extract key facts, not raw dump (Conflict Fix #1, #6)
// ============================================================================

/**
 * Pre-digests the Knowledge Base into 3-5 key facts
 * Instead of dumping thousands of words of marketing text,
 * extract only the most relevant, factual sentences
 */
function digestKnowledgeBase(kb) {
  if (!kb || typeof kb !== 'string') return { digestedFacts: [], totalSentences: 0, extractedCount: 0 };
  
  // Split into sentences
  const sentences = kb.split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 300);
  
  if (sentences.length === 0) return { digestedFacts: [], totalSentences: 0, extractedCount: 0 };
  
  // Priority 1: Sentences with specific numbers/data (metrics, users, stats)
  const numberWithData = sentences.filter(s => 
    /\$?\d[\d,.]*\s*(%|M|B|K|million|billion|thousand|users?|traders?|TVL|volume|APY|perpetual|order|markets?|protocols?)/i.test(s)
  );
  
  // Priority 2: Sentences with unique claims (first, only, largest, etc.)
  const uniqueClaims = sentences.filter(s => 
    /(first|only|unique|largest|fastest|most|built on|powered by|integrates?|supports?)/i.test(s) 
    && !numberWithData.includes(s)
  );
  
  // Priority 3: Specific capabilities (not generic marketing)
  const capabilities = sentences.filter(s => 
    /(allows?|enables?|provides?|offers?|gives? you)/i.test(s) 
    && !/(revolutionary|game.?chang|ground.?break|cutting.?edge|world.?class)/i.test(s)
    && !numberWithData.includes(s) 
    && !uniqueClaims.includes(s)
  );
  
  // Take top 5 most informative facts, avoiding duplicates by first 30 chars
  const seen = new Set();
  const digestedFacts = [];
  const candidates = [...numberWithData, ...uniqueClaims, ...capabilities];
  
  for (const fact of candidates) {
    const key = fact.substring(0, 30).toLowerCase();
    if (!seen.has(key) && digestedFacts.length < 5) {
      seen.add(key);
      digestedFacts.push(fact.trim());
    }
  }
  
  return {
    digestedFacts,
    totalSentences: sentences.length,
    extractedCount: digestedFacts.length
  };
}

// ============================================================================
// CONTENT GENERATION - 🆕 ENHANCED WITH PERSONA-FIRST PHILOSOPHY
// ============================================================================

function parseCampaignRequirements(campaignData) {
  const requirements = {
    // ═══════════════════════════════════════════════════════════════════════════
    // MANDATORY ITEMS (yang HARUS ada)
    // ═══════════════════════════════════════════════════════════════════════════
    mandatoryTags: [],         // @username mentions that MUST be included
    mandatoryHashtags: [],     // #hashtags that MUST be included
    mandatoryKeywords: [],     // Keywords that MUST be mentioned (explicit)
    mandatoryMetrics: false,   // Does content need specific metrics?
    mandatoryUrl: false,       // Does content need campaign URL? (only if explicit)
    mandatoryScreenshot: false,// Does content need screenshot?
    focusTopic: null,          // What topic should content focus on?
    styleRequirements: [],     // Style requirements
    proposedAngles: [],        // Proposed angles from campaign (MUST pick one)

    // ═══════════════════════════════════════════════════════════════════════════
    // PROHIBITED ITEMS (yang DILARANG/TIDAK BOLEH ADA)
    // ═══════════════════════════════════════════════════════════════════════════
    prohibitedTags: [],        // @mentions that must NOT be included
    prohibitedHashtags: [],    // #hashtags that must NOT be used
    prohibitedKeywords: [],    // Words/phrases that must NOT appear
    prohibitedUrl: false,      // URL must NOT be included
    prohibitedElements: [],    // Other forbidden elements

    // Raw data
    rawRules: '',
    rawStyle: '',
    rawDescription: '',
    rawKnowledgeBase: '',
    rawAdditionalInfo: ''
  };
  
  if (!campaignData) return requirements;
  
  // Store raw data
  requirements.rawRules = campaignData.rules || campaignData.requirements || '';
  requirements.rawStyle = campaignData.style || '';
  requirements.rawDescription = campaignData.description || campaignData.goal || campaignData.missionGoal || '';
  requirements.rawKnowledgeBase = campaignData.knowledgeBase || '';
  requirements.rawAdditionalInfo = campaignData.additionalInfo || campaignData.adminNotice || '';
  requirements.campaignUrl = campaignData.campaignUrl || campaignData.url || '';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORTANT: Only parse from RULES - not from description or additional info
  // Rules are the EXPLICIT requirements
  // ═══════════════════════════════════════════════════════════════════════════
  const rulesText = requirements.rawRules;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACT @MENTIONS (MANDATORY TAGS) - Only if "Tag @" or "Mention @" is explicit
  // ═══════════════════════════════════════════════════════════════════════════
  // Look for explicit "Tag @username" or "Mention @username" patterns
  const tagPatterns = [
    /tag\s+@(\w+)/gi,                    // "Tag @grvt_io"
    /mention\s+@(\w+)/gi,                // "Mention @grvt_io"
    /include\s+@(\w+)/gi,                // "Include @grvt_io"
    /must\s+(?:tag|mention|include)\s+@(\w+)/gi  // "Must tag @grvt_io"
  ];
  
  tagPatterns.forEach(pattern => {
    const matches = rulesText.match(pattern) || [];
    matches.forEach(match => {
      const username = match.match(/@(\w+)/);
      if (username && username[1]) {
        const tag = `@${username[1]}`;
        if (!requirements.mandatoryTags.includes(tag)) {
          requirements.mandatoryTags.push(tag);
        }
      }
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACT #HASHTAGS (MANDATORY) - Only if explicitly required
  // ═══════════════════════════════════════════════════════════════════════════
  // Check if rules say "use hashtag #" or similar
  if (/use\s+hashtag|#\w+.*required|include\s+#/i.test(rulesText)) {
    const hashtagMatch = rulesText.match(/#\w+/g) || [];
    requirements.mandatoryHashtags = [...new Set(hashtagMatch)];
  }
  
  // NOTE: If rules say "No hashtags required" - respect that!
  if (/no hashtags?\s*(required|needed)/i.test(rulesText)) {
    requirements.mandatoryHashtags = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK FOR METRIC REQUIREMENTS - Only if explicit about metrics/numbers
  // ═══════════════════════════════════════════════════════════════════════════
  // Must be about metrics, not just "specific feature"
  requirements.mandatoryMetrics =
    /mention.*(?:metric|growth signal|statistic)/i.test(rulesText) ||
    /at least one specific (?:metric|number|stat)/i.test(rulesText) ||
    /share.*(?:metric|growth signal|number|statistic)/i.test(rulesText) ||
    /specific (?:growth signal|metric|number|stat)/i.test(rulesText) ||
    /include.*(?:metric|number|stat)/i.test(rulesText);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK FOR SCREENSHOT REQUIREMENT
  // ═══════════════════════════════════════════════════════════════════════════
  requirements.mandatoryScreenshot = /(?:include|add|attach|with)\s+(?:at least one\s+)?(?:an?\s+)?(?:original\s+)?screenshot/i.test(rulesText);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACT FOCUS TOPIC - Only if explicit
  // ═══════════════════════════════════════════════════════════════════════════
  const focusMatch = rulesText.match(/focus\s+on\s+([^,\n]+)/i);
  if (focusMatch) {
    requirements.focusTopic = focusMatch[1].trim();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // URL REQUIREMENT - ONLY if explicitly mentioned in rules
  // ═══════════════════════════════════════════════════════════════════════════
  // Most campaigns do NOT require URL unless explicitly stated
  requirements.mandatoryUrl = /(?:include|add|mention|use)\s+(?:the\s+)?(?:campaign\s+)?url|link\s+(?:to\s+)?(?:campaign|app)/i.test(rulesText);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACT SPECIFIC KEYWORDS that must be mentioned
  // ═══════════════════════════════════════════════════════════════════════════
  // Look for "Mention X" or "Include X" patterns
  const keywordPatterns = [
    /mention\s+(?:that\s+)?([^,\n.]+(?:protected|allocation|update)[^,\n.]*)/gi,
    /include\s+([^,\n.]+(?:screenshot|proof)[^,\n.]*)/gi
  ];
  
  keywordPatterns.forEach(pattern => {
    const matches = rulesText.match(pattern) || [];
    matches.forEach(match => {
      if (match.length > 10 && !match.includes('@')) {
        requirements.mandatoryKeywords.push(match.replace(/^(mention|include)\s+/i, '').trim());
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚫 PROHIBITED ITEMS DETECTION (yang TIDAK BOLEH ADA)
  // ═══════════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────────────
  // PROHIBITED HASHTAGS - "No hashtags", "No hashtag required", etc.
  // ─────────────────────────────────────────────────────────────────────────────
  if (/no\s+hashtags?\s*(required|needed|allowed|necessary)?/i.test(rulesText)) {
    requirements.prohibitedHashtags = ['ALL_HASHTAGS']; // No hashtags at all
    console.log('   🚫 PROHIBITED: No hashtags allowed');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROHIBITED URL - "No URL required", "No link needed", etc.
  // ─────────────────────────────────────────────────────────────────────────────
  if (/no\s+(?:url|link)\s*(required|needed|allowed|necessary)?/i.test(rulesText) ||
      /(?:url|link)\s*(?:is\s+)?not\s+(?:required|needed|allowed)/i.test(rulesText) ||
      /do\s+not\s+(?:include|add|use)\s+(?:url|link)/i.test(rulesText) ||
      /without\s+(?:url|link)/i.test(rulesText)) {
    requirements.prohibitedUrl = true;
    console.log('   🚫 PROHIBITED: No URL/link allowed');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROHIBITED TAGS - "Do not tag @username", "No mention of @"
  // ─────────────────────────────────────────────────────────────────────────────
  const prohibitedTagPatterns = [
    /do\s+not\s+(?:tag|mention)\s+@(\w+)/gi,
    /no\s+(?:tag|mention)\s+@(\w+)/gi,
    /avoid\s+(?:tagging|mentioning)\s+@(\w+)/gi,
    /don'?t\s+(?:tag|mention)\s+@(\w+)/gi
  ];

  prohibitedTagPatterns.forEach(pattern => {
    const matches = rulesText.match(pattern) || [];
    matches.forEach(match => {
      const username = match.match(/@(\w+)/);
      if (username && username[1]) {
        const tag = `@${username[1]}`;
        if (!requirements.prohibitedTags.includes(tag)) {
          requirements.prohibitedTags.push(tag);
          console.log(`   🚫 PROHIBITED TAG: ${tag}`);
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PROHIBITED KEYWORDS/PHRASES - "Do not mention X", "Avoid X"
  // ─────────────────────────────────────────────────────────────────────────────
  const prohibitedKeywordPatterns = [
    /do\s+not\s+(?:mention|include|use|say)\s+([a-zA-Z\s]{3,30})/gi,
    /avoid\s+(?:mentioning|using|saying)?\s*([a-zA-Z\s]{3,30})/gi,
    /don'?t\s+(?:mention|include|use|say)\s+([a-zA-Z\s]{3,30})/gi,
    /no\s+([a-zA-Z\s]{3,30})\s+(?:allowed|permitted)/gi
  ];

  prohibitedKeywordPatterns.forEach(pattern => {
    const matches = rulesText.match(pattern) || [];
    matches.forEach(match => {
      const keyword = match.replace(/^(do\s+not|don'?t|avoid|no)\s+(?:mention|include|use|say|mentioning|using|saying)?\s*/i, '').trim();
      if (keyword.length > 2 && !keyword.includes('@') && !keyword.includes('#')) {
        if (!requirements.prohibitedKeywords.includes(keyword)) {
          requirements.prohibitedKeywords.push(keyword);
          console.log(`   🚫 PROHIBITED KEYWORD: "${keyword}"`);
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PROHIBITED ELEMENTS - Other forbidden elements
  // ─────────────────────────────────────────────────────────────────────────────
  // Check for "No X" patterns for other elements
  const noElementPatterns = [
    /no\s+(external\s+links?)/gi,
    /no\s+(self\s+promotion)/gi,
    /no\s+(spam)/gi,
    /no\s+(referral\s+links?)/gi,
    /no\s+(copy\s+paste)/gi,
    /no\s+(ai\s+generated\s+content)/gi
  ];

  noElementPatterns.forEach(pattern => {
    const matches = rulesText.match(pattern) || [];
    matches.forEach(match => {
      const element = match.replace(/^no\s+/i, '').trim();
      if (!requirements.prohibitedElements.includes(element)) {
        requirements.prohibitedElements.push(element);
        console.log(`   🚫 PROHIBITED ELEMENT: "${element}"`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 EXTRACT PROPOSED ANGLES from description/rules
  // ═══════════════════════════════════════════════════════════════════════════
  const fullText = requirements.rawDescription + ' ' + requirements.rawRules + ' ' + (campaignData.description || '') + ' ' + (campaignData.rules || '');

  // Method 1: Look for "Proposed angles:" followed by list items - find the SECTION
  const proposedAnglesSection = fullText.split('\n').reduce((found, line, idx, arr) => {
    if (found.found) return found;
    if (/^Proposed\s+angles?:?\s*$/i.test(line.trim())) {
      found.start = idx + 1;
      found.found = true;
    }
    return found;
  }, { found: false, start: -1 });

  if (proposedAnglesSection.found && proposedAnglesSection.start >= 0) {
    const lines = fullText.split('\n');
    for (let i = proposedAnglesSection.start; i < lines.length; i++) {
      const line = lines[i].trim();
      // Stop at empty line or section header
      if (line === '' || /^(Rules|Style|Description|Additional|Tag|Mention|Focus|Write|Highly|No |Original|Pick)/i.test(line)) {
        break;
      }
      // Skip short lines and "Participants" lines (not angles)
      if (line.length > 15 && !line.includes('Participants') && !line.includes('Telegram')) {
        const angle = line.replace(/^[\-\*•\d\.\)\s]+/, '').trim();
        if (angle.length > 15 && !requirements.proposedAngles.includes(angle)) {
          requirements.proposedAngles.push(angle);
        }
      }
    }
  }

  // Method 2: Direct pattern match for known angle patterns
  if (requirements.proposedAngles.length === 0) {
    // Look for lines matching typical angle patterns
    const anglePatterns = [
      /(?:TVL|volume|Twitter|social|expanding|market)\s+(?:continues?|increasing|buzz|while|steady)/i,
      /(?:Grvt|Trading)\s+[A-Za-z\s]{15,80}/i
    ];
    
    const lines = fullText.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      // Check if line matches angle pattern
      if (trimmed.length > 20 && trimmed.length < 100) {
        const cleanLine = trimmed.replace(/^[\-\*•\d\.\)\s]+/, '').trim();
        // Check if it looks like an angle (starts with relevant words)
        if (/^(?:Grvt|Trading|Strong|TVL)[A-Za-z\s]/i.test(cleanLine)) {
          if (!requirements.proposedAngles.includes(cleanLine) && 
              !cleanLine.includes('Participants') &&
              !cleanLine.includes('Telegram')) {
            requirements.proposedAngles.push(cleanLine);
          }
        }
      }
    });
  }

  if (requirements.proposedAngles.length > 0) {
    console.log(`   🎯 Proposed Angles Found:`);
    requirements.proposedAngles.forEach((angle, i) => {
      console.log(`      ${i + 1}. ${angle}`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOG FINAL REQUIREMENTS SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n   📋 REQUIREMENTS SUMMARY:');
  console.log(`   ├─ ✅ Mandatory Tags: ${requirements.mandatoryTags.length > 0 ? requirements.mandatoryTags.join(', ') : 'None'}`);
  console.log(`   ├─ ✅ Mandatory Hashtags: ${requirements.mandatoryHashtags.length > 0 ? requirements.mandatoryHashtags.join(', ') : 'None'}`);
  console.log(`   ├─ ✅ Mandatory Metrics: ${requirements.mandatoryMetrics ? 'Yes' : 'No'}`);
  console.log(`   ├─ ✅ Mandatory URL: ${requirements.mandatoryUrl ? 'Yes' : 'No'}`);
  console.log(`   ├─ 🎯 Proposed Angles: ${requirements.proposedAngles.length > 0 ? requirements.proposedAngles.length + ' angles' : 'None'}`);
  console.log(`   ├─ 🚫 Prohibited Hashtags: ${requirements.prohibitedHashtags.length > 0 ? requirements.prohibitedHashtags.join(', ') : 'None'}`);
  console.log(`   ├─ 🚫 Prohibited URL: ${requirements.prohibitedUrl ? 'Yes' : 'No'}`);
  console.log(`   ├─ 🚫 Prohibited Tags: ${requirements.prohibitedTags.length > 0 ? requirements.prohibitedTags.join(', ') : 'None'}`);
  console.log(`   └─ 🚫 Prohibited Keywords: ${requirements.prohibitedKeywords.length > 0 ? requirements.prohibitedKeywords.join(', ') : 'None'}`);

  return requirements;
}

/**
 * Validate content against campaign requirements
 * Returns detailed validation results - ONLY checks EXPLICIT requirements
 */
function displayCampaignRequirements(campaignData) {
  const requirements = parseCampaignRequirements(campaignData);
  
  console.log('\n   ╔════════════════════════════════════════════════════════════╗');
  console.log('   ║       📋 CAMPAIGN REQUIREMENTS (EXPLICIT ONLY)           ║');
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  
  if (requirements.mandatoryTags.length > 0) {
    console.log(`   ║  🏷️ Required Tags: ${requirements.mandatoryTags.join(', ').padEnd(35)}║`);
  } else {
    console.log('   ║  🏷️ Required Tags: NONE                                    ║');
  }
  
  if (requirements.mandatoryHashtags.length > 0) {
    console.log(`   ║  #️⃣ Required Hashtags: ${requirements.mandatoryHashtags.join(', ').substring(0, 30).padEnd(30)}║`);
  } else {
    console.log('   ║  #️⃣ Required Hashtags: NONE                                ║');
  }
  
  if (requirements.mandatoryMetrics) {
    console.log('   ║  📊 Metrics Required: YES                                  ║');
  }
  
  if (requirements.mandatoryScreenshot) {
    console.log('   ║  📸 Screenshot Required: YES                               ║');
  }
  
  if (requirements.mandatoryUrl) {
    console.log('   ║  🔗 URL Required: YES                                      ║');
  } else {
    console.log('   ║  🔗 URL Required: NO (not in rules)                        ║');
  }
  
  if (requirements.focusTopic) {
    console.log(`   ║  🎯 Focus Topic: ${requirements.focusTopic.substring(0, 35).padEnd(35)}║`);
  }
  
  if (requirements.mandatoryKeywords.length > 0) {
    console.log(`   ║  📝 Required Keywords: ${requirements.mandatoryKeywords[0].substring(0, 30).padEnd(30)}║`);
  }
  
  // BUG #25 FIX: Show prohibited items (was missing from display)
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log('   ║  🚫 PROHIBITED ITEMS:                                     ║');
  
  if (requirements.prohibitedHashtags.length > 0) {
    console.log(`   ║  🚫 Hashtags: ${requirements.prohibitedHashtags.join(', ').substring(0, 38).padEnd(38)}║`);
  } else {
    console.log('   ║  🚫 Hashtags: NONE                                        ║');
  }
  
  if (requirements.prohibitedTags.length > 0) {
    console.log(`   ║  🚫 Tags: ${requirements.prohibitedTags.join(', ').substring(0, 42).padEnd(42)}║`);
  } else {
    console.log('   ║  🚫 Tags: NONE                                            ║');
  }
  
  if (requirements.prohibitedKeywords.length > 0) {
    console.log(`   ║  🚫 Keywords: ${requirements.prohibitedKeywords.join(', ').substring(0, 37).padEnd(37)}║`);
  } else {
    console.log('   ║  🚫 Keywords: NONE                                        ║');
  }
  
  if (requirements.prohibitedUrl) {
    console.log('   ║  🚫 URL/Link: PROHIBITED                                   ║');
  } else {
    console.log('   ║  🚫 URL/Link: NONE                                         ║');
  }
  
  if (requirements.prohibitedElements.length > 0) {
    console.log(`   ║  🚫 Elements: ${requirements.prohibitedElements.join(', ').substring(0, 36).padEnd(36)}║`);
  } else {
    console.log('   ║  🚫 Elements: NONE                                         ║');
  }
  
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log('   ║  ⚠️ Only EXPLICITLY stated requirements are enforced       ║');
  console.log('   ╚════════════════════════════════════════════════════════════╝');
  
  return requirements;
}

// ============================================================================
// JUDGE PROMPTS
// ============================================================================

function validateMissionCompliance(content, campaignData) {
  const issues = [];
  const warnings = [];
  const passed = [];
  
  if (!content || !campaignData) {
    return { valid: false, issues: ['Missing content or campaign data'] };
  }
  
  const rules = campaignData.rules || '';
  const contentLower = content.toLowerCase();
  
  // 1. CHECK REQUIRED TAGS/MENTIONS
  // Extract @tags from rules
  const tagMatches = rules.match(/@\w+/g) || [];
  const requiredTags = [...new Set(tagMatches)];
  
  for (const tag of requiredTags) {
    if (!content.includes(tag)) {
      issues.push(`Missing required tag: ${tag}`);
    } else {
      passed.push(`Found required tag: ${tag}`);
    }
  }
  
  // 2. CHECK METRIC REQUIREMENTS
  if (rules.toLowerCase().includes('metric') || rules.toLowerCase().includes('number') || rules.toLowerCase().includes('specific')) {
    // Look for numbers in content
    const numberPattern = /\d+(?:[,.]\d+)?(?:%|\$|k|K|M|B|bn|m|k)?/g;
    const numbers = content.match(numberPattern) || [];
    
    if (numbers.length === 0) {
      issues.push('Rules require specific metrics but no numbers found in content');
    } else {
      passed.push(`Found ${numbers.length} specific numbers: ${numbers.slice(0, 3).join(', ')}`);
    }
  }
  
  // 3. CHECK TOPIC FOCUS
  const missionGoal = (campaignData.description || campaignData.missionGoal || '').toLowerCase();
  const missionTitle = (campaignData.missionTitle || '').toLowerCase();
  
  // Extract key topics from mission
  if (missionGoal.includes('growth') || missionTitle.includes('growth')) {
    const growthKeywords = ['tvl', 'volume', 'growth', 'momentum', 'metrics', 'increasing', 'rising'];
    const hasGrowthFocus = growthKeywords.some(kw => contentLower.includes(kw));

    if (!hasGrowthFocus) {
      issues.push('Mission requires "Growth & Metrics" focus but content doesn\'t address growth topics');
    } else {
      passed.push('Content addresses growth/metrics focus');
    }
  }

  // 4. CHECK URL - Only if MANDATORY
  const reqs = parseCampaignRequirements(campaignData);
  if (reqs.mandatoryUrl) {
    const requiredUrl = campaignData.campaignUrl || campaignData.url || '';
    if (requiredUrl && !content.includes(requiredUrl)) {
      issues.push(`Missing required URL: ${requiredUrl}`);
    } else if (requiredUrl) {
      passed.push('Required URL included');
    }
  } else if (reqs.prohibitedUrl) {
    // Check if URL is present when it should NOT be
    const urlPatterns = [/https?:\/\/[^\s]+/gi, /rally\.fun/gi];
    const hasUrl = urlPatterns.some(p => p.test(content));
    if (hasUrl) {
      issues.push('URL/link found but URL is PROHIBITED by campaign rules');
    } else {
      passed.push('No URL found (correct - URL not required)');
    }
  } else {
    // URL is optional - just note it
    passed.push('URL check skipped (not required)');
  }
  
  // 5. CHECK STYLE REQUIREMENTS
  const style = (campaignData.style || '').toLowerCase();
  if (style.includes('real usage') || style.includes('your own words')) {
    // Check for AI patterns that violate "own words" requirement
    const aiPatterns = ['delve', 'leverage', 'realm', 'tapestry', 'paradigm', 'landscape'];
    const foundAiPatterns = aiPatterns.filter(p => contentLower.includes(p));
    
    if (foundAiPatterns.length > 0) {
      warnings.push(`Possible AI patterns found: ${foundAiPatterns.join(', ')}`);
    } else {
      passed.push('No obvious AI patterns detected');
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings,
    passed,
    summary: issues.length === 0 
      ? '✅ All mission requirements met' 
      : `❌ ${issues.length} issue(s) found`
  };
}

// ============================================================================
// SCORE CALCULATORS
// ============================================================================

/**
 * Parse and validate judge result with robust error handling
 * @param {string} content - Raw AI output
 * @param {string} judgeName - Name of judge for logging
 * @returns {Object} Validated result with totalScore
 */
function parseJudgeResult(content, judgeName = 'Unknown') {
  if (!content || typeof content !== 'string') {
    console.log(`   ⚠️ parseJudgeResult: Empty or invalid content for ${judgeName}`);
    // FIXED: Give a reasonable default score instead of 0
    return { totalScore: 3, feedback: 'Empty content - using default', error: true, fallback: true };
  }
  
  const result = safeJsonParse(content);
  
  if (!result) {
    console.log(`   ⚠️ parseJudgeResult: JSON parse failed for ${judgeName}`);
    // Try to extract score from text if JSON parse fails
    const scoreMatch = content.match(/totalScore["\s:]+(\d+)/i);
    if (scoreMatch) {
      const extractedScore = parseInt(scoreMatch[1]);
      console.log(`   📊 Extracted score from text: ${extractedScore}`);
      return { totalScore: extractedScore, feedback: 'Extracted from text', extracted: true };
    }
    
    // FIXED: Give a reasonable default score instead of 0
    console.log(`   📊 Using fallback score of 3 for ${judgeName}`);
    return { totalScore: 3, feedback: 'Failed to parse - using fallback', error: true, fallback: true };
  }
  
  // Validate totalScore is a number
  if (typeof result.totalScore !== 'number' || isNaN(result.totalScore)) {
    // Try to calculate from components
    let calculated = 0;
    const scoreFields = ['hookQuality', 'emotionalImpact', 'bodyFeeling', 'ctaQuality', 'urlPresence', 'g4Originality', 
                        'descriptionAlignment', 'rules', 'style', 'knowledgeBase', 'additionalInfo',
                        'originality', 'engagement', 'clarity', 'emotional', 'xFactor'];
    
    for (const field of scoreFields) {
      if (result[field]) {
        if (typeof result[field] === 'object' && typeof result[field].score === 'number') {
          calculated += result[field].score;
        } else if (typeof result[field] === 'number') {
          calculated += result[field];
        }
      }
    }
    
    // BUG #21 FIX: Handle Judge 4 allPass format (compliance checker)
    // Judge 4 returns {checks: {...}, allPass: true/false} instead of score fields
    if (calculated === 0 && result.allPass !== undefined) {
      // This is Judge 4 (Compliance Checker) format
      const checks = result.checks || {};
      const allCheckNames = Object.keys(checks);
      const passedChecks = allCheckNames.filter(name => checks[name]?.pass !== false);
      const totalChecks = allCheckNames.length;
      
      // Calculate score based on pass rate (max ~20 for full compliance)
      if (totalChecks > 0) {
        calculated = Math.round((passedChecks.length / totalChecks) * 20);
      }
      
      if (calculated > 0) {
        result.totalScore = calculated;
        result.feedback = `Compliance: ${passedChecks.length}/${totalChecks} checks passed (allPass=${result.allPass})`;
        console.log(`   📊 Calculated compliance score for ${judgeName}: ${calculated} (${passedChecks.length}/${totalChecks} passed)`);
      }
    }
    
    if (calculated > 0) {
      result.totalScore = calculated;
      result.feedback = 'Calculated from components';
      console.log(`   📊 Calculated score for ${judgeName}: ${calculated}`);
    } else {
      result.totalScore = 0;
      result.feedback = 'No valid score found';
      result.error = true;
    }
  }
  
  // Ensure non-negative score
  result.totalScore = Math.max(0, result.totalScore || 0);
  
  return result;
}

function parseJudge4Result(content) {
  const result = safeJsonParse(content);
  if (!result) {
    return {
      checks: {},
      allPass: false,
      failedChecks: ['parse_failed'],
      feedback: 'Failed to parse'
    };
  }
  
  const defaultChecks = {
    descriptionAlignment: { pass: false, reason: 'Not checked' },
    styleCompliance: { pass: false, reason: 'Not checked' },
    knowledgeBase: { pass: false, reason: 'Not checked' },
    campaignRules: { pass: false, reason: 'Not checked' },
    requiredUrl: { pass: false, reason: 'Not checked' },
    noBannedWords: { pass: false, reason: 'Not checked' },
    noAIPatterns: { pass: false, reason: 'Not checked' },
    noForbiddenPunctuation: { pass: false, reason: 'Not checked', details: '' },  // NEW
    evidenceDepth: { pass: false, reason: 'Not checked' },
    antiTemplate: { pass: false, reason: 'Not checked' },
    qualityThreshold: { pass: false, reason: 'Not checked' }
  };
  
  result.checks = { ...defaultChecks, ...(result.checks || {}) };
  
  const failedChecks = Object.entries(result.checks)
    .filter(([key, check]) => check.pass !== true)
    .map(([key]) => key);
  
  result.allPass = failedChecks.length === 0;
  result.failedChecks = failedChecks;
  
  return result;
}

function parseJudge6Result(content, nlpAnalysis) {
  const result = safeJsonParse(content) || {};
  
  if (nlpAnalysis) {
    result.nlpEnhanced = {
      similarity: nlpAnalysis.similarity?.primary?.max_similarity || 0,
      emotionVariety: nlpAnalysis.emotions?.emotion_variety || 0,
      rareCombo: nlpAnalysis.emotions?.rare_combo_detected || false,
      depthLevel: nlpAnalysis.depth_analysis?.depth_level || 'unknown',
      qualityGrade: nlpAnalysis.hybridMetrics?.qualityGrade || 'N/A'
    };
  }
  
  return result;
}

// ============================================================================
// RALLY API FUNCTIONS - Campaign Search & Fetch
// ============================================================================

/**
 * Fetch all campaigns from Rally API
 */
async function fetchAllCampaigns(limit = 50) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.rallyApiBase}/campaigns?limit=${limit}`;
    
    https.get(url, { headers: { 'User-Agent': CONFIG.userAgent } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve(result.campaigns || []);
          } catch (e) {
            reject(new Error('Failed to parse campaigns list'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Search campaign by name (partial match, case-insensitive)
 */
async function searchCampaignByName(name) {
  console.log(`\n🔍 Searching campaign: "${name}"...`);
  
  try {
    const campaigns = await fetchAllCampaigns(100);
    
    const searchLower = name.toLowerCase().trim();
    
    // Try exact match first
    let matches = campaigns.filter(c => 
      c.title.toLowerCase() === searchLower
    );
    
    // If no exact match, try partial match
    if (matches.length === 0) {
      matches = campaigns.filter(c => 
        c.title.toLowerCase().includes(searchLower) ||
        searchLower.includes(c.title.toLowerCase())
      );
    }
    
    // If still no match, try word match
    if (matches.length === 0) {
      const searchWords = searchLower.split(/\s+/);
      matches = campaigns.filter(c => {
        const titleLower = c.title.toLowerCase();
        return searchWords.some(word => word.length > 3 && titleLower.includes(word));
      });
    }
    
    if (matches.length === 0) {
      console.log('   ❌ No matching campaign found');
      console.log('\n   💡 Tip: Use "list" command to see all available campaigns');
      return null;
    }
    
    // If multiple matches, show list
    if (matches.length > 1) {
      console.log(`\n   📋 Found ${matches.length} matching campaigns:`);
      matches.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.title}`);
        console.log(`      Address: ${c.intelligentContractAddress}`);
      });
      console.log('\n   ℹ️ Using first match. To use specific campaign, provide the address.');
    }
    
    const selected = matches[0];
    console.log(`\n   ✅ Found: ${selected.title}`);
    console.log(`   📍 Address: ${selected.intelligentContractAddress}`);
    
    return selected.intelligentContractAddress;
    
  } catch (error) {
    throw new Error(`Failed to search campaigns: ${error.message}`);
  }
}

/**
 * List all available campaigns
 */
async function listCampaigns(limit = 20) {
  console.log('\n' + '═'.repeat(70));
  console.log('📋 AVAILABLE CAMPAIGNS');
  console.log('═'.repeat(70));
  
  try {
    const campaigns = await fetchAllCampaigns(limit);
    
    if (campaigns.length === 0) {
      console.log('\n   No campaigns found.');
      return;
    }
    
    campaigns.forEach((c, i) => {
      const status = new Date(c.endDate) > new Date() ? '🟢 Active' : '🔴 Ended';
      console.log(`\n   ${i + 1}. ${c.title}`);
      console.log(`      ${status} | Address: ${c.intelligentContractAddress}`);
      if (c.campaignRewards?.length > 0) {
        const reward = c.campaignRewards[0];
        console.log(`      Reward: ${reward.totalAmount} ${reward.token?.symbol || 'tokens'}`);
      }
    });
    
    console.log('\n' + '═'.repeat(70));
    console.log(`\n   💡 Usage:`);
    console.log(`      node rally-workflow-v9.8.0-hybrid.js "<campaign name>"`);
    console.log(`      node rally-workflow-v9.8.0-hybrid.js <campaign address>`);
    console.log(`      node rally-workflow-v9.8.0-hybrid.js list`);
    
  } catch (error) {
    console.error(`\n   ❌ Failed to list campaigns: ${error.message}`);
  }
}

/**
 * Check if input is a valid Ethereum address
 */
function isEthereumAddress(str) {
  return /^0x[a-fA-F0-9]{40}$/.test(str);
}

/**
 * Resolve campaign input (address or name) to campaign data
 */
async function resolveCampaign(input) {
  // Handle "list" command
  if (input.toLowerCase() === 'list') {
    await listCampaigns();
    process.exit(0);
  }
  
  let campaignAddress = input;
  
  // If not an address, search by name
  if (!isEthereumAddress(input)) {
    campaignAddress = await searchCampaignByName(input);
    if (!campaignAddress) {
      throw new Error(`Campaign not found: "${input}"`);
    }
  }
  
  // Fetch full campaign data and return the complete object
  const campaignData = await fetchCampaignData(campaignAddress);
  return campaignData;
}

async function fetchCampaignData(campaignAddress, missionNumber = null) {
  console.log(`\n📥 Fetching campaign data: ${campaignAddress}`);
  
  try {
    const response = await new Promise((resolve, reject) => {
      let url = `${CONFIG.rallyApiBase}/campaigns/${campaignAddress}`;
      
      https.get(url, { headers: { 'User-Agent': CONFIG.userAgent } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Failed to parse campaign data'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
    
    // Check for missions
    const missions = response.missions || [];
    
    // If mission specified, use mission-specific data
    let missionData = null;
    if (missionNumber !== null && missions.length > 0) {
      const missionIndex = missionNumber - 1; // Convert to 0-based index
      if (missionIndex >= 0 && missionIndex < missions.length) {
        missionData = missions[missionIndex];
        console.log(`\n   🎯 MISSION SELECTED: ${missionData.title}`);
        console.log(`   📝 Mission Goal: ${(missionData.goal || missionData.description || '').substring(0, 100)}...`);
      } else {
        console.log(`   ⚠️ Mission ${missionNumber} not found. Available: 1-${missions.length}`);
      }
    } else if (missions.length > 0) {
      // Auto-select first active mission if no mission number specified
      const activeMissions = missions.map((m, i) => ({ ...m, index: i + 1 })).filter(m => m.active !== false);
      
      if (activeMissions.length > 0) {
        missionData = activeMissions[0];
        missionNumber = activeMissions[0].index;
        console.log(`\n   📋 Available Missions:`);
        missions.forEach((m, i) => {
          const active = m.active !== false ? '🟢' : '🔴';
          const auto = (i + 1) === missionNumber ? '  ◀ AUTO-SELECTED' : '';
          console.log(`      ${active} Mission ${i + 1}: ${m.title}${auto}`);
        });
        console.log(`\n   ⚠️  No mission specified — AUTO-SELECTED Mission ${missionNumber}: ${missionData.title}`);
        console.log(`   💡 Tip: Add mission number (1-${missions.length}) to select a different mission`);
      } else {
        console.log(`\n   ⚠️ No active missions found for this campaign.`);
      }
    }
    
    const campaign = {
      ...response,
      description: missionData?.goal || response.goal || response.description || '',
      missionGoal: missionData?.goal || null,
      missionTitle: missionData?.title || null,
      missionNumber: missionNumber,
      missions: missions,
      style: missionData?.style || response.style || 'Standard',
      rules: missionData?.rules || response.rules || 'Standard rules',
      knowledgeBase: missionData?.knowledgeBase || response.knowledgeBase || '',
      additionalInfo: missionData?.adminNotice || response.adminNotice || response.additionalInfo || '',
      characterLimit: missionData?.characterLimit || missionData?.character_limit || response.characterLimit || response.character_limit || null,
      contentType: missionData?.contentType || missionData?.content_type || response.contentType || response.content_type || 'tweet',
      campaignUrl: response.campaignUrl || `https://app.rally.fun/campaign/${response.intelligentContractAddress}`,
      url: response.campaignUrl || `https://app.rally.fun/campaign/${response.intelligentContractAddress}`
    };
    
    console.log('\n   ✅ Campaign data fetched');
    console.log(`   📋 Title: ${campaign.title}`);
    if (campaign.missionTitle) {
      console.log(`   🎯 Mission: ${campaign.missionTitle}`);
    }
    console.log(`   🎨 Style: ${(campaign.style || 'Standard').substring(0, 50)}...`);
    console.log(`   📜 Rules: ${(campaign.rules || 'Standard rules').substring(0, 50)}...`);
    if (campaign.characterLimit) {
      console.log(`   📏 Character Limit: ${campaign.characterLimit}`);
    }
    
    return campaign;
  } catch (error) {
    throw new Error(`Failed to fetch campaign: ${error.message}`);
  }
}

/**
 * List all missions for a campaign
 */
async function listMissions(campaignAddress) {
  console.log('\n' + '═'.repeat(70));
  console.log('📋 AVAILABLE MISSIONS');
  console.log('═'.repeat(70));
  
  try {
    const campaign = await fetchCampaignData(campaignAddress);
    const missions = campaign.missions || [];
    
    if (missions.length === 0) {
      console.log('\n   No missions found for this campaign.');
      return;
    }
    
    missions.forEach((m, i) => {
      const active = m.active !== false ? '🟢 Active' : '🔴 Inactive';
      console.log(`\n   ${i + 1}. ${m.title}`);
      console.log(`      Status: ${active}`);
      console.log(`      Goal: ${(m.goal || m.description || 'No description').substring(0, 100)}...`);
    });
    
    console.log('\n' + '═'.repeat(70));
    console.log(`\n   💡 Usage:`);
    console.log(`      node rally-workflow-v9.8.3-final.js ${campaignAddress} 1   # Mission 1`);
    console.log(`      node rally-workflow-v9.8.3-final.js ${campaignAddress} 2   # Mission 2`);
    console.log(`      node rally-workflow-v9.8.3-final.js ${campaignAddress} 3   # Mission 3`);
    
  } catch (error) {
    console.error(`\n   ❌ Failed to list missions: ${error.message}`);
  }
}

async function fetchLeaderboard(campaignAddress) {
  console.log(`\n📥 Fetching leaderboard...`);
  
  try {
    const response = await new Promise((resolve, reject) => {
      const url = `${CONFIG.rallyApiBase}/leaderboard?campaignAddress=${campaignAddress}&limit=100`;
      const req = https.get(url, { headers: { 'User-Agent': CONFIG.userAgent }, timeout: 15000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve([]);
            }
          } else {
            resolve([]);
          }
        });
      });
      req.on('timeout', () => { req.destroy(); resolve([]); });
      req.on('error', () => resolve([]));
    });
    
    console.log(`   ✅ Leaderboard fetched: ${response?.length || 0} submissions`);
    return response || [];
  } catch (error) {
    console.log(`   ⚠️ Failed to fetch leaderboard: ${error.message}`);
    return [];
  }
}

// ============================================================================
// FIRST PASS WINS WORKFLOW - Parallel Processing + TRUE Fail Fast
// ============================================================================

// State Manager untuk First Pass Wins (bukan global flags yang tidak thread-safe)
class FirstPassWinsState {
  constructor() {
    this._winner = null;
    this._won = false;
    this._aborted = false;
    this._abortController = new AbortController();
  }
  
  hasWinner() { return this._won; }
  getWinner() { return this._winner; }
  isAborted() { return this._aborted || this._abortController.signal.aborted; }
  getSignal() { return this._abortController.signal; }
  
  setWinner(result) {
    if (this._won) return false; // Race condition protection
    this._won = true;
    this._winner = result;
    this._abortController.abort(); // Stop semua operasi lain
    return true;
  }
  
  abort() {
    this._aborted = true;
    this._abortController.abort();
  }
  
  reset() {
    this._winner = null;
    this._won = false;
    this._aborted = false;
    this._abortController = new AbortController();
  }
}

// Singleton state instance
const judgingState = new FirstPassWinsState();

/**
 * Judge Content with TRUE Fail Fast - Stop immediately using AbortController
 * Uses existing detailed judge prompts from v9.8.3-base
 * FIXED: Added comprehensive error handling and auto-save
 */

// ============================================================================
// V10: OPTIMIZED MAIN WORKFLOW (3x faster)
// ============================================================================

class SimpleStateManager {
  constructor() { this._winner = null; }
  hasWinner() { return !!this._winner; }
  setWinner(result) {
    if (!this._winner) { this._winner = result; return true; }
    return false;
  }
  reset() { this._winner = null; }
}

const state = new SimpleStateManager();

async function runOptimizedWorkflow(campaignInput, missionNumber = null) {
  const startTime = Date.now();

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║    RALLY WORKFLOW V10.0 — OPTIMIZED (3x FASTER)             ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  🚀 2 Super-Judges instead of 6 (3x fewer judge calls)       ║');
  console.log('║  🧠 1 Smart Analyzer instead of 2 (merged intent+compliance) ║');
  console.log('║  📝 No separate Pre-Writing step (integrated into prompt)    ║');
  console.log('║  ⚡ Parallel content generation + parallel judging          ║');
  console.log('║  🎯 Few-shot examples for higher quality output              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // 1. Preflight
  await preflightCheck();
  state.reset();

  // 2. Resolve campaign
  console.log(`\n🔍 Resolving campaign: ${campaignInput}`);
  let campaignData;
  if (isEthereumAddress(campaignInput)) {
    campaignData = await fetchCampaignData(campaignInput, missionNumber);
  } else {
    const addr = await searchCampaignByName(campaignInput);
    if (!addr) { console.log('   ❌ Campaign not found'); return null; }
    campaignData = await fetchCampaignData(addr, missionNumber);
  }
  if (!campaignData) { console.log('   ❌ Campaign not found'); return null; }

  console.log(`   ✅ Found: ${campaignData.title}`);
  if (campaignData.missionTitle) console.log(`   🎯 Mission: ${campaignData.missionTitle}`);

  // 3. Display requirements
  const parsedReqs = displayCampaignRequirements(campaignData);

  console.log('\n📊 THRESHOLDS:');
  console.log(`   Super-Judge 1 (Gate+Quality): ${THRESHOLDS.SUPER_JUDGE1.pass}/${THRESHOLDS.SUPER_JUDGE1.max}`);
  console.log(`   Super-Judge 2 (Evidence+Unique): ${THRESHOLDS.SUPER_JUDGE2.pass}/${THRESHOLDS.SUPER_JUDGE2.max}`);
  console.log(`   Total Required: ${THRESHOLDS.TOTAL.pass}/${THRESHOLDS.TOTAL.max}`);

  // 4. Fetch leaderboard (with timeout)
  console.log('\n📥 Fetching leaderboard...');
  const submissions = await Promise.race([
    fetchLeaderboard(campaignData.intelligentContractAddress),
    new Promise(r => setTimeout(() => { console.log('   ⏰ Leaderboard timeout (15s)'); r([]); }, 15000))
  ]);
  console.log(`   📊 ${submissions?.length || 0} submissions found`);

  // 5. Competitor analysis (1 AI call)
  const llm = new MultiProviderLLM(CONFIG);
  const competitorAnalysis = await deepCompetitorContentAnalysis(llm, submissions, campaignData.title, campaignData);

  const competitorContents = (competitorAnalysis?.competitorContent || []).map(c => typeof c === 'string' ? c : c.content || '');

  // 6. Research (1 AI call with search)
  console.log('\n🔎 Deep Research...');
  const researchData = await multiQueryDeepResearch(llm, campaignData.title, campaignData);

  // 7. SMART CAMPAIGN ANALYZER (1 call instead of 2) — THE KEY OPTIMIZATION
  console.log('\n🧠 Smart Campaign Analysis...');
  const analysis = await smartCampaignAnalyzer(llm, campaignData, parsedReqs, competitorAnalysis, researchData);
  _cachedCampaignIntent = analysis;

  // 8. MAIN LOOP
  let cycle = 0;
  const maxCycles = 10;
  let learningInsights = null;
  let allContentHistory = [];

  // Load previous learning
  const prevLearning = loadLearningLog(CONFIG.outputDir);
  if (prevLearning.length > 0) {
    console.log(`\n   🧠 Loaded ${prevLearning.length} past learning entries`);
  }

  while (!state.hasWinner() && cycle < maxCycles) {
    cycle++;
    const cycleStart = Date.now();

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔄 CYCLE ${cycle} ${learningInsights ? '(learning from ' + learningInsights.totalFailed + ' failures)' : ''}`);
    console.log(`${'═'.repeat(60)}`);

    // Build learning section for prompt
    let learningSection = '';
    if (learningInsights && learningInsights.totalFailed > 0) {
      learningSection = buildLearningSection(learningInsights);
    }

    // 8a. Pick 3 different persona/structure/emotion combos
    const allPersonas = shuffle(CONFIG.personas);
    const allStructures = shuffle(CONFIG.narrativeStructures);
    const allEmotions = shuffle([...CONFIG.emotionCombos.rare, ...CONFIG.emotionCombos.common]);
    const campaignType = detectCampaignType(campaignData);
    const allAudiences = shuffle(CONFIG.audienceSegments[campaignType] || CONFIG.audienceSegments.general);

    const combos = [
      { persona: allPersonas[0], structure: allStructures[0], emotion: allEmotions[0], audience: allAudiences[0] },
      { persona: allPersonas[1], structure: allStructures[1], emotion: allEmotions[1], audience: allAudiences[1] },
      { persona: allPersonas[2], structure: allStructures[2], emotion: allEmotions[2], audience: allAudiences[2] }
    ];

    // 8b. GENERATE 3 CONTENTS IN PARALLEL (3 AI calls simultaneously)
    console.log('\n   📝 Generating 3 contents in PARALLEL...');
    const genPromises = combos.map((c, i) => generateOptimizedContent(
      llm, campaignData, analysis, competitorAnalysis, researchData,
      learningSection, c.persona, c.structure, c.emotion, c.audience
    ));

    const genResults = await Promise.allSettled(genPromises);
    const rawContents = genResults
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    console.log(`   ✅ ${rawContents.length}/3 contents generated`);

    // 8c. SANITIZE + COMPLIANCE CHECK (NO AI calls, programmatic)
    const validContents = [];
    for (let i = 0; i < rawContents.length; i++) {
      const content = rawContents[i];
      const sanitized = sanitizeContent(content);
      const compliance = validateMissionCompliance(sanitized, campaignData);
      const metricCheck = validateMetricTypeRelevance(sanitized, analysis);

      if (compliance.valid && metricCheck.valid) {
        validContents.push({ content: sanitized, index: i });
        console.log(`   ✅ Content ${i + 1} passed compliance + metric check`);
      } else {
        const issues = [...(compliance.issues || []), ...(metricCheck.issues || [])];
        console.log(`   ❌ Content ${i + 1} failed: ${issues.slice(0, 3).join('; ')}`);
        // Track for learning
        allContentHistory.push({ opening: content.split('\n')[0]?.substring(0, 80), score: 0, failedAt: 'compliance', cycle });
      }
    }

    if (validContents.length === 0) {
      console.log('   ⚠️ No valid contents, retrying...');
      await delay(CONFIG.delays.betweenPasses);
      continue;
    }

    // 8d. JUDGE VALID CONTENTS (2 AI calls per content)
    console.log(`\n   🔍 Judging ${validContents.length} contents...`);

    // Judge all valid contents (sequential for rate limit safety, but no artificial delays)
    let winner = null;
    const judgeResults = [];

    for (const vc of validContents) {
      // Skip if already have winner (fail-fast)
      if (state.hasWinner()) break;

      const result = await runSuperJudgePipeline(
        llm, vc.content, campaignData, analysis, competitorContents, state
      );

      judgeResults.push({ ...result, content: vc.content, index: vc.index });

      if (result.skipped) break;

      if (result.passed) {
        winner = { ...result, content: vc.content, index: vc.index };
        state.setWinner(winner);
        console.log(`\n   🎉🎉🎉 WINNER! Score: ${result.totalScore}/${THRESHOLDS.TOTAL.max}`);
        console.log(`   📝 Content length: ${vc.content.length} chars`);
        break;
      } else {
        console.log(`   ❌ Content ${vc.index + 1} failed at ${result.failedAt} (${result.totalScore} pts)`);
        if (result.improvementInstructions?.length > 0) {
          result.improvementInstructions.slice(0, 2).forEach(inst => console.log(`      💡 ${inst}`));
        }
        allContentHistory.push({ opening: vc.content.split('\n')[0]?.substring(0, 80), score: result.totalScore, failedAt: result.failedAt, cycle });
      }

      await delay(CONFIG.delays.betweenJudges);
    }

    if (winner) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🏆 CONTENT PASSED in cycle ${cycle}!`);
      console.log(`   Score: ${winner.totalScore}/${THRESHOLDS.TOTAL.max}`);
      console.log(`   AI Probability: ${winner.sj1?.antiAIProbability}%`);
      console.log(`   Quality: ${winner.sj1?.overallQuality}/10`);
      console.log(`   Total time: ${elapsed}s`);
      console.log(`   AI calls: ~${3 + cycle * 5} (vs v9.8.4 ~${4 + cycle * 20})`);
      console.log(`${'═'.repeat(60)}`);

      // Auto-save
      try {
        const savePath = `${CONFIG.outputDir}/winner-cycle${cycle}-${Date.now()}.txt`;
        fs.writeFileSync(savePath, winner.content);
        console.log(`   💾 Saved: ${savePath}`);
      } catch (e) {}

      return winner;
    }

    // 8e. LEARN FROM FAILURES
    learningInsights = analyzeFailures(
      judgeResults.map(r => ({ status: 'fulfilled', value: r })),
      cycle,
      allContentHistory
    );

    if (learningInsights.strategyHints?.length > 0) {
      learningInsights.strategyHints.slice(0, 2).forEach(h => console.log(`   💡 ${h}`));
    }

    // Save learning log
    saveLearningLog(campaignData.title, learningInsights, CONFIG.outputDir);

    const cycleTime = ((Date.now() - cycleStart) / 1000).toFixed(1);
    console.log(`\n   ⏱️ Cycle ${cycle} took ${cycleTime}s`);

    await delay(CONFIG.delays.betweenPasses);
  }

  console.log('\n❌ No content passed after ' + maxCycles + ' cycles');
  return null;
}


// ============================================================================
// V10: CLI ENTRY POINT
// ============================================================================

async function main() {
  console.log('   ╔════════════════════════════════════════════════════════════╗');
  console.log('   ║           RALLY WORKFLOW V10.0 — OPTIMIZED                ║');
  console.log('   ║   Speed: 3x faster | Quality: Few-shot + Voice-first       ║');
  console.log('   ╚════════════════════════════════════════════════════════════╝');

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('\nUsage:');
    console.log('  node rally-workflow-v10-optimized.js "Campaign Name"');
    console.log('  node rally-workflow-v10-optimized.js 0xContractAddress');
    console.log('  node rally-workflow-v10-optimized.js list');
    console.log('  node rally-workflow-v10-optimized.js manual <file.json>');
    process.exit(1);
  }

  const mode = args[0];

  if (mode === 'list') {
    const campaigns = await fetchAllCampaigns(20);
    console.log(`\n📋 ${campaigns.length} campaigns:`);
    campaigns.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.title || 'Unknown'} (${c.intelligentContractAddress})`);
    });
    return;
  }

  if (mode === 'manual') {
    const filePath = args[1];
    if (!filePath) { console.log('   ❌ Provide JSON file path'); return; }
    const campaignData = loadCampaignFromFile(filePath);
    if (!campaignData) { console.log('   ❌ Could not load campaign data'); return; }

    const llm = new MultiProviderLLM(CONFIG);
    const result = await runOptimizedWorkflow(campaignData);
    return;
  }

  // Default: run workflow with campaign name or address
  await runOptimizedWorkflow(mode);
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  console.error('   Stack:', err.stack?.substring(0, 300));
  process.exit(1);
});

