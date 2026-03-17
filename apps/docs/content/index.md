---
title: Introduction
description: PreShip documentation - automated accessibility, security, and performance scanning for web applications.
---

# PreShip Documentation

PreShip is an API-first platform for automated accessibility, security, and performance scanning of web applications. Ship with confidence knowing your app meets WCAG standards, security best practices, and performance benchmarks.

## Key Features

- **Accessibility Scanning** -- Automated WCAG 2.1 AA/AAA compliance checks powered by axe-core
- **Performance Audits** -- Lighthouse-based performance, SEO, and best-practice scoring
- **Security Analysis** -- Header checks, mixed content detection, and common vulnerability scanning
- **Multi-page Crawling** -- Scan entire sites, not just single pages
- **CI/CD Integration** -- CLI tool and GitHub Action for pipeline integration
- **Project Tracking** -- Track scan history and score trends over time
- **REST API** -- Full programmatic access to all scanning features

## Quick Links

| Resource | Description |
|----------|-------------|
| [Getting Started](./getting-started.md) | Create your account and run your first scan |
| [API Reference](./api-reference/authentication.md) | Full REST API documentation |
| [CLI Reference](./cli/reference.md) | Command-line tool for local and CI usage |
| [GitHub Action](./github-action/reference.md) | Integrate PreShip into your GitHub workflows |
| [SDKs](./sdks/examples.md) | Code examples in JavaScript, Python, and more |
| [Guides](./guides/vercel-integration.md) | Step-by-step integration tutorials |

## Base URL

All API requests use the following base URL:

```
https://api.preship.dev
```

## Support

- **GitHub Issues**: [github.com/preship/preship/issues](https://github.com/preship/preship/issues)
- **Email**: support@preship.dev
- **Status Page**: [status.preship.dev](https://status.preship.dev)
