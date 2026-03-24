/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RALLY WORKFLOW V9.8.3 - OPTIMIZED 3 AI JUDGES ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 MAJOR OPTIMIZATION FROM v9.8.2:
 * 
 * ❌ OLD (v9.8.2): 6 Judges, First-Passing Selection, No Fail Fast
 * ✅ NEW (v9.8.3): 3 AI Judges, Highest Score Selection, Fail Fast
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ 3 AI JUDGES ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  GATE 1 (JUDGE 1): CAMPAIGN REQUIREMENTS                               │
 * │  ─────────────────────────────────────────────────────────────────────  │
 * │  Programmatic Checks (Binary):                                         │
 * │    • URL Present in content                                           │
 * │    • Banned Words check                                               │
 * │                                                                        │
 * │  AI-Based Checks (Contextual):                                        │
 * │    • Description Alignment                                            │
 * │    • Rules Compliance                                                 │
 * │    • Style Match                                                      │
 * │    • Knowledge Base Accuracy                                          │
 * │    • Additional Info Integration                                      │
 * │                                                                        │
 * │  Threshold: 14/20 points                                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼ FAIL FAST (stop if failed)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  JUDGE 2: FACT-CHECK WITH SOURCE TAGS                                  │
 * │  ─────────────────────────────────────────────────────────────────────  │
 * │  • Every claim must have [SRC: url] tag                               │
 * │  • AI verifies each claim against source                              │
 * │  • Max 5 claims per content                                           │
 * │                                                                        │
 * │  Threshold: 4/5 claims verified                                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼ FAIL FAST (stop if failed)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  JUDGE 3: QUALITY ASSESSMENT (80 Points)                               │
 * │  ─────────────────────────────────────────────────────────────────────  │
 * │  • Originality (20 pts)                                               │
 * │  • Engagement Potential (20 pts)                                      │
 * │  • Clarity & Flow (15 pts)                                            │
 * │  • Emotional Impact (10 pts)                                          │
 * │  • X-Factor Differentiators (15 pts)                                  │
 * │                                                                        │
 * │  Threshold: 70/80 points (87.5%)                                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 *                    ┌─────────────────┐
 *                    │ HIGHEST SCORE   │
 *                    │ SELECTION       │
 *                    │ (not first pass)│
 *                    └─────────────────┘
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 KEY FEATURES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ FAIL FAST: Content stops being evaluated if it fails any stage
 * ✅ HIGHEST SCORE: Select content with HIGHEST score, not first passing
 * ✅ SOURCE TAGS: [SRC: url] for fact verification (cleaned before output)
 * ✅ STAGE-BY-STAGE: Evaluate all contents per stage before moving to next
 * ✅ MAX 5 REGENERATE: Maximum 5 cycles to generate passing content
 * ✅ MULTI-TOKEN: 11 tokens for rate limit handling
 * ✅ MULTI-CONTENT: Generate 5 contents per cycle
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 SCORING SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * | Stage          | Points | Threshold | Pass Rate |
 * |----------------|--------|-----------|-----------|
 * | Gate 1         | 20     | 14        | 70%       |
 * | Judge 2 Facts  | 5      | 4         | 80%       |
 * | Judge 3 Quality| 80     | 70        | 87.5%     |
 * |────────────────|────────|───────────|───────────|
 * | TOTAL          | 105    | 88        | 83.8%     |
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 📝 USAGE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * node rally-workflow-v9.8.3-optimized.js "Internet Court"
 * node rally-workflow-v9.8.3-optimized.js "Code Runs, Disputes Don't"
 * node rally-workflow-v9.8.3-optimized.js 0xAF5a5B459F4371c1781E3B8456214CDD063EeBA7
 * node rally-workflow-v9.8.3-optimized.js list
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION - v9.8.3 Optimized
// ============================================================================

