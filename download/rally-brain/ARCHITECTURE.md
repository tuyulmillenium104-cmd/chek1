# Rally Brain v5.2.1 - Technical Architecture

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
  Loads 4 external JSON + knowledge_db.json cycle history
  Produces LEARNED object:
    patterns[], techniques[], antiAI[], topHooks[], overused[],
    failures[], cycleHistory[], ownTopHooks[], persistentAIWords[],
    weakestCategories[], kdbPatterns (learned_rules)
                    |
                    v
PHASE 1: GENERATE (up to 4 loops x 2 variations = 8 API calls max)
  Each variation:
    1. buildBasePrompt(angle) <- LEARNED context injected
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
  Fallback: 12 hardcoded Q&A if API fails
                    |
                    v
PHASE 5: OUTPUT + LEARNING
  Writes: best_content.txt, qa.json, prediction.json, full_output.json
  Updates: knowledge_db.json (cycle history, AI word freq, trends)
```

**API Budget per cycle: 12 calls** (8 gen + 2 QA + 2 judges)
**Cycle duration: ~2 minutes** (12 calls x 10s interval)

## 2. Token Rotation Mechanism

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

### SDK vs HTTP Direct
The `chat()` method uses z-ai-web-dev-sdk (not raw HTTP). The `makeRequest()` method exists for HTTP direct but is NOT used in the main chat() flow. The SDK handles authentication internally via .z-ai-config file.

## 3. Rate Limiting Strategy

### Three-Tier Limits (empirically tested)

| Tier | Limit | Scope | Notes |
|------|-------|-------|-------|
| Daily | 300/token | Per JWT token | Hard cap, resets midnight UTC |
| IP 10-min | 10/token/gateway | Per token+gateway combo | NOT per IP |
| QPS | 2/sec/gateway | Shared all tokens | Per gateway |

### Current Setting
- minInterval = 10,000ms (1 request per 10 seconds)
- This is the effective bottleneck
- Conservative: ensures we stay under all limits

### Rate Limiter Implementation
```
waitForSlot():
  filter requestTimes older than 10s
  if any recent request exists:
    wait = 10s - (now - oldest) + 500ms
    sleep(wait)
  push current time
```

## 4. Generation Pipeline Detail

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

### Generation Loop
```
for loop 1 to 4:
  for variation 0 to 1:
    generate with angle, temp=0.75+(loop-1)*0.05+i*0.03
    sanitize + replace AI words
    quickScreen -> skip if fail

  evaluate top 1 variation
  if score >= 21.0 -> EARLY ACCEPT
  if score > bestEver -> update bestEver
  buildImprovementPrompt for next loop
