# We Scanned 10 Popular Dev Tools. Here's What We Found.

*Published on March 18, 2026 · 4 min read*

---

We ran PreShip's scanner against 10 popular developer tools and platforms. These are sites built by some of the best engineering teams in the world — Vercel, Supabase, Linear, Railway, and more.

The results were... interesting.

## The Sites We Scanned

We scanned the public-facing marketing pages of each site using PreShip's 6-category audit: accessibility, security, performance, SEO, privacy, and mobile.

| Site | Overall Score | SEO | Privacy | Mobile | Violations |
|------|-------------|-----|---------|--------|------------|
| vercel.com | 35 | 100 | 100 | 100 | 182 |
| supabase.com | 35 | 100 | 100 | 100 | 207 |
| linear.app | 35 | 100 | 100 | 100 | 203 |
| railway.com | 35 | 100 | 100 | 100 | 783 |
| planetscale.com | 38 | 100 | 100 | 100 | 138 |
| clerk.com | 35 | 100 | 100 | 100 | 163 |
| resend.com | 35 | 100 | 100 | 100 | 560 |
| cal.com | 35 | 100 | 100 | 100 | 762 |
| dub.co | 35 | 100 | 100 | 100 | 675 |
| turso.tech | 35 | 100 | 100 | 100 | 308 |

## What Went Right

**SEO, Privacy, and Mobile scores are perfect across the board.** Every single site we scanned nailed these categories. This makes sense — these teams clearly care about discoverability, user trust, and responsive design.

Specific wins we noticed:
- Every site has proper Open Graph and Twitter Card meta tags
- Privacy policies are linked and accessible
- Cookie consent mechanisms are in place
- Mobile viewports are properly configured
- Touch targets are appropriately sized

## The Accessibility Gap

The elephant in the room: **accessibility scores are low across the board.** The most common violations we found:

1. **Color contrast failures** — foreground/background combinations that don't meet WCAG 2 AA minimum ratios. This was the #1 violation across all 10 sites.

2. **Missing ARIA attributes** — elements using roles that require specific ARIA properties.

3. **Interactive elements without accessible names** — buttons and links that screen readers can't identify.

4. **Heading hierarchy issues** — skipped heading levels (jumping from h1 to h4).

## The Numbers

- **Average violations per site: 398**
- **Highest: railway.com (783 violations)**
- **Lowest: planetscale.com (138 violations)**
- **Most common severity: high**

## Why This Matters

These aren't amateur sites. These are built by engineering teams at well-funded companies. If they have hundreds of accessibility violations, what does your vibe-coded MVP look like?

The truth is that accessibility is hard to get right, and it's easy to deprioritize when you're shipping fast. But with over 5,000 ADA lawsuits filed in 2025, it's becoming a legal obligation — not just a nice-to-have.

## What You Can Do

1. **Scan your site** — Run a quick check at [preship.dev](https://preship.dev) to see where you stand.
2. **Fix the easy wins first** — Color contrast and alt text are straightforward fixes.
3. **Add scanning to your CI/CD** — Catch regressions before they ship.

The goal isn't perfection. It's awareness and continuous improvement.

---

*All scans were run on March 18, 2026 using PreShip's automated scanner. Results reflect the state of each site's public marketing pages at the time of scanning.*