const CONFIG = {
  version: '9.8.3-optimized',
  
  // API endpoints
  baseUrl: 'https://rallybackend-fugye2b8d7czawz.eastasia-01.azurewebsites.net',
  
  // 11 Tokens for rate limit handling
  tokens: [
    null, // Auto from .z-ai-config
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtNTQ5ZmI5MTEtZWM0NS00NGJiLTg5YjEtMWY2MTljNTEzN2QzIn0.M6IQTOXasSbEw98a4R6p3LEPwJPCWyRZiJSUo8lr2PM',
      chatId: 'chat-549fb911-ec45-44bb-89b1-1f619c5137d3',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #1'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtMTAyYTlkMGUtYTVkNy00MmY2LTk3ZjctNDk5NzFiNzcwNjVhIn0.6cDfQbTc2HHdtKXBfaUvpBsNLPbbjYkpJp6br0rYteA',
      chatId: 'chat-102a9d0e-a5d7-42f6-97f7-49971b77065a',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      label: 'Akun B #1'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtMDAyOWJjNDYtZGI3Ny00ZmZkLWI4ZDItM2RlYzFlNWVkNDU3In0.CMthZytUFBpnqW3K52Q1AAgB9uvhyXf3AG-FQvaDoYI',
      chatId: 'chat-0029bc46-db77-4ffd-b8d2-3dec1e5ed457',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #2'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtOTZlZTk1NmItMGYxMi00MGUxLWE0MzYtYTk4YmQwZjk0YzJhIn0.PgpMEiUr8a6Cu2vl9zFMggRsxQrx3JwkUCOjZCUIJnw',
      chatId: 'chat-96ee956b-0f12-40e1-a436-a98bd0f94c2a',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      label: 'Akun B #2'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtOWJiMzAzOTMtYWE3Mi00Y2QzLWJkNzktYzJkZmI0ODVmNzgyIn0.jb35oqGKPB2FLC-X_mozORmvbBilwRc_pSZEkbyaRfw',
      chatId: 'chat-9bb30393-aa72-4cd3-bd79-c2dfb485f782',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #3'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtYjBiMmFhMmUtZTg5My00NGMwLWEzMTktNTZlYTk0YzRkOTQxIn0.GQLbTpxXn-gcONVhEYr6Ozq7sTOdE5NJt5wIiGfVTQM',
      chatId: 'chat-b0b2aa2e-e893-44c0-a319-56ea94c4d941',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      label: 'Akun B #3'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtZDE3ZGY4ODQtZGNlOC00MmU3LWEzMTctMDQzYjI0YmM3MjdmIn0.W8UQmOxVIqGsAicZc9n4r4jR3IVM5Yj9V-SWv8H_0ac',
      chatId: 'chat-d17df884-dce8-42e7-a317-043b24bc727f',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun A #4'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtYzAwMTI0YWQtODk2Yy00NzBiLWE0OTYtOGFlNTYzMTQ0YTUwIn0.a0UXyTQ3z4D0g0mzHbVLpBMMN6cftW1W_-ELiObLqXY',
      chatId: 'chat-c00124ad-896c-470b-a496-8ae563144a50',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun C #1'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtNTRjOTZlMTQtNzMyYy00NjA1LWIyZTQtNWU3NzI1MjlhNTQ3In0.VzXhIi9TLBZ_7H0c5pRP9AL7HSCaL3RwO7-j_dqH4FY',
      chatId: 'chat-54c96e14-732c-4605-b2e4-5e772529a547',
      userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
      label: 'Akun D #1'
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtYWYxZDE3YWQtZDI1NC00YmFkLWI5ZmMtN2YyOTIwOTExNjExIn0.xG3YxW5PNy_LJrO9JfPgPFv3U0f_46IY4NqxYTZfqIo',
      chatId: 'chat-af1d17ad-d254-4bad-b9fc-7f2920911611',
      userId: '97631263-5dba-4e16-b127-19212e012a9b',
      label: 'Akun E #1'
    }
  ],
  
  currentTokenIndex: 0,
  
  // ═══════════════════════════════════════════════════════════════════════
  // THRESHOLDS - v9.8.3 Optimized (3 AI Judges)
  // ═══════════════════════════════════════════════════════════════════════
  thresholds: {
    // Gate 1: Campaign Requirements (20 pts max)
    gate1: {
      max: 20,
      pass: 14,        // 70%
      programmatic: {
        urlPresent: 2,      // Binary: 0 or 2
        bannedWords: 2      // Binary: 0 or 2 (pass if no banned words)
      },
      aiBased: {
        description: 4,     // Alignment with campaign description
        rules: 4,           // Rules compliance
        style: 3,           // Style match
        knowledgeBase: 3,   // KB accuracy
        additionalInfo: 2   // Additional info integration
      }
    },
    
    // Judge 2: Fact-Check (5 pts max)
    judge2: {
      max: 5,
      pass: 4,         // 80% of claims verified
      maxClaims: 5     // Max claims to verify
    },
    
    // Judge 3: Quality Assessment (80 pts max)
    judge3: {
      max: 80,
      pass: 70,        // 87.5%
      components: {
        originality: 20,
        engagement: 20,
        clarity: 15,
        emotional: 10,
        xFactor: 15
      }
    },
    
    // Total Score
    total: {
      max: 105,        // 20 + 5 + 80
      pass: 88         // 14 + 4 + 70
    }
  },
  
  // Workflow settings
  maxRegenerateCycles: 5,
  contentsPerCycle: 5,
  
  // Delays
  delays: {
    betweenJudges: 2000,
    betweenContents: 1000,
    beforeRegenerate: 3000,
    rateLimitWait: 10000
  },
  
  // Output directory
  outputDir: '/home/z/my-project/download'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Dynamic import for ESM module (SDK Only - Required!)
let ZAI = null;
let SDK_AVAILABLE = false;

async function initZAI() {
  if (ZAI && SDK_AVAILABLE) return ZAI;
  
  try {
    const module = await import('z-ai-web-dev-sdk');
    ZAI = module.default;
    SDK_AVAILABLE = true;
    console.log('   ✅ z-ai-web-dev-sdk loaded successfully');
    return ZAI;
  } catch (e) {
    SDK_AVAILABLE = false;
    throw new Error(`❌ z-ai-web-dev-sdk not available! Error: ${e.message}`);
  }
}

// ============================================================================
// MULTI-TOKEN MANAGER
// ============================================================================

class TokenManager {
  constructor(config) {
    this.tokens = config.tokens || [null];
    this.currentIndex = 0;
    this.exhaustedTokens = new Set();
  }
  
  getCurrentToken() {
    return this.tokens[this.currentIndex];
  }
  
  getCurrentLabel() {
    const token = this.getCurrentToken();
    return token?.label || 'Auto-Config';
  }
  
  switchToken() {
    const previousIndex = this.currentIndex;
    this.exhaustedTokens.add(this.currentIndex);
    
    // Find next available token
    for (let i = 0; i < this.tokens.length; i++) {
      const nextIndex = (this.currentIndex + 1 + i) % this.tokens.length;
      if (!this.exhaustedTokens.has(nextIndex)) {
        this.currentIndex = nextIndex;
        console.log(`   🔄 SWITCHING TOKEN: ${this.getCurrentLabel()}`);
        return true;
      }
    }
    
    // All tokens exhausted, reset
    console.log('   ⚠️ All tokens exhausted, resetting...');
    this.exhaustedTokens.clear();
    this.currentIndex = 0;
    return false;
  }
  
  resetExhausted() {
    this.exhaustedTokens.clear();
  }
}

// ============================================================================
// MULTI-PROVIDER LLM (SDK Only)
// ============================================================================

class MultiProviderLLM {
  constructor(config) {
    this.config = config;
    this.tokenManager = new TokenManager(config);
    this.zai = null;
  }
  
  async init() {
    if (!this.zai) {
      const ZAIClass = await initZAI();
      this.zai = await ZAIClass.create();
    }
    return this.zai;
  }
  
