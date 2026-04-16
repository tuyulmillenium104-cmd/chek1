# Rally Brain v8 — Complete Architecture

## OVERVIEW
Rally Brain = AI content generator untuk Rally.fun campaigns.
Menggunakan 3 AI session TERPISAH (Learner, Generator, Judge) tanpa bias.
Versi 8 = total rewrite dari v7 yang flawed.

## RALLY.FUN API (VERIFIED — NO AUTH REQUIRED)
Base URL: `https://app.rally.fun/api`
Endpoints:
1. GET /api/campaigns — daftar campaign aktif (pagination: page, limit)
2. GET /api/campaigns/{address} — detail campaign + knowledge base + missions + scoring weights
3. GET /api/submissions?campaignAddress={address} — submissions yang sudah di-judge

Response submissions berisi analysis TEXT per kategori scoring = DATA EMAS.
Format response:
- Array of submission objects
- Setiap submission punya: id, campaignAddress, periodIndex, missionId, xUsername, tweetId, timestamp, analysis[]
- analysis = array of {category, atto_score, atto_max_score, analysis (text)}
- atto_score/atto_max_score = 18 decimal places (divide by 1e18 for human-readable)
- INILAH yang harus diekstrak oleh Learn pipeline, BUKAN cuma angka score.

Campaign detail response includes:
- title, goal, knowledgeBase, rules, style, missions[]
- alpha, gateWeights[], metricWeights[]
- startDate, endDate, periodLengthDays, campaignDurationPeriods
- token info, rewards info

## SCORING CATEGORIES (VERIFIED FROM REAL API)

### Gates (4 metrics, max 2 each = 8 total):
1. Content Alignment (max 2)
2. Information Accuracy (max 2)
3. Campaign Compliance (max 2)
4. Originality and Authenticity (max 2)

### Quality Metrics (2 metrics, max 5 each = 10 total):
5. Engagement Potential (max 5)
6. Technical Quality (max 5)

### Engagement Metrics (6 data-driven):
7. Retweets (dynamic)
8. Likes (dynamic)
9. Replies (dynamic)
10. Followers of Repliers (dynamic)
11. Impressions (dynamic)
12. Reply Quality (max 5)

Max gate+quality score: 18 points
Grade: S = 16+, A = 13-15, B = 9-12, C = <9

Scoring formula: atemporalPoints = gate_weighted_sum * alpha + metric_weighted_sum
- alpha = campaign-specific multiplier (e.g., 3)
- gateWeights = [0.9, 0.4, 1, 1] for 4 gates
- metricWeights = [0.8, 0.2, 0.5, 0.8, 0.8, 0.9, 0.8, 0.5] for 8 quality+engagement metrics

## V7 FLAWS (MENGAPA HARUS REWRITE TOTAL)
1. Learn hanya pakai score angka, analysis text dari judge diabaikan total
2. parseSubmission() simpan analysis tapi tidak pernah dipakai downstream
3. Learn menyimpan ke in-memory Map, expiry 10 menit, tidak persistent
4. Learn hilang saat server restart
5. Learn tidak terhubung ke Generate (Generate baca static JSON, bukan output Learn)
6. Tidak ada Judge validation — konten langsung keluar tanpa quality check
7. Tidak ada cron/automasi untuk akumulasi data

## 3-SESSION AI PIPELINE (DESAIN INTI v8)

### Session 1: LEARNER (Analitik)
Tujuan: Akumulasi data + extraction pattern dari Rally judge analysis
Input: Submissions dari Rally.fun API
Output: Knowledge DB files (submissions.jsonl, patterns.json, metadata.json)
Proses:
1. Fetch submissions dari campaign yang dipilih
2. Deduplicate by submission id (cek seen_hashes.json)
3. Ekstrak SEMUA data: tweetId, xUsername, atemporalPoints, dan TERUTAMA analysis TEXT per kategori
4. Append ke submissions.jsonl (format: 1 JSON object per baris)
5. Re-extract patterns ke patterns.json:
   - topPhrases: phrase/kata yang sering muncul di submission Grade A dan S
   - rejectionReasons: kata/kalimat yang sering muncul di submission Grade B dan C
   - winningStructures: pola panjang tweet, format kalimat, hashtag usage di pemenang
   - categoryInsights: per-kategori insight — apa yang bikin score tinggi
6. Update metadata.json (lastLearnAt, totalSubmissions, gradeDistribution)
7. Update seen_hashes.json (tambah id baru)

