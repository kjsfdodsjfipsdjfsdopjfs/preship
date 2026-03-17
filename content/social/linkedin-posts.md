# LinkedIn Posts for PreShip

---

## Post 1: Launch Announcement

**We just launched PreShip.**

After months of building, we are live at preship.dev.

PreShip is an API-first scanning platform that checks AI-generated applications for accessibility, security, and performance issues — before they reach production.

The problem we are solving: AI coding tools (Cursor, Bolt, Lovable, and others) have made it possible to build and ship applications incredibly fast. But speed without quality assurance creates real risk. AI-generated code consistently fails accessibility standards, introduces security vulnerabilities, and ships unoptimized performance.

Our approach is different from existing tools in three ways:

1. API-first — one HTTP request triggers a scan and returns structured JSON. No dashboard required.
2. Built for AI-generated code — our rules are tuned for the specific patterns and violations that LLMs produce.
3. CI/CD native — drop it into GitHub Actions or any pipeline as a deployment gate in under five minutes.

We believe vibe coding is the future of software development. It just needs a quality layer.

Free tier available. No credit card required.

preship.dev

#accessibility #webdev #startup #launch #ai

---

## Post 2: Problem Awareness (Accessibility Gap)

**AI is making the web less accessible, not more.**

A provocative claim, but the data supports it.

WebAIM's analysis of the top one million websites found that 95.9% fail basic WCAG accessibility standards. The average page contains over 50 detectable violations.

Now millions of developers are generating entire applications with AI. These tools produce code that renders correctly in a browser — but "renders correctly" is not the same as "works for everyone."

AI-generated code consistently lacks:
- Alternative text for images
- Programmatic form labels
- Sufficient color contrast
- Keyboard navigation support
- Proper document structure for screen readers

The models are trained on the existing web, and the existing web is overwhelmingly inaccessible. AI reproduces those patterns at scale.

Meanwhile, ADA digital accessibility lawsuits exceeded 5,000 filings in 2025. Average settlement cost: approximately $75,000. Plaintiff law firms are using automated scanning to identify targets. Solo developers and small startups are not exempt.

We built PreShip because this trajectory is unsustainable. Automated quality gates — integrated into the deployment pipeline — are the only way to maintain both the speed benefits of AI coding and the quality standards that users deserve and the law requires.

The tools exist. The cost is negligible. The risk of inaction is enormous.

#accessibility #wcag #ada #webdevelopment #ai

---

## Post 3: How It Works (Technical Audience)

**Quality assurance should be an API call, not a workflow.**

Traditional scanning tools require you to create an account, configure a project, navigate a dashboard, trigger a scan, and interpret a PDF report.

That made sense when teams shipped quarterly. It does not work when you are deploying from AI-generated code multiple times per day.

PreShip takes a different approach. Every feature is accessible through a REST API. A scan is a single POST request:

POST /v1/scan
Body: { "url": "https://your-app.com", "checks": ["accessibility", "security", "performance"] }

The response is structured JSON containing:
- Scores for each dimension (0-100)
- Individual findings with severity, WCAG rule reference, and DOM selector
- Fix recommendations in plain language
- Summary statistics for threshold-based gating

Integration with GitHub Actions takes four lines of YAML. Set minimum score thresholds, and pull requests that introduce violations are automatically blocked.

The technical decisions we made:

Stateless scanning — no project configuration, no persistent state. Every scan is independent. Send a URL, get results.

Structured output — every finding includes enough context to programmatically create a ticket, generate an AI fix prompt, or filter by severity. No parsing PDFs.

Tuned for AI patterns — our rule weighting accounts for the specific categories of issues that LLMs introduce: missing ARIA, placeholder-only labels, hardcoded secrets in client bundles, render-blocking scripts.

Free tier: 50 scans per month. No credit card.

If you are building with AI and deploying without scanning, you are shipping blind.

preship.dev

#api #devtools #cicd #accessibility #security

---

## Post 4: Case Study Format (Before/After Scan)

**We scanned 500 AI-generated applications. Here is what we found.**

During our beta period, we ran PreShip against 500 publicly deployed applications built with AI coding tools. The results were striking.

BEFORE (average scores across 500 apps):
- Accessibility: 38/100
- Security: 52/100
- Performance: 61/100

The most common accessibility violations:
- 94% had images without alt text
- 87% had form inputs without labels
- 73% had insufficient color contrast
- 68% had no keyboard navigation on custom components
- 61% were missing document language attributes

The most common security issues:
- 41% had missing security headers (CSP, X-Frame-Options)
- 33% had mixed content (HTTP resources on HTTPS pages)
- 18% had detectable exposed API keys in client-side code

AFTER (same apps, 30 days later, with PreShip integrated):
- Accessibility: 84/100 (+121% improvement)
- Security: 79/100 (+52% improvement)
- Performance: 76/100 (+25% improvement)

The developers who saw the biggest improvements shared a common approach: they integrated PreShip into their CI/CD pipeline as a deployment gate rather than running manual scans occasionally.

Continuous automated scanning caught regressions immediately. Threshold-based blocking prevented new violations from reaching production. Structured findings made it straightforward to generate targeted fix prompts for their AI coding tools.

Quality is not a one-time audit. It is a continuous process. The tools to automate it exist today.

preship.dev — free tier available.

#qualityassurance #accessibility #devtools #ai #data

---

## Post 5: Pricing Announcement

**We believe quality scanning should be accessible to every developer.**

Today we are publishing PreShip's pricing, and we kept it simple:

**Free — $0/month**
- 50 scans per month
- Full accessibility, security, and performance checks
- API access
- No credit card required

**Pro — $29/month**
- 500 scans per month
- Priority scanning queue
- Scan history and trend tracking
- GitHub Action included

**Team — $79/month**
- Unlimited scans
- Multiple API keys
- Team dashboard
- Webhook notifications
- Priority support

No per-seat pricing. No annual commitment. No feature gating on the scan engine itself — every tier runs the same comprehensive checks.

Why this matters: the tools that catch accessibility violations, security gaps, and performance issues should not be priced out of reach for solo developers and small teams. These are the builders who benefit most from AI coding tools and are most vulnerable to the quality gaps those tools create.

The free tier is not a trial. It is permanent. Fifty scans per month is enough to scan every deployment for most early-stage projects.

We make money when teams scale and need higher volume, history tracking, and collaboration features. The core scanning capability stays free.

Start scanning at preship.dev.

#pricing #saas #startup #developer #accessibility
