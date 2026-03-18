---
name: PreShip next steps
description: What to do next session — GA4 live, scanner agents added, GTM ready
type: project
---

## DONE THIS SESSION ✅ (2026-03-18)

- ✅ GA4 property created: **G-WPMEJ88G9C** (account "PreShip", property "preship.dev")
- ✅ `NEXT_PUBLIC_GA_ID` env var set on Railway web service
- ✅ GoogleAnalytics.tsx updated with real ID
- ✅ Cookie consent banner (GDPR) — GA only loads after accept
- ✅ SEO: sitemap.xml, robots.txt, meta tags, OG tags
- ✅ Scanner: puppeteer-extra-plugin-stealth for bot protection bypass
- ✅ Scanner: SEO agent (10 checks), Privacy agent (5 checks), Mobile agent (6 checks)
- ✅ Scoring rebalanced: a11y 25%, security 25%, perf 15%, seo 15%, privacy 10%, mobile 10%
- ✅ Structured JSON logging + request IDs + enhanced health check (DB+Redis)
- ✅ Legal pages reviewed (Privacy, Terms, DPA updated with GDPR rights, sub-processors, retention)
- ✅ PDF report compacted (smaller code blocks, conditional sections)
- ✅ Onboarding first-scan flow for new users
- ✅ Fake social proof numbers removed from landing page
- ✅ "0 violations" display bug fixed
- ✅ Twitter account exists: @preshipdev (created by Rodrigo)
- ✅ Email SMTP/IMAP working: preshipdev@gmail.com (app password: qvhacqjskiizccun)

## NEXT SESSION — Start Here

### 1. Full QA after deploy
- Latest push (GA4 ID) deploying now — verify both services SUCCESS
- Test GA4 tracking works (visit preship.dev, accept cookies, check GA4 real-time)
- Run 3-5 scans on real sites, verify new agents (SEO/Privacy/Mobile) produce violations
- Test PDF download with new compact layout
- Test stealth mode on previously-blocked sites (stripe.com, github.com)

### 2. Remaining GTM Setup
- **Reddit**: create u/preshipdev account
- **Product Hunt**: create account with preshipdev@gmail.com, prepare listing
- **GitHub org**: create "preship" org, transfer or mirror repo
- Review + schedule content from `content/` folder (blog, social, email)

### 3. Stripe (when ready to charge)
- Create Stripe account with preshipdev@gmail.com
- Create products: Free, Pro ($29), Team ($79), Enterprise ($299)
- Set STRIPE_PRICE_* env vars on Railway
- Test checkout flow

### 4. Product Polish
- Sentry error tracking (API + web)
- Password reset flow (endpoint not implemented)
- DB backups on Railway Postgres
- Uptime monitoring (BetterUptime or similar)

### 5. Launch Sequence
- D-3: Email 1 (awareness)
- D-1: Email 2 (solution) + Twitter thread 1
- D-0: HN Show post + r/SideProject + Email 3 + Twitter thread 3
- D+1: r/webdev + LinkedIn post
- D+3: Product Hunt launch
- D+5: r/accessibility + r/nextjs
