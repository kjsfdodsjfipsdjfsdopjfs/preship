import type { Page } from "puppeteer-core";

interface ChallengeResult {
  isChallenge: boolean;
  provider: "cloudflare" | "vercel" | "generic" | null;
}

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
    (content.includes("_vercel/insights") && content.length < 5000)
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
      await new Promise((r) => setTimeout(r, 1000));
      return true;
    }
  }

  return false;
}
