# PreShip QA Review - Pre-Deploy Assessment

**Reviewer:** Senior QA Engineer (automated)
**Date:** 2026-03-17
**Scope:** `apps/web/src/` and `apps/api/src/` (all source files)
**Codebase Commit:** HEAD at time of review

---

## 1. SPEC COMPLIANCE

**Spec:** Let users paste a URL, scan it for accessibility/security/performance, show results.

### Implemented

- URL submission via API (`POST /api/scans`) with Zod validation against `ScanRequestSchema`
- Real scanning engine (`@preship/scanner`) integrated via BullMQ (production) and in-memory queue (local dev)
- Scan status polling (`GET /api/scans/:id`) with progress tracking
- Results display with violations grouped by category and severity
- PDF report generation with full violation details and fix suggestions
- Project management (CRUD) to organize scans by project
- Auth via JWT + API key with plan-based rate limiting and usage enforcement
- Stripe billing integration for plan upgrades
- SSRF protection in the scanner's `validate-url.ts` (blocks private IPs, cloud metadata, localhost)

### NOT Implemented (Spec Gaps)

- **The landing page scan form does nothing.** The hero form (`onSubmit={(e) => e.preventDefault()}`) captures the URL but never calls the API. The "Scan your app free" button is a no-op. This is the primary user-facing feature and it is broken.
- **No login/signup pages exist.** The Navbar links to `/login` and `/signup`, but no corresponding routes or pages exist in `apps/web/src/app/`. Users cannot create accounts or sign in through the web UI.
- **Dashboard is entirely hardcoded mock data.** Every dashboard page (`page.tsx`, `billing/page.tsx`, `projects/page.tsx`, `projects/[id]/page.tsx`, `scans/[id]/page.tsx`, `settings/page.tsx`) renders static mock data. None of them call the API. The `useApi` and `useScan` hooks exist but are never imported or used by any page component.
- **No `/dashboard/scans` list page.** The sidebar links to it, the dashboard links "View all" to it, but the route does not exist.
- **CI/CD integration mentioned on landing page but not implemented anywhere.**
- **Scheduled scans UI exists (select dropdown) but the backend has no scheduler.**
- **Notification preferences UI exists but there is no notification system.**

### Scope Creep

- The `local-auth.ts` middleware module is fully implemented but never imported or used. `local.ts` defines its own `localAuth` inline instead.
- `models/apiKey.ts`, `models/project.ts`, `models/scan.ts`, `models/user.ts` are stub files full of `TODO` comments that return empty/null. They duplicate `models/index.ts` which has the real implementations. Dead code.
- `services/scanner.ts` is a stub service class with TODO comments, never used. The actual scanning is done inside `services/queue.ts` and `services/local-queue.ts`.

---

## 2. EDGE CASES & INPUTS

### BUGS FOUND

1. **[CRITICAL] `useScan` hook returns wrong response shape.** The hook calls `apiFetch<ScanPollResult>("/api/scans", { method: "POST", body: { url } })`, but the API returns `{ success: true, data: { scanId, status, ... } }`. The hook expects the scan data at the top level, but it is nested under `.data`. Every call to `startScan()` or `pollStatus()` will get a malformed object. The `result.id` access on line 64 will be `undefined`, breaking polling entirely.

2. **[CRITICAL] `useApi` hook has the same response envelope problem.** `apiFetch` returns `res.json()` which is `{ success: true, data: ... }`. The hook and all consumers would need to unwrap `.data`, but the generic type `T` assumes the raw data shape.

3. **[HIGH] Race condition in scan status polling.** `useScan.pollStatus` sets an interval but the async `poll` function can overlap. If the API is slow, multiple concurrent requests fire. No abort controller, no guard against stale responses arriving after a newer one.

4. **[HIGH] `planRateLimit` middleware fails open when Redis is down.** Line 60-61 in `rateLimit.ts`: if `getRedis()` returns null, the request passes through with zero rate limiting. Under Redis failure, all rate limits disappear.

