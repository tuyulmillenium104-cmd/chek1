# PROJECT CONTEXT — BACA FILE INI DI SETIAP SESSION BARU

> File ini adalah "memori percakapan" antara user dan AI.
> User Indonesia, selalu gunakan Bahasa Indonesia.
> Di session baru, user cukup bilang: **"baca PROJECT_CONTEXT.md"**

---

## SIAPA USER
- Nama: tidak disebutkan
- Bahasa: Indonesia
- Fokus: ingin tampilan sederhana yang fungsional, bukan yang kompleks
- Gaya: langsung ke titik, tidak suka fitur berlebihan

---

## PROJEK INI: RALLY BRAIN v7

### Apa itu?
AI Content Generator untuk Rally.fun crypto campaigns. Pipeline:
**LEARN → GENERATE → EVALUATE → JUDGE → Q&A → OUTPUT**

### Scoring System
- 7 kategori penilaian
- Max 23 poin
- Target Grade S (21+ poin)
- Anti-detection: 32+ banned AI words, 21 template phrases, 42 auto-replace words

### Tech Stack
- **Frontend**: Next.js 16 App Router + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Backend**: Node.js (API routes)
- **AI**: z-ai-web-dev-sdk via custom HTTP client dengan 5 token pool rotation
- **Database**: SQLite via Prisma ORM (models: User, Post, RallyJob)
- **Config**: `next.config.ts` output: "standalone", `ignoreBuildErrors: true`

### Sumber Kode
- GitHub: `tuyulmillenium104-cmd/chek1` branch `v7-architecture`
- Sudah di-copy ke `/home/z/my-project/`
- Branch lain yang dieksplorasi: `rally-command-center-v17` (ditolak user karena terlalu kompleks)

---

## FRONTEND YANG SUDAH DIBANGUN (SIMPLIFIED)

### Alur Kerja
```
Search Campaign → Pilih → Start Learn → Start Generate → Lihat Hasil
```

### Fitur (HANYA ini, jangan tambah tanpa izin user)
1. **Campaign Search & Selector** — search input, list campaign, klik untuk pilih
2. **Cron Learn Trigger** — tombol Start Learn, polling progress real-time, learning insights
3. **Cron Generate Trigger** — tombol Start Generate, polling progress, auto-refresh results
4. **Results Viewer** — tab Content (score breakdown + text), Q&A pairs, History

### Yang DIHAPUS dari versi lama (user minta disederhanakan)
- Mission switching/tabs
- Competitive analysis
- Token pool status display
- Download center
- Real-time log viewer yang kompleks

### Desain
- Dark theme (gray-950 background, orange/amber accent)
- 2 kolom: kiri (campaign selector), kanan (controls + log + results)
- Terminal-style progress log (monospace, color-coded)
- Mobile responsive (single column)
- ~709 baris (turun dari 1181 baris)

### API Routes yang Digunakan
| Route | Method | Fungsi |
|-------|--------|--------|
| `/api/rally/search?q=` | GET | Cari campaign |
| `/api/rally/campaign/[address]` | GET | Detail campaign |
| `/api/rally/learn` | POST | Start learn pipeline |
| `/api/rally/learn?jobId=` | GET | Poll learn status |
| `/api/rally/generate` | POST | Start generate pipeline |
| `/api/rally/generate/status?jobId=` | GET | Poll generate status |
| `/api/rally/results` | GET | List semua hasil |
| `/api/rally/results?jobId=` | GET | Hasil spesifik |

---

## STRUKTUR FILE PENTING

### Source Code
```
src/
  app/
    page.tsx              ← HALAMAN UTAMA (simplified dashboard)
    layout.tsx            ← Root layout (JANGAN UBAH)
    globals.css           ← Global styles (JANGAN UBAH)
    api/rally/
      search/route.ts     ← Campaign search
      campaign/[address]/route.ts ← Campaign detail
      learn/route.ts      ← Learn pipeline
      generate/route.ts   ← Generate pipeline
      generate/status/route.ts ← Generate polling
      results/route.ts    ← Results viewer
      status/route.ts     ← System status
      submissions/route.ts
      competitive/route.ts
      process-next/route.ts
  lib/
    pipeline.ts           ← Core generation pipeline
    background-job.ts     ← Job manager + polling
    ai-service.ts         ← AI service
    http-ai-client.ts     ← HTTP AI client + token rotation
    rally-scoring.ts      ← Scoring system
    rally-submissions.ts  ← Submission handler
    rally-calibration.ts  ← Calibration
    rally-competitive.ts  ← Competitive analysis
    rally-jobs.ts         ← Job persistence
    db.ts                 ← Database config
    utils.ts              ← Utility functions
  components/ui/          ← 49 shadcn/ui components
  hooks/
    use-toast.ts
    use-mobile.ts
```