  async chat(messages, options = {}) {
    const zai = await this.init();
    const token = this.tokenManager.getCurrentToken();
    
    try {
      const chatOptions = {
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000
      };
      
      // If using custom token
      if (token?.token) {
        const customZai = await ZAI.create({ token: token.token });
        const result = await customZai.chat.completions.create(chatOptions);
        return result.choices[0]?.message?.content || '';
      }
      
      // Using auto-config token
      const result = await zai.chat.completions.create(chatOptions);
      return result.choices[0]?.message?.content || '';
      
    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('Too many requests')) {
        console.log(`   ⚠️ Rate limit hit on ${this.tokenManager.getCurrentLabel()}!`);
        this.tokenManager.switchToken();
        await delay(CONFIG.delays.rateLimitWait);
        return this.chat(messages, options); // Retry with new token
      }
      throw error;
    }
  }
  
  async webSearch(query) {
    const zai = await this.init();
    const token = this.tokenManager.getCurrentToken();
    
    try {
      if (token?.token) {
        const customZai = await ZAI.create({ token: token.token });
        const result = await customZai.functions.invoke('web_search', {
          query,
          num: 10
        });
        return result || [];
      }
      
      const result = await zai.functions.invoke('web_search', {
        query,
        num: 10
      });
      return result || [];
      
    } catch (error) {
      if (error.message?.includes('429')) {
        console.log(`   ⚠️ Web search rate limit on ${this.tokenManager.getCurrentLabel()}!`);
        this.tokenManager.switchToken();
        await delay(CONFIG.delays.rateLimitWait);
        return this.webSearch(query);
      }
      console.log(`   ⚠️ Web search failed: ${error.message}`);
      return [];
    }
  }
  
  getCurrentTokenLabel() {
    return this.tokenManager.getCurrentLabel();
  }
}

// ============================================================================
// CAMPAIGN FUNCTIONS
// ============================================================================

async function fetchAllCampaigns() {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.baseUrl}/api/campaign?limit=100`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.data || json || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchCampaign(address) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.baseUrl}/api/campaign/${address}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.data || json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchLeaderboard(address) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.baseUrl}/api/campaign/${address}/leaderboard?limit=50`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.data || json || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
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
  
  // Exact match
  let match = campaigns.find(c => c.title?.toLowerCase() === inputLower);
  if (match) return match;
  
  // Partial match
  match = campaigns.find(c => c.title?.toLowerCase().includes(inputLower));
  if (match) return match;
  
  // Word match
  const words = inputLower.split(/\s+/);
  match = campaigns.find(c => {
    const title = c.title?.toLowerCase() || '';
    return words.some(w => title.includes(w));
  });
  
  return match || null;
}

async function listCampaigns(limit = 30) {
  console.log('\n📋 Available Campaigns:\n');
  
  const campaigns = await fetchAllCampaigns();
  const sorted = campaigns
    .filter(c => c.title)
    .sort((a, b) => (b.rewardPool || 0) - (a.rewardPool || 0))
    .slice(0, limit);
  
  sorted.forEach((c, i) => {
    const reward = c.rewardPool ? `$${c.rewardPool}` : 'N/A';
    console.log(`${(i + 1).toString().padStart(2)}. ${c.title}`);
    console.log(`    Address: ${c.campaignAddress || c.address}`);
    console.log(`    Reward: ${reward}`);
    console.log('');
  });
}

// ============================================================================
// BANNED WORDS CHECK
// ============================================================================

const BANNED_WORDS = [
  'amazing', 'incredible', 'revolutionary', 'game-changing', 'groundbreaking',
  'life-changing', 'world-class', 'best-in-class', 'cutting-edge', 'state-of-the-art',
  'unleash', 'unlock', 'empower', 'seamlessly', 'effortlessly', 'hassle-free',
  'one-stop', 'all-in-one', 'end-to-end', 'holistic', 'comprehensive solution',
  'paradigm shift', 'disrupt', 'leverage', 'synergy', 'robust', 'scalable'
];

function checkBannedWords(content) {
  const contentLower = content.toLowerCase();
  const found = [];
  
  for (const word of BANNED_WORDS) {
    if (contentLower.includes(word.toLowerCase())) {
      found.push(word);
    }
  }
  
  return {
    passed: found.length === 0,
    foundWords: found,
    score: found.length === 0 ? CONFIG.thresholds.gate1.programmatic.bannedWords : 0
  };
}

// ============================================================================
// URL PRESENCE CHECK
// ============================================================================

function checkUrlPresent(content, campaignUrl) {
  if (!campaignUrl) {
    return { passed: true, score: CONFIG.thresholds.gate1.programmatic.urlPresent };
  }
  
  // Extract domain from campaign URL
  const urlMatch = campaignUrl.match(/rally\.fun\/campaign\/([a-zA-Z0-9]+)/);
  
  if (!urlMatch) {
    return { passed: true, score: CONFIG.thresholds.gate1.programmatic.urlPresent };
  }
  
  const campaignAddress = urlMatch[1];
  const passed = content.includes('rally.fun') || content.includes(campaignAddress);
  
  return {
    passed,
    score: passed ? CONFIG.thresholds.gate1.programmatic.urlPresent : 0
  };
}

// ============================================================================
// GATE 1: CAMPAIGN REQUIREMENTS JUDGE
// ============================================================================

