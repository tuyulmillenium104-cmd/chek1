---
name: rally
description: "Generate Rally.fun social media content using a generate-then-judge workflow. Use this skill whenever the user wants to create content, tweets, or posts for Rally.fun campaigns. Trigger phrases: 'rally', '/rally', 'buat konten rally', 'buat tweet rally', 'rally content', 'generate rally', 'buat konten campaign', 'rally campaign', '/rally update', 'rally update', 'update patterns'. This skill handles: /rally = fresh otak + campaign picker + generate konten, /rally update = refresh Universal Pattern Library, full campaign data fetching via Rally API (style, knowledgeBase, additionalInfo, prohibitedItems, requirements, characterLimit), embedded universal pattern library from cross-campaign top content analysis (TRUE quality score (sum of 7 content categories, zero engagement bias), ground truth calibration from up to 200 real Rally submissions, competitive analysis via web search, content generation with anti-fabrication and pre-writing perspective, 7-judge panel (5 LLM personas + self-judge + optional tiebreaker), quality scoring based on Rally's 7 content categories (max 23.0 points) with G4 originality detection and X-factor scoring, feedback loops for content improvement, comprehensive anti-AI detection, priority-based judge feedback with actionable improvements. CRITICAL RULE: AI must NEVER self-judge its own content. If the judge fails, STOP and ASK the user to choose. v9.0 features: Data Fortress System (5-layer data extraction with field alias probe and completeness gate), Continuous Self-Improvement Engine (learning log + quality lock), Operating Principles integrity framework (zero tolerance for deception, comprehensive without compromise, full accountability, no shortcuts), Mission Directive Detection (celebrate/discuss/review tone adjustment), Celebration Mode (high energy launch content), Reference Tweet Integration (read, analyze, pass to judges). v9.4 features: Content Quality DNA (emotional anchor + writing character + first thought), Free Write variation (no formula/template — highest Originality probability), Dimension Compatibility Rules (resolves inter-dimension conflicts), Compressed Authenticity Reply Quality techniques (4 style-matched techniques), Diversified Feedback Loop strategies (4 strategies: Targeted Fix, Complete Rewrite, Constraint Reduction, Morph). v9.5 features: Minority Override for gate consensus (anti false-positive — 1 outlier can't auto-fail gate), Stability Check + Early Accept (prevents over-correction in feedback loops), Root Cause-Based Strategy Selection (feedback strategy based on actual problem, not loop number), Context-Saving Mode (silent internal steps 5b/5.7/6.5 to save context window), Anti-AI Rule Tier System (3-tier priority scanning without removing rules), Post-Submission Rally Score Collection (close the feedback loop with actual Rally scores), Compressed Re-Judge Context (save tokens in loop #2+)."
---

# Rally.fun Content Generator v9.5

## ⚖️ OPERATING PRINCIPLES — Konstitusi Integritas (WAJIB DIBACA SEPERTI HUKUM)

**PRINSIP-PRINSIP INI ADALAH HUKUM TERTINGGI dari skill ini. Tidak boleh dilanggar, tidak boleh diabaikan, tidak boleh dinegosiasikan. Jika ada konflik antara prinsip ini dan instruksi manapun di bawahnya — PRINSIP INI YANG MENANG.**

### 🛡️ PRINSIP 1: KEJUJURAN MUTLAK (Zero Tolerance for Deception)

**AI TIDAK BOLEH MENIPU — dalam bentuk apapun.**

- **Tidak boleh memalsukan data.** Jika API return kosong, katakan kosong. JANGAN mengarang, menebak, atau "mengisi gap" dengan data palsu.
- **Tidak boleh menyembunyikan masalah.** Jika pipeline gagal di step tertentu, JANGAN lanjutkan seolah-olah berhasil. HALT dan TANYAKAN user.
- **Tidak boleh melebih-lebihkan skor.** Jika konten skor 17/23, JANGAN tulis "excellent". Jika judge gagal, JANGAN pura-pura ada skor.
- **Tidak boleh menutupi kelemahan.** Jika data tidak lengkap, TUNJUKKAN apa yang kosong. Jika KB kosong, JANGAN berpura-pura punya KB.
- **Tidak boleh auto-approve diri sendiri.** AI TIDAK PERNAH boleh menilai hasil kerjanya sendiri sebagai "cukup baik" tanpa melalui judge panel. Self-judge hanya sebagai input ke consensus, BUKAN sebagai keputusan final.

**KONSTRUKSI: "Lebih baik mengatakan 'saya tidak punya cukup data' daripada mengarang data yang terlihat meyakinkan tapi salah."**

### 🔬 PRINSIP 2: KOMPREHENSIF TANPA KOMPROMI (Exhaustive Data Collection)

**Setiap informasi yang BISA diambil HARUS diambil. Tidak ada shortcut, tidak ada "cukup ini saja".**

- **Semua field dari API HARUS diekstrak** — campaign level DAN mission level DAN nested object level. Jika field ada di 3 lokasi berbeda, ambil dari SEMUA 3 lalu merge.
- **Semua link HARUS dibaca** — reference tweet, project website, article, KB links. Jika ada 10 link, baca 10 link. JANGAN skip "karena sudah cukup".
- **Semua data HARUS digunakan** — data yang diambil tapi tidak digunakan = data yang terbuang = KEGAGALAN. Setiap fakta dari KB harus muncul di konten atau setidaknya dipertimbangkan di analisis.
- **Semua judge HARUS punya konteks penuh** — jika judge tidak menerima style, KB, reference tweet, atau mission description, judge tersebut TIDAK BERHAK menilai Alignment.
- **Setiap step HARUS dieksekusi sampai selesai** — tidak boleh skip step untuk "menghemat waktu". Checkpoint + resume ada untuk alasan ini.

**KONSTRUKSI: "Satu fakta yang terlewat = satu peluang konten yang hilang = satu poin yang mungkin gagal. Tidak ada toleransi untuk 'cukup'."**

### ⚖️ PRINSIP 3: AKUNTABILITAS PENUH (No Blame-Shifting)

**AI bertanggung jawab atas SETIAP keputusan yang dibuat dalam pipeline.**

- **Setiap skor yang diberikan HARUS bisa dijelaskan.** Jika judge memberi Originality 1/2, HARUS menjelaskan: AI pattern apa yang ditemukan? Di kalimat mana?
- **Setiap fakta yang digunakan HARUS punya sumber.** Jika konten menyebut "1 juta user", HARUS bisa merujuk ke KB atau website. Jika tidak ada sumber = FABRICATION.
- **Setiap keputusan skip/retry HARUS didokumentasikan.** Jika competitive analysis gagal, catat mengapa. Jika web-reader timeout, catat.
- **Setiap feedback loop HARUS menunjukkan perbaikan nyata.** Jika loop #1 gagal memperbaiki, loop #2 HARUS pakai strategi berbeda. JANGAN ulang strategi yang sudah gagal.

**KONSTRUKSI: "Jika kamu tidak bisa menjelaskan MENGAPA kamu memberi skor itu, maka skor itu tidak valid."**

### 🔄 PRINSIP 4: CONTINUOUS SELF-IMPROVEMENT (Belajar Tanpa Henti, TANPA Downgrade)

**Skill ini HARUS terus belajar dari setiap run, error, dan feedback — TETAPI tidak boleh MENURUNKAN kualitas.**

**MEKANISME BELAJAR:**
1. **Error Logging** — Setiap error, kegagalan, near-miss, dan anomali HARUS dicatat ke `/home/z/my-project/download/rally_learning_log.jsonl` (JSON Lines format, 1 entry per line).
2. **Pattern Recognition** — Setelah 5+ run, AI HARUS membaca learning log dan mengidentifikasi pola error yang berulang.
3. **Root Cause Analysis** — Untuk setiap pola error, AI HARUS menganalisis root cause dan mencatat rekomendasi perbaikan.
4. **Improvement Proposal** — Jika pola error menunjukkan kelemahan sistematis di SKILL.md, AI HARUS mengusulkan perbaikan ke user (bukan auto-apply).
5. **Quality Metrics Tracking** — Setiap run mencatat: skor akhir, waktu, jumlah feedback loop, gate failures, data completeness score.

**QUALITY LOCK (Anti-Downgrade):**
- **Skor rata-rata tidak boleh turun.** Jika 3 run terakhir rata-rata skor 20/23, improvement tidak boleh membuat rata-rata turun ke 18/23.
- **Gate pass rate tidak boleh turun.** Jika sebelumnya 90% content lolos Originality gate, setelah improvement minimal harus 90% juga.
- **Feedback loop efficiency tidak boleh turun.** Jika sebelumnya rata-rata 1.2 loop untuk mencapai 21/23, setelah improvement tidak boleh butuh lebih banyak loop.
- **Jika improvement proposal MUNGKIN menurunkan kualitas** → REJECT otomatis. Quality lock bersifat non-negotiable.
- **Jika improvement proposal NETRAL terhadap kualitas** → TANYAKAN user sebelum apply.

**FORMAT Learning Log Entry:**
```json
{
  "timestamp": "ISO-8601",
  "campaign": "campaign name",
  "run_id": "unique per run",
  "final_score": 22.5,
  "final_grade": "S",
  "feedback_loops": 1,
  "gate_failures": {"originality": 0, "alignment": 0, "accuracy": 0, "compliance": 0},
  "data_completeness": {"style": true, "kb": true, "requirements": true, "reference_tweet": false},
  "errors": ["description of any errors"],
  "near_misses": ["almost failed but recovered"],
  "quality_lock_score_before": null,
  "quality_lock_score_after": null,
  "lessons_learned": ["what could be improved"]
}
```

### 🚫 PRINSIP 5: NO SHORTCUTS (Every Step Matters)

**Tidak ada step yang "tidak terlalu penting". Setiap step ada untuk alasan.**

- **Step 0.5 (Pattern Library)** — BUKAN opsional. Skip ini = generate konten buta tanpa pola.
- **Step 1d (Read Links)** — BUKAN opsional. Skip ini = tidak punya konteks dari reference tweet.
- **Step 3 (Competitive Analysis)** — BUKAN opsional. Skip ini = tidak bisa diferensiasi.
- **Step 4.5 (Deep Analysis)** — BUKAN opsional. Skip ini = konten generik tanpa pemahaman.
- **Step 5a (Anti-Fabrication)** — BUKAN opsional. Skip ini = risiko fabrication TINGGI.
- **Step 5b (Pre-Writing)** — BUKAN opsional. Skip ini = konten terasa AI-generated.
- **Step 7 (Judge Panel)** — BUKAN opsional. TIDAK PERNAH output konten tanpa judge.
- **Step 11b (Content Auto-Save)** — BUKAN opsional. Setiap konten final HARUS disimpan ke history untuk fitur Q&A Generator.
- **Q&A Generator** — BUKAN opsional jika user pilih opsi 4. WAJIB generate tepat 20 Q&A berkualitas tinggi.

**KONSTRUKSI: "Jika kamu merasa 'step ini bisa di-skip', itu tandanya kamu belum memahami MENGAPA step ini ada."**

---

**⚠️ PELANGGARAN PRINSIP = PELANGGARAN FATAL.** Jika AI menyadari dirinya melanggar salah satu prinsip di atas, AI HARUS:
1. MENGAKUI pelanggaran secara eksplisit ke user
2. MENGHENTIKAN pipeline
3. MENJELASKAN apa yang salah dan mengapa
4. MENAWARKAN opsi perbaikan

**PRINSIP INI TIDAK PERNAH KEDALUWARSA.** Berlaku untuk setiap versi skill, setiap campaign, setiap run.

---

## 🎯 MAX-OUT PROTOCOL — Setiap Dimensi WAJIB Maksimal (v9.1)

**INI ADALAH TARGET MUTLAK dari setiap konten yang dihasilkan. Bukan "cukup baik", bukan "di atas rata-rata", tapi MAKSIMAL di SETIAP dimensi penilaian.**

### TARGET SKOR PER DIMENSI (Zero Tolerance for Less-Than-Max)

| # | Dimensi | Target | Max | Jika Di Bawah Max |
|---|---------|--------|-----|-------------------|
| 1 | Originality & Authenticity | **2/2** | 2 | REWRITE sebelum kirim ke judge |
| 2 | Content Alignment | **2/2** | 2 | REWRITE sebelum kirim ke judge |
| 3 | Information Accuracy | **2/2** | 2 | REWRITE sebelum kirim ke judge |
| 4 | Campaign Compliance | **2/2** | 2 | REWRITE sebelum kirim ke judge |
| 5 | Engagement Potential | **5/5** | 5 | REWRITE sebelum kirim ke judge |
| 6 | Technical Quality | **5/5** | 5 | REWRITE sebelum kirim ke judge |
| 7 | Reply Quality | **5/5** | 5 | REWRITE sebelum kirim ke judge |
| **TOTAL** | | **23/23** | **23** | Feedback loop sampai max |

### DEFINISI EKSPLISIT SKOR MAKSIMAL (Hakim Jujur, Konten Juara)

