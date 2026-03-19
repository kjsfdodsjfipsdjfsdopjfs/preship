---
name: PreShip next steps
description: Freemium rebuild is current priority, then outreach
type: project
---

## CURRENT PRIORITY: Freemium Rebuild (2026-03-19)

CEO Plan: Full Freemium Rebuild — Make PreShip Useful for Vibe Coders
Plan file: ~/.gstack/projects/preship/ceo-plans/2026-03-19-freemium-rebuild.md

### Immediate Tasks (7 Proposals — All ACCEPTED)

1. **Public scan without login** (S) — Zero-friction scan endpoint, IP rate limit 5/hr, no auth required for first scan
2. **Human-language violations** (M) — Translate 50+ technical rules into plain human-readable explanations
3. **Fix with Cursor/Claude prompts** (M) — Generate copy-paste prompts for Cursor/Claude/v0 to fix each violation
4. **Emotional score + comparisons** (S) — Letter grade, percentile ranking, impact cards instead of raw numbers
5. **Public shareable results** (S) — Public results page with blur for anon users, viral sharing mechanic (80% already built)
6. **Remove pricing, make everything free** (S) — Remove pricing from landing + sidebar, focus on acquisition before monetization
7. **Celebration + improvement sharing** (S) — Celebration animation for 80+ scores, improvement share templates for viral loop

### Architecture Decisions
- Single BullMQ queue with priority (auth=1, public=10)
- Rate limit CTA → signup conversion on 429
- ConnectionError → 503 friendly message

## OUTREACH (paused during rebuild)

### Twitter Outreach Total: ~43 replies
- English: ~41, Portuguese: ~2, Japanese: 2, French: 1

### Post-rebuild outreach plan
1. Continue English outreach (7 more to hit 50)
2. Multi-language outreach (Japanese, Korean, Portuguese, Spanish)
3. HN Show Post — "Show HN: We scanned 47 YC startups for accessibility — 57% fail"
4. Reddit — r/SideProject + r/webdev
