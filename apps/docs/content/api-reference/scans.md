---
title: Scans API
description: Create, retrieve, and list accessibility scans via the PreShip API.
---

# Scans API

## POST /api/v1/scans - Create a Scan

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | The URL to scan |
| `checks` | string[] | No | Check types: `accessibility`, `performance`, `security`, `seo` |
| `pages` | number | No | Max pages to crawl (default: 1) |
| `projectId` | string | No | Associate with a project |
| `waitForResult` | boolean | No | Block until scan completes |

### Example

```bash
curl -X POST https://api.preship.dev/api/v1/scans \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_your_api_key_here" \
  -d '{"url": "https://example.com", "checks": ["accessibility"]}'
```

## GET /api/v1/scans/:id - Get Scan Results

### Scan Statuses

| Status | Description |
|--------|-------------|
| `pending` | Queued and waiting |
| `running` | In progress |
| `completed` | Finished successfully |
| `failed` | Failed due to error |

## GET /api/v1/scans - List Scans

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `projectId` | string | -- | Filter by project |
| `status` | string | -- | Filter by status |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sort` | string | `createdAt` | Sort field |
| `order` | string | `desc` | Sort order |
