import type { Violation, FixSuggestion } from "@preship/shared";

/**
 * Generate fix suggestions for a list of violations.
 *
 * Uses rule-based heuristics to provide actionable fix suggestions
 * for common accessibility, security, and performance issues.
 *
 * @param violations - Array of violations to generate suggestions for
 * @returns Array of fix suggestions with confidence scores
 */
export async function generateFixSuggestions(
  violations: Violation[]
): Promise<FixSuggestion[]> {
  const suggestions: FixSuggestion[] = [];

  for (const violation of violations) {
    const suggestion = getSuggestionForRule(violation);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}

/**
 * Get a fix suggestion for a specific violation based on its rule.
 */
function getSuggestionForRule(violation: Violation): FixSuggestion | null {
  const { id, rule } = violation;

  const ruleMap: Record<string, { description: string; codeSnippet?: string; confidence: number }> = {
    "html-has-lang": {
      description: 'Add a lang attribute to the <html> element.',
      codeSnippet: '<html lang="en">',
      confidence: 0.95,
    },
    "skip-navigation": {
      description: 'Add a "Skip to main content" link as the first element in <body>.',
      codeSnippet: '<a href="#main-content" class="skip-link">Skip to main content</a>',
      confidence: 0.9,
    },
    "heading-order": {
      description: "Fix the heading hierarchy to follow a logical order (h1 > h2 > h3) without skipping levels.",
      confidence: 0.8,
    },
    "img-dimensions": {
      description: "Add explicit width and height attributes to <img> elements.",
      confidence: 0.85,
    },
    "no-https": {
      description: "Configure your server to redirect all HTTP traffic to HTTPS.",
      confidence: 0.9,
    },
    "insecure-cookie": {
      description: "Set Secure, HttpOnly, and SameSite attributes on cookies.",
      codeSnippet: 'Set-Cookie: session=abc123; Secure; HttpOnly; SameSite=Strict',
      confidence: 0.9,
    },
    "mixed-content": {
      description: "Update all resource URLs to use HTTPS instead of HTTP.",
      confidence: 0.85,
    },
    "exposed-secret": {
      description: "Remove secrets from client-side code and use environment variables with server-side APIs.",
      confidence: 0.95,
    },
    "render-blocking-scripts": {
      description: 'Add "async" or "defer" attribute to non-critical scripts.',
      codeSnippet: '<script src="app.js" defer></script>',
      confidence: 0.85,
    },
    "img-missing-lazy-loading": {
      description: 'Add loading="lazy" to below-fold images.',
      codeSnippet: '<img src="photo.jpg" loading="lazy" alt="Description">',
      confidence: 0.9,
    },
    "img-unoptimized-format": {
      description: "Convert images to modern formats like WebP or AVIF.",
      codeSnippet: '<picture>\n  <source srcset="photo.avif" type="image/avif">\n  <source srcset="photo.webp" type="image/webp">\n  <img src="photo.jpg" alt="Description">\n</picture>',
      confidence: 0.85,
    },
  };

  // Try exact rule match
  const match = ruleMap[rule];
  if (match) {
    return {
      violationId: id,
      description: match.description,
      codeSnippet: match.codeSnippet,
      confidence: match.confidence,
      source: "rule-based",
    };
  }

  // Try matching by missing security header rules
  if (rule.startsWith("missing-")) {
    const header = rule.replace("missing-", "");
    return {
      violationId: id,
      description: `Add the ${header} HTTP response header to improve security.`,
      confidence: 0.85,
      source: "rule-based",
    };
  }

  return null;
}
