# Why Your Vibe-Coded App Is Probably Inaccessible (And How to Fix It)

*Published on preship.dev/blog*

---

Something remarkable happened in 2025. Developers stopped writing code from scratch. Armed with Cursor, Bolt, Lovable, and a dozen other AI coding tools, a new generation of builders started shipping full applications in hours instead of months. They call it vibe coding — describing what you want in plain language and letting AI handle the implementation.

The results have been extraordinary. Solo founders are launching SaaS products over a weekend. Designers are building functional prototypes without touching documentation. The barrier to entry for software development has never been lower.

But there is a serious problem hiding beneath the surface: almost none of these applications are accessible, secure, or performant by default.

## The Accessibility Gap in AI-Generated Code

Large language models are trained to produce code that works, not code that works for everyone. When you prompt an AI to "build a dashboard with a sidebar and charts," it will generate something that looks great in a browser. What it will not do is add ARIA labels to interactive elements, ensure proper heading hierarchy, provide keyboard navigation, include skip links, or maintain sufficient color contrast ratios.

This is not a theoretical concern. Research consistently shows that the vast majority of websites fail basic accessibility standards. WebAIM's annual analysis of the top one million home pages found that 95.9% had detectable WCAG 2 failures. The average page had over 50 distinct accessibility errors.

AI-generated code tends to perform even worse. LLMs optimize for visual output and functional correctness. Accessibility is treated as an afterthought — if it is considered at all.

## Why This Matters More Than You Think

Accessibility is not optional. It is a legal requirement in most jurisdictions. In the United States, the Americans with Disabilities Act has been consistently interpreted to apply to websites and digital applications. Over 4,000 ADA-related digital accessibility lawsuits were filed in 2024 alone, and that number continues to climb.

The average settlement for an ADA web accessibility lawsuit is approximately $75,000. For a solo developer or early-stage startup, that is an existential threat.

Beyond legal exposure, inaccessible applications exclude roughly 16% of the global population — over one billion people who live with some form of disability. Building inaccessible software is not just risky. It is leaving money and users on the table.

## Security and Performance Are Suffering Too

Accessibility is the most visible gap, but it is not the only one. AI-generated code frequently introduces security vulnerabilities that a seasoned developer would catch during review. Missing input sanitization, exposed API keys hardcoded in client-side bundles, absent CSRF protections, and misconfigured CORS headers are all common in vibe-coded applications.

Performance is another casualty. AI tends to generate verbose, unoptimized code. Render-blocking resources, uncompressed images, excessive DOM depth, and missing lazy loading are standard output from most AI coding tools. The result is applications that feel sluggish on anything less than a high-end device with a fast connection.

## The Fix: Automated Quality Gates

The solution is not to stop using AI for code generation. The productivity gains are too significant to ignore. The solution is to add a quality gate between generation and deployment.

This is exactly why we built PreShip. It is an API-first scanning platform designed specifically for AI-generated applications. Point it at any URL or integrate it into your CI/CD pipeline, and it runs comprehensive checks across three dimensions:

**Accessibility.** Full WCAG 2.2 AA compliance scanning that catches missing alt text, broken form labels, color contrast failures, keyboard traps, and dozens of other violations — with plain-language explanations of how to fix each one.

**Security.** Header analysis, mixed content detection, exposed secrets scanning, and configuration audits that flag the vulnerabilities AI code most commonly introduces.

**Performance.** Core Web Vitals measurement, render-blocking resource detection, image optimization analysis, and actionable recommendations to bring load times under acceptable thresholds.

A single API call returns a structured JSON report with scores, individual findings, and prioritized fix recommendations. No dashboard to learn. No browser extension to install. Just a POST request and a response you can parse programmatically.

## Stop Shipping Blind

If you are building with AI — and statistically, you probably are — you need to know what your code actually looks like under the hood. Not what it looks like in your browser on your fast connection with your perfect vision. What it looks like to a screen reader. To a security scanner. To a user on a 3G connection.

PreShip gives you that visibility in seconds.

**Scan your first application free at [preship.dev](https://preship.dev).** No credit card required. See exactly what your vibe-coded app is missing before your users — or their lawyers — find out first.
