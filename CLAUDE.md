# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PreShip — API-first QA scanning platform for vibe-coded apps. Scans accessibility, security, and performance.

## Monorepo Structure

- `apps/api` — Express + TypeScript API (BullMQ, PostgreSQL, Redis)
- `apps/web` — Next.js 14 frontend (Tailwind CSS, dark theme, orange #F97316)
- `packages/scanner` — Puppeteer + axe-core scanning engine (6 agents: a11y, security, perf, SEO, privacy, mobile)
- `packages/shared` — Shared types, scoring weights (a11y 25%, security 25%, perf 15%, seo 15%, privacy 10%, mobile 10%)

## Commands

```bash
# Development
cd apps/web && npx next dev --port 3000    # Frontend
cd apps/api && npx tsx src/local.ts         # API (local SQLite mode)

# Build
cd apps/web && npx next build
cd apps/api && npx tsc

# Type check
cd apps/web && npx tsc --noEmit
cd apps/api && npx tsc --noEmit
```

## Architecture

- **Two API modes**: `index.ts` (production, PostgreSQL + BullMQ) and `local.ts` (dev, SQLite + in-memory queue)
- **Scan status values**: `queued`, `processing`, `completed`, `failed` (DB constraint), also accepts `pending`/`running` on frontend
- **Auth**: JWT tokens stored in localStorage as `auth_token`
- **API base**: `https://api.preship.dev` (production), `http://localhost:3001` (dev)
- **Scanner**: puppeteer-extra with stealth plugin, SSRF protection via validate-url.ts
- **PDF reports**: PDFKit, conditional sections (empty categories skipped)

## Design System

- Background: `#0A0A0A`, cards: `neutral-900`, borders: `neutral-800`
- Accent: orange `#F97316` (orange-500), hover: orange-600
- Logo: `/logo.png` (ship with binary code, user-provided image)
- Font: system-ui, monospace for code

## Deployment

- Railway: API service `858e1fa6`, Web service `d125b8e1`
- Domains: `preship.dev`, `api.preship.dev` (Cloudflare DNS)
- GitHub: `main` branch auto-deploys

## gstack

gstack (by Garry Tan) is installed at `~/.claude/skills/gstack/`. It provides a virtual engineering team as slash commands.

**IMPORTANT: For ALL web browsing, use the `/browse` skill from gstack. NEVER use `mcp__Claude_in_Chrome__*` tools.**

### Available gstack skills:

| Command | Role | When to use |
|---------|------|-------------|
| `/office-hours` | Mentoring | Strategic product/technical decisions |
| `/plan-ceo-review` | CEO | Rethink product direction, feature prioritization |
| `/plan-eng-review` | Eng Manager | Lock architecture, technical decisions |
| `/plan-design-review` | Design Lead | Catch AI slop in design, UX review |
| `/design-consultation` | Designer | Get design feedback on components/layouts |
| `/review` | Code Reviewer | Paranoid code review before merge |
| `/ship` | Release Engineer | Ship PRs, handle release process |
| `/browse` | Browser | Web browsing, form filling, testing |
| `/qa` | QA Lead | Full QA with real browser testing + fix |
| `/qa-only` | QA | Quick QA pass, report only, no fixes |
| `/design-review` | Design QA | Visual/UX review of implemented designs |
| `/setup-browser-cookies` | Setup | Configure browser auth cookies |
| `/retro` | Analytics | Dev stats for last 7 days |
| `/investigate` | Debugger | Systematic debugging of issues |
| `/document-release` | Docs | Generate release documentation |
| `/codex` | Knowledge | Build and query project knowledge base |
| `/careful` | Guard | Extra caution mode for risky changes |
| `/freeze` | Lock | Freeze files/dirs from modification |
| `/guard` | Protect | Protect critical code paths |
| `/unfreeze` | Unlock | Unfreeze previously frozen files |
| `/gstack-upgrade` | Upgrade | Upgrade gstack to latest version |

### Other installed skills:

- `superpowers` — TDD, debugging, code review, worktrees, parallel agents

## UI/UX Pro Max

Para tarefas de UI/UX design, use as skills do ui-ux-pro-max-skill.
Requer Python 3.x instalado.
Skills disponíveis: /banner-design, /brand, /design-system, /design, /slides, /ui-styling, /ui-ux-pro-max
