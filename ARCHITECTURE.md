# Rally Brain v8 — Complete Architecture Guide

> **PRIMARY REFERENCE DOCUMENT** — Read this first before working on the project.
> Any AI assistant or developer should be able to understand the full system from this file alone.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [The 3 AI Sessions (Critical)](#the-3-ai-sessions-critical)
4. [Token Allocation & Rate Limits](#token-allocation--rate-limits)
5. [Core Components](#core-components)
6. [API Routes](#api-routes)
7. [Rally.fun's Scoring System](#rallyfuns-scoring-system)
8. [Data Storage](#data-storage)
9. [Cron Learn System](#cron-learn-system)
10. [How to Use](#how-to-use)
11. [File Structure](#file-structure)
12. [Key Design Decisions](#key-design-decisions)
13. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Rally Brain?

Rally Brain is an **AI-powered content generator** for [Rally.fun](https://rally.fun) crypto campaigns. It automates the process of creating high-quality social media content (tweets/replies) that scores well on Rally.fun's AI judge evaluation system.

**Core workflow:**
1. **LEARN** — Fetch real submissions from Rally.fun campaigns, analyze what winners do differently from losers, extract actionable patterns
2. **GENERATE** — Create multiple content variations using learned patterns, campaign context, anti-AI detection, and human artifact injection
3. **JUDGE** — Independently evaluate each variation using an isolated AI session that mimics Rally's actual scoring
4. **ITERATE** — If no variation passes quality gate, regenerate with accumulated feedback from failing candidates
5. **OUTPUT** — Return the best-scoring content with full scoring breakdown

### Version History

| Version | Key Changes |
|---------|-------------|
| **v7** | Initial 4-gate + 2-quality + 5-engagement scoring (legacy, deprecated). Pre-computed rules (14 rules). Single AI session for generation + judging. 258 submissions in learning DB. |
| **v8** | **Complete rewrite** aligned with Rally.fun's actual scoring: 7 content categories (max 21 atemporal points). Independent AI sessions for generator vs judge (anti-bias). AI-powered pattern extraction from Rally's judge analysis text. Persistent Knowledge DB per campaign. Cron-based scheduled learning. Token isolation with `forceTokenIndex`. |

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Rally Brain v8 Architecture                      │
│                                                                         │
│  ┌──────────────┐    ┌────────────────┐    ┌──────────────────────────┐ │
│  │ Rally.fun API │───▶│ Learn Engine v2 │───▶│ Knowledge DB            │ │
│  │ (submissions) │    │ (AI patterns)   │    │ (per-campaign storage)   │ │
│  └──────────────┘    └───────┬────────┘    └───────────┬──────────────┘ │
│                             │                          │                 │
│                             ▼                          ▼                 │
│                    ┌─────────────────────────────────────────┐           │
│                    │         Generate Pipeline v2              │           │
│                    │                                          │           │
│                    │  ┌───────────┐  ┌──────────────────────┐  │           │
│                    │  │ Generator  │  │   Judge Engine v2    │  │           │
│                    │  │ (tokens   │──│ (different tokens,    │  │           │
│                    │  │  0-2)     │  │  isolated session)    │  │           │
│                    │  └─────┬─────┘  └──────────┬───────────┘  │           │
│                    │        │  feedback loop    │               │           │
│                    │        └───────┬───────────┘               │           │
│                    │                ▼                           │           │
│                    │     Best Content + Scoring                │           │
│                    └─────────────────────────────────────────┘           │
│                                                                         │
│  ┌────────────────┐    ┌──────────────┐    ┌──────────────────────────┐ │
│  │ AI HTTP Client  │    │ Rally API     │    │ Cron Scheduler           │ │
│  │ (11 tokens,    │    │ (campaigns,   │    │ (6/12/24h intervals)     │ │
│  │  2 gateways)   │    │  submissions) │    │                          │ │
│  └────────────────┘    └──────────────┘    └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
Rally.fun API ──▶ Cron Learn ──▶ Knowledge DB ──▶ Generate ──▶ Judge ──▶ Output
                    │              │                │            │
                    │              │                │            │
              Fetch new      Store patterns    Create N      Score each
              submissions   (strengths,       variations    with learned
              dedup,        weaknesses,      using learned data, different
              extract       banned phrases,   data           token per
              patterns      benchmarks)                     variation
```

---

## System Architecture

### The 3 AI Sessions (CRITICAL)

The system uses **three conceptually separate AI sessions** to prevent bias:

| Session | Purpose | Token Range | Temperature | Model |
|---------|---------|-------------|-------------|-------|
| **LEARNER** | Analyzes Rally submissions, extracts patterns from judge text | 0-2 (auto-selected) | 0.3 (analytical) | glm-4-plus |
| **GENERATOR** | Creates content variations using learned patterns | 0-2 (auto-selected) | 0.85 (creative) | glm-4-plus |
| **JUDGE** | Independently evaluates content quality | **3-10** (forced isolation) | 0.4 (analytical) | glm-4-plus |

**Why different sessions?**
- **Anti-bias**: If the generator and judge share the same AI session, the judge may "recognize" its own output and score it higher
- **Independent evaluation**: The judge must be completely blind to how the content was generated
- **No context bleeding**: Each judge call uses a unique session ID and different token, preventing cross-contamination between variations

---

## Token Allocation & Rate Limits

### Token Pool

The system has **11 tokens** across **5 unique userIds** and **2 gateway hosts**:

| Index | Label | userId (prefix) | Purpose |
|-------|-------|-----------------|---------|
| 0 | Auto-Config | — | Reserved for auto-config |
| 1 | Akun A #1 | `9763...` | Learn + Generate |
| 2 | Akun B #1 | `bb82...` | Learn + Generate |
| 3 | Akun A #2 | `9763...` | **Judge (primary)** |
| 4 | Akun B #2 | `bb82...` | **Judge** |
| 5 | Akun A #3 | `9763...` | **Judge** |
| 6 | Akun B #3 | `bb82...` | **Judge** |
| 7 | Akun A #4 | `9763...` | **Judge** |
| 8 | Akun C #1 | `bb82...` | **Judge** |
| 9 | Akun D #1 | `bb82...` | **Judge** |
| 10 | Extra User #1 | `1cdc...` | **Judge** |

### Rate Limit Architecture

```
Per bucket:  10 requests per 10 minutes
Global QPS:  5 requests per second (max)
Gateways:    172.25.136.193:8080, 172.25.136.210:8080
Buckets:     gateway × userId = ~10 buckets total
```

**`acquireSlot()`** is the **single point** of rate limit management:
1. Enforce global QPS limit
2. Find best available bucket (highest remaining capacity)
3. If all buckets full → calculate smart wait time → wait → retry
4. Force acquire as last resort

**Judge isolation**: When `forceTokenIndex` is specified, the client only considers buckets for that token's userId, ensuring the judge uses a completely different rate limit bucket than the generator.

---

## Core Components

### 1. Knowledge DB (`src/lib/knowledge-db.ts`)

Persistent file-based storage layer that survives server restarts.

**Storage directory:** `campaign_data/knowledge/{campaign_address}/`

**Data structures per campaign:**

| File | Format | Purpose |
|------|--------|---------|
| `submissions.jsonl` | JSONL (append-only) | All fetched submissions, one JSON object per line |
| `patterns.json` | JSON | Extracted patterns (updated each learn) |
| `cron_config.json` | JSON | Cron scheduling configuration |
| `meta.json` | JSON | Campaign metadata (address, name) |

**Key class:** `KnowledgeDB`

```typescript
const db = getKnowledgeDB(campaignAddress, campaignName);

// Submissions (append-only, deduplicated by content_hash)
await db.addSubmissions(inputs);        // Returns { added, duplicates, total }
await db.getAllSubmissions();           // Most recent first
await db.getSubmissionStats();          // Aggregate statistics

// Patterns (full replace on update)
await db.updatePatterns(patterns);      // Atomic write
await db.getPatterns();                 // Current patterns or null

// Cron config
await db.getCronConfig();
await db.updateCronConfig(config);
await db.getCampaignsDue();             // Campaigns with next_run <= now

// Utility
await db.getStats();                    // Comprehensive stats + disk usage
await db.exportAll();                   // Export everything
await db.clearAll();                    // Delete all data (use with caution)
```

**Design features:**
- **Atomic writes**: Write to `.tmp` file, then `rename()` over target (never half-written)
- **Concurrent write safety**: Per-directory write locks via `acquireLock(key)`
- **Deduplication**: `content_hash` check before appending
- **Instance cache**: `getKnowledgeDB()` returns cached instances per campaign
- **Factory functions**: `listAllCampaigns()`, `getCampaignsNeedingLearn()` for global operations

### 2. Learn Engine v2 (`src/lib/learn-engine.ts`)

AI-powered learning system that extracts patterns from Rally's judge analysis text.

**Pipeline:**
```
Fetch New Submissions → Deduplicate → AI Analyze (winners vs losers) → Merge → Store
```

**Key function:** `runLearn(campaignAddress, campaignName, options)`

Returns `LearnResult`:
```typescript
{
  success: boolean,
  newSubmissions: number,
  duplicateSubmissions: number,
  totalSubmissions: number,
  patternsExtracted: boolean,
  newPatterns: number,
  topScore: number,
  averageScore: number,
  weakCategories: string[],
  strongCategories: string[],
  duration: number,
}
```

**Pattern types extracted by AI:**
- `strength_patterns` — What top scorers do (with frequency in winners vs losers)
- `weakness_patterns` — What bottom scorers do (with red flag phrases)
- `banned_phrases` — Phrases Rally's judge explicitly flags as negative
- `scoring_benchmarks` — Per-category winner avg, loser avg, target scores
- `category_insights` — What the Rally judge actually looks for per category
- `top_examples` — Top scoring submissions with key strengths

**Pattern merging strategy:**
- Existing patterns get **60% weight**, new patterns get **40% weight** (weighted average)
- New patterns are added to existing lists (deduplicated by pattern text + category)
- Banned phrases are additive (never removed)
- Scoring benchmarks use **40% existing, 60% new** (favor recent data)
- Category insights are replaced entirely (latest data wins)
- Top examples kept to **max 20**, sorted by score

**Minimum requirements:** ≥5 new submissions to trigger AI pattern extraction.

**Cron support:** `runCronLearn()` checks all campaigns with cron enabled and runs learn for those whose `nextScheduledLearn` has passed. Also supports `configureCron()` and `getLearnHistory()`.

**Note:** Learn Engine v2 stores data at `/home/z/my-project/rally-data/learn/{campaignAddress}/` (separate from Knowledge DB). The Knowledge DB integration is designed to replace this when fully wired up.

### 3. Judge Engine v2 (`src/lib/judge-engine.ts`)

Independent AI session content evaluator — the most critical component for quality assurance.

**Key principle:** Uses a **DIFFERENT token** than the generator (tokens 3+, default token #3).

**Scoring system** (matches Rally's actual 7-category system, max 23 points):

| # | Category | Range | Type | Description |
|---|----------|-------|------|-------------|
| 1 | Originality and Authenticity | 0-2 | **Binary Gate** | Genuinely original? Not templated? |
| 2 | Content Alignment | 0-2 | **Binary Gate** | Matches campaign core message? |
| 3 | Information Accuracy | 0-2 | **Binary Gate** | All claims accurate and verifiable? |
| 4 | Campaign Compliance | 0-2 | **Binary Gate** | Follows ALL campaign rules? |
| 5 | Engagement Potential | 0-5 | **Quality Metric** | Hook strength, shareability? |
| 6 | Technical Quality | 0-5 | **Quality Metric** | Flow, readability, grammar? |
| 7 | Reply Quality | 0-5 | **Quality Metric** | Invites substantive discussion? |

**Grade system:**

| Grade | Score Range | Description |
|-------|-------------|-------------|
| **S** | 21-23 | Exceptional — top 1% |
| **A** | 18-20 | Excellent — top 10% |
| **B** | 15-17 | Good — above average |
| **C** | 12-14 | Average — median range |
| **D** | 9-11 | Below average |
| **F** | 0-8 | Failing quality |

**Verdict logic:** ALL 4 binary gates must score > 0 for a "pass" verdict. A score of 0 on ANY gate = automatic FAIL.

**Key functions:**

```typescript
// Judge single content
const result = await judgeContent(content, campaignData, campaignAddress, {
  learnedData: patterns,        // From Knowledge DB
  judgeTokenIndex: 3,           // Force specific token
});

// Judge multiple and select best
const { best, all, bestIndex } = await judgeAndSelect(contents, campaignData, campaignAddress, {
  learnedData: patterns,
  minScore: 15,                  // Minimum score to pass
  tokenPoolStart: 3,            // Rotate tokens starting from 3
});

// Generate human-readable feedback for regeneration
const feedback = generateJudgeFeedback(result);
```

**Judge configuration:**
- Temperature: 0.4 (analytical, consistent)
- Max tokens: 3000
- Timeout: 45 seconds
- Model: glm-4-plus
- Thinking: disabled (structured JSON output required)

**Fallback behavior:** If AI call fails or returns unparseable data, returns a `buildFallbackJudgeResult()` with intentionally strict scores (default to 0 on all binary gates) and `verdict: 'fail'` — never passes bad content.

### 4. Pipeline Orchestrator (`src/lib/pipeline.ts`)

The main pipeline that orchestrates the full generate-judge-iterate loop.

**Configuration:**
```typescript
const CONFIG = {
  variationsPerCycle: 4,      // 4 variations per cycle
  maxCycles: 2,               // Max 2 regeneration cycles
  minQualityPct: 25,          // 25% to pass quality gate
  failFastCycle: 2,           // Only fail fast after cycle 2
  judgeTypes: ['optimist', 'analyst'],  // 2-stage judge (no critic)
  pipelineTimeoutMs: 300000,  // 5 min hard limit
  cycleTimeoutMs: 150000,     // 2.5 min per cycle
};
```

**Pipeline phases:**

1. **Pre-cycle** (instant, no AI calls):
   - Build campaign summary from raw data
   - Start background: ground truth fetch + competitive analysis

2. **Generation Cycle 1:**
   - Generate 4 variations in parallel (each ~30s)
   - Compliance check on all
   - Judge each variation (2-stage: optimist + analyst)
   - Merge scores using median consensus
   - Collect feedback from failing candidates

3. **Generation Cycle 2** (if cycle 1 has no passes):
   - Analyze failure patterns across all failing candidates
   - Build adaptive regeneration instructions
   - Regenerate with accumulated feedback
   - Judge again

4. **Post-cycle:**
   - Competitive analysis (deferred to avoid bucket contention)
   - Return best content + full scoring breakdown

**Adaptive learning loop:**
- Analyzes failure patterns: `zeroGateCounts`, `avgCategoryScores`, `recurringFeedback`
- Builds dynamic regeneration instructions with focus areas
- Tracks cross-cycle score trends (improving/declining/stable)
- Smart fail-fast: only stops if no improvement after cycle 2

### 5. AI Service (`src/lib/ai-service.ts`)

Rally-specific AI wrappers on top of the HTTP client.

**Key functions:**

| Function | Purpose | Temperature | Tokens |
|----------|---------|-------------|--------|
| `analyzeCampaign()` | Deep campaign analysis (v1, largely unused) | 0.3 | 2000 |
| `generateContent()` | Create social media content | 0.85 | 2500 |
| `judgeContent()` | 3-stage judging (optimist/analyst/critic) | 0.3-0.7 | 2000 |
| `regenerateContent()` | Improve content based on feedback | 0.9 | 2500 |
| `checkCompliance()` | Content compliance checking | — | — |
| `detectAIPatterns()` | Anti-AI detection (40+ red flags) | — | — |
| `extractKBData()` | Anti-fabrication from Knowledge Base | — | — |
| `buildPreWritingPerspective()` | Pre-writing genuine voice builder | — | — |

**Anti-AI detection** checks for:
- 27 banned words (financial/legal spam)
- 20 Rally banned phrases (known overused spam)
- 25 template phrases (generic social media tropes)
- 26 AI pattern words (delve, leverage, tapestry, etc.)
- 15 AI pattern phrases (here's the thing, let's dive in, etc.)
- 8 banned sentence starters (honestly, tbh, ngl, lowkey)

**Content generation features:**
- 8 personas (The Skeptic, The Insider, The Newbie, etc.)
- 10 narrative structures (Hero's Journey, Problem-Agitation-Solution, etc.)
- 5 nonlinear structures (Doubt-First, Mid-Thought, Fragment-Storm, etc.)
- 5 emotion targets (curiosity+surprise, fear+hope, etc.)
- 8 human artifacts (tangential digression, self-correction, sentence fragment, etc.)
- Mandatory counter-argument (never be 100% positive)
- Anti-fabrication from campaign Knowledge Base

### 6. AI HTTP Client (`src/lib/http-ai-client.ts`)

Rate-limit-aware AI calling with intelligent bucket scheduling.

**Architecture:**
```
DirectAIClient (singleton)
├── 11 tokens (embedded, 5 unique userIds)
├── 2 gateway hosts
├── Per-bucket tracking (10 req/10min)
├── Global QPS limit (5 req/sec)
└── acquireSlot() — single point of rate limit management
```

**Key methods:**
- `chat(messages, options)` — Main chat with smart retry (max 3 retries)
- `chatIsolated(messages, tokenIndex, options)` — Force specific token
- `reserveTokensForJudges(count)` — Reserve N different-userId tokens
- `generateUniqueChatId()` — Prevent context bleeding
- `getTokenPoolStatus()` — Token health check
- `getBucketStatus()` — Rate limit bucket details
- `getTotalBudget()` / `getActiveBucketCount()` — Capacity info

**Retry strategy:**
1. `acquireSlot()` picks best available bucket
2. On 429 (rate limited): mark bucket exhausted, try next best
3. If ALL buckets exhausted: calculate shortest reset time, wait, retry
4. On timeout: brief backoff, retry once
5. On 403 (auth error): rotate token

### 7. Rally API Integration (`src/lib/rally-submissions.ts`)

Direct integration with Rally.fun's public API.

**Base URL:** `https://app.rally.fun/api`

**Endpoints used:**
| Endpoint | Purpose |
|----------|---------|
| `/api/campaigns?limit=200` | List all campaigns |
| `/api/campaigns/{address}` | Campaign detail |
| `/api/submissions?campaignAddress={addr}&limit={n}` | Fetch submissions |

**Key types:**
- `RallySubmission` — Raw submission from API (includes 12 analysis categories with atto scores)
- `ParsedSubmission` — Human-readable parsed version (normalizes scores, classifies content vs engagement)
- `SubmissionsSummary` — Aggregate stats with score distributions, percentile breakdowns

**12 Rally scoring categories (discovered from real data):**

*Content (atemporal, max 21 points):*
1. Originality and Authenticity (0-2)
2. Content Alignment (0-2)
3. Information Accuracy (0-2)
4. Campaign Compliance (0-2)
5. Engagement Potential (0-5)
6. Technical Quality (0-5)
7. Reply Quality (0-5)

*Engagement (temporal, from X/Twitter metrics):*
1. Retweets
2. Likes
3. Replies
4. Followers of Repliers
5. Impressions

**Score conversion:** Rally scores are in `atto` (10^-18). Conversion: `attoToNumber(atto) = parseFloat(atto) / 1e18`

**Caching:** 10-minute TTL, max 20 entries. Falls back to stale cache on fetch error.

### 8. Rally Scoring System (`src/lib/rally-scoring.ts`)

Two scoring systems coexist:

**Primary (v2 — Rally-aligned):**
- `calculateRallyContentScore()` — Score based on Rally's 7 content categories
- `mergeRallyJudgeScores()` — Multi-judge consensus using median
- `detectG4Elements()` — Programmatic originality detection (bonuses/penalties)
- `detectXFactors()` — Viral potential detection

**Grade mapping (content quality score 0-21):**
- S+: 19+ | S: 16.5+ | A: 14+ | B: 11+ | C: 8+ | D: 5+ | F: <5

**Legacy (deprecated — kept for backward compatibility):**
- `calculateScore()` — Old 4-gate system
- `mergeJudgeScores()` — Old majority vote system
- `calculateRallyAlignedScore()` — Mapping layer

### 9. Supporting Modules

| Module | File | Purpose |
|--------|------|---------|
| Background Job | `background-job.ts` | In-memory job store with status polling |
| Rally Jobs | `rally-jobs.ts` | Job persistence, queue management |
| Rally Calibration | `rally-calibration.ts` | Score calibration from real submission data |
| Rally Competitive | `rally-competitive.ts` | Competitor analysis, differentiation strategy |
| Pipeline | `pipeline.ts` | v1 pipeline orchestrator (see above) |
| Database | `db.ts` | Prisma SQLite ORM |
| Utils | `utils.ts` | General utilities |

---

## API Routes

### Complete Route Table

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/rally/search` | GET | Campaign search (query → matching campaigns) | ✅ Active |
| `/api/rally/campaign/[address]` | GET | Campaign detail with mission merge | ✅ Active |
| `/api/rally/submissions` | GET | Fetch Rally submissions (full/summary/calibrate) | ✅ Active |
| `/api/rally/learn` | POST/GET | Learn pipeline v1 (background, poll for status) | ✅ Active (legacy) |
| `/api/rally/generate` | POST | Start pipeline v1 in background, returns jobId | ✅ Active |
| `/api/rally/generate/status` | GET | Poll pipeline v1 job status | ✅ Active |
| `/api/rally/process-next` | POST | SSE streaming pipeline execution (real-time progress) | ✅ Active |
| `/api/rally/competitive` | POST | Run competitive intelligence analysis | ✅ Active |
| `/api/rally/results` | GET | List results (memory + filesystem + historical) | ✅ Active |
| `/api/rally/status` | GET | System status (tokens, gateways, rate limits) | ✅ Active |

### Route Details

#### `GET /api/rally/search?q=campaign_name`
Searches campaigns by name. Strategy: fetch all campaigns (cached 5min), filter client-side (exact → partial → word match).

#### `GET /api/rally/campaign/[address]?mission=N`
Fetches full campaign detail. Auto-selects first active mission. Merges mission fields with campaign fields. Cached 5min per address+mission.

#### `GET /api/rally/submissions?address={addr}&limit={n}&mode={full|summary|calibrate}`
Fetches real Rally submissions. Three modes:
- `full` — Raw parsed submissions (top 50)
- `summary` — Stats + top submissions
- `calibrate` — Full calibration analysis

#### `POST /api/rally/learn` + `GET /api/rally/learn?jobId=xxx`
Starts learning pipeline in background. Fetches submissions, analyzes patterns (winner vs loser), generates rules and recommendations. Poll for status.

#### `POST /api/rally/generate` + `GET /api/rally/generate/status?jobId=xxx`
Starts pipeline in background. Returns jobId immediately. Pipeline: buildCampaignSummary → ground truth fetch → generate 4 variations → 2-stage judge → adaptive regeneration. Poll for status.

#### `POST /api/rally/process-next`
SSE (Server-Sent Events) streaming pipeline. Returns `text/event-stream` with real-time progress events, heartbeat every 10s, and final result. Defeats gateway timeout.

#### `POST /api/rally/competitive`
Runs competitive intelligence analysis. Analyzes competitor content patterns, builds differentiation strategy. Can be called standalone or auto-run inside pipeline.

#### `GET /api/rally/results?jobId=xxx`
Returns generated results. Without jobId: lists recent results from in-memory + filesystem + historical directories.

#### `GET /api/rally/status`
System health: token pool status, gateway connectivity, rate limit bucket status, queue status.

---

## Rally.fun's Scoring System

### 7 Content Categories (Atemporal, max 21 points)

These are scored by Rally's AI judges based on the submitted content itself:

| # | Category | Max | Type | Description |
|---|----------|-----|------|-------------|
| 1 | Originality and Authenticity | 2 | Binary Gate | Genuinely original, personal voice, not templated |
| 2 | Content Alignment | 2 | Binary Gate | Matches campaign core message, all requirements met |
| 3 | Information Accuracy | 2 | Binary Gate | All claims accurate and verifiable |
| 4 | Campaign Compliance | 2 | Binary Gate | Follows ALL rules, no prohibited items |
| 5 | Engagement Potential | 5 | Continuous | Hook strength, conversation potential, shareability |
| 6 | Technical Quality | 5 | Continuous | Flow, readability, grammar, structure quality |
| 7 | Reply Quality | 5 | Continuous | Invites discussion, thought-provoking elements |

**Binary gates:** 0 = completely fails, 1 = partially meets, 2 = fully meets. ALL must score > 0 to pass.
**Quality metrics:** 0 = terrible, 1 = poor, 2 = below average, 3 = average, 4 = good, 5 = exceptional.

### 5 Engagement Categories (Temporal, from X/Twitter)

These depend on real Twitter performance after submission:

| Category | Source |
|----------|--------|
| Retweets | Real Twitter data |
| Likes | Real Twitter data |
| Replies | Real Twitter data |
| Followers of Repliers | Real Twitter data |
| Impressions | Real Twitter data |

### Total Score: max 23 (21 content + engagement bonus)

Our system only scores the **7 content categories** (max 21). Engagement depends on real Twitter performance and cannot be predicted at generation time.

---

## Data Storage

### Knowledge DB Per Campaign (v8)

```
campaign_data/knowledge/{campaign_address}/
├── submissions.jsonl    — All fetched submissions (append-only, one JSON per line)
├── patterns.json        — Extracted patterns (updated each learn session)
├── cron_config.json     — Cron scheduling config (enabled, interval, next_run)
└── meta.json            — Campaign metadata (address, name)
```

### Learn Engine v2 Storage (separate)

```
/home/z/my-project/rally-data/learn/{campaignAddress}/
├── submissions.json     — Stored parsed submissions
├── patterns.json        — AI-extracted patterns
└── campaign.json        — Campaign metadata + learn sessions + cron config
```

### Legacy Data (v7)

```
campaign_data/
├── learned_rules.json       — v7 pre-computed rules (14 rules)
├── v7_learning_db.json      — v7 learning database (258 submissions)
├── v7_knowledge.json        — v7 AI-extracted patterns (293 rules)
├── v7_collected/            — v7 raw Rally data snapshots
│   ├── campaign_*_raw.json  — Per-campaign raw data
│   ├── all_submissions.jsonl— All submissions combined
│   └── seen_hashes.json     — Dedup tracking
├── v7_winners.json          — v7 winner analysis
├── marbmarket-m0_output/    — v7 generated results
│   ├── best_content.txt
│   ├── full_output.json
│   ├── prediction.json
│   └── qa.json
└── *_output/                — Other v7 output directories
```

### Pipeline Results (v1)

```
rally-jobs/results/          — Pipeline output files (JSON)
/tmp/chek1/campaign_data/     — Historical results
```

---

## Cron Learn System

### How It Works

1. User enables cron for a campaign with interval (6/12/24 hours)
2. `configureCron()` sets `enabled: true` and calculates `next_run`
3. On each cron tick, system checks all campaigns with `next_run <= now`
4. Due campaigns run: fetch new submissions → extract patterns → update Knowledge DB
5. After run, `next_run` is advanced by `interval_hours`
6. Data accumulates over time → patterns become more accurate

### Learn Engine v2 Cron

```typescript
// Configure cron for a campaign
await configureCron(campaignAddress, campaignName, {
  enabled: true,
  intervalHours: 12,
});

// Run all due campaigns (call from cron runner)
const results = await runCronLearn();
// Returns: { campaign: string, result: LearnResult }[]

// Check learn status
const status = await getLearnStatus(campaignAddress);
// Returns: { hasData, totalSubmissions, cronEnabled, cronIntervalHours, ... }
```

### Knowledge DB Cron

```typescript
// Get campaigns that need learning
const dueCampaigns = await getCampaignsNeedingLearn();
// Scans all campaigns, checks cron_config.json next_run timestamps

// Individual campaign check
const db = getKnowledgeDB(address, name);
const due = await db.getCampaignsDue();
// Returns campaigns where enabled && next_run <= now
```

### Schedule Options

| Interval | Use Case |
|----------|----------|
| Every 6 hours | Active campaigns with many participants |
| Every 12 hours | Medium activity campaigns |
| Every 24 hours | Long-running campaigns |
| Manual | User-triggered via POST /api/rally/learn |

---

## How to Use

### Untuk AI Assistant (Sesi Baru)

1. **Baca ARCHITECTURE.md** (file ini) — pahami seluruh sistem
2. **Baca GUIDELINES.md** — untuk protokol keselamatan git
3. **Jalankan `git status`** dan perbaiki kalau corrupt: `rm -f .git/index && git reset`
4. **Pahami prinsip 3 AI Sessions** — LEARNER, GENERATOR, JUDGE harus pakai token berbeda
5. **Kerja pada komponen yang tepat** — jangan campur aduk token antara generate dan judge
6. **Setelah selesai**: `git add -A && git commit -m "deskripsi singkat"`
7. **JANGAN PERNAH skip commit** — .git/index bisa corrupt kapan saja

### Untuk Pengguna

1. **Cari campaign** — Gunakan search bar, pilih campaign dari daftar
2. **Jalankan Learn** — Klik "Learn" untuk fetch data dari Rally.fun, atau aktifkan cron untuk learning otomatis
3. **Tunggu data terkumpul** — Semakin banyak submissions yang dianalisis, semakin akurat polanya
4. **Generate konten** — Klik "Generate" untuk membuat beberapa variasi konten
5. **Review hasil judge** — Lihat skor per kategori, feedback, dan grade
6. **Submit ke Rally** — Gunakan konten terbaik untuk submit ke campaign Rally.fun

### Starting the Server

```bash
# Start development server
bash /home/z/my-project/.zscripts/dev.sh &

# JANGAN gunakan npx next dev & langsung — proses mati saat shell session berakhir
```

---

## File Structure

```
/home/z/my-project/
├── ARCHITECTURE.md              ← THIS FILE
├── GUIDELINES.md                ← Git safety protocol + server management
├── PROJECT_CONTEXT.md           ← Project context summary
├── worklog.md                   ← Development work log
├── package.json                 ← Next.js 16 + React 19 + TypeScript
├── next.config.ts               ← Next.js configuration
├── tsconfig.json                ← TypeScript configuration
├── tailwind.config.ts           ← Tailwind CSS 4 configuration
├── postcss.config.mjs           ← PostCSS configuration
├── components.json              ← shadcn/ui configuration
├── Caddyfile                    ← Reverse proxy configuration
├── prisma/
│   └── schema.prisma            ← Database schema (SQLite)
├── db/
│   └── custom.db                ← SQLite database file
│
├── campaign_data/               ← Data directory
│   ├── knowledge/               ← v8 Knowledge DB (per-campaign)
│   │   └── {address}/
│   │       ├── submissions.jsonl
│   │       ├── patterns.json
│   │       ├── cron_config.json
│   │       └── meta.json
│   ├── v7_collected/            ← v7 raw Rally data snapshots
│   ├── learned_rules.json       ← v7 pre-computed rules
│   ├── v7_learning_db.json      ← v7 learning database
│   ├── v7_knowledge.json        ← v7 AI-extracted patterns
│   └── *_output/                ← v7 generated results
│
├── src/
│   ├── app/
│   │   ├── page.tsx                          ← Main dashboard
│   │   ├── layout.tsx                        ← Root layout
│   │   ├── globals.css                      ← Global styles
│   │   ├── api/
│   │   │   ├── route.ts                      ← API root
│   │   │   ├── rally-content/route.ts        ← Rally content endpoint
│   │   │   └── rally/
│   │   │       ├── search/route.ts           ← Campaign search
│   │   │       ├── campaign/[address]/route.ts ← Campaign detail
│   │   │       ├── submissions/route.ts      ← Rally submissions data
│   │   │       ├── learn/route.ts            ← Learn pipeline v1 (legacy)
│   │   │       ├── generate/route.ts         ← Generate pipeline v1 (background)
│   │   │       ├── generate/status/route.ts  ← Generate status polling
│   │   │       ├── process-next/route.ts     ← SSE streaming pipeline
│   │   │       ├── competitive/route.ts     ← Competitive analysis
│   │   │       ├── results/route.ts          ← Results viewer
│   │   │       └── status/route.ts           ← System status
│   │
│   ├── lib/
│   │   ├── knowledge-db.ts          ← Knowledge DB (persistent storage, v8)
│   │   ├── learn-engine.ts           ← Learn Engine v2 (AI pattern extraction)
│   │   ├── judge-engine.ts           ← Judge Engine v2 (independent AI session)
│   │   ├── http-ai-client.ts         ← AI HTTP client (11 tokens, rate limits)
│   │   ├── rally-submissions.ts      ← Rally API integration
│   │   ├── rally-scoring.ts          ← Scoring system (v2 Rally-aligned + legacy)
│   │   ├── ai-service.ts             ← AI service (generate, judge, regenerate)
│   │   ├── pipeline.ts               ← Pipeline orchestrator v1
│   │   ├── background-job.ts         ← Background job manager
│   │   ├── rally-jobs.ts             ← Job persistence
│   │   ├── rally-calibration.ts      ← Calibration from real data
│   │   ├── rally-competitive.ts      ← Competitive analysis
│   │   ├── db.ts                     ← Prisma database client
│   │   └── utils.ts                  ← General utilities
│   │
│   ├── components/ui/                ← 49 shadcn/ui components
│   │   ├── accordion.tsx
│   │   ├── alert.tsx, alert-dialog.tsx
│   │   ├── aspect-ratio.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── carousel.tsx
│   │   ├── chart.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── command.tsx
│   │   ├── context-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── hover-card.tsx
│   │   ├── input.tsx, input-otp.tsx
│   │   ├── label.tsx
│   │   ├── menubar.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── pagination.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── radio-group.tsx
│   │   ├── resizable.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── sonner.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx, toaster.tsx
│   │   ├── toggle.tsx, toggle-group.tsx
│   │   ├── tooltip.tsx
│   │   └── ...
│   │
│   └── hooks/
│       ├── use-toast.ts
│       └── use-mobile.ts
│
├── campaigns/                   ← Saved campaign data (JSON)
├── public/                      ← Static assets
└── examples/                    ← Example code (websocket)
```

---

## Key Design Decisions

### 1. File-based Storage vs Database

**Decision:** Chose file-based JSON/JSONL storage for Knowledge DB.

**Rationale:**
- Simplicity: No database setup or migration needed
- Portability: Just copy the `campaign_data/` directory
- Transparency: Data is human-readable, easy to inspect/debug
- Survivability: Files persist across server restarts, no connection management

**Trade-off:** No SQL queries, no concurrent transaction support (mitigated by write locks).

### 2. 3 AI Sessions with Token Isolation

**Decision:** Generator and Judge MUST use different tokens.

**Rationale:**
- Prevents the judge from "recognizing" its own output
- Prevents context bleeding between variations (each judge call uses unique chatId)
- Different temperatures: generator (0.85 creative) vs judge (0.4 analytical)
- Tokens 0-2 for learn/generate, tokens 3-10 for judge evaluation

**Implementation:** `forceTokenIndex` parameter in `chat()` method forces specific token + bucket.

### 3. Append-only Submissions

**Decision:** Submissions are appended to JSONL, never modified.

**Rationale:**
- Never lose data (append-only)
- Easy to audit (each line is a complete record)
- Simple deduplication (check content_hash before append)
- Natural chronological ordering

### 4. Cron Scheduling for Data Accumulation

**Decision:** Support scheduled learning at 6/12/24 hour intervals.

**Rationale:**
- Campaign data changes over time as new submissions come in
- Manual learning is tedious for long-running campaigns
- More data → more accurate patterns → better generated content
- Non-blocking: cron runs in background, doesn't affect UX

### 5. Pattern Merging with Weighted Average

**Decision:** Existing patterns get 60% weight, new patterns get 40%.

**Rationale:**
- Prevents pattern drift from small sample sizes
- New data still has meaningful impact (40%)
- Benchmarks favor recent data more (40% existing, 60% new)
- Category insights are replaced entirely (latest analysis is most relevant)

### 6. Grade System Aligned with Rally's Actual Scoring

**Decision:** Use Rally's actual 7-category scoring, not a custom system.

**Rationale:**
- Scores are calibrated against real Rally submission data (1933 submissions analyzed)
- Grade thresholds match actual score distributions
- Top 10% typically score 16+ (76%+ quality)
- Median typically scores 10-12 (48-57% quality)

### 7. v1 Compatibility Maintained

**Decision:** All v1 routes and scoring functions still work.

**Rationale:**
- v2 is additive, not breaking
- Legacy scoring functions kept as `@deprecated`
- v1 learn/generate routes still functional
- Frontend can gradually migrate to v2 endpoints

---

## Troubleshooting

### Git Issues

| Problem | Solution |
|---------|----------|
| `.git/index` corrupt | `rm -f .git/index && git reset` |
| Uncommitted work after crash | `git diff` to check, `git checkout -- .` to discard or `git add -A && git commit` |
| Large .next in repo | `.next` is in `.gitignore` — if not, `git rm -r --cached .next` |

### Server Issues

| Problem | Solution |
|---------|----------|
| Server down | `bash /home/z/my-project/.zscripts/dev.sh &` |
| `.next` corrupt | `rm -rf .next && bash /home/z/my-project/.zscripts/dev.sh &` |
| Port 3000 in use | `lsof -i :3000` then `kill <pid>` |
| Slow builds | `rm -rf .next/cache` |

### AI / Rate Limit Issues

| Problem | Solution |
|---------|----------|
| AI rate limited | System auto-rotates tokens. If all exhausted, wait 5-10 minutes for bucket reset |
| All tokens depleted | Check `/api/rally/status` for bucket health. Wait for 10min window to expire |
| Empty AI response | System retries once with higher temperature. Check `enableThinking: false` is set |
| Judge gives unexpected scores | Check if learned data is available for the campaign (run Learn first) |
| JSON parse failure in judge | Fallback heuristic scoring kicks in (default: all binary gates = 0, verdict = fail) |

### Learn Issues

| Problem | Solution |
|---------|----------|
| Learn returns 0 new submissions | Campaign may have no new submissions since last learn |
| AI pattern extraction fails | Need ≥5 new submissions to trigger AI analysis. Raw data still stored. |
| Patterns not improving | Run Learn multiple times as new submissions accumulate |

### Pipeline Issues

| Problem | Solution |
|---------|----------|
| Pipeline timeout (502) | Use SSE endpoint `/api/rally/process-next` instead of `/api/rally/generate` |
| No candidates pass quality gate | Check: (1) Is learned data available? (2) Are campaign rules too restrictive? (3) Try increasing `maxCycles` |
| All candidates fail same gate | Adaptive learning should address this in cycle 2. Check feedback for specific issues. |
| Content too short | Pipeline auto-retries once. If still short, check campaign context is not empty. |

---

## Tech Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 16.1.1 |
| Language | TypeScript | 5.x |
| React | React | 19.0.0 |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui (Radix) | — |
| AI Model | GLM-4-Plus | — |
| AI Client | Custom HTTP (z-ai-web-dev-sdk) | 0.0.17 |
| ORM | Prisma | 6.11.1 |
| Database | SQLite | — |
| State Management | Zustand | 5.0.6 |
| Charts | Recharts | 2.15.4 |
| Runtime | Bun | — |
| Reverse Proxy | Caddy | — |
