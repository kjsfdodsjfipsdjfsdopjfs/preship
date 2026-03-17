# Frontend Audit Report

**Project:** PreShip Web (`apps/web/`)
**Date:** 2026-03-17
**Auditor:** Automated analysis of all 34 `.ts`/`.tsx` files in `apps/web/src/`

---

## Issues Found

### 1. Duplicated / Inconsistent Logic

| # | File | Line(s) | Severity | Description | Fix |
|---|------|---------|----------|-------------|-----|
| 1.1 | `src/app/page.tsx` | 78-133 | MEDIUM | `TrendChart` component in landing page is a hand-rolled SVG chart. An almost identical implementation (`HistoryChart`) exists in `src/app/dashboard/projects/[id]/page.tsx` lines 24-43. Two separate chart components with the same logic but different variable names and colors. | Extract a shared `LineChart` component into `src/components/LineChart.tsx` accepting color, gradient ID, and data as props. |
| 1.2 | `src/app/login/page.tsx` | 70-79, `src/app/signup/page.tsx` | 89-98 | MEDIUM | Google and GitHub OAuth buttons are copy-pasted verbatim between login and signup pages, including identical SVG icons and styling. | Extract a shared `SocialAuthButtons` component. |
| 1.3 | `src/app/dashboard/page.tsx` | 55-61, `src/app/dashboard/scans/page.tsx` | 7-18 | LOW | Scan mock data is duplicated across dashboard page and scans page with overlapping entries. | Centralize mock data into a shared file (e.g., `src/lib/mockData.ts`). |
| 1.4 | `src/app/dashboard/page.tsx` | 149-158, `src/app/dashboard/scans/page.tsx` | 33-42 | MEDIUM | The "scan URL" input + button pattern is duplicated across dashboard and scans pages with different styling (inconsistent border colors: `border-neutral-800` vs `border-neutral-800`, different widths). No shared component for this repeated UI pattern. | Create a `ScanUrlInput` component. |
| 1.5 | `src/components/Navbar.tsx` | 30-31 | LOW | Button styles are manually inlined as long className strings instead of using the `Button` component. This creates inconsistency if Button styles are updated. | Use the `Button` component with appropriate variant/size props for the nav links. |
| 1.6 | `src/app/dashboard/scans/[id]/page.tsx` | 17-23, `src/components/ViolationCard.tsx` | 8-19 | LOW | The `Violation` and `Severity` types are defined independently in both files with slightly different fields (the page version has `category` and `autoFixable`, the component version does not). | Define a single shared `Violation` type in `src/lib/types.ts` or import from `@preship/shared`. |

### 2. Race Conditions / Infinite Renders

| # | File | Line(s) | Severity | Description | Fix |
|---|------|---------|----------|-------------|-----|
| 2.1 | `src/hooks/useScan.ts` | 42-57 | CRITICAL | `pollStatus` callback depends on `stopPolling` but the polling interval closure captures stale `stopPolling`. More critically, if `pollStatus` is called multiple times rapidly (e.g., user double-clicks scan), multiple `setInterval` chains can be created before the previous one is cleared, since `stopPolling()` and `setInterval` are not synchronized atomically. | Use a ref to track whether a poll is already in flight; add a guard at the start of `pollStatus`. Consider using `setTimeout` chaining instead of `setInterval` to avoid overlapping requests. |
| 2.2 | `src/hooks/useScan.ts` | 55-56 | MEDIUM | The `poll()` function is called immediately AND an interval is set. If the initial `poll()` call finds `status === "completed"`, it calls `stopPolling()` which clears the interval. However, the interval on line 56 is set AFTER the initial poll is kicked off (but poll is async, so the interval IS set before poll resolves). Still, there is a timing issue if the component unmounts between the initial call and the interval being set. | Move `setInterval` setup to only happen after the first poll confirms the scan is still in progress. |
| 2.3 | `src/components/CodeBlock.tsx` | 19-20 | LOW | `setTimeout` for resetting the "copied" state is not cleaned up if the component unmounts within 2 seconds. | Store the timeout ID in a ref and clear it in a `useEffect` cleanup, or use `useEffect` with a dependency on `copied`. |

### 3. API Error Handling

