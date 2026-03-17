---
title: Error Codes
description: HTTP status codes and error response format for the PreShip API.
---

# Error Codes

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A human-readable description.",
    "details": {}
  }
}
```

## Error Code Reference

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body or parameters |
| 400 | `INVALID_URL` | URL is not valid or not reachable |
| 401 | `AUTHENTICATION_REQUIRED` | Missing or invalid credentials |
| 401 | `TOKEN_EXPIRED` | JWT token has expired |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource already exists |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 429 | `USAGE_LIMIT_EXCEEDED` | Monthly limit reached |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `SCAN_FAILED` | Scan engine failed |
| 503 | `SERVICE_UNAVAILABLE` | Temporarily unavailable |

See the full MDX documentation at `src/app/api-reference/errors/page.mdx` for detailed examples and error handling code.
