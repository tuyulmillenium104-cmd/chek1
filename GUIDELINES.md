# !! PETUNJUK TETAP — BACA INI SEBELUM SETIAP PEKERJAAN !!

## GIT SAFETY PROTOCOL
Sebelum melakukan APAPUN (edit file, write file, build, install, dll), WAJIB:

1. `cd /home/z/my-project && git status`
2. Jika corrupt: `rm -f .git/index && git reset`
3. Setelah selesai edit: `git add -A && git commit -m "deskripsi singkat"`
4. JANGAN PERNAH skip commit

Kenapa: .git/index bisa corrupt kapan saja. Tanpa commit berkala, semua pekerjaan hilang.

## SERVER MANAGEMENT
- Start server: `bash /home/z/my-project/.zscripts/dev.sh &`
- JANGAN `npx next dev &` langsung — proses mati saat shell session berakhir
- Server mati? → `bash /home/z/my-project/.zscripts/dev.sh &`
- .next corrupt? → `rm -rf .next` lalu restart dev.sh

## BACKUP PROTOCOL (PENTING!)
Container ini RESTART bersih setiap session baru. /home/sync/repo.tar adalah SATU-SATUNYA
yang survive antar session. /start.sh akan restore dari tar ini.

SETELAH setiap pekerjaan besar, WAJIB backup:
```
cd /home/z/my-project && tar cf /home/sync/repo.tar --exclude='./.next' --exclude='./node_modules' .
```

SAAT session baru dimulai, VERIFIKASI:
```
ls /home/sync/repo.tar  # harus ada (~35MB)
cd /home/z/my-project && git log --oneline -5  # cek history ada
```

## PREVIEW URL
Satu-satunya preview yang valid:
https://preview-chat-094005ca-3599-4bf8-bf7f-9c14e570c15e.space.z.ai/

## PROJECT CONTEXT
- Project: Rally Brain v7 — AI Content Generator untuk Rally.fun campaigns
- Architecture: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- Pipeline: LEARN → GENERATE → EVALUATE → JUDGE → Q&A → OUTPUT
- Scoring: 7 kategori, max 23 poin, target Grade S (21+)
- AI: z-ai-web-dev-sdk (backend only) via custom HTTP client dengan token rotation
- Database: SQLite via Prisma ORM
- Frontend simplified: campaign selector, cron learn/generate trigger, results viewer
