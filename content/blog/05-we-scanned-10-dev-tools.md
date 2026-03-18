# We Scanned 10 Popular Dev Tools. Here's What We Found.

*Published on March 18, 2026 · 4 min read*

---

We pointed PreShip at 10 of the most popular developer platforms. These are sites built by elite engineering teams — Vercel, Supabase, Linear, Railway, and more.

None of them scored above 65.

## The Results

We scanned each site across 6 categories: accessibility, security, performance, SEO, privacy, and mobile responsiveness.

| Site | PreShip Score | A11y | Security | Perf | SEO | Privacy | Mobile | Violations |
|------|-------------|------|----------|------|-----|---------|--------|------------|
| planetscale.com | **64** | 1 | 65 | 84 | 100 | 100 | 100 | 135 |
| vercel.com | **54** | 11 | 34 | 51 | 100 | 100 | 100 | 110 |
| linear.app | **52** | 0 | 44 | 39 | 100 | 100 | 100 | 201 |
| resend.com | **52** | 1 | 37 | 53 | 100 | 100 | 100 | 241 |
| dub.co | **52** | 0 | 39 | 51 | 100 | 100 | 100 | 669 |
| turso.tech | **51** | 0 | 19 | 77 | 100 | 100 | 100 | 305 |
| cal.com | **50** | 0 | 28 | 51 | 100 | 100 | 100 | 761 |
| supabase.com | **49** | 1 | 28 | 45 | 100 | 100 | 100 | 208 |
| railway.com | **48** | 0 | 31 | 36 | 100 | 100 | 100 | 781 |
| clerk.com | **47** | 16 | 11 | 36 | 100 | 100 | 100 | 177 |

**Average PreShip Score: 52/100**

## What They Got Right

SEO, privacy, and mobile are perfect across the board. Every site has proper OG tags, privacy policies linked, cookie consent in place, responsive viewports, and good touch targets. These teams clearly care about discoverability and mobile experience.

## Where They Struggle

### Accessibility (avg score: 3/100)

Accessibility is the weakest category by far. The most common violations:

1. **Color contrast failures** — foreground/background combos that don't meet WCAG 2 AA ratios. This was the #1 issue on every single site.
2. **Missing ARIA attributes** — elements with roles that require specific ARIA properties.
3. **Interactive elements without accessible names** — buttons and links that screen readers can't identify.
4. **Heading hierarchy issues** — skipping from h1 to h4.

### Security (avg score: 34/100)

Missing or misconfigured HTTP security headers were common:
- No Content Security Policy
- Missing X-Content-Type-Options
- Exposed server information

### Performance (avg score: 52/100)

Most sites are reasonably fast but have room for improvement. PlanetScale leads with 84, while Railway and Clerk lag at 36.

## The Numbers

- **Average violations per site: 359**
- **Most violations: railway.com (781)**
- **Fewest violations: vercel.com (110)**
- **Best overall: PlanetScale (64/100)**
- **Worst overall: Clerk (47/100)**

## Why This Matters

These are some of the best-funded, best-engineered products in the dev tools space. If their marketing sites have hundreds of accessibility violations and security gaps, what does your weekend project look like?

Accessibility isn't a nice-to-have anymore. Over 5,000 ADA lawsuits were filed in 2025, and the average settlement is $75K. It's cheaper to fix the issues than to fight them in court.

## What You Can Do

1. **Scan your site** at [preship.dev](https://preship.dev) — free, takes 30 seconds
2. **Fix contrast issues first** — usually the highest-impact, lowest-effort fix
3. **Add scanning to CI/CD** — catch regressions before they ship

The goal isn't 100/100. It's knowing where you stand and improving from there.

---

*All scans run March 18, 2026 using PreShip's automated scanner (axe-core + custom security/performance checks). Results reflect each site's public marketing pages at scan time.*
