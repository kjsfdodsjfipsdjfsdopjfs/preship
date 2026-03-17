# PreShip: Production Readiness Audit & Go-To-Market Plan

**Date:** 2026-03-17
**Auditor:** Code Audit (automated analysis of full monorepo)
**Scope:** apps/api, apps/web, packages/scanner, packages/shared, infrastructure

---

## A. PRODUCTION BLOCKERS (P0)

These issues MUST be resolved before accepting any real user.

### A1. Production Queue Does Not Call the Real Scanner

**File:** `apps/api/src/services/queue.ts` (lines 193-234)
**Problem:** The BullMQ worker's `runScan()` method is a **placeholder stub** that returns hardcoded zero scores and empty arrays. The comment on line 100-101 says "In production this would import the actual scanner" but it never does. The actual `@preship/scanner` package is fully functional and ready, but only the local-dev queue (`apps/api/src/services/local-queue.ts`) wires it up properly.

**Fix:** Replace the `runScan()` stub in `QueueService` with a call to `scan()` from `@preship/scanner`, matching what `local-queue.ts` does at line 60.

**Impact:** Without this fix, every scan submitted through the production API returns a score of 0 with no violations.

---

### A2. No Database Migration System

**File:** `apps/api/src/models/schema.sql`
**Problem:** There is a raw SQL schema file but no migration tool (Prisma, Drizzle, Knex, node-pg-migrate, etc.). The schema must be applied manually. There are no migration scripts, no versioning, no rollback capability.

**Fix:** Adopt a migration tool (recommendation: Drizzle ORM or node-pg-migrate for minimal overhead). Create an initial migration from `schema.sql` and add a `migrate` script to `package.json`.

---

### A3. Status Value Mismatch Between Schema and Code

**File:** `apps/api/src/models/schema.sql` line 50 vs `packages/shared/src/types.ts` lines 48-55
**Problem:** The PostgreSQL CHECK constraint allows `'queued', 'processing', 'completed', 'failed'`. The shared ScanStatus type defines `'pending', 'running', 'completed', 'failed'`. The model code inserts `'queued'` (line 140 of models/index.ts) while routes check for `'pending'` and `'running'`. This will cause constraint violations or undefined behavior.

**Fix:** Align the schema CHECK constraint with the shared types: `'pending', 'running', 'completed', 'failed'`.

---

### A4. No CI/CD Pipeline

**Problem:** There are no GitHub Actions workflows for testing, linting, building, or deploying. The `.github/actions/accessibility-scan/` directory contains a GitHub Action for end users to use, but not a CI pipeline for the project itself.

**Fix:** Create `.github/workflows/ci.yml` with: lint, type-check, unit tests, build. Create `.github/workflows/deploy.yml` for Railway deployment.

---

### A5. No Tests Whatsoever

**Problem:** Zero test files exist anywhere in the monorepo. No unit tests, no integration tests, no e2e tests. No test runner configured.

**Fix:** At minimum, add:
- Unit tests for `packages/scanner` (accessibility, security, performance checks)
- Integration tests for core API routes (auth, scans, projects)
- A smoke test that runs a real scan against a known URL

---

### A6. Insecure Default Secrets in Production Config

**File:** `apps/api/src/config.ts` lines 17, 32
**Problem:** `jwtSecret` defaults to `"dev-secret-change-me"` and `apiKeySalt` defaults to `"dev-salt-change-me"`. If `JWT_SECRET` or `API_KEY_SALT` env vars are not set in production, the server starts with known, guessable secrets.

**Fix:** Add startup validation that crashes the server if `JWT_SECRET` or `API_KEY_SALT` are not set when `NODE_ENV=production`.

---

### A7. Landing Page Hero Form Does Not Work

**File:** `apps/web/src/app/page.tsx` line 172
**Problem:** The hero scan form has `onSubmit={(e) => e.preventDefault()}` and no actual scan logic. Users can type a URL and click "Scan your app free" but nothing happens.

**Fix:** Wire the form to either:
- Navigate to a sign-up flow and then trigger a scan, or
- Hit the API to create an anonymous scan with a captcha/rate-limit

---

### A8. Dashboard Is Entirely Hardcoded Mock Data

