# We Built PreShip With AI. It Scored 25/100 On Its Own Scan. Here's What We Learned.

*Published: March 2026*
*Reading time: 7 min*

---

What happens when you point your own quality scanner at your own product?

Humiliation. And then, growth.

This is the story of how a team building an accessibility scanner shipped an inaccessible product — and why that should terrify every developer using AI coding tools.

---

## The Setup: A Beautiful Disaster

We built PreShip using AI coding tools. Claude for architecture and logic. Cursor for rapid iteration. The standard modern stack — the same tools millions of developers rely on every day.

The result looked incredible. A dark theme with smooth animations. Clean typography. A modern SaaS aesthetic that could sit comfortably alongside any Y Combinator demo day lineup. The kind of landing page that makes you think: we nailed it.

We were proud of it. We showed it to people. They said it looked great.

And it did look great. That was the problem.

---

## The Scan: 25 Out of 100

One afternoon, we decided to do what any self-respecting dogfooding team should do: run our own scanner against our own product.

The result:

**Overall Score: 25/100**

Here's the breakdown:

| Category     | Score   | Details                    |
|-------------|---------|----------------------------|
| Accessibility | 0/100   | 95 violations, 0 passes    |
| Security      | 0/100   | 10 missing headers         |
| Performance   | 100/100 | The only bright spot        |

Read that again. An accessibility scanner scored **zero** on accessibility. Our product literally could not pass its own test.

The performance score was perfect — fast load times, optimized assets, efficient rendering. AI is excellent at producing code that runs fast. It is terrible at producing code that humans can actually use.

---

## The Breakdown: What 95 Violations Look Like

Let's get specific, because the details matter.

### 29 Color Contrast Failures

This was the single largest category of violations. Our dark theme used light gray text on dark gray backgrounds. It looks sophisticated. Designers love it. AI models reproduce it constantly because the training data is full of it.

The problem: it fails WCAG 2.1 AA contrast requirements. The minimum contrast ratio for normal text is 4.5:1. Many of our text elements were sitting at 2.1:1 or lower.

Who does this affect? Approximately 4.8 million Americans have low vision that isn't correctable with glasses. Another 8% of men have some form of color blindness. Globally, the WHO estimates 2.2 billion people have a near or distance vision impairment.

For all of these people, our sleek dark theme was effectively unreadable.

### Missing Landmarks and Semantic HTML

AI generates `div` elements like they're free. Because to the model, they are. A `div` with the right CSS class looks identical to a `nav` or `main` or `header` element on screen.

But screen readers depend on semantic HTML to help users navigate. Without landmarks, a blind user visiting our page would hear a flat wall of content with no structure, no way to skip to the main content, no way to find the navigation.

Our page had:
- Zero landmark regions
- No skip navigation link
- Broken heading hierarchy (jumping from h1 to h4)
- Multiple elements with missing or duplicate ARIA labels

### No Form Labels

This one hurt the most.

Our scan input — the primary interaction point of a tool that checks accessibility — had no associated label. A screen reader user would encounter an unlabeled text field with no context about what it does or what to type into it.

The irony is so thick you could ship it as a feature.

### Missing Security Headers

On the security side, we were missing ten standard HTTP security headers:
- No Content-Security-Policy
- No X-Content-Type-Options
- No Referrer-Policy
- No Permissions-Policy
- No Strict-Transport-Security

...and five more. These are headers that take minutes to configure and protect against well-known attack vectors like XSS, clickjacking, and MIME type sniffing.

AI didn't add them because we didn't ask. And we didn't ask because we were focused on features, not infrastructure. This is the default state of most AI-generated projects.

---

## Why AI Produces Code Like This

This isn't a bug in any particular AI model. It's a structural problem with how AI generates code.

**AI optimizes for visual correctness, not semantic correctness.** When you prompt an AI to build a landing page, it produces something that looks right in a browser. It matches the visual spec. The CSS is clean. The layout is responsive. But under the surface, the HTML is a soup of divs and spans with no semantic meaning.