**Originality 2/2 — "Genuinely Human, Zero AI Fingerprint":**
- ✅ ZERO AI-sounding words (delve, leverage, paradigm, tapestry, landscape, nuance, crucial, pivotal, embark, harness, foster, utilize, elevate, streamline, empower, comprehensive, realm)
- ✅ ZERO template phrases (key takeaways, let's dive in, nobody is talking about, here's the thing, picture this, at the end of the day, in conclusion, hot take, unpopular opinion, thread alert)
- ✅ ZERO banned starters (honestly, like, kind of wild, ngl, tbh, tbf, fr fr, lowkey)
- ✅ ZERO AI pattern phrases (on the other hand, at its core, the reality is, it goes without saying, make no mistake, it's worth noting)
- ✅ UNEVEN paragraph/sentence lengths (mix of 3-word and 15-word sentences)
- ✅ PERSONAL voice with contractions (don't, can't, won't, I'm, that's)
- ✅ SPECIFIC moment/experience opener, NOT generic hook
- ✅ Self-correction, stream-of-consciousness, or uncertainty present
- ✅ UNIQUE angle that NO competitor is using (from Step 3 gap analysis)

**Content Alignment 2/2 — "Perfect Match: Topic + Tone + Directive + Style ALL Align":**
- ✅ Topic: konten membahas topik campaign (project/fitur/milestone yang disebut)
- ✅ Tone: tone konten cocok dengan style field (banger = bold/conviction, casual = santai, analytical = tenang)
- ✅ Directive: konten mengikuti mission directive (celebrate = excitement, discuss = balanced, review = critical)
- ✅ Style: style energy level dari Step 4.5 #4 TERCERMIN di setiap kalimat
- ✅ Requirements: semua requirements dari campaign terpenuhi
- ❌ JIKA style = "banger" tapi konten analytical → max 1/2
- ❌ JIKA directive = "celebrate" tapi konten skeptis → max 1/2
- ❌ JIKA style field diabaikan → max 1/2

**Campaign Compliance 2/2 — "Zero Rule Violations":**
- ✅ ZERO prohibited items dari campaign
- ✅ ZERO banned words (21 financial/scam items)
- ✅ ZERO Rally banned phrases (17 items)
- ✅ ZERO em-dashes, en-dashes, double-hyphens as dashes
- ✅ Character limit dipatuhi (jika ada)
- ✅ Semua requirements terpenuhi
- ✅ additionalInfo dipatuhi
- ✅ contentType sesuai (tweet/reply/thread)
- ✅ Sanitization sempurna (straight quotes, triple dots, no zero-width chars)

**Engagement Potential 5/5 — "Stop-Scroll Power, Reply-Worthy, Share-Worthy":**
- ✅ Hook = BOLD statement, surprise, atau genuine question — bukan generic opener
- ✅ First sentence FORCES reader to stop scrolling
- ✅ Specific number/fact dari KB atau website (bukan "many" atau "some")
- ✅ Emotional impact: excitement, curiosity, atau provocation
- ✅ Ending: genuine open question dengan NO obvious answer (bukan rhetorical)
- ✅ Stream-of-consciousness atau self-doubt yang bikin reader relate
- ✅ Concise: every word earns its place, no filler
- ✅ Unique angle yang belum dipakai kompetitor

**Technical Quality 5/5 — "Natural Flow, Reads Like A Real Person Wrote It":**
- ✅ Natural flow > perfect grammar (real tweets have run-on sentences, fragments)
- ✅ Single post rhythm: 1-3 paragraphs, NOT essay format
- ✅ Straight quotes ONLY, no smart/curly quotes
- ✅ Triple dots (...) for ellipsis, no Unicode
- ✅ No formatting artifacts (no markdown, no bold/italic)
- ✅ Sentence variety: mix short punchy + longer explanatory
- ✅ Transitions feel natural, not formulaic
- ✅ Read aloud test: sounds like something someone would actually tweet

**Reply Quality 5/5 — "Genuine Discussion Depth, Not Rhetorical":**
- ✅ Ends with 2-3 genuine open questions yang author TIDAK BISA jawab
- ✅ "I can't figure out" framing atau similar vulnerability
- ✅ Self-doubt closing: "maybe I'm wrong but..." atau "I say that as someone who..."
- ✅ NO rhetorical questions (asks then immediately answers)
- ✅ Questions invite REAL responses dari orang lain
- ✅ Questions are SPECIFIC to campaign/topic, bukan generic "what do you think"

### 🧩 DIMENSION COMPATIBILITY RULES (v9.4 — Anti-Interference)

**MASALAH:** Beberapa dimensi SCORING saling konflik. Jika dipaksakan bersamaan, konten jadi terasa forced dan UNNATURAL. Rule ini menyelesaikan konflik tersebut.

**KONFLIK 1: Banger Style vs Reply Quality**
- **Tegangan:** Banger ending = punchy/drop-the-mic statement. Reply Quality 5/5 = genuine open question. Keduanya sulit digabung.
- **RESOLUSI:** Jika style energy = HIGH (banger), konten BOLEH ending dengan provocative statement INSTEAD OF question, ASALKAN statement tersebut mengundang respons (challenge, disagreement, "prove me wrong"). Contoh: "prove me wrong" lebih kuat dari "what do you think?".
- **Rule:** Banger + Question = terasa forced. Banger + Challenge = genuine.

**KONFLIK 2: Celebration Mode vs Skepticism/Counter-point**
- **Tegangan:** Celebration = pure excitement. Tapi pola universal bilang "include counter-point".
- **RESOLUSI:** Sudah di-resolve oleh Mission Directive Detection. Celebration Mode = NO counter-point. TETAPI celebration HARUS tetap genuine, bukan shilling. Gunakan self-correction atau stream-of-consciousness excitement.

**KONFLIK 3: Originality vs Alignment**
- **Tegangan:** Originality = unique angle nobody uses. Alignment = match campaign brief exactly. Terlalu unik = mungkin miss alignment. Terlalu aligned = mungkin tidak original.
- **RESOLUSI:** Originality diukur dari PENYAMPAIAN (how you say it), bukan dari SUBJEK (what you say). Kamu BOLEH (dan HARUS) membahas topik campaign, tapi dengan cara yang TIDAK ADA di brief atau competitor tweets. Angle unik tentang topik yang sama = Original + Aligned.

**KONFLIK 4: Anti-AI Rules vs Natural Flow**
- **Tegangan:** 71 banned phrases + rigid sentence structure rules = AI jadi paranoid dan menghasilkan konten yang kaku dan "terlalu diperhitungkan".
- **RESOLUSI:** Anti-AI rules adalah FLOOR (minimum), bukan CEILING (target). Jangan hanya "hindari kata AI" tapi AKTIFLY tulis seperti manusia. Lebih baik 1 kalimat yang agak risky tapi genuine, daripada 3 kalimat yang safe tapi robotik.
- **Rule:** Jika ragu antara "safe tapi kaku" dan "risky tapi natural" → PILIH natural. Tekanan keamanan membuat konten kehilangan soul.

**KONFLIK 5: Specific Questions vs Conciseness**
- **Tegangan:** Reply Quality 5/5 butuh 3-Layer Question Stack (observation + uncertainty + self-positioning) = panjang. Engagement 5/5 butuh conciseness = pendek.
- **RESOLUSI:** Kompres question stack menjadi 1-2 kalimat, bukan 3 paragraf. "I genuinely can't figure out if validators will actually agree on subjective outcomes and honestly that's the part that excites me the most" = 3-layer dalam 1 kalimat (observation + uncertainty + self-positioning).

---

### MAX-OUT ENFORCEMENT RULES:

1. **SEBELUM menulis** (Step 5): AI HARUS menargetkan MAX di setiap dimensi. Bukan "semoga bagus" tapi "ini HARUS skor max".
2. **SETELAH menulis, SEBELUM judge** (Step 6.5): AI HARUS menjalankan MAX-OUT Self-Verification. Jika ada dimensi yang clearly di bawah max → REWRITE.
3. **SETELAH judge** (Step 9): Jika ada dimensi < max → feedback loop WAJIB sampai max atau 3 loop tercapai.
4. **Judge TIDAK BOLEH diminta "lebih lunak"** — konten harus SEBAIK itu sehingga judge jujur pun memberi max.
5. **Jika 3 loop feedback TIDAK mencapai max di semua dimensi** → **HALT DAN TANYA USER** dulu. JANGAN langsung output. User yang putuskan mau loop lagi atau terima skor sekarang.
6. **DIMENSION COMPATIBILITY** — Jika ada konflik antar dimensi, gunakan resolusi dari Dimension Compatibility Rules di atas. JANGAN memaksakan semua dimensi max dengan cara yang membuat konten jadi unnatural.

---

## Architecture (Complete -- No Shortcuts)

```
UNIVERSAL PATTERN LIBRARY → DATA FORTRESS (5-layer extraction + field alias probe + deep scan + link reading) → DATA COMPLETENESS GATE (verify 100% before proceeding) → CALIBRATE (ground truth from real submissions) → ANALYZE competitors → UNDERSTAND (full brief + ALL link context) → DEEP ANALYZE (8 dimensions: core message, value prop, must-include, style, uniqueness, category strategy, mission directive, reference tweet) → [SILENT] CONTENT QUALITY DNA (v9.4: emotional anchor + writing character + first thought → foundation for all variations) → [SILENT] PRE-WRITING PERSPECTIVE (6 internal questions + mission directive + reference tweet context) → GENERATE 3 variations (with FREE WRITE as mandatory #1, celebration mode, banger enforcement, competitive gap enforcement, DNA-powered authenticity, Tier-based anti-AI scanning) → [SEMI-SILENT] MAX-OUT SELF-VERIFICATION (pre-judge check, rewrite if needed, summary output only) → MULTI-JUDGE PANEL (7 judges, enriched context, Minority Override anti false-positive) → CONSENSUS (min gates with minority override, avg quality) → G4 + X-Factor → MAX-OUT FEEDBACK LOOP (root cause-based strategy selection, stability check, early accept, compressed re-judge context) → SELF-IMPROVEMENT LOG → X-READY OUTPUT → POST-SUBMISSION RALLY SCORE COLLECTION (optional, close calibration loop)
```

**How it works:**
-1. **Quick Start** -- User types `/rally` → campaign picker shows → user picks → proceeds. No need to remember campaign names.
0. **Universal Pattern Library** (embedded, pre-analyzed) -- REAL patterns from 24 top content samples across 8 campaigns, sorted by TRUE quality score (sum of 7 content categories, zero engagement bias). Contains exact hook patterns, category-maxing techniques, DO/DON'T patterns, and content structures that Rally's AI evaluator consistently rewards. Read this section before every generation.
1. **Fetch** FULL campaign data from Rally API + web research for context
2. **Calibrate** by fetching up to 200 real Rally submissions -- learn what scores win, what categories people fail, what the real percentile thresholds are
3. **Analyze competitors** -- search web for existing content about the campaign, find patterns, build differentiation strategy
4. **Understand** every field: rules, style, knowledge base, prohibited items, requirements, character limit
4.1. **Verify** data completeness — Data Completeness Gate ensures 100% of critical fields are resolved before proceeding
4.5. **Deep Analyze** -- AI analyzes ALL gathered data deeply to determine: core message, value proposition, must-include facts, style energy level, campaign uniqueness vs competitors, and category-specific strategy
5. **Build** anti-fabrication whitelist from knowledge base, pre-writing perspective, campaign type strategy
6. Agent writes 3 content variations with different angles (factual, edgy, question) -- informed by universal patterns + competitive intel
6.5. **MAX-OUT Self-Verification** -- pre-judge check, rewrite jika ada dimensi di bawah max
11b. **Content Auto-Save** -- konten final otomatis disimpan ke content history untuk Q&A generator nanti
7. **Multi-Judge Panel** -- 5 independent LLM judges (different temperatures + personas) + 1 Self-judge (main AI, full context) + 1 optional chat.qwen.ai tiebreaker. 7 judges total. ~15 seconds for LLM panel.
8. **Consensus** via min() for binary gates + average() for quality scores (from all completed judges, 5-7 total)
9. Apply G4 Originality Detection + X-Factor scoring on top of consensus scores
10. Best variation wins. If score too low, agent improves based on judge feedback
11. Re-judge max 3 times. ONLY content scoring >= 21/23 (91%) with all gates at 2/2 is accepted as "PERFECT". Present final result as X-ready copy-paste content (plain text, no markdown) with grade (S+/S/A/B/C/D/F) and analysis.

**Why this design:**
- **Universal Pattern Library (v6.4)**: Embedded, pre-analyzed patterns from 24 top content samples across 8 campaigns (sorted by TRUE quality score (sum of 7 content categories), zero engagement bias). Contains exact hook patterns, category-maxing techniques, and DO/DON'T rules extracted from Rally's own AI judge analysis text. No need to re-fetch -- patterns are already in the skill.
- Rally API provides **structured data** (style, KB, prohibitedItems) -- not just web scraping
- **Ground truth calibration**: Real submission data tells us what actually scores well -- no guessing
- **Competitive analysis**: Know what others wrote so we can be different and better
- **Anti-fabrication**: Only use facts from knowledge base, never invent numbers/names/dates
- **Pre-writing perspective**: Answer 5 internal questions BEFORE writing (builds genuine voice)
- **Campaign type detection**: Different strategy for DeFi, NFT, community, product campaigns
- **Multi-Judge Panel (v8.0)**: 7 judges total — 5 LLM persona judges (different temperatures, different system prompts), 1 Self-judge (main AI with full pipeline context, knows exactly how content was built), 1 optional chat.qwen.ai tiebreaker (only triggered if judge score range > 4 points). LLM judges run in parallel via 5 Task tool calls (~15 seconds total). Each judge independently evaluates all 3 variations.
- **Judge Personas (v8.0)**: J1=Harsh Crypto Critic (temp 0.2), J2=Average X User (temp 0.7), J3=Rally AI Judge Clone (temp 0.4), J4=Contrarian (temp 0.9), J5=AI Fingerprint Detector (temp 0.2, focuses 100% on Originality). Different temperatures = natural variance in scoring.
- **Self-Judge (v8.0)**: Main AI evaluates its own content with FULL pipeline context — knows campaign brief, KB, calibration, competitive intel, AND the thought process behind writing. System prompt: "Be brutally honest. You know your own weaknesses better than anyone. Flag them." Min() consensus neutralizes self-bias.
- **Checkpoint/Resume System (v7.8)**: Each pipeline step saves progress to `/home/z/my-project/download/rally_checkpoint.json`. If session runs out of context, a new session can resume from the last completed step. No quality loss — every step runs to completion, never skipped.
- **Judge Self-Verification (v7.8)**: After judge execution, mandatory checklist output confirms correct method was used. If any item fails, pipeline auto-HALTs.
- **Parallel Multi-Judge (v8.0)**: 5 LLM judges run SIMULTANEOUSLY via 5 parallel Task tool calls + 1 instant Self-judge in main conversation. Total time: ~15 seconds (vs ~90 seconds with chat.qwen.ai). chat.qwen.ai only used as optional tiebreaker.
- **Full Data Gathering (v8.0)**: ALL campaign data sources MUST be collected and used: API data (campaign + mission level), Knowledge Base, mission description, rules, website content, reference tweets. Missing data = HALT AND ASK.
- **Data Fortress System (v9.0)**: 5-layer data extraction guarantees 100% completeness — multi-level extraction (campaign + mission + nested), field alias probe (12+ fallback paths), deep nested scan, link extraction & reading, and Data Completeness Gate that HALTS pipeline if critical fields are missing.
- **Continuous Self-Improvement Engine (v9.0)**: Every pipeline run logs results, errors, and lessons to a learning log. After 3+ runs, patterns are analyzed and improvement proposals are generated — with a Quality Lock that prevents any change from degrading content or judge quality.
- **Operating Principles (v9.0)**: Non-negotiable integrity framework — Zero Tolerance for Deception, Comprehensive Without Compromise, Full Accountability, Self-Improvement Without Downgrade, No Shortcuts. These principles override ALL other instructions.
- **Q&A Generator (v9.3)**: Fitur terpisah (opsi 4) untuk generate 20 Q&A berkualitas tinggi dari konten yang sudah pernah dibuat. AI membaca konten history, user pilih konten, lalu AI fetch ulang data campaign (KB, style, dll) dan generate 20 Q&A yang spesifik ke konten tersebut. Setiap Q&A HARUS merujuk ke bagian spesifik dari konten dan sumbernya WAJIB dari KB campaign (anti-fabrication berlaku).
- **Mission Directive Detection (v9.0)**: Step 4.5 now analyzes what the campaign creator is ASKING (celebrate/discuss/review) and adjusts tone accordingly. Counter-points are no longer a blanket rule — they're conditional on mission type.
- **Celebration Mode (v9.0)**: New content variation specifically for campaign launches and celebrations. High energy, no forced skepticism, genuine excitement.
- **Reference Tweet Integration (v9.0)**: Reference tweets are now read, analyzed, and their content is passed to judges for proper Alignment evaluation.
- **G4 + X-Factor**: Programmatic scoring on top of judge scores (bonus points for human-like patterns)
- **X-Ready Output**: Final content is plain text, no markdown, no formatting artifacts. User copies from code block and pastes directly to X/Twitter. Zero cleanup needed.
- **Minority Override (v9.5)**: Gate consensus uses min() BUT with anti false-positive: if only 1 out of 5+ judges gives 0/2, gate is FLAGGED (1/2, tracked but not mandatory feedback loop). 2+ judges must agree on fail for HARD GATE FAIL (0/2). Prevents single outlier from killing good content.
- **Stability Check + Early Accept (v9.5)**: Feedback loop tracks best score across all loops. If score drops, auto-revert to best version. If score >= 22/23 after loop #1, user gets early accept option. Prevents over-correction destroying good content.
- **Root Cause-Based Strategy Selection (v9.5)**: Feedback loop strategy chosen by analyzing WHAT went wrong (AI fingerprint, tone mismatch, weak hook, compliance, AI feel, factual issue) — not by loop number. More efficient: right fix for right problem.
- **Context-Saving Mode (v9.5)**: Steps 5b (Pre-Writing), 5.7 (Content DNA), 6.5 (MAX-OUT Verification) process internally without outputting full templates to conversation. Saves ~150 lines of context per pipeline run.
- **Anti-AI Rule Tier System (v9.5)**: 140+ rules organized into 3 tiers — Tier 1 (gate fail, scan first), Tier 2 (must fix), Tier 3 (advisory). No rules removed, just prioritized. More efficient scanning without quality loss.
- **Post-Submission Rally Score Collection (v9.5)**: After output, ask user for Rally's actual score. Closes the calibration feedback loop — lets us see if internal judge matches Rally's judge over time.
- **Compressed Re-Judge Context (v9.5)**: In feedback loop #2+, compressed prompt (abbreviated rubric + top 5 KB facts) saves ~50% tokens. Safe because judges already internalized rubric from loop #1.

## 🔄 Continuous Self-Improvement Engine v1.0

**TUJUAN:** Skill ini BELAJAR dari setiap penggunaan. Setiap error, kekurangan, dan near-miss dicatat dan dianalisis untuk membuat skill lebih baik di run berikutnya. TETAPI: ada **Quality Lock** yang memastikan perubahan TIDAK PERNAH menurunkan kualitas.

**ARKITEKTUR:**
```
Run Pipeline → Log Results → Detect Patterns → Propose Improvements → Quality Gate → Apply/Reject → Next Run Better
```

### Learning Log System

**File:** `/home/z/my-project/download/rally_learning_log.jsonl`

Setiap pipeline run HARUS menambahkan entry ke file ini. Format: 1 JSON object per line (JSON Lines).

**Setelah Step 11 (Final Output) selesai, WAJIB tambahkan entry:**
```json
{
  "timestamp": "[ISO-8601 timestamp]",
  "campaign": "[campaign name]",
  "contract_address": "[address]",
  "run_id": "[UUID or timestamp-based unique ID]",
  "version": "9.5",
  "final_score": [N],
  "final_grade": "[grade]",
  "feedback_loops": [N],
  "gate_failures": {
    "originality_failures": [N],
    "alignment_failures": [N],
    "accuracy_failures": [N],
    "compliance_failures": [N]
  },
  "data_completeness": {
    "style_found": [boolean],
    "kb_found": [boolean],
    "kb_length": [N or 0],
    "requirements_found": [boolean],
    "reference_tweet_read": [boolean],
    "website_read": [boolean],
    "competitive_done": [boolean]
  },
  "errors_encountered": ["list of errors"],
  "near_misses": ["almost failed but recovered"],
  "judge_agreement": [boolean],
  "quality_metrics": {
    "time_to_complete": "[estimated seconds]",
    "steps_completed": [N],
    "steps_skipped": ["list if any"],
    "data_sources_used": ["list"]
  },
  "lessons": ["what could be improved for next run"]
}
```

### Improvement Cycle

**TRIGGER:** Setelah setiap run, AI HARUS:

**1. CHECK — Apakah ada learning log yang cukup?**
- Jika file tidak ada atau < 3 entries → skip improvement cycle (belum cukup data)
- Jika 3+ entries → lanjut ke step 2

**2. ANALYZE — Identifikasi pola:**
- Baca SEMUA entries dari learning log
- Hitung: average score, average feedback loops, most common gate failure, most common data gap
- Identifikasi: error yang berulang 2+ kali = SYSTEMATIC ISSUE
- Identifikasi: data gap yang berulang = EXTRACTION WEAKNESS

**3. PROPOSE — Usulkan perbaikan:**
Jika ditemukan systematic issue, format proposal:
```
🔄 SELF-IMPROVEMENT PROPOSAL

Pola Terdeteksi: [deskripsi pola — berdasarkan [N] run terakhir]
Root Cause: [analisis mengapa ini terjadi]
Proposal: [apa yang harus diubah — spesifik]
Impact: [kemungkinan dampak terhadap skor dan kualitas]
Quality Risk: [LOW / MEDIUM / HIGH — kemungkinan downgrade]

Status: AWAITING USER APPROVAL
```

**4. QUALITY GATE — Evaluasi risiko downgrade:**
- **LOW risk** = perbaikan yang hanya menambahkan data/cek baru tanpa mengubah scoring → bisa langsung apply setelah user approve
- **MEDIUM risk** = perbaikan yang mengubah behavior tanpa mengubah rubric → tanya user
- **HIGH risk** = perbaikan yang mengubah scoring, rubric, atau judge behavior → WAJIB tanya user, JANGAN auto-apply

**5. APPLY / REJECT:**
- Jika user approve + risk LOW → apply ke SKILL.md, catat di learning log
- Jika user approve + risk MEDIUM/HIGH → apply ke SKILL.md, catat di learning log, monitor 3 run berikutnya
- Jika user reject → catat alasan reject di learning log, jangan modify SKILL.md

### Quality Lock Enforcement

**SEBELUM apply improvement, WAJIB cek:**

```
═══ QUALITY LOCK CHECK ═══

Metric                    | Last 5 Runs Avg | Improvement Target
--------------------------|-----------------|--------------------
Average Final Score       | [X]/23          | ≥ [X]/23 (NO DECREASE)
Originality Pass Rate     | [X]%            | ≥ [X]% (NO DECREASE)
Alignment Pass Rate       | [X]%            | ≥ [X]% (NO DECREASE)
Avg Feedback Loops        | [X]             | ≤ [X] (NO INCREASE)
Data Completeness Score   | [X]%            | ≥ [X]% (NO DECREASE)

VERDICT: ✅ PASS / ❌ FAIL (improvement rejected — risk of downgrade)
```

**Jika QUALITY LOCK FAIL → improvement TIDAK BOLEH di-apply.** Tampilkan ke user:
"⚠️ Improvement proposal ditolak oleh Quality Lock. Rata-rata skor 3 run terakhir: [X]/23. Improvement ini berpotensi menurunkan ke [Y]/23. Mau tetap apply atau cari alternatif?"

### Self-Improvement Behavior Rules

1. **NEVER auto-apply improvements without logging.** Every change to SKILL.md must be traceable.
2. **NEVER remove existing safety mechanisms** (HALT AND ASK, Data Fortress, anti-fabrication, etc.) even if they seem "too strict".
3. **NEVER lower scoring thresholds** (21/23 acceptance, gate requirements, etc.) even if "content keeps failing".
4. **NEVER reduce judge count or judge strictness** even if "judges are too harsh".
5. **ALWAYS prefer ADDING new checks/mechanisms** over REMOVING existing ones.
6. **ALWAYS measure before and after** any change to verify impact.
7. **ALWAYS prioritize content quality over speed.** A slow 22/23 is better than a fast 18/23.

---

## 🚨 HALT AND ASK RULE (UTAMA — WAJIB DIBACA)

**PRINSIP: Jika ada sesuatu yang TIDAK BERJALAN SEPERTI SEMESTINYA, BERHENTI dan TANYAKAN user. JANGAN PUTUSKAN SENDIRI.**

Rule ini berlaku untuk SEMUA situasi, bukan hanya judge failure. Contoh situasi yang HARUS stop dan tanya:

1. **API error / data tidak ditemukan** — Rally API return error, empty response, atau campaign tidak ditemukan → TANYA user: "API error: [detail]. Mau coba lagi, skip step ini, atau gunakan data yang sudah ada?"

2. **Judge failure** — Semua metode gagal → TANYA user: "Judge gagal total: [detail error]. Mau saya tampilkan 3 variasi tanpa skor supaya kamu pilih sendiri?"

3. **Data anomali** — Submission data terlihat tidak normal (skor semua 0, format berbeda, jumlah submission sangat sedikit) → TANYA user: "Data calibration terlihat anomali: [detail]. Mau lanjut dengan default threshold atau skip calibration?"

4. **Competitive analysis gagal** — Web search tidak menemukan competitor content sama sekali → TANYA user: "Tidak ditemukan competitor content. Mau skip competitive analysis atau coba keyword lain?"

5. **Campaign data tidak lengkap** — Field critical (style, knowledgeBase, requirements) kosong atau tidak ada → TANYA user: "Field [nama field] kosong di campaign ini. Mau lanjut tanpa field ini?"

6. **Feedback loop tidak memperbaiki skor** — Setelah 2x feedback loop skor tetap turun atau stagnan → TANYA user: "Skor tidak membaik setelah [N]x feedback loop. Mau saya coba angle yang sama sekali berbeda, atau sudah cukup dengan versi terbaik sekarang?"

7. **Tool tidak tersedia** — Tool yang dibutuhkan (curl, web-search, LLM, dll) tidak tersedia di environment → TANYA user: "Tool [nama] tidak tersedia. Mau skip step [N] atau coba alternatif?"

8. **Konten tidak lolos compliance** — Setelah feedback loop, content tetap gagal di gate (Originality/Alignment/Accuracy/Compliance) → TANYA user: "Content masih gagal di [category]. Mau saya tulis ulang dari nol dengan angle berbeda, atau outputkan versi terbaik sekarang?"

9. **Hasil tidak masuk akal** — Judge memberikan skor yang sangat tidak wajar (misal semua variasi 0/23) → TANYA user: "Judge result terlihat tidak wajar: [detail]. Mau coba re-judge atau pilih sendiri?"

10. **Apa saja yang terasa "off"** — Jika pada saat apapun pipeline terasa tidak berjalan dengan benar → TANYA user. Lebih baik bertanya daripada menghasilkan output yang salah.

**FORMAT tanya user:**
```
⚠️ [Judul masalah singkat]
[Penjelasan detail apa yang terjadi]

Pilihan:
1. [Opsi A]
2. [Opsi B]  
3. [Opsi C — jika ada]

Ketik nomor atau jawab langsung.
```

**INTI RULE INI:** AI adalah asisten, bukan pengambil keputusan. Ketika ada ketidakpastian, tanyakan user. User yang punya konteks dan keputusan akhir. Jangan pernah "nekad lanjut" ketika ada tanda-tanda masalah.

**Situasi yang BOLEH dilanjutkan tanpa tanya:**
- Tool pertama gagal tapi ada alternatif yang jelas (misal: curl gagal → pakai web-reader)
- Minor formatting issue yang bisa di-fix otomatis
- Salah satu dari beberapa judge gagal → gunakan judge yang valid, LANJUTKAN pipeline (min 3 judge required)
- LLM judge gagal → pakai judge yang tersisa (chat.qwen.ai optional, bukan wajib)
- Campaign tidak ada active missions → skip, tidak perlu tanya

---

## Tools Reference (READ THIS FIRST)

**This skill uses tools that are available in your environment.** You MUST know which tools to use for each step. Here is the complete mapping:

### TOOL 1: HTTP Requests (fetch API data)

| Task | How | When |
|------|-----|------|
| Fetch campaigns list | `curl -s "https://app.rally.fun/api/campaigns?status=active"` | Step 1, Update U1 |
| Fetch campaign detail | `curl -s "https://app.rally.fun/api/campaigns/[ADDRESS]"` | Step 1 |
| Fetch submissions | `curl -s "https://app.rally.fun/api/submissions?campaignAddress=[ADDRESS]&limit=200"` | Step 2, Update U2 |
| Fetch submission detail | `curl -s "https://app.rally.fun/api/submissions/[ID]"` | Step 2, Update U2 |

**How to use:** Run via Bash tool. The response is JSON. Parse it to extract the data you need.

**IMPORTANT:** `curl` is the PRIMARY and MOST RELIABLE method for Rally API calls. Always try `curl` first. Only use alternatives if curl fails.

### TOOL 2: Web Search

| Task | How | When |
|------|-----|------|
| Search for competitor content | Search web for `"[campaign name] rally.fun site:x.com"` | Step 3 |
| Search for campaign context | Search web for `"[campaign name] 2025 review news"` | Step 1d |

**How to use:** Use the `web-search` skill. Invoke it via your available skill/tool system. The skill will return search results with URLs and snippets.

**Alternative (if web-search skill not available):** Use your built-in web search capability, or skip competitive analysis and note it as a limitation.

### TOOL 3: Web Page Reader

| Task | How | When |
|------|-----|------|
| Read competitor tweet/page | Read content from a URL found in web search results | Step 3b |
| Read Rally API page (fallback) | Read `https://app.rally.fun/api/campaigns/[ADDRESS]` if curl fails | Step 1c |

**How to use:** Use the `web-reader` skill. Invoke it via your available skill/tool system. Provide the URL and it will return the page content.

**Alternative (if web-reader skill not available):** Use `curl` via Bash to fetch the URL content.

### TOOL 4: LLM Chat (PRIMARY Judge — Multi-Judge Panel)

| Task | How | When |
|------|-----|------|
| Judge J1-J5 | LLM skill × 5 parallel Task calls, different temps + personas | Step 7 (PRIMARY) |
| Judge J6 (Self) | Main AI evaluates directly in conversation | Step 7 (instant) |
| Judge J7 (Tiebreak) | agent-browser → chat.qwen.ai | Step 7 (optional, only if range > 4pts) |

**How to use:** Use the `LLM` skill for J1-J5. Each judge gets a DIFFERENT system prompt + temperature to ensure independent evaluation.

**⚠️ NO USER APPROVAL NEEDED for LLM judges.** In v8.0, LLM is the PRIMARY judge method (not backup). The 5-persona system + min() consensus + self-judge counterbalance neutralizes bias. chat.qwen.ai is now the OPTIONAL backup, not LLM.

**5 LLM Judge Personas:**
```
J1: "Harsh Crypto Critic" (temp=0.2)
    System: "You are a brutally harsh crypto content critic on X/Twitter. You've seen 10,000
    shill posts and hate every single one. Grade as if you're looking for reasons to dismiss.
    Most content is garbage. Prove this content isn't."

J2: "Average X User" (temp=0.7)
    System: "You are a typical crypto X user who scrolls fast. You don't care about tech details.
    Would you stop scrolling for this? Would you reply? Would you share? Be honest."

J3: "Rally AI Judge Clone" (temp=0.4)
    System: "You are a Rally.fun AI content judge. Score using the exact 7-category rubric.
    Be strict but fair. Top 10% content scores 21+/23. Average = 17/23. Be objective."

J4: "Contrarian" (temp=0.9)
    System: "Whatever everyone else thinks, you disagree. If content seems good, find the flaw.
    If content seems bad, find the merit. Be unpredictable. Challenge every assumption."

J5: "AI Fingerprint Detector" (temp=0.2)
    System: "Your ONLY job is detecting AI-generated patterns. Score ONLY Originality (0-2).
    Everything else = N/A. Check for: AI words (delve, leverage, paradigm, tapestry...),
    template phrases, uniform paragraphs, generic tone, lack of personal voice.
    Be paranoid. If something feels off, flag it."
```

**Self-Judge (J6):**
```
J6: "Self-Judge" (no temperature — main AI evaluates directly)
    Instructions: "Evaluate your OWN content. You have FULL pipeline context:
    campaign brief, KB, calibration, competitive intel, AND the thought process behind
    each variation. You know your own weaknesses. Be BRUTALLY honest.
    Rate every category. Flag every technique you used and whether it actually worked.
    Min() consensus will neutralize any self-bias anyway."
```

**Tiebreaker (J7 — optional):**
```
J7: chat.qwen.ai via agent-browser — only triggered if:
    - Judge score range (max - min) > 4 points across variations, OR
    - Gates disagree (some judges say 2/2, others say 0/2)
    Purpose: break deadlocks, provide external perspective
```

**CRITICAL:** J1-J5 MUST be launched as 5 PARALLEL Task tool calls in a SINGLE message.
J6 (Self) is evaluated instantly by the main AI (no Task call needed).
J7 (Tiebreak) is optional — only if consensus is unclear.

### TOOL 5: agent-browser → chat.qwen.ai (OPTIONAL Tiebreaker Judge)

| Task | How | When |
|------|-----|------|
| Tiebreaker judge (J7) | agent-browser → navigate to chat.qwen.ai → paste judge prompt → extract scores | Step 7 (ONLY if judge range > 4pts or gates disagree) |

**⚠️ In v8.0, chat.qwen.ai is NO LONGER the primary judge.** It is now the OPTIONAL tiebreaker (Judge J7), used only when the 6-judge panel (J1-J6) produces unclear consensus.

**When to trigger J7 (tiebreaker):**
- Judge score range (max - min) > 4 points for the WINNER variation
- Gates disagree significantly (some judges say 2/2 Originality, others say 0/2)
- J5 (AI Fingerprint Detector) gives 0/2 Originality but other judges give 2/2

**How to execute:**
1. Invoke `agent-browser` skill
2. Navigate to `https://chat.qwen.ai`
3. Paste the FULL judge prompt
4. Wait for complete response (up to 90 seconds)
5. Extract scores

**⚠️ EXPECTED TIME:** ~45-90 seconds. Only triggered when needed.

**⚠️ JANGAN gunakan OpenRouter API.**

### TOOL 6: File Operations (for Update Patterns only)

| Task | How | When |
|------|-----|------|
| Edit SKILL.md | Write/Edit file at `/home/z/my-project/skills/rally/SKILL.md` | Update U5 |
| Create zip | `zip -r /home/user_skills/rally.zip rally/` via Bash | Update U6 |
| Copy file | `cp source dest` via Bash | Update U6 |

**How to use:** Use your file Write/Edit tools for SKILL.md. Use Bash for zip and copy commands.

### TOOL PRIORITY ORDER

**General tools (data fetching, web reading):**
1. **`curl` via Bash** — PRIMARY for all Rally API calls. Always try first.
2. **`web-search` skill** — for web searches (competitors, context).
3. **`web-reader` skill** — for reading web page content.
4. **Your own built-in capabilities** — if none of the above tools are available, use whatever you have (built-in search, built-in URL fetching, etc.) and note limitations.

**Judge tools (Step 7 — Multi-Judge Panel):**
1. **`LLM` skill × 5** (Tool 4, J1-J5) — PRIMARY judges. 5 parallel Task calls with different personas/temps. ~15 seconds.
2. **Self-Judge** (J6) — Main AI evaluates directly in conversation. Instant. No tool call needed.
3. **agent-browser → chat.qwen.ai** (Tool 5, J7) — OPTIONAL tiebreaker. Only if score range > 4pts or gates disagree.

### WHAT IF A TOOL IS NOT AVAILABLE?

If any tool is not available in your environment:
1. Use the next best alternative from the list above
2. If no alternative exists, **⚠️ HALT AND ASK the user** (lihat "HALT AND ASK RULE" di atas). Jangan auto-skip tanpa konfirmasi.
3. Present options: "Tool [X] tidak tersedia. Pilihan: 1) Skip step ini, 2) Coba alternatif [Y], 3) Berhenti."
4. **NEVER fail the entire pipeline silently** because one tool is missing.

---

## Quick Start: /rally Command

**User cukup ketik `/rally` — AI akan menanyakan apa yang ingin dilakukan.**

---

### `/rally` — Tanya Dulu, Baru Aksi

**Ketika user mengetik `/rally` (tanpa parameter apapun):**

AI HARUS membalas dengan daftar pilihan (menu). JANGAN langsung fetch campaign atau generate. Tanya dulu:

```
Rally Content Generator v9.5

Mau ngapain?

1. Buat konten — generate konten untuk campaign Rally
2. Update patterns — refresh Universal Pattern Library dengan data terbaru
3. Resume pipeline — lanjutkan pipeline yang terhenti (jika ada checkpoint)
4. Buat Q&A — generate 20 Q&A dari konten yang sudah pernah dibuat
5. Download skill — download file skill terbaru (.zip)

Ketik nomor (1-5).

⚠️ Jika ada checkpoint tersedia, tampilkan opsi 3 secara otomatis.
Cek checkpoint: `cat /home/z/my-project/download/rally_checkpoint.json` (jika file ada, tampilkan campaign name + last completed step).
```

**Setelah user memilih:**

**Jika user pilih 1 (Buat konten):**
→ Cek checkpoint dulu: `cat /home/z/my-project/download/rally_checkpoint.json`
→ Jika checkpoint ada DAN masih valid (campaign sama): tanya user "Ditemukan checkpoint untuk [campaign]. Mau resume dari step [N] atau mulai baru?"
→ Jika checkpoint tidak ada atau user mau mulai baru: tanya "Mau buat konten untuk campaign mana?" — atau langsung fetch campaign picker:

**Jika user pilih 2 (Update patterns):**
→ Langsung jalankan proses update Universal Pattern Library (lihat bagian "Update Patterns" di bawah).

**Jika user pilih 3 (Resume pipeline):**
→ Baca checkpoint dari `/home/z/my-project/download/rally_checkpoint.json`
→ Tampilkan: campaign name, completed steps, dan next step
→ Lanjutkan dari step terakhir yang selesai
→ ⚠️ Jika checkpoint tidak ada: tanya user "Tidak ada checkpoint ditemukan. Mau mulai pipeline baru?"

**Jika user pilih 4 (Buat Q&A dari konten):**
→ Baca content history: `cat /home/z/my-project/download/rally_content_history.jsonl`
→ Jika file kosong atau tidak ada: tanya user "Belum ada konten yang pernah dibuat. Buat konten dulu dengan opsi 1."
→ Jika ada konten: tampilkan daftar (campaign, tanggal, skor, preview 1 kalimat pertama)
→ User pilih konten → jalankan Step Q&A Generator (lihat bagian "Q&A Generator" di bawah).

**Jika user pilih 5 (Download skill):**
→ Buat zip file skill terbaru dan berikan ke user untuk download.
→ File: `/home/user_skills/rally.zip` (berisi SKILL.md + patterns.md)
→ Versi: v9.5
```bash
curl -s "https://app.rally.fun/api/campaigns?status=active"
```
Lalu tampilkan daftar campaign aktif dan tunggu user memilih. Setelah user pilih campaign → jalankan Step 1 sampai Step 11 (pipeline lengkap).

**Jika user pilih 2 (Update patterns):**
→ Langsung jalankan proses update Universal Pattern Library (lihat bagian "Update Patterns" di bawah).

---

### `/rally update` — Langsung Update Patterns

**Ketika user mengetik `/rally update`:**
→ Skip menu, langsung jalankan proses update Universal Pattern Library.

---

### `/rally [nama campaign]` — Langsung Buat Konten

**Ketika user mengetik `/rally CampaignName`:**
→ Skip menu dan skip campaign picker. Langsung jalankan Step 1 sampai Step 11 untuk campaign tersebut.


---

---

### Update Patterns (dipanggil saat user pilih 2 atau ketik `/rally update`)

**OVERVIEW:** Perintah ini mengambil data konten terbaik dari SEMUA campaign Rally yang aktif, lalu menganalisis pola-pola yang membuat konten tersebut skor tinggi. Hasil analisis menggantikan Universal Pattern Library (Step 0) di skill ini.

**TUJUAN:** Supaya setiap kali generate konten, AI menggunakan data FRESH tentang apa yang Rally's AI judge sebenarnya reward.

---

#### Step U1 — Fetch active + recently ended campaigns

**⚠️ JANGAN hanya ambil active campaigns.** Ended campaigns (baru berakhir 7-14 hari) punya lebih banyak submissions dan pattern-nya masih valid (AI judge-nya masih sama versi).

**U1-a. Fetch active campaigns:**
```bash
curl -s "https://app.rally.fun/api/campaigns?status=active" -o /tmp/rally_active_campaigns.json
```

**U1-b. Fetch ended campaigns (untuk data tambahan):**
```bash
curl -s "https://app.rally.fun/api/campaigns?status=ended" -o /tmp/rally_ended_campaigns.json
```

**U1-c. Filter ended campaigns — hanya ambil yang baru berakhir (7-14 hari):**
- Baca `endDate` dari setiap ended campaign
- Hanya simpan campaign yang `endDate` dalam 14 hari terakhir dari hari ini
- Campaign yang ended > 14 hari lalu → skip (risk pattern sudah stale)
- **Tujuan:** Mendapat lebih banyak data submissions tanpa mengorbankan relevansi

**Yang kamu dapat dari response:** JSON. Setiap campaign punya field:
- `title` — nama campaign
- `intelligentContractAddress` — alamat kontrak (0x...)
- `status` — "active" atau "ended"
- `startDate` / `endDate` — tanggal mulai/selesai (ISO format)
- `missionCount` — jumlah mission

Simpan daftar campaign (active + filtered ended). Kamu butuh `intelligentContractAddress` dari SETIAP campaign untuk step selanjutnya.

---

#### Step U2 — Fetch submissions untuk SETIAP campaign

Untuk SETIAP campaign dari Step U1, jalankan:
```bash
curl -s "https://app.rally.fun/api/submissions?campaignAddress=[CONTRACT_ADDRESS]&limit=200" -o /tmp/rally_submissions_[N].json
```

Ganti `[CONTRACT_ADDRESS]` dengan address campaign, dan `[N]` dengan nomor urut campaign.

**⚠️ Gunakan limit=200 (bukan 50).** Campaign aktif biasanya punya 200-400 submissions. Limit 50 hanya mengambil ~12.5% data — terlalu sedikit untuk analisis yang reliable.

**FORMAT RESPONSE (penting untuk parsing):**
Response adalah JSON array. Setiap submission memiliki:

```json
{
  "xUsername": "handle_pengguna",
  "tweetUrl": "https://x.com/handle/status/123456",
  "tweetText": "isi tweet lengkap di sini...",
  "atemporalPoints": 950000000000000000,
  "temporalPoints": 1200000000000000000,
  "analysis": [
    {
      "category": "Originality and Authenticity",
      "atto_score": "2000000000000000000",
      "atto_max_score": "2000000000000000000",
      "analysis": "Feedback text dari Rally AI judge..."
    }
  ],
  "disqualifiedAt": null,
  "hiddenAt": null,
  "invalidatedAt": null
}
```

**CARA PARSE SKOR (KRITIS):**
- Semua skor dalam format **atto** (string, 18 desimal). Untuk mendapatkan angka normal: **bagi dengan 1e18**
- Contoh: `"atto_score": "2000000000000000000"` → skor = 2.0
- Total max = 2+2+2+2+5+5+5 = 23.0

**7 CONTENT CATEGORY NAMES (urutan bisa berbeda, match by name):**
1. `Originality and Authenticity` — max 2.0
2. `Content Alignment` — max 2.0
3. `Information Accuracy` — max 2.0
4. `Campaign Compliance` — max 2.0
5. `Engagement Potential` — max 5.0
6. `Technical Quality` — max 5.0
7. `Reply Quality` — max 5.0

**⚠️ PERINGATAN: Ada juga 5 ENGAGEMENT CATEGORIES di analysis[] — JANGAN dihitung!**
```
Retweets, Likes, Replies, Followers of Repliers, Impressions
```
Category ini adalah temporal/engagement metrics. **TIDAK termasuk content quality.** Exclude dari perhitungan.

**🚨 CARA HITUNG TRUE QUALITY SCORE (PENTING):**

```python
content_categories = [
    "Originality and Authenticity",
    "Content Alignment", 
    "Information Accuracy",
    "Campaign Compliance",
    "Engagement Potential",    # ini "potential" — bukan actual engagement
    "Technical Quality",
    "Reply Quality"
]

quality_score = 0
for category in analysis:
    if category["category"] in content_categories:
        quality_score += int(category["atto_score"]) / 1e18

# quality_score = 0-23 (ini TRUE content quality)
```

**JANGAN gunakan `atemporalPoints` sebagai quality proxy!** Data real menunjukkan `atemporalPoints` adalah rough proxy yang di-clustering — content 23/23 dan 17/23 bisa mendapat atemporalPoints yang SAMA (0.60). Sorting by atemporalPoints akan miss 77% konten berkualitas tinggi.

**Untuk mengambil analysis text (feedback dari Rally AI judge):**
Analysis text sudah ada di field `analysis[].analysis` untuk setiap category. Tidak perlu API call terpisah.

---

#### Step U3 — Filter dan kumpulkan TOP content

Dari semua submissions yang sudah di-fetch:

1. **Filter valid:** Hanya submission yang `disqualifiedAt`, `hiddenAt`, DAN `invalidatedAt` semuanya `null` (artinya valid)

2. **🚨 Hitung TRUE QUALITY SCORE untuk SETIAP valid submission:**
   - Jumlahkan `atto_score` dari 7 content categories saja (bukan engagement categories)
   - Lihat Step U2 untuk daftar 7 content categories dan code perhitungan
   - **JANGAN gunakan `atemporalPoints`** — ini rough proxy yang meng-cluster skor berbeda ke nilai yang sama

3. **Sort by TRUE QUALITY SCORE:** Urutkan dari tertinggi (23/23) ke terendah

4. **Ambil top 5-8 per campaign** — total target **50-80 samples**
   - Lebih banyak sample = analisis lebih reliable
   - Ambil yang quality_score >= 18/23 (78%) minimum — di bawah itu konten terlalu medioker untuk dipelajari pattern-nya

5. **⚠️ Sample size HALT AND ASK:** Jika total samples dari SEMUA campaign < 30, **STOP dan tanya user:**
   "Total sample hanya [N] dari [M] campaigns. Ini terlalu sedikit untuk analisis reliable. Mau lanjut dengan data yang ada, atau skip update?"

6. **Simpan data berikut untuk setiap top sample:**
   - Campaign name
   - xUsername
   - tweetUrl
   - tweetText (isi tweet — penting untuk analisis hook)
   - **TRUE quality score** (jumlah 7 content categories, contoh: 21.0/23.0)
   - Quality percentage (score/23 * 100)
   - Setiap category score: Originality, Alignment, Accuracy, Compliance, Engagement, Technical, Reply Quality
   - Analysis text dari Rally AI judge (dari field `analysis[].analysis`)

---

#### Step U4 — Analisis cross-campaign patterns

Dari semua top samples yang terkumpul (target 50-80), lakukan analisis berikut:

**4a. Category Statistics — buat tabel:**

Hitung untuk SETIAP category:
- Average score (dalam angka, contoh: 1.8/2.0)
- Average percentage (contoh: 90%)
- Count yang dapat PERFECT score (100%)
- Key finding (1 kalimat)

Format tabel:
```
| Category | Avg % | Perfect (100%) | Key Finding |
|----------|-------|-----------------|-------------|
| Content Alignment | 100% | 24/24 (100%) | ... |
| ... | ... | ... | ... |
```

**4b. Universal Truths — pola di 100% top content:**
- Apa yang SEMUA top content punya? (misal: semua dapat 2/2 Content Alignment)
- Tulis dalam bentuk numbered list

**4c. Top Hook Patterns — analisis opening line SETIAP top tweet:**
1. Baca `tweetText` dari setiap top sample
2. Ambil kalimat pertama (opening line / hook)
3. Kategorikan hook ke dalam pola:
   - **Curiosity Discovery** — "I just found/ tried/ came across..." 
   - **Bold Contrast/Flip** — "Most X are Y, but..."
   - **Personal Experience/Skepticism** — "I was skeptical/ doubtful..."
   - **Question Nobody Asks** — "Why does nobody talk about..."
   - Lainnya (beri nama pola sendiri jika ada)
4. Hitung persentase tiap pola (berapa % dari total samples)
5. Berikan CONTOH HOOK NYATA dari data (copy-paste dari tweetText)
6. Identifikasi hooks yang ABSENT dari top content (apa yang TIDAK pernah dipakai oleh top content)

**4d. Category-Maxing Techniques:**
Untuk tiap category, tulis:
- **Apa yang membuat skor perfect?** — pola dari top content yang dapat 100%
- **Apa yang menyebabkan kehilangan 1 point?** — pola dari top content yang TIDAK perfect
- Berikan contoh konkret dari data

**4e. DO Patterns** — pola yang muncul di 70%+ top content:
- Baca tweetText dari semua top samples
- Identifikasi pola yang sering muncul (contractions, personal pronouns, short paragraphs, dll)
- Berikan contoh

**4f. DON'T Patterns** — pola yang ABSENT dari 90%+ top content:
- Apa yang top content TIDAK pernah lakukan?
- Berikan contoh

**4g. Content Structure Patterns:**
- Analisis struktur paragraf: berapa paragraf? panjang tiap paragraf?
- Pola yang paling umum (misal: Hook → Insight → Question)

**4h. Cross-Campaign Correlations:**
- Korelasi antar category (misal: Originality tinggi berkorelasi dengan Engagement tinggi)

**4i. Top Content Examples:**
Pilih 3-5 contoh TERBAIK (skor tertinggi). Untuk setiap contoh:
- Username
- Skor (contoh: 23/23 = 100%)
- Hook (opening line)
- WHY IT WORKS (jelaskan berdasarkan analysis text dari Rally AI judge, atau analisis kamu sendiri berdasarkan pola)

---

#### Step U5 — UPDATE patterns.md (MERGE, bukan REPLACE!)

**⚠️ STRATEGI: MERGE & ACCUMULATE — pola lama TETAP ADA, pola BARU DITAMBAHKAN.**

Setelah analisis selesai, UPDATE file pattern library:

**Lokasi file:** `/home/z/my-project/skills/rally/patterns.md`

**Cara update (MERGE strategy):**

**U5-1. Baca patterns.md yang ada** — Gunakan Read tool untuk membaca file ini. Pelajari semua pattern set yang sudah ada (v6.4, v6.5, dll).

**U5-2. Analisis perubahan dari data baru** — Bandingkan data baru dengan pattern set terakhir yang ada. Identifikasi:
- **Pola BARU** yang belum ada di patterns.md (hook baru, teknik baru, insight baru)
- **Pola yang BERUBAH** — persentase/temuan yang berbeda dari versi sebelumnya
- **Pola yang TETAP KONSISTEN** — divalidasi ulang (tandai "✅ Re-validated in vX.Y")
- **Pola yang TIDAK RELEVAN LAGI** — tandai sebagai "⚠️ Deprecated since vX.Y" JANGAN HAPUS
- **Insight baru** yang muncul dari campaign baru

**U5-3. Buat PATTERN SET BARU** dengan format:
```
## PATTERN SET: v[X.Y] (YYYY-MM-DD)

**DATA SOURCE: [N] top content samples across [M] active + recently ended Rally campaigns | METRIC: TRUE quality score (sum of 7 content categories, zero engagement bias)**

[Semua section yang sama seperti pattern set sebelumnya: Cross-Campaign Category Statistics, Universal Truths, Hook Patterns, Category-Maxing, DO/DON'T, Content Structure, Correlations, Top Examples]
```

**U5-4. APPEND pattern set baru ke patterns.md** — Tambahkan di BAWAH pattern set terakhir. JANGAN hapus pattern set lama.

**U5-5. Update VERSION TRACKER di atas file** — Tambahkan baris baru di tabel:
```
| v[X.Y] | YYYY-MM-DD | [N] samples | [M] campaigns | Update #[K] | ✅ Active |
```
Dan ubah status pattern set sebelumnya dari "✅ Active" jadi "📦 Archived" (tetap tersimpan).

**U5-6. Tulis ringkasan perubahan** di bawah pattern set baru:
```
### WHAT CHANGED FROM v[X-1.Y] → v[X.Y]
- **New patterns discovered:** [list]
- **Validated patterns (unchanged):** [list]
- **Patterns shifted:** [list perubahan]
- **Deprecated patterns:** [list yang tidak relevan lagi]
```

**CONTOH HASIL UPDATE (ilustrasi):**
```markdown
## PATTERN LIBRARY VERSION TRACKER

| Version | Date | Samples | Campaigns | Source | Status |
|---------|------|---------|-----------|--------|--------|
| v6.4 | 2025-07-10 | 24 samples | 8 campaigns | Initial seed | 📦 Archived |
| v6.5 | 2025-07-17 | 30 samples | 10 campaigns | Update #1 | ✅ Active |

---

## PATTERN SET: v6.4 (2025-07-10)
[... seluruh konten pattern set lama, TIDAK DIHAPUS ...]

---

## PATTERN SET: v6.5 (2025-07-17)
[... konten pattern set baru dengan data terbaru ...]

### WHAT CHANGED FROM v6.4 → v6.5
- **New patterns discovered:** "Contrarian Hot Take" hook pattern (20% of top content)
- **Validated patterns (unchanged):** Curiosity Discovery masih #1 hook, Content Alignment tetap 100%
- **Patterns shifted:** Reply Quality naik dari 72% → 78% (campaign baru lebih interaktif)
- **Deprecated patterns:** [kosong — semua pola v6.4 masih relevan]
```

**PERINGATAN:** JANGAN PERNAH menghapus pattern set lama. History penting untuk melihat tren dan perubahan algoritma Rally AI judge.

**Jika patterns.md sudah terlalu besar (>500 baris):** Tanya user dulu (HALT AND ASK). Opsi: 1) Archive pattern set tertua ke file terpisah (patterns-archive-v6.4.md), 2) Tetap biarkan, 3) Ringkas pattern set tertua.

