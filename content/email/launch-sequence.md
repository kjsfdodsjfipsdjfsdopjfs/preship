# PreShip Launch Email Sequence

---

## Email 1: Awareness

**Subject line:** Your AI app has 23 accessibility violations

**Preview text:** We scanned 500 AI-built apps. The average had 45 issues.

**Body:**

Hi {{first_name}},

We recently scanned 500 applications built with AI coding tools — Cursor, Bolt, Lovable, and others.

The average app had 45 accessibility violations. 94% were missing alt text on images. 87% had form inputs that screen readers could not identify. 73% had color contrast that failed basic WCAG standards.

The average accessibility score was 38 out of 100.

These are not edge cases. These are the default patterns that AI-generated code produces. If you have built or shipped an application using AI coding tools, your app almost certainly has similar issues.

Why does this matter?

- Over 5,000 ADA digital accessibility lawsuits were filed in 2025
- The average settlement costs approximately $75,000
- Plaintiff law firms are using automated scanning to find targets
- Solo developers and small startups are not exempt

Most developers building with AI do not realize these violations exist. The code works. The UI looks correct. The problems are invisible — unless you know how to look for them.

We built PreShip to make looking for them effortless.

**[Scan your app free -- button]**

One URL. Thirty seconds. You will know exactly where you stand.

Best,
The PreShip Team

P.S. — Your first 50 scans are free. No credit card required.

---

## Email 2: Solution

**Subject line:** How PreShip found and fixed 94% of issues automatically

**Preview text:** From a score of 38 to 91 — here's how.

**Body:**

Hi {{first_name}},

In our last email, we shared that the average AI-generated app scores 38 out of 100 on accessibility.

Today we want to show you what happens after scanning.

During our beta, developers who integrated PreShip into their workflow saw their average scores improve dramatically within 30 days:

- Accessibility: 38 to 84 (+121%)
- Security: 52 to 79 (+52%)
- Performance: 61 to 76 (+25%)

Here is what made the difference:

**Structured, actionable findings.** PreShip does not just tell you that your app has problems. Every finding includes the exact DOM element, the WCAG rule violated, the severity level, and a plain-language explanation of how to fix it.

**CI/CD integration.** The developers who improved fastest were the ones who added PreShip as a deployment gate. Every pull request gets scanned automatically. If the accessibility score drops below 80, the merge is blocked. Regressions are caught before they reach production.

**AI-compatible output.** Because findings are structured JSON with DOM selectors and fix descriptions, developers are feeding PreShip reports directly back into their AI coding tools as fix prompts. The same AI that created the violations can fix them — it just needs to be told what is wrong.

The entire workflow fits into your existing process. No new dashboard to learn. No manual review cycle. Quality assurance becomes automatic.

**[See how it works -- button]**

We put together a 2-minute walkthrough showing a real scan from URL submission to CI/CD integration.

Best,
The PreShip Team

---

## Email 3: Launch CTA

**Subject line:** Launch day: scan your first app free

**Preview text:** PreShip is live. 50 free scans/month, no credit card.

**Body:**

Hi {{first_name}},

PreShip is officially live.

Starting today, you can scan any web application for accessibility, security, and performance issues — and get a detailed report in seconds.

**What you get with the free tier:**

- 50 scans per month (no credit card, no trial expiration)
- Full WCAG 2.2 AA accessibility scanning
- Security header analysis and vulnerability detection
- Performance scoring with Core Web Vitals
- Structured JSON API responses
- GitHub Actions integration

**How to start:**

1. Go to preship.dev and create your account
2. Copy your API key
3. Run your first scan:

```
curl -X POST https://api.preship.dev/v1/scan \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"url": "https://your-app.com"}'
```

That is it. You will get back a complete quality report for your application in under 30 seconds.

**Launch week pricing:**

We are offering 30% off annual Pro and Team plans for the first 500 customers. Use code LAUNCH30 at checkout.

- Pro: $29/mo → $20/mo (billed annually) — 500 scans/month
- Team: $79/mo → $55/mo (billed annually) — unlimited scans

**[Claim your free account -- button]**

If you are building with AI, you need to know what your code actually looks like under the hood. PreShip gives you that visibility.

Ship with confidence.

The PreShip Team

P.S. — We are on Product Hunt today. If PreShip sounds useful, an upvote would mean a lot to our small team. [Product Hunt link]
