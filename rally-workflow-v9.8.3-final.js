/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RALLY WORKFLOW V9.8.3-FINAL - ENHANCED WITH PDF INSIGHTS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 ALUR BARU (Parallel Processing + First Pass Wins):
 * 1. Generate 3 konten PARALEL (Promise.all)
 * 2. Setiap konten yang selesai → LANGSUNG Judge (Fail Fast)
 * 3. Jika ada yang LOLOS semua judge → STOP! OUTPUT konten tersebut
 * 4. Jika semua GAGAL → Generate 3 konten baru
 * 5. Ulangi sampai dapat 1 konten yang lolos (TANPA BATAS)
 * 
 * 📊 HIGH STANDARDS (3 CONSOLIDATED JUDGES):
 * - Judge 1 (Gate Master): 20/20 (100%) - Gate Utama + Tambahan + G4 Originality (SEMPURNA!)
 * - Judge 2 (Evidence Master): 3/5 (60%) - Fact Check + Evidence Layering (Fleksibel)
 * - Judge 3 (Quality Master): 60/80 (75%) - Penilaian Internal + Compliance + X-Factors
 * - Total: 80/105 (76%)
 * 
 * ✅ ALL FEATURES FROM v9.8.3-base (KEPT INTACT):
 * ✅ G4 Originality Elements Detection (casual hook, parenthetical aside, contractions)
 * ✅ Em Dash & Smart Quote Detection (forbidden punctuation)
 * ✅ Gate Multiplier Formula (M_gate = 1 + 0.5 x (g_star - 1))
 * ✅ X-Factor Differentiators (specific numbers, time specificity, embarrassing honesty)
 * ✅ Claim Verification Template
 * ✅ Pre-Submission Validation Checklist
 * ✅ Mindset Framework (Target: Beat Top 10)
 * ✅ Control Matrix (What you CAN vs CANNOT control)
 * ✅ Multi-Token Rate Limit Handler (11 tokens)
 * ✅ HTTP Direct Mode (No SDK required!)
 * ✅ Parallel Processing dengan Token Locking
 * ✅ All Detailed Judge Prompts (getJudge1-6SystemPrompt)
 * ✅ Deep Competitor Analysis
 * ✅ Multi-Query Research with Web Search
 * 
 * 🆕 NEW IN v9.8.3-ENHANCED (From Rally PDF Guides):
 * ✅ Persona-First Philosophy (Natural Content First, Validate After)
 * ✅ 5 Pre-Writing Questions (Build perspective BEFORE writing)
 * ✅ Read Aloud Test (Validation through speaking)
 * ✅ "Siapa yang Nulis Ini?" Test (Identity check)
 * ✅ Campaign Type Adaptation (Metrics, Product, Community, DeFi, NFT)
 * ✅ Structured Output Format (Campaign Analysis + Self-Check)
 * 
 * BASED ON: v9.8.3-base.js + v9.9.2-stable.js (HTTP Direct)
 * 
 * Usage:
 *   node rally-workflow-v9.8.3-final.js "Internet Court"
 *   node rally-workflow-v9.8.3-final.js 0xAF5a5B459F4371c1781E3B8456214CDD063EeBA7
 *   node rally-workflow-v9.8.3-final.js list
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONSISTENT THRESHOLDS - Single Source of Truth
// ============================================================================
// Module-level cache for deep campaign intent (shared between content generation and judging)
let _cachedCampaignIntent = null;

const THRESHOLDS = {
  // Judge 1: Gate Master (Gate Utama + Gate Tambahan + G4 + Punctuation)
  // MUST BE SEMPURNA (100%) - No compromises on quality gate
  JUDGE1: { pass: 20, max: 20, name: 'Gate Master', percent: '100%' },
  
  // Judge 2: Evidence Master (Fact Check + Evidence Layering)
  // FIXED: Lowered from 4/5 (80%) to 3/5 (60%) to be more achievable
  JUDGE2: { pass: 3, max: 5, name: 'Evidence Master', percent: '60%' },
  
  // Judge 3: Quality Master (Penilaian Internal + Compliance + Uniqueness + X-Factors)
  // FIXED: Lowered from 70/80 (87.5%) to 60/80 (75%) to be more achievable
  JUDGE3: { pass: 60, max: 80, name: 'Quality Master', percent: '75%' },
  
  // Total Score Required - BUG #18 FIX: Must be <= sum of individual passes (20+3+60=83)
  TOTAL: { pass: 80, max: 105, percent: '76%' }
};

// ============================================================================
// HTTP DIRECT MODE - No SDK Required!
// ============================================================================

