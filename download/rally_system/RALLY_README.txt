# RALLY AUTONOMOUS CONTENT SYSTEM - INSTRUCTION FILE
# Versi 4.0 | 11 April 2026
# v4.0 changes: Cross-Cycle Memory Loading, 5 variations, anti-miss checklist, updated to match SKILL.md v13.0

## APA INI?
Ini adalah sistem AI otomatis untuk membuat konten Rally.fun yang bernilai 18/18.
Sistem ini dirancang agar AI di chat BARU bisa langsung melanjutkan kerja tanpa perlu context dari chat sebelumnya.
Sistem BELAJAR dari setiap campaign dan semakin pintar seiring waktu.

## CARA KERJA
1. Baca file ini → tahu semua yang perlu dilakukan
2. Baca rally_master.json → tahu status saat ini
3. Baca worklog → tahu apa yang sudah dikerjakan
4. Baca knowledge_vault.json → pelajaran dari campaign sebelumnya
5. Baca learning_log.jsonl → error dan improvement terakhir
6. Baca rally_all_variations.json → semua variasi + skor dari campaign sebelumnya
7. Baca rally_all_variations_new.json → semua variasi + skor dari campaign baru
8. Baca rally_best_content.txt → konten terbaik + judge breakdown
9. Lanjutkan dari mana terakhir berhenti

## FILE YANG PERLU DIBACA (URUTAN)

### WAJIB BACA PERTAMA:
1. `/home/z/my-project/download/rally_system/rally_master.json`
   → Otak pusat. Berisi: campaign aktif, mission, target skor, status pipeline, lokasi semua file lain.

### WAJIB BACA KEDUA:
2. `/home/z/my-project/download/rally_system/rally_worklog.md`
   → Catatan semua yang sudah dilakukan AI sebelumnya.

### WAJIB BACA KETIGA (SEBELUM GENERATE KONTEN):
3. `/home/z/my-project/download/rally_system/rally_knowledge_vault.json`
   → Cross-campaign knowledge vault. Pelajaran dari SEMUA campaign yang pernah dikerjakan.
   → BACA SEBELUM generate konten. Terapkan pelajaran di sini.

4. `/home/z/my-project/download/rally_system/rally_learning_log.jsonl`
   → Log error dan improvement dari cycle sebelumnya.
   → BACA SEBELUM generate konten. Hindari error yang sama.

### BACA KALAU PERLU:
5. `/home/z/my-project/download/rally_system/rally_pattern_cache.json`
   → Pattern dari submission Rally yang sudah dianalisis

6. `/home/z/my-project/download/rally_system/rally_best_content.txt`
   → Konten terbaik yang sudah ada (kalau sudah ada 18/18)

7. `/home/z/my-project/download/rally_system/rally_qna/rally_qna.json`
   → Q&A yang sudah digenerate untuk konten winner

8. `/home/z/my-project/download/rally_system/rally_all_variations.json`
   → Semua variasi konten yang pernah dibuat + skor masing-masing

9. `/home/z/my-project/download/rally_system/rally_submissions_cache.json`
   → Cache submission data dari Rally API

10. `/home/z/my-project/skills/rally/SKILL.md`
    → Skill file lengkap (pipeline, judge rubric, anti-AI rules, Q&A generator, dll)

11. `/home/z/my-project/skills/rally/references/pipeline_full.md`
    → Full pipeline reference (18 steps, detailed instructions)

12. `/home/z/my-project/skills/rally/references/pattern_library.md`
    → Universal Pattern Library (hooks, angles, techniques)

13. `/home/z/my-project/skills/rally/references/anti_ai_rules.md`
    → Anti-AI rules (23 banned words, template phrases, detection)

14. `/home/z/my-project/download/rally_system/rally_all_variations_new.json`
    → Semua variasi dari campaign BARU + skor masing-masing

## KETIKA USER KETIK `/rally`

SELALU tampilkan menu ini dulu. JANGAN langsung aksi apapun.
User cuma perlu ingat SATU kata: `/rally`

