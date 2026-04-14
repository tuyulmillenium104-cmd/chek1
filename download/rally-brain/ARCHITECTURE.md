# Rally Brain v6.0 - Technical Architecture

Definitive reference for every subsystem. A new AI chat session should be able to fully understand, operate, modify, and debug the system from this document and QUICKSTART.md alone.

## 1. Full Data Flow

```
EXTERNAL DATA SOURCES
  /home/z/my-project/upload/rally_logs_extracted/
    rally_pattern_cache.json      <- 200 Rally submissions analyzed
    rally_knowledge_vault.json    <- Cross-campaign lessons
    rally_submissions_cache.json  <- Submission records
    rally_submissions_cache_new.json
                    |
                    v
PHASE 0: LEARN (generate.js:extractLearnedKnowledge)
  Loads 4 external JSON + campaign-specific knowledge_db.json cycle history
  Produces LEARNED object:
    patterns[], techniques[], antiAI[], topHooks[], overused[],
    failures[], cycleHistory[], ownTopHooks[], persistentAIWords[],
    weakestCategories[], kdbPatterns (learned_rules)
                    |
                    v
PHASE 1: GENERATE (up to 4 loops x 2 variations = 8 API calls max)
  Each variation:
    1. buildBasePrompt(angle) <- LEARNED context + campaign config injected
    2. generateVariation() -> LLM API via z-ai-resilient.js
    3. sanitizeContent() -> fix dashes, quotes, whitespace, markdown
    4. replaceAIWords() -> 40+ word replacements (flywheel->incentive)
    5. quickScreen() -> Tier 1 compliance check
  Temperature: 0.75 + (loop-1)*0.05 + i*0.03
                    |
                    v
PHASE 2: EVALUATE (per loop, top 1 variation)
  1. quickProgrammaticScore() -> fast heuristic, no API
  2. programmaticEvaluate() -> 7 categories, no API
  3. g4OriginalityCheck() -> human-like bonus [-1.0, +0.5]
  4. Early accept if score >= 21.0
                    |
                    v
PHASE 3: JUDGE VALIDATION (best content only, 2 API calls)
  J3: Rally AI Clone (temp 0.4, compliance-focused)
  J5: AI Fingerprint Detector (temp 0.2, originality-focused)
  Consensus: average of valid judges
                    |
                    v
PHASE 4: Q&A GENERATION (2 API calls, 10 Q&A pairs total)
  2 calls x 5 pairs each from different perspectives
  Fallback: campaign-specific fallback_qa from config
                    |
                    v
PHASE 5: OUTPUT + LEARNING
  Writes: best_content.txt, qa.json, prediction.json, full_output.json
  Updates: campaign-specific knowledge_db.json (cycle history, AI word freq, trends)
```

**API Budget per cycle: 12 calls** (8 gen + 2 QA + 2 judges)
**Cycle duration: ~2 minutes** (12 calls x 10s interval)

## 2. Multi-Campaign Architecture

### Directory Layout
```
rally-brain/
  generate.js                          <- Parameterized pipeline (accepts campaign ID)
  self_heal.js                        <- Spawn-based runner with health check
  run_all.js                          <- Rotation orchestrator (1 per cron)
  health_monitor.js                   <- Per-campaign health tracking
  zai-resilient.js                    <- Token pool (shared across campaigns)
  campaigns/
    marbmarket-m0.json                <- MarbMarket Mission 0 config
    marbmarket-m1.json                <- MarbMarket Mission 1 config
    campaign_3.json                   <- Campaign 3 config (placeholder)
  campaign_data/
    marbmarket-m0_knowledge_db.json   <- Campaign 0 learning
    marbmarket-m1_knowledge_db.json   <- Campaign 1 learning
    campaign_3_knowledge_db.json      <- Campaign 3 learning
    marbmarket-m0_health.json         <- Campaign 0 health state
    marbmarket-m1_health.json         <- Campaign 1 health state
    campaign_3_health.json            <- Campaign 3 health state
    marbmarket-m0_output/             <- Campaign 0 output files
      best_content.txt
      qa.json
      prediction.json
      full_output.json
    marbmarket-m1_output/             <- Campaign 1 output files
    campaign_3_output/                <- Campaign 3 output files
    rotation_state.json               <- Orchestrator rotation tracking
    orchestrator_log.json             <- Orchestrator execution log
    recovery_log.json                 <- Self-heal recovery history
    health_status.json                <- Global health (backward compat)
```