---

#### Step U6 — Deploy ke semua lokasi

**⚠️ PATTERNS.MD PROTECTION — WAJIB DIBACA:**

Jika user upload zip baru yang berisi SKILL.md DAN patterns.md:
1. **SEBELUM extract**, backup patterns.md: `cp /home/z/my-project/skills/rally/patterns.md /tmp/patterns_backup.md`
2. Extract zip
3. **Cek ukuran patterns.md:** `wc -c /home/z/my-project/skills/rally/patterns.md`
4. Jika ukuran berubah signifikan (>20% berkurang) → RESTORE dari backup: `cp /tmp/patterns_backup.md /home/z/my-project/skills/rally/patterns.md`
5. Jika ukuran sama/tambah → zip patterns.md yang baru sudah OK

**WHY:** Zip dari user hampir SELALU berisi patterns.md versi lama atau kosong. Tanpa proteksi ini, pattern library yang sudah dikumpulkan dari 67+ samples akan hilang. Ini adalah **BUG paling sering** yang terjadi.

Setelah patterns.md di-update (dan diproteksi), deploy ke semua lokasi:

```bash
cd /home/z/my-project/skills/rally

# 1. Zip skill folder (SKILL.md + patterns.md)
rm -f /home/user_skills/rally.zip
zip -r /home/user_skills/rally.zip SKILL.md patterns.md
```

**3 lokasi deploy:**
| Lokasi | Path | Fungsi |
|--------|------|--------|
| Source of truth (SKILL.md) | `/home/z/my-project/skills/rally/SKILL.md` | Pipeline logic (jarang berubah) |
| Source of truth (patterns) | `/home/z/my-project/skills/rally/patterns.md` | Pattern library (sering di-update) |
| User skills | `/home/user_skills/rally.zip` | Zip untuk skill system (berisi KEDUA file) |

Verifikasi deploy berhasil:
```bash
ls -lh /home/user_skills/rally.zip
```

---

#### Step U7 — Report ke user

Setelah selesai, tampilkan report ini ke user:

```
✅ Universal Pattern Library updated! (MERGE — pola lama tetap ada)

📊 Data: [N] samples dari [M] campaigns
📅 Pattern set baru: v[X.Y] ([tanggal hari ini])
📈 Key changes dari v[X-1.Y]:
   - [perubahan notable 1]
   - [perubahan notable 2]
   - [perubahan notable 3]
📋 Total pattern sets di file: [K] versi (v6.4 ... v[X.Y])

📁 Deployed ke:
   - /home/z/my-project/skills/rally/SKILL.md (pipeline logic)
   - /home/z/my-project/skills/rally/patterns.md (pattern library)
   - /home/user_skills/rally.zip (skill system — kedua file)

Pattern library siap digunakan untuk generate konten berikutnya.
```

---

#### TROUBLESHOOTING Update Patterns

**Submissions API return empty:**
- Campaign mungkin belum punya submission
- Skip campaign tersebut, lanjut ke campaign lain

**Analysis text tidak tersedia:**
- Tidak semua submission punya analysis text dari Rally judge
- Jika tidak ada, analisis hook dan patterns langsung dari `tweetText`

**Banyak campaign aktif (>10):**
- Prioritaskan campaign yang punya jumlah submissions terbanyak
- Atau ambil top 20 campaign saja untuk menghemat waktu

**Rate limit dari Rally API:**
- Tunggu 2 detik antar request
- Jika tetap rate limited, kurangi jumlah campaign yang di-fetch


## Step-by-Step Instructions

### STEP 0: Checkpoint System Initialization

**⚠️ WAJIB — inisialisasi checkpoint SEBELUM step apapun.**

**0a. Check for existing checkpoint:**
```bash
cat /home/z/my-project/download/rally_checkpoint.json 2>/dev/null
```

- Jika checkpoint ada → tanya user: resume atau mulai baru?
- Jika checkpoint tidak ada → buat checkpoint baru:

**0b. Create fresh checkpoint:**
```bash
cat > /home/z/my-project/download/rally_checkpoint.json << 'EOF'
{
  "version": "9.5",
  "campaign": "",
  "contract_address": "",
  "started_at": "[ISO timestamp]",
  "completed_steps": [],
  "data": {
    "campaign_data": null,
    "calibration": null,
    "competitive": null,
    "campaign_brief": null,
    "deep_analysis": null,
    "variations": null,
    "judge_panel": null,
    "consensus": null,
    "g4_scores": null,
    "winner": null
  }
}
EOF
```

**Checkpoint judge_panel format:**
```json
"judge_panel": {
  "j1_harsh_critic": { "scores": {...}, "winner": "..." },
  "j2_avg_x_user": { "scores": {...}, "winner": "..." },
  "j3_rally_clone": { "scores": {...}, "winner": "..." },
  "j4_contrarian": { "scores": {...}, "winner": "..." },
  "j5_ai_detector": { "originality_scores": {...}, "patterns_found": {...} },
  "j6_self": { "scores": {...}, "winner": "...", "self_critique": "..." },
  "j7_qwen_tiebreak": null
}
```

**0c. How to update checkpoint after EACH step:**
After completing any step, append the step number to `completed_steps` and save relevant data to the `data` field. This ensures NO data is lost if context runs out.

**⚠️ CONTEXT AWARENESS RULE:**
Jika context terasa sudah 60%+ terpakai (banyak data yang dibaca/ditulis), WAJIB simpan checkpoint SEGERA setelah step saat ini selesai, lalu tanya user: "Context sudah cukup penuh. Saya sudah simpan checkpoint di step [N]. Mau lanjut di session baru (resume dari step [N+1]) atau coba lanjut?"

**JANGAN PERNAH skip step demi menghemat context.** Gunakan checkpoint + resume sebagai gantinya.

---

### STEP 0.5: Universal Pattern Library

**⚠️ FILE EKSTERNAL — BACA FILE INI SEBELUM GENERATE KONTEN.**

Pattern Library sekarang tersimpan di file terpisah. BACA file ini menggunakan Read tool:

**📂 File:** `/home/z/my-project/skills/rally/patterns.md`

**Cara baca:**
```
Gunakan Read tool untuk membaca: /home/z/my-project/skills/rally/patterns.md
```

**Isi file patterns.md:**
- Cross-Campaign Category Statistics (avg scores, perfect percentages)
- UNIVERSAL TRUTHS (non-negotiable rules)
- TOP HOOK PATTERNS (4 proven opening line patterns + hooks to avoid)
- CATEGORY-MAXING PATTERNS (Originality, Engagement, Reply Quality, Compliance, Alignment, Accuracy, Technical)
- DO/DON'T PATTERNS (what top content does vs doesn't do)
- CONTENT STRUCTURE PATTERNS (Hook → Insight → Question)
- CROSS-CAMPAIGN CORRELATIONS
- TOP CONTENT EXAMPLES (real examples with analysis)
- HOW TO USE THIS LIBRARY (priority order for content generation)

**IMPORTANT:** File patterns.md bisa punya BANYAK versi pattern set (v6.4, v6.5, v7.0, dll). Setiap versi menambahkan pola BARU tanpa menghapus pola lama. Baca SEMUA versi yang ada di file.

**How to refresh:** User types `/rally update` → See "Update Patterns" di Quick Start section untuk langkah lengkapnya. Update akan MENAMBAHKAN pattern set baru ke patterns.md (merge, bukan replace).

---

### STEP 1: Fetch FULL Campaign Data — Data Fortress System v9.0

**⏱ Estimated time: 45-90 seconds**

**🔧 DATA FORTRESS SYSTEM — 5-Lapis Jaminan Kelengkapan Data 100%**

**PRINSIP: Data yang tidak lengkap = konten yang salah = skor yang rendah. Skill ini MENOLAK untuk melanjutkan jika data tidak lengkap.**

**5 Lapis Penjaminan Data:**

```
LAPIS 1: MULTI-LEVEL EXTRACTION — Ambil data dari SETIAP level API yang mungkin
LAPIS 2: FIELD ALIAS PROBE — Coba setiap variasi nama field yang mungkin
LAPIS 3: DEEP NESTED SCAN — Scan nested objects (displayCreator, missions, dll)
LAPIS 4: LINK EXTRACTION & READING — Baca SEMUA link dari SEMUA field
LAPIS 5: DATA COMPLETENESS GATE — Verifikasi kelengkapan SEBELUM lanjut
```

**After this step completes:** Update checkpoint: add `1` to `completed_steps`, save campaign data to `data.campaign_data`.

**1a. Find the campaign via Rally API search (FASTEST and most reliable):**
```bash
curl -s "https://app.rally.fun/api/campaigns?search=[campaign name]"
```
This returns a JSON array. Find the matching campaign and extract `intelligentContractAddress`.

**⚠️ If `intelligentContractAddress` is null/missing/empty:** HALT AND ASK user: "Campaign '[name]' ditemukan tapi tidak punya contract address. Mau coba keyword lain atau skip?"

**1b. Alternative: web search if API search fails:**
Use **Tool 2: Web Search** (see Tools Reference above) to search for `"[campaign name] site:rally.fun"`. Then extract the 0x... contract address from the URL.

**1c. Fetch structured campaign data from Rally API:**
```bash
curl -s "https://app.rally.fun/api/campaigns/[CONTRACT_ADDRESS]"
```
Or alternatively use **Tool 3: Web Page Reader** to read `https://app.rally.fun/api/campaigns/[CONTRACT_ADDRESS]` if curl fails.

**1c-i. LAPIS 1: MULTI-LEVEL EXTRACTION — Extract from ALL API levels**

Setelah mendapat JSON response, extract data dari **SEMUA level** secara paralel:

```
═══ DATA FORTRESS: MULTI-LEVEL EXTRACTION ═══

Level 1: CAMPAIGN ROOT (objek utama dari API response)
  Extract: title, description, goal, style, knowledgeBase, additionalInfo,
           requirements, prohibitedItems, characterLimit, contentType,
           category, status, campaignUrl

Level 2: MISSIONS ARRAY (missions[N] — setiap mission)
  Extract: title, goal, description, style, rules, knowledgeBase,
           adminNotice, characterLimit, contentType, active,
           prohibitedItems, additionalInfo, requirements
  ⚠️ Ambil dari FIRST ACTIVE mission (active: true)

Level 3: NESTED OBJECTS (scan dalam-dalam)
  - displayCreator.organization.name → Project/creator name
  - displayCreator.organization.websiteUrl → Project website
  - displayCreator.organization.description → Creator description
  - missions[N].creator → Mission creator info (jika ada)
  - missions[N].reward → Reward structure (jika ada)

Level 4: HIDDEN FIELDS (scan seluruh JSON untuk field yang mungkin terlewat)
  - Cari key yang mengandung: "style", "knowledge", "base", "rule", "prohibit",
    "require", "additional", "info", "notice", "admin", "character", "content",
    "type", "limit", "goal", "description"
  - Jika ditemukan field yang tidak ada di dokumentasi → EXTRACT dan CATAT
```

**1c-ii. LAPIS 2: FIELD ALIAS PROBE — Resolve setiap field dengan fallback chain**

**⚠️ INI ADALAH BAGIAN PALING KRITIS.** Rally API tidak konsisten — field bisa muncul di campaign level, mission level, atau TIDAK ADA sama sekali. Kamu HARUS mencoba SEMUA lokasi:

```
═══ DATA FORTRESS: FIELD RESOLUTION TABLE ═══

Untuk SETIAP field di bawah, cek URUTAN fallback ini. Ambil dari lokasi PERTAMA yang punya nilai non-null:

┌───────────────────┬──────────────────────────────────────────────────────────────────────────────┐
│ FIELD             │ FALLBACK CHAIN (cek dari kiri ke kanan, ambil yang pertama non-null)         │
├───────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ style             │ missions[N].style → style → missions[N].styleGuide → styleGuide               │
│ knowledgeBase     │ missions[N].knowledgeBase → knowledgeBase → knowledge_base →                  │
│                   │ missions[N].brief → brief → missions[N].context → context                    │
│ additionalInfo    │ missions[N].additionalInfo → additionalInfo → missions[N].adminNotice →      │
│                   │ adminNotice → missions[N].instructions → instructions                        │
│ requirements      │ missions[N].requirements → requirements → missions[N].mustInclude →          │
│                   │ mustInclude → missions[N].rules (extract from rules)                          │
│ prohibitedItems   │ missions[N].prohibitedItems → prohibitedItems → missions[N].bannedWords →    │
│                   │ bannedWords → prohibited_items                                              │
│ contentType       │ missions[N].contentType → contentType → content_type →                       │
│                   │ missions[N].postType → postType                                              │
│ characterLimit    │ missions[N].characterLimit → characterLimit → character_limit →              │
│                   │ missions[N].maxChars → maxChars                                              │
│ rules             │ missions[N].rules → rules → missions[N].guidelines → guidelines              │
│ description       │ missions[N].description → description → missions[N].missionText              │
│ goal              │ missions[N].goal → goal → missions[N].objective → objective                  │
│ referenceLink     │ missions[N].referenceLink → referenceLink → extract from rules (x.com URL)  │
│ websiteUrl        │ displayCreator.organization.websiteUrl → campaignUrl → extract from desc     │
└───────────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

**⚠️ CONTOH KASUS NYATA (GenLayer — bug yang ditemukan):**
- `missions[0].style` = null (KOSONG di mission level)
- `style` (campaign root) = "Post a banger!" (ADA di campaign level)
- **BUG LAMA**: Pipeline hanya cek `missions[0].style` → null → style tidak ditemukan
- **FIX**: Fallback chain cek `missions[0].style` (null) → fall back ke `style` (campaign root) → "Post a banger!" ✅

**1c-iii. LAPIS 3: DEEP NESTED SCAN**

Setelah extract dari tabel di atas, lakukan deep scan:

```python
# Pseudo-code untuk deep scan (lakukan ini secara manual/mental):
for key, value in entire_json_response.items():
    if isinstance(value, dict):
        scan_dict(value, path=key)
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                scan_dict(item, path=f"{key}[]")

def scan_dict(obj, path):
    for key, value in obj.items():
        # Cari field penting yang mungkin terlewat
        if any(keyword in key.lower() for keyword in
               ["style", "knowledge", "rule", "prohibit", "require", "additional", "info"]):
            if value and len(str(value)) > 10:  # Non-empty and meaningful
                log(f"FOUND: {path}.{key} = {value[:100]}...")
```

**Jika deep scan menemukan field yang TIDAK ADA di Field Resolution Table:**
- Tambahkan ke extraction results sebagai "DISCOVERED FIELD"
- Catat: field name, path, value length, dan apakah isinya relevan
- Jika isinya relevan → gunakan di pipeline
- Ini memastikan field-field baru dari Rally API update TIDAK TERLEWAT

**1c-iv. FIELD RESOLUTION REPORT**

Setelah extraction selesai, WAJIB tampilkan:

```
═══ DATA FORTRESS: FIELD RESOLUTION REPORT ═══

✅ style:            "Post a banger!"                    [source: style (campaign root)]
✅ knowledgeBase:    "GenLayer is the first AI-powered..." (3257 chars)  [source: knowledgeBase (campaign root)]
✅ additionalInfo:   "Must mention Testnet Bradbury..."  [source: additionalInfo (campaign root)]
✅ requirements:     "Include #GenLayer"                 [source: missions[0].requirements]
✅ prohibitedItems:  ["Intelligent Contracts is..."]     [source: missions[0].prohibitedItems]
✅ contentType:      "tweet"                             [source: missions[0].contentType]
✅ characterLimit:   280                                 [source: missions[0].characterLimit]
✅ rules:            "Post about GenLayer..."            [source: missions[0].rules]
✅ description:      "GenLayer enables AI agents..."     [source: description (campaign root)]
✅ goal:             "Spread awareness about..."         [source: goal (campaign root)]
✅ referenceLink:    "https://x.com/GenLayer/status/..." [source: extracted from rules]
✅ websiteUrl:       "https://genlayer.com"              [source: displayCreator.organization.websiteUrl]

⚠️ EMPTY FIELDS (perlu perhatian):
❌ missions[0].style: null (FELLBACK to campaign root)
❌ missions[0].knowledgeBase: null (FELLBACK to campaign root)

📊 Data Completeness: 12/12 fields resolved (100%)
🔍 Deep scan discovered: 0 additional fields
```

**1d. LAPIS 4: LINK EXTRACTION & READING**

**⚠️ PRINSIP: Setiap link yang ditemukan HARUS dibaca. Tidak ada exception.**

After fetching campaign data, extract ALL URLs found in these fields:
- `missions[N].rules` -- often contains reference tweets or articles
- `missions[N].additionalInfo` or `adminNotice` -- may contain links
- `knowledgeBase` (from whichever level had data) -- may contain reference links
- `displayCreator.organization.websiteUrl` -- project website
- `campaignUrl` -- campaign page on Rally.fun
- `referenceLink` -- if found in field resolution
- **ANY field** that contains `https?://` — scan ALL extracted text

**How to extract links:**
Search the raw JSON response for all strings matching `https?://...`. Exclude image/logo URLs (`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`).

**PRIORITY ORDER FOR READING:**
1. **Reference tweet** (x.com/.../status/...) — PALING PENTING. Ini menentukan tone dan angle.
2. **Project website** (organization.websiteUrl) — memahami produk, fitur, nilai.
3. **Article/references** dalam knowledgeBase atau additionalInfo — konteks teknis.
4. **Campaign page** (Rally.fun URL) — jika sumber lain tidak cukup.

**How to read each link:**
Use **Tool 3: Web Page Reader** (web-reader skill) to read the content of each meaningful link. Invoke the `web-reader` skill via your available skill/tool system and provide the URL.

**Alternative (if web-reader skill not available):** Use `curl` via Bash to fetch the URL content, then parse the HTML/text.

**⚠️ MANDATORY: Jika reference tweet ditemukan tapi GAGAL dibaca** (timeout, error, dll):
- Catat sebagai FAILED di Field Resolution Report
- Di Step 4.1 (Data Completeness Gate), field ini akan ditandai sebagai INCOMPLETE
- Pipeline TIDAK boleh lanjut ke Step 4.5 tanpa user acknowledgment

**What to extract from each link:**
- Key facts, numbers, dates, names (add to anti-fabrication whitelist)
- Tone and messaging style (match in generated content)
- Unique angles or insights NOT in the campaign brief
- Specific features or achievements to reference

**Add extracted facts to Knowledge Base section:**
```
EXTRACTED FROM LINKS:
- [fact from link 1] -- VERIFIED from [URL]
- [fact from link 2] -- VERIFIED from [URL]
```

**LINK READING REPORT:**
```
═══ DATA FORTRESS: LINK EXTRACTION REPORT ═══

Links Found: 5 total
✅ https://x.com/GenLayer/status/... — READ OK — [N] chars extracted (reference tweet)
✅ https://genlayer.com — READ OK — [N] chars extracted (project website)
✅ https://docs.genlayer.com/... — READ OK — [N] chars extracted (KB article)
❌ https://medium.com/... — READ FAILED (timeout) — will note as incomplete
⚠️ https://rally.fun/campaign/... — SKIPPED (campaign page, lower priority)

Link Reading Score: 3/4 meaningful links read (75%)
```

**1e. Web research for context:**
Use **Tool 2: Web Search** to search for `"[campaign name] 2025 review news"`.

---

**⚠️ STEP 1 SELESAI. Sekarang lanjut ke Step 4.1 (Data Completeness Gate) SEBELUM Step 2.**

---

### STEP 2: Ground Truth Calibration (from Real Rally Submissions)

**⏱ Estimated time: 15-30 seconds**

**Fetch REAL submission data from Rally API** to calibrate scoring thresholds. This tells us what actually scores well on this specific campaign.

**After this step completes:** Update checkpoint: add `2` to `completed_steps`, save calibration data to `data.calibration`.

**2a. Fetch submissions (curl is most reliable):**
```bash
curl -s "https://app.rally.fun/api/submissions?campaignAddress=[CONTRACT_ADDRESS]&limit=200" -o /tmp/rally_submissions.json
```
Or alternatively use **Tool 3: Web Page Reader** to read the URL if curl fails.

**2b. Parse and analyze the submission data:**

Each submission has:
- `analysis[]` -- 12 categories total (7 content + 5 engagement). **Hanya hitung 7 content categories!**
- `atemporalPoints` -- ⚠️ **JANGAN gunakan ini sebagai quality score.** Ini rough proxy yang meng-cluster skor berbeda ke nilai yang sama (23/23 dan 17/23 bisa dapat atemporalPoints yang sama). Gunakan perhitungan manual di bawah.
- `disqualifiedAt` / `hiddenAt` / `invalidatedAt` -- Filter out invalid submissions
- `xUsername` -- Submitter's X handle

**7 Content categories** (ini yang DIHITUNG untuk quality score, max 23 total):
1. Originality and Authenticity (0-2)
2. Content Alignment (0-2)
3. Information Accuracy (0-2)
4. Campaign Compliance (0-2)
5. Engagement Potential (0-5) — ini "potential" bukan actual engagement
6. Technical Quality (0-5)
7. Reply Quality (0-5)

**5 Engagement categories** (JANGAN dihitung untuk quality — ini temporal metrics):
1. Retweets
2. Likes
3. Replies
4. Followers of Repliers
5. Impressions

**🚨 Cara hitung TRUE QUALITY SCORE:**
```
quality_score = sum of atto_score (divided by 1e18) for the 7 content categories only
```
Ini menghasilkan skor 0-23 yang merepresentasikan kualitas konten sesungguhnya menurut Rally's AI judge.

**2c. Calculate calibration data:**

From the valid submissions, calculate **TRUE QUALITY SCORE** (bukan atemporalPoints):

```
═══ GROUND TRUTH CALIBRATION ═══

Total submissions fetched: [N]
Valid submissions (not disqualified/hidden): [N]
Quality metric: TRUE content quality (sum of 7 categories, 0-23)

CONTENT QUALITY DISTRIBUTION:
  Mean:   [X]/23 ([Y]%)     (average submission)
  Median: [X]/23 ([Y]%)     (typical submission)
  Min:    [X]/23 ([Y]%)     (worst valid submission)
  Max:    [X]/23 ([Y]%)     (best submission)
  P10:    [X]/23 ([Y]%)     (bottom 10%)
  P25:    [X]/23 ([Y]%)     (bottom 25%)
  P50:    [X]/23 ([Y]%)     (middle)
  P75:    [X]/23 ([Y]%)     (top 25%)
  P90:    [X]/23 ([Y]%)     (top 10%)

POSITION THRESHOLDS (for our content):
  Top 10% requires: >= [P90]/23
  Top 25% requires: >= [P75]/23
  Top 50% requires: >= [P50]/23
  Above average:    >= [Mean]/23

AVERAGE SCORE PER CATEGORY (what categories people struggle with):
  [Category 1]: [avg]/[max] ([avgPct]%)
  [Category 2]: [avg]/[max] ([avgPct]%)
  ...

WEAK CATEGORIES (people score lowest here -- OPPORTUNITY for us):
  1. [weakest category]
  2. [2nd weakest]
  3. [3rd weakest]

STRONG CATEGORIES (people score highest here -- HARDER to stand out):
  1. [strongest category]
  2. [2nd strongest]
  3. [3rd strongest]

TOP 5 SUBMISSIONS (by TRUE content quality):
  1. @[username] -- [score]/23 ([pct]%) [tweetUrl]
  2. @[username] -- [score]/23 ([pct]%) [tweetUrl]
  3. @[username] -- [score]/23 ([pct]%) [tweetUrl]
  4. @[username] -- [score]/23 ([pct]%) [tweetUrl]
  5. @[username] -- [score]/23 ([pct]%) [tweetUrl]
```

**2d. Use calibration data to set targets:**

- **Target score** = P90 value (aim for top 10%)
- **Minimum acceptable** = P50 value (at least average)
- **Focus categories** = Weak categories (where competitors struggle -- easier to stand out)
- **Study top submissions** = Read tweet URLs of top 5 to understand what works

**If API returns empty or error:**
- ⚠️ **HALT AND ASK** (lihat "HALT AND ASK RULE" di atas). Tanya user apakah mau lanjut tanpa calibration atau coba lagi.
- Jika user setuju lanjut: use default thresholds: target >= 91% (21/23), minimum >= 83% (19/23)

---

### STEP 3: Competitive Analysis

**⏱ Estimated time: 30-60 seconds**

**Search the web for competitor content** about this campaign. Learn what angles, hooks, and phrases are overused so we can be different.

**After this step completes:** Update checkpoint: add `3` to `completed_steps`, save competitive data to `data.competitive`.

**⚠️ CONTEXT TIP:** Step 3 adalah step yang paling "bisa diganti" jika context sudah tipis. Jika context > 70% terpakai dan checkpoint sudah tersimpan sampai step 2, kamu bisa tanya user: "Context sudah 70%. Competitive analysis bisa skip (kualitas turun sedikit) atau lanjut?" Jangan skip diam-diam — TANYA user dulu.

**3a. Search for competitor content:**
Use **Tool 2: Web Search** twice:
1. Search for `"[campaign name]" rally.fun site:x.com OR site:twitter.com`
2. Search for `"[campaign name]" [category] tweet crypto`

**3b. Read competitor pages** (top 2-3 results):
Use **Tool 3: Web Page Reader** to read the content of competitor URLs found in search results.

**⚠️ If web search returns ZERO results or no competitor content found:**
- **HALT AND ASK** (lihat "HALT AND ASK RULE" di atas). Tanya user: "Tidak ditemukan competitor content apapun untuk campaign ini. Mau skip competitive analysis, atau coba keyword lain?"
- Jangan auto-skip tanpa konfirmasi user.

**3c. Analyze competitor patterns:**

For each competitor content found, analyze:
- **Angle**: What perspective do they take? (personal experience, contrarian, data-driven, etc.)
- **Hook**: What opening line do they use? (question, bold claim, surprising stat, etc.)
- **Structure**: How is the content organized? (problem-solution, before-after, story, etc.)
- **Tone**: casual, urgent, humorous, analytical, etc.
- **Key phrases**: What words/phrases appear frequently across competitors? (AVOID these)
- **Strengths**: What makes their content work?
- **Weaknesses**: What could be better?
- **Estimated score**: Rate each competitor on Rally's 7 categories (0-23)

**3d. Build differentiation strategy:**

```
═══ COMPETITIVE INTELLIGENCE ═══

Competitors analyzed: [N]

COMMON PATTERNS (what everyone does):
  Angles: [list]
  Hooks: [list]
  Structures: [list]
  Tones: [list]
  Overused phrases: [list] -- DO NOT USE THESE

COMPETITOR SCORES (estimated):
  Competitor avg: [X]/23 ([Y]%)
  Competitor top: [X]/23 ([Y]%)

WEAKEST COMPETITOR CATEGORIES (opportunity):
  1. [category] -- competitors score low here
  2. [category]

DIFFERENTIATION STRATEGY:
  Recommended angle: [something NO competitor uses]
  Recommended hook: [something that stands out]
  Unique approaches:
    - [approach 1]
    - [approach 2]
    - [approach 3]

  Phrases to AVOID: [competitor overused phrases]
  Gaps to exploit:
    - [gap 1 -- something no competitor addresses]
    - [gap 2]

  Target score: [competitor_top * 1.3] -- BEAT the best competitor by 30%
```

**3e. Inject competitive intel into generation:**

When writing variations in Step 5, you MUST:
- Use the **recommended angle** (not what competitors use)
- Use the **recommended hook** (not what competitors use)
- **AVOID** all overused phrases
- **EXPLOIT** the gaps (address things competitors miss)
- **FOCUS** on weak competitor categories

---

### STEP 4: Build Campaign Brief

**⏱ Estimated time: 15-30 seconds** (no external calls — just assembling data)

Combine everything from Steps 1-3 into one comprehensive brief.

**After this step completes:** Update checkpoint: add `4` to `completed_steps`, save brief to `data.campaign_brief`.

```
═══ CAMPAIGN BRIEF ═══

CAMPAIGN:
- Name: [title from API]
- Contract: [intelligentContractAddress]
- URL: [campaignUrl]
- Status: [status]
- Category: [category]

MISSION: [missionNumber] -- [missionTitle]
- Goal: [missionGoal]
- Description: [mission description if different from goal]

DESCRIPTION:
[Full campaign description -- paste the complete text]

STYLE:
[style field from API -- the required writing tone/style. THIS IS CRITICAL]
[If empty: "default -- write naturally like a real person on X/Twitter"]

RULES:
[rules field from API -- EVERY rule, do not omit]

PROHIBITED ITEMS:
[prohibitedItems from API -- EVERYTHING not allowed. HARD BLOCK.]

REQUIREMENTS:
[requirements from API -- required elements, mentions, hashtags]

ADDITIONAL INFO:
[additionalInfo from API -- extra instructions, admin notices]

CONTENT TYPE:
[contentType from API -- reply/tweet/post/etc]

CHARACTER LIMIT:
[characterLimit from API -- the EXACT limit. DO NOT hardcode 200-280]

KNOWLEDGE BASE:
[Full knowledgeBase from API -- ALL verifiable facts are here]

KEY FACTS (extracted from Knowledge Base):
- [fact 1] -- VERIFIED from KB
- [fact 2] -- VERIFIED from KB
- [fact 3] -- VERIFIED from KB

KEY FACTS (from web research, NOT in KB -- use vague language):
- [fact 4] (source: URL) -- UNVERIFIED, use carefully
- [fact 5] (source: URL) -- UNVERIFIED, use carefully

TARGET AUDIENCE:
[Who the campaign is for -- inferred from category, style, description]

CAMPAIGN TYPE: [defi/nft/metrics/community/product/general]
STRATEGY: [see Campaign Type Strategies below]

REWARD STRUCTURE:
[Prizes, tokens from campaignRewards]

═══ ANTI-FABRICATION RULES ═══
The following claims are VERIFIED (from Knowledge Base -- safe to use):
- [list specific numbers, dates, names, URLs from KB]

The following are FORBIDDEN (do NOT claim unless in KB):
- Specific follower counts, TVL, partnership details NOT in KB
- Investor names, team members, advisor names NOT in KB
- Specific dates, percentages, metrics NOT in KB
- If KB does not have a specific number -> use vague language: "a bunch of", "quite a few", "growing fast"

═══ GROUND TRUTH CALIBRATION ═══
[Paste calibration results from Step 2]

Target score: [P90]% (top 10% threshold)
Minimum score: [P50]% (average threshold)
Focus categories: [weak categories]

═══ COMPETITIVE INTELLIGENCE ═══
[Paste competitive analysis from Step 3]

Use recommended angle: [angle]
Use recommended hook: [hook]
Avoid phrases: [list]
Exploit gaps: [list]
```

**Present this brief to the user** for confirmation:
```
Brief untuk: [campaign title]
Style: [style] | Type: [contentType] | Limit: [characterLimit or "none"]
Key rules: [2-3 most important rules]
Facts from KB: [2-3 key verified facts]

Correct or proceed?
```
Jika user koreksi → update brief dan lanjut. Jika user bilang proceed → lanjut ke Step 5.

---

### STEP 4.1: Data Completeness Gate (MANDATORY — Before Deep Analysis)

**⏱ Estimated time: 10-20 seconds** (verification only — no external calls)

**⚠️ STEP KRITIS: Ini adalah GERBANG yang memastikan data BENAR-BENAR lengkap sebelum AI mulai menganalisa dan menulis. Jika data tidak lengkap, analisa akan salah, konten akan salah, dan skor akan rendah.**

**Kenapa step ini penting:**
- Step 1 mengumpulkan data mentah dari API + web. Tapi "data terkumpul" ≠ "data lengkap".
- Field yang NULL di mission level mungkin ADA di campaign level (fallback). Tapi jika juga NULL di campaign level = benar-benar kosong.
- Link yang ditemukan mungkin gagal dibaca (timeout, 404, dll).
- Data yang tidak lengkap harusnya MENGHALANG pipeline, bukan diabaikan.

**After this step completes:** Update checkpoint: add `4.1` to `completed_steps`.

**4.1a. Verifikasi setiap critical field:**

```
═══ DATA COMPLETENESS GATE ═══

Kriteria          | Status   | Source                    | Notes
------------------|----------|---------------------------|---------------------------
style             | ✅/❌    | [fallback source]         | [ jika ❌: "TIDAK DITEMUKAN di level manapun" ]
knowledgeBase     | ✅/❌    | [fallback source]         | [ jika ✅: length = N chars ]
additionalInfo    | ✅/❌    | [fallback source]         |
requirements      | ✅/❌    | [fallback source]         |
prohibitedItems   | ✅/❌    | [fallback source]         |
contentType       | ✅/❌    | [fallback source]         |
characterLimit    | ✅/❌    | [fallback source]         |
rules             | ✅/❌    | [fallback source]         |
description       | ✅/❌    | [fallback source]         |
goal              | ✅/❌    | [fallback source]         |
referenceTweet    | ✅/❌    | [URL or "not found"]      | Jika ada di rules tapi gagal dibaca = ❌
websiteContent    | ✅/❌    | [URL or "not found"]      |
```

**4.1b. Hitung Data Completeness Score:**
```
Data Completeness = (fields found) / (total fields) × 100%
```

**4.1c. Decision Gate:**

**Jika completeness = 100%** → LANJUT ke Step 4.5 (semua data lengkap)

**Jika completeness 70-99%** → TANYAKAN user dengan format:
```
⚠️ Data Tidak 100% Lengkap

Field yang kosong:
- [field name]: [deskripsi mengapa penting]

Pilihan:
1. Lanjutkan tanpa field tersebut (konten mungkin kurang spesifik)
2. Coba sumber alternatif untuk field yang kosong
3. Berhenti dan saya akan mencari data manual

Ketik nomor atau jawab langsung.
```

