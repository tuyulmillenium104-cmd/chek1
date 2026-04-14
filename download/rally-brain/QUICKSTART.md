# Rally Brain v6.0 - Quick Start Guide

> For new AI chat sessions. Read this first, then ARCHITECTURE.md for deep reference.

## 1. What Am I Looking At?

Rally Brain is an automated content generation system for Rally.fun crypto campaigns. It generates X/Twitter posts about DeFi projects, scores them on a 23-point rubric (7 categories), and saves the best output with 10 Q&A reply pairs. The system runs on a 45-minute cron cycle, uses 5 API tokens with rotation (1,500 calls/day), and learns from its own past cycles to improve quality over time.

**v6.0**: Now supports 3 simultaneous campaigns with round-robin rotation. Each campaign has independent learning (knowledge_db.json), health tracking, and output directories.

Active campaigns:
1. **MarbMarket M0** - Explain the veDEX Model & Why MarbMarket Matters (2000 USDC)
2. **MarbMarket M1** - Breakdown the MARB Token Incentive Loop & Fair Launch Mechanics (2000 USDC)
3. **Campaign 3** - Placeholder (contract 0xE4aeE08A3537544f7B946d429ca60990af443Da7)

## 2. Common Tasks

| Task | Command |
|------|---------|
| Run next campaign (rotation) | `cd /home/z/my-project && node /home/z/my-project/download/rally-brain/run_all.js` |
| Run specific campaign | `cd /home/z/my-project && node /home/z/my-project/download/rally-brain/self_heal.js --campaign marbmarket-m0` |
| Run with orchestrator fallback | `cd /home/z/my-project && node /home/z/my-project/download/rally-brain/self_heal.js` |
| Run generate directly (no retry) | `cd /home/z/my-project && node /home/z/my-project/download/rally-brain/generate.js marbmarket-m0` |
| Check health (all campaigns) | `node /home/z/my-project/download/rally-brain/health_monitor.js all` |
| Check health (specific) | `node /home/z/my-project/download/rally-brain/health_monitor.js status --campaign marbmarket-m0` |
| Reset health monitor | `node /home/z/my-project/download/rally-brain/health_monitor.js reset --campaign marbmarket-m0` |
| List campaigns | `node /home/z/my-project/download/rally-brain/run_all.js --list` |
| Run ALL campaigns sequentially | `node /home/z/my-project/download/rally-brain/run_all.js --all` |
| View latest content (M0) | Read `campaign_data/marbmarket-m0_output/best_content.txt` |
| View latest score (M0) | Read `campaign_data/marbmarket-m0_output/prediction.json` |
| View cycle history (M0) | Read `campaign_data/marbmarket-m0_knowledge_db.json` -> `cycle_history` |
| View rotation state | Read `campaign_data/rotation_state.json` |
| Check recovery log | Read `campaign_data/recovery_log.json` |
| Syntax check | `node -c /home/z/my-project/download/rally-brain/generate.js` |
| Push to GitHub | `cd /home/z/my-project/download/rally-brain && git add -A && git commit -m "msg" && git push origin main` |

## 3. How to Run a Cycle

```bash
# Recommended: rotation mode (picks next campaign automatically)
cd /home/z/my-project && node /home/z/my-project/download/rally-brain/run_all.js

# Specific campaign with self-heal:
cd /home/z/my-project && node /home/z/my-project/download/rally-brain/self_heal.js --campaign marbmarket-m0

# Direct (no retry, no health check):
cd /home/z/my-project && node /home/z/my-project/download/rally-brain/generate.js marbmarket-m0

# For nohup/cron (no longer needs stdbuf!):
nohup node /home/z/my-project/download/rally-brain/self_heal.js --campaign marbmarket-m0 > campaign_data/cycle_output.log 2>&1 &
```

**Nohup fix (v6.0)**: `self_heal.js` now handles unbuffered output internally. You no longer need `stdbuf -oL -eL` prefix.

Cycle takes ~2 minutes (12 API calls, 10s intervals).

## 4. Multi-Campaign System

### Rotation (default)
Each cron invocation runs exactly ONE campaign, rotating through all 3:
```
Run 1: marbmarket-m0 -> Run 2: marbmarket-m1 -> Run 3: campaign_3 -> Run 4: marbmarket-m0 ...
```

### Direct campaign targeting
Use `--campaign <id>` with self_heal.js:
```bash
node self_heal.js --campaign marbmarket-m0
node self_heal.js --campaign marbmarket-m1
node self_heal.js --campaign campaign_3
```

### Per-campaign data isolation
Each campaign has independent:
- **Knowledge DB**: `campaign_data/<id>_knowledge_db.json` (learning from past cycles)
- **Health State**: `campaign_data/<id>_health.json` (health monitor)
- **Output**: `campaign_data/<id>_output/` (best_content.txt, qa.json, prediction.json)

## 5. How to Check Health