```

## 5. Judge Panel System

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

## 6. G4 Originality Detection

```
g4OriginalityCheck(content):
  bonus = 0
  +0.15 if sentence CV > 0.35 (human-like variation)
  +0.05 if sentence CV > 0.25
  +0.10 if 2+ personal voice markers (i've, i'm, my, maybe...)
  +0.10 if 3+ contractions (don't, can't, won't...)
  +0.10 if uncertainty shown (maybe, not sure, could be...)
  +0.10 if zero AI words (clean sweep)
  -0.05 per remaining AI word
  +0.05 if mixed short+long sentences
  return clamp(bonus, -1.0, +0.5)
```

## 7. Closed-Loop Learning

### knowledge_db.json v3.0.0 Schema
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
Cycle N -> saveCycleLearning() -> updates knowledge_db.json
Cycle N+1 -> extractLearnedKnowledge() -> injects learned data into prompt

Key learned data injected:
- ownTopHooks (best hooks from past cycles, score >= 20)
- persistentAIWords (words appearing in 3+ cycles)
- weakestCategories (lowest fill % categories)
- kdbPatterns (semantic learned_rules from 3+ cycles)
- Recent hooks explicitly marked "AVOID" (last 3)

## 8. Health Monitor State Machine

```
HEALTHY --(3+ fails or 3+ low scores)--> WARNING --(5+ fails)--> CRITICAL
CRITICAL --(auto-skip 3 cycles)--> WARNING --(2+ wins)--> HEALTHY
CRITICAL --(10+ fails)--> EMERGENCY --(auto-skip 5 cycles)--> WARNING

Independent quality track:
  3+ scores < 13 -> QUALITY_WARNING
  6+ scores < 13 -> QUALITY_CRITICAL
```

### State Transitions
- Success: failures=0, successes++, CRITICAL->WARNING(1 win), WARNING->HEALTHY(2+ wins)
- Fail: failures++, successes=0, 3->WARNING, 5->CRITICAL+3 cooldown, 10->EMERGENCY+5 cooldown
- Cooldown: if hoursSince/0.5 >= cooldown_remaining -> allow retry
- STALE warning if no cycle in 2+ hours

## 9. Self-Heal Recovery

### Diagnosis Engine (10 error types)
1. cannot find module -> MISSING_DEPENDENCY (bun add)
2. econnrefused/timeout -> NETWORK_ERROR (retry with delay)
3. enoent -> FILE_NOT_FOUND (create dirs + knowledge_db)
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
  preCycleCheck() -> skip if CRITICAL with active cooldown
  for attempt 1 to 5:
    exec("node generate.js") as child process (timeout: 600s)
    if SUCCESS -> postCycleUpdate(success), return
    if FAIL -> diagnose, fix, wait 10s*attempt, retry
  if exhausted -> postCycleUpdate(exhausted), "Layer 2 recovery needed"
```

### Process Isolation
generate.js runs as child process via exec() (not require()). This means memory leaks don't accumulate, module cache is fresh, timeout enforced at OS level.

## 10. Multi-Campaign Architecture (Planned)

### Proposed Layout
```
generate.js              <- Base logic (parameterized)
campaigns/
  marbmarket/
    config.js             <- CAMPAIGN, MISSION_0, KNOWLEDGE_BASE
    knowledge_db.json     <- Campaign-specific learning
    output/               <- best_content.txt, qa.json, prediction.json
  campaign_b/
    config.js
    knowledge_db.json
    output/
self_heal.js             <- Modified to accept campaign path arg
run_all.js               <- Orchestrator: rotates campaigns
```

### Key Changes Needed
1. Extract campaign config from generate.js into separate files
2. Parameterize knowledge_db.json path per campaign
3. Parameterize output directory per campaign
4. Add campaign orchestrator (rotate which campaign runs each cron)
5. Coordinate token pool (prevent same-token exhaustion)

### Quota Math
```
cycles_per_campaign_per_day = (tokens x 300) / (campaigns x 12)

5 tokens:
  1 campaign: (5x300)/(1x12) = 125 cycles/day -> ~11 min
  2 campaigns: (5x300)/(2x12) = 62 cycles/day -> ~23 min
  3 campaigns: (5x300)/(3x12) = 41 cycles/day -> ~35 min

9 tokens (for 3 campaigns @ ~19 min):
  3 campaigns: (9x300)/(3x12) = 75 cycles/day -> ~19 min
```

## 11. Environment & Critical Paths

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
/home/z/my-project/download/rally-brain/            <- Project root
/home/z/my-project/download/rally-brain/generate.js  <- Main pipeline
/home/z/my-project/download/rally-brain/zai-resilient.js <- Token pool
/home/z/my-project/download/rally-brain/self_heal.js <- Runner
/home/z/my-project/download/rally-brain/health_monitor.js <- Health
/home/z/my-project/download/rally-brain/knowledge_db.json <- Learning
/home/z/my-project/download/rally-brain/campaign_data/ <- Output
/home/z/my-project/download/rally-brain/campaign_data/0x39a11fa3e86eA8AC53772F26AA36b07506fa7dDB_output/ <- Current campaign output
/home/z/my-project/download/rally-brain/campaign_data/health_status.json <- Health state
/home/z/my-project/download/rally-brain/campaign_data/recovery_log.json <- Recovery history
/home/z/my-project/upload/rally_logs_extracted/ <- External Rally data
/home/z/my-project/ <- bun workspace root (for SDK)
```