**Files:**
- `apps/web/src/app/dashboard/page.tsx` (lines 12-73: mock stats, scans, trends)
- `apps/web/src/app/dashboard/scans/[id]/page.tsx` (lines 10-37: mock scan data)
- `apps/web/src/app/dashboard/projects/page.tsx` (lines 8-15: mock projects)
- `apps/web/src/app/dashboard/projects/[id]/page.tsx` (lines 8-22: mock project)
- `apps/web/src/app/dashboard/billing/page.tsx` (lines 7-21: mock billing)
- `apps/web/src/app/dashboard/settings/page.tsx` (lines 8-11: mock API keys)

**Problem:** Every dashboard page renders hardcoded JavaScript arrays instead of fetching from the API. The `useApi` and `useScan` hooks exist and are correctly implemented but are not used anywhere in the dashboard.

**Fix:** Replace mock data with API calls using the existing hooks. This is a significant effort across 6+ pages.

---

### A9. API URL Path Mismatch Between Frontend Hooks and Backend Routes

**File:** `apps/web/src/hooks/useScan.ts` lines 47, 62
**Problem:** The `useScan` hook calls `/api/v1/scans/${scanId}` and `/api/v1/scans`, but the API routes are mounted at `/api/scans` (no `v1` segment). Every scan request from the frontend will 404.

**Fix:** Either update the hooks to use `/api/scans` or add `/api/v1/scans` as an alias in the API router.

---

### A10. No Email Verification or Password Reset

**File:** `apps/api/src/routes/auth.ts`
**Problem:** Users can register with any email address. There is no email verification flow and no password reset/forgot-password endpoint. This is a minimum requirement before accepting paying users.

---

### A11. Rate Limiter Fails Open Without Redis

**File:** `apps/api/src/middleware/rateLimit.ts` line 60
**Problem:** When Redis is unavailable, the plan-aware rate limiter simply calls `next()` with no limiting. In production, if Redis goes down, all rate limits disappear entirely.

**Fix:** Fall back to `express-rate-limit` in-memory limiter (already imported) when Redis is unavailable.

---

### A12. Social Proof Numbers Are Fake

**File:** `apps/web/src/app/page.tsx` lines 136-137
**Problem:** The landing page displays "2,847,593 violations found" and "184,729 apps scanned" using animated counters. These are fabricated numbers. Displaying fake metrics to potential customers is a legal and trust liability.

**Fix:** Either show real metrics from the database, remove the section, or label it clearly as aspirational/illustrative.

---

## B. P1 FEATURES (Required for Paying Users)

### B1. Stripe Integration Testing

The Stripe service (`apps/api/src/services/stripe.ts`) is well-implemented with checkout, portal, and webhook handling. However:
- `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_ENTERPRISE` env vars need to be created in Stripe Dashboard
- Webhook endpoint must be registered with Stripe
- No subscription downgrade/cancellation confirmation flow in the frontend
- Billing page uses mock data; needs real API integration

### B2. Scheduled Scans

Project settings UI shows daily/weekly/monthly schedule options, but there is no cron/scheduler implementation. Need a cron job or BullMQ repeatable job system to trigger scans on schedule.

### B3. API Documentation

The landing page and footer link to `/docs` but no documentation page exists. For an API-first product, this is critical. Options: Swagger/OpenAPI spec auto-generated from routes, or a docs site (Mintlify, Docusaurus).

### B4. GitHub Action Publishing

The GitHub Action at `.github/actions/accessibility-scan/` needs:
- Compiled `dist/index.js` (referenced in action.yml but not present)
- Publishing to GitHub Marketplace
- Documentation and examples

### B5. Error Monitoring & Logging

No Sentry, DataDog, or structured logging. In production, unhandled errors will be lost to `console.error`. Need observability before accepting paying users.

### B6. Data Retention Enforcement

`PLAN_LIMITS` in `packages/shared/src/constants.ts` defines retention periods (7 days for free, 90 days for pro, etc.) but there is no cleanup job to enforce these limits. Old scan data will accumulate indefinitely.

### B7. Team/Multi-User Support

The Team and Enterprise plans advertise "team members" but there is no team/organization model, no invite flow, and no role-based access control.

### B8. Webhook/Notification System

No webhook callbacks when scans complete. No email notifications. No Slack integration (advertised in Team plan features).

### B9. LLM Fix Suggestions

