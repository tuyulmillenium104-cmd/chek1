# Rally Brain v7.0 - Setup Worklog

## Date: 2025-04-16

## Summary
Successfully set up the Rally Brain v7.0 dashboard by copying all source files from `/tmp/chek1` (branch `v7-architecture`) to `/home/z/my-project/`.

---

## Files Copied

### 1. Main App Files (3 files - overwritten)
- `src/app/page.tsx` (2,385 lines - main dashboard)
- `src/app/layout.tsx` (root layout)
- `src/app/globals.css` (global styles)

### 2. API Routes (9 new routes)
- `src/app/api/route.ts` (overwritten)
- `src/app/api/rally/search/route.ts` - Rally.fun campaign search
- `src/app/api/rally/campaign/[address]/route.ts` - Campaign details by address
- `src/app/api/rally/generate/route.ts` - Content generation trigger
- `src/app/api/rally/generate/status/route.ts` - Generation status polling
- `src/app/api/rally/status/route.ts` - Background job status
- `src/app/api/rally/submissions/route.ts` - Campaign submissions
- `src/app/api/rally/competitive/route.ts` - Competitive analysis
- `src/app/api/rally/process-next/route.ts` - Process next queue item
- `src/app/api/rally-content/route.ts` - Rally content endpoint

### 3. Library Files (9 new + 2 overwritten)
- `src/lib/ai-service.ts` (1,111 lines) - AI service with token rotation
- `src/lib/http-ai-client.ts` (894 lines) - HTTP AI client
- `src/lib/pipeline.ts` (1,124 lines) - Content generation pipeline
- `src/lib/rally-scoring.ts` (874 lines) - Scoring system
- `src/lib/rally-competitive.ts` (846 lines) - Competitive analysis
- `src/lib/rally-submissions.ts` (401 lines) - Submission handling
- `src/lib/rally-calibration.ts` (399 lines) - Calibration logic
- `src/lib/rally-jobs.ts` (290 lines) - Job management
- `src/lib/background-job.ts` (169 lines) - Background job system
- `src/lib/db.ts` (overwritten)
- `src/lib/utils.ts` (overwritten)

### 4. Hooks (2 files - overwritten)
- `src/hooks/use-toast.ts`
- `src/hooks/use-mobile.ts`

### 5. UI Components
- All 40+ shadcn/ui components already present in destination - no changes needed

### 6. Campaign Data
- `campaigns/campaign_3.json`
- `campaigns/marbmarket-m0.json`
- `campaigns/marbmarket-m1.json`
- `campaign_data/` - 14 JSON files + 3 output directories + v7_collected (13 files)

### 7. Public Assets (2 files - overwritten)
- `public/logo.svg`
- `public/robots.txt`

### 8. Database Schema (1 file - overwritten)
- `prisma/schema.prisma` - Added `RallyJob` model

### 9. Config Files
- All config files (package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.mjs, eslint.config.mjs, components.json) were identical between source and destination - no changes needed

---

## Issues Encountered & Fixes

### Issue 1: Dynamic Route Directory
- **Problem**: `cp` failed to create `/src/app/api/rally/campaign/[address]/route.ts` because the `[address]` directory didn't exist
- **Fix**: Created the directory with `mkdir -p` first, then copied the file

### Issue 2: Prisma Schema Migration
- **Problem**: Source prisma schema includes `RallyJob` model not present in destination
- **Fix**: Ran `bun run db:push` to sync the new schema - completed successfully in 11ms

---

## Verification Results

### Lint: PASSED
- `bun run lint` completed with zero errors

### Dev Server: RUNNING
- Next.js 16.1.3 (Turbopack) running on port 3000
- Main page (`/`) returns 200 status
- API route (`/api/rally/status`) returns 200 status
- No compilation errors
- No runtime errors in dev.log
- Fast Refresh triggered correctly on file changes

---

## Architecture Notes
- **Framework**: Next.js 16 App Router with TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui (40+ components)
- **AI**: z-ai-web-dev-sdk (backend only) via custom HTTP client with token rotation
- **Database**: SQLite via Prisma ORM (3 models: User, Post, RallyJob)
- **Background Jobs**: Custom in-memory job queue system
- **Content Pipeline**: Multi-stage AI pipeline with scoring, competitive analysis, and calibration

---
Task ID: 2
Agent: main
Task: Build simplified Rally Brain v7 frontend dashboard

Work Log:
- Read all existing API routes (search, learn, generate, results, status, campaign detail)
- Read background-job.ts for pipeline polling mechanism
- Rewrote page.tsx from 1,181 lines → 709 lines (40% reduction)
- Removed unused features: mission switching, competitive analysis, token pool status, download center
- Consolidated polling logic into reusable pollJob() helper
- Layout: left panel (campaign selector + learning insights) + right panel (controls + log + results)
- Dark theme with orange/amber accents, terminal-style progress log
- Mobile responsive (single column on mobile)
- Features: Campaign search/select, Learn trigger + monitor, Generate trigger + monitor, Results viewer (Content/Q&A/History)

Stage Summary:
- Simplified dashboard deployed and running
- Lint: zero errors
- Dev server: Next.js 16.1.3 on port 3000, GET / returns 200 in 2.7s
- No compile errors, no runtime errors
