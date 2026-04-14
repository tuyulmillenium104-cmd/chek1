# Rally Brain v6.0 - Quick Start Guide

> For new AI chat sessions. Read this first, then ARCHITECTURE.md for deep reference.

## 1. What Am I Looking At?

Rally Brain v6.0 is a **multi-campaign** automated content generation system for Rally.fun crypto campaigns. It runs **3 campaigns simultaneously** every 45 minutes, generating X/Twitter posts about DeFi projects. Each campaign gets scored on a 23-point rubric (7 categories), produces 10 Q&A reply pairs, and learns from its own past cycles to improve quality over time.

**Key difference from v5.x**: The system now supports multiple campaigns via a config-driven architecture. Each campaign has its own JSON config file, output directory, and knowledge database. The orchestrator (`run_all.js`) runs all campaigns sequentially every cron trigger.

### Active Campaigns

| ID | Mission | Contract |
|----|---------|----------|
| `marbmarket-m0` | Explain the veDEX Model & Why MarbMarket Matters | `0x39a11fa3...` |
| `marbmarket-m1` | Breakdown the MARB Token Incentive Loop & Fair Launch Mechanics | `0x39a11fa3...` |
| `second-campaign` | TBD (placeholder) | `0xE4aeE08A...` |

### Token Budget
- 5 tokens x 300/day = 1,500 calls/day
- 3 campaigns x 12 calls/cycle = 36 calls per rotation
- Runs every 45 minutes = 32 rotations/day = 1,152 calls/day (buffer: 23%)

## 2. Common Tasks

| Task | Command |
|------|---------|
| **Run all campaigns** | `node /home/z/my-project/download/rally-brain/run_all.js` |
| Run specific campaign | `node /home/z/my-project/download/rally-brain/run_all.js marbmarket-m0` |
| List available campaigns | `node /home/z/my-project/download/rally-brain/run_all.js --list` |
| Run single with self-heal | `node /home/z/my-project/download/rally-brain/self_heal.js --campaign marbmarket-m0` |
| Run generate directly | `cd /home/z/my-project && node generate.js marbmarket-m0` |
| Check health | `node /home/z/my-project/download/rally-brain/health_monitor.js status` |
| Reset health | `node /home/z/my-project/download/rally-brain/health_monitor.js reset` |
| View latest content (M0) | Read `campaign_data/marbmarket-m0_output/best_content.txt` |
| View latest score (M0) | Read `campaign_data/marbmarket-m0_output/prediction.json` |
| View cycle history (M0) | Read `campaign_data/marbmarket-m0_knowledge_db.json` -> `cycle_history` |
| Syntax check | `node -c /home/z/my-project/download/rally-brain/generate.js` |
| Push to GitHub | `cd /home/z/my-project && git add -A && git commit -m "msg" && git push origin main` |

## 3. How Multi-Campaign Works

```
CRON (45 min) -> run_all.js
  -> self_heal.js --campaign marbmarket-m0 -> generate.js marbmarket-m0
  -> self_heal.js --campaign marbmarket-m1 -> generate.js marbmarket-m1
  -> self_heal.js --campaign second-campaign -> generate.js second-campaign
```

Each campaign config is in `campaigns/<id>.json` with:
- `campaign`: title, contract address, reward, creator
- `mission`: title, description, rules
- `knowledge_base`: project facts for the AI to write about
- `campaign_rules`: style and tone guidelines
- `compliance_checks`: required mentions, keywords, fallback Q&A

## 4. How to Add a New Campaign

1. Copy an existing config:
   ```bash
   cp campaigns/marbmarket-m0.json campaigns/new-campaign.json
   ```
2. Edit the JSON fields (campaign, mission, knowledge_base, compliance_checks)
3. Verify: `node run_all.js --list`
4. It will run automatically on next cron cycle

## 5. How to Add Tokens

Edit `zai-resilient.js` CONFIG.tokens array. Each token needs HS256 JWT with `user_id` + `chat_id`.

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

## 6. How to Diagnose Problems

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 429 / RATE_LIMITED | API quota exhausted | Wait for midnight UTC reset or add tokens |
| SyntaxError in generate.js | Broken code from edit | Check recent edits, run `node -c generate.js` |
| Cannot find module 'z-ai-web-dev-sdk' | SDK not installed | `cd /home/z/my-project && bun install` |
| Campaign config not found | Wrong campaign ID | Check `campaigns/` dir, use `run_all.js --list` |
| No output files | generate.js didn't complete | Check self_heal.js logs, check health status |
| All variations score < 13 | Prompt or config issue | Check knowledge_base, review banned words |
| Score declining over cycles | Learning loop too aggressive | Check campaign knowledge_db.json |
| Process dies with nohup | Fixed in v2.2 | `setBlocking(true)` now handles this |

## 7. Important File Paths

```
/home/z/my-project/download/rally-brain/
  run_all.js              <- Multi-campaign orchestrator
  generate.js             <- Main pipeline (parameterized)
  self_heal.js             <- Runner with auto-retry + health monitor
  health_monitor.js        <- Health tracking
  zai-resilient.js         <- Token pool
  campaigns/               <- Campaign config files (JSON)
    marbmarket-m0.json
    marbmarket-m1.json
    second-campaign.json
  campaign_data/
    marbmarket-m0_output/     <- M0 output (content, Q&A, scores)
    marbmarket-m1_output/     <- M1 output
    second-campaign_output/   <- 2nd campaign output
    marbmarket-m0_knowledge_db.json  <- M0 learning data
    marbmarket-m1_knowledge_db.json  <- M1 learning data
    health_status.json        <- Health monitor state
    recovery_log.json         <- Self-heal history
    orchestrator_log.json     <- Run-all history

/home/z/my-project/upload/rally_logs_extracted/  <- External Rally data
```

## 8. GitHub

- **Repo**: https://github.com/tuyulmillenium104-cmd/chek1
- **Branch**: `main`
- To push new changes: `git add -f download/rally-brain/<new-files> && git commit -m "msg" && git push origin main`
- Note: `download/` is in `.gitignore`, use `git add -f` for new files