### Data
```
campaigns/               ← 3 campaign JSON files
campaign_data/           ← 44 files (output, knowledge, rules, etc.)
  v7_collected/          ← 13 collected campaign files
  */_output/             ← Generated results (qa.json, best_content.txt, etc.)
```

### Konfigurasi
```
GUIDELINES.md            ← PETUNJUK TETAP (WAJIB baca dulu)
PROJECT_CONTEXT.md       ← FILE INI (memori percakapan)
worklog.md               ← Log pekerjaan + guidelines
.zscripts/dev.sh         ← Script start server (pakai ini!)
package.json
next.config.ts
prisma/schema.prisma
Caddyfile                ← Caddy proxy (port 81 → 3000)
```

---

## KEPUTUSAN YANG SUDAH DIAMBIL

1. User memilih branch `v7-architecture` sebagai basis
2. User menolak UI `rally-command-center-v17` (terlalu kompleks)
3. User minta simplified dashboard (hanya: search, learn, generate, results)
4. Preview URL resmi: `https://preview-chat-094005ca-3599-4bf8-bf7f-9c14e570c15e.space.z.ai/`
5. Semua pekerjaan WAJIB di-commit ke git
6. Backup ke `/home/sync/repo.tar` setelah pekerjaan besar
7. Server start pakai `bash .zscripts/dev.sh &` (bukan `npx next dev &`)

---

## MASALAH YANG PERNAH TERJADI & SOLUSINYA

### 1. Git index corrupt
- Gejala: `git status` error, file .git/index corrupt
- Solusi: `rm -f .git/index && git reset`
- Pencegahan: selalu `git status` sebelum mulai kerja

### 2. .next directory corrupt
- Gejala: ENOENT build-manifest.json, halaman error
- Solusi: `rm -rf .next` lalu restart dev server
- Pencegahan: jangan edit file saat server sedang compile

### 3. Dev server mati sendiri
- Gejala: proses Next.js hilang antar tool calls
- Penyebab: `npx next dev &` tanpa disown → proses mati saat shell exit
- Solusi: pakai `bash .zscripts/dev.sh &` (sudah ada disown + trap cleanup)

### 4. Preview 502 Bad Gateway
- Gejala: Caddy proxy tidak bisa reach port 3000
- Penyebab: dev server mati
- Solusi: restart via dev.sh

---

## STATUS TERKINI (per 16 April 2026)

- ✅ Simplified dashboard berjalan (709 baris)
- ✅ Semua 8 API routes aktif
- ✅ Git clean (8 commits, 0 uncommitted)
- ✅ Backup tar aman (35MB, 1719 files, MD5 verified)
- ✅ GUIDELINES.md + PROJECT_CONTEXT.md tersimpan
- ✅ Server berjalan via .zscripts/dev.sh
- ⚠️ Belum ada generate yang di-test dengan AI sebenarnya (belum ada API key)

---

## APA YANG BISA DILAKUKAN DI SESSION BERIKUTNYA

User cukup bilang:
```
"baca PROJECT_CONTEXT.md"
```

Lalu AI akan:
1. Baca file ini → paham semua konteks
2. Cek git status → pastikan tidak corrupt
3. Verifikasi backup → pastikan aman
4. Lanjut kerja dari mana terakhir

---

## CATATAN UNTUK AI (session berikutnya)

- User ini fokus pada **kesederhanaan dan fungsionalitas**
- Jangan tambah fitur tanpa izin
- Selalu commit + backup setelah pekerjaan
- Selalu cek GUIDELINES.md SEBELUM mulai
- Gunakan Bahasa Indonesia
- Preview URL: https://preview-chat-094005ca-3599-4bf8-bf7f-9c14e570c15e.space.z.ai/
- Jika user bilang "backup", jalankan: `cd /home/z/my-project && tar cf /home/sync/repo.tar --exclude='./.next' --exclude='./node_modules' .`

---

## V8 ARCHITECTURE UPDATE (16 April 2026)

Branch: `v8-learn-judge` di GitHub.
Baca `ARCHITECTURE.md` untuk dokumentasi lengkap.
Token GitHub di `.github-config` (lokal, tidak di-track git). Push: `source .github-config && git push`

3 komponen baru: Knowledge DB, Learn Engine v2, Judge Engine v2
4 API routes baru: learn-v2, generate-v2, judge, knowledge
Prinsip: LEARNER + GENERATOR + JUDGE menggunakan AI session BERBEDA