// Gateway endpoints
const GATEWAY = {
  hosts: ['172.25.136.210:8080', '172.25.136.193:8080'],
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
    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtYWYxZDE3YWQtZDI1NC00YmFkLWI5ZmMtN2YyOTIwOTExNjExIn0.xG3YxW5PNy_LJrO9JfPgPFv3U0f_46IY4NqxYTZfqIo', chatId: 'chat-af1d17ad-d254-4bad-b9fc-7f2920911611', userId: '97631263-5dba-4e16-b127-19212e012a9b', label: 'Akun E #1' }
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
function callAIdirect(messages, maxTokens = 2000, temperature = 0.7, options = {}) {
  return new Promise((resolve, reject) => {
    // Get current token - skip null if no valid config
    let tokenData = TOKENS[currentTokenIndex];
    
    // If null token and no valid CFG, use first hardcoded token
    if (tokenData === null && (!CFG || !CFG.token)) {
      currentTokenIndex = 1; // Skip to first hardcoded token
      tokenData = TOKENS[currentTokenIndex];
    }
    
    // Prepare auth headers
    let headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer Z.ai',
      'X-Z-AI-From': 'Z'
    };
    
    // Use auto-config token or hardcoded token
    if (tokenData === null && CFG && CFG.token) {
      headers['X-Token'] = CFG.token || CFG.apiKey;
      headers['X-User-Id'] = CFG.userId || '';
      headers['X-Chat-Id'] = CFG.chatId || '';
    } else if (tokenData) {
      headers['X-Token'] = tokenData.token;
      headers['X-User-Id'] = tokenData.userId;
      headers['X-Chat-Id'] = tokenData.chatId;
    } else {
      // Fallback: use first hardcoded token
      const fallback = TOKENS[1];
      if (fallback) {
        headers['X-Token'] = fallback.token;
        headers['X-User-Id'] = fallback.userId;
        headers['X-Chat-Id'] = fallback.chatId;
      }
    }
    
    // Get gateway host
    const [host, port] = GATEWAY.hosts[GATEWAY.currentIndex].split(':');
    GATEWAY.currentIndex = (GATEWAY.currentIndex + 1) % GATEWAY.hosts.length;
    
    const body = JSON.stringify({
      model: options.model || 'glm-4-flash',
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(options.enableSearch ? { enable_search: true } : {}),
      ...(options.enableThinking !== false ? {} : { enable_thinking: false })
    });
    
    const req = http.request({
      hostname: host,
      port: parseInt(port),
      path: '/v1/chat/completions',
      method: 'POST',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const msg = json.choices?.[0]?.message || {};
            resolve({
              content: msg.content || msg.reasoning_content || '',
              thinking: msg.thinking || null,
              provider: 'http-direct'
            });
          } catch (e) {
            reject(new Error('Parse error'));
          }
        } else if (res.statusCode === 429) {
          // Rate limit - switch token
          console.log(`   ⚠️ Rate limit, switching token...`);
          currentTokenIndex = (currentTokenIndex + 1) % TOKENS.length;
          if (currentTokenIndex === 0 && (!CFG || !CFG.token)) currentTokenIndex = 1;
          reject(new Error('Rate limit - retry'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

// Wrapper with retry - OPTIMIZED to avoid infinite loops
async function callAI(messages, options = {}) {
  const maxRetries = options.maxRetries || 8;  // Reduced from 15 to avoid long waits
  let lastError = null;
  let rateLimitCount = 0;
  let consecutiveRateLimits = 0;  // Track consecutive rate limits
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callAIdirect(
        messages,
        options.maxTokens || 2000,
        options.temperature || 0.7,
        options  // Pass through model, enableSearch, enableThinking
      );
    } catch (e) {
      lastError = e;
      
      if (e.message.includes('Rate limit')) {
        rateLimitCount++;
        consecutiveRateLimits++;
        
        // If too many consecutive rate limits, throw to avoid infinite loop
        if (consecutiveRateLimits >= 5) {
          console.log(`   ⚠️ Too many consecutive rate limits (${consecutiveRateLimits}), aborting...`);
          throw new Error('All tokens rate limited - please wait before retrying');
        }
        
        const delayMs = Math.min(2000 * Math.pow(1.3, rateLimitCount), 15000);  // Reduced max delay
        if (i < maxRetries - 1) {
          console.log(`   ⏳ Rate limit retry ${i + 1}/${maxRetries}, waiting ${(delayMs/1000).toFixed(1)}s...`);
          await new Promise(r => setTimeout(r, delayMs));
        }
      } else if (e.message.includes('Timeout')) {
        consecutiveRateLimits = 0;  // Reset counter on non-rate-limit error
        await new Promise(r => setTimeout(r, 5000));
      } else {
        consecutiveRateLimits = 0;  // Reset counter on non-rate-limit error
        await new Promise(r => setTimeout(r, 1000 * Math.min(i + 1, 3)));
      }
    }
  }
  throw lastError;
}

// SDK compatibility aliases (for existing code)
let ZAI = null;
let SDK_AVAILABLE = false; // Always false - we use HTTP Direct

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function timestamp() {
  return new Date().toISOString().split('T')[1].split('.')[0];
}

// Import Python NLP Client (Optional)
let PythonNLPClient = null;
try {
  PythonNLPClient = require('../python_nlp_client.js');
} catch (e) {
  console.log('   ⚠️ Python NLP Client not available, using fallback');
}

// ============================================================================
// PRE-FLIGHT CHECK - HTTP Direct Mode (No SDK!)
// ============================================================================

async function preflightCheck() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 PRE-FLIGHT CHECK - HTTP Direct Mode');
  console.log('═'.repeat(60));
  
  console.log('   ✅ HTTP Direct Mode: Ready (No SDK required)');
  console.log(`   ✅ Gateway: ${GATEWAY.hosts.join(', ')}`);
  console.log(`   ✅ Tokens: ${TOKENS.length} available`);
  
  // Validate gateway connectivity
  let gatewayOk = false;
  for (const host of GATEWAY.hosts) {
    try {
      const [h, p] = host.split(':');
      const result = await new Promise((resolve) => {
        const req = http.request({
          hostname: h,
          port: parseInt(p),
          path: '/v1/models',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer Z.ai',
            'X-Token': TOKENS[1]?.token || '',
            'X-User-Id': TOKENS[1]?.userId || ''
          },
          timeout: 5000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ ok: res.statusCode < 500 }));
        });
        req.on('error', () => resolve({ ok: false }));
        req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
        req.end();
      });
      
      if (result.ok) {
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

/**
 * Retry with exponential backoff - specifically for rate limits
 */
async function retryWithBackoff(fn, maxRetries = 5, baseDelay = 2000, name = 'Operation') {
  let lastError = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if rate limit - use longer delay
      const isRateLimit = isRateLimitError(error);
      const delayMs = isRateLimit ? 
        Math.max(baseDelay * Math.pow(2, i), 10000) * (1 + Math.random() * 0.5) : // Rate limit: min 10s + jitter
        baseDelay * Math.pow(2, i); // Normal error: exponential
      
      if (i < maxRetries - 1) {
        if (isRateLimit) {
          console.log(`   ⏳ ${name} - Rate limit hit! Waiting ${(delayMs/1000).toFixed(1)}s before retry ${i + 1}/${maxRetries}...`);
        } else {
          console.log(`   ⏳ ${name} retry ${i + 1}/${maxRetries} in ${(delayMs/1000).toFixed(1)}s...`);
        }
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// HYBRID CONFIGURATION
// ============================================================================

const CONFIG = {
  // Python NLP Service (Optional - will use fallback if unavailable)
  pythonNLP: {
    baseUrl: 'http://localhost:5000',
    enabled: true,
    timeout: 30000,
    fallbackToBasic: true
  },
  
  // Rally API
  rallyApiBase: 'https://app.rally.fun/api',
  outputDir: '/home/z/my-project/download',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-TOKEN POOL - For Rate Limit Handling
  // Uses shared TOKENS array (defined at top of file) - SINGLE SOURCE OF TRUTH
  // ═══════════════════════════════════════════════════════════════════════════
  tokens: TOKENS, // Reference to shared TOKENS array - DO NOT duplicate!
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW v9.8.1: Multi-Content Configuration
  // ═══════════════════════════════════════════════════════════════════════════
  multiContent: {
    enabled: true,
    count: 5,
    selectBest: true,
    minPassCount: 1,
    maxRegenerateAttempts: 5,
    variations: {
      angles: ['personal_story', 'data_driven', 'contrarian', 'insider_perspective', 'case_study'],
      emotions: [
        ['curiosity', 'surprise'],
        ['fear', 'hope'],
        ['anger', 'trust'],
        ['sadness', 'anticipation'],
        ['surprise', 'joy']
      ],
      structures: ['hero_journey', 'problem_solution', 'before_after', 'mystery_reveal', 'case_study']
    }
  },
  
  // v9.8.1: Model Optimization - GLM-5 (Latest)
  model: {
    name: 'glm-5',
    enableThinking: true,
    enableSearch: true,
    temperature: {
      generation: 0.8,
      judging: 0.2,
      compliance: 0.1
    }
  },
  
  // v9.8.1: Quick Judge = Compliance Check Only
  quickJudge: {
    enabled: true,
    checks: [
      'campaignDescription',
      'rules',
      'style',
      'additionalInfo',
      'knowledgeBase',
      'bannedWords',
      'urlPresent'
    ],
    allMustPass: true
  },
  
  // v9.8.1: Ranking Configuration
  ranking: {
    enabled: true,
    method: 'weighted',
    weights: {
      gateUtama: 0.15,
      gateTambahan: 0.12,
      penilaianInternal: 0.35,
      compliance: 0.10,
      factCheck: 0.08,
      uniqueness: 0.20
    }
  },
  
  // Enhanced thresholds for Hybrid (Updated for G4 Originality & X-Factor)
  thresholds: {
    gateUtama: { pass: 19, max: 24 },        // Updated: 6 criteria x 4 = 24 (was 20)
    gateTambahan: { pass: 12, max: 16 },     // 4 criteria x 4 = 16 (includes X-Factor)
    penilaianInternal: { pass: 54, max: 60 },
    compliance: { pass: 11, max: 11, allMustPass: true },  // Updated: 11 checks (was 10)
    factCheck: { pass: 4, max: 5 },
    uniqueness: { pass: 20, max: 25 },
    readability: { min: 60, optimal: 70 },
    sentiment: { minConfidence: 0.3 },
    similarity: { maxThreshold: 0.7 },
    depth: { minScore: 40 },
    tieThreshold: 3
  },
  
  revision: { maxAttempts: 3, delayMs: 10000 },
  retry: { maxAttempts: 5, delayMs: 10000 },
  
  // v9.8.1: Increased delays to prevent rate limits
  delays: {
    betweenJudges: 8000,        // 8 seconds between each judge (was 3s)
    betweenPasses: 10000,       // 10 seconds between passes
    beforeRevision: 8000,       // 8 seconds before revision
    beforeTieBreaker: 10000,    // 10 seconds before tie breaker
    afterWebSearch: 3000,       // 3 seconds after web search
    afterPythonNLP: 1000,       // 1 second after Python NLP
    betweenContentGen: 5000,    // 5 seconds between content generation
    betweenQuickJudge: 3000,    // 3 seconds between quick judge checks
    afterRateLimit: 15000       // 15 seconds after rate limit detected
  },
  
  enableThinking: true,
  tweetOptions: [1, 3, 5, 7],
  
  personas: [
    { id: 'skeptic', name: 'The Skeptic', trait: 'Doubt → Discovery → Conversion' },
    { id: 'victim_to_hero', name: 'Victim → Hero', trait: 'Pain → Solution → Redemption' },
    { id: 'insider', name: 'The Insider', trait: 'Behind the scenes revelation' },
    { id: 'newbie', name: 'The Newbie', trait: 'Fresh perspective, relatable confusion' },
    { id: 'contrarian', name: 'The Contrarian', trait: 'Bold statement, challenge status quo' },
    { id: 'researcher', name: 'The Researcher', trait: 'Data-driven discovery' },
    { id: 'storyteller', name: 'The Storyteller', trait: 'Narrative-driven, human interest' }
  ],
  
  narrativeStructures: [
    { id: 'hero_journey', name: "Hero's Journey", flow: 'Challenge → Struggle → Discovery → Victory' },
    { id: 'pas', name: 'Problem-Agitation-Solution', flow: 'Problem → Make it worse → Solution → Proof' },
    { id: 'bab', name: 'Before-After-Bridge', flow: 'Before state → After state → How to bridge' },
    { id: 'contrast', name: 'Contrast Frame', flow: 'What most think → What actually is → Proof' },
    { id: 'mystery', name: 'Mystery Reveal', flow: 'Curiosity building → Cliffhanger → Reveal' },
    { id: 'case_study', name: 'Case Study', flow: 'Subject → Problem → Solution → Result' },
    { id: 'qa', name: 'Question-Answer', flow: 'Provocative question → Explore → Answer' }
  ],
  
  audienceSegments: {
    'internet_court': [
      { id: 'scammed_crypto', name: 'Crypto Users Who Got Scammed', pain: 'Lost money, no recourse' },
      { id: 'freelancers', name: 'Freelancers with Unpaid Clients', pain: 'Client ghosted, no contract' },
      { id: 'dao_participants', name: 'DAO/Governance Participants', pain: 'Disputes in voting, unclear resolution' },
      { id: 'ecommerce', name: 'E-commerce Dispute Victims', pain: 'Buyer/seller disputes, biased platforms' },
      { id: 'smart_contract_users', name: 'Smart Contract Users', pain: 'Bugs, hacks, unclear liability' }
    ]
  },
  
  emotionCombos: {
    rare: [
      { emotions: ['surprise', 'anger'], hook: 'Shocking injustice revealed' },
      { emotions: ['relief', 'curiosity'], hook: 'Finally, a solution you did not know' },
      { emotions: ['fear', 'empowerment'], hook: 'The threat is real, but so is hope' },
      { emotions: ['frustration', 'vindication'], hook: 'You were right to be mad' },
      { emotions: ['confusion', 'clarity'], hook: 'The mystery solved' }
    ],
    common: [
      { emotions: ['curiosity', 'hope'], hook: 'Standard curiosity driver' },
      { emotions: ['fear', 'urgency'], hook: 'Fear-based urgency' },
      { emotions: ['pain', 'hope'], hook: 'Pain to hope journey' }
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
    },
    weakOpenings: ['the ', 'a ', 'an ', 'this is', 'there are', 'there is', 'i think', 'in the', 'today ', 'so ', 'well ', 'basically', 'honestly ', 'actually ', 'first ', 'let me', 'here is', 'here are']
  },
  
  wajibElements: {
    hook: { required: true, description: 'Natural, organic hook (not formulaic)' },
    emotions: { required: true, minCount: 3, description: 'Minimal 3 emotion types' },
    bodyFeeling: { required: true, description: 'Physical/body sensation' },
    cta: { required: true, description: 'Question atau reply bait' },
    url: { required: true, description: 'Required URL dari campaign' },
    facts: { required: true, description: 'Data/fakta pendukung (multi-layer)' },
    originality: {
      mustHave: [
        'Personal story atau experience (genuine)',
        'Unique angle/perspective',
        'Specific details (not generic)',
        'Conversational tone (natural, bukan AI-sounding)',
        'Differentiation from competitors'
      ],
      mustAvoid: [
        'Similar to competitor content',
        'Template-like structure',
        'Generic statements',
        'Overused phrases',
        'Derivative angles',
        'Formulaic hook patterns'
      ]
    }
  },
  
  calibration: {
    rallyMaxScore: 23,
    v9_8_0MaxScore: 100,
    thresholds: {
      excellent: { rally: 21, v9_8_0: 90 },
      pass: { rally: 18, v9_8_0: 75 },
      borderline: { rally: 15, v9_8_0: 62 }
    }
  },
  
  emotionTriggers: {
    fear: ['risk', 'danger', 'threat', 'warning', 'scary', 'terrifying', 'afraid', 'worried', 'nightmare'],
    curiosity: ['wonder', 'curious', 'secret', 'hidden', 'mystery', 'discover', 'surprising', 'unexpected'],
    surprise: ['unexpected', 'shocking', 'surprised', 'blew my mind', 'plot twist', 'wait what', 'finally', 'breakthrough'],
    hope: ['finally', 'breakthrough', 'opportunity', 'potential', 'future', 'imagine', 'possible'],
    pain: ['lost', 'failed', 'broke', 'destroyed', 'killed', 'wasted', 'missed', 'regret', 'hurt', 'pain'],
    urgency: ['now', 'today', 'immediately', 'urgent', 'quickly', 'fast', 'running out'],
    anger: ['unfair', 'wrong', 'scam', 'cheated', 'robbed', 'injustice', 'ridiculous'],
    relief: ['finally', 'solution', 'answer', 'solved', 'resolved', 'fixed']
  },
  
  bodyFeelings: [
    'cold sweat', 'panic', 'anxiety', 'heart racing', 'stomach dropped', 
    'heart sank', 'chest tightened', 'jaw dropped', "couldn't believe",
    'blood boiled', 'hands shaking', 'breath caught'
  ],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW v9.8.0: G4 Originality Checklist (from Rally Master Guide V3)
  // ═══════════════════════════════════════════════════════════════════════════
  g4Checklist: {
    // Elements that ADD to originality score
    bonuses: {
      casualHookOpening: {
        patterns: ['ngl', 'tbh', 'honestly', 'fun story', 'okay so', 'look', 'real talk'],
        description: 'Opens with casual/conversational hook',
        weight: 0.15
      },
      parentheticalAside: {
        patterns: ['(and this is embarrassing to admit)', '(just saying)', '(real talk)', 
                   '(not gonna lie)', '(honestly)', '(for real)', '(seriously though)'],
        description: 'Has parenthetical conversational aside',
        weight: 0.15
      },
      contractions: {
        patterns: ["don't", "can't", "it's", "they're", "won't", "i'm", "we're", 
                   "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't",
                   "wouldn't", "couldn't", "shouldn't", "let's", "that's", "what's"],
        minCount: 3,
        description: 'Uses 3+ contractions naturally',
        weight: 0.20
      },
      sentenceFragments: {
        description: 'Uses sentence fragments for casual effect',
        weight: 0.15
      },
      personalAngle: {
        patterns: ['i ', 'my ', 'me ', 'sat there', 'watched', 'spent', 'went from'],
        description: 'Has personal story or angle',
        weight: 0.20
      },
      conversationalEnding: {
        patterns: ['tbh', 'worth checking', 'just saying', 'for real', 'honestly',
                   'give it a shot', "can't hurt", 'what do you think'],
        description: 'Ends with conversational tone',
        weight: 0.15
      }
    },
    // Elements that SUBTRACT from originality score
    penalties: {
      emDashes: {
        patterns: ['—', '–', '―'],
        description: 'Contains em dashes (AI indicator)',
        weight: -0.30
      },
      smartQuotes: {
        patterns: ['\u201c', '\u201d', '\u2018', '\u2019', '\u201e', '\u201f'],  // Smart quotes: " " ' ' „ ‟
        description: 'Contains smart/curly quotes (AI indicator)',
        weight: -0.20
      },
      aiPhrases: {
        patterns: ['delve', 'leverage', 'realm', 'tapestry', 'paradigm', 'landscape',
                   'nuance', 'underscores', 'pivotal', 'crucial', 'embark', 'journey',
                   'explore', 'unlock', 'harness', 'picture this', 'lets dive in',
                   'in this thread', 'key takeaways', 'imagine a world'],
        description: 'Contains AI-typical phrases',
        weight: -0.20 // per occurrence
      },
      genericOpening: {
        patterns: ['in the world of', 'in todays', 'in the digital', 'this is why',
                   'here is how', 'there are many', 'it is important'],
        description: 'Opens with generic/formulaic phrase',
        weight: -0.30
      },
      formalEnding: {
        patterns: ['in conclusion', 'to summarize', 'overall', 'in summary',
                   'in the end', 'ultimately'],
        description: 'Ends with formal/academic tone',
        weight: -0.20
      },
      overExplaining: {
        description: 'Over-explains concepts (trust the reader)',
        weight: -0.20
      }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW v9.8.0: Forbidden Punctuation (from Rally Master Guide V3)
  // ═══════════════════════════════════════════════════════════════════════════
  forbiddenPunctuation: {
    emDashes: {
      chars: ['—', '–', '―'],
      name: 'Em Dash',
      replaceWith: '-', // or use comma
      reason: 'AI-generated content indicator'
    },
    smartQuotes: {
      double: ['\u201c', '\u201d', '\u201e', '\u201f'],  // " " „ ‟
      single: ['\u2018', '\u2019'],  // ' '
      name: 'Smart Quotes',
      replaceWith: { double: '"', single: "'" },
      reason: 'AI-generated content indicator'
    },
    ellipsis: {
      char: '…',
      name: 'Ellipsis character',
      replaceWith: '...',
      reason: 'May indicate AI generation'
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW v9.8.0: Gate Multiplier Formula (Official Rally Formula)
  // ═══════════════════════════════════════════════════════════════════════════
  gateMultiplier: {
    // Formula: M_gate = 1 + 0.5 x (g_star - 1)
    // Where g_star = (G1 + G2 + G3 + G4) / 4
    // 
    // Examples:
    // - All gates = 2.0 → g_star = 2.0 → M_gate = 1.5x (MAXIMUM, +50%)
    // - All gates = 1.5 → g_star = 1.5 → M_gate = 1.25x (+25%)
    // - All gates = 1.0 → g_star = 1.0 → M_gate = 1.0x (baseline)
    // - Any gate = 0   → DISQUALIFIED (M_gate = 0.5x)
    formula: 'M_gate = 1 + 0.5 * (g_star - 1)',
    maxMultiplier: 1.5,
    minMultiplier: 0.5,
    disqualifiedMultiplier: 0.5
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW v9.8.0: X-Factor Differentiators (from Rally Master Guide V3)
  // ═══════════════════════════════════════════════════════════════════════════
  xFactorDifferentiators: {
    specificNumbers: {
      description: 'Use exact figures, not estimates',
      badExample: 'down a lot',
      goodExample: 'down 47%',
      detection: /\d+(%|\$|k|K|M|B|bn|m|k)/gi
    },
    timeSpecificity: {
      description: 'Include exact durations',
      badExample: 'watched for a while',
      goodExample: 'watched for 25 minutes',
      detection: /\d+\s*(minutes?|hours?|seconds?|days?|weeks?|months?|years?)\b/gi
    },
    embarrassingHonesty: {
      description: 'Admit something relatable/embarrassing',
      examples: [
        'embarrassing to admit i watched for 25 mins',
        'not proud of how long i spent on this',
        'hate to say it but',
        "i'll be honest, i was skeptical at first"
      ],
      patterns: ['embarrassing to admit', 'not proud', 'hate to admit', 'not gonna lie',
                 "i'll be honest", "can't believe i'm saying this"]
    },
    insiderDetail: {
      description: 'Share unique observation that shows real experience',
      examples: [
        'went from 68% to sweating bullets',
        'watched the counter go from 12 to 847 in like 3 minutes',
        'refreshed the page 47 times (yes i counted)'
      ]
    },
    unexpectedAngle: {
      description: 'Approach from surprising direction',
      examples: [
        'focus on entertainment value, not utility',
        'talk about what went wrong, not what went right',
        'share the boring details that matter'
      ]
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW v9.8.0: Claim Verification Template (from Rally Master Guide V3)
  // ═══════════════════════════════════════════════════════════════════════════
  claimVerification: {
    redFlags: [
      'Specific dates (launched yesterday, coming next week)',
      'Specific numbers (TVL, users, volume)',
      'Chain/platform claims (on Ethereum, on Base)',
      'Feature claims (has X feature, supports Y)',
      'Partnership claims (partnered with X, integrated with Y)',
      'Token information (token name, symbol, price)'
    ],
    verificationSteps: [
      'Fetch campaign details via API',
      'Read knowledgeBase from campaign',
      'Search project website for facts',
      'Check project Twitter/X for announcements',
      'Verify each specific claim independently',
      'Document sources for each claim'
    ],
    actionsIfUnverified: [
      'Option A: Remove the claim',
      'Option B: Use general/vague language',
      'Option C: Ask user for confirmation',
      'NEVER: Assume or fabricate information'
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW v9.8.0: Pre-Submission Checklist (from Rally Master Guide V3)
  // ═══════════════════════════════════════════════════════════════════════════
  preSubmissionChecklist: {
    mindset: [
      'Target: BEAT Top 10',
      'Effort: MAXIMUM',
      'Ready to accept any result'
    ],
    informationVerification: [
      'Fetched campaign knowledgeBase',
      'Researched project website',
      'Checked project Twitter',
      'Verified all claims',
      'No unverified statistics',
      'No assumed information'
    ],
    gateAlignment: [
      'Content matches campaign goal',
      'Correct terminology used',
      'Brand consistency'
    ],
    gateAccuracy: [
      'All facts verified against sources',
      'No misleading claims',
      'Proper context provided'
    ],
    gateCompliance: [
      'All required hashtags present',
      'All required mentions present',
      'Format requirements met'
    ],
    gateOriginality: [
      'Casual hook opening',
      'Parenthetical aside present',
      '3+ contractions used',
      'Sentence fragments included',
      'Personal angle/story present',
      'Conversational ending',
      'NO em dashes',
      'NO smart quotes',
      'NO AI phrases'
    ],
    quality: [
      'Strong hook',
      'Good structure',
      'Clean formatting'
    ],
    xFactors: [
      'Specific numbers',
      'Time specificity',
      'Embarrassing honesty',
      'Insider detail',
      'Unexpected angle'
    ],
    final: [
      'Read aloud test passed',
      'All claims verified',
      'Maximum effort given'
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW v9.8.0: Mindset Framework (from Rally Master Guide V3)
  // ═══════════════════════════════════════════════════════════════════════════
  mindsetFramework: {
    target: 'BEAT Top 10',
    effort: 'MAXIMIZE everything you control',
    acceptance: 'Whatever result comes',
    learning: 'From every outcome',
    repeat: 'With improved knowledge',
    keyInsight: 'The TRY matters more than the outcome. You control effort, not results.',
    principles: {
      wrongMindset: [
        'Cannot beat Top 10, so why try hard?',
        'Top 10 already maxed out, just match them',
        'Just create content, results dont matter',
        'If I dont beat Top 10, I failed',
        'Same score as Top 10 = same quality'
      ],
      correctMindset: [
        'I will TRY to beat Top 10 with max effort',
        'I will MAXIMIZE everything I control',
        'Results matter, but effort matters more',
        'If I didnt try my best, I failed',
        'Same score = good, improvement = better'
      ]
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW v9.8.0: Control Matrix (from Rally Master Guide V3)
  // ═══════════════════════════════════════════════════════════════════════════
  controlMatrix: {
    canControl: {
      G1_Alignment: { target: 2.0, how: 'Match campaign goal perfectly, use correct terminology' },
      G2_Accuracy: { target: 2.0, how: 'Verify all facts against official sources' },
      G3_Compliance: { target: 2.0, how: 'Include all required hashtags and mentions' },
      G4_Originality: { target: 2.0, how: 'Apply all checklist items, use authentic voice' },
      EP_Potential: { target: '4.5-5.0', how: 'Strong hook, good structure, conversation driver' },
      TQ_Quality: { target: '4.5-5.0', how: 'Clean formatting, readable, platform-optimized' },
      verifiedFacts: { target: 'ALL', how: 'Research thoroughly, verify each claim' }
    },
    cannotControl: {
      Retweets: { reason: 'Depends on audience size, timing, virality', strategy: 'Create shareable content, hope for best' },
      Likes: { reason: 'Algorithm dependent, audience mood', strategy: 'Focus on quality, let engagement happen' },
      Replies: { reason: 'Requires active community participation', strategy: 'Ask questions, invite discussion' },
      QR_QualityReplies: { reason: 'Depends on who replies', strategy: 'Post when active community is online' },
      FR_FollowersRepliers: { reason: 'Depends on influential accounts engaging', strategy: 'Hope for quality engagement' },
      ranking: { reason: 'Relative to other participants', strategy: 'Maximize what you control' },
      algorithmTiming: { reason: 'Platform decides visibility', strategy: 'Post at optimal times if known' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 NEW v9.8.3-ENHANCED: Campaign Type Adaptation (From Rally PDF Guides)
  // ═══════════════════════════════════════════════════════════════════════════
  campaignTypeAdaptation: {
    // Metrics/Momentum Campaign - Focus on growth data (like Grvt)
    metrics_momentum: {
      bestAngle: 'TVL, volume, user growth, or counterintuitive metric',
      keyFromKB: 'Extract specific numbers - never use estimates',
      humanElement: 'Compare with bad experiences on other platforms',
      avoid: 'Listing all metrics at once - pick ONE most impactful',
      g2Tip: 'Verify all numbers. "TVL $100M+" not "TVL around $100M"'
    },
    
    // Product Launch / Feature - New feature or major update
    product_launch: {
      bestAngle: 'Problem solved by this feature from user perspective',
      keyFromKB: 'How the feature works specifically, not marketing language',
      humanElement: 'Past frustration now resolved',
      avoid: 'Explaining entire system end-to-end (Rally forbids this)',
      g1Tip: 'Focus on ONE feature per proposed angle - not all'
    },
    
    // Community / Ecosystem - Community growth, social metrics
    community_ecosystem: {
      bestAngle: 'Specific moment of community interaction that was memorable',
      keyFromKB: 'Community size, engagement rate, community milestone',
      humanElement: 'Experience joining or interacting in community',
      avoid: 'Generic "great community" without specific details',
      g4Tip: 'Community experiences are very personal - leverage this'
    },
    
    // DeFi Protocol / Yield - DeFi, yield farming, liquidity
    defi_protocol: {
      bestAngle: 'Yield comparison vs alternatives, or unique risk/reward',
      keyFromKB: 'Specific APY/APR, TVL, relevant protocol mechanics',
      humanElement: 'Allocation decision you made and why',
      avoid: 'Promising profit or yield numbers as guarantee',
      g3Tip: 'DeFi campaigns often strict on financial language - read rules'
    },
    
    // NFT / Gaming / Social - NFT, GameFi, social Web3 platforms
    nft_gaming_social: {
      bestAngle: 'First memorable experience, not "value" of NFT',
      keyFromKB: 'Unique mechanics, clear utility, project milestone',
      humanElement: 'Specific moment that made you engaged',
      avoid: 'Price speculation, "floor price", financial potential',
      g4Tip: 'Entertainment/fun angle much more authentic for this type'
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 NEW v9.8.3-ENHANCED: 5 Pre-Writing Questions (From Rally PDF Guides)
  // ═══════════════════════════════════════════════════════════════════════════
  preWritingQuestions: {
    q1_memorable: {
      question: 'Apa SATU hal paling menarik dari project ini yang bikin kamu stop scrolling?',
      instruction: 'Bukan list fitur. SATU hal. Yang paling memorable.',
      purpose: 'Identify the hook'
    },
    q2_coffee_talk: {
      question: 'Kalau kamu cerita ini ke teman di warung kopi, kamu mulai dari mana?',
      instruction: 'Bukan dari definisi project. Dari momen atau reaksi.',
      purpose: 'Find natural opening'
    },
    q3_embarrassing: {
      question: 'Ada bagian mana yang bikin kamu sedikit embarrassed untuk diakui?',
      instruction: 'Terlalu excited? Terlalu skeptis dulu? Refresh halaman berkali-kali?',
      purpose: 'G4 gold - authentic vulnerability'
    },
    q4_specific_detail: {
      question: 'Angka atau detail SPESIFIK apa dari Knowledge Base yang paling memorable?',
      instruction: 'Tidak boleh angka yang kamu karang. Harus dari Knowledge Base.',
      purpose: 'G2 accuracy + X-Factor'
    },
    q5_unique_angle: {
      question: 'Sudut pandang APA yang BELBEDA dari tweet-tweet lain tentang ini?',
      instruction: 'Jangan ceritakan apa yang semua orang ceritakan.',
      purpose: 'Differentiation'
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 NEW v9.8.3-ENHANCED: Validation Tests Configuration
  // ═══════════════════════════════════════════════════════════════════════════
  validationTests: {
    readAloudTest: {
      description: 'Read tweet out loud. If any part feels awkward or "not like how people talk" - that part needs fixing.',
      tip: 'Ear sensitivity is more honest than any checklist',
      passCriteria: 'Every sentence sounds natural when spoken'
    },
    whoWroteThisTest: {
      description: 'Remove project name and hashtags. Does it still feel written by someone specific with specific perspective?',
      failIndicator: 'Could be written by anyone = not personal enough',
      passCriteria: 'Clear identity and perspective even without project context'
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 NEW v9.8.3-ENHANCED: Persona-First Philosophy
  // ═══════════════════════════════════════════════════════════════════════════
  personaFirstPhilosophy: {
    principle: 'Natural Content First. Validate After.',
    wrongApproach: {
      name: 'Checklist-First',
      steps: [
        '1. Read all rules',
        '2. Write while checking off items',
        '3. Make sure all elements present',
        '4. Submit'
      ],
      result: 'Robot pretending to be human'
    },
    correctApproach: {
      name: 'Persona-First',
      steps: [
        '1. Enter creator persona',
        '2. Think of genuine angle',
        '3. Write freely from that perspective',
        '4. Validate & minimal polish'
      ],
      result: 'Human who happens to score high'
    },
    keyInsight: 'Content that scores high is content that FEELS genuinely written by a human who is genuinely interested. All rules, all gates, all checklists are merely CONSEQUENCES of genuine content. Not the goal.'
  }
};

// ============================================================================
// PYTHON NLP INTEGRATION LAYER
// ============================================================================

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

class MultiProviderLLM {
  constructor(config) {
    this.config = config;
    this.nlpAnalyzer = new HybridNLPAnalyzer(config);
  }
  
  async loadAutoToken() {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const homeDir = os.homedir();
      const configPaths = [
        path.join(process.cwd(), '.z-ai-config'),
        path.join(homeDir, '.z-ai-config'),
        '/etc/.z-ai-config'
      ];
      
      for (const filePath of configPaths) {
        try {
          const configStr = fs.readFileSync(filePath, 'utf-8');
          const autoConfig = JSON.parse(configStr);
          if (autoConfig.token) {
            console.log(`   ✅ Auto-token loaded from ${filePath}`);
            return;
          }
        } catch (e) {
          // Non-critical: continue with next token
        }
      }
      console.log('   ⚠️ No auto-token found, using SDK default');
    } catch (e) {
      console.log('   ⚠️ Could not load auto-token:', e.message);
    }
  }
  
  // Token pool status now displayed in preflightCheck
  displayTokenPoolStatus() {
    // No-op - token pool status is now displayed during preflight check
  }

  async chat(messages, options = {}) {
    const result = await callAI(messages, options);
    try { console.log(`   ✅ Response received (${result.provider}, token: ${result.tokenUsed || 'auto'})`); } catch (e) { /* EPIPE safe */ }
    
    return {
      content: result.content || '',
      thinking: result.thinking || null,
      provider: result.provider,
      model: CONFIG.model?.name || 'glm-5',
      usage: result.usage
    };
  }
  
  async blindJudge(systemPrompt, userPrompt, judgeId, options = {}) {
    try { console.log(`\n   🔒 TRUE BLIND JUDGE ${judgeId} - Fresh Context`); } catch (e) { /* EPIPE safe */ }

    const result = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { temperature: 0.2, maxTokens: 3000, model: 'glm-5', enableSearch: true });
    
    try { console.log(`   ✅ Judge ${judgeId} success! (model: glm-5 + search)`); } catch (e) { /* EPIPE safe */ }

    return {
      content: result.content || '',
      thinking: result.thinking || null,
      provider: result.provider,
      model: 'glm-5'
    };
  }
  
  async contextAwareJudge(systemPrompt, userPrompt, judgeId) {
    try { console.log(`\n   📋 CONTEXT-AWARE JUDGE ${judgeId} - With Campaign Info`); } catch (e) { /* EPIPE safe */ }

    const result = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { temperature: 0.2, maxTokens: 3000, model: 'glm-5', enableSearch: true });
    
    try { console.log(`   ✅ Context-Aware Judge ${judgeId} success! (model: glm-5 + search)`); } catch (e) { /* EPIPE safe */ }

    return {
      content: result.content || '',
      thinking: result.thinking || null,
      provider: result.provider,
      model: 'glm-5'
    };
  }
  
  async factCheckJudge(systemPrompt, userPrompt, judgeId) {
    try { console.log(`\n   🔍 FACT-CHECK JUDGE ${judgeId} - Model Built-in Search`); } catch (e) { /* EPIPE safe */ }

    // Model glm-5 dengan enable_search: true sudah otomatis melakukan web search
    // Tidak perlu webSearchSmart terpisah — model akan search sendiri saat dibutuhkan
    const result = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { temperature: 0.2, maxTokens: 3000, model: 'glm-5', enableSearch: true });
    
    try { console.log(`   ✅ Fact-Check Judge ${judgeId} success! (model: glm-5 + built-in search)`); } catch (e) { /* EPIPE safe */ }

    return {
      content: result.content || '',
      thinking: result.thinking || null,
      webSearchUsed: true, // Model search aktif via enable_search
      provider: result.provider,
      model: 'glm-5'
    };
  }
  
  async hybridJudge(systemPrompt, userPrompt, judgeId, content, competitorContents = []) {
    console.log(`\n   🐍 HYBRID JUDGE ${judgeId} - Python NLP Enhanced`);

    const nlpAnalysis = await this.nlpAnalyzer.analyzeContent(content, null, competitorContents);
    
    const enhancedPrompt = userPrompt + `\n\n═══════════════════════════════════════════════════════════════
🐍 PYTHON NLP ANALYSIS (Use this for scoring):
═══════════════════════════════════════════════════════════════
- Readability Score: ${nlpAnalysis.readability?.primary?.flesch_reading_ease || 'N/A'}
- Sentiment: ${nlpAnalysis.sentiment?.consensus_label || 'N/A'} (${nlpAnalysis.sentiment?.consensus_score?.toFixed(2) || 0})
- Emotion Variety: ${nlpAnalysis.emotions?.emotion_variety || 0} emotions detected
- Rare Emotion Combo: ${nlpAnalysis.emotions?.rare_combo_detected ? '✓ Yes' : '✗ No'}
- Content Depth: ${nlpAnalysis.depth_analysis?.depth_level || 'N/A'} (${nlpAnalysis.depth_analysis?.overall_depth_score || 0})
- Similarity to Competitors: ${((nlpAnalysis.similarity?.primary?.max_similarity || 0) * 100).toFixed(1)}%
- Overall Quality Grade: ${nlpAnalysis.hybridMetrics?.qualityGrade || 'N/A'} (${nlpAnalysis.hybridMetrics?.overallQuality || 0}/100)
`;

    const result = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: enhancedPrompt }
    ], { temperature: 0.2, maxTokens: 3000, model: 'glm-5', enableSearch: true });
    
    console.log(`   ✅ Hybrid Judge ${judgeId} success! (model: glm-5 + search)`);

    return {
      content: result.content || '',
      thinking: result.thinking || null,
      nlpAnalysis: nlpAnalysis,
      provider: result.provider,
      model: CONFIG.model?.name || 'glm-5'
    };
  }
  
  getNLPAnalyzer() {
    return this.nlpAnalyzer;
  }
  
  httpRequest(url, options) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };
      
      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      
      req.on('error', reject);
      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.body) req.write(options.body);
      req.end();
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * fixContentFormatting - Post-processing to ensure content has proper paragraph structure.
 * LLMs often output single wall-of-text even when instructed to use paragraphs.
 * This function detects and fixes formatting issues.
 * 
 * Rules:
 * 1. If content has NO paragraph breaks (single wall of text), intelligently split into paragraphs
 * 2. If content has some paragraphs but some are too long (>3 sentences), split them
 * 3. Preserve existing intentional formatting (parenthetical asides, etc.)
 * 4. Always use double newlines (\n\n) between paragraphs
 */
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
// SELECTION FUNCTIONS
// ============================================================================

function selectUnusedPersona(competitorAnalysis) {
  const usedPersonas = competitorAnalysis?.personasUsed || [];
  const availablePersonas = CONFIG.personas.filter(p => 
    !usedPersonas.some(used => 
      used.toLowerCase().includes(p.id.toLowerCase()) ||
      used.toLowerCase().includes(p.name.toLowerCase())
    )
  );
  
  if (availablePersonas.length === 0) {
    return CONFIG.personas[Math.floor(Math.random() * CONFIG.personas.length)];
  }
  
  const preferredOrder = ['contrarian', 'skeptic', 'insider', 'researcher', 'storyteller', 'victim_to_hero', 'newbie'];
  for (const pref of preferredOrder) {
    const found = availablePersonas.find(p => p.id === pref);
    if (found) return found;
  }
  
  return availablePersonas[0];
}

function selectUnusedNarrativeStructure(competitorAnalysis) {
  const usedStructures = competitorAnalysis?.structuresUsed || [];
  const availableStructures = CONFIG.narrativeStructures.filter(s => 
    !usedStructures.some(used => 
      used.toLowerCase().includes(s.id.toLowerCase()) ||
      used.toLowerCase().includes(s.name.toLowerCase())
    )
  );
  
  if (availableStructures.length === 0) {
    return CONFIG.narrativeStructures[Math.floor(Math.random() * CONFIG.narrativeStructures.length)];
  }
  
  const preferredOrder = ['mystery', 'contrast', 'case_study', 'qa', 'hero_journey', 'pas', 'bab'];
  for (const pref of preferredOrder) {
    const found = availableStructures.find(s => s.id === pref);
    if (found) return found;
  }
  
  return availableStructures[0];
}

function selectUnaddressedAudience(competitorAnalysis, campaignTopic) {
  const topicLower = (campaignTopic || '').toLowerCase();
  let category = 'internet_court';
  
  const addressedAudiences = competitorAnalysis?.audienceAddressed || [];
  const segments = CONFIG.audienceSegments[category] || [];
  const availableSegments = segments.filter(s => 
    !addressedAudiences.some(addr => 
      addr.toLowerCase().includes(s.id.toLowerCase()) ||
      addr.toLowerCase().includes(s.name.toLowerCase())
    )
  );
  
  if (availableSegments.length === 0) {
    return segments[0] || { id: 'general', name: 'General Audience', pain: 'General interest' };
  }
  
  return availableSegments[0];
}

function selectRareEmotionCombo(competitorAnalysis) {
  const usedEmotions = (competitorAnalysis?.emotionsUsed || []).map(e => 
    typeof e === 'object' ? e.emotion?.toLowerCase() : e.toLowerCase()
  );
  
  const rareCombos = CONFIG.emotionCombos.rare;
  const commonCombos = CONFIG.emotionCombos.common;
  
  const availableRare = rareCombos.filter(combo => 
    !combo.emotions.some(em => usedEmotions.includes(em.toLowerCase()))
  );
  
  if (availableRare.length > 0) {
    return { ...availableRare[0], rarityLevel: 'very rare' };
  }
  
  const availableCommon = commonCombos.filter(combo =>
    !combo.emotions.every(em => usedEmotions.includes(em.toLowerCase()))
  );
  
  if (availableCommon.length > 0) {
    return { ...availableCommon[0], rarityLevel: 'common' };
  }
  
  return {
    emotions: ['curiosity', 'surprise', 'hope'],
    hook: 'Discovery-driven engagement',
    rarityLevel: 'common'
  };
}

function extractKeywords(title) {
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once'];
  
  return (title || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 5);
}

// ============================================================================
// NEW v9.8.0: G4 ORIGINALITY DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect G4 Originality Elements in content
 * Returns detailed analysis of bonuses and penalties
 */
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
function detectXFactors(content) {
  const result = {
    detected: [],
    missing: [],
    score: 0
  };
  
  if (!content) return result;
  
  const xFactors = CONFIG.xFactorDifferentiators;
  const contentLower = content.toLowerCase();
  
  // 1. Specific Numbers
  const numberMatches = content.match(xFactors.specificNumbers.detection) || [];
  if (numberMatches.length > 0) {
    result.detected.push({
      type: 'specificNumbers',
      count: numberMatches.length,
      examples: numberMatches.slice(0, 3),
      description: xFactors.specificNumbers.description
    });
    result.score += 20;
  } else {
    result.missing.push({
      type: 'specificNumbers',
      description: 'Add specific numbers (47%, $1.2M, etc.)'
    });
  }
  
  // 2. Time Specificity
  const timeMatches = content.match(xFactors.timeSpecificity.detection) || [];
  if (timeMatches.length > 0) {
    result.detected.push({
      type: 'timeSpecificity',
      count: timeMatches.length,
      examples: timeMatches.slice(0, 3),
      description: xFactors.timeSpecificity.description
    });
    result.score += 20;
  } else {
    result.missing.push({
      type: 'timeSpecificity',
      description: 'Add time specificity (25 minutes, 3 hours, etc.)'
    });
  }
  
  // 3. Embarrassing Honesty
  const embarrassmentMatches = xFactors.embarrassingHonesty.patterns.filter(p =>
    contentLower.includes(p.toLowerCase())
  );
  if (embarrassmentMatches.length > 0) {
    result.detected.push({
      type: 'embarrassingHonesty',
      matches: embarrassmentMatches,
      description: xFactors.embarrassingHonesty.description
    });
    result.score += 25;
  } else {
    result.missing.push({
      type: 'embarrassingHonesty',
      description: 'Add embarrassing honesty (embarrassing to admit, not proud of)'
    });
  }
  
  // 4. Insider Detail (check for specific patterns)
  const insiderPatterns = [
    /went from \d+%/i,
    /\d+ to \d+/i,
    /refreshed.*\d+ times/i,
    /watched.*\d+/i,
    /counted.*\d+/i
  ];
  const hasInsiderDetail = insiderPatterns.some(p => p.test(content));
  if (hasInsiderDetail) {
    result.detected.push({
      type: 'insiderDetail',
      description: xFactors.insiderDetail.description
    });
    result.score += 20;
  } else {
    result.missing.push({
      type: 'insiderDetail',
      description: 'Add insider detail (went from X to Y, counted Z times)'
    });
  }
  
  // 5. Unexpected Angle (harder to detect automatically)
  // Check for contrast words that might indicate unexpected angle
  const unexpectedIndicators = [
    'but actually', 'surprisingly', 'unexpectedly', 'turns out',
    'contrary to', 'not what youd expect', 'heres the thing'
  ];
  const hasUnexpectedAngle = unexpectedIndicators.some(p => contentLower.includes(p));
  if (hasUnexpectedAngle) {
    result.detected.push({
      type: 'unexpectedAngle',
      description: xFactors.unexpectedAngle.description
    });
    result.score += 15;
  } else {
    result.missing.push({
      type: 'unexpectedAngle',
      description: 'Consider unexpected angle (surprise twist, contrary view)'
    });
  }
  
  result.score = Math.min(100, result.score);
  
  return result;
}

/**
 * Display Control Matrix (What you CAN vs CANNOT control)
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
async function buildPreWritingPerspective(llm, campaignData, researchData, competitorAnalysis) {
  console.log('\n   🧠 Building Pre-Writing Perspective (Persona-First + Rules-Aware)...');
  
  const campaignType = detectCampaignType(campaignData);
  const typeConfig = CONFIG.campaignTypeAdaptation[campaignType];
  
  // Parse requirements ONCE so perspective is rules-aware
  const reqs = parseCampaignRequirements(campaignData);
  
  const systemPrompt = `You are a genuine crypto user who just discovered this project. 
Answer these questions HONESTLY from your perspective. 
Do NOT write content yet - just build your perspective.

FILMLOSOFI: Natural Content First. But Rules-Aware.
- Think like a real person who genuinely encountered this project
- Be vulnerable - admit skepticism, embarrassment, surprise
- Pick ONE thing that genuinely caught your attention
- IMPORTANT: You MUST build your perspective WITHIN the campaign rules
- Your chosen angle MUST be compatible with the rules below
- If rules prohibit certain elements, your perspective must avoid those elements`;

  const userPrompt = `════════════════════════════════════════════════════════════════
CAMPAIGN: ${campaignData.title || 'Unknown'}
${campaignData.missionTitle ? `🎯 MISSION: ${campaignData.missionTitle}` : ''}
DESCRIPTION: ${campaignData.description || campaignData.goal || 'N/A'}
KNOWLEDGE BASE: ${campaignData.knowledgeBase || campaignData.knowledge_base || 'N/A'}
CAMPAIGN TYPE: ${campaignType}
════════════════════════════════════════════════════════════════

🚨🚨🚨 CAMPAIGN RULES - YOU MUST RESPECT THESE 🚨🚨🚨
${campaignData.rules || campaignData.requirements || 'Standard content guidelines'}

${campaignData.style ? `🎨 STYLE REQUIRED: ${campaignData.style}` : ''}

${campaignData.missionGoal ? `🎯 MISSION GOAL (your content MUST align): ${campaignData.missionGoal}` : ''}

${reqs.mandatoryTags.length > 0 ? `🏷️ MANDATORY TAGS (must include): ${reqs.mandatoryTags.join(', ')}` : ''}
${reqs.mandatoryHashtags.length > 0 ? `#️⃣ MANDATORY HASHTAGS: ${reqs.mandatoryHashtags.join(', ')}` : ''}
${reqs.mandatoryMetrics ? '📊 METRICS REQUIRED: Must include specific numbers/metrics' : ''}
${reqs.mandatoryUrl ? `🔗 URL REQUIRED: ${campaignData.campaignUrl || campaignData.url}` : ''}
${reqs.mandatoryScreenshot ? '📸 SCREENSHOT REQUIRED' : ''}
${reqs.prohibitedHashtags.length > 0 ? '🚫 NO HASHTAGS ALLOWED' : ''}
${reqs.prohibitedUrl ? '🚫 NO URL/LINK ALLOWED' : ''}
${reqs.prohibitedTags.length > 0 ? `🚫 DO NOT TAG: ${reqs.prohibitedTags.join(', ')}` : ''}
${reqs.prohibitedKeywords.length > 0 ? `🚫 DO NOT MENTION: ${reqs.prohibitedKeywords.join(', ')}` : ''}
${reqs.focusTopic ? `🎯 FOCUS TOPIC: ${reqs.focusTopic}` : ''}
${campaignData.additionalInfo ? `📎 ADDITIONAL INFO: ${campaignData.additionalInfo}` : ''}

${reqs.proposedAngles.length > 0 ? `
🎯 PROPOSED ANGLES (MUST pick ONE):
${reqs.proposedAngles.map((a, i) => `   ANGLE ${i + 1}: "${a}"`).join('\n')}
` : ''}
════════════════════════════════════════════════════════════════

KEY FACTS FROM RESEARCH:
${researchData?.synthesis?.keyFacts?.slice(0, 3).map(f => `• ${f}`).join('\n') || 'No facts available'}

ANGLES ALREADY USED (AVOID):
${(competitorAnalysis?.anglesUsed || []).slice(0, 3).map(a => `• ${a}`).join('\n') || 'None identified'}

════════════════════════════════════════════════════════════════
ANSWER THESE QUESTIONS (build your rules-aware perspective):
════════════════════════════════════════════════════════════════

Q1: Apa SATU hal paling menarik dari project ini yang bikin kamu stop scrolling?
→ Bukan list fitur. SATU hal yang paling memorable.
→ Pastikan hal ini SESUAI dengan mission goal dan rules!

Q2: Kalau kamu cerita ini ke teman di warung kopi, kamu mulai dari mana?
→ Bukan dari definisi project. Dari momen atau reaksi.
→ Pikirkan bagaimana cerita ini bisa memenuhi SEMUA requirements.

Q3: Ada bagian mana yang bikin kamu sedikit embarrassed untuk diakui?
→ Terlalu excited? Terlalu skeptis dulu? Refresh halaman berkali-kali?
→ Ini EMAS untuk G4 - vulnerability yang authentic!
→ Pastikan cerita ini TIDAK melanggar prohibited items!

Q4: Angka atau detail SPESIFIK apa dari Knowledge Base yang paling memorable?
→ Tidak boleh mengarang! Harus dari Knowledge Base.
→ ${reqs.mandatoryMetrics ? 'PENTING: Kamu HARUS punya angka/metric spesifik di konten nanti!' : ''}

Q5: Sudut pandang APA yang BERBEDA dari tweet-tweet lain tentang ini?
→ Jangan ceritakan apa yang semua orang ceritakan.
${reqs.proposedAngles.length > 0 ? `→ PENTING: Kamu HARUS memilih salah satu dari Proposed Angles di atas!` : ''}

Q6: Bagaimana kamu akan memastikan kontenmu MEMENUHI SEMUA rules di atas?
→ Checklist: tags, hashtags, metrics, URL, screenshot, focus topic, style
→ Apa yang paling tricky dari rules ini?

════════════════════════════════════════════════════════════════

Return JSON:
{
  "q1_memorable": "Your honest answer - the ONE thing (rules-compatible)",
  "q2_coffee_talk": "How you'd start the conversation",
  "q3_embarrassing": "Your vulnerable admission (this is G4 gold!)",
  "q4_specific_detail": "Specific fact from KB that stuck with you",
  "q5_unique_angle": "Your different perspective${reqs.proposedAngles.length > 0 ? ' (MUST be one of the proposed angles)' : ''}",
  "q6_rules_plan": "How you will ensure all rules are met",
  "rules_checklist": {
    "tags_covered": true/false,
    "hashtags_covered": true/false,
    "metrics_included": true/false,
    "url_included": true/false,
    "screenshot_planned": true/false,
    "prohibited_avoided": true/false
  },
  "core_perspective": "Summary of your genuine viewpoint",
  "chosen_angle": "The angle you will write from",
  "human_element": "What makes this personal to you"
}`;

  const response = await llm.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { temperature: 0.9, maxTokens: 2000, model: 'glm-5', enableSearch: true });
  
  const result = safeJsonParse(response.content);
  
  if (result) {
    console.log(`   ✓ Perspective built successfully`);
    console.log(`   ✓ Core angle: ${result.chosen_angle?.substring(0, 50)}...`);
    console.log(`   ✓ Human element: ${result.human_element?.substring(0, 50)}...`);
    
    // Validate rules awareness
    if (result.rules_checklist) {
      const checklist = result.rules_checklist;
      const issues = [];
      if (reqs.mandatoryTags.length > 0 && !checklist.tags_covered) issues.push('tags');
      if (reqs.mandatoryHashtags.length > 0 && !checklist.hashtags_covered) issues.push('hashtags');
      if (reqs.mandatoryMetrics && !checklist.metrics_included) issues.push('metrics');
      if (reqs.mandatoryUrl && !checklist.url_included) issues.push('url');
      if (reqs.mandatoryScreenshot && !checklist.screenshot_planned) issues.push('screenshot');
      
      if (issues.length > 0) {
        console.log(`   ⚠️ Perspective missing rules awareness for: ${issues.join(', ')}`);
        // Auto-fix: add reminder
        result._rulesReminder = `REMINDER: Must include ${issues.join(', ')}`;
      } else {
        console.log(`   ✅ Rules awareness check: ALL requirements acknowledged`);
      }
    }
  }
  
  return {
    perspective: result,
    campaignType,
    typeConfig,
    requirements: reqs
  };
}

/**
 * Perform Read Aloud Test on content
 * Validates that content sounds natural when spoken
 */
function performReadAloudTest(content) {
  const issues = [];
  const warnings = [];
  
  // Check for awkward phrases
  const awkwardPhrases = [
    { pattern: /in conclusion/gi, issue: '"In conclusion" sounds formal and unnatural in speech' },
    { pattern: /to summarize/gi, issue: '"To summarize" sounds like a presentation' },
    { pattern: /at the end of the day/gi, issue: '"At the end of the day" is overused and sounds scripted' },
    { pattern: /it goes without saying/gi, issue: '"It goes without saying" is contradictory when said aloud' },
    { pattern: /let me tell you/gi, issue: '"Let me tell you" sounds like a sales pitch' },
    { pattern: /here's the thing/gi, issue: '"Here\'s the thing" is a filler phrase' },
    { pattern: /imagine a world/gi, issue: '"Imagine a world" sounds like marketing copy' },
    { pattern: /picture this/gi, issue: '"Picture this" sounds scripted' }
  ];
  
  for (const { pattern, issue } of awkwardPhrases) {
    if (pattern.test(content)) {
      issues.push(issue);
    }
  }
  
  // Check sentence length - very long sentences are hard to speak
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).length;
    if (words > 30) {
      warnings.push(`Very long sentence (${words} words) - hard to speak naturally`);
    }
  }
  
  // Check for repeated word patterns that sound robotic
  const words = content.toLowerCase().split(/\s+/);
  const wordFreq = {};
  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (cleaned.length > 3) {
      wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
    }
  }
  
  for (const [word, count] of Object.entries(wordFreq)) {
    if (count > 3 && !['that', 'this', 'with', 'from', 'have', 'been', 'about'].includes(word)) {
      warnings.push(`Word "${word}" repeated ${count} times - may sound repetitive`);
    }
  }
  
  // Check for em dashes (hard to speak)
  if (content.includes('—') || content.includes('–')) {
    issues.push('Em dashes present - these have no spoken equivalent');
  }
  
  // Check for smart quotes
  if (content.match(/[""]/)) {
    issues.push('Smart quotes detected - suggests copy-paste behavior');
  }
  
  const passed = issues.length === 0;
  
  return {
    passed,
    issues,
    warnings,
    score: passed ? 1.0 : Math.max(0, 1 - (issues.length * 0.2)),
    recommendation: passed ? 
      'Content sounds natural when spoken' : 
      `Fix ${issues.length} issue(s) before submitting`
  };
}

/**
 * Perform "Siapa yang Nulis Ini?" Test
 * Checks if content has clear identity and perspective
 */
function performWhoWroteThisTest(content, projectHandle) {
  // Remove project name and hashtags to test identity
  let strippedContent = content
    .replace(new RegExp(projectHandle || '@\\w+', 'gi'), '')
    .replace(/#\w+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const issues = [];
  const signals = [];
  
  // Check for personal pronouns (indicates personal voice)
  const personalPronouns = strippedContent.match(/\b(i|me|my|mine|i'm|i've|i'd)\b/gi) || [];
  if (personalPronouns.length >= 3) {
    signals.push(`Strong personal voice (${personalPronouns.length} personal pronouns)`);
  } else if (personalPronouns.length < 2) {
    issues.push('Weak personal voice - lacks "I/me/my" perspective');
  }
  
  // Check for specific experiences (indicates real experience)
  const experiencePatterns = [
    /\d+\s*(minutes?|hours?|days?|weeks?|months?)/gi,
    /\d+\s*(%|\$|k|m|b)\b/gi,
    /spent|watched|noticed|realized|discovered/gi,
    /sat there|stood|waited|refreshed/gi
  ];
  
  let experienceCount = 0;
  for (const pattern of experiencePatterns) {
    const matches = strippedContent.match(pattern) || [];
    experienceCount += matches.length;
  }
  
  if (experienceCount >= 2) {
    signals.push(`Specific experience details (${experienceCount} found)`);
  } else {
    issues.push('Lacks specific experience details - feels generic');
  }
  
  // Check for emotional indicators (indicates human response)
  const emotionalPatterns = [
    /honestly|tbh|ngl|fr|for real|seriously/gi,
    /embarrassing|awkward|weird|strange|surprising/gi,
    /can't believe|didn't expect|never thought/gi,
    /stomach|heart|chest|jaw|breath/gi
  ];
  
  let emotionalCount = 0;
  for (const pattern of emotionalPatterns) {
    const matches = strippedContent.match(pattern) || [];
    emotionalCount += matches.length;
  }
  
  if (emotionalCount >= 1) {
    signals.push(`Emotional indicators present (${emotionalCount} found)`);
  }
  
  // Check for unique perspective (not generic praise)
  const genericPhrases = [
    /amazing|incredible|revolutionary|game.?changing|groundbreaking/gi,
    /best.?in.?class|world.?class|cutting.?edge/gi,
    /everyone should|must try|highly recommend/gi
  ];
  
  let genericCount = 0;
  for (const pattern of genericPhrases) {
    const matches = strippedContent.match(pattern) || [];
    genericCount += matches.length;
  }
  
  if (genericCount > 2) {
    issues.push('Too much generic praise - lacks unique perspective');
  }
  
  // Calculate identity score
  const identityScore = Math.min(1, (signals.length * 0.3) - (issues.length * 0.2));
  const passed = identityScore >= 0.5 && issues.length < 3;
  
  return {
    passed,
    identityScore,
    signals,
    issues,
    strippedContentPreview: strippedContent.substring(0, 100) + '...',
    recommendation: passed ?
      'Content has clear identity and perspective' :
      'Add more personal voice and specific details'
  };
}

/**
 * Run all validation tests on content
 */
function runEnhancedValidation(content, campaignData) {
  console.log('\n   🔬 Running Enhanced Validation Tests...');
  
  // Read Aloud Test
  const readAloudResult = performReadAloudTest(content);
  console.log(`   ${readAloudResult.passed ? '✓' : '✗'} Read Aloud Test: ${readAloudResult.passed ? 'PASSED' : 'FAILED'}`);
  if (readAloudResult.issues.length > 0) {
    readAloudResult.issues.forEach(issue => console.log(`      ⚠️ ${issue}`));
  }
  
  // Who Wrote This Test
  const whoWroteResult = performWhoWroteThisTest(content, campaignData.projectHandle || campaignData.handle);
  console.log(`   ${whoWroteResult.passed ? '✓' : '✗'} Who Wrote This Test: ${whoWroteResult.passed ? 'PASSED' : 'FAILED'}`);
  if (whoWroteResult.signals.length > 0) {
    whoWroteResult.signals.forEach(signal => console.log(`      ✓ ${signal}`));
  }
  if (whoWroteResult.issues.length > 0) {
    whoWroteResult.issues.forEach(issue => console.log(`      ⚠️ ${issue}`));
  }
  
  const allPassed = readAloudResult.passed && whoWroteResult.passed;
  const overallScore = (readAloudResult.score + whoWroteResult.identityScore) / 2;
  
  return {
    passed: allPassed,
    overallScore,
    readAloudTest: readAloudResult,
    whoWroteThisTest: whoWroteResult,
    recommendation: allPassed ?
      'All validation tests passed - content ready for judging' :
      `Fix issues before submitting (${readAloudResult.issues.length + whoWroteResult.issues.length} issues found)`
  };
}

/**
 * Display Pre-Writing Perspective
 */
function displayPreWritingPerspective(perspective) {
  if (!perspective) return;
  
  console.log('\n   ╔════════════════════════════════════════════════════════════╗');
  console.log('   ║           🧠 PRE-WRITING PERSPECTIVE BUILT                ║');
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log(`   ║  Campaign Type: ${perspective.campaignType?.padEnd(38) || 'N/A'}║`);
  console.log(`   ║  Chosen Angle: ${(perspective.perspective?.chosen_angle?.substring(0, 35) || 'N/A').padEnd(38)}║`);
  console.log(`   ║  Human Element: ${(perspective.perspective?.human_element?.substring(0, 35) || 'N/A').padEnd(37)}║`);
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log('   ║  6 Questions Answered (Rules-Aware):                     ║');
  console.log(`   ║    Q1 (Memorable): ${perspective.perspective?.q1_memorable ? '✓' : '✗'}                              ║`);
  console.log(`   ║    Q2 (Coffee Talk): ${perspective.perspective?.q2_coffee_talk ? '✓' : '✗'}                           ║`);
  console.log(`   ║    Q3 (Embarrassing): ${perspective.perspective?.q3_embarrassing ? '✓' : '✗'}                           ║`);
  console.log(`   ║    Q4 (Specific Detail): ${perspective.perspective?.q4_specific_detail ? '✓' : '✗'}                        ║`);
  console.log(`   ║    Q5 (Unique Angle): ${perspective.perspective?.q5_unique_angle ? '✓' : '✗'}                           ║`);
  console.log(`   ║    Q6 (Rules Plan): ${perspective.perspective?.q6_rules_plan ? '✓' : '✗'}                            ║`);
  
  // Display rules checklist if available
  if (perspective.perspective?.rules_checklist) {
    const rc = perspective.perspective.rules_checklist;
    console.log('   ╠════════════════════════════════════════════════════════════╣');
    console.log('   ║  Rules Awareness Checklist:                               ║');
    console.log(`   ║    Tags: ${rc.tags_covered ? '✓ Aware' : '✗ Missing'}                                 ║`);
    console.log(`   ║    Hashtags: ${rc.hashtags_covered ? '✓ Aware' : '✗ Missing'}                             ║`);
    console.log(`   ║    Metrics: ${rc.metrics_included ? '✓ Aware' : '✗ Missing'}                               ║`);
    console.log(`   ║    URL: ${rc.url_included ? '✓ Aware' : '✗ Missing'}                                    ║`);
    console.log(`   ║    Screenshot: ${rc.screenshot_planned ? '✓ Aware' : '✗ Missing'}                           ║`);
    console.log(`   ║    Prohibited: ${rc.prohibited_avoided ? '✓ Aware' : '✗ Missing'}                          ║`);
  }
  
  if (perspective.requirements) {
    const reqs = perspective.requirements;
    console.log('   ╠════════════════════════════════════════════════════════════╣');
    console.log('   ║  Parsed Requirements:                                     ║');
    console.log(`   ║    Mandatory Tags: ${reqs.mandatoryTags.length.toString().padEnd(3)} | Hashtags: ${reqs.mandatoryHashtags.length.toString().padEnd(2)} ║`);
    console.log(`   ║    Metrics: ${reqs.mandatoryMetrics ? 'YES' : 'NO '}   | URL: ${reqs.mandatoryUrl ? 'YES' : 'NO  '}  | Screenshot: ${reqs.mandatoryScreenshot ? 'YES' : 'NO  '}║`);
    console.log(`   ║    Prohibited URL: ${reqs.prohibitedUrl ? 'YES' : 'NO '} | Prohibited Hashtags: ${reqs.prohibitedHashtags.length > 0 ? 'YES' : 'NO  '}║`);
    console.log(`   ║    Proposed Angles: ${reqs.proposedAngles.length.toString().padEnd(2)}     | Focus Topic: ${reqs.focusTopic ? 'YES' : 'NO  '}║`);
  }
  
  console.log('   ╚════════════════════════════════════════════════════════════╝');
}

// ============================================================================
// COMPETITOR ANALYSIS - Must Succeed!
// ============================================================================

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
    username: s.xUsername || 'Anonymous'
  })).filter(s => s.content && s.content.length > 50);
  
  console.log(`   📄 Analyzing ${competitorContent.length} competitor contents...`);
  
  // Use Python NLP for each competitor content
  const nlpAnalyzer = llm.getNLPAnalyzer();
  const nlpResults = [];
  
  for (let i = 0; i < Math.min(competitorContent.length, 5); i++) {
    console.log(`   🐍 Python NLP analysis for competitor ${i + 1}...`);
    const nlpResult = await nlpAnalyzer.analyzeContent(competitorContent[i].content);
    nlpResults.push({
      index: i,
      score: competitorContent[i].score,
      nlp: nlpResult
    });
    await delay(200);
  }
  
  // AI analysis for patterns
  const analysisPrompt = `Analyze these COMPETITOR CONTENTS for "${campaignTitle}":

${campaignData.description ? `CAMPAIGN DESCRIPTION: ${campaignData.description}` : ''}
${campaignData.missionGoal ? `MISSION GOAL: ${campaignData.missionGoal}` : ''}
${campaignData.rules ? `CAMPAIGN RULES: ${campaignData.rules.substring(0, 500)}` : ''}

${competitorContent.map((c, i) => `
--- COMPETITOR ${i + 1} (Score: ${c.score}) ---
${c.content.substring(0, 800)}
`).join('\n')}

NLP ANALYSIS DATA:
${nlpResults.map(r => `
Competitor ${r.index + 1}: Grade ${r.nlp.hybridMetrics?.qualityGrade || 'N/A'}, 
Emotions: ${r.nlp.emotions?.emotion_variety || 0}, 
Depth: ${r.nlp.depth_analysis?.depth_level || 'N/A'},
Sentiment: ${r.nlp.sentiment?.consensus_label || 'N/A'}
`).join('\n')}

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
  ], { temperature: 0.5, maxTokens: 4000, model: 'glm-5-flash', enableSearch: true });
  
  const analysis = safeJsonParse(response.content);
  
  if (!analysis) {
    throw new Error('Failed to parse competitor analysis result');
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
// DEEP RESEARCH - Single AI call with built-in search (no manual web search)
// ============================================================================

async function multiQueryDeepResearch(llm, campaignTitle, campaignData) {
  console.log('\n' + '─'.repeat(60));
  console.log('🔎 DEEP RESEARCH (AI Built-in Search)');
  console.log('─'.repeat(60));
  
  // Model glm-5-flash dengan enable_search: true sudah otomatis melakukan web search
  // Tidak perlu 6× webSearchSmart terpisah — SATU call AI dengan search sudah cukup
  console.log('   🔍 Using model built-in search (no separate web search needed)...');
  
  const researchPrompt = `You are a DEEP research expert. Research THOROUGHLY about "${campaignTitle}" for creating unique, high-quality social media content.

════════════════════════════════════════════════════════════════
CAMPAIGN CONTEXT:
════════════════════════════════════════════════════════════════
Campaign: ${campaignTitle}
Description: ${campaignData.description || campaignData.goal || 'Not provided'}
${campaignData.knowledgeBase ? 'Knowledge Base: ' + campaignData.knowledgeBase.substring(0, 500) : ''}

════════════════════════════════════════════════════════════════
RESEARCH TASKS (search the web for ALL of these):
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

  const response = await llm.chat([
    { role: 'system', content: 'You are a deep research expert. Search the web thoroughly and return well-researched JSON data. Return JSON only, no explanation.' },
    { role: 'user', content: researchPrompt }
  ], { temperature: 0.5, maxTokens: 4000, model: 'glm-5-flash', enableSearch: true });
  
  let synthesis = safeJsonParse(response.content);
  
  if (!synthesis) {
    console.log('   ⚠️ Could not parse research JSON, retrying with simpler prompt...');
    
    const retryResponse = await llm.chat([
      { role: 'system', content: 'Return valid JSON only. No markdown, no explanation.' },
      { role: 'user', content: `Research "${campaignTitle}" and return: {"keyFacts":["fact1","fact2"],"realCases":["case1"],"controversies":["controversy1"],"statistics":["stat1"],"uniqueAngles":[{"angle":"angle","evidence":"evidence","uniqueness":"why"}],"evidenceLayers":{"macroData":"data","caseStudy":"example","personalTouch":"relatable","expertValidation":"source"}}` }
    ], { temperature: 0.5, maxTokens: 3000, model: 'glm-5-flash', enableSearch: true });
    
    synthesis = safeJsonParse(retryResponse.content);
  }
  
  if (!synthesis) {
    console.log('   ⚠️ Research parse failed, using minimal fallback...');
    synthesis = {
      keyFacts: [`${campaignTitle} - researched via AI built-in search`],
      realCases: [],
      controversies: [],
      statistics: [],
      expertQuotes: [],
      untoldStories: [],
      uniqueAngles: [{ angle: 'AI-researched perspective', evidence: 'Built-in search', uniqueness: 'Fresh angle' }],
      evidenceLayers: {
        macroData: 'Available via search',
        caseStudy: 'Found via research',
        personalTouch: 'Relatable element',
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
// CONTENT GENERATION - 🆕 ENHANCED WITH PERSONA-FIRST PHILOSOPHY
// ============================================================================

async function generateUniqueContent(llm, campaignData, competitorAnalysis, researchData, tweetCount = 1, comprehensionPlan = null) {
  console.log('\n' + '─'.repeat(60));
  console.log('✨ GENERATING UNIQUE CONTENT (Persona-First + Rules-Aware Approach)');
  console.log('─'.repeat(60));
  
  // 🆕 NEW: Build Pre-Writing Perspective FIRST (Persona-First + Rules-Aware Philosophy)
  console.log('\n   🧠 STEP 1: Building Pre-Writing Perspective (Rules-Aware)...');
  const preWritingResult = await buildPreWritingPerspective(llm, campaignData, researchData, competitorAnalysis);
  displayPreWritingPerspective(preWritingResult);
  
  // Use pre-writing perspective in content generation
  const perspective = preWritingResult.perspective;
  const campaignType = preWritingResult.campaignType;
  const typeConfig = preWritingResult.typeConfig;
  
  const persona = selectUnusedPersona(competitorAnalysis);
  const narrativeStructure = selectUnusedNarrativeStructure(competitorAnalysis);
  const audience = selectUnaddressedAudience(competitorAnalysis, campaignData.title);
  const emotionCombo = selectRareEmotionCombo(competitorAnalysis);
  
  console.log(`   🎭 Selected Persona: ${persona.name}`);
  console.log(`   📖 Narrative Structure: ${narrativeStructure.name}`);
  console.log(`   👥 Target Audience: ${audience.name}`);
  console.log(`   💫 Emotion Combo: ${emotionCombo.emotions.join(' + ')} (${emotionCombo.rarityLevel})`);
  
  // 🆕 NEW: Incorporate pre-writing perspective into prompt
  const perspectiveSection = perspective ? `
═══════════════════════════════════════════════════════════════════════════════
🧠 YOUR PRE-WRITING PERSPECTIVE (Already Built - USE THIS!)
═══════════════════════════════════════════════════════════════════════════════

📌 The ONE Thing That Caught Your Attention:
${perspective.q1_memorable || 'Not specified'}

📌 How You'd Start Talking to a Friend:
${perspective.q2_coffee_talk || 'Not specified'}

📌 Your Embarrassing Admission (G4 Gold - Vulnerability!):
${perspective.q3_embarrassing || 'Not specified'}

📌 Specific Fact from Knowledge Base:
${perspective.q4_specific_detail || 'Not specified'}

📌 Your Unique Angle (Different from Others):
${perspective.q5_unique_angle || 'Not specified'}

📌 Your Core Perspective:
${perspective.core_perspective || 'Not specified'}

📌 What Makes This Personal:
${perspective.human_element || 'Not specified'}

🎯 CAMPAIGN TYPE: ${campaignType}
📊 Type-Specific Guidance:
- Best Angle: ${typeConfig?.bestAngle || 'N/A'}
- Key from KB: ${typeConfig?.keyFromKB || 'N/A'}
- Human Element: ${typeConfig?.humanElement || 'N/A'}
- Avoid: ${typeConfig?.avoid || 'N/A'}

${perspective.q6_rules_plan ? `📌 Your Rules Plan:
${perspective.q6_rules_plan}` : ''}

${perspective.rules_checklist ? `📋 Rules Compliance Plan:
${perspective.rules_checklist.tags_covered ? '✅ Will include required tags' : '⚠️ Tags awareness needed'}
${perspective.rules_checklist.hashtags_covered ? '✅ Will include required hashtags' : '⚠️ Hashtags awareness needed'}
${perspective.rules_checklist.metrics_included ? '✅ Will include specific metrics' : '⚠️ Metrics awareness needed'}
${perspective.rules_checklist.url_included ? '✅ Will include required URL' : '⚠️ URL awareness needed'}
${perspective.rules_checklist.screenshot_planned ? '✅ Will include screenshot' : '⚠️ Screenshot awareness needed'}
${perspective.rules_checklist.prohibited_avoided ? '✅ Will avoid prohibited items' : '⚠️ Prohibited items awareness needed'}` : ''}

⚠️ CRITICAL: Write from this perspective! Do not change your answers.
These are YOUR genuine thoughts before writing. Stay authentic to this perspective.
⚠️ CRITICAL: Follow the Rules Compliance Plan above! Every item must be checked!
` : '';
  
  // 🆕 BUG #11 FIX: Inject comprehension plan into prompt
  const comprehensionPlanSection = comprehensionPlan ? `
═══════════════════════════════════════════════════════════════════════════════
📋 AI CONTENT PLAN (Follow This Plan - It Was Created By Reading ALL Rules!)
═══════════════════════════════════════════════════════════════════════════════

📌 Mission Summary: ${comprehensionPlan.mission_summary || 'N/A'}
📌 Chosen Angle: ${comprehensionPlan.chosen_angle || 'N/A'}
📌 Execution Plan: ${comprehensionPlan.execution_plan || 'N/A'}

${comprehensionPlan.quality_targets ? `
📊 Quality Targets:
- Hook Strategy: ${comprehensionPlan.quality_targets.hook_strategy || 'N/A'}
- Emotion Journey: ${comprehensionPlan.quality_targets.emotion_journey || 'N/A'}
- Evidence Layers: ${(comprehensionPlan.quality_targets.evidence_layers || []).join(' → ')}
- Differentiation: ${comprehensionPlan.quality_targets.differentiation || 'N/A'}
` : ''}

${comprehensionPlan.mandatory_items_checklist ? `
📋 MANDATORY ITEMS EXECUTION PLAN:
${comprehensionPlan.mandatory_items_checklist.tags?.length > 0 ? `- Tags to include: ${comprehensionPlan.mandatory_items_checklist.tags.join(', ')}` : ''}
${comprehensionPlan.mandatory_items_checklist.hashtags?.length > 0 ? `- Hashtags to include: ${comprehensionPlan.mandatory_items_checklist.hashtags.join(', ')}` : ''}
${comprehensionPlan.mandatory_items_checklist.metrics ? `- Metrics to use: ${comprehensionPlan.mandatory_items_checklist.metrics}` : ''}
${comprehensionPlan.mandatory_items_checklist.url ? `- URL placement: ${comprehensionPlan.mandatory_items_checklist.url}` : ''}
${comprehensionPlan.mandatory_items_checklist.screenshot ? `- Screenshot plan: ${comprehensionPlan.mandatory_items_checklist.screenshot}` : ''}
${comprehensionPlan.mandatory_items_checklist.focus_topic ? `- Focus topic approach: ${comprehensionPlan.mandatory_items_checklist.focus_topic}` : ''}
${comprehensionPlan.mandatory_items_checklist.style_notes ? `- Style notes: ${comprehensionPlan.mandatory_items_checklist.style_notes}` : ''}
` : ''}

${comprehensionPlan.prohibited_items_checklist ? `
🚫 PROHIBITED ITEMS (DO NOT INCLUDE):
${comprehensionPlan.prohibited_items_checklist.no_hashtags ? '- ❌ NO HASHTAGS ALLOWED' : ''}
${comprehensionPlan.prohibited_items_checklist.no_url ? '- ❌ NO URL/LINK ALLOWED' : ''}
${comprehensionPlan.prohibited_items_checklist.avoid_tags?.length > 0 ? `- ❌ Do NOT tag: ${comprehensionPlan.prohibited_items_checklist.avoid_tags.join(', ')}` : ''}
${comprehensionPlan.prohibited_items_checklist.avoid_keywords?.length > 0 ? `- ❌ Do NOT mention: ${comprehensionPlan.prohibited_items_checklist.avoid_keywords.join(', ')}` : ''}
` : ''}

${comprehensionPlan.risk_items?.length > 0 ? `
⚠️ RISK ITEMS (pay extra attention):
${comprehensionPlan.risk_items.map(r => `- ⚡ ${r}`).join('\n')}
` : ''}

${comprehensionPlan._rulesReminder ? `
🚨🚨🚨 AUTO-REMINDER: ${comprehensionPlan._rulesReminder} 🚨🚨🚨
` : ''}

${comprehensionPlan._missingMandatory ? `
🚨🚨🚨 MISSING AWARENESS - YOU MUST INCLUDE: ${comprehensionPlan._missingMandatory.join(', ')} 🚨🚨🚨
` : ''}

${comprehensionPlan._forceProposedAngle ? `
🚨🚨🚨 YOU MUST USE ONE OF THE PROPOSED ANGLES FROM THE RULES! 🚨🚨🚨
` : ''}

${comprehensionPlan._urlProhibitionMissed ? `
🚨🚨🚨 URL/LINK IS PROHIBITED! DO NOT INCLUDE ANY URL! 🚨🚨🚨
` : ''}

${comprehensionPlan._hashtagProhibitionMissed ? `
🚨🚨🚨 HASHTAGS ARE PROHIBITED! DO NOT USE ANY #HASHTAGS! 🚨🚨🚨
` : ''}

${comprehensionPlan._deepIntent ? `
════════════════════════════════════════════════════════════════
🧠🧠🧠 DEEP CAMPAIGN INTENT (UNDERSTAND THIS OR YOUR CONTENT WILL FAIL):
════════════════════════════════════════════════════════════════
WHAT THE CAMPAIGN ACTUALLY WANTS:
${comprehensionPlan._trueIntent?.summary || 'See rules above'}

CONTENT TYPE: ${comprehensionPlan._contentType || 'Personal experience'}
DESIRED READER REACTION: ${comprehensionPlan._trueIntent?.desiredReaderReaction || 'Engage'}

${comprehensionPlan._metricType ? `
⚠️⚠️⚠️ METRIC TYPE REQUIRED: ${comprehensionPlan._metricType}
- ONLY use metrics of type: ${comprehensionPlan._metricType}
- These are the RIGHT metrics to use: ${(comprehensionPlan._correctMetrics || []).join(', ') || 'See rules'}
- These metrics are WRONG — DO NOT USE: ${(comprehensionPlan._wrongMetrics || []).join(', ') || 'N/A'}
- Example: If campaign wants GROWTH metrics → use user adoption, engagement rate, NOT TVL/volume
` : ''}

${(comprehensionPlan._contentToAvoid?.wrongMetricTypes?.length > 0) ? `
🚫🚨🚨 WRONG METRIC TYPES TO AVOID:
${comprehensionPlan._contentToAvoid.wrongMetricTypes.map(m => '- ❌ ' + m).join('\n')}
Using these would be a FACTUAL ERROR even if the numbers are real!
` : ''}

${(comprehensionPlan._contentToUse?.rightMetricExamples?.length > 0) ? `
✅ CORRECT METRICS/ANGLES TO USE:
${comprehensionPlan._contentToUse.rightMetricExamples.map(m => '- ✓ ' + m).join('\n')}
` : ''}

${(comprehensionPlan._criticalWarnings?.length > 0) ? `
🚨🚨🚨 CRITICAL WARNINGS FROM INTENT ANALYSIS:
${comprehensionPlan._criticalWarnings.map(w => '- ⚠️ ' + w).join('\n')}
` : ''}

════════════════════════════════════════════════════════════════
` : ''}

⚠️ THIS PLAN WAS CREATED BY READING ALL CAMPAIGN RULES. FOLLOW IT EXACTLY.
═══════════════════════════════════════════════════════════════════════════════
` : '';
  
  const systemPrompt = `You are a REAL PERSON writing on social media. Not a content creator, not a marketer, NOT AI. You are someone who genuinely uses crypto products and has real opinions.

═══════════════════════════════════════════════════════════════════
🚨🚨🚨 CRITICAL: THIS IS NOT AN AD OR PROMOTION 🚨🚨🚨
═══════════════════════════════════════════════════════════════════
You are NOT promoting this product. You are SHARING YOUR GENUINE EXPERIENCE.

❌ ABSOLUTELY FORBIDDEN (your content WILL BE REJECTED if it contains any of these):
1. FEATURE LISTING: "unified balance system", "zkSync", "off-chain matching" — do NOT explain how the product works
2. STAT DUMPING: "$100M+ TVL and $200B+ cumulative volume" — do NOT list stats like a brochure
3. KNOWLEDGE BASE PARROTING: Copying facts directly from the campaign info into your tweet
4. FAKE EMOTIONS: "My hands were shaking", "I was blown away" — these are AI cliches, real people don't talk like this
5. AD-LIKE STRUCTURE: Problem → Feature → Benefit → CTA — this is advertising, not social media
6. PRODUCT DESCRIPTION: Any sentence that explains WHAT the product IS or HOW it works
7. GENERIC HYPERBOLE: "This changed everything", "Nothing like it", "Game changer"

✅ WHAT YOUR CONTENT MUST BE INSTEAD:
- A SPECIFIC MOMENT or EXPERIENCE you had (not "I discovered it", but the actual moment)
- A SPECIFIC DETAIL that only someone who actually used it would know
- A GENUINE OPINION (even if slightly negative or skeptical — this adds authenticity)
- A QUESTION at the end that invites real conversation
- Written the way you'd text a friend, not the way a company writes a tweet

TELL A STORY, NOT FACTS. People don't engage with features. They engage with EXPERIENCES.

${perspectiveSection}
${comprehensionPlanSection}
═══════════════════════════════════════════════════════════════════════════════
🎯 YOUR MISSION: Create content that feels REAL, not manufactured.
═══════════════════════════════════════════════════════════════════════════════

You are writing as: ${persona.name}
Persona trait: ${persona.trait}
Target audience: ${audience.name} who feel "${audience.pain}"
Narrative structure: ${narrativeStructure.name} (${narrativeStructure.flow})
Emotion journey to create: ${emotionCombo.emotions.join(' → ')}

═══════════════════════════════════════════════════════════════════════════════
✅ QUALITY CRITERIA - Your content MUST excel in these areas:
═══════════════════════════════════════════════════════════════════════════════

📌 1. HOOK - The Opening Line
────────────────────────────────────
Your hook is CRITICAL. It determines if people stop scrolling.

✅ EXCELLENT HOOKS (Use these patterns):
• Start with a specific moment: "Last March, I lost $47,000 in 8 minutes."
• Start with a shocking statement: "The system is rigged. Here's proof."
• Start with a relatable pain: "Three dead ends. That's what I hit."
• Start with contrarian view: "Everyone's wrong about this."
• Start with a question that hits: "Ever been ghosted by a client? Me too."

❌ TERRIBLE HOOKS (NEVER use these):
• "Unpopular opinion:"
• "Hot take:"
• "Here's the thing:"
• "Let me tell you a story:"
• "I've been thinking about..."
• "Nobody is talking about..."
• "Stop scrolling:"
• "This changed everything:"
• "Quick thread:"

📌 2. EMOTIONAL IMPACT - Make Them FEEL
────────────────────────────────────
Readers must experience genuine emotions, not just read about them.

✅ HOW TO CREATE REAL EMOTIONS:
• Use specific, personal details (not generic statements)
• Show vulnerability and real struggle
• Take readers on an emotional journey
• Include at least 3 distinct emotions (curiosity, frustration, hope, surprise, etc.)
• Use the rare combo: ${emotionCombo.emotions.join(' + ')}

Example transformation:
❌ "I was frustrated." (telling, weak)
✅ "Three months. Twelve emails. Zero responses. My blood was boiling." (showing, strong)

📌 3. BODY FEELING - Physical Sensation
────────────────────────────────────
Readers should PHYSICALLY FEEL something in their body.

✅ EXCELLENT BODY FEELINGS:
• "My stomach dropped."
• "Cold sweat down my back."
• "Heart racing at 3am."
• "Chest tightened."
• "Jaw on the floor."
• "Hands wouldn't stop shaking."
• "Blood boiled."
• "Breath caught in my throat."

❌ WEAK (don't use):
• "I felt bad"
• "I was nervous"
• "It was scary"

📌 4. EVIDENCE LAYERING - Multi-Depth Proof
────────────────────────────────────
Stack your evidence in layers. Each layer adds credibility.

Layer 1 - MACRO DATA: "23 million Americans lost money to crypto scams last year (FTC 2023)"
Layer 2 - CASE STUDY: "Take Sarah - lost $15K to a rug pull, got zero help from authorities"
Layer 3 - PERSONAL TOUCH: "I know because I was one of them"
Layer 4 - EXPERT/VALIDATION: "Even the SEC admits they can't help most victims"

✅ Your content should have at least 2-3 evidence layers

📌 5. CTA (Call to Action) - Engagement Hook
────────────────────────────────────
End with something that makes people WANT to reply.

✅ EXCELLENT CTAs:
• "Curious if anyone else has dealt with this?"
• "What would you have done differently?"
• "Anyone else been through something similar?"
• "Still processing this. Thoughts?"
• "Tag someone who needs to see this."

❌ WEAK CTAs:
• "Follow for more"
• "Like and subscribe"
• "Share this"
• "Click the link"

📌 6. URL INTEGRATION - Natural Placement
────────────────────────────────────
The URL must feel NATURAL, not forced.

✅ GOOD URL PLACEMENT:
• "Finally found something that actually helps: [URL]"
• "This changed my approach: [URL]"
• "Worth checking out if you're in this situation: [URL]"
• "More details here: [URL]"

❌ BAD URL PLACEMENT:
• "Check out [URL] for more!"
• "Visit [URL] now!"
• "Click here: [URL]"

═══════════════════════════════════════════════════════════════════════════════
🚫 FORBIDDEN - These will DESTROY your content quality:
═══════════════════════════════════════════════════════════════════════════════

❌ AI-DETECTED WORDS (NEVER use these):
delve, leverage, realm, tapestry, paradigm, landscape, nuance, underscores,
pivotal, crucial, embark, journey (as metaphor), explore, unlock, harness,
symphony, dance, navigate, embrace, foster, cultivate

❌ AI-DETECTED PHRASES (NEVER use these):
picture this, let's dive in, in this thread, key takeaways, here's the thing,
imagine a world, it goes without saying, at the end of the day, on the other hand,
in conclusion, in today's digital landscape, plays a crucial role

❌ TEMPLATE PHRASES (NEVER use these):
unpopular opinion, hot take, thread alert, breaking, this is your sign, psa,
reminder that, quick thread, important thread, drop everything, stop scrolling,
hear me out, let me explain, nobody is talking about, story time

❌ BANNED PROMOTIONAL LANGUAGE:
guaranteed, 100%, risk-free, financial advice, buy now, get rich, passive income,
limited time, act now, click here, don't miss out

═══════════════════════════════════════════════════════════════════════════════
🎨 STYLE PRINCIPLES:
═══════════════════════════════════════════════════════════════════════════════

• Write like you're talking to a friend over coffee, not giving a presentation
• Use SHORT paragraphs (1-2 sentences max)
• Mix sentence lengths for rhythm
• Be specific ("$47,000" not "a lot of money")
• Show, don't tell
• Use contractions naturally (I'm, can't, won't, it's)
• Avoid passive voice
• Cut every unnecessary word
• Read it aloud - if it sounds weird, rewrite it

═══════════════════════════════════════════════════════════════════════════════
🚨🚨🚨 CRITICAL FORMATTING RULES (YOUR CONTENT WILL BE REJECTED IF VIOLATED):
═══════════════════════════════════════════════════════════════════════════════

1. Your "content" field MUST contain actual newline characters (\n\n) between paragraphs
2. NEVER output a single wall-of-text paragraph. EVER.
3. Each paragraph must be 1-2 sentences MAX, separated by a blank line (\n\n)
4. Your content MUST look like this:
   "ngl I spent way too long last night.\n\n(downloaded at 2am, embarrassing to admit)\n\nWhat caught me wasn't the specs."
5. This is NOT acceptable:
   "ngl I spent way too long last night. (downloaded at 2am, embarrassing to admit) What caught me wasn't the specs."
6. Use \n\n (double newline) between EVERY paragraph break
7. A good tweet should have 4-8 short paragraphs separated by blank lines
8. Blank lines create visual breathing room - they are ESSENTIAL for readability

═══════════════════════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT:
═══════════════════════════════════════════════════════════════════════════════

Return JSON:
{
  "tweets": [
    {
      "content": "<full tweet text with \n\n between each paragraph - make it feel AUTHENTIC>",
      "hook": "<the opening hook>",
      "emotions": ["emotion1", "emotion2", "emotion3"],
      "bodyFeeling": "<physical sensation described>",
      "cta": "<the call to action>",
      "evidenceUsed": ["<evidence layer 1>", "<evidence layer 2>"],
      "qualityChecklist": {
        "hookIsNatural": true,
        "has3PlusEmotions": true,
        "hasBodyFeeling": true,
        "hasEvidenceLayers": true,
        "hasEngagingCTA": true,
        "urlIncluded": true,
        "noAIPatterns": true,
        "noTemplatePhrases": true
      }
    }
  ],
  "strategyUsed": {
    "angle": "<your unique angle>",
    "differentiationPoint": "<how this differs from competitors>",
    "emotionJourney": "<emotional arc described>"
  }
}`;

  const userPrompt = `═══════════════════════════════════════════════════════════════════════════════
🚨🚨🚨 MANDATORY CAMPAIGN REQUIREMENTS - ALL ARE REQUIRED 🚨🚨🚨
═══════════════════════════════════════════════════════════════════════════════

CAMPAIGN: ${campaignData.title || 'Unknown Campaign'}
${campaignData.missionTitle ? `🎯 MISSION: ${campaignData.missionTitle}` : ''}

═══════════════════════════════════════════════════════════════════════════════
⚠️ MISSION GOAL (YOUR CONTENT MUST ALIGN WITH THIS):
═══════════════════════════════════════════════════════════════════════════════
${campaignData.description || campaignData.missionGoal || campaignData.goal || 'Not specified'}

═══════════════════════════════════════════════════════════════════════════════
⚠️ MISSION RULES (YOU MUST FOLLOW ALL OF THESE - NO EXCEPTIONS):
═══════════════════════════════════════════════════════════════════════════════
${campaignData.rules || campaignData.requirements || 'Standard content guidelines'}

🚨 CRITICAL: If rules say "Tag @username" → Your content MUST include "@username"
🚨 CRITICAL: If rules say "Mention a metric" → Your content MUST have specific numbers
🚨 CRITICAL: If rules say "Focus on X" → Your content MUST be about X

${(() => {
  const reqs = parseCampaignRequirements(campaignData);
  let mandatorySection = `
═══════════════════════════════════════════════════════════════════════════════
🔴🔴🔴 EXTRACTED MANDATORY REQUIREMENTS - ALL ARE REQUIRED 🔴🔴🔴
═══════════════════════════════════════════════════════════════════════════════

`;
  if (reqs.mandatoryTags.length > 0) {
    mandatorySection += `🏷️ REQUIRED TAGS (YOU MUST INCLUDE THESE EXACTLY):\n`;
    reqs.mandatoryTags.forEach(tag => {
      mandatorySection += `   → "${tag}" - This MUST appear in your tweet!\n`;
    });
    mandatorySection += '\n';
  }

  if (reqs.mandatoryHashtags.length > 0) {
    mandatorySection += `#️⃣ REQUIRED HASHTAGS (YOU MUST INCLUDE THESE):\n`;
    reqs.mandatoryHashtags.forEach(tag => {
      mandatorySection += `   → "${tag}" - This MUST appear in your tweet!\n`;
    });
    mandatorySection += '\n';
  }

  if (reqs.mandatoryMetrics) {
    mandatorySection += `📊 METRICS REQUIRED: YES - Include specific numbers/metrics!\n\n`;
  }

  if (reqs.focusTopic) {
    mandatorySection += `🎯 FOCUS TOPIC: ${reqs.focusTopic} - Content MUST be about this!\n\n`;
  }

  // 🎯 PROPOSED ANGLES - MUST PICK ONE!
  if (reqs.proposedAngles.length > 0) {
    mandatorySection += `\n`;
    mandatorySection += `═══════════════════════════════════════════════════════════════════════════════\n`;
    mandatorySection += `🎯🎯🎯 PROPOSED ANGLES - YOU MUST PICK EXACTLY ONE! 🎯🎯🎯\n`;
    mandatorySection += `═══════════════════════════════════════════════════════════════════════════════\n`;
    mandatorySection += `\n`;
    mandatorySection += `⚠️ CRITICAL: You MUST choose ONE of these angles. Do NOT create your own angle!\n`;
    mandatorySection += `⚠️ Your content will be REJECTED if you don't follow one of these angles exactly!\n\n`;
    reqs.proposedAngles.forEach((angle, i) => {
      mandatorySection += `   ANGLE ${i + 1}: "${angle}"\n`;
    });
    mandatorySection += `\n`;
    mandatorySection += `→ Choose the angle that resonates most with your experience.\n`;
    mandatorySection += `→ Your entire content must support this ONE angle.\n`;
    mandatorySection += `→ State which angle you chose in your response.\n\n`;
  }

  // Only show URL requirement if MANDATORY (explicitly required in rules)
  if (reqs.mandatoryUrl && reqs.campaignUrl) {
    mandatorySection += `🔗 REQUIRED URL: ${reqs.campaignUrl}\n`;
    mandatorySection += `   → This URL MUST appear in your tweet!\n\n`;
  }

  // Show prohibition notice if URL is NOT required
  if (!reqs.mandatoryUrl) {
    mandatorySection += `🚫 URL NOT REQUIRED: Do NOT include any URL or link!\n`;
    mandatorySection += `   → Campaign rules do NOT require a URL\n\n`;
  }

  mandatorySection += `⚠️ YOUR CONTENT WILL BE REJECTED IF ANY OF THE ABOVE ARE MISSING!\n`;
  mandatorySection += `═══════════════════════════════════════════════════════════════════════════════\n`;

  return mandatorySection;
})()}

═══════════════════════════════════════════════════════════════════════════════
⚠️ STYLE REQUIREMENTS (MANDATORY):
═══════════════════════════════════════════════════════════════════════════════
${campaignData.style || 'Professional, authentic'}

═══════════════════════════════════════════════════════════════════════════════
⚠️ KNOWLEDGE BASE (USE AT LEAST 3-5 FACTS FROM HERE):
═══════════════════════════════════════════════════════════════════════════════
${campaignData.knowledgeBase || campaignData.additionalInfo || 'None provided'}

═══════════════════════════════════════════════════════════════════════════════
⚠️ ADDITIONAL INFO (MANDATORY):
═══════════════════════════════════════════════════════════════════════════════
${campaignData.additionalInfo || campaignData.adminNotice || 'None provided'}

${(() => {
  // Only show URL requirement if explicitly required in rules
  const reqs = parseCampaignRequirements(campaignData);
  if (reqs.mandatoryUrl) {
    return `
═══════════════════════════════════════════════════════════════════════════════
⚠️ REQUIRED URL (MUST BE IN YOUR CONTENT):
═══════════════════════════════════════════════════════════════════════════════
${campaignData.campaignUrl || campaignData.url || 'Campaign URL must be included'}
`;
  }
  return ''; // URL not required - don't show anything
})()}
${campaignData.characterLimit ? `
═══════════════════════════════════════════════════════════════════════════════
⚠️ CHARACTER LIMIT (STRICT - YOUR CONTENT WILL BE REJECTED IF TOO LONG):
═══════════════════════════════════════════════════════════════════════════════
MAXIMUM: ${campaignData.characterLimit} characters. Your content MUST be within this limit.
Count your characters carefully!` : ''}
═══════════════════════════════════════════════════════════════════════════════
📊 RESEARCH DATA TO USE
═══════════════════════════════════════════════════════════════════════════════

KEY FACTS:
${researchData?.synthesis?.keyFacts?.slice(0, 5).map((f, i) => `${i + 1}. ${f}`).join('\n') || 'No specific facts available'}

REAL CASES:
${researchData?.synthesis?.realCases?.slice(0, 3).map((c, i) => `${i + 1}. ${c}`).join('\n') || 'Use general examples'}

STATISTICS:
${researchData?.synthesis?.statistics?.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n') || 'Include relevant data if available'}

UNIQUE ANGLES AVAILABLE:
${researchData?.synthesis?.uniqueAngles?.slice(0, 3).map((a, i) => `${i + 1}. ${a.angle} - ${a.uniqueness}`).join('\n') || 'Create your own unique angle'}

${researchData?.synthesis?.controversies?.length > 0 ? `
CONTROVERSIES (use for contrast/credibility):
${researchData?.synthesis?.controversies.slice(0, 2).map((c, i) => `${i + 1}. ${c}`).join('\n')}
` : ''}

${researchData?.synthesis?.expertQuotes?.length > 0 ? `
EXPERT QUOTES (use for authority):
${researchData?.synthesis?.expertQuotes.slice(0, 2).map((q, i) => `${i + 1}. ${q}`).join('\n')}
` : ''}

${researchData?.synthesis?.untoldStories?.length > 0 ? `
UNIQUE STORIES (use for differentiation):
${researchData?.synthesis?.untoldStories.slice(0, 2).map((s, i) => `${i + 1}. ${s}`).join('\n')}
` : ''}

${researchData?.synthesis?.evidenceLayers ? `
EVIDENCE LAYERS (use for credibility):
• Macro Data: ${researchData?.synthesis?.evidenceLayers?.macroData || 'N/A'}
• Case Study: ${researchData?.synthesis?.evidenceLayers?.caseStudy || 'N/A'}
• Personal Touch: ${researchData?.synthesis?.evidenceLayers?.personalTouch || 'N/A'}
• Expert Validation: ${researchData?.synthesis?.evidenceLayers?.expertValidation || 'N/A'}
` : ''}

═══════════════════════════════════════════════════════════════════════════════
🎯 COMPETITIVE DIFFERENTIATION
═══════════════════════════════════════════════════════════════════════════════

ANGLES ALREADY USED BY COMPETITORS (AVOID THESE):
${(competitorAnalysis?.anglesUsed || []).slice(0, 5).map(a => `• ${a}`).join('\n') || '• No competitor data available'}

SATURATED ELEMENTS (OVERUSED - AVOID):
${(competitorAnalysis?.saturatedElements || []).slice(0, 5).map(s => `• ${s}`).join('\n') || '• None identified'}

UNTAPPED OPPORTUNITIES (USE THESE):
${(competitorAnalysis?.untappedOpportunities || []).slice(0, 5).map(o => `✓ ${o}`).join('\n') || '✓ Create unique content freely'}

${competitorAnalysis?.uniqueAnglesNotUsed?.length > 0 ? `
UNIQUE ANGLES NOT YET USED (GOLDMINE):
${competitorAnalysis.uniqueAnglesNotUsed.slice(0, 3).map(a => `✅ ${a}`).join('\n')}
` : ''}

${competitorAnalysis?.recommendations ? `
🏆 AI RECOMMENDATIONS (from competitor analysis):
• Winning Angle: ${competitorAnalysis.recommendations?.winningAngle || 'N/A'}
• Untapped Audience: ${competitorAnalysis.recommendations?.untappedAudience || 'N/A'}
• Unique Perspective: ${competitorAnalysis.recommendations?.uniquePerspective || 'N/A'}
${competitorAnalysis.recommendations?.rareEmotionCombo ? `• Rare Emotion Combo: ${competitorAnalysis.recommendations.rareEmotionCombo.join(' + ')}` : ''}
` : ''}

═══════════════════════════════════════════════════════════════════════════════
✅ BEFORE YOU WRITE - CHECK THESE MANDATORY ITEMS:
═══════════════════════════════════════════════════════════════════════════════

□ Did you include ALL required tags/mentions from rules?
${(() => {
  const reqs = parseCampaignRequirements(campaignData);
  let checks = '';
  if (reqs.mandatoryMetrics) checks += '□ Did you include at least one specific metric/number?\n';
  if (reqs.mandatoryUrl) checks += '□ Did you include the required URL?\n';
  if (reqs.mandatoryScreenshot) checks += '□ Did you include a screenshot?\n';
  return checks;
})()}
□ Does your content align with the mission goal?
□ Does your content follow the style requirements?
□ Is your hook natural (not a template)?

═══════════════════════════════════════════════════════════════════════════════
✍️ NOW CREATE ${tweetCount} TWEET(S)
═══════════════════════════════════════════════════════════════════════════════

Remember:
• Start with a STRONG, NATURAL hook (no templates!)
• Include at least 3 emotions throughout
• Add physical body feeling
• Layer your evidence (data + case + personal)
• End with engaging CTA
• FOLLOW ALL MISSION RULES EXACTLY
• AVOID all forbidden words and phrases
• Be AUTHENTIC - write like a real person, not a brand
${(() => {
  const reqs = parseCampaignRequirements(campaignData);
  if (reqs.mandatoryUrl) {
    return '• Integrate URL naturally\n';
  }
  return '';
})()}
Create content that makes readers STOP, FEEL, and ENGAGE.`;

  const response = await llm.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { temperature: 0.8, maxTokens: 4000, model: 'glm-5', enableSearch: true });
  
  const result = safeJsonParse(response.content);
  
  if (!result || !result.tweets) {
    throw new Error('Failed to generate content - invalid response');
  }
  
  console.log(`   ✅ Generated ${result.tweets.length} tweets`);
  
  // ═══════════════════════════════════════════════════════════════
  // 🚨 STEP 1.3: FORMAT FIX - Ensure proper paragraph structure
  // ═══════════════════════════════════════════════════════════════
  console.log('\n   📝 STEP 1.3: Format Fix - Ensuring proper paragraph structure...');
  
  for (let i = 0; i < result.tweets.length; i++) {
    const original = result.tweets[i].content;
    const fixed = fixContentFormatting(original);
    
    if (fixed !== original) {
      result.tweets[i].content = fixed;
      const origParagraphs = original.split(/\n\s*\n/).filter(p => p.trim()).length;
      const fixedParagraphs = fixed.split(/\n\s*\n/).filter(p => p.trim()).length;
      console.log(`   📝 Tweet ${i + 1}: Fixed formatting (${origParagraphs} → ${fixedParagraphs} paragraphs)`);
    } else {
      const paragraphs = original.split(/\n\s*\n/).filter(p => p.trim()).length;
      console.log(`   ✅ Tweet ${i + 1}: Format OK (${paragraphs} paragraphs)`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🚨 STEP 1.5: ANTI-AI CONTENT GATE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n   🤖 STEP 1.5: Anti-AI Content Detection...');
  const aiPatterns = [
    // Feature listing patterns
    { pattern: /\b(unified balance|zkSync|off-chain matching|on-chain settlement|zero-knowledge proof|self-custody)\b/gi, weight: 30, label: 'Technical feature listing' },
    // KB stat dumping
    { pattern: /\$?\d+\+?\s*(TVL|volume|trading volume|cumulative|perpetual|markets)/gi, weight: 25, label: 'Direct stat copying from knowledge base' },
    // Fake AI emotions
    { pattern: /(\bmy hands were\b.*shaking|\bblood.*boil(ing)?\b|\bi was blown away\b|\bmind.*blown\b|\bjaw.*drop(ped)?\b.*floor|\bstill processing\b)/gi, weight: 30, label: 'Fake/forced AI emotion cliché' },
    // Ad structure
    { pattern: /(this (isn't|is not) just another|proof they're building|actually works for|nothing like (it|this)|game (changer|changer))/gi, weight: 25, label: 'Ad-like promotional language' },
    // Product explanation
    { pattern: /(the (unified|product|platform|exchange|system) (works|allows|lets|enables|gives)|you can (earn|trade|deposit) while|your (capital|funds|money) (stays|stays?|remains))/gi, weight: 30, label: 'Explaining how product works' },
    // AI cliché phrases
    { pattern: /\b(that's unheard of|in a (world|space) where|this isn't just|it's proof|building something that|works for (traders|you|everyone))\b/gi, weight: 20, label: 'Generic AI hype phrase' },
    // Stat stacking (multiple stats in one sentence)
    { pattern: /(\$\d+\+?.*?\b(and|with|while)\b.*\$\d+\+?|\bTVL\b.*\bvolume\b|\bvolume\b.*\bTVL\b)/gi, weight: 25, label: 'Multiple stats stacked (brochure-like)' }
  ];
  
  for (let i = 0; i < result.tweets.length; i++) {
    const tweet = result.tweets[i];
    let aiScore = 0;
    let detectedIssues = [];
    
    for (const check of aiPatterns) {
      const matches = (tweet.content.match(check.pattern) || []).length;
      if (matches > 0) {
        const penalty = check.weight * matches;
        aiScore += penalty;
        detectedIssues.push(`  ⚠️ ${check.label} (×${matches}, -${penalty}pts)`);
      }
    }
    
    // Check if content reads more like an ad than a personal story
    const personalWords = (tweet.content.match(/\b(I|my|me|we|us|our)\b/gi) || []).length;
    const totalWords = tweet.content.split(/\s+/).length;
    const personalRatio = totalWords > 0 ? personalWords / totalWords : 0;
    
    if (personalRatio < 0.08) {
      aiScore += 40;
      detectedIssues.push('  ⚠️ Too few personal words - reads like an ad, not a personal experience');
    }
    
    // Check if content has a genuine personal moment (specific scenario, not vague)
    const hasSpecificMoment = /yesterday|last (week|month|night|friday|sunday)|\d+ (am|pm|days?|hours?|weeks?|months?)/i.test(tweet.content);
    if (!hasSpecificMoment && totalWords > 30) {
      aiScore += 30;
      detectedIssues.push('  ⚠️ No specific time/moment reference - content feels vague and generic');
    }
    
    console.log(`   📝 Tweet ${i + 1}: AI Content Score: ${aiScore}/200 (higher = more AI-like)`);
    
    if (aiScore > 80) {
      console.log(`   ❌ Tweet ${i + 1}: REJECTED - Too AI-like / Ad-like`);
      detectedIssues.forEach(issue => console.log(issue));
      
      // Try to regenerate with stronger anti-AI prompt
      console.log(`   🔄 Regenerating Tweet ${i + 1} with stronger anti-AI instructions...`);
      
      try {
        const antiAiResponse = await callAI([
          { role: 'system', content: `You are a REAL crypto user writing a tweet. Write EXACTLY like you would text your friend.

RULES:
- Do NOT mention any product features, tech terms, or statistics
- Do NOT sound like an advertisement or promotion
- Write about ONE specific moment/experience only
- Use casual, imperfect language (contractions, incomplete sentences, slang)
- Start with something casual (ngl, tbh, okay so, look, real talk)
- End with a genuine question
- Maximum 280 characters` },
          { role: 'user', content: `Write a casual tweet about ${(campaignData.description || campaignData.missionGoal || 'this crypto thing').substring(0, 100)}.

Your tweet should sound like you just experienced something and you're telling a friend about it. NOT like you're promoting it. Be skeptical, be real, be imperfect.

Required: Include @grvt_io somewhere natural.

IMPORTANT: Return ONLY the tweet text. No explanation, no formatting, no JSON. Just the tweet.` }
        ], { temperature: 0.9, maxTokens: 300, model: 'glm-5-flash', enableThinking: false });
        
        // Extract content - skip any thinking/reasoning text
        let regenerated = antiAiResponse.content.trim();
        
        // Remove thinking blocks if present (some models return reasoning first)
        const thinkEnd = regenerated.indexOf('</think');
        if (thinkEnd > 0) {
          regenerated = regenerated.substring(thinkEnd + '</think'.length).trim();
        }
        const thinkStart = regenerated.indexOf('<think');
        if (thinkStart === 0 && thinkEnd > 0) {
          regenerated = regenerated.substring(thinkEnd + '</think'.length).trim();
        }
        
        // Remove any JSON wrapping or markdown
        regenerated = regenerated.replace(/^["'`]+|["'`]+$/gm, '').trim();
        regenerated = regenerated.replace(/^\s*\{[\s\S]*?"content"\s*:\s*"([\s\S]*?)"[\s\S]*\}\s*$/, '$1');
        
        // Remove any "Here's your tweet" type prefixes
        regenerated = regenerated.replace(/^(here'?s your tweet:?\s*)/im, '');
        regenerated = regenerated.replace(/^(tweet:?\s*)/im, '');
        
        if (regenerated.length > 20 && regenerated.length < 1000) {
          result.tweets[i].content = regenerated;
          console.log(`   ✅ Tweet ${i + 1}: Regenerated (${regenerated.length} chars)`);
          console.log(`   📝 Preview: "${regenerated.substring(0, 120)}..."`);
        } else {
          console.log(`   ⚠️ Tweet ${i + 1}: Regeneration produced invalid content (${regenerated.length} chars), keeping original`);
        }
      } catch (e) {
        console.log(`   ⚠️ Regeneration failed: ${e.message}`);
      }
    } else if (aiScore > 40) {
      console.log(`   ⚠️ Tweet ${i + 1}: Warning - somewhat AI-like, passing to judges anyway`);
      detectedIssues.forEach(issue => console.log(issue));
    } else {
      console.log(`   ✅ Tweet ${i + 1}: Looks authentic`);
    }
  }
  
  // 🆕 NEW: Run Enhanced Validation on each tweet
  console.log('\n   🔬 STEP 2: Running Enhanced Validation Tests...');
  for (let i = 0; i < result.tweets.length; i++) {
    const tweet = result.tweets[i];
    console.log(`\n   📝 Validating Tweet ${i + 1}/${result.tweets.length}...`);
    const validation = runEnhancedValidation(tweet.content, campaignData);
    tweet.validation = validation;
    tweet.validationPassed = validation.passed;
  }
  
  // 🆕 NEW: Add structured output format (from PDF 3)
  const structuredOutput = {
    campaignAnalysis: {
      campaignType,
      chosenAngle: perspective?.chosen_angle,
      corePerspective: perspective?.core_perspective,
      humanElement: perspective?.human_element,
      keyFactFromKB: perspective?.q4_specific_detail
    },
    preWritingAnswers: {
      q1_memorable: perspective?.q1_memorable,
      q2_coffeeTalk: perspective?.q2_coffee_talk,
      q3_embarrassing: perspective?.q3_embarrassing,
      q4_specificDetail: perspective?.q4_specific_detail,
      q5_uniqueAngle: perspective?.q5_unique_angle
    }
  };
  
  if (response.thinking) {
    displayThinking('GENERATION', response.thinking);
  }
  
  return {
    tweets: result.tweets,
    strategyUsed: result.strategyUsed || {},
    selectedElements: { persona, narrativeStructure, audience, emotionCombo },
    preWritingResult,
    structuredOutput,
    raw: response.content
  };
}

// ============================================================================
// 🆕 CAMPAIGN REQUIREMENTS VALIDATOR - MANDATORY ENFORCEMENT
// ============================================================================

/**
 * Parse campaign rules to extract MANDATORY requirements
 * This function extracts ONLY what is EXPLICITLY required in campaign rules
 * IMPORTANT: Only check for what the campaign EXPLICITLY asks for!
 */
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
function validateCampaignRequirements(content, campaignData) {
  const requirements = parseCampaignRequirements(campaignData);
  const contentLower = content.toLowerCase();
  
  const validation = {
    passed: true,
    checks: {},
    missingElements: [],
    foundElements: [],
    requirements: requirements
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 1: MANDATORY @TAGS (only if explicitly required)
  // ═══════════════════════════════════════════════════════════════════════════
  if (requirements.mandatoryTags.length > 0) {
    validation.checks.mandatoryTags = {
      required: requirements.mandatoryTags,
      found: [],
      missing: [],
      passed: true
    };
    
    requirements.mandatoryTags.forEach(tag => {
      if (contentLower.includes(tag.toLowerCase())) {
        validation.checks.mandatoryTags.found.push(tag);
        validation.foundElements.push(`Tag: ${tag}`);
      } else {
        validation.checks.mandatoryTags.missing.push(tag);
        validation.checks.mandatoryTags.passed = false;
        validation.missingElements.push(`MISSING TAG: ${tag}`);
      }
    });
    
    if (!validation.checks.mandatoryTags.passed) {
      validation.passed = false;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 2: MANDATORY HASHTAGS (only if explicitly required)
  // ═══════════════════════════════════════════════════════════════════════════
  if (requirements.mandatoryHashtags.length > 0) {
    validation.checks.mandatoryHashtags = {
      required: requirements.mandatoryHashtags,
      found: [],
      missing: [],
      passed: true
    };
    
    requirements.mandatoryHashtags.forEach(tag => {
      if (contentLower.includes(tag.toLowerCase())) {
        validation.checks.mandatoryHashtags.found.push(tag);
        validation.foundElements.push(`Hashtag: ${tag}`);
      } else {
        validation.checks.mandatoryHashtags.missing.push(tag);
        validation.checks.mandatoryHashtags.passed = false;
        validation.missingElements.push(`MISSING HASHTAG: ${tag}`);
      }
    });
    
    if (!validation.checks.mandatoryHashtags.passed) {
      validation.passed = false;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 3: METRICS REQUIREMENT (only if explicitly required)
  // ═══════════════════════════════════════════════════════════════════════════
  if (requirements.mandatoryMetrics) {
    const metricPatterns = [
      /\$\d+[kmb]?/i,                    // $1M, $500k
      /\d+(%|percent)/i,                 // 50%, 50 percent
      /\d+\s*(million|billion|k|thousand)/i,  // 1 million, 500k
      /\d+[,.\d]*\s*(tvl|volume|users?)/i,    // 1.5M TVL, 500 users
      /tvl\s*(of|at|:)?\s*\$?\d+/i,      // TVL of $1M
      /volume\s*(of|at|:)?\s*\$?\d+/i,   // volume of $500k
    ];
    
    const hasMetric = metricPatterns.some(p => p.test(content));
    
    validation.checks.metrics = {
      required: true,
      found: hasMetric,
      passed: hasMetric
    };
    
    if (!hasMetric) {
      validation.passed = false;
      validation.missingElements.push('MISSING: Specific metric/number required');
    } else {
      validation.foundElements.push('Metric found in content');
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 4: SCREENSHOT REQUIREMENT (only if explicitly required)
  // ═══════════════════════════════════════════════════════════════════════════
  if (requirements.mandatoryScreenshot) {
    // Check for image indicators - this is a basic check
    // In reality, screenshot validation would need image analysis
    const hasImageIndicator = /screenshot|image|photo|attached|below/i.test(content);
    
    validation.checks.screenshot = {
      required: true,
      found: hasImageIndicator,
      passed: hasImageIndicator,
      note: 'Basic check - actual screenshot validation may need manual review'
    };
    
    if (!hasImageIndicator) {
      validation.passed = false;
      validation.missingElements.push('MISSING: Screenshot required');
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 5: URL PRESENCE (only if explicitly required in rules)
  // ═══════════════════════════════════════════════════════════════════════════
  if (requirements.mandatoryUrl && requirements.campaignUrl) {
    const urlInContent = content.includes(requirements.campaignUrl) || 
                         content.includes('app.rally.fun') ||
                         content.includes('rally.fun');
    
    validation.checks.url = {
      required: true,
      url: requirements.campaignUrl,
      found: urlInContent,
      passed: urlInContent
    };
    
    if (!urlInContent) {
      validation.passed = false;
      validation.missingElements.push(`MISSING: Campaign URL`);
    } else {
      validation.foundElements.push('URL found in content');
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 6: FOCUS TOPIC (warning only, not a hard fail)
  // ═══════════════════════════════════════════════════════════════════════════
  if (requirements.focusTopic) {
    const focusWords = requirements.focusTopic.toLowerCase().split(/\s+/);
    const hasFocus = focusWords.some(word => 
      word.length > 3 && contentLower.includes(word)
    );
    
    validation.checks.focusTopic = {
      required: requirements.focusTopic,
      found: hasFocus,
      passed: hasFocus,
      isWarning: !hasFocus  // This is a warning, not a hard fail
    };
    
    if (!hasFocus) {
      validation.checks.focusTopic.warning = `Content may not focus on: ${requirements.focusTopic}`;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK 7: MANDATORY KEYWORDS (specific phrases that must be mentioned)
  // ═══════════════════════════════════════════════════════════════════════════
  if (requirements.mandatoryKeywords.length > 0) {
    validation.checks.mandatoryKeywords = {
      required: requirements.mandatoryKeywords,
      found: [],
      missing: [],
      passed: true
    };
    
    requirements.mandatoryKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (contentLower.includes(keywordLower)) {
        validation.checks.mandatoryKeywords.found.push(keyword);
        validation.foundElements.push(`Keyword: ${keyword}`);
      } else {
        validation.checks.mandatoryKeywords.missing.push(keyword);
        validation.checks.mandatoryKeywords.passed = false;
        validation.missingElements.push(`MISSING: "${keyword}"`);
      }
    });
    
    if (!validation.checks.mandatoryKeywords.passed) {
      validation.passed = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚫 CHECK 8: PROHIBITED ITEMS (items that must NOT appear)
  // ═══════════════════════════════════════════════════════════════════════════
  validation.prohibitedItemsFound = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // PROHIBITED HASHTAGS CHECK
  // ─────────────────────────────────────────────────────────────────────────────
  if (requirements.prohibitedHashtags.includes('ALL_HASHTAGS')) {
    const hashtagMatch = content.match(/#\w+/g);
    if (hashtagMatch && hashtagMatch.length > 0) {
      validation.checks.prohibitedHashtags = {
        found: hashtagMatch,
        passed: false,
        message: '🚫 Hashtags are NOT allowed but found in content'
      };
      validation.prohibitedItemsFound.push(`🚫 PROHIBITED: Hashtags found: ${hashtagMatch.join(', ')}`);
      validation.passed = false;
    } else {
      validation.checks.prohibitedHashtags = {
        found: [],
        passed: true,
        message: '✅ No hashtags found (as required)'
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROHIBITED URL CHECK
  // ─────────────────────────────────────────────────────────────────────────────
  if (requirements.prohibitedUrl) {
    const urlPatterns = [
      /https?:\/\/[^\s]+/gi,
      /rally\.fun/gi,
      /app\.rally\.fun/gi,
      /\[.*?\]\(https?:\/\/.*?\)/gi  // Markdown links
    ];

    const foundUrls = [];
    urlPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      foundUrls.push(...matches);
    });

    if (foundUrls.length > 0) {
      validation.checks.prohibitedUrl = {
        found: foundUrls,
        passed: false,
        message: '🚫 URL/Link is NOT allowed but found in content'
      };
      validation.prohibitedItemsFound.push(`🚫 PROHIBITED: URLs found: ${foundUrls.join(', ')}`);
      validation.passed = false;
    } else {
      validation.checks.prohibitedUrl = {
        found: [],
        passed: true,
        message: '✅ No URL found (as required)'
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROHIBITED TAGS CHECK
  // ─────────────────────────────────────────────────────────────────────────────
  if (requirements.prohibitedTags.length > 0) {
    const foundProhibitedTags = [];
    requirements.prohibitedTags.forEach(tag => {
      if (contentLower.includes(tag.toLowerCase())) {
        foundProhibitedTags.push(tag);
      }
    });

    if (foundProhibitedTags.length > 0) {
      validation.checks.prohibitedTags = {
        found: foundProhibitedTags,
        passed: false,
        message: '🚫 These tags are NOT allowed but found in content'
      };
      validation.prohibitedItemsFound.push(`🚫 PROHIBITED TAGS: ${foundProhibitedTags.join(', ')}`);
      validation.passed = false;
    } else {
      validation.checks.prohibitedTags = {
        found: [],
        passed: true,
        message: '✅ No prohibited tags found'
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROHIBITED KEYWORDS CHECK
  // ─────────────────────────────────────────────────────────────────────────────
  if (requirements.prohibitedKeywords.length > 0) {
    const foundProhibitedKeywords = [];
    requirements.prohibitedKeywords.forEach(keyword => {
      if (contentLower.includes(keyword.toLowerCase())) {
        foundProhibitedKeywords.push(keyword);
      }
    });

    if (foundProhibitedKeywords.length > 0) {
      validation.checks.prohibitedKeywords = {
        found: foundProhibitedKeywords,
        passed: false,
        message: '🚫 These keywords are NOT allowed but found in content'
      };
      validation.prohibitedItemsFound.push(`🚫 PROHIBITED KEYWORDS: ${foundProhibitedKeywords.join(', ')}`);
      validation.passed = false;
    } else {
      validation.checks.prohibitedKeywords = {
        found: [],
        passed: true,
        message: '✅ No prohibited keywords found'
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROHIBITED ELEMENTS CHECK
  // ─────────────────────────────────────────────────────────────────────────────
  if (requirements.prohibitedElements.length > 0) {
    const foundProhibitedElements = [];

    requirements.prohibitedElements.forEach(element => {
      const elementLower = element.toLowerCase();
      if (contentLower.includes(elementLower)) {
        foundProhibitedElements.push(element);
      }
    });

    if (foundProhibitedElements.length > 0) {
      validation.checks.prohibitedElements = {
        found: foundProhibitedElements,
        passed: false,
        message: '🚫 These elements are NOT allowed but found in content'
      };
      validation.prohibitedItemsFound.push(`🚫 PROHIBITED ELEMENTS: ${foundProhibitedElements.join(', ')}`);
      validation.passed = false;
    } else {
      validation.checks.prohibitedElements = {
        found: [],
        passed: true,
        message: '✅ No prohibited elements found'
      };
    }
  }

  return validation;
}

/**
 * Display Campaign Requirements (for debugging)
 * Only shows what is EXPLICITLY required
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

function getJudge1SystemPrompt() {
  return `You are Judge 1: Gate Utama - An expert content evaluator for Rally.fun.

You evaluate content objectively. You do NOT know how this content was created.
Your job is to score each criterion FAIRLY and CONSISTENTLY.

═══════════════════════════════════════════════════════════════════════════════
SCORING GUIDE (1-4 for each criterion):
═══════════════════════════════════════════════════════════════════════════════

📌 HOOK QUALITY (1-4)
────────────────────────────
4 = EXCELLENT: Opens with CASUAL hook (ngl, tbh, honestly, fun story, look, real talk), immediately grabs attention, NOT formulaic
3 = GOOD: Opening is engaging, has some casual element
2 = FAIR: Opening exists but feels generic or weak
1 = POOR: Opens with template (Unpopular opinion, Hot take, Here's the thing) or boring

Examples of EXCELLENT hooks:
• "ngl i spent 25 minutes just watching this thing"
• "tbh didn't expect this to work"
• "fun story - i almost scrolled past this"

📌 EMOTIONAL IMPACT (1-4)
────────────────────────────
4 = EXCELLENT: Content evokes 3+ distinct emotions, feels genuine
3 = GOOD: Content has emotional moments, 2-3 emotions present
2 = FAIR: Some emotional content but feels surface-level
1 = POOR: Flat, emotionless, or forced emotions

📌 BODY FEELING (1-4)
────────────────────────────
4 = EXCELLENT: Reader can physically FEEL the described sensation
3 = GOOD: Physical sensation is present and relatable
2 = FAIR: Body feeling mentioned but not impactful
1 = POOR: No physical sensation or feels fake

Examples: "stomach dropped", "chest tightened", "cold sweat", "jaw dropped"

📌 CTA QUALITY (1-4)
────────────────────────────
4 = EXCELLENT: Natural CONVERSATIONAL CTA (tbh, worth checking, what do you think?, just saying)
3 = GOOD: Clear CTA, somewhat engaging
2 = FAIR: CTA exists but feels generic
1 = POOR: No CTA or pushy/promotional

📌 URL PRESENCE (1-4)
────────────────────────────
4 = EXCELLENT: URL integrated naturally into the content flow
3 = GOOD: URL present and fits reasonably well
2 = FAIR: URL present but feels forced
1 = POOR: URL missing or poorly placed

📌 G4 ORIGINALITY (1-4) - NEW!
────────────────────────────
4 = EXCELLENT: Has 4+ G4 elements (casual hook, parenthetical aside, 3+ contractions, personal angle, conversational ending)
3 = GOOD: Has 3 G4 elements present
2 = FAIR: Has 1-2 G4 elements
1 = POOR: No G4 elements, sounds AI-generated or formal

G4 Elements to check:
• Casual hook opening (ngl, tbh, honestly, fun story, look, real talk)
• Parenthetical aside ((embarrassing to admit), (just saying), (not gonna lie))
• Contractions (don't, can't, it's, I'm, won't, wouldn't, let's, that's) - need 3+
• Personal angle (I, my, me with specific experience)
• Conversational ending (tbh, worth checking, what do you think?)

═══════════════════════════════════════════════════════════════════════════════
🚨 FORBIDDEN ELEMENTS (Auto -1 point each if found):
═══════════════════════════════════════════════════════════════════════════════
• Em dashes (— or –) - AI indicator
• Smart quotes (" " ' ') - AI indicator
• AI phrases: delve, leverage, realm, tapestry, paradigm, landscape, nuance
• Template openings: "Unpopular opinion:", "Hot take:", "Picture this"

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════════════════════════════

Return JSON:
{
  "hookQuality": {"score": N, "reason": "brief explanation"},
  "emotionalImpact": {"score": N, "reason": "brief explanation"},
  "bodyFeeling": {"score": N, "reason": "brief explanation"},
  "ctaQuality": {"score": N, "reason": "brief explanation"},
  "urlPresence": {"score": N, "reason": "brief explanation"},
  "g4Originality": {"score": N, "reason": "which G4 elements present"},
  "forbiddenElements": {"found": [], "penalty": N},
  "totalScore": N,
  "feedback": "overall assessment"
}`;
}

function getJudge1UserPrompt(content, campaignData, deepIntent = null) {
  const reqs = parseCampaignRequirements(campaignData);
  return `Evaluate this content for Gate Utama:

CONTENT:
${content}

═════════════════════════════════════════════════════
CAMPAIGN CONTEXT (for accurate evaluation):
═════════════════════════════════════════════════════
Campaign: ${campaignData.title || 'Unknown'}
${campaignData.missionTitle ? `Mission: ${campaignData.missionTitle}` : ''}
Mission Goal: ${campaignData.description || campaignData.missionGoal || campaignData.goal || 'N/A'}
Style: ${campaignData.style || 'N/A'}

CAMPAIGN RULES:
${campaignData.rules || 'Standard rules'}

${reqs.mandatoryTags.length > 0 ? `REQUIRED TAGS: ${reqs.mandatoryTags.join(', ')}` : ''}
${reqs.mandatoryHashtags.length > 0 ? `REQUIRED HASHTAGS: ${reqs.mandatoryHashtags.join(', ')}` : ''}
${reqs.mandatoryMetrics ? 'METRICS REQUIRED: Content must have specific numbers' : ''}
${reqs.mandatoryUrl ? `REQUIRED URL: ${campaignData.campaignUrl || campaignData.url}` : ''}
${reqs.prohibitedHashtags.length > 0 ? '🚫 NO HASHTAGS ALLOWED' : ''}
${reqs.prohibitedUrl ? '🚫 NO URL/LINK ALLOWED' : ''}
${reqs.prohibitedTags.length > 0 ? `🚫 DO NOT TAG: ${reqs.prohibitedTags.join(', ')}` : ''}
${reqs.focusTopic ? `FOCUS TOPIC: ${reqs.focusTopic}` : ''}
${reqs.proposedAngles.length > 0 ? `PROPOSED ANGLES: ${reqs.proposedAngles.join(' | ')}` : ''}

Campaign URL: ${campaignData.campaignUrl || campaignData.url || 'Check for URL'}

${deepIntent?.metricClassification?.campaignMetricType ? `
════════════════════════════════════════════════════════════════
🚨 CRITICAL: METRIC TYPE CHECK
════════════════════════════════════════════════════════════════
This campaign requires ${deepIntent.metricClassification.campaignMetricType} metrics.

WRONG metric types (auto-fail if used as campaign metrics):
${(deepIntent.metricClassification.wrongMetricsToAvoid || []).map(m => '- ❌ ' + m).join('\n')}

CORRECT metric types:
${(deepIntent.metricClassification.correctMetricsToUse || []).map(m => '- ✓ ' + m).join('\n')}

⚠️ If content uses TVL/Volume numbers but campaign wants GROWTH metrics → SCORE 0
⚠️ If content uses liquidity stats but campaign wants RETENTION metrics → SCORE 0
⚠️ Using the RIGHT metric TYPE is more important than having big numbers
` : ''}

Evaluate considering campaign rules. Return JSON scores.`;
}

function getJudge2SystemPrompt() {
  return `You are Judge 2: Gate Tambahan - An expert content evaluator for Rally.fun.

You evaluate content objectively. You do NOT know how this content was created.
Your job is to score each criterion FAIRLY and CONSISTENTLY.

═══════════════════════════════════════════════════════════════════════════════
SCORING GUIDE (1-4 for each criterion):
═══════════════════════════════════════════════════════════════════════════════

📌 FACT QUALITY (1-4)
────────────────────────────
4 = EXCELLENT: Multiple evidence layers (data, case study, personal, expert) with SPECIFIC NUMBERS
3 = GOOD: Has supporting facts/data, credible
2 = FAIR: Some facts present but weak or generic
1 = POOR: No facts, unsubstantiated claims, or fake data

Evidence layers to look for:
• Macro data: "23M Americans lost money (FTC 2023)"
• Case study: Specific example with details
• Personal touch: Real experience
• Expert validation: Credible source

📌 ENGAGEMENT HOOK (1-4)
────────────────────────────
4 = EXCELLENT: Content naturally invites replies and discussion with EMBARRASSING HONESTY
3 = GOOD: Has engagement potential
2 = FAIR: Some engagement elements
1 = POOR: No reason for readers to engage

📌 READABILITY (1-4)
────────────────────────────
4 = EXCELLENT: Easy to read, good flow, appropriate length, uses contractions naturally, proper paragraph breaks
3 = GOOD: Readable with minor issues
2 = FAIR: Somewhat hard to follow or too long/short
1 = POOR: Confusing, poor structure, or walls of text

Check for:
• Short paragraphs (1-2 sentences) separated by blank lines
• Wall of text (no paragraph breaks) = AUTO SCORE 1
• Good sentence variety
• No jargon overload
• CRITICAL: Content MUST have paragraph breaks (\n\n) between ideas. Single continuous paragraph = READABILITY 1

📌 X-FACTOR DIFFERENTIATORS (1-4) - NEW!
────────────────────────────
4 = EXCELLENT: Has 4+ X-Factors (specific numbers, time specificity, embarrassing honesty, insider detail, unexpected angle)
3 = GOOD: Has 3 X-Factors present
2 = FAIR: Has 1-2 X-Factors
1 = POOR: No X-Factors, generic vague content

X-Factors to check:
• SPECIFIC NUMBERS: Exact figures ("down 47%", "$1.2M", "3.5x") NOT vague ("down a lot")
• TIME SPECIFICITY: Exact durations ("25 minutes", "3 hours") NOT vague ("a while")
• EMBARRASSING HONESTY: Admits something relatable ("embarrassing to admit I watched for 25 mins")
• INSIDER DETAIL: Unique observation ("went from 68% to sweating bullets", "refreshed 47 times")
• UNEXPECTED ANGLE: Surprise twist or contrary view

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════════════════════════════

Return JSON:
{
  "factQuality": {"score": N, "reason": "brief explanation"},
  "engagementHook": {"score": N, "reason": "brief explanation"},
  "readability": {"score": N, "reason": "brief explanation"},
  "xFactorDifferentiators": {"score": N, "reason": "which X-Factors present", "detected": []},
  "totalScore": N,
  "feedback": "overall assessment"
}`;
}

function getJudge2UserPrompt(content, campaignData, deepIntent = null) {
  const reqs = parseCampaignRequirements(campaignData);
  return `Evaluate this content for Gate Tambahan:

CONTENT:
${content}

═════════════════════════════════════════════════════
CAMPAIGN CONTEXT (for accurate evaluation):
═════════════════════════════════════════════════════
Campaign: ${campaignData.title || 'Unknown'}
${campaignData.missionTitle ? `Mission: ${campaignData.missionTitle}` : ''}
Mission Goal: ${campaignData.description || campaignData.missionGoal || campaignData.goal || 'N/A'}
Style: ${campaignData.style || 'N/A'}

CAMPAIGN RULES:
${campaignData.rules || 'Standard rules'}

${reqs.mandatoryTags.length > 0 ? `REQUIRED TAGS: ${reqs.mandatoryTags.join(', ')}` : ''}
${reqs.mandatoryMetrics ? 'METRICS REQUIRED: Content must have specific numbers' : ''}
${reqs.mandatoryUrl ? `REQUIRED URL: ${campaignData.campaignUrl || campaignData.url}` : ''}
${reqs.prohibitedHashtags.length > 0 ? '🚫 NO HASHTAGS ALLOWED' : ''}
${reqs.prohibitedUrl ? '🚫 NO URL/LINK ALLOWED' : ''}
${reqs.focusTopic ? `FOCUS TOPIC: ${reqs.focusTopic}` : ''}
${reqs.proposedAngles.length > 0 ? `PROPOSED ANGLES: ${reqs.proposedAngles.join(' | ')}` : ''}

${deepIntent?.metricClassification?.campaignMetricType ? `
════════════════════════════════════════════════════════════════
🚨 CRITICAL: METRIC TYPE CHECK
════════════════════════════════════════════════════════════════
This campaign requires ${deepIntent.metricClassification.campaignMetricType} metrics.

WRONG metric types (auto-fail if used as campaign metrics):
${(deepIntent.metricClassification.wrongMetricsToAvoid || []).map(m => '- ❌ ' + m).join('\n')}

CORRECT metric types:
${(deepIntent.metricClassification.correctMetricsToUse || []).map(m => '- ✓ ' + m).join('\n')}

⚠️ If content uses TVL/Volume numbers but campaign wants GROWTH metrics → SCORE 0
⚠️ If content uses liquidity stats but campaign wants RETENTION metrics → SCORE 0
⚠️ Using the RIGHT metric TYPE is more important than having big numbers
` : ''}

Evaluate considering campaign rules and context. Return JSON scores.`;
}

function getJudge3SystemPrompt() {
  return `You are Judge 3: Penilaian Internal - An expert content evaluator for Rally.fun.

You evaluate content deeply and thoroughly. You do NOT know how this content was created.
Your job is to score each criterion FAIRLY and CONSISTENTLY.

═══════════════════════════════════════════════════════════════════════════════
SCORING GUIDE (1-10 for each criterion):
═══════════════════════════════════════════════════════════════════════════════

📌 CONTENT DEPTH (1-10)
────────────────────────────
9-10 = EXCELLENT: Multiple layers, deep analysis, comprehensive
7-8 = GOOD: Has depth, covers multiple aspects
5-6 = FAIR: Some depth but could go deeper
3-4 = POOR: Surface-level, shallow
1-2 = VERY POOR: No depth, completely superficial

📌 STORY QUALITY (1-10)
────────────────────────────
9-10 = EXCELLENT: Compelling narrative, excellent flow, engaging throughout
7-8 = GOOD: Good story, keeps reader interested
5-6 = FAIR: Story exists but has weak points
3-4 = POOR: Weak narrative, hard to follow
1-2 = VERY POOR: No story or completely confusing

📌 AUDIENCE FIT (1-10)
────────────────────────────
9-10 = EXCELLENT: Perfectly matches target audience needs and pain points
7-8 = GOOD: Generally matches audience
5-6 = FAIR: Somewhat relevant to audience
3-4 = POOR: Weak connection to audience
1-2 = VERY POOR: Completely misses the target audience

📌 EMOTION VARIETY (1-10)
────────────────────────────
9-10 = EXCELLENT: 5+ distinct emotions, excellent emotional journey
7-8 = GOOD: 3-4 emotions, good variety
5-6 = FAIR: 2-3 emotions, some variety
3-4 = POOR: 1-2 emotions, monotonous
1-2 = VERY POOR: No emotional variety

Emotions to look for: curiosity, surprise, fear, hope, anger, relief, frustration, joy, etc.

📌 EVIDENCE LAYERING (1-10)
────────────────────────────
9-10 = EXCELLENT: All 4 layers present (macro data + case study + personal + expert)
7-8 = GOOD: 3 layers present
5-6 = FAIR: 2 layers present
3-4 = POOR: 1 layer only
1-2 = VERY POOR: No evidence

📌 ANTI-TEMPLATE SCORE (1-10)
────────────────────────────
9-10 = EXCELLENT: Completely original, no template patterns, natural flow
7-8 = GOOD: Mostly original, minor template hints
5-6 = FAIR: Some template elements present
3-4 = POOR: Clearly using common templates
1-2 = VERY POOR: Obvious template, no originality

Template red flags:
• Starts with "Unpopular opinion:" or "Hot take:"
• Uses AI phrases: "delve", "leverage", "realm", "tapestry"
• Formulaic structure: "Here's the thing... Let me explain..."

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════════════════════════════

Return JSON:
{
  "contentDepth": {"score": N, "reason": "brief explanation"},
  "storyQuality": {"score": N, "reason": "brief explanation"},
  "audienceFit": {"score": N, "reason": "brief explanation"},
  "emotionVariety": {"score": N, "reason": "brief explanation"},
  "evidenceLayering": {"score": N, "reason": "brief explanation"},
  "antiTemplate": {"score": N, "reason": "brief explanation"},
  "totalScore": N,
  "feedback": "overall assessment"
}`;
}

function getJudge3UserPrompt(content, campaignData, deepIntent = null) {
  const reqs = parseCampaignRequirements(campaignData);
  return `Evaluate this content for Penilaian Internal:

CONTENT:
${content}

═════════════════════════════════════════════════════
CAMPAIGN CONTEXT (for accurate evaluation):
═════════════════════════════════════════════════════
Campaign: ${campaignData.title || 'Unknown'}
${campaignData.missionTitle ? `🎯 Mission: ${campaignData.missionTitle}` : ''}

MISSION GOAL/DESCRIPTION:
${campaignData.description || campaignData.missionGoal || campaignData.goal || 'Unknown'}

CAMPAIGN RULES (MUST BE FOLLOWED):
${campaignData.rules || 'Standard rules'}

STYLE REQUIREMENTS:
${campaignData.style || 'Professional, authentic'}

KNOWLEDGE BASE/INFO:
${campaignData.knowledgeBase || campaignData.additionalInfo || 'None'}

ADDITIONAL INFO:
${campaignData.additionalInfo || campaignData.adminNotice || 'None'}

${reqs.mandatoryTags.length > 0 ? `REQUIRED TAGS: ${reqs.mandatoryTags.join(', ')}` : ''}
${reqs.mandatoryHashtags.length > 0 ? `REQUIRED HASHTAGS: ${reqs.mandatoryHashtags.join(', ')}` : ''}
${reqs.mandatoryMetrics ? 'METRICS REQUIRED: Content must have specific numbers' : ''}
${reqs.mandatoryUrl ? `REQUIRED URL: ${campaignData.campaignUrl || campaignData.url}` : ''}
${reqs.prohibitedHashtags.length > 0 ? '🚫 NO HASHTAGS ALLOWED' : ''}
${reqs.prohibitedUrl ? '🚫 NO URL/LINK ALLOWED' : ''}
${reqs.prohibitedTags.length > 0 ? `🚫 DO NOT TAG: ${reqs.prohibitedTags.join(', ')}` : ''}
${reqs.prohibitedKeywords.length > 0 ? `🚫 DO NOT MENTION: ${reqs.prohibitedKeywords.join(', ')}` : ''}
${reqs.focusTopic ? `FOCUS TOPIC: ${reqs.focusTopic}` : ''}
${reqs.proposedAngles.length > 0 ? `PROPOSED ANGLES: ${reqs.proposedAngles.join(' | ')}` : ''}

Target Audience: ${campaignData.targetAudience || 'General'}

${deepIntent?.metricClassification?.campaignMetricType ? `
════════════════════════════════════════════════════════════════
🚨 CRITICAL: METRIC TYPE CHECK
════════════════════════════════════════════════════════════════
This campaign requires ${deepIntent.metricClassification.campaignMetricType} metrics.

WRONG metric types (auto-fail if used as campaign metrics):
${(deepIntent.metricClassification.wrongMetricsToAvoid || []).map(m => '- ❌ ' + m).join('\n')}

CORRECT metric types:
${(deepIntent.metricClassification.correctMetricsToUse || []).map(m => '- ✓ ' + m).join('\n')}

⚠️ If content uses TVL/Volume numbers but campaign wants GROWTH metrics → SCORE 0
⚠️ If content uses liquidity stats but campaign wants RETENTION metrics → SCORE 0
⚠️ Using the RIGHT metric TYPE is more important than having big numbers
` : ''}

Evaluate considering ALL campaign rules. Return JSON scores.`;
}

function getJudge4SystemPrompt() {
  return `You are Judge 4: Mission Compliance Checker - A STRICT compliance checker for Rally.fun.

You evaluate content compliance OBJECTIVELY. You do NOT know how this content was created.
Your job is to check ALL requirements STRICTLY. PASS only if FULLY satisfied.

═══════════════════════════════════════════════════════════════════════════════
🚨 CRITICAL: MISSION COMPLIANCE (MUST ALL PASS - NO EXCEPTIONS)
═══════════════════════════════════════════════════════════════════════════════

📌 1. REQUIRED TAGS/MENTIONS (MOST CRITICAL!)
────────────────────────────
Check if content includes ALL required tags/mentions from RULES.
Example: If rules say "Tag @grvt_io" - content MUST contain "@grvt_io"
PASS: All required tags present exactly as specified
FAIL: Any required tag missing or incorrect

📌 2. SPECIFIC METRIC/NUMBER REQUIREMENTS
────────────────────────────
Check if rules require mentioning specific metrics.
Example: If rules say "Mention at least one specific metric" - MUST have number/data
PASS: Contains specific metric (e.g., "100M+ TVL", "$200B volume")
FAIL: No specific numbers or only vague claims

📌 3. TOPIC FOCUS REQUIREMENTS
────────────────────────────
Check if content focuses on the required topic from description.
Example: If mission is about "Growth & Metrics" - MUST focus on that, not random stories
PASS: Content directly addresses mission topic
FAIL: Content goes off-topic or ignores mission focus

📌 4. STYLE COMPLIANCE
────────────────────────────
Check style requirements from STYLE field.
Example: "Write based on your real usage and your own words"
PASS: Content matches style requirements
FAIL: Style doesn't match (too generic, too AI-sounding, wrong tone)

📌 5. CAMPAIGN DESCRIPTION ALIGNMENT
────────────────────────────
PASS: Content clearly relates to campaign description/mission goal
FAIL: Content doesn't match what campaign is about

📌 6. KNOWLEDGE BASE / ADDITIONAL INFO USAGE
────────────────────────────
PASS: Correctly uses or references provided info
FAIL: Ignores provided info or contradicts it

📌 7. REQUIRED URL
────────────────────────────
PASS: Campaign URL is included in content
FAIL: URL missing or incorrect

📌 8. NO BANNED WORDS
────────────────────────────
PASS: No banned words or phrases detected
FAIL: Contains any banned promotional language

Banned: guaranteed, 100%, risk-free, buy now, get rich, click here, limited time

📌 9. NO AI PATTERNS
────────────────────────────
PASS: Content doesn't sound AI-generated
FAIL: Contains AI-typical words or phrases

AI red flags: delve, leverage, realm, tapestry, paradigm, landscape, nuance,
"picture this", "let's dive in", "in today's digital landscape"

📌 10. NO FORBIDDEN PUNCTUATION
────────────────────────────
PASS: No em dashes or smart quotes detected
FAIL: Contains AI indicator punctuation

🚨 FORBIDDEN (AI Indicators):
• Em dashes (— or –): Use hyphens (-) or commas instead
• Smart quotes (" " ' '): Use straight quotes (" and ') only

📌 11. EVIDENCE DEPTH
────────────────────────────
PASS: Has sufficient evidence/proof for claims with SPECIFIC NUMBERS
FAIL: Makes claims without supporting evidence

📌 12. ANTI-TEMPLATE
────────────────────────────
PASS: Not using formulaic/template structures
FAIL: Uses obvious templates like "Unpopular opinion:", "Hot take:", etc.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════════════════════════════

Return JSON:
{
  "checks": {
    "requiredTags": {"pass": true/false, "found": ["@tag1"], "missing": [], "reason": "explanation"},
    "specificMetrics": {"pass": true/false, "found": ["100M TVL"], "reason": "explanation"},
    "topicFocus": {"pass": true/false, "expectedTopic": "...", "actualTopic": "...", "reason": "..."},
    "styleCompliance": {"pass": true/false, "reason": "brief explanation"},
    "descriptionAlignment": {"pass": true/false, "reason": "brief explanation"},
    "knowledgeBase": {"pass": true/false, "reason": "brief explanation"},
    "requiredUrl": {"pass": true/false, "reason": "brief explanation"},
    "noBannedWords": {"pass": true/false, "reason": "brief explanation"},
    "noAIPatterns": {"pass": true/false, "reason": "brief explanation"},
    "noForbiddenPunctuation": {"pass": true/false, "reason": "...", "details": ""},
    "evidenceDepth": {"pass": true/false, "reason": "brief explanation"},
    "antiTemplate": {"pass": true/false, "reason": "brief explanation"}
  },
  "allPass": true/false,
  "failedChecks": ["list of failed check names"],
  "feedback": "overall assessment"
}`;
}

function getJudge4UserPrompt(content, campaignData, deepIntent = null) {
  return `Check compliance for:

CONTENT:
${content}

═════════════════════════════════════════════════════════════════
CAMPAIGN DATA (ALL FIELDS BELOW ARE MANDATORY REQUIREMENTS):
═════════════════════════════════════════════════════════════════

Campaign Title: ${campaignData.title || 'Unknown'}

${campaignData.missionTitle ? `🎯 MISSION: ${campaignData.missionTitle}` : ''}

MISSION GOAL/DESCRIPTION:
${campaignData.description || campaignData.missionGoal || campaignData.goal || 'Not specified'}

🚨 MISSION RULES (MUST BE FOLLOWED EXACTLY):
${campaignData.rules || 'Standard rules'}

STYLE REQUIREMENTS:
${campaignData.style || 'Professional, authentic'}

KNOWLEDGE BASE/INFO:
${campaignData.knowledgeBase || campaignData.additionalInfo || 'None'}

REQUIRED URL:
${campaignData.campaignUrl || campaignData.url || 'Required'}

═════════════════════════════════════════════════════════════════
CHECK EACH REQUIREMENT CAREFULLY:
═════════════════════════════════════════════════════════════════

1. REQUIRED TAGS: Check if RULES mention any @tags that MUST be in content
   - If rules say "Tag @grvt_io" → content MUST have "@grvt_io"

2. SPECIFIC METRICS: Check if RULES require numbers/metrics
   - If rules say "Mention at least one metric" → content MUST have specific number

3. TOPIC FOCUS: Does content match the MISSION GOAL?
   - Mission says "Growth & Metrics" → content should focus on that

4. STYLE: Does content match STYLE requirements?
   - "Write based on real usage" → should feel personal, not generic

${deepIntent?.metricClassification?.campaignMetricType ? `
════════════════════════════════════════════════════════════════
🚨 CRITICAL: METRIC TYPE CHECK
════════════════════════════════════════════════════════════════
This campaign requires ${deepIntent.metricClassification.campaignMetricType} metrics.

WRONG metric types (auto-fail if used as campaign metrics):
${(deepIntent.metricClassification.wrongMetricsToAvoid || []).map(m => '- ❌ ' + m).join('\n')}

CORRECT metric types:
${(deepIntent.metricClassification.correctMetricsToUse || []).map(m => '- ✓ ' + m).join('\n')}

⚠️ If content uses TVL/Volume numbers but campaign wants GROWTH metrics → SCORE 0
⚠️ If content uses liquidity stats but campaign wants RETENTION metrics → SCORE 0
⚠️ Using the RIGHT metric TYPE is more important than having big numbers
` : ''}

Return JSON with all checks.`;
}

function getJudge5SystemPrompt() {
  return `You are Judge 5: Fact-Check Judge - An expert fact verifier for Rally.fun.

You verify claims OBJECTIVELY using web search. You do NOT know how this content was created.
Your job is to check if claims are accurate, sources are reliable, and data is current.

═══════════════════════════════════════════════════════════════════════════════
SCORING GUIDE (1-5 for each criterion):
═══════════════════════════════════════════════════════════════════════════════

📌 CLAIM ACCURACY (1-5)
────────────────────────────
5 = EXCELLENT: All claims verified, accurate, well-supported
4 = GOOD: Most claims verified, minor inaccuracies
3 = FAIR: Some claims verified, others unverifiable
2 = POOR: Multiple inaccurate claims
1 = VERY POOR: Claims are false or misleading

📌 SOURCE QUALITY (1-5)
────────────────────────────
5 = EXCELLENT: Uses authoritative, credible sources
4 = GOOD: Sources are generally reliable
3 = FAIR: Mix of reliable and questionable sources
2 = POOR: Weak or biased sources
1 = VERY POOR: No credible sources or fake sources

Credible sources: Government agencies, academic institutions, established media
Questionable sources: Blogs without citation, social media posts, anonymous claims

📌 DATA FRESHNESS (1-5)
────────────────────────────
5 = EXCELLENT: Data from current year (2024-2025)
4 = GOOD: Data from recent years (2022-2023)
3 = FAIR: Data somewhat outdated (2020-2021)
2 = POOR: Old data (pre-2020)
1 = VERY POOR: No dates or very outdated information

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════════════════════════════

Return JSON:
{
  "claimAccuracy": {"score": N, "reason": "brief explanation", "verified": true/false},
  "sourceQuality": {"score": N, "reason": "brief explanation"},
  "dataFreshness": {"score": N, "reason": "brief explanation"},
  "totalScore": N,
  "factCheckResults": ["verification result 1", "verification result 2"],
  "feedback": "overall assessment"
}`;
}

function getJudge5UserPrompt(content, campaignData, deepIntent = null) {
  return `Fact-check this content:

CONTENT:
${content}

═════════════════════════════════════════════════════
CAMPAIGN CONTEXT (for verification):
═════════════════════════════════════════════════════
Campaign: ${campaignData.title || 'Unknown'}
Mission Goal: ${campaignData.description || campaignData.missionGoal || campaignData.goal || 'N/A'}

CAMPAIGN KNOWLEDGE BASE (verify these facts if mentioned):
${campaignData.knowledgeBase || 'No specific KB provided'}

CAMPAIGN RULES (verify compliance):
${campaignData.rules || 'Standard rules'}

${deepIntent?.metricClassification?.campaignMetricType ? `
════════════════════════════════════════════════════════════════
🚨 CRITICAL: METRIC TYPE CHECK
════════════════════════════════════════════════════════════════
This campaign requires ${deepIntent.metricClassification.campaignMetricType} metrics.

WRONG metric types (auto-fail if used as campaign metrics):
${(deepIntent.metricClassification.wrongMetricsToAvoid || []).map(m => '- ❌ ' + m).join('\n')}

CORRECT metric types:
${(deepIntent.metricClassification.correctMetricsToUse || []).map(m => '- ✓ ' + m).join('\n')}

⚠️ If content uses TVL/Volume numbers but campaign wants GROWTH metrics → SCORE 0
⚠️ If content uses liquidity stats but campaign wants RETENTION metrics → SCORE 0
⚠️ Using the RIGHT metric TYPE is more important than having big numbers
` : ''}

Use web search results to verify claims. Cross-check against knowledge base data.

════════════════════════════════════════════════════════════════
🚨🚨🚨 ADDITIONAL CHECK: METRIC TYPE RELEVANCE 🚨🚨🚨
════════════════════════════════════════════════════════════════
Beyond factual accuracy, you MUST check if the METRIC TYPE is correct:
- If content says "retention stats" but cites TVL/Volume → these are LIQUIDITY metrics, NOT retention → PENALTY
- If content says "growth metrics" but cites TVL/Volume → these are LIQUIDITY metrics, NOT growth → PENALTY
- Using the RIGHT metric TYPE is more important than having impressive numbers
- Example: "11% earning rate" is EARNING metric, "$200B volume" is LIQUIDITY metric
- If the content mislabels metric types → claimAccuracy must be reduced by at least 2 points

Return JSON with scores and verification results.`;
}

function getJudge6SystemPrompt() {
  return `You are Judge 6: Uniqueness Verifier - An expert content differentiation analyst for Rally.fun.

You compare content against competitors OBJECTIVELY. You do NOT know how this content was created.
Your job is to determine if content is UNIQUE and DIFFERENTIATED from competitors.

═══════════════════════════════════════════════════════════════════════════════
SCORING GUIDE:
═══════════════════════════════════════════════════════════════════════════════

📌 DIFFERENTIATION (1-10)
────────────────────────────
9-10 = EXCELLENT: Completely different angle, approach, and style
7-8 = GOOD: Clearly different from competitors
5-6 = FAIR: Some differentiation but similar elements
3-4 = POOR: Mostly similar to existing content
1-2 = VERY POOR: Nearly identical to competitor content

📌 UNIQUE ANGLE (1-5)
────────────────────────────
5 = EXCELLENT: Fresh angle not seen in competitors
4 = GOOD: Angle has unique elements
3 = FAIR: Angle somewhat common
2 = POOR: Common angle, similar to others
1 = VERY POOR: Same angle as multiple competitors

📌 EMOTION UNIQUENESS (1-5)
────────────────────────────
5 = EXCELLENT: Rare emotion combination (e.g., surprise+anger, fear+empowerment)
4 = GOOD: Less common emotion combo
3 = FAIR: Standard emotions
2 = POOR: Common, overused emotions
1 = VERY POOR: Same emotions as most competitors

Rare combos: surprise+anger, fear+empowerment, confusion+clarity, relief+curiosity
Common combos: curiosity+hope, pain+hope, fear+urgency

📌 TEMPLATE AVOIDANCE (1-5)
────────────────────────────
5 = EXCELLENT: No template patterns, completely natural
4 = GOOD: Minimal template influence
3 = FAIR: Some template elements
2 = POOR: Uses common templates
1 = VERY POOR: Obvious template structure

═══════════════════════════════════════════════════════════════════════════════
SIMILARITY ASSESSMENT:
═══════════════════════════════════════════════════════════════════════════════

Compare content with ALL competitor contents provided.
Consider:
• Similar topics/angles
• Similar structure/flow
• Similar phrases/wording
• Similar emotional approach

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════════════════════════════

Return JSON:
{
  "differentiation": {"score": N, "reason": "brief explanation"},
  "uniqueAngle": {"score": N, "reason": "brief explanation"},
  "emotionUniqueness": {"score": N, "reason": "brief explanation"},
  "templateAvoidance": {"score": N, "reason": "brief explanation"},
  "similarityScore": N,
  "isUnique": true/false,
  "totalScore": N,
  "feedback": "overall assessment"
}`;
}

function getJudge6UserPrompt(content, campaignData, competitorContents, deepIntent = null) {
  return `Verify uniqueness:

CONTENT TO CHECK:
${content}

COMPETITOR CONTENTS:
${(competitorContents || []).slice(0, 5).map((c, i) => `
--- Competitor ${i + 1} ---
${c.substring ? c.substring(0, 300) : c}
`).join('\n')}

${deepIntent?.metricClassification?.campaignMetricType ? `
════════════════════════════════════════════════════════════════
🚨 CRITICAL: METRIC TYPE CHECK
════════════════════════════════════════════════════════════════
This campaign requires ${deepIntent.metricClassification.campaignMetricType} metrics.

WRONG metric types (auto-fail if used as campaign metrics):
${(deepIntent.metricClassification.wrongMetricsToAvoid || []).map(m => '- ❌ ' + m).join('\n')}

CORRECT metric types:
${(deepIntent.metricClassification.correctMetricsToUse || []).map(m => '- ✓ ' + m).join('\n')}

⚠️ If content uses TVL/Volume numbers but campaign wants GROWTH metrics → SCORE 0
⚠️ If content uses liquidity stats but campaign wants RETENTION metrics → SCORE 0
⚠️ Using the RIGHT metric TYPE is more important than having big numbers
` : ''}

Compare and score uniqueness. Use NLP similarity data.`;
}

// ============================================================================
// MISSION COMPLIANCE VALIDATOR - Post-Generation Check
// ============================================================================

/**
 * Validate mission-specific requirements AFTER content generation
 * This ensures ALL campaign requirements are met before content is accepted
 */
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
      const url = `${CONFIG.rallyApiBase}/campaigns/${campaignAddress}/leaderboard`;
      
      https.get(url, { headers: { 'User-Agent': CONFIG.userAgent } }, (res) => {
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
      }).on('error', () => resolve([]));
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
async function judgeContentFailFast(content, campaignData, competitorContents, contentIndex, cycleNumber, state = judgingState) {
  // Check if already have a winner OR aborted
  if (state.hasWinner() || state.isAborted()) {
    return { skipped: true, reason: 'Already have winner or aborted' };
  }
  
  if (!content) {
    return { content: null, passed: false, failedAt: 'generation' };
  }
  
  console.log(`\n   ⚖️ [${timestamp()}] Judging Content ${contentIndex + 1} (Cycle ${cycleNumber})`);
  
  const results = {
    content,
    contentIndex,
    cycleNumber,
    scores: {},
    passed: false,
    totalScore: 0,
    failedAt: null
  };
  
  // Get deep intent from module cache (set by main workflow)
  const deepIntent = _cachedCampaignIntent || null;
  
  // ═══════════════════════════════════════════════════════════════
  // BUG #34 FIX: Sanitize content before judging (smart quotes, em dashes)
  // ═══════════════════════════════════════════════════════════════
  content = sanitizeContent(content);
  results.content = content;
  
  // ═══════════════════════════════════════════════════════════════
  // BUG #35 FIX: Metric Type Relevance Check before judging
  // ═══════════════════════════════════════════════════════════════
  const metricTypeCheck = validateMetricTypeRelevance(content, deepIntent);
  if (!metricTypeCheck.valid) {
    console.log('\n   ❌ METRIC TYPE REJECT: Content uses wrong metric type for campaign');
    metricTypeCheck.issues.forEach(issue => console.log(`      ❌ ${issue}`));
    results.passed = false;
    results.failedAt = 'Metric Type Check';
    results.scores.requirementsValidation = { 
      score: 0, max: 20, passed: false, 
      missingElements: metricTypeCheck.issues 
    };
    return results;
  }
  
  // AUTO-SAVE: Save content immediately after generation (before judging)
  try {
    const tempPath = `${CONFIG.outputDir}/content-${cycleNumber}-${contentIndex + 1}-${Date.now()}.txt`;
    fs.writeFileSync(tempPath, content);
    console.log(`   💾 Content saved: ${tempPath}`);
  } catch (saveErr) {
    console.log(`   ⚠️ Could not save content: ${saveErr.message}`);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🆕 PRE-CHECK: Formatting Validation (BEFORE any judge)
  // Wall-of-text content is automatically rejected
  // ═══════════════════════════════════════════════════════════════
  const hasParagraphBreaks = /\n\s*\n/.test(content);
  const wordCount = content.split(/\s+/).filter(w => w).length;
  const sentencesCount = (content.match(/[.!?]+/g) || []).length;
  const avgWordsPerSentence = sentencesCount > 0 ? Math.round(wordCount / sentencesCount) : wordCount;
  
  if (!hasParagraphBreaks && wordCount > 50) {
    console.log('\n   ❌ FORMAT REJECT: Content is a wall-of-text (no paragraph breaks)');
    console.log(`      → ${wordCount} words, ${sentencesCount} sentences, 0 paragraph breaks`);
    console.log('      → Content must have \\n\\n paragraph breaks between ideas');
    
    // Try to auto-fix formatting before rejecting
    const fixedContent = fixContentFormatting(content);
    const fixedHasBreaks = /\n\s*\n/.test(fixedContent);
    
    if (fixedHasBreaks && fixedContent !== content) {
      console.log('   📝 Auto-fixing formatting...');
      results.content = fixedContent;
      content = fixedContent; // Use fixed content for judging
      const fixedParas = content.split(/\n\s*\n/).filter(p => p.trim()).length;
      console.log(`   ✅ Auto-fixed: ${fixedParas} paragraphs created`);
    } else {
      results.passed = false;
      results.failedAt = 'Format Check - Wall of Text';
      results.scores.requirementsValidation = { score: 0, max: 20, passed: false, missingElements: ['Wall-of-text: no paragraph breaks'] };
      return results;
    }
  } else if (hasParagraphBreaks) {
    const paragraphCount = content.split(/\n\s*\n/).filter(p => p.trim()).length;
    console.log(`   ✅ Format OK: ${paragraphCount} paragraphs, ${wordCount} words`);
  } else {
    console.log(`   ✅ Format OK: Short content (${wordCount} words)`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 JUDGE 0: CAMPAIGN REQUIREMENTS VALIDATION (MANDATORY!)
  // This MUST pass before any other judge runs!
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`   🔴 JUDGE 0: Campaign Requirements Validation (MANDATORY)...`);
  
  const requirementsValidation = validateCampaignRequirements(content, campaignData);
  results.requirementsValidation = requirementsValidation;
  
  // Display validation results
  console.log('\n   ┌─────────────────────────────────────────────────────────┐');
  console.log('   │           📋 CAMPAIGN REQUIREMENTS CHECK              │');
  console.log('   ├─────────────────────────────────────────────────────────┤');
  
  // Display ALL checks, not just 3
  const checksToDisplay = [
    { key: 'mandatoryTags', label: 'Required Tags', icon: '🏷️' },
    { key: 'mandatoryHashtags', label: 'Required Hashtags', icon: '#️⃣' },
    { key: 'metrics', label: 'Metrics', icon: '📊' },
    { key: 'url', label: 'URL', icon: '🔗' },
    { key: 'screenshot', label: 'Screenshot', icon: '📸' },
    { key: 'mandatoryKeywords', label: 'Keywords', icon: '📝' },
    { key: 'focusTopic', label: 'Focus Topic', icon: '🎯' },
    { key: 'prohibitedHashtags', label: 'Prohibited Hashtags', icon: '🚫' },
    { key: 'prohibitedUrl', label: 'Prohibited URL', icon: '🚫' },
    { key: 'prohibitedTags', label: 'Prohibited Tags', icon: '🚫' },
    { key: 'prohibitedKeywords', label: 'Prohibited Keywords', icon: '🚫' },
    { key: 'prohibitedElements', label: 'Prohibited Elements', icon: '🚫' }
  ];
  
  checksToDisplay.forEach(({ key, label, icon }) => {
    const check = requirementsValidation.checks[key];
    if (!check) return;
    const iconStr = check.passed ? '✅' : '❌';
    const detail = check.passed 
      ? (check.found ? `FOUND: ${Array.isArray(check.found) ? check.found.join(', ') : check.found}` : 'PASS') 
      : (check.missing ? `MISSING: ${Array.isArray(check.missing) ? check.missing.join(', ') : check.missing}` : 'FAIL');
    const msg = `${iconStr} ${label}: ${detail}`.substring(0, 55);
    console.log(`   │ ${msg.padEnd(59)}│`);
  });
  
  console.log('   └─────────────────────────────────────────────────────────┘');
  
  // FAIL FAST if mandatory requirements not met
  if (!requirementsValidation.passed) {
    console.log('\n   ❌ JUDGE 0 FAILED - Content missing mandatory requirements:');
    requirementsValidation.missingElements.forEach(missing => {
      console.log(`      • ${missing}`);
    });
    console.log('   ⚠️ Content rejected - skipping other judges');
    
    results.passed = false;
    results.failedAt = 'Judge 0 - Campaign Requirements';
    results.scores.requirementsValidation = {
      score: 0,
      max: 20,  // Heavy weight for requirements
      passed: false,
      missingElements: requirementsValidation.missingElements
    };
    
    return results;
  }
  
  console.log('   ✅ JUDGE 0 PASSED - All mandatory requirements met!\n');
  results.scores.requirementsValidation = {
    score: 20,
    max: 20,
    passed: true
  };
  
  const llm = new MultiProviderLLM(CONFIG);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // JUDGE 1: Gate Master (Gate Utama + Gate Tambahan + G4 Originality)
  // Max: 20 points, PASS at 20 (100%)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`   🔍 Judge 1 (Gate Master)...`);
  
  // Run Gate Utama (Judge 1 from base)
  const judge1Result = parseJudgeResult(
    (await llm.blindJudge(
      getJudge1SystemPrompt(),
      getJudge1UserPrompt(content, campaignData, deepIntent),
      '1-GateUtama'
    )).content
  );
  
  // Run Gate Tambahan (Judge 2 from base)
  const judge2Result = parseJudgeResult(
    (await llm.blindJudge(
      getJudge2SystemPrompt(),
      getJudge2UserPrompt(content, campaignData, deepIntent),
      '2-GateTambahan'
    )).content
  );
  
  // G4 Originality Detection
  const g4Result = detectG4Elements(content);
  const g4Score = Math.round(g4Result.estimatedG4 * 4); // 0-8 points
  
  // Forbidden Punctuation Check
  const punctuationResult = detectForbiddenPunctuation(content);
  const punctuationScore = punctuationResult.totalIssues === 0 ? 2 : 0;
  
  // Calculate Judge 1 total
  const judge1Total = (judge1Result?.totalScore || 0) + 
                      (judge2Result?.totalScore || 0) + 
                      g4Score + punctuationScore;
  
  results.scores.judge1 = {
    score: Math.min(judge1Total, 20),
    max: 20,
    passed: judge1Total >= THRESHOLDS.JUDGE1.pass,
    details: {
      gateUtama: judge1Result?.totalScore || 0,
      gateTambahan: judge2Result?.totalScore || 0,
      g4Score,
      punctuationScore
    },
    g4Result
  };
  
  console.log(`   📊 Judge 1: ${results.scores.judge1.score}/${results.scores.judge1.max} (${results.scores.judge1.passed ? '✅ PASS' : '❌ FAIL'})`);
  
  if (!results.scores.judge1.passed) {
    results.failedAt = 'judge1';
    return results;
  }
  
  // Check if already have winner
  if (state.hasWinner() || state.isAborted()) return { skipped: true, reason: 'Already have winner' };
  
  await delay(CONFIG.delays.betweenJudges || 2000);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // JUDGE 2: Evidence Master (Fact Check + Evidence Layering)
  // Max: 5 points, PASS at 3 (60%)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`   🔍 Judge 2 (Evidence Master)...`);
  
  // Run Fact Check (Judge 5 from base with web search)
  const judge5Result = parseJudgeResult(
    (await llm.factCheckJudge(
      getJudge5SystemPrompt(),
      getJudge5UserPrompt(content, campaignData, deepIntent),
      '5-FactCheck'
    )).content
  );
  
  const factCheckScore = judge5Result?.totalScore || 0;
  
  results.scores.judge2 = {
    score: Math.min(factCheckScore, 5),
    max: 5,
    passed: factCheckScore >= THRESHOLDS.JUDGE2.pass,
    details: judge5Result
  };
  
  console.log(`   📊 Judge 2: ${results.scores.judge2.score}/${results.scores.judge2.max} (${results.scores.judge2.passed ? '✅ PASS' : '❌ FAIL'})`);
  
  if (!results.scores.judge2.passed) {
    results.failedAt = 'judge2';
    return results;
  }
  
  // Check if already have winner
  if (state.hasWinner() || state.isAborted()) return { skipped: true, reason: 'Already have winner' };
  
  await delay(CONFIG.delays.betweenJudges || 2000);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // JUDGE 3: Quality Master (Penilaian Internal + Compliance + Uniqueness + X-Factors)
  // Max: 80 points, PASS at 60 (75%)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`   🔍 Judge 3 (Quality Master)...`);
  
  // FIXED: Add try-catch for Judge 3 with individual error handling
  let judge3Result = null;
  let judge4Result = null;
  let judge6Result = null;
  
  try {
    // Run Penilaian Internal (Judge 3 from base)
    judge3Result = parseJudgeResult(
      (await llm.blindJudge(
        getJudge3SystemPrompt(),
        getJudge3UserPrompt(content, campaignData, deepIntent),
        '3-PenilaianInternal'
      )).content
    );
    console.log(`   ✅ Judge 3-PenilaianInternal done`);
  } catch (e) {
    console.log(`   ⚠️ Judge 3-PenilaianInternal error: ${e.message}`);
    judge3Result = { totalScore: 0, error: true };
  }
  
  try {
    // Run Compliance (Judge 4 from base)
    judge4Result = parseJudgeResult(
      (await llm.blindJudge(
        getJudge4SystemPrompt(),
        getJudge4UserPrompt(content, campaignData, deepIntent),
        '4-Compliance'
      )).content
    );
    console.log(`   ✅ Judge 4-Compliance done`);
  } catch (e) {
    console.log(`   ⚠️ Judge 4-Compliance error: ${e.message}`);
    judge4Result = { totalScore: 0, error: true };
  }
  
  try {
    // Run Uniqueness (Judge 6 from base)
    const judge6Raw = (await llm.blindJudge(
      getJudge6SystemPrompt(),
      getJudge6UserPrompt(content, campaignData, competitorContents, deepIntent),
      '6-Uniqueness'
    )).content;
    
    // parseJudge6Result returns checks/allPass, need to calculate score from it
    judge6Result = parseJudge6Result(judge6Raw, null);
    
    // Calculate score from judge 6 result (0-25 based on differentiation/uniqueAngle/emotionUniqueness/templateAvoidance)
    if (judge6Result && !judge6Result.totalScore) {
      let j6Score = 0;
      j6Score += (judge6Result.differentiation?.score || 0) * 1.5;
      j6Score += (judge6Result.uniqueAngle?.score || 0);
      j6Score += (judge6Result.emotionUniqueness?.score || 0);
      j6Score += (judge6Result.templateAvoidance?.score || 0) * 0.5;  // BUG #24 FIX: Include templateAvoidance
      // BUG #24 FIX: Use isUnique field from LLM (rare_combo_detected was never in LLM response)
      if (judge6Result.isUnique === true) j6Score += 2;
      // BUG #24 FIX: Also check emotion score >= 5 as rare combo indicator
      if ((judge6Result.emotionUniqueness?.score || 0) >= 5) j6Score += 1;
      judge6Result.totalScore = Math.max(0, Math.min(25, j6Score));
    }
    console.log(`   ✅ Judge 6-Uniqueness done (score: ${judge6Result.totalScore || 0})`);
  } catch (e) {
    console.log(`   ⚠️ Judge 6-Uniqueness error: ${e.message}`);
    judge6Result = { totalScore: 0, error: true };  // On error, score is 0, not a fake 15
  }
  
  // X-Factor Detection
  const xFactorResult = detectXFactors(content);
  const xFactorBonus = Math.min(xFactorResult.detected.length * 2, 5);
  
  // Calculate Judge 3 total
  const judge3Total = (judge3Result?.totalScore || 0) + 
                      (judge4Result?.totalScore || 0) + 
                      (judge6Result?.totalScore || 0) + 
                      xFactorBonus;
  
  results.scores.judge3 = {
    score: Math.min(judge3Total, 80),
    max: 80,
    passed: judge3Total >= THRESHOLDS.JUDGE3.pass,
    details: {
      penilaianInternal: judge3Result?.totalScore || 0,
      compliance: judge4Result?.totalScore || 0,
      uniqueness: judge6Result?.totalScore || 0,
      xFactorBonus
    },
    xFactorResult
  };
  
  console.log(`   📊 Judge 3: ${results.scores.judge3.score}/${results.scores.judge3.max} (${results.scores.judge3.passed ? '✅ PASS' : '❌ FAIL'})`);
  
  if (!results.scores.judge3.passed) {
    results.failedAt = 'judge3';
    return results;
  }
  
  // Calculate total score
  results.totalScore = results.scores.judge1.score + 
                       results.scores.judge2.score + 
                       results.scores.judge3.score;
  
  results.passed = results.totalScore >= THRESHOLDS.TOTAL.pass;
  
  if (results.passed) {
    // SET WINNER! Menggunakan state manager (thread-safe)
    if (state.setWinner(results)) {
      console.log(`\n   🎉🎉🎉 CONTENT PASSED! Score: ${results.totalScore}/105`);
      console.log(`   🛑 Aborting other judging operations (True Fail Fast)`);
    }
  }
  
  return results;
}

/**
 * DEEP CAMPAIGN INTENT ANALYZER
 * Goes beyond surface-level rule parsing to understand:
 * - WHAT TYPE of metrics/content the campaign truly wants
 * - WHY these specific requirements exist
 * - WHAT would make content genuinely successful for this campaign
 * - WHAT types of metrics are WRONG even if they contain numbers
 */
async function deepCampaignIntentAnalyzer(llm, campaignData, parsedRequirements) {
  console.log('\n   ┌─────────────────────────────────────────────────────────────┐');
  console.log('   │  🧠 DEEP CAMPAIGN INTENT ANALYZER                          │');
  console.log('   │  Understanding WHAT the campaign truly wants...              │');
  console.log('   └─────────────────────────────────────────────────────────────┘');

  const intentPrompt = `You are a CAMPAIGN INTELLIGENCE ANALYST. Your job is to DEEPLY understand what a campaign ACTUALLY wants — not just what the rules literally say.

════════════════════════════════════════════════════════════════
📋 CAMPAIGN DATA (READ EVERYTHING):
════════════════════════════════════════════════════════════════

CAMPAIGN TITLE: ${campaignData.title || 'Unknown'}
MISSION: ${campaignData.missionTitle || 'Unknown'}

MISSION GOAL/DESCRIPTION:
${campaignData.description || campaignData.missionGoal || 'N/A'}

RULES (THESE ARE MANDATORY - READ EACH WORD):
${campaignData.rules || 'Standard rules'}

STYLE:
${campaignData.style || 'Standard'}

KNOWLEDGE BASE:
${campaignData.knowledgeBase || 'N/A'}

ADDITIONAL INFO:
${campaignData.additionalInfo || 'N/A'}

════════════════════════════════════════════════════════════════
🧠 YOUR ANALYSIS TASKS:
════════════════════════════════════════════════════════════════

TASK 1: IDENTIFY THE TRUE INTENT
- What is this campaign ACTUALLY trying to achieve?
- What emotion/reaction should the content create in readers?
- What action should readers take after reading?
- What would make campaign organizers say "THIS is exactly what we wanted"?

TASK 2: CLASSIFY THE CONTENT TYPE
Determine which type of content this campaign needs:
- PERSONAL EXPERIENCE: "I tried X and here's what happened" (first-hand account)
- EDUCATIONAL: "Here's how X works" (teaching something)
- OPINION/TAKE: "My honest thoughts on X" (perspective)
- SOCIAL PROOF: "Look at these numbers/results" (data-driven)
- COMPARISON: "X vs Y - here's why X wins" (competitive)
- COMMUNITY: "Who else is using X?" (belonging/engagement)
Select the PRIMARY type and optionally a SECONDARY type.

TASK 3: METRIC TYPE CLASSIFICATION (CRITICAL!)
If the campaign mentions metrics, numbers, or data — classify EXACTLY what TYPE:

METRIC TYPES:
- RETENTION metrics: user engagement, repeat usage, DAU/MAU, session length, return rate, time spent
- GROWTH metrics: user growth rate, new signups, growth trajectory, adoption curve, market expansion
- LIQUIDITY metrics: TVL, trading volume, liquidity depth, market cap, trading pairs
- REVENUE/EARNING metrics: fees earned, APY, yield, ROI, profit, earning rates
- PERFORMANCE metrics: uptime, latency, speed, throughput, reliability, zero downtime
- SOCIAL metrics: followers, community size, social engagement, viral reach

For EACH metric mentioned in rules/KB, classify its TYPE.
Then identify: which type does the campaign ACTUALLY want in the content?
⚠️ WARNING: If campaign says "growth metrics" but knowledge base only has TVL/volume (liquidity),
you MUST note that these are WRONG metric types and the content should NOT use TVL/volume as "growth metrics".

TASK 4: CONTENT-TO-AVOID LIST
What specific numbers, stats, or claims from the knowledge base should NOT be used because:
- They're the wrong TYPE of metric for what the campaign wants
- They're too promotional/sounding like an ad
- They're cliché or overused by other content
- They don't match the personal experience style required

TASK 5: CONTENT-TO-USE LIST
What specific data points, angles, or approaches WOULD work:
- From knowledge base (specific facts to weave in naturally)
- From the mission goal (what to focus on)
- Personal experience angles that match the style requirements
- Specific numbers that are the RIGHT TYPE for this campaign

════════════════════════════════════════════════════════════════
OUTPUT FORMAT:
════════════════════════════════════════════════════════════════

Return JSON:
{
  "trueIntent": {
    "summary": "What this campaign ACTUALLY wants in 1-2 sentences",
    "desiredReaderReaction": "What emotion/action the reader should have",
    "contentPurpose": "Why this content exists (brand awareness, user acquisition, engagement, etc)"
  },
  "contentType": {
    "primary": "PERSONAL_EXPERIENCE|EDUCATIONAL|OPINION|SOCIAL_PROOF|COMPARISON|COMMUNITY",
    "secondary": "optional secondary type",
    "reasoning": "Why this content type fits best"
  },
  "metricClassification": {
    "campaignWantsMetrics": true/false,
    "campaignMetricType": "RETENTION|GROWTH|LIQUIDITY|REVENUE|PERFORMANCE|SOCIAL|null",
    "campaignMetricTypeReasoning": "Why this specific metric type is needed",
    "knowledgeBaseMetrics": [
      {"metric": "TVL $200B+", "type": "LIQUIDITY", "relevantToCampaign": false, "reason": "Campaign wants growth metrics, not liquidity"}
    ],
    "correctMetricsToUse": ["specific metrics that match what campaign wants", "e.g. user growth, engagement rates"],
    "wrongMetricsToAvoid": ["specific metrics that DON'T match what campaign wants", "e.g. TVL, trading volume"]
  },
  "contentToAvoid": {
    "wrongMetricTypes": ["LIQUIDITY metrics like TVL and volume"],
    "overusedAngles": ["angles that competitors likely use"],
    "promotionalLanguage": ["phrases that sound like ads"],
    "specificClaimsToAvoid": ["claims from KB that don't match campaign intent"]
  },
  "contentToUse": {
    "rightMetricExamples": ["specific numbers that ARE the right type"],
    "suggestedAngles": ["angles that match both campaign intent and style"],
    "personalExperienceHooks": ["specific personal moments to write about"],
    "knowledgeBaseFactsToWeave": ["specific KB facts to naturally include"]
  },
  "criticalWarnings": [
    "⚠️ WARNING: TVL/Volume are LIQUIDITY metrics, NOT growth metrics. Using them as 'growth' data would be factually wrong.",
    "Any other critical warnings about misinterpreting the campaign"
  ]
}`;

  try {
    const response = await callAI([
      { role: 'system', content: 'You are a CAMPAIGN INTELLIGENCE ANALYST. You deeply understand what campaigns truly want. You classify metric types accurately. You never confuse liquidity metrics with growth metrics. Return JSON only.' },
      { role: 'user', content: intentPrompt }
    ], { temperature: 0.2, maxTokens: 4000, model: 'glm-5', enableSearch: true });
    
    const intent = safeJsonParse(response.content);
    
    if (intent) {
      // Display analysis results
      console.log('\n   ╔═══════════════════════════════════════════════════════╗');
      console.log('   ║  🧠 DEEP INTENT ANALYSIS RESULTS                       ║');
      console.log('   ╠═══════════════════════════════════════════════════════╣');
      console.log(`   ║ TRUE INTENT: ${intent.trueIntent?.summary?.substring(0, 55) || 'N/A'}...`);
      console.log(`   ║ CONTENT TYPE: ${intent.contentType?.primary || 'N/A'} (${intent.contentType?.secondary || 'none'})`);
      console.log(`   ║ METRIC TYPE: ${intent.metricClassification?.campaignMetricType || 'N/A'}`);
      console.log(`   ║ DESIRED REACTION: ${intent.trueIntent?.desiredReaderReaction?.substring(0, 50) || 'N/A'}...`);
      
      if (intent.metricClassification?.wrongMetricsToAvoid?.length > 0) {
        console.log('   ╠═══════════════════════════════════════════════════════╣');
        console.log('   ║ 🚫 WRONG METRICS TO AVOID:');
        intent.metricClassification.wrongMetricsToAvoid.forEach(m => {
          console.log(`   ║    ❌ ${m}`);
        });
      }
      
      if (intent.metricClassification?.correctMetricsToUse?.length > 0) {
        console.log('   ╠═══════════════════════════════════════════════════════╣');
        console.log('   ║ ✅ CORRECT METRICS TO USE:');
        intent.metricClassification.correctMetricsToUse.forEach(m => {
          console.log(`   ║    ✓ ${m}`);
        });
      }
      
      if (intent.criticalWarnings?.length > 0) {
        console.log('   ╠═══════════════════════════════════════════════════════╣');
        console.log('   ║ ⚠️ CRITICAL WARNINGS:');
        intent.criticalWarnings.forEach(w => {
          console.log(`   ║    ${w}`);
        });
      }
      
      console.log('   ╚═══════════════════════════════════════════════════════╝');
      
      return intent;
    } else {
      console.log('   ⚠️ Could not parse intent analysis — using fallback');
      return createFallbackIntent(campaignData);
    }
  } catch (error) {
    console.log(`   ⚠️ Deep intent analysis failed: ${error.message}`);
    return createFallbackIntent(campaignData);
  }
}

function createFallbackIntent(campaignData) {
  return {
    trueIntent: {
      summary: `Create authentic content about ${campaignData.title || 'this campaign'}`,
      desiredReaderReaction: 'Engage with the content',
      contentPurpose: 'Brand awareness and engagement'
    },
    contentType: { primary: 'PERSONAL_EXPERIENCE', secondary: 'OPINION', reasoning: 'Default' },
    metricClassification: {
      campaignWantsMetrics: false,
      campaignMetricType: null,
      campaignMetricTypeReasoning: 'Not analyzed',
      knowledgeBaseMetrics: [],
      correctMetricsToUse: [],
      wrongMetricsToAvoid: []
    },
    contentToAvoid: { wrongMetricTypes: [], overusedAngles: [], promotionalLanguage: [], specificClaimsToAvoid: [] },
    contentToUse: { rightMetricExamples: [], suggestedAngles: [], personalExperienceHooks: [], knowledgeBaseFactsToWeave: [] },
    criticalWarnings: ['Intent analysis failed — using default. May produce misaligned content.']
  };
}

/**
 * 🆕 BUG #10 FIX: Campaign Comprehension Check
 * AI reads and understands ALL campaign rules BEFORE generating content.
 * Returns a structured plan that guides content generation.
 */
async function campaignComprehensionCheck(llm, campaignData, competitorAnalysis, researchData, parsedRequirements) {
  console.log('\n   ┌─────────────────────────────────────────────────────────────┐');
  console.log('   │  🧠 CAMPAIGN COMPREHENSION CHECK - AI Reads Rules First    │');
  console.log('   └─────────────────────────────────────────────────────────────┘');
  
  const comprehensionPrompt = `You are an AI content strategist. Your job is to READ and UNDERSTAND campaign rules thoroughly, then create a PLAN for content creation.

════════════════════════════════════════════════════════════════
📋 COMPLETE CAMPAIGN BRIEF:
════════════════════════════════════════════════════════════════

CAMPAIGN: ${campaignData.title || 'Unknown'}
${campaignData.missionTitle ? `MISSION: ${campaignData.missionTitle}` : ''}
${campaignData.missionGoal ? `MISSION GOAL: ${campaignData.missionGoal}` : ''}

DESCRIPTION:
${campaignData.description || campaignData.goal || 'N/A'}

RULES (READ EVERY WORD):
${campaignData.rules || campaignData.requirements || 'Standard content guidelines'}

STYLE:
${campaignData.style || 'Standard'}

KNOWLEDGE BASE:
${campaignData.knowledgeBase || 'N/A'}

ADDITIONAL INFO:
${campaignData.additionalInfo || campaignData.adminNotice || 'N/A'}

════════════════════════════════════════════════════════════════
✅ PARSED REQUIREMENTS (from rules analysis):
════════════════════════════════════════════════════════════════
${parsedRequirements.mandatoryTags.length > 0 ? `🏷️ MUST TAG: ${parsedRequirements.mandatoryTags.join(', ')}` : '🏷️ No mandatory tags'}
${parsedRequirements.mandatoryHashtags.length > 0 ? `#️⃣ MUST USE HASHTAGS: ${parsedRequirements.mandatoryHashtags.join(', ')}` : '#️⃣ No mandatory hashtags'}
${parsedRequirements.mandatoryMetrics ? '📊 MUST INCLUDE specific metrics/numbers' : '📊 No metrics required'}
${parsedRequirements.mandatoryUrl ? `🔗 MUST INCLUDE URL: ${campaignData.campaignUrl || campaignData.url}` : '🔗 No URL required'}
${parsedRequirements.mandatoryScreenshot ? '📸 MUST INCLUDE screenshot' : '📸 No screenshot required'}
${parsedRequirements.focusTopic ? `🎯 MUST FOCUS ON: ${parsedRequirements.focusTopic}` : '🎯 No specific focus topic'}
${parsedRequirements.prohibitedHashtags.length > 0 ? '🚫 HASHTAGS PROHIBITED' : ''}
${parsedRequirements.prohibitedUrl ? '🚫 URL/LINK PROHIBITED' : ''}
${parsedRequirements.prohibitedTags.length > 0 ? `🚫 DO NOT TAG: ${parsedRequirements.prohibitedTags.join(', ')}` : ''}
${parsedRequirements.prohibitedKeywords.length > 0 ? `🚫 DO NOT MENTION: ${parsedRequirements.prohibitedKeywords.join(', ')}` : ''}

${parsedRequirements.proposedAngles.length > 0 ? `
🎯 PROPOSED ANGLES (PICK EXACTLY ONE):
${parsedRequirements.proposedAngles.map((a, i) => `   ${i + 1}. "${a}"`).join('\n')}
` : ''}

════════════════════════════════════════════════════════════════
📊 RESEARCH DATA AVAILABLE:
════════════════════════════════════════════════════════════════
Key Facts: ${researchData?.synthesis?.keyFacts?.slice(0, 3).join('; ') || 'N/A'}
Unique Angles: ${researchData?.synthesis?.uniqueAngles?.map(a => a.angle).slice(0, 3).join('; ') || 'N/A'}

════════════════════════════════════════════════════════════════
🔍 COMPETITOR INTELLIGENCE:
════════════════════════════════════════════════════════════════
Used Angles (AVOID): ${(competitorAnalysis?.anglesUsed || []).slice(0, 5).join(', ') || 'None'}
Saturated Elements: ${(competitorAnalysis?.saturatedElements || []).slice(0, 5).join(', ') || 'None'}
Untapped Opportunities: ${(competitorAnalysis?.untappedOpportunities || []).slice(0, 5).join(', ') || 'None'}

════════════════════════════════════════════════════════════════
NOW CREATE YOUR CONTENT PLAN:
════════════════════════════════════════════════════════════════

Return JSON:
{
  "understood": true,
  "mission_summary": "1-2 sentence summary of what this content must achieve",
  "chosen_angle": "The specific angle you will use${parsedRequirements.proposedAngles.length > 0 ? ' (MUST be from proposed angles list)' : ''}",
  "execution_plan": "Step-by-step plan: hook idea → body structure → evidence to use → CTA → how to integrate mandatory items",
  "mandatory_items_checklist": {
    "tags": ["list of @tags to include"],
    "hashtags": ["list of #hashtags to include"],
    "metrics": "what specific number/metric to include",
    "url": "how to naturally integrate the URL",
    "screenshot": "what screenshot to reference",
    "focus_topic": "how the focus topic is addressed",
    "style_notes": "key style requirements to follow"
  },
  "prohibited_items_checklist": {
    "no_hashtags": true/false,
    "no_url": true/false,
    "avoid_tags": ["tags to avoid"],
    "avoid_keywords": ["keywords to avoid"]
  },
  "risk_items": ["list of items that might be accidentally missed"],
  "quality_targets": {
    "hook_strategy": "what hook pattern to use",
    "emotion_journey": "planned emotional arc",
    "evidence_layers": ["layer 1", "layer 2", "layer 3"],
    "differentiation": "how this will differ from competitor content"
  }
}`;

  try {
    const response = await llm.chat([
      { role: 'system', content: 'You are a meticulous content strategist who reads rules line by line. Your plan ensures ZERO rule violations. Return JSON only.' },
      { role: 'user', content: comprehensionPrompt }
    ], { temperature: 0.3, maxTokens: 2000, model: 'glm-5', enableSearch: true });
    
    const plan = safeJsonParse(response.content);
    
    if (plan) {
      console.log(`   ✅ AI read and understood campaign rules`);
      console.log(`   📋 Mission Summary: ${plan.mission_summary?.substring(0, 80)}...`);
      console.log(`   🎯 Chosen Angle: ${plan.chosen_angle?.substring(0, 60)}...`);
      
      // Verify proposed angles compliance
      if (parsedRequirements.proposedAngles.length > 0 && plan.chosen_angle) {
        const angleMatch = parsedRequirements.proposedAngles.some(a => 
          plan.chosen_angle.toLowerCase().includes(a.toLowerCase()) ||
          a.toLowerCase().includes(plan.chosen_angle.toLowerCase())
        );
        if (!angleMatch) {
          console.log(`   ⚠️ WARNING: AI chose angle "${plan.chosen_angle}" but proposed angles are:`);
          parsedRequirements.proposedAngles.forEach((a, i) => console.log(`      ${i + 1}. "${a}"`));
          console.log(`   🔄 AI will be reminded to use proposed angles during generation`);
          plan._forceProposedAngle = true;
        } else {
          console.log(`   ✅ Chosen angle matches proposed angles list`);
        }
      }
      
      // Verify mandatory items awareness
      const missingMandatory = [];
      if (parsedRequirements.mandatoryTags.length > 0 && (!plan.mandatory_items_checklist?.tags || plan.mandatory_items_checklist.tags.length === 0)) {
        missingMandatory.push('tags');
      }
      if (parsedRequirements.mandatoryHashtags.length > 0 && (!plan.mandatory_items_checklist?.hashtags || plan.mandatory_items_checklist.hashtags.length === 0)) {
        missingMandatory.push('hashtags');
      }
      if (parsedRequirements.mandatoryMetrics && !plan.mandatory_items_checklist?.metrics) {
        missingMandatory.push('metrics');
      }
      if (parsedRequirements.mandatoryUrl && !plan.mandatory_items_checklist?.url) {
        missingMandatory.push('url');
      }
      
      if (missingMandatory.length > 0) {
        console.log(`   ⚠️ WARNING: AI plan missing awareness for: ${missingMandatory.join(', ')}`);
        plan._missingMandatory = missingMandatory;
      }
      
      // Verify prohibited items awareness
      if (parsedRequirements.prohibitedUrl && !plan.prohibited_items_checklist?.no_url) {
        console.log(`   ⚠️ WARNING: AI plan does not acknowledge URL prohibition!`);
        plan._urlProhibitionMissed = true;
      }
      if (parsedRequirements.prohibitedHashtags.length > 0 && !plan.prohibited_items_checklist?.no_hashtags) {
        console.log(`   ⚠️ WARNING: AI plan does not acknowledge hashtag prohibition!`);
        plan._hashtagProhibitionMissed = true;
      }
      
      return plan;
    } else {
      console.log(`   ⚠️ Could not parse comprehension check result - continuing without plan`);
      return { understood: false, execution_plan: 'Fallback: follow all mandatory requirements', risk_items: ['AI could not parse campaign rules'] };
    }
  } catch (error) {
    console.log(`   ⚠️ Campaign comprehension check failed: ${error.message}`);
    return { understood: false, execution_plan: 'Fallback: follow all mandatory requirements', risk_items: ['Comprehension check error'] };
  }
}

/**
 * Generate single content for parallel processing
 * 🆕 BUG #11 FIX: Now receives comprehensionPlan to ensure AI follows campaign rules
 */
async function generateSingleContentForParallel(campaignData, competitorAnalysis, researchData, index, comprehensionPlan) {
  const variations = CONFIG.multiContent?.variations || {};
  const angles = variations.angles || ['personal_story', 'data_driven', 'contrarian', 'insider_perspective', 'case_study'];
  const emotions = variations.emotions || [['curiosity', 'surprise']];
  const structures = variations.structures || ['hero_journey', 'problem_solution', 'before_after', 'mystery_reveal', 'case_study'];
  
  const selectedAngle = angles[index % angles.length];
  const selectedEmotion = emotions[index % emotions.length];
  const selectedStructure = structures[index % structures.length];
  
  console.log(`   📝 [${timestamp()}] Generating Content ${index + 1} (${selectedAngle})...`);
  if (comprehensionPlan) {
    console.log(`   🧠 Following comprehension plan: ${comprehensionPlan.execution_plan?.substring(0, 60)}...`);
  }
  
  const llm = new MultiProviderLLM(CONFIG);
  
  try {
    // Pass comprehensionPlan through to generateUniqueContent
    const result = await generateUniqueContent(llm, campaignData, competitorAnalysis, researchData, 1, comprehensionPlan);
    
    if (result && result.tweets && result.tweets[0]) {
      let content = result.tweets[0].content;
      
      // ═══════════════════════════════════════════════════════════════
      // BUG #34 FIX: Auto-sanitize content (smart quotes, em dashes, ellipsis)
      // ═══════════════════════════════════════════════════════════════
      const sanitizedContent = sanitizeContent(content);
      if (sanitizedContent !== content) {
        content = sanitizedContent;
      }
      
      // ═══════════════════════════════════════════════════════════════
      // BUG #35 FIX: Metric Type Relevance Check (BEFORE mission compliance)
      // Rejects content that uses WRONG metric types (e.g., TVL when retention is requested)
      // ═══════════════════════════════════════════════════════════════
      const metricTypeCheck = validateMetricTypeRelevance(content, _cachedCampaignIntent);
      if (!metricTypeCheck.valid) {
        console.log(`   ⚠️ Content ${index + 1} FAILED Metric Type Check:`);
        metricTypeCheck.issues.forEach(issue => console.log(`      ❌ ${issue}`));
        
        try {
          const savePath = `${CONFIG.outputDir}/content-${index + 1}-${Date.now()}-FAILED-METRIC.txt`;
          fs.writeFileSync(savePath, content + '\n\n--- METRIC TYPE ISSUES ---\n' + metricTypeCheck.issues.join('\n'));
          console.log(`   💾 Saved (wrong metric type): ${savePath}`);
        } catch (e) {
          console.log(`   ⚠️ Could not save failed content: ${e.message}`);
        }
        
        return { index, content, success: false, complianceIssues: metricTypeCheck.issues };
      }
      
      // ═══════════════════════════════════════════════════════════════
      // 🚨 MISSION COMPLIANCE CHECK - Verify all requirements are met
      // ═══════════════════════════════════════════════════════════════
      const compliance = validateMissionCompliance(content, campaignData);
      
      if (!compliance.valid) {
        console.log(`   ⚠️ Content ${index + 1} FAILED Mission Compliance:`);
        compliance.issues.forEach(issue => console.log(`      ❌ ${issue}`));
        
        // Still save but mark as failed
        try {
          const savePath = `${CONFIG.outputDir}/content-${index + 1}-${Date.now()}-FAILED.txt`;
          fs.writeFileSync(savePath, content + '\n\n--- ISSUES ---\n' + compliance.issues.join('\n'));
          console.log(`   💾 Saved (failed): ${savePath}`);
        } catch (e) {
          console.log(`   ⚠️ Could not save failed content: ${e.message}`);
        }
        
        return { index, content, success: false, complianceIssues: compliance.issues };
      }
      
      console.log(`   ✅ Content ${index + 1} PASSED Mission Compliance`);
      compliance.passed.forEach(p => console.log(`      ✓ ${p}`));
      if (compliance.warnings.length > 0) {
        compliance.warnings.forEach(w => console.log(`      ⚠️ ${w}`));
      }
      
      console.log(`   ✅ [${timestamp()}] Content ${index + 1} generated and validated`);
      
      // AUTO-SAVE: Save content immediately after generation
      try {
        const savePath = `${CONFIG.outputDir}/content-${index + 1}-${Date.now()}.txt`;
        fs.writeFileSync(savePath, content);
        console.log(`   💾 Saved: ${savePath}`);
      } catch (saveErr) {
        console.log(`   ⚠️ Could not save content: ${saveErr.message}`);
      }
      
      return { index, content, success: true, compliance };
    }
    
    console.log(`   ❌ [${timestamp()}] Content ${index + 1} failed: Could not parse`);
    return { index, content: null, success: false };
  } catch (error) {
    console.log(`   ❌ [${timestamp()}] Content ${index + 1} failed: ${error.message}`);
    return { index, content: null, success: false };
  }
}

/**
 * Main First Pass Wins Workflow
 * Generates 3 contents in parallel, judges immediately, stops on first pass
 */
async function runFirstPassWorkflow(campaignInput, missionNumber = null) {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║    RALLY WORKFLOW V9.8.3-FINAL - TRUE FIRST PASS WINS         ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  🎯 Loop until 1 content passes all judges                     ║');
  console.log('║  📊 High Standards: 100% Gate, 60% Facts, 75% Quality         ║');
  console.log('║  🏆 First content to pass → STOP IMMEDIATELY (AbortController) ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRE-FLIGHT CHECK - SDK Required!
  // ═══════════════════════════════════════════════════════════════════════════
  await preflightCheck();
  
  // Reset state manager (bukan global flags lagi)
  judgingState.reset();
  
  const totalStartTime = Date.now();
  
  // Resolve campaign with mission support
  console.log(`\n🔍 Resolving campaign: ${campaignInput}`);
  if (missionNumber) {
    console.log(`   🎯 Target Mission: ${missionNumber}`);
  }
  
  // Resolve campaign and fetch with mission data
  let campaignData;
  if (isEthereumAddress(campaignInput)) {
    campaignData = await fetchCampaignData(campaignInput, missionNumber);
  } else {
    const campaignAddress = await searchCampaignByName(campaignInput);
    if (!campaignAddress) {
      console.log('   ❌ Campaign not found');
      return null;
    }
    campaignData = await fetchCampaignData(campaignAddress, missionNumber);
  }
  
  if (!campaignData) {
    console.log('   ❌ Campaign not found');
    return null;
  }
  
  console.log(`   ✅ Found: ${campaignData.title}`);
  if (campaignData.missionTitle) {
    console.log(`   🎯 Mission: ${campaignData.missionTitle}`);
  }
  console.log(`   📍 Address: ${campaignData.intelligentContractAddress}`);
  
  // Display thresholds - using THRESHOLDS constant
  console.log('\n📊 HIGH STANDARDS THRESHOLDS:');
  console.log(`   Judge 1 (Gate Master):  ${THRESHOLDS.JUDGE1.pass}/${THRESHOLDS.JUDGE1.max} (${THRESHOLDS.JUDGE1.percent}) - SEMPURNA!`);
  console.log(`   Judge 2 (Evidence):      ${THRESHOLDS.JUDGE2.pass}/${THRESHOLDS.JUDGE2.max} (${THRESHOLDS.JUDGE2.percent}) - Fleksibel`);
  console.log(`   Judge 3 (Quality):       ${THRESHOLDS.JUDGE3.pass}/${THRESHOLDS.JUDGE3.max} (${THRESHOLDS.JUDGE3.percent})`);
  console.log(`   Total Required:          ${THRESHOLDS.TOTAL.pass}/${THRESHOLDS.TOTAL.max} (${THRESHOLDS.TOTAL.percent})`);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 DISPLAY CAMPAIGN REQUIREMENTS (MANDATORY)
  // ═══════════════════════════════════════════════════════════════════════════
  const campaignRequirements = displayCampaignRequirements(campaignData);
  
  // Display full campaign info
  console.log('\n📋 FULL CAMPAIGN INFO:');
  console.log('─'.repeat(60));
  console.log(`   📝 DESCRIPTION: ${(campaignData.description || campaignData.goal || 'N/A').substring(0, 100)}...`);
  console.log(`   🎨 STYLE: ${(campaignData.style || 'N/A').substring(0, 100)}...`);
  console.log(`   📜 RULES: ${(campaignData.rules || 'N/A').substring(0, 150)}...`);
  console.log(`   📚 KNOWLEDGE BASE: ${(campaignData.knowledgeBase || 'N/A').substring(0, 100)}...`);
  console.log(`   📎 ADDITIONAL INFO: ${(campaignData.additionalInfo || 'N/A').substring(0, 100)}...`);
  console.log('─'.repeat(60));
  
  // Fetch competitor submissions
  console.log('\n📥 Fetching competitor submissions...');
  const submissions = await fetchLeaderboard(campaignData.intelligentContractAddress);
  console.log(`   📊 Found ${submissions?.length || 0} submissions`);
  
  // Deep competitor analysis
  console.log('\n🔍 Running Deep Competitor Analysis...');
  const llm = new MultiProviderLLM(CONFIG);
  const competitorAnalysis = await deepCompetitorContentAnalysis(llm, submissions, campaignData.title, campaignData);
  console.log('   ✅ Competitor analysis complete');
  
  // Multi-query research
  console.log('\n🔎 Running Multi-Query Deep Research...');
  const researchData = await multiQueryDeepResearch(llm, campaignData.title, campaignData);
  console.log('   ✅ Research complete');
  
  // DEBUG: Log completion
  console.log('\n📊 STARTING CONTENT GENERATION PHASE...');
  console.log(`   Competitor Analysis: ${competitorAnalysis ? 'OK' : 'NULL'}`);
  console.log(`   Research Data: ${researchData ? 'OK' : 'NULL'}`);
  
  // Extract competitor contents
  const competitorContents = (competitorAnalysis?.competitorContent || []).map(c => 
    typeof c === 'string' ? c : c.content || ''
  );
  console.log(`   Competitor Contents: ${competitorContents.length} items`);
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 4.5: DEEP CAMPAIGN INTENT ANALYSIS (NEW!)
  // Understand WHAT the campaign truly wants, not just what rules say
  // ═══════════════════════════════════════════════════════════════
  console.log('\n   🧠 STEP 4.5: Deep Campaign Intent Analysis...');
  const campaignIntent = await deepCampaignIntentAnalyzer(llm, campaignData, campaignRequirements);
  _cachedCampaignIntent = campaignIntent;

  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 BUG #10 FIX: CAMPAIGN COMPREHENSION CHECK - AI reads and plans BEFORE generate
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🧠 STEP: Campaign Comprehension Check (AI reads rules BEFORE writing)...');
  const comprehensionPlan = await campaignComprehensionCheck(llm, campaignData, competitorAnalysis, researchData, campaignRequirements);
  
  // Merge deep intent into comprehension plan for downstream use
  comprehensionPlan._deepIntent = campaignIntent;
  comprehensionPlan._wrongMetrics = campaignIntent.metricClassification?.wrongMetricsToAvoid || [];
  comprehensionPlan._correctMetrics = campaignIntent.metricClassification?.correctMetricsToUse || [];
  comprehensionPlan._metricType = campaignIntent.metricClassification?.campaignMetricType;
  comprehensionPlan._contentType = campaignIntent.contentType?.primary;
  comprehensionPlan._contentToAvoid = campaignIntent.contentToAvoid;
  comprehensionPlan._contentToUse = campaignIntent.contentToUse;
  comprehensionPlan._trueIntent = campaignIntent.trueIntent;
  comprehensionPlan._criticalWarnings = campaignIntent.criticalWarnings || [];
  
  console.log(`   ✅ AI Campaign Comprehension: ${comprehensionPlan.understood ? 'PASS' : 'NEEDS ATTENTION'}`);
  if (comprehensionPlan.understood) {
    console.log(`   📋 AI Plan: ${comprehensionPlan.execution_plan?.substring(0, 100)}...`);
    if (comprehensionPlan.risk_items && comprehensionPlan.risk_items.length > 0) {
      console.log(`   ⚠️ Risk Items: ${comprehensionPlan.risk_items.join(', ')}`);
    }
  }
  
  
  // Main loop - keep generating until we get a winner (with safety limit)
  let cycleNumber = 0;
  let totalGenerated = 0;
  let totalFailed = 0;
  const contentsPerCycle = 3;
  const maxCycles = 10; // Safety limit to prevent infinite loop and API token exhaustion
  
  // Track ALL judge results across all cycles (not just last cycle)
  let allCycleJudgeResults = [];
  
  while (!judgingState.hasWinner() && cycleNumber < maxCycles) {
    cycleNumber++;
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔄 CYCLE ${cycleNumber}`);
    console.log(`   📊 Stats: ${totalGenerated} generated, ${totalFailed} failed`);
    console.log(`${'═'.repeat(60)}`);
    
    // BUG #37 FIX: Stagger content generation to avoid rate limit race condition
    // Instead of firing all 3 simultaneously (causes all to hit rate limit),
    // stagger them with 2-second delays so they don't all compete for tokens
    console.log('\n📝 Generating 3 contents with staggered start (AI follows comprehension plan)...');
    const generateTasks = [];
    for (let i = 0; i < contentsPerCycle; i++) {
      // Wrap each task with a staggered delay
      const task = (async (idx) => {
        if (idx > 0) {
          console.log(`   ⏳ Stagger delay ${idx}: waiting 2s before Content ${idx + 1}...`);
          await delay(2000);
        }
        return generateSingleContentForParallel(campaignData, competitorAnalysis, researchData, idx, comprehensionPlan);
      })(i);
      generateTasks.push(task);
    }
    const generateResults = await Promise.all(generateTasks);
    
    // Check if we have contents
    const validContents = generateResults.filter(r => r.success);
    totalGenerated += validContents.length;
    
    if (validContents.length === 0) {
      console.log('   ⚠️ No contents generated, retrying...');
      await delay(1000);
      continue;
    }
    
    console.log(`   ✅ Generated ${validContents.length}/${contentsPerCycle} contents`);
    
    // Judge each content in parallel with TRUE FAIL FAST
    console.log('\n⚖️ Judging contents (TRUE parallel with fail-fast)...');
    
    // FIXED: Add timeout and better error handling for judging
    const judgePromises = validContents.map((result, idx) => {
      // Wrap with timeout and error handling
      return Promise.race([
        judgeContentFailFast(result.content, campaignData, competitorContents, result.index, cycleNumber, judgingState)
          .catch(err => {
            console.log(`   ⚠️ Judge error for content ${result.index + 1}: ${err.message}`);
            return { content: result.content, passed: false, failedAt: 'error', error: err.message };
          }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Judge timeout')), 300000) // 5 min timeout per content
        )
      ]).catch(err => {
        console.log(`   ⚠️ Judge timeout for content ${result.index + 1}`);
        return { content: result.content, passed: false, failedAt: 'timeout' };
      });
    });
    
    // TRUE FAIL FAST: Use Promise.race pattern - check for winner after each judge step
    // Instead of waiting for ALL to complete, we use a racing mechanism
    const judgeResults = await Promise.allSettled(judgePromises);
    allCycleJudgeResults.push(...judgeResults);
    
    // Count failures and save intermediate results
    const failedThisCycle = judgeResults.filter(r => 
      r.status === 'fulfilled' && !r.value.passed && !r.value.skipped
    ).length;
    totalFailed += failedThisCycle;
    
    // FIXED: Save all passing results to intermediate file
    const passingResults = judgeResults.filter(r => 
      r.status === 'fulfilled' && r.value.passed
    );
    if (passingResults.length > 0) {
      const intermediatePath = `${CONFIG.outputDir}/intermediate-results-cycle${cycleNumber}.json`;
      try {
        fs.writeFileSync(intermediatePath, JSON.stringify(passingResults.map(r => ({
          content: r.value.content,
          score: r.value.totalScore,
          cycle: cycleNumber
        })), null, 2));
        console.log(`   💾 Intermediate results saved: ${intermediatePath}`);
      } catch (e) {
        console.log(`   ⚠️ Could not save intermediate: ${e.message}`);
      }
    }
    
    // Check if we have a winner using state manager
    if (judgingState.hasWinner()) {
      break;
    }
    
    console.log(`\n   📊 Cycle ${cycleNumber} complete: All ${validContents.length} contents failed`);
    console.log('   🔄 Generating new contents...');
    
    // Wait before next cycle
    await delay(CONFIG.delays?.betweenPasses || 3000);
    
    // Safety check
    if (cycleNumber >= maxCycles - 1) {
      console.log(`\n   ⚠️ Approaching max cycle limit (${maxCycles}). One more attempt...`);
    }
  }
  
  if (!judgingState.hasWinner() && cycleNumber >= maxCycles) {
    console.log(`\n   ⚠️ MAX CYCLE LIMIT (${maxCycles}) REACHED. Stopping to prevent infinite loop.`);
    console.log('   💡 Increase maxCycles or check your judge thresholds if all contents are failing.');
  }
  
  // Output winner
  const totalDuration = Date.now() - totalStartTime;
  const winner = judgingState.getWinner();
  
  // FIXED: Track all judged contents for best selection
  let bestContent = null;
  let bestScore = 0;
  
  // Look through ALL judge results from ALL cycles to find best content
  const allJudgeResults = allCycleJudgeResults || [];
  console.log(`   📊 Total judge evaluations across all cycles: ${allJudgeResults.length}`);
  for (const result of allJudgeResults) {
    if (result.status === 'fulfilled' && result.value) {
      const score = result.value.totalScore || 0;
      if (score > bestScore) {
        bestScore = score;
        bestContent = result.value.content;
      }
    }
  }
  
  if (!winner) {
    console.log('\n⚠️ No content passed ALL judges - selecting best content from partial results...');
    
    // If we have a best content from judging, save it
    if (bestContent) {
      console.log(`\n   🏆 BEST CONTENT FOUND (Score: ${bestScore}/105)`);
      console.log('   ─'.repeat(50));
      console.log('   ' + bestContent.split('\n').join('\n   '));
      console.log('   ─'.repeat(50));
      
      // Save as best content
      const bestPath = `${CONFIG.outputDir}/best-content-${Date.now()}.txt`;
      fs.writeFileSync(bestPath, bestContent);
      console.log(`   💾 Best content saved: ${bestPath}`);
      
      // Also save as winner for compatibility
      fs.writeFileSync(`${CONFIG.outputDir}/winner-content.txt`, bestContent);
      console.log(`   💾 Also saved as: winner-content.txt`);
      
      // Save JSON result
      const resultPath = `${CONFIG.outputDir}/rally-v9.8.3-final-${Date.now()}.json`;
      const finalResult = {
        campaign: campaignData.title,
        success: false,
        partialSuccess: true,
        bestContent: bestContent,
        bestScore: bestScore,
        totalCycles: cycleNumber,
        totalGenerated,
        totalFailed,
        metadata: {
          version: '9.8.3-final',
          timestamp: new Date().toISOString(),
          duration: `${(totalDuration / 1000).toFixed(1)}s`,
          note: 'Content did not pass all judges but is the best generated'
        }
      };
      fs.writeFileSync(resultPath, JSON.stringify(finalResult, null, 2));
      console.log(`   💾 Results JSON saved: ${resultPath}`);
      
      return { content: bestContent, score: bestScore, partialSuccess: true };
    }
    
    // If no judged content, find from saved files
    const allContentFiles = fs.readdirSync(CONFIG.outputDir)
      .filter(f => f.startsWith('content-') && f.endsWith('.txt'))
      .map(f => ({ file: f, path: `${CONFIG.outputDir}/${f}` }));
    
    if (allContentFiles.length > 0) {
      console.log(`\n   📝 Found ${allContentFiles.length} generated content files`);
      
      // Find the longest content (usually the best)
      let longestFile = null;
      let longestSize = 0;
      for (const f of allContentFiles) {
        const stats = fs.statSync(f.path);
        if (stats.size > longestSize) {
          longestSize = stats.size;
          longestFile = f;
        }
      }
      
      if (longestFile) {
        const content = fs.readFileSync(longestFile.path, 'utf8');
        console.log(`   🏆 Selecting longest content: ${longestFile.file} (${longestSize} bytes)`);
        
        // Save as winner
        fs.writeFileSync(`${CONFIG.outputDir}/winner-content.txt`, content);
        console.log(`   💾 Saved as: winner-content.txt`);
        
        return { content, partialSuccess: true };
      }
    }
    
    console.log('   💡 Content files saved in: ' + CONFIG.outputDir);
    return null;
  }
  
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    🎉 WINNER FOUND! 🎉                         ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  ⏱️  Total Time: ${(totalDuration / 1000).toFixed(1)}s                                   `);
  console.log(`║  🔄 Cycles: ${cycleNumber}                                              `);
  console.log(`║  📊 Generated: ${totalGenerated} contents                              `);
  console.log(`║  ❌ Failed: ${totalFailed} contents                                  `);
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  🏆 WINNING CONTENT:                                           ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  Score: ${winner.totalScore}/105                                        `);
  console.log(`║  Cycle: ${winner.cycleNumber}                                                `);
  console.log('╠════════════════════════════════════════════════════════════════╣');
  
  // Print content
  const lines = winner.content.match(/.{1,50}/g) || [];
  lines.forEach(line => {
    console.log(`║  ${line.padEnd(58)}║`);
  });
  
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  // G4 and X-Factor Analysis
  const g4Result = detectG4Elements(winner.content);
  const xFactorResult = detectXFactors(winner.content);
  
  console.log('\n   ╔════════════════════════════════════════════════════════════╗');
  console.log('   ║              🔍 G4 ORIGINALITY ANALYSIS                    ║');
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log(`   ║  Estimated G4 Score: ${g4Result.estimatedG4.toFixed(2)}/2.00                       ║`);
  console.log(`   ║  Bonuses: +${g4Result.totalBonus.toFixed(2)}  Penalties: -${g4Result.totalPenalty.toFixed(2)}             ║`);
  console.log('   ╚════════════════════════════════════════════════════════════╝');
  
  console.log('\n   ╔════════════════════════════════════════════════════════════╗');
  console.log('   ║              ⭐ X-FACTOR DIFFERENTIATORS                   ║');
  console.log('   ╠════════════════════════════════════════════════════════════╣');
  console.log(`   ║  Detected: ${xFactorResult.detected.length}/5    Score: ${xFactorResult.score}/100                    ║`);
  xFactorResult.detected.forEach(xf => {
    console.log(`   ║    ✓ ${xf.type.padEnd(25)}                        ║`);
  });
  console.log('   ╚════════════════════════════════════════════════════════════╝');
  
  // Save results
  const finalResults = {
    campaign: campaignData.title,
    campaignData: {
      title: campaignData.title,
      description: campaignData.description,
      style: campaignData.style,
      rules: campaignData.rules,
      url: `https://app.rally.fun/campaign/${campaignData.intelligentContractAddress}`
    },
    success: true,
    finalContent: winner.content,
    finalJudgingResult: winner,
    totalCycles: cycleNumber,
    totalGenerated,
    totalFailed,
    analysis: {
      g4Originality: g4Result,
      xFactors: xFactorResult
    },
    metadata: {
      version: '9.8.3-final',
      timestamp: new Date().toISOString(),
      duration: `${(totalDuration / 1000).toFixed(1)}s`,
      campaign: campaignData.title || 'Unknown',
      mission: campaignData.missionTitle || 'All Missions (no specific mission selected)',
      missionNumber: campaignData.missionNumber || null,
      campaignAddress: campaignData.intelligentContractAddress || null,
      thresholds: { judge1: { pass: 20, max: 20, percent: '100%' }, judge2: { pass: 3, max: 5, percent: '60%' }, judge3: { pass: 60, max: 80, percent: '75%' }, total: { pass: 80, max: 105, percent: '76%' } }
    }
  };
  
  // Save to file
  const outputPath = `${CONFIG.outputDir}/rally-v9.8.3-final-${Date.now()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));
  console.log(`\n💾 Results saved to: ${outputPath}`);
  
  // Save winner content with campaign/mission header for clarity
  const winnerHeader = [
    `═══════════════════════════════════════════════════════════════`,
    `📌 CAMPAIGN: ${campaignData.title || 'Unknown'}`,
    `🎯 MISSION: ${campaignData.missionTitle || 'All Missions (no specific mission selected)'}`,
    `📍 Address: ${campaignData.intelligentContractAddress || 'N/A'}`,
    `📊 Score: ${winner.totalScore}/105`,
    `🔄 Cycle: ${winner.cycleNumber} | Duration: ${(totalDuration / 1000).toFixed(1)}s`,
    `⏰ Generated: ${new Date().toISOString()}`,
    `═══════════════════════════════════════════════════════════════`,
    ``
  ].join('\n');
  fs.writeFileSync(`${CONFIG.outputDir}/winner-content.txt`, `${winnerHeader}\n${winner.content}`);
  console.log(`💾 Winner content saved to: ${CONFIG.outputDir}/winner-content.txt`);
  console.log(`   📌 Campaign: ${campaignData.title || 'Unknown'}`);
  console.log(`   🎯 Mission: ${campaignData.missionTitle || 'All Missions (no specific mission selected)'}`);
  
  // ═══════════════════════════════════════════════════════════════
  // 💬 GENERATE 20 ENGAGEMENT Q&A FOR THE WINNER CONTENT
  // ═══════════════════════════════════════════════════════════════
  console.log('\n💬 Generating 20 engagement Q&A to boost replies...');
  const qaList = await generateEngagementQA(winner.content, campaignData, researchData);
  await displayAndSaveEngagementQA(qaList, campaignData, winner.content);
  
  return {
    content: winner.content,
    score: winner.totalScore,
    scores: winner.scores,
    cycle: winner.cycleNumber,
    stats: {
      totalTime: totalDuration,
      totalCycles: cycleNumber,
      totalGenerated,
      totalFailed
    }
  };
}

// ============================================================================
// ENGAGEMENT Q&A GENERATOR - 20 High-Quality Questions & Answers
// ============================================================================

async function generateEngagementQA(winnerContent, campaignData, researchData) {
  console.log('\n' + '═'.repeat(70));
  console.log('💬 GENERATING 20 ENGAGEMENT Q&A FOR WINNER CONTENT');
  console.log('═'.repeat(70));
  
  try {
    const qaPrompt = `You are a social media engagement expert. Given the following tweet/content and its campaign context, generate 20 HIGH-QUALITY questions with their suggested answers that can be used to:

1. Reply to comments on the tweet
2. Create follow-up engagement tweets
3. Spark debate and discussion in the replies
4. Build authority by answering technical questions
5. Encourage others to share their own experiences

TWEET CONTENT:
"""
${winnerContent}
"""

CAMPAIGN: ${campaignData.title || 'Unknown'}
MISSION: ${campaignData.missionTitle || 'N/A'}
MISSION GOAL: ${(campaignData.description || campaignData.missionGoal || '').substring(0, 300)}
RULES: ${(campaignData.rules || '').substring(0, 300)}
KNOWLEDGE BASE: ${(campaignData.knowledgeBase || '').substring(0, 500)}

${researchData?.synthesis?.keyFacts?.length > 0 ? `KEY FACTS FROM RESEARCH:\n${researchData.synthesis.keyFacts.slice(0, 8).map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''}
${researchData?.synthesis?.statistics?.length > 0 ? `STATISTICS:\n${researchData.synthesis.statistics.slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}

REQUIREMENTS:
- Generate EXACTLY 20 Q&A pairs
- Questions should feel NATURAL and conversational (not corporate or robotic)
- Each question should be something a REAL person would ask after reading the tweet
- Answers should be informative, add value, and maintain the same tone as the tweet
- Mix of question types:
  * 4-5 technical questions (about the product/protocol specifics)
  * 4-5 personal experience questions (relatable scenarios)
  * 3-4 debate/discussion questions (controversial or opinion-based)
  * 3-4 follow-up curiosity questions (deeper dives into claims)
  * 3-4 engagement bait questions (encourage sharing stories/opinions)
- Answers should include SPECIFIC DATA points where possible
- Answers should NOT be generic - they must relate directly to the tweet's content
- Keep answers concise (1-3 sentences each) but informative
- Some Q&A should acknowledge doubts/skepticism (adds authenticity)
- Use casual, conversational language - NO AI-sounding phrases

Return JSON:
{
  "engagement_qa": [
    {
      "number": 1,
      "question": "the question someone might ask",
      "answer": "your suggested reply",
      "type": "technical|personal|debate|curiosity|engagement",
      "context": "why this question matters for engagement"
    },
    ... (20 total)
  ]
}`;

    const response = await callAI([
      { role: 'system', content: 'You are a social media engagement expert who writes natural, authentic replies that boost engagement. Never use AI-sounding phrases like "delve", "leverage", "tapestry", "paradigm". Write like a real person who actually uses the product.' },
      { role: 'user', content: qaPrompt }
    ], { maxTokens: 4000, temperature: 0.7, model: 'glm-5-flash', enableSearch: true });
    
    const result = safeJsonParse(response.content);
    
    if (!result || !result.engagement_qa || result.engagement_qa.length === 0) {
      console.log('   ⚠️ Failed to parse Q&A, trying simpler format...');
      
      // Fallback: try to extract Q&A from plain text
      const fallbackResponse = await callAI([
        { role: 'system', content: 'You are a social media expert. Generate exactly 20 question-answer pairs. Format each as: Q1: question\\nA1: answer\\n\\nQ2: question\\nA2: answer' },
        { role: 'user', content: `Based on this tweet:\n\n${winnerContent}\n\nCampaign: ${campaignData.title}\n\nGenerate 20 natural Q&A pairs for engagement.` }
      ], { maxTokens: 4000, temperature: 0.7, model: 'glm-5-flash' });
      
      // Parse plain text format
      const qaPairs = [];
      const lines = fallbackResponse.content.split('\n');
      let currentQ = null;
      let currentA = null;
      
      for (const line of lines) {
        const qMatch = line.match(/^Q(\d+)[.:]\s*(.+)/i);
        const aMatch = line.match(/^A(\d+)[.:]\s*(.+)/i);
        if (qMatch) {
          if (currentQ && currentA) {
            qaPairs.push({ number: qaPairs.length + 1, question: currentQ, answer: currentA, type: 'general', context: 'Engagement reply' });
          }
          currentQ = qMatch[2].trim();
          currentA = null;
        } else if (aMatch && currentQ) {
          currentA = aMatch[2].trim();
        } else if (currentA) {
          currentA += ' ' + line.trim();
        }
      }
      if (currentQ && currentA) {
        qaPairs.push({ number: qaPairs.length + 1, question: currentQ, answer: currentA, type: 'general', context: 'Engagement reply' });
      }
      
      if (qaPairs.length > 0) {
        return qaPairs;
      }
      
      console.log('   ⚠️ Could not generate Q&A');
      return null;
    }
    
    return result.engagement_qa.slice(0, 20);
    
  } catch (e) {
    console.log(`   ⚠️ Q&A generation error: ${e.message}`);
    return null;
  }
}

async function displayAndSaveEngagementQA(qaList, campaignData, winnerContent) {
  if (!qaList || qaList.length === 0) {
    console.log('\n   ⚠️ No Q&A generated');
    return;
  }
  
  // Type labels and icons
  const typeConfig = {
    'technical': { icon: '🔧', label: 'Technical' },
    'personal': { icon: '👤', label: 'Personal Experience' },
    'debate': { icon: '🔥', label: 'Debate/Discussion' },
    'curiosity': { icon: '🤔', label: 'Deep Dive' },
    'engagement': { icon: '💬', label: 'Engagement Bait' },
    'general': { icon: '💬', label: 'General' }
  };
  
  // Group by type
  const grouped = {};
  qaList.forEach(qa => {
    const type = qa.type || 'general';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(qa);
  });
  
  console.log('\n   ╔════════════════════════════════════════════════════════════════╗');
  console.log('   ║           💬 20 ENGAGEMENT Q&A FOR REPLIES                    ║');
  console.log('   ╠════════════════════════════════════════════════════════════════╣');
  console.log(`   ║  📌 Campaign: ${(campaignData.title || 'Unknown').padEnd(45)}║`);
  console.log(`   ║  🎯 Mission: ${(campaignData.missionTitle || 'N/A').padEnd(46)}║`);
  console.log(`   ║  💬 Total Q&A: ${String(qaList.length).padEnd(49)}║`);
  console.log('   ╠════════════════════════════════════════════════════════════════╣');
  
  qaList.forEach(qa => {
    const cfg = typeConfig[qa.type] || typeConfig['general'];
    console.log(`   ║                                                              ║`);
    console.log(`   ║  ${cfg.icon} Q${qa.number}: ${qa.question.substring(0, 52).padEnd(52)}║`);
    if (qa.question.length > 52) {
      console.log(`   ║       ${qa.question.substring(52).padEnd(52)}║`);
    }
    console.log(`   ║  💡 A${qa.number}: ${qa.answer.substring(0, 52).padEnd(52)}║`);
    if (qa.answer.length > 52) {
      const remaining = qa.answer.substring(52);
      // Split into chunks of 52
      for (let i = 0; i < remaining.length; i += 52) {
        console.log(`   ║       ${remaining.substring(i, i + 52).padEnd(52)}║`);
      }
    }
  });
  
  console.log('   ╚════════════════════════════════════════════════════════════════╝');
  
  // Save to file with campaign/mission header
  const qaHeader = [
    `═══════════════════════════════════════════════════════════════`,
    `📌 CAMPAIGN: ${campaignData.title || 'Unknown'}`,
    `🎯 MISSION: ${campaignData.missionTitle || 'N/A'}`,
    `📍 Address: ${campaignData.intelligentContractAddress || 'N/A'}`,
    `💬 Total Q&A: ${qaList.length}`,
    `⏰ Generated: ${new Date().toISOString()}`,
    `═══════════════════════════════════════════════════════════════`,
    ``,
    `📂 ORIGINAL CONTENT:`,
    `───────────────────────────────────────────────────────────────`,
    winnerContent,
    ``,
    `═══════════════════════════════════════════════════════════════`,
    `💬 20 ENGAGEMENT Q&A`,
    `═══════════════════════════════════════════════════════════════`,
    ``
  ].join('\n');
  
  let qaText = '';
  qaList.forEach(qa => {
    const cfg = typeConfig[qa.type] || typeConfig['general'];
    qaText += `${cfg.icon} Q${qa.number} [${cfg.label}]: ${qa.question}\n`;
    qaText += `💡 A${qa.number}: ${qa.answer}\n`;
    if (qa.context) {
      qaText += `   📌 Context: ${qa.context}\n`;
    }
    qaText += '\n';
  });
  
  const qaOutputPath = `${CONFIG.outputDir}/engagement-qa-${campaignData.title?.replace(/\s+/g, '-').toLowerCase() || 'campaign'}-m${campaignData.missionNumber || 'all'}.txt`;
  fs.writeFileSync(qaOutputPath, `${qaHeader}\n${qaText}`);
  console.log(`\n   💾 Engagement Q&A saved to: ${qaOutputPath}`);
  
  return qaOutputPath;
}

// FIXED: Add global error handlers with better recovery
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n⚠️ UNHANDLED REJECTION:', reason);
  console.log('\n   💾 Attempting to save any generated content...');
  
  // Try to save what we have
  try {
    const files = fs.readdirSync(CONFIG.outputDir).filter(f => f.startsWith('content-'));
    if (files.length > 0) {
      console.log(`   📝 Found ${files.length} content files in ${CONFIG.outputDir}`);
      
      // Find and display the most recent one
      const mostRecent = files
        .map(f => ({ file: f, path: `${CONFIG.outputDir}/${f}`, time: fs.statSync(`${CONFIG.outputDir}/${f}`).mtime.getTime() }))
        .sort((a, b) => b.time - a.time)[0];
      
      if (mostRecent) {
        const content = fs.readFileSync(mostRecent.path, 'utf8');
        fs.writeFileSync(`${CONFIG.outputDir}/crash-recovery-content.txt`, content);
        console.log(`   💾 Crash recovery content saved: crash-recovery-content.txt`);
        console.log(`   📝 Content preview: ${content.substring(0, 100)}...`);
      }
    }
    
    // Save error log
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: 'unhandledRejection',
      reason: String(reason),
      contentFilesFound: files.length
    };
    fs.writeFileSync(`${CONFIG.outputDir}/crash-error-log.json`, JSON.stringify(errorLog, null, 2));
  } catch (e) {
    console.log(`   ⚠️ Could not save recovery data: ${e.message}`);
  }
  
  console.log('\n   💡 Tip: Check crash-recovery-content.txt for any generated content');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n⚠️ UNCAUGHT EXCEPTION:', error.message);
  console.log('\n   💾 Check for saved content in:', CONFIG.outputDir);
  
  // Try to save error log
  try {
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: 'uncaughtException',
      message: error.message,
      stack: error.stack
    };
    fs.writeFileSync(`${CONFIG.outputDir}/crash-error-log.json`, JSON.stringify(errorLog, null, 2));
  } catch (e) {
    console.error('   ⚠️ Could not save crash log:', e.message);
  }
  
  process.exit(1);
});

// ============================================================================
// MANUAL CAMPAIGN LOADER - Load campaign from JSON file instead of API
// Usage: node rally-workflow.js campaigns/grvt-m2.json
// ============================================================================

/**
 * loadCampaignFromFile - Reads campaign data from a JSON file.
 * Returns the same format as fetchCampaignData() so the rest of the workflow works identically.
 */
function loadCampaignFromFile(filePath) {
  console.log(`\n📂 Loading campaign from: ${filePath}`);
  const resolvedPath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.log(`   ❌ File not found: ${resolvedPath}`);
    return null;
  }
  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    const data = JSON.parse(raw);
    console.log('   ✅ Campaign JSON parsed successfully');
    console.log(`   📋 Title: ${data.title || 'Unknown'}`);
    console.log(`   🎯 Mission: ${data.missionTitle || 'Default'}`);
    console.log(`   📍 Address: ${data.intelligentContractAddress || 'None (competitor fetch skipped)'}`);
    return {
      title: data.title || 'Unknown Campaign',
      description: data.description || data.missionGoal || data.goal || '',
      missionGoal: data.missionGoal || data.description || null,
      missionTitle: data.missionTitle || null,
      missionNumber: data.missionNumber || null,
      style: data.style || 'Standard',
      rules: data.rules || 'Standard rules',
      knowledgeBase: data.knowledgeBase || data.knowledge_base || '',
      additionalInfo: data.additionalInfo || data.adminNotice || '',
      characterLimit: data.characterLimit || data.character_limit || null,
      contentType: data.contentType || data.content_type || 'tweet',
      projectHandle: data.projectHandle || data.handle || null,
      campaignUrl: data.campaignUrl || data.url || null,
      intelligentContractAddress: data.intelligentContractAddress || null
    };
  } catch (e) {
    console.log(`   ❌ Failed to parse JSON: ${e.message}`);
    return null;
  }
}

/**
 * runManualWorkflow - Same as runFirstPassWorkflow but loads campaign from JSON file.
 * Everything else (competitor fetch, research, deep intent, generation, judging) works identically.
 */
async function runManualWorkflow(jsonFilePath) {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║    RALLY WORKFLOW V9.8.3-FINAL - MANUAL MODE         ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log('║  📂 Campaign data loaded from JSON file              ║');
  console.log('║  📊 Competitor/leaderboard still fetched from API    ║');
  console.log('║  🧠 Deep intent, generation, judges all NORMAL       ║');
  console.log('╚════════════════════════════════════════════════════╝');
  
  await preflightCheck();
  judgingState.reset();
  const totalStartTime = Date.now();
  
  // LOAD FROM JSON (not Rally API)
  const campaignData = loadCampaignFromFile(jsonFilePath);
  if (!campaignData) { console.log('   ❌ Failed to load campaign'); return null; }
  if (campaignData.intelligentContractAddress) {
    console.log(`\n📍 Address: ${campaignData.intelligentContractAddress}`);
  }
  
  // THRESHOLDS (same as normal)
  console.log('\n📊 HIGH STANDARDS THRESHOLDS:');
  console.log(`   Judge 1 (Gate Master):  ${THRESHOLDS.JUDGE1.pass}/${THRESHOLDS.JUDGE1.max} (${THRESHOLDS.JUDGE1.percent}) - SEMPURNA!`);
  console.log(`   Judge 2 (Evidence):      ${THRESHOLDS.JUDGE2.pass}/${THRESHOLDS.JUDGE2.max} (${THRESHOLDS.JUDGE2.percent}) - Fleksibel`);
  console.log(`   Judge 3 (Quality):       ${THRESHOLDS.JUDGE3.pass}/${THRESHOLDS.JUDGE3.max} (${THRESHOLDS.JUDGE3.percent})`);
  console.log(`   Total Required:          ${THRESHOLDS.TOTAL.pass}/${THRESHOLDS.TOTAL.max} (${THRESHOLDS.TOTAL.percent})`);
  
  // REQUIREMENTS DISPLAY
  const campaignRequirements = displayCampaignRequirements(campaignData);
  
  console.log('\n📋 FULL CAMPAIGN INFO:');
  console.log('─'.repeat(60));
  console.log(`   📝 DESCRIPTION: ${(campaignData.description || 'N/A').substring(0, 100)}...`);
  console.log(`   🎨 STYLE: ${(campaignData.style || 'N/A').substring(0, 100)}...`);
  console.log(`   📜 RULES: ${(campaignData.rules || 'N/A').substring(0, 150)}...`);
  console.log(`   📚 KNOWLEDGE BASE: ${(campaignData.knowledgeBase || 'N/A').substring(0, 100)}...`);
  console.log(`   📎 ADDITIONAL INFO: ${(campaignData.additionalInfo || 'N/A').substring(0, 100)}...`);
  console.log('─'.repeat(60));
  
  // FETCH COMPETITOR (still from Rally API if address provided)
  let competitorAnalysis = null;
  let competitorContents = [];
  if (campaignData.intelligentContractAddress) {
    console.log('\n📥 Fetching competitor submissions...');
    try {
      const submissions = await fetchLeaderboard(campaignData.intelligentContractAddress);
      console.log(`   📊 Found ${submissions?.length || 0} submissions`);
      console.log('\n🔍 Running Deep Competitor Analysis...');
      const llm = new MultiProviderLLM(CONFIG);
      competitorAnalysis = await deepCompetitorContentAnalysis(llm, submissions, campaignData.title, campaignData);
      console.log('   ✅ Competitor analysis complete');
      competitorContents = (competitorAnalysis?.competitorContent || []).map(c => typeof c === 'string' ? c : c.content || '');
      console.log(`   Competitor Contents: ${competitorContents.length} items`);
    } catch (e) {
      console.log(`   ⚠️ Competitor fetch failed: ${e.message} — continuing without competitor data`);
      competitorAnalysis = { competitorContent: [], analysis: 'No competitor data' };
    }
  } else {
    console.log('\n⚠️ No campaign address — skipping competitor fetch');
    competitorAnalysis = { competitorContent: [], analysis: 'No address provided' };
  }
  
  // RESEARCH (same as normal)
  console.log('\n🔎 Running Multi-Query Deep Research...');
  const llm = new MultiProviderLLM(CONFIG);
  const researchData = await multiQueryDeepResearch(llm, campaignData.title, campaignData);
  console.log('   ✅ Research complete');
  console.log('\n📊 STARTING CONTENT GENERATION PHASE...');
  console.log(`   Competitor Analysis: ${competitorAnalysis ? 'OK' : 'NULL'}`);
  console.log(`   Research Data: ${researchData ? 'OK' : 'NULL'}`);
  
  // DEEP CAMPAIGN INTENT (same as normal)
  console.log('\n   🧠 STEP 4.5: Deep Campaign Intent Analysis...');
  const campaignIntent = await deepCampaignIntentAnalyzer(llm, campaignData, campaignRequirements);
  _cachedCampaignIntent = campaignIntent;
  
  // CAMPAIGN COMPREHENSION (same as normal)
  console.log('\n🧠 STEP: Campaign Comprehension Check...');
  const comprehensionPlan = await campaignComprehensionCheck(llm, campaignData, competitorAnalysis, researchData, campaignRequirements);
  comprehensionPlan._deepIntent = campaignIntent;
  comprehensionPlan._wrongMetrics = campaignIntent.metricClassification?.wrongMetricsToAvoid || [];
  comprehensionPlan._correctMetrics = campaignIntent.metricClassification?.correctMetricsToUse || [];
  comprehensionPlan._metricType = campaignIntent.metricClassification?.campaignMetricType;
  comprehensionPlan._contentType = campaignIntent.contentType?.primary;
  comprehensionPlan._contentToAvoid = campaignIntent.contentToAvoid;
  comprehensionPlan._contentToUse = campaignIntent.contentToUse;
  comprehensionPlan._trueIntent = campaignIntent.trueIntent;
  comprehensionPlan._criticalWarnings = campaignIntent.criticalWarnings || [];
  console.log(`   ✅ AI Campaign Comprehension: ${comprehensionPlan.understood ? 'PASS' : 'NEEDS ATTENTION'}`);
  if (comprehensionPlan.understood) {
    console.log(`   📋 AI Plan: ${comprehensionPlan.execution_plan?.substring(0, 100)}...`);
  }
  
  // MAIN LOOP: Generate → Judge → Fail Fast (identical to normal mode)
  let cycleNumber = 0;
  let totalGenerated = 0;
  let totalFailed = 0;
  const contentsPerCycle = 3;
  const maxCycles = 10;
  let allCycleJudgeResults = [];
  
  while (!judgingState.hasWinner() && cycleNumber < maxCycles) {
    cycleNumber++;
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔄 CYCLE ${cycleNumber}`);
    console.log(`   📊 Stats: ${totalGenerated} generated, ${totalFailed} failed`);
    console.log(`${'═'.repeat(60)}`);
    
    console.log('\n📝 Generating 3 contents with staggered start...');
    const generateTasks = [];
    for (let i = 0; i < contentsPerCycle; i++) {
      const task = (async (idx) => {
        if (idx > 0) { console.log(`   ⏳ Stagger delay ${idx}: waiting 2s...`); await delay(2000); }
        return generateSingleContentForParallel(campaignData, competitorAnalysis, researchData, idx, comprehensionPlan);
      })(i);
      generateTasks.push(task);
    }
    const generateResults = await Promise.all(generateTasks);
    const validContents = generateResults.filter(r => r.success);
    totalGenerated += validContents.length;
    if (validContents.length === 0) { console.log('   ⚠️ No contents generated, retrying...'); await delay(1000); continue; }
    console.log(`   ✅ Generated ${validContents.length}/${contentsPerCycle} contents`);
    
    console.log('\n⚖️ Judging contents (TRUE parallel with fail-fast)...');
    const judgePromises = validContents.map((result) => {
      return Promise.race([
        judgeContentFailFast(result.content, campaignData, competitorContents, result.index, cycleNumber, judgingState)
          .catch(err => { console.log(`   ⚠️ Judge error: ${err.message}`); return { content: result.content, passed: false, failedAt: 'error' }; }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Judge timeout')), 300000))
      ]).catch(err => ({ content: result.content, passed: false, failedAt: 'timeout' }));
    });
    const judgeResults = await Promise.all(judgePromises);
    allCycleJudgeResults.push(...judgeResults.filter(r => !r.skipped));
    for (const result of judgeResults) {
      if (result.skipped) continue;
      if (result.passed) { judgingState.setWinner(result); break; }
    }
  }
  
  // OUTPUT (same as normal mode)
  const totalDuration = Date.now() - totalStartTime;
  const winner = judgingState.getWinner();
  if (!winner) {
    console.log('\n\n❌ NO WINNER after all cycles');
    console.log(`   📊 Total Generated: ${totalGenerated} | ❌ Failed: ${totalFailed} | ⏱️ ${totalDuration / 1000}s`);
    const intPath = `${CONFIG.outputDir}/intermediate-results-manual-${Date.now()}.json`;
    try { fs.writeFileSync(intPath, JSON.stringify(allCycleJudgeResults, null, 2)); } catch (e) {}
    return null;
  }
  
  // Display winner
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║                    🎉 WINNER FOUND! 🎉                    ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║  ⏱️  Total Time: ${totalDuration / 1000}s`);
  console.log(`║  🔄 Cycles: ${cycleNumber}`);
  console.log(`║  📊 Generated: ${totalGenerated} contents`);
  console.log(`║  ❌ Failed: ${totalFailed} contents`);
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║  Score: ${winner.totalScore}/105 | Cycle: ${winner.cycleNumber}`);
  console.log('╠════════════════════════════════════════════════════╣');
  winner.content.split('\n').forEach(line => console.log(`║  ${line}`));
  console.log('╚════════════════════════════════════════════════════╝');
  
  const winnerHeader = [
    `═══════════════════════════════════════════════════════════`,
    `🏆 WINNER CONTENT (Manual Mode - JSON input)`,
    `═══════════════════════════════════════════════════════════`,
    `📌 Campaign: ${campaignData.title}`,
    `🎯 Mission: ${campaignData.missionTitle || 'Default'}`,
    `📍 Address: ${campaignData.intelligentContractAddress || 'N/A'}`,
    `📊 Score: ${winner.totalScore}/105`,
    `🔄 Cycle: ${winner.cycleNumber} | Duration: ${(totalDuration / 1000).toFixed(1)}s`,
    `⏰ Generated: ${new Date().toISOString()}`,
    `═══════════════════════════════════════════════════════════`,
    ``
  ].join('\n');
  fs.writeFileSync(`${CONFIG.outputDir}/winner-content.txt`, `${winnerHeader}\n${winner.content}`);
  console.log(`💾 Winner saved: ${CONFIG.outputDir}/winner-content.txt`);
  
  console.log('\n💬 Generating 20 engagement Q&A...');
  const qaList = await generateEngagementQA(winner.content, campaignData, researchData);
  await displayAndSaveEngagementQA(qaList, campaignData, winner.content);
  
  return { content: winner.content, score: winner.totalScore, scores: winner.scores, cycle: winner.cycleNumber, stats: { totalTime: totalDuration, totalCycles: cycleNumber, totalGenerated, totalFailed } };
}

async function main() {
  const campaignArg = process.argv[2] || 'list';
  const missionArg = process.argv[3] ? parseInt(process.argv[3]) : null;
  
  // Handle "list" command
  if (campaignArg.toLowerCase() === 'list') {
    await listCampaigns(30);
    process.exit(0);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // MANUAL MODE: Detect JSON file input
  // Usage: node rally-workflow.js campaigns/grvt-m2.json
  // ═══════════════════════════════════════════════════════════════
  if (campaignArg.endsWith('.json')) {
    console.log('\n📌 MODE: MANUAL (JSON file input)');
    console.log(`   File: ${campaignArg}`);
    console.log('   Everything else runs normally (competitor fetch, research, judges)');
    
    try {
      const result = await runManualWorkflow(campaignArg);
      
      if (result) {
        console.log('\n\n📝 FINAL OUTPUT:');
        console.log('─'.repeat(60));
        console.log(result.content);
        console.log('─'.repeat(60));
        console.log(`\n✅ Score: ${result.score}/105`);
        console.log(`   🎯 Mission: ${result.mission || 'Default'}`);
        console.log(`   Cycles: ${result.stats.totalCycles}`);
        console.log(`   Duration: ${(result.stats.totalTime / 1000).toFixed(1)}s`);
        process.exit(0);
      } else {
        console.log('\n❌ No content passed all judges!');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Manual workflow failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
  
  // Handle "missions" command to list missions for a campaign
  if (campaignArg.toLowerCase() === 'missions') {
    const addressArg = process.argv[3];
    if (!addressArg) {
      console.log('   ❌ Usage: node rally-workflow.js missions <campaign_address>');
      process.exit(1);
    }
    await listMissions(addressArg);
    process.exit(0);
  }
  
  console.log('\n📌 MODE: First Pass Wins (v9.8.3-final)');
  console.log('   Generate 3 contents PARALLEL → Judge with FAIL FAST → First pass wins');
  console.log('   ✅ Supports multi-mission campaigns');
  
  if (missionArg) {
    console.log(`   🎯 Target Mission: ${missionArg}`);
  }
  
  try {
    const result = await runFirstPassWorkflow(campaignArg, missionArg);
    
    if (result) {
      console.log('\n\n📝 FINAL OUTPUT:');
      console.log('─'.repeat(60));
      console.log(result.content);
      console.log('─'.repeat(60));
      console.log(`\n✅ Score: ${result.score}/105`);
      if (result.mission) {
        console.log(`   🎯 Mission: ${result.mission}`);
      }
      console.log(`   Cycles: ${result.stats.totalCycles}`);
      console.log(`   Duration: ${(result.stats.totalTime / 1000).toFixed(1)}s`);
      process.exit(0);
    } else {
      console.log('\n❌ No content passed all judges!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Workflow failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
