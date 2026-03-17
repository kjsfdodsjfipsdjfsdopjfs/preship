# PreShip Code Review

**Reviewed:** 2026-03-17
**Scope:** Full codebase — apps/api, apps/web, packages/scanner, packages/shared, packages/cli, scripts, Docker/infra

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [High Severity Issues](#2-high-severity-issues)
3. [Medium Severity Issues](#3-medium-severity-issues)
4. [Low Severity Issues](#4-low-severity-issues)
5. [Testing Gaps](#5-testing-gaps)
6. [Summary](#6-summary)

---

## 1. Critical Issues

### SEC-01: Insecure JWT Secret Default Allows Auth Bypass in Production

- **File:** `apps/api/src/config.ts` (line 17)
- **Severity:** CRITICAL
- **Description:** The JWT secret defaults to `"dev-secret-change-me"` when `JWT_SECRET` is not set. In `docker-compose.yml` (line 54), the production JWT secret defaults to `"change-me-in-production"`. If deployed without setting the env var, any attacker who knows this default can forge valid JWTs and access any user's account.
- **Suggested Fix:** Require `JWT_SECRET` at startup. Throw an error if it is not set and `NODE_ENV=production`:
  ```typescript
  if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-secret-change-me') {
    throw new Error('JWT_SECRET must be set in production');
  }
  ```

### SEC-02: Insecure API Key Salt Default

- **File:** `apps/api/src/config.ts` (line 32)
- **Severity:** CRITICAL
- **Description:** `apiKeySalt` defaults to `"dev-salt-change-me"`. If deployed without setting `API_KEY_SALT`, API key hashes are predictable. An attacker with access to the database could reverse-engineer or forge API keys.
- **Suggested Fix:** Same pattern as SEC-01 -- fail hard in production if not set.

### SEC-03: Local Dev Mode Exposes Error Details to Clients

- **File:** `apps/api/src/local.ts` (line 719)
- **Severity:** CRITICAL
- **Description:** The local dev error handler always sends `err.message` in the JSON response. While this file is intended for local dev only, the error handler at line 719 does not check `NODE_ENV`, so if the local entry point is accidentally used in production, internal error details (stack traces, DB errors) are leaked.
- **Suggested Fix:** Gate the `message` field behind a development check, matching the pattern in `index.ts`.

### SEC-04: CORS Set to Wildcard Origin in Local Mode

- **File:** `apps/api/src/local.ts` (line 178)
- **Severity:** CRITICAL
- **Description:** `cors({ origin: "*" })` allows requests from any origin. If a user runs the local server exposed on a network (not just localhost), this enables CSRF and cross-origin data exfiltration. The production server correctly restricts to `config.webUrl`.
- **Suggested Fix:** Default to `http://localhost:3000` or make it configurable:
  ```typescript
  app.use(cors({ origin: process.env.WEB_URL || "http://localhost:3000" }));
  ```

### SEC-05: SSRF via Scan URL -- No Internal Network Restriction

- **File:** `packages/scanner/src/index.ts` (lines 78-81)
- **Severity:** CRITICAL
- **Description:** The scanner validates the URL protocol (HTTP/HTTPS) but does not block internal/private IP ranges (127.0.0.1, 10.x, 172.16.x, 192.168.x, 169.254.x, etc.). An attacker could submit `http://169.254.169.254/latest/meta-data/` (AWS metadata endpoint) or `http://localhost:3001/health` to probe internal infrastructure from the server's network context.
- **Suggested Fix:** Resolve the hostname to an IP address before connecting and reject private/reserved ranges. Consider using a URL allowlist or DNS rebinding protection.

---

## 2. High Severity Issues

### SEC-06: Seed Script Uses Hardcoded Weak Password

- **File:** `scripts/seed.ts` (line 16)
- **Severity:** HIGH
- **Description:** The seed script creates a test user with password `"password123"` and bcrypt cost factor 10 (line 16). If this script is accidentally run in production, it creates a trivially guessable account.
- **Suggested Fix:** Add a guard that prevents running in production, or use a randomly generated password and print it once.

### SEC-07: No Rate Limiting on Local Dev Endpoints

- **File:** `apps/api/src/local.ts`
- **Severity:** HIGH
- **Description:** The local server has no rate limiting at all. The production server applies `standardRateLimit` globally and `scanRateLimit` on scan creation. If the local server is exposed on a network, it is vulnerable to brute-force and DoS.
- **Suggested Fix:** Apply at least basic rate limiting to the local server.

### BUG-01: Duplicate `hashApiKey` Implementations With Different Algorithms

- **File:** `apps/api/src/utils/index.ts` (lines 4-10) vs `apps/api/src/middleware/auth.ts` (lines 20-25)
- **Severity:** HIGH
- **Description:** `utils/index.ts` uses `crypto.subtle.digest("SHA-256")` (plain SHA-256), while `middleware/auth.ts` uses `crypto.createHmac("sha256", config.apiKeySalt)` (HMAC-SHA256 with salt). These produce different hashes for the same input. If the wrong function is used to hash or verify an API key, authentication will silently fail or produce inconsistent results. The `utils/index.ts` version is a dead code path currently but represents a latent bug.
- **Suggested Fix:** Remove the unused `hashApiKey` from `utils/index.ts` to eliminate confusion. Ensure there is a single source of truth for API key hashing.

### BUG-02: `useScan` Hook Polls Wrong API Path

- **File:** `apps/web/src/hooks/useScan.ts` (lines 46, 62)
- **Severity:** HIGH
- **Description:** The hook calls `/api/v1/scans/${scanId}` and `/api/v1/scans`, but the API routes are mounted at `/api/scans` (no `v1` prefix -- see `apps/api/src/index.ts` line 48). Every scan initiated from the frontend will get a 404.
- **Suggested Fix:** Change the paths to `/api/scans/${scanId}` and `/api/scans`, or introduce a versioned prefix on the API side.

### BUG-03: `useApi` Hook Points to Wrong Default Base URL

- **File:** `apps/web/src/hooks/useApi.ts` (line 5)
- **Severity:** HIGH
- **Description:** `API_BASE` defaults to `"http://localhost:3000"` (the Next.js frontend), not `"http://localhost:3001"` (the API). All API calls made from the frontend in development will hit the frontend server and fail.
- **Suggested Fix:** Change the default to `"http://localhost:3001"` or ensure `NEXT_PUBLIC_API_URL` is always set.

### PERF-01: N+1 Query Pattern When Fetching Project Details

- **File:** `apps/api/src/routes/projects.ts` (lines 119-134)
- **Severity:** HIGH
- **Description:** `GET /projects/:id` first fetches the project, then makes a separate query for the latest scan with `scanQueries.findByUserId`. The `findByUserId` query runs a `COUNT(*)` plus the data query. For the project list endpoint, if a client renders multiple projects and fetches each one's details, this creates an N+1 query pattern.
- **Suggested Fix:** Create a dedicated query that joins projects with their latest scan, or add a `latestScan` field to the project query.

### SEC-08: Stripe Webhook Does Not Verify Idempotency

- **File:** `apps/api/src/services/stripe.ts` (lines 144-199)
- **Severity:** HIGH
- **Description:** The webhook handler processes `checkout.session.completed` and updates the user plan, but does not check if the event was already processed. Stripe can send duplicate webhook events. Processing a `customer.subscription.deleted` event twice is benign, but if business logic changes, this could cause issues.
- **Suggested Fix:** Store processed event IDs and skip duplicates, or use Stripe's idempotency mechanisms.

### BUG-04: SQLite `orderCol` Interpolation is SQL Injection Risk

- **File:** `apps/api/src/models/sqlite.ts` (line 228), `apps/api/src/models/index.ts` (line 170, 189)
- **Severity:** HIGH
- **Description:** The `orderCol` variable is interpolated directly into SQL strings: `` `ORDER BY ${orderCol} DESC` ``. While it is derived from a ternary (`opts.sort === "score" ? "score" : "created_at"`), if the Zod schema is ever loosened or another sort option is added without sanitization, this becomes a SQL injection vector. The pattern is fragile.
- **Suggested Fix:** Use a whitelist map and validate explicitly:
  ```typescript
  const SORT_COLUMNS: Record<string, string> = { score: "score", date: "created_at" };
  const orderCol = SORT_COLUMNS[opts.sort] ?? "created_at";
  ```

---

## 3. Medium Severity Issues

### CODE-01: Dead Code -- Stub Model Files

- **Files:** `apps/api/src/models/user.ts`, `apps/api/src/models/scan.ts`, `apps/api/src/models/project.ts`, `apps/api/src/models/apiKey.ts`
- **Severity:** MEDIUM
- **Description:** These four files contain stub implementations with TODO comments (e.g., `"// TODO: INSERT into users table"`) that return hardcoded empty values. They are not used -- the actual queries live in `models/index.ts` (PostgreSQL) and `models/sqlite.ts` (SQLite). These files are confusing and could mislead future contributors.
- **Suggested Fix:** Delete these stub files or convert them to pure type/interface files.

### CODE-02: Duplicated Schema Definitions Between `local.ts` and Route Files

- **Files:** `apps/api/src/local.ts` (lines 246-408) vs `apps/api/src/routes/scan.ts`, `apps/api/src/routes/projects.ts`
- **Severity:** MEDIUM
- **Description:** The local dev entry point duplicates all route handlers, Zod schemas, and validation logic from the route files. Any bug fix or feature added to one must be manually applied to the other. This is a maintenance hazard.
- **Suggested Fix:** Extract route handler logic into shared functions that can be used by both `index.ts` and `local.ts`, with only the middleware (auth, queue) differing.

### CODE-03: Unused `ScannerService` Class

- **File:** `apps/api/src/services/scanner.ts`
- **Severity:** MEDIUM
- **Description:** `ScannerService` is defined and exported but never used by any route or queue handler. The actual scan execution is done inline in `queue.ts` and `local-queue.ts`.
- **Suggested Fix:** Either integrate it as the single entry point for scan execution, or delete it.

### BUG-05: Race Condition in Scan Status Updates

- **File:** `apps/api/src/services/local-queue.ts` (lines 34-41)
- **Severity:** MEDIUM
- **Description:** `addScanJob` fires `processScanJob` in the background without awaiting it, which is correct for async processing. However, the `jobProgress` Map is never cleaned up for completed scans (line 94 sets progress to 100 but never removes the entry). Over time in long-running processes, this causes a memory leak.
- **Suggested Fix:** Delete the entry from `jobProgress` after a short delay post-completion, or use a TTL-based cache.

### SEC-09: Missing Helmet on Local Dev Server

- **File:** `apps/api/src/local.ts`
- **Severity:** MEDIUM
- **Description:** The production server uses `helmet()` for security headers (line 17 of `index.ts`), but the local dev server does not. While less critical for local development, this means security headers are not tested locally.
- **Suggested Fix:** Add `helmet()` to the local server for parity.

### FE-01: Dashboard Pages Use Hardcoded Mock Data, Not API

- **Files:** `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/dashboard/billing/page.tsx`, `apps/web/src/app/dashboard/settings/page.tsx`, `apps/web/src/app/dashboard/projects/page.tsx`, `apps/web/src/app/dashboard/projects/[id]/page.tsx`, `apps/web/src/app/dashboard/scans/[id]/page.tsx`
- **Severity:** MEDIUM
- **Description:** All dashboard pages use hardcoded mock data (e.g., `const stats = [...]`, `const recentScans = [...]`). None of them make actual API calls. The `useApi` and `useScan` hooks exist but are not used by any page. The dashboard is entirely static.
- **Suggested Fix:** Wire up the dashboard pages to the actual API endpoints using the existing hooks and React Query.

### FE-02: No Authentication State Management

- **Files:** `apps/web/src/app/dashboard/layout.tsx`, `apps/web/src/hooks/useApi.ts`
- **Severity:** MEDIUM
- **Description:** The `useApi` hook reads a token from `localStorage`, but there is no login page, no auth context/provider, and no redirect-to-login logic. Dashboard pages are accessible without authentication. The user menu shows a hardcoded "John Doe" (layout.tsx line 31).
- **Suggested Fix:** Implement an auth context, login/signup pages, and protected route middleware.

### FE-03: Missing Loading and Error States in Dashboard

- **Files:** All dashboard pages
- **Severity:** MEDIUM
- **Description:** Since pages use hardcoded data, there are no loading spinners, skeleton screens, or error boundary components. When wired to real APIs, users will see no feedback during data fetching.
- **Suggested Fix:** Add loading skeletons and error states to all data-fetching components.

### FE-04: Buttons Without Handlers

- **Files:** Multiple dashboard pages
- **Severity:** MEDIUM
- **Description:** Many buttons have no `onClick` handlers: "Scan" button on dashboard (line 157 of `page.tsx`), "Save Changes" / "Update Password" / "Delete Account" on settings page, "Create Project" in modal, "Upgrade Plan" and "Downgrade" buttons on billing page, "Download PDF" and "Re-scan" on scan detail page.
- **Suggested Fix:** Connect buttons to their respective API calls or add placeholder handlers with toast notifications.

### TS-01: Extensive Use of `any` Type

- **Files:** `apps/api/src/models/sqlite.ts` (lines 94, 103, 116, 126, 240, 253, 429), `apps/api/src/middleware/local-auth.ts` (lines 23-24), `apps/api/src/services/local-queue.ts` (lines 11-12), `apps/api/src/routes/projects.ts` (line 215), `apps/api/src/local.ts` (line 559), `packages/scanner/src/accessibility.ts` (line 26, 49), `packages/cli/src/commands/scan.ts` (lines 129, 320-327)
- **Severity:** MEDIUM
- **Description:** Multiple files use `any` casts, particularly in SQLite row parsing, dependency injection, and scanner results. This bypasses TypeScript's type safety and can mask runtime errors.
- **Suggested Fix:** Replace `any` with proper interfaces. For SQLite rows, define row types. For dependency injection, define proper interfaces instead of `any`.

### TS-02: Unsafe `as any` Cast in Scan Report Building

- **Files:** `apps/api/src/routes/scan.ts` (lines 215-219), `apps/api/src/local.ts` (lines 360-366)
- **Severity:** MEDIUM
- **Description:** Scan results are accessed via `(scan.results as any)?.categories`, `(scan.results as any)?.violations`, etc. If the stored JSON structure differs from expectations, this silently returns `undefined` arrays, producing empty PDF reports without errors.
- **Suggested Fix:** Define a typed interface for stored scan results and validate the shape before use.

### INFRA-01: Web Dockerfile Assumes Standalone Output Mode

- **File:** `apps/web/Dockerfile` (line 46)
- **Severity:** MEDIUM
- **Description:** The Dockerfile copies from `.next/standalone`, which requires `output: 'standalone'` in `next.config.js`. If this configuration is missing or changed, the Docker build will fail silently or produce an incomplete image.
- **Suggested Fix:** Add a `next.config.js` / `next.config.ts` with `output: 'standalone'` and include it in the repo (or verify it exists -- it was not found in the file listing).

### INFRA-02: No Database Migration on API Startup

- **File:** `apps/api/src/index.ts`
- **Severity:** MEDIUM
- **Description:** The API server starts without running database migrations. The `scripts/migrate.ts` must be run separately. If a new deployment includes schema changes, the API will crash with missing-column errors until migrations are manually applied.
- **Suggested Fix:** Run migrations on startup (with a lock to prevent concurrent migration attempts), or document the migration step clearly in deployment instructions.

### INFRA-03: Docker Worker Uses Wrong Entrypoint

- **File:** `docker-compose.yml` (line 75)
- **Severity:** MEDIUM
- **Description:** The worker service runs `node apps/api/dist/index.js --worker`, but `index.ts` does not check for a `--worker` flag. It always starts the Express server and initializes the queue. The worker and API will both listen on port 3001, causing a port conflict.
- **Suggested Fix:** Add `--worker` mode handling to `index.ts` that only starts the BullMQ worker without the Express server, or create a separate worker entry point.

### SEC-10: No CSRF Protection

- **File:** `apps/api/src/index.ts`
- **Severity:** MEDIUM
- **Description:** The API uses JWT/API key authentication but has no CSRF token validation for cookie-based sessions. If the frontend ever uses cookies for auth (the CORS config has `credentials: true`), the API would be vulnerable to CSRF attacks.
- **Suggested Fix:** Either ensure cookies are never used for auth (API key / Bearer token only), or implement CSRF token validation.

---

## 4. Low Severity Issues

### CODE-04: Inconsistent Error Response Shapes

- **Files:** `apps/api/src/index.ts` (line 64), `apps/api/src/routes/billing.ts` (lines 109, 117)
- **Severity:** LOW
- **Description:** The global error handler returns `{ success: false, error: string }`, but the billing route returns `{ success: false, error: string }` directly without going through the handler for early returns. The field name for API errors is `error` in some places and `message` in the `useApi` hook error parsing (line 40). The frontend expects `err.message` but the API sends `err.error`.
- **Suggested Fix:** Standardize all error responses to `{ success: false, error: string, fieldErrors?: object }`.

### CODE-05: Version String Hardcoded in Multiple Places

- **Files:** `apps/api/src/index.ts` (line 41), `apps/api/src/local.ts` (line 187), `package.json` (line 3), `apps/api/package.json` (line 3), `packages/cli/src/index.ts` (line 18)
- **Severity:** LOW
- **Description:** The version `"0.1.0"` is hardcoded in health endpoints and CLI. Changing the version requires updating multiple files.
- **Suggested Fix:** Read the version from `package.json` at runtime.

### CODE-06: `unused` Theme Param in Logo Component

- **File:** `apps/web/src/components/Logo.tsx` (line 6, 20)
- **Severity:** LOW
- **Description:** The `theme` prop is defined in `LogoProps` but never used in the component body. The colors are always hardcoded to dark theme values.
- **Suggested Fix:** Either implement theme switching or remove the unused prop.

### FE-05: Landing Page Form Does Not Actually Trigger a Scan

- **File:** `apps/web/src/app/page.tsx` (line 172)
- **Severity:** LOW
- **Description:** The hero form's `onSubmit` is `(e) => e.preventDefault()` -- it prevents the default form action but does nothing else. The scan URL input collects user input that goes nowhere.
- **Suggested Fix:** Wire the form to navigate to the dashboard or trigger a scan API call.

### FE-06: Accessibility Issue -- User Menu Dropdown Has No Focus Trap or Escape Handler

- **File:** `apps/web/src/app/dashboard/layout.tsx` (lines 23-39)
- **Severity:** LOW
- **Description:** The user dropdown menu opens on click but has no keyboard trap, no Escape key handler to close it, and no click-outside-to-close behavior. Screen reader users may not realize the menu is open.
- **Suggested Fix:** Add `onKeyDown` handler for Escape, `useEffect` for click-outside detection, and `role="menu"` / `role="menuitem"` ARIA attributes.

### FE-07: Modal Missing Focus Trap and Escape Handler

- **File:** `apps/web/src/app/dashboard/projects/page.tsx` (lines 42-56)
- **Severity:** LOW
- **Description:** The "New Project" modal overlay does not trap focus, has no Escape key handler, and clicking the backdrop does not close it.
- **Suggested Fix:** Implement focus trapping, Escape to close, and backdrop click to close.

### FE-08: SVG Icons Missing `role="presentation"` or `aria-hidden`

- **Files:** `apps/web/src/app/dashboard/page.tsx` (stat icons), `apps/web/src/app/dashboard/layout.tsx` (header icons)
- **Severity:** LOW
- **Description:** Some decorative SVG icons in dashboard stats and the header are missing `aria-hidden="true"`, which can cause screen readers to announce them as images.
- **Suggested Fix:** Add `aria-hidden="true"` to all decorative SVGs.

### PERF-02: Scanner Waits 3 Seconds Per Page for LCP/TBT Metrics

- **File:** `packages/scanner/src/performance.ts` (lines 97, 149)
- **Severity:** LOW
- **Description:** `collectPerformanceMetrics` uses `setTimeout` with 3000ms delays for LCP and TBT PerformanceObserver collection. For a multi-page scan of 50 pages, this adds 150+ seconds of idle waiting.
- **Suggested Fix:** Use `Promise.all` to collect LCP, CLS, and TBT in parallel (they already are somewhat parallel but could be optimized), or reduce the wait time and rely on buffered entries.

### CODE-07: `require("axe-core")` in ESM-Style Code

- **File:** `packages/scanner/src/accessibility.ts` (line 21)
- **Severity:** LOW
- **Description:** Uses `require("axe-core")` instead of dynamic `import()`. While this works with CommonJS module resolution, it is inconsistent with the rest of the codebase which uses ES imports.
- **Suggested Fix:** Use `const axeCore = await import("axe-core")` or keep as-is with a comment explaining why.

### CODE-08: Inconsistent Plan Definitions Between Stripe Service and Shared Constants

- **Files:** `apps/api/src/services/stripe.ts` (PLANS), `packages/shared/src/constants.ts` (PLAN_LIMITS), `apps/web/src/components/PricingTable.tsx` (tiers), `apps/web/src/app/dashboard/billing/page.tsx` (plans)
- **Severity:** LOW
- **Description:** Plan definitions are duplicated in four places with inconsistent values. The Stripe service defines Pro as 200 scans/month, while the billing page shows 100 scans/month. The pricing table shows "5 scans/month" for Free, but shared constants say 10.
- **Suggested Fix:** Use the shared `PLAN_LIMITS` as the single source of truth. Import it in all components.

---

## 5. Testing Gaps

### TEST-01: Zero Test Coverage Across Entire Codebase

- **Severity:** HIGH
- **Description:** There are no test files anywhere in the project. No unit tests, no integration tests, no e2e tests. The `package.json` has a `test` script but no test runner is configured. Critical areas that need tests:

  1. **API authentication middleware** -- Verify JWT validation, API key hashing, expired tokens, invalid tokens
  2. **Usage limit middleware** -- Verify plan enforcement, edge cases around monthly reset
  3. **Scan routes** -- Verify input validation, authorization checks, error handling
  4. **Scoring module** (`packages/shared/src/scoring.ts`) -- Unit tests for `calculateScore`, `calculateCategoryScores`
  5. **Scanner engine** -- Integration tests for accessibility, security, and performance checks
  6. **Stripe webhook handler** -- Verify plan upgrades/downgrades, signature validation
  7. **PDF report generation** -- Verify output for various scan result shapes
  8. **SQL queries** -- Verify parameterized queries prevent injection
  9. **CLI commands** -- Verify output formatting, error handling, `--fail-under` behavior

- **Suggested Fix:** Set up a test framework (Vitest or Jest), add tests for critical paths first (auth, billing, scanning), then expand coverage.

---

## 6. Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5     |
| HIGH     | 9     |
| MEDIUM   | 16    |
| LOW      | 9     |
| **Total** | **39** |

### Top Priority Actions

1. **Fix JWT secret and API key salt defaults** (SEC-01, SEC-02) -- These are deployment-time security vulnerabilities that can lead to complete auth bypass.
2. **Add SSRF protection to the scanner** (SEC-05) -- Without it, the scanning endpoint is a server-side request forgery vector that can access internal infrastructure.
3. **Fix API URL mismatches in frontend** (BUG-02, BUG-03) -- The frontend cannot communicate with the backend due to wrong URLs.
4. **Remove dead code and deduplicate** (CODE-01, CODE-02, BUG-01) -- Stub models and duplicate route logic are maintenance hazards and sources of bugs.
5. **Add test coverage** (TEST-01) -- The complete absence of tests means regressions cannot be caught automatically.
6. **Wire up frontend to actual API** (FE-01, FE-02) -- The dashboard is entirely non-functional with mock data.
7. **Fix Docker worker entrypoint** (INFRA-03) -- The worker container will crash due to port conflict with the API.
