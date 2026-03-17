---
title: Rate Limits
description: Understand PreShip API rate limits, headers, and retry strategies.
---

# Rate Limits

## Limits by Plan

| Plan | Requests/minute | Requests/hour | Concurrent scans |
|------|----------------|---------------|------------------|
| Free | 30 | 500 | 2 |
| Pro | 120 | 5,000 | 10 |
| Enterprise | 600 | 50,000 | 50 |

## Rate Limit Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests in current window |
| `X-RateLimit-Remaining` | Requests remaining |
| `X-RateLimit-Reset` | Unix timestamp when window resets |

See the full MDX documentation at `src/app/api-reference/rate-limits/page.mdx` for retry code examples.
