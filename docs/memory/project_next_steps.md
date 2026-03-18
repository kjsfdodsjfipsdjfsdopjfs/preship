---
name: PreShip next steps
description: What to do next session — blog route, QA, GTM continue
type: project
---

## DONE THIS SESSION ✅ (2026-03-18 evening)

- ✅ GA4 property created: G-WPMEJ88G9C
- ✅ NEXT_PUBLIC_GA_ID set on Railway
- ✅ Twitter @preshipdev profile set up (bio, link, preship.dev)
- ✅ First Twitter thread posted (5 tweets about a11y + PreShip)
- ✅ Scanner agents: SEO, Privacy, Mobile added
- ✅ puppeteer-extra-plugin-stealth installed
- ✅ Structured logging + request IDs
- ✅ Cookie consent banner (GDPR)
- ✅ Legal pages reviewed (GDPR, sub-processors, retention)
- ✅ PDF compact, onboarding flow, fake metrics removed
- ✅ Blog agent building /blog/[slug] route (may need verification)

## NEXT SESSION — Start Here

### 1. Verify blog agent output
- Check if /blog/[slug] route was created by background agent
- Verify blog index links to correct slugs
- Test each blog post renders correctly

### 2. Commit + Push + Deploy
- All changes from this session need to be committed
- Verify deploy succeeds for both services

### 3. Full QA after deploy
- Test GA4 tracking (accept cookies → check GA4 real-time)
- Run scans, verify new agents (SEO/Privacy/Mobile) produce violations
- Test stealth on previously-blocked sites
- Download PDF, verify compact layout

### 4. Remaining GTM
- Reddit: create u/preshipdev account
- Product Hunt: create account, prepare listing
- GitHub org: create "preship" org
- Upload logo.png as Twitter avatar (browser file upload was blocked)

### 5. Product Polish
- Stripe setup (when ready to charge)
- Sentry error tracking
- Password reset endpoint
- DB backups on Railway

### 6. Content Schedule
- Twitter: 4 more threads ready in content/social/twitter-threads.md
- LinkedIn: 5 posts ready in content/social/linkedin-posts.md
- Reddit: 4 posts ready in content/social/reddit-posts.md
- Email: 3-email launch sequence in content/email/launch-sequence.md
