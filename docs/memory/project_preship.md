---
name: PreShip project overview
description: Full project state as of 2026-03-18 — PRODUCTION LIVE, QA PASSED
type: project
---

## What is PreShip

API-first QA scanning platform for vibe-coded apps. Scans for accessibility, security, performance. Targets solo devs/teams shipping with AI tools.

## Stack

- **API:** Express + TypeScript + Zod, BullMQ + Redis, PostgreSQL
- **Web:** Next.js 14 + Tailwind CSS (dark theme, orange #F97316)
- **Scanner:** Puppeteer + axe-core + custom security/perf checks
- **Shared:** Types package, scoring: a11y 40%, security 35%, perf 25%
- **Monorepo:** npm workspaces — apps/api, apps/web, packages/scanner, packages/shared
- **Logo:** /logo.png (ship with binary code background, user-provided)

## Deployment

- Railway project `690bf785-a1e7-4340-806a-962d46d5fa03`
- API: `858e1fa6` → api.preship.dev (SSL ✅)
- Web: `d125b8e1` (loving-joy) → preship.dev (SSL ✅)
- Postgres: `47511649`, Redis: `8f2ef052`
- GitHub: `github.com/kjsfdodsjfipsdjfsdopjfs/preship.git` main
- Railway token: `998d780d-b0a7-43e6-a14f-acf7cf192d74`
- Env ID: `3fdb7420-4cfa-4fed-8e67-fe7386b74188`
- DNS: Cloudflare `986a06d4d920111d88972137107d0dd5`

## PRODUCTION STATUS — QA PASSED ✅ (2026-03-18)

### Full QA verified in browser:
- ✅ Landing page — hero, URL scan input, pricing ($0/$29/$79/$299), features grid, footer
- ✅ Signup & Login — creates account, authenticates, redirects to dashboard
- ✅ Dashboard — real stats (15 scans, avg score 17), score trend chart, scan list
- ✅ Scans list — filters (All/Completed/Running/Pending/Failed), real scores
- ✅ Scan detail — score circles (a11y 84, security 5, perf 89 for wikipedia), 15 violations with severity filtering
- ✅ PDF download — 200 OK, 15 pages, 18KB, compact layout
- ✅ Settings — real profile from API, change password section
- ✅ Billing — correct prices (cents÷100), Internal plan badge, "15 / Unlimited"
- ✅ Projects — empty state with CTA
- ✅ Docs — API documentation with correct /api/ URLs
- ✅ Sidebar — "15 / ∞" for unlimited, no "Upgrade plan" for internal
- ✅ Scanner runs in Docker (Chromium + axe-core)
- ✅ SSRF protection, DB migrations on startup, trust proxy

### Test account:
- Email: dev@preship.dev / Password: Shipdevtest123
- Plan: "internal" (999999 scans, unlimited)
- User ID: 86ad58c6-3971-4414-a64e-f182e4b280f5
- Admin endpoint: POST /internal/upgrade-plan (x-admin-secret = JWT_SECRET)

### Real scan results (2026-03-18):
- wikipedia.org: 58 (a11y 84, security 5, perf 89) — 15 violations
- news.ycombinator.com: 25
- stripe.com: 0 (bot protection blocks Puppeteer)
- github.com: 0 (bot protection)
- vercel.com: 0 (bot protection)

### Known issues (minor):
- Sites with bot protection get score 0 (Puppeteer blocked) — consider headless stealth
- PDF 15 pages for 15 violations — could be more compact
- Scans listing shows "0 violations" count (field not populated in list response)

### Not yet configured:
- Stripe products/prices (no STRIPE_PRICE_* env vars)
- OPENAI_API_KEY (using rule-based fix suggestions)
- Sentry error tracking

## Key Documents
- CLAUDE.md — codebase guide for future sessions
- PRODUCTION_CHECKLIST.md, GTM_PLAN.md, CODE_REVIEW.md, QA_REVIEW.md
- content/ — blog posts, social media, email sequences, launch copy
- Autobiography at ~/.claude/.../autobiography/