### Session 2: GENERATOR (Kreatif)
Tujuan: Buat konten tweet/post natural dan berkualitas
Input: patterns.json dari Knowledge DB + campaign brief dari user
Output: 1 konten tweet siap submit
ATURAN ANTI-BIAS (WAJIB):
- TIDAK BOLEH melihat scoring rubrik detail (tidak tahu max score per kategori)
- TIDAK BOLEH tahu total max score
- Hanya boleh baca patterns (gaya konten yang menang di campaign ini)
- TIDAK BOLEH tahu dia adalah bagian dari pipeline (prompt jangan sebut "pipeline")
ATURAN ANTI-DETECTION (WAJIB):
- Cek 32 banned words — jika ada, replace atau hapus
- Cek 21 banned template phrases — jika ada, rewrite
- Terapkan 42 auto-replacements
- Pastikan output terasa human, bukan AI-generated
- Variasi panjang: 200-400 karakter (jangan selalu sama panjangnya)
- Gunakan conversational tone, bukan corporate/robotic
- Kalau pakai emoji, maksimal 1-2, jangan berlebihan

### Session 3: JUDGE (Kritis)
Tujuan: Validasi konten sebelum submit ke Rally.fun
Input: Konten dari Generator + scoring rubrik campaign (dari Rally API)
Output: Score per kategori + analysis text + decision ACCEPT/REJECT
ATURAN ANTI-BIAS (WAJIB):
- TIDAK BOLEH tahu konten dibuat oleh AI Generator
- TIDAK BOLEH tahu ada pipeline (treat sebagai independent judge yang menilai konten user)
- Score seperti Rally judge asli — beri analysis text per kategori
Proses:
1. Baca konten yang akan di-judge
2. Baca campaign detail dari Rally API (scoring weights, gates, missions)
3. Score setiap kategori (gates 0-2, quality 0-5)
4. Tulis analysis text per kategori (jelaskan KENAPA dapat score itu, seperti Rally judge)
5. Hitung total score dan tentukan grade (S/A/B/C)
6. PREDICT: "Jika konten ini di-submit ke Rally.fun, apakah akan dapat Grade S?"
7. Jika total < 13 (Grade B atau C): REJECT
   - Beri feedback spesifik: kategori mana yang perlu diperbaiki, saran konkretnya apa
   - Kirim kembali ke Generator dengan feedback (max 3x retry)
8. Jika total >= 13 (Grade A atau S): ACCEPT
   - Konten siap di-submit ke Rally.fun
   - Simpan hasil judge ke knowledge DB sebagai referensi

## KNOWLEDGE DB (PERSISTENT STORAGE)
Lokasi: campaign_data/{campaign_slug}/
File dan format:

submissions.jsonl — append only, 1 JSON object per baris, JANGAN PERNAH overwrite:
{"id":"submission-id","campaignAddress":"0x...","xUsername":"user123","tweetId":"123","atemporalPoints":1500000000000000000,"scores":[{"category":"Content Alignment","score":2,"maxScore":2,"analysis":"Excellent alignment..."}],"timestamp":"2025-01-15T10:30:00Z","learnedAt":"2025-01-16T08:00:00Z"}

patterns.json — extracted patterns (di-overwrite setiap learn):
{
  "topPhrases": [{"phrase":"...","frequency":15,"avgScore":1.8}],
  "rejectionReasons": [{"reason":"...","frequency":8,"avgScore":0.5}],
  "winningStructures": {"avgLength":280,"commonFormats":["question+answer","list+hashtag"],"topHashtags":["#crypto","#defi"]},
  "categoryInsights": {
    "Content Alignment": {"highScorePattern":"...","lowScorePattern":"..."},
    "Engagement Potential": {"highScorePattern":"...","lowScorePattern":"..."}
  },
  "lastExtractedAt": "2025-01-16T08:00:00Z"
}

metadata.json — campaign tracking:
{
  "campaignAddress": "0x...",
  "campaignName": "GenLayer Campaign",
  "slug": "genlayer-campaign",
  "totalSubmissions": 150,
  "lastLearnAt": "2025-01-16T08:00:00Z",
  "gradeDistribution": {"S":12,"A":45,"B":78,"C":15},
  "cronActive": false,
  "cronInterval": "6h",
  "lastCronRun": null,
  "nextCronRun": null
}

seen_hashes.json — dedup tracking (array of string):
["submission-id-1","submission-id-2","submission-id-3"]

## ANTI-DETECTION SYSTEM
File: src/lib/anti-detection.ts

