# Rally Brain v7.0 — Data-Driven Content Generation

Automated AI content generation system for [Rally.fun](https://rally.fun) campaigns. Generates high-quality, anti-AI-detected social media posts using data-driven learning from 258 real Rally.fun submissions, achieving consistent Grade S (21+/23).

> **v7.0**: Data-driven architecture with frontend dashboard, Rally.fun API integration, deep learning pipeline, and winner pattern extraction.

## What is Rally Brain?

Rally Brain automatically creates social media content (tweets/X posts) for Rally.fun crypto/DeFi campaigns. Content is scored by Rally.fun's AI judge across 7 categories (max 23 points). Rally Brain targets **Grade S (21+/23)** consistently.

## Quick Start

```bash
# 1. Install dependencies
cd /home/z/my-project/download/rally-brain
bun install

# 2. Run frontend
cd /home/z/my-project && npm run dev

# 3. Open dashboard
# https://preview-<bot-id>.space.chatglm.site/
```

For detailed setup and architecture, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Key Features

| Feature | Status |
|---------|--------|
| Content generation pipeline (Grade S) | Done |
| Frontend dashboard (Next.js + shadcn/ui) | Done |
| Rally.fun API integration (search, campaigns, submissions) | Done |
| Deep learning from AI judge analysis (258 submissions) | Done |
| Winner pattern extraction (14 rules) | Done |
| Learning trigger from frontend | Pending |
| Rules injection into generation | Pending |

## Architecture

```
Frontend Dashboard (Next.js)
  |
  ├── Search Campaign → Rally.fun API
  ├── Select Mission → Campaign Detail
  ├── Generate Content → Background Job Pipeline
  │   └── AI Generate → Score (7 categories) → Grade S
  └── Download Results → best_content.txt + qa.json

Learning Pipeline (v7.1)
  |
  ├── Fetch Submissions → Rally.fun API
  ├── Extract Features → AI judge category_analysis
  ├── Pattern Analysis → Winners vs Losers
  └── Generate Rules → learned_rules.json
```

## Files

| File | Purpose |
|------|---------|
| `learn.js` | Deep learning pipeline from collected submissions |
| `learn_from_rally.js` | Real-time learning from Rally.fun API per campaign |
| `generate.js` | Main content generation pipeline |
| `src/app/page.tsx` | Frontend dashboard |
| `src/app/api/rally/*` | API routes (search, generate, status, etc.) |
| `campaign_data/learned_rules.json` | Extracted winner patterns (14 rules) |
| `campaign_data/v7_learning_db.json` | Full learning database |

## Scoring (Rally.fun — 7 Categories, Max 23)

| Category | Max | Type |
|----------|-----|------|
| Originality | 2 | Gate |
| Alignment | 2 | Gate |
| Accuracy | 2 | Gate |
| Compliance | 2 | Gate |
| Engagement | 5 | Quality |
| Technical | 5 | Quality |
| Reply Quality | 5 | Quality |

**Target: >= 21/23 (Grade S)**

## GitHub

- **Repo**: https://github.com/tuyulmillenium104-cmd/chek1
- **Branch**: `v7-architecture` (active), `main` (deprecated v6.2)
