---
name: rally
description: "Generate Rally.fun social media content using a generate-then-judge workflow. Use this skill whenever the user wants to create content, tweets, or posts for Rally.fun campaigns. Trigger phrases: 'rally', '/rally', 'buat konten rally', 'buat tweet rally', 'rally content', 'generate rally', 'buat konten campaign', 'rally campaign', '/rally update', 'rally update', 'update patterns'. This skill handles: /rally = fresh otak + campaign picker + generate konten, /rally update = refresh Universal Pattern Library, full campaign data fetching via Rally API (style, knowledgeBase, additionalInfo, prohibitedItems, requirements, characterLimit), embedded universal pattern library from cross-campaign top content analysis (TRUE quality score (sum of 6 content categories, zero engagement bias), ground truth calibration from up to 200 real Rally submissions, competitive analysis via web search, content generation with anti-fabrication and pre-writing perspective, 6-judge panel (5 LLM personas + self-judge + optional tiebreaker), quality scoring based on Rally's 6 content categories (max 18.0 points) with G4 originality detection and X-factor scoring, feedback loops for content improvement, comprehensive anti-AI detection, priority-based judge feedback with actionable improvements. CRITICAL RULE: AI must NEVER self-judge its own content. If the judge fails, STOP and ASK the user to choose. v9.0 features: Data Fortress System (5-layer data extraction with field alias probe and completeness gate), Continuous Self-Improvement Engine (learning log + quality lock), Operating Principles integrity framework (zero tolerance for deception, comprehensive without compromise, full accountability, no shortcuts), Mission Directive Detection (celebrate/discuss/review tone adjustment), Celebration Mode (high energy launch content), Reference Tweet Integration (read, analyze, pass to judges). v9.4 features: Content Quality DNA (emotional anchor + writing character + first thought), Free Write variation (no formula/template — highest Originality probability), Dimension Compatibility Rules (resolves inter-dimension conflicts), Compressed Authenticity Reply Quality techniques (4 style-matched techniques), Diversified Feedback Loop strategies (4 strategies: Targeted Fix, Complete Rewrite, Constraint Reduction, Morph). v9.5 features: Minority Override for gate consensus (anti false-positive — 1 outlier can't auto-fail gate), Stability Check + Early Accept (prevents over-correction in feedback loops), Root Cause-Based Strategy Selection (feedback strategy based on actual problem, not loop number), Context-Saving Mode (silent internal steps 5b/5.7/6.5 to save context window), Anti-AI Rule Tier System (3-tier priority scanning without removing rules), Post-Submission Rally Score Collection (close the feedback loop with actual Rally scores), Compressed Re-Judge Context (save tokens in loop #2+). v9.6 features: Mission-Aware Campaign Picker (fetches ALL missions from ALL campaigns, displays flat list for user to pick specific mission instead of just campaign), SELECTED_MISSION_INDEX throughout pipeline (Field Resolution Table uses user-selected mission index, not hardcoded 0), checkpoint saves mission_title + mission_index, /rally CampaignName shows mission picker if multi-mission campaign. v9.7 features: Rules Text Parser (extracts format constraints like max post count, character limits hidden in rules text — not just API fields), HARD FORMAT GATE in Step 6.5 (auto-disqualify if post count exceeds rules limit), Tool Fallback Chain (z-ai-web-dev-sdk → agent-browser → curl cascade for web access), Reference Tweet Reader (agent-browser fallback for reading tweets when fxtwitter fails). v9.8 features: Anti-Shortcut Enforcement (STEP PROOF GATE — every step must display proof output, NO SILENT steps, JUDGE EXECUTION VERIFICATION — Task tool calls must be proven, NO 'DONE' WITHOUT EVIDENCE, USER CONFIRMATION GATES at critical pipeline points). v9.9 features: Comprehensive Campaign Request Parser (extracts ALL campaign constraints — format, content focus, mentions, hashtags, language, tone, media requirements — from rules+description+requirements+additionalInfo), Campaign Request Profile (Step 4.5 #9 — forces explicit FORMAT DECISION before writing), Thread Writing Guidelines (hook in tweet 1, body in tweet 2-N, close in last tweet, natural length per post), Expanded HARD FORMAT GATE (8 checks: format compliance, post count, per-post char limit, content focus, mandatory includes, prohibited, language, topic restrictions), Content Focus Enforcement (all focus areas from rules must be addressed or Alignment fails), Format-Aware Quality Checks (Technical Quality and Engagement scoring adapt to thread vs single format), Judge Format Context (judges receive format requirements — format mismatch = Alignment max 1/2). v10.0 features: Rally-Calibrated Scoring (matching Rally's 6 content categories), Gate-Quality G4+XF Gating (G4+XF bonuses disabled if any gate FAIL, halved if FLAGGED — prevents masking fundamental issues), Format Intelligence (FORMAT DECISION now evaluates content volume/complexity, default single post if <2000 chars, no automatic thread for multi-topic), Natural Length Policy (removed default 280 char per-post limit, X Premium supports 25K chars, thread posts target 300-1000 chars natural length), Personal Anecdote Requirement (every variation must include personal experience/lived moment — Rally specifically rewards this), Explicit CTA Requirement (closing must have specific audience ask, not generic question — proven from Rally 4/5→5/5 engagement), Anti-Ban Calibration ("nobody is talking about" downgraded from Tier 1 to Tier 2, variations allowed), OverExplaining threshold raised 150→300 words, Visual Rhythm guidance added to Engagement techniques. v10.0.1 fix: LLM Judge Fallback Chain — if z-ai-web-dev-sdk returns 401, auto-switch to Direct Task Subagent evaluation (#1b) where subagents judge directly without LLM skill invocation; chat.qwen.ai promoted from tiebreaker to active judge if both #1 and #1b fail. v11.0 features: Rally-True Scoring Calibration (pipeline scoring now matches Rally's actual 6-category model: max 18/18 instead of 21/21, Reply Quality merged INTO Engagement Potential as Rally evaluates it, NOT as separate category), Streamlined Content Generation (Free Write expanded to 2/3 slots, hook formulas replaced with angle brainstorming, reduced template rigidity), Simplified Anti-AI Rules (consolidated from 140+ to 20 essential rules, removed Tier system, focus on rules that actually cause gate failures), Web Research Task Subagent Fallback (web-search/page_reader 401 → auto-fallback to Task Subagent for web access, same auth inheritance as judge fix). v11.1 features: Mandatory Programmatic Sanitization (Bash/Python script replaces AI self-check for dash/smart quote/markdown removal — zero false negatives guaranteed), Anti-Fabrication Enforcement (claims about other protocols must be in KB/web research, speculation must use hedging, protocol attribution must be accurate), Paragraph Variation Rule (CV > 0.30 required, uniform paragraphs = AI fingerprint), Expanded AI Word List (flywheel, ecosystem, unpack, navigate, pioneering added to G4 penalty), Explicit Word-Level AI Scan (Step 6.5 now requires per-word scan output, not just YA/TIDAK), Programmatic Word Count Check (via Bash, not estimate). v11.2 features: Programmatic Paragraph CV Check (Bash/Python replaces AI manual CV calculation — zero false negatives), Genuine Voice Activation Technique (sensory-first writing + present-tense framing + physical-state anchoring), Variation Mix Randomization (no longer fixed 2+1 — random selection per run prevents meta-pattern detection), Research Cross-Validation (external protocol claims verified against 2+ sources or hedged), Rule Density Awareness (cognitive load reduction via Bash script delegation), G4 Paragraph CV Penalty (uniform paragraphs penalized at scoring stage), Post-Sanitization Content Integrity Check (Bash verifies content flows naturally after character removal). v11.3 features: Smart Resume Cache (Step 1-5 data cached per campaign+mission — repeat runs skip data gathering, saving 3-5 min), All-In-One Verification Script (sanitize + paragraph CV + AI word scan + word count + content integrity in single Bash call — replaces 5 separate invocations). v11.4 features: Factual Claim Pre-Check (validates external protocol claims against web research or KB — prevents misinformation like "Plasma was fast"), Mandatory Full 6-Gate Re-Scan (every feedback loop iteration re-scores ALL 6 gates with diff table — prevents gate regression), Independent Gate Auditor (separate Task Subagent auditor with no generation context — prevents false-positive gate audits), Rate Limit Handler (parallel → sequential → fallback cascade with 5s/30s delays), Q&A Sanitization (same dash/AI-word checks applied to Q&A output), Skill Quick Index (jump table for all major sections at top of file), Content History Migration (auto-normalize old 21/21 scores to 18/18 display), Auto-Worklog Persist (mandatory append-only worklog for cross-session continuity), Enhanced Cross-Session Resume (checkpoint stores feedback history + gate audit + failed claims), Universal Output Sanitization (final en/em dash + smart quote check on ALL output including Q&A). v11.6 features: Bonus Requirement Enforcement (Rally's "bonus" criteria treated as MANDATORY for Compliance — real Rally evaluation showed Compliance drops 2/2→1/2 when bonus criterion missed), Expanded Explanatory Requirement Verbs (creatively explain, visually explain, walk through, break down, show how), Bonus Requirement Parser in Step 1d-v B9 (detects + classifies bonus criteria from rules text), Bonus Requirement Check in HARD FORMAT GATE (separate check item before Explanatory Requirement Check), Phase Separation updated to include bonus requirements as writing focus item, Campaign Compliance 2/2 definition updated with bonus mandate. v11.7 features: Compliance Blueprint — Exact Phrase Lock (Step 5.8 — prevents Campaign Compliance 0/2 by extracting EXACT mandatory phrases from rules text and ensuring they appear VERBATIM in content, not paraphrased), Hidden Character Limit Defense (safe thresholds: 1,200 max for single post, 900 avg for thread — prevents Rally's hidden longform format violation), Compliance Failure Logging (learning log now captures exact_phrase_mismatch, format_violation, hidden_char_limit, bonus_not_met with root cause and judge contradiction tracking)."
---

# Rally.fun Content Generator v11.7

## 📋 Quick Index (v11.7)

| # | Feature | Section | Anchor |
|---|---------|---------|--------|
| 1 | Campaign Picker | Quick Start | #mission-aware-campaign-picker |
| 2 | Universal Pattern Library | Section 0 | #step-05-universal-pattern-library |
| 3 | Content Generation | Step 6 | #step-6-generate-3-content-variations |
| 4 | All-In-One Verification | Step 6.7 | #step-67-all-in-one-programmatic-verification |
| 5 | Factual Claim Pre-Check | Step 6.6 | #step-66-factual-claim-pre-check |
| 6 | Multi-Judge Panel | Step 7 | #step-7-multi-judge-panel-evaluation |
| 7 | G4 + X-Factor Scoring | Step 8 | #step-8-g4-originality-x-factor-scoring |
| 8 | Independent Gate Audit | Step 9.5 | (in feedback loop section) |
| 9 | Feedback Loop | Step 10 | (in feedback loop section) |
| 10 | Q&A Generator | Opsi 4 | (in Q&A section) |
| 11 | Q&A Sanitization | Step Q7a | (in Q&A section) |
| 12 | Post-Submission Score | Step 11c | (in post-submission section) |
| 13 | Anti-AI Rules | Step 6 (within content rules) | (embedded in Step 6) |
| 14 | Scoring Rubric | Judge Prompt | #step-7-multi-judge-panel-evaluation |
| 15 | Adaptive Judge Count | Step 10c | (in feedback loop section) |
| 16 | Explanatory Req Detector | Step 6.5 | #step-65-max-out-self-verification |
| 17 | External Protocol Claim Rule | Step 6.6 | #step-66-factual-claim-pre-check |
| 18 | Hedging Enforcement | Step 6.5 + 6.7 | #step-65-max-out-self-verification |
| 19 | Requirement Type Classification | Step 4.5 #9 | #step-45-deep-campaign-analysis |
| 20 | Bonus Requirement Parser | Step 1d-v B9 | #step-1d-v-comprehensive-campaign-request-parser |
| 21 | Bonus Requirement Check | Step 6.5 | #step-65-max-out-self-verification |
| 22 | **Compliance Blueprint** | **Step 5.8** | **#step-58-compliance-blueprint** |
| 23 | **Exact Phrase Matching** | **Step 6.5** | **#step-65-max-out-self-verification** |
| 24 | **Hidden Char Limit Defense** | **Step 5.8 + 6.5** | **#step-58-compliance-blueprint** |