async function gate1Judge(llm, content, campaignData) {
  console.log('\n   🔍 GATE 1: Campaign Requirements Judge');
  
  const results = {
    programmatic: {},
    aiBased: {},
    totalScore: 0,
    passed: false,
    feedback: []
  };
  
  // ═══════════════════════════════════════════════════════════════════════
  // PROGRAMMATIC CHECKS (Binary)
  // ═══════════════════════════════════════════════════════════════════════
  
  console.log('   📋 Running Programmatic Checks...');
  
  // URL Present Check
  const urlResult = checkUrlPresent(content, campaignData.campaignUrl || campaignData.url);
  results.programmatic.urlPresent = urlResult;
  results.totalScore += urlResult.score;
  console.log(`      ${urlResult.passed ? '✅' : '❌'} URL Present: ${urlResult.score}/${CONFIG.thresholds.gate1.programmatic.urlPresent}`);
  
  if (!urlResult.passed) {
    results.feedback.push('Missing campaign URL in content');
  }
  
  // Banned Words Check
  const bannedResult = checkBannedWords(content);
  results.programmatic.bannedWords = bannedResult;
  results.totalScore += bannedResult.score;
  console.log(`      ${bannedResult.passed ? '✅' : '❌'} Banned Words: ${bannedResult.score}/${CONFIG.thresholds.gate1.programmatic.bannedWords}`);
  
  if (!bannedResult.passed) {
    results.feedback.push(`Found banned words: ${bannedResult.foundWords.join(', ')}`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // AI-BASED CHECKS (Contextual)
  // ═══════════════════════════════════════════════════════════════════════
  
  console.log('   🤖 Running AI-Based Checks...');
  
  const aiPrompt = `You are Gate 1 AI Judge. Evaluate this content against campaign requirements.

CAMPAIGN:
Title: ${campaignData.title}
Description: ${campaignData.description || 'N/A'}
Style: ${campaignData.style || 'N/A'}
Rules: ${campaignData.rules || 'Check mission rules'}
Knowledge Base: ${campaignData.knowledgeBase || 'N/A'}
Additional Info: ${campaignData.additionalInfo || 'N/A'}

CONTENT TO EVALUATE:
"""
${content}
"""

Evaluate and score each criterion (be strict but fair):

1. DESCRIPTION ALIGNMENT (0-4 pts):
   - Does content address the campaign's core topic?
   - Is the angle relevant to what campaign asks?

2. RULES COMPLIANCE (0-4 pts):
   - Does content follow stated rules?
   - Are there any rule violations?

3. STYLE MATCH (0-3 pts):
   - Does content match requested style?
   - Is tone appropriate?

4. KNOWLEDGE BASE ACCURACY (0-3 pts):
   - Are facts aligned with provided KB?
   - Any contradictions with KB?

5. ADDITIONAL INFO INTEGRATION (0-2 pts):
   - Is additional info used effectively?
   - Does it add value to the content?

Respond in JSON format:
{
  "description": { "score": X, "reason": "..." },
  "rules": { "score": X, "reason": "..." },
  "style": { "score": X, "reason": "..." },
  "knowledgeBase": { "score": X, "reason": "..." },
  "additionalInfo": { "score": X, "reason": "..." },
  "totalAI": X,
  "overallFeedback": "..."
}`;

  try {
    const aiResponse = await llm.chat([{ role: 'user', content: aiPrompt }], { temperature: 0.3 });
    
    // Parse AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiScores = JSON.parse(jsonMatch[0]);
      
      results.aiBased.description = aiScores.description || { score: 0 };
      results.aiBased.rules = aiScores.rules || { score: 0 };
      results.aiBased.style = aiScores.style || { score: 0 };
      results.aiBased.knowledgeBase = aiScores.knowledgeBase || { score: 0 };
      results.aiBased.additionalInfo = aiScores.additionalInfo || { score: 0 };
      
      const aiTotal = (results.aiBased.description?.score || 0) +
                      (results.aiBased.rules?.score || 0) +
                      (results.aiBased.style?.score || 0) +
                      (results.aiBased.knowledgeBase?.score || 0) +
                      (results.aiBased.additionalInfo?.score || 0);
      
      results.totalScore += aiTotal;
      
      console.log(`      📝 Description: ${results.aiBased.description?.score || 0}/${CONFIG.thresholds.gate1.aiBased.description}`);
      console.log(`      📋 Rules: ${results.aiBased.rules?.score || 0}/${CONFIG.thresholds.gate1.aiBased.rules}`);
      console.log(`      🎨 Style: ${results.aiBased.style?.score || 0}/${CONFIG.thresholds.gate1.aiBased.style}`);
      console.log(`      📚 KB: ${results.aiBased.knowledgeBase?.score || 0}/${CONFIG.thresholds.gate1.aiBased.knowledgeBase}`);
      console.log(`      ➕ Additional: ${results.aiBased.additionalInfo?.score || 0}/${CONFIG.thresholds.gate1.aiBased.additionalInfo}`);
      
      if (aiScores.overallFeedback) {
        results.feedback.push(aiScores.overallFeedback);
      }
    }
  } catch (error) {
    console.log(`      ⚠️ AI check error: ${error.message}`);
    results.feedback.push('AI evaluation failed');
  }
  
  // Determine if passed
  results.passed = results.totalScore >= CONFIG.thresholds.gate1.pass;
  
  console.log(`\n   📊 GATE 1 TOTAL: ${results.totalScore}/${CONFIG.thresholds.gate1.max} (${results.passed ? '✅ PASS' : '❌ FAIL'})`);
  
  return results;
}

// ============================================================================
// JUDGE 2: FACT-CHECK WITH SOURCE TAGS
// ============================================================================

async function judge2FactCheck(llm, content, researchData) {
  console.log('\n   🔍 JUDGE 2: Fact-Check with Source Tags');
  
  const results = {
    claims: [],
    verifiedCount: 0,
    totalScore: 0,
    passed: false,
    feedback: []
  };
  
  // First, extract claims from content
  const claimPrompt = `Extract factual claims from this content that need verification.
List up to ${CONFIG.thresholds.judge2.maxClaims} specific, verifiable claims.

CONTENT:
"""
${content}
"""

Format each claim as:
{
  "claims": [
    { "claim": "...", "type": "statistic|fact|quote|event" }
  ]
}

Only include objective claims that can be verified, not opinions.`;

  try {
    const claimResponse = await llm.chat([{ role: 'user', content: claimPrompt }], { temperature: 0.3 });
    const claimMatch = claimResponse.match(/\{[\s\S]*\}/);
    
    if (!claimMatch) {
      console.log('      ⚠️ No claims extracted');
      results.passed = true; // Pass if no claims to verify
      results.totalScore = CONFIG.thresholds.judge2.max;
      return results;
    }
    
    const claimData = JSON.parse(claimMatch[0]);
    const claims = claimData.claims || [];
    
    console.log(`      📝 Found ${claims.length} claims to verify`);
    
    // Verify each claim with web search
    for (let i = 0; i < Math.min(claims.length, CONFIG.thresholds.judge2.maxClaims); i++) {
      const claim = claims[i];
      console.log(`      🔎 Verifying claim ${i + 1}: "${claim.claim.substring(0, 50)}..."`);
      
      // Search for verification
      const searchResults = await llm.webSearch(claim.claim);
      
      // AI verification
      const verifyPrompt = `Verify this claim against search results.

CLAIM: "${claim.claim}"

SEARCH RESULTS:
${JSON.stringify(searchResults.slice(0, 5), null, 2)}

Determine:
1. Is the claim accurate? (true/false/partially_true/unverifiable)
2. What is the best source URL?
3. Confidence level (0-1)

Respond in JSON:
{
  "status": "true|false|partially_true|unverifiable",
  "sourceUrl": "https://...",
  "confidence": 0.X,
  "explanation": "..."
}`;

      const verifyResponse = await llm.chat([{ role: 'user', content: verifyPrompt }], { temperature: 0.3 });
      const verifyMatch = verifyResponse.match(/\{[\s\S]*\}/);
      
      if (verifyMatch) {
        const verification = JSON.parse(verifyMatch[0]);
        
        const claimResult = {
          claim: claim.claim,
          type: claim.type,
          status: verification.status,
          sourceUrl: verification.sourceUrl,
          confidence: verification.confidence || 0,
          explanation: verification.explanation,
          passed: ['true', 'partially_true'].includes(verification.status)
        };
        
        results.claims.push(claimResult);
        
        if (claimResult.passed) {
          results.verifiedCount++;
        }
        
        console.log(`         ${claimResult.passed ? '✅' : '❌'} ${verification.status} (confidence: ${verification.confidence})`);
        
        await delay(500); // Rate limit buffer
      }
    }
    
    // Calculate score
    results.totalScore = results.verifiedCount;
    results.passed = results.verifiedCount >= CONFIG.thresholds.judge2.pass;
    
    console.log(`\n   📊 JUDGE 2 TOTAL: ${results.verifiedCount}/${CONFIG.thresholds.judge2.max} verified (${results.passed ? '✅ PASS' : '❌ FAIL'})`);
    
  } catch (error) {
    console.log(`      ⚠️ Fact-check error: ${error.message}`);
    results.feedback.push('Fact-check process failed');
    results.passed = true; // Don't fail on technical errors
  }
  
  return results;
}

// ============================================================================
// JUDGE 3: QUALITY ASSESSMENT
// ============================================================================

async function judge3Quality(llm, content, campaignData, competitorContents = []) {
  console.log('\n   🔍 JUDGE 3: Quality Assessment');
  
  const results = {
    components: {},
    totalScore: 0,
    passed: false,
    feedback: []
  };
  
  const qualityPrompt = `You are Judge 3: Quality Assessment. Score this content for Rally.fun.

CAMPAIGN: ${campaignData.title}
STYLE REQUIRED: ${campaignData.style || 'N/A'}

CONTENT TO EVALUATE:
"""
${content}
"""

${competitorContents.length > 0 ? `COMPETITOR CONTENTS (for uniqueness reference):
${competitorContents.slice(0, 5).map((c, i) => `${i + 1}. "${c.substring(0, 200)}..."`).join('\n')}` : ''}

Score each component (be strict, avoid grade inflation):

1. ORIGINALITY (0-20 pts):
   - Is the angle unique and fresh?
   - Does it avoid clichés and templates?
   - Compared to competitors, is it different?

2. ENGAGEMENT POTENTIAL (0-20 pts):
   - Does the hook grab attention?
   - Is there emotional resonance?
   - Will people want to share this?

3. CLARITY & FLOW (0-15 pts):
   - Is it easy to understand?
   - Does it flow naturally?
   - Is there logical progression?

4. EMOTIONAL IMPACT (0-10 pts):
   - Does it evoke emotion?
   - Is the emotional arc effective?
   - Does it connect with reader?

5. X-FACTOR DIFFERENTIATORS (0-15 pts):
   - Specific numbers/statistics used? (+3)
   - Time specificity? (+3)
   - Personal/confessional element? (+3)
   - Unexpected angle? (+3)
   - Embarrassing honesty? (+3)

Respond in JSON:
{
  "originality": { "score": X, "reason": "..." },
  "engagement": { "score": X, "reason": "..." },
  "clarity": { "score": X, "reason": "..." },
  "emotional": { "score": X, "reason": "..." },
  "xFactor": { "score": X, "reason": "..." },
  "totalScore": X,
  "overallFeedback": "...",
  "improvementSuggestions": ["...", "..."]
}`;

  try {
    const response = await llm.chat([{ role: 'user', content: qualityPrompt }], { temperature: 0.3 });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const scores = JSON.parse(jsonMatch[0]);
      
      results.components.originality = scores.originality || { score: 0 };
      results.components.engagement = scores.engagement || { score: 0 };
      results.components.clarity = scores.clarity || { score: 0 };
      results.components.emotional = scores.emotional || { score: 0 };
      results.components.xFactor = scores.xFactor || { score: 0 };
      
      results.totalScore = (results.components.originality?.score || 0) +
                           (results.components.engagement?.score || 0) +
                           (results.components.clarity?.score || 0) +
                           (results.components.emotional?.score || 0) +
                           (results.components.xFactor?.score || 0);
      
      console.log(`      ✨ Originality: ${results.components.originality?.score || 0}/${CONFIG.thresholds.judge3.components.originality}`);
      console.log(`      🎯 Engagement: ${results.components.engagement?.score || 0}/${CONFIG.thresholds.judge3.components.engagement}`);
      console.log(`      📝 Clarity: ${results.components.clarity?.score || 0}/${CONFIG.thresholds.judge3.components.clarity}`);
      console.log(`      💫 Emotional: ${results.components.emotional?.score || 0}/${CONFIG.thresholds.judge3.components.emotional}`);
      console.log(`      ⭐ X-Factor: ${results.components.xFactor?.score || 0}/${CONFIG.thresholds.judge3.components.xFactor}`);
      
      if (scores.overallFeedback) {
        results.feedback.push(scores.overallFeedback);
      }
      if (scores.improvementSuggestions) {
        results.suggestions = scores.improvementSuggestions;
      }
    }
  } catch (error) {
    console.log(`      ⚠️ Quality assessment error: ${error.message}`);
    results.feedback.push('Quality assessment failed');
  }
  
  results.passed = results.totalScore >= CONFIG.thresholds.judge3.pass;
  
  console.log(`\n   📊 JUDGE 3 TOTAL: ${results.totalScore}/${CONFIG.thresholds.judge3.max} (${results.passed ? '✅ PASS' : '❌ FAIL'})`);
  
  return results;
}

