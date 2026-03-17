# Twitter/X Threads for PreShip

---

## Thread 1: "I built an AI app and it was completely inaccessible"

**Tweet 1:**
I built a full SaaS app with AI in one weekend.

Then I ran an accessibility scan.

42 critical violations. Completely unusable for anyone with a disability.

Here's what I learned (and how I fixed it): 🧵

**Tweet 2:**
The app looked great. Clean UI, smooth animations, responsive layout.

But under the hood:
- Zero alt text on images
- No form labels (just placeholders)
- Icon buttons with no accessible names
- Keyboard navigation completely broken

AI optimizes for visual output, not inclusive design.

**Tweet 3:**
The hard truth: LLMs are not trained to prioritize accessibility.

When you prompt "build me a dashboard," the AI delivers something that works for sighted mouse users on fast connections.

It does not consider screen readers, keyboard-only users, or low vision.

**Tweet 4:**
The numbers are sobering:

- 95.9% of top websites fail basic WCAG compliance
- AI-generated code performs even worse
- Over 5,000 ADA lawsuits were filed in 2025
- Average settlement: ~$75K

This is not a niche concern. It is a legal and moral obligation.

**Tweet 5:**
The fix was not to stop using AI. It was to add a quality gate.

I started scanning every deployment with @prabordig. One API call returns:
- Accessibility score + violations
- Security issues
- Performance problems

All in structured JSON I can parse in CI/CD.

**Tweet 6:**
Within a week, my accessibility score went from 42 to 94.

Most fixes were straightforward once I knew what was broken:
- Added alt text
- Connected labels to inputs
- Fixed heading hierarchy
- Added keyboard handlers to custom components

**Tweet 7:**
If you are building with AI, do not ship blind.

Scan your app before your users (or their lawyers) find the problems first.

Free scans at preship.dev — no credit card, takes 30 seconds.

Your vibe-coded app deserves a quality check.

---

## Thread 2: "95% of websites fail accessibility"

**Tweet 1:**
95.9% of the top 1 million websites fail basic accessibility standards.

AI-generated code is making this worse, not better.

Here's why — and what the industry is missing: 🧵

**Tweet 2:**
WebAIM scans the top 1M sites every year.

The results are consistently alarming:
- Average of 50+ accessibility errors per page
- Most common: missing alt text, low contrast, empty links
- Year over year improvement is marginal

We have known about these problems for decades. We are not fixing them.

**Tweet 3:**
Now add AI to the equation.

Millions of developers are generating entire applications with LLMs. These tools produce code that works — but "works" means "renders in Chrome for a sighted user with a mouse."

The accessibility bar is already low. AI is digging underneath it.

**Tweet 4:**
Why do LLMs fail at accessibility?

Training data. The vast majority of code on the internet is inaccessible. LLMs learn from that code. They reproduce its patterns.

Semantic HTML, ARIA attributes, keyboard handling — these are underrepresented in training data.

**Tweet 5:**
The consequences are escalating.

ADA digital lawsuits: 5,100+ in 2025. Average settlement: $75K. Target defendants now include solo developers and small startups, not just Fortune 500 companies.

Plaintiff law firms have automated violation detection. They are scanning at scale.

**Tweet 6:**
The solution is not training better models (though that would help).

The solution is automated quality gates that catch violations before deployment.

Scan on every PR. Block deploys that drop below threshold. Make accessibility a pipeline check, not a manual review.

**Tweet 7:**
We built @prabordig for exactly this.

API-first scanning for accessibility, security, and performance — designed for the AI-generated code era.

One curl command. Structured results. CI/CD ready.

Try it free: preship.dev

---

## Thread 3: "One API call away from knowing if your app is secure"

**Tweet 1:**
You are one API call away from knowing if your app is secure, accessible, and performant.

Not a dashboard. Not a browser extension. One HTTP request.

Here's what API-first scanning looks like: 🧵

**Tweet 2:**
Traditional scanning tools require you to:
1. Create an account
2. Navigate a dashboard
3. Configure a project
4. Wait for a scan
5. Read a PDF report
6. Manually create tickets

That workflow does not survive contact with modern development speed.

**Tweet 3:**
API-first scanning with PreShip:

```
curl -X POST https://api.preship.dev/v1/scan \
  -H "Authorization: Bearer $KEY" \
  -d '{"url": "https://your-app.com"}'
```

Response: structured JSON with scores, findings, and fix recommendations.

