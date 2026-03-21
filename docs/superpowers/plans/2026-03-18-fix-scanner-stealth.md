# Fix Scanner Stealth & Bot Protection Bypass

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the scanner return real a11y/security/perf scores instead of 0 on sites with bot protection (Cloudflare, Vercel, etc.)

**Architecture:** The scanner already uses puppeteer-extra + stealth plugin, but sites with Cloudflare JS challenges still block rendering. We need to: (1) add wait-for-challenge logic so the page renders fully, (2) detect when a page is a challenge/blocked page and score it as "blocked" not "0", (3) verify stealth is properly initialized in Docker.

**Tech Stack:** puppeteer-extra, puppeteer-extra-plugin-stealth, puppeteer-core, Chromium in Docker

---

## Root Cause Analysis

Current scan results for bot-protected sites:
- a11y: 0, security: 0, performance: 0 (page didn't render real content)
- SEO: 100, Privacy: 100, Mobile: 100 (these check HTTP headers/meta, work on challenge pages too)

The issue is NOT that stealth fails to load — it's that:
1. Cloudflare/Vercel serve a JS challenge page first (~5s wait)
2. Scanner navigates, gets challenge page, immediately runs axe-core on it
3. axe-core finds no content → score 0
4. Scanner doesn't wait for the challenge to resolve

## File Structure

- **Modify:** `packages/scanner/src/index.ts` — add challenge detection + wait-after-navigation
- **Create:** `packages/scanner/src/challenge-detector.ts` — detect Cloudflare/Vercel/generic challenge pages
- **Modify:** `packages/scanner/src/types.ts` — add `blocked` status to scan results
- **Modify:** `apps/api/src/services/queue.ts` — handle `blocked` scan status

---

### Task 1: Create Challenge Detector Module

**Files:**
- Create: `packages/scanner/src/challenge-detector.ts`

- [ ] **Step 1: Create the challenge detector**

```typescript
// packages/scanner/src/challenge-detector.ts
import type { Page } from "puppeteer-core";

interface ChallengeResult {
  isChallenge: boolean;
  provider: "cloudflare" | "vercel" | "generic" | null;
}

/**
 * Detect if the current page is a bot challenge/interstitial page.
 * Checks for known challenge page signatures.
 */
export async function detectChallenge(page: Page): Promise<ChallengeResult> {
  const content = await page.content();
  const title = await page.title();

  // Cloudflare challenge
  if (
    content.includes("cf-browser-verification") ||
    content.includes("cf_chl_opt") ||
    content.includes("challenge-platform") ||
    title.includes("Just a moment")
  ) {
    return { isChallenge: true, provider: "cloudflare" };
  }

  // Vercel protection
  if (
    content.includes("vercel-challenge") ||
    content.includes("_vercel/insights")  && content.length < 5000
  ) {
    return { isChallenge: true, provider: "vercel" };
  }

  // Generic: page too small (likely blocked/empty)
  const bodyText = await page.evaluate(() => document.body?.innerText?.trim() || "");
  if (bodyText.length < 50 && content.length < 3000) {
    return { isChallenge: true, provider: "generic" };
  }

  return { isChallenge: false, provider: null };
}

/**
 * Wait for a challenge page to resolve. Returns true if resolved, false if still blocked.
 * Waits up to maxWaitMs (default 15s) with polling.
 */
export async function waitForChallengeResolution(
  page: Page,
  maxWaitMs = 15000,
  pollIntervalMs = 2000
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const result = await detectChallenge(page);
    if (!result.isChallenge) {
      // Challenge resolved — wait a bit more for page to stabilize
      await new Promise((r) => setTimeout(r, 1000));
      return true;
    }
  }

  return false; // Still blocked after max wait
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/scanner && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/scanner/src/challenge-detector.ts
git commit -m "feat(scanner): add challenge page detection module"
```

---

### Task 2: Integrate Challenge Detection into Scanner

**Files:**
- Modify: `packages/scanner/src/index.ts` — lines ~160-180 (after page.goto, before running checks)

- [ ] **Step 1: Add imports to index.ts**

At the top of `index.ts`, add:
```typescript
import { detectChallenge, waitForChallengeResolution } from "./challenge-detector";
```

And export:
```typescript
export { detectChallenge, waitForChallengeResolution } from "./challenge-detector";
```

- [ ] **Step 2: Add challenge wait logic after page navigation**

In the `scanSinglePage` function (or wherever `page.goto(url)` happens for each page), after the navigation completes, add:

```typescript
// After page.goto(pageUrl, { waitUntil: "networkidle2", timeout: ... })

// Check for bot challenge pages (Cloudflare, Vercel, etc.)
const challenge = await detectChallenge(page);
if (challenge.isChallenge) {
  const resolved = await waitForChallengeResolution(page);
  if (!resolved) {
    // Page is still blocked — mark as blocked, skip a11y/security/perf
    // but still collect what we can (headers were already fetched)
    console.warn(`[scanner] Page blocked by ${challenge.provider}: ${pageUrl}`);
  }
}
```

Find the exact location by searching for `page.goto` in the `scanSinglePage` section and add the challenge check right after it.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd packages/scanner && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/scanner/src/index.ts
git commit -m "feat(scanner): wait for Cloudflare/Vercel challenge resolution before scanning"
```

---

### Task 3: Add networkidle0 + Extra Wait for Heavier Pages

**Files:**
- Modify: `packages/scanner/src/index.ts`

- [ ] **Step 1: Change waitUntil strategy**

Find the `page.goto` calls and change:
- `waitUntil: "networkidle2"` → `waitUntil: "networkidle0"` (wait for ALL network requests to finish, not just 2)
- Add a fallback `page.waitForTimeout(2000)` after navigation for JS-heavy pages

This ensures SPAs (React, Next.js) have time to hydrate before axe-core runs.

- [ ] **Step 2: Add waitForSelector fallback**

After `page.goto`, add:
```typescript
// Wait for main content to render (SPAs may need hydration time)
try {
  await page.waitForSelector("main, #__next, #root, [role='main'], article, .content", {
    timeout: 5000,
  });
} catch {
  // No main content selector found — page may be minimal or blocked
}
```

- [ ] **Step 3: Verify build**

Run: `cd packages/scanner && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add packages/scanner/src/index.ts
git commit -m "feat(scanner): improve page load waiting for SPAs and JS-heavy sites"
```

---

### Task 4: Handle "Blocked" Status in Scan Results

**Files:**
- Modify: `packages/scanner/src/types.ts`
- Modify: `apps/api/src/services/queue.ts`

- [ ] **Step 1: Add blocked page tracking to SinglePageResult**

In `packages/scanner/src/types.ts`, add to the `SinglePageResult` interface (or equivalent):
```typescript
blocked?: boolean;
blockedBy?: string; // "cloudflare" | "vercel" | "generic"
```

- [ ] **Step 2: When a page is blocked, set categories to null instead of 0**

In scanner index.ts, when `waitForChallengeResolution` returns false:
- Skip axe-core, security, and performance checks for that page
- Set `blocked: true` on the page result
- The score calculation should exclude blocked pages from the average

- [ ] **Step 3: In queue.ts, log blocked pages**

When the scan completes, if any pages were blocked, log:
```typescript
logger.warn("Scan completed with blocked pages", {
  scanId,
  blockedPages: result.pages?.filter(p => p.blocked).length,
  totalPages: result.pagesScanned,
});
```

- [ ] **Step 4: Verify build**

Run: `cd packages/scanner && npx tsc --noEmit && cd ../../apps/api && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add packages/scanner/src/types.ts packages/scanner/src/index.ts apps/api/src/services/queue.ts
git commit -m "feat(scanner): handle blocked pages gracefully, exclude from scoring"
```

---

### Task 5: Deploy and Verify with Real Sites

**Files:** None (deployment + testing)

- [ ] **Step 1: Push to trigger Railway deploy**

```bash
git push origin main
```

- [ ] **Step 2: Wait for both services to deploy successfully**

Monitor Railway deploy status until both API and Web show SUCCESS.

- [ ] **Step 3: Run test scans on 5 sites**

```bash
# Login
TOKEN=$(curl -s -X POST https://api.preship.dev/api/auth/login ...)

# Scan sites that were previously blocked
for URL in "https://en.wikipedia.org" "https://bbc.com" "https://dev.to" "https://nytimes.com" "https://tailwindcss.com"; do
  curl -s -X POST https://api.preship.dev/api/scans -H "Authorization: Bearer $TOKEN" -d "{\"url\":\"$URL\"}"
done
```

- [ ] **Step 4: Wait 3 minutes, check results**

Expected: Sites that render (wikipedia, bbc, dev.to) should now have a11y/security/perf scores > 0.
Sites that are still blocked (if any) should show "blocked" status instead of score 0.

- [ ] **Step 5: Verify in browser**

Open preship.dev/dashboard/scans and confirm real scores appear.

---

## Success Criteria

- [ ] Wikipedia scan: a11y score > 0, security score > 0
- [ ] BBC scan: a11y score > 0
- [ ] At least 3 of 5 test sites return non-zero a11y scores
- [ ] Sites that remain blocked show clear "blocked" status, not misleading "score: 0"
- [ ] No TypeScript errors in scanner or API packages