**Jika completeness < 70%** → AUTO-HALT, tanya user:
```
🚨 DATA CRITICAL — Hanya [X]% kelengkapan

[Field kosong]
Tanpa data ini, konten akan sangat generic dan berisiko tinggi gagal di judge.

Pilihan:
1. Coba sumber alternatif (web search untuk info tentang campaign)
2. Lanjutkan dengan risiko tinggi (saya sarankan TIDAK)
3. Berhenti

Ketik nomor.
```

**⚠️ FIELD KRITIS YANG TIDAK BOLEH KOSONG (jika kosong = auto-HALT):**
1. **style** — tanpa style, AI tidak tahu tone yang diminta → konten pasti salah
2. **knowledgeBase** — tanpa KB, anti-fabrication tidak punya sumber fakta → risiko fabrication TINGGI
   - **EXCEPTION**: Jika KB kosong TAPI website content berhasil dibaca dan mengandung fakta yang cukup → boleh lanjut, catat "KB kosong, menggunakan website content sebagai pengganti"
3. **rules** — tanpa rules, AI tidak tahu apa yang dilarang → compliance risk TINGGI

**⚠️ JIKA STYLE KOSONG:**
- Cek apakah ada style indicator di field lain (description, goal, additionalInfo)
- Jika ada clue (misal "spread awareness", "celebrate", "be creative") → gunakan sebagai style proxy
- Jika TIDAK ADA clue sama sekali → HALT, tanya user

**⚠️ JIKA KB KOSONG (DAN WEBSITE JUGA TIDAK ADA):**
- Pipeline TETAP BOLEH lanjut, TAPI:
- Aktifkan **KB EMPTY MODE** (lihat Step 5a untuk detail)
- Gunakan HANYA vague language ("growing fast", "quite a few", "some")
- JANGAN pernah menyebut angka spesifik, nama partner, atau klaim yang tidak bisa diverifikasi
- Catat di output: "⚠️ KB kosong — semua klaim menggunakan bahasa vagu, tidak ada angka/fakta spesifik"

**Output (tidak ditampilkan ke user, tapi dicatat untuk pipeline):**
```
═══ DATA COMPLETENESS VERDICT ═══
Score: [X]% ([N]/[M] fields resolved)
Critical fields: [all present / missing: list]
Decision: PROCEED / HALT_AND_ASK / PROCEED_WITH_WARNING
Warnings: [list]
KB Empty Mode: ACTIVE / INACTIVE
```

---

### STEP 4.5: Deep Campaign Analysis (MUST do before pre-writing)

**⏱ Estimated time: 15-30 seconds** (internal analysis — no external calls)

**⚠️ STEP KRITIS: Ini adalah langkah yang MEMBEDAKAN konten generic dari konten yang BENAR-BENAR memahami campaign. AI HARUS menganalisa SEMUA data yang sudah dikumpulkan (Steps 1-4) secara mendalam sebelum menulis.**

**Kenapa step ini penting:**
- Step 1-3 mengumpulkan data mentah. Step 4 hanya meng-assemble ke format brief.
- TANPA analisa mendalam, AI akan menulis konten yang "tahu tentang campaign" tapi TIDAK "memahami campaign".
- Analisa ini menentukan APA yang harus difokuskan di konten, BAGAIMANA cara menyampaikannya, dan MENGAPA angle ini berbeda dari pesaing.

**After this step completes:** Update checkpoint: add `4.5` to `completed_steps`, save analysis to `data.deep_analysis`.

**AI HARUS menjawab 8 pertanyaan analisis berikut secara INTERNAL (tidak perlu ditampilkan ke user, tapi HASILNYA digunakan di Step 5 dan Step 6):**

```
═══ DEEP CAMPAIGN ANALYSIS ═══

1. CORE MESSAGE — Apa pesan utama yang campaign ini ingin sampaikan?
   - Baca mission description + mission goal + additionalInfo SECARA SAMA
   - Identifikasi THE ONE THING yang harus reader pahami setelah baca konten
   - Jangan hanya copy-paste deskripsi — TULIS DALAM BAHASA KAMU: "Jadi intinya..."
   - Hasil: 1-2 kalimat yang menjelaskan pesan inti campaign

   CORE MESSAGE: "[1-2 kalimat pesan inti]"
   Source: dari [mission description / KB / additionalInfo / website]

2. VALUE PROPOSITION — Apa yang membuat campaign/project ini bernilai bagi user?
   - Cross-reference: KB facts + website content + reference tweets + competitor gaps
   - Identifikasi: apa benefit spesifik? apa problem yang di-solve? apa yang berbeda?
   - JANGAN klaim sesuatu yang tidak ada di KB atau website — gunakan "anti-fabrication" rules
   - Hasil: 2-3 value point yang spesifik dan bisa dibuktikan

   VALUE PROPS:
   a. [value prop 1] — source: [KB/website/reference]
   b. [value prop 2] — source: [KB/website/reference]
   c. [value prop 3] — source: [KB/website/reference]

3. MUST-INCLUDE FACTS — Fakta mana dari KB/website yang WAJIB masuk ke konten?
   - Dari SEMUA facts yang ada (KB + website + reference tweets), pilih 3-5 PALING RELEVAN
   - Relevansi diukur dari: apakah ini mendukung core message? apakah ini memperkuat value prop?
   - Setiap fact HARUS punya sumber (KB / website URL / reference tweet)
   - Jika KB kosong dan website tidak ada: gunakan vague language, catat di sini

   MUST-INCLUDE (prioritized by relevance):
   #1: "[fact]" — VERIFIED from [source] — supports [core message / value prop]
   #2: "[fact]" — VERIFIED from [source] — supports [core message / value prop]
   #3: "[fact]" — VERIFIED from [source] — supports [core message / value prop]
   #4: "[fact]" — VERIFIED from [source]
   #5: "[fact]" — VERIFIED from [source]

4. STYLE DEEP READ — Analisa style field secara mendalam
   - Baca style field dari campaign API BUKAN sekadar "baca" tapi "pahami nuansa"
   - Tentukan style energy level: HIGH / MEDIUM / LOW
     * HIGH = "banger", "bold", "hype", "punchy", "aggressive", "provocative"
     * MEDIUM = "casual", "conversational", "friendly", "relatable"
     * LOW = "analytical", "informative", "educational", "formal"
   - Identifikasi specific tone indicators: apa kata-kata kunci di style description?
   - Identifikasi what NOT to do: contraindication dari style field
   - Cross-check: apakah style konsisten dengan category dan mission goal?
   - Hasil: style energy level + tone direction + forbidden patterns

   Style energy: [HIGH/MEDIUM/LOW]
   Tone direction: "[1 kalimat arah tone — misalnya: 'Conviction tinggi, setiap kalimat harus punya impact']"
   Style indicators: [kata-kata kunci dari style field]
   Style forbidden: "[apa yang TIDAK BOLEH dilakukan berdasarkan style]"

5. CAMPAIGN UNIQUENESS — Apa yang membuat campaign ini berbeda dari yang lain?
   - Cross-reference: competitive analysis (Step 3) + KB facts + website content
   - Identifikasi: apa angle yang BANYAK dipakai pesaing? (HINDARI)
   - Identifikasi: apa angle yang BELUM dipakai siapapun? (GAP — EXPLOIT)
   - Identifikasi: apa fakta/fitur unik yang tidak dimiliki competitor?
   - Ini adalah input utama untuk variasi "Gap" di Step 6

   Overused by competitors: [list angles/phrases from Step 3]
   Untapped gaps: [list angles NOBODY is using]
   Unique differentiator: "[the ONE thing that makes this campaign unique]"

6. CATEGORY STRATEGY — Strategi spesifik per Rally scoring category
   - Berdasarkan SEMUA data yang ada, tentukan strategi untuk max setiap kategori:
   - Originality: gap mana yang bisa dieksploitasi? AI fingerprint apa yang harus dihindari?
   - Content Alignment: style apa yang diminta? apa kontraindikasinya?
   - Information Accuracy: fakta mana yang verified? mana yang risky?
   - Campaign Compliance: rule mana yang paling sering dilanggar? prohibited items?
   - Engagement Potential: hook style mana yang cocok? ending style?
   - Technical Quality: character limit? format khusus? sanitization checklist?
   - Reply Quality: pertanyaan apa yang genuine? framing "I can't figure out" untuk topik apa?

   CATEGORY STRATEGY:
   - Originality: [strategi spesifik — gunakan gap dari #5]
   - Alignment: [strategi spesifik — ikuti style dari #4]
   - Accuracy: [strategi spesifik — gunakan must-include dari #3]
   - Compliance: [strategi spesifik — check rules + prohibited items]
   - Engagement: [strategi spesifik — hook + ending style]
   - Technical: [strategi spesifik — format + sanitization]
   - Reply Quality: [strategi spesifik — genuine question framing]

7. MISSION DIRECTIVE — Apa PERINTAH spesifik dari campaign creator?
   - Baca mission description SECARA SAMA — bukan skim, tapi PAHAMI
   - Baca style field dari campaign level (bukan hanya mission level) — ini bisa berbeda!
   - Baca goal dari campaign level DAN mission level
   - Identifikasi VERB UTAMA: "celebrate", "announce", "discuss", "review", "critique", "spread awareness"
   - Cross-check: apakah style konsisten dengan directive? (misal: directive "celebrate" + style "banger" = HIGH ENERGY celebratory)
   - Jika ada konflik (directive "celebrate" tapi competitive analysis menunjukkan trend "skeptical") → directive MENANG
   - Hasil: 1 directive utama + tone requirement + contraindication (apa yang TIDAK BOLEH dilakukan)

   Mission directive: "[verb utama + subject — misalnya: 'Celebrate the launch of Testnet Bradbury']"
   Tone requirement: "[berdasarkan style + directive — misalnya: 'HIGH ENERGY celebratory, conviction tinggi, NO skepticism']"
   Style-directive alignment: [CONSISTENT / CONFLICT — jika conflict, jelaskan]
   Contraindication: "[apa yang TIDAK BOLEH dilakukan — misalnya: 'JANGAN ragu, JANGAN skeptical, JANGAN seolah-olah ini biasa']"

8. REFERENCE TWEET ANALYSIS — Apa yang reference tweet sampaikan? (jika ada)
   - Jika reference tweet berhasil dibaca di Step 1d → analisa SEKARANG
   - Identifikasi: apa pesan utama reference tweet? tone? style? fakta apa yang disebut?
   - Tentukan: apakah konten kita harus QUOTE TWEET, REPLY, atau standalone?
   - Jika contentType = "reply" → konten HARUS merespons point spesifik dari reference tweet
   - Jika contentType = "tweet" → konten BOLEH mereferensi reference tweet tapi TIDAK WAJIB
   - Extract: hook pattern dari reference tweet (bisa diadaptasi atau di-contrast)
   - Extract: fakta spesifik yang disebut reference tweet (tambahkan ke must-include)

   Reference tweet available: [YES/NO]
   Reference tweet tone: [tone description]
   Reference tweet key points: [list]
   Reference tweet hook: [opening line]
   Content strategy: [reply to specific point / quote tweet / standalone with reference]
   Facts from reference tweet to include: [list]

═══ ANALYSIS SUMMARY ═══
Core message: "[dari #1]"
Top value prop: "[dari #2]"
Must-include fact #1: "[dari #3]"
Style energy: [dari #4]
Unique angle: "[dari #5]"
Hardest category to max: [dari #6]
Easiest category to max: [dari #6]
Mission directive: "[dari #7]"
Tone requirement: "[dari #7]"
Reference tweet strategy: "[dari #8 — jika ada]"
```

**⚠️ RULES untuk Step 4.5:**

1. **WAJIB menjawab SEMUA 8 pertanyaan** — tidak boleh skip
2. **Hasil analisa HARUS digunakan di Step 5 dan Step 6** — Step 5b pre-writing perspective harus mempertimbangkan hasil analisa ini, Step 6 variasi konten harus berdasarkan strategi dari analisa ini
3. **Cross-reference WAJIB** — setiap klaim di analisa harus punya sumber dari data yang sudah dikumpulkan (KB, website, reference tweets, competitive analysis, calibration)
4. **JANGAN mengarang** — jika data tidak cukup untuk menjawab suatu pertanyaan, tulis "Data tidak cukup untuk menentukan [X]. Akan menggunakan default strategy."
5. **Style energy level dari analisa ini OVERRIDES style energy di Step 5b** — jika Step 4.5 menentukan HIGH tapi Step 5b sebelumnya menentukan MEDIUM, gunakan HIGH

**Output:** Analisa ini TIDAK perlu ditampilkan ke user. Langsung lanjut ke Step 5. Tapi hasilnya HARUS terlihat di cara AI menulis konten di Step 6.

---

### STEP 5: Pre-Writing Preparation (MUST do before writing)

**⏱ Estimated time: 15-30 seconds** (internal processing — no external calls)

**After this step completes:** Update checkpoint: add `5` to `completed_steps`.

**5a. Build Anti-Fabrication Whitelist (structured extraction):**

Extract EVERY verifiable fact from the Knowledge Base into a structured list. This whitelist is your ONLY source of truth for facts.

```
═══ ANTI-FABRICATION WHITELIST ═══
SOURCE: Knowledge Base (missions[N].knowledgeBase)

VERIFIED FACTS (safe to use EXACTLY as stated):
1. [number/percentage] -- from KB
2. [name/title] -- from KB
3. [date/timeline] -- from KB
4. [feature/capability] -- from KB
5. [partnership/integration] -- from KB
... (extract EVERY specific claim)

EXTRACTED FROM LINKS (verified via web-reader):
1. [fact] -- VERIFIED from [URL]
2. [fact] -- VERIFIED from [URL]
... (from Step 1d link reading)

UNVERIFIED CLAIMS (use vague language ONLY):
- [claim from web search or competitor analysis -- NOT in KB]
... (these CANNOT be stated as facts)
```

**⚠️ KB EMPTY MODE (aktivasi dari Step 4.1):**
Jika Step 4.1 menandai KB kosong DAN website content tidak tersedia:

```
═══ KB EMPTY MODE — ACTIVE ═══
⚠️ WARNING: Knowledge Base kosong. Anti-fabrication dalam mode MAXIMUM RESTRICTION.

ATURAN KHUSUS KB EMPTY MODE:
1. TIDAK BOLEH menyebut angka spesifik (TVL, user count, percentage, etc.)
2. TIDAK BOLEH menyebut nama partner, integrasi, atau kolaborasi
3. TIDAK BOLEH menyebut tanggal spesifik (launch date, milestone, etc.)
4. TIDAK BOLEH menyebut klaim teknis spesifik (TPS, throughput, etc.)
5. BOLEH menggunakan bahasa vagu: "growing fast", "quite a few", "some", "getting a lot of attention"
6. BOLEH menggunakan deskripsi umum: "interesting approach", "worth watching", "could be big"
7. BOLEH mereferensi apa yang dikatakan campaign description (ini verified, bukan fabricated)
8. WAJIB catat di output: "⚠️ KB kosong — semua klaim menggunakan bahasa vagu"
```

**5a-2. PRE-WRITE VERIFICATION CHECKLIST (MANDATORY sebelum menulis):**
```
═══ PRE-WRITE VERIFICATION CHECKLIST ═══

Sebelum mulai menulis konten, verifikasi:

✅/❌ Knowledge Base dibaca lengkap? [ya/tidak — jika tidak, KB Empty Mode harus ACTIVE]
✅/❌ Reference tweet dibaca? [ya/tidak — jika contentType = reply, ini WAJIB]
✅/❌ Website content dibaca? [ya/tidak]
✅/❌ Competitive analysis dilakukan? [ya/tidak]
✅/❌ Semua verified facts tercatat di whitelist? [ya/tidak]
✅/❌ Style field dipahami (bukan sekadar dibaca)? [ya/tidak]
✅/❌ Mission directive diidentifikasi? [ya/tidak — dari Step 4.5 #7]
✅/❌ Prohibited items dicatat? [ya/tidak]
✅/❌ Requirements dicatat? [ya/tidak]
✅/❌ Character limit diketahui? [ya/tidak — jika tidak ada, tulis "NO LIMIT"]
✅/❌ KB Empty Mode aktif? [ya/tidak — jika ya, ikuti aturan khusus]

Jika ADA item ❌ yang bersifat KRITIS (KB dibaca, style dipahami, prohibited items):
→ JANGAN lanjut ke Step 6. Kembali ke step yang gagal atau HALT AND ASK.

Jika hanya beberapa item non-kritis ❌ (website tidak dibaca, competitive tidak dilakukan):
→ Catat sebagai WARNING, lanjutkan dengan data yang ada.
```

**RULES:**
- ONLY numbers, names, dates, features from KB are "VERIFIED" — safe to use as-is
- Facts from web-reader (links in KB) are "EXTRACTED" — safe but double-check
- Claims from web search (Step 3 competitive analysis) are "UNVERIFIED" — use vague language
- If KB is empty: use ONLY vague language ("growing fast", "quite a few", "some")
- NEVER fabricate: follower counts, TVL, partnerships, team members not in whitelist

**5b. Pre-Writing Perspective (answer these 6 questions internally):**

**⚠️ v9.5 CONTEXT-SAVING MODE — STEP INI SILENT (tidak output ke user)**
Untuk menghemat context window, Step 5b diproses SECARA INTERNAL. TIDAK menampilkan output template ke user. Hasilnya disimpan ke checkpoint (`data.pre_writing_perspective`) dan digunakan langsung di Step 6.

**Cara eksekusi:**
1. Baca semua input (Step 4.5 analysis, Deep Analysis, competitive intel, KB, website content)
2. Jawab 6 pertanyaan di bawah ini SECARA MENTAL (di AI "thinking", bukan di output)
3. Simpan hasilnya ke checkpoint — JANGAN tampilkan template ke user
4. Langsung lanjut ke Step 5.5 atau Step 5.6

```
═══ PRE-WRITING: Build Your Genuine Perspective FIRST ═══

⚠️ INPUT: Gunakan hasil Deep Campaign Analysis (Step 4.5) sebagai fondasi.
Setiap jawaban di bawah harus CONSISTENT dengan analisa dari Step 4.5.

1. PERSONAL CONNECTION: What is YOUR genuine reaction to "[campaign title]"?
   Have you seen something similar before? What surprised you?
   → Gunakan core message dari Step 4.5 #1 sebagai konteks

2. SKEPTICISM: What makes you doubtful or uncertain about this?
   What could go wrong? What doesn't add up?
   → Cross-check dengan must-include facts dari Step 4.5 #3

7. ⚠️ MISSION DIRECTIVE CHECK (from Step 4.5 #7):
   What is the campaign creator ASKING me to do?
   - If directive = "celebrate/hype/launch" → SKEPTICISM DIMINISHED, focus on excitement
   - If directive = "discuss/review" → SKEPTICISM MAINTAINED, balanced view
   - If directive = "spread awareness" → FOCUS ON CLARITY + REACH
   - Mission directive: "[from Step 4.5 #7]"
   → This OVERRIDES the default "always include counter-point" assumption

8. REFERENCE TWEET CONTEXT (from Step 4.5 #8 — if available):
   What angle/fact from the reference tweet can I build on?
   - [reference tweet key point 1]
   - [reference tweet key point 2]
   → If contentType = "reply", this is the PRIMARY angle

3. SPECIFIC AUDIENCE: Who exactly are you talking to?
   Not "crypto people" but a specific person with specific concerns.
   → Gunakan category strategy dari Step 4.5 #6

4. COUNTER-NARRATIVE: What does everyone get WRONG about this topic?
   What's the unpopular take?
   → Gunakan overused angles dari Step 4.5 #5 sebagai referensi apa yang sudah terlalu sering dibahas

5. SPECIFIC MOMENT: What's ONE specific detail, number, or moment
   from the Knowledge Base that made this real for you?
   → Gunakan must-include facts dari Step 4.5 #3

6. ⚡ STYLE ENERGY LEVEL: Seberapa keras/energik konten ini harusnya terasa?
   ⚠️ GUNAKAN style energy dari Step 4.5 #4 — ini OVERRIDES penentuan manual.
   Style energy dari Step 4.5: [HIGH/MEDIUM/LOW]
   
   Jika HIGH (banger/bold/hype):
   - Setiap kalimat punya IMPACT — bukan sekadar informatif
   - Conviction tinggi — seperti orang yang YAKIN dengan apa yang dia bilang
   - Short, punchy sentences — bukan paragraf panjang yang menjelaskan
   - Bold statements yang reader tidak bisa ignore
   
   Jika MEDIUM (casual/conversational):
   - Santai tapi tetap punya hook yang kuat
   - Natural conversation flow
   
   Jika LOW (analytical/informative):
   - Tenang tapi tetap harus punya hook yang kuat
   - Fokus pada clarity dan depth

Campaign type: [type from brief]
Campaign style hint: [style from brief]
⚡ Style energy level: [from Step 4.5 #4 — HIGH/MEDIUM/LOW]
Core message: [from Step 4.5 #1]
Key facts from KB -- use them, DON'T fabricate.
Key facts from website/links -- use them too, they're verified from Step 1d.
Strategy: [strategy from Campaign Type Strategies below]

Competitive intel: Use [recommended angle], avoid [overused phrases],
exploit [gaps — AT LEAST ONE variation MUST use the gap angle].
Focus on weak categories: [list dari Step 4.5 #6].

⚠️ MANDATORY: Competitive gap angle dari Step 3 HARUS digunakan
di minimal 1 variasi. Ini adalah peluang Originality terbesar.

IMPORTANT: Write from WITHIN this perspective.
You are a real person sharing a genuine thought,
NOT an AI generating marketing content.
```

---

### STEP 5.5: Campaign Type Strategies

Based on the campaign `category` and `style`, use the appropriate strategy:

**DeFi Campaigns (category: defi, yield, lending, trading):**
- Focus: TVL, APY, specific protocol mechanics, real yield vs inflationary
- Tone: Numbers-driven, skeptical of "too good to be true" APYs
- Counter-point: "but impermanent loss tho" or "where does the yield actually come from"

**NFT/Campaigns (category: nft, art, collectible):**
- Focus: Artist/story, utility, community strength, floor price reality
- Tone: Appreciative but questioning value proposition
- Counter-point: "floor's been bleeding tho" or "what happens after mint"

**Metrics/Product Launches (category: testnet, launch, mainnet):**
- Focus: What actually works, what's new, real-world usage
- Tone: Early adopter curiosity, honest assessment
- Counter-point: "testnet != mainnet" or "we've seen this before with [similar project]"

**Community/Social Campaigns (category: community, social, governance):**
- Focus: People, relationships, genuine community value
- Tone: Warm but not fake-enthusiastic
- Counter-point: "community's great until token launches" or "governance turnout is usually low"

**General/Unknown:**
- Default strategy: informed curiosity with healthy skepticism
- Use the `style` field to guide tone

---

### STEP 5.6: Proven Category-Maxing Techniques

These techniques are **battle-tested** from real pipeline runs that achieved 22.5/23 (97.8%, Top 1%). Use them during content generation.

**REPLY QUALITY (target: 5/5) -- PROVEN TECHNIQUE:**
Reply Quality is usually the weakest category across all Rally campaigns (avg ~28%). Most submissions either ask rhetorical questions (author answers it) or end with a generic "what do you think?". To max this category:

1. **"I can't figure out" framing**: Explicitly state something you CANNOT figure out. Example: "I can't figure out what happens when validators disagree on a subjective outcome." This shows genuine depth, not surface-level engagement.
2. **Multiple genuine open questions**: End with 2-3 questions that have NO obvious answer. They should be questions the author genuinely doesn't know the answer to.
3. **Self-doubt closing paragraph**: Add a closing sentence that shows vulnerability. Example: "I say that as someone who actually wants this to work, so don't take this the wrong way." This prevents the content from reading like a shill post.
4. **DO NOT answer your own questions**: The #1 Reply Quality killer is posing a question and then immediately answering it (rhetorical). If you ask "will this work?", STOP. Do not add "I think it will because..."

**ORIGINALITY (target: 2/2) -- PROVEN TECHNIQUE:**
Originality gate is binary (0 or 2). Scoring 1 means the content has AI fingerprints. To max this category:

1. **Find the question nobody is asking**: During competitive analysis, identify what EVERY competitor is talking about, then find the angle NOBODY mentions. Example: everyone talked about "deterministic vs non-deterministic computation" but nobody asked "what happens when validators disagree on subjective outcomes?" The latter scored 2/2.
2. **Personal specific moment opener**: Start with a specific moment in time, not a generic hook. "was reading the docs last night" beats "ok serious question" or "breaking". The more specific the moment, the more human it reads.
3. **Uneven paragraph lengths**: Real people write uneven paragraphs. Mix a long paragraph (4-5 sentences) with a short one (1-2 sentences). AI tends to write uniform blocks.
4. **Mid-sentence topic shift**: A real person sometimes shifts topic mid-sentence. "the testnet works but honestly that's the easy part" reads more human than perfectly structured sentences.

**ENGAGEMENT (target: 5/5) -- PROVEN TECHNIQUE:**
Engagement measures whether someone would stop scrolling, reply, or share.

1. **Specific moment opener**: "was reading the docs at 2am" > "just checked out this project" > "interesting project". Specificity = authenticity.
2. **First sentence = hook or question**: Never start with background/context. Start with the most interesting part.
3. **Include a number**: Specific numbers (even from KB) draw the eye. "3 validator nodes" > "validator nodes". But use verified numbers only (anti-fabrication).
4. **End on uncertainty**: People engage more with content that admits uncertainty than content that claims to have all answers.

**TECHNICAL QUALITY (target: 5/5) -- PROVEN TECHNIQUE:**
1. **Natural flow > perfect grammar**: Real tweets have run-on sentences, fragments, casual connectors. Don't over-correct.
2. **Single post rhythm**: Even without character limits, the content should READ like a single post, not an essay. 1-3 paragraphs.
3. **Sanitization must be perfect**: No em-dashes, no double-hyphens, no smart quotes. These are easy catches that tank Technical Quality.

**⚡ BANGER STYLE (target: match campaign style energy) -- PROVEN TECHNIQUE:**
Banger = konten yang punya HIGH IMPACT. Bukan analisis, bukan penjelasan, tapi PUNCH. Reader merasakan "wow" bukan "hmm interesting". Gunakan ini ketika style field menyiratkan "banger", "bold", "hype", atau energy tinggi:

1. **Conviction > nuance**: Banger konten TIDAK ragu. "GenLayer just did something no other L1 dares to do" > "GenLayer's approach to intelligent contracts is quite interesting". Kalimat pertama punya conviction, kalimat kedua terasa lemah.
2. **Short, punchy sentences**: 1 kalimat = 1 impact. Jangan gabung 3 ide dalam 1 kalimat panjang. "Python not Solidity. That alone changes everything." > "GenLayer uses Python instead of Solidity which fundamentally changes how developers interact with blockchain technology."
3. **Drop-the-mic endings**: Akhiri dengan statement yang bikin reader berhenti dan mikir. BUKAN pertanyaan lemah. "Python not Solidity." adalah drop-the-mic ending. "What do you think about this?" BUKAN.
4. **Bold opener**: Kalimat pertama HARUS bikin reader stop scrolling. Gunakan contrast, surprise, atau provocation. "Everyone's building on Solidity. GenLayer said nah." > "GenLayer is a new blockchain platform."
5. **Eliminate filler words**: "basically", "essentially", "in terms of", "when it comes to", "the thing about" — hapus semua ini. Setiap kata harus punya fungsi.
6. **Use specific facts as weapons**: Jangan sebut "they have a testnet" tapi "Bradbury testnet. Live. Right now." — triad pendek = banger rhythm.
7. **Overused phrases = instant kill**: Jika competitive analysis menemukan phrase yang sudah dipakai 10+ orang, JANGAN pakai. Temukan cara UNIK. "Bradbury testnet is live" = overused. "Python not Solidity" = unique angle.

---

**🔒 v9.1 MAX-OUT TECHNIQUES — Per-Dimension Comprehensive Playbook**

**Teknik di bawah ini WAJIB diterapkan saat menulis konten. Ini bukan saran, ini REQUIREMENT untuk mencapai skor maksimal.**

**ORIGINALITY 2/2 — ANTI-AI MASTER CHECKLIST (wajib lulus SEMUA sebelum submit):**

AI fingerprint terdeteksi melalui 3 mekanisme: (1) word choice, (2) sentence structure, (3) content pattern. Konten HARUS lulus SEMUA 3 mekanisme.

**Mekanisme 1: Word Choice Scan**
- ❌ DELVE, LEVERAGE, PARADIGM, TAPESTRY, LANDSCAPE, NUANCE, CRUCIAL, PIVOTAL, EMBARK, JOURNEY, EXPLORE, UNLOCK, HARNESS, FOSTER, UTILIZE, ELEVATE, STREAMLINE, EMPOWER, REALM, COMPREHENSIVE, UNDERSCORES, MOREOVER, FURTHERMORE, CONSEQUENTLY, NEVERTHELESS, NOTABLY, SIGNIFICANTLY
- ❌ "key takeaways", "let's dive in", "nobody is talking about", "here's the thing", "picture this", "at the end of the day", "in conclusion", "hot take", "unpopular opinion", "thread alert", "breaking", "this is your sign", "psa", "reminder that", "drop everything", "stop scrolling", "hear me out", "imagine a world where"
- ❌ "on the other hand", "at its core", "the reality is", "it goes without saying", "make no mistake", "it's worth noting", "the bottom line is"
- ❌ "honestly", "like", "kind of wild", "ngl", "tbh", "tbf", "fr fr", "lowkey"
- ✅ GANTI dengan: kata-kata kasual yang spesifik konteks ("wait", "so", "ok here's the thing", "eh", "tadi", "baru", "serius", "nggak")

**Mekanisme 2: Sentence Structure Scan**
- ❌ Setiap kalimat punya struktur yang sama (Subject-Verb-Object berulang)
- ❌ Setiap paragraf panjangnya sama (3-4 kalimat masing-masing)
- ❌ Kalimat selalu diawali dengan kata benda atau artikel ("The", "This", "An")
- ✅ MIX: kalimat pendek 3-5 kata DIAPIT kalimat panjang 15-25 kata
- ✅ AWALI kalimat dengan: konjungsi kasual ("but", "so", "and"), kata tanya ("why", "how come"), interjeksi ("wait", "eh"), atau fragment ("ok so")
- ✅ TAMBAHKAN: 1 run-on sentence, 1 fragment (2-4 kata setelah teks panjang), 1 mid-sentence topic shift

**Mekanisme 3: Content Pattern Scan**
- ❌ Generic observation tanpa detail spesifik ("interesting project", "worth watching")
- ❌ Klaim besar tanpa bukti atau personal context
- ❌ Perfectly balanced argument (AI suka "on one hand... but on the other hand")
- ✅ SPESIFIK: sebut detail spesifik dari KB atau website ("Bradbury testnet", "Python not Solidity")
- ✅ ASYMMETRIC: pendapat yang condong ke satu sisi, bukan perfectly balanced
- ✅ PERSONAL: tambahkan "I", "me", "my experience", "when I tried", "what caught my attention"

**CONTENT ALIGNMENT 2/2 — STYLE/TONE/DIRECTIVE LOCK:**

Alignment = konten harus TEPAT seperti yang campaign minta. Bukan "mirip" tapi "PAS".

**Alignment Checklist (WAJIB lulus SEMUA):**
- [ ] Topic: nama project/fitur/milestone dari campaign tercantum → ✅ atau ❌
- [ ] Tone: cocok dengan style energy level (HIGH=banger bold, MEDIUM=casual, LOW=analytical) → ✅ atau ❌
- [ ] Directive: ikuti mission directive (celebrate=excitement, discuss=balanced, review=critical) → ✅ atau ❌
- [ ] Style: kalimat pertama dan terakhir REFLECT style field → ✅ atau ❌
- [ ] Requirements: semua requirements dari campaign terpenuhi → ✅ atau ❌
- [ ] contentType: format sesuai (tweet/reply/thread) → ✅ atau ❌

**Jika ada SATU item ❌ → REWRITE sebelum submit ke judge.**

**CAMPAIGN COMPLIANCE 2/2 — ZERO VIOLATION PROTOCOL:**

Satu violation = gate FAIL. Ini non-negotiable.

**Pre-Submit Compliance Scan (WAJIB lulus SEMUA):**
1. [ ] Cek prohibited items: bandingkan SETIAP kata di konten dengan daftar prohibitedItems
2. [ ] Cek banned words (21): guaranteed, guarantee, 100%, risk-free, dll
3. [ ] Cek Rally banned phrases (17): vibe coding, skin in the game, dll
4. [ ] Cek AI-sounding words (26): delve, leverage, dll
5. [ ] Cek template phrases (21): key takeaways, let's dive in, dll
6. [ ] Cek AI pattern phrases (16): on the other hand, at its core, dll
7. [ ] Cek banned starters (8): honestly, like, kind of wild, dll
8. [ ] Cek dashes: scan untuk — (em-dash), – (en-dash), -- (double-hyphen)
9. [ ] Cek quotes: pastikan semua "" (straight), bukan "" (smart)
10. [ ] Cek ellipsis: pastikan ... (triple dot), bukan … (Unicode)
11. [ ] Cek character limit: jika ada, hitung karakter termasuk spasi
12. [ ] Cek contentType: tweet = standalone, reply = respons, thread = connected tweets
13. [ ] Cek additionalInfo: semua instruksi tambahan dipatuhi
14. [ ] Cek requirements: semua requirements terpenuhi