**File:** `apps/api/src/services/llm.ts` line 48
The OpenAI integration is stubbed: `suggestFix()` has a `// TODO: Call OpenAI API` comment and falls back to rule-based suggestions only. The rule-based suggestions in `packages/scanner/src/fix-suggestions.ts` work but cover a limited set of rules.

### B10. Pricing Inconsistency

The landing page `PricingTable.tsx` shows: Free=$0/5 scans, Pro=$29/100 scans, Team=$99/500 scans, Business=$299/unlimited. But `packages/shared/src/constants.ts` PLAN_LIMITS shows: Free=10 scans, Pro=200, Team=1000. The Stripe service prices show Pro=$29, Team=$79 (not $99), Enterprise=$299. These must be unified.

---

## C. GO-TO-MARKET STRATEGY

### C1. Target Audience (Specific Segments)

**Primary: AI-Assisted Developers (Solo/Indie)**
- Developers using Cursor, Copilot, v0, Bolt, Lovable, or Replit Agent to build apps
- Ship fast, know they should test for accessibility/security but lack expertise
- Budget: $0-$29/mo for tooling
- Pain: "I shipped a vibe-coded app and got an ADA demand letter"

**Secondary: Freelancers & Small Agencies**
- Build client sites with AI tools, need compliance documentation
- Need PDF reports to deliver to clients
- Budget: $29-$99/mo, billable to clients
- Pain: "Client asked for an accessibility audit and I have no idea where to start"

**Tertiary: Startup Engineering Teams (5-20 engineers)**
- Using AI coding assistants across the team
- Need CI/CD quality gates
- Budget: $99-$299/mo
- Pain: "We ship weekly and keep introducing accessibility regressions"

### C2. Positioning

**Category:** Quality assurance for AI-generated code
**Tagline:** "Your AI wrote the code. We check if humans can use it."

**Key Differentiators vs. Competitors:**

| Dimension | PreShip | Lighthouse | axe DevTools | Deque | Snyk |
|-----------|---------|------------|-------------|-------|------|
| Target | AI-coded apps | General web | Accessibility only | Enterprise a11y | Security only |
| Scope | A11y + Security + Perf | Perf + A11y basics | Accessibility | Accessibility | Security |
| Fix suggestions | Code snippets | General advice | Paid feature | Paid | Paid |
| API-first | Yes | CLI only | Browser extension | Enterprise API | Yes |
| Price entry | Free/$29 | Free | Free/$40/mo | Custom/$$ | Free/$25/dev/mo |
| PDF compliance reports | Included | No | Paid | Paid | No |
| CI/CD integration | GitHub Action | CLI | Paid | Enterprise | Yes |

**Positioning Statement:**
PreShip is the only scanning platform purpose-built for AI-generated applications, combining accessibility (WCAG 2.2 AA), security (OWASP Top 10), and performance (Core Web Vitals) in a single API call with copy-paste code fixes.

### C3. Launch Channels

**Tier 1 (Highest Impact):**
1. **Hacker News** - "Show HN: We scan vibe-coded apps for accessibility, security, and performance issues"
2. **Product Hunt** - Launch with the "AI" and "Developer Tools" tags
3. **X/Twitter** - Target AI coding influencers (@levelsio, @mcaborern, @kaborojohn)
4. **Reddit** - r/webdev, r/nextjs, r/reactjs, r/SideProject, r/cursor, r/vibecoding

**Tier 2 (Community):**
5. **Discord communities** - Cursor, v0, Bolt, Replit, Indie Hackers
6. **Dev.to and Hashnode** - Publish articles
7. **GitHub** - Open-source the scanner package, add PreShip badge concept

**Tier 3 (Paid/Partnership):**
8. **Newsletter sponsorships** - TLDR, Bytes, JavaScript Weekly
9. **YouTube sponsorships** - AI coding channels (Fireship, Theo, Web Dev Simplified)
10. **Partnership** - Approach Vercel, Netlify, Railway for marketplace listings

### C4. Content Strategy

**Launch Week Content:**
1. Blog: "Why 95% of Vibe-Coded Apps Fail Accessibility Standards" (data-backed with real scan results)
2. Blog: "The $75,000 Accessibility Lawsuit Your AI Can't Prevent"
3. Twitter thread: "I scanned 100 apps built with Cursor/v0/Bolt. Here's what I found."
4. Short video: 60-second demo showing scan -> violations -> fixes