That's it. No dashboard required.

**Tweet 4:**
What you get back:

- Accessibility score (0-100) + every WCAG 2.2 violation
- Security score + header issues, mixed content, exposed secrets
- Performance score + Core Web Vitals, render-blocking resources

Each finding includes severity, DOM selector, and how to fix it.

**Tweet 5:**
Drop it into GitHub Actions:

- Scan preview deployments on every PR
- Set minimum score thresholds
- Block merges that introduce violations
- Post results as PR comments

Quality enforcement on autopilot.

**Tweet 6:**
Why does this matter for AI-generated code specifically?

Because AI introduces the same categories of issues consistently. Missing alt text. No form labels. Hardcoded secrets. Render-blocking scripts.

Predictable problems deserve automated detection.

**Tweet 7:**
Get your API key at preship.dev.

Free tier: 50 scans/month. No credit card.

Add a quality gate to your pipeline in under 5 minutes. Know exactly what your code is shipping.

---

## Thread 4: "ADA lawsuits cost $75K average"

**Tweet 1:**
ADA web accessibility lawsuits cost an average of $75,000 to settle.

Over 5,000 were filed in 2025.

Your vibe-coded app might be next. Here is what you need to know: 🧵

**Tweet 2:**
The legal landscape has shifted permanently.

Courts have confirmed: websites are covered under ADA Title III. The DOJ issued formal guidance. There is no ambiguity left.

If your app is publicly available in the US and it is not accessible, you are exposed.

**Tweet 3:**
Plaintiff law firms have industrialized this.

They run automated scans against thousands of sites. When they find violations, they send demand letters. If you do not settle, they file suit.

Your side project is not too small to be targeted. Several defendants have been solo developers.

**Tweet 4:**
The $75K average settlement includes:
- Legal defense costs ($10-50K alone)
- Plaintiff damages
- Mandatory remediation
- Ongoing compliance monitoring

And it does not include the engineering time to actually fix the issues or the reputational damage.

**Tweet 5:**
AI-generated code is particularly vulnerable because it consistently produces the exact violations that automated plaintiff scans detect:

- Missing alt text
- Empty form labels
- Insufficient contrast
- Missing document language

These are the low-hanging fruit that trigger lawsuits.

**Tweet 6:**
Prevention costs a fraction of remediation.

Add automated accessibility scanning to your deployment pipeline. Catch violations before they reach production. Maintain scan records as evidence of good-faith compliance efforts.

Courts look favorably on documented, proactive accessibility programs.

**Tweet 7:**
PreShip scans for every common ADA violation and reports findings you can act on immediately.

API-first. CI/CD ready. Free tier available.

Fix a $75K problem for free: preship.dev

---

## Thread 5: "We just launched PreShip"

**Tweet 1:**
We just launched PreShip — an API-first platform that scans AI-generated apps for accessibility, security, and performance issues.

Here's why we built it and how it works: 🧵

**Tweet 2:**
The problem: AI coding tools let anyone build and ship apps incredibly fast.

But speed without quality is just shipping bugs faster.

AI-generated code consistently fails accessibility standards, introduces security vulnerabilities, and produces unoptimized performance.

**Tweet 3:**
The market gap: existing scanning tools were built for a pre-AI workflow.

They assume manual configuration, dashboard-driven reviews, and PDF reports.

None of that works when you are deploying multiple times per day from AI-generated code.

**Tweet 4:**
Our approach: API-first, built for the AI era.

One POST request scans any URL for:
- WCAG 2.2 AA accessibility compliance
- Security headers, mixed content, exposed secrets
- Core Web Vitals and performance optimization

Returns structured JSON. No dashboard required.

**Tweet 5:**
Key design decisions:

- Structured JSON output for programmatic processing
- CI/CD integration in minutes (GitHub Actions, GitLab CI, etc.)
- Findings include DOM selectors and fix recommendations
- Scoring system designed for threshold-based deployment gates

**Tweet 6:**
Pricing is simple:

Free: 50 scans/month
Pro: 500 scans/month
Team: unlimited scans + team features

No per-seat pricing. No annual commitments. Cancel anytime.

We want quality scanning to be accessible (pun intended) to every developer.

**Tweet 7:**
Try it now at preship.dev.

Scan your first app in 30 seconds. See exactly what your AI-generated code is missing.

We built PreShip because we believe vibe coding is the future — it just needs a quality layer.

Ship with confidence.