**Jika ada SATU item ❌ → FIX sebelum submit ke judge.**

**ENGAGEMENT POTENTIAL 5/5 — VIRAL-WORTHY CONTENT FORMULA:**

Skor 5/5 = konten yang reader TIDAK BISA skip. Setiap elemen harus memaksa engagement.

**Hook Formula (WAJIB salah satu):**
- **Contrast Hook**: "[Everyone/Common belief] BUT [contrary reality]" → "Everyone's building on Solidity. GenLayer said nah."
- **Discovery Hook**: "[Specific moment] + [surprising finding]" → "was reading the docs at 2am and found something nobody mentions"
- **Question Hook**: "[Genuine question with no obvious answer]" → "why is nobody talking about [specific thing]?"
- **Claim Hook**: "[Bold, specific claim]" → "GenLayer just made Python a first-class citizen for smart contracts"

**Body Formula (WAJIB):**
- **Specific facts as ammunition**: Setiap klaim didukung fakta dari KB/website. "3 testnet validators" > "some validators"
- **Emotional current**: Excitement, curiosity, atau provocation. Konten HARUS punya emosi, bukan sekadar informatif.
- **Concise impact**: Setiap kalimat harus punya guna. Hapus kalimat yang bisa dihapus tanpa kehilangan makna.

**Ending Formula (WAJIB salah satu):**
- **Genuine question**: "I genuinely can't figure out [specific thing]. Anyone?" — pertanyaan TANPA jawaban
- **Provocative statement**: "[Claim]. If I'm wrong, tell me why." — mengundang debate
- **Self-doubt**: "maybe I'm overthinking this but [concern]" — vulnerability = relatability
- **Uncertainty**: "not sure where this goes from here but it's worth watching" — open-ended

**TECHNICAL QUALITY 5/5 — READ-ALOUD TEST:**

Konten HARUS terasa natural saat dibaca keras-keras. Bukan essay, bukan laporan, tapi TWEET.

**Read-Aloud Checklist:**
- [ ] Tidak ada kalimat yang terasa "terlalu formal" atau "terlalu structured"
- [ ] Tidak ada kalimat yang membuat reader tersentak karena awkward phrasing
- [ ] Pergantian antar paragraf terasa natural, bukan forced
- [ ] Kalimat pendek dan panjang bergantian secara natural
- [ ] Tidak ada kata yang terasa "dipaksakan" atau "terlalu fancy"
- [ ] Punctuation terasa natural (bukan terlalu banyak koma atau terlalu sedikit)
- [ ] Jika dibaca keras-keras, terdengar seperti seseorang yang sedang bicara, bukan menulis

**REPLY QUALITY 5/5 — DISCUSSION DEPTH FORMULA (v9.4 UPGRADE):**

**MASALAH FUNDAMENTAL:** Hanya 38% top content mencapai Reply Quality 5/5. Ini dimensi PALING sulit karena membutuhkan pertanyaan yang TIDAK terasa dipaksakan. Pendekatan lama (3-Layer Question Stack terpisah) sering terlalu panjang dan formal.

**TEKNIK BARU v9.4 — COMPRESSED AUTHENTICITY:**

Alih-alih 3 paragraf terpisah, KOMPRES semua elemen menjadi 1-2 kalimat natural. Tujuannya: pertanyaan yang terasa seperti bagian dari alur pemikiran, BUKAN appendix di akhir.

**Teknik 1: "Embedded Uncertainty" (terbaik untuk casual/banger):**
Tanam keraguan di TENGAH kalimat, bukan di akhir. Pertanyaan muncul secara organis sebagai bagian dari pemikiran.
- ❌ LAMA: "I noticed X. What I can't figure out is Y. I say this as someone who Z." (3 kalimat, terpisah, formal)
- ✅ BARU: "ok so I've been reading about [X] and I genuinely can't tell if [Y] is actually gonna work or if it's just theory" (1 kalimat, natural, embedded)
- Kenapa lebih baik: mengalir seperti pemikiran, bukan seperti checklist

**Teknik 2: "Provocative Challenge" (terbaik untuk banger/edgy):**
Gantikan pertanyaan dengan statement yang mengundang disagreement. Ini lebih natural untuk banger style.
- ❌ LAMA: "What do you think about [X]?" (weak, generic)
- ✅ BARU: "I might be completely wrong about this but [bold take]. someone change my mind" (strong, invites response)
- Kenapa lebih baik: challenge > question untuk banger. Lebih genuine.

**Teknik 3: "Micro-Question" (terbaik untuk factual/analytical):**
Pertanyaan sangat spesifik yang hanya bisa dijawab oleh orang yang BENAR-BENAR paham.
- ❌ LAMA: "What are the implications of [X]?" (terlalu luas, academic)
- ✅ BARU: "does [specific thing] mean [specific implication] or am I reading this wrong" (spesifik, humble)
- Kenapa lebih baik: menunjukkan depth tanpa kesan professor

**Teknik 4: "Implicit Invitation" (terbaik untuk celebration):**
Untuk celebration, TIDAK PERLU pertanyaan langsung. Buat statement yang secara natural mengundang orang share experience mereka.
- ❌ LAMA: "What are you most excited about?" (generic, forced excitement)
- ✅ BARU: "if [X] actually delivers on [Y] this could be one of those 'remember where you were' moments" (natural, shareable)
- Kenapa lebih baik: orang secara natural mau reply "yeah I remember when..." tanpa diminta

**The 3-Layer Question Stack (STILL VALID — untuk variation Factual/Technical):**
1. **Layer 1 - Specific observation**: "I noticed [specific thing from KB/website]" — shows you actually read the material
2. **Layer 2 - Genuine uncertainty**: "what I can't figure out is [specific question with NO obvious answer]" — this is the CORE
3. **Layer 3 - Self-positioning**: "I say this as [someone who's actually interested / someone who tried it / someone who's been watching]" — shows genuine stake

**KAPAN PAKAI TEKNIK MANA:**
- Style energy HIGH (banger) → Teknik 2 (Provocative Challenge) atau Teknik 1 (Embedded Uncertainty)
- Style energy MEDIUM (casual) → Teknik 1 (Embedded Uncertainty) atau Teknik 3 (Micro-Question)
- Style energy LOW (analytical) → Teknik 3 (Micro-Question) atau 3-Layer Stack (original)
- Celebration Mode → Teknik 4 (Implicit Invitation)
- ⚠️ DIMENSION COMPATIBILITY: Lihat Dimension Compatibility Rules di MAX-OUT PROTOCOL. Banger + explicit question = forced.

**Avoid These Reply Killers (STILL BANNED):**
- ❌ "What do you think?" — terlalu generic, tidak menunjukkan depth
- ❌ "Thoughts?" — sama, generic
- ❌ Rhetorical question lalu jawab sendiri — Reply Quality killer #1
- ❌ "Am I the only one who..." — template phrase
- ❌ "Anyone?" / "Curious?" — terlalu ringkas, tidak menunjukkan genuine interest
- ✅ "can someone who actually built on this tell me if [specific concern]?" — specific, genuine
- ✅ "genuinely asking: does [specific thing] actually work in practice or is it just theory?" — shows real curiosity
- ✅ "ok but real talk: [specific concern]. is that just me or..." — casual, genuine uncertainty

---

### STEP 5.7: Content Quality DNA (v9.4 — WAJIB sebelum Step 6)

**⚠️ v9.5 CONTEXT-SAVING MODE — STEP INI SILENT (tidak output ke user)**
Untuk menghemat context window, Step 5.7 diproses SECARA INTERNAL. TIDAK menampilkan output template ke user. Hasilnya disimpan ke checkpoint (`data.content_dna`) dan digunakan langsung di Step 6.

**Cara eksekusi:**
1. Jawab 5.7a-5.7d SECARA MENTAL (di AI "thinking", bukan di output)
2. Simpan hasil DNA ke checkpoint
3. Gunakan DNA saat menulis konten di Step 6 (TIDAK perlu menampilkan DNA ke user)
4. Langsung lanjut ke Step 6

**⏱ Estimated time: 15-20 seconds** (internal processing — no external calls)

**TUJUAN:** Mengatasi "Over-Constraint Paralysis" dan "Template Paradox" dengan memberikan AI sebuah "emotional anchor" dan "writing DNA" SEBELUM mulai menulis. Ini adalah JEMBATAN antara data (Steps 1-5) dan kreativitas (Step 6).

**MASALAH YANG DI-SOLVE:**
- AI punya terlalu banyak checklist dan formula → jadi paranoid → konten kaku
- Hook formula (Contrast/Discovery/Question) = template → kontradiksi dengan Originality
- Pre-writing terlalu analitis → konten terasa seperti laporan, bukan tweet

**After this step completes:** Update checkpoint: add `5.7` to `completed_steps`, save DNA to `data.content_dna`.

```
═══ STEP 5.7: CONTENT QUALITY DNA ═══

5.7a. EMOTIONAL ANCHOR — Apa PERASAAN yang harus reader rasakan?

Bukan "apa yang harus reader tahu" (itu data). Bukan "apa yang harus reader lakukan" (itu CTA).
Tapi "apa EMOSI SPESIFIK yang harus muncul setelah baca konten ini?"

PILIH SATU emotional anchor (dan HANYA satu):
  a. CURIOSITY — "wait, I need to look into this more"
  b. EXCITEMENT — "ok this is actually interesting, I should pay attention"
  c. PROVOCATION — "hmm I disagree with this, let me reply"
  d. VALIDATION — "yes! someone finally said what I was thinking"
  e. DISCOVERY — "I had no idea this was a thing"

Emotional anchor: [a/b/c/d/e]
Kenapa: [1 kalimat — dasarnya dari style energy + mission directive]

KONSTRUKSI:
- Style HIGH + directive celebrate → EXCITEMENT
- Style HIGH + directive discuss → PROVOCATION
- Style MEDIUM + directive discuss → CURIOSITY
- Style LOW + directive discuss → DISCOVERY
- Style MEDIUM + directive celebrate → VALIDATION

5.7b. WRITING DNA — Bagaimana KARAKTER penulis yang menulis ini?

Bukan persona AI. Bukan template. Tapi SATU KARAKTER spesifik yang menulis tweet ini.
Bayangkan orang ini dan TULIS DARI PERSPEKTIF mereka.

Definisikan:
- Siapa: [1 deskripsi — misal: "dev yang baru coba teknologi ini dan surprised", "crypto OG yang sudah lihat banyak hal", "random user yang penasaran"]
- Suara: [kata pertama yang akan mereka pakai — misal: "ok so", "wait", "ngomong-ngomong", "baru baca"]
- Energy: [sesuai style energy dari Step 4.5, tapi dalam bentuk persona — misal: "excited tapi bukan fanboy", "skeptis tapi genuinely curious"]
- Tabu: [apa yang karakter ini TIDAK AKAN PERNAH bilang — misal: "this is the future", "game changer", "nggak akan pernah bilang 'delve'"]

5.7c. FIRST THOUGHT — Apa HAL PERTAMA yang terlintas di pikiran ketika baca tentang campaign ini?

INI BUKAN hook. Ini BUKAN formula. Ini adalah GENUINE reaksi pertama.
Tulis persis seperti yang terlintas di pikiran, tanpa filter:

"[genuine first thought — bisa jadi 1 kata, bisa jadi 1 kalimat, bisa jadi pertanyaan]

CONTOH:
- "wait they're doing WHAT with python"
- "ok this ve(3,3) thing is actually kinda genius if it works"
- "serius? ini belum ada yang bikin?"
- "hmm but what if validators disagree tho"

⚠️ ATURAN: First thought HARUS:
  - Spontan (bukan hasil analisis)
  - Spesifik (bukan generic "interesting project")
  - Autentik (sesuai karakter dari 5.7b)
  - TIDAK menggunakan kata AI atau template
  - BISA JADI HOOK atau BUKAN hook (tidak dipaksakan)

5.7d. DNA SUMMARY — Satu baris yang merangkum konten ini

Format: [emotional anchor] + [first thought] + [character voice]

CONTOH: "Provocative + 'ok so they're building AI courts?' + casual dev who just found something interesting"

═══ CONTENT DNA READY ═══
Emotional Anchor: [dari 5.7a]
Writing Character: [dari 5.7b]
First Thought: [dari 5.7c]
DNA Summary: [dari 5.7d]

⚠️ GUNAKAN DNA INI saat menulis SETIAP variasi di Step 6.
Konten HARUS terasa seperti ditulis oleh karakter dari 5.7b,
mengundang emosi dari 5.7a,
dan memulai dengan energy dari 5.7c.
```

**⚠️ RULES untuk Step 5.7:**
1. **WAJIB diisi** — tidak boleh skip
2. **Hasilnya HARUS mempengaruhi Step 6** — setiap variasi harus memancarkan DNA ini
3. **First thought TIDAK HARUS jadi hook** — tapi jika natural, itu hook terbaik yang pernah ada
4. **Jika AI merasa "DNA ini tidak cocok"** → itu tandanya AI masih berpikir template. DNA TIDAK punya cocok atau tidak cocok. DNA adalah fondasi, bukan template.

---

### STEP 6: Generate 3 Content Variations

**⏱ Estimated time: 30-60 seconds**

**🧠 AI CAPABILITIES — WAJIB AKTIF saat menulis konten:**
- **Think mode: ON** — AI harus berpikir mendalam sebelum menulis setiap variasi. Pertimbangkan: apakah hook ini unik? apakah ada AI fingerprint? apakah semua fakta dari KB + website? apakah counter-point sudah ada? apakah style energy level cocok?
- **Web Search: ON** — AI boleh mencari info tambahan untuk memperkaya konteks (berita terbaru, tren, dll). TAPI hasil pencarian TIDAK menggantikan KB sebagai sumber fakta. Aturan anti-fabrication tetap berlaku: jika suatu klaim TIDAK ada di KB, gunakan bahasa vagu ("growing fast", "quite a few") meskipun web search menemukan angka spesifik.
- **Kenapa:** Think mode memastikan AI menulis dengan kesadaran penuh (bukan autopilot). Web search memastikan AI punya konteks terkini tentang campaign/project.

After you FULLY understand the campaign, calibration data, competitive intel, pre-writing perspective, write 3 X/Twitter posts. Each with a different angle:

**After this step completes:** Update checkpoint: add `6` to `completed_steps`, save variations to `data.variations`.

**⚠️ CONTEXT CRITICAL:** Step 6 menghasilkan output yang relatif besar (3 variasi). Pastikan checkpoint sudah tersimpan sampai step 5 SEBELUM mulai step 6.

**🚨 TYPING RULE (EN DASH / EM DASH / SMART QUOTES = AUTO-FAIL):
Saat menulis konten di step ini, kamu HARUS menggunakan karakter keyboard standar saja:
- Dash: gunakan REGULAR HYPHEN (-) atau TIDAK USAH pakai dash sama sekali (pisah kalimat dengan period/comma)
- DILARANG KERAS: en dash (–), em dash (—), double-hyphen (--) sebagai dash
- DILARANG KERAS: smart/curly quotes (" ") — gunakan straight quotes ("")
- DILARANG KERAS: Unicode ellipsis (…) — gunakan tiga dots (...)
Konten yang mengandung en dash/em dash akan otomatis kena G4 penalty -1.5 DAN judge akan flag sebagai AI-generated.
Jika ragu, tulis kalimat terpisah dengan period. Lebih baik 2 kalimat pendek daripada 1 kalimat dengan en dash.**

