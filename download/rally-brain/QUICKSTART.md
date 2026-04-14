# Rally Brain v5.2.1 - Quick Start Guide

> For new AI chat sessions. Read this first, then ARCHITECTURE.md for deep reference.

## 1. What Am I Looking At?

Rally Brain is an automated content generation system for Rally.fun crypto campaigns. It generates X/Twitter posts about DeFi projects, scores them on a 23-point rubric (7 categories), and saves the best output with 10 Q&A reply pairs. The system runs on a 30-minute cron cycle (Job 89260), uses 5 API tokens with rotation (1,500 calls/day), and learns from its own past cycles to improve quality over time. Current campaign is MarbMarket (veDEX on MegaETH), averaging 17.2/23 across 9 cycles.

## 2. Common Tasks

| Task | Command |
|------|---------|
| Check health | `node /home/z/my-project/download/rally-brain/health_monitor.js status` |
| Run cycle (recommended) | `node /home/z/my-project/download/rally-brain/self_heal.js` |
| Run generate directly | `cd /home/z/my-project && node /home/z/my-project/download/rally-brain/generate.js` |
| Reset health monitor | `node /home/z/my-project/download/rally-brain/health_monitor.js reset` |
| View latest content | Read `campaign_data/0x39a11fa3..._output/best_content.txt` |
| View latest score | Read `campaign_data/0x39a11fa3..._output/prediction.json` |
| View cycle history | Read `knowledge_db.json` -> `cycle_history` |
| Check recovery log | Read `campaign_data/recovery_log.json` |
| Syntax check | `node -c /home/z/my-project/download/rally-brain/generate.js` |
| Push to GitHub | `cd /home/z/my-project/download/rally-brain && git add -A && git commit -m "msg" && git push origin main` |

## 3. How to Run a Cycle

```bash
# Recommended (with self-heal + health monitoring):
node /home/z/my-project/download/rally-brain/self_heal.js

# Direct (no retry, no health check):
cd /home/z/my-project && node /home/z/my-project/download/rally-brain/generate.js

# For nohup/cron (line-buffered output):
stdbuf -oL -eL node generate.js > campaign_data/cycle_output.log 2>&1
```

Cycle takes ~2 minutes (12 API calls, 10s intervals).

## 4. How to Check Health

```bash
node /home/z/my-project/download/rally-brain/health_monitor.js status
```

| Status | Meaning | Action |
|--------|---------|--------|
| HEALTHY | Normal | Run normally |
| WARNING | 3+ fails or 3+ low scores | Monitor closely |
| CRITICAL | 5+ fails | Auto-skips 3 cycles |
| EMERGENCY | 10+ fails | Auto-skips 5 cycles |

Look at: Success Rate, Best/Worst scores, Trend, Cooldown remaining.

## 5. How to Add Tokens

Edit `zai-resilient.js` CONFIG.tokens array. Each token must be HS256 JWT with `user_id` + `chat_id`.

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

Each token = +300 daily calls = +25 cycles/day. System auto-selects token with most remaining quota.

## 6. How to Add a New Campaign

Edit these 3 sections at the top of `generate.js`:

```javascript
// 1. CAMPAIGN object (line ~29)
const CAMPAIGN = {
  title: "New Campaign Title",
  contractAddress: "0xNewContractAddress",
  campaignId: "campaign-xxx",
  reward: "1000 USDC",
  creator: "Creator (@handle)",
  xUsername: "handle"
};

// 2. MISSION_0 object (line ~38)
const MISSION_0 = {
  id: "mission-0",
  title: "Mission Title",
  description: "What to create",
  rules: ["Rule 1", "Rule 2"]
};

// 3. KNOWLEDGE_BASE string (line ~53)
const KNOWLEDGE_BASE = `
## Project Info
Key facts...
`;
```

Also update: output directory path, quickScreen banned words if different, programmaticEvaluate alignment keywords, generateQA fallback Q&A.

## 7. How to Diagnose Problems

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 429 / RATE_LIMITED | API quota exhausted | Wait for midnight UTC reset or add tokens |
| SyntaxError in generate.js | Broken code from edit | Check recent edits, run `node -c generate.js` |
| Cannot find module 'z-ai-web-dev-sdk' | SDK not installed | `cd /home/z/my-project && bun install` |
| ECONNREFUSED / ETIMEDOUT | Gateway unreachable | Check 172.25.136.210:8080 and .193:8080 |
| All variations score < 13 | Prompt or config issue | Check KNOWLEDGE_BASE, review banned words |
| Score declining over cycles | Learning loop too aggressive | Review knowledge_db.json, may need `health_monitor.js reset` |
| valid_judges: 0 | Known issue (not a bug) | Judges run but programmatic score used as primary |
| Process dies with nohup | Output buffering | Use `stdbuf -oL -eL` prefix |

## 8. Known Issues

1. `valid_judges` always 0 - J3/J5 run but programmatic evaluator is primary scorer
2. Accuracy declining (avg 68%) - LLM tends to exaggerate claims
3. Reply Quality weak (avg 58%) - Generated questions too generic
4. nohup + Node.js die silently - Use `stdbuf -oL -eL`
5. Recovery log shows "pending" status even after successful recovery

## 9. How to Push to GitHub

```bash
cd /home/z/my-project/download/rally-brain
git status                          # Check changes
git add -A                          # Stage all
git commit -m "description"         # Commit
git push origin main                # Push
```

Repo: https://github.com/tuyulmillenium104-cmd/chek1
Branch: `main`

## 10. Important File Paths

```
/home/z/my-project/download/rally-brain/
  generate.js          <- Main pipeline (EDIT for campaigns)
  zai-resilient.js     <- Token pool (EDIT for tokens)
  self_heal.js         <- Runner (rarely edit)
  health_monitor.js    <- Health tracking (rarely edit)
  knowledge_db.json    <- Learning data (auto-managed)
  README.md            <- This overview
  ARCHITECTURE.md      <- Deep technical reference
  QUICKSTART.md        <- This file
  campaign_data/
    0x39a11fa3..._output/
      best_content.txt   <- Latest winning content
      qa.json            <- 10 Q&A reply pairs
      prediction.json    <- Cycle score + metadata
    health_status.json   <- Health monitor state
    recovery_log.json    <- Self-heal history
    cycle_output.log     <- Process log

/home/z/my-project/upload/rally_logs_extracted/  <- External Rally data
  rally_pattern_cache.json
  rally_knowledge_vault.json
  rally_submissions_cache.json
```

## Quick Reference: Score Categories

| Category | Max | Current Avg | Status |
|----------|-----|-------------|--------|
| originality | 2 | 1.47 | 74% |
| alignment | 2 | 2.00 | 100% |
| accuracy | 2 | 1.36 | 68% (weak) |
| compliance | 2 | 1.96 | 98% |
| engagement | 5 | 3.59 | 72% |
| technical | 5 | 3.88 | 78% |
| reply_quality | 5 | 2.90 | 58% (weak) |
| **Total** | **23** | **17.2** | **75%** |
