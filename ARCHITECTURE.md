# Rally Brain v7.0 — Complete Architecture & Continuity Guide

> **BACA FILE INI PERTAMA.** Ini adalah satu-satunya dokumen yang diperlukan AI chat baru untuk memahami, menjalankan, dan mengembangkan Rally Brain secara penuh.

---

## 0. QUICK SUMMARY — WHAT IS RALLY BRAIN?

**Rally Brain** adalah sistem AI otomatis untuk membuat konten sosial media (tweet/X) berkualitas tinggi untuk platform [Rally.fun](https://rally.fun). Rally.fun menyelenggarakan campaign crypto/DeFi di mana pengguna membuat konten yang dinilai oleh AI judge. Rally Brain membuat konten ini secara otomatis menargetkan **Grade S (21+/23 poin)**.

### Versi Terkini: v7.0 (Data-Driven Architecture)
- **v6.0-v6.2**: Cron-based generation, multi-campaign rotation, closed-loop learning, Grade S tercapai
- **v7.0**: Data-driven learning dari 258 submission Rally.fun, frontend dashboard real-time, learning pipeline dari AI judge analysis
- **v7.1**: Deep learning pipeline (`learn.js`, `learn_from_rally.js`), extracted 14 rules dari winner patterns

### Alur Kerja Utama:
```
[Frontend Dashboard] → Search/Select Campaign from Rally.fun API
    → Trigger Generation → Background Job Pipeline
    → AI generates content → Score (7 categories, max 23) → Grade S
    → Output: best_content.txt + qa.json
```

### Alur Learning (BARU di v7):
```
[Frontend Dashboard] → Select Campaign → Trigger Learning
    → Fetch submissions dari Rally.fun API
    → Extract features dari AI judge category_analysis
    → Pattern analysis (winners vs losers)
    → Generate learned_rules.json
    → Rules injected ke generate.js untuk konten berikutnya
```

---

## 1. GIT & GITHUB

| Item | Value |
|------|-------|
| **Repo** | `https://github.com/tuyulmillenium104-cmd/chek1` |
| **Branch aktif** | `v7-architecture` |
| **Branch lama** | `main` (v6.2, sudah deprecated) |
| **Push** | `git push origin v7-architecture` |
| **Credentials** | `/home/z/my-project/.secrets/github.json` |

### File yang DI-TRACK di git:
- Source code (JS, TS, TSX, Python)
- Campaign config JSON files
- `campaign_data/learned_rules.json` dan `v7_learning_db.json`
- Dokumentasi (ARCHITECTURE.md, README.md, QUICKSTART.md, CONTEXT.md)
- `download/rally-content/` (output yang sudah di-generate)

### File yang TIDAK di-track (.gitignore):
- `node_modules/`, `.env`, `.next/`
- `campaign_data/v7_collected/` (raw submission data, besar)
- `*_health.json`, `rotation_state.json`, `recovery_log.json` (runtime state)
- `download/rally-brain/` (backup copy lama)

---

## 2. PROJECT DIRECTORY STRUCTURE

```
/home/z/my-project/download/rally-brain/          ← PROJECT ROOT
│
├── GENERATION ENGINE (v6 pipeline, masih aktif)
│   ├── generate.js                 ← Main pipeline: LEARN→GEN→EVAL→JUDGE→QA→OUTPUT (~1644 lines)
│   ├── zai-resilient.js            ← Token rotation (5 tokens x 300/day = 1500 quota)
│   ├── self_heal.js                ← Spawn-based runner with retry logic
│   ├── health_monitor.js           ← Per-campaign health tracking
│   ├── run_all.js                  ← Multi-campaign rotation orchestrator
│   └── rally_guard.js              ← Guard rail checks
│
├── LEARNING ENGINE (v7, BARU)
│   ├── learn.js                    ← Deep learning dari all_submissions.jsonl (258 submissions)
│   │                                 Extract features dari AI judge category_analysis
│   │                                 Output: v7_learning_db.json + learned_rules.json
│   ├── learn_from_rally.js         ← Learn dari REAL Rally.fun API (per campaign)
│   │                                 Usage: node learn_from_rally.js <address> [missionId]
│   │                                 STOP via: touch campaign_data/.stop_learning
│   │                                 Output: campaign_data/<name>_learned/learning_db.json
│   │                                         campaign_data/<name>_learned/learned_rules.json
│   └── v7_predictor.py             ← Python predictor (legacy, belum terintegrasi)
│
├── FRONTEND (Next.js, dashboard lengkap)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            ← Main dashboard UI (search → detail → generate → result)
│   │   │   ├── layout.tsx          ← Root layout
│   │   │   ├── globals.css         ← Global styles (Tailwind)
│   │   │   └── api/
│   │   │       ├── rally/
│   │   │       │   ├── search/route.ts          ← GET /api/rally/search?q=name
│   │   │       │   ├── campaign/[address]/route.ts ← GET /api/rally/campaign/<addr>?mission=N
│   │   │       │   ├── generate/route.ts         ← POST /api/rally/generate (start bg job)
│   │   │       │   ├── generate/status/route.ts   ← GET /api/rally/generate/status?jobId=x
│   │   │       │   ├── submissions/route.ts      ← GET /api/rally/submissions (fetch subs)
│   │   │       │   ├── competitive/route.ts      ← Competitive analysis
│   │   │       │   ├── process-next/route.ts     ← Process next queue item
│   │   │       │   └── status/route.ts           ← GET /api/rally/status (system status)
│   │   │       ├── rally-content/route.ts ← Download center API
│   │   │       └── route.ts                ← Legacy
│   │   ├── lib/
│   │   │   ├── ai-service.ts       ← AI service (SDK wrapper)
│   │   │   ├── http-ai-client.ts   ← Raw HTTP AI client (token rotation)
│   │   │   ├── background-job.ts   ← Background job manager
│   │   │   ├── rally-jobs.ts       ← Job queue management
│   │   │   ├── rally-submissions.ts← Submission fetching from Rally.fun
│   │   │   ├── rally-scoring.ts    ← 7-category scoring system
│   │   │   ├── rally-competitive.ts← Competitive analysis
│   │   │   ├── rally-calibration.ts← Score calibration
│   │   │   ├── pipeline.ts         ← Main content generation pipeline (TS version)
│   │   │   ├── db.ts               ← Database utilities
│   │   │   └── utils.ts            ← General utilities
│   │   ├── hooks/
│   │   │   ├── use-toast.ts
│   │   │   └── use-mobile.ts
│   │   └── components/ui/          ← shadcn/ui components (40+ files)
│   │       ├── button.tsx, card.tsx, badge.tsx, input.tsx, etc.
│   │       └── ...
│   └── public/
│       ├── logo.svg
│       └── robots.txt
│
├── CONFIG FILES
│   ├── package.json                ← Dependencies (Next.js, shadcn/ui, z-ai-web-dev-sdk)
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── components.json             ← shadcn/ui config
│   ├── eslint.config.mjs
│   ├── Caddyfile                   ← Caddy reverse proxy config
│   └── bun.lock                    ← bun package lock
│
├── CAMPAIGN CONFIGS (v6, untuk local generation)
│   └── campaigns/
│       ├── marbmarket-m0.json      ← MarbMarket Mission 0 (veDEX)
│       ├── marbmarket-m1.json      ← MarbMarket Mission 1 (ve(3,3))
│       └── campaign_3.json         ← Fragments BTC-Jr
│
├── CAMPAIGN DATA (output + learning)
│   └── campaign_data/
│       ├── v7_learning_db.json     ← Full learning DB dari 258 submissions
│       ├── learned_rules.json      ← Compact rules untuk injection ke generate.js
│       ├── v7_winners.json         ← Top scorers analysis
│       ├── v7_knowledge.json       ← Knowledge base
│       ├── architecture_state.json ← Architecture state tracking
│       ├── rotation_state.json     ← Campaign rotation state (v6)
│       ├── orchestrator_log.json   ← Orchestrator execution log
│       ├── recovery_log.json       ← Self-heal recovery history
│       ├── *.health.json           ← Per-campaign health state
│       ├── *_knowledge_db.json     ← Per-campaign closed-loop learning
│       ├── v7_collected/           ← Raw collected submissions dari Rally.fun API
│       │   ├── all_submissions.jsonl  ← 258 submissions (data utama learning)
│       │   ├── campaign_*_raw.json    ← Per-campaign raw data
│       │   ├── seen_hashes.json       ← Dedup tracking
│       │   └── latest_snapshot.json   ← Latest data snapshot
│       ├── *_output/               ← Per-campaign generated content
│       │   ├── best_content.txt
│       │   ├── qa.json
│       │   ├── full_output.json
│       │   └── prediction.json
│       └── .learning_status.json   ← Learning pipeline status (real-time)
│
├── PYTHON SCRIPTS (legacy, sebagian masih digunakan)
│   ├── engine.py, v7_engine.py
│   ├── v7_collector.py, v7_analyzer.py, v7_config.py
│   ├── v7_knowledge.py, v7_predictor.py
│   ├── rally_brain/                ← Python package
│   │   ├── __init__.py, api.py, engine.py, knowledge.py, patterns.py, predictor.py
│   ├── cron.py, cron_learner.py, cron_generator.py
│   └── requirements.txt
│
├── SHELL SCRIPTS
│   ├── rally_daemon.sh, rally_loop.sh, rally_auto.sh
│   ├── v7_cron.sh, rally_learn_cron.sh, rally_runner.sh, run_all.js
│   ├── self_heal.js, health_monitor.js, zai-resilient.js
│   └── ...
│
└── DOKUMENTASI
    ├── ARCHITECTURE.md             ← FILE INI (continuity guide)
    ├── README.md                   ← Project overview (perlu diupdate ke v7)
    ├── QUICKSTART.md               ← Quick start guide
    └── CONTEXT.md                  ← Context document (perlu resolve merge conflict)
```

---

## 3. SCORING SYSTEM (Rally.fun — 7 Categories, Max 23 Points)

| Category | Max | Type | Apa yang Dinilai |
|----------|-----|------|-----------------|
| **Originality** | 2 | GATE (0/2) | Tidak AI words, tidak template, sudut unik, personal voice |
| **Alignment** | 2 | GATE (0/2) | Sesuai topik campaign, terminologi benar, cover mission |
| **Accuracy** | 2 | GATE (0/2) | Semua claim faktual, tidak exaggeration, spesifik |
| **Compliance** | 2 | GATE (0/2) | @RallyOnChain + link project, tidak banned words/hashtags/dashes |
| **Engagement** | 5 | QUALITY (0-5) | Hook menarik, CTA/question genuine, membuat reader reply |
| **Technical** | 5 | QUALITY (0-5) | Grammar natural, format bersih, tidak smart quotes/markdown |
| **Reply Quality** | 5 | QUALITY (0-5) | Genuine open question, vulnerability, bukan rhetorical |

### Grade System:
| Score | Grade | Status |
|-------|-------|--------|
| 22-23 | S+ | Perfect |
| 21-21.9 | S | **TARGET** |
| 19-20.9 | A+ | Good |
| 17-18.9 | A | Acceptable |
| 15-16.9 | B+ | Below target |
| 13-14.9 | B | Weak |
| <13 | C/D | Fail |

### Score Calibration (generate.js internal scoring):
| Category | Base | Max | Key Bonus Sources |
|----------|------|-----|-------------------|
| Originality | 0.3 | 2 | +0.5 unique markers (3+), +0.2 personal voice, +0.25 sentence variety |
| Alignment | 0 | 2 | +0.3/keyword, +0.15/unique_marker, +0.3 project_name, +0.2 @RallyOnChain |
| Accuracy | 1.0 | 2 | +0.6 unique markers (3+), +0.3 general tech terms (4+) |
| Compliance | 2.0 | 2 | STRICT: 0 if missing @RallyOnChain, link, project_name, or any banned word |
| Engagement | 2.0 | 5 | +1.0 question, +0.5 short hook, +0.7 genuine Q, +0.3 paragraphs, +0.3 length |
| Technical | 3.0 | 5 | +0.5 unique markers (3+), +0.3 length, +0.3 clean ending, +0.2 proper end |
| Reply Quality | 1.0 | 5 | +2.5 genuine Q, +0.5 last sentence question, +0.5 @RallyOnChain+Q, +0.5 vulnerability |

---

## 4. BANNED LISTS (WAJIB DIHINDARI)

### Tier 1 — INSTANT GATE FAIL (compliance = 0):
- Words: `guaranteed`, `100%`, `risk-free`, `buy now`, `get rich`, `passive income`, `follow me`, `click here`
- Buzzwords: `vibe coding`, `skin in the game`, `trust layer`, `agent era`, `frictionless`, `how did I miss this`
- Formatting: Em-dash (`---`), en-dash, double-hyphen
- Hashtags: `#crypto`, `#web3`
- Start with `@mention`

### Tier 2 — SCORE PENALTY:
- AI words (32): `delve`, `leverage`, `paradigm`, `tapestry`, `landscape`, `nuance`, `crucial`, `pivotal`, `embark`, `harness`, `foster`, `utilize`, `elevate`, `streamline`, `empower`, `comprehensive`, `realm`, `flywheel`, `ecosystem`, `seamless`, `robust`, `innovative`, `cutting-edge`, `game-changer`, `revolutionary`, `disrupt`, `transform`, `synergy`, `holistic`, `dynamic`
- Template phrases (21): `hot take`, `let's dive in`, `nobody is talking about`, `unpopular opinion`, `thread alert`, `picture this`, `at the end of the day`, `here's the thing`, `key takeaways`
- Exaggeration: `everyone`, `nobody`, `always`, `never`, `impossible`

### AI Word Replacement (42 entries, otomatis di generate.js):
`flywheel`→`incentive loop`, `ecosystem`→`network`, `leverage`→`use`, `paradigm`→`model`, `transform`→`change`, `disrupt`→`shake up`, `synergy`→`combo`, dll.

---

## 5. LEARNING SYSTEM (v7.0-v7.1) — CORE INNOVATION

### 5.1 Masalah Kritis yang Ditemukan
- **Field `content` KOSONG** di semua 258 submissions Rally.fun — tidak bisa baca tweet asli
- X/Twitter punya login wall, Nitter mati, hanya 1/258 tweet ditemukan via Google
- **Solusi**: Gunakan `category_analysis` dari AI judge Rally.fun sebagai sumber learning
  - Setiap submission punya 7 kategori analysis masing-masing 200-500 kata
  - Mengandung deskripsi detail + kutipan fragment dari konten asli
  - Cukup untuk mengextract patterns apa yang bikin menang vs kalah

### 5.2 Winner Patterns (skor >= 21, 20 submissions):
| Feature | Winners | Losers (<16) | Difference |
|---------|---------|--------------|------------|
| **has_substantive_replies** | 50% | 9% | **+41%** |
| **replies_not_generic** | 15% | 74% | **-59%** (reverse!) |
| **is_longform** | 85% | 48% | **+37%** |
| **has_referral** | 50% | 22% | **+28%** |
| authentic_tone | 100% | 83% | +17% |
| not_start_mention | 55% | 77% | -22% |
| covers_urgency | 65% | 82% | -17% |
| good_grammar | 50% | 66% | -16% |

### 5.3 BluePrint Konten Pemenang:
- **Angle**: persona_driven (85% dari winners), educational (15%)
- **Hook**: announcement (95%), personal_story (5%)
- **Struktur**: Longform, multi-paragraph, contrast opening
- **Tone**: Authentic, personal, conversational (NOT AI-sounding)
- **Compliance**: @RallyOnChain + referral link (100%)
- **Reply**: Genuine substantive discussion (NOT generic "great post!")
- **Avoid**: Urgency/FOMO berlebihan, AI-sounding grammar, template phrases

### 5.4 Learned Rules (14 rules, 6 STRONG):
```
STRONG:
  [EMPHASIZE] has_referral (+28%)
  [EMPHASIZE] has_substantive_replies (+41%)
  [MINIMIZE]  replies_not_generic (-59%)
  [EMPHASIZE] is_longform (+37%)
  [EMPHASIZE] authentic_tone (+17%)
  [EMPHASIZE] covers_fairness (+12%)

MODERATE:
  [MINIMIZE]  covers_urgency (-17%)
  [MINIMIZE]  no_hashtags (-18%)
  [MINIMIZE]  no_emdash (-14%)
  [MINIMIZE]  not_start_mention (-22%)
  [EMPHASIZE] fomo_element (+15%)
  [EMPHASIZE] relatable (+14%)
  [EMPHASIZE] challenges_status_quo (+13%)
  [MINIMIZE]  good_grammar (-16%)
```

### 5.5 Learning Pipeline Files:
| File | Fungsi |
|------|--------|
| `learn.js` | Pipeline utama: baca all_submissions.jsonl → extract features → pattern analysis → rules |
| `learn_from_rally.js` | Learn dari LIVE Rally.fun API per campaign (fetch submissions real-time) |
| `campaign_data/v7_learning_db.json` | Full learning database (patterns, rules, all submissions) |
| `campaign_data/learned_rules.json` | Compact rules siap inject ke generate.js |
| `campaign_data/.learning_status.json` | Real-time learning status (untuk frontend polling) |

### 5.6 STOP Mechanism:
```bash
# Stop learning pipeline dari command line:
touch /home/z/my-project/download/rally-brain/campaign_data/.stop_learning

# Pipeline akan cek file ini di setiap step dan exit gracefully
```

---

## 6. FRONTEND ARCHITECTURE (Next.js Dashboard)

### 6.1 Tech Stack:
- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS 4** + **shadcn/ui** (40+ components)
- **z-ai-web-dev-sdk** (LLM API client, backend only)
- Background job pattern (POST → poll status)

### 6.2 Frontend Flow:
```
STATE 1: SEARCH
  → User ketik nama campaign → GET /api/rally/search?q=xxx
  → Fetch semua campaign dari Rally.fun API, filter client-side

STATE 2: RESULTS
  → Tampilkan list campaign cards (title, reward, missions, status)
  → Klik card → fetch detail

STATE 3: DETAIL
  → Tampilkan full campaign info (description, rules, knowledge base, missions)
  → Switch mission (tab per mission number)
  → Tombol "Generate Content"

STATE 4: GENERATING
  → POST /api/rally/generate → return jobId instantly
  → Poll GET /api/rally/generate/status?jobId=xxx every 2s
  → Pipeline stages: analysis → calibrate → generate → judge → score → output
  → Real-time log panel

STATE 5: RESULT
  → Konten final + score per category + grade + competitive analysis
  → Copy to clipboard, download
  → Tombol "Generate Again" untuk variation baru
```

### 6.3 API Routes:

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/rally/search?q=xxx` | GET | Cari campaign dari Rally.fun API |
| `/api/rally/campaign/<address>?mission=N` | GET | Detail campaign + mission |
| `/api/rally/generate` | POST | Start background generation job |
| `/api/rally/generate/status?jobId=x` | GET | Poll generation progress |
| `/api/rally/submissions?campaignAddress=x` | GET | Fetch submissions dari Rally.fun |
| `/api/rally/status` | GET | System status (tokens, gateways, queue) |
| `/api/rally-content` | GET | Download center (generated files) |
| `/api/rally/competitive` | GET | Competitive analysis |
| `/api/rally/process-next` | GET | Process next queue item |

### 6.4 Rally.fun API:
```
Base URL: https://app.rally.fun/api

Endpoints:
  GET /campaigns?limit=200                    → List all campaigns
  GET /campaigns/<contractAddress>            → Campaign detail + missions
  GET /submissions?campaignAddress=<addr>&limit=100&offset=0  → Submissions

Authentication: Tidak perlu (public API)
Rate Limiting: Tidak diketahui, gunakan 500ms delay antar request

Data per submission:
  - id, tweetId, xUsername, missionId, timestamp
  - attoRawScore (score / 1e18)
  - analysis[] (7 items, each with category, analysis text, atto_score)
  - engagement_metrics (likes, retweets, replies, impressions)
```

---

## 7. TOKEN POOL & API LIMITS

### Token Pool (5 tokens = 1,500 calls/day):
| Token | User ID | Source |
|-------|---------|--------|
| TOKEN_1 | 97631263... | Manual |
| TOKEN_2 | 1cdcf579... | Manual |
| TOKEN_3 | 97631263... | Manual |
| TOKEN_4 | bb829ea3... | Manual |
| TOKEN_5_AUTO | 4f3de308... | System auto (dari `/etc/.z-ai-config`) |

### Rate Limits (empiris):
| Tier | Limit | Scope |
|------|-------|-------|
| Daily | 300/token | Per JWT token |
| Per 10 min | 10/token/gateway | Per token+gateway combo |
| QPS | 2/sec/gateway | Shared all tokens |

### Gateways:
- `172.25.136.210:8080`
- `172.25.136.193:8080`
- Round-robin rotation

### API Budget per Generation Cycle:
- **8 gen calls** + **2 QA calls** + **2 judge calls** = **12 API calls max**
- **~2 minutes** per cycle (12 calls × 10s interval)

---

## 8. GENERATION PIPELINE (generate.js — v5.1)

### Phase 0: LEARN
- Loads external data: rally_pattern_cache.json, rally_knowledge_vault.json, rally_submissions_cache.json
- Loads campaign-specific knowledge_db.json cycle history
- Produces LEARNED object: patterns, techniques, antiAI, topHooks, overused, failures, cycleHistory, kdbPatterns

### Phase 1: GENERATE (up to 4 loops × 2 variations = 8 API calls)
- buildBasePrompt(angle) — inject LEARNED context + campaign config
- generateVariation() → LLM API via z-ai-resilient.js
- sanitizeContent() — fix dashes, quotes, whitespace, markdown
- replaceAIWords() — 42+ word replacements
- quickScreen() — Tier 1 compliance check
- Temperature: 0.75 + (loop-1)*0.05 + i*0.03

### Phase 2: EVALUATE (per loop, top 1 variation)
- quickProgrammaticScore() — fast heuristic, no API
- programmaticEvaluate() — 7 categories, no API
- g4OriginalityCheck() — human-like bonus [-1.0, +0.5]
- Early accept if score >= 21.0

### Phase 3: JUDGE VALIDATION (best content, 2 API calls)
- J3: Rally AI Clone (temp 0.4, compliance-focused)
- J5: AI Fingerprint Detector (temp 0.2, originality-focused)
- Consensus: average of valid judges

### Phase 4: Q&A GENERATION (2 API calls, 10 Q&A pairs)
- 2 calls × 5 pairs each from different perspectives
- Fallback: campaign-specific fallback_qa from config

### Phase 5: OUTPUT + LEARNING
- Writes: best_content.txt, qa.json, prediction.json, full_output.json
- Updates: campaign-specific knowledge_db.json

### Generation Parameters:
- MAX_LOOPS: 2
- VARIATIONS_PER_LOOP: 2 (2×2 = 4 total)
- temperature: 0.55-0.65 (loop 1: 0.55-0.59, loop 2: 0.61-0.65)
- maxTokens: 1200
- Model: glm-4-flash (via raw HTTP)

---

## 9. CRITICAL CONSTRAINTS

1. **Container kills proses setelah ~25-30 detik** — MUST use `setsid` untuk background execution
2. **Sequential only** — parallel campaigns trigger 429 rate limits
3. **Early Save** — best_content.txt disimpan SEBELUM judge/QA untuk survive container kill
4. **Token rotation** — 5 tokens × 300/day = 1,500 daily quota, RAW HTTP (bukan SDK)
5. **Field `content` KOSONG** di Rally.fun submissions — TIDAK BISA baca tweet asli
6. **Learning dari AI judge analysis saja** — category_analysis berisi deskripsi 200-500 kata per kategori

---

## 10. ENVIRONMENT & CRITICAL PATHS

### Runtime:
- Node.js v18+, bun for package management
- z-ai-web-dev-sdk (LLM API client) — already installed
- Python 3.x (untuk script legacy)
- Next.js dev server: `npm run dev` dari project root `/home/z/my-project/`

### Critical Paths:
```
/home/z/my-project/download/rally-brain/                    ← Project root
/home/z/my-project/download/rally-brain/generate.js          ← Main pipeline
/home/z/my-project/download/rally-brain/learn.js             ← Learning pipeline
/home/z/my-project/download/rally-brain/learn_from_rally.js  ← Real-time learning
/home/z/my-project/download/rally-brain/campaign_data/       ← Output + state
/home/z/my-project/download/rally-brain/campaign_data/learned_rules.json ← Rules
/home/z/my-project/download/rally-brain/campaign_data/v7_learning_db.json ← Full DB
/home/z/my-project/download/rally-brain/campaign_data/v7_collected/ ← Raw data
/home/z/my-project/download/rally-brain/campaign_data/v7_collected/all_submissions.jsonl ← 258 subs
/home/z/my-project/                                          ← bun workspace root (SDK)
/home/z/my-project/.secrets/github.json                      ← GitHub credentials
```

---

## 11. CURRENT STATE (Per 16 April 2026)

### Yang SUDAH JADI:
- [x] Generation pipeline (generate.js v5.1) — Grade S konsisten
- [x] Frontend dashboard (Next.js) — search, generate, result, download
- [x] API routes (9 endpoints) — Rally.fun API integration
- [x] Token rotation (z-ai-resilient.js) — 5 tokens, raw HTTP
- [x] Learning pipeline (learn.js) — 258 submissions → 14 rules
- [x] Real-time learning (learn_from_rally.js) — per campaign dari Rally.fun API
- [x] Self-heal recovery (self_heal.js) — spawn-based, auto-retry
- [x] Background job system — POST/poll pattern, no 502 timeout
- [x] Download center — generated content download

### Yang BELUM JADI (Pending Tasks):
- [ ] **Learning trigger dari frontend** — user bisa pilih campaign/mission, start/stop learning
- [ ] **Connect learned_rules.json ke generate.js** — inject winner patterns ke generation prompt
- [ ] **20 Q&A pairs untuk winning content** — dari analysis sebelumnya
- [ ] **Real campaign data di frontend** — campaign dropdown dari Rally.fun API (bukan local config)
- [ ] **Schema fix** — knowledge_db.json versioning
- [ ] **Judge cascade** — more judges for better consensus
- [ ] **Versioned KDB** — versioned knowledge database
- [ ] **Update README.md ke v7** — masih v6
- [ ] **Fix CONTEXT.md merge conflict** — ada merge conflict di file ini

### Cron Jobs:
- **TIDAK ADA cron job aktif** — semua sudah di-stop per request user
- Sebelumnya ada:
  - Job 91383: quality-gated rotation (15 min) — STOPPED
  - Job 91762: data pipeline/learning (30 min) — STOPPED (tidak pernah jalan)

### Status Frontend:
- Frontend ADA di branch `v7-architecture`
- Fitur search, generate, result, download sudah berfungsi
- Fitur LEARNING TRIGGER belum ada di frontend
- Backend API sudah siap, tinggal buat UI

---

## 12. NEXT AI CHAT — INSTRUCTION MANUAL

Jika Anda adalah AI chat baru dan diberi link GitHub `tuyulmillenium104-cmd/chek1` branch `v7-architecture`, ini yang harus dilakukan:

### Step 1: Clone & Setup
```bash
cd /home/z/my-project/download/rally-brain
git checkout v7-architecture
git pull origin v7-architecture
bun install  # atau npm install
```

### Step 2: Baca File Ini
- `ARCHITECTURE.md` — Anda sudah membacanya sekarang
- `learned_rules.json` — Rules yang sudah di-extract dari 258 submissions
- `campaign_data/v7_learning_db.json` — Full learning database

### Step 3: Jalankan Frontend
```bash
cd /home/z/my-project && npm run dev
# Preview: https://preview-<bot-id>.space.chatglm.site/
```

### Step 4: Implementasi Pending Tasks
Lihat Section 11 ("Yang BELUM JADI") untuk task prioritas.

### Step 5: Push Perubahan
```bash
cd /home/z/my-project/download/rally-brain
git add -A
git commit -m "deskripsi perubahan"
git push origin v7-architecture
```

### Tips Penting:
1. **JANGAN edit runtime data** (`*_health.json`, `rotation_state.json`) kecuali Anda tahu persis
2. **JANGAN edit token pool** di `zai-resilient.js` kecuali diminta user
3. **Selalu gunakan `setsid`** untuk proses lama (container kills setelah ~30 detik)
4. **Gunakan RAW HTTP** (bukan SDK default) untuk AI calls — SDK selalu 429
5. **Field `content` di submissions SELALU KOSONG** — ini fakta, bukan bug yang bisa diperbaiki
6. **Learning dari AI judge analysis** — ini satu-satunya sumber data yang bisa diakses
7. **Bahasa user**: Indonesia — gunakan bahasa Indonesia untuk komunikasi
8. **Branch `v7-architecture`** adalah branch aktif, BUKAN `main`

---

## 13. RALLY.FUN API REFERENCE

### Base URL: `https://app.rally.fun/api`

### Endpoints:

#### GET /campaigns?limit=200
```json
Response: {
  "campaigns": [
    {
      "title": "Campaign Name",
      "description": "...",
      "goal": "...",
      "intelligentContractAddress": "0x...",
      "campaignUrl": "https://rally.fun/campaign/...",
      "status": "active",
      "category": "DeFi",
      "contentType": "tweet",
      "characterLimit": 280,
      "startDate": "2026-04-01T00:00:00Z",
      "endDate": "2026-05-01T00:00:00Z",
      "missions": [...],
      "campaignRewards": [...],
      "knowledgeBase": "...",
      "rules": "...",
      "style": "...",
      "prohibitedItems": "...",
      "adminNotice": "..."
    }
  ]
}
```

#### GET /campaigns/<address>
Returns full campaign detail with all missions.

#### GET /submissions?campaignAddress=<addr>&limit=100&offset=0
```json
Response: [
  {
    "id": "...",
    "tweetId": "...",
    "xUsername": "username",
    "missionId": "mission-0",
    "attoRawScore": "21000000000000000000",  // score / 1e18
    "timestamp": "2026-04-15T12:00:00Z",
    "content": "",  // SELALU KOSONG!
    "analysis": [
      {
        "category": "originality",
        "analysis": "The content demonstrates...",
        "atto_score": "2000000000000000000"  // score / 1e18
      },
      // ... 7 categories total
    ],
    "engagement_metrics": {
      "likes": 5,
      "retweets": 2,
      "replies": 3,
      "impressions": 100
    }
  }
]
```

### Score Parsing:
```javascript
const score = parseFloat(submission.attoRawScore) / 1e18;  // → 21.0
const categoryScore = parseFloat(analysis.atto_score) / 1e18;  // → 2.0
```

---

## 14. VERSION HISTORY

| Version | Date | Key Changes |
|---------|------|-------------|
| v6.0 | Apr 15 2026 | Multi-campaign, 5-Judge Panel, G4 Originality, spawn-based execution |
| v6.1 | Apr 15 2026 | Token rotation fix (SDK→raw HTTP), early save, compliance injection |
| v6.2 | Apr 15 2026 | Score calibration rebalance → all Grade S (21.0-21.9/23) |
| v7.0 | Apr 15 2026 | Data-driven architecture, frontend dashboard, Rally.fun API integration |
| v7.1 | Apr 15 2026 | Deep learning pipeline, 258 submissions analyzed, 14 rules extracted |

---

## 15. IMPORTANT NOTES FOR NEXT SESSION

1. **User berbahasa Indonesia** — selalu komunikasi dalam bahasa Indonesia
2. **Branch `v7-architecture`** — branch aktif untuk semua development
3. **Tidak ada cron aktif** — semua di-stop, user ingin kontrol manual via frontend
4. **Priority task**: Learning trigger dari frontend (pilih campaign, start/stop)
5. **File ini adalah SINGLE SOURCE OF TRUTH** — jika ada konflik dengan file lain, file ini yang benar
6. **`content` field selalu kosong** — jangan buang waktu mencoba fetch tweet text
7. **AI judge analysis sudah cukup** — 7 kategori × 200-500 kata = cukup untuk pattern extraction
