# Product Hunt Launch Copy

---

## Tagline (< 60 chars)

Scan your vibe-coded app before you ship it

## Subtitle

API-first accessibility, security, and performance scanning for AI-generated applications

## Description (< 260 chars)

PreShip scans AI-generated web apps for accessibility (WCAG 2.2), security vulnerabilities, and performance issues. One API call returns a full quality report with scores, findings, and fix recommendations. Drop it into CI/CD as your deployment gate. Free tier available.

## First Comment from Maker

Hey Product Hunt! I'm the maker of PreShip.

I started building this after shipping a side project with Cursor and discovering — weeks later — that it had 40+ accessibility violations, missing security headers, and terrible performance on mobile.

The app looked great in my browser. But it was completely unusable for screen reader users, had no keyboard navigation, and loaded in 8 seconds on a 3G connection.

That experience made me realize something: AI coding tools have solved the speed problem, but they have created a quality problem. LLMs generate code that works for sighted mouse users on fast connections, but they do not prioritize the accessibility, security, and performance standards that production applications require.

I looked for a tool that would fit into my workflow — something I could add to CI/CD and forget about. Everything I found required dashboards, manual configuration, or PDF reports. Nothing was API-first. Nothing was designed for the AI-generated code era.

So I built PreShip.

The core idea is simple: POST a URL, get back a JSON report with scores and findings. Drop it into GitHub Actions as a deployment gate. Every PR gets scanned automatically. If quality scores drop below your threshold, the merge is blocked.

During beta, we scanned 500 AI-built apps. The average accessibility score was 38 out of 100. After 30 days of using PreShip, the average improved to 84.

Free tier gives you 50 scans per month with full functionality. No credit card required.

I would love your feedback on the product, the API design, or the approach. Happy to answer any questions here.

## 5 Key Features

**1. One-Call Scanning**
POST a URL, get back structured JSON with accessibility, security, and performance scores plus individual findings. No project setup, no dashboard navigation, no manual configuration required.

**2. WCAG 2.2 AA Compliance**
Full scanning against current Web Content Accessibility Guidelines. Catches missing alt text, broken form labels, contrast failures, keyboard issues, and dozens of other violations with DOM selectors and fix instructions.

**3. CI/CD Deployment Gate**
GitHub Actions integration in four lines of YAML. Set minimum score thresholds and automatically block deployments that introduce quality regressions. Scan preview URLs on every pull request.

**4. AI-Pattern Detection**
Rule engine tuned for the specific violation patterns that AI coding tools produce. Weighted scoring that reflects the real-world frequency and severity of LLM-generated issues.

**5. Actionable Fix Recommendations**
Every finding includes the exact DOM element, the rule violated, severity level, and a plain-language explanation of how to fix it. Output is structured for feeding directly back into AI coding tools as fix prompts.