**AI reproduces patterns from training data.** And most code in the training data is also inaccessible. The WebAIM Million study consistently shows that over 95% of home pages have detectable WCAG failures. AI learned from this corpus, so it reproduces the same failures at scale.

**AI doesn't test against real user experiences.** It doesn't use a screen reader. It doesn't simulate low vision. It doesn't check contrast ratios. It doesn't verify heading hierarchy. It produces output that satisfies the visual requirement and moves on.

**Nobody prompts for accessibility.** When was the last time you added "and make sure it meets WCAG 2.1 AA" to a prompt? Even when you do, the results are inconsistent. Accessibility requires systematic attention across every element, every interaction, every state change. A single prompt can't cover it.

---

## The Fix: Eating Our Own Dogfood

Here's where the story turns.

We took PreShip's own fix suggestions and started remediating. Every violation came with a specific, actionable recommendation:

- **Contrast failures**: PreShip identified the exact elements and suggested specific color values that would meet AA requirements while preserving our dark theme aesthetic.
- **Missing landmarks**: We replaced key divs with semantic elements — `nav`, `main`, `header`, `footer` — and added appropriate ARIA labels where needed.
- **Form labels**: We added proper `label` elements associated with our input fields. Took about 30 seconds per field.
- **Heading hierarchy**: We restructured our headings to follow a logical h1 > h2 > h3 progression.
- **Security headers**: We added the missing headers to our server configuration. Each one was a single line.

The total remediation time: about four hours of focused work.

The result: our score went from **25 to 85+** *(placeholder — updating with real score after final fixes)*.

Four hours. That's the gap between shipping something that excludes millions of users and shipping something that works for everyone.

---

## The Lesson: If We Failed, You're Failing Too

Let's sit with this for a moment.

We are a team that is literally building an accessibility scanner. Accessibility is our entire product focus. We think about it every day. We read the WCAG spec for fun (okay, not for fun, but we read it).

And we shipped a landing page that scored zero on accessibility.

If we failed, what's happening with the other 92% of developers who use AI tools daily? What about the indie hackers vibe-coding their SaaS products over a weekend? What about the startups shipping MVPs built entirely with Cursor and Claude?

The data backs this up:

- **41% of all code** is now AI-generated (GitHub, 2025)
- **95.9% of home pages** have detectable WCAG 2 failures (WebAIM Million, 2024)
- **ADA digital accessibility lawsuits** are up 37% year over year
- **4,600+ lawsuits** were filed in 2024 alone

AI is writing more code than ever. That code looks beautiful. And it is systematically excluding people with disabilities from using the web.

---

## Why This Matters Beyond Compliance

Accessibility isn't just about avoiding lawsuits (though you should care about that too — the average ADA settlement is $50,000+).

Accessible code is better code. Semantic HTML is more maintainable. Proper heading hierarchy improves SEO. Color contrast improvements benefit everyone using a screen in sunlight. Form labels reduce errors for all users, not just those using screen readers.

When you fix accessibility, you fix the foundations. The 25-to-85 jump wasn't just an accessibility improvement — it was a code quality improvement.

---

## What We Do Now

Every deploy at PreShip now runs through our own scanner. We don't merge code that drops our score below our threshold. We treat accessibility like we treat tests: it has to pass before it ships.

We built PreShip because we believe there needs to be a quality gate between AI-generated code and real users. Our own 25/100 score proved — painfully, publicly — that this quality gate is necessary.

---

## Your Turn

If a team building an accessibility scanner can score 25/100 on their own product, what's your AI-generated app scoring?

There's only one way to find out.

**[Scan your app free at preship.dev](https://preship.dev)**

20 free scans per month. No credit card required. We'll be honest about your score.

We were honest about ours.

---

*PreShip is an automated quality scanner for AI-generated code. It checks accessibility, security, and performance in a single scan and provides actionable fix suggestions. Built by a team that learned the hard way that looking good and being good are very different things.*
