# Rally Brain v6.0 - Multi-Campaign

Automated content generation system for [Rally.fun](https://rally.fun) campaigns. Generates high-quality, anti-AI-detected social media posts using a multi-stage pipeline with closed-loop learning, LLM judge evaluation, and self-healing error recovery.

> **Active Campaigns**: 3 campaigns running simultaneously every 45 minutes
> - **MarbMarket M0**: "Explain the veDEX Model & Why MarbMarket Matters"
> - **MarbMarket M1**: "Breakdown the MARB Token Incentive Loop & Fair Launch Mechanics"
> - **Second Campaign**: `0xE4aeE08A3537544f7B946d429ca60990af443Da7` (placeholder, update when live)

## Quick Start

See **[QUICKSTART.md](QUICKSTART.md)** for new AI chat sessions - read this first!

For deep technical reference, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Architecture Overview (v6.0 Multi-Campaign)

```
CRON (every 45 min)
    |
    v
run_all.js (v1.0) - Orchestrator: runs ALL campaigns sequentially
    |
    +---> self_heal.js --campaign marbmarket-m0 --campaign marbmarket-m1 --campaign second-campaign
    |         |
    |         v
    |     generate.js <campaign_id> - LEARN -> GENERATE -> EVALUATE -> JUDGE -> Q&A -> OUTPUT
    |         |                        Budget: 12 API calls/cycle (~2 min)
    |         v
    |     zai-resilient.js (v1.0) - 5 tokens x 300/day = 1,500 quota, 10s rate limit
    |
    +---> 15s gap between campaigns
    +---> Next campaign...
```

## Files

| File | Version | Purpose |
|------|---------|---------|
| `run_all.js` | v1.0 | Multi-campaign orchestrator (runs all campaigns sequentially) |
| `generate.js` | v6.0 | Main pipeline (parameterized: accepts campaign ID as argument) |
| `self_heal.js` | v2.2 | Runner with auto-diagnosis, health monitoring, multi-campaign support |
| `zai-resilient.js` | v1.0 | Token rotation (5 tokens), rate limiting, 5x retry |
| `health_monitor.js` | v1.0 | 4-level health tracking (HEALTHY/WARNING/CRITICAL/EMERGENCY) |
| `campaigns/` | - | Campaign config files (JSON) |
| `campaigns/marbmarket-m0.json` | - | MarbMarket Mission 0 config |
| `campaigns/marbmarket-m1.json` | - | MarbMarket Mission 1 config |
| `campaigns/second-campaign.json` | - | Second campaign config (placeholder) |
| `campaign_data/` | - | Per-campaign output dirs and knowledge DBs |

## How Multi-Campaign Works

Each campaign has its own config file in `campaigns/`:
```
campaigns/
  marbmarket-m0.json    <- Campaign definition, mission, knowledge base, compliance rules
  marbmarket-m1.json    <- Same project, different mission
  second-campaign.json  <- Different contract
```

Each campaign gets its own:
- Output directory: `campaign_data/<campaign-id>_output/`
- Knowledge DB: `campaign_data/<campaign-id>_knowledge_db.json`
- Cycle history, AI word frequency, category trends (all per-campaign)

## Commands

| Task | Command |
|------|---------|
| Run all 3 campaigns | `node run_all.js` |
| Run specific campaign | `node run_all.js marbmarket-m0` |
| List available campaigns | `node run_all.js --list` |
| Run single campaign (with self-heal) | `node self_heal.js --campaign marbmarket-m0` |
| Run generate directly (no retry) | `cd /home/z/my-project && node generate.js marbmarket-m0` |
| Check health | `node health_monitor.js status` |
| Reset health | `node health_monitor.js reset` |
| Push to GitHub | `git add -A && git commit -m "msg" && git push origin main` |

## Token Pool (5 tokens = 1,500 calls/day)

| Token | User ID | Source |
|-------|---------|--------|
| TOKEN_1 | 97631263... | Manual |
| TOKEN_2 | 1cdcf579... | Manual |
| TOKEN_3 | 97631263... | Manual |
| TOKEN_4 | bb829ea3... | Manual |
| TOKEN_5_AUTO | 4f3de308... | System auto |

## Quota Math (3 campaigns, 45 min interval)

```
5 tokens x 300 calls = 1,500 calls/day
3 campaigns x 12 calls/cycle = 36 calls per rotation
32 rotations/day (every 45 min) = 1,152 calls
Buffer: 348 calls remaining (23%)
```

| Tokens | 3 Campaigns Interval | Daily Calls Used |
|--------|----------------------|-----------------|
| 5 (current) | 45 min | 1,152 / 1,500 |
| 9 | 19 min | 1,368 / 2,700 |
| 12 | 15 min | 1,728 / 3,600 |

## How to Add a New Campaign

1. Create `campaigns/<campaign-id>.json` based on existing template
2. Fill in: campaign, mission, knowledge_base, campaign_rules, compliance_checks
3. Run `node run_all.js --list` to verify it appears
4. The orchestrator will automatically pick it up on next cron

## Scoring (23 points max)

| Category | Max | Type |
|----------|-----|------|
| Originality | 2 | Gate (0 or 2) |
| Alignment | 2 | Gate (0 or 2) |
| Accuracy | 2 | Gate (0 or 2) |
| Compliance | 2 | Gate (0 or 2) |
| Engagement | 5 | Quality (0-5) |
| Technical | 5 | Quality (0-5) |
| Reply Quality | 5 | Quality (0-5) |

Grades: S+(22-23) S(21) A+(19-20.9) A(17-18.9) B+(15-16.9) B(13-14.9) C(11-12.9) D(<11)

## Known Issues

- `valid_judges` always 0 in output (judges run but score comes from programmatic evaluator)
- Accuracy category declining (avg 68%) - LLM tends to exaggerate claims
- Reply Quality weak (avg 58%) - Generated questions too generic
- Second campaign config is placeholder (TBD)

## GitHub

- **Repo**: https://github.com/tuyulmillenium104-cmd/chek1
- **Branch**: `main`
- **Latest**: v6.0 multi-campaign support
