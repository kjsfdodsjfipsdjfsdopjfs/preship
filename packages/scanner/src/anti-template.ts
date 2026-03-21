import type { Page } from "puppeteer-core";
import type { Violation, CheckCategory } from "@preship/shared";

/**
 * Anti-Template Detection — penalty layer that identifies
 * generic template/placeholder content and deducts points.
 *
 * This runs on TOP of the cumulative scoring. It creates violations
 * with high severity to drag scores down for apps that are clearly
 * unfinished templates rather than real products.
 */

export interface AntiTemplateResult {
  violations: Violation[];
  totalPenalty: number;
}

const CATEGORY: CheckCategory = "human_appeal";

export async function runAntiTemplateChecks(
  page: Page,
  url: string
): Promise<AntiTemplateResult> {
  const violations: Violation[] = [];
  let totalPenalty = 0;

  // 1. Lorem ipsum detection
  try {
    const hasLorem = await page.evaluate(() => {
      const text = document.body?.innerText?.toLowerCase() ?? "";
      return /lorem ipsum|dolor sit amet|consectetur adipiscing|sed do eiusmod/.test(text);
    });
    if (hasLorem) {
      violations.push({
        id: `anti-tpl-lorem-${rid()}`,
        category: CATEGORY,
        severity: "critical",
        rule: "lorem-ipsum-detected",
        message: "Lorem ipsum placeholder text detected. This is not a real product.",
        url,
        help: "Replace all placeholder text with real content that describes your product.",
      });
      totalPenalty += 20;
    }
  } catch {}

  // 2. Placeholder content detection
  try {
    const placeholders = await page.evaluate(() => {
      const text = document.body?.innerText ?? "";
      const patterns = [
        /john\s+doe/i,
        /jane\s+doe/i,
        /example@(email|mail|example)\.(com|org)/i,
        /123\s+main\s+st/i,
        /\+1\s*\(555\)/,
        /your\s+company\s+name\s+here/i,
        /\[your\s+/i,
        /\{company\s*name\}/i,
        /acme\s+(inc|corp|company)/i,
      ];
      return patterns.filter(p => p.test(text)).length;
    });
    if (placeholders > 0) {
      violations.push({
        id: `anti-tpl-placeholder-${rid()}`,
        category: CATEGORY,
        severity: "high",
        rule: "placeholder-content",
        message: `Found ${placeholders} placeholder content pattern(s) (e.g. "John Doe", "example@email.com").`,
        url,
        help: "Replace all placeholder names, emails, and addresses with real content.",
      });
      totalPenalty += Math.min(15, placeholders * 5);
    }
  } catch {}

  // 3. Dead links (# or javascript:void)
  try {
    const deadLinks = await page.evaluate(() => {
      const links = document.querySelectorAll("a[href]");
      let count = 0;
      for (const a of links) {
        const href = a.getAttribute("href") ?? "";
        if (href === "#" || href === "javascript:void(0)" || href === "javascript:void(0);") {
          // Exclude known patterns like anchor links with IDs
          const text = (a.textContent || "").trim();
          if (text.length > 0) count++;
        }
      }
      return count;
    });
    if (deadLinks > 0) {
      violations.push({
        id: `anti-tpl-dead-links-${rid()}`,
        category: CATEGORY,
        severity: "high",
        rule: "dead-links",
        message: `Found ${deadLinks} link(s) pointing to "#" or "javascript:void(0)".`,
        url,
        help: "Replace dead links with real URLs or remove them. Links that go nowhere destroy user trust.",
      });
      totalPenalty += Math.min(30, deadLinks * 10);
    }
  } catch {}

  // 4. Default framework favicon
  try {
    const hasDefaultFavicon = await page.evaluate(() => {
      const icons = document.querySelectorAll('link[rel*="icon"]');
      if (icons.length === 0) return true; // no favicon at all
      for (const icon of icons) {
        const href = (icon.getAttribute("href") ?? "").toLowerCase();
        // Default Next.js, Vite, React, Vue favicons
        if (
          href.includes("/favicon.ico") && !href.includes("custom") ||
          href.includes("vite.svg") ||
          href.includes("react.svg") ||
          href.includes("vue.svg") ||
          href.includes("next.svg") ||
          href.includes("vercel.svg")
        ) {
          return true;
        }
      }
      return false;
    });
    // Check if favicon actually loads and is the generic one
    if (hasDefaultFavicon) {
      violations.push({
        id: `anti-tpl-default-favicon-${rid()}`,
        category: "design",
        severity: "high",
        rule: "default-favicon",
        message: "Using default framework favicon or no custom favicon found.",
        url,
        help: "Create a custom favicon that represents your brand. Use realfavicongenerator.net.",
      });
      totalPenalty += 10;
    }
  } catch {}

  // 5. Buttons with no handlers
  try {
    const deadButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll("button");
      let count = 0;
      for (const btn of buttons) {
        const text = (btn.textContent || "").trim();
        // Skip menu/toggle buttons, focus on content buttons
        if (text.length > 2 && !btn.closest("nav") && !btn.closest("[role='navigation']")) {
          // Check if button has any indication of being functional
          const hasClick = btn.onclick !== null;
          const hasListeners = btn.getAttribute("onclick") !== null;
          const hasType = btn.type === "submit";
          const hasAriaControls = btn.hasAttribute("aria-controls");
          const hasDataAttrs = Array.from(btn.attributes).some(a => a.name.startsWith("data-"));
          if (!hasClick && !hasListeners && !hasType && !hasAriaControls && !hasDataAttrs) {
            // Could be React/Vue event binding — check for common framework patterns
            const hasFrameworkBinding =
              btn.hasAttribute("@click") ||
              btn.className.includes("btn") ||
              btn.closest("form") !== null;
            if (!hasFrameworkBinding) {
              count++;
            }
          }
        }
      }
      return count;
    });
    if (deadButtons > 2) {
      violations.push({
        id: `anti-tpl-dead-buttons-${rid()}`,
        category: "ux",
        severity: "high",
        rule: "non-functional-buttons",
        message: `Found ${deadButtons} button(s) with no apparent click handler.`,
        url,
        help: "Ensure all buttons have event handlers. Remove buttons that don't do anything.",
      });
      totalPenalty += 10;
    }
  } catch {}

  // 6. Empty sections
  try {
    const emptySections = await page.evaluate(() => {
      const sections = document.querySelectorAll("section, [class*='section'], main > div");
      let count = 0;
      for (const sec of sections) {
        const text = (sec.textContent || "").trim();
        const hasImages = sec.querySelectorAll("img, svg, video, canvas").length > 0;
        if (text.length < 10 && !hasImages) {
          count++;
        }
      }
      return count;
    });
    if (emptySections > 1) {
      violations.push({
        id: `anti-tpl-empty-sections-${rid()}`,
        category: "ux",
        severity: "medium",
        rule: "empty-sections",
        message: `Found ${emptySections} empty or near-empty section(s) on the page.`,
        url,
        help: "Remove empty sections or add meaningful content. Empty sections make the page look unfinished.",
      });
      totalPenalty += Math.min(15, emptySections * 5);
    }
  } catch {}

  // 7. "Coming soon" / "Under construction"
  try {
    const hasComingSoon = await page.evaluate(() => {
      const text = document.body?.innerText?.toLowerCase() ?? "";
      return /coming soon|under construction|work in progress|site is under|launching soon|stay tuned/.test(text);
    });
    if (hasComingSoon) {
      violations.push({
        id: `anti-tpl-coming-soon-${rid()}`,
        category: CATEGORY,
        severity: "high",
        rule: "coming-soon",
        message: '"Coming soon" or "Under construction" text detected. The product is not ready.',
        url,
        help: "Remove 'coming soon' messaging. If the feature isn't ready, don't show it.",
      });
      totalPenalty += 10;
    }
  } catch {}

  // 8. Stock photo detection (unsplash/pexels direct URLs)
  try {
    const stockPhotos = await page.evaluate(() => {
      const imgs = document.querySelectorAll("img[src]");
      let count = 0;
      for (const img of imgs) {
        const src = (img.getAttribute("src") ?? "").toLowerCase();
        if (
          src.includes("unsplash.com/photos") ||
          src.includes("images.unsplash.com") ||
          src.includes("images.pexels.com") ||
          src.includes("picsum.photos") ||
          src.includes("placeholder.com") ||
          src.includes("via.placeholder") ||
          src.includes("placehold.co") ||
          src.includes("placekitten") ||
          src.includes("placeimg")
        ) {
          count++;
        }
      }
      return count;
    });
    if (stockPhotos > 0) {
      violations.push({
        id: `anti-tpl-stock-photos-${rid()}`,
        category: "design",
        severity: "medium",
        rule: "stock-placeholder-images",
        message: `Found ${stockPhotos} image(s) from stock/placeholder services (Unsplash, Pexels, placeholder).`,
        url,
        help: "Use original images or properly customized stock photos. Direct stock URLs look amateur.",
      });
      totalPenalty += Math.min(15, stockPhotos * 5);
    }
  } catch {}

  return { violations, totalPenalty };
}

function rid(): string {
  return Math.random().toString(36).slice(2, 8);
}