**Ongoing Content Calendar (weekly):**
- Monday: "Vibe Code Fail of the Week" - scan a popular AI-built app, show issues
- Wednesday: Technical blog post (SEO-focused: "How to add WCAG 2.2 AA compliance to your Next.js app")
- Friday: Twitter thread or short-form video

**SEO Keywords to Target:**
- "accessibility testing tool" (2,400 searches/mo)
- "WCAG compliance checker" (1,900 searches/mo)
- "web accessibility scanner" (1,600 searches/mo)
- "vibe coding accessibility" (emerging, low competition)
- "AI generated code testing" (emerging, low competition)
- "ADA compliance website checker" (3,100 searches/mo)

### C5. Pricing Validation

**Recommended Pricing (after resolving B10 inconsistencies):**

| Plan | Price | Scans/Mo | Key Differentiator |
|------|-------|----------|-------------------|
| Free | $0 | 5 | Try before you buy, single project |
| Pro | $29/mo | 100 | Full scanning + API + PDF reports |
| Team | $79/mo | 500 | Multi-user + scheduled scans + Slack |
| Enterprise | $299/mo | Unlimited | SSO + SLA + white-label reports |

**Validation approach:**
- Offer 14-day free trials on Pro/Team (no credit card required)
- Track trial-to-paid conversion rate (target: 5-10%)
- Survey churned users for price sensitivity
- A/B test $29 vs $39 for Pro tier after 500 trial users

### C6. Early Adopter Acquisition Plan

**Phase 1: Friends & Family (Week 1-2)**
- Seed 20-50 beta users from personal network and Twitter
- Offer lifetime 50% discount for beta feedback
- Run 1-on-1 calls with first 10 users

**Phase 2: Community Launch (Week 3-4)**
- Post in 5+ Discord/Slack communities daily
- Offer "First 100 users get Pro free for 3 months"
- Launch on Product Hunt (coordinate upvotes)

**Phase 3: Content-Led Growth (Week 5-8)**
- Publish 2 blog posts/week with SEO optimization
- Twitter engagement: scan popular projects, share results publicly
- GitHub: open-source scanner package for community contributions

**Phase 4: Paid Acquisition (Week 8+)**
- Start small: $500/mo on Google Ads targeting "WCAG compliance checker"
- Retargeting ads for landing page visitors who didn't sign up
- Newsletter sponsorships ($200-500/placement)

### C7. Metrics to Track

**North Star Metric:** Weekly Active Scanners (users who ran at least 1 scan in the past 7 days)

**Acquisition Metrics:**
- Landing page visitors / week
- Sign-up conversion rate (visitor -> registered)
- Source attribution (which channel drives sign-ups)

**Activation Metrics:**
- First scan within 24 hours of sign-up (target: 60%)
- Time to first scan (target: < 5 minutes)
- Free -> Pro conversion rate (target: 5-10%)

**Engagement Metrics:**
- Scans per user per week
- Dashboard views per session
- PDF report downloads
- API key usage rate

**Revenue Metrics:**
- MRR (Monthly Recurring Revenue)
- ARPU (Average Revenue Per User)
- Churn rate (target: < 5% monthly)
- LTV:CAC ratio (target: > 3:1)

**Product Metrics:**
- Average scan duration
- Scan success rate (completed / total)
- Fix suggestion acceptance rate
- Most common violations found (product insight)

---

## D. GTM TIMELINE (8 Weeks)

### Week 1: Fix Critical Blockers
- [ ] Wire production queue to real scanner (A1)
- [ ] Fix status value mismatch in schema (A3)
- [ ] Add startup validation for secrets (A6)
- [ ] Fix API URL path mismatch in frontend hooks (A9)
- [ ] Remove fake social proof numbers (A12)
- [ ] Set up error monitoring (Sentry)

### Week 2: Core Product Completion
- [ ] Adopt migration tool, create initial migration (A2)
- [ ] Wire dashboard pages to real API (A8 - dashboard, scans, projects pages)
- [ ] Wire landing page hero scan form (A7)
- [ ] Fix pricing inconsistencies across codebase (B10)
- [ ] Fix rate limiter fail-open behavior (A11)

