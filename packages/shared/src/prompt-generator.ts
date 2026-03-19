import type { Violation, CheckCategory } from "./types";

// ── Types ────────────────────────────────────────────────────────────

type AiTool = "cursor" | "claude" | "v0" | "generic";

interface GroupedViolation {
  category: CheckCategory;
  rule: string;
  message: string;
  elements: Array<{ element?: string; selector?: string; url: string }>;
}

// ── Grouping Logic ───────────────────────────────────────────────────

function groupViolations(violations: Violation[]): GroupedViolation[] {
  const groups = new Map<string, GroupedViolation>();

  for (const v of violations) {
    const key = `${v.category}::${v.rule}`;
    const existing = groups.get(key);

    if (existing) {
      existing.elements.push({
        element: v.element,
        selector: v.selector,
        url: v.url,
      });
    } else {
      groups.set(key, {
        category: v.category,
        rule: v.rule,
        message: v.message,
        elements: [{ element: v.element, selector: v.selector, url: v.url }],
      });
    }
  }

  // Sort by category for consistent output
  const categoryOrder: CheckCategory[] = [
    "accessibility",
    "security",
    "performance",
    "seo",
    "privacy",
    "mobile",
  ];

  return Array.from(groups.values()).sort(
    (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
  );
}

// ── Element Description ──────────────────────────────────────────────

function describeElement(el: { element?: string; selector?: string; url: string }): string {
  const parts: string[] = [];

  if (el.element) {
    // Truncate very long element strings
    const cleaned = el.element.length > 120 ? el.element.slice(0, 120) + "..." : el.element;
    parts.push(cleaned);
  } else if (el.selector) {
    parts.push(el.selector);
  }

  if (el.url) {
    try {
      const path = new URL(el.url).pathname;
      if (path && path !== "/") {
        parts.push(`on ${path}`);
      } else {
        parts.push("on the homepage");
      }
    } catch {
      // If URL parsing fails, just use the raw url
      parts.push(`on ${el.url}`);
    }
  }

  return parts.join(" ") || "(unknown element)";
}

// ── Violation Summary Line ───────────────────────────────────────────

function summarizeGroup(group: GroupedViolation): string {
  const count = group.elements.length;
  const label = group.category.toUpperCase();

  return `${label}: ${group.message}${count > 1 ? ` (${count} instances)` : ""}`;
}

// ── Tool-Specific Preambles ──────────────────────────────────────────

function getPreamble(tool: AiTool, url: string): string {
  switch (tool) {
    case "cursor":
      return `I ran a quality scan on my site ${url} and found these issues. Please fix all of them in my codebase:`;
    case "claude":
      return `I scanned my website ${url} for quality issues and found the problems listed below. Help me fix each one:`;
    case "v0":
      return `My site ${url} has the following quality issues. Please generate updated code that fixes all of them:`;
    case "generic":
    default:
      return `I ran a quality scan on ${url} and found these issues that need to be fixed:`;
  }
}

function getClosing(_tool: AiTool): string {
  return "\nAfter fixing, scan again at preship.dev to verify.";
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Generate a copy-paste prompt for AI coding tools that describes
 * all violations in plain English with specific elements and locations.
 *
 * @param violations - Array of violations from a scan
 * @param tool - Which AI tool the prompt is for (cursor, claude, v0, generic)
 * @param url - The URL that was scanned
 * @returns A formatted string prompt ready to paste into an AI tool
 */
export function generateFixPrompt(
  violations: Violation[],
  tool: AiTool = "generic",
  url: string
): string {
  if (violations.length === 0) {
    return `Great news! No issues were found on ${url}. Your site passed all checks.`;
  }

  const groups = groupViolations(violations);
  const lines: string[] = [];

  lines.push(getPreamble(tool, url));
  lines.push("");

  let index = 1;
  for (const group of groups) {
    lines.push(`${index}. ${summarizeGroup(group)}`);

    // List individual elements (cap at 10 to keep prompt manageable)
    const elementsToShow = group.elements.slice(0, 10);
    for (const el of elementsToShow) {
      lines.push(`   - ${describeElement(el)}`);
    }
    if (group.elements.length > 10) {
      lines.push(`   - ...and ${group.elements.length - 10} more`);
    }

    // Add a brief action instruction per group
    lines.push(`   ${getActionHint(group.rule, group.category)}`);
    lines.push("");
    index++;
  }

  lines.push(getClosing(tool));

  return lines.join("\n");
}

// ── Action Hints ─────────────────────────────────────────────────────

function getActionHint(rule: string, category: CheckCategory): string {
  const hints: Record<string, string> = {
    // Accessibility
    "image-alt": "Please add descriptive alt text to each image.",
    label: "Connect each input to a proper <label> element.",
    "button-name": "Add visible text or an aria-label to each button.",
    "color-contrast":
      "Increase the contrast ratio between text and background to meet WCAG AA (4.5:1 for normal text).",
    "html-has-lang": 'Add lang="en" (or your language) to the <html> element.',
    "heading-order": "Restructure headings to follow h1 > h2 > h3 order without skipping levels.",
    "link-name": "Add descriptive text to each link instead of generic phrases.",
    "aria-roles": "Fix or remove invalid ARIA role attributes.",
    keyboard: "Ensure all interactive elements are reachable and operable via keyboard.",
    "focus-visible": "Add a visible focus indicator style (e.g., outline) for keyboard navigation.",
    "form-field-multiple-labels": "Remove duplicate labels so each input has exactly one.",
    "frame-title": "Add a descriptive title attribute to each iframe.",
    list: "Use proper <ul>/<ol> and <li> elements for list content.",
    "meta-viewport":
      'Remove maximum-scale=1 and user-scalable=no from the viewport meta tag.',
    "document-title": "Add a descriptive <title> element to the <head>.",

    // Security
    "missing-csp": "Add a Content-Security-Policy header to prevent XSS attacks.",
    "missing-hsts": "Add Strict-Transport-Security header with a max-age of at least one year.",
    "missing-x-frame-options": "Add X-Frame-Options: DENY or SAMEORIGIN header.",
    "missing-x-content-type": "Add X-Content-Type-Options: nosniff header.",
    "server-header-info": "Remove or obscure the Server header in HTTP responses.",
    "mixed-content": "Update all resource URLs to use HTTPS instead of HTTP.",
    "insecure-cookies": "Set Secure, HttpOnly, and SameSite flags on all cookies.",
    "exposed-secrets":
      "Move secrets to environment variables and never include them in client-side code.",

    // Performance
    "large-dom": "Reduce DOM size by simplifying markup or virtualizing long lists.",
    "render-blocking": 'Add async or defer to non-critical scripts and inline critical CSS.',
    "large-images": "Compress images and serve modern formats (WebP/AVIF) with proper sizing.",
    "no-lazy-loading": 'Add loading="lazy" to images below the fold.',
    "excessive-scripts": "Bundle, code-split, or remove unused JavaScript files.",

    // SEO
    "missing-meta-description": "Add a <meta name=\"description\"> tag with a compelling summary.",
    "missing-og-tags":
      "Add Open Graph meta tags (og:title, og:description, og:image) for rich social previews.",
  };

  if (hints[rule]) {
    return hints[rule];
  }

  // Category-based fallback
  const fallbacks: Record<string, string> = {
    accessibility: "Fix this accessibility issue to improve usability for all users.",
    security: "Address this security vulnerability to protect your users.",
    performance: "Optimize this to improve page load speed.",
    seo: "Fix this to improve search engine visibility.",
    privacy: "Address this privacy concern to protect user data.",
    mobile: "Fix this to improve the mobile experience.",
  };

  return fallbacks[category] || "Please fix this issue.";
}