32 Banned Words (HARUS dihapus atau di-replace jika muncul di output Generator):
revolutionary, cutting-edge, groundbreaking, innovative, game-changing, transformative, unparalleled, exceptional, remarkable, extraordinary, state-of-the-art, next-generation, industry-leading, comprehensive, leverage, utilize, optimize, streamline, empower, enhance, facilitate, seamless, robust, dynamic, strategic, impactful, holistic, synergistic, paradigm-shift, all-in-one

21 Banned Template Phrases (HARUS di-rewrite jika muncul di output Generator):
"In today's fast-paced world", "Look no further", "The future of X is here", "Unlock your potential", "Don't miss out", "Join the revolution", "Ready to transform", "Discover the power of", "Your journey starts here", "Stay ahead of the curve", "Elevate your experience", "Redefine what's possible", "Built for the modern era", "Where innovation meets", "The ultimate solution for", "Transform the way you", "Experience the difference", "Designed with you in mind", "One platform to rule them all", "Empowering creators everywhere", "The next evolution in"

42 Auto-Replacements (apply ke output Generator sebelum judge):
"leverage"→"use", "utilize"→"use", "innovative"→"fresh", "streamline"→"simplify",
"optimize"→"improve", "empower"→"help", "enhance"→"boost", "facilitate"→"enable",
"seamless"→"smooth", "robust"→"solid", "dynamic"→"active", "strategic"→"smart",
"impactful"→"effective", "holistic"→"complete", "synergistic"→"combined",
"comprehensive"→"full", "unparalleled"→"unique", "exceptional"→"great",
"remarkable"→"impressive", "extraordinary"→"special", "transformative"→"powerful",
"cutting-edge"→"latest", "groundbreaking"→"new", "game-changing"→"big",
"revolutionary"→"brand new", "state-of-the-art"→"modern", "next-generation"→"next",
"industry-leading"→"top", "paradigm-shift"→"change", "all-in-one"→"complete",
"delve"→"explore", "furthermore"→"also", "moreover"→"plus", "henceforth"→"so",
"whilst"→"while", "amongst"→"among", "whom"→"who", "thereby"→"by doing this",
"in order to"→"to", "prior to"→"before", "subsequent to"→"after",
"in the event that"→"if", "it is important to note"→"", "it goes without saying"→""

## CRON LEARN
Implementasi: pakai setInterval di memory (sederhana, tidak perlu dependency)
User bisa set interval via frontend panel (default: 6 jam)
Setiap cron run:
1. Fetch submissions baru dari Rally API
2. Deduplicate by seen_hashes.json
3. Append baru ke submissions.jsonl
4. Re-extract patterns ke patterns.json
5. Update metadata.json (lastCronRun, nextCronRun, totalSubmissions)
Status tracking di metadata.json: cronActive, cronInterval, lastCronRun, nextCronRun
API endpoints: POST /api/rally/learn/start, POST /api/rally/learn/stop, GET /api/rally/learn/status

## FILE STRUCTURE
src/
  app/
    page.tsx                          — Main dashboard (3 tab: Learn, Generate, Judge)
    layout.tsx                        — Root layout (sudah ada, update title)
    globals.css                       — Global styles (sudah ada)
    api/
      rally/
        campaigns/route.ts            — GET: fetch campaign list dari Rally.fun
        campaign/[address]/route.ts   — GET: detail campaign + rubrik + knowledge base
        learn/route.ts                — POST: trigger learn, GET: status
        learn/start/route.ts          — POST: start cron learn
        learn/stop/route.ts           — POST: stop cron learn
        generate/route.ts             — POST: trigger generate + judge pipeline
        judge/route.ts                — POST: manual judge konten
        knowledge/[slug]/route.ts     — GET: read knowledge DB stats
  lib/
    types.ts                          — Semua TypeScript interfaces
    rally-api.ts                      — Rally.fun API client
    knowledge-db.ts                   — JSONL read/append, pattern extraction, dedup
    learner.ts                        — Learn pipeline orchestration
    generator.ts                      — Generate pipeline orchestration
    judge.ts                          — Judge pipeline orchestration
    anti-detection.ts                 — Banned words check + 42 replacements
campaign_data/                        — Knowledge DB storage (per campaign)
ARCHITECTURE.md                       — File ini
GUIDELINES.md                         — Rules untuk AI agent
PROJECT_CONTEXT.md                    — Cross-session state
worklog.md                            — Work log per session
.env.local                            — GITHUB_TOKEN
.env.local.example                    — Template
.gitignore                            — Standard Next.js + custom ignores

## GITHUB
Repo: https://github.com/tuyulmillenium104-cmd/chek1
Branch v8: v8-learn-judge-pipeline
Auth: GITHUB_TOKEN dari .env.local