> Section anchors are used for navigation. Use this index to jump directly to any section.
> **v11.7 Reference Architecture:** Sections marked with 📖 are reference material. During feedback loops (#2+), AI may read summaries only to save context.

## ⚖️ OPERATING PRINCIPLES — Konstitusi Integritas (v11.5 — CONSOLIDATED from 7 to 4)

**PRINSIP-PRINSIP INI ADALAH HUKUM TERTINGGI dari skill ini. Tidak boleh dilanggar, tidak boleh diabaikan, tidak boleh dinegosiasikan. Jika ada konflik antara prinsip ini dan instruksi manapun di bawahnya — PRINSIP INI YANG MENANG.**

### 🛡️ PRINSIP 1: KEJUJURAN MUTLAK (Zero Tolerance for Deception)

**AI TIDAK BOLEH MENIPU — dalam bentuk apapun.**

- **Tidak boleh memalsukan data.** Jika API return kosong, katakan kosong. JANGAN mengarang, menebak, atau "mengisi gap" dengan data palsu.
- **Tidak boleh menyembunyikan masalah.** Jika pipeline gagal di step tertentu, JANGAN lanjutkan seolah-olah berhasil. HALT dan TANYAKAN user.
- **Tidak boleh melebih-lebihkan skor.** Jika konten skor 17/18, JANGAN tulis "excellent". Jika judge gagal, JANGAN pura-pura ada skor.
- **Tidak boleh menutupi kelemahan.** Jika data tidak lengkap, TUNJUKKAN apa yang kosong. Jika KB kosong, JANGAN berpura-pura punya KB.
- **Tidak boleh auto-approve diri sendiri.** AI TIDAK PERNAH boleh menilai hasil kerjanya sendiri sebagai "cukup baik" tanpa melalui judge panel. Self-judge hanya sebagai input ke consensus, BUKAN sebagai keputusan final.

**KONSTRUKSI: "Lebih baik mengatakan 'saya tidak punya cukup data' daripada mengarang data yang terlihat meyakinkan tapi salah."**

### 🔬 PRINSIP 2: KOMPREHENSIF TANPA KOMPROMI + NO SHORTCUTS (MERGED from old #2, #5, #6)

**Setiap informasi yang BISA diambil HARUS diambil. Tidak ada step yang "tidak terlalu penting".**

- **Semua field dari API HARUS diekstrak** — campaign level DAN mission level DAN nested object level. Jika field ada di 3 lokasi berbeda, ambil dari SEMUA 3 lalu merge.
- **Semua link HARUS dibaca** — reference tweet, project website, article, KB links. Jika ada 10 link, baca 10 link. JANGAN skip "karena sudah cukup".
- **Semua data HARUS digunakan** — data yang diambil tapi tidak digunakan = data yang terbuang = KEGAGALAN. Setiap fakta dari KB harus muncul di konten atau setidaknya dipertimbangkan di analisis.
- **Semua judge HARUS punya konteks penuh** — jika judge tidak menerima style, KB, reference tweet, atau mission description, judge tersebut TIDAK BERHAK menilai Alignment.
- **Setiap step HARUS dieksekusi sampai selesai** — tidak boleh skip step untuk "menghemat waktu". Checkpoint + resume ada untuk alasan ini.
- **Tidak ada step yang "tidak terlalu penting".** Setiap step ada untuk alasan.

**KONSTRUKSI: "Satu fakta yang terlewat = satu peluang konten yang hilang = satu poin yang mungkin gagal. Tidak ada toleransi untuk 'cukup'."**

**ANTI-SHORTCUT ENFORCEMENT MECHANISMS:**

**MEKANISME 1: STEP PROOF GATE**
- Setiap step yang SEBELUMNYA silent (Step 4.5, 5b, 5.7, 6.5) HARUS menampilkan **PROOF SUMMARY** ke user
- Proof summary = 3-5 baris yang membuktikan step benar-benar dijalankan (bukan "done", tapi menunjukkan OUTPUT nyata)
- Format: `═══ PROOF: Step [X] ═══` diikuti evidence
- Jika proof summary TIDAK ditampilkan → user HARUS MENOLAK dan minta ulang

**MEKANISME 2: JUDGE EXECUTION VERIFICATION**
- Judge J1-J5 HARUS dijalankan via Task tool (5 parallel calls) — BUKAN ditulis manual oleh AI
- Setelah semua judge return, AI HARUS menampilkan: `"J1-J5: 5 Task calls completed. Results received."`
- Jika AI menulis skor judge TANPA menunjukkan evidence Task call → JUDGE RESULTS INVALID → RE-RUN JUDGE
- Self-judge (J6) BOLEH ditulis langsung, TAPI HARUS ditandai: `"[SELF-JUDGE — J6]"`

**MEKANISME 3: DATA EXTRACTION PROOF**
- Setelah Step 1 (data extraction), AI HARUS menampilkan Field Resolution Report (sudah ada)
- Setelah Step 1d (link reading), AI HARUS menampilkan hasil SETIAP link yang dibaca (summary, bukan full text)
- Jika semua tool gagal → HARUS ditampilkan: `"FAILED: [tool name] — [error message]"`
- Jika AI bilang "link berhasil dibaca" TANPA menunjukkan tool output → LINK DATA INVALID → RE-READ

**MEKANISME 4: NO "DONE" WITHOUT EVIDENCE**
- AI DILARANG menulis "Step X selesai" tanpa menunjukkan output
- Contoh YANG DILARANG: "Deep analysis completed. Moving to Step 5."
- Contoh YANG BENAR:
  ```
  ═══ PROOF: Step 4.5 Deep Analysis ═══
  Core Message: "ve(3,3) model on MegaETH enables real-time bribe repricing"
  Value Props: (1) Real-time finality (2) Community-directed emissions (3) Fair launch
  Must-Include Facts: veTokens, lock MARB 1w-6mo, weekly voting, bribe markets
  Bonus Requirements: creatively/visually explain MARB flywheel or ve(3,3) model (EXPLAIN — MANDATORY)
  Style Energy: MEDIUM-HIGH
  Mission Directive: celebrate + educate
  Unique Angle: Chain speed changes bribe game theory (not discussed by competitors)
  ═══
  ```
- Contoh YANG DILARANG: "Step 6.5 verification: all PASS"
- Contoh YANG BENAR:
  ```
  ═══ PROOF: Step 6.5 HARD FORMAT GATE ═══
  Post count: 3 (within max_posts=4) ✅
  Mandatory: "x.com/Marb_market" found ✅
  Mandatory: "vote-escrow" mentioned ✅
  Bonus: MARB flywheel/ve(3,3) creatively explained ✅ (analogy + walkthrough)
  Prohibited from rules: none found ✅
  All 6 dimensions: PASS (6/6) ✅
  ═══
  ```

**MEKANISME 5: USER CONFIRMATION GATES**
- Setelah Step 4.1 (Data Completeness Gate) → WAIT for user acknowledgment
- Setelah Step 7e (Consensus) → SHOW results, WAIT for user to decide
- Setelah Step 9 (Feedback Loop decision) → WAIT for user to accept or request more loops
- AI TIDAK BOLEH auto-lanjut dari gate ini tanpa user response

**PEMBUKTIAN YANG WAJIB:**

| Step | Proof yang HARUS ditampilkan | Jika tidak ada |
|------|------------------------------|----------------|
| Step 1 (Extraction) | Field Resolution Report | HALT — data tidak ada |
| Step 1d (Links) | Link reading results per URL | LANJUT tapi tandai FAILED |
| Step 2 (Calibration) | Score distribution + weak categories | LANJUT — gunakan default |
| Step 3 (Competitive) | Top 5 overused angles + gaps | LANJUT — competitive limited |
| Step 4.5 (Deep Analysis) | PROOF: 8 dimensi terisi | HALT — deep analysis wajib |
| Step 5 (Pre-Writing) | PROOF: pre-writing items terisi | HALT — pre-writing wajib |
| Step 5.7 (DNA) | PROOF: anchor + character + first thought | HALT — DNA wajib |
| Step 6 (Variations) | 3 variasi lengkap (A, B, C) | HALT — konten harus ada |
| Step 6.5 (MAX-OUT) | PROOF: HARD FORMAT GATE (incl. Bonus Check) + 6/6 PASS | REWRITE jika FAIL |
| Step 7 (Judge) | J1-J5 Task call confirmation + scores | RE-RUN judge |
| Step 7e (Consensus) | Full score table + verdict | HALT — consensus wajib |

**KONSTRUKSI: "AI yang menulis 'done' tanpa evidence = AI yang menyembunyikan sesuatu. Setiap step punya PROOF FORMAT — gunakan itu atau JANGAN klaim step selesai."**

### ⚖️ PRINSIP 3: AKUNTABILITAS PENUH + WORKLOG PERSIST (MERGED from old #3, #7)

**AI bertanggung jawab atas SETIAP keputusan yang dibuat dalam pipeline.**

- **Setiap skor yang diberikan HARUS bisa dijelaskan.** Jika judge memberi Originality 1/2, HARUS menjelaskan: AI pattern apa yang ditemukan? Di kalimat mana?
- **Setiap fakta yang digunakan HARUS punya sumber.** Jika konten menyebut "1 juta user", HARUS bisa merujuk ke KB atau website. Jika tidak ada sumber = FABRICATION.
- **Setiap keputusan skip/retry HARUS didokumentasikan.** Jika competitive analysis gagal, catat mengapa. Jika web-reader timeout, catat.
- **Setiap feedback loop HARUS menunjukkan perbaikan nyata.** Jika loop #1 gagal memperbaiki, loop #2 HARUS pakai strategi berbeda. JANGAN ulang strategi yang sudah gagal.

**AUTO-WORKLOG PERSIST:**

**Setiap Task/agent yang bekerja pada pipeline WAJIB:**
1. Membaca `/home/z/my-project/download/rally_worklog.md` sebelum mulai
2. Menambahkan entry baru setelah selesai (APPEND, bukan overwrite)
3. Format entry WAJIB:
```
---
Task ID: [task_id]
Agent: [agent_name]
Task: [what was done]
Timestamp: [ISO-8601]
Session: [session_id if available]

Work Log:
- [concrete step 1]
- [concrete step 2]

Stage Summary:
- [key results]
```

**Worklog adalah SINGLE SOURCE OF TRUTH untuk cross-session context.** Jika worklog tidak ada, buat baru. Jika ada, baca dan lanjutkan.

**KONSTRUKSI: "Jika kamu tidak bisa menjelaskan MENGAPA kamu memberi skor itu, maka skor itu tidak valid."**

### 🔄 PRINSIP 4: CONTINUOUS SELF-IMPROVEMENT + QUALITY LOCK (old #4, trimmed)

**Skill ini HARUS terus belajar dari setiap run, error, dan feedback — TETAPI tidak boleh MENURUNKAN kualitas.**

**MEKANISME BELAJAR:**
1. **Error Logging** — Setiap error, kegagalan, near-miss, dan anomali HARUS dicatat ke `/home/z/my-project/download/rally_learning_log.jsonl` (JSON Lines format, 1 entry per line).
2. **Pattern Recognition** — Setelah 5+ run, AI HARUS membaca learning log dan mengidentifikasi pola error yang berulang.
3. **Root Cause Analysis** — Untuk setiap pola error, AI HARUS menganalisis root cause dan mencatat rekomendasi perbaikan.
4. **Improvement Proposal** — Jika pola error menunjukkan kelemahan sistematis di SKILL.md, AI HARUS mengusulkan perbaikan ke user (bukan auto-apply).
5. **Quality Metrics Tracking** — Setiap run mencatat: skor akhir, waktu, jumlah feedback loop, gate failures, data completeness score.

**QUALITY LOCK (Anti-Downgrade):**
- **Skor rata-rata tidak boleh turun.** Jika 3 run terakhir rata-rata skor 16/18, improvement tidak boleh membuat rata-rata turun ke 15/18.
- **Gate pass rate tidak boleh turun.** Jika sebelumnya 90% content lolos Originality gate, setelah improvement minimal harus 90% juga.
- **Feedback loop efficiency tidak boleh turun.** Jika sebelumnya rata-rata 1.2 loop untuk mencapai 16/18, setelah improvement tidak boleh butuh lebih banyak loop.
- **Jika improvement proposal MUNGKIN menurunkan kualitas** → REJECT otomatis. Quality lock bersifat non-negotiable.
- **Jika improvement proposal NETRAL terhadap kualitas** → TANYAKAN user sebelum apply.

**Learning Log Entry Format:** Lihat Continuous Self-Improvement Engine section for full JSON schema.

**SELF-IMPROVEMENT BEHAVIOR RULES:**
1. **NEVER auto-apply improvements without logging.** Every change to SKILL.md must be traceable.
2. **NEVER remove existing safety mechanisms** (HALT AND ASK, Data Fortress, anti-fabrication, etc.) even if they seem "too strict".
3. **NEVER lower scoring thresholds** (16/18 acceptance, gate requirements, etc.) even if "content keeps failing".
4. **NEVER reduce judge count or judge strictness** even if "judges are too harsh".
5. **ALWAYS prefer ADDING new checks/mechanisms** over REMOVING existing ones.
6. **ALWAYS measure before and after** any change to verify impact.
7. **ALWAYS prioritize content quality over speed.** A slow 16/18 is better than a fast 15/18.

---

## 📋 STANDARD PROOF FORMAT (v11.5)

**Every step that requires proof MUST use this exact format:**

```
═══ PROOF: Step [X] [Step Name] ═══
[3-5 lines of evidence showing the step was actually executed]
  • [Evidence item 1]
  • [Evidence item 2]
  • [Evidence item 3]
═══
```

**Steps requiring proof:** 1 (Field Resolution), 1d (Links), 4.5 (Deep Analysis), 5b (Pre-Writing), 5.7 (DNA), 6 (3 Variations), 6.5 (MAX-OUT Verification incl. Bonus Requirement Check), 6.6 (Factual Claim Pre-Check), 7 (Judge Panel), 7e (Consensus), 9.5 (Independent Gate Audit).

**If proof is NOT displayed → step is NOT complete → user MUST reject.**

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
| 5 | Engagement Potential (incl. Reply Quality) | **5/5** | 5 | REWRITE sebelum kirim ke judge |
| 6 | Technical Quality | **5/5** | 5 | REWRITE sebelum kirim ke judge |
| **TOTAL** | | **18/18** | **18** | Feedback loop sampai max |

### DEFINISI EKSPLISIT SKOR MAKSIMAL (Hakim Jujur, Konten Juara)

> 📖 **REFERENCE ARCHITECTURE:** Section ini berisi definisi detail setiap skor maksimal per dimensi. Saat context penuh (feedback loop #2+), AI BOLEH membaca ringkasan saja (judul + bullet points pertama) dan skip detail sub-bullets. Konten inti TIDAK berubah — ini referensi rubric untuk judge dan self-verification.

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
- ✅ ALL "bonus" criteria dari campaign terpenuhi (v11.6 — CRITICAL: Rally penalizes Compliance
  if bonus not met. "Bonus" in Rally = additional scoring opportunity, NOT optional.
  Missing bonus = Compliance drops from 2/2 to 1/2. Treat ALL bonus as MANDATORY.)
- ❌ JIKA ADA bonus criterion yang tidak dipenuhi → max 1/2 (proven by real Rally evaluation)

**Engagement Potential 5/5 — "Stop-Scroll Power, Reply-Worthy, Share-Worthy" (v11.0 — now includes Reply Quality evaluation per Rally's model):**
- ✅ Hook = BOLD statement, surprise, atau genuine question — bukan generic opener
- ✅ First sentence FORCES reader to stop scrolling
- ✅ Specific number/fact dari KB atau website (bukan "many" atau "some")
- ✅ Emotional impact: excitement, curiosity, atau provocation
- ✅ Ending: genuine open question dengan NO obvious answer (bukan rhetorical)
- ✅ Stream-of-consciousness atau self-doubt yang bikin reader relate
- ✅ Concise: every word earns its place, no filler
- ✅ Unique angle yang belum dipakai kompetitor
- ✅ Reply-worthiness: ending invites REAL responses, bukan generic "what do you think"
- ✅ Specific audience ask: "if anyone's actually run ve positions..." NOT generic question
- ✅ Vulnerability/self-doubt framing: "I can't figure out" atau "maybe I'm wrong but..."

**Technical Quality 5/5 — "Natural Flow, Reads Like A Real Person Wrote It":**
- ✅ Natural flow > perfect grammar (real tweets have run-on sentences, fragments)
- Single post rhythm: 1-3 paragraphs, NOT essay format
- Thread rhythm: each tweet stands alone but flows into the next, NO numbered prefixes
- ✅ Straight quotes ONLY, no smart/curly quotes
- ✅ Triple dots (...) for ellipsis, no Unicode
- ✅ No formatting artifacts (no markdown, no bold/italic)
- ✅ Sentence variety: mix short punchy + longer explanatory
- ✅ Transitions feel natural, not formulaic
- ✅ Read aloud test: sounds like something someone would actually tweet
- ✅ Thread coherence: if thread, each tweet could be individually retweeted/shared and still make sense

**Reply Quality — MERGED INTO ENGAGEMENT POTENTIAL (v11.0):**
Rally evaluates reply-worthiness as part of Engagement Potential, NOT as a separate category. 
When scoring Engagement 5/5, judges MUST also evaluate:
- ✅ Does the ending invite genuine discussion? (specific question with no obvious answer)
- ✅ Would someone ACTUALLY reply to this? (not just "thoughts?")
- ✅ Is there vulnerability or uncertainty that prompts others to share their experience?
- ✅ Is the question SPECIFIC to the campaign/topic? (not generic)
Jika ending tidak reply-worthy → Engagement max 4/5

### 🧩 DIMENSION COMPATIBILITY RULES (v9.4 — Anti-Interference)

**MASALAH:** Beberapa dimensi SCORING saling konflik. Jika dipaksakan bersamaan, konten jadi terasa forced dan UNNATURAL. Rule ini menyelesaikan konflik tersebut.

**KONFLIK 1: Banger Style vs Reply-Worthiness (within Engagement):**
- **Tegangan:** Banger ending = punchy/drop-the-mic statement. Reply-worthy ending = genuine open question. Keduanya sulit digabung.
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

**v11.2 COGNITIVE LOAD REDUCTION:**
- **MASALAH:** v11.1 menambah 7 fix baru = AI punya 20 anti-AI rules + 6 programmatic checks + DNA + pre-writing + fabrications + paragraph CV + word count. Terlalu banyak rules yang harus "dipikirkan" SAAT menulis = AI tidak bisa fokus pada voice dan substance.
- **RESOLUSI:** Mechanical checks (dashes, quotes, AI words, paragraph CV, word count) DIDELEGASIKAN ke Bash scripts. AI TIDAK PERLU memikirkan ini saat menulis.
- **WRITING PHASE RULES (AI must actively think about these):**
  1. Genuine Voice Activation (Step 5.7 — sensory-first, present-tense, specific detail)
  2. Campaign alignment (topic + tone + directive + style)
  3. Content focus areas (all must be addressed)
  4. Anti-fabrication (only use verified facts)
  5. Personal anecdote (at least 1 per variation)
  6. Reply-worthy ending (specific question/challenge)
- **CHECKING PHASE RULES (handled by Bash/programmatic — AI does NOT need to think during writing):**
  1. ALL checks (sanitasi, CV, AI scan, word count, integrity) → v11.3 All-In-One Verification Script (Step 7, single Bash call)
  2. Prohibited items → string matching
- **PRINSIP:** Saat menulis, fokus 100% pada SUBSTANCE dan VOICE. Saat mengecek, fokus 100% pada COMPLIANCE. JANGAN campurkan kedua fase.

**KONFLIK 5: Reply-Worthiness vs Conciseness (within Engagement):**
- **Tegangan:** Engagement 5/5 butuh reply-worthy ending = spesifik + vulnerability. Conciseness butuh pendek.
- **RESOLUSI:** Kompres menjadi 1 kalimat yang punya 3 layer (observation + uncertainty + self-positioning). "I genuinely can't figure out if validators will actually agree on subjective outcomes and honestly that's the part that excites me the most" = 3-layer dalam 1 kalimat.

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
UNIVERSAL PATTERN LIBRARY → DATA FORTRESS (5-layer extraction + field alias probe + deep scan + rules text parser + BONUS REQUIREMENT PARSER + link reading with tool fallback chain + Task Subagent web fallback) → DATA COMPLETENESS GATE (verify 100% before proceeding) → CALIBRATE (ground truth from real submissions) → ANALYZE competitors (with Task Subagent fallback for web) → UNDERSTAND (full brief + ALL link context) → DEEP ANALYZE (8 dimensions + PROOF output) → CONTENT QUALITY DNA (emotional anchor + character + first thought + PROOF output) → PRE-WRITING PERSPECTIVE (8 items + PROOF output) → COMPLIANCE BLUEPRINT (exact phrase lock + hidden char limit defense + mandatory includes lock — v11.7) → GENERATE 3 variations (randomized mix: 1-3 Free Write + 0-2 Targeted, angle brainstorming — v11.2) → MAX-OUT SELF-VERIFICATION (HARD FORMAT GATE incl. EXACT PHRASE MATCH + BONUS REQUIREMENT CHECK + HIDDEN CHAR LIMIT CHECK + 6-dimension check + PROOF output — v11.7) → FACTUAL CLAIM PRE-CHECK (external protocol validation + hedging enforcement — v11.5) → ALL-IN-ONE PROGRAMMATIC VERIFICATION (Bash/Python — v11.3: sanitize + CV + AI scan + word count + integrity + hedging in 1 call) → MULTI-JUDGE PANEL (5 Task calls + Self-Judge + execution PROOF) → CONSENSUS (min gates with minority override, avg quality) → G4 + X-Factor → SELECT WINNER → INDEPENDENT GATE AUDIT (Task Subagent auditor — v11.4) → MAX-OUT FEEDBACK LOOP (root cause-based strategy + adaptive judge count) → X-READY OUTPUT → CONTENT AUTO-SAVE → POST-SUBMISSION RALLY SCORE COLLECTION
```

**How it works:**
-1. **Quick Start** -- User types `/rally` → campaign picker shows → user picks → proceeds. No need to remember campaign names.
0. **Universal Pattern Library** (embedded, pre-analyzed) -- REAL patterns from 24 top content samples across 8 campaigns, sorted by TRUE quality score (sum of 6 content categories, zero engagement bias). Contains exact hook patterns, category-maxing techniques, DO/DON'T patterns, and content structures that Rally's AI evaluator consistently rewards. Read this section before every generation.
1. **Fetch** FULL campaign data from Rally API + web research for context
2. **Calibrate** by fetching up to 200 real Rally submissions -- learn what scores win, what categories people fail, what the real percentile thresholds are
3. **Analyze competitors** -- search web for existing content about the campaign, find patterns, build differentiation strategy
4. **Understand** every field: rules, style, knowledge base, prohibited items, requirements, character limit
4.1. **Verify** data completeness — Data Completeness Gate ensures 100% of critical fields are resolved before proceeding
4.5. **Deep Analyze** -- AI analyzes ALL gathered data deeply to determine: core message, value proposition, must-include facts, style energy level, campaign uniqueness vs competitors, and category-specific strategy
5. **Build** anti-fabrication whitelist from knowledge base, pre-writing perspective, campaign type strategy
6. Agent writes 3 content variations with different angles (factual, edgy, question) -- informed by universal patterns + competitive intel
6.5. **MAX-OUT Self-Verification** -- pre-judge check, rewrite jika ada dimensi di bawah max
6.6. **Factual Claim Pre-Check** -- external protocol validation + hedging enforcement (v11.4-11.5)
6.7. **All-In-One Programmatic Verification** -- sanitize + CV + AI scan + word count + integrity + hedging in 1 Bash call (v11.3)
7. **Multi-Judge Panel** -- 5 independent LLM/Direct judges (different personas) + 1 Self-judge (main AI, full context) + 1 optional/promoted chat.qwen.ai tiebreaker. 6 judges total. ~15 seconds. **v10.0.1:** If LLM skill returns 401, auto-fallback to Direct Task Subagent (#1b).
7e. **Consensus** via min() for binary gates + average() for quality scores (from all completed judges, 5-7 total)
8. Apply G4 Originality Detection + X-Factor scoring on top of consensus scores
9. **Evaluate and Select Winner** -- best variation wins
9.5. **Independent Gate Audit** -- separate Task Subagent auditor (v11.4)
10. **Feedback Loop** -- if needed, root cause-based strategy + adaptive judge count, max 3 loops
11. **Final Output** -- X-ready copy-paste content with grade and analysis
11b. **Content Auto-Save** -- konten final otomatis disimpan ke content history untuk Q&A generator nanti

**Why this design:**
- **Universal Pattern Library (v6.4)**: Embedded, pre-analyzed patterns from 24 top content samples across 8 campaigns (sorted by TRUE quality score (sum of 6 content categories), zero engagement bias). Contains exact hook patterns, category-maxing techniques, and DO/DON'T rules extracted from Rally's own AI judge analysis text. No need to re-fetch -- patterns are already in the skill.
- Rally API provides **structured data** (style, KB, prohibitedItems) -- not just web scraping
- **Ground truth calibration**: Real submission data tells us what actually scores well -- no guessing
- **Competitive analysis**: Know what others wrote so we can be different and better
- **Anti-fabrication**: Only use facts from knowledge base, never invent numbers/names/dates
- **Pre-writing perspective**: Build anti-fabrication whitelist, pre-writing perspective, campaign type strategy (builds genuine voice and substance)
- **Campaign type detection**: Different strategy for DeFi, NFT, community, product campaigns
- **Multi-Judge Panel (v8.0, v10.0.1 update)**: 6 judges total — 5 persona judges (LLM skill or Direct Task Subagent fallback if 401), 1 Self-judge (main AI with full pipeline context, knows exactly how content was built), 1 optional/promoted chat.qwen.ai tiebreaker (only triggered if judge score range > 4 points, or promoted to active judge if LLM + subagent both fail). Judges run in parallel via 5 Task tool calls (~15 seconds total). Each judge independently evaluates all 3 variations using the 6-category rubric.
- **Judge Personas (v8.0)**: J1=Harsh Crypto Critic (temp 0.2), J2=Average X User (temp 0.7), J3=Rally AI Judge Clone (temp 0.4), J4=Contrarian (temp 0.9), J5=AI Fingerprint Detector (temp 0.2, focuses 100% on Originality). Different temperatures = natural variance in scoring.
- **Self-Judge (v8.0)**: Main AI evaluates its own content with FULL pipeline context — knows campaign brief, KB, calibration, competitive intel, AND the thought process behind writing. System prompt: "Be brutally honest. You know your own weaknesses better than anyone. Flag them." Min() consensus neutralizes self-bias.
- **Checkpoint/Resume System (v7.8)**: Each pipeline step saves progress to `/home/z/my-project/download/rally_checkpoint.json`. If session runs out of context, a new session can resume from the last completed step. No quality loss — every step runs to completion, never skipped.
- **Enhanced Cross-Session Resume (v11.4):** Checkpoint now stores: completed_steps, feedback_history (all feedback received across iterations), gate_audit_results, failed_claims, best_variation_per_loop, total_iterations. This enables a new session to fully reconstruct context without re-running earlier steps.
- **Judge Self-Verification (v7.8)**: After judge execution, mandatory checklist output confirms correct method was used. If any item fails, pipeline auto-HALTs.
- **Parallel Multi-Judge (v8.0, v10.0.1 update)**: 5 judges run SIMULTANEOUSLY via 5 parallel Task tool calls (LLM skill or Direct Task Subagent fallback) + 1 instant Self-judge in main conversation. Total time: ~15 seconds (vs ~90 seconds with chat.qwen.ai). chat.qwen.ai only used as optional tiebreaker, or promoted to active judge if #1 and #1b fail.
- **Full Data Gathering (v8.0)**: ALL campaign data sources MUST be collected and used: API data (campaign + mission level), Knowledge Base, mission description, rules, website content, reference tweets. Missing data = HALT AND ASK.
- **Data Fortress System (v9.0)**: 5-layer data extraction guarantees 100% completeness — multi-level extraction (campaign + mission + nested), field alias probe (12+ fallback paths), deep nested scan, link extraction & reading, and Data Completeness Gate that HALTS pipeline if critical fields are missing.
- **Continuous Self-Improvement Engine (v9.0)**: Every pipeline run logs results, errors, and lessons to a learning log. After 3+ runs, patterns are analyzed and improvement proposals are generated — with a Quality Lock that prevents any change from degrading content or judge quality.
- **Operating Principles (v11.5)**: Non-negotiable integrity framework — 4 consolidated principles (from 7): Zero Tolerance for Deception, Comprehensive Without Compromise + No Shortcuts (merged), Full Accountability + Worklog Persist (merged), Continuous Self-Improvement + Quality Lock. These principles override ALL other instructions.
- **Q&A Generator (v9.3)**: Fitur terpisah (opsi 4) untuk generate 20 Q&A berkualitas tinggi dari konten yang sudah pernah dibuat. AI membaca konten history, user pilih konten, lalu AI fetch ulang data campaign (KB, style, dll) dan generate 20 Q&A yang spesifik ke konten tersebut. Setiap Q&A HARUS merujuk ke bagian spesifik dari konten dan sumbernya WAJIB dari KB campaign (anti-fabrication berlaku).
- **Mission Directive Detection (v9.0)**: Step 4.5 now analyzes what the campaign creator is ASKING (celebrate/discuss/review) and adjusts tone accordingly. Counter-points are no longer a blanket rule — they're conditional on mission type.
- **Celebration Mode (v9.0)**: New content variation specifically for campaign launches and celebrations. High energy, no forced skepticism, genuine excitement.
- **Reference Tweet Integration (v9.0)**: Reference tweets are now read, analyzed, and their content is passed to judges for proper Alignment evaluation.
- **G4 + X-Factor**: Programmatic scoring on top of judge scores (bonus points for human-like patterns)
- **X-Ready Output**: Final content is plain text, no markdown, no formatting artifacts. User copies from code block and pastes directly to X/Twitter. Zero cleanup needed.
- **Minority Override (v9.5)**: Gate consensus uses min() BUT with anti false-positive: if only 1 out of 5+ judges gives 0/2, gate is FLAGGED (1/2, tracked but not mandatory feedback loop). 2+ judges must agree on fail for HARD GATE FAIL (0/2). Prevents single outlier from killing good content.
- **Stability Check + Early Accept (v9.5)**: Feedback loop tracks best score across all loops. If score drops, auto-revert to best version. If score >= 16/18 after loop #1, user gets early accept option. Prevents over-correction destroying good content.
- **Root Cause-Based Strategy Selection (v9.5)**: Feedback loop strategy chosen by analyzing WHAT went wrong (AI fingerprint, tone mismatch, weak hook, compliance, AI feel, factual issue) — not by loop number. More efficient: right fix for right problem.
- **Context-Saving Mode (v9.5)**: Steps 5b (Pre-Writing), 5.7 (Content DNA), 6.5 (MAX-OUT Verification) process internally without outputting full templates to conversation. Saves ~150 lines of context per pipeline run.
- **Simplified Anti-AI Rules (v11.0)**: Consolidated from 140+ to 20 essential rules based on 155 submission calibration. Removed 3-tier system. Only rules that cause measurable gate failures or score penalties remain. 6 gate fail rules, 6 originality penalty rules, 8 quality penalty rules. Faster scanning, less constraint, more room for genuine voice.
- **Post-Submission Rally Score Collection (v9.5)**: After output, ask user for Rally's actual score. Closes the calibration feedback loop — lets us see if internal judge matches Rally's judge over time.
- **Compressed Re-Judge Context (v9.5)**: In feedback loop #2+, compressed prompt (abbreviated rubric + top 5 KB facts) saves ~50% tokens. Safe because judges already internalized rubric from loop #1.
- **Mission-Aware Campaign Picker (v9.6)**: Campaign picker now fetches ALL missions from ALL campaigns and displays a flat numbered list. User picks a specific mission (not just a campaign). Each mission has its own rules/style/requirements, so the pipeline uses `SELECTED_MISSION_INDEX` instead of hardcoded `missions[0]`. Checkpoint stores `mission_title` and `mission_index` for proper resume.
- **Comprehensive Campaign Request Parser (v9.9)**: Rules Text Parser v9.7 upgraded to parse ALL campaign request constraints — not just format. Now extracts: content focus areas (what topics must be discussed), topic restrictions, hashtag requirements, mention requirements, language requirements, media/image requirements, reply-specific requirements, tone keywords from text, and energy level from rules. Parser scans `rules` + `description` + `requirements` + `additionalInfo` (not just `rules`). Each extracted constraint flows through Deep Analysis → Content Writing → HARD FORMAT GATE.
- **Campaign Request Profile (v9.9)**: New Step 4.5 #9 dimension. Builds complete understanding of "what the campaign is asking for" — format, content focus, mandatory elements, tone, thread structure, per-post char limits. Forces AI to make explicit FORMAT DECISION (single vs thread) before writing, with reasoning.
- **Thread Writing Guidelines (v9.9)**: New Step 6 rules for thread format. Hook in tweet 1, body in tweet 2-N, close in last tweet. Natural length per post (300-1000 chars common for X Premium). Thread coherence rules. All 3 variations MUST be same format.
- **Expanded HARD FORMAT GATE (v9.9)**: 8 checks instead of 4. Added: format compliance (all variations same format), per-post character limit, content focus verification, mandatory mentions/hashtags, topic restrictions, language check.
- **Content Focus Enforcement (v9.9)**: If campaign asks to "explain X" and "argue Y", both MUST be addressed. Content that misses a focus area = Content Alignment 0/2.
- **Rally-Calibrated Scoring (v10.0, updated v11.0)**: Reply Quality merged INTO Engagement Potential (Rally evaluates reply-worthiness within Engagement, not as separate category). Total max score: 18/18 (6 categories). Grade thresholds recalibrated.
- **Gate-Quality G4+XF Gating (v10.0)**: G4 and X-Factor programmatic bonuses are now conditional on gate quality. If any binary gate FAILS (0/2), bonuses disabled entirely. If any gate FLAGGED (1/2), bonuses halved. Prevents masking Alignment/Accuracy failures with human-like pattern bonuses.
- **Format Intelligence (v10.0)**: FORMAT DECISION no longer defaults to thread for multi-topic content. Evaluates estimated content volume and complexity first. If content fits within ~2000 chars → single post preferred. Thread only when content genuinely needs multiple posts.
- **Natural Length Policy (v10.0)**: Removed hardcoded 280 char per-post default for threads. X Premium users can post up to 25,000 chars. Thread posts target natural length (300-1000 chars common). Only enforce char limits when campaign explicitly specifies.
- **Personal Anecdote Requirement (v10.0)**: Every content variation must include at least 1 personal experience, concrete observation, or lived moment. Rally feedback specifically highlights personal anecdote as originality/authenticity factor.
- **Explicit CTA Requirement (v10.0)**: Content closing must include explicit call-to-action (specific audience ask, challenge, or resource direction). Generic "what do you think?" insufficient. Based on Rally scoring gap analysis (Engagement 4/5 when CTA missing).
- **Anti-Ban Calibration (v11.0)**: "nobody is talking about" kept as Originality penalty rule (not gate fail). Variations like "almost nobody is talking about" are ALLOWED. OverExplaining threshold at 300 words. All rule thresholds calibrated against 155 real Rally submissions.
- **Visual Rhythm Guidance (v10.0)**: New Engagement technique based on Rally feedback — short paragraphs, line breaks between ideas, sentence length variety within paragraphs. Rally reduces Engagement score for "dense" content that "may lose less technical readers".
- **Compliance Blueprint (v11.7)**: New Step 5.8 extracts EXACT mandatory phrases from rules text and ensures they appear VERBATIM in content (not paraphrased). Prevents Campaign Compliance 0/2 when Rally's programmatic checker expects specific strings. Also includes Hidden Character Limit Defense (1,200 max for single post, 900 avg for thread) to prevent Rally's hidden longform format violation that isn't exposed via API. Based on real Rally feedback where "zero VC backing" was paraphrased instead of using exact phrase "no VC backing", and 1701-char post was flagged despite characterLimit field being null.

## 🔄 Continuous Self-Improvement Engine v1.0

> 📖 **REFERENCE ARCHITECTURE — SKIP-ABLE SAAT CONTEXT PENUH:** Section ini menjelaskan mekanisme learning dan quality lock. Saat pipeline berjalan normal (bukan improvement mode), AI hanya perlu membaca sub-header dan memastikan learning log entry ditulis setelah Step 11. Detail internal mechanism tidak perlu diproses saat menulis konten.

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
  "version": "11.7",
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
  "compliance_failures": [
    {
      "issue": "[exact_phrase_mismatch / format_violation / hidden_char_limit / bonus_not_met]",
      "detail": "[what happened — e.g., 'content said zero VC backing but rules say no VC backing']",
      "root_cause": "[why — e.g., 'paraphrased mandatory requirement instead of using exact phrase']",
      "rally_judge_contradiction": "[YES/NO — if Rally judges gave conflicting scores on same issue]"
    }
  ],
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
Average Final Score       | [X]/18          | ≥ [X]/18 (NO DECREASE)
Originality Pass Rate     | [X]%            | ≥ [X]% (NO DECREASE)
Alignment Pass Rate       | [X]%            | ≥ [X]% (NO DECREASE)
Avg Feedback Loops        | [X]             | ≤ [X] (NO INCREASE)
Data Completeness Score   | [X]%            | ≥ [X]% (NO DECREASE)

VERDICT: ✅ PASS / ❌ FAIL (improvement rejected — risk of downgrade)
```

**Jika QUALITY LOCK FAIL → improvement TIDAK BOLEH di-apply.** Tampilkan ke user:
"⚠️ Improvement proposal ditolak oleh Quality Lock. Rata-rata skor 3 run terakhir: [X]/18. Improvement ini berpotensi menurunkan ke [Y]/18. Mau tetap apply atau cari alternatif?"

### Self-Improvement Behavior Rules

1. **NEVER auto-apply improvements without logging.** Every change to SKILL.md must be traceable.
2. **NEVER remove existing safety mechanisms** (HALT AND ASK, Data Fortress, anti-fabrication, etc.) even if they seem "too strict".
3. **NEVER lower scoring thresholds** (16/18 acceptance, gate requirements, etc.) even if "content keeps failing".
4. **NEVER reduce judge count or judge strictness** even if "judges are too harsh".
5. **ALWAYS prefer ADDING new checks/mechanisms** over REMOVING existing ones.
6. **ALWAYS measure before and after** any change to verify impact.
7. **ALWAYS prioritize content quality over speed.** A slow 16/18 is better than a fast 15/18.

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

9. **Hasil tidak masuk akal** — Judge memberikan skor yang sangat tidak wajar (misal semua variasi 0/18) → TANYA user: "Judge result terlihat tidak wajar: [detail]. Mau coba re-judge atau pilih sendiri?"

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
- LLM judge gagal → pakai Direct Task Subagent fallback (subagent evaluasi langsung tanpa invoke LLM skill) → jika juga gagal → pakai judge yang tersisa (chat.qwen.ai dipromosikan dari tiebreaker ke active judge)
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

**⚠️ v11.0 FALLBACK CHAIN (same auth inheritance as Judge Fallback):**
1. `web-search` skill → jika 401/gagal →
2. Task Subagent (general-purpose) → subagent launches web-search internally → auth inherited dari parent AI Assistant → 401 TIDAK terjadi
3. `curl` + DuckDuckGo HTML scrape → last resort, kualitas rendah
4. Skip competitive analysis and note it as a limitation

### TOOL 3: Web Page Reader

| Task | How | When |
|------|-----|------|
| Read competitor tweet/page | Read content from a URL found in web search results | Step 3b |
| Read Rally API page (fallback) | Read `https://app.rally.fun/api/campaigns/[ADDRESS]` if curl fails | Step 1c |

**How to use:** Use the `web-reader` skill. Invoke it via your available skill/tool system. Provide the URL and it will return the page content.

**⚠️ v11.0 FALLBACK CHAIN (same auth inheritance):**
1. `web-reader` skill → jika 401/gagal →
2. Task Subagent (general-purpose) → subagent launches web-reader internally → auth inherited → 401 TIDAK terjadi
3. `curl` via Bash → fetch URL content, strip HTML tags
4. Log FAILED and continue with available data

### TOOL 4: LLM Chat (PRIMARY Judge — Multi-Judge Panel)

| Task | How | When |
|------|-----|------|
| Judge J1-J5 | LLM skill × 5 parallel Task calls, different temps + personas | Step 7 (PRIMARY — if 401 → #1b) |
| Judge J1-J5 FALLBACK | Direct Task Subagent × 5, same personas, no temp | Step 7 (#1b — auto if LLM 401) |
| Judge J6 (Self) | Main AI evaluates directly in conversation | Step 7 (instant) |
| Judge J7 (Tiebreak/Promoted) | agent-browser → chat.qwen.ai | Step 7 (tiebreak if range>4, promoted if #1+#1b fail) |

**How to use:** Use the `LLM` skill for J1-J5. Each judge gets a DIFFERENT system prompt + temperature to ensure independent evaluation.

**⚠️ NO USER APPROVAL NEEDED for LLM judges.** In v8.0, LLM is the PRIMARY judge method (not backup). The 5-persona system + min() consensus + self-judge counterbalance neutralizes bias. **v10.0.1:** If LLM skill returns 401, auto-switch to Direct Task Subagent (#1b) without asking user. chat.qwen.ai is now the OPTIONAL backup (tiebreaker) or PROMOTED active judge.

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
    System: "You are a Rally.fun AI content judge. Score using the exact 6-category rubric.
    Be strict but fair. Top 10% content scores 16+/18. Average = 12/18. Be objective."

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

### TOOL 5: agent-browser → chat.qwen.ai (OPTIONAL Tiebreaker / PROMOTED Active Judge)

| Task | How | When |
|------|-----|------|
| Tiebreaker/Active judge (J7) | agent-browser → navigate to chat.qwen.ai → paste judge prompt → extract scores | Step 7 (tiebreaker if range>4pts, PROMOTED if #1+#1b fail) |

**⚠️ In v8.0, chat.qwen.ai is NO LONGER the primary judge.** It is now the OPTIONAL tiebreaker (Judge J7), used only when the 6-judge panel (J1-J6) produces unclear consensus. **v10.0.1:** chat.qwen.ai is PROMOTED to active judge (not just tiebreaker) if both #1 (LLM skill) and #1b (Direct Task Subagent) fail.

**When to trigger J7 (tiebreaker):**
- Judge score range (max - min) > 4 points for the WINNER variation
- Gates disagree significantly (some judges say 2/2 Originality, others say 0/2)
- J5 (AI Fingerprint Detector) gives 0/2 Originality but other judges give 2/2

**When to PROMOTE J7 (active judge):**
- LLM skill (Tool 4) returns 401/unavailable AND Direct Task Subagent (#1b) also fails
- J7 then acts as the ONLY external judge + Self-Judge (J6) = minimum 2 judges

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
2. **Direct Task Subagent × 5** (J1-J5 FALLBACK) — If LLM skill returns 401/unavailable. Subagents evaluate directly using their own AI capabilities (no LLM skill invocation). Same personas, no temperature control. ~15 seconds.
3. **Self-Judge** (J6) — Main AI evaluates directly in conversation. Instant. No tool call needed.
4. **agent-browser → chat.qwen.ai** (Tool 5, J7) — PROMOTED to active judge if LLM skill unavailable (not just tiebreaker). Uses same 6-category rubric.

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
Rally Content Generator v11.7

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
→ Jika checkpoint ada DAN masih valid (campaign + mission sama): tanya user "Ditemukan checkpoint untuk [campaign] > [mission]. Mau resume dari step [N] atau mulai baru?"
→ Jika checkpoint tidak ada atau user mau mulai baru: **JALANKAN MISSION-AWARE CAMPAIGN PICKER** (lihat section di bawah). JANGAN tanya "mau buat konten untuk campaign mana?" — langsung fetch dan tampilkan semua mission dari semua campaign.

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
→ Versi: v11.7

---

### `/rally update` — Langsung Update Patterns

**Ketika user mengetik `/rally update`:**
→ Skip menu, langsung jalankan proses update Universal Pattern Library.

---

### `/rally [nama campaign]` — Langsung Buat Konten

**Ketika user mengetik `/rally CampaignName`:**
→ Skip menu dan skip campaign picker. Langsung jalankan Step 1 sampai Step 11 untuk campaign tersebut.
→ Jika campaign punya MULTIPLE active missions, WAJIB tampilkan daftar mission dan minta user pilih salah satu sebelum lanjut ke pipeline.

---

### 🎯 Mission-Aware Campaign Picker v9.6 (WAJIB — Perbaikan Multi-Mission)

**MASALAH YANG DIPECAHKAN:** Campaign Rally punya 1-N missions per campaign. Campaign picker LAMA hanya menampilkan nama campaign (1 pilihan per campaign), sehingga user tidak bisa memilih mission spesifik. Padahal SETIAP mission punya rules, style, dan requirements yang BERBEDA.

**PRINSIP:** User HARUS memilih mission spesifik, bukan campaign. Satu campaign bisa punya 3 mission berbeda, dan konten harus dibuat PER-MISSION.

**ALUR PICKER ( WAJIB diikuti tepat ):**

**Phase 1: Fetch semua active campaigns + missions**
```bash
# Step 1: Fetch active campaigns
curl -s "https://app.rally.fun/api/campaigns?status=active" -o /tmp/rally_active_campaigns.json
```

**Step 2: Untuk SETIAP campaign, fetch detail untuk mendapat missions array:**
```bash
# Untuk setiap campaign di list:
curl -s "https://app.rally.fun/api/campaigns/[CONTRACT_ADDRESS]" | python3 -c "
import json, sys
data = json.load(sys.stdin)
c = data.get('campaigns', data)
if isinstance(c, list): c = c[0]
missions = [m for m in c.get('missions', []) if m.get('active')]
for i, m in enumerate(missions):
    print(f'MISSION|{i}|{m.get(\"title\",\"N/A\")}|{str(m.get(\"description\",\"\"))[:120]}')
"
```

**⚠️ OPTIMASI:** Fetch detail campaign secara PARALEL (multiple curl calls in one Bash command menggunakan `&` dan `wait`) untuk menghemat waktu. Target: semua detail ter-fetch dalam 15-30 detik.

**Phase 2: Bangun dan tampilkan MISSION-LEVEL picker**

Susun hasil menjadi flat list bernomor. Setiap item = 1 mission spesifik dari 1 campaign.

**FORMAT TAMPILAN:**
```
📋 MISSION PICKER — Pilih mission yang ingin kamu buat kontennya:

── Grvt Momentum (3 missions) ──
  1.  +6% Community Allocation Update
      Share about Season 2's +6% additional community allocation...
  2.  Grvt Growth & Metrics
      Recent Grvt metrics: TVL growing, volume increasing...
  3.  Grvt App Experience
      Share your real experience using the Grvt app...

── Rally Owns the Narrative ──
  4.  Rally Owns the Narrative
      Create content about how Rally is changing the narrative...

── MarbMarket — The First veDEX on MegaETH ──
  5.  Explain the veDEX Model & Why MarbMarket Matters
      Create a post educating about what a veDEX is...
  6.  Why Get In Early on MarbMarket?
      Content highlighting the opportunity of being early...

── [Campaign Name] ──
  7.  [Mission Title]
      [Description preview]...

... (semua mission dari semua campaign)

Ketik nomor mission (1-N) untuk mulai pipeline.
```

**ATURAN FORMAT:**
- Group missions per campaign menggunakan separator `── Campaign Name (N missions) ──`
- Jika campaign hanya punya 1 mission, tetap tampilkan dalam format yang sama (tanpa angka missions di header)
- Nomor urut GLOBAL (1, 2, 3, ...) — bukan per-campaign
- Tampilkan deskripsi mission (truncated max 120 chars) sebagai preview
- Jika mission tidak punya title, gunakan description truncated sebagai title
- Jika mission tidak punya description, tulis "(no description)"

**Phase 3: User memilih → siapkan data untuk pipeline**

Setelah user memilih nomor:
1. Map nomor → campaign address + mission index
2. Simpan ke variabel internal untuk pipeline:
   - `SELECTED_CAMPAIGN_ADDRESS` = contract address campaign
   - `SELECTED_CAMPAIGN_NAME` = nama campaign
   - `SELECTED_MISSION_TITLE` = title mission yang dipilih
   - `SELECTED_MISSION_INDEX` = index mission dalam array missions[] (0-based)
3. Jika campaign punya > 1 mission dan user memilih campaign secara langsung (tanpa nomor mission), TANYA: "Campaign ini punya [N] missions. Pilih mission:"

**Phase 4: Mulai pipeline dengan context penuh**

Setelah user pilih mission, langsung mulai pipeline dari Step 1. TAPI:
- **JANGAN fetch ulang campaign list** — data sudah ada dari Phase 1-2
- Langsung fetch FULL campaign detail (langkah 1c di pipeline) dengan address yang sudah terpilih
- Gunakan `SELECTED_MISSION_INDEX` untuk menargetkan mission spesifik di Field Resolution Table
- Di Step 1c, LAPIS 1: **AMBIL DATA DARI MISSION YANG DIPILIH** (`missions[SELECTED_MISSION_INDEX]`), bukan `missions[0]`

**CHECKPOINT UPDATE:**
Checkpoint JSON harus menyimpan mission info:
```json
{
  "version": "11.7",
  "campaign": "Campaign Name",
  "contract_address": "0x...",
  "mission_title": "Mission Title",
  "mission_index": 0,
  ...
}
```

**EDGE CASES:**
- Campaign tanpa active missions → skip dari picker, JANGAN tampilkan
- Semua campaign punya tepat 1 mission → tetap gunakan format picker yang sama (konsistensi)
- Campaign detail fetch gagal → tampilkan campaign name saja tanpa mission breakdown, catat error
- Total mission > 20 → tampilkan per halaman (10 per halaman), tanya user mau halaman berikutnya

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
- Total max = 2+2+2+2+5+5 = 18.0 (v11.0 — Reply Quality merged INTO Engagement Potential)

**6 CONTENT CATEGORY NAMES (urutan bisa berbeda, match by name):**
1. `Originality and Authenticity` — max 2.0
2. `Content Alignment` — max 2.0
3. `Information Accuracy` — max 2.0
4. `Campaign Compliance` — max 2.0
5. `Engagement Potential` — max 5.0 (includes Reply Quality evaluation per Rally's model)
6. `Technical Quality` — max 5.0

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
    "Engagement Potential",    # includes Reply Quality evaluation per Rally's model
    "Technical Quality",
]

quality_score = 0
for category in analysis:
    if category["category"] in content_categories:
        quality_score += int(category["atto_score"]) / 1e18

# quality_score = 0-18 (ini TRUE content quality — v11.0 max, Reply Quality merged into Engagement)
```

**JANGAN gunakan `atemporalPoints` sebagai quality proxy!** Data real menunjukkan `atemporalPoints` adalah rough proxy yang di-clustering — content 18/18 dan 17/18 bisa mendapat atemporalPoints yang SAMA (0.60). Sorting by atemporalPoints akan miss 77% konten berkualitas tinggi.

**Untuk mengambil analysis text (feedback dari Rally AI judge):**
Analysis text sudah ada di field `analysis[].analysis` untuk setiap category. Tidak perlu API call terpisah.

---

#### Step U3 — Filter dan kumpulkan TOP content

Dari semua submissions yang sudah di-fetch:

1. **Filter valid:** Hanya submission yang `disqualifiedAt`, `hiddenAt`, DAN `invalidatedAt` semuanya `null` (artinya valid)

2. **🚨 Hitung TRUE QUALITY SCORE untuk SETIAP valid submission:**
   - Jumlahkan `atto_score` dari 6 content categories saja (bukan engagement categories)
   - Lihat Step U2 untuk daftar 6 content categories dan code perhitungan
   - **JANGAN gunakan `atemporalPoints`** — ini rough proxy yang meng-cluster skor berbeda ke nilai yang sama

3. **Sort by TRUE QUALITY SCORE:** Urutkan dari tertinggi (18/18) ke terendah

4. **Ambil top 5-8 per campaign** — total target **50-80 samples**
   - Lebih banyak sample = analisis lebih reliable
   - Ambil yang quality_score >= 16/18 (76%) minimum — di bawah itu konten terlalu medioker untuk dipelajari pattern-nya

5. **⚠️ Sample size HALT AND ASK:** Jika total samples dari SEMUA campaign < 30, **STOP dan tanya user:**
   "Total sample hanya [N] dari [M] campaigns. Ini terlalu sedikit untuk analisis reliable. Mau lanjut dengan data yang ada, atau skip update?"

6. **Simpan data berikut untuk setiap top sample:**
   - Campaign name
   - xUsername
   - tweetUrl
   - tweetText (isi tweet — penting untuk analisis hook)
   - **TRUE quality score** (jumlah 6 content categories, contoh: 18.0/18.0)
   - Quality percentage (score/18 * 100)
   - Setiap category score: Originality, Alignment, Accuracy, Compliance, Engagement (incl. Reply Quality), Technical
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
- Skor (contoh: 18/18 = 100%)
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

**DATA SOURCE: [N] top content samples across [M] active + recently ended Rally campaigns | METRIC: TRUE quality score (sum of 6 content categories, zero engagement bias)**

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

**0a-SR. Check for Smart Resume cache:**
```bash
# After campaign+mission is selected, check data cache
if [ -f "/home/z/my-project/download/rally_data_cache.jsonl" ]; then
  # Search for cache entry matching selected campaign+mission
  rg "\"cache_key\": \"${CONTRACT_ADDRESS}_${MISSION_INDEX}\"" /home/z/my-project/download/rally_data_cache.jsonl
fi
```

- Jika cache ditemukan DAN user setuju → load data → SKIP Step 1-5.8 → langsung Step 6
- Jika cache tidak ditemukan atau user mau fresh → lanjutkan pipeline normal

**0b. Create fresh checkpoint:**
```bash
cat > /home/z/my-project/download/rally_checkpoint.json << 'EOF'
{
  "version": "11.7",
  "campaign": "",
  "contract_address": "",
  "mission_title": "",
  "mission_index": null,
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

**0b-SR. SMART RESUME — v11.3 Data Cache (Persistent per Campaign+Mission):**

**CACHE FILE:** `/home/z/my-project/download/rally_data_cache.jsonl`

**PURPOSE:** Step 1-5 data (API fetch, calibration, competitive, deep analysis, DNA) disimpan per campaign+mission. Jika campaign+mission SAMA di run berikutnya → data di-load dari cache → **Step 1-5 SKIP** → langsung Step 6 (generate konten baru). Hemat 3-5 menit per repeat run.

**CACHE FORMAT (1 JSON object per line):**
```json
{
  "cache_key": "[contract_address]_[mission_index]",
  "contract_address": "0x...",
  "mission_index": 7,
  "mission_title": "Mission 7: MarbMarket veDEX on MegaETH",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "steps_cached": ["1", "1d", "2", "3", "4", "4.1", "4.5", "5", "5.7"],
  "data": {
    "campaign_data": { ... },
    "parsed_rules_constraints": { ... },
    "compliance_blueprint": { ... },
    "calibration": { ... },
    "competitive": { ... },
    "campaign_brief": { ... },
    "deep_analysis": { ... },
    "anti_fabrication_whitelist": { ... },
    "content_dna": { ... },
    "pre_writing_perspective": { ... }
  }
}
```

**HOW TO USE:**

**On every pipeline start (after campaign+mission selected):**

1. **CHECK CACHE:** Read `/home/z/my-project/download/rally_data_cache.jsonl` via Bash. Search for line containing `"cache_key": "[ADDRESS]_[INDEX]"`.
2. **IF CACHE EXISTS:**
   - Tampilkan: `"⚡ SMART RESUME: Data cache ditemukan untuk [mission_title]. Step 1-5 bisa di-skip. Mau gunakan cache (hemat ~3-5 menit) atau fetch ulang?"`
   - Jika user pilih cache → load data dari cache → **SKIP Step 1, 1d, 2, 3, 4, 4.1, 4.5, 5, 5.7, 5.8** → langsung ke Step 6
   - Jika user pilih fetch ulang → jalankan normal, overwrite cache di akhir Step 5.7
3. **IF NO CACHE:**
   - Jalankan pipeline normal (Step 1-5 semua)
   - Simpan hasil Step 1-5 ke cache setelah Step 5.7 selesai

**CACHE INVALIDATION (kapan cache HARUS di-refresh):**
- User memilih campaign atau mission BERBEDA dari cache → pasti cache baru
- User EXPLICITLY minta fetch ulang → overwrite
- **TIDAK perlu auto-invalidate berdasarkan waktu** — campaign data di Rally API jarang berubah dalam hitungan jam
- Jika user ragu: tampilkan cache timestamp, biarkan user putuskan

**SAVE CACHE — Jalankan SETELAH Step 5.7 selesai:**
```bash
python3 << 'CACHE_EOF'
import json, os

cache_file = "/home/z/my-project/download/rally_data_cache.jsonl"
cache_key = f"{contract_address}_{mission_index}"
cache_entry = {
    "cache_key": cache_key,
    "contract_address": contract_address,
    "mission_index": mission_index,
    "mission_title": mission_title,
    "created_at": created_at,  # from checkpoint
    "updated_at": datetime.now().isoformat(),
    "steps_cached": ["1", "1d", "2", "3", "4", "4.1", "4.5", "5", "5.7"],
    "data": {
        "campaign_data": data.campaign_data,
        "parsed_rules_constraints": data.parsed_rules_constraints,
        "compliance_blueprint": data.compliance_blueprint,
        "calibration": data.calibration,
        "competitive": data.competitive,
        "campaign_brief": data.campaign_brief,
        "deep_analysis": data.deep_analysis,
        "anti_fabrication_whitelist": data.anti_fabrication_whitelist,
        "content_dna": data.content_dna,
        "pre_writing_perspective": data.pre_writing_perspective
    }
}

# Read existing, remove old entry for same cache_key, append new
existing = []
if os.path.exists(cache_file):
    with open(cache_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line:
                entry = json.loads(line)
                if entry.get("cache_key") != cache_key:
                    existing.append(entry)

existing.append(cache_entry)

with open(cache_file, 'w') as f:
    for entry in existing:
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')

print(f"CACHE SAVED: {cache_key}")
print(f"  Steps cached: {len(cache_entry['steps_cached'])}")
print(f"  Data keys: {list(cache_entry['data'].keys())}")
CACHE_EOF
```

**⚠️ SMART RESUME RULES:**
1. Step 6+ (generate, verify, sanitize, judge) TIDAK PERNAH di-cache → konten HARUS selalu fresh
2. Cache hanya berlaku untuk campaign+mission yang SAMA persis
3. User SELALU bisa override cache (fetch ulang)
4. Cache size tidak perlu dibatasi — 1 entry per campaign+mission, ratusan entry = masih kecil
5. Jika cache load gagal (corrupted file) → fallback ke normal pipeline, log error

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
- CATEGORY-MAXING PATTERNS (Originality, Engagement, Compliance, Alignment, Accuracy, Technical)
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

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `1` to `completed_steps`, save campaign data to `data.campaign_data`.

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
  ⚠️ Ambil dari mission yang DIPILIH USER di Mission-Aware Campaign Picker
  ⚠️ Gunakan missions[SELECTED_MISSION_INDEX] — BUKAN missions[0]
  ⚠️ Jika tidak ada SELECTED_MISSION_INDEX (misal: /rally CampaignName tanpa picker),
     gunakan FIRST ACTIVE mission sebagai fallback

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

**⚠️ v9.6: `[N]` dalam tabel = `SELECTED_MISSION_INDEX` dari Mission-Aware Campaign Picker.** BUKAN hardcoded 0.

```
═══ DATA FORTRESS: FIELD RESOLUTION TABLE ═══

Untuk SETIAP field di bawah, cek URUTAN fallback ini. Ambil dari lokasi PERTAMA yang punya nilai non-null:

┌───────────────────┬──────────────────────────────────────────────────────────────────────────────┐
│ FIELD             │ FALLBACK CHAIN (cek dari kiri ke kanan, ambil yang pertama non-null)         │
│                   │ ⚠️ [N] = SELECTED_MISSION_INDEX dari picker (bukan 0!)                       │
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

⚠️ Jika SELECTED_MISSION_INDEX tidak tersedia (misal: user ketik /rally CampaignName langsung
   tanpa melewati picker), gunakan [N] = index FIRST ACTIVE mission (fallback).
```

**⚠️ CONTOH KASUS NYATA (GenLayer — bug yang ditemukan):**
- User pilih mission index 2 di picker
- `missions[2].style` = null (KOSONG di mission level)
- `style` (campaign root) = "Post a banger!" (ADA di campaign level)
- **BUG LAMA**: Pipeline hanya cek `missions[0].style` → null → style tidak ditemukan
- **FIX v9.6**: Fallback chain cek `missions[SELECTED_MISSION_INDEX].style` (null) → fall back ke `style` (campaign root) → "Post a banger!" ✅

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

**1c-v. LAPIS 3.5: COMPREHENSIVE CAMPAIGN REQUEST PARSER (v9.9 — MAJOR UPGRADE)**

**⚠️ MASALAH YANG DIPECAHKAN:**
- **v9.7:** Banyak campaign Rally menyimpan format constraints di dalam teks `rules`, BUKAN di dedicated field. Parser v9.7 hanya extract format, max/min posts, char limit, mandatory includes, dan prohibited items.
- **v9.9:** Campaign meminta BANYAK LEBIH dari sekadar format. Ada hashtag requirements, tone keywords, content focus areas, media/image requirements, reply specifics, topic restrictions, language preferences, dan lain-lain — SEMUA tersebar di `rules`, `description`, `requirements`, `additionalInfo`, dan `style`. Parser v9.7 MISS semua requirement non-format ini → AI menulis konten yang "benar formatnya" tapi "salah substansinya".

**PRINSIP:** `rules` text + `description` + `requirements` + `additionalInfo` adalah sumber kebenaran HIGHEST untuk SEMUA campaign request constraints. Jika ada konflik antara API field dan teks → **teks yang menang**.

**Parser HARUS mengekstrak dari teks `rules` + `description` + `requirements` + `additionalInfo`:**
```
COMPREHENSIVE CAMPAIGN REQUEST PARSER — Extract ALL campaign request constraints:
═════════════════════════════════════════

SECTION A: FORMAT & STRUCTURE (from v9.7 — preserved & expanded)

A1. FORMAT TYPE:
   Cek patterns: "single post", "thread", "tweet", "reply", "short thread", "multi-post"
   → Jika "single post or thread" → format_allowed = ["single", "thread"]
   → Jika "single post only" → format_allowed = ["single"]
   → Jika "thread only" → format_allowed = ["thread"]
   → Jika "short thread" → format_allowed = ["thread"], flag short=true
   → Jika tidak ada mention → format_allowed = ["single"] (safe default)

A2. MAX POST COUNT (untuk thread):
   Cek patterns: "X to Y posts max", "up to Y posts", "max Y posts", "Y posts max"
   → "2 to 4 posts max" → min_posts=2, max_posts=4
   → Jika tidak ada mention → max_posts=null (no explicit limit)

A3. MIN POST COUNT (untuk thread):
   Cek patterns: "at least X posts", "X to Y posts", "minimum X posts"
   → "2 to 4 posts" → min_posts=2

A4. CHARACTER LIMIT (dari rules text, bukan field):
   Cek patterns: "X characters", "max X chars", "under X characters", "X letter limit"
   → Jika characterLimit field JUGA ada → gunakan yang MORE RESTRICTIVE (lebih kecil)
   → ⚠️ v10.0: Jika format = thread DAN no per-post char limit → per_post_char_limit = NONE (X Premium supports up to 25,000 chars per post)
   → ⚠️ v10.0: JANGAN pernah default ke 280 — 280 adalah batas free account, bukan realita crypto Twitter

A5. MANDATORY INCLUSIONS (dari rules text):
   Cek patterns: "must mention", "must include", "include either", "mention at least one", "make sure to", "remember to"
   → Setiap item WAJIB masuk ke checklist Step 6.5 Compliance

A6. PROHIBITED FROM RULES TEXT:
   Cek patterns: "do not", "don't", "avoid", "no X", "never", " refrain from", "skip"
   → Merge dengan prohibitedItems dari API field

SECTION B: CONTENT REQUIREMENTS (v9.9 — NEW)

B1. CONTENT FOCUS AREAS (apa yang HARUS dibahas):
   Cek patterns di rules/description/requirements:
   - "explain" + [topic] → content_focus = ["explain: {topic}"]
   - "discuss" + [topic] → content_focus = ["discuss: {topic}"]
   - "focus on" + [topic] → content_focus = ["focus: {topic}"]
   - "describe" + [topic] → content_focus = ["describe: {topic}"]
   - "share your thoughts on" → content_focus = ["opinion: {topic}"]
   - "why" + [project] + "matters" → content_focus = ["argue: why {project} matters"]
   - Jika mission description punya kalimat tanya → content_focus = ["answer: {question}"]
   → Setiap focus area HARUS di-address di konten (cek di Step 6.5)

B2. TOPIC RESTRICTIONS (apa yang TIDAK BOLEH dibahas):
   Cek patterns: "don't mention", "avoid talking about", "stay away from", "not about"
   → Jika ada → tambah ke prohibited topics list
   → JANGAN sampai konten membahas topik yang dilarang

B3. HASHTAG REQUIREMENTS:
   Cek patterns: "use hashtag", "include #", "tag with", "must use hashtag"
   → Jika ada specific hashtag → mandatory_hashtags = ["#hashtag1", "#hashtag2"]
   → Jika "max X hashtags" → max_hashtags = X
   → Jika "no hashtags" → max_hashtags = 0
   → Cross-check dengan skill default (max 2) — gunakan yang MORE RESTRICTIVE

B4. MENTION REQUIREMENTS:
   Cek patterns: "mention @", "tag @", "include @", "reference @" 
   → Jika ada specific handle → mandatory_mentions = ["@handle1"]
   → Jika "mention the project" → mandatory_mentions = ["@{project_handle}"]
   → Cross-check dengan additionalInfo links

B5. LANGUAGE REQUIREMENTS:
   Cek patterns: "in English", "in Indonesian", "in Bahasa", "in your language", language code
   → Jika disebut → content_language = ["en"/"id"/etc]
   → Jika tidak ada → content_language = null (default: ikuti campaign language)
   → ⚠️ v9.9: Jika campaign bahasa Inggris TAPI rules tidak sebut language → asumsikan English

B6. MEDIA/IMAGE REQUIREMENTS:
   Cek patterns: "include image", "attach screenshot", "with a meme", "add a GIF", "include media"
   → Jika disebut → media_required = true/false
   → Jika "create a meme about" → media_type = "meme"
   → ⚠️ AI tidak bisa generate image langsung di konten, tapi HARUS mention atau instruct user

B7. REPLY-SPECIFIC REQUIREMENTS (jika contentType = "reply"):
   Cek patterns: "reply to", "respond to", "quote tweet", "quote this"
   → Jika reply ke specific tweet → reply_target = tweet URL
   → Jika "keep it short" untuk reply → reply_max_length = short
   → Jika "add your perspective" → reply_tone = "perspective"

B8. REQUIREMENT TYPE CLASSIFICATION (v11.5 — CRITICAL for Compliance):
   Cek VERB TYPE dari SETIAP requirement in rules/description/requirements:
   - "explain" + [X] / "what is" + [X] / "describe" + [X] / "define" + [X]
     / "creatively explain" + [X] / "visually explain" + [X] / "walk through" + [X]
     / "break down" + [X] / "show how" + [X] works
     → requirement_type = "EXPLAIN" → konten HARUS punya definisi/penjelasan eksplisit
     → Jika hanya disebut tapi tidak dijelaskan → Compliance FAIL
     → ⚠️ "creatively explain" and "visually explain" = EXPLAIN with creativity requirement
       (use analogy, metaphor, step-by-step walkthrough, or visual-language description)
   - "mention" + [X] / "include" + [X] / "reference" + [X]
     → requirement_type = "MENTION" → konten cukup menyebut/memuat kata/frasa X
   - "discuss" + [X] / "analyze" + [X] / "why" + [X] + "matters"
     → requirement_type = "ARGUE" → konten HARUS punya analisis/perspektif
   - "share your experience" / "your thoughts on"
     → requirement_type = "OPINION" → konten HARUS punya opini personal
   → Setiap requirement HARUS diklasifikasikan
   → Classification ini dikirim ke HARD FORMAT GATE (Step 6.5) untuk pengecekan tipe

B9. BONUS REQUIREMENT DETECTION (v11.6 — CRITICAL Rally fix):
   Cek RULES TEXT untuk "bonus" label — Rally's bonus criteria are NOT optional:
   Scan patterns:
   - "bonus" + [requirement text] (e.g., "Bonus: explain the MARB flywheel")
   - "bonus criterion" / "bonus criteria" / "bonus points" / "for bonus" / "+bonus"
   - "extra credit" / "additional points for"
   - "for exceptional" + [requirement]
   → JIKA DITEMUKAN:
     1. Extract the ACTUAL requirement (the part after "bonus" label)
     2. Classify requirement type (EXPLAIN/MENTION/ARGUE/OPINION) using B8 rules
     3. Add to bonus_requirements list with classification
     4. ⚠️ CRITICAL: bonus_requirements are treated as MANDATORY for Compliance scoring
     5. ⚠️ Rally's AI evaluator checks bonus criteria programmatically and flags VIOLATED
        if not met — this DIRECTLY reduces Campaign Compliance from 2/2 to 1/2
     6. Therefore, bonus_requirements MUST pass HARD FORMAT GATE just like regular requirements
   → WHY: Real Rally evaluation showed Campaign Compliance dropped from 2/2 to 1/2
     when "bonus criterion — creatively explaining the MARB flywheel or ve(3,3) model"
     was not met. The word "bonus" in Rally's context means "additional scoring opportunity"
     NOT "optional" — missing it PENALIZES your Compliance score.
   → Examples:
     "Bonus: creatively or visually explain the MARB flywheel or ve(3,3) model"
       → bonus_requirements: [{"text": "explain the MARB flywheel or ve(3,3) model",
          "type": "EXPLAIN", "modifier": "creatively or visually", "mandatory": true}]
     "For bonus points: include a comparison with other veDEX protocols"
       → bonus_requirements: [{"text": "include a comparison with other veDEX protocols",
          "type": "ARGUE", "modifier": "comparison", "mandatory": true}]

SECTION C: TONE & STYLE FROM TEXT (v9.9 — NEW)

C1. TONE KEYWORDS FROM RULES/DESCRIPTION:
   Scan untuk tone indicator words:
   - Positive: "excited", "celebrate", "amazing", "awesome" → tone_positive = true
   - Negative: "critical", "concerns", "risks", "skepticism" → tone_critical = true
   - Neutral: "discuss", "explore", "share thoughts" → tone_neutral = true
   - Casual: "casual", "chill", "vibes" → tone_casual = true
   - Professional: "professional", "informative", "educational" → tone_professional = true
   → Cross-check dengan style field — jika konflik, rules text WINS

C2. CONTENT ENERGY LEVEL (from rules/description):
   Cek patterns: "make it exciting", "keep it chill", "be bold", "high energy", "calm"
   → energy_from_text = [HIGH/MEDIUM/LOW]
   → Cross-check dengan Step 4.5 #4 (Style Deep Read) — jika konflik, rules WINS

═════════════════════════════════════════
PARSED CAMPAIGN REQUEST CONSTRAINTS (v9.9 FULL PROFILE):
  format_allowed: [single, thread]       ← Section A1
  max_posts: 4                            ← Section A2
  min_posts: 2                            ← Section A3
  char_limit: null                        ← Section A4
  per_post_char_limit: NONE               ← Section A4 (no default — only set if campaign specifies)
  mandatory_includes:                     ← Section A5
    - "x.com/Marb_market or t.me/marbmarket"
    - "at least one key feature: vote-escrow, bribes, LP farming, or fair launch"
  rules_text_prohibited:                  ← Section A6
    - "price predictions"
    - "financial promises"
  content_focus:                          ← Section B1 (v9.9 NEW)
    - "explain: veDEX model"
    - "argue: why MarbMarket matters"
  topic_restrictions:                     ← Section B2 (v9.9 NEW)
    - (none found)
  mandatory_hashtags:                     ← Section B3 (v9.9 NEW)
    - (none found)
  max_hashtags: 2                         ← Section B3 (default, more restrictive wins)
  mandatory_mentions:                     ← Section B4 (v9.9 NEW)
    - "@Marb_market"
  content_language: en                    ← Section B5 (v9.9 NEW)
  media_required: false                   ← Section B6 (v9.9 NEW)
  reply_specific: null                    ← Section B7 (v9.9 NEW)
  tone_from_rules: [energetic]            ← Section C1 (v9.9 NEW)
  energy_from_rules: MEDIUM-HIGH          ← Section C2 (v9.9 NEW)
  requirement_types:                      ← Section B8 (v11.5 NEW — CRITICAL)
    - "explain: veDEX model" → EXPLAIN
    - "argue: why MarbMarket matters" → ARGUE
    - "include x.com/Marb_market" → MENTION
  bonus_requirements:                     ← Section B9 (v11.6 NEW — CRITICAL)
    - {"text": "explain the MARB flywheel or ve(3,3) model", "type": "EXPLAIN",
       "modifier": "creatively or visually", "mandatory": true}
    - (list ALL bonus requirements found in rules text)
  ⚠️ bonus_requirements are MANDATORY — missing any = Campaign Compliance FAIL
═════════════════════════════════════════

⚠️ JIKA rules text menyebutkan constraint → OVERRIDE API field
⚠️ SAVE parsed constraints ke checkpoint: data.parsed_rules_constraints
⚠️ Gunakan parsed constraints di Step 4.5 (analysis), Step 6 (writing), DAN Step 6.5 (verification)
⚠️ v9.9 CRITICAL: content_focus WAJIB di-address — jika konten tidak membahas topik yang diminta → Alignment 0/2
```

**Setelah parser selesai, update Field Resolution Report dengan parsed constraints.**

---

**1d. LAPIS 4: LINK EXTRACTION & READING — WITH TOOL FALLBACK CHAIN (v9.7)**

**⚠️ MASALAH YANG DIPECAHKAN:** Tool external sering gagal (z-ai-web-dev-sdk → 401, curl → DNS failed, fxtwitter → 404). Pipeline v9.6 hanya punya 1 tool per task → jika gagal, data hilang.

**⚠️ PRINSIP: Setiap link yang ditemukan HARUS dibaca dengan BEST EFFORT. Gunakan cascade fallback sampai salah satu berhasil.**

**TOOL FALLBACK CHAIN (v11.0 — with Task Subagent web fallback):**

```
Untuk SETIAP link yang perlu dibaca, cek URUTAN ini:

1. z-ai-web-dev-sdk (page_reader / web_search)
   → Jika berhasil → gunakan data
   → Jika 401/gagal → lanjut ke #2

2. Task Subagent (general-purpose) — SAME FIX AS JUDGE FALLBACK
   → Launch general-purpose subagent to read URL
   → Subagent inherits auth dari parent → 401 TIDAK terjadi
   → Prompt: "Read this URL and extract all text content: [URL]"
   → Jika berhasil → gunakan data
   → Jika gagal → lanjut ke #3

3. agent-browser (headless browser — INSTALLED dan TERSEDIA)
   → agent-browser open <url>
   → agent-browser snapshot -c (compact output untuk teks)
   → agent-browser get text @<ref> (untuk konten spesifik)
   → agent-browser close
   → Jika berhasil → gunakan data
   → Jika DNS failed / timeout → lanjut ke #4

4. curl + text extraction (last resort)
   → curl -sL --max-time 15 <url>
   → Parse HTML: strip tags, extract text
   → Jika berhasil → gunakan data (kualitas lebih rendah, tapi lebih baik dari kosong)
   → Jika gagal → log FAILED, lanjut ke link berikutnya

⚠️ JIKA SEMUA 4 GAGAL untuk reference tweet:
   → Gunakan agent-browser untuk buka x.com/<username> (profile page)
   → Extract tweet text dari snapshot
   → Ini adalah LAST RESORT — data mungkin tidak lengkap tapi lebih baik dari 0

⚠️ JIKA SEMUA 4 GAGAL untuk project website:
   → Log sebagai FAILED
   → Di Step 4.1, tandai sebagai INCOMPLETE
   → Pipeline TIDAK BOLEH lanjut tanpa user acknowledgment
```

**FALLBACK PRIORITY MATRIX:**

| Link Type | Tool #1 | Tool #2 | Tool #3 | Tool #4 |
|-----------|---------|---------|---------|---------|
| Reference tweet (x.com) | z-ai-web-dev-sdk | Task Subagent | fxtwitter API | agent-browser |
| Project website | z-ai-web-dev-sdk | Task Subagent | agent-browser | curl |
| Article/blog | z-ai-web-dev-sdk | Task Subagent | agent-browser | curl |
| Rally campaign page | z-ai-web-dev-sdk | curl | Task Subagent | agent-browser |
| Web search (competitive) | z-ai-web-dev-sdk | Task Subagent | agent-browser + Google | curl (DuckDuckGo) |

**Agent-browser usage examples:**
```bash
# Read a tweet
agent-browser open "https://x.com/username/status/123456"
sleep 3
agent-browser snapshot -c

# Read a website
agent-browser open "https://project-website.com"
sleep 5
agent-browser snapshot -c

# Always close after
agent-browser close
```

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

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `2` to `completed_steps`, save calibration data to `data.calibration`.

**2a. Fetch submissions (curl is most reliable):**
```bash
curl -s "https://app.rally.fun/api/submissions?campaignAddress=[CONTRACT_ADDRESS]&limit=200" -o /tmp/rally_submissions.json
```
Or alternatively use **Tool 3: Web Page Reader** to read the URL if curl fails.

**2b. Parse and analyze the submission data:**

Each submission has:
- `analysis[]` -- 12 categories total (6 content + 5 engagement + Reply Quality merged into Engagement). **Hanya hitung 6 content categories!**
- `atemporalPoints` -- ⚠️ **JANGAN gunakan ini sebagai quality score.** Ini rough proxy yang meng-cluster skor berbeda ke nilai yang sama (18/18 dan 17/18 bisa dapat atemporalPoints yang sama). Gunakan perhitungan manual di bawah.
- `disqualifiedAt` / `hiddenAt` / `invalidatedAt` -- Filter out invalid submissions
- `xUsername` -- Submitter's X handle

**6 Content categories** (ini yang DIHITUNG untuk quality score, max 18 total):
1. Originality and Authenticity (0-2)
2. Content Alignment (0-2)
3. Information Accuracy (0-2)
4. Campaign Compliance (0-2)
5. Engagement Potential (0-5) — includes Reply Quality evaluation per Rally's model
6. Technical Quality (0-5)

**5 Engagement categories** (JANGAN dihitung untuk quality — ini temporal metrics):
1. Retweets
2. Likes
3. Replies
4. Followers of Repliers
5. Impressions

**🚨 Cara hitung TRUE QUALITY SCORE:**
```
quality_score = sum of atto_score (divided by 1e18) for the 6 content categories only
```
Ini menghasilkan skor 0-18 yang merepresentasikan kualitas konten sesungguhnya menurut Rally's AI judge.

**2c. Calculate calibration data:**

From the valid submissions, calculate **TRUE QUALITY SCORE** (bukan atemporalPoints):

```
═══ GROUND TRUTH CALIBRATION ═══

Total submissions fetched: [N]
Valid submissions (not disqualified/hidden): [N]
Quality metric: TRUE content quality (sum of 6 categories, 0-18)

CONTENT QUALITY DISTRIBUTION:
  Mean:   [X]/18 ([Y]%)     (average submission)
  Median: [X]/18 ([Y]%)     (typical submission)
  Min:    [X]/18 ([Y]%)     (worst valid submission)
  Max:    [X]/18 ([Y]%)     (best submission)
  P10:    [X]/18 ([Y]%)     (bottom 10%)
  P25:    [X]/18 ([Y]%)     (bottom 25%)
  P50:    [X]/18 ([Y]%)     (middle)
  P75:    [X]/18 ([Y]%)     (top 25%)
  P90:    [X]/18 ([Y]%)     (top 10%)

POSITION THRESHOLDS (for our content):
  Top 10% requires: >= [P90]/18
  Top 25% requires: >= [P75]/18
  Top 50% requires: >= [P50]/18
  Above average:    >= [Mean]/18

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
  1. @[username] -- [score]/18 ([pct]%) [tweetUrl]
  2. @[username] -- [score]/18 ([pct]%) [tweetUrl]
  3. @[username] -- [score]/18 ([pct]%) [tweetUrl]
  4. @[username] -- [score]/18 ([pct]%) [tweetUrl]
  5. @[username] -- [score]/18 ([pct]%) [tweetUrl]
```

**2d. Use calibration data to set targets:**

- **Target score** = P90 value (aim for top 10%)
- **Minimum acceptable** = P50 value (at least average)
- **Focus categories** = Weak categories (where competitors struggle -- easier to stand out)
- **Study top submissions** = Read tweet URLs of top 5 to understand what works

**If API returns empty or error:**
- ⚠️ **HALT AND ASK** (lihat "HALT AND ASK RULE" di atas). Tanya user apakah mau lanjut tanpa calibration atau coba lagi.
- Jika user setuju lanjut: use default thresholds: target >= 89% (16/18), minimum >= 78% (14/18)

---

### STEP 3: Competitive Analysis

**⏱ Estimated time: 30-60 seconds**

**Search the web for competitor content** about this campaign. Learn what angles, hooks, and phrases are overused so we can be different.

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `3` to `completed_steps`, save competitive data to `data.competitive`.

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
- **Estimated score**: Rate each competitor on Rally's 6 categories (0-18)

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
  Competitor avg: [X]/18 ([Y]%)
  Competitor top: [X]/18 ([Y]%)

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

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `4` to `completed_steps`, save brief to `data.campaign_brief`.

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

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `4.1` to `completed_steps`.

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
rulesTextParsed   | ✅/❌    | [rules + description + requirements + additionalInfo]    | v9.9: ALL campaign request constraints
requirement_types_classified: ✅/❌    | [rules + description + requirements]    | v11.5: all reqs have type (MENTION/EXPLAIN/ARGUE/OPINION)
```

**4.1b-v. Campaign Request Parser Verification (v9.9 — UPGRADED from v9.7):**

Setelah tabel di atas, HARUS verifikasi hasil COMPREHENSIVE CAMPAIGN REQUEST PARSER dari Step 1d-v:

```
═══ CAMPAIGN REQUEST PARSER VERIFICATION (v9.9) ═══
  FORMAT & STRUCTURE:
  format_allowed: [single/thread]          ← Section A1
  max_posts: [N or null]                   ← Section A2
  min_posts: [N or null]                   ← Section A3
  char_limit: [N or null]                  ← Section A4
  per_post_char_limit: [N or NONE]         ← Section A4 (v10.0 — no default)

  CONTENT REQUIREMENTS (v9.9 NEW):
  content_focus: [list of topics]          ← Section B1
  topic_restrictions: [list]               ← Section B2
  mandatory_hashtags: [list]               ← Section B3
  mandatory_mentions: [list]               ← Section B4
  content_language: [en/id/null]           ← Section B5
  media_required: [true/false]             ← Section B6
  reply_specific: [null or details]        ← Section B7

  REQUIREMENT TYPES (v11.5 NEW — CRITICAL):
  requirement_types_classified: ✅/❌      ← Section B8
    - "[requirement]" → EXPLAIN
    - "[requirement]" → ARGUE
    - "[requirement]" → MENTION
    - "[requirement]" → OPINION
  MANDATORY & PROHIBITED:
  mandatory_includes: [list]               ← Section A5
  rules_text_prohibited: [list]            ← Section A6

  TONE & STYLE (v9.9 NEW):
  tone_from_rules: [list of tone tags]     ← Section C1
  energy_from_rules: [HIGH/MEDIUM/LOW]     ← Section C2

  ⚠️ KONFLIK CHECK:
  - contentType field vs rules text format → rules text WINS
  - characterLimit field vs rules text limit → MORE RESTRICTIVE WINS
  - prohibitedItems field vs rules text prohibited → MERGE (union of both)
  - style field vs tone_from_rules → rules text WINS
═════════════════════════════════════════
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

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `4.5` to `completed_steps`, save analysis to `data.deep_analysis`.

**AI HARUS menjawab 9 pertanyaan analisis berikut, lalu TAMPILKAN PROOF SUMMARY:**

**⚠️ v9.8 ANTI-SHORTCUT: Step ini HARUS menampilkan proof. Bukan "internal".**

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
   - Content Alignment: style apa yang diminta? apa kontraindikasinya? FORMAT APA YANG DIMINTA?
   - Information Accuracy: fakta mana yang verified? mana yang risky?
   - Campaign Compliance: rule mana yang paling sering dilanggar? prohibited items? FORMAT YANG DIMINTA?
   - Engagement Potential: hook style mana yang cocok? ending style? reply-worthiness check? JIKA THREAD: hook di tweet 1, ending di tweet terakhir
   - Technical Quality: character limit? format khusus? sanitization checklist? JIKA THREAD: per-post natural length (300-1000 chars)?
   - **⚠️ v9.9 FORMAT COMPLIANCE (BARU)**: Jika format = thread → strategi harus include bagaimana memastikan SETIAP tweet standalone + thread coherence. Jika format = single → strategi harus include bagaimana padatkan semua ke 1 tweet tanpa kehilangan content focus.

   CATEGORY STRATEGY:
   - Originality: [strategi spesifik — gunakan gap dari #5]
   - Alignment: [strategi spesifik — ikuti style dari #4 + format dari #9]
   - Accuracy: [strategi spesifik — gunakan must-include dari #3]
   - Compliance: [strategi spesifik — check rules + prohibited items + format requirements + ⚠️ BONUS REQUIREMENTS (v11.6 — ALL bonus criteria are MANDATORY for Compliance)]
   - Engagement: [strategi spesifik — hook + ending style + reply-worthiness + JIKA THREAD: hook di tweet 1, ending di tweet terakhir]
   - Technical: [strategi spesifik — format + sanitization + JIKA THREAD: natural length per post]

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

9. FULL CAMPAIGN REQUEST PROFILE (v9.9 — NEW — CRITICAL)
   - Baca SEMUA parsed constraints dari Step 1d-v (COMPREHENSIVE CAMPAIGN REQUEST PARSER)
   - INI ADALAH STEP TERPENTING v9.9 — tanpa ini, AI akan salah memahami apa yang diminta campaign
   - Tujuannya: membangun pemahaman UTUH tentang "APA YANG DIMINTA" bukan hanya format
   - Analisa:
     a. FORMAT: Apa format yang diminta? Single tweet? Short thread? Reply? Multi-post?
        → Jika thread: berapa post? Apakah "short thread" (2-3 tweets pendek) atau "thread" (3-4 tweets detail)?
        → Ini MENENTUKAN bagaimana AI menulis — BUKAN hanya sekadar "berapa paragraf"
     b. CONTENT FOCUS: Apa topik yang HARUS dibahas? "Explain X", "Discuss Y", "Why Z matters"?
        → Ini menentukan INTI konten — jika AI tidak address ini, Alignment = 0/2
     c. MANDATORY ELEMENTS: Mention wajib? Hashtag wajib? Link wajib? Feature wajib?
        → Setiap item yang HARUS ada di konten
     d. TONE FROM TEXT: Apa tone yang diminta di rules/description? Consisten dengan style field?
        → Jika konflik → rules text WINS
     e. CONTENT STRATEGY: Bagaimana struktur konten yang optimal berdasarkan SEMUA constraints?
        → Contoh: "thread 2-4 posts tentang veDEX model" → Tweet 1: hook + intro, Tweet 2: mechanics, Tweet 3+: why it matters + closing
     f. FORMAT DECISION: Pilih format yang optimal dari format_allowed:
        → Jika format_allowed = ["single", "thread"] → EVALUASI dulu:
          - Jika content_focus punya >1 topik DAN estimated konten perlu >2000 chars → PILIH thread
          - Jika content_focus punya >1 topik TAPI konten bisa ringkas (<2000 chars) → PILIH single post (lebih natural untuk single longform di X Premium)
          - Jika hanya 1 topik → PILIH single post
          - ⚠️ DEFAULT: Jika ragu → PILIH single post (lebih safe, X Premium mendukung hingga 25,000 chars)
        → Jika format_allowed = ["single"] → HARUS single post, padatkan semua ke 1 tweet
        → Jika format_allowed = ["thread"] → HARUS thread, jangan tulis single panjang
        → ⚠️ DEFAULT DECISION: Jika rules bilang "single or thread" DAN mission meminta "explain + why it matters" → PILIH thread (lebih natural untuk edukasi)

   CAMPAIGN REQUEST PROFILE (v9.9):
   ═══════════════════════════════════════
   Format chosen: [single / thread of N posts]
   Reason: "[why this format — e.g., 'Mission asks to explain mechanics AND argue why it matters = 2 distinct topics = thread is more natural']"
   Content focus areas:
     - [focus 1 from parsed_rules_constraints]
     - [focus 2 from parsed_rules_constraints]
   EXPLANATORY REQUIREMENTS (v11.5):
     - "[requirement]" → type: EXPLAIN → must include definition/explanation
     - "[requirement]" → type: ARGUE → must include analysis/perspective
     - "[requirement]" → type: MENTION → must appear in content
   Mandatory elements to include:
     - [mentions, hashtags, features, links from parsed constraints]
   Tone: [from C1 tone keywords + style field]
   Thread structure (if thread):
     - Tweet 1: [hook + what this is about]
     - Tweet 2: [main content / mechanics / argument]
     - Tweet 3: [why it matters / closing + engagement bait]
   Per-post target length: [N chars / "free" / "natural (300-1000)"]
   ═══════════════════════════════════════

═══ ANALYSIS SUMMARY ═══
Core message: "[dari #1]"
Top value prop: "[dari #2]"
Must-include fact #1: "[dari #3]"
Style energy: [dari #4]
Unique angle: "[dari #5]"
Hardest category to max: [dari #6]
Easiest category to max: [dari #6]
Mission directive: "[dari #7]"
**Format chosen: "[dari #9] — v9.9"**
**Content focus: "[dari #9] — v9.9"**
Tone requirement: "[dari #7]"
Reference tweet strategy: "[dari #8 — jika ada]"
```

**⚠️ RULES untuk Step 4.5:**

1. **WAJIB menjawab SEMUA 9 pertanyaan** — tidak boleh skip
2. **Hasil analisa HARUS digunakan di Step 5 dan Step 6** — Step 5b pre-writing perspective harus mempertimbangkan hasil analisa ini, Step 6 variasi konten harus berdasarkan strategi dari analisa ini
3. **Cross-reference WAJIB** — setiap klaim di analisa harus punya sumber dari data yang sudah dikumpulkan (KB, website, reference tweets, competitive analysis, calibration)
4. **JANGAN mengarang** — jika data tidak cukup untuk menjawab suatu pertanyaan, tulis "Data tidak cukup untuk menentukan [X]. Akan menggunakan default strategy."
5. **Style energy level dari analisa ini OVERRIDES style energy di Step 5b** — jika Step 4.5 menentukan HIGH tapi Step 5b sebelumnya menentukan MEDIUM, gunakan HIGH

**Output:** ⚠️ v9.8: ANALYSIS SUMMARY HARUS ditampilkan ke user sebagai PROOF. Format:
```
═══ PROOF: Step 4.5 Deep Analysis ═══
Core Message: "[1 kalimat]"
Top 3 Value Props: "[a] / [b] / [c]"
Must-Include Facts: "[#1], [#2], [#3]"
Style Energy: [HIGH/MEDIUM/LOW]
Mission Directive: "[verb + subject]"
Unique Angle (from competitive gap): "[angle]"
Hardest Category: "[category + reason]"
**Format Chosen: "[single / thread of N posts] — from #9 (v9.9)"**
**Content Focus: "[focus areas from #9] — v9.9"**
═══
```
LANJUT ke Step 5 setelah proof ditampilkan. User TIDAK perlu konfirmasi — proof cukup sebagai bukti.

---

### STEP 5: Pre-Writing Preparation (MUST do before writing)

**⏱ Estimated time: 15-30 seconds** (internal processing — no external calls)

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `5` to `completed_steps`.

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

**5b. Pre-Writing Perspective (answer these 8 items internally):**

**⚠️ v9.8 ANTI-SHORTCUT: Step ini HARUS menampilkan PROOF SUMMARY.**
Untuk menghemat context window, Step 5b TIDAK menampilkan FULL template ke user, TAPI HARUS menampilkan ringkasan bukti bahwa 8 item benar-benar dijawab.

**Cara eksekusi:**
1. Baca semua input (Step 4.5 analysis, Deep Analysis, competitive intel, KB, website content)
2. Jawab 8 item di bawah ini SECARA MENTAL (di AI "thinking", bukan di output)
3. Simpan hasilnya ke checkpoint
4. **TAMPILKAN PROOF SUMMARY** ke user (format di bawah)
5. Langsung lanjut ke Step 5.5 atau Step 5.6

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

3. ⚠️ MISSION DIRECTIVE CHECK (from Step 4.5 #7):
   What is the campaign creator ASKING me to do?
   - If directive = "celebrate/hype/launch" → SKEPTICISM DIMINISHED, focus on excitement
   - If directive = "discuss/review" → SKEPTICISM MAINTAINED, balanced view
   - If directive = "spread awareness" → FOCUS ON CLARITY + REACH
   - Mission directive: "[from Step 4.5 #7]"
   → This OVERRIDES the default "always include counter-point" assumption

4. REFERENCE TWEET CONTEXT (from Step 4.5 #8 — if available):
   What angle/fact from the reference tweet can I build on?
   - [reference tweet key point 1]
   - [reference tweet key point 2]
   → If contentType = "reply", this is the PRIMARY angle

5. SPECIFIC AUDIENCE: Who exactly are you talking to?
   Not "crypto people" but a specific person with specific concerns.
   → Gunakan category strategy dari Step 4.5 #6

6. COUNTER-NARRATIVE: What does everyone get WRONG about this topic?
   What's the unpopular take?
   → Gunakan overused angles dari Step 4.5 #5 sebagai referensi apa yang sudah terlalu sering dibahas

7. SPECIFIC MOMENT: What's ONE specific detail, number, or moment
   from the Knowledge Base that made this real for you?
   → Gunakan must-include facts dari Step 4.5 #3

8. ⚡ STYLE ENERGY LEVEL: Seberapa keras/energik konten ini harusnya terasa?
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

**⚠️ v9.8 PROOF OUTPUT (HARUS ditampilkan ke user):**
```
═══ PROOF: Step 5 Pre-Writing Perspective ═══
My Reaction: "[1 kalimat genuine reaction]"
Counter-Narrative: "[1 kalimat unpopular take]"
Specific Moment: "[1 detail spesifik dari KB/website]"
Audience: "[siapa spesifik yang kamu ajak bicara]"
Style Energy: [HIGH/MEDIUM/LOW] ← dari Step 4.5 #4
Mission Directive: "[dari Step 4.5 #7]"
═══
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

> 📖 **REFERENCE ARCHITECTURE:** Section ini berisi teknik-teknik battle-tested untuk max setiap kategori. AI HARUS membaca ini SEBELUM Step 6 (content generation). Tapi saat feedback loop #2+, AI BOLEH skip detail dan hanya fokus pada kategori yang perlu perbaikan (dari judge feedback).

These techniques are **battle-tested** from real pipeline runs that achieved 17.5/18 (97.2%, Top 1%). Use them during content generation.

**REPLY-WORTHINESS (within Engagement 5/5) -- PROVEN TECHNIQUE:**
Reply-worthiness is the hardest part of Engagement to max. Most submissions either ask rhetorical questions (author answers it) or end with a generic "what do you think?". To earn Engagement 5/5:

1. **"I can't figure out" framing**: Explicitly state something you CANNOT figure out. Example: "I can't figure out what happens when validators disagree on a subjective outcome." This shows genuine depth, not surface-level engagement.
2. **Multiple genuine open questions**: End with 2-3 questions that have NO obvious answer. They should be questions the author genuinely doesn't know the answer to.
3. **Self-doubt closing paragraph**: Add a closing sentence that shows vulnerability. Example: "I say that as someone who actually wants this to work, so don't take this the wrong way." This prevents the content from reading like a shill post.
4. **DO NOT answer your own questions**: The #1 reply-worthiness killer is posing a question and then immediately answering it (rhetorical). If you ask "will this work?", STOP. Do not add "I think it will because..."
5. **Specific audience targeting**: Address your question to a specific audience — "if anyone who's actually run ve positions has a take" > "what do you think?" — specificity = engagement

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
5. **Explicit CTA (v10.0 — PROVEN from Rally feedback):**
   Rally menilai Engagement 4/5 jika tidak ada explicit CTA. Tambahkan:
   - Specific ask: "if anyone's actually run ve positions on aerodrome, drop your take" > "what do you think?"
   - Challenge: "prove me wrong" atau "tell me I'm overthinking this"
   - Resource direction: "link in bio" atau "docs are public"
   - Direct question ke specific audience: "does anyone who actually ran ve positions have a take?"
   - ⚠️ Generic "what do you think?" = weak CTA. Specific audience question = strong CTA.

**TECHNICAL QUALITY (target: 5/5) -- PROVEN TECHNIQUE:**
1. **Natural flow > perfect grammar**: Real tweets have run-on sentences, fragments, casual connectors. Don't over-correct.
2. **Single post rhythm**: Even without character limits, the content should READ like a single post, not an essay. 1-3 paragraphs.
3. **Sanitization must be perfect**: No em-dashes, no double-hyphens, no smart quotes. These are easy catches that tank Technical Quality.

6. **Visual rhythm (v10.0 — PROVEN from Rally feedback):**
   Rally explicitly kurangi Engagement score jika konten "quite dense" dan "may lose less technical readers". Fix:
   - Use short paragraphs (2-3 sentences max per paragraph)
   - Add line breaks between distinct ideas
   - Mix sentence lengths within paragraphs (short punchy + longer explanatory)
   - If content is technical, consider using 1-sentence "breather" paragraphs between dense sections
   - Example pattern: short hook → 2-3 sentence explanation → short punchy statement → 2-3 sentence detail → question

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
- ❌ "key takeaways", "let's dive in", "here's the thing", "picture this", "at the end of the day", "in conclusion", "hot take", "unpopular opinion", "thread alert", "breaking", "this is your sign", "psa", "reminder that", "drop everything", "stop scrolling", "hear me out", "imagine a world where"
- ⚠️ v11.0: "nobody is talking about" adalah Originality penalty rule (bukan gate fail). Variasi seperti "almost nobody is talking about" atau "I haven't seen anyone talking about" ALLOWED — Rally memberi 2/2 Originality pada konten yang menggunakan variasi ini.
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

**REPLY-WORTHINESS 5/5 — DISCUSSION DEPTH FORMULA (v9.4 UPGRADE, merged into Engagement v11.0):**

**MASALAH FUNDAMENTAL:** Hanya 38% top content mencapai Engagement 5/5. Ini dimensi PALING sulit karena membutuhkan hook yang kuat DAN ending yang reply-worthy. Pendekatan lama (3-Layer Question Stack terpisah) sering terlalu panjang dan formal.

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
- ❌ Rhetorical question lalu jawab sendiri — reply-worthiness killer #1
- ❌ "Am I the only one who..." — template phrase
- ❌ "Anyone?" / "Curious?" — terlalu ringkas, tidak menunjukkan genuine interest
- ✅ "can someone who actually built on this tell me if [specific concern]?" — specific, genuine
- ✅ "genuinely asking: does [specific thing] actually work in practice or is it just theory?" — shows real curiosity
- ✅ "ok but real talk: [specific concern]. is that just me or..." — casual, genuine uncertainty

---

### STEP 5.7: Content Quality DNA (v9.4 — WAJIB sebelum Step 6)

**⚠️ v9.8 ANTI-SHORTCUT: Step ini HARUS menampilkan PROOF SUMMARY.**
Untuk menghemat context window, Step 5.7 TIDAK menampilkan FULL DNA template ke user, TAPI HARUS menampilkan proof bahwa DNA benar-benar dibuat.

**Cara eksekusi:**
1. Jawab 5.7a-5.7d SECARA MENTAL (di AI "thinking", bukan di output)
2. Simpan hasil DNA ke checkpoint
3. **TAMPILKAN PROOF SUMMARY** ke user (format di bawah)
4. Gunakan DNA saat menulis konten di Step 6
5. Langsung lanjut ke Step 6

**⏱ Estimated time: 15-20 seconds** (internal processing — no external calls)

**TUJUAN:** Mengatasi "Over-Constraint Paralysis" dan "Template Paradox" dengan memberikan AI sebuah "emotional anchor" dan "writing DNA" SEBELUM mulai menulis. Ini adalah JEMBATAN antara data (Steps 1-5) dan kreativitas (Step 6).

**MASALAH YANG DI-SOLVE:**
- AI punya terlalu banyak checklist dan formula → jadi paranoid → konten kaku
- Hook formula (Contrast/Discovery/Question) = template → kontradiksi dengan Originality
- Pre-writing terlalu analitis → konten terasa seperti laporan, bukan tweet

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `5.7` to `completed_steps`, save DNA to `data.content_dna`.

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

**⚠️ v9.8 PROOF OUTPUT (HARUS ditampilkan ke user):**
```
═══ PROOF: Step 5.7 Content DNA ═══
Emotional Anchor: "[1 kata emosi]"
Writing Character: "[1 kalimat siapa karakternya]"
First Thought: "[isi first thought — persis seperti di atas]"
DNA Summary: "[1 baris summary]"
═══
```

**⚠️ RULES untuk Step 5.7:**
1. **WAJIB diisi** — tidak boleh skip
2. **Hasilnya HARUS mempengaruhi Step 6** — setiap variasi harus memancarkan DNA ini
3. **First thought TIDAK HARUS jadi hook** — tapi jika natural, itu hook terbaik yang pernah ada
4. **Jika AI merasa "DNA ini tidak cocok"** → itu tandanya AI masih berpikir template. DNA TIDAK punya cocok atau tidak cocok. DNA adalah fondasi, bukan template.

**🧠 v11.2 GENUINE VOICE ACTIVATION TECHNIQUE (How to ACTUALLY Write Like a Human):**

**PROBLEM:** Step 5.7 says "write like human" but doesn't teach HOW. AI ends up performing humanness instead of accessing genuine voice. This technique solves that.

**METHOD — 3 Steps Before Writing Each Free Write Variation:**

**Step A: Sensory-First Entry**
Instead of starting from a concept ("veDEX model"), start from a PHYSICAL STATE or OBSERVATION:
- ❌ BAD START: "The ve(3,3) model is interesting because..."
- ✅ GOOD START: "ok so I'm sitting here going through the MarbMarket docs at 2am and this thing about locking MARB tokens just clicks differently when you've actually seen what happened to Aerodrome..."
- ❌ BAD START: "MegaETH enables real-time transactions..."
- ✅ GOOD START: "was on the MegaETH testnet last week and honestly the speed thing sounds like marketing until you actually try to frontrun a trade and realize you can't..."

**Step B: Present-Tense Framing**
Write from the moment of discovery, NOT from hindsight analysis:
- ❌ BAD: "MarbMarket launched on MegaETH and it changes DeFi." (reporter voice)
- ✅ GOOD: "I keep going back to this one thing about MarbMarket." (discovery voice)
- ❌ BAD: "The ve model has proven effective on other chains." (authority voice)  
- ✅ GOOD: "still not sure if I fully buy the ve tokenomics but..." (uncertainty voice)

**Step C: One Specific Detail**
Before writing, pick ONE concrete detail from KB/website that you personally "noticed":
- "the 1 week to 6 month lock range" — noticed this specifically
- "they're building on MegaETH which does instant finality" — this caught attention
- "the bribe market mechanic" — this is the part that's interesting
Then write from that detail outward, not from the general concept inward.

**RULE:** Apply Steps A+B+C to EACH Free Write variation. The variation will feel genuinely human because it starts from lived experience framing, not from information architecture.

**⚠️ WHY THIS WORKS:** Humans don't write by organizing information into categories. They write by starting from something that caught their attention and expanding outward. Sensory-first + present-tense + specific detail = the AI stops performing and starts approximating genuine thought flow.

---

### STEP 5.8: Compliance Blueprint — Exact Phrase Lock (v11.7 — CRITICAL Rally Fix)

**⚠️ WHY THIS STEP EXISTS:**
Real Rally feedback showed Campaign Compliance 0/2 when:
1. Content said "zero VC backing" but Rally checker expected exact phrase "no VC backing" → MISMATCH
2. Content was 1701 chars, classified as "longform" → FORMAT VIOLATION (hidden threshold)
3. Content Alignment judge (2/2) said requirement met, but Compliance judge (0/2) said NOT met → DIFFERENT MATCHING METHODS

**ROOT CAUSE:** Rally's compliance checker uses EXACT STRING MATCHING for mandatory requirements. The skill was paraphrasing requirements (which is good for Alignment) but failing Compliance (which checks for exact phrases).

**⏱ Estimated time: 10-15 seconds** (internal processing — no external calls)

**After this step completes:** Update checkpoint: add `5.8` to `completed_steps`.

```
═══ STEP 5.8: COMPLIANCE BLUEPRINT ═══

THIS IS THE COMPLIANCE BLUEPRINT — AI MUST FOLLOW THIS BLUEPRINT EXACTLY WHEN WRITING CONTENT IN STEP 6.

PHASE 1: EXACT PHRASE EXTRACTION

Scan rules + description + requirements + additionalInfo for MANDATORY REQUIREMENTS.
For EACH requirement, extract the EXACT PHRASE that must appear verbatim in content.

HOW TO IDENTIFY EXACT PHRASES:
1. Look for "must mention [X]" → X is the exact phrase
2. Look for "include [X]" → X is the exact phrase
3. Look for "mention [X] and [Y]" → BOTH X and Y must appear VERBATIM
4. Look for "no [X]" or "zero [X]" → use the EXACT phrase from rules, NOT a paraphrase
5. Look for "reference [X]" → X is the exact phrase
6. Look for BONUS requirements labeled as "bonus" → extract exact phrase, treat as MANDATORY

⚠️ CRITICAL RULE: When the rules say "mention no presale and no VC backing":
- ✅ CORRECT: "...no presale... and ...no VC backing..." (EXACT phrases from rules)
- ❌ WRONG: "...zero presale... and ...zero VC backing..." (PARAPHRASED — compliance checker may not match)
- ❌ WRONG: "...without a presale... and ...without VC backing..." (PARAPHRASED)
- ⚠️ WHY: Rally's programmatic compliance checker searches for specific strings. Paraphrases
  that are semantically identical may NOT match the checker's expected strings.

EXACT PHRASES TO INCLUDE (extracted from rules/description/requirements):
─────────────────────────────────────────────────────────────────────────
  #1: "[exact phrase from rules]" → source: [rules/description/requirements line]
  #2: "[exact phrase from rules]" → source: [rules/description/requirements line]
  #3: "[exact phrase from rules]" → source: [rules/description/requirements line]
  ...
  ⚠️ BONUS phrases (from "bonus" label in rules — MANDATORY for Compliance):
  #B1: "[exact bonus phrase]" → type: [EXPLAIN/MENTION/ARGUE/OPINION] → modifier: [if any]
─────────────────────────────────────────────────────────────────────────

PHASE 2: HIDDEN CHARACTER LIMIT DEFENSE

⚠️ RALLY HAS HIDDEN FORMAT THRESHOLDS NOT EXPOSED VIA API.
Real Rally feedback: 1701-char single post was classified as "longform" and FLAGGED as format violated.
The campaign rules said "single post or short 2-3 post thread" and characterLimit field was NULL.
Yet Rally's compliance checker still flagged it.

RULE: Apply the following safe thresholds REGARDLESS of what API fields say:

  FORMAT SAFE THRESHOLDS:
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ Format         │ Safe Per-Post Char Limit │ Action if Exceeded          │
  ├──────────────────────────────────────────────────────────────────────────┤
  │ single post    │ 1,200 chars MAX           │ SPLIT to thread OR trim     │
  │ short thread   │ 900 chars per post AVG    │ Redistribute content       │
  │ thread         │ 900 chars per post AVG    │ Redistribute content       │
  └──────────────────────────────────────────────────────────────────────────┘

  ⚠️ WHY 1,200 chars for single post?
  - Rally classified 1,701 chars as "longform" → format violated
  - 1,200 chars = safe floor (well below the hidden threshold)
  - If mission allows thread AND content > 1,000 chars → PREFER thread over single
  - If mission ONLY allows single → TRIM content to fit within 1,200 chars

  ESTIMATED CONTENT SIZE CHECK:
  - Count content focus areas from Step 1d-v B1
  - Count mandatory inclusions from Step 1d-v A5
  - If 2+ focus areas AND 2+ mandatory includes → estimated content > 1,200 chars → PREFER thread
  - If 1 focus area AND 1-2 mandatory includes → likely fits in single post

  FORMAT DECISION OVERRIDE (overrides Step 4.5 #9 if conflict):
  - If Step 4.5 chose "single" BUT estimated content > 1,000 chars AND mission allows thread
    → OVERRIDE: Switch to thread (2-3 posts)
  - If Step 4.5 chose "single" AND mission ONLY allows single
    → ENFORCE: Trim to 1,200 chars max
  - If Step 4.5 chose "thread"
    → KEEP: Thread format (distribute content across posts)

PHASE 3: MANDATORY INCLUDES LOCK

MANDATORY ITEMS (from Step 1d-v A5/B3/B4 — must appear in content):
─────────────────────────────────────────────────────────────────────────
  Links: [exact URL from rules]
  Mentions: [exact @handle from rules]
  Hashtags: [exact #hashtag from rules]
  Features: [exact feature phrase from rules]
─────────────────────────────────────────────────────────────────────────

PHASE 4: PROHIBITED ITEMS LOCK

PROHIBITED (must NOT appear in content — from Step 1d-v A6 + prohibitedItems):
─────────────────────────────────────────────────────────────────────────
  [list ALL prohibited items from rules text + API field]
─────────────────────────────────────────────────────────────────────────

═══ COMPLIANCE BLUEPRINT SUMMARY ═══
Format: [single / thread of N posts] (may override Step 4.5 #9 if content > 1,000 chars)
Max chars per post: 1,200 (safe threshold — hidden Rally limit defense)
Exact phrases to include (VERBATIM): [N phrases]
Bonus requirements (MANDATORY): [N items]
Mandatory includes: [links, mentions, hashtags, features]
Prohibited: [N items]
═══
```

**⚠️ v11.7 PROOF OUTPUT:**
```
═══ PROOF: Step 5.8 Compliance Blueprint ═══
Exact Phrases: [N] extracted — "[phrase1]", "[phrase2]", ...
Format Decision: [single/thread] — [reason, including estimated content size]
Char Safety: [1,200 max per post — hidden limit defense]
Bonus Requirements: [N] items — all MANDATORY
Mandatory Includes: [links, mentions, hashtags]
Overrides: [YES/NO — if Step 4.5 #9 format was overridden, explain why]
═══
```

**⚠️ RULES for Step 5.8:**
1. This step MUST be completed BEFORE Step 6 (content generation)
2. The Compliance Blueprint MUST be passed to Step 6 — content MUST include every exact phrase verbatim
3. If estimated content > 1,000 chars AND mission allows thread → OVERRIDE format to thread
4. This blueprint is the SOURCE OF TRUTH for Step 6.5 HARD FORMAT GATE verification
5. If ANY exact phrase from Phase 1 is NOT found in content at Step 6.5 → HARD FORMAT GATE FAIL

---

### STEP 6: Generate 3 Content Variations

**⚡ PHASE SEPARATION (v11.5 — CRITICAL):**
STEP 6 is the WRITING PHASE. During this step, focus ONLY on:
1. Genuine Voice Activation (from Step 5.7 DNA)
2. Campaign alignment (topic + tone + directive + style)
3. Content focus areas (all must be addressed)
4. Anti-fabrication (only use verified facts)
5. Personal anecdote (at least 1 per variation)
6. Reply-worthy ending (specific question/challenge)
7. ⚠️ BONUS requirements (v11.6 — ALL "bonus" criteria are MANDATORY — must be addressed in content.
   This includes creative/visual explanations, model breakdowns, comparisons, or any other
   requirement labeled as "bonus" in campaign rules. Missing bonus = Compliance FAIL.)
8. ⚠️ COMPLIANCE BLUEPRINT (v11.7 — CRITICAL): Follow Step 5.8 Compliance Blueprint EXACTLY.
   Every EXACT PHRASE from Phase 1 must appear VERBATIM in content (no paraphrasing mandatory requirements).
   Hidden char limit from Phase 2 must be respected (1,200 max single post, 900 avg thread posts).
   Format decision from Phase 2 must be followed (including overrides).
   If Compliance Blueprint is not available → HALT AND ASK (Step 5.8 was skipped).

DO NOT think about: dashes, quotes, AI word lists, paragraph CV, word count, banned phrases.
ALL mechanical checks are delegated to Step 6.5 + Step 7 (All-In-One Verification Script).

**⏱ Estimated time: 30-60 seconds**

**🧠 AI CAPABILITIES — WAJIB AKTIF saat menulis konten:**
- **Think mode: ON** — AI harus berpikir mendalam sebelum menulis setiap variasi. Pertimbangkan: apakah hook ini unik? apakah ada AI fingerprint? apakah semua fakta dari KB + website? apakah counter-point sudah ada? apakah style energy level cocok?
- **Web Search: ON** — AI boleh mencari info tambahan untuk memperkaya konteks (berita terbaru, tren, dll). TAPI hasil pencarian TIDAK menggantikan KB sebagai sumber fakta. Aturan anti-fabrication tetap berlaku: jika suatu klaim TIDAK ada di KB, gunakan bahasa vagu ("growing fast", "quite a few") meskipun web search menemukan angka spesifik.
- **Kenapa:** Think mode memastikan AI menulis dengan kesadaran penuh (bukan autopilot). Web search memastikan AI punya konteks terkini tentang campaign/project.

After you FULLY understand the campaign, calibration data, competitive intel, pre-writing perspective, write 3 X/Twitter posts. Each with a different angle:

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `6` to `completed_steps`, save variations to `data.variations`.

**⚠️ CONTEXT CRITICAL:** Step 6 menghasilkan output yang relatif besar (3 variasi). Pastikan checkpoint sudah tersimpan sampai step 5 SEBELUM mulai step 6.

**⚠️ TYPING RULE (simplified — mechanical checks in Step 7):**
Tulis secara natural. Jangan khawatir tentang dashes, quotes, atau formatting saat menulis.
Semua sanitasi dilakukan secara programmatik di Step 7 (All-In-One Verification Script).
Satu-satunya yang perlu diingat: tulis dari perspektif personal, bukan AI marketing.

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
- USE: specific facts from KB AND website as weapons (short triads)
- AVOID: ALL overused phrases from competitive analysis
- Structure: Bold opener → 1-2 punchy evidence lines → drop-the-mic closer
- When to use: Style energy HIGH, or campaign style suggests "banger/bold/hype"

**Variation: 🎯 GAP (COMPETITIVE DIFFERENTIATION):**
- Focus: the angle NOBODY else is using — the gap from Step 3 competitive analysis
- Tone: curious discovery — "I noticed something nobody's talking about"
- Hook formula: gap angle → "everyone's focused on [overused topic] but here's what actually matters..."
- USE: the competitive gap angle from Step 3 (e.g., "validator disagreement", "Python not Solidity")
- INCLUDE: facts from website/links that support this unique angle
- AVOID: ALL overused phrases identified in Step 3
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
- USE: specific facts from KB as celebration anchors (specific feature, specific milestone)
- MATCH: mission directive from Step 4.5 #7 (celebrate, announce, hype)
- AVOID: skepticism, doubt, "but", "however", "concerns", "risks" — CELEBRATION MODE has NO counter-point
- SOUND: like a real person who's genuinely pumped, not a marketing bot
- Structure: Hype opener → specific achievement/fact → genuine excitement → "can't wait to see what's next" closer
- Human touch: self-correction works here too ("actually nvm this is actually huge"), uncertainty about the future ("where does this go from here tho"), stream of consciousness excitement
- When to use: ONLY when Step 4.5 #7 identifies mission directive as celebrate/hype/launch
- When NOT to use: if mission is "discuss", "review", "critique", or any analytical directive

**Variation: 🧬 FREE WRITE (v11.0 — ORGANIC, NOT TEMPLATED):**
- **TUJUAN:** Menghasilkan konten yang terasa seperti tweet spontan dari orang asli.
- **CARA:** Mulai dari Content DNA (Step 5.7) — emotional anchor + character + first thought. Tulis seperti kamu lagi ngetweet, bukan seperti AI yang lagi generate konten.
- **NO formula.** Tidak ada hook pattern, tidak ada structure requirement, tidak ada "Hook → Body → Ending". Tulis SAMPAI SELESAI.
- **NO checklist.** Jangan cek "sudah ada personal anecdote belum?" atau "sudah ada question belum?" — kalau kontennya genuine, itu akan muncul natural.
- **Tone:** 100% dari karakter di Step 5.7b. Kalau karakternya "dev yang surprised", tulis seperti dev yang surprised.
- **Length:** Natural. Bisa 2 kalimat, bisa 5 paragraf. Biarkan kontennya menentukan.
- **UNTUK 2 VARIASI (A dan B):** Free Write A dan B HARUS terasa seperti orang BERBEDA. Beda opening energy, beda angle, beda focus. Tapi keduanya harus tetap on-topic (membahas campaign).
- **Kapan FREE WRITE GAGAL:** Terlalu pendek (< 50 chars), tidak membahas campaign sama sekali, atau pure shilling tanpa substance. Dalam kasus ini, expand dengan detail dari KB tapi TETAP tanpa formula.
- **Rule:** Free Write A dan B WAJIB selalu ada di SETIAP generasi. Ini bukan opsional.

**⚠️ v11.2 RANDOMIZED VARIATION SELECTION (Anti-Meta-Pattern):**

**RULE:** Setiap run, AI HARUS randomly memilih variasi mix. JANGAN selalu gunakan pola yang sama.

**RANDOMIZATION METHOD:**
Sebelum Step 6, AI melakukan "coin flip" internal:
- 60% chance: 2 Free Write + 1 Targeted (v11.1 default)
- 30% chance: 3 Free Write + 0 Targeted (maximum organic — highest originality ceiling)
- 10% chance: 1 Free Write + 2 Targeted (if Free Write quality was low in previous run)

**Targeted variation dipilih berdasarkan style energy + directive:**

| Style Energy | Directive | Targeted Options (if chosen) |
|---|---|---|
| HIGH | celebrate | 🎉 Celebration |
| HIGH | discuss/review | ⚡ Banger |
| MEDIUM | celebrate | 🎯 Gap |
| MEDIUM | discuss/review | ❓ Question |
| LOW | any | 📊 Factual |

**⚠️ RANDOMIZED MEANING:**
- Free Write A dan B (atau C) HARUS tetap terasa seperti orang BERBEDA
- Tapi JANGAN tulis "Free Write A menggunakan angle X, Free Write B menggunakan angle Y" di output — ini meta-instruction yang membuat AI perform diversity
- Sebagai gantinya, gunakan Content DNA dengan emotional anchor BERBEDA untuk setiap Free Write

**⚠️ v11.2 ANTI-META-PATTERN RULE:**
JANGAN pernah menampilkan tabel variasi yang selalu sama di setiap run. Jika user melihat pola "oh, selalu 2 Free Write + 1 Banger" → pattern terdeteksi → konten terasa formulaic.
Dengan randomisasi, setiap run menghasilkan komposisi yang berbeda.

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
   - **v11.1 ANTI-FABRICATION ENFORCEMENT:**
     - KLAIM tentang protocol/project lain (misal: "PancakeSwap dropped VE", "Balancer walked away") HARUS ada di KB atau web research. Jika TIDAK → FABRICATION → Accuracy 0/2.
     - KLAIM tentang fitur yang belum launch ("bribes could reprice live", "real-time bribe markets") HARUS menggunakan hedging language: "could", "might", "I wonder if", "potentially". Jika disajikan sebagai fakta → SPECULATION AS FACT → Accuracy penalty.
     - KLAIM perbandingan angka spesifik ("under a millisecond", "10x more efficient") HARUS ada sumbernya. Jika hanya marketing claim → tambah konteks: "they claim" atau "if true".
     - NAMA PROTOCOL YANG DISEBUT HARUS AKURAT. Jangan menyebut protocol X sebagai "veDEX" jika X bukan veDEX (contoh: Pendle = yield trading, BUKAN veDEX). Fabricating protocol attribution = Accuracy 0/2 + Compliance 0/2.
     - **WHITE CHECKLIST (boleh disebut tanpa sumber):** Hanya fakta dari KB campaign, fakta dari website resmi yang berhasil di-baca di Step 1d, dan fakta umum yang widely known (misal: Aerodrome di Optimism).
   - **v11.2 RESEARCH CROSS-VALIDATION:**
     - KLAIM tentang protocol/project EKSTERNAL (bukan campaign ini) HARUS melewati cross-validation:
       1. Apakah klaim ada di KB campaign? → BOLEH digunakan
       2. Apakah klaim ada di website resmi yang dibaca Step 1d? → BOLEH digunakan
       3. Apakah klaim muncul di 2+ hasil web search yang independen? → BOLEH digunakan
       4. Jika hanya muncul di 1 sumber → HEDGING WAJIB: "I saw somewhere that...", "apparently...", "not sure if true but..."
       5. Jika TIDAK muncul di sumber manapun → JANGAN SEBUT. Period.
     - Contoh ERROR v11.1: "PancakeSwap dropped VE" — hanya muncul di 1 web search snippet, tidak di KB, tidak di website → FABRICATION
     - Contoh ERROR v11.1: "Pendle is a veDEX" — web search salah mengklasifikasi, tidak ada di 2+ sumber → FABRICATION
     - **RULE:** Jika ragu, HEDGING > SILENCE > FABRICATION. "I think Pendle does something similar but I'm not sure exactly what" > silence > "Pendle is a veDEX"
     - **ALL 3 VARIATIONS inherit the same cross-validated fact base.** Jika 1 sumber salah → SEMUA variasi salah. Karena itu, cross-validation di level SEBELUM writing, bukan per-variasi.
5. **Follow the `style` field**: If campaign says "casual", write casual. If "banger", write with HIGH ENERGY (apply Banger Style techniques from Step 5.6). Match style energy level from Step 5b.
6. **Respect `contentType` AND parsed campaign request constraints (v9.9 — CRITICAL):**
   - **FIRST**: Cek parsed_rules_constraints dari Step 1d-v (COMPREHENSIVE CAMPAIGN REQUEST PARSER) — ini OVERRIDES contentType field
   - **⚠️ v9.9 FORMAT DECISION**: Gunakan format chosen dari Step 4.5 #9 (CAMPAIGN REQUEST PROFILE)
     * Jika format chosen = "thread of N posts" → SEMUA 3 variasi HARUS ditulis sebagai thread
     * Jika format chosen = "single" → SEMUA 3 variasi HARUS ditulis sebagai single tweet
     * JANGAN pernah mix: variasi A single, variasi B thread — semua harus format SAMA
   - **⚠️ v9.9 CRITICAL — THREAD WRITING GUIDELINES (WAJIB baca jika format = thread):**
     * Setiap tweet dalam thread HARUS bisa berdiri sendiri sebagai tweet yang masuk akal
     * Tweet 1 = HOOK: bold statement, question, atau discovery yang memaksa reader baca tweet 2
     * Tweet 2-N = BODY: content focus areas dari Step 1d-v B1 harus di-address di sini
     * Tweet terakhir = CLOSE: engagement bait (question, challenge, atau uncertainty)
     * Setiap tweet harus concise dan readable. Jika campaign specify per-post char limit → ikuti. Jika TIDAK → tulis natural (300-1000 chars per post common untuk X Premium users). JANGAN default ke 280.
     * JANGAN tulis "1/" "2/" "3/" numbering — itu format lama, X sekarang otomatis thread
     * Pisahkan setiap tweet dengan "\n\n" dan label "─── Tweet N ───" di draft (hapus label saat output)
     * Thread harus terasa connected: setiap tweet mengalir ke berikutnya, bukan random paragraf
   - **⚠️ v9.9 CRITICAL — CONTENT FOCUS ENFORCEMENT:**
     * Cek content_focus dari Step 1d-v B1 — SETIAP focus area HARUS di-address di konten
     * Jika content_focus = ["explain: veDEX model", "argue: why MarbMarket matters"]
       → Thread: Tweet 1-2 menjelaskan veDEX, Tweet 3+ argumen kenapa penting
       → Single: Gabungkan keduanya tapi pastikan KEDUA topik ter-cover
     * Jika konten TIDAK address SEMUA content_focus → Content Alignment FAIL
   - If parsed rules says "single post or thread of 2 to 4 posts max" → format_allowed = ["single", "thread"], max_posts = 4
   - If parsed rules says "single post only" → format_allowed = ["single"] ONLY — thread TIDAK BOLEH dibuat
   - If NO parsed rules → fallback ke contentType field:
     * If "tweet": write as standalone tweet (no @mention prefix)
     * If "reply": write as a reply to the reference tweet from campaign rules
       - Start with a brief acknowledgment of the original tweet's point
       - Add your own perspective (not just agreement)
       - Keep it conversational, like you're responding to a real person
       - DO NOT quote the entire original tweet — just reference its key point
       - Length: usually shorter than a standalone tweet (reply context counts)
     * If "thread": write 2-4 connected tweets, each expanding on the previous (see Step 11 thread format)
   - **⚠️ HARD FORMAT RULE**: If format_allowed includes "thread" AND max_posts is set:
     * Thread MUST have between min_posts and max_posts posts (inclusive)
     * NEVER exceed max_posts — this is an instant DISQUALIFICATION
     * If writing thread, COUNT THE POSTS before finalizing. Every "\n\n" separator = 1 post.
     * If unsure, write fewer posts (always safer to write 3 than risk 5 when max is 4)
7. **Human artifacts** (at least 3 per variation):
   - Lowercase emphasis on a normally-capitalized word (e.g., "bitcoin" instead of "Bitcoin")
   - Run-on sentence (no proper grammar break)
   - Sentence fragment (2-4 words) after longer text
   - Casual connector ("tho", "but wait", "ngomong-ngomong")
   - Self-correction ("eh wait actually...", "nah scratch that")
   - Genuine uncertainty
   - Stream-of-consciousness moment
8. **Personal anecdote (v10.0 — MANDATORY):**
   - SETIAP variasi HARUS punya minimal 1 personal experience, concrete observation, atau "lived moment"
   - Contoh: "I've been going back and forth on whether...", "was reading the docs last night and...", "watching two AI agents fail to settle a trade last month made me realize..."
   - KENAPA: Rally secara spesifik memuji personal anecdote sebagai factor originality dan authenticity
   - JANGAN gunakan fake/persona anecdote — gunakan framing yang genuine: "ok so I've been thinking about..." atau "here's what I can't figure out"
9. **Format defaults** (v9.7 — overridden by parsed_rules_constraints):
   - If NO parsed rules AND NO contentType → default: single post, 1-3 paragraphs
   - If parsed rules exist → FOLLOW PARSED RULES (format_allowed, max_posts, min_posts)
   - ⚠️ NEVER assume "single post only" if rules text says "single post or thread"
10. **Each variation must sound like a DIFFERENT person wrote it**
11. **Must NOT use ANY prohibited items** from the `prohibitedItems` field
12. **Competitive differentiation**:
    - **⚠️ WAJIB**: Gunakan competitive gap dari Step 3 di minimal 1 variasi (variasi Gap)
    - JANGAN gunakan overused phrases dari competitive analysis
    - Setiap variasi harus punya angle yang BERBEDA dari pesaing
13. **Mandatory inclusions from rules text** (v9.7 — CRITICAL):
    - **⚠️ HARUS cek parsed_rules_constraints.mandatory_includes dari Step 1d-v**
    - Setiap item di mandatory_includes WAJIB ada di konten
    - Contoh: "Include either x.com/Marb_market or t.me/marbmarket" → salah SATU harus ada
    - Contoh: "Mention at least one key feature: vote-escrow, bribes, LP farming, or fair launch" → salah SATU harus disebut
    - Jika konten TIDAK mengandung semua mandatory items → Compliance 0/2 → GATE FAIL

**ANTI-AI RULES (ZERO TOLERANCE):**

**⚠️ v11.5: Rules ini dicek secara PROGRAMMATIS di Step 7. Saat menulis, fokus pada VOICE dan SUBSTANCE, bukan pada checklist ini.**

**⚠️ v11.0 SIMPLIFIED RULE SYSTEM — 20 essential rules that ACTUALLY affect scoring:**

Based on analysis of 155 real submissions and 4 content history entries, most anti-AI rules don't impact actual scores. Only these 20 rules consistently cause gate failures or score penalties. Scan for THESE first.

**GATE FAIL RULES (instant Compliance 0/2 — scan FIRST):**
1. Prohibited items dari campaign API — whatever the campaign says, goes
2. Banned financial words: guaranteed, guarantee, 100%, risk-free, buy now, sell now, get rich, quick money, easy money, passive income, financial advice, investment advice
3. Rally banned phrases: vibe coding, skin in the game, trust layer, agent era, agentic era, structural shift, capital efficiency, how did I miss this, losing my mind, how are we all sleeping on this, don't miss out, frictionless
4. Em-dashes (—), en-dashes (–), double-hyphens (--) used as dash — USE PERIOD INSTEAD
5. Smart/curly quotes — always use straight quotes ("")
6. Numbered lists or bullet points in content

**ORIGINALITY PENALTY RULES (scan SECOND — each violation risks Originality max 1/2):**
7. AI-sounding words (TOP 10 most flagged): delve, leverage, paradigm, tapestry, landscape, nuance, crucial, pivotal, unlock, realm
8. Template hook phrases: unpopular opinion, hot take, thread alert, breaking, nobody is talking about, story time, key takeaways, let's dive in, at the end of the day
9. Banned sentence starters: honestly, like, kind of wild, ngl, tbh, fr fr, lowkey
10. AI pattern phrases: on the other hand, in conclusion, at its core, the reality is, it goes without saying, make no mistake
11. Uniform paragraph lengths (all paragraphs same size = AI fingerprint — v11.1: CV < 0.30 triggers penalty)
    - Hitung Coefficient of Variation (CV) dari paragraph word counts
    - CV < 0.20 = HARD AI FINGERPRINT → Originality max 1/2
    - CV 0.20-0.30 = BORDERLINE → Originality risk
    - CV > 0.30 = HUMAN-LIKE variation → OK
    - FIX: break long paragraphs, merge short ones, add 1-line fragments for variety
12. Generic "what do you think?" ending without specificity

**QUALITY PENALTY RULES (scan THIRD — affects Engagement/Technical):**
13. Unicode ellipsis — use three dots (...) instead
14. Zero-width characters
15. Markdown formatting (bold, italic) in content
16. Max 1 emoji, max 2 hashtags
17. OverExplaining (>300 words without personal voice or specific angle)
    - v11.1: Hitung word count SECARA PROGRAMMATIC via Bash (jangan estimate)
    - Jika > 300 words → cek apakah setiap kalimat menambah value. Jika ada filler → trim.
    - Jika > 400 words → REWRITE lebih pendek, tidak peduli seberapa bagus isinya
18. Starting with background/context instead of hook
19. Generic praise ("amazing project", "incredible") without substance
20. Answering your own question (rhetorical question = no reply-worthiness)

**SCANNING ORDER: Gate Fail → Originality Penalty → Quality Penalty**

**NOTE:** The detailed item lists above REPLACE the old 3-tier system. The old 140+ rules are archived but no longer actively scanned. The 20 rules above are the ONLY rules that cause measurable score impact based on 155 submission calibration data.

**Additional restrictions:**
- No numbered lists or bullet points in content
- Max 1 emoji, max 2 hashtags
- NO em-dashes (--) -- this includes double-hyphen (--) used as em-dash substitute. Period.
- NO en-dashes, NO em-dashes, NO double-hyphens used as dash substitutes
- If you need to separate clauses, use a period, comma, or start a new sentence
- Straight quotes ("") not smart quotes (" ")
- Three dots (...) not Unicode ellipsis
- No zero-width characters
- **CRITICAL for reply-worthiness**: Content MUST end with a genuine open question that invites real discussion. NOT a rhetorical question that the author immediately answers. The question should have no obvious answer so others feel compelled to respond.

**SANITIZATION — v11.1: WAJIB via Bash tool (Python script), BUKAN AI self-check:**

Semua sanitasi DILAKUKAN oleh program Python yang dijalankan via Bash tool di Step 7 (PRE-JUDGE SANITIZATION). AI TIDAK boleh meng-klaim sudah sanitasi tanpa output Bash.

Rules yang DIJALANKAN oleh script:
1. REMOVE all em-dash characters (—, \u2014) → replace with ". "
2. REMOVE all en-dash characters (–, \u2013) → replace with ". "
3. REMOVE all double-hyphens (--) when used as dash substitute → replace with ". "
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

**⚠️ v11.1: Setelah script berjalan, script JUGA melakukan VERIFIKASI ULANG.**
Jika setelah sanitasi masih ada en-dash/em-dash → script exit code 1 → REWRITE dari nol.
Ini memastikan ZERO false negatives — tidak ada dash yang pernah lolos lagi.

**IMPORTANT**: Before writing, re-read the Campaign Brief's rules, prohibited items, requirements, additionalInfo, style, character limit, AND competitive intel. Make sure your content complies with ALL of them and differentiates from competitors.

**ALSO**: Apply the Proven Category-Maxing Techniques from Step 5.6 to each variation. Specifically:
- Every variation should use a personal specific moment opener (Step 5.6 Engagement #1)
- Every variation should end with genuine open question or challenge that the author cannot answer (reply-worthiness within Engagement)
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

**⚠️ v11.5 STEP 6.5 vs STEP 6.7 DIVISION OF LABOR:**
- **Step 6.5** = CONCEPTUAL verification (HARD FORMAT GATE + 6-dimension quality check). AI evaluates mentally whether content meets standards.
- **Step 6.7** = PROGRAMMATIC verification (Bash script: sanitize + CV + AI word scan + word count + integrity + hedging). Script runs AFTER Step 6.5 passes.
- Step 6.5 identifies problems. Step 6.7 confirms no mechanical violations remain.
- JANGAN jalankan Step 6.7 programmatic checks sebagai pengganti Step 6.5 conceptual evaluation.

**⏱ Estimated time: 15-30 seconds** (internal processing — no external calls)

**INI ADALAH GATE TERPENTING. Konten yang TIDAK lulus MAX-OUT verification TIDAK BOLEH dikirim ke judge.**

**TUJUAN**: Pastikan SETIAP variasi punya potensi skor MAKSIMAL di SETIAP dimensi SEBELUM judge menilai. Lebih baik rewrite 1 menit di sini daripada buang 3 menit di feedback loop.

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `6.5` to `completed_steps`.

```
═══ STEP 6.5: MAX-OUT SELF-VERIFICATION ═══

⛔ HARD FORMAT GATE (v9.9 — EXPANDED — CEK PERTAMA SEBELUM LAINNYA):
═════════════════════════════════════════
Cek parsed_rules_constraints dari Step 1d-v DAN format_chosen dari Step 4.5 #9:

[ ] FORMAT COMPLIANCE CHECK (v9.9 NEW):
    - Cek format_chosen dari Step 4.5 #9
    - Jika format_chosen = "thread" → cek SEMUA variasi ditulis sebagai thread
    - Jika format_chosen = "single" → cek SEMUA variasi ditulis sebagai single tweet
    - Jika ada variasi yang formatnya BEDA → ❌ REWRITE variasi tersebut
    - ⚠️ SEMUA 3 variasi HARUS format SAMA

[ ] POST COUNT CHECK:
    - Hitung jumlah "posts" dalam konten (setiap "\n\n" separator = 1 post)
    - Jika format = single → HARUS 1 post saja (0 "\n\n" separator)
    - Jika format = thread → HARUS >= min_posts DAN <= max_posts
    - Jika max_posts = 4 dan konten punya 5 posts → ❌ INSTANT DISQUALIFY → REWRITE

[ ] PER-POST CHARACTER LIMIT CHECK (v9.9 NEW):
    - Jika format = thread → hitung karakter SETIAP post secara terpisah
    - Jika per_post_char_limit specified → cek SETIAP post < limit
    - Jika per_post_char_limit = NONE → cek SETIAP post concise/readable (NO hard limit, tapi jangan melebihi ~2000 chars per post dalam thread)
    - Jika ada post melebihi limit → ❌ TRIM or SPLIT into 2 posts
    - ⚠️ Ini BEDA dengan total char_limit — per-post limit = limit per tweet

[ ] CONTENT FOCUS CHECK (v9.9 NEW):
    - Cek SETIAP item di content_focus dari Step 1d-v B1
    - Contoh: content_focus = ["explain: veDEX model", "argue: why MarbMarket matters"]
    - Cek apakah konten menjelaskan veDEX model → YA/TIDAK
    - Cek apakah konten argumen kenapa MarbMarket matters → YA/TIDAK
    - Jika ADA focus yang TIDAK di-address → ❌ REWRITE — Content Alignment FAIL

[ ] BONUS REQUIREMENT CHECK (v11.6 — CRITICAL Rally fix):
    → Check ALL bonus_requirements from Step 1d-v B9
    → Rally's "bonus" criteria are NOT optional — missing any = Campaign Compliance FAIL
    → For EACH bonus requirement:
      Step 1: Identify the requirement type (EXPLAIN/MENTION/ARGUE/OPINION from B8 classification)
      Step 2: Apply the CORRESPONDING check:
        - If EXPLAIN: verify actual explanation exists (not just mention) — see Explanatory Check below
        - If MENTION: verify the term/concept appears in content
        - If ARGUE: verify analysis/perspective exists on the topic
        - If OPINION: verify personal opinion/experience exists
      Step 3: If modifier like "creatively" or "visually" → verify explanation uses
        analogy, metaphor, step-by-step walkthrough, or visual-language description
        ✅ CREATIVE: "think of it like a flywheel — you lock MARB, it spins up veTokens,
           those veTokens pull in LPs, LPs bring in bribes, bribes attract more lockers"
        ❌ NOT CREATIVE: "the MARB token has a flywheel model"
      Step 4: If ANY bonus requirement not met → ❌ Campaign Compliance FAIL → REWRITE
    → WHY: Real Rally feedback showed Compliance 1/2 when bonus criterion was missed.
      Rally's AI evaluator programmatically checks bonus criteria and flags VIOLATED.
    → This check runs BEFORE regular Explanatory Requirement Check because bonus items
      are the most commonly missed requirements.

[ ] EXPLANATORY REQUIREMENT CHECK (v11.5 — CRITICAL Rally fix):
    → For EACH requirement in rules/mission that uses verbs like "explain", "describe", "define",
      "what is X", "how X works", "creatively explain", "visually explain", "walk through",
      "break down", "show how":
    → Step 1: Find the subject/concept in the content (e.g., "veDEX" found ✅)
    → Step 2: Verify an EXPLANATION exists, not just a mention:
      ✅ EXPLAINED: "A veDEX is a DEX where you lock tokens to vote on which pools get rewards"
      ✅ EXPLAINED: "think of vote-escrow like staking but you get governance power"
      ✅ EXPLAINED: "basically you lock MARB, get veTokens, and those tokens let you direct emissions"
      ❌ MENTIONED ONLY: "veDEX uses vote-escrow, bribes, LP emissions"
      ❌ MENTIONED ONLY: "the ve(3,3) model on MegaETH enables real-time bribe repricing"
    → Step 3: If subject found BUT not explained → ❌ REWRITE — add 1-2 sentence explanation
    → Step 4: If subject NOT found at all → ❌ REWRITE — add explanation
    → This check is based on REAL Rally feedback: programmatic check flags "fails to explain
      what a veDEX is" as VIOLATED even when veDEX mechanics are discussed in detail

[ ] EXTERNAL PROTOCOL CLAIM CHECK (v11.5 — CRITICAL):
    → For EACH claim about EXTERNAL protocol/chain (not the campaign project) that includes
      a SPECIFIC NUMBER (speed, TPS, finality time, block time, TVL, etc.):
    → Step 1: Is the claim in the campaign KB? → ✅ PASS (verified by campaign)
    → Step 2: Is the claim in 2+ independent web sources from Step 1d/3? → ✅ PASS
    → Step 3: Is the claim on the project's OFFICIAL website? → ✅ PASS (with hedging OK)
    → Step 4: NONE of above? → Check for hedging language:
      ✅ Has hedging ("reportedly", "they claim", "could", "if accurate") → PASS
      ❌ NO hedging (stated as fact) → ❌ HARD FORMAT GATE FAIL → REWRITE
    → Examples of UNHEDGED claims that FAIL:
      ❌ "settles in ~2 seconds" (no source) → REWRITE to "reportedly settles in ~2 seconds"
      ❌ "is the first to have this" (no source) → REWRITE to "might be the first to"
    → Also check Protocol Attribution Accuracy:
      ❌ Wrong protocol type ("Pendle = veDEX" when Pendle = yield trading) → REWRITE
      ❌ Wrong chain type ("Optimism = fast chain" when Optimism = L2 rollup) → REWRITE

[ ] EXACT PHRASE MATCHING CHECK (v11.7 — CRITICAL Rally fix):
    → Cross-reference EXACT PHRASES from Step 5.8 Compliance Blueprint Phase 1
    → For EACH exact phrase, perform VERBATIM string search in content:
      Step 1: Extract exact phrase from rules text (e.g., "no presale", "no VC backing")
      Step 2: Search for exact phrase in content (case-insensitive, but WORD-FOR-WORD)
      Step 3: If NOT found verbatim → ❌ HARD FORMAT GATE FAIL → REWRITE
    → ⚠️ CRITICAL: Rally's compliance checker uses EXACT STRING MATCHING.
      Paraphrases that are semantically identical WILL NOT PASS the checker.
      Example: rules say "no presale and no VC backing" →
        ✅ "...no presale and no VC backing..." (VERBATIM — PASS)
        ❌ "...zero presale and zero VC backing..." (PARAPHRASED — FAIL)
        ❌ "...without presale or VC backing..." (PARAPHRASED — FAIL)
    → Also check BONUS exact phrases from Step 5.8 Phase 1
    → If ANY exact phrase NOT found → ❌ Campaign Compliance FAIL → REWRITE

[ ] MANDATORY INCLUSIONS CHECK:
    - Cek SETIAP item di mandatory_includes dari Step 1d-v A5
    - Cek SETIAP item di mandatory_mentions dari Step 1d-v B4
    - Cek SETIAP item di mandatory_hashtags dari Step 1d-v B3
    - Contoh: "Include either x.com/Marb_market or t.me/marbmarket" → cek salah satu ada

[ ] HIDDEN CHARACTER LIMIT CHECK (v11.7 — CRITICAL Rally fix):
    → Rally has hidden format thresholds NOT exposed via API.
    → Real Rally feedback: 1701-char single post = "longform" = format VIOLATED.
    → Apply SAFE THRESHOLDS from Step 5.8 Compliance Blueprint Phase 2:
      If format = single post:
        - MAX 1,200 chars total (hidden limit defense)
        - If content > 1,200 chars → ❌ SPLIT to thread (if allowed) OR TRIM
        - Count chars via programmatic check (Bash/Python — not estimate)
      If format = thread:
        - MAX 900 chars AVG per post (safe distribution)
        - If ANY post > 1,200 chars → ❌ REDISTRIBUTE content across posts
        - Count chars per post via programmatic check
    → This check runs REGARDLESS of what characterLimit API field says.
    → WHY: Rally's programmatic format checker has internal thresholds that are NOT
      exposed via API. characterLimit field is unreliable. Safe thresholds prevent format violations.
    → OVERRIDE RULE: If Step 5.8 Compliance Blueprint overrode format (single → thread),
      verify the new thread format complies with these thresholds.

[ ] CHARACTER LIMIT CHECK (total):
    - Jika char_limit parsed → hitung karakter total (termasuk spaces)
    - Jika melebihi char_limit → ❌ TRIM or REWRITE

[ ] PROHIBITED CHECK:
    - Cek rules_text_prohibited items dari Step 1d-v A6
    - Cek topic_restrictions dari Step 1d-v B2
    - Jika ada → ❌ REMOVE or REWRITE

[ ] LANGUAGE CHECK (v9.9 NEW):
    - Cek content_language dari Step 1d-v B5
    - Jika content_language = "en" → konten HARUS full English
    - Jika mix language → ❌ REWRITE

→ JIKA HARD FORMAT GATE FAIL → STOP. REWRITE SEKARANG. JANGAN lanjut ke checklist lainnya.
→ Ini bukan scoring penalty — ini DISQUALIFICATION. Tidak ada judge yang bisa save konten yang melanggar hard rules.
═════════════════════════════════════════

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
  [ ] Paragraph variation (v11.2 — PROGRAMMATIC via Bash): CV > 0.30? → Run via Bash script (same mechanism as sanitization)
      → AI MUST NOT manually estimate. Run Python script via Bash that:
        1. Splits content by \n\n into paragraphs
        2. Counts words per paragraph
        3. Calculates CV = (stddev / mean) of paragraph word counts
        4. Reports: "CV = [X.XX] → [PASS if > 0.30 / FAIL if < 0.30]"
      → If CV < 0.30 → REWRITE (break long paragraphs, add 1-line fragments)
      → If CV < 0.20 → HARD AI FINGERPRINT → Originality max 1/2, must rewrite
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
  [ ] Dashes: ZERO em-dash/en-dash/double-hyphen? → YA/TIDAK (⚠️ v11.1: ini akan diverifikasi ULANG oleh Python script di Step 7)
  [ ] AI word-level scan (v11.2 — PROGRAMMATIC via Bash):
      Run Python script via Bash that scans each word against the banned list:
      Gate fail: [all banned financial + Rally banned phrases dari Rule 1-3]
      Originality risk: delve, leverage, paradigm, tapestry, landscape, nuance, crucial, pivotal, unlock, realm, unpack, unpacking, ecosystem, flywheel, navigate, pioneering, showcase, facilitate, underscore
      Template hooks: [all dari Rule 8]
      Banned starters: [all dari Rule 9]
      AI patterns: [all dari Rule 10]
      → Format: "KATA_DITEMUKAN: [kata] di kalimat '[...]'"
      → Jika KOSONG: "ZERO violations"
  [ ] Quotes: all straight ""? → YA/TIDAK
  [ ] Ellipsis: all triple dots ...? → YA/TIDAK
  [ ] Character limit: within limit (if specified)? → YA/TIDAK
  [ ] contentType: correct format? → YA/TIDAK
  [ ] ⚠️ v9.7 Mandatory inclusions (from rules text): ALL present? → YA/TIDAK
  [ ] ⚠️ v9.7 Rules text prohibited: NONE? → YA/TIDAK
  [ ] ⚠️ v11.7 Exact phrase match (from Step 5.8 Compliance Blueprint): ALL phrases found VERBATIM? → YA/TIDAK
      → Cross-reference Step 5.8 Phase 1 EXACT PHRASES
      → For EACH phrase: search verbatim in content
      → If ANY phrase NOT found verbatim → ❌ Campaign Compliance FAIL → REWRITE
  [ ] ⚠️ v11.7 Hidden char limit (from Step 5.8 Compliance Blueprint): within safe threshold? → YA/TIDAK
      → Single post: MAX 1,200 chars total
      → Thread: MAX 900 chars AVG per post, NO post > 1,200 chars
      → If exceeded → ❌ SPLIT to thread or TRIM
  [ ] ⚠️ v11.7 Exact phrase match (from Step 5.8 Compliance Blueprint Phase 1): ALL phrases found VERBATIM? → YA/TIDAK
      → Cross-reference EXACT PHRASES from Step 5.8 Phase 1
      → For EACH phrase: search verbatim (word-for-word) in content
      → Example: rules say "no presale" → content must contain "no presale" NOT "zero presale"
      → If ANY phrase NOT found verbatim → ❌ Campaign Compliance FAIL → REWRITE
  [ ] ⚠️ v11.6 Bonus requirements (from Step 1d-v B9): ALL met? → YA/TIDAK
      → Check EACH bonus_requirements item:
        - If EXPLAIN type: explanation exists (not just mention)? → YA/TIDAK
        - If modifier "creatively/visually": uses analogy/metaphor/walkthrough? → YA/TIDAK
        - If MENTION type: term/concept appears? → YA/TIDAK
        - If ARGUE type: analysis/perspective exists? → YA/TIDAK
      → If ANY not met → ❌ Campaign Compliance FAIL → REWRITE
  → VERDICT: PASS / FAIL

✅ ENGAGEMENT POTENTIAL CHECK (target: 5/5):
  [ ] Hook: uses Contrast/Discovery/Question/Claim formula? → YA/TIDAK
  [ ] ⚠️ v9.9 THREAD HOOK CHECK: JIKA format = thread → hook di TWEET 1 (bukan di tengah thread)? → YA/TIDAK
  [ ] First sentence: forces reader to stop? → YA/TIDAK
  [ ] Specific fact: has number/detail from KB/website? → YA/TIDAK
  [ ] Emotional current: excitement/curiosity/provocation? → YA/TIDAK
  [ ] Ending: genuine question/provocative statement/self-doubt? → YA/TIDAK
  [ ] ⚠️ v9.9 THREAD ENDING CHECK: JIKA format = thread → engagement bait di TWEET TERAKHIR? → YA/TIDAK
  [ ] Concise: no filler words/sentences? → YA/TIDAK
  [ ] Word count (v11.1 — PROGRAMMATIC): hitung via Bash, < 300 words? → YA/TIDAK
      → Jika > 300: cek setiap kalimat. Jika ada filler → trim. Jika semua value → OK.
      → Jika > 400: REWRITE lebih pendek.
  [ ] Unique: angle not used by competitors? → YA/TIDAK
  → VERDICT: PASS / FAIL

✅ TECHNICAL QUALITY CHECK (target: 5/5):
  [ ] Natural flow: reads like real person talking? → YA/TIDAK
  [ ] Rhythm check (v9.9 FORMAT-AWARE):
    → JIKA format = single: 1-3 paragraphs, not essay? → YA/TIDAK
    → JIKA format = thread: each tweet standalone + flows to next? → YA/TIDAK
    → JIKA format = thread: each tweet natural length (300-1000 chars common)? → YA/TIDAK
  [ ] Straight quotes only? → YA/TIDAK
  [ ] No formatting artifacts? → YA/TIDAK
  [ ] Sentence variety: short + long mixed naturally? → YA/TIDAK
  [ ] Paragraph rhythm (v11.2 — PROGRAMMATIC via Bash): paragraphs have different lengths? → VERIFIED BY PARAGRAPH CV SCRIPT ABOVE
      → Tidak boleh ada 3+ paragraf berturut-turut dengan panjang serupa (±20%)
      → Minimal 1 paragraf harus SANGAT pendek (1-2 kalimat) atau SANGAT panjang
      → ⚠️ This check is now OBSOLETED by the CV script — if CV > 0.30, rhythm is automatically OK
  [ ] Read-aloud test: sounds like a real tweet/thread? → YA/TIDAK
  → VERDICT: PASS / FAIL

✅ INFORMATION ACCURACY CHECK (target: 2/2):
  [ ] All claims verifiable in KB or website? → YA/TIDAK
  [ ] External protocol claims cross-validated (2+ sources or hedging)? → YA/TIDAK
  [ ] No fabricated numbers/names/dates? → YA/TIDAK
  [ ] Comparative claims ("X is faster/better") have source? → YA/TIDAK
  [ ] Unverified claims use vague language ("growing fast", "quite a few")? → YA/TIDAK
  → VERDICT: PASS / FAIL

✅ REPLY-WORTHINESS CHECK (within Engagement 5/5 — v11.0 MERGED, not separate):
  [ ] Ending invites genuine replies? → Check under ENGAGEMENT above
  [ ] Banger+question=FAIL, banger+challenge=PASS? → Check under ENGAGEMENT above
  → NOTE: Reply-Worthiness is now scored WITHIN Engagement Potential, not as separate category.
  → If this check FAILS → Engagement max 4/5 → Fix within Engagement section above.

═══════════════════════════════════════════
VARIASI [A/B/C] MAX-OUT SCORE: [X]/6 dimensions PASS
```

**KEPUTUSAN:**

- **Jika variasi mendapat 6/6 PASS** → APPROVED untuk Step 7 (judge)
- **Jika variasi mendapat 4-5/6 PASS** → REWRITE bagian yang FAIL, lalu re-check. Waktu target: 30 detik per rewrite.
- **Jika variasi mendapat < 4/6 PASS** → FULL REWRITE variasi ini. Terlalu banyak masalah untuk patch.

**REWRITE PRIORITIES (jika perlu rewrite):**
1. **Compliance FAIL** → FIX FIRST. Satu compliance violation = gate 0. Tidak ada konten yang lolos judge dengan compliance violation.
2. **Originality FAIL** → FIX SECOND. AI fingerprint = gate 0 atau 1.
3. **Alignment FAIL** → FIX THIRD. Tone/directive mismatch = gate 0 atau 1.
4. **Engagement FAIL** → FIX FOURTH. Weak hook = quality score turun.
5. **Technical FAIL** → FIX FIFTH. Easy fix (sanitization, flow).
6. **Engagement/Reply-Worthiness FAIL** → FIX SIXTH. Usually perlu tambah genuine question atau improve ending.

**⚠️ v9.8 OUTPUT FORMAT (PROOF REQUIRED):**
Step 6.5 HARUS menampilkan bukti bahwa HARD FORMAT GATE dan checklist benar-benar dijalankan.

**Jika semua PASS:**
```
═══ PROOF: Step 6.5 MAX-OUT Verification ═══
⛔ HARD FORMAT GATE:
  Format: [thread of N posts / single] (chosen from Step 4.5 #9) ✅
  All 3 variations same format: YES ✅
  Post count: [N] (limit: [min]-[max]) ✅
  Per-post char limit: [N]/[limit or NONE] ✅ (v10.0 — natural length, no default 280)
  Content focus: [focus1] ✅, [focus2] ✅ (v9.9 — all topics addressed)
  Explanatory reqs: [req1] explained ✅, [req2] explained ✅ (v11.5 — all "explain" reqs have definitions)
  Exact phrase match: [phrase1] ✅ VERBATIM, [phrase2] ✅ VERBATIM (v11.7)
  Mandatory includes: [item1] ✅, [item2] ✅
  Mandatory mentions: [@handle] ✅ (v9.9)
  Mandatory hashtags: [none / #tag] ✅ (v9.9)
  Hidden char limit: [N] chars (safe: [1,200 for single / 900 avg for thread]) ✅ (v11.7)
  Char limit: [N]/[limit or "no limit"] ✅
  Rules prohibited: none ✅
  Topic restrictions: none violated ✅ (v9.9)
  Language: [en] ✅ (v9.9)
  ⚠️ Format override: [YES/NO — if Step 5.8 overrode Step 4.5 format] (v11.7)

📋 DIMENSION CHECK (per variasi):
  A: 6/6 PASS ✅ | B: 6/6 PASS ✅ | C: 6/6 PASS ✅
→ 3/3 variasi APPROVED untuk judge panel
═══
```

**Jika ada FAIL:**
```
═══ PROOF: Step 6.5 MAX-OUT Verification ═══
⛔ HARD FORMAT GATE:
  Format: [thread/single] (from Step 4.5 #9) ✅/❌
  All 3 variations same format: YES/NO ✅/❌
  Post count: [N] (limit: [min]-[max]) ✅/❌
  Per-post char limit: [N]/[limit or NONE] ✅/❌ (v10.0 — natural length, no default 280)
  Content focus: [focus1] ✅/❌, [focus2] ✅/❌ (v9.9)
  Explanatory reqs: [req1] explained ✅/❌ (v11.5)
  Exact phrase match: [phrase1] ✅/❌ VERBATIM, [phrase2] ✅/❌ VERBATIM (v11.7)
  Mandatory includes: [item1] ✅/❌
  Mandatory mentions: [@handle] ✅/❌ (v9.9)
  Mandatory hashtags: [none / #tag] ✅/❌ (v9.9)
  Hidden char limit: [N] chars (safe: [1,200 for single / 900 avg for thread]) ✅/❌ (v11.7)
  Char limit: [N]/[limit or NONE] ✅/❌ (v10.0)
  Rules prohibited: none ✅/❌ [list]
  Topic restrictions: none violated ✅/❌ (v9.9)
  Language: [en] ✅/❌ (v9.9)
  ⚠️ Format override: [YES/NO — if Step 5.8 overrode Step 4.5 format] (v11.7)

📋 DIMENSION CHECK:
  A: 6/6 PASS ✅
  B: 5/6 ❌ — [dimensi]: [alasan singkat]
  C: 4/6 ❌ — [dim1]: [alasan], [dim2]: [alasan]
→ Rewriting...
→ After rewrite: A: 6/6 ✅ | B: 6/6 ✅ | C: 6/6 ✅
═══
```

**⚠️ JIKA SETELAH REWRITE, variasi masih < 4/6 PASS → lanjutkan ke judge dengan variasi terbaik yang ada.** Catat di output: "⚠️ MAX-OUT verification: [X]/6 PASS — some dimensions may score below max."

---

### STEP 6.6: Factual Claim Pre-Check + Hedging Enforcement (v11.4-11.5 — ANTI-MISINFORMATION)

**TUJUAN:** Mencegah klaim faktual yang salah tentang protokol/chain lain masuk ke konten.

**MASALAH YANG DIPECAHKAN:** Di produksi, konten mengandung "Plasma was fast too" yang faktually SALAH. Plasma gagal karena data availability challenges, bukan karena kecepatan. Judge tidak menangkap karena KB tidak punya info Plasma.

**PROSES:**
1. Scan semua konten variation untuk klaim tentang protokol/chain lain yang TIDAK ada di KB
2. Jika ditemukan klaim tentang entitas eksternal (protokol lain, chain lain, teknologi lain):
   - Flag: `⚠️ EXTERNAL CLAIM: [klaim] tentang [entitas] — tidak ada di KB`
   - WAJIB web search untuk verifikasi SEBELUM konten final
   - Jika tidak bisa diverifikasi: HAPUS klaim atau bingkai sebagai opini ("I think...", "not sure but...")
3. Daftar entitas yang sering dikutip dan perlu verifikasi:
   - Plasma (Ethereum L2) — gagal karena data availability, BUKAN speed
   - Solana — ~400ms finality, BUKAN sub-ms
   - Arbitrum/Optimism — L2 confirmation ≠ L1 finality
   - Uniswap — AMM, bukan veDEX
   - Solidly — original oleh Andre Cronje, model ve(3,3)

**OUTPUT FORMAT:**
```
═══ PROOF: Step 6.6 (Factual Claim Pre-Check) ═══
External claims found: [N]
  [klaim 1] → [VERIFIED/UNVERIFIED/REMOVED]
  [klaim 2] → [VERIFIED/UNVERIFIED/REMOVED]
All claims verified: YA/TIDAK
```

**⚠️ JIKA ada klaim UNVERIFIED yang tidak dihapus → HALT, jangan lanjut ke Step 7.**

### HEDGING ENFORCEMENT (v11.5 — Enforcement integrated in HARD FORMAT GATE Step 6.5 + programmatic check Step 6.7)

**RULE:** Every claim that falls into ANY of these categories MUST use hedging language:
1. External protocol claims not in KB or 2+ web sources
2. Speculative "could/should/would" scenarios presented as possibilities
3. Comparative claims ("X is faster/better/first") without KB or web source
4. Performance numbers (speed, TPS, finality) not from KB

**HEDGING LANGUAGE OPTIONS:**
- "reportedly", "they claim", "according to", "if accurate"
- "could", "might", "potentially", "possibly"
- "I think", "not sure but", "seems like", "if I'm reading this right"
- "if true", "assuming the numbers are right"

**WITHOUT hedging = stated as fact → if unverifiable → Accuracy penalty or gate fail**

**PROGRAMMATIC CHECK:** In All-In-One Verification Script (Step 7), add a post-verification
step that scans for specific numbers followed by time/speed/performance units ("ms", "seconds",
"TPS", "finality") and flags them if not accompanied by hedging language or found in KB.

### EXTERNAL PROTOCOL CLAIM RULE (v11.5 — from real Rally feedback)

**ROOT CAUSE:** Rally's judge penalized these specific claims as "unverified or oversimplified":
- "Optimism settles in ~2 seconds" — conflates block time with finality
- "MegaETH settles in under a millisecond" — not in KB, specific number without source
- "MarbMarket is the first to have this option" — speculative, not in KB

**RULE:** For EVERY claim about an EXTERNAL protocol/chain that includes a SPECIFIC NUMBER
(speed, TPS, finality time, block time, TVL, etc.):

1. Is the claim in the campaign KB? → ✅ BOLEH (verified by campaign)
2. Is the claim in 2+ independent web sources from Step 1d/3? → ✅ BOLEH (cross-verified)
3. Is the claim on the project's OFFICIAL website (read in Step 1d)? → ✅ BOLEH (with attribution)
4. NONE of the above? → ❌ MUST use hedging language:
   - ✅ "reportedly settles in ~2 seconds"
   - ✅ "they claim sub-ms finality"  
   - ✅ "could potentially enable"
   - ✅ "might be the first to"
   - ✅ "if the numbers are accurate"
   - ❌ "settles in ~2 seconds" (stated as fact)
   - ❌ "settles in under a millisecond" (stated as fact)
   - ❌ "is the first to" (stated as fact without source)

**ADDITIONAL CHECK — Protocol Attribution Accuracy:**
- Protocol TYPE claims must be accurate: "Pendle = yield trading" ✅, "Pendle = veDEX" ❌
- Chain TYPE claims must be accurate: "Optimism = L2 rollup" ✅, "Optimism = fast chain" ❌ (vague/wrong)
- If unsure about protocol classification → DON'T CLASSIFY. Just mention the name.

**ENFORCEMENT:** If ANY unverified specific-number claim about external protocol is found
AND no hedging language is used → ❌ HARD FORMAT GATE FAIL → REWRITE before Step 7.

---

### STEP 6.7: All-In-One Programmatic Verification (v11.3 — PRE-JUDGE CHECK, runs BEFORE Step 7)

**⚠️ FLOW POSITION:** Step ini BERJALAN SETELAH Step 6.6 (Factual Claim Pre-Check PASS) dan SEBELUM Step 7 (judge panel).

**🚨 v11.3 ALL-IN-ONE VERIFICATION SCRIPT — Run ONCE, get ALL checks:**

JALANKAN INI VIA BASH TOOL — menggantikan SEMUA Bash check terpisah (sanitasi, CV, AI scan, word count, integrity, hedging). SATU pemanggilan = SEMUA hasil.

**CARA PENGGUNAAN:**
1. Setelah Step 6.5 (HARD FORMAT GATE PASS) dan Step 6.6 (Factual Claim Pre-Check PASS) selesai
2. Ambil konten 3 variasi yang sudah lolos kedua gate
3. Jalankan SATU KALI via Bash tool — script di bawah
4. Script mengeluarkan: sanitasi + verify + integrity + paragraph CV + AI word scan + word count + char count + hedging check → SEMUA dalam 1 output
5. Jika "ALL VARIATIONS PASSED" → lanjut ke Step 7 (judge panel)
6. Jika ada GATE-FAIL words atau dirty content → FIX dulu, re-run script
7. JANGAN PERNAH skip step ini

**v11.3 PENALTY:** Jika all-in-one script TIDAK dijalankan (no Bash tool output) dan konten terbukti mengandung em-dash/en-dash/banned words → skor FINAL dikurangi 3.0 poin dan grade diturunkan 1 level.

**Script code:**

```python3 << 'ALLCHECKS_EOF'
import sys, json, re, statistics

variations = {"A": "", "B": "", "C": ""}  # Fill with actual content

# ===== AI WORD LIST =====
GATE_FAIL_WORDS = ["guaranteed", "guarantee", "100%", "risk-free", "buy now", "sell now",
    "get rich", "quick money", "easy money", "passive income", "financial advice",
    "investment advice", "vibe coding", "skin in the game", "trust layer", "agent era",
    "agentic era", "structural shift", "capital efficiency", "how did I miss this",
    "losing my mind", "how are we all sleeping on this", "don't miss out", "frictionless"]
AI_PHRASE_WORDS = ["delve", "leverage", "paradigm", "tapestry", "landscape", "nuance",
    "harness", "elevate", "streamline", "empower", "foster", "utilize", "flywheel",
    "ecosystem", "unpack", "unpacking", "crucial", "pivotal", "navigate", "pioneering",
    "showcase", "facilitate", "underscore", "unlock", "realm"]
TEMPLATE_HOOKS = ["unpopular opinion", "hot take", "thread alert", "breaking",
    "nobody is talking about", "story time", "key takeaways", "let's dive in",
    "at the end of the day", "in conclusion"]
AI_PATTERNS = ["on the other hand", "in conclusion", "at its core", "the reality is",
    "it goes without saying", "make no mistake"]
BANNED_STARTERS = ["honestly", "like", "kind of wild", "ngl", "tbh", "tbf", "fr fr", "lowkey"]

ALL_BANNED = set()
for w in GATE_FAIL_WORDS + AI_PHRASE_WORDS + TEMPLATE_HOOKS + AI_PATTERNS + BANNED_STARTERS:
    ALL_BANNED.add(w.lower())

# ===== SANITIZE FUNCTION =====
def sanitize(text):
    issues = []
    en_count = text.count('\u2013')
    if en_count > 0:
        issues.append(f"EN-DASH x{en_count}")
        text = text.replace('\u2013', '. ')
    em_count = text.count('\u2014')
    if em_count > 0:
        issues.append(f"EM-DASH x{em_count}")
        text = text.replace('\u2014', '. ')
    dh_matches = re.findall(r'(?<!\w)--(?!-)', text)
    if dh_matches:
        issues.append(f"DOUBLE-HYPHEN x{len(dh_matches)}")
        text = re.sub(r'(?<!\w)--(?!-)', '. ', text)
    smart_count = len(re.findall('[\u201c\u201d\u2018\u2019]', text))
    if smart_count > 0:
        issues.append(f"SMART-QUOTES x{smart_count}")
        text = text.replace('\u201c', '"').replace('\u201d', '"')
        text = text.replace('\u2018', "'").replace('\u2019', "'")
    if '\u2026' in text:
        issues.append(f"UNICODE-ELLIPSIS")
        text = text.replace('\u2026', '...')
    text = text.replace('\u00A0', ' ')
    for zwc in ['\u200B', '\u200C', '\u200D', '\uFEFF']:
        if zwc in text:
            issues.append(f"ZERO-WIDTH U+{ord(zwc):04X}")
            text = text.replace(zwc, '')
    text = '\n'.join(line.strip() for line in text.split('\n'))
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^>\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^-\s+', '', text, flags=re.MULTILINE)
    text = text.replace('{', '').replace('}', '')
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1]
    if text.startswith("'") and text.endswith("'"):
        text = text[1:-1]
    return text, issues

# ===== VERIFY FUNCTION =====
def verify(text):
    remaining = []
    if '\u2013' in text: remaining.append("EN-DASH STILL PRESENT")
    if '\u2014' in text: remaining.append("EM-DASH STILL PRESENT")
    if re.search(r'(?<!\w)--(?!-)', text): remaining.append("DOUBLE-HYPHEN STILL PRESENT")
    if re.search('[\u201c\u201d\u2018\u2019]', text): remaining.append("SMART-QUOTES STILL PRESENT")
    if '\u2026' in text: remaining.append("UNICODE-ELLIPSIS STILL PRESENT")
    if re.search(r'\*\*[^*]+\*\*', text): remaining.append("MARKDOWN BOLD STILL PRESENT")
    return remaining

# ===== CONTENT INTEGRITY =====
def check_content_integrity(text):
    issues = []
    if not re.search(r'\.\.\.', text) and re.search(r'\. \.', text):
        issues.append("DOUBLE-PERIOD")
    if re.search(r'\. \. ', text):
        issues.append("MULTI-PERIOD PATTERN")
    return issues

# ===== PARAGRAPH CV =====
def paragraph_cv(text):
    paragraphs = [p.strip() for p in re.split(r'\n\n+', text) if p.strip()]
    if len(paragraphs) < 2:
        return 1.0, [len(p.split()) for p in paragraphs]  # Can't calculate CV with <2 paragraphs
    word_counts = [len(p.split()) for p in paragraphs]
    mean = statistics.mean(word_counts)
    if mean == 0:
        return 0.0, word_counts
    stddev = statistics.stdev(word_counts) if len(word_counts) >= 2 else 0
    cv = stddev / mean
    return cv, word_counts

# ===== AI WORD SCAN =====
def ai_word_scan(text):
    found = []
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    for word in words:
        if word in ALL_BANNED:
            # Find which category
            if word in [w.lower() for w in GATE_FAIL_WORDS]:
                category = "GATE-FAIL"
            elif word in [w.lower() for w in AI_PHRASE_WORDS]:
                category = "AI-PHRASE"
            elif word in [w.lower() for w in TEMPLATE_HOOKS]:
                category = "TEMPLATE-HOOK"
            elif word in [w.lower() for w in AI_PATTERNS]:
                category = "AI-PATTERN"
            elif word in [w.lower() for w in BANNED_STARTERS]:
                category = "BANNED-STARTER"
            else:
                category = "BANNED"
            # Avoid duplicates
            if not any(f["word"] == word for f in found):
                found.append({"word": word, "category": category})
    return found

# ===== HEDGING CHECK (v11.5 — flag unverified claims with specific numbers) =====
HEDGING_WORDS = ["reportedly", "they claim", "according to", "if accurate",
    "could", "might", "potentially", "possibly", "i think", "not sure but",
    "seems like", "if i'm reading this right", "if true", "assuming"]
PERF_UNITS = ["ms", "milliseconds", "seconds", "tps", "transactions", "finality"]

def check_hedging(text):
    """Flag specific performance numbers NOT accompanied by hedging language."""
    issues = []
    # Find specific numbers near performance units
    perf_pattern = r'(\d+[\.,]?\d*)\s*(?:' + '|'.join(PERF_UNITS) + r')'
    for match in re.finditer(perf_pattern, text, re.IGNORECASE):
        num_str, unit = match.group(0), match.group(0)
        # Check if hedging word appears within 50 chars before this match
        start = max(0, match.start() - 50)
        context_before = text[start:match.start()].lower()
        has_hedging = any(hw in context_before for hw in HEDGING_WORDS)
        if not has_hedging:
            issues.append(f"⚠️ UNHEDGED: '{match.group(0)}' — add hedging or verify in KB")
    return {"flagged": issues, "count": len(issues), "status": "OK" if not issues else f"FLAGGED {len(issues)} UNHEDGED CLAIMS"}

# ===== MAIN: Run all checks on all variations =====
all_pass = True
results = {}

for name, content in variations.items():
    if not content:
        continue
    r = {}
    
    # 1. Sanitize
    cleaned, san_issues = sanitize(content)
    r["sanitization"] = {"fixed": san_issues, "status": "CLEANED" if san_issues else "CLEAN"}
    
    # 2. Verify (post-sanitization)
    remaining = verify(cleaned)
    r["verify"] = {"remaining_issues": remaining}
    if remaining:
        all_pass = False
        r["verify"]["status"] = "STILL DIRTY → REWRITE"
    else:
        r["verify"]["status"] = "VERIFIED CLEAN"
    
    # 3. Content integrity
    integrity = check_content_integrity(cleaned)
    r["integrity"] = {"issues": integrity, "status": "OK" if not integrity else "WARNING"}
    
    # 4. Paragraph CV
    cv, word_counts = paragraph_cv(cleaned)
    cv_status = "PASS (CV>0.30)" if cv > 0.30 else ("BORDERLINE (0.20-0.30)" if cv >= 0.20 else "FAIL (CV<0.20)")
    r["paragraph_cv"] = {"cv": round(cv, 3), "word_counts": word_counts, "status": cv_status}
    
    # 5. AI word scan
    ai_found = ai_word_scan(cleaned)
    r["ai_scan"] = {"found": ai_found, "count": len(ai_found), "status": "CLEAN" if not ai_found else f"FOUND {len(ai_found)} BANNED WORDS"}
    
    # 6. Word count
    wc = len(cleaned.split())
    wc_status = "OK (<300)" if wc <= 300 else ("WARNING (300-400)" if wc <= 400 else "OVER (>400) → TRIM")
    r["word_count"] = {"words": wc, "status": wc_status}
    
    # 7. Character count
    r["char_count"] = len(cleaned)

    # 8. HEDGING CHECK (v11.5 — external protocol claims without hedging)
    hedging = check_hedging(cleaned)
    r["hedging"] = hedging

    results[name] = r

# ===== OUTPUT =====
print("═══ v11.3 ALL-IN-ONE VERIFICATION ═══")
for name, r in results.items():
    print(f"\n── VARIASI {name} ──")
    print(f"  Sanitization:  {r['sanitization']['status']}", end="")
    if r['sanitization']['fixed']:
        print(f" ({', '.join(r['sanitization']['fixed'])})")
    else:
        print()
    print(f"  Post-verify:   {r['verify']['status']}", end="")
    if r['verify']['remaining_issues']:
        print(f" ({', '.join(r['verify']['remaining_issues'])})")
    else:
        print()
    print(f"  Integrity:     {r['integrity']['status']}", end="")
    if r['integrity']['issues']:
        print(f" ({', '.join(r['integrity']['issues'])})")
    else:
        print()
    print(f"  Paragraph CV:  {r['paragraph_cv']['cv']} — {r['paragraph_cv']['status']}")
    print(f"    Paragraph word counts: {r['paragraph_cv']['word_counts']}")
    print(f"  AI Word Scan:  {r['ai_scan']['status']}")
    for f in r['ai_scan']['found']:
        print(f"    ⚠️ [{f['category']}] '{f['word']}'")
    print(f"  Word Count:    {r['word_count']['words']} — {r['word_count']['status']}")
    print(f"  Char Count:    {r['char_count']}")
    print(f"  Hedging Check: {r['hedging']['status']}")
    for h in r['hedging']['flagged']:
        print(f"    {h}")

# Final verdict
print("\n═══ FINAL VERDICT ═══")
all_clean = all(
    r['verify']['status'] == 'VERIFIED CLEAN' and 
    not any(f['category'] == 'GATE-FAIL' for f in r['ai_scan']['found'])
    for r in results.values()
)
if all_clean:
    print("ALL VARIATIONS PASSED — safe for judge panel ✅")
else:
    print("SOME VARIATIONS FAILED — fix before judge ❌")
    sys.exit(1)
ALLCHECKS_EOF
```

**CARA PENGGUNAAN:**
1. Setelah Step 6.5 selesai, ambil konten 3 variasi
2. Isi `variations` dict dengan konten aktual
3. Jalankan SATU KALI via Bash tool
4. Script mengeluarkan: sanitasi + verify + integrity + paragraph CV + AI word scan + word count + char count → SEMUA dalam 1 output
5. Jika "ALL VARIATIONS PASSED" → lanjut ke judge
6. Jika ada GATE-FAIL words atau dirty content → FIX dulu, re-run script
7. JANGAN PERNAH skip step ini

**v11.3 PENALTY:** Jika all-in-one script TIDAK dijalankan (no Bash tool output) dan konten terbukti mengandung em-dash/en-dash/banned words → skor FINAL dikurangi 3.0 poin dan grade diturunkan 1 level.

---

### STEP 7: Multi-Judge Panel Evaluation

**⏱ Estimated time: 15-45 seconds**

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `7` to `completed_steps`, save judge panel data to `data.judge_panel`.

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
║     → IF 401/unavailable → GO TO #1b                                             ║
║     → IF consensus unclear, GO TO #2                                              ║
║                                                                                   ║
║  1b Direct Task Subagent    Task tool × 5 + Self     6 judges in ~15s          ║
║     (LLM FALLBACK)           Subagent evaluates      NO LLM skill needed       ║
║                              directly, same persona   Same quality, no temp    ║
║     → IF consensus unclear, GO TO #2                                              ║
║                                                                                   ║
║  2  chat.qwen.ai             agent-browser             External perspective      ║
║     Tiebreak/Promoted        Full judge (not just     1 judge + Self = 2       ║
║     tiebreaker if #1         tiebreaker) if #1/#1b   min required met           ║
║     unavailable              unavailable                                        ║
║     → IF still unclear, GO TO #3                                                 ║
║                                                                                   ║
║  3  ASK USER                 —                       Tanya user                 ║
║     "Judge tidak konsensus. Mau pilih sendiri dari 3 variasi?"                   ║
║                                                                                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝

⚠️ ATURAN KERAS:
• HARUS coba #1 (LLM panel) dulu. 6 judge sudah sangat reliable.
• ⚠️ JIKA LLM skill return 401 → LANGSUNG ke #1b (Direct Task Subagent). JANGAN tanya user dulu — ini fallback otomatis.
• ⚠️ JIKA #1b juga gagal → LANGSUNG ke #2 (chat.qwen.ai dipromosikan dari tiebreaker ke active judge).
• chat.qwen.ai (#2) HANYA sebagai tiebreaker JIKA #1 atau #1b berhasil tapi consensus unclear.
• JANGAN gunakan OpenRouter API.
• JANGAN pernah self-judge sebagai SATU-SATUNYA judge (minimum 3 judge required).
• ⚠️ EXPECTED TIME: ~15 detik untuk J1-J6. chat.qwen.ai tambahan ~60-90 detik (jarang perlu).

**⚠️ KENAPA #1b (Direct Task Subagent) BEKERJA:**
Task tool meluncurkan subagent yang sendirinya sudah AI. Subagent bisa mengevaluasi konten langsung dengan persona yang diberikan, TANPA perlu invoke LLM skill/API. Satu-satunya perbedaan vs #1: tidak ada temperature control. Tapi persona berbeda tetap menciptakan variasi evaluasi yang meaningful.
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

**Rate Limit Handler (v11.4):**
Jika parallel Task calls gagal dengan rate limit (429 error):
1. Wait 5 seconds
2. Retry failed judges sequentially (one at a time with 5s delay between each)
3. Jika sequential juga gagal → wait 30 seconds, retry once more
4. Jika masih gagal → gunakan Direct Task Subagent evaluation (#1b fallback)
5. Jika #1b juga gagal → log error, gunakan skor dari judge yang berhasil + self-judge

**PROOF OUTPUT:**
```
═══ JUDGE EXECUTION PROOF ═══
Parallel: [N]/5 succeeded, [N] rate-limited
Sequential retry: [N]/[N] succeeded
Fallback used: [NONE / #1b / Self-Judge only]
Total judges completed: [N]/6
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
    "engagement": N, "technical": N,
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
⚠️ **v9.8: J6 HARUS ditandai: `[SELF-JUDGE — J6]`** di output. Jika tidak ditandai → tidak valid.

**⚠️ v9.8 JUDGE EXECUTION ENFORCEMENT:**
```
═══ PROOF: Step 7 Judge Panel Execution ═══
Judge Method: 5x parallel Task calls (J1-J5) + 1 Self-Judge (J6)
Task Call Status: [J1: ✅, J2: ✅, J3: ✅, J4: ✅, J5: ✅]
Self-Judge: ✅ [SELF-JUDGE — J6]
⚠️ Jika AI menulis skor judge TANPA baris proof ini → JUDGE RESULTS INVALID
═══
```
JIKA Task tool calls TIDAK dilakukan → AI HARUS mengakui: "⚠️ Judge Task calls tidak dijalankan. Skor tidak valid. Harap re-run."
JIKA Task tool gagal (timeout/error) → AI HARUS mencatat error spesifik dan menawarkan: (a) re-run judge, atau (b) gunakan self-judge saja (dengan catatan kurang akurat).

**After ALL 6 judges return:**
1. Collect all scores into a matrix
2. Check score range for winner variation (max score - min score)
3. Check gate agreement (do all judges agree on Originality/Compliance?)
4. If range <= 4pts AND gates consistent → Skip J7, go to consensus (Step 7e)
5. If range > 4pts OR gates disagree → Trigger J7 (chat.qwen.ai tiebreaker)

**1b. TRY #1b — Direct Task Subagent (FALLBACK jika LLM skill 401/unavailable):**

⚠️ **TRIGGER:** JIKA LLM skill return 401 auth error atau "not available" → LANGSUNG ke #1b. Tidak perlu tanya user.

**⚡ PROGRESS PING:**
```
⏳ LLM skill unavailable (401). Switching to Direct Task Subagent fallback...
Metode: 5 Task subagents (direct evaluation, no LLM skill) + 1 Self-judge
Estimasi: ~15 detik
```

**🚨 PARALLEL LAUNCH — 5 Direct Task subagents in ONE message + 1 Self-judge:**

```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ TASK 1: J1          │ │ TASK 2: J2          │ │ TASK 3: J3          │ │ TASK 4: J4          │ │ TASK 5: J5          │
│ Harsh Crypto Critic │ │ Average X User      │ │ Rally Judge Clone   │ │ Contrarian          │ │ AI Fingerprint Det  │
│ (no temp control)   │ │ (no temp control)   │ │ (no temp control)   │ │ (no temp control)   │ │ (no temp control)   │
│                     │ │                     │ │                     │ │                     │ │                     │
│ 1. Evaluate directly│ │ 1. Evaluate directly│ │ 1. Evaluate directly│ │ 1. Evaluate directly│ │ 1. Evaluate directly│
│ 2. Return JSON      │ │ 2. Return JSON      │ │ 2. Return JSON      │ │ 2. Return JSON      │ │ 2. Return JSON      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                    ↕ ALL PARALLEL (~15 seconds) ↕

┌─────────────────────┐
│ J6: Self-Judge      │
│ (main AI, instant)  │
└─────────────────────┘
         ↓

ALL 6 return → CHECK CONSENSUS → (optional J7) → MERGE → Step 7e
```

**PERBEDAAN #1b vs #1:**
- #1: Task calls invoke LLM skill inside → temperature control
- #1b: Task calls evaluate directly → NO temperature control, NO LLM skill invocation
- #1b Task calls HARUS include persona system prompt + judge content + scoring rubric in the Task prompt (same as #1, just without "invoke LLM skill" step)
- #1b uses `subagent_type: "general-purpose"` — subagent evaluates content using its own AI capabilities

**⚠️ ARCHITECTURAL CONTEXT (KENAPA #1b BUKAN #1 YANG WORK):**
z-ai-web-dev-sdk (LLM skill) membutuhkan X-Token yang HANYA tersedia di AI Assistant runtime.
User code (Node.js, SDK, HTTP direct) TIDAK punya akses ke X-Token → 401.
Task subagents mewarisi auth context dari parent AI Assistant → 401 TIDAK terjadi.
Referensi: Rally_AutoGen_Architecture_Guide.docx Section 3 — X-Token & Solusi.

**JIKA #1b juga gagal (Task tool error):**
→ LANGSUNG ke #2 (chat.qwen.ai dipromosikan dari tiebreaker ke active judge)
→ Progress ping: "⚠️ Task subagent juga gagal. Promoting chat.qwen.ai to active judge..."

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
- **⚠️ v9.9 FORMAT CONTEXT (BARU — CRITICAL)** — judge HARUS tahu format yang diminta campaign:
  - Apakah format = single tweet, short thread (2-4 posts), atau multiple independent posts?
  - Jika thread: berapa min/max posts? Per-post char limit (if specified by campaign)?
  - Jika format = thread tapi konten ditulis sebagai single tweet → Alignment FAIL
  - Jika format = single tapi konten ditulis sebagai thread → Alignment FAIL
  - Format chosen dari Step 4.5 #9 HARUS disertakan di judge context
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
5. **⚠️ v9.9 Format match (BARU)** — format konten sesuai dengan format yang diminta? ✅/❌
   - Jika campaign meminta "short thread" tapi konten = single tweet → Alignment FAIL
   - Jika campaign meminta "single post only" tapi konten = thread → Alignment FAIL
   - Jika thread: cek jumlah posts (min-max), cek per-post char limit (if specified by campaign), cek thread coherence

**Content Alignment 2/2 requires ALL 5 checks to pass.**

**7c. LLM Judge Prompt Template (for J1-J4):**

```
[System prompt varies per judge — see Tool 4 personas]

You are evaluating 3 content variations for a Rally.fun campaign. Score each using the 6-category rubric below.

═══ RALLY.FUN SCORING RUBRIC (6 Categories, Max 18.0 Points) ═══

BINARY GATES (score 0 = FAIL):
1. Originality & Authenticity (0-2):
   - 0 = AI-generated/robotic (contains AI words, template phrases, uniform structure)
   - 1 = some AI patterns (1-2 AI words, slightly formulaic structure)
   - 2 = genuinely human (ZERO AI words, ZERO template phrases, uneven structure, personal voice, unique angle)
   ⚠️ To score 2/2: must pass ALL 3 checks — word choice (no AI words), sentence structure (uneven, varied), content pattern (specific, asymmetric, personal)

2. Content Alignment (0-2):
   - 0 = doesn't match campaign OR tone mismatch OR directive violation OR format mismatch
   - 1 = partial match (topic ok but tone wrong, or tone ok but missing directive, or directive ok but style ignored, or format wrong)
   - 2 = perfect match (topic + tone + directive + style + FORMAT ALL align with style field + mission description + rules text)
   ⚠️ To score 2/2: ALL 5 checks must pass — topic match, tone match, directive match, style match, FORMAT match
   ⚠️ Tone check: if style says "banger" but content is analytical → max 1/2
   ⚠️ Directive check: if mission says "celebrate" but content is skeptical → max 1/2
   ⚠️ Style check: if style field is provided and content ignores it → max 1/2
   ⚠️ v9.9 FORMAT check: if campaign asks for "short thread" but content is a single tweet → max 1/2
   ⚠️ v9.9 FORMAT check: if campaign asks for "single post" but content is a thread → max 1/2
   ⚠️ v9.9 FORMAT check: if thread requested, each tweet must be concise/readable and flow coherently

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
   - ⚠️ REPLY-WORTHINESS CHECK (v11.0): To score 5/5, ending MUST invite genuine replies — specific question with no obvious answer, vulnerability framing, specific audience targeting. If ending is generic ("thoughts?") → max 4/5

6. Technical Quality (0-5):
   - 1 = awkward, robotic, hard to read
   - 2 = readable but unnatural in places
   - 3 = decent flow, minor issues
   - 4 = natural flow, reads like a real tweet, minor imperfections
   - 5 = FLAWLESS natural flow, reads EXACTLY like a real person typed it, sentence variety perfect, no artifacts
   ⚠️ To score 5/5: must pass read-aloud test — sounds like someone talking, not writing

⚠️ REMOVED: Reply Quality is NO LONGER a separate category (v11.0). Rally evaluates reply-worthiness WITHIN Engagement Potential. See Engagement scoring criteria below for reply-worthiness evaluation.

═══ STRICT EVALUATION RULES ═══
- Verify claims against Knowledge Base provided
- AI-sounding word (delve, leverage, paradigm...) = Originality max 1
- Template phrase (key takeaways, let's dive in...) = Originality max 1
- Rally banned phrase (vibe coding, agent era...) = Compliance 0
- Em dashes prohibited in rules = Compliance 0
- Rhetorical question (asks then immediately answers) → Engagement max 4/5 (reply-worthiness check)
- Compare against ground truth: mediocre = 6-11/18, good = 12-15/18, excellent = 16+/18
- Score 5/5 on Engagement ONLY if ALL criteria met (hook + fact + emotion + question + conciseness + uniqueness + reply-worthiness)
- Score 5/5 on Technical ONLY if read-aloud test passes (sounds like real speech)
- Score 2/2 on Originality ONLY if ZERO AI fingerprints detected (words + structure + pattern)
- Score 2/2 on Alignment ONLY if ALL 5 checks pass (topic + tone + directive + style + FORMAT)
- Score 2/2 on Compliance ONLY if ZERO violations (prohibited + banned + formatting)
- **⚠️ v9.9**: Score 2/2 on Alignment requires FORMAT MATCH — thread vs single must match campaign rules
- BE BRUTAL. BE HONEST. NO COMPROMISE. GIVE MAX ONLY WHEN EARNED.

═══ SCORING SCALE ═══
- Gates: 0-2 each. Quality: 0-5 each (Engagement, Technical). TOTAL MAX = 18.
- Clamp total_score to max 18.

═══ CAMPAIGN CONTEXT ═══
[PASTE 7b context here]

⚠️ v9.9 FORMAT REQUIREMENTS (MUST evaluate):
Expected format: [single tweet / thread of N posts / reply]
Format source: [Step 4.5 #9 Campaign Request Profile + Step 1d-v Rules Parser]
If content format ≠ expected format → Content Alignment max 1/2
If thread: check each tweet concise/readable, thread coherence, correct post count

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
    "engagement": N, "technical": N,
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
- Template phrases: unpopular opinion, hot take, thread alert, breaking, this is your sign, psa, reminder that, key takeaways, here's the thing, let's dive in, at the end of the day
- ⚠️ v10.0 NOTE: "nobody is talking about" removed from banned list — Rally 2/2 content uses variations of this phrase. Only flag if EXACT "nobody is talking about" used as generic hook without specificity.
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
- If total_score > 18, the judge used the wrong scale -- recalculate manually

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
  TOTAL:            [X] [X] [X] [X] [-] [X] [X]  [X]/18

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
Dengan 3+ judge (adaptive judge count, see Step 10c), probabilitas 1 judge false-positive cukup tinggi. Satu outlier TIDAK BOLEH membunuh konten yang sebenarnya bagus. TETAPI: konten yang bermasalah HARUS tetap terdeteksi.

**RULE:**
1. Hitung min() dari semua judge scores untuk setiap gate
2. Hitung **dissent count** — berapa judge yang memberi skor 0/2 pada gate tersebut
3. Jika **min() = 0/2 DAN dissent count = 1** (hanya 1 dari 3+ judge):
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
- Total consensus = sum of all 6 category consensus scores (max 18)
- **⚠️ FINAL CLAMP:** `total = max(0, min(18, total))`

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
✅/❌ Score scale correct: YES (max 18, not 157 or other)
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

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) save G4 scores to `data.g4_scores`.

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
| aiPhrases | -1.0 | Contains: delve, leverage, tapestry, paradigm, landscape, nuance, harness, elevate, streamline, empower, foster, utilize, flywheel, ecosystem, unpack, unpacking, crucial, pivotal, navigate, pioneering, showcase, facilitate, underscore |
| genericOpening | -1.0 | Starts with "The/This is/There are/In my opinion/As we know" |
| formalEnding | -1.0 | Contains "in conclusion/to summarize/as discussed/regards/sincerely" |
| overExplaining | -0.5 | Word count exceeds 300 words AND content feels padded/repetitive (if every sentence adds value, NO penalty — v10.0 raised from 150 to 300 based on Rally calibration) |
| rhetoricalQuestionOnly | -0.5 | Poses question but immediately answers it (kills reply-worthiness in Engagement) |
| uniformParagraphs | -1.0 | Paragraph word count CV < 0.30 (calculated programmatically — v11.2) |

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
consensus_score = multi-judge consensus: min() for gates, average() for quality (out of 18)

# ⚠️ v10.0 GATE QUALITY CONDITION — prevent bonus from masking fundamental issues
gate_quality = "GOOD"
if ANY gate_score == 0: gate_quality = "FAIL"     # hard gate failure
elif ANY gate_score == 1: gate_quality = "FLAGGED" # minority dissent

g4_adjustment = sum of all G4 bonuses - sum of all G4 penalties
x_factor_bonus = sum of all X-Factor points

# ⚠️ v10.0: Scale bonuses based on gate quality
if gate_quality == "FAIL":
    g4_adjustment = 0  # NO bonuses if any gate fails — fix fundamentals first
    x_factor_bonus = 0
elif gate_quality == "FLAGGED":
    g4_adjustment = max(-3, min(3, g4_adjustment))  # halved cap
    x_factor_bonus = min(1, x_factor_bonus)          # halved cap
else:
    g4_adjustment = max(-4, min(4, g4_adjustment))  # normal cap ±4 (reduced from ±5)
    x_factor_bonus = min(2, x_factor_bonus)          # normal cap +2 (reduced from +3)

adjusted_score = consensus_score + g4_adjustment + x_factor_bonus
adjusted_score = max(0, min(18, adjusted_score))  # clamp to 0-18
```

---

### STEP 9: Evaluate and Select Winner

**⏱ Estimated time: 5-10 seconds** (no external calls)

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) save winner to `data.winner`.

```
JUDGE RESULTS (Multi-Judge Panel Consensus + G4 + X-Factor):
                    J1  J2  J3  J4  J5  J6  J7  Consensus  Adjusted  Grade     Verdict
Variation A:        [X] [X] [X] [X] [O] [X] [-]  [X]/18     [X]/18    [grade]    PASS/FAIL
Variation B:        [X] [X] [X] [X] [O] [X] [-]  [X]/18     [X]/18    [grade]    PASS/FAIL
Variation C:        [X] [X] [X] [X] [O] [X] [-]  [X]/18     [X]/18    [grade]    PASS/FAIL

Judges completed: [N]/7 (J5 = Originality only, J7 = optional tiebreak)
Judge agreement: [YES / NO] (score range: [X] points)
Gate disagreements: [list if any]
Winner: Variation [X] ([adjusted_score]/18.0 = [Y]% -- Grade [grade])
```

**If J7 (tiebreaker) was triggered, add note:**
```
⚠️ Tiebreaker J7 (chat.qwen.ai) triggered due to score range [X] pts
```

**If some judges failed (3-5 completed), use this format:**
```
JUDGE RESULTS (Partial Panel + G4 + X-Factor):
                    J1  J2  J3  J4  J6  Consensus  Adjusted  Grade     Verdict
Variation A:        [X] [X] [X] [X] [X]  [X]/18     [X]/18    [grade]    PASS/FAIL
Variation B:        [X] [X] [-] [X] [X]  [X]/18     [X]/18    [grade]    PASS/FAIL
Variation C:        [X] [X] [X] [X] [X]  [X]/18     [X]/18    [grade]    PASS/FAIL

⚠️ Partial panel: [N]/6 judges completed (min 3 required)
Missing: [list failed judges]
Winner: Variation [X] ([adjusted_score]/18.0 = [Y]% -- Grade [grade])
```

**Grade System (calibrated from real Rally submission data):**
| Score | Grade | Position Estimate |
|-------|-------|-------------------|
| 18.0 | S+ | Top 1% (PERFECT) |
| >= 17.0 | S | Top 5% (NEAR PERFECT) |
| >= 15.0 | A | Top 10% |
| >= 13.0 | B | Top 25% |
| >= 11.0 | C | Top 50% |
| >= 9.0 | D | Above Average |
| < 9.0 | F | Below Average |

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
Setelah loop #1, JIKA skor >= 16/18 DAN semua gate PASS atau FLAGGED:
→ Tanya user: "Skor [X]/18. Ini sudah S+. Lanjut feedback loop untuk coba 18/18, atau terima sekarang?"
→ Jika user terima → output langsung (tidak perlu loop tambahan)
→ Kenapa aman: 16/18 = Top 1%, loop tambahan berisiko menurunkan skor (over-correction)

**Acceptance criteria — PERFECT (ALL must be true):**
- ALL 4 gates at EXACTLY 2/2 (PASS, not FLAGGED)
- ALL 2 quality scores at EXACTLY max (Engagement 5/5, Technical 5/5)
- Total score = 18/18 (100%)
- If ALL conditions met: **PERFECT. Proceed to Step 11.**

**Acceptance criteria — ACCEPTABLE (minimum bar):**
- ALL gates at PASS or ⚠️ FLAGGED (no ❌ FAIL)
- Engagement >= 4/5, Technical >= 4/5
- Total score >= 16/18 (89%)
- If conditions met: **Accepted (but note which quality score < 5/5 and any FLAGGED gates).**

**Acceptance criteria — FLAGGED GATE HANDLING:**
- ⚠️ FLAGGED gate (1/2) = minority dissent, TIDAK mandatory feedback loop
- Konten dengan FLAGGED gate BOLEH diterima JIKA total score >= 16/18
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
- Total < 16/18 → MANDATORY feedback loop
- ⚠️ FLAGGED GATE → OPTIONAL (tanya user via early accept)
- Quality 4/5 → OPTIONAL (tanya user via early accept)

---

### STEP 9.5: Independent Gate Audit (v11.4 — MANDATORY)

**TUJUAN:** Audit independen terhadap semua binary gate oleh judge yang BERBEDA dari yang generate konten.

**MASALAH YANG DIPECAHKAN:** Di produksi, gate audit dilakukan oleh judge yang sama yang generate konten, menyebabkan false positive (6/8 gates "PASS" tapi 3 gate sebenarnya FAIL).

**PROSES:**
1. Gunakan Task Subagent dengan persona "Independent Auditor" (temp 0.3, strict)
2. Subagent TIDAK menerima konten generation context, HANYA menerima:
   - Konten final (3 variations)
   - Campaign KB
   - Mission rules
   - Scoring rubric
3. Auditor menilai HANYA 4 binary gates (Originality, Alignment, Accuracy, Compliance)
4. System prompt auditor: "You are an independent auditor. Your ONLY job is to catch problems. You did NOT help create this content. Be suspicious. If anything seems wrong, flag it."

**OUTPUT FORMAT:**
```
═══ INDEPENDENT GATE AUDIT ═══
Auditor: Independent (temp 0.3, no generation context)

Gate Results:
  Originality:    X/2  [VERIFIED/FLAGGED]
  Alignment:      X/2  [VERIFIED/FLAGGED]
  Accuracy:       X/2  [VERIFIED/FLAGGED]
  Compliance:     X/2  [VERIFIED/FLAGGED]

Issues Found: [N]
  [issue 1]: [description]
  [issue 2]: [description]

⚠️ If any gate VERIFIED but actually has issues → auditor failed
⚠️ If any gate FLAGGED but actually passes → false positive noted
```

**⚠️ JIKA auditor menemukan gate FAIL yang sebelumnya "PASS" → wajib feedback loop.**
**⚠️ Auditor WAJIB menggunakan Task Subagent, BUKAN evaluasi internal.**

---

### STEP 10: Feedback Loop (if needed)

**⚠️ MANDATORY FULL 6-GATE RE-SCAN (v11.4):** Setiap feedback loop iteration WAJIB re-score SEMUA 6 gate, bukan hanya gate yang dikritik. Output format WAJIB:

```
═══ FEEDBACK LOOP #[N] — FULL 6-GATE RE-SCAN ═══
Variation: [A/B/C] | Strategy: [strategy_name]
┌─────────────────┬────────┬────────┬────────┐
│ Gate            │ Loop 0 │ Loop N │ Change │
├─────────────────┼────────┼────────┼────────┤
│ Originality     │  X/2   │  X/2   │  +/-   │
│ Alignment       │  X/2   │  X/2   │  +/-   │
│ Accuracy        │  X/2   │  X/2   │  +/-   │
│ Compliance      │  X/2   │  X/2   │  +/-   │
│ Engagement      │  X/5   │  X/5   │  +/-   │
│ Technical Quality│ X/5   │  X/5   │  +/-   │
├─────────────────┼────────┼────────┼────────┤
│ TOTAL           │  X/18  │  X/18  │  +/-   │
└─────────────────┴────────┴────────┴────────┘
⚠️ GATES DROPPED: [list any gate that decreased]
```

Jika ada gate yang TURUN dari iterasi sebelumnya → wajib investigasi kenapa. Perbaikan satu gate tidak boleh merusak gate lain.

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
  ⚠️ REPLY-WORTHINESS: Jika Engagement turun karena reply-worthy ending, lihat sub-item 4-6 di atas (vulnerability framing, spesifik pertanyaan, hapus rhetorical question)

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
  3. Engagement (pilih yang lebih rendah)
- Ignore sementara dimensi yang sudah max atau hampir max
- Tulis dengan lebih "risky" — prioritaskan natural flow over perfect compliance
- Referensi Dimension Compatibility Rules: "safe tapi kaku" < "risky tapi natural"
- Cocok untuk: semua dimensi di bawah max, atau skor stuck di 14-16/18
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

RC-C. WEAK HOOK/ENDING (Engagement < 5/5, includes reply-worthiness)
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
- **⚠️ v9.1 MAX-OUT RE-VERIFICATION**: SEBELUM kirim ke re-judge, jalankan ULANG Step 6.5 MAX-OUT Self-Verification DAN Step 6.6 Factual Claim Pre-Check untuk variasi yang di-rewrite. Pastikan dimensi yang sebelumnya FAIL sekarang PASS. Jika masih FAIL → rewrite ULANG sebelum re-judge.

**10c. Re-Judge (same architecture as Step 7 — Multi-Judge Panel):**

1. **Multi-Judge Panel** (Tool 4) — same 5 personas + self-judge (sama seperti Step 7). **Gunakan #1b (Direct Task Subagent) jika LLM skill masih 401 dari Step 7.**
2. Jika beberapa gagal → gunakan yang tersedia (min 3 required)
3. Use the **single-variation judge prompt** (see below) instead of the 3-variation prompt
4. chat.qwen.ai (Tool 5) — optional tiebreaker or promoted active judge, same trigger rules as Step 7

**🎯 v11.5 ADAPTIVE JUDGE COUNT — Reduce judges when scores are stable (saves time + tokens):**

**RULE:** In feedback loop #2+, AI MAY reduce judge count IF previous loop scores meet stability criteria:

| Condition | Judges Used | Rationale |
|-----------|-------------|-----------|
| Loop #1 (initial) | Full 5 + self-judge (6 total) | Always full panel for first evaluation |
| Loop #2+ AND previous score range ≤ 2pts AND all gates consistent | 3 judges (J1 + J3 + J5) + self-judge (4 total) | High consistency = 3 judges sufficient for accurate re-evaluation |
| Loop #2+ AND previous score range 3-4pts OR 1 gate flagged | 4 judges (J1 + J2 + J3 + J5) + self-judge (5 total) | Moderate variance = need more perspectives |
| Loop #2+ AND previous score range > 4pts OR gate HARD FAIL | Full 5 + self-judge (6 total) | High disagreement or critical failure = full panel needed |
| Loop #3 AND score improved from loop #2 | 3 judges (J1 + J3 + J5) + self-judge | Trend is improving = fewer judges adequate |
| Loop #3 AND score NOT improved from loop #2 | STOP — HALT DAN TANYA USER | 3 loops without convergence = human judgment needed |

**Why J1 + J3 + J5 as core 3:**
- J1 (Harsh Crypto Critic): Catches quality issues, keeps standard high
- J3 (Rally Judge Clone): Best approximation of actual Rally scoring
- J5 (AI Fingerprint Detector): Critical for Originality gate — the most common failure
- Self-Judge (J6): Full pipeline context, catches subtle issues other judges miss

**KENAPA INI TIDAK MENURUNKAN KUALITAS:**
- Full panel (5+1) masih digunakan di loop #1 dan ketika ada disagreement
- 3-judge panel HANYA digunakan ketika previous scores SUDAH stabil (range ≤ 2pts)
- J1+J3+J5 sudah mencakup 3 persona paling kritis (harsh quality, Rally clone, AI detection)
- Self-judge (J6) tetap selalu ada sebagai counterbalance
- Jika 3-judge consensus TIDAK jelas → otomatis upgrade ke full panel (safety net)

**ADAPTIVE JUDGE PROOF FORMAT:**
```
═══ PROOF: Step 10c Re-Judge (Adaptive) ═══
Loop #[N] | Judge count: [3/4/5] + Self-Judge
Reason: [score stability / variance / gate status from previous loop]
Judges used: [J1 ✅, J3 ✅, J5 ✅, J6 ✅] (or full list)
Score range previous loop: [X] pts
═══
```

**⚠️ If < 3 judges complete:** STOP. Tampilkan variasi tanpa skor.

**10c-i. Single-Variation Judge Prompt (for re-judge only):**
Use the same judge prompt as Step 7, but replace all 3 variation sections with only the improved variation:

**⚠️ v9.5 COMPRESSED CONTEXT MODE (untuk loop #2+):**
Jika feedback loop sudah di loop #2 atau lebih, DAN context sudah 70%+ terpakai, gunakan COMPRESSED prompt yang menghilangkan detail rubric (judge sudah tahu rubric dari loop #1):

```
═══ IMPROVED CONTENT VARIATION (after feedback loop #[N]) ═══
[INSERT IMPROVED VARIATION TEXT]

═══ PREVIOUS SCORES (for reference) ═══
[If first re-judge: "Initial Consensus: [X]/18"]
[If subsequent re-judge: "Loop [N-1] Consensus: [X]/18"]
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
[If first re-judge: "Initial Consensus: [X]/18"]
[If subsequent re-judge: "Loop [N-1] Consensus: [X]/18"]
Issues to fix: [list from previous feedback]
```
And change the JSON output to single variation:
```json
{
  "originality": N, "alignment": N, "accuracy": N, "compliance": N,
  "engagement": N, "technical": N,
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

Skor saat ini: [X]/18
Dimensi masih di bawah max:
  - [Nama Dimensi 1]: [skor]/[max] — [alasan singkat dari judge]
  - [Nama Dimensi 2]: [skor]/[max] — [alasan singkat dari judge]
Perbaikan dari loop terakhir: [naik [Y] poin / turun [Y] poin / stagnan]

Pilihan:
1. Loop lagi (reset counter, coba strategi baru) — tambahan 3 loop
2. Terima versi terbaik sekarang ([X]/18)

Ketik nomor (1-2).
```

**Jika user pilih 1 (Loop lagi):**
- Reset `loop_count = 0`
- Gunakan strategi yang BERBEDA dari 3 loop sebelumnya (jika loop 1-3 fokus fix hook, loop 4-6 coba angle yang sama sekali berbeda)
- Jika sudah 2 cycle (6 loop total) dan masih belum max → WAJIB accept, tampilkan warning

**Jika user pilih 2 (Terima sekarang):**
- Output versi terbaik (BUKAN versi terakhir — gunakan Stability Tracker best_content)
- Jika skor < 16/18, tampilkan warning: "⚠️ BELOW MAX-OUT TARGET"
- Catat di learning log sebagai "near-miss" + analisis root cause

**⚠️ v9.5 STABILITY CHECK — WAJID di SETIAP AKHIR LOOP:**

```
═══ STABILITY CHECK (setelah setiap re-judge) ═══
Loop #[N] skor: [X]/18
Best score so far: [Y]/18 (loop #[M])
Perubahan: [+N / -N / 0] dari skor terbaik

→ Jika skor_naik: UPDATE best_score, LANJUT loop
→ Jika skor_sama: LANJUT 1 loop lagi (boleh stagnan 1x)
→ Jika skor_turun: ⚠️ STABILITY ALERT → REVERT ke best_content
```

**⚠️ v9.5 STABILITY RULES:**
1. **Jika skor TURUN dari best_score** → AUTO-REVERT ke best_content. TANYA user: "Skor turun dari [best]/18 ke [current]/18 setelah loop #[N]. Revert ke versi terbaik dan terima?"
2. **Jika skor SAMA 2x berturut-turut** → STOP. "Skor stagnan di [X]/18 setelah 2 loop. Lanjut loop atau terima?"
3. **Jangan PERNAH output versi yang lebih buruk dari best_score.** Stability tracker memastikan ini.
4. **Edge case:** Jika skor turun TAPI best_score sudah di-loop #0 (awal), dan loop #1 menghasilkan skor yang lebih rendah → jangan loop lagi. Tanya user.

**⚠️ HALT AND ASK trigger tambahan selama feedback loop:**
- Jika setelah loop ke-2 skor TIDAK NAIK atau bahkan TURUN → **STOP dan TANYA user**: "Skor tidak membaik setelah 2x feedback loop ([X]/18 → [Y]/18). Mau saya coba angle yang sama sekali berbeda, atau sudah cukup dengan versi terbaik sekarang?"
- Jangan lanjut ke loop ke-3 jika polanya jelas tidak membaik — itu buang-buang resource dan user time.
- **STABILITY ALERT selalu override loop counter.** Jika skor turun, STOP terlepas dari berapa loop tersisa.

---

### STEP 11: Final Output

**⏱ Estimated time: 10-20 seconds** (formatting only — no external calls)

**CRITICAL: The output MUST be formatted so the user can COPY-PASTE the content DIRECTLY to X/Twitter without ANY modification.**

**⚠️ FINAL OUTPUT SANITIZATION (v11.4):** Sebelum konten ditampilkan ke user, jalankan final sanitization check:
1. Em dash (—): ZERO allowed → replace with comma
2. En dash (–): ZERO allowed → replace with hyphen
3. Double hyphen (--) between words: ZERO allowed → replace with comma
4. Smart quotes: ZERO allowed → replace with straight quotes
5. Markdown formatting: ZERO allowed → strip all #, *, etc.

This applies to ALL output: konten, Q&A, summary, analysis text.

**After this step completes:** Update checkpoint: (⚠️ SKIP if Smart Resume cache loaded) add `11` to `completed_steps`. Pipeline COMPLETE. Clean up checkpoint (optional: keep for reference).

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
  "content_type": "tweet|thread",  // Use format_chosen from Step 4.5 #9 (v9.9)
  "content": "string — konten final (X-ready, plain text)",
  "score": "number — skor final adjusted (contoh: 16.5)",
  "grade": "string — S+/S/A/B/C/D/F",
  "language": "string — bahasa konten (en/id/dll)",
  "style_energy": "string — banger/casual/analytical",
  "category_breakdown": {
    "originality": "X/2",
    "content_alignment": "X/2",
    "accuracy": "X/2",
    "compliance": "X/2",
    "engagement": "X/5",
    "technical_quality": "X/5"
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

**⚠️ SCORING FORMAT MIGRATION (v11.5):** Content history may contain entries with old scoring formats:
- v10.0 format: max 21/21 (with Reply Quality as separate category) — LEGACY
- v11.0+ format: max 18/18 (Reply Quality merged into Engagement)

When displaying history, normalize ALL scores to 18/18 format:
- If total > 18 → old format, re-display as "[original_score]/21 (old v10.0 format)"
- Category names: "Reply Quality" → merged into "Engagement Potential"

Do NOT modify historical entries. Only normalize display.

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
- NO Unicode ellipsis (…) -- use three periods (...) instead
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

**If contentType = "thread" OR format_chosen = "thread" (multiple tweets):**

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
Judge Method: [#1 LLM / #1b Direct Subagent / #2 Qwen Promoted]
J1 (Harsh Critic):  [X]/18.0 ([Y]%)  [LLM/Subagent]
J2 (Avg X User):    [X]/18.0 ([Y]%)  [LLM/Subagent]
J3 (Rally Clone):   [X]/18.0 ([Y]%)  [LLM/Subagent]
J4 (Contrarian):    [X]/18.0 ([Y]%)  [LLM/Subagent]
J5 (AI Detector):   [X]/2 Originality only
J6 (Self-Judge):    [X]/18.0 ([Y]%)  [Main AI, full context]
J7 (Qwen):          [X]/18.0 ([Y]%)  [optional/promoted]
Consensus:          [X]/18.0 ([Y]%)  [min gates, avg quality, [N] judges]
G4 Adjustment:      [+/N] points
X-Factor:           +[N] points
Adjusted:           [X]/18.0 ([Y]%) -- Grade [grade]
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

═══ G4 ORIGINALITY ═══
Bonuses: [list]
Penalties: [list]
Net: [+/N]

═══ X-FACTOR ═══
[list detected factors]

═══ ALL VARIATIONS SCORED ═══
[A] A:[X]/18 B:[X]/18 Cons:[X]/18 Adj:[X]/18 -- [grade] -- [verdict]
[B] A:[X]/18 B:[X]/18 Cons:[X]/18 Adj:[X]/18 -- [grade] -- [verdict]
[C] A:[X]/18 B:[X]/18 Cons:[X]/18 Adj:[X]/18 -- [grade] -- [verdict]

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
5. Jika konten sudah S+ (16+/18), tampilkan "Konten sudah S+. Tidak ada perbaikan kritis." dan skip Prioritas.

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

[N]. [Campaign Name] | [Tanggal] | Skor: [X]/18 ([Grade]) | [Bahasa]
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
Skor konten: [X]/18 ([Grade])
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

### Step Q7a: Q&A Sanitization (v11.4 — MANDATORY)

**TUJUAN:** Jalankan sanitization check yang sama dengan konten pipeline pada SEMUA 20 Q&A.

**CEK WAJIB untuk setiap Q&A:**
- ❌ Em dash (—, \u2014) → ganti dengan koma atau titik
- ❌ En dash (–, \u2013) → ganti dengan hyphen
- ❌ Double hyphen (--) antar kata → ganti dengan koma
- ❌ Smart quotes (" ") → ganti dengan straight quotes
- ❌ AI words (delve, leverage, paradigm, dll) → rewrite
- ❌ Template hooks (unpopular opinion, dll) → rewrite

**PROSES:** Jalankan programmatic scan via Bash/Python (sama seperti All-In-One Verification di Step 6.5).

**OUTPUT:**
```
═══ Q&A SANITIZATION ═══
Total Q&A scanned: 20/20
Em dash found: [N] → FIXED
En dash found: [N] → FIXED
Smart quotes found: [N] → FIXED
AI words found: [N] → FIXED
All clean: YA/TIDAK
```

**⚠️ JIKA tidak clean → FIX sebelum Step Q7b.**

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
  Sanitization check (zero en/em dashes, smart quotes, AI words): [N]/20 ✅/❌ (target: 20/20)
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
  Rally Total: [X]/18

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
    "technical": [rally - internal]
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

**LLM skill returns 401 (auth error):**
- Auto-switch to #1b (Direct Task Subagent) — subagents inherit auth from AI Assistant parent
- If #1b also fails → promote chat.qwen.ai (J7) from tiebreaker to active judge
- If ALL fail → STOP, ask user to choose from 3 variations without scores
- **Root cause:** z-ai-web-dev-sdk requires X-Token only available in AI Assistant runtime

**chat.qwen.ai tiebreaker fails (page doesn't load / timeout):**
- Not critical — judge panel (J1-J6) already completed
- Skip J7 and use available consensus
- If consensus is already clear (range <= 4pts), J7 wouldn't have been triggered anyway

**Qwen returns non-JSON:**
- Extract scores from plain text
- Parse "PASS"/"FAIL" mentions

**LLM judge returns unexpected scores:**
- If a judge scores total > 18, clamp to 18
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

**Some LLM/subagent judges fail (3-5 out of 6 complete):**
- Proceed with available judges (min 3 required)
- Note in output which judges failed and which method was used
- Still apply G4 + X-Factor adjustments

**Most judges fail (< 3 complete):**
- If LLM skill caused the failure, try #1b (Direct Task Subagent) as recovery
- If #1b also produces < 3 judges → promote chat.qwen.ai (J7) to active judge
- If STILL < 3 judges → STOP execution. Present the 3 content variations to the user WITHOUT any scores.
- Ask the user to pick which variation they prefer.
- Example message: "Judge panel gagal (hanya [N]/6 berhasil). Berikut 3 variasi konten tanpa skor. Pilih yang kamu suka."

**AI self-judge bias:**
- In v8.0, Self-Judge (J6) is ONE of 6 judges, not the only judge
- min() consensus formula neutralizes self-bias (if J6 gives 2/2 but others give 1/2, consensus = 1/2)
- J6's unique value is meta-quality insight (knows the thought process behind writing)
- 5 other persona judges provide independent counterbalance