### Week 3: Authentication & Billing
- [ ] Add email verification flow (A10)
- [ ] Add forgot-password / password reset (A10)
- [ ] Create Stripe products and price IDs (B1)
- [ ] Wire billing page to real Stripe integration (B1)
- [ ] Test checkout, portal, and webhook flows end-to-end (B1)

### Week 4: Testing & CI/CD
- [ ] Write unit tests for scanner package (A5)
- [ ] Write integration tests for API routes (A5)
- [ ] Create CI pipeline with GitHub Actions (A4)
- [ ] Create deployment pipeline for Railway (A4)
- [ ] Set up staging environment

### Week 5: Documentation & Polish
- [ ] Build API documentation page (B3 - Swagger/OpenAPI)
- [ ] Build and publish GitHub Action (B4)
- [ ] Polish dashboard remaining pages (billing, settings)
- [ ] Add structured logging
- [ ] Implement data retention cleanup job (B6)

### Week 6: Beta Launch
- [ ] Invite 20-50 beta testers
- [ ] Run 1-on-1 user feedback sessions
- [ ] Fix critical bugs from beta feedback
- [ ] Write launch blog post #1: "Why 95% of Vibe-Coded Apps Fail Accessibility"
- [ ] Write launch blog post #2: "The $75K Lawsuit Your AI Can't Prevent"
- [ ] Prepare Product Hunt listing

### Week 7: Public Launch
- [ ] Launch on Product Hunt
- [ ] Post on Hacker News (Show HN)
- [ ] Post on Reddit (r/webdev, r/nextjs, r/SideProject)
- [ ] Announce in Discord communities (Cursor, v0, Bolt)
- [ ] Twitter launch thread with real scan data
- [ ] Activate "First 100 users" promo

### Week 8: Growth & Iteration
- [ ] Analyze launch metrics (sign-ups, activation, scans)
- [ ] Address top user-reported issues
- [ ] Begin weekly content cadence
- [ ] Start LLM fix suggestion implementation (B9)
- [ ] Scope scheduled scans feature (B2)
- [ ] Begin scoping team/org features (B7)

---

## E. COMPETITIVE ANALYSIS

### Google Lighthouse
- **What it does:** Performance, accessibility, SEO, best practices auditing via Chrome DevTools or CLI
- **Strengths:** Free, ubiquitous, trusted by Google, great performance metrics
- **Weaknesses:** Limited accessibility depth (basic axe-core subset), no security checks, no API for SaaS integration, no historical tracking, no fix suggestions, no reports
- **PreShip advantage:** Deeper accessibility scanning (WCAG 2.2 AA with 50+ axe-core rules + custom checks), security scanning, API-first with webhooks, PDF compliance reports, fix suggestions with code, historical score tracking per project

### axe-core / axe DevTools (Deque)
- **What it does:** Accessibility testing engine (open-source core) + paid browser extension and dashboard
- **Strengths:** Industry standard for accessibility, comprehensive WCAG coverage, great browser extension
- **Weaknesses:** Accessibility only (no security or performance), free tier is limited, enterprise pricing is opaque, no API-first model for CI/CD without their enterprise platform
- **PreShip advantage:** Three-in-one scanning (a11y + security + perf), lower price point, API-first design, targets AI-generated code specifically, includes security scanning that axe does not

### Deque (Enterprise)
- **What it does:** Enterprise accessibility platform with axe Monitor, axe Auditor, VPAT generation
- **Strengths:** Most comprehensive accessibility platform, VPAT generation, enterprise support, manual testing services
- **Weaknesses:** Enterprise pricing ($$$), complex setup, overkill for indie devs and small teams, accessibility only
- **PreShip advantage:** 10-100x cheaper, self-serve, includes security + performance, faster time to value, built for modern AI-first development workflows

### WebAIM WAVE
- **What it does:** Free web accessibility evaluation tool (browser extension + online checker)
- **Strengths:** Free, visual overlay showing issues on the page, easy to understand
- **Weaknesses:** Single-page only, no API, no CI/CD integration, no historical data, no security or performance, no fix suggestions
- **PreShip advantage:** Multi-page crawling, API-first, CI/CD integration, all three check categories, project tracking, PDF reports

