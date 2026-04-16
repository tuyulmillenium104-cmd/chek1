# Rally Brain v8 — Project Context

## Current State
- Version: v8 (total rewrite dari v7 yang flawed)
- Status: BUILDING — arsitektur baru sedang dibangun
- Git branch target: v8-learn-judge-pipeline

## Session History
- Session 1 (design): Diagnosa masalah v7, desain arsitektur v8 3-session pipeline
- Session 2 (failed): Percobaan implementasi, git merge conflict, index corrupt, SEMUA tool terblokir total, 0 kode berhasil ditulis
- Session 3+ (current): Implementasi v8 dari ARCHITECTURE.md

## What was wrong with v7
1. Learn hanya pakai score angka, analysis text dari judge diabaikan total
2. parseSubmission() simpan analysis tapi tidak pernah dipakai downstream
3. Learn tidak persistent (Map expiry 10 menit, hilang saat restart)
4. Learn tidak terhubung ke Generate (Generate baca static v7_knowledge.json)
5. Tidak ada Judge validation
6. Tidak ada cron/automasi

## What v8 fixes
1. Learn ekstrak analysis TEXT → Knowledge DB persistent (JSONL file)
2. Knowledge DB tumbuh makin tajam seiring akumulasi data
3. Learn terhubung ke Generate via patterns.json
4. 3-session pipeline: Learner (analitik) → Generator (kreatif) → Judge (kritis)
5. Anti-bias: Generator tidak lihat rubrik, Judge blind
6. Anti-detection: 32 banned words, 21 templates, 42 replacements
7. Cron Learn untuk akumulasi data otomatis
8. Scoring categories match real Rally.fun API (4 gates + 2 quality + 6 engagement)

## Critical Lessons Learned
- JANGAN biarkan git merge conflict dibiarkan — SELALU commit sebelum session berakhir
- Jika git index corrupt, semua tool terblokir total, tidak ada yang bisa dijalankan
- SELALU tulis ARCHITECTURE.md dan GUIDELINES.md di awal — ini lifeline untuk AI session lain

## Rally.fun API Discovery (Session 3)
- Base URL: https://app.rally.fun/api (NO AUTH REQUIRED)
- Campaigns: GET /api/campaigns (paginated)
- Campaign detail: GET /api/campaigns/{address} (includes knowledgeBase, missions, rules, style, weights)
- Submissions: GET /api/submissions?campaignAddress={address} (includes full analysis per category)
- Scores in atto format (18 decimals, divide by 1e18)
- Real scoring: 4 Gates (max 2) + 2 Quality (max 5) + 6 Engagement metrics