### Rotation Mechanism
```
rotation_state.json:
{
  "last_campaign": "marbmarket-m0",
  "last_run": "2026-04-15T12:00:00Z",
  "cycle_count": 15,
  "campaigns": ["marbmarket-m0", "marbmarket-m1", "campaign_3"]
}

Algorithm:
  nextIndex = (indexOf(last_campaign) + 1) % campaigns.length
  Run campaigns[nextIndex]
  Update rotation_state.json
```

### Campaign Config Format (JSON)
```json
{
  "id": "marbmarket-m0",
  "campaign": {
    "title": "...",
    "contractAddress": "0x...",
    "campaignId": "...",
    "reward": "...",
    "creator": "...",
    "xUsername": "..."
  },
  "mission": {
    "id": "mission-0",
    "title": "...",
    "description": "...",
    "rules": [...]
  },
  "knowledge_base": "...markdown...",
  "campaign_rules": [...],
  "compliance_checks": {
    "must_include": ["@RallyOnChain", "x.com/..."],
    "project_name": "MarbMarket",
    "project_x": "Marb_market",
    "project_keywords": [...],
    "unique_markers": [...],
    "fallback_qa": [...]
  }
}
```

## 3. Token Rotation Mechanism

### getBestToken() Algorithm
```
1. Filter tokens where isExhausted = false
2. If ALL exhausted -> reset all quotas to 300, return TOKEN_1
3. Sort by remainingDaily descending
4. Return token with highest remaining quota
```

### Quota Tracking from Response Headers
After each API response, updateTokenStats() reads:
- `x-ratelimit-remaining-daily` -> token.remainingDaily
- `x-ratelimit-user-daily-remaining` -> token.remainingUserDaily
- Token marked exhausted when remainingDaily < 5

### Gateway Round-Robin
```
getGateway():
  gateway = CONFIG.gateways[gatewayIndex]
  gatewayIndex = (gatewayIndex + 1) % gateways.length
  Alternates: 172.25.136.210:8080 <-> 172.25.136.193:8080
```

## 4. Rate Limiting Strategy

### Three-Tier Limits (empirically tested)

| Tier | Limit | Scope | Notes |
|------|-------|-------|-------|
| Daily | 300/token | Per JWT token | Hard cap, resets midnight UTC |
| IP 10-min | 10/token/gateway | Per token+gateway combo | NOT per IP |
| QPS | 2/sec/gateway | Shared all tokens | Per gateway |

### Current Setting
- minInterval = 10,000ms (1 request per 10 seconds)
- Conservative: ensures we stay under all limits

## 5. Generation Pipeline Detail

### Banned Word Tiers

**Tier 1 - Instant Fail** (21 words + 17 Rally phrases):
- guaranteed, 100%, risk-free, buy now, get rich, passive income
- vibe coding, skin in the game, trust layer, agent era, frictionless

**Tier 2 - Score Penalty** (26 AI words + 21 template + 8 starters):
- delve, leverage, paradigm, tapestry, landscape, nuance, crucial, pivotal
- hot take, let's dive in, nobody is talking about, key takeaways
- Plus 24 extra: flywheel, ecosystem, seamless, robust, innovative...

### AI Word Replacement Map (40+ entries)
flywheel->incentive loop, ecosystem->network, leverage->use, paradigm->model, transform->change, disrupt->shake up, synergy->combo...

