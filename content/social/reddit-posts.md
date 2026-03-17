# Reddit Posts for PreShip

---

## r/webdev: "I built a tool that scans AI-generated code for accessibility issues"

**Title:** I built a tool that scans AI-generated code for accessibility issues — here's what I found after scanning 500 apps

**Body:**

Hey r/webdev,

I have been working on PreShip (preship.dev), an API-first scanning platform that checks web applications for accessibility, security, and performance issues. It is specifically designed for the wave of applications being built with AI coding tools.

During our beta, we scanned 500 publicly deployed apps built with Cursor, Bolt, Lovable, and similar tools. The average accessibility score was 38 out of 100.

The most common issues we found:

- **94% had missing alt text** — AI generates images without alt attributes almost universally. Not empty alt for decorative images, just completely missing.
- **87% had form inputs without labels** — Placeholder text everywhere, no programmatic label association. Screen readers cannot identify what an input is for.
- **73% had insufficient contrast** — AI picks aesthetically pleasing color schemes without checking the 4.5:1 ratio WCAG requires.
- **68% had broken keyboard navigation** — Custom components built with divs and onClick handlers. No tabindex, no keyboard events, no focus management.
- **41% had missing security headers** — No Content-Security-Policy, no X-Frame-Options, no referrer policy.

The tool works through a REST API. You POST a URL, you get back JSON with scores, individual findings (including DOM selectors), and fix recommendations. There is no dashboard you have to use.

The idea is to drop it into CI/CD as a deployment gate. Scan preview deployments on every PR, fail the check if scores drop below your threshold.

Free tier is 50 scans per month, no credit card.

I am here to answer questions about the technical approach, the findings from our beta scans, or accessibility in AI-generated code generally. Happy to take feedback on the tool as well.

---

## r/SideProject: Launch Post

**Title:** PreShip — API-first accessibility, security, and performance scanning for AI-generated apps

**Body:**

Hey everyone, launching PreShip today after several months of building.

**What it does:** Scans any web application for accessibility (WCAG 2.2 AA), security, and performance issues. Returns structured JSON with scores, findings, and fix recommendations. Designed to be a quality gate in CI/CD pipelines.

**Why I built it:** I was shipping apps with AI coding tools and realized I had no idea what the quality looked like under the hood. Ran a manual accessibility audit on one of my projects and found 40+ violations. Started building an automated scanner and it turned into a product.

**What makes it different:**
- API-first — no dashboard required, just HTTP requests
- Built for AI-generated code patterns (the specific violations LLMs produce)
- Returns machine-readable results, not PDF reports
- CI/CD integration in minutes

**Tech stack:** Node.js backend, Puppeteer for rendering, axe-core for accessibility analysis, custom rule engine for security and performance checks. Hosted on AWS.

**Pricing:**
- Free: 50 scans/month
- Pro: $29/month for 500 scans
- Team: $79/month unlimited

Would appreciate any feedback on the product, the positioning, or the landing page. Happy to give extended free access to anyone here who wants to try it out and share honest feedback.

preship.dev

---

## r/nextjs: Integration Guide

**Title:** How to add accessibility and security scanning to your Next.js CI/CD pipeline (5 minutes, free)

**Body:**

I wanted to share a quick guide for adding automated accessibility and security scanning to a Next.js project deployed on Vercel.

The tool is PreShip (preship.dev) — it is an API that scans any URL for WCAG 2.2 accessibility compliance, security headers, and performance issues. Free tier gives you 50 scans per month.

**Step 1: Get an API key**

Sign up at preship.dev and grab your key from the dashboard.

**Step 2: Add to GitHub Actions**

Create `.github/workflows/preship.yml`:

```yaml
name: Quality Gate
on:
  deployment_status:

jobs:
  scan:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - name: Scan deployment
        run: |
          RESULT=$(curl -s -X POST https://api.preship.dev/v1/scan \
            -H "Authorization: Bearer ${{ secrets.PRESHIP_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"url": "${{ github.event.deployment_status.target_url }}"}')

          A11Y=$(echo $RESULT | jq '.scores.accessibility')
          SEC=$(echo $RESULT | jq '.scores.security')

          echo "Accessibility: $A11Y | Security: $SEC"

          if [ "$A11Y" -lt 80 ]; then
            echo "::error::Accessibility score $A11Y is below threshold (80)"
            echo "$RESULT" | jq '.findings[] | select(.type == "accessibility") | .message'
            exit 1
          fi
```

**Step 3: Add your API key**

Go to your repo Settings > Secrets and variables > Actions, and add `PRESHIP_API_KEY`.

That is it. Every Vercel preview deployment will now be scanned automatically. If the accessibility score drops below 80, the check fails and the findings are printed in the workflow log.

**Why this matters for Next.js specifically:**

Next.js apps built with AI tools tend to have a specific set of issues: missing alt props on next/image, Link components wrapping divs instead of anchors, missing metadata, and client components that do not handle keyboard events. This catches all of those automatically.

Happy to answer questions about the integration or about the specific violations we see most often in Next.js projects.

---

## r/accessibility: "Why AI-generated code is creating an accessibility crisis"

**Title:** Why AI-generated code is creating an accessibility crisis — data from scanning 500 apps

**Body:**

I want to share some data that I think this community will find relevant and concerning.

Over the past few months, I have been building PreShip (preship.dev), a tool that scans web applications for WCAG 2.2 AA compliance. During our beta, we scanned 500 publicly deployed applications that were built primarily with AI coding tools (Cursor, Bolt, Lovable, and similar products).

The findings confirm what many in this community have been warning about:

**Average accessibility score: 38 out of 100**

The most common violations, ranked by frequency:

1. **Missing alt text (94%)** — Not empty alt for decoration. Just completely absent alt attributes. LLMs generate img elements without considering alternative text at all.

2. **Missing form labels (87%)** — AI relies on placeholder text for visual context and does not create label elements. Every form on these applications was inaccessible to screen reader users.

3. **Insufficient contrast (73%)** — AI favors trendy, muted color palettes that fail the 4.5:1 minimum. Light gray on white is everywhere.

4. **No keyboard navigation (68%)** — Custom interactive components are built with div elements and click handlers. No tabindex, no keyboard events, no focus management. Keyboard-only users are completely locked out.

5. **Missing document structure (55%)** — Heading levels chosen for visual size, not hierarchy. Missing landmark regions. Screen reader navigation is severely impaired.

6. **Empty interactive elements (49%)** — Icon-only buttons and links without accessible names. The icon communicates purpose visually, but assistive technology announces nothing meaningful.

**Why this is happening at scale:**

AI coding tools are being adopted at an unprecedented rate. Developers with no accessibility training are shipping production applications in days. The LLMs generating the code were trained on the existing web — which is already 96% noncompliant according to WebAIM's data.

The result is a compounding problem. AI learns from inaccessible code, generates more inaccessible code, which becomes the training data for the next generation of models.

**What can be done:**

I do not think the answer is to stop using AI for code generation. The productivity gains are too significant and the adoption curve is too steep.

The answer is automated quality gates. Scanning every deployment for accessibility violations before they reach production. Making WCAG compliance a pipeline check rather than a manual audit.

That is what PreShip does — scans any URL via API and returns structured findings with severity, DOM location, and fix recommendations. Free tier available.

But regardless of what tool you use, I think this community should be actively advocating for accessibility scanning to be a standard part of every CI/CD pipeline. The volume of inaccessible applications being deployed is accelerating, and manual advocacy alone cannot keep pace.

I would value this community's perspective on the data, the trends, and what interventions would be most effective.