```bash
# All campaigns at once:
node /home/z/my-project/download/rally-brain/health_monitor.js all

# Specific campaign:
node /home/z/my-project/download/rally-brain/health_monitor.js status --campaign marbmarket-m0
```

| Status | Meaning | Action |
|--------|---------|--------|
| HEALTHY | Normal | Run normally |
| WARNING | 3+ fails or 3+ low scores | Monitor closely |
| CRITICAL | 5+ fails | Auto-skips 3 cycles |
| EMERGENCY | 10+ fails | Auto-skips 5 cycles |

## 6. How to Add a New Campaign

1. Create a config file in `campaigns/<campaign-id>.json`:
```json
{
  "id": "new-campaign",
  "campaign": {
    "title": "Campaign Title",
    "contractAddress": "0x...",
    "campaignId": "...",
    "reward": "...",
    "creator": "...",
    "xUsername": "..."
  },
  "mission": {
    "id": "mission-0",
    "title": "Mission Title",
    "description": "What to create",
    "rules": ["Rule 1", "Rule 2"]
  },
  "knowledge_base": "## Key facts about the project...",
  "campaign_rules": ["Rule 1", "Rule 2"],
  "compliance_checks": {
    "must_include": ["@RallyOnChain", "x.com/..."],
    "project_name": "ProjectName",
    "project_x": "project_x",
    "project_keywords": ["keyword1", "keyword2"],
    "unique_markers": ["marker1", "marker2"],
    "fallback_qa": [
      {"q": "Question?", "a": "Answer..."}
    ]
  }
}
```

2. The orchestrator will automatically pick it up on the next rotation.
3. No changes needed to generate.js, self_heal.js, or run_all.js.

## 7. How to Add Tokens

Edit `zai-resilient.js` CONFIG.tokens array:
```javascript
{
  name: 'TOKEN_6',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  userId: 'uuid-here',
  chatId: 'chat-uuid-here',
  priority: 6,
  remainingDaily: 300,
  remainingUserDaily: 500,
  requestCount: 0,
  isExhausted: false
}
```

Each token = +300 daily calls = +25 cycles/day.

## 8. How to Diagnose Problems

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 429 / RATE_LIMITED | API quota exhausted | Wait for midnight UTC reset or add tokens |
| SyntaxError in generate.js | Broken code from edit | Check recent edits, run `node -c generate.js` |
| Cannot find module 'z-ai-web-dev-sdk' | SDK not installed | `cd /home/z/my-project && bun install` |
| ECONNREFUSED / ETIMEDOUT | Gateway unreachable | Check 172.25.136.210:8080 and .193:8080 |
| All variations score < 13 | Prompt or config issue | Check campaign config, review banned words |
| Score declining over cycles | Learning loop too aggressive | Check knowledge_db.json, may need `health_monitor.js reset --campaign <id>` |
| valid_judges: 0 | Known issue (not a bug) | Judges run but programmatic score used as primary |
| nohup dies silently | Output buffering | **FIXED in v6.0** - no longer need `stdbuf` |

## 9. Known Issues

1. `valid_judges` always 0 - J3/J5 run but programmatic evaluator is primary scorer
2. Accuracy declining (avg 68%) - LLM tends to exaggerate claims
3. Reply Quality weak (avg 58%) - Generated questions too generic

## 10. How to Push to GitHub

```bash
cd /home/z/my-project/download/rally-brain
git status
git add -A
git commit -m "description"
git push origin main
```

Repo: https://github.com/tuyulmillenium104-cmd/chek1

## 11. Important File Paths

```
/home/z/my-project/download/rally-brain/
  generate.js              <- Main pipeline (parameterized)
  zai-resilient.js         <- Token pool (edit for tokens)
  self_heal.js             <- Runner (spawn-based, nohup-safe)
  health_monitor.js        <- Health tracking (per-campaign)
  run_all.js               <- Orchestrator (rotation mode)
  campaigns/
    marbmarket-m0.json     <- Campaign 1 config
    marbmarket-m1.json     <- Campaign 2 config
    campaign_3.json        <- Campaign 3 config (placeholder)
  campaign_data/
    <id>_knowledge_db.json <- Per-campaign learning
    <id>_health.json       <- Per-campaign health
    <id>_output/           <- Per-campaign output
      best_content.txt
      qa.json
      prediction.json
      full_output.json
    rotation_state.json    <- Orchestrator state
    orchestrator_log.json  <- Orchestrator log
    recovery_log.json      <- Self-heal history
    health_status.json     <- Global health (backward compat)
```

## Quick Reference: Score Categories

| Category | Max | Current Avg | Status |
|----------|-----|-------------|--------|
| originality | 2 | ~1.47 | 74% |
| alignment | 2 | ~2.00 | 100% |
| accuracy | 2 | ~1.36 | 68% (weak) |
| compliance | 2 | ~1.96 | 98% |
| engagement | 5 | ~3.59 | 72% |
| technical | 5 | ~3.88 | 78% |
| reply_quality | 5 | ~2.90 | 58% (weak) |
| **Total** | **23** | **~17.2** | **75%** |