| # | File | Line(s) | Severity | Description | Fix |
|---|------|---------|----------|-------------|-----|
| 3.1 | `src/app/dashboard/page.tsx` | entire file | CRITICAL | Dashboard uses hardcoded mock data with no actual API calls. When real data is integrated, there are no loading states, error states, or empty states for stats, trend chart, or recent scans. | Add loading skeletons, error boundaries, and empty state handling for when API data is fetched. |
| 3.2 | `src/app/dashboard/projects/page.tsx` | entire file | CRITICAL | Projects page uses hardcoded data. No loading/error states. The search filter only covers the mock array. | Implement data fetching with loading, error, and empty states. |
| 3.3 | `src/app/dashboard/projects/[id]/page.tsx` | entire file | CRITICAL | Project detail page uses hardcoded data. Ignores the `[id]` route parameter entirely -- always shows the same project regardless of URL. | Use `useParams()` to get the project ID and fetch the correct project data. |
| 3.4 | `src/app/dashboard/scans/page.tsx` | entire file | CRITICAL | Scans list page uses hardcoded data. No loading/error/empty states for initial data load. | Implement data fetching with proper states. |
| 3.5 | `src/app/dashboard/scans/[id]/page.tsx` | entire file | CRITICAL | Scan detail page uses hardcoded data. Ignores the `[id]` route parameter -- always shows the same scan. | Use `useParams()` to get the scan ID and fetch the correct data. |
| 3.6 | `src/app/dashboard/billing/page.tsx` | entire file | MEDIUM | Billing page uses hardcoded data. No loading state for invoice history or plan info. | Implement data fetching with proper states. |
| 3.7 | `src/app/dashboard/settings/page.tsx` | entire file | MEDIUM | Settings page uses hardcoded data. Form submissions do nothing (no API calls, no feedback to user). | Wire up form submission handlers with API calls and toast/feedback on success/error. |
| 3.8 | `src/app/page.tsx` | 172 | MEDIUM | The hero scan form calls `e.preventDefault()` but does nothing else. User enters a URL and clicks "Scan your app free" and nothing happens. No feedback, no navigation, no API call. | Implement the scan initiation flow (navigate to dashboard/scan results, or show inline results). |
| 3.9 | `src/hooks/useApi.ts` | 24-44 | MEDIUM | `apiFetch` does not handle network errors (e.g., `fetch` rejecting due to no network). The `.catch(() => ({ message: "Request failed" }))` on line 39 only handles JSON parse failure for error responses, not network-level failures. | Add a try/catch around the entire fetch call to handle `TypeError` from network failures with a user-friendly message. |

### 4. Input Validation / Sanitization

| # | File | Line(s) | Severity | Description | Fix |
|---|------|---------|----------|-------------|-----|
| 4.1 | `src/app/login/page.tsx` | 23 | CRITICAL | Login form has `onSubmit={(e) => e.preventDefault()}` -- it prevents submission but never actually authenticates. No client-side validation feedback beyond HTML `required` attribute. No rate limiting, no error display. | Implement actual login logic with proper validation messages and error handling. |
| 4.2 | `src/app/signup/page.tsx` | 24 | CRITICAL | Signup form prevents submission and does nothing. Password only has `minLength={8}` as HTML validation, but no enforcement of complexity requirements (uppercase, numbers, special chars). No client-side feedback. | Implement signup logic with password strength validation and feedback. |
| 4.3 | `src/app/dashboard/page.tsx` | 150-158 | MEDIUM | Scan URL input has no validation. User can enter anything (empty string, non-URL text) and click "Scan" with no feedback. The button has no `type` attribute and no `onClick` handler. | Add URL validation, error message display, and connect the button to scan logic. |
| 4.4 | `src/app/dashboard/scans/page.tsx` | 34-42 | MEDIUM | Same issue as 4.3: scan URL input with no validation or action on the "New Scan" button. | Add URL validation and connect to scan initiation. |
| 4.5 | `src/app/dashboard/projects/page.tsx` | 47-48 | MEDIUM | "New Project" modal has Input fields but no validation. The "Create Project" button has no `onClick` handler. Name and URL can be empty. | Add required field validation and wire up creation logic. |
| 4.6 | `src/app/dashboard/settings/page.tsx` | 49-54 | MEDIUM | Password change form has no validation that new password and confirm password match. No minimum length enforcement. No current password verification before submission. | Add password match validation and strength requirements. |