### Sanitization Engine
sanitizeContent() applies 11 operations:
1. Em-dash/en-dash -> `. `
2. Double-hyphen -> `. `
3. Smart quotes -> straight quotes
4. Ellipsis -> `...`
5. Zero-width characters removed
6. Line trimming
7. Double spaces -> single
8. Triple+ newlines -> double
9. Markdown bold/italic removed
10. Curly braces removed

## 6. Judge Panel System

### 5 Judges (Only J3 + J5 Active)

| Judge | ID | Temp | Role | Active |
|-------|----|------|------|--------|
| Harsh Crypto Critic | J1 | 0.2 | Skeptical expert | NO (budget) |
| Average X User | J2 | 0.7 | Normal user | NO (budget) |
| Rally AI Clone | J3 | 0.4 | Rally.fun mimic | YES |
| Contrarian | J4 | 0.9 | Devil's advocate | NO (budget) |
| AI Fingerprint | J5 | 0.2 | Detects AI text | YES |

### Consensus Algorithm
```
For GATE categories (originality, alignment, accuracy, compliance):
  failCount = judges giving 0
  if failCount >= 2 -> HARD FAIL (score = 0)
  if failCount == 1 -> MINORITY OVERRIDE (score = 1, flagged)
  else -> min(all values)

For QUALITY categories (engagement, technical, reply_quality):
  score = average of all valid judges

Require >= 2 valid judges for consensus
```

## 7. Closed-Loop Learning

### knowledge_db.json v3.0.0 Schema (Per-Campaign)
```json
{
  "version": "3.0.0",
  "stats": { "total_cycles", "best_score_achieved", "avg_score" },
  "cycle_history": [/* max 50 entries */],
  "ai_word_frequency": { "word": count },
  "winning_hooks": [/* max 20, score >= 20 */],
  "category_trends": { "category": { "total", "count", "avg", "last5" } },
  "patterns": { "semantic": { "name": { "learned_rules": [] } } },
  "scoring_model": { "calibration_log": [/* max 100 */] }
}
```

### Feedback Loop
Cycle N -> saveCycleLearning() -> updates campaign-specific knowledge_db.json
Cycle N+1 -> extractLearnedKnowledge() -> injects learned data into prompt

## 8. Health Monitor State Machine (Per-Campaign)

```
HEALTHY --(3+ fails or 3+ low scores)--> WARNING --(5+ fails)--> CRITICAL
CRITICAL --(auto-skip 3 cycles)--> WARNING --(2+ wins)--> HEALTHY
CRITICAL --(10+ fails)--> EMERGENCY --(auto-skip 5 cycles)--> WARNING
```

### Per-Campaign Health Files
Each campaign gets its own health state:
- `campaign_data/marbmarket-m0_health.json`
- `campaign_data/marbmarket-m1_health.json`
- `campaign_data/campaign_3_health.json`
- `campaign_data/health_status.json` (global, backward compat)

### State Transitions
- Success: failures=0, successes++, CRITICAL->WARNING(1 win), WARNING->HEALTHY(2+ wins)
- Fail: failures++, successes=0, 3->WARNING, 5->CRITICAL+3 cooldown, 10->EMERGENCY+5 cooldown

## 9. Self-Heal Recovery (spawn-based)

### Process Execution (v3.0)
```
self_heal.js:
  spawn('node', ['generate.js', campaignId]) instead of exec()
  - detached: false (we need to wait for completion)
  - stdio: ['ignore', 'pipe', 'pipe']
  - Real-time stdout/stderr piping
  - EPIPE error handling (prevent crash on broken nohup pipe)
  - Force-flush after each log line
```

