# Dogfooding Thread — 10 Tweets

---

### Tweet 1 (Hook)

We built @PreShip using AI coding tools.

Then we scanned our own landing page.

Score: 25/100.

Thread on what went wrong and what we learned about vibe-coded quality:

### Tweet 2 (The Breakdown)

The breakdown:

- Accessibility: 0/100 (95 violations, 0 passes)
- Security: 0/100 (10 missing headers)
- Performance: 100/100

AI writes code that runs fast.
It does NOT write code humans can use.

### Tweet 3 (Contrast Trap)

29 color contrast failures.

Our dark theme used gray text on dark backgrounds. Looks sleek. Every AI generates it.

Problem: it fails WCAG contrast requirements.

4.8M Americans with low vision can't read light gray on dark gray. No matter how "clean" it looks.

### Tweet 4 (The Scale)

AI generates code that LOOKS right but isn't ACCESSIBLE.

It optimizes for what you see in the browser, not what a screen reader hears.

2.2 billion people worldwide have vision impairments.

Your dark theme isn't a design choice for them. It's a wall.

### Tweet 5 (Semantic HTML)

Missing semantic HTML everywhere.

AI loves divs. It wraps everything in divs. A div with the right class looks identical on screen to a nav or main element.

But screen readers need semantic HTML to navigate.

Our page was a flat wall of content with zero structure.

### Tweet 6 (The Irony)

The part that really stings:

No form labels on our SCAN INPUT.

The primary interaction point of an accessibility scanner... was not accessible.

A screen reader user would encounter an unlabeled text field with zero context.

### Tweet 7 (The Question)

If a team building an accessibility scanner ships inaccessible code using AI tools...

What does that say about the state of vibe-coding?

92% of developers use AI tools daily.
95% of home pages fail basic accessibility.

These numbers are related.

### Tweet 8 (The Fix)

We fixed it using PreShip's own suggestions.

- Replaced divs with semantic elements
- Fixed all 29 contrast failures
- Added form labels (30 seconds each)
- Added missing security headers

25 --> 85+ (updating with final score)

Total time: ~4 hours.

### Tweet 9 (Why It Matters)

This is exactly why PreShip exists.

AI writes code fast. It looks beautiful. Nobody checks if humans can actually use it.

41% of all code is AI-generated.
ADA lawsuits up 37% YoY.
4,600+ filed in 2024.

The quality gap is widening.

### Tweet 10 (CTA)

Scan your app free: preship.dev

20 scans/month. No credit card. Results in 60 seconds.

We were honest about our own 25/100.

We'll be honest about yours too.

---

## Posting Notes

- Post as a thread from the main @PreShip account
- Space tweets 1-2 minutes apart
- Pin Tweet 1 after the thread is complete
- Engage with replies for first 2 hours after posting
- Best times: Tuesday/Wednesday 9-11am ET
- Quote-tweet Tweet 6 (the irony) as a standalone later in the week