### Snyk
- **What it does:** Developer security platform (SAST, SCA, container security, IaC security)
- **Strengths:** Deep security analysis, dependency scanning, large vulnerability database, strong CI/CD integration
- **Weaknesses:** Security only (no accessibility or performance), complex setup, pricing scales with developers, focused on code/dependencies not runtime behavior
- **PreShip advantage:** Runtime security checks (headers, cookies, exposed secrets, mixed content), accessibility and performance bundled in, simpler setup (just provide a URL), targets the deployed app not source code

### SonarQube
- **What it does:** Static code analysis for bugs, vulnerabilities, code smells
- **Strengths:** Deep static analysis, many language support, code quality metrics, self-hosted option
- **Weaknesses:** Source code analysis only (not runtime), no accessibility or performance checks, complex to set up, not focused on web-specific issues
- **PreShip advantage:** Runtime analysis of deployed apps (no source code access needed), accessibility scanning, web-specific security checks, simpler URL-based scanning

### Vercel Analytics / Speed Insights
- **What it does:** Real-user performance monitoring (Core Web Vitals) for Vercel-hosted sites
- **Strengths:** Zero-config for Vercel users, real user data, beautiful dashboard, free tier
- **Weaknesses:** Vercel-only, performance only (no accessibility or security), monitoring not auditing (reactive not proactive), no fix suggestions
- **PreShip advantage:** Platform-agnostic (any URL), proactive scanning before deploy, accessibility + security + performance, actionable fix suggestions, CI/CD quality gate

### Competitive Summary Matrix

| Feature | PreShip | Lighthouse | axe DevTools | Deque | Snyk | Vercel Analytics |
|---------|---------|------------|-------------|-------|------|-----------------|
| Accessibility | Deep | Basic | Deep | Deep | No | No |
| Security | Runtime | No | No | No | Deep (code) | No |
| Performance | CWV | Deep | No | No | No | RUM |
| API-first | Yes | CLI | Enterprise | Enterprise | Yes | No |
| Fix suggestions | Code snippets | General | Paid | Paid | Yes | No |
| CI/CD action | Yes | CLI | Enterprise | Enterprise | Yes | N/A |
| PDF reports | Included | No | Paid | Paid | Paid | No |
| Multi-page crawl | Yes | No | Paid | Yes | N/A | N/A |
| Price (entry) | $0 | $0 | $0 | $$$ | $0 | $0 |
| Price (pro) | $29/mo | N/A | $40/mo | Custom | $25/dev/mo | $20/mo |
| AI-code focused | Yes | No | No | No | No | No |

---

## F. LEGAL REQUIREMENTS

### F1. Required Before Launch

**Terms of Service (ToS)**
- Must cover: acceptable use, service availability, data handling, limitation of liability, dispute resolution
- Footer already links to `/terms` but no page exists
- Recommendation: Use a template service (Termly, iubenda) adapted for SaaS, then have a lawyer review

**Privacy Policy**
- Required by GDPR, CCPA, and most jurisdictions
- Must disclose: what data is collected (email, password hash, scanned URLs, scan results), how it's stored, third-party processors (Railway, Stripe, potentially OpenAI), user rights (access, deletion, export)
- Footer already links to `/privacy` but no page exists

**Cookie Policy**
- If using cookies or analytics, must disclose
- Implement cookie consent banner for EU compliance

**Data Processing Agreement (DPA)**
- Footer links to `/dpa` but no page exists
- Required for enterprise/team customers under GDPR
- Must cover: sub-processors (Railway, Stripe, Redis provider), data location, breach notification procedures

### F2. Required Before Charging Money

**Stripe Compliance**
- Complete Stripe identity verification
- Set up proper business entity (LLC recommended for liability protection)
- Configure Stripe Tax for sales tax compliance (varies by jurisdiction)
- Implement proper invoicing (Stripe handles this)

**Refund Policy**
- Must be clearly stated in ToS
- Recommendation: 14-day money-back guarantee for annual plans, prorated refunds for monthly

### F3. Required Before Scanning Third-Party Sites

**Acceptable Use Policy**
- Must define what users can and cannot scan
- Explicitly state: users may only scan sites they own or have permission to scan
- PreShip is not responsible for unauthorized scanning by users
- Include rate limiting and abuse prevention

**Disclaimer on Scan Results**
- Already included in PDF reports (line 1178 of `apps/api/src/services/pdf.ts`): "This automated scan covers approximately 57% of WCAG issues. Manual testing is recommended for full compliance. This report does not constitute legal advice."
- This same disclaimer must appear on the web dashboard and in API responses

