---
title: Billing API
description: Monitor your PreShip plan usage and subscription details.
---

# Billing API

## GET /api/v1/billing/usage - Get Usage

Returns current billing period usage including scans consumed, pages scanned, and remaining allowances.

## GET /api/v1/billing/plan - Get Plan

Returns details about your current subscription plan, features, and limits.

### Plan Comparison

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Scans per month | 50 | 500 | Unlimited |
| Pages per scan | 5 | 25 | 50 |
| Check types | Accessibility only | All | All |
| Scheduled scans | No | Yes | Yes |
| Price | Free | $29/mo | Custom |

See the full MDX documentation at `src/app/api-reference/billing/page.mdx` for complete examples.
