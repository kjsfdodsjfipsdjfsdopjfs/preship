import type { Violation, CheckCategory, Severity } from "./types";

// ── Types ────────────────────────────────────────────────────────────

export interface TranslatedViolation {
  humanTitle: string;
  humanDescription: string;
  impact: string;
  legalRisk: boolean;
  emoji: string;
  fixDifficulty: "easy" | "medium" | "hard";
}

// ── Translation Dictionary ───────────────────────────────────────────

interface ViolationEntry {
  humanTitle: string;
  humanDescription: string;
  impact: string;
  legalRisk: boolean;
  fixDifficulty: "easy" | "medium" | "hard";
}

const VIOLATION_DICTIONARY: Record<string, ViolationEntry> = {
  // ── Accessibility ────────────────────────────────────────────────

  "image-alt": {
    humanTitle: "Images are invisible to blind users",
    humanDescription:
      "Some images on your site have no text description for screen readers. Over 1 billion people with disabilities cannot understand what these images show.",
    impact: "Blind and low-vision users",
    legalRisk: true,
    fixDifficulty: "easy",
  },
  label: {
    humanTitle: "Form fields have no labels",
    humanDescription:
      "Some form inputs are missing labels, so screen reader users cannot tell what information to enter. This also hurts usability for everyone on mobile devices.",
    impact: "Blind users, motor-impaired users, mobile users",
    legalRisk: true,
    fixDifficulty: "easy",
  },
  "button-name": {
    humanTitle: "Buttons have no accessible name",
    humanDescription:
      "Some buttons on your site have no text or label, so assistive technology users have no idea what the button does when they encounter it.",
    impact: "Blind users, voice-control users",
    legalRisk: true,
    fixDifficulty: "easy",
  },
  "color-contrast": {
    humanTitle: "Text is hard to read due to low contrast",
    humanDescription:
      "Some text does not have enough contrast against its background. This makes it difficult or impossible to read for people with low vision, color blindness, or even anyone in bright sunlight.",
    impact: "Low-vision users, color-blind users, all users in bright environments",
    legalRisk: true,
    fixDifficulty: "medium",
  },
  "html-has-lang": {
    humanTitle: "Page language is not declared",
    humanDescription:
      "Your page does not specify what language it is written in. Screen readers will not know how to pronounce the content correctly, making it sound like gibberish.",
    impact: "All screen reader users",
    legalRisk: true,
    fixDifficulty: "easy",
  },
  "heading-order": {
    humanTitle: "Headings are out of order",
    humanDescription:
      "Your headings skip levels (e.g., jumping from h1 to h3). Screen reader users rely on heading structure to navigate the page like a table of contents.",
    impact: "Screen reader users, SEO crawlers",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "link-name": {
    humanTitle: "Links have no descriptive text",
    humanDescription:
      'Some links have no text or use vague text like "click here." Screen reader users navigate by listing all links, so they need descriptive names to understand where each link goes.',
    impact: "Blind users, voice-control users",
    legalRisk: true,
    fixDifficulty: "easy",
  },
  "aria-roles": {
    humanTitle: "Invalid ARIA roles are confusing assistive technology",
    humanDescription:
      "Some elements use incorrect ARIA roles, which sends wrong signals to screen readers. This can make parts of your page unusable for people relying on assistive technology.",
    impact: "All assistive technology users",
    legalRisk: true,
    fixDifficulty: "medium",
  },
  keyboard: {
    humanTitle: "Parts of your site cannot be used with a keyboard",
    humanDescription:
      "Some interactive elements cannot be reached or activated using only a keyboard. People who cannot use a mouse are completely locked out of these features.",
    impact: "Motor-impaired users, power users, screen reader users",
    legalRisk: true,
    fixDifficulty: "medium",
  },
  "focus-visible": {
    humanTitle: "Keyboard focus indicator is missing",
    humanDescription:
      "When users navigate with the keyboard, there is no visible indicator showing which element is currently focused. Keyboard users cannot tell where they are on the page.",
    impact: "Keyboard users, motor-impaired users",
    legalRisk: true,
    fixDifficulty: "easy",
  },
  "form-field-multiple-labels": {
    humanTitle: "Form fields have multiple conflicting labels",
    humanDescription:
      "Some form inputs are associated with more than one label, which confuses screen readers. Users hear conflicting instructions about what to enter.",
    impact: "Screen reader users",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "frame-title": {
    humanTitle: "Embedded frames have no title",
    humanDescription:
      "Iframes on your page are missing title attributes. Screen reader users cannot tell what content is embedded without a descriptive title.",
    impact: "Screen reader users",
    legalRisk: true,
    fixDifficulty: "easy",
  },
  list: {
    humanTitle: "Lists are not structured correctly",
    humanDescription:
      "Some lists use incorrect HTML markup. Screen readers announce the number of items in a list to help users understand the content, but broken markup prevents this.",
    impact: "Screen reader users",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "meta-viewport": {
    humanTitle: "Pinch-to-zoom is disabled",
    humanDescription:
      "Your site prevents users from zooming in on mobile devices. People with low vision need to zoom in to read text, and blocking this makes your site unusable for them.",
    impact: "Low-vision mobile users",
    legalRisk: true,
    fixDifficulty: "easy",
  },
  "document-title": {
    humanTitle: "Page has no title",
    humanDescription:
      "Your page is missing a <title> element. Screen reader users hear the page title first when they load a page, and browsers show it in tabs. Without it, users cannot identify your page.",
    impact: "All users, screen reader users, SEO",
    legalRisk: true,
    fixDifficulty: "easy",
  },

  // ── Security ─────────────────────────────────────────────────────

  "missing-csp": {
    humanTitle: "No protection against code injection attacks",
    humanDescription:
      "Your site is missing a Content-Security-Policy header. Without it, attackers can inject malicious scripts that steal user data, hijack sessions, or deface your site.",
    impact: "All users — their data and accounts are at risk",
    legalRisk: false,
    fixDifficulty: "hard",
  },
  "missing-hsts": {
    humanTitle: "Connections can be downgraded to insecure HTTP",
    humanDescription:
      "Your site does not enforce HTTPS via the Strict-Transport-Security header. Attackers on public Wi-Fi can intercept and modify traffic between your users and your server.",
    impact: "All users on insecure networks",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "missing-x-frame-options": {
    humanTitle: "Your site can be embedded in fake pages",
    humanDescription:
      "Without the X-Frame-Options header, attackers can embed your site in a hidden iframe on a malicious page and trick users into clicking things they did not intend to (clickjacking).",
    impact: "All users — vulnerable to clickjacking attacks",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "missing-x-content-type": {
    humanTitle: "Browser can misinterpret file types",
    humanDescription:
      "The X-Content-Type-Options header is missing. Browsers might try to guess the type of a file, which attackers can exploit to execute malicious content disguised as harmless files.",
    impact: "All users",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "server-header-info": {
    humanTitle: "Server software version is exposed",
    humanDescription:
      "Your server is revealing its software name and version in HTTP headers. Attackers use this information to find known vulnerabilities specific to your server version.",
    impact: "All users — makes targeted attacks easier",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "mixed-content": {
    humanTitle: "Some resources load over insecure HTTP",
    humanDescription:
      "Your HTTPS site loads some files over plain HTTP. This creates a security hole where attackers can tamper with those files to inject malicious content into your otherwise secure page.",
    impact: "All users",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "insecure-cookies": {
    humanTitle: "Cookies are not properly secured",
    humanDescription:
      "Your cookies are missing security flags (Secure, HttpOnly, SameSite). This means session tokens can be stolen via network interception or cross-site scripting attacks.",
    impact: "All logged-in users — sessions can be hijacked",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "exposed-secrets": {
    humanTitle: "API keys or secrets are visible in your code",
    humanDescription:
      "Sensitive credentials like API keys, tokens, or passwords are exposed in your client-side code. Anyone can view your page source and steal these secrets to access your services.",
    impact: "Your business — financial and data breach risk",
    legalRisk: false,
    fixDifficulty: "medium",
  },

  // ── Performance ──────────────────────────────────────────────────

  "large-dom": {
    humanTitle: "Page has too many HTML elements",
    humanDescription:
      "Your page has an excessively large DOM tree. This slows down rendering, increases memory usage, and makes the page feel sluggish, especially on older phones and tablets.",
    impact: "Mobile users, users on older devices",
    legalRisk: false,
    fixDifficulty: "hard",
  },
  "render-blocking": {
    humanTitle: "Scripts are blocking the page from loading",
    humanDescription:
      "JavaScript or CSS files are blocking the browser from rendering your page. Users see a blank screen while waiting for these files to download and execute.",
    impact: "All users — especially on slow connections",
    legalRisk: false,
    fixDifficulty: "medium",
  },
  "large-images": {
    humanTitle: "Images are too large and slow to load",
    humanDescription:
      "Some images on your site are much larger than they need to be. This wastes bandwidth, slows down page loading, and frustrates users on mobile or slow connections.",
    impact: "All users — especially mobile and slow connections",
    legalRisk: false,
    fixDifficulty: "medium",
  },
  "no-lazy-loading": {
    humanTitle: "All images load at once, even hidden ones",
    humanDescription:
      "Images below the fold are loading immediately instead of waiting until the user scrolls to them. This wastes bandwidth and slows down the initial page load.",
    impact: "All users — especially mobile and slow connections",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "excessive-scripts": {
    humanTitle: "Too many JavaScript files are loaded",
    humanDescription:
      "Your page loads an excessive number of JavaScript files. Each file requires a separate network request and execution time, significantly slowing down your page.",
    impact: "All users — especially mobile",
    legalRisk: false,
    fixDifficulty: "hard",
  },

  // ── SEO ──────────────────────────────────────────────────────────

  "missing-meta-description": {
    humanTitle: "Search engines have no summary of your page",
    humanDescription:
      "Your page is missing a meta description. Search engines use this to display a summary below your link in search results. Without it, Google picks random text from your page.",
    impact: "Your search ranking and click-through rate",
    legalRisk: false,
    fixDifficulty: "easy",
  },
  "missing-og-tags": {
    humanTitle: "Shared links look broken on social media",
    humanDescription:
      "Your page is missing Open Graph meta tags. When someone shares your link on Twitter, Facebook, or Slack, it will show a plain URL instead of a rich preview with image and description.",
    impact: "Social media presence and click-through rate",
    legalRisk: false,
    fixDifficulty: "easy",
  },
};

// ── Emoji Mapping ────────────────────────────────────────────────────

function getEmoji(severity: Severity): string {
  switch (severity) {
    case "critical":
    case "high":
      return "\uD83D\uDD34";
    case "medium":
      return "\uD83D\uDFE1";
    case "low":
    case "info":
      return "\uD83D\uDFE2";
    default:
      return "\uD83D\uDFE1";
  }
}

// ── Generic Fallback ─────────────────────────────────────────────────

function getGenericTranslation(
  category: CheckCategory,
  severity: Severity,
  message: string
): TranslatedViolation {
  const categoryLabels: Record<CheckCategory, { title: string; impact: string; legalRisk: boolean }> = {
    accessibility: {
      title: "Accessibility issue detected",
      impact: "Users with disabilities",
      legalRisk: severity === "critical" || severity === "high",
    },
    security: {
      title: "Security vulnerability found",
      impact: "All users — data and privacy at risk",
      legalRisk: false,
    },
    performance: {
      title: "Performance issue detected",
      impact: "All users — especially mobile",
      legalRisk: false,
    },
    seo: {
      title: "SEO issue found",
      impact: "Search visibility and traffic",
      legalRisk: false,
    },
    privacy: {
      title: "Privacy concern detected",
      impact: "User data and trust",
      legalRisk: false,
    },
    mobile: {
      title: "Mobile usability issue",
      impact: "Mobile users",
      legalRisk: false,
    },
  };

  const info = categoryLabels[category] || {
    title: "Issue detected",
    impact: "Site users",
    legalRisk: false,
  };

  return {
    humanTitle: info.title,
    humanDescription: message,
    impact: info.impact,
    legalRisk: info.legalRisk,
    emoji: getEmoji(severity),
    fixDifficulty: severity === "critical" || severity === "high" ? "medium" : "easy",
  };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Translate a technical violation into a human-readable description.
 *
 * Looks up the violation's rule ID in the dictionary. If no match is found,
 * returns a generic translation based on the category and severity.
 */
export function translateViolation(violation: Violation): TranslatedViolation {
  const entry = VIOLATION_DICTIONARY[violation.rule];

  if (entry) {
    return {
      humanTitle: entry.humanTitle,
      humanDescription: entry.humanDescription,
      impact: entry.impact,
      legalRisk: entry.legalRisk,
      emoji: getEmoji(violation.severity),
      fixDifficulty: entry.fixDifficulty,
    };
  }

  return getGenericTranslation(violation.category, violation.severity, violation.message);
}