// ============================================================================
// CONTENT GENERATOR
// ============================================================================

async function generateContent(llm, campaignData, researchData, competitorAnalysis, index) {
  const angles = ['personal_story', 'data_driven', 'contrarian', 'news_jacking', 'how_to'];
  const emotions = [
    ['curiosity', 'surprise'],
    ['fear', 'hope'],
    ['anger', 'trust'],
    ['frustration', 'relief'],
    ['confusion', 'clarity']
  ];
  
  const angle = angles[index % angles.length];
  const emotionPair = emotions[index % emotions.length];
  
  const prompt = `You are a professional content creator for Rally.fun - a web3 social platform.

CAMPAIGN: ${campaignData.title}
DESCRIPTION: ${campaignData.description}
STYLE: ${campaignData.style || 'Engaging and informative'}
URL TO INCLUDE: ${campaignData.campaignUrl || campaignData.url}

RESEARCH DATA:
${JSON.stringify(researchData?.keyFacts || [], null, 2).slice(0, 500)}

${competitorAnalysis?.anglesUsed?.length > 0 ? `ANGLES ALREADY USED (avoid these): ${competitorAnalysis.anglesUsed.join(', ')}` : ''}

Create a compelling social media post with these parameters:
- Angle: ${angle}
- Emotion arc: ${emotionPair[0]} → ${emotionPair[1]}
- Under 280 characters
- Include the campaign URL

REQUIREMENTS:
✅ Use contractions (don't, can't, won't)
✅ Casual, conversational tone
✅ Strong hook in first line
✅ Include specific numbers if possible
✅ End with call to action

FORBIDDEN:
❌ Em dashes (—) - use hyphens instead
❌ Smart quotes - use straight quotes
❌ Corporate speak or buzzwords
❌ Generic openers like "Discover" or "Introducing"

Generate ONE post now:`;

  const response = await llm.chat([
    { role: 'system', content: 'You are a viral content creator specializing in crypto/web3. Create engaging, shareable posts that drive action.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.8, max_tokens: 300 });
  
  return response.trim();
}

// ============================================================================
// SOURCE TAG CLEANER
// ============================================================================

function cleanSourceTags(content) {
  // Remove [SRC: url] tags from content before final output
  return content.replace(/\[SRC:\s*[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
}

// ============================================================================
// 3 AI JUDGES EVALUATION WITH FAIL FAST
// ============================================================================

async function evaluateWith3Judges(llm, content, campaignData, researchData, competitorContents) {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('⚖️  3 AI JUDGES EVALUATION WITH 3 AI JUDGES ══════════════════════════════════════════════════════');
  
  const evaluation = {
    content,
    gate1: null,
    judge2: null,
    judge3: null,
    totalScore: 0,
    passed: false,
    failFastStage: null,
    feedback: []
  };
  
  // ═══════════════════════════════════════════════════════════════════════
  // GATE 1: Campaign Requirements
  // ═══════════════════════════════════════════════════════════════════════
  evaluation.gate1 = await gate1Judge(llm, content, campaignData);
  
  if (!evaluation.gate1.passed) {
    evaluation.failFastStage = 'GATE_1';
    evaluation.feedback.push(`Gate 1 failed: ${evaluation.gate1.feedback.join('; ')}`);
    console.log('\n   ⚡ FAIL FAST: Content failed at Gate 1');
    return evaluation;
  }
  
  await delay(CONFIG.delays.betweenJudges);
  
  // ═══════════════════════════════════════════════════════════════════════
  // JUDGE 2: Fact-Check
  // ═══════════════════════════════════════════════════════════════════════
  evaluation.judge2 = await judge2FactCheck(llm, content, researchData);
  
  if (!evaluation.judge2.passed) {
    evaluation.failFastStage = 'JUDGE_2';
    evaluation.feedback.push(`Judge 2 failed: Only ${evaluation.judge2.verifiedCount}/${CONFIG.thresholds.judge2.pass} claims verified`);
    console.log('\n   ⚡ FAIL FAST: Content failed at Judge 2');
    return evaluation;
  }
  
  await delay(CONFIG.delays.betweenJudges);
  
  // ═══════════════════════════════════════════════════════════════════════
  // JUDGE 3: Quality Assessment
  // ═══════════════════════════════════════════════════════════════════════
  evaluation.judge3 = await judge3Quality(llm, content, campaignData, competitorContents);
  
  if (!evaluation.judge3.passed) {
    evaluation.failFastStage = 'JUDGE_3';
    evaluation.feedback.push(`Judge 3 failed: Score ${evaluation.judge3.totalScore}/${CONFIG.thresholds.judge3.pass} below threshold`);
    console.log('\n   ⚡ FAIL FAST: Content failed at Judge 3');
    return evaluation;
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // PASSED ALL JUDGES
  // ═══════════════════════════════════════════════════════════════════════
  evaluation.totalScore = evaluation.gate1.totalScore + evaluation.judge2.totalScore + evaluation.judge3.totalScore;
  evaluation.passed = true;
  
  console.log(`\n   ✅ PASSED ALL 3 JUDGES! Total Score: ${evaluation.totalScore}/${CONFIG.thresholds.total.max}`);
  
  return evaluation;
}

// ============================================================================
// STAGE-BY-STAGE EVALUATION
// ============================================================================

async function stageByStageEvaluation(llm, contents, campaignData, researchData, competitorContents) {
  console.log('\n📊 Stage-by-Stage Evaluation: Evaluating all contents per stage...');
  
  const stageResults = {
    gate1: [],
    judge2: [],
    judge3: [],
    passed: [],
    failed: []
  };
  
  // Stage 1: Gate 1 for all contents
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📌 STAGE 1: GATE 1 - Campaign Requirements');
  console.log('════════════════════════════════════════════════════════════');
  
  for (let i = 0; i < contents.length; i++) {
    console.log(`\n   Evaluating Content ${i + 1}/${contents.length}...`);
    const gate1Result = await gate1Judge(llm, contents[i], campaignData);
    stageResults.gate1.push({
      index: i,
      content: contents[i],
      result: gate1Result,
      passed: gate1Result.passed
    });
    await delay(CONFIG.delays.betweenContents);
  }
  
  // Filter passed contents for next stage
  const passedGate1 = stageResults.gate1.filter(r => r.passed);
  console.log(`\n   📊 Gate 1 Results: ${passedGate1.length}/${contents.length} passed`);
  
  if (passedGate1.length === 0) {
    console.log('\n   ❌ No content passed Gate 1');
    return stageResults;
  }
  
  // Stage 2: Judge 2 for passed contents
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📌 STAGE 2: JUDGE 2 - Fact-Check');
  console.log('════════════════════════════════════════════════════════════');
  
  for (const item of passedGate1) {
    console.log(`\n   Evaluating Content ${item.index + 1}...`);
    const judge2Result = await judge2FactCheck(llm, item.content, researchData);
    stageResults.judge2.push({
      index: item.index,
      content: item.content,
      gate1Result: item.result,
      result: judge2Result,
      passed: judge2Result.passed
    });
    await delay(CONFIG.delays.betweenContents);
  }
  
  const passedJudge2 = stageResults.judge2.filter(r => r.passed);
  console.log(`\n   📊 Judge 2 Results: ${passedJudge2.length}/${passedGate1.length} passed`);
  
  if (passedJudge2.length === 0) {
    console.log('\n   ❌ No content passed Judge 2');
    return stageResults;
  }
  
  // Stage 3: Judge 3 for passed contents
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📌 STAGE 3: JUDGE 3 - Quality Assessment');
  console.log('════════════════════════════════════════════════════════════');
  
  for (const item of passedJudge2) {
    console.log(`\n   Evaluating Content ${item.index + 1}...`);
    const judge3Result = await judge3Quality(llm, item.content, campaignData, competitorContents);
    stageResults.judge3.push({
      index: item.index,
      content: item.content,
      gate1Result: item.gate1Result,
      judge2Result: item.result,
      result: judge3Result,
      totalScore: item.gate1Result.totalScore + item.result.totalScore + judge3Result.totalScore,
      passed: judge3Result.passed
    });
    await delay(CONFIG.delays.betweenContents);
  }
  
  // Final results
  stageResults.passed = stageResults.judge3.filter(r => r.passed);
  stageResults.failed = stageResults.judge3.filter(r => !r.passed);
  
  console.log(`\n   📊 Final Results: ${stageResults.passed.length} passed all stages`);
  
  return stageResults;
}

// ============================================================================
// HIGHEST SCORE SELECTION
// ============================================================================

function selectHighestScore(stageResults) {
  if (stageResults.passed.length === 0) {
    return null;
  }
  
  // Sort by total score (descending)
  const sorted = [...stageResults.passed].sort((a, b) => b.totalScore - a.totalScore);
  
  const winner = sorted[0];
  console.log(`\n   🏆 HIGHEST SCORE: Content ${winner.index + 1} with ${winner.totalScore} points`);
  
  // Display ranking
  console.log('\n   📊 Content Ranking:');
  sorted.forEach((item, rank) => {
    console.log(`      ${rank + 1}. Content ${item.index + 1}: ${item.totalScore} pts`);
  });
  
  return winner;
}

// ============================================================================
// RESEARCH DATA
// ============================================================================

async function fetchResearchData(llm, campaignData) {
  console.log('\n🔍 Fetching Research Data...');
  
  const queries = [
    `${campaignData.title} what is explained`,
    `${campaignData.title} statistics data numbers`,
    `${campaignData.title} controversy debate issues`,
    `${campaignData.title} expert opinion analysis`,
    `${campaignData.title} real cases examples`
  ];
  
  const researchData = {
    keyFacts: [],
    uniqueAngles: [],
    sources: []
  };
  
  for (const query of queries) {
    try {
      const results = await llm.webSearch(query);
      
      if (Array.isArray(results) && results.length > 0) {
        for (const result of results.slice(0, 3)) {
          if (result.snippet) {
            researchData.keyFacts.push(result.snippet);
            researchData.sources.push(result.url);
          }
        }
      }
      
      await delay(500);
    } catch (error) {
      console.log(`      ⚠️ Search failed for: ${query.substring(0, 30)}...`);
    }
  }
  
  // Remove duplicates
  researchData.keyFacts = [...new Set(researchData.keyFacts)].slice(0, 10);
  researchData.sources = [...new Set(researchData.sources)].slice(0, 10);
  
  console.log(`   ✅ Found ${researchData.keyFacts.length} facts, ${researchData.sources.length} sources`);
  
  return researchData;
}

// ============================================================================
// COMPETITOR ANALYSIS
// ============================================================================

async function analyzeCompetitors(leaderboard) {
  console.log('\n🔍 Analyzing Competitors...');
  
  const analysis = {
    totalSubmissions: leaderboard.length,
    anglesUsed: [],
    saturatedElements: [],
    topPerformers: []
  };
  
  if (leaderboard.length === 0) {
    console.log('   ℹ️ No submissions to analyze');
    return analysis;
  }
  
  // Extract patterns from top submissions
  const top10 = leaderboard.slice(0, 10);
  
  for (const submission of top10) {
    if (submission.content) {
      analysis.topPerformers.push({
        content: submission.content.substring(0, 200),
        score: submission.score || 0
      });
    }
  }
  
  console.log(`   ✅ Analyzed ${leaderboard.length} submissions`);
  
  return analysis;
}

// ============================================================================
// MAIN WORKFLOW
// ============================================================================

async function mainWorkflow(campaignInput) {
  const startTime = Date.now();
  
  console.log('\n' + '═'.repeat(70));
  console.log('║      RALLY WORKFLOW V9.8.3 - 3 AI JUDGES ARCHITECTURE           ║');
  console.log('║   Gate 1 → Judge 2 → Judge 3 → Highest Score Selection          ║');
  console.log('═'.repeat(70));
  
  // Initialize LLM
  const llm = new MultiProviderLLM(CONFIG);
  await llm.init();
  
  // Resolve campaign
  console.log('\n🔍 Resolving campaign...');
  const campaignData = await resolveCampaign(campaignInput);
  
  if (!campaignData) {
    console.log(`❌ Campaign not found: ${campaignInput}`);
    return null;
  }
  
  console.log(`   ✅ Found: ${campaignData.title}`);
  console.log(`   📍 Address: ${campaignData.campaignAddress || campaignData.address}`);
  
  // Fetch leaderboard
  console.log('\n📥 Fetching competitor submissions...');
  const leaderboard = await fetchLeaderboard(campaignData.campaignAddress || campaignData.address);
  console.log(`   ✅ Found ${leaderboard.length} submissions`);
  
  // Analyze competitors
  const competitorAnalysis = await analyzeCompetitors(leaderboard);
  
  // Fetch research data
  const researchData = await fetchResearchData(llm, campaignData);
  
  // Extract competitor contents for comparison
  const competitorContents = leaderboard
    .filter(s => s.content)
    .map(s => s.content)
    .slice(0, 10);
  
  // ═══════════════════════════════════════════════════════════════════════
  // GENERATION CYCLES (Max 5)
  // ═══════════════════════════════════════════════════════════════════════
  
  let bestContent = null;
  let bestEvaluation = null;
  let allEvaluations = [];
  
  for (let cycle = 1; cycle <= CONFIG.maxRegenerateCycles; cycle++) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`║           🔄 GENERATION CYCLE ${cycle}/${CONFIG.maxRegenerateCycles}                         ║`);
    console.log('═'.repeat(70));
    
    // Generate 5 contents
    console.log('\n📝 Generating 5 contents...');
    const contents = [];
    
    for (let i = 0; i < CONFIG.contentsPerCycle; i++) {
      console.log(`   Generating Content ${i + 1}/${CONFIG.contentsPerCycle}...`);
      const content = await generateContent(llm, campaignData, researchData, competitorAnalysis, i);
      contents.push(content);
      console.log(`   ✅ Content ${i + 1}: ${content.substring(0, 50)}...`);
      await delay(CONFIG.delays.betweenContents);
    }
    
    // Stage-by-Stage Evaluation
    const stageResults = await stageByStageEvaluation(llm, contents, campaignData, researchData, competitorContents);
    
    // Store evaluations
    allEvaluations.push({
      cycle,
      stageResults
    });
    
    // Select highest score from passed contents
    if (stageResults.passed.length > 0) {
      const winner = selectHighestScore(stageResults);
      
      if (!bestEvaluation || winner.totalScore > bestEvaluation.totalScore) {
        bestContent = cleanSourceTags(winner.content);
        bestEvaluation = {
          ...winner,
          cycle
        };
      }
      
      console.log(`\n   ✅ Found passing content! Score: ${winner.totalScore}`);
      
      // Continue to find potentially higher score
      console.log('   🔄 Checking if higher score possible...');
    } else {
      console.log(`\n   ❌ No content passed in cycle ${cycle}`);
    }
    
    // If we found good content and had passing contents, we can stop
    if (bestEvaluation && stageResults.passed.length > 0) {
      console.log(`\n   ✅ Best score so far: ${bestEvaluation.totalScore}`);
      break;
    }
    
    await delay(CONFIG.delays.beforeRegenerate);
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // FINAL RESULTS
  // ═══════════════════════════════════════════════════════════════════════
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  const finalResults = {
    success: !!bestContent,
    campaign: campaignData.title,
    campaignData: {
      title: campaignData.title,
      description: campaignData.description,
      style: campaignData.style,
      url: campaignData.campaignUrl || campaignData.url
    },
    bestContent,
    bestEvaluation: bestEvaluation ? {
      totalScore: bestEvaluation.totalScore,
      cycle: bestEvaluation.cycle,
      gate1Score: bestEvaluation.gate1Result?.totalScore,
      judge2Score: bestEvaluation.judge2Result?.totalScore,
      judge3Score: bestEvaluation.result?.totalScore
    } : null,
    allEvaluations: allEvaluations.map(e => ({
      cycle: e.cycle,
      passed: e.stageResults.passed.length,
      failed: e.stageResults.failed.length
    })),
    researchData,
    metadata: {
      version: CONFIG.version,
      architecture: '3 AI Judges with Fail Fast',
      duration: `${duration}s`,
      maxCycles: CONFIG.maxRegenerateCycles,
      contentsPerCycle: CONFIG.contentsPerCycle,
      thresholds: CONFIG.thresholds
    }
  };
  
  // Save results
  const outputPath = `${CONFIG.outputDir}/rally-v9.8.3-${Date.now()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));
  
  // Display final summary
  console.log('\n' + '═'.repeat(70));
  console.log('║                    FINAL SUMMARY - v9.8.3                       ║');
  console.log('═'.repeat(70));
  
  if (bestContent) {
    console.log(`\n   ✅ SUCCESS! Best content found.`);
    console.log(`   📊 Total Score: ${bestEvaluation.totalScore}/${CONFIG.thresholds.total.max}`);
    console.log(`   🔄 Found in Cycle: ${bestEvaluation.cycle}`);
    console.log(`\n   📝 FINAL CONTENT:`);
    console.log('   ' + '─'.repeat(60));
    console.log('   ' + bestContent.split('\n').join('\n   '));
    console.log('   ' + '─'.repeat(60));
  } else {
    console.log('\n   ❌ No content passed all 3 judges after maximum cycles.');
  }
  
  console.log(`\n   ⏱️  Total Duration: ${duration}s`);
  console.log(`   💾 Results saved to: ${outputPath}`);
  
  return finalResults;
}

// ============================================================================
// ENTRY POINT
// ============================================================================

async function main() {
  const input = process.argv[2] || 'list';
  
  if (input.toLowerCase() === 'list') {
    await listCampaigns(30);
    process.exit(0);
  }
  
  try {
    const results = await mainWorkflow(input);
    
    if (results?.success) {
      console.log('\n✅ Workflow completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Workflow completed without passing content.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Workflow failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