5. **[MEDIUM] `orderCol` in SQL query is interpolated directly from user-controlled input.** In `models/index.ts` line 170: `const orderCol = opts.sort === "score" ? "score" : "created_at"`. While this specific comparison is safe (only two possible values), the pattern of string-interpolating column names into SQL (`ORDER BY ${orderCol}`) is fragile. Any future change adding sort options without strict validation creates SQL injection risk.

6. **[MEDIUM] SQLite `findByUserId` uses spread operator incorrectly for prepared statement binding.** In `models/sqlite.ts` line 240: `.get(...params)` -- `better-sqlite3`'s `.get()` accepts variadic args, but when `params` contains multiple values for the WHERE + LIMIT + OFFSET, the spread could fail if the array is empty. Currently safe but brittle.

7. **[MEDIUM] Division by zero in pagination.** If `total` is 0, `Math.ceil(total / limit)` = 0, which is correct. But `totalPages: Math.ceil(total / limit)` where `limit` could theoretically be 0 would be `Infinity`. Zod schema enforces min(1) so currently safe, but no defensive check at the query layer.

8. **[LOW] `useCounter` hook never resets.** If the component re-renders with a new `end` value, the `started` ref prevents re-animation. The counter animates only once.

9. **[LOW] `ScanCard` shows score of 0 for queued/running scans.** The component always renders `ScoreCircle score={score}` even when the scan hasn't completed. A queued scan with score=0 shows a red "Poor" circle, which is misleading.

---

## 3. ERROR HANDLING

### BUGS FOUND

10. **[HIGH] `apiFetch` swallows API error format.** The catch block does `err.message || "Request failed"`, but the API returns `{ success: false, error: "..." }`. The fetch catch reads `err.message` but the actual field is `err.error`. Error messages from the API will never reach the user -- they will always see "Request failed" or the HTTP status code.

11. **[HIGH] Queue service throws on `addScanJob` when Redis is down but initialization failure is silently swallowed.** In `index.ts` line 96-98, `queueService.initialize()` failure is caught and logged as a warning. But when a user then triggers a scan, `addScanJob` throws `"Queue not initialized. Is Redis available?"`. This error propagates to the user as a 500. There is no graceful degradation or user-facing message explaining the issue.

12. **[MEDIUM] `generatePdfReport` has no timeout.** If the PDF generation hangs (e.g., very large violation list), the request will eventually time out at the HTTP level with no informative error. No scan result size limits are enforced.

13. **[MEDIUM] Stripe webhook handler silently ignores errors in `customer.subscription.updated`.** If the user lookup fails or the subscription has an unexpected shape, it just logs and continues. No error propagation, no alerting.

14. **[LOW] Migration runner reads SQL files synchronously with `fs.readFileSync`.** For large migration files, this blocks the event loop during startup. Not a runtime issue but poor practice.

15. **[LOW] `LLMService.suggestFix` has a `TODO: Call OpenAI API` comment and falls back to a hardcoded map of only 3 rules. The `buildPrompt` method constructs a prompt that is never sent. The OpenAI API key is configured but unused.

---

## 4. SECURITY & DATA

### BUGS FOUND

16. **[CRITICAL] No CSRF protection.** The API uses CORS with credentials but has no CSRF tokens. A malicious site could make authenticated requests on behalf of a logged-in user using their cookies. However, since auth currently uses Bearer tokens/API keys in headers (not cookies), the immediate risk is mitigated. But if cookie-based sessions are ever added, this becomes exploitable.

17. **[HIGH] JWT secret falls back to `"dev-secret-change-me"` in non-production.** While `config.ts` blocks this in production, any staging/test environment not explicitly set to `NODE_ENV=production` will use this predictable secret. An attacker could forge JWTs.

18. **[HIGH] Password hash is stored in `User` type and returned by `findById`.** The `SELECT *` queries in `models/index.ts` fetch `password_hash` for every user lookup. While the route handlers filter it out before sending to clients, any new endpoint that passes the user object directly would leak the hash. The password hash should be excluded at the query level.

