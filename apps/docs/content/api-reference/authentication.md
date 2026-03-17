---
title: Authentication
description: Learn how to authenticate with the PreShip API using API keys or Bearer tokens.
---

# Authentication

All API requests to PreShip require authentication. The API supports two authentication methods: API keys and Bearer tokens (JWT).

## API Key Authentication

Pass your API key in the `X-API-Key` header:

```bash
curl https://api.preship.dev/api/v1/scans \
  -H "X-API-Key: sk_live_your_api_key_here"
```

### Key Prefixes

| Prefix | Environment |
|--------|-------------|
| `sk_live_` | Production |
| `sk_test_` | Test |

## Bearer Token Authentication (JWT)

```bash
curl https://api.preship.dev/api/v1/scans \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Security Best Practices

- Never expose API keys in client-side code
- Rotate keys regularly
- Use environment variables
- Use test keys during development
- Revoke compromised keys immediately
