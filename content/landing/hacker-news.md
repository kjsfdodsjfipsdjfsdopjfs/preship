# Hacker News — Show HN Post

---

## Title

Show HN: PreShip — API-first quality scanning for AI-generated web apps

## Body

I built PreShip (https://preship.dev) to solve a problem I kept running into: AI coding tools produce applications that work but fail on accessibility, security, and performance in predictable ways.

**The problem.** I have been using AI coding tools extensively for the past year. The productivity gains are real. But every time I ran a manual audit on something I shipped, I found the same categories of issues: missing ARIA attributes, no form labels (just placeholders), insufficient color contrast, hardcoded API keys in client bundles, missing security headers, render-blocking resources. The apps looked correct but were structurally deficient.

This is not surprising. LLMs are trained on the existing web, and the existing web is overwhelmingly inaccessible and insecure. AI reproduces those patterns faithfully.

**The approach.** PreShip is a REST API. You POST a URL and optional configuration, and you get back a JSON response containing scores (0-100) for accessibility, security, and performance, plus individual findings with severity, DOM selectors, WCAG rule references, and fix recommendations.

There is no dashboard you are required to use. The primary interface is the API. The design goal is to be a quality gate in CI/CD pipelines — scan preview deployments on every PR, fail the check if scores drop below a configured threshold.

**Technical details.** The scanning engine uses Puppeteer for page rendering, axe-core as the foundation for accessibility analysis (extended with custom rules for AI-specific patterns), and custom analyzers for security headers, mixed content, exposed secrets, and performance metrics. We collect Core Web Vitals data from the rendered page.

The API is stateless. Every scan is independent — no project configuration, no persistent state to manage. Authentication is a Bearer token. Rate limiting is per-key with configurable burst allowance.

Response payloads include DOM selectors for every finding, which makes it straightforward to programmatically generate fix patches or feed findings back into an AI coding tool as a targeted prompt. Several beta users built closed-loop workflows: scan with PreShip, feed violations to their LLM, re-scan to verify.

**What we found in beta.** We scanned 500 AI-generated apps during beta. Average accessibility score: 38/100. 94% missing alt text. 87% missing form labels. 73% failing contrast requirements. Security averaged 52/100, primarily due to missing CSP, X-Frame-Options, and referrer policies.

**Pricing.** Free tier is 50 scans/month with full functionality. No credit card. Pro is $29/month for 500 scans. Team is $79/month unlimited.

I am interested in feedback on the API design, the scanning approach, and whether the CI/CD deployment gate use case resonates. Happy to discuss the technical architecture in detail.

Source code for the GitHub Action integration is at github.com/preship/action.
