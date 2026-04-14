# Rally Brain v6.0 - Multi-Campaign Architecture

Automated content generation system for [Rally.fun](https://rally.fun) campaigns. Generates high-quality, anti-AI-detected social media posts using a multi-stage pipeline with closed-loop learning, LLM judge evaluation, self-healing error recovery, and **multi-campaign rotation**.

> **v6.0 Highlights**: 3 simultaneous campaigns, rotation orchestrator, per-campaign health tracking, spawn-based nohup-safe process management

## Active Campaigns

| Campaign | Contract | Mission | Reward |
|----------|----------|---------|--------|
| marbmarket-m0 | `0x39a11fa3...fa7dDB` | Explain the veDEX Model & Why MarbMarket Matters | 2000 USDC |
| marbmarket-m1 | `0x39a11fa3...fa7dDB` | Breakdown the MARB Token Incentive Loop & Fair Launch | 2000 USDC |
| campaign_3 | `0xE4aeE08A...43Da7` | TBD (placeholder) | TBD |

## Quick Start

See **[QUICKSTART.md](QUICKSTART.md)** for new AI chat sessions - read this first!

For deep technical reference, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Architecture Overview

```
CRON (every 45 min)
    |
    v
run_all.js (v2.0) - Rotation: picks NEXT campaign per invocation
    |
    v
self_heal.js (v3.0) - Pre-cycle health check + 5x retry + diagnosis
    |  --campaign <id> or --orchestrate
    v
generate.js (v5.1) - LEARN -> GENERATE -> EVALUATE -> JUDGE -> Q&A -> OUTPUT
    |  Accepts campaign ID as CLI argument, loads from campaigns/*.json
    |  Budget: 12 API calls/cycle (~2 min)
    v
zai-resilient.js (v1.0) - 5 tokens x 300/day = 1,500 quota, 10s rate limit
    |
    v
Gateway 1: 172.25.136.210:8080
Gateway 2: 172.25.136.193:8080
```

## Files

| File | Version | Purpose |
|------|---------|---------|
| `generate.js` | v5.1 | Main pipeline: LEARN -> GENERATE -> EVALUATE -> JUDGE -> Q&A -> OUTPUT |
| `zai-resilient.js` | v1.0 | Token rotation (5 tokens), rate limiting, 5x retry |
| `self_heal.js` | v3.0 | Runner wrapper with spawn-based execution, auto-diagnosis, health monitoring |
| `health_monitor.js` | v2.0 | Per-campaign health tracking (HEALTHY/WARNING/CRITICAL/EMERGENCY) |
| `run_all.js` | v2.0 | Multi-campaign rotation orchestrator (1 campaign per cron invocation) |
| `campaigns/` | - | Campaign config files (JSON) |
| `campaign_data/` | - | Output dir, health state, rotation state, recovery logs |
| `ARCHITECTURE.md` | - | Deep technical reference for all subsystems |
| `QUICKSTART.md` | - | Quick-start guide for new AI chat sessions |

## Campaign Configs

Each campaign has a JSON config in `campaigns/<campaign-id>.json`:

```json
{
  "id": "marbmarket-m0",
  "campaign": { "title": "...", "contractAddress": "0x...", ... },
  "mission": { "id": "mission-0", "title": "...", "rules": [...] },
  "knowledge_base": "...markdown...",
  "campaign_rules": [...],
  "compliance_checks": {
    "must_include": ["@RallyOnChain", "x.com/..."],
    "project_keywords": [...],
    "unique_markers": [...],
    "fallback_qa": [...]
  }
}
```

## Multi-Campaign Rotation

The orchestrator (`run_all.js`) uses round-robin rotation:

```
Invocation 1: runs marbmarket-m0
Invocation 2: runs marbmarket-m1
Invocation 3: runs campaign_3
Invocation 4: runs marbmarket-m0  (cycle repeats)
```

State tracked in `campaign_data/rotation_state.json`.

## Per-Campaign Health

Each campaign has independent health tracking:
- `campaign_data/marbmarket-m0_health.json`
- `campaign_data/marbmarket-m1_health.json`
- `campaign_data/campaign_3_health.json`

Use `node health_monitor.js all --campaign <name>` to view all campaign health.

## Token Pool (5 tokens = 1,500 calls/day)

| Token | User ID | Source |
|-------|---------|--------|
| TOKEN_1 | 97631263... | Manual |
| TOKEN_2 | 1cdcf579... | Manual |
| TOKEN_3 | 97631263... | Manual |
| TOKEN_4 | bb829ea3... | Manual |
| TOKEN_5_AUTO | 4f3de308... | System auto |

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

## Multi-Campaign Quota Math

```
interval = (campaigns x 12 x 1440) / (tokens x 300) minutes

5 tokens, 3 campaigns:
  (3 x 12 x 1440) / (5 x 300) = ~35 min per campaign

Each cron invocation runs 1 campaign.
```

## Key v6.0 Changes

1. **self_heal.js v3.0**: Replaced `exec()` with `spawn()` for nohup compatibility. Added `detached` option, EPIPE handling, signal handlers (SIGTERM/SIGINT), force-flush logging. Orchestrator fallback when no `--campaign` arg.

2. **run_all.js v2.0**: Changed from "run all" to "rotation" mode. Each invocation runs exactly 1 campaign (next in rotation). Added `--all` flag for legacy sequential mode.

3. **health_monitor.js v2.0**: Per-campaign health files. Accepts `--campaign <name>` arg. Backward compatible with global health_status.json.

4. **Campaign configs**: 3 campaigns configured (marbmarket-m0, marbmarket-m1, campaign_3). Each has independent `knowledge_db.json`.

5. **Nohup fix**: No longer need `stdbuf -oL -eL`. `self_heal.js` handles unbuffered output internally.

## Known Issues

- `valid_judges` always 0 in output (judges run but score comes from programmatic evaluator)
- Accuracy category declining (avg 68%)
- Reply Quality weak (avg 58%)

## GitHub

- **Repo**: https://github.com/tuyulmillenium104-cmd/chek1
- **Branch**: `main`
