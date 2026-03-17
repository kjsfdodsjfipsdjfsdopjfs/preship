---
title: GitHub Action
description: Integrate PreShip accessibility scanning into your GitHub Actions CI/CD pipeline.
---

# GitHub Action

## Basic Usage

```yaml
- uses: preship/scan-action@v1
  with:
    url: "https://your-site.com"
    api-key: ${{ secrets.PRESHIP_API_KEY }}
    checks: "accessibility"
    threshold: "accessibility:90"
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `url` | Yes | -- | URL to scan |
| `api-key` | Yes | -- | PreShip API key |
| `checks` | No | `accessibility` | Check types |
| `pages` | No | `1` | Pages to crawl |
| `threshold` | No | -- | Minimum scores |
| `comment` | No | `true` | Post PR comment |
| `fail-on-threshold` | No | `true` | Fail if below threshold |

## Outputs

| Output | Description |
|--------|-------------|
| `scan-id` | Created scan ID |
| `accessibility-score` | Accessibility score (0-100) |
| `performance-score` | Performance score (0-100) |
| `total-issues` | Total issues found |
| `result-url` | Dashboard URL |

See the full MDX documentation at `src/app/github-action/page.mdx` for complete workflow examples.