### 5. Accessibility (a11y)

| # | File | Line(s) | Severity | Description | Fix |
|---|------|---------|----------|-------------|-----|
| 5.1 | `src/app/dashboard/layout.tsx` | 16-17 | MEDIUM | Search and notification icon buttons in the dashboard header have no `aria-label` attributes. Screen readers cannot identify their purpose. | Add `aria-label="Search"` and `aria-label="Notifications"` respectively. |
| 5.2 | `src/app/dashboard/layout.tsx` | 21 | LOW | Notification badge (orange dot) has no accessible text. Screen readers cannot communicate that there are unread notifications. | Add `<span className="sr-only">You have unread notifications</span>` next to the dot. |
| 5.3 | `src/app/dashboard/layout.tsx` | 24 | MEDIUM | User menu dropdown button lacks `aria-haspopup="menu"` and the dropdown menu lacks `role="menu"` and `role="menuitem"` on items. | Add proper ARIA menu pattern attributes. |
| 5.4 | `src/app/dashboard/layout.tsx` | 28-39 | MEDIUM | User menu dropdown does not trap focus, does not close on Escape key, and does not close when clicking outside. Keyboard users can tab past it or get lost. | Add focus trap, Escape key handler, and click-outside-to-close behavior. |
| 5.5 | `src/app/dashboard/page.tsx` | 150-155 | MEDIUM | Scan URL input in dashboard header has no label or `aria-label`. | Add `aria-label="URL to scan"` or a visually hidden label. |
| 5.6 | `src/app/dashboard/scans/page.tsx` | 34-39 | MEDIUM | Same as 5.5: scan URL input has no accessible label. | Add `aria-label="URL to scan"`. |
| 5.7 | `src/app/dashboard/projects/[id]/page.tsx` | 92 | MEDIUM | `<select>` element for scan schedule has a visual label ("Scan Schedule") but the `<label>` element is not associated with the `<select>` via `htmlFor`/`id`. | Add `id="scan-schedule"` to the select and `htmlFor="scan-schedule"` to the label. |
| 5.8 | `src/app/dashboard/projects/[id]/page.tsx` | 97-104 | LOW | Checkbox labels ("Accessibility", "Security", "Performance") have a visual `<label>` with text but the section title "Checks to Run" has no `<label>` association with the group. | Wrap in a `<fieldset>` with `<legend>Checks to Run</legend>`. |
| 5.9 | `src/components/Input.tsx` | 17 | MEDIUM | When `label` prop is provided, the `<label>` element is not associated with the input via `htmlFor`/`id`. The label is purely visual and does not work for screen readers. | Generate an auto-id (or accept an `id` prop) and wire up `htmlFor` on the label to `id` on the input. |
| 5.10 | `src/components/ViolationCard.tsx` | 38-55 | MEDIUM | The expandable button does not communicate expanded/collapsed state. Missing `aria-expanded` attribute. | Add `aria-expanded={expanded}` to the button element. |
| 5.11 | `src/app/dashboard/projects/page.tsx` | 42-56 | MEDIUM | Modal dialog is missing `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title. No focus trap. No Escape key to close. | Add dialog ARIA attributes, focus trap, and keyboard dismissal. |
| 5.12 | `src/components/Sidebar.tsx` | 28 | LOW | Sidebar navigation lacks `aria-label` to distinguish it from the main site navigation. | Add `aria-label="Dashboard navigation"` to the `<nav>` element. |
| 5.13 | `src/app/dashboard/scans/page.tsx` | 46-58 | LOW | Filter buttons ("All", "Completed", "Failed") do not communicate their selected state via `aria-pressed` or use a role like `tablist`/`tab`. | Add `aria-pressed={filter === f}` to each button, or use a proper tab pattern. |
| 5.14 | `src/app/dashboard/scans/[id]/page.tsx` | 131-137 | LOW | Category tab buttons lack proper tab ARIA pattern (`role="tablist"`, `role="tab"`, `aria-selected`). | Implement proper ARIA tabs pattern. |
| 5.15 | `src/components/ScoreCircle.tsx` | 46-60 | MEDIUM | The score visualization has no accessible text. Screen readers see nothing. | Add `role="img"` and `aria-label={`Score: ${score} out of 100, ${getScoreLabel(score)}`}` to the wrapper. |
| 5.16 | `src/components/StatsCard.tsx` | 15 | LOW | The icon in StatsCard has no `aria-hidden="true"`, so screen readers may try to announce the SVG. | Add `aria-hidden="true"` to the icon wrapper or the SVGs. |
| 5.17 | `src/app/login/page.tsx` | 71-78 | MEDIUM | Google and GitHub OAuth buttons have no `type="button"` attribute. Inside a `<form>`, they default to `type="submit"`, which would trigger form submission instead of OAuth flow. | Add `type="button"` to both OAuth buttons. |
| 5.18 | `src/app/signup/page.tsx` | 90-97 | MEDIUM | Same as 5.17: OAuth buttons inside form lack `type="button"`. | Add `type="button"` to both OAuth buttons. |
| 5.19 | `src/app/login/page.tsx` | 14-16, `src/app/signup/page.tsx` | 14-16 | LOW | Logo link (`<a href="/">`) wraps a component with `role="img"` but has no discernible link text for screen readers. | Add `aria-label="Go to PreShip homepage"` on the `<a>` tag. |

### 6. Unprotected Routes

| # | File | Line(s) | Severity | Description | Fix |
|---|------|---------|----------|-------------|-----|
| 6.1 | `src/app/dashboard/layout.tsx` | entire file | CRITICAL | The dashboard layout does not check for authentication. Any unauthenticated user can access `/dashboard`, `/dashboard/settings`, `/dashboard/billing`, etc. There is no auth check, no redirect to `/login`, and no auth context/provider. | Add an authentication check in the dashboard layout. Use middleware or a client-side check with redirect. Create an `AuthProvider` context. |
| 6.2 | `src/app/dashboard/settings/page.tsx` | 98-101 | MEDIUM | API key creation is accessible without auth verification. The "Generate Key" button has no handler, but when implemented, it must verify authentication first. | Ensure auth is checked at the layout level and API calls include token validation. |

### 7. Console.logs and Commented Code

| # | File | Line(s) | Severity | Description | Fix |
|---|------|---------|----------|-------------|-----|
| 7.1 | -- | -- | -- | No console.log statements or commented-out code found anywhere in the codebase. | N/A -- clean on this front. |

### 8. Unused Dependencies

| # | File | Line(s) | Severity | Description | Fix |
|---|------|---------|----------|-------------|-----|
| 8.1 | `package.json` | 18 | MEDIUM | `recharts` (^2.10.0) is listed as a dependency but is not imported anywhere in the codebase. The app uses hand-rolled SVG charts instead. | Remove `recharts` from `package.json` to reduce bundle size. |
| 8.2 | `package.json` | 19 | MEDIUM | `lucide-react` (^0.303.0) is listed as a dependency but is not imported anywhere. All icons are inline SVGs. | Remove `lucide-react` from `package.json`. |
| 8.3 | `src/components/Card.tsx` | entire file | LOW | The `Card` component is defined but never imported or used by any other file. | Either use it (replacing manual card markup in pages) or remove it. |
| 8.4 | `src/hooks/useApi.ts` | entire file | LOW | The `useApi` hook is defined but never used by any page or component. Only `apiFetch` (the non-hook export) is used by `useScan.ts`. | Keep `apiFetch` but consider whether `useApi` is needed, or mark it for future use. |
| 8.5 | `src/hooks/useScan.ts` | entire file | LOW | The `useScan` hook is defined but never imported by any page or component. All pages use hardcoded data. | Wire up when integrating real API, or remove to reduce dead code. |
| 8.6 | `src/components/Logo.tsx` | 7 | LOW | `theme` prop is accepted but never used in the component body. The `theme` parameter is destructured in the interface but not included in the function parameters. | Remove the `theme` prop from the interface, or implement dark/light theme logic. |

### 9. Performance

| # | File | Line(s) | Severity | Description | Fix |
|---|------|---------|----------|-------------|-----|
| 9.1 | `src/app/page.tsx` | entire file (456 lines) | MEDIUM | Landing page is a single monolithic "use client" component with inline feature data, SVG icons, and multiple sections. This prevents any static rendering by Next.js -- the entire page is client-rendered, including static marketing content that does not need client interactivity. | Split into a server component wrapper with only the interactive parts (hero input, counter animation) as client components. Extract feature data, steps, and pricing into static server-rendered sections. |
| 9.2 | `src/app/page.tsx` | 48-104 | LOW | Large arrays of JSX objects (features, steps) are defined at module scope on every import. The SVG icon JSX inside these arrays means React creates these elements even if the component never renders. | This is minor -- module-scope arrays are created once. No action strictly needed, but moving icons to a separate file would improve readability. |
| 9.3 | `src/app/dashboard/scans/[id]/page.tsx` | 53-58, 61-65, 97-100 | MEDIUM | `severityCounts`, `tabs`, `autoFixable` and violation category counts are all recalculated on every render by calling `.filter()` multiple times over the same `violations` array. Six separate `.filter()` calls on each render. | Wrap computed values in `useMemo` with `[violations]` dependency, or compute all counts in a single pass. |
| 9.4 | `src/app/dashboard/page.tsx` | 78-134 | LOW | The `TrendChart` SVG component recalculates all points, paths, and area paths on every render. With mock data this is fast, but with real data sets it could be expensive. | Wrap point/path calculations in `useMemo`. |
| 9.5 | `src/components/ViolationCard.tsx` | 29-34 | LOW | `severityColors` object is recreated on every render of every ViolationCard instance. | Move the `severityColors` constant outside the component function. |
| 9.6 | `src/app/dashboard/scans/[id]/page.tsx` | 25-37 | LOW | The `violations` array contains large inline objects with multi-line template strings for `fixCode`. This is defined at module scope, so it is created once, but when real API data replaces it, ensure the component does not recreate this on every render. | No immediate fix needed for mock data; ensure API data is properly memoized when integrated. |
| 9.7 | `src/app/page.tsx` | 1 | MEDIUM | The entire landing page is marked `"use client"`, which prevents Next.js from server-rendering any of it. The page includes large amounts of static content (features, steps, pricing, footer) that could be server-rendered for better initial load performance and SEO. | Remove `"use client"` from the page, extract interactive sections (counter, URL input) into separate client components. |

---

## Summary Table

### By Category

| Category | Critical | Medium | Low | Total |
|----------|----------|--------|-----|-------|
| 1. Duplicated/Inconsistent Logic | 0 | 3 | 3 | 6 |
| 2. Race Conditions / Infinite Renders | 1 | 1 | 1 | 3 |
| 3. API Error Handling | 5 | 4 | 0 | 9 |
| 4. Input Validation | 2 | 4 | 0 | 6 |
| 5. Accessibility (a11y) | 0 | 12 | 7 | 19 |
| 6. Unprotected Routes | 1 | 1 | 0 | 2 |
| 7. Console.logs / Commented Code | 0 | 0 | 0 | 0 |
| 8. Unused Dependencies | 0 | 2 | 4 | 6 |
| 9. Performance | 0 | 3 | 4 | 7 |
| **Total** | **9** | **30** | **19** | **58** |

### By Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 9 |
| MEDIUM | 30 |
| LOW | 19 |
| **Total** | **58** |

---

## Top Priority Fixes (Critical Issues)

1. **No authentication on dashboard routes** (6.1) -- Anyone can access all dashboard pages without logging in. This is the highest priority security issue.
2. **Login/Signup forms are non-functional** (4.1, 4.2) -- Forms prevent default submission and do nothing. No auth flow exists.
3. **All dashboard pages use hardcoded mock data** (3.1-3.5) -- No API integration. Route parameters `[id]` are ignored. No loading, error, or empty states.
4. **useScan polling race condition** (2.1) -- Multiple rapid calls can create overlapping polling intervals, causing state corruption and memory leaks.

---

## Positive Findings

- Clean codebase with no console.log statements or commented-out code
- Good use of TypeScript throughout
- Landing page has proper skip-to-content link, ARIA labels on sections, and `aria-hidden` on decorative elements
- Button component properly implements `forwardRef`, `focus-visible` styling, loading state, and disabled state
- Navbar has proper `aria-label`, `aria-expanded`, and mobile menu toggle accessibility
- `cn()` utility using `clsx` + `tailwind-merge` is a best practice
- SVG icons consistently use `aria-hidden="true"` on the landing page
- Color-coded score system is well-abstracted through utility functions in `lib/utils.ts`
- QueryClient is properly initialized in a `useState` to avoid re-creation on re-renders
