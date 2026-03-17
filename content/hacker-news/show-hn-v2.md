# Show HN — v2 (Dogfooding Edition)

## Title

Show HN: PreShip — We built an accessibility scanner with AI. It scored 25/100 on itself.

## Body

---

We built PreShip, an automated quality scanner that checks accessibility, security, and performance for web applications. The target use case is catching issues in AI-generated code before it ships.

Then we ran it on our own landing page. Score: 25/100.

**The results:**

- Accessibility: 0/100 — 95 violations, 0 passes
- Security: 0/100 — 10 missing HTTP security headers
- Performance: 100/100 — fast, at least

**What went wrong:**

We built the landing page using Claude and Cursor. Standard AI-assisted workflow. The page looked polished — dark theme, smooth animations, clean typography. Every visual review said "ship it."

Under the surface: 29 color contrast failures (gray text on dark backgrounds, below WCAG 4.5:1 ratio), zero semantic HTML landmarks, broken heading hierarchy, and no form labels on our primary scan input. A screen reader user visiting an accessibility scanner couldn't even use it.

On security: no Content-Security-Policy, no Strict-Transport-Security, no X-Content-Type-Options, and seven other missing headers. Standard protections that AI doesn't add unless you specifically ask.

**Why this happens:**

AI optimizes for visual output, not semantic correctness. A `div` with the right CSS looks identical to a `nav` element on screen but is invisible to assistive technology. AI training data is mostly inaccessible code (WebAIM Million: 95.9% of home pages have WCAG failures), so models reproduce those patterns.

**The fix:**

We used PreShip's own fix suggestions to remediate. Replaced div soup with semantic elements, fixed contrast ratios while keeping the dark theme, added form labels, configured security headers. Total time: roughly four hours. Score: 25 to 85+ (still finalizing).

**Tech details:**

- Scanner engine: axe-core for accessibility, custom checks for security headers and performance
- Fix suggestions: AI-generated, context-aware recommendations per violation
- Stack: Next.js, deployed on Vercel
- Scan time: under 60 seconds for most pages

**Why we're sharing this:**

41% of code is now AI-generated. The tooling to check what AI produces hasn't kept up. Lighthouse covers performance. axe covers accessibility. Nobody combines them into a single pre-ship quality gate with actionable fixes.

We think there should be a `npm test` equivalent for "can humans actually use this." That's what we're building.

Blog post with full technical breakdown: [link to post-4-we-scored-25]

Live at https://preship.dev — 20 free scans/month, no account required for first scan.

Happy to answer questions about the architecture, the scoring methodology, or our embarrassing 25/100.

---

## Posting Notes

- Update 85+ with actual final score
- Insert real blog post URL before posting
- Best posting times for Show HN: weekday mornings, 8-10am ET (Tuesday-Thursday preferred)
- Prepare for technical questions about:
  - How scoring works (weighted average across categories)
  - Why not just use Lighthouse + axe directly (integration, fix suggestions, single workflow)
  - False positives / accuracy (axe-core is the industry standard, we inherit its accuracy)
  - Self-hosted option (not yet, but on roadmap)
  - Privacy (we don't store page content, only scan results)
- Avoid marketing language in HN comments — stay technical and honest
- If the post gains traction, have the blog post ready to link in follow-up comments