```
Rally Command Center v13.1

Pilih:
1. 📝 Buat Konten Baru        — Generate konten untuk campaign Rally
2. 🏆 Konten Terbaik           — Lihat konten terbaik + skor breakdown
3. 📊 Status Campaign          — Cek skor, deadline, jumlah submissions
4. 🔍 Monitor                 — Cek pattern terbaru dari kompetitor
5. 🧠 Belajar dari Kompetitor — Input konten top scorer untuk dipelajari
6. 🎯 Calibration             — Input skor Rally asli untuk kalibrasi
7. ❓ Q&A Generator           — Buat Q&A dari konten yang sudah ada
8. 📈 Dashboard               — Buka dashboard web
9. ⚙️ Setup Cron              — Atur jadwal cron BUILD/MONITOR

Ketik nomor (1-9).
```

### Jika user pilih 1 (Mulai campaign baru):
- BACA rally_knowledge_vault.json TERLEBIH DAHULU (terapkan pelajaran campaign sebelumnya)
- Tampilkan daftar campaign aktif dari Rally API
- Format: nomor, nama campaign, reward, deadline, jumlah mission
- User pilih nomor campaign
- Jika campaign punya >1 mission, tampilkan daftar mission
- User pilih nomor mission
- Update rally_master.json dengan campaign + mission terpilih
- Set pipeline_state: "needs_first_run"
- JALANKAN PIPELINE LANGSUNG (bukan nunggu cron)
- Kerja sampai 18/18
- SETELAH 18/18: langsung jalankan Q&A Generator (Step 13)
- Setup cron job monitoring (cek pola baru tiap 6 jam)
- Simpan pelajaran ke knowledge_vault.json

### Jika user pilih 2 (Konten Terbaik):
- Baca rally_best_content.txt
- Tampilkan konten terbaik + skor breakdown 6 dimensi
- Format tabel: variation, hook style, angle, skor per dimensi, total
- Jika belum 18/18: tampilkan status + "Belum dapat 18/18. Skor terbaik: X/18."

### Jika user pilih 3 (Status Campaign):
- Baca rally_master.json
- Tampilkan: campaign, mission, skor terbaik, deadline, total submissions, total cycle, status (stopped/working/content_ready), error terakhir
- Tampilkan: learning stats (berapa campaign dikerjakan, skor rata-rata, improvement rate)
- Jika ada konten 18/18: tampilkan juga preview 1 kalimat
- Jika ada Q&A: tampilkan "Q&A tersedia (20 jawaban)"

### Jika user pilih 4 (Monitor):
- Fetch submissions terbaru dari Rally API
- Bandingkan score distribution vs konten kita
- Cek pattern baru dari top scorer
- Ringkas dalam tabel
- Jika perlu rework: sarankan ke user