### Diagnosis Engine (10 error types)
1. cannot find module -> MISSING_DEPENDENCY (bun add)
2. econnrefused/timeout -> NETWORK_ERROR (retry with delay)
3. enoent -> FILE_NOT_FOUND (create dirs)
4. eacces/eperm -> PERMISSION_ERROR (chmod -R 755)
5. syntaxerror -> SYNTAX_ERROR (log only, needs AI)
6. 429/rate limit -> RATE_LIMITED (increase delay)
7. 401/403 -> AUTH_ERROR (clear SDK cache)
8. z-ai-web-dev-sdk -> SDK_ERROR (reinstall)
9. json/parse -> PARSE_ERROR (fix knowledge_db)
10. empty/failed -> GENERATION_QUALITY (retry)

### Recovery Flow
```
self_heal.js:
  preCycleCheck(campaignId) -> skip if CRITICAL with active cooldown
  for attempt 1 to 5:
    spawn("node generate.js campaignId") as child process (timeout: 600s)
    if SUCCESS -> postCycleUpdate(success, campaignId), return
    if FAIL -> diagnose, fix, wait 10s*attempt, retry
  if exhausted -> postCycleUpdate(exhausted, campaignId), "Layer 2 recovery needed"
```

### Nohup Compatibility
- `process.stdout._handle.setBlocking(true)` forces unbuffered output
- `spawn()` with `stdio: 'pipe'` captures all output reliably
- EPIPE handlers prevent crashes when nohup pipes break
- Signal handlers (SIGTERM, SIGINT) for graceful shutdown
- No longer need `stdbuf -oL -eL` prefix

## 10. Orchestrator (run_all.js v2.0)

### Rotation Mode (default)
```
CRON (45 min) -> run_all.js
  Reads campaigns/ directory for *.json files
  Reads rotation_state.json for last_campaign
  Picks NEXT campaign: (lastIndex + 1) % campaigns.length
  Runs: spawn("node self_heal.js --campaign nextCampaign")
  Updates rotation_state.json
  Logs to orchestrator_log.json
```

### Other Modes
```
run_all.js marbmarket-m0    -> Run specific campaign
run_all.js --list           -> List all campaigns
run_all.js --all            -> Run ALL sequentially (legacy mode)
```

## 11. Quota Math

```
cycles_per_campaign_per_day = (tokens x 300) / (campaigns x 12)

5 tokens:
  1 campaign: (5x300)/(1x12) = 125 cycles/day -> ~11 min
  2 campaigns: (5x300)/(2x12) = 62 cycles/day -> ~23 min
  3 campaigns: (5x300)/(3x12) = 41 cycles/day -> ~35 min
```

## 12. Environment & Critical Paths

### Runtime
- Node.js v18+, bun for package management
- z-ai-web-dev-sdk (LLM API client)

### System Auto-Token
- Path: `/etc/.z-ai-config`
- Auto-generated by the platform
- Contains: baseUrl, apiKey, chatId, token (JWT), userId
- Currently used as TOKEN_5_AUTO in the pool

### Critical Paths
```
/home/z/my-project/download/rally-brain/                      <- Project root
/home/z/my-project/download/rally-brain/generate.js            <- Main pipeline
/home/z/my-project/download/rally-brain/zai-resilient.js       <- Token pool
/home/z/my-project/download/rally-brain/self_heal.js           <- Runner (spawn-based)
/home/z/my-project/download/rally-brain/health_monitor.js      <- Health (per-campaign)
/home/z/my-project/download/rally-brain/run_all.js              <- Orchestrator
/home/z/my-project/download/rally-brain/campaigns/              <- Campaign configs
/home/z/my-project/download/rally-brain/campaign_data/          <- Output + state
/home/z/my-project/download/rally-brain/campaign_data/rotation_state.json
/home/z/my-project/download/rally-brain/campaign_data/orchestrator_log.json
/home/z/my-project/download/rally-brain/campaign_data/recovery_log.json
/home/z/my-project/upload/rally_logs_extracted/                <- External Rally data
/home/z/my-project/                                             <- bun workspace root (for SDK)
```
