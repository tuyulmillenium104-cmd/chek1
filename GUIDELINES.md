# Rally Brain v8 — Project Guidelines

## GIT SAFETY (BACA SETIAP SESI)
1. SEBELUM mulai kerja: git status
2. Jika merge conflict: rm -f .git/MERGE_HEAD .git/MERGE_MSG .git/CHERRY_PICK_HEAD .git/REVERT_HEAD .git/index && git reset --hard HEAD
3. JANGAN git merge/rebase tanpa commit dulu
4. Commit setelah SETIAP file selesai diedit
5. JANGAN biarkan working tree dirty saat session berakhir
6. Jika index corrupt (setiap command gagal): rm -f .git/index && git reset
7. Jika semua command gagal dengan "needs merge" dan git merge --abort juga gagal: rm -rf .git && re-init (nuclear option, langkah terakhir)

## SERVER
- Port: 3000
- Start: bun run dev
- Start background (persistent): .zscripts/dev.sh
- Kill: lsof -ti:3000 | xargs kill -9
- Log: dev.log atau /tmp/rally-brain.log

## TECH
- Framework: Next.js 16 App Router + TypeScript + Tailwind + shadcn/ui
- Runtime: Bun
- Database: File-based (JSONL + JSON), bukan Prisma
- Baca ARCHITECTURE.md sebelum coding apapun
- Bahasa: Indonesia untuk komunikasi, English untuk code

## GIT RULES
- Jangan push ke main langsung
- Branch untuk fitur: feat/nama-fitur atau v8-nama
- Commit message format: tipe: deskripsi contoh: feat: add learn pipeline
- Selalu pull sebelum push: git pull origin branch-name

## ANTI CORRUPT SESSION
- Session sebelumnya RUSAK karena git merge conflict dan index corrupt
- Semua tool (Bash, Read, Write, Edit, LS, Glob) TERBLOKIR total
- Tidak ada command yang bisa jalan, bahkan cd /tmp
- Pencegahan: SELALU commit sebelum session berakhir, JANGAN biarkan merge conflict