### Jika user pilih 5 (Belajar dari Kompetitor):
- Masuk ke LEARN MODE (lihat SKILL.md ## LEARN MODE)
- Minta input konten kompetitor dari user
- Validasi skor TRUE Quality (6 dimensi, max 18)
- Analisis hook pattern, angle, writing technique
- Update knowledge_vault.json dengan patterns

### Jika user pilih 6 (Calibration):
- Tanya user: "Berapa skor dari Rally? (contoh: 16/18)"
- Tanya detail: "Skor per dimensi? (O:? A:? Ac:? C:? E:? T:?)"
- Simpan ke learning log
- Compare internal estimate vs actual Rally score
- Jika ada gap > 1 point di dimensi manapun → catat ke knowledge_vault sebagai "calibration lesson"
- Adjust calibration untuk next run
- Update knowledge_vault.json dengan skor asli

### Jika user pilih 7 (Q&A Generator):
- Jalankan Q&A pipeline (lihat SKILL.md references/qna_generator.md)
- Baca rally_qna/rally_qna.json
- Jika sudah ada: tampilkan 20 Q&A siap copy-paste dengan kategori
- Jika belum ada: "Q&A belum ada. Konten harus 18/18 dulu. Jalankan pipeline dulu."

### Jika user pilih 8 (Dashboard):
- Jalankan references/dashboard.md
- Tampilkan link dashboard web
- Atau tampilkan status real-time dari rally_master.json

### Jika user pilih 9 (Setup Cron):
- Bantu user setup cron jobs untuk BUILD mode (setiap 6 jam) dan MONITOR mode (setiap 4 jam)
- Tampilkan cron job IDs dan schedule
- Konfigurasi timezone (default: Asia/Jakarta)

## COMMAND ALTERNATIF (shortcut)
Selain menu di atas, user juga bisa langsung ketik:
- `/rally` → tampilkan menu
- `/rally start` → sama seperti pilih 1
- `/rally status` → sama seperti pilih 3
- `/rally score [X]/18` → sama seperti pilih 6
- `/rally qna` → sama seperti pilih 7
- `/rally monitor` → sama seperti pilih 4

## TARGET
- Skor: 18/18 (SEMUA dimensi max, bukan kurang)
- Originality: 2/2
- Alignment: 2/2
- Accuracy: 2/2
- Compliance: 2/2
- Engagement: 5/5
- Technical: 5/5

## API ENDPOINTS
- Campaigns: https://app.rally.fun/api/campaigns
- Campaign Detail: https://app.rally.fun/api/campaigns/{contractAddress}
- Missions: https://app.rally.fun/api/missions?campaignId={campaignId}
- Submissions: https://app.rally.fun/api/submissions?campaignAddress={contractAddress}&limit=200

## PIPELINE YANG HARUS DIJALANKAN (18 STEP - v4.0)

### PRE-PIPELINE: Load Knowledge + Memory (v4.0)
- Baca rally_knowledge_vault.json
- Baca rally_learning_log.jsonl (10 entry terakhir)
- Baca rally_all_variations.json (SEMUA variasi dari campaign sebelumnya + skor)
- Baca rally_all_variations_new.json (SEMUA variasi dari campaign baru + skor)
- Baca rally_best_content.txt (konten terbaik + judge breakdown)
- Identifikasi pelajaran yang relevan:
  * Dimensi mana yang sering gagal?
  * Hook/angle apa yang sudah overused?
  * Hook/angle apa yang SUDAH DIPAKAI di variasi sebelumnya?
  * Teknik apa yang berhasil di campaign sebelumnya?
  * Calibration: apakah internal judge bias? (saat ini Engagement -1.0)
- BUILD "DO NOT REPEAT" list dari pola gagal
- BUILD "DO MORE OF" list dari pola menang
- Terapkan pelajaran ke strategi generate konten

### Step 0: Real-Time Intelligence (BARU di v3.0 - WAJIB)
SEBELUM generate atau monitor, kumpulkan intel terbaru dari web:

**0A: Web Search Intelligence**
Gunakan web-search skill untuk cari:
- "Rally.fun" site:x.com → postingan terbaru di X tentang Rally
- "Rally beta" atau "Rally.fun Base" → berita/announcement terbaru
- "GenLayer AI blockchain" → update terbaru tentang infrastruktur Rally
Simpan hasil ke rally_intel_cache.json

**0B: Agent Browser Scouting**
Gunakan agent-browser skill untuk:
- Buka https://app.rally.fun → cek campaign page, screenshot leaderboard
- Cek apakah ada campaign BARU yang aktif
- Baca rules/update campaign (bisa berubah!)
- Jika ada fitur baru Rally → catat untuk potensi angle baru

**0C: Content Intel from Competitors**
Gunakan web-reader skill untuk:
- Ambil URL tweet dari top 5 scorers (dari submission data)
- Baca konten lengkap mereka
- Analisis writing style: hook pattern, sentence length, tone, specificity
- Bandingkan dengan konten kita → identifikasi gap atau overlap
- Update knowledge_vault dengan findings (kompetitor_writing_patterns)

**0D: Intel Synthesis**
Dari 0A + 0B + 0C, extract:
- breaking_news: ada berita baru tentang Rally? (YA/TIDAK, detail)
- trending_angles: angle apa yang sedang trending di X?
- competitor_patterns: pola writing apa yang top scorers pakai?
- campaign_updates: ada perubahan rules/fiture campaign?
- new_hook_opportunities: hook ideas dari trending/breaking news

INTEGRASI ke Step 3 (Deep Analysis) dan Step 4 (Generate):
- Jika breaking_news: pertimbangkan sebagai hook
- Jika trending_angles: hindari (overused) atau riff off (contrarian)
- Jika competitor_patterns: pastikan konten kita BERBEDA
- Jika campaign_updates: CEK COMPLIANCE terhadap rules baru

### Step 1: Fetch Data
```
curl -s "https://app.rally.fun/api/campaigns/{contractAddress}"
curl -s "https://app.rally.fun/api/submissions?campaignAddress={contractAddress}&limit=200"
```
- Simpan submissions ke rally_submissions_cache.json
- Parse semua analysis data (6 kategori scoring)
- Cek campaign end_date vs sekarang → jika SUDAH LEWAT → pipeline_state = "expired"

### Step 2: Analyze Patterns
- Hitung score distribution (min, max, avg, median)
- Identifikasi top performers dan APA yang bikin mereka menang
- Identifikasi hook patterns yang skor tinggi vs rendah
- Identifikasi overused angles (hindari) → bandingkan dengan knowledge_vault
- Identifikasi unique gaps (peluang) → bandingkan dengan knowledge_vault
- Simpan ke rally_pattern_cache.json

### Step 3: Deep Analysis (Step 4.5 dari skill v11.7)
- Baca knowledge base, rules, description, additional info
- Baca knowledge_vault untuk pelajaran campaign sebelumnya
- Tentukan: core message, value props, style energy, unique angle
- Tentukan FORMAT DECISION (single post vs thread)
- Simpan ke worklog dengan format PROOF

### Step 3.5: Cross-Cycle Memory Loading (BARU di v4.0 - KRITIS)
SEBELUM generate konten, WAJIB load semua data dari cycle sebelumnya:

1. Baca rally_all_variations.json — SEMUA variasi + skor dari campaign sebelumnya
2. Baca rally_all_variations_new.json — SEMUA variasi + skor dari campaign baru
3. Baca rally_best_content.txt — konten terbaik + judge breakdown
4. Baca rally_learning_log.jsonl — 10 entry terakhir
5. Extract dari setiap variasi sebelumnya:
   - Skor per dimensi (mana yang gagal?)
   - Hook style yang dipakai (hindari pengulangan)
   - Angle yang dipakai (hindari pengulangan)
   - AI fingerprint yang terdeteksi
6. BUILD "DO NOT REPEAT" list dari pola yang gagal
7. BUILD "DO MORE OF" list dari pola yang menang

### Step 4: Generate 5 Variations (2 Free Write + 3 Targeted)
- Variation A: Free Write (personal voice, no template)
- Variation B: Free Write (different personal angle)
- Variation C: Targeted (specific angle dari gap analysis + knowledge_vault)
- Variation D: Targeted (contrarian approach, different angle)
- Variation E: Targeted (emotional/story-driven, different angle)
- WAJIB: setiap variasi punya HOOK BERBEDA (no two same opener pattern)
- WAJIB: setiap variasi punya ANGLE BERBEDA dari proposed_angles list
- WAJIB: personal anecdote dengan ANGKA SPESIFIK
- WAJIB: 2-3 questions DISTRIBUSI (bukan semua di akhir)
- WAJIB: 180-220 words (1300-1700 chars)
- WAJIB: paragraph CV > 0.30
- WAJIB: hindari semua AI words (delve, leverage, paradigm, tapestry, landscape, dll)
- WAJIB: hindari overused hooks dari knowledge_vault
- WAJIB: reply-worthy ending (specific question, bukan generic "what do you think")

### Step 4.1: Anti-Miss Checklist (BARU di v4.0 - WAJIB sebelum generate)
Cek SETIAP variasi terhadap SEMUA checklist sebelum submit:
□ Opening: NOT generic ("everyone knows", "in web3", "the future is")
□ Opening: NOT template phrase ("hot take", "unpopular opinion", "let's dive in")
□ Opening: NOT banned starter ("honestly", "ngl", "tbh", "kind of wild")
□ Opening: NOT starts with @mention or #hashtag
□ Questions: At least 2 questions distributed (NOT all at end)
□ Questions: NOT generic ("what do you think?", "thoughts?")
□ Questions: At least 1 question with NO obvious answer
□ Personal: At least 1 specific personal detail (number, date, name)
□ Voice: Contractions present (don't, can't, won't, I'm, that's)
□ Voice: Mixed sentence lengths (3-word AND 20-word sentences)
□ Voice: NOT all lowercase, NOT all uppercase
□ Structure: Paragraph CV > 0.30 (varied lengths)
□ Compliance: @RallyOnChain present naturally in body
□ Compliance: NO em-dash (—), en-dash (–), or double-hyphen (--)
□ Compliance: NO hashtags
□ Compliance: Does NOT start with @mention or #hashtag
□ AI-check: ZERO words from AI banned list (23 words)
□ AI-check: ZERO template phrases (10 phrases)
□ AI-check: ZERO banned Q&A phrases
□ Engagement: Hook FORCES stop-scroll
□ Accuracy: ALL claims verifiable from KB
□ Accessibility: NOT too technical for casual readers
□ Length: 180-220 words, 1300-1700 chars

Simpan ke rally_all_variations.json

### Step 5: Self-Verification (Step 6.5 HARD FORMAT GATE)
- Cek: format, post count, char limit, content focus, mandatory includes, prohibited items
- WAJIB: @RallyOnChain ada di konten
- WAJIB: minimal 1 aspek konkret tentang cara project bekerja dijelaskan
- WAJIB: tidak ada em-dash, hashtag, atau AI patterns
- WAJIB: tidak mulai post dengan mention atau hashtag
- Cek per-word AI scan
- Jika FAIL → rewrite sebelum lanjut

### Step 6: Factual Claim Pre-Check (Step 6.6)
- Validasi semua klaim tentang protocol, fitur, scoring, campaigns
- Jika tidak ada sumber → hedging ("as far as I can tell")
- Jangan memalsukan data

### Step 7: Programmatic Verification (Step 6.7)
- Jalankan via Bash: sanitasi (hapus em-dash, smart quotes) + paragraph CV + AI word scan + word count

### Step 8: Multi-Judge Panel (Step 7)
- 5 judges via Task tool (parallel): Harsh Critic, Average User, Rally Clone, Contrarian, AI Detector
- 1 Self-Judge (langsung di conversation)
- Score setiap variation di 6 kategori
- Jika judge gagal → retry

### Step 9: Consensus + Select Winner
- Ambil min() untuk binary gates (Originality, Alignment, Accuracy, Compliance)
- Ambil average() untuk quality (Engagement, Technical)
- Pilih variation dengan skor total tertinggi

### Step 10: Jika belum 18/18 → Feedback Loop
- Analisis root cause: dimensi mana yang kurang?
- Baca learning_log → apakah error ini pernah terjadi? apa solusinya?
- Rewrite variation terbaik dengan strategi berbeda
- Re-judge
- Max 3 loop per cycle

### Step 11: Save Best
- Jika skor >= 18/18 → simpan ke rally_best_content.txt
- Update rally_master.json (current_best score)
- Update worklog
- Tandai pipeline_state: "content_ready"

### Step 12: Q&A Generator (BARU di v2.0 - WAJIB setelah 18/18)
- Fetch ulang campaign data (KB, style, requirements)
- Generate 20 Q&A (6 REPLY, 5 ORIGINALITY, 5 ENGAGEMENT, 4 DEPTH)
- Setiap Q&A WAJIB: spesifik ke konten, natural X voice, fakta dari KB
- Step Q7: Accuracy Verification (semua jawaban vs KB)
- Step Q7a: Sanitization (zero em-dash, AI words, template phrases)
- Step Q7b: Quality Self-Check (distribusi, personal tone, spesifik, singkat)
- Simpan ke rally_qna/rally_qna.json
- Update rally_master.json (qna_generated: true)

### Step 13: Update Learning + Knowledge Vault (BARU di v2.0)
- Tambahkan entry ke rally_learning_log.jsonl (skor, feedback loops, errors, improvements)
- Extract pelajaran dari campaign ini → simpan ke rally_knowledge_vault.json:
  * winning_angle: angle yang berhasil dapat 18/18
  * failing_dimensions: dimensi yang sering gagal + solusinya
  * overused_hooks: hooks yang terlalu sering dipakai di campaign ini
  * new_patterns: pola baru dari submission analysis
  * calibration_data: internal score vs (jika ada) Rally actual score
  * techniques_that_worked: teknik writing yang berhasil
  * techniques_that_failed: teknik writing yang gagal
- Update rally_master.json (knowledge_updated: true)

### Step 14: Campaign Completion Check (BARU di v2.0)
- Cek campaign end_date
- Jika sudah lewat deadline:
  * Set pipeline_state: "expired"
  * Catat ke knowledge_vault: campaign summary + final score
  * MONITOR cron akan otomatis skip campaign expired
- Jika belum lewat:
  * MONITOR cron tetap aktif

## ANTI-AI RULES (WAJIB DIPATUHI)
Kata-kata ini HARAM dalam konten DAN Q&A:
- delve, leverage, paradigm, tapestry, landscape, nuance, crucial, pivotal, embark, harness, foster, utilize, elevate, streamline, empower, comprehensive, realm, flywheel, ecosystem, unpack, navigate, pioneering
- Template phrases: key takeaways, let's dive in, nobody is talking about, here's the thing, picture this, at the end of the day, hot take, unpopular opinion, thread alert
- Banned starters: honestly, like, kind of wild, ngl, tbh, tbf, fr fr, lowkey
- Banned Q&A phrases: "the KB says", "according to the docs", "from what I've read", "the campaign materials say"

## HALT AND ASK RULE
Jika ada sesuatu yang TIDAK BERJALAN:
- API error → catat ke worklog + learning_log, coba lagi di cycle berikutnya
- Judge gagal → catat, retry dengan fallback
- Data kosong → catat, lanjut dengan yang ada
- JANGAN pura-pura berhasil. JANGAN fabrikasi data.

## SETIAP SELESAI CYCLE → UPDATE FILE:
1. rally_master.json (status, skor, timestamp, knowledge stats)
2. rally_worklog.md (append entry baru)
3. rally_pattern_cache.json (kalau ada data baru)
4. rally_best_content.txt (kalau dapat 18/18)
5. rally_qna/rally_qna.json (kalau generate Q&A - WAJIB setelah 18/18)
6. rally_all_variations.json (kalau buat variasi baru)
7. rally_learning_log.jsonl (append error/success log)
8. rally_knowledge_vault.json (kalau ada pelajaran baru - WAJIB setelah 18/18)

## KETIKA USER CHAT BARU DAN KETIK `/rally`:
1. Baca /home/z/my-project/download/rally_system/RALLY_README.txt (FILE INI)
2. Baca /home/z/my-project/download/rally_system/rally_master.json
3. Tampilkan MENU (lihat section "KETIKA USER KETIK /rally" di atas)
4. Tunggu user pilih nomor
5. Kerjakan sesuai pilihan user

## CRON JOB BEHAVIOR (v4.0)

### MODE 1: BUILD (setelah user pilih "Mulai")
- BACA knowledge_vault.json + learning_log.jsonl + rally_all_variations.json + rally_all_variations_new.json SEBELUM generate (PRE-PIPELINE)
- Step 0: Real-Time Intelligence → web-search, agent-browser, web-reader
  * web-search: cari trending Rally content di X, berita terbaru
  * agent-browser: buka Rally.fun, cek campaign page + leaderboard
  * web-reader: baca konten top scorers, analisis writing patterns
  * Simpan ke rally_intel_cache.json
  * Gunakan intel untuk: hook ideas, hindari overused angles, discover breaking news
- Kerja terus sampai dapat 18/18
- Setiap cycle: load knowledge + memory → intel check → fetch data → analyze → generate 5 variations → verify → judge
- Kalau belum 18/18: feedback loop max 3x (pakai pelajaran dari learning_log + memory) → generate lagi
- Kalau 3 feedback loops tetap < 18/18: save best, log why, set pipeline_state="working", next cycle = 5 fresh variations
- Setiap variation WAJIB lulus anti-miss checklist (Step 4.1) sebelum submit ke judge
- Kalau SUDAH 18/18:
  1. Simpan ke rally_best_content.txt
  2. JALANKAN Q&A Generator (Step 12) → simpan ke rally_qna/rally_qna.json
  3. Update knowledge_vault.json dengan pelajaran campaign ini
  4. Set pipeline_state: "content_ready"
- Cek deadline: jika sudah lewat → set "expired", skip MONITOR setup

### MODE 2: MONITOR (setelah dapat 18/18, DAN deadline belum lewat)
- BACA knowledge_vault sebelum analisis
- Step 0: Real-Time Intelligence (web-search + agent-browser + web-reader) → BARU di v3.0
  * Search "Rally.fun" di X → cek postingan terbaru
  * Browse Rally.fun → cek leaderboard, rules update
  * Baca konten top scorers baru → analisis writing patterns
  * Simpan ke rally_intel_cache.json
- Fetch submission baru dari Rally API
- ANALISIS CERDAS (bukan sekadar cek angka):
  * Ambil top 10 scorer BARU (yang tidak ada di cache sebelumnya)
  * Baca hook + angle mereka
  * Bandingkan dengan konten kita: apakah ada overlap angle?
  * Cek apakah ada hook style baru yang konsisten dapat skor tinggi
  * Cek apakah score rata-rata naik > 2% (signifikan)
  * BANDINGKAN dengan intel dari Step 0 → apakah ada trending angle baru yang perlu di-respons?
- KEPUTUSAN:
  - TIDAK ADA perubahan signifikan → LAKUKAN APA-APA, catat "no changes"
  - ADA angle overlap dengan konten kita → REWORK (generate ulang sampai 18/18, termasuk Q&A baru)
  - ADA pola hook baru yang dominan → pertimbangkan rework
  - ADA breaking news dari intel → pertimbangkan rework dengan hook baru
- CEK DEADLINE: jika waktu sekarang > campaign end_date → set "expired", STOP MONITOR
- Catat semua ke worklog + learning_log

### MODE 3: STOPPED (setelah user pilih "Stop")
- Cron job: fetch data saja untuk update pattern cache
- Simpan pattern update ke knowledge_vault (belajar terus meskipun stopped)
- TIDAK generate konten
- TIDAK judge
- Siap diaktifkan kembali kapan saja

### MODE 4: EXPIRED (BARU di v2.0 - campaign deadline lewat)
- Cron job: LAKUKAN APA-APA (skip cycle)
- Catat: "Campaign expired. No action needed."
- JANGAN fetch, generate, atau monitor
- User bisa mulai campaign baru kapan saja

## CONTINUOUS LEARNING SYSTEM (v4.0)

### Knowledge Vault (rally_knowledge_vault.json)
File ini menyimpan pelajaran dari SEMUA campaign yang pernah dikerjakan.
Setiap kali campaign selesai (18/18 atau expired), cron WAJIB update vault.

Struktur knowledge_vault:
```
{
  "version": "2.0",
  "total_campaigns_worked": N,
  "total_18_18_achieved": N,
  "avg_score_across_campaigns": X.XX,
  "campaigns": [
    {
      "campaign_name": "...",
      "contract_address": "...",
      "mission": "...",
      "final_score": N,
      "achieved_18_18": true/false,
      "cycles_needed": N,
      "winning_angle": "...",
      "failing_dimensions": [...],
      "techniques_that_worked": [...],
      "techniques_that_failed": [...],
      "overused_hooks_found": [...],
      "calibration": {"internal": N, "actual": N/null, "gap": N/null}
    }
  ],
  "cross_campaign_lessons": {
    "hardest_dimensions_ranked": ["Engagement", "Originality", ...],
    "best_hook_styles": [...],
    "best_angles_by_campaign_type": {...},
    "common_mistakes_to_avoid": [...],
    "judge_calibration_adjustments": {...},
    "writing_techniques_ranked": [...]
  }
}
```

### Learning Log (rally_learning_log.jsonl)
Setiap entry JSON (1 per baris):
```
{"timestamp":"...","type":"success|error|feedback|calibration|monitor","task_id":"...","details":{...}}
```

### Kalibration Loop (v2.0)
1. User kasih skor Rally asli (via `/rally score X/18`)
2. Bandingkan vs internal judge score
3. Jika gap > 1 point di dimensi manapun:
   - Catat ke learning_log sebagai "calibration_mismatch"
   - Catat ke knowledge_vault sebagai "calibration lesson"
   - Next generate: adjust internal scoring bias
4. Jika gap > 2 point: CATAT SEBAGAI "critical calibration issue"
   - Review judge rubric
   - Pertimbangkan adjust judge persona

### Self-Improvement per Cycle (v4.0)
SETIAP kali cron jalan (baik BUILD maupun MONITOR), SEBELUM generate:
1. Baca 10 entry terakhir dari learning_log.jsonl
2. Baca cross_campaign_lessons dari knowledge_vault
3. Baca rally_all_variations.json + rally_all_variations_new.json (SEMUA variasi sebelumnya)
4. Extract actionable rules:
   - "Originality sering gagal karena [X] → next time [Y]"
   - "Hook style [Z] consistently dapat 5/5 → pakai sebagai inspirasi"
   - "Teknik [W] gagal di 3 campaign berturut → HINDARI"
   - "Hook [H] sudah dipakai di variasi sebelumnya → JANGAN ULANGI"
   - "Angle [A] sudah dipakai → cari angle baru dari gap analysis"
5. BUILD "DO NOT REPEAT" dan "DO MORE OF" lists
6. Terapkan rules tsb ke content generation

## CRON JOB PROMPT (paste ini ke cron job):
```
Kamu adalah Rally Content Agent - sesi cron job otomatis.

INSTRUKSI WAJIB (JANGAN SKIP LANGKAH MANAPUN):

1. Baca /home/z/my-project/skills/rally/SKILL.md (v13.0)
2. Baca /home/z/my-project/skills/rally/references/pipeline_full.md (DETAILED 18-STEP PIPELINE)
3. Baca /home/z/my-project/download/rally_system/RALLY_README.txt
4. Baca /home/z/my-project/download/rally_system/rally_master.json
5. Baca /home/z/my-project/download/rally_system/rally_worklog.md
6. Baca /home/z/my-project/download/rally_system/rally_knowledge_vault.json
7. Baca /home/z/my-project/download/rally_system/rally_learning_log.jsonl
8. Cek pipeline_state DAN campaign deadline:
   - "expired" ATAU waktu sekarang > end_date → SKIP CYCLE, catat "expired", SELESAI
   - "stopped" → ambil submission data saja, update pattern cache + knowledge vault, SELESAI
   - "content_ready" → jalankan MODE 2 MONITOR (lihat README v4.0 untuk detail), SELESAI
   - "working" → jalankan MODE 1 BUILD (lihat README v4.0 untuk detail), SELESAI

=== V4.0: REAL-TIME INTELLIGENCE + CROSS-CYCLE MEMORY (WAJIB) ===
9a. BACA rally_all_variations.json + rally_all_variations_new.json (SEMUA variasi sebelumnya)
9b. BUILD "DO NOT REPEAT" dan "DO MORE OF" lists dari variasi sebelumnya
10. Step 0 - Intel Gathering (JALANKAN SEBELUM generate/monitor):
   a. web-search: cari "Rally.fun site:x.com", "Rally beta", "GenLayer AI blockchain"
      → Simpan hasil ke rally_intel_cache.json
   b. agent-browser: buka https://app.rally.fun → cek campaign, leaderboard, rules update
   c. web-reader: baca konten top 5 scorers baru → analisis writing patterns
   d. Intel Synthesis: breaking news, trending angles, competitor patterns, campaign updates
   e. INTEGRASI: gunakan intel untuk hook ideas, hindari overused angles, cek compliance

=== PIPELINE LANJUTAN ===
11. Jalankan pipeline sesuai mode (BUILD atau MONITOR) dari README v4.0
12. Setiap selesai → update SEMUA file:
   - rally_master.json (status, skor, timestamp, knowledge stats, intel stats)
   - rally_worklog.md (append entry baru)
   - rally_pattern_cache.json (kalau ada data baru)
   - rally_best_content.txt (kalau dapat 18/18)
   - rally_qna/rally_qna.json (kalau generate Q&A - WAJIB setelah 18/18)
   - rally_all_variations_new.json (kalau buat variasi baru)
   - rally_learning_log.jsonl (append error/success/calibration)
   - rally_knowledge_vault.json (kalau ada pelajaran baru)
   - rally_intel_cache.json (WAJIB - simpan intel dari Step 0)
13. JANGAN fabrikasi data. JANGAN pura-pura berhasil. JANGAN skip step.
14. Jika error → catat ke learning log + worklog → retry SEKALI → jika tetap error → skip cycle ini.
15. BELAJAR TERUS: baca knowledge vault + learning log + intel cache sebelum setiap generate. Terapkan pelajaran.

=== BUILD MODE TARGET ===
- TARGET: 18/18 (BUKAN 16/18, BUKAN "cukup baik")
- 5 variasi per cycle (2 Free Write + 3 Targeted)
- 3 max feedback loops per cycle
- Jika 3 loops tetap < 18/18 → save best, log why, set pipeline_state="working"
- Next cycle = 5 FRESH variations (bukan retry)
- Setiap cycle = independent fresh attempt

=== SKILL YANG HARUS DIGUNAKAN ===
- web-search: untuk cari trending topics, berita Rally terbaru
- agent-browser: untuk browse Rally.fun, cek leaderboard, screenshot campaign
- web-reader: untuk baca konten kompetitor secara detail
- z-ai-web-dev-sdk (web_search): di backend code untuk search
```