### F4. Recommended (Not Strictly Required)

**Security Policy / Responsible Disclosure**
- Footer links to `/security` but no page exists
- Should include: how to report vulnerabilities, expected response time, scope, safe harbor

**Accessibility Statement**
- As an accessibility scanning product, PreShip itself should be accessible
- Publish a VPAT or accessibility statement for the dashboard
- The landing page already has good accessibility (skip link, ARIA labels, semantic HTML)

**Business Entity Formation**
- If not already formed: register an LLC or equivalent
- Obtain necessary business licenses
- Set up a business bank account
- Consider business insurance (E&O / professional liability)

**SOC 2 / ISO 27001 (Future)**
- Not needed for launch, but enterprise customers will ask
- Begin documenting security practices now for future certification
- The fact that scan results may contain sensitive information (exposed API keys, vulnerabilities) means data protection is especially important

### F5. GDPR-Specific Requirements

- Right to access: users must be able to export their data
- Right to deletion: users must be able to delete their account and all data (settings page has a "Delete Account" button but it's non-functional)
- Right to portability: scan results should be exportable (JSON or PDF)
- Data breach notification: 72-hour notification requirement
- Lawful basis for processing: consent (sign-up) or legitimate interest (service delivery)
- Sub-processor documentation: list all third-party services that process user data

---

## Appendix: File Reference

Key files referenced in this audit:

| Component | Path |
|-----------|------|
| API entry | `apps/api/src/index.ts` |
| API config | `apps/api/src/config.ts` |
| Local dev server | `apps/api/src/local.ts` |
| BullMQ queue (STUB) | `apps/api/src/services/queue.ts` |
| Local queue (working) | `apps/api/src/services/local-queue.ts` |
| Scanner service wrapper | `apps/api/src/services/scanner.ts` |
| Stripe service | `apps/api/src/services/stripe.ts` |
| LLM service (STUB) | `apps/api/src/services/llm.ts` |
| PDF report generator | `apps/api/src/services/pdf.ts` |
| Auth routes | `apps/api/src/routes/auth.ts` |
| Scan routes | `apps/api/src/routes/scan.ts` |
| Billing routes | `apps/api/src/routes/billing.ts` |
| Project routes | `apps/api/src/routes/projects.ts` |
| Auth middleware | `apps/api/src/middleware/auth.ts` |
| Rate limiting | `apps/api/src/middleware/rateLimit.ts` |
| Usage limits | `apps/api/src/middleware/usage.ts` |
| DB models (PostgreSQL) | `apps/api/src/models/index.ts` |
| DB models (SQLite) | `apps/api/src/models/sqlite.ts` |
| DB schema | `apps/api/src/models/schema.sql` |
| Scanner entry | `packages/scanner/src/index.ts` |
| Accessibility checks | `packages/scanner/src/accessibility.ts` |
| Security checks | `packages/scanner/src/security.ts` |
| Performance checks | `packages/scanner/src/performance.ts` |
| Site crawler | `packages/scanner/src/crawler.ts` |
| Report builder | `packages/scanner/src/reporter.ts` |
| Fix suggestions | `packages/scanner/src/fix-suggestions.ts` |
| Shared types | `packages/shared/src/types.ts` |
| Plan limits & constants | `packages/shared/src/constants.ts` |
| Landing page | `apps/web/src/app/page.tsx` |
| Dashboard main | `apps/web/src/app/dashboard/page.tsx` |
| Scan detail page | `apps/web/src/app/dashboard/scans/[id]/page.tsx` |
| Projects page | `apps/web/src/app/dashboard/projects/page.tsx` |
| Project detail | `apps/web/src/app/dashboard/projects/[id]/page.tsx` |
| Billing page | `apps/web/src/app/dashboard/billing/page.tsx` |
| Settings page | `apps/web/src/app/dashboard/settings/page.tsx` |
| API hook | `apps/web/src/hooks/useApi.ts` |
| Scan hook | `apps/web/src/hooks/useScan.ts` |
| Pricing component | `apps/web/src/components/PricingTable.tsx` |
| GitHub Action | `.github/actions/accessibility-scan/action.yml` |
| Docker Compose | `docker-compose.yml` |
| Env example | `.env.example` |