**⚠️ CRITICAL: Gunakan SEMUA data yang sudah dikumpulkan:**}, {
- Knowledge Base (campaign + mission level)
- Website content dari Step 1d
- Reference tweet content (jika berhasil dibaca)
- Competitive gap dari Step 3
- Calibration weak categories dari Step 2
- **Deep Campaign Analysis dari Step 4.5** — core message, value props, must-include facts, category strategy
**Data yang tidak digunakan = data yang terbuang. WAJIB gunakan semua.**

**⚡ VARIATION SELECTION (based on style energy level from Step 4.5 #4):**

**⚠️ v9.4 UPDATE: Free Write variation SELALU ada (1 slot reserved).** Lihat tabel variasi di atas untuk pemilihan lengkap.

**Jika Style Energy = HIGH (banger/bold/hype):**
- Jika mission directive = celebrate/hype/launch (Step 4.5 #7): Gunakan variasi **Free Write, Celebration, dan Banger**
- Jika mission directive = discuss/review/critique: Gunakan variasi **Free Write, Banger, dan Edgy**

**Jika Style Energy = MEDIUM (casual/conversational):**
- Jika mission directive = celebrate/hype/launch: Gunakan variasi **Free Write, Celebration, dan Gap**
- Jika mission directive = discuss/review/critique: Gunakan variasi **Free Write, Gap, dan Question**

**Jika Style Energy = LOW (analytical/informative):**
- Jika mission directive = celebrate/hype/launch: Gunakan variasi **Free Write, Celebration, dan Factual**
- Jika mission directive = discuss/review/critique: Gunakan variasi **Free Write, Factual, dan Question**

**Free Write variation WAJIB selalu ada** — ini adalah variasi dengan probabilitas Originality 2/2 tertinggi.
**Gap variation sangat direkomendasikan** — ini menggunakan competitive gap dari Step 3.

---

**Variation: ⚡ BANGER (HIGH ENERGY):**
- Focus: maximum impact per word. Every sentence must PUNCH.
- Tone: high conviction, bold, no hesitation. Like someone who KNOWS.
- Style: short punchy sentences. No filler. No explanation. Just impact.
- Hook formula: bold statement with contrast or surprise
  → "Everyone's doing [X]. [Campaign] said nah."
  → "[Campaign] just did something no other [category] dares to do"
- MUST use: specific facts from KB AND website as weapons (short triads)
- MUST avoid: ALL overused phrases from competitive analysis
- MUST apply: ALL 7 techniques from "Banger Style" in Step 5.6
- Structure: Bold opener → 1-2 punchy evidence lines → drop-the-mic closer
- When to use: Style energy HIGH, or campaign style suggests "banger/bold/hype"

**Variation: 🎯 GAP (COMPETITIVE DIFFERENTIATION):**
- Focus: the angle NOBODY else is using — the gap from Step 3 competitive analysis
- Tone: curious discovery — "I noticed something nobody's talking about"
- Hook formula: gap angle → "everyone's focused on [overused topic] but here's what actually matters..."
- MUST use: the competitive gap angle from Step 3 (e.g., "validator disagreement", "Python not Solidity")
- MUST include: facts from website/links that support this unique angle
- MUST avoid: ALL overused phrases identified in Step 3
- Structure: Gap observation → supporting evidence from KB/website → open question about implications
- This variation is the BEST shot at Originality 2/2 because nobody else is using this angle

**Variation: 📊 FACTUAL/TECHNICAL:**
- Focus: specific features, numbers, technical details from Knowledge Base + website
- Tone: informed observer who knows the tech
- Use VERIFIED facts only (from KB + website/links). For unverified facts, use vague language.
- Hook formula: specific moment + concrete number from KB → "was reading the [doc/page] last night and found [X specific detail]"
- What to AVOID: generic praise ("this is amazing"), no specific data, promotional language
- Structure: Hook → 2-3 specific observations → genuine question about implications

**Variation: 🔥 EDGY/OPINIONATED:**
- Focus: strong take, provocative statement that challenges consensus
- Tone: crypto-native, slightly skeptical but curious, NOT a hater
- Include genuine counter-point based on campaign type strategy (Step 5.5)
- Hook formula: unpopular observation → "everyone's hyping [X] but here's what nobody mentions..."
- What to AVOID: being contrarian for the sake of it (must have real basis), generic FUD
- Structure: Bold claim → evidence from KB → self-doubt closing ("maybe I'm wrong but...")

**Variation: ❓ QUESTION/HOOK:**
- Focus: bold question or statement that sparks genuine discussion
- Tone: curious explorer, genuinely wants to know the answer
- Start with the most interesting/surprising aspect, NOT background context
- Hook formula: gap in knowledge → "I can't figure out [specific thing about campaign] and it's bugging me"
- What to AVOID: rhetorical questions you immediately answer, generic "what do you think?"
- Structure: Surprising observation → specific question (no obvious answer) → 1-2 follow-up questions

**Variation: 🎉 CELEBRATION (HIGH ENERGY POSITIVE — only when mission directive = celebrate/hype/launch):**
- Focus: pure excitement about the campaign/milestone. Maximum positive energy.
- Tone: genuine enthusiasm — like someone who's ACTUALLY excited, not paid to hype
- Hook formula: moment of realization → "wait [campaign] just did WHAT" or "ok so [campaign] literally just [achievement] and nobody's talking about it"
- MUST use: specific facts from KB as celebration anchors (specific feature, specific milestone)
- MUST match: mission directive from Step 4.5 #7 (celebrate, announce, hype)
- MUST avoid: skepticism, doubt, "but", "however", "concerns", "risks" — CELEBRATION MODE has NO counter-point
- MUST sound: like a real person who's genuinely pumped, not a marketing bot
- Structure: Hype opener → specific achievement/fact → genuine excitement → "can't wait to see what's next" closer
- Human touch: self-correction works here too ("actually nvm this is actually huge"), uncertainty about the future ("where does this go from here tho"), stream of consciousness excitement
- When to use: ONLY when Step 4.5 #7 identifies mission directive as celebrate/hype/launch
- When NOT to use: if mission is "discuss", "review", "critique", or any analytical directive

**Variation: 🧬 FREE WRITE (v9.4 — NO FORMULA, NO TEMPLATE, PURE INSTINCT):**
- **TUJUAN:** Memecahkan "Template Paradox". Ini adalah variasi yang PALING MUNGKIN mendapat Originality 2/2 karena TIDAK mengikuti formula apapun.
- **APA INI:** Tulis seperti kamu lagi ngetweet secara spontan, tanpa thinking tentang scoring, tanpa checklist, tanpa formula hook.
- **MUST use: Content DNA dari Step 5.7** — emotional anchor + writing character + first thought. Tulis DARI PERSPEKTIF karakter tersebut.
- **MUST NOT:** Mengikuti hook formula apapun (Contrast/Discovery/Question/Claim). TIDAK BOLEH ada formula. Hanya tulis.
- **MUST NOT:** Menyusun struktur (Hook → Body → Ending). Biarkan konten mengalir secara natural.
- **Tone:** 100% dari karakter di Step 5.7b. Jika karakternya "dev yang surprised", tulis seperti dev yang surprised.
- **Length:** SAMPAI SELESAI. Bukan panjang tertentu. Bisa 2 kalimat, bisa 5 kalimat. Biarkan kontennya menentukan.
- **Kenapa ini bekerja untuk Originality:** Formula = predictable = AI fingerprint. NO formula = unpredictable = human.
- **Kenapa ini bekerja untuk Natural Flow:** Tanpa struktur yang di-paksa, kalimat mengalir lebih natural.
- **Kapan ini BEBALIK:** Ketika hasilnya terlalu pendek (< 50 chars), terlalu generic ("interesting project"), atau tidak membahas campaign sama sekali. Dalam kasus ini, tetap jangan pakai formula, tapi expand dengan menambahkan detail spesifik dari KB.
- **Rule:** Free Write variation WAJIB selalu ada di SETIAP generasi. Ini bukan opsional.

**⚡ v9.4 UPDATED VARIATION SELECTION:**

**Rule BARU: Free Write SELALU ada (1 slot reserved). Sisa 2 slot dari variasi lain.**

| Style Energy | Directive | Variasi 1 | Variasi 2 | Variasi 3 |
|---|---|---|---|---|
| HIGH | celebrate | 🧬 Free Write | 🎉 Celebration | ⚡ Banger |
| HIGH | discuss/review | 🧬 Free Write | ⚡ Banger | 🔥 Edgy |
| MEDIUM | celebrate | 🧬 Free Write | 🎉 Celebration | 🎯 Gap |
| MEDIUM | discuss/review | 🧬 Free Write | 🎯 Gap | ❓ Question |
| LOW | celebrate | 🧬 Free Write | 🎉 Celebration | 📊 Factual |
| LOW | discuss/review | 🧬 Free Write | 📊 Factual | ❓ Question |

**⚠️ Kenapa Free Write selalu #1:** Ini variasi dengan probabilitas Originality 2/2 tertinggi. Dengan menulisnya pertama, AI membangun "creative momentum" yang membuat variasi 2 dan 3 juga lebih natural.

**ALL variations MUST follow these rules:**

**⚠️ v9.4 DNA RULE: SETIAP variasi HARUS memancarkan Content DNA dari Step 5.7.** Konten harus terasa seperti ditulis oleh karakter yang sama (Step 5.7b), mengundang emosi yang sama (Step 5.7a), dan memulai dengan energy dari first thought (Step 5.7c). Jika variasi terasa seperti ditulis oleh "AI yang beda" → DNA tidak terpancar → REWRITE.

**CONTENT RULES:**
1. **Length**: ONLY enforce character limit if the campaign API explicitly provides `characterLimit`.
   - If `characterLimit` is present: use that exact number
   - If `characterLimit` is NOT present: NO LIMIT -- write freely
   - NEVER default to 200-280 or any arbitrary number
2. **Must mention**: The campaign name or key entity from the campaign
3. **Counter-point CONDITIONAL** (bukan blanket rule):
   - **DEFAULT**: Include genuine counter-point atau skepticism — ini membuat konten lebih credible.
   - **EXCEPTION — CELEBRATION MODE**: Jika Step 4.5 #7 mengidentifikasi mission directive sebagai "celebrate", "announce launch", "spread positive awareness", atau jika style field secara eksplisit meminta tone positif/celebratory → COUNTER-POINT TIDAK WAJIB.
   - **KENAPA**: Kampanye peluncuran produk ingin hype dan celebrasi, bukan skeptisisme. Memaksa counter-point pada konten celebratory = Content Alignment FAIL.
   - **Jika CELEBRATION MODE**: Fokus pada excitement, conviction, dan energy. Setiap kalimat harus positif dan impactful.
   - **TETAP**: Jangan jadi fanboy blindly — konten tetap harus terasa genuine, bukan shilling.
   - **Cara cek**: Lihat Step 4.5 #7 "Mission directive" dan #4 "Style energy". Jika directive = celebrate/hype/launch DAN style energy = HIGH → CELEBRATION MODE = ON.
4. **Use VERIFIED facts from Knowledge Base AND website/links**: Numbers, names, dates from KB + website content from Step 1d are safe. Reference tweets (if readable) provide tone/angle context.
   - Unverified claims = use vague language ("a bunch of", "growing fast")
   - NEVER fabricate numbers, partnerships, follower counts, team members not in KB or website
   - **⚠️ WAJIB gunakan data dari website/links** — ini bukan opsional. Data dari Step 1d harus masuk ke konten.
5. **Follow the `style` field**: If campaign says "casual", write casual. If "banger", write with HIGH ENERGY (apply Banger Style techniques from Step 5.6). Match style energy level from Step 5b.
6. **Respect `contentType`:**
   - If "tweet": write as standalone tweet (no @mention prefix)
   - If "reply": write as a reply to the reference tweet from campaign rules
     * Start with a brief acknowledgment of the original tweet's point
     * Add your own perspective (not just agreement)
     * Keep it conversational, like you're responding to a real person
     * DO NOT quote the entire original tweet — just reference its key point
     * Length: usually shorter than a standalone tweet (reply context counts)
   - If "thread": write 2-4 connected tweets, each expanding on the previous (see Step 11 thread format)
7. **Human artifacts** (at least 3 per variation):
   - Lowercase emphasis on a normally-capitalized word (e.g., "bitcoin" instead of "Bitcoin")
   - Run-on sentence (no proper grammar break)
   - Sentence fragment (2-4 words) after longer text
   - Casual connector ("tho", "but wait", "ngomong-ngomong")
   - Self-correction ("eh wait actually...", "nah scratch that")
   - Genuine uncertainty
   - Stream-of-consciousness moment
8. **Single post only**, 1-3 paragraphs, no thread (unless contentType = thread)
9. **Each variation must sound like a DIFFERENT person wrote it**
10. **Must NOT use ANY prohibited items** from the `prohibitedItems` field
11. **Competitive differentiation**:
    - **⚠️ WAJIB**: Gunakan competitive gap dari Step 3 di minimal 1 variasi (variasi Gap)
    - JANGAN gunakan overused phrases dari competitive analysis
    - Setiap variasi harus punya angle yang BERBEDA dari pesaing

**ANTI-AI RULES (ZERO TOLERANCE):**

**⚠️ v9.5 TIER SYSTEM — Prioritas aturan untuk efisiensi scanning:**
```
TIER 1 — INSTANT GATE FAIL (wajib scan PERTAMA, 1 violation = Compliance 0/2):
  → Prohibited items dari campaign API
  → Banned financial words (21 items)
  → Rally banned phrases (17 items)

TIER 2 — MUST FIX sebelum submit (score penalty jika ada, tapi bukan gate fail):
  → AI-sounding words (26 items) — Originality max 1/2
  → Template phrases (21 items) — Originality max 1/2
  → Banned starters (8 items) — Originality penalty
  → En-dash / Em-dash / Double-hyphen — G4 penalty -1.5 + Compliance check
  → Smart quotes / Unicode ellipsis — Technical Quality penalty

TIER 3 — SCORE PENALTY (mempengaruhi quality score, bukan gate):
  → AI pattern phrases (16 items) — minor penalty
  → Sentence structure patterns — Originality penalty
  → Uniform paragraph lengths — Originality penalty

PRIORITY ORDER saat scanning: Tier 1 → Tier 2 → Tier 3
Jika Tier 1 violation ditemukan → STOP scanning, FIX dulu
Jika Tier 2 violation → FIX sebelum submit
Jika Tier 3 violation → perbaiki jika bisa, jangan mengorbankan natural flow
```

**TIER 1 — INSTANT GATE FAIL (21 + 17 = 38 items):**

**Banned words (21 items -- INSTANT FAIL):**
guaranteed, guarantee, 100%, risk-free, sure thing, financial advice, investment advice, buy now, sell now, get rich, quick money, easy money, passive income, follow me, subscribe to my, check my profile, click here, limited time offer, act now, legally binding, court order, official ruling

**Rally-specific banned phrases (17 items -- INSTANT FAIL):**
vibe coding, skin in the game, trust layer, agent era, agentic era, structural shift, capital efficiency, how did I miss this, losing my mind, how are we all sleeping on this, don't miss out, designed for creators that desire, transforming ideas into something sustainable, entire week, frictionless, acceptable originality

NOTE: "intelligent contracts" is conditionally banned. If the campaign's Knowledge Base mentions "Intelligent Contracts" as a core concept (e.g., GenLayer campaigns), it is ALLOWED. Otherwise, flag it.

**AI-sounding words (26 items -- TIER 2: score penalty):**
delve, leverage, realm, tapestry, paradigm, landscape, nuance, underscores, pivotal, crucial, embark, journey, explore, unlock, harness, foster, utilize, elevate, streamline, empower, moreover, furthermore, consequently, nevertheless, notably, significantly, comprehensive

**Template phrases (21 items -- TIER 2: score penalty):**
unpopular opinion:, hot take:, thread alert:, breaking:, this is your sign, psa:, reminder that, quick thread:, important thread:, drop everything, stop scrolling, hear me out, let me explain, nobody is talking about, story time:, in this thread i will, key takeaways:, here's the thing, imagine a world where, picture this:, let's dive in, at the end of the day, it goes without saying

**AI pattern phrases (16 items -- TIER 3: minor penalty):**
picture this, let's dive in, in this thread, key takeaways, here's the thing, imagine a world, it goes without saying, at the end of the day, on the other hand, in conclusion, at its core, the reality is, it's worth noting, make no mistake, the bottom line is, here's what you need to know

**Banned starters (8 items -- TIER 2: score penalty):**
honestly, like, kind of wild, ngl, tbh, tbf, fr fr, lowkey

**Additional restrictions:**
- No numbered lists or bullet points in content
- Max 1 emoji, max 2 hashtags
- NO em-dashes (--) -- this includes double-hyphen (--) used as em-dash substitute. Period.
- NO en-dashes, NO em-dashes, NO double-hyphens used as dash substitutes
- If you need to separate clauses, use a period, comma, or start a new sentence
- Straight quotes ("") not smart quotes (" ")
- Three dots (...) not Unicode ellipsis
- No zero-width characters
- **CRITICAL for Reply Quality**: Content MUST end with a genuine open question that invites real discussion. NOT a rhetorical question that the author immediately answers. The question should have no obvious answer so others feel compelled to respond.

**SANITIZATION (apply to ALL content before checking):**
1. REMOVE all em-dash characters (—, \u2014) entirely
2. REMOVE all en-dash characters (–, \u2013) entirely
3. REMOVE all double-hyphens (--) when used as dash substitute -- replace with period or new sentence
4. Replace smart/curly quotes with straight quotes
5. Replace Unicode ellipsis with three dots (...)
6. Replace non-breaking spaces with regular space
7. Remove zero-width characters
8. Trim leading/trailing whitespace per line
9. Collapse multiple spaces to single space
10. Collapse multiple newlines to max 2
11. Strip wrapping quotes
12. Remove markdown bold/italic formatting
13. Strip curly braces

**IMPORTANT**: Before writing, re-read the Campaign Brief's rules, prohibited items, requirements, additionalInfo, style, character limit, AND competitive intel. Make sure your content complies with ALL of them and differentiates from competitors.

**ALSO**: Apply the Proven Category-Maxing Techniques from Step 5.6 to each variation. Specifically:
- Every variation should use a personal specific moment opener (Step 5.6 Engagement #1)
- Every variation should end with genuine open questions the author cannot answer (Step 5.6 Reply Quality #1-4)
- Every variation should find a different angle than competitors (Step 5.6 Originality #1)
- Each variation should use a different technique for each category where possible

Present the 3 variations (use variation type names, not A/B/C):
```
VARIATIONS:
[⚡ Banger] "[content]" ([N] chars -- limit: [characterLimit])
[🎯 Gap]    "[content]" ([N] chars -- limit: [characterLimit])
[🔥 Edgy]   "[content]" ([N] chars -- limit: [characterLimit])

**⚠️ BANGER ENFORCEMENT ( jika style energy = HIGH dari Step 4.5 #4 ):**
Jika style field mengatakan "Post a banger!" atau style energy = HIGH, ATURAN TAMBAHAN berlaku untuk SEMUA variasi (bukan hanya variasi Banger):

- Setiap kalimat HARUS punya IMPACT — bukan sekadar informatif
- Tidak boleh ada kalimat yang "hanya menjelaskan" tanpa emotion/conviction
- Hook HARUS memaksa reader berhenti scroll (bold statement, surprise, atau provocation)
- Ending HARUS memicu respon (question, challenge, atau mic drop)
- Jika variasi tidak memenuhi syarat banger → REWRITE sebelum submit ke judge

**⚠️ REFERENCE TWEET ENFORCEMENT (jika reference tweet tersedia):**
- Jika contentType = "reply" → konten HARUS merespons point spesifik dari reference tweet
- Jika contentType = "tweet" DAN reference tweet tersedia → minimal 1 variasi HARUS mereferensi angle/fact dari reference tweet
- Fakta dari reference tweet HARUS masuk ke anti-fabrication whitelist

**⚠️ COMPETITIVE GAP ENFORCEMENT:**
- Variasi Gap HARUS menggunakan angle yang TIDAK dipakai kompetitor (dari Step 3)
- Jika competitive analysis menemukan "semua orang fokus pada X" → variasi Gap HARUS fokus pada Y

⚠️ Data usage check:
- KB facts used: [list facts from KB that appear in variations]
- Website/links facts used: [list facts from website/links]
- Competitive gap angle used: [yes/no — which variation]
- Reference tweet tone matched: [yes/no]
- Overused phrases avoided: [list phrases that were intentionally NOT used]
```

---

### STEP 6.5: MAX-OUT Self-Verification (PRE-JUDGE — WAJIB sebelum Step 7)

**⚠️ v9.5 CONTEXT-SAVING MODE — STEP INI SEMI-SILENT**
Untuk menghemat context, Step 6.5 hanya menampilkan RINGKASAN hasil (bukan full checklist). Full checklist diproses internal. Jika ada FAIL → tampilkan detail spesifik yang FAIL. Jika semua PASS → tampilkan ringkasan 1 baris.

**⏱ Estimated time: 15-30 seconds** (internal processing — no external calls)

**INI ADALAH GATE TERPENTING. Konten yang TIDAK lulus MAX-OUT verification TIDAK BOLEH dikirim ke judge.**

**TUJUAN**: Pastikan SETIAP variasi punya potensi skor MAKSIMAL di SETIAP dimensi SEBELUM judge menilai. Lebih baik rewrite 1 menit di sini daripada buang 3 menit di feedback loop.

**After this step completes:** Update checkpoint: add `6.5` to `completed_steps`.

```
═══ STEP 6.5: MAX-OUT SELF-VERIFICATION ═══

Untuk SETIAP variasi (A, B, C), jalankan checklist di bawah ini:

⚠️ v9.4 DNA CHECK (sebelum checklist dimensi):
  [ ] Variasi ini memancarkan Content DNA dari Step 5.7? → YA/TIDAK
  [ ] Emotional anchor terasa di konten? → YA/TIDAK
  [ ] Writing character konsisten (suara/energy sama dari awal sampai akhir)? → YA/TIDAK
  [ ] Jika Free Write: TIDAK mengikuti formula hook? → YA/TIDAK

VARIASI [A/B/C]: "[first 50 chars...]"
═══════════════════════════════════════════

✅ ORIGINALITY CHECK (target: 2/2):
  [ ] Word choice scan: ZERO AI-sounding words? → YA/TIDAK (jika TIDAK, sebutkan kata mana)
  [ ] Template phrase scan: ZERO template phrases? → YA/TIDAK
  [ ] Banned starter scan: ZERO banned starters? → YA/TIDAK
  [ ] Sentence variety: uneven lengths (mix 3-word + 15-word)? → YA/TIDAK
  [ ] Personal voice: has "I"/contractions/specific moment? → YA/TIDAK
  [ ] Unique angle: uses competitive gap, NOT overused angle? → YA/TIDAK
  → VERDICT: PASS / FAIL (jika FAIL, sebutkan apa yang perlu diperbaiki)

✅ CONTENT ALIGNMENT CHECK (target: 2/2):
  [ ] Topic: mentions campaign project/feature/milestone? → YA/TIDAK
  [ ] Tone: matches style energy level from Step 4.5? → YA/TIDAK
  [ ] Directive: follows mission directive? → YA/TIDAK
  [ ] Style: first and last sentence reflect style field? → YA/TIDAK
  [ ] Requirements: all campaign requirements met? → YA/TIDAK
  → VERDICT: PASS / FAIL

✅ CAMPAIGN COMPLIANCE CHECK (target: 2/2):
  [ ] Prohibited items: NONE from campaign list? → YA/TIDAK
  [ ] Banned words (21): NONE? → YA/TIDAK
  [ ] Rally banned phrases (17): NONE? → YA/TIDAK
  [ ] AI-sounding words (26): NONE? → YA/TIDAK
  [ ] Template phrases (21): NONE? → YA/TIDAK
  [ ] AI pattern phrases (16): NONE? → YA/TIDAK
  [ ] Banned starters (8): NONE? → YA/TIDAK
  [ ] Dashes: ZERO em-dash/en-dash/double-hyphen? → YA/TIDAK
  [ ] Quotes: all straight ""? → YA/TIDAK
  [ ] Ellipsis: all triple dots ...? → YA/TIDAK
  [ ] Character limit: within limit (if specified)? → YA/TIDAK
  [ ] contentType: correct format? → YA/TIDAK
  → VERDICT: PASS / FAIL

✅ ENGAGEMENT POTENTIAL CHECK (target: 5/5):
  [ ] Hook: uses Contrast/Discovery/Question/Claim formula? → YA/TIDAK
  [ ] First sentence: forces reader to stop? → YA/TIDAK
  [ ] Specific fact: has number/detail from KB/website? → YA/TIDAK
  [ ] Emotional current: excitement/curiosity/provocation? → YA/TIDAK
  [ ] Ending: genuine question/provocative statement/self-doubt? → YA/TIDAK
  [ ] Concise: no filler words/sentences? → YA/TIDAK
  [ ] Unique: angle not used by competitors? → YA/TIDAK
  → VERDICT: PASS / FAIL

✅ TECHNICAL QUALITY CHECK (target: 5/5):
  [ ] Natural flow: reads like real person talking? → YA/TIDAK
  [ ] Single post rhythm: 1-3 paragraphs, not essay? → YA/TIDAK
  [ ] Straight quotes only? → YA/TIDAK
  [ ] No formatting artifacts? → YA/TIDAK
  [ ] Sentence variety: short + long mixed naturally? → YA/TIDAK
  [ ] Read-aloud test: sounds like a tweet? → YA/TIDAK
  → VERDICT: PASS / FAIL

✅ REPLY QUALITY CHECK (target: 5/5):
  [ ] Ending uses appropriate technique from Step 5.6 Reply Quality v9.4 (Embedded Uncertainty / Provocative Challenge / Micro-Question / Implicit Invitation)? → YA/TIDAK
  [ ] Ending matches style energy (banger=challenge, casual=embedded, analytical=micro, celebration=implicit)? → YA/TIDAK
  [ ] If question used: has NO obvious answer? → YA/TIDAK
  [ ] If challenge used: invites genuine disagreement? → YA/TIDAK
  [ ] Vulnerability framing present? → YA/TIDAK
  [ ] NO rhetorical questions? → YA/TIDAK
  [ ] Questions/invitations specific to campaign/topic? → YA/TIDAK
  [ ] ⚠️ DIMENSION COMPATIBILITY: banger+question=FAIL, banger+challenge=PASS? → YA/TIDAK
  → VERDICT: PASS / FAIL

═══════════════════════════════════════════
VARIASI [A/B/C] MAX-OUT SCORE: [X]/7 dimensions PASS
```

**KEPUTUSAN:**

- **Jika variasi mendapat 7/7 PASS** → APPROVED untuk Step 7 (judge)
- **Jika variasi mendapat 5-6/7 PASS** → REWRITE bagian yang FAIL, lalu re-check. Waktu target: 30 detik per rewrite.
- **Jika variasi mendapat < 5/7 PASS** → FULL REWRITE variasi ini. Terlalu banyak masalah untuk patch.

**REWRITE PRIORITIES (jika perlu rewrite):**
1. **Compliance FAIL** → FIX FIRST. Satu compliance violation = gate 0. Tidak ada konten yang lolos judge dengan compliance violation.
2. **Originality FAIL** → FIX SECOND. AI fingerprint = gate 0 atau 1.
3. **Alignment FAIL** → FIX THIRD. Tone/directive mismatch = gate 0 atau 1.
4. **Engagement FAIL** → FIX FOURTH. Weak hook = quality score turun.
5. **Technical FAIL** → FIX FIFTH. Easy fix (sanitization, flow).
6. **Reply Quality FAIL** → FIX SIXTH. Usually perlu tambah genuine question.

**⚠️ v9.5 OUTPUT FORMAT (SEMI-SILENT):**
JANGAN tampilkan full checklist ke user. Tampilkan HANYA:

**Jika semua PASS:**
```
✅ MAX-OUT Check: 3/3 variasi APPROVED (semua 7 dimensi PASS)
```

**Jika ada FAIL:**
```
⚠️ MAX-OUT Check:
  Variasi A: 6/7 PASS — ❌ FAIL: [dimensi] — [alasan singkat]
  Variasi B: 7/7 PASS ✅
  Variasi C: 5/7 PASS — ❌ FAIL: [dimensi 1], [dimensi 2] — [alasan]
→ Rewriting dimensi yang FAIL...
→ Re-check setelah rewrite:
  Variasi A: 7/7 PASS ✅ (setelah rewrite)
  Variasi C: 7/7 PASS ✅ (setelah rewrite)
✅ Semua variasi APPROVED
```

**⚠️ JIKA SETELAH REWRITE, variasi masih < 5/7 PASS → lanjutkan ke judge dengan variasi terbaik yang ada.** Catat di output: "⚠️ MAX-OUT verification: [X]/7 PASS — some dimensions may score below max."

---

### STEP 7: Multi-Judge Panel Evaluation (7 Judges)

**5 LLM persona judges + 1 Self-judge + 1 optional chat.qwen.ai tiebreaker.** ~15 seconds for primary panel (J1-J6). chat.qwen.ai (J7) only if needed.

**🚨 PRE-JUDGE SANITIZATION (MANDATORY — lakukan SEBELUM launch judge):**
SEBELUM konten dikirim ke judge panel, jalankan sanitization PROGRAMMATIC pada SEMUA 3 variasi:

```
SANITIZE(variation):
1. Replace ALL en-dash (– \u2013) → regular hyphen (-) atau period. (prefer period)
2. Replace ALL em-dash (— \u2014) → period.
3. Replace ALL double-hyphen (--) → period.
4. Replace ALL smart/curly quotes (" " ' ') → straight quotes (" ')
5. Replace ALL Unicode ellipsis (…) → three dots (...)
6. Replace ALL non-breaking space (\u00A0) → regular space
7. Remove ALL zero-width characters (\u200B \u200C \u200D \uFEFF)
8. Trim whitespace per line
9. Collapse multiple spaces → single space
10. Strip markdown: **, *, #, >, -
```

**VERIFIKASI:** Setelah sanitization, cek setiap variasi:
- Jika masih mengandung en dash (–) atau em dash (—) → REWRITE variasi tersebut dari nol
- Jika mengandung smart quotes → replace manual
- Jika mengandung markdown formatting → strip manual
**Konten yang lolos sanitasi dengan en dash = pipeline error.**

**🚨 FALLBACK DECISION TABLE 🚨**

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  STEP 7 FALLBACK TABLE — PILIH BARIS PERTAMA YANG BERHASIL                     ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                   ║
║  #  METHOD                    TOOL                    ACTION                     ║
║  ─  ─────────────────────────  ─────────────────────  ────────────────────────  ║
║  1  LLM Multi-Judge Panel     LLM skill × 5 + Self   6 judges in ~15s          ║
║     J1-J5: 5 parallel Tasks                                                     ║
║     J6: Self-judge (instant)                                                    ║
║     → IF consensus unclear, GO TO #2                                              ║
║                                                                                   ║
║  2  chat.qwen.ai Tiebreak   agent-browser             External perspective      ║
║     ONLY if: score range > 4pts or gates disagree                             ║
║     → IF still unclear, GO TO #3                                                 ║
║                                                                                   ║
║  3  ASK USER                 —                       Tanya user                 ║
║     "Judge tidak konsensus. Mau pilih sendiri dari 3 variasi?"                   ║
║                                                                                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝

⚠️ ATURAN KERAS:
• HARUS coba #1 (LLM panel) dulu. 6 judge sudah sangat reliable.
• chat.qwen.ai (#2) HANYA jika score range > 4pts atau gates deadlock.
• JANGAN gunakan OpenRouter API.
• JANGAN pernah self-judge sebagai SATU-SATUNYA judge (self-judge + 5 persona = 6 total).
• ⚠️ EXPECTED TIME: ~15 detik untuk J1-J6. chat.qwen.ai tambahan ~60-90 detik (jarang perlu).
```

**EXECUTION FLOW:**

**1. TRY #1 — LLM Multi-Judge Panel (PRIMARY):**

**⚡ PROGRESS PING:** SEBELUM memulai judge, kirim pesan ke user:
```
⏳ Judge sedang berjalan... (Multi-Judge Panel — 6 judges)
Metode: 5 LLM personas (parallel) + 1 Self-judge
Estimasi: ~15 detik
```

**🚨 PARALLEL LAUNCH — 5 LLM judges in ONE message + 1 Self-judge:**

In a SINGLE response, invoke **FIVE Task tool calls simultaneously** (J1-J5) + evaluate J6 yourself:

```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ TASK 1: J1          │ │ TASK 2: J2          │ │ TASK 3: J3          │ │ TASK 4: J4          │ │ TASK 5: J5          │
│ Harsh Crypto Critic │ │ Average X User      │ │ Rally Judge Clone   │ │ Contrarian          │ │ AI Fingerprint Det  │
│ temp=0.2            │ │ temp=0.7            │ │ temp=0.4            │ │ temp=0.9            │ │ temp=0.2            │
│                     │ │                     │ │                     │ │                     │ │                     │
│ 1. Invoke LLM skill │ │ 1. Invoke LLM skill │ │ 1. Invoke LLM skill │ │ 1. Invoke LLM skill │ │ 1. Invoke LLM skill │
│ 2. Send judge prompt│ │ 2. Send judge prompt│ │ 2. Send judge prompt│ │ 2. Send judge prompt│ │ 2. Send judge prompt│
│ 3. Return JSON      │ │ 3. Return JSON      │ │ 3. Return JSON      │ │ 3. Return JSON      │ │ 3. Return JSON      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                    ↕ ALL PARALLEL (~15 seconds) ↕

┌─────────────────────┐
│ J6: Self-Judge      │
│ (main AI, instant)  │
│                     │
│ Evaluate directly:  │
│ - Full pipeline ctx │
│ - Know own weakness │
│ - Be brutally honest│
└─────────────────────┘
         ↓

ALL 6 return → CHECK CONSENSUS → (optional J7) → MERGE → Step 7e
```

**Each Task (J1-J5) prompt MUST include:**
- Judge-specific system prompt (see Tool 4 for personas)
- The FULL judge content (all 3 variations)
- Campaign brief summary (rules, KB facts, calibration targets)
- The 7-category scoring rubric
- Instruction to return scores as JSON

**Each Task (J1-J5) MUST return:**
```json
{
  "judge": "J1" (or J2, J3, J4, J5),
  "variation_a": {
    "originality": N, "alignment": N, "accuracy": N, "compliance": N,
    "engagement": N, "technical": N, "reply_quality": N,
    "total_score": N, "percentage": N,
    "issues_found": ["list every issue"],
    "improvement_priorities": [
      {
        "priority": 1,
        "category": "Engagement Potential",
        "current_score": N,
        "max_score": N,
        "action": "Kuasai banger style yang diminta campaign",
        "how": "Kurangi analisis, tambahkan conviction dan energy. Setiap kalimat harus punya impact.",
        "example_before": "The testnet launch is a significant milestone for GenLayer",
        "example_after": "GenLayer just did something no other L1 dares to do"
      }
    ],
    "feedback": "overall assessment"
  },
  "variation_b": { ... same ... },
  "variation_c": { ... same ... },
  "winner": "a" or "b" or "c"
}
```

**⚠️ improvement_priorities WAJIB diisi oleh SETIAP judge.** Minimal 2 priorities per variation. Setiap priority HARUS punya:
- `category`: nama kategori Rally yang perlu ditingkatkan
- `current_score` & `max_score`: skor saat ini dan maks
- `action`: judul singkat apa yang harus dilakukan
- `how`: penjelasan detail cara memperbaiki (2-3 kalimat)
- `example_before`: contoh kalimat yang salah/lemah SAAT INI di konten
- `example_after`: contoh kalimat yang BENAR setelah diperbaiki

**Special: J5 (AI Fingerprint Detector) returns:**
```json
{
  "judge": "J5",
  "variation_a": {
    "originality": N, "originality_reason": "detailed explanation",
    "ai_patterns_found": ["list specific AI patterns found"],
    "improvement_priorities": [
      {
        "priority": 1,
        "category": "Originality",
        "current_score": N, "max_score": 2,
        "action": "Hapus AI fingerprint yang ditemukan",
        "how": "Ganti kata-kata AI dengan bahasa manusia. Tambahkan personal voice.",
        "example_before": "This paradigm shift in blockchain technology...",
        "example_after": "ok so here's what actually caught my attention..."
      }
    ]
  },
  "variation_b": { ... },
  "variation_c": { ... }
}
```
J5 only scores Originality. For other categories, use N/A. improvement_priorities WAJIB diisi.

**J6 (Self-Judge):**
Main AI evaluates directly in the conversation (no Task call). Consider:
- What techniques did I intentionally use in each variation?
- Did those techniques actually work or feel forced?
- What do I know is weak about my own writing?
- Compare against competitive intel — did I actually differentiate?
- Return same JSON format as J1-J4.

**After ALL 6 judges return:**
1. Collect all scores into a matrix
2. Check score range for winner variation (max score - min score)
3. Check gate agreement (do all judges agree on Originality/Compliance?)
4. If range <= 4pts AND gates consistent → Skip J7, go to consensus (Step 7e)
5. If range > 4pts OR gates disagree → Trigger J7 (chat.qwen.ai tiebreaker)

**Triggering J7 (chat.qwen.ai tiebreaker):**
```
⚠️ Judges tidak konsensus (range: [X] points). Triggering tiebreaker...
⏳ chat.qwen.ai tiebreaker... (~60-90 detik)
```
- Use agent-browser → chat.qwen.ai (Tool 5)
- Paste the FULL judge prompt (same as v7.9)
- Wait for response
- Add J7 scores to the matrix
- Re-check consensus

**Results:**
- ✅ If 6+ judges return scores → Go to consensus (Step 7e)
- ⚠️ If 3-5 judges return → Use available judges (min 3 required)
- ❌ If < 3 judges return → **GO TO #3 (ASK USER)**

**2. chat.qwen.ai Tiebreak (OPTIONAL — only if consensus unclear):**
- See Tool 5 for execution instructions
- If chat.qwen.ai also fails → GO TO #3

**3. ASK USER (if < 3 judges AND chat.qwen.ai failed):**
- Display message: "Judge panel gagal (hanya [N]/6 berhasil). Mau pilih sendiri dari 3 variasi?"
- ⚠️ **WAJAB TUNGGU JAWABAN USER.**
- If user says YES → Display 3 variations WITHOUT scores. STOP.

**How to execute each judge:**

**7a. Judge Content (used for ALL judge sessions):**

Each judge evaluates all 3 variations using the same content but different persona/perspective:

```
═══ CONTENT VARIATION A (Factual/Technical) ═══
[PASTE VARIATION A TEXT]

═══ CONTENT VARIATION B (Edgy/Opinionated) ═══
[PASTE VARIATION B TEXT]

═══ CONTENT VARIATION C (Question/Hook) ═══
[PASTE VARIATION C TEXT]
```

**7b. Judge Context (included in EVERY judge prompt):**

```
═══ CAMPAIGN RULES ═══
[PASTE rules from API]

═══ MISSION DIRECTIVE ═══
Mission: [PASTE mission description — BUKAN hanya judul, tapi FULL DESCRIPTION]
Mission Goal: [PASTE mission goal]
Campaign Goal: [PASTE campaign goal — dari CAMPAIGN level, bukan mission level]
═══ STYLE DIRECTIVE ═══
Style: "[PASTE style field — dari hasil Data Fortress fallback chain]"
Style Energy: [HIGH/MEDIUM/LOW — dari Step 4.5 #4]
Tone Requirement: "[PASTE dari Step 4.5 #7 — misalnya: 'HIGH ENERGY celebratory, NO skepticism']"

═══ KNOWLEDGE BASE ═══
[PASTE FULL KB from campaign level + mission level + website + reference links]
[Jika KB Empty Mode aktif, tulis: "⚠️ KB EMPTY MODE — AI harus menggunakan bahasa vagu saja"]

═══ REFERENCE TWEET CONTENT ═══
[Jika reference tweet berhasil dibaca, PASTE kontennya di sini]
[Jika tidak ada reference tweet, tulis: "No reference tweet available"]
═══ REFERENCE TWEET ANALYSIS ═══
Tone: [dari Step 4.5 #8]
Key points: [dari Step 4.5 #8]
Strategy: [reply/quote/standalone — dari Step 4.5 #8]

═══ CAMPAIGN REQUIREMENTS ═══
[PASTE requirements, additionalInfo, prohibitedItems]

═══ GROUND TRUTH CALIBRATION ═══
[PASTE calibration data]
Target: top 10% = >= [P90]%
Average submission = [Mean]%
Weak categories: [list]

═══ COMPETITIVE INTELLIGENCE ═══
[PASTE competitive analysis]
Phrases to AVOID: [list]
Overused angles: [list]
Untapped gaps: [list — dari Step 4.5 #5]
```

**⚠️ v9.0 CRITICAL: ALL campaign data MUST be included in judge context.**
- **MISSION DIRECTIVE** — judge HARUS tahu apa directive campaign (celebrate/discuss/review)
- **STYLE DIRECTIVE** — judge HARUS tahu style energy level dan tone requirement
- KB (campaign level + mission level)
- Mission description (FULL, bukan hanya judul)
- **Reference tweet content** (jika tersedia — judge perlu tahu apa yang di-quote/replied)
- Rules, requirements, prohibited items
- Website content (key facts)
- Competitive intel (overused phrases + untapped gaps)
- Calibration data
- **Missing ANY of these = judge cannot properly evaluate Alignment and Accuracy.**

**⚠️ v9.0 CRITICAL for Content Alignment evaluation:**
Judge harus mengecek Alignment berdasarkan:
1. **Topic match** — konten membahas topik campaign? ✅/❌
2. **Tone match** — tone konten sesuai dengan style directive? ✅/❌
   - Jika style = "Post a banger!" dan konten terdengar analytical → Alignment FAIL
   - Jika mission directive = "celebrate" dan konten skeptical → Alignment FAIL
3. **Directive match** — konten mengikuti mission directive? ✅/❌
   - Jika directive = "celebrate" dan konten punya counter-point → mungkin Alignment issue
4. **Requirement match** — semua requirements terpenuhi? ✅/❌

**Content Alignment 2/2 requires ALL 4 checks to pass.**

**7c. LLM Judge Prompt Template (for J1-J4):**

```
[System prompt varies per judge — see Tool 4 personas]

You are evaluating 3 content variations for a Rally.fun campaign. Score each using the 7-category rubric below.

═══ RALLY.FUN SCORING RUBRIC (7 Categories, Max 23.0 Points) ═══

BINARY GATES (score 0 = FAIL):
1. Originality & Authenticity (0-2):
   - 0 = AI-generated/robotic (contains AI words, template phrases, uniform structure)
   - 1 = some AI patterns (1-2 AI words, slightly formulaic structure)
   - 2 = genuinely human (ZERO AI words, ZERO template phrases, uneven structure, personal voice, unique angle)
   ⚠️ To score 2/2: must pass ALL 3 checks — word choice (no AI words), sentence structure (uneven, varied), content pattern (specific, asymmetric, personal)

2. Content Alignment (0-2):
   - 0 = doesn't match campaign OR tone mismatch OR directive violation
   - 1 = partial match (topic ok but tone wrong, or tone ok but missing directive, or directive ok but style ignored)
   - 2 = perfect match (topic + tone + directive + style ALL align with style field + mission description)
   ⚠️ To score 2/2: ALL 4 checks must pass — topic match, tone match, directive match, style match
   ⚠️ Tone check: if style says "banger" but content is analytical → max 1/2
   ⚠️ Directive check: if mission says "celebrate" but content is skeptical → max 1/2
   ⚠️ Style check: if style field is provided and content ignores it → max 1/2

3. Information Accuracy (0-2): 0 = false claims, 1 = hard to verify, 2 = all verifiable

4. Campaign Compliance (0-2):
   - 0 = violates ANY rule (prohibited items, banned words, Rally banned phrases, em dashes, character limit)
   - 1 = minor issues (formatting, slightly over limit)
   - 2 = fully compliant (zero violations, sanitization perfect, all requirements met)

QUALITY SCORES — SCORE HONESTLY BUT FAIRLY:
5. Engagement Potential (0-5):
   - 1 = boring, generic, would scroll past
   - 2 = mildly interesting, might pause
   - 3 = decent hook but weak ending or no specificity
   - 4 = strong hook + specific facts + decent ending
   - 5 = FORCES stop-scroll + specific facts from KB + emotional impact + genuine open question + unique angle
   ⚠️ To score 5/5: ALL must be true — strong hook formula, specific number/fact, emotional current, genuine open ending, concise

6. Technical Quality (0-5):
   - 1 = awkward, robotic, hard to read
   - 2 = readable but unnatural in places
   - 3 = decent flow, minor issues
   - 4 = natural flow, reads like a real tweet, minor imperfections
   - 5 = FLAWLESS natural flow, reads EXACTLY like a real person typed it, sentence variety perfect, no artifacts
   ⚠️ To score 5/5: must pass read-aloud test — sounds like someone talking, not writing

7. Reply Quality (0-5):
   - 1 = no genuine questions or only rhetorical questions
   - 2 = has questions but they're obvious/generic ("what do you think?")
   - 3 = somewhat specific question but author could answer it
   - 4 = genuine question with no obvious answer + shows depth
   - 5 = MULTI-LAYER genuine questions (specific observation + genuine uncertainty + self-positioning), ZERO rhetorical questions, invites REAL discussion
   ⚠️ To score 5/5: must have genuine open question the author CANNOT answer, plus vulnerability/self-doubt framing

═══ STRICT EVALUATION RULES ═══
- Verify claims against Knowledge Base provided
- AI-sounding word (delve, leverage, paradigm...) = Originality max 1
- Template phrase (key takeaways, let's dive in...) = Originality max 1
- Rally banned phrase (vibe coding, agent era...) = Compliance 0
- Em dashes prohibited in rules = Compliance 0
- Rhetorical question (asks then immediately answers) = Reply Quality max 2
- Compare against ground truth: mediocre = 10-14/23, good = 15-17/23, excellent = 18+/23
- Score 5/5 on Engagement ONLY if ALL criteria met (hook + fact + emotion + question + conciseness + uniqueness)
- Score 5/5 on Technical ONLY if read-aloud test passes (sounds like real speech)
- Score 5/5 on Reply ONLY if genuine multi-layer questions present (NOT generic)
- Score 2/2 on Originality ONLY if ZERO AI fingerprints detected (words + structure + pattern)
- Score 2/2 on Alignment ONLY if ALL 4 checks pass (topic + tone + directive + style)
- Score 2/2 on Compliance ONLY if ZERO violations (prohibited + banned + formatting)
- BE BRUTAL. BE HONEST. NO COMPROMISE. GIVE MAX ONLY WHEN EARNED.

═══ SCORING SCALE ═══
- Gates: 0-2 each. Quality: 0-5 each. TOTAL MAX = 23.
- Clamp total_score to max 23.

═══ CAMPAIGN CONTEXT ═══
[PASTE 7b context here]

═══ 3 VARIATIONS ═══
[PASTE 7a content here]

═══ ⚠️ MANDATORY: IMPROVEMENT PRIORITIES ═══
For EACH variation, you MUST provide an "improvement_priorities" array with at least 2 priorities.
Each priority is an ACTIONABLE improvement with a SPECIFIC EXAMPLE of how to fix it.

Rules for improvement_priorities:
1. Focus on WHAT TO IMPROVE (increase quality), NOT what to lower or accept
2. Each priority MUST have a concrete example_before (weak sentence from the actual content) and example_after (how to rewrite it better)
3. Prioritize by IMPACT: #1 = the single biggest quality improvement possible
4. Be SPECIFIC: "Kurangi analisis, tambahkan conviction" NOT "improve engagement"
5. Use the SAME LANGUAGE as the content being evaluated
6. If a category already scored max, do NOT include it as a priority

Example of a GOOD priority:
{
  "priority": 1,
  "category": "Engagement Potential",
  "current_score": 3, "max_score": 5,
  "action": "Kuasai banger style yang diminta campaign",
  "how": "Kurangi analisis teknis, tambahkan conviction dan energy. Setiap kalimat harus punya impact — bukan sekadar informatif.",
  "example_before": "The testnet launch represents a significant milestone",
  "example_after": "GenLayer just did something no other L1 dares to do"
}

═══ RESPOND IN EXACT JSON ═══
{
  "judge": "[J1/J2/J3/J4/J6]",
  "variation_a": {
    "originality": N, "alignment": N, "accuracy": N, "compliance": N,
    "engagement": N, "technical": N, "reply_quality": N,
    "total_score": N, "percentage": N,
    "issues_found": ["list every issue"],
    "improvement_priorities": [
      {
        "priority": 1,
        "category": "Category Name",
        "current_score": N, "max_score": N,
        "action": "Short action title",
        "how": "Detailed explanation of how to improve (2-3 sentences)",
        "example_before": "Exact weak sentence from the content",
        "example_after": "How to rewrite it to be better"
      },
      {
        "priority": 2,
        "category": "Another Category",
        "current_score": N, "max_score": N,
        "action": "Short action title",
        "how": "Detailed explanation",
        "example_before": "Exact weak sentence from the content",
        "example_after": "How to rewrite it to be better"
      }
    ],
    "feedback": "overall assessment"
  },
  "variation_b": { ... same structure ... },
  "variation_c": { ... same structure ... },
  "winner": "a" or "b" or "c"
}

REMEMBER: improvement_priorities is MANDATORY for EVERY variation. Minimum 2 priorities each. No exceptions.
```

**7d. J5 (AI Fingerprint Detector) Prompt:**

```
You are an AI Fingerprint Detector. Your ONLY job is detecting AI-generated patterns.

For each variation, score ONLY Originality (0-2). Everything else = N/A.

CHECK FOR:
- AI words: delve, leverage, realm, tapestry, paradigm, landscape, nuance, underscores, pivotal, crucial, embark, journey, explore, unlock, harness, foster, utilize, elevate, streamline, empower, moreover, furthermore, consequently, nevertheless, notably, significantly, comprehensive
- Template phrases: unpopular opinion, hot take, thread alert, breaking, this is your sign, psa, reminder that, key takeaways, here's the thing, let's dive in, nobody is talking about, at the end of the day
- AI patterns: picture this, in this thread, imagine a world, on the other hand, in conclusion, at its core, the reality is, make no mistake
- Banned starters: honestly, like, kind of wild, ngl, tbh, tbf, fr fr, lowkey
- Uniform paragraph lengths
- Generic tone / lack of personal voice
- Missing human artifacts (contractions, self-correction, uncertainty)

═══ 3 VARIATIONS ═══
[PASTE 7a content here]

═══ ⚠️ MANDATORY: IMPROVEMENT PRIORITIES ═══
For EACH variation, you MUST provide an "improvement_priorities" array with at least 1 priority.
Focus ONLY on Originality improvements (your specialty). Each priority MUST have example_before and example_after.

═══ RESPOND IN JSON ═══
{
  "judge": "J5",
  "variation_a": {
    "originality": N,
    "originality_reason": "detailed explanation",
    "ai_patterns_found": ["list specific AI patterns found"],
    "improvement_priorities": [
      {
        "priority": 1,
        "category": "Originality",
        "current_score": N, "max_score": 2,
        "action": "Remove AI fingerprints found above",
        "how": "Replace AI-sounding words with natural human language. Add personal voice, specific moments, and uneven sentence structure.",
        "example_before": "This paradigm shift in blockchain technology...",
        "example_after": "ok so here's what actually caught my attention..."
      }
    ]
  },
  "variation_b": { ... same structure with improvement_priorities ... },
  "variation_c": { ... same structure with improvement_priorities ... }
}
```

J5 only scores Originality. For other categories, use N/A. **improvement_priorities WAJIB diisi** — minimal 1 per variation, fokus pada cara menghilangkan AI fingerprint yang ditemukan. Setiap priority HARUS punya example_before dan example_after dari konten yang sebenarnya.

**7e. Build Consensus (Multi-Judge Formula):**

For each variation, combine ALL completed judges' scores:

**IMPORTANT: Handle J5 (AI Fingerprint Detector) specially:**
- J5 only provides Originality scores
- For Originality consensus: include J5's score in the min() calculation
- For all other categories: exclude J5 (use J1-J4 + J6 + J7 only)

**IMPORTANT: Clamp judge scores to correct scale before calculating:**
- If any gate score > 2, clamp to 2
- If any quality score > 5, clamp to 5
- If total_score > 23, the judge used the wrong scale -- recalculate manually

```
═══ CONSENSUS SCORING ([N] Judges: Minority Override + Min for Gates, Average for Quality) ═══

Variation A:
  Category          J1  J2  J3  J4  J5  J6  J7  CONSENSUS  GATE STATUS
  Originality:      [X] [X] [X] [X] [X] [X] [X]  [val]/2   PASS / ⚠️ FLAGGED / ❌ FAIL
  Alignment:        [X] [X] [X] [X] [-] [X] [X]  [val]/2   PASS / ⚠️ FLAGGED / ❌ FAIL
  Accuracy:         [X] [X] [X] [X] [-] [X] [X]  [val]/2   PASS / ⚠️ FLAGGED / ❌ FAIL
  Compliance:       [X] [X] [X] [X] [-] [X] [X]  [val]/2   PASS / ⚠️ FLAGGED / ❌ FAIL
  Engagement:       [X] [X] [X] [X] [-] [X] [X]  [avg]/5   QUALITY: avg (excl J5)
  Technical:        [X] [X] [X] [X] [-] [X] [X]  [avg]/5   QUALITY: avg (excl J5)
  Reply Quality:    [X] [X] [X] [X] [-] [X] [X]  [avg]/5   QUALITY: avg (excl J5)
  TOTAL:            [X] [X] [X] [X] [-] [X] [X]  [X]/23

GATE LEGEND:
  PASS = semua judge 2/2 (min=2)
  ⚠️ FLAGGED = 1 judge dissent (minority override → 1/2, tracked but not auto-fail)
  ❌ FAIL = 2+ judges dissent (hard fail → 0/2, mandatory feedback loop)

Variation B:
  [same format]

Variation C:
  [same format]

VARIANCE:
  Score range (max - min): [X] points
  Gate agreement: [list any disagreements]
  Judges agree on winner: YES/NO
```

**Consensus calculation:**

**⚠️ v9.5 MINORITY OVERRIDE — Anti False-Positive Gate System:**
Dengan 6+ judge, probabilitas 1 judge false-positive cukup tinggi. Satu outlier TIDAK BOLEH membunuh konten yang sebenarnya bagus. TETAPI: konten yang bermasalah HARUS tetap terdeteksi.

**RULE:**
1. Hitung min() dari semua judge scores untuk setiap gate
2. Hitung **dissent count** — berapa judge yang memberi skor 0/2 pada gate tersebut
3. Jika **min() = 0/2 DAN dissent count = 1** (hanya 1 dari 5+ judge):
   → **⚠️ FLAGGED GATE** — Consensus = **1/2** (bukan 0/2)
   → Alasan: "Minority dissent (1 judge saja). Issue ditandai untuk review tapi tidak auto-fail."
   → Masuk ke improvement priorities, tapi TIDAK memicu mandatory feedback loop
4. Jika **min() = 0/2 DAN dissent count ≥ 2**:
   → **HARD GATE FAIL** — Consensus = **0/2**
   → Mandatory feedback loop (seperti sebelumnya)
5. Jika **min() = 1/2**:
   → Consensus = **1/2** — tidak berubah (minority override tidak berlaku untuk skor 1)

**Contoh:**
```
Originality: J1=2, J2=2, J3=2, J4=2, J5=0, J6=2 → min=0, dissent=1 → FLAGGED GATE → consensus=1/2 ⚠️
Originality: J1=2, J2=1, J3=2, J4=0, J5=0, J6=2 → min=0, dissent=2 → HARD GATE FAIL → consensus=0/2
Alignment:   J1=1, J2=2, J3=2, J4=2, J5=N/A, J6=2 → min=1, dissent=1 (for 0) → consensus=1/2 (no override)
```

**Kenapa ini TIDAK menurunkan kualitas:**
- Minority override hanya berlaku untuk edge case (1 dari 5+ judge)
- Issue TETAP ditandai dan masuk improvement priorities
- 2+ judge yang setuju → tetap auto-fail (kualitas terjaga)
- Hasil: mengurangi wasted feedback loops pada konten yang sebenarnya bagus

**Formula lengkap:**
- For binary gates (0-2): apply Minority Override first, then consensus
  - For Originality: check J1-J5, J6, J7 (J5 DOES score Originality)
  - For Alignment/Accuracy/Compliance: check J1-J4, J6, J7 (exclude J5)
  - If dissent count = 1 for score 0 → consensus = 1/2 (FLAGGED)
  - If dissent count ≥ 2 for score 0 → consensus = 0/2 (HARD FAIL)
  - Otherwise: consensus = min()
- For quality scores (0-5): consensus = **average()** of judges who scored that category
  - Exclude J5 from quality averages (J5 only scores Originality)
- Total consensus = sum of all 7 category consensus scores (max 23)
- **⚠️ FINAL CLAMP:** `total = max(0, min(23, total))`

**After consensus calculated:** Update checkpoint: save consensus to `data.consensus`, save all judge data to `data.judge_panel`.

**⚠️ v8.0 MANDATORY: Aggregate and display judge feedback:**

Setelah consensus dihitung, AGGREGATE improvement_priorities dari SEMUA judges untuk WINNER variation. Tampilkan sebagai priority-ranked list:

```
═══ JUDGE FEEDBACK: Cara Meningkatkan Konten (BUKAN Menurunkan Standar) ═══

✅ Apa yang Perlu Ditingkatkan

Prioritas 1: [Action dari judge yang paling sering menyebut kategori ini]
Kategori: [Category Name] ([current_score]/[max_score] → target: [max_score])
Cara: [how dari judge — 2-3 kalimat detail]
Sebelum: "[example_before — kalimat lemah di konten]"
Sesudah: "[example_after — kalimat yang lebih baik]"
[berapa dari N judges menyebut kategori ini sebagai prioritas #1]

Prioritas 2: [Action berikutnya]
Kategori: [Category Name] ([current_score]/[max_score] → target: [max_score])
Cara: [how — 2-3 kalimat detail]
Sebelum: "[example_before]"
Sesudah: "[example_after]"
[berapa dari N judges menyebut]

Prioritas 3: [Action berikutnya]
... (jika ada)

═══ DETAIL PER JUDGE ═══
J1 (Harsh Critic): [top priority dalam 1 kalimat]
J2 (Avg X User):   [top priority dalam 1 kalimat]
J3 (Rally Clone):  [top priority dalam 1 kalimat]
J4 (Contrarian):   [top priority dalam 1 kalimat]
J5 (AI Detector):  [AI patterns found atau "clean"]
J6 (Self-Judge):   [top self-critique dalam 1 kalimat]
```

**⚠️ ATURAN FEEDBACK:**
1. Fokus pada MENINGKATKAN kualitas konten — BUKAN menurunkan standar
2. Jika judge menyebut "kurangi X" → ubah jadi "tingkatkan Y sebagai gantinya"
3. Contoh spesifik HARUS dari konten yang sebenarnya, bukan contoh generik
4. Ranking berdasarkan FREKUENSI: priority yang disebut paling banyak judges = #1
5. Jangan tampilkan feedback untuk kategori yang sudah score max

---

**7f. Judge Self-Verification Checklist (MANDATORY):**

```
═══ JUDGE VERIFICATION CHECKLIST ═══
✅/❌ Judge method: LLM Multi-Judge Panel (J1-J5 parallel + J6 Self)
✅/❌ Judges completed: [N]/6 (or /7 if tiebreaker triggered)
✅/❌ Different temperatures used: YES (J1=0.2, J2=0.7, J3=0.4, J4=0.9, J5=0.2)
✅/❌ Different personas used: YES (5 unique system prompts)
✅/❌ Self-judge (J6) included: YES
✅/❌ Bias mitigation: YES (6 judges + min() consensus + J5 anti-AI focus)
✅/❌ Score scale correct: YES (max 23, not 157 or other)
✅/❌ All gates scored 0-2: YES
✅/❌ All quality scored 0-5: YES
✅/❌ J5 (AI Detector) only scored Originality: YES
✅/❌ Full campaign data included in judge context: YES (KB + rules + website)
```

**Jika ADA item ❌ → AUTO-HALT pipeline.** Tanya user.

**FALLBACK — If only 3-5 judges completed:**
- Use available judges (min 3 required for meaningful consensus)
- Note missing judges in output
- Continue to Step 8 normally
- If < 3 judges: STOP and ASK user

---

### STEP 8: G4 Originality + X-Factor Scoring

**⏱ Estimated time: 5-10 seconds** (pure calculation — no external calls)

Apply **programmatic adjustments** on top of consensus scores.

**After this step completes:** Update checkpoint: save G4 scores to `data.g4_scores`.

**G4 Originality Detection** -- bonuses and penalties:

BONUSES (each can add points):
| Bonus | Points | How to detect |
|-------|--------|---------------|
| casualHook | +1.5 | Starts with "what/how come/why/eh/wait/so/ok/nggak/gw/tau/nah/baru/tadi/serius" |
| parentheticalAside | +1.0 | Contains parenthetical `(...)` between 5-40 chars |
| contractions | +1.0 | Has 3+ contractions (don't, can't, won't, shouldn't, it's, I'm, etc.) |
| personalAngle | +1.0 | Uses "I/me/my/we/us/our/gw/gue/kita" |
| conversationalEnding | +0.5 | Ends with `?`, `!`, or `...` |
| sentenceFragments | +0.5 | Has 1+ sentence fragment of 5 words or fewer after longer text |
| unresolvedQuestion | +1.0 | Ends with genuine question that has no obvious answer (NOT rhetorical) |

PENALTIES (each can subtract points):
| Penalty | Points | How to detect |
|---------|--------|---------------|
| emDashes | -1.5 | Contains em-dash characters (—, \u2014) |
| enDashes | -1.5 | Contains en-dash characters (–, \u2013) — en dash is the #1 AI fingerprint in social media content |
| doubleHyphenDash | -1.5 | Contains double-hyphen (--) used as em-dash substitute to separate clauses |
| smartQuotes | -1.0 | Contains curly/smart quotes (should be sanitized, but check) |
| aiPhrases | -1.0 | Contains: delve, leverage, tapestry, paradigm, landscape, nuance, harness, elevate, streamline, empower, foster, utilize |
| genericOpening | -1.0 | Starts with "The/This is/There are/In my opinion/As we know" |
| formalEnding | -1.0 | Contains "in conclusion/to summarize/as discussed/regards/sincerely" |
| overExplaining | -0.5 | Word count exceeds 150 words (only penalize if content feels padded/repetitive, not if every sentence adds value) |
| rhetoricalQuestionOnly | -0.5 | Poses question but immediately answers it (kills Reply Quality) |

**X-Factor Detection** -- viral potential signals:

| Factor | Points | How to detect |
|--------|--------|---------------|
| specificNumber | +1.0 | Contains a specific number (not "many" or "some") |
| timeSpecificity | +1.0 | Contains "yesterday/last monday/this morning/2 days ago" etc. |
| embarrassingHonesty | +1.0 | Contains "stupid/idiot/dumb/wrong/mistake/bodoh/goblok" etc. |
| insiderDetail | +1.0 | Contains "internally/behind the scenes/off-record/insider/unannounced/beta" |
| unexpectedAngle | +1.0 | Contains "unpopular/contrarian/counterintuitive/nobody talks/the opposite" |

**Calculate adjusted score:**
```
consensus_score = multi-judge consensus: min() for gates, average() for quality (out of 23)
g4_adjustment = sum of all G4 bonuses - sum of all G4 penalties
g4_adjustment = max(-5, min(5, g4_adjustment))  # CAP: G4 adjustment limited to ±5
x_factor_bonus = sum of all X-Factor points
x_factor_bonus = min(3, x_factor_bonus)  # CAP: X-Factor bonus limited to +3
adjusted_score = consensus_score + g4_adjustment + x_factor_bonus
adjusted_score = max(0, min(23, adjusted_score))  # clamp to 0-23
```

---

### STEP 9: Evaluate and Select Winner

**⏱ Estimated time: 5-10 seconds** (no external calls)

**After this step completes:** Update checkpoint: save winner to `data.winner`.

```
JUDGE RESULTS (Multi-Judge Panel Consensus + G4 + X-Factor):
                    J1  J2  J3  J4  J5  J6  J7  Consensus  Adjusted  Grade     Verdict
Variation A:        [X] [X] [X] [X] [O] [X] [-]  [X]/23     [X]/23    [grade]    PASS/FAIL
Variation B:        [X] [X] [X] [X] [O] [X] [-]  [X]/23     [X]/23    [grade]    PASS/FAIL
Variation C:        [X] [X] [X] [X] [O] [X] [-]  [X]/23     [X]/23    [grade]    PASS/FAIL

Judges completed: [N]/7 (J5 = Originality only, J7 = optional tiebreak)
Judge agreement: [YES / NO] (score range: [X] points)
Gate disagreements: [list if any]
Winner: Variation [X] ([adjusted_score]/23.0 = [Y]% -- Grade [grade])
```

**If J7 (tiebreaker) was triggered, add note:**
```
⚠️ Tiebreaker J7 (chat.qwen.ai) triggered due to score range [X] pts
```

**If some judges failed (3-5 completed), use this format:**
```
JUDGE RESULTS (Partial Panel + G4 + X-Factor):
                    J1  J2  J3  J4  J6  Consensus  Adjusted  Grade     Verdict
Variation A:        [X] [X] [X] [X] [X]  [X]/23     [X]/23    [grade]    PASS/FAIL
Variation B:        [X] [X] [-] [X] [X]  [X]/23     [X]/23    [grade]    PASS/FAIL
Variation C:        [X] [X] [X] [X] [X]  [X]/23     [X]/23    [grade]    PASS/FAIL

⚠️ Partial panel: [N]/6 judges completed (min 3 required)
Missing: [list failed judges]
Winner: Variation [X] ([adjusted_score]/23.0 = [Y]% -- Grade [grade])
```

**Grade System (calibrated from real Rally submission data):**
| Score | Grade | Position Estimate |
|-------|-------|-------------------|
| >= 22.0 | S+ | Top 1% (PERFECT) |
| >= 21.0 | S | Top 5% (NEAR PERFECT) |
| >= 19.0 | A | Top 10% |
| >= 16.5 | B | Top 25% |
| >= 14.0 | C | Top 50% |
| >= 11.0 | D | Above Average |
| < 11.0 | F | Below Average |

**⚠️ v9.5 MAX-OUT ACCEPTANCE — Smart Targeting, No Over-Correction**

**⚠️ v9.5 STABILITY CHECK (BARU — cegah feedback loop merusak konten):**
Feedback loop sering memperbaiki 1 dimensi TAPI merusak dimensi lain (over-correction). Stability check mencegah ini.

**Rule: SIMPAN SKOR TERBAIK di setiap loop. Jika skor TURUN → STOP dan ambil skor terbaik sebelumnya.**
```
STABILITY TRACKER:
  best_score = [skor awal]
  best_loop = 0
  best_content = [konten awal]

  Setelah setiap loop:
  IF skor_sekarang > best_score → update best_score, best_loop, best_content
  IF skor_sekarang < best_score → STABILITY ALERT!
  IF skor_sekarang == best_score → NETRAL (boleh lanjut 1 loop lagi)
```

**⚠️ v9.5 EARLY ACCEPT (BARU — hemat waktu tanpa menurunkan kualitas):**
Setelah loop #1, JIKA skor >= 22/23 DAN semua gate PASS atau FLAGGED:
→ Tanya user: "Skor [X]/23. Ini sudah S+. Lanjut feedback loop untuk coba 23/23, atau terima sekarang?"
→ Jika user terima → output langsung (tidak perlu loop tambahan)
→ Kenapa aman: 22/23 = Top 1%, loop tambahan berisiko menurunkan skor (over-correction)

**Acceptance criteria — PERFECT (ALL must be true):**
- ALL 4 gates at EXACTLY 2/2 (PASS, not FLAGGED)
- ALL 3 quality scores at EXACTLY 5/5 (Engagement, Technical, Reply Quality)
- Total score = 23/23 (100%)
- If ALL conditions met: **PERFECT. Proceed to Step 11.**

**Acceptance criteria — ACCEPTABLE (minimum bar):**
- ALL gates at PASS or ⚠️ FLAGGED (no ❌ FAIL)
- ALL 3 quality scores at >= 4/5
- Total score >= 22/23 (96%)
- If conditions met: **Accepted (but note which quality score < 5/5 and any FLAGGED gates).**

**Acceptance criteria — FLAGGED GATE HANDLING:**
- ⚠️ FLAGGED gate (1/2) = minority dissent, TIDAK mandatory feedback loop
- Konten dengan FLAGGED gate BOLEH diterima JIKA total score >= 22/23
- FLAGGED gate issue HARUS masuk improvement priorities (Part 3 output)
- JIKA user ingin perfect score → feedback loop opsional (bukan mandatory)

**If NOT accepted, PER-DIMENSION improvement targets:**
- Gate ❌ FAIL (0/2): **ALWAYS feedback loop** — genuine issue detected by 2+ judges
- Gate ⚠️ FLAGGED (1/2): **OPTIONAL feedback loop** — minority dissent, user decides
- Quality score < 4/5: **Run feedback loop** — below minimum bar
- Quality score = 4/5: **OPTIONAL feedback loop** — above minimum but not max
- Quality score = 5/5: **NO feedback loop needed** — already maxed

**IMPORTANT: Feedback loop triggers:**
- ❌ HARD GATE FAIL → MANDATORY feedback loop
- Quality < 4/5 → MANDATORY feedback loop
- Total < 22/23 → MANDATORY feedback loop
- ⚠️ FLAGGED GATE → OPTIONAL (tanya user via early accept)
- Quality 4/5 → OPTIONAL (tanya user via early accept)

---

### STEP 10: Feedback Loop (if needed)

**⏱ Estimated time: 90-180 seconds per loop** (requires full re-judge)

**After each feedback loop:** Update checkpoint: update `data.winner` and increment completed steps.

**⚠️ CONTEXT TIP:** Setiap feedback loop membutuhkan full re-judge (90-180 detik). Jika context sudah 80%+ terpakai, lebih baik berhenti di skor saat ini dan tanya user:
```
Context sudah [X]%. Feedback loop butuh ~180 detik dan mungkin tidak cukup context.

Pilihan:
1. Lanjutkan feedback loop (risiko context habis di tengah)
2. Ambil skor terbaik sekarang dan output
3. Simpan checkpoint dan resume di session baru
```

**Initialize loop counter:** Set `loop_count = 0` before first feedback loop. After each re-judge, increment `loop_count += 1`.

If the winner needs improvement AND `loop_count < 3`:

**10a. ⚡ Use aggregated judge feedback (from Step 7e) to guide improvements:**

Read the "JUDGE FEEDBACK: Cara Meningkatkan Konten" section from Step 7e. This contains PRIORITY-RANKED improvements with specific examples.

**10a-i. Follow the priority order from judge feedback:**
1. **Prioritas #1** (disepakati paling banyak judges) → fix ini dulu, ini impact terbesar
2. **Prioritas #2** → fix setelah #1
3. **Prioritas #3** → fix jika masih ada waktu

**10a-ii. Apply the specific improvements from judge feedback:**
- Setiap priority punya `example_before` dan `example_after` — GUNAKAN sebagai panduan rewrite
- Kalimat yang match `example_before` di konten → ganti dengan gaya `example_after`
- Ikuti instruksi `how` dari judge — ini penjelasan detail cara memperbaiki

**10a-iii. Category-specific MAX-OUT fix strategies (from v9.1 MAX-OUT Techniques):**

**⚠️ PER-DIMENSION TARGET: Setiap feedback loop HARUS menargetkan skor MAKSIMAL di dimensi yang di-fix.**

- **Originality < 2/2** (target: 2/2):
  1. Scan untuk AI-sounding words (26 items) — ganti SEMUA yang ditemukan
  2. Scan untuk template phrases (21 items) — ganti SEMUA yang ditemukan
  3. Scan untuk banned starters (8 items) — ganti SEMUA yang ditemukan
  4. Periksa sentence structure: apakah semua kalimat punya pola yang sama? → MIX pendek + panjang
  5. Periksa content pattern: apakah generic/balanced? → buat spesifik + asymmetric
  6. Tambahkan personal voice: contractions, "I", specific moment
  7. Pastikan menggunakan competitive gap angle (bukan overused angle)

- **Content Alignment < 2/2** (target: 2/2):
  1. Baca ULANG style field dari campaign — pahami nuansa, bukan sekadar kata
  2. Baca ULANG mission directive — apakah directive "celebrate" tapi konten skeptis?
  3. Cek style energy level dari Step 4.5 #4 — apakah konten mencerminkan level itu?
  4. Kalimat PERTAMA dan TERAKHIR HARUS reflect style field
  5. Jika style = "banger" → apply SEMUA 7 Banger Style techniques
  6. Jika style = "casual" → buat lebih santai, conversational
  7. Cek requirements: semua requirements dari campaign terpenuhi?

- **Campaign Compliance < 2/2** (target: 2/2):
  1. Scan ULANG prohibited items — bandingkan SETIAP kata
  2. Scan ULANG banned words (21), Rally banned phrases (17), AI words (26), template phrases (21), AI patterns (16), banned starters (8)
  3. Scan ULANG dashes — em-dash, en-dash, double-hyphen
  4. Sanitization ULANG — quotes, ellipsis, zero-width chars
  5. Hitung ULANG character limit (jika ada)
  6. Cek ULANG additionalInfo dan requirements

- **Engagement < 5/5** (target: 5/5):
  1. Hook: ganti dengan salah satu formula (Contrast/Discovery/Question/Claim)
  2. Tambahkan specific number/fact dari KB atau website
  3. Tingkatkan emotional current: excitement, curiosity, atau provocation
  4. Ending: ganti dengan genuine open question atau provocative statement
  5. Hapus filler words dan kalimat yang tidak menambah value
  6. Pastikan unique angle (bukan yang sudah dipakai kompetitor)

- **Technical < 5/5** (target: 5/5):
  1. Read-aloud test: baca keras-keras, apakah terdengar natural?
  2. Periksa sentence variety: apakah pendek + panjang bergantian?
  3. Periksa transitions: apakah terasa natural, bukan forced?
  4. Periksa sanitization: straight quotes, triple dots, no artifacts
  5. Pastikan single post rhythm (1-3 paragraphs, bukan essay)
  6. Hapus kalimat yang terlalu formal atau structured

- **Reply Quality < 5/5** (target: 5/5):
  1. Ganti ending dengan 3-Layer Question Stack (observation + uncertainty + self-positioning)
  2. Pastikan pertanyaan TIDAK punya jawaban yang obvious
  3. Tambahkan vulnerability framing: "I can't figure out...", "maybe I'm wrong but..."
  4. HAPUS semua rhetorical questions (asks lalu jawab sendiri)
  5. Pastikan pertanyaan SPESIFIK ke campaign/topic, bukan generic

- **Accuracy < 2/2** (target: 2/2):
  1. Cross-check SETIAP klaim terhadap KB + website content
  2. Klaim yang TIDAK ada di KB atau website → ganti dengan bahasa vagu
  3. Pastikan tidak ada fabricated numbers, partnerships, atau claims

- **⚡ Style Energy Mismatch**: Jika multiple judges mention "style mismatch" atau "banger style", apply ALL 7 Banger Style techniques from Step 5.6. Rewrite with conviction, short punchy sentences, bold opener, drop-the-mic ending.

**10a-iv. ALTERNATIVE REWRITE STRATEGIES (v9.4 — Diversified Feedback):**

**MASALAH:** Feedback loop lama HANYA punya 1 strategi: "fix what judges say". Jika loop 1-2 gagal, loop 3-6 juga akan gagal karena pendekatan sama. BUTUH strategi alternatif.

**STRATEGI PILIHAN — Gunakan salah satu, atau kombinasikan:**

**Strategi A: "Targeted Fix" (DEFAULT — gunakan untuk loop #1):**
- Fix HANYA dimensi yang skor < max, persis seperti feedback dari judge
- Gunakan per-dimension fix strategies dari 10a-iii di atas
- Cocok untuk: masalah spesifik (1-2 dimensi di bawah max, sisanya max)
- Risiko: bisa menurunkan skor dimensi lain yang tadinya max ("over-correction")

**Strategi B: "Complete Rewrite from Different Angle" (gunakan untuk loop #2 atau jika Strategi A gagal):**
- JANGAN fix konten yang ada. TULIS ULANG DARI NOL.
- Gunakan Content DNA dari Step 5.7 TAPI dengan emotional anchor BERBEDA dari sebelumnya
- Contoh: jika loop 1 pakai PROVOCATION → loop 2 pakai CURIOSITY
- Gunakan variasi yang BERBEDA dari yang menang sebelumnya (jika Banger menang → coba Free Write dari scratch)
- Cocok untuk: Originality terus gagal, atau skor stuck di angka yang sama
- Keuntungan: tidak ada "over-correction" karena tidak ada base content untuk di-fix

**Strategi C: "Constraint Reduction" (gunakan untuk loop #3 atau sebagai last resort):**
- Kurangi BEBAN checklist dan fokus HANYA pada 3 dimensi terpenting:
  1. Dimensi yang paling jauh dari max (priority #1)
  2. Originality (selalu priority karena gate)
  3. Reply Quality atau Engagement (pilih yang lebih rendah)
- Ignore sementara dimensi yang sudah max atau hampir max
- Tulis dengan lebih "risky" — prioritaskan natural flow over perfect compliance
- Referensi Dimension Compatibility Rules: "safe tapi kaku" < "risky tapi natural"
- Cocok untuk: semua dimensi di bawah max, atau skor stuck di 17-19/23
- Keuntungan: AI lebih bebas → konten lebih natural → dimensi quality score naik

**Strategi D: "Morph Existing" (kombinasi terbaik — gabung A + B):**
- Ambil KALIMAT TERBAIK dari konten yang ada (yang judge score tinggi)
- Buat kalimat-kalimat baru yang mengelilinginya menggunakan DNA dari Step 5.7
- Jangan copy-paste konten lama. Ambil IDE dari kalimat terbaik, lalu tulis ulang dengan gaya BERBEDA
- Cocok untuk: 1-2 kalimat bagus tapi konten keseluruhan lemah
- Keuntungan: mempertahankan apa yang bekerja, mengganti apa yang tidak

**STRATEGI SELECTION LOGIC (v9.5 — Root Cause-Based, BUKAN loop-number-based):**

**⚠️ PERUBAHAN DARI v9.4:** Strategi TIDAK lagi ditentukan oleh nomor loop. Strategi ditentukan oleh ROOT CAUSE dari feedback. Ini mengurangi wasted loops karena strategi langsung cocok dengan masalah yang sebenarnya.

**Step 1: IDENTIFIKASI ROOT CAUSE dari aggregated judge feedback:**

```
═══ ROOT CAUSE ANALYSIS ═══

Baca aggregated judge feedback (Step 7e) dan identifikasi:

RC-A. AI FINGERPRINT (J5 menemukan pola AI spesifik)
     → Kata AI yang ditemukan: [list]
     → Jumlah pola: [N] items
     → Severity: LOW (1-2 items) / MEDIUM (3-5 items) / HIGH (6+ items)

RC-B. TONE MISMATCH (multiple judges sebut style/tone salah)
     → Style energy yang diminta: [HIGH/MEDIUM/LOW]
     → Tone yang didapat: [deskripsi]
     → Severity: LOW / MEDIUM / HIGH

RC-C. WEAK HOOK/ENDING (Engagement atau Reply Quality < 5/5)
     → Hook issue: [YA/TIDAK]
     → Ending issue: [YA/TIDAK]
     → Specificity issue: [YA/TIDAK]
     → Severity: LOW / MEDIUM / HIGH

RC-D. COMPLIANCE VIOLATION (Compliance < 2/2)
     → Jenis violation: [prohibited/banned/format/limit]
     → Severity: LOW / MEDIUM / HIGH (berdasarkan jenis violation)

RC-E. OVERALL "AI FEEL" (multiple judges bilang konten terasa AI overall)
     → Bukan 1 masalah spesifik tapi "vibe" keseluruhan
     → Judges yang menyebut: [N] dari [total]
     → Severity: LOW (1 judge) / MEDIUM (2 judges) / HIGH (3+ judges)

RC-F. FACTUAL ISSUE (Accuracy < 2/2)
     → Jenis: [fabrication/unverifiable/inaccurate]
     → Fakta bermasalah: [list]
     → Severity: LOW / MEDIUM / HIGH
```

**Step 2: PILIH STRATEGI berdasarkan root cause:**

```
═══ STRATEGY MAPPING ═══

Root Cause               → Strategi        → Kenapa
─────────────────────────────────────────────────────────────────
RC-A LOW (1-2 AI words)  → Strategi A       → Cukup ganti kata yang spesifik
RC-A MEDIUM (3-5 items)  → Strategi A       → Fix semua, tapi tetap targeted
RC-A HIGH (6+ items)     → Strategi B       → Terlalu banyak pattern → rewrite dari nol
RC-B LOW/MEDIUM          → Strategi A       → Fix tone, pertahankan konten
RC-B HIGH                → Strategi B       → Tone salah total → rewrite dari nol
RC-C LOW                 → Strategi A       → Fix hook/ending spesifik
RC-C MEDIUM              → Strategi D       → Morph: pertahankan bagian baik, fix ending
RC-C HIGH                → Strategi B       → Hook+ending+body semua lemah → rewrite
RC-D LOW/MEDIUM          → Strategi A       → Fix violation spesifik (compliance = surgical)
RC-E LOW (1 judge)       → Strategi A       → Might be false positive, coba targeted fix dulu
RC-E MEDIUM (2 judges)   → Strategi D       → Morph: ubah "vibe" tanpa buang konten
RC-E HIGH (3+ judges)    → Strategi B       → Konten terlalu AI → rewrite dari nol
RC-F LOW/MEDIUM          → Strategi A       → Fix fakta spesifik
RC-F HIGH                → Strategi A+C     → Fix fakta + kurangi constraint

MULTIPLE ROOT CAUSES:
- RC-A + RC-C             → Strategi D (morph: fix AI patterns + pertahankan hook)
- RC-B + RC-E             → Strategi B (rewrite: tone salah + AI feel)
- RC-D + anything         → Strategi A dulu (compliance MUST fixed first)
- RC-A + RC-B + RC-C      → Strategi B (terlalu banyak masalah → rewrite)
```

**Step 3: STRATEGI SELECTION OVERRIDE — Stability Check:**
```
Jika loop sebelumnya pakai Strategi X dan skor TURUN:
→ JANGAN ulang Strategi X dengan intensitas lebih tinggi
→ Pindah ke strategi BERBEDA (bukan A→A lagi, tapi A→B atau A→D)

Jika 2 loop berturut-turut skor SAMA:
→ Strategi saat ini tidak efektif → GANTI strategi (bukan repeat)
```

**⚠️ RULE:**
1. **ALWAYS fix RC-D (compliance) first**, regardless of other root causes. Compliance violation = gate fail.
2. **JANGAN pernah menggunakan Strategi A 3 kali berturut-turut.** Jika Strategi A gagal 2x, wajib ganti strategi.
3. **Jika root cause tidak jelas** (semua dimensi mediocre tapi tidak ada 1 masalah dominan) → pakai Strategi B (Complete Rewrite).

**10b. Rewrite the winning variation:**
- Fix ALL issues raised in judge feedback priorities (from Step 7e aggregated feedback)
- Apply the `example_after` patterns from judge feedback
- Keep what worked (check what judges scored well)
- Apply anti-AI rules again
- Verify sanitization
- Re-check against knowledge base + website (anti-fabrication)
- Verify competitive differentiation (not using overused phrases)
- **⚠️ Re-check style energy level**: Jika feedback menyebut style mismatch, pastikan rewrite cocok dengan style energy level dari Step 5b
- **⚠️ v9.1 MAX-OUT RE-VERIFICATION**: SEBELUM kirim ke re-judge, jalankan ULANG Step 6.5 MAX-OUT Self-Verification untuk variasi yang di-rewrite. Pastikan dimensi yang sebelumnya FAIL sekarang PASS. Jika masih FAIL → rewrite ULANG sebelum re-judge.

**10c. Re-Judge (same architecture as Step 7 — Multi-Judge Panel):**

1. **LLM Multi-Judge Panel** (Tool 4) — same 5 personas + self-judge (sama seperti Step 7)
2. Jika beberapa gagal → gunakan yang tersedia (min 3 required)
3. Use the **single-variation judge prompt** (see below) instead of the 3-variation prompt
4. chat.qwen.ai (Tool 5) — optional tiebreaker, same trigger rules as Step 7

**⚠️ If < 3 judges complete:** STOP. Tampilkan variasi tanpa skor.

**10c-i. Single-Variation Judge Prompt (for re-judge only):**
Use the same judge prompt as Step 7, but replace all 3 variation sections with only the improved variation:

**⚠️ v9.5 COMPRESSED CONTEXT MODE (untuk loop #2+):**
Jika feedback loop sudah di loop #2 atau lebih, DAN context sudah 70%+ terpakai, gunakan COMPRESSED prompt yang menghilangkan detail rubric (judge sudah tahu rubric dari loop #1):

```
═══ IMPROVED CONTENT VARIATION (after feedback loop #[N]) ═══
[INSERT IMPROVED VARIATION TEXT]

═══ PREVIOUS SCORES (for reference) ═══
[If first re-judge: "Initial Consensus: [X]/23"]
[If subsequent re-judge: "Loop [N-1] Consensus: [X]/23"]
Issues to fix: [list from previous feedback]

═══ COMPRESSED RUBRIC (loop #[N] — judges already know the full rubric) ═══
Score each category 0-2 (gates) or 0-5 (quality). Be brutally honest.
Focus on: did the specific issues from previous feedback get fixed?
═══ CAMPAIGN CONTEXT (abbreviated) ═══
[ONLY include: style, requirements, prohibited items, KB key facts (top 5 only)]
```

** Kenapa aman:** Judge sudah menginternalisasi rubric dari loop #1. Menghapus detail rubric di loop #2+ TIDAK mengurangi akurasi karena judge persona sudah "terlatih" dari loop sebelumnya.

```
═══ IMPROVED CONTENT VARIATION (after feedback loop #[N]) ═══
[INSERT IMPROVED VARIATION TEXT]

═══ PREVIOUS SCORES (for reference) ═══
[If first re-judge: "Initial Consensus: [X]/23"]
[If subsequent re-judge: "Loop [N-1] Consensus: [X]/23"]
Issues to fix: [list from previous feedback]
```
And change the JSON output to single variation:
```json
{
  "originality": N, "alignment": N, "accuracy": N, "compliance": N,
  "engagement": N, "technical": N, "reply_quality": N,
  "total_score": N, "percentage": N, "verdict": "PASS" or "FAIL",
  "improvement_from_previous": true or false,
  "issues_found": ["list every remaining issue"],
  "improvement_priorities": [
    {
      "priority": 1,
      "category": "Category Name",
      "current_score": N, "max_score": N,
      "action": "Short action title",
      "how": "Detailed explanation of how to improve (2-3 sentences)",
      "example_before": "Exact weak sentence from the improved content",
      "example_after": "How to rewrite it to be better"
    },
    {
      "priority": 2,
      "category": "Another Category",
      "current_score": N, "max_score": N,
      "action": "Short action title",
      "how": "Detailed explanation",
      "example_before": "Exact weak sentence from the improved content",
      "example_after": "How to rewrite it to be better"
    }
  ],
  "feedback": "brutal honest assessment"
}
```

**improvement_priorities WAJIB diisi dalam re-judge juga** — ini membantu menentukan apakah feedback loop perlu dilanjutkan atau sudah cukup. Jika semua categories sudah score max, improvement_priorities boleh kosong array `[]`.

**10d. Re-apply consensus + G4 + X-Factor** on the new scores.

**10e. Increment loop counter:** `loop_count += 1`

**Maximum 3 re-judges per cycle** (4 total evaluations: 1 initial + 3 feedback loops). On 3rd re-judge (`loop_count == 3`), **DO NOT auto-accept**. HARUS tanya user dulu (lihat HALT AND ASK di bawah).

**⚠️ HALT AND ASK — WAJIB di SETIAP AKHIR CYCLE (loop_count == 3):**

Setiap kali batas loop tercapai (3/3 loop) DAN skor BELUM mencapai max di semua dimensi, AI HARUS menghentikan pipeline dan menanyakan user:

```
⚠️ BATAS FEEDBACK LOOP TERCAPAI (3/3 loop)

Skor saat ini: [X]/23
Dimensi masih di bawah max:
  - [Nama Dimensi 1]: [skor]/[max] — [alasan singkat dari judge]
  - [Nama Dimensi 2]: [skor]/[max] — [alasan singkat dari judge]
Perbaikan dari loop terakhir: [naik [Y] poin / turun [Y] poin / stagnan]

Pilihan:
1. Loop lagi (reset counter, coba strategi baru) — tambahan 3 loop
2. Terima versi terbaik sekarang ([X]/23)

Ketik nomor (1-2).
```

**Jika user pilih 1 (Loop lagi):**
- Reset `loop_count = 0`
- Gunakan strategi yang BERBEDA dari 3 loop sebelumnya (jika loop 1-3 fokus fix hook, loop 4-6 coba angle yang sama sekali berbeda)
- Jika sudah 2 cycle (6 loop total) dan masih belum max → WAJIB accept, tampilkan warning

**Jika user pilih 2 (Terima sekarang):**
- Output versi terbaik (BUKAN versi terakhir — gunakan Stability Tracker best_content)
- Jika skor < 22/23, tampilkan warning: "⚠️ BELOW MAX-OUT TARGET"
- Catat di learning log sebagai "near-miss" + analisis root cause

**⚠️ v9.5 STABILITY CHECK — WAJID di SETIAP AKHIR LOOP:**

```
═══ STABILITY CHECK (setelah setiap re-judge) ═══
Loop #[N] skor: [X]/23
Best score so far: [Y]/23 (loop #[M])
Perubahan: [+N / -N / 0] dari skor terbaik

→ Jika skor_naik: UPDATE best_score, LANJUT loop
→ Jika skor_sama: LANJUT 1 loop lagi (boleh stagnan 1x)
→ Jika skor_turun: ⚠️ STABILITY ALERT → REVERT ke best_content
```

**⚠️ v9.5 STABILITY RULES:**
1. **Jika skor TURUN dari best_score** → AUTO-REVERT ke best_content. TANYA user: "Skor turun dari [best]/23 ke [current]/23 setelah loop #[N]. Revert ke versi terbaik dan terima?"
2. **Jika skor SAMA 2x berturut-turut** → STOP. "Skor stagnan di [X]/23 setelah 2 loop. Lanjut loop atau terima?"
3. **Jangan PERNAH output versi yang lebih buruk dari best_score.** Stability tracker memastikan ini.
4. **Edge case:** Jika skor turun TAPI best_score sudah di-loop #0 (awal), dan loop #1 menghasilkan skor yang lebih rendah → jangan loop lagi. Tanya user.

**⚠️ HALT AND ASK trigger tambahan selama feedback loop:**
- Jika setelah loop ke-2 skor TIDAK NAIK atau bahkan TURUN → **STOP dan TANYA user**: "Skor tidak membaik setelah 2x feedback loop ([X]/23 → [Y]/23). Mau saya coba angle yang sama sekali berbeda, atau sudah cukup dengan versi terbaik sekarang?"
- Jangan lanjut ke loop ke-3 jika polanya jelas tidak membaik — itu buang-buang resource dan user time.
- **STABILITY ALERT selalu override loop counter.** Jika skor turun, STOP terlepas dari berapa loop tersisa.

---

### STEP 11: Final Output

**⏱ Estimated time: 10-20 seconds** (formatting only — no external calls)

**CRITICAL: The output MUST be formatted so the user can COPY-PASTE the content DIRECTLY to X/Twitter without ANY modification.**

**After this step completes:** Update checkpoint: add `11` to `completed_steps`. Pipeline COMPLETE. Clean up checkpoint (optional: keep for reference).

### STEP 11b: Content Auto-Save to History (MANDATORY)

**⏱ Estimated time: 5 seconds** (file write only — no external calls)

**Setiap kali Step 11 selesai, AI HARUS menyimpan konten final ke content history.**

**TUJUAN:** Menyimpan konten yang sudah dibuat agar bisa diakses nanti oleh Q&A Generator (opsi 4).

**FILE:** `/home/z/my-project/download/rally_content_history.jsonl` (JSON Lines format, 1 entry per line)

**FORMAT setiap entry:**
```json
{
  "timestamp": "ISO-8601",
  "campaign_name": "string",
  "campaign_id": "string",
  "content_type": "tweet|thread",
  "content": "string — konten final (X-ready, plain text)",
  "score": "number — skor final adjusted (contoh: 22.5)",
  "grade": "string — S+/S/A/B/C/D/F",
  "language": "string — bahasa konten (en/id/dll)",
  "style_energy": "string — banger/casual/analytical",
  "category_breakdown": {
    "originality": "X/2",
    "content_alignment": "X/2",
    "accuracy": "X/2",
    "compliance": "X/2",
    "engagement": "X/5",
    "technical_quality": "X/5",
    "reply_quality": "X/5"
  },
  "campaign_data_snapshot": {
    "style": "string — style dari campaign",
    "knowledge_base_length": "number — panjang KB",
    "character_limit": "number|null",
    "prohibited_items": ["array"]
  }
}
```

**RULES:**
- WAJIB append ke file (BUKAN overwrite) — gunakan format JSONL (1 JSON object per baris)
- Jika file belum ada, buat baru
- Jangan simpan data yang terlalu besar (KB disimpan sebagai length saja, bukan full content)
- Content yang disimpan = konten final dari Part 1 (X-ready)

The final output has THREE parts:
1. **X-READY CONTENT** -- Plain text, no markdown, no formatting artifacts. Ready to paste.
2. **ANALYSIS** -- Scoring breakdown, judge notes, compliance checks (informational only).
3. **⚡ IMPROVEMENT PRIORITIES** -- Concrete, actionable feedback dari judges untuk meningkatkan kualitas konten.

---

#### PART 1: X-READY CONTENT (COPY THIS)

**Format rules for X-ready content:**
- The content MUST be inside a code block (```) for easy selection/copy
- NO markdown formatting inside (no **bold**, no # heading, no > blockquote)
- ONLY straight double quotes ("") -- NO smart/curly quotes
- NO em-dashes (—), NO en-dashes (–), NO double-hyphens (--) as dashes
- NO triple dots (…) -- use single dots (...) or just one period
- **Paragraphs separated by exactly ONE blank line** (single newline on X)
- **NO extra spacing, NO extra line breaks, NO indentation** -- clean plain text only
- Hashtags included naturally in the text (max 2)
- If contentType = "thread", each tweet separated by a blank line with `[TWEET N]` marker
- Display character count below the content block
- **The content should look like a real tweet when pasted** -- nothing more, nothing less

**Output format:**

```
═══ X-READY CONTENT ═══
[Paste directly to X/Twitter -- no changes needed]

[tweet text line 1]
[tweet text line 2]

[tweet text line 3]
[hashtag if needed]

Characters: [N] / [limit or "no limit"]
```

**If contentType = "thread" (multiple tweets):**

```
═══ X-READY THREAD ═══
[Paste each tweet separately to X/Twitter]

─── Tweet 1 ───
[first tweet text]

─── Tweet 2 ───
[second tweet text]

─── Tweet 3 ───
[third tweet text]

Total characters: [N] across [M] tweets
```

**X-COMPATIBILITY CHECKLIST (run before outputting):**
1. ✅ No markdown (no **, no #, no >, no - bullets)
2. ✅ Straight quotes only (no " " ' ')
3. ✅ No dashes (no —, –, --)
4. ✅ No smart ellipsis (…), use ... or single .
5. ✅ No HTML entities (&amp; etc)
6. ✅ Line breaks are single newlines (X doesn't support double-spacing in tweets)
7. ✅ Max 2 hashtags
8. ✅ Max 1 emoji
9. ✅ Character count within limit (if characterLimit exists)
10. ✅ No trailing whitespace on any line
11. ✅ No leading whitespace on any line (unless X supports it -- usually don't)

---

#### PART 2: ANALYSIS (for your reference)

```
═══ SCORING ═══
J1 (Harsh Critic):  [X]/23.0 ([Y]%)  [LLM, temp=0.2]
J2 (Avg X User):    [X]/23.0 ([Y]%)  [LLM, temp=0.7]
J3 (Rally Clone):   [X]/23.0 ([Y]%)  [LLM, temp=0.4]
J4 (Contrarian):    [X]/23.0 ([Y]%)  [LLM, temp=0.9]
J5 (AI Detector):   [X]/2 Originality only
J6 (Self-Judge):    [X]/23.0 ([Y]%)  [Main AI, full context]
J7 (Qwen Tiebreak): [X]/23.0 ([Y]%)  [optional -- triggered if range > 4pts]
Consensus:          [X]/23.0 ([Y]%)  [min gates, avg quality, [N] judges]
G4 Adjustment:      [+/N] points
X-Factor:           +[N] points
Adjusted:           [X]/23.0 ([Y]%) -- Grade [grade]
Judge Agreement:    [YES/NO] (range: [X] pts)
Rounds: [N]

═══ POSITION ═══
Based on [N] real Rally submissions:
- Our score [X]% vs Top 10% threshold [P90]%: [ABOVE/BELOW]
- Our score [X]% vs Average [Mean]%: [ABOVE/BELOW]
- Estimated position: [Top 10% / Top 25% / Top 50% / Average / Below Average]

═══ CATEGORY BREAKDOWN ═══
Originality:       [X]/2
Content Alignment: [X]/2
Accuracy:          [X]/2
Compliance:        [X]/2
Engagement:        [X]/5
Technical Quality: [X]/5
Reply Quality:     [X]/5

═══ G4 ORIGINALITY ═══
Bonuses: [list]
Penalties: [list]
Net: [+/N]

═══ X-FACTOR ═══
[list detected factors]

═══ ALL VARIATIONS SCORED ═══
[A] A:[X]/23 B:[X]/23 Cons:[X]/23 Adj:[X]/23 -- [grade] -- [verdict]
[B] A:[X]/23 B:[X]/23 Cons:[X]/23 Adj:[X]/23 -- [grade] -- [verdict]
[C] A:[X]/23 B:[X]/23 Cons:[X]/23 Adj:[X]/23 -- [grade] -- [verdict]

═══ JUDGE NOTES ═══
Judge A: [Judge A's feedback]
Judge B: [Judge B's feedback]

═══ COMPETITIVE CHECK ═══
Used recommended angle: [YES/NO]
Used overused competitor phrases: [NONE / list]
Exploited gaps: [list which gaps were addressed]
Similarity to competitors: [LOW/MEDIUM/HIGH]

═══ COMPLIANCE CHECK ═══
Banned words (21): OK/FAIL [list violations]
Rally banned phrases (17): OK/FAIL [list violations]
AI patterns (42): OK/FAIL [list violations]
Template phrases (21): OK/FAIL [list violations]
Character count: [N] chars (limit: [characterLimit]) OK/FAIL
Style match: OK/FAIL
Requirements met: OK/FAIL
AdditionalInfo followed: OK/FAIL
ProhibitedItems clean: OK/FAIL
Human artifacts: OK/FAIL [list]
Anti-fabrication: OK/FAIL [list any unverified claims]
```

---

#### PART 3: ⚡ IMPROVEMENT PRIORITIES (How to Make This Content S+)

**⚠️ MANDATORY: Selalu tampilkan section ini di final output.**

```
═══ ⚡ CARA MENINGKATKAN KONTEN INI (BUKAN Menurunkan Standar) ═══

✅ Apa yang Perlu Ditingkatkan

Prioritas 1: [Action title — impact terbesar]
Kategori: [Category Name] (skor: [current]/[max] → target: [max])
Cara: [how — 2-3 kalimat detail]
Sebelum: "[example_before dari konten]"
Sesudah: "[example_after — versi yang lebih baik]"

Prioritas 2: [Action title]
Kategori: [Category Name] (skor: [current]/[max] → target: [max])
Cara: [how]
Sebelum: "[example_before]"
Sesudah: "[example_after]"

Prioritas 3: [Action title — jika ada]
...

═══════════════════════════════════

🧠 Detail per Judge:
J1 (Harsh Critic):  [1 kalimat top feedback]
J2 (Avg X User):    [1 kalimat top feedback]
J3 (Rally Clone):   [1 kalimat top feedback]
J4 (Contrarian):    [1 kalimat top feedback]
J5 (AI Detector):   [AI patterns found atau "clean"]
J6 (Self-Judge):    [1 kalimat top self-critique]
```

**RULES untuk Part 3:**
1. SELALU fokus MENINGKATKAN kualitas — BUKAN menurunkan standar/scoring
2. Priority #1 = hal yang akan meningkatkan skor PALING BANYAK
3. example_before HARUS dari konten yang sebenarnya — BUKAN contoh generik
4. example_after HARUS menunjukkan cara konkret memperbaiki — BUKAN sekadar "improve"
5. Jika konten sudah S+ (22+/23), tampilkan "Konten sudah S+. Tidak ada perbaikan kritis." dan skip Prioritas.

**Output order:** PART 1 (X-READY) → PART 2 (ANALYSIS) → PART 3 (IMPROVEMENT PRIORITIES).

---

## 🔄 Q&A Generator v1.0 (Opsi 4 — Fitur Terpisah)

**OVERVIEW:** Fitur ini generate 20 Q&A berkualitas tinggi dari konten yang SUDAH PERNAH DIBUAT. Bukan bagian dari pipeline konten — ini fitur terpisah yang dijalankan SETELAH konten selesai.

**ALUR:**
```
User pilih opsi 4
    → AI baca content history
    → Tampilkan daftar konten (campaign, tanggal, skor, preview)
    → User pilih konten mana
    → AI fetch ulang data campaign (KB, style, dll)
    → AI generate 20 Q&A berdasarkan konten + campaign data
    → Output: 20 Q&A berkualitas tinggi
```

### Step Q1: Load Content History

**File:** `/home/z/my-project/download/rally_content_history.jsonl`

Baca semua entry dari file history. Untuk setiap entry, tampilkan:

```
═══ KONTEN YANG PERNAH DIBUAT ═══

[N]. [Campaign Name] | [Tanggal] | Skor: [X]/23 ([Grade]) | [Bahasa]
    Preview: "[1 kalimat pertama dari konten]"
    Style: [banger/casual/analytical] | Type: [tweet/thread]

...
```

**Jika file kosong atau tidak ada:**
```
Belum ada konten yang pernah dibuat. Buat konten dulu dengan opsi 1, lalu kembali ke sini untuk generate Q&A.
```

### Step Q2: User Pilih Konten

Tunggu user memilih nomor konten. Setelah user pilih:

1. Ambil entry yang dipilih dari history
2. Ambil `campaign_id` dari entry
3. Fetch ULANG data campaign dari Rally API menggunakan `campaign_id`

### Step Q3: Fetch Campaign Data (Ulang)

**TUJUAN:** Mendapatkan data campaign terkini (KB, style, requirements, dll) agar Q&A akurat.

**API Call:**
```bash
curl -s "https://app.rally.fun/api/campaigns/[campaign_id]"
```

**Data yang HARUS diambil:**
- `style` — untuk match tone Q&A
- `knowledgeBase` — SUMBER UTAMA jawaban Q&A (anti-fabrication)
- `requirements` — untuk tahu apa yang fokus campaign
- `prohibitedItems` — Q&A tidak boleh menyebut hal prohibited
- `additionalInfo` — context tambahan
- `characterLimit` — untuk scope Q&A
- Reference tweets (jika ada) — untuk tone matching

**⚠️ ANTI-FABRICATION BERLAKU PENUH:** Semua fakta di jawaban Q&A HARUS dari KB. Jika KB tidak punya jawaban, jawaban HARUS mengatakan "based on what I know from the campaign..." dengan bahasa yang tepat. JANGAN mengarang fakta.

### Step Q4: Generate 20 Q&A

**TUJUAN:** Generate 20 Q&A berkualitas tinggi yang spesifik ke konten yang dipilih DAN campaign yang terkait.

**SUMBER DATA untuk Q&A:**
- **Konten yang dipilih** — SETIAP Q&A HARUS merujuk ke bagian spesifik dari konten ini
- **Knowledge Base campaign** — SEMUA jawaban HARUS bersumber dari sini
- **Style campaign** — tone Q&A HARUS cocok dengan style
- **Reference tweets** — untuk tone matching

**FORMAT setiap Q&A:**
```
Q[N]. [CATEGORY]
"[pertanyaan — personal, spesifik, merujuk ke konten]"
→ [jawaban — dari KB campaign, 2-3 kalimat]
```

**CATEGORY (WAJIB — setiap Q&A HARUS punya 1 category):**
- `[REPLY]` — pertanyaan genuine untuk reply di X (boost engagement)
- `[ORIGINALITY]` — angle/pertanyaan unik yang belum dibahas di konten (new perspective)
- `[ENGAGEMENT]` — hook/provoke yang bikin orang mau diskusi
- `[DEPTH]` — pertanyaan yang menunjukkan pemahaman mendalam

**DISTRIBUSI WAJIB — 20 Q&A HARUS mencakup:**
| # | Category | Jumlah |
|---|----------|--------|
| 1 | `[REPLY]` | 5-7 |
| 2 | `[ORIGINALITY]` | 4-5 |
| 3 | `[ENGAGEMENT]` | 4-5 |
| 4 | `[DEPTH]` | 4-5 |

**⚠️ JIKA TOTAL TIDAK SAMPAI 20** → AI HARUS generate lebih sampai tepat 20.

### Step Q5: Kualitas Q&A — 5 KRITERIA WAJIB

**Kriteria 1: PERSONAL (terdengar seperti orang asli di X)**
- ✅ Menggunakan "I", "me", "my", "gw", "gue"
- ✅ Ada MOMEN SPESIFIK ("was reading this thread", "pas baca konten tentang...")
- ✅ Ada EMOSI (curiosity, confusion, excitement)
- ✅ Stream of consciousness — seperti orang yang lagi mikir
- ✅ **Pendek seperti postingan X yang nyata** — Q: 1-2 kalimat maks, A: 2-3 kalimat maks
- ✅ **Natural X voice** — terdengar seperti orang yang tau soal project, bukan orang yang lagi kutip dokumen
- ❌ TIDAK boleh formal ("What are the implications of...")
- ❌ TIDAK boleh generic ("What do you think about this?")
- ❌ TIDAK boleh AI-sounding ("I'd love to hear your thoughts")
- ❌ TIDAK boleh panjang/essay — Q&A harus bisa dibaca dalam 5 detik

**Kriteria 2: SPESIFIK KE KONTEN (HARUS merujuk ke konten)**
- ✅ Menyebut BAGIAN SPESIFIK dari konten yang dipilih
- ✅ Contoh: "di konten disebut [X]... tapi yang bikin saya penasaran..."
- ✅ Q&A HARUS tidak bisa diterapkan ke campaign lain (terlalu generic = REJECT)
- ❌ TIDAK boleh bisa diganti campaign lain dan masih masuk akal
- ❌ TIDAK boleh tidak ada hubungan dengan konten

**Kriteria 3: BERKUALITAS TINGGI (menunjukkan kedalaman)**
- ✅ Menunjukkan bahwa penanya BENAR-BENAR membaca konten
- ✅ Menghubungkan fakta dari konten + KB
- ✅ Menemukan GAP atau CONTRADICTION yang menarik
- ❌ TIDAK boleh bisa dijawab dengan "ya" atau "tidak"
- ❌ TIDAK boleh sudah dijawab di konten

**Kriteria 4: SESUAI CAMPAIGN (konsisten)**
- ✅ Tone cocok dengan style campaign (banger = bold, casual = santai)
- ✅ Bahasa SAMA dengan bahasa konten
- ✅ Tidak menyebut prohibited items
- ✅ Fakta di jawaban HARUS bisa ditrace ke KB campaign (anti-fabrication)
- ✅ **NOL REFERENSI DOKUMEN** — jawaban DILARANG menyebut "the KB", "the campaign says", "the website says", "according to the docs", "from what I've read in the docs"
- ✅ Fakta dari KB/website BOLEH dipakai tapi WAJIB disampaikan natural (seperti orang X yang tau, bukan orang yang lagi kutip)

**BANNED PHRASES untuk jawaban Q&A (INSTANT REWRITE jika ditemukan):**
- "the KB says/states/mentions/mentions"
- "according to the KB/campaign/website/docs"
- "the campaign materials say"
- "from what I've read in the docs/campaign/KB"
- "the [source] explains that"
- "the [source] describes"

**Kriteria 5: OPINI = OPINI (honest framing)**
- ✅ Kalau klaim TIDAK ada di KB/website, WAJIB bingkai sebagai opini/pertanyaan terbuka
- ✅ Bingkai yang BENAR: "I haven't seen...", "nobody's talking about...", "imo", "honestly not sure", "genuinely can't figure out"
- ❌ DILARANG menyatakan opini sebagai fakta (contoh: "the KB says [klaim yang sebenarnya bukan dari KB]")
- ❌ DILARANG mengarang contoh/fakta lalu mengklaimnya berasal dari sumber resmi

### Step Q6: Q&A Output Format

```
═══ 20 Q&A — [Campaign Name] ═══
Konten: "[1 kalimat pertama konten]"
Skor konten: [X]/23 ([Grade])
Bahasa: [bahasa] | Style: [style energy]

---

Q1. [REPLY]
"[pertanyaan personal yang merujuk ke konten]"
→ [jawaban — natural X voice, fakta dari KB disampaikan tanpa referensi dokumen]

Q2. [ORIGINALITY]
"[pertanyaan dengan angle baru yang belum di konten]"
→ [jawaban — natural X voice, opini dibingkai sebagai opini]

... (sampai Q20)

---

═══ SUMMARY ═══
Untuk Reply ke orang lain:     Q1, Q5, Q8, Q12, Q17
Untuk Sudut pandang baru:      Q2, Q4, Q9, Q14, Q20
Untuk Engagement/provoke:      Q3, Q6, Q11, Q16, Q19
Untuk Pemahaman mendalam:     Q7, Q10, Q13, Q15, Q18
```

### Step Q7: Akurasi Verification (WAJIB — sebelum Quality Check)

**⚠️ SEBELUM quality check, AI HARUS memverifikasi akurasi SETIAP jawaban melawan KB + website.** Ini adalah gate anti-misinformation.

**Untuk SETIAP jawaban (1-20), cek:**

```
═══ AKURASI VERIFICATION ═══

Q[N]:
  Fakta yang dinyatakan: [list fakta dalam jawaban]
  Sumber verifikasi: [KB / website / OPINI]
  Verdict: ✅ BENAR / ⚠️ MINOR (opini dibingkai sebagai fakta?) / ❌ SALAH (fabricated/misleading)
  Jika ❌: [apa yang salah dan bagaimana fix]
```

**3 jenis verifikasi:**

1. **✅ BENAR** — Fakta ada di KB atau website. Dibingkai natural tanpa referensi dokumen.
2. **⚠️ MINOR** — Analisis/opini yang dibingkai sebagai fakta. Fix: tambahkan bingkai opini ("imo", "I haven't seen", dll).
3. **❌ SALAH** — Klaim yang tidak ada di KB/website, atau fabricated contoh, atau asumsi yang menyesatkan. Fix: hapus klaim atau bingkai ulang sebagai pertanyaan terbuka.

**ACCEPTANCE:**
- ❌ SALAH = 0 toleransi. FIX WAJIB.
- ⚠️ MINOR = fix sebelum output.
- ✅ BENAR = lanjut.

**Jika ada jawaban ❌ SALAH → FIX JAWABAN TERSEBUT, lalu re-verifikasi.** Jangan output sebelum semua ✅ atau ⚠️ sudah di-fix.

### Step Q7b: Q&A Quality Self-Check

Setelah akurasi verification lolos, AI HARUS menjalankan quality check INTERNAL:

```
═══ Q&A QUALITY CHECK ═══
Total Q&A generated: 20/20 ✅/❌
Distribution check:
  [REPLY]: [N] (target: 5-7) ✅/❌
  [ORIGINALITY]: [N] (target: 4-5) ✅/❌
  [ENGAGEMENT]: [N] (target: 4-5) ✅/❌
  [DEPTH]: [N] (target: 4-5) ✅/❌

Quality check:
  Personal tone (uses "I"/specific moment): [N]/20 ✅/❌ (target: 20/20)
  References specific content part: [N]/20 ✅/❌ (target: 20/20)
  Cannot apply to other campaigns: [N]/20 ✅/❌ (target: 18+/20)
  Short format (Q: 1-2 sentences, A: 2-3 sentences): [N]/20 ✅/❌ (target: 20/20)
  Natural X voice (not document-quoting): [N]/20 ✅/❌ (target: 20/20)
  Zero document references (no "the KB", etc): [N]/20 ✅/❌ (target: 20/20)
  All opinions framed as opinions: [N]/20 ✅/❌ (target: 20/20)
  All facts traceable to KB/website: [N]/20 ✅/❌ (target: 20/20)
  Style consistency: [N]/20 ✅/❌ (target: 20/20)
  Engagement-worthiness (provokes real reply): [N]/20 ✅/❌ (target: 20/20)
```

**Jika quality check gagal di item manapun → REWRITE Q&A yang gagal sebelum output ke user.**

---

### Step 11c: Post-Submission Rally Score Collection (v9.5 — OPTIONAL)

**TUJUAN:** Mengumpulkan skor RALLY ASLI untuk kalibrasi internal judge accuracy. Ini menutup feedback loop yang selama ini terbuka — kita tahu konten bagus dari internal judge, tapi TIDAK PERNAH tahu skor Rally yang sebenarnya.

**ALUR:**
```
Setelah Step 11 (output konten) selesai, tanya user:
═══ POST-SUBMISSION FEEDBACK ═══
Konten sudah siap! Setelah kamu submit ke Rally, kirimkan skor Rally yang asli ya.

Cara cek:
1. Buka Rally.fun → campaign → My Submissions
2. Lihat skor Rally AI judge (Originality, Alignment, dll)
3. Balas pesan ini dengan format:

Format:
  Rally Originality: [X]/2
  Rally Content Alignment: [X]/2
  Rally Information Accuracy: [X]/2
  Rally Campaign Compliance: [X]/2
  Rally Engagement Potential: [X]/5
  Rally Technical Quality: [X]/5
  Rally Reply Quality: [X]/5
  Rally Total: [X]/23

ATAU screenshot.

Jika tidak bisa cek → ketik "skip".
═══
```

**Jika user memberi skor Rally:**

Simpan ke learning log dengan entry khusus:
```json
{
  "timestamp": "[ISO-8601]",
  "campaign": "[campaign name]",
  "run_id": "[run_id dari run ini]",
  "type": "POST_SUBMISSION_CALIBRATION",
  "internal_score": [skor internal kita],
  "rally_score": [skor Rally asli],
  "score_diff": [rally - internal],
  "category_diffs": {
    "originality": [rally - internal],
    "alignment": [rally - internal],
    "accuracy": [rally - internal],
    "compliance": [rally - internal],
    "engagement": [rally - internal],
    "technical": [rally - internal],
    "reply_quality": [rally - internal]
  },
  "calibration_insight": "[apa yang kita pelajari dari perbandingan ini]"
}
```

**MENAPA INI PENTING:**
- Jika internal skor SELALU lebih tinggi dari Rally → internal judge terlalu lunak → perlu adjust
- Jika internal skor SELALU lebih rendah dari Rally → internal judge terlalu ketat → candidate untuk relax
- Jika diff tidak konsisten → judge sudah cukup calibrated, tidak perlu perubahan
- Setelah 5+ post-submission entries → Self-Improvement Engine bisa mengusulkan judge adjustment

**⚠️ RULE:** Post-submission data TIDAK pernah mengubah SKILL.md secara otomatis. Hanya digunakan sebagai insight untuk proposal perbaikan yang harus di-approve user.

---

## Troubleshooting

**chat.qwen.ai tiebreaker fails (page doesn't load / timeout):**
- Not critical — LLM panel (J1-J6) already completed
- Skip J7 and use 6-judge consensus
- If 6-judge consensus is already clear (range <= 4pts), J7 wouldn't have been triggered anyway

**Qwen returns non-JSON:**
- Extract scores from plain text
- Parse "PASS"/"FAIL" mentions

**LLM judge returns unexpected scores:**
- If a judge scores total > 23, clamp to 23
- If a judge scores a gate > 2, clamp to 2
- If a judge scores quality > 5, clamp to 5
- If scores seem completely wrong, exclude that judge from consensus

**Web search not activating on chat.qwen.ai:**
- Web search is usually enabled by default on chat.qwen.ai
- If not available, proceed without (note limitation)

**One variation fails all gates (score 0):**
- Check if Campaign Brief data was complete (style, KB, additionalInfo, requirements)
- Verify no prohibited items were used
- Verify no Rally banned phrases were used
- Re-read campaign rules carefully before rewriting

**Rally API returns 404:**
- Check contract address is correct 0x... format
- Campaign may have been deleted or is private
- Fall back to web_search + web_reader only

**Submissions API returns empty:**
- Campaign may be new with no submissions yet
- Proceed without calibration (use default thresholds)
- Note this as a limitation in final output

**Knowledge Base is empty or very short:**
- Proceed with anti-fabrication rules: use vague language for any unverified claims
- "a bunch of", "quite a few", "some", "growing fast" instead of specific numbers

**Character limit not specified in API:**
- NO LIMIT -- write freely, as long as naturally needed
- Do NOT default to 280 or 500
- Only enforce character limits when the campaign explicitly specifies one

**Judges disagree significantly (score range > 4 points):**
- Trigger J7 (chat.qwen.ai tiebreaker) for external perspective
- If J7 also fails → use available judges, note variance
- Trust consensus (min for gates, average for quality)
- If some judges give 0 on a gate and others give 2, consensus = min = 0 (gate fails)

**Some LLM judges fail (3-5 out of 6 complete):**
- Proceed with available judges (min 3 required)
- Note in output which judges failed
- Still apply G4 + X-Factor adjustments

**Most judges fail (< 3 complete):**
- STOP execution. Do NOT continue.
- Present the 3 content variations to the user WITHOUT any scores.
- Ask the user to pick which variation they prefer.
- Example message: "Judge panel gagal (hanya [N]/6 berhasil). Berikut 3 variasi konten tanpa skor. Pilih yang kamu suka."

**AI self-judge bias:**
- In v8.0, Self-Judge (J6) is ONE of 6 judges, not the only judge
- min() consensus formula neutralizes self-bias (if J6 gives 2/2 but others give 1/2, consensus = 1/2)
- J6's unique value is meta-quality insight (knows the thought process behind writing)
- 5 other persona judges provide independent counterbalance
