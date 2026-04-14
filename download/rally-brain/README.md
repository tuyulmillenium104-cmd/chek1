# Rally Brain v5.2.1

Automated content generation system for [Rally.fun](https://rally.fun) campaigns. Generates high-quality, anti-AI-detected social media posts using a multi-stage pipeline with closed-loop learning, LLM judge evaluation, and self-healing error recovery.

> **Current Campaign**: MarbMarket - The First veDEX on MegaETH (2000 USDC)
> **Contract**: `0x39a11fa3e86eA8AC53772F26AA36b07506fa7dDB`
> **Mission 0**: "Explain the veDEX Model & Why MarbMarket Matters"

## Quick Start

See **[QUICKSTART.md](QUICKSTART.md)** for new AI chat sessions - read this first!

For deep technical reference, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Architecture Overview

```
CRON (Job 89260, every 30 min)
    |
    v
self_heal.js (v2.1) - Pre-cycle health check + 5x retry + diagnosis
    |
    v
generate.js (v5.2.1) - LEARN -> GENERATE -> EVALUATE -> JUDGE -> Q&A -> OUTPUT
    |                        Budget: 12 API calls/cycle (~2 min)
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
| `generate.js` | v5.2.1 | Main pipeline: LEARN -> GENERATE -> EVALUATE -> JUDGE -> Q&A -> OUTPUT |
| `zai-resilient.js` | v1.0 | Token rotation (5 tokens), rate limiting, 5x retry |
| `self_heal.js` | v2.1 | Runner wrapper with auto-diagnosis and health monitoring |
| `health_monitor.js` | v1.0 | 4-level health tracking (HEALTHY/WARNING/CRITICAL/EMERGENCY) |
| `knowledge_db.json` | v3.0.0 | Closed-loop learning (cycle history, AI word freq, category trends) |
| `ARCHITECTURE.md` | - | Deep technical reference for all subsystems |
| `QUICKSTART.md` | - | Quick-start guide for new AI chat sessions |
| `campaign_data/` | - | Output dir: best_content.txt, qa.json, prediction.json |

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

## Multi-Campaign Roadmap

| Tokens | 1 Campaign | 2 Campaigns | 3 Campaigns |
|--------|-----------|-------------|-------------|
| 5 (current) | ~11 min | ~23 min | ~35 min |
| 9 | ~6 min | ~13 min | ~19 min |

Formula: `interval = (campaigns x 12 x 1440) / (tokens x 300)` minutes

## Known Issues

- `valid_judges` always 0 in output (judges run but score comes from programmatic evaluator)
- nohup + Node.js die silently (use `stdbuf -oL -eL`)
- Accuracy category declining (avg 68%)
- Reply Quality weak (avg 58%)

## GitHub

- **Repo**: https://github.com/tuyulmillenium104-cmd/chek1
- **Branch**: `main`