19. **[MEDIUM] The `scan.results` field in the API response (`GET /api/scans/:id`) is returned as raw JSON.** If the scanner produces unexpected or malicious content (e.g., XSS payloads in violation descriptions), it flows directly to the frontend. No sanitization on output.

20. **[MEDIUM] API key prefix exposes key structure.** `rawKey.slice(0, 10)` is stored as `prefix`. For a 67-character key (`sc_` + 64 hex chars), the prefix reveals the first 10 characters, reducing brute-force entropy.

21. **[LOW] `Content-Disposition` header in PDF download uses `scan.id` directly without encoding.** While UUIDs don't contain special characters, this pattern is unsafe if IDs ever change format.

22. **[LOW] The web app stores auth tokens in `localStorage` (line 22 of `useApi.ts`). This is vulnerable to XSS-based token theft. `httpOnly` cookies would be more secure.

---

## 5. QUALITY & MAINTENANCE

### BUGS FOUND

23. **[HIGH] Massive code duplication between `local.ts` and the route/model files.** `local.ts` is 783 lines that duplicate nearly every route handler from `routes/scan.ts`, `routes/projects.ts`, `routes/billing.ts`, and `routes/auth.ts`. Any bug fix or feature change needs to be applied in two places. This will inevitably lead to drift.

24. **[HIGH] Four dead model files with TODO stubs.** `models/apiKey.ts`, `models/project.ts`, `models/scan.ts`, `models/user.ts` are unused stub implementations that could confuse developers. They use different interfaces than the working `models/index.ts`.

25. **[MEDIUM] Dashboard layout hardcodes user info.** The "JD" avatar, "John Doe" name, and "john@example.com" are hardcoded strings in `dashboard/layout.tsx`. No integration with auth state.

26. **[MEDIUM] Inconsistent severity naming.** The frontend uses `"critical" | "serious" | "moderate" | "minor"` in `ViolationCard.tsx` and `scans/[id]/page.tsx`. The backend/shared types use `"critical" | "high" | "medium" | "low" | "info"`. These will never match. Frontend will fail to properly style API-returned violations.

27. **[MEDIUM] `hashApiKey` is defined in 3 separate places:** `middleware/auth.ts`, `middleware/local-auth.ts`, and `utils/index.ts`. They all do the same thing but could drift.

28. **[LOW] No tests whatsoever.** Zero test files in the entire codebase. No unit tests, no integration tests, no e2e tests.

29. **[LOW] Sidebar usage meter is hardcoded (`47 / 100`, `w-[47%]`), not connected to API.

30. **[LOW] Billing page plan prices are inconsistent.** `PricingTable.tsx` shows Team at $99/mo, but `services/stripe.ts` defines Team at $79/mo. `billing/page.tsx` shows Business at $299/mo while the stripe service calls it Enterprise.

---

## SUMMARY

### BUGS FOUND (30 total)

| # | Severity | Description |
|---|----------|-------------|
| 1 | CRITICAL | `useScan` hook does not unwrap `{ data: ... }` response envelope -- polling broken |
| 2 | CRITICAL | `useApi` hook same response envelope problem -- all API calls return wrong shape |
| 3 | HIGH | Race condition in scan polling -- overlapping requests, no abort controller |
| 4 | HIGH | Plan rate limiting fails open when Redis is unavailable |
| 5 | MEDIUM | SQL column name interpolation pattern is fragile (safe today, risky tomorrow) |
| 6 | MEDIUM | SQLite prepared statement spread binding is brittle |
| 7 | MEDIUM | No defensive check against division by zero in pagination |
| 8 | LOW | `useCounter` hook animation runs only once, ignores prop changes |
| 9 | LOW | Score circle shows misleading "Poor" for queued/running scans |
| 10 | HIGH | `apiFetch` reads wrong error field -- users never see real API errors |
| 11 | HIGH | Queue unavailability causes unhandled 500s on scan submission |
| 12 | MEDIUM | PDF generation has no timeout or size limit |
| 13 | MEDIUM | Stripe webhook silently ignores subscription update failures |
| 14 | LOW | Synchronous file reads in migration runner |
| 15 | LOW | LLM service is a stub with TODO -- fix suggestions are mostly non-functional |
| 16 | CRITICAL | No CSRF protection (mitigated by header-based auth) |
| 17 | HIGH | JWT secret uses predictable default in non-production environments |
| 18 | HIGH | `SELECT *` fetches password_hash on every user lookup |
| 19 | MEDIUM | Unsanitized scan results passed to frontend |
| 20 | MEDIUM | API key prefix reduces brute-force entropy |
| 21 | LOW | Unencoded scan ID in Content-Disposition header |
| 22 | LOW | Auth tokens in localStorage vulnerable to XSS |
| 23 | HIGH | 783-line `local.ts` duplicates all route handlers |
| 24 | HIGH | Four dead stub model files create confusion |
| 25 | MEDIUM | Dashboard layout hardcodes user identity |
| 26 | MEDIUM | Frontend severity enum mismatches backend (`serious/moderate` vs `high/medium`) |
| 27 | MEDIUM | `hashApiKey` defined in 3 separate files |
| 28 | LOW | Zero test coverage across entire codebase |
| 29 | LOW | Sidebar usage meter hardcoded, not connected to API |
| 30 | LOW | Plan pricing inconsistencies between frontend and backend |

### SPEC GAPS

1. **Landing page scan form is non-functional** -- the primary CTA does nothing
2. **No login or signup pages** -- users cannot create accounts through the web UI
3. **All dashboard pages use hardcoded mock data** -- zero API integration on frontend
4. **Missing `/dashboard/scans` list page** -- linked from multiple places but does not exist
5. **CI/CD integration advertised but not implemented**
6. **Scheduled scans UI exists without backend support**
7. **Notification system UI exists without backend support**
8. **`useScan` and `useApi` hooks exist but are never used by any page component**

### RECOMMENDED IMPROVEMENTS

1. **Wire the frontend to the API.** Replace all mock data with actual API calls using the existing `useApi`/`useScan` hooks. Fix the response envelope unwrapping.
2. **Implement login/signup pages** and integrate auth state into the dashboard layout.
3. **Make the landing page scan form functional.** Either call the API directly or redirect to signup.
4. **Delete dead code.** Remove `models/apiKey.ts`, `models/project.ts`, `models/scan.ts`, `models/user.ts` (the stub files), `services/scanner.ts`, and `middleware/local-auth.ts`.
5. **Refactor `local.ts`** to import and reuse the route handlers from `routes/` instead of duplicating them.
6. **Align severity enums** between frontend (`serious/moderate/minor`) and backend (`high/medium/low/info`).
7. **Exclude `password_hash`** from user queries by selecting specific columns instead of `SELECT *`.
8. **Extract `hashApiKey`** to a single shared utility and import it everywhere.
9. **Add abort controllers** to the polling logic in `useScan`.
10. **Add tests.** At minimum: auth middleware, scan creation, validation schemas, rate limiting.
11. **Fix plan pricing inconsistencies** across `PricingTable.tsx`, `billing/page.tsx`, and `services/stripe.ts`.

---

## FINAL VERDICT

### BLOCKED

The application cannot be deployed in its current state. The fundamental user-facing flow is broken:

1. The landing page scan button does nothing.
2. No login/signup exists in the web UI.
3. The entire dashboard is hardcoded mock data with zero API integration.
4. The API client hooks (`useApi`, `useScan`) have a response envelope bug that would break all API calls even if pages were wired up.
5. Frontend and backend use incompatible severity level names.

The **backend API** is reasonably solid -- well-structured, properly validated, with good error handling and SSRF protection. It could serve API consumers (CLI, third-party integrations) today.

The **frontend** is a high-quality static mockup that is not connected to the backend in any way. It is a design prototype, not a functional application.

**Before deploy, at minimum:**
- Fix the response envelope bug in `useApi`/`useScan`
- Implement login/signup pages
- Wire at least the scan flow end-to-end (submit URL -> poll -> show results)
- Align severity naming between frontend and backend
- Delete dead code to prevent confusion
