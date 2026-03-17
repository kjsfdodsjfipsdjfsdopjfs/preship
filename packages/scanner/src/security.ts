import type { Page, HTTPResponse } from "puppeteer";
import type { Violation } from "@preship/shared";
import { SECURITY_HEADERS } from "@preship/shared";
import type { SecurityCheckResult } from "./types";

/**
 * Patterns that indicate exposed secrets or API keys in page source.
 * Each pattern includes the secret type name, regex, and severity.
 */
const SECRET_PATTERNS: {
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium";
}[] = [
  {
    name: "Stripe Secret Key",
    pattern: /sk_live_[a-zA-Z0-9]{20,}/,
    severity: "critical",
  },
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: "critical",
  },
  {
    name: "GitHub Token",
    pattern: /ghp_[a-zA-Z0-9]{36}/,
    severity: "critical",
  },
  {
    name: "GitHub OAuth Token",
    pattern: /gho_[a-zA-Z0-9]{36}/,
    severity: "critical",
  },
  {
    name: "Slack Token",
    pattern: /xox[bpors]-[a-zA-Z0-9-]{10,}/,
    severity: "critical",
  },
  {
    name: "Google API Key",
    pattern: /AIza[0-9A-Za-z\-_]{35}/,
    severity: "high",
  },
  {
    name: "Private Key",
    pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/,
    severity: "critical",
  },
  {
    name: "Generic Secret",
    pattern:
      /(?:password|secret|token|api_key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    severity: "high",
  },
  {
    name: "JWT Token",
    pattern:
      /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
    severity: "high",
  },
];

/**
 * Run comprehensive security checks against a page's HTTP response and DOM.
 *
 * Checks include:
 * - HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - HTTPS enforcement
 * - Cookie security attributes (Secure, HttpOnly, SameSite)
 * - Mixed content detection
 * - Exposed secrets/API keys in page source
 * - Open redirect patterns
 * - Sensitive information in meta tags
 *
 * @param page - A Puppeteer Page that has navigated to the target URL
 * @param response - The HTTP response from the navigation (may be null)
 * @param url - The URL being checked
 * @returns SecurityCheckResult with violations and header status
 */
export async function runSecurityChecks(
  page: Page,
  response: HTTPResponse | null,
  url: string
): Promise<SecurityCheckResult> {
  const violations: Violation[] = [];
  const headersPresent: string[] = [];
  const headersMissing: string[] = [];

  // 1. Check security headers
  if (response) {
    const headers = response.headers();

    for (const header of SECURITY_HEADERS) {
      if (headers[header]) {
        headersPresent.push(header);

        // Validate specific header values
        const headerViolation = validateHeaderValue(
          header,
          headers[header],
          url
        );
        if (headerViolation) {
          violations.push(headerViolation);
        }
      } else {
        headersMissing.push(header);
        violations.push({
          id: `sec-header-${header}`,
          category: "security",
          severity:
            header === "content-security-policy" ||
            header === "strict-transport-security"
              ? "high"
              : "medium",
          rule: `missing-${header}`,
          message: `Missing security header: ${header}`,
          url,
          help: getHeaderHelp(header),
          helpUrl: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${header}`,
        });
      }
    }

    // Check for HTTPS
    if (!url.startsWith("https://")) {
      violations.push({
        id: "sec-no-https",
        category: "security",
        severity: "critical",
        rule: "no-https",
        message: "Page is not served over HTTPS",
        url,
        help: "All pages should be served over HTTPS to protect data in transit.",
        helpUrl:
          "https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts",
      });
    }
  }

  // 2. Check cookie security attributes
  try {
    const cookies = await page.cookies();
    for (const cookie of cookies) {
      const cookieIssues: string[] = [];

      if (!cookie.secure) {
        cookieIssues.push("missing Secure flag");
      }
      if (
        !cookie.httpOnly &&
        (cookie.name.toLowerCase().includes("session") ||
          cookie.name.toLowerCase().includes("token") ||
          cookie.name.toLowerCase().includes("auth"))
      ) {
        cookieIssues.push("missing HttpOnly flag on sensitive cookie");
      }
      if (
        !cookie.sameSite ||
        cookie.sameSite === "None"
      ) {
        if (cookie.sameSite === "None" && !cookie.secure) {
          cookieIssues.push("SameSite=None without Secure flag");
        } else if (!cookie.sameSite) {
          cookieIssues.push("missing SameSite attribute");
        }
      }

      if (cookieIssues.length > 0) {
        const isSessionCookie =
          cookie.name.toLowerCase().includes("session") ||
          cookie.name.toLowerCase().includes("token") ||
          cookie.name.toLowerCase().includes("auth");

        violations.push({
          id: `sec-cookie-${cookie.name}-${Math.random().toString(36).slice(2, 8)}`,
          category: "security",
          severity: isSessionCookie ? "high" : "medium",
          rule: "insecure-cookie",
          message: `Cookie "${cookie.name}" has security issues: ${cookieIssues.join(", ")}`,
          url,
          help: `Set Secure, HttpOnly, and SameSite attributes on cookie "${cookie.name}".`,
          helpUrl:
            "https://owasp.org/www-community/controls/SecureCookieAttribute",
        });
      }
    }
  } catch (error) {
    console.error("[security] Cookie check failed:", error);
  }

  // 3. Check for mixed content via DOM
  try {
    const mixedContent = await page.evaluate(() => {
      const insecureElements: { html: string; src: string }[] = [];
      const selectors =
        'img[src^="http:"], script[src^="http:"], link[href^="http:"], iframe[src^="http:"], video[src^="http:"], audio[src^="http:"]';
      const elements = document.querySelectorAll(selectors);

      elements.forEach((el) => {
        insecureElements.push({
          html: el.outerHTML.substring(0, 200),
          src:
            (el as HTMLImageElement).src ||
            (el as HTMLLinkElement).href ||
            "",
        });
      });
      return insecureElements;
    });

    if (mixedContent.length > 0) {
      // Group into a single violation with multiple nodes described
      violations.push({
        id: `sec-mixed-content-${Math.random().toString(36).slice(2, 8)}`,
        category: "security",
        severity: "high",
        rule: "mixed-content",
        message: `Found ${mixedContent.length} insecure HTTP resource(s) loaded on this page`,
        element: mixedContent
          .map((mc) => mc.html)
          .join("\n")
          .substring(0, 1000),
        url,
        help: "Update all resource URLs to use HTTPS to prevent mixed content warnings.",
        helpUrl:
          "https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content",
      });
    }
  } catch (error) {
    console.error("[security] Mixed content check failed:", error);
  }

  // 4. Check for exposed secrets in page source
  try {
    const pageContent = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script"));
      const inlineScripts = scripts
        .filter((s) => !s.src && s.textContent)
        .map((s) => s.textContent || "");

      return {
        html: document.documentElement.outerHTML.substring(0, 500000),
        inlineScripts,
      };
    });

    const allContent = [
      pageContent.html,
      ...pageContent.inlineScripts,
    ].join("\n");

    for (const { name, pattern, severity } of SECRET_PATTERNS) {
      const match = pattern.exec(allContent);
      if (match) {
        const maskedValue = maskSecret(match[0]);
        violations.push({
          id: `sec-exposed-${name.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 8)}`,
          category: "security",
          severity,
          rule: "exposed-secret",
          message: `Potential ${name} found exposed in page source: ${maskedValue}`,
          url,
          help: `Remove ${name} from client-side code. Use environment variables and server-side APIs instead.`,
          helpUrl:
            "https://owasp.org/www-community/vulnerabilities/Information_exposure_through_an_error_message",
        });
      }
    }
  } catch (error) {
    console.error("[security] Secret scan failed:", error);
  }

  // 5. Check for open redirect patterns in links
  try {
    const suspiciousLinks = await page.evaluate(() => {
      const results: { html: string; href: string }[] = [];
      const redirectParams =
        /[?&](redirect|return|next|url|goto|target|rurl|destination|redir|redirect_uri|return_to|continue|returnUrl|forward)=/i;

      document.querySelectorAll("a[href], form[action]").forEach((el) => {
        const href =
          el.getAttribute("href") || el.getAttribute("action") || "";
        if (redirectParams.test(href)) {
          results.push({
            html: el.outerHTML.substring(0, 200),
            href: href.substring(0, 300),
          });
        }
      });
      return results;
    });

    if (suspiciousLinks.length > 0) {
      violations.push({
        id: `sec-open-redirect-${Math.random().toString(36).slice(2, 8)}`,
        category: "security",
        severity: "medium",
        rule: "potential-open-redirect",
        message: `Found ${suspiciousLinks.length} link(s) with potential open redirect parameters`,
        element: suspiciousLinks
          .map((l) => l.html)
          .join("\n")
          .substring(0, 1000),
        url,
        help: "Validate and whitelist redirect URLs server-side to prevent open redirect attacks.",
        helpUrl:
          "https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html",
      });
    }
  } catch (error) {
    console.error("[security] Open redirect check failed:", error);
  }

  // 6. Check meta tags for sensitive information
  try {
    const sensitiveMetaTags = await page.evaluate(() => {
      const results: { name: string; content: string; html: string }[] = [];
      const sensitiveNames = [
        "api-key",
        "apikey",
        "api_key",
        "secret",
        "token",
        "password",
        "aws-access-key",
      ];

      document.querySelectorAll("meta[name], meta[property]").forEach((el) => {
        const name = (
          el.getAttribute("name") ||
          el.getAttribute("property") ||
          ""
        ).toLowerCase();
        const content = el.getAttribute("content") || "";

        if (
          sensitiveNames.some((s) => name.includes(s)) &&
          content.length > 0
        ) {
          results.push({
            name,
            content: content.substring(0, 20) + (content.length > 20 ? "..." : ""),
            html: el.outerHTML.substring(0, 200),
          });
        }

        // Check for generator meta that reveals server technology
        if (name === "generator" && content.length > 0) {
          results.push({
            name,
            content,
            html: el.outerHTML.substring(0, 200),
          });
        }
      });

      return results;
    });

    for (const tag of sensitiveMetaTags) {
      const isSensitiveKey = tag.name !== "generator";
      violations.push({
        id: `sec-meta-${tag.name}-${Math.random().toString(36).slice(2, 8)}`,
        category: "security",
        severity: isSensitiveKey ? "high" : "low",
        rule: isSensitiveKey ? "sensitive-meta-tag" : "info-disclosure-generator",
        message: isSensitiveKey
          ? `Meta tag "${tag.name}" may expose sensitive information: ${tag.content}`
          : `Meta tag "${tag.name}" reveals server technology: ${tag.content}`,
        element: tag.html,
        url,
        help: isSensitiveKey
          ? "Remove sensitive data from meta tags. Use server-side session management instead."
          : "Consider removing the generator meta tag to reduce information disclosure.",
        helpUrl:
          "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/01-Information_Gathering/02-Fingerprinting_Web_Server",
      });
    }
  } catch (error) {
    console.error("[security] Meta tag check failed:", error);
  }

  return { violations, headersPresent, headersMissing };
}

/**
 * Validate specific header values beyond just presence.
 * Returns a violation if the header value is misconfigured.
 */
function validateHeaderValue(
  header: string,
  value: string,
  url: string
): Violation | null {
  switch (header) {
    case "strict-transport-security": {
      const maxAgeMatch = value.match(/max-age=(\d+)/);
      if (!maxAgeMatch || parseInt(maxAgeMatch[1], 10) < 31536000) {
        return {
          id: `sec-hsts-weak-${Math.random().toString(36).slice(2, 8)}`,
          category: "security",
          severity: "medium",
          rule: "hsts-weak-max-age",
          message: `HSTS max-age is too short (should be at least 31536000 seconds / 1 year)`,
          url,
          help: 'Set Strict-Transport-Security with max-age=31536000 and consider adding "includeSubDomains".',
        };
      }
      break;
    }
    case "x-content-type-options": {
      if (value.toLowerCase() !== "nosniff") {
        return {
          id: `sec-xcto-invalid-${Math.random().toString(36).slice(2, 8)}`,
          category: "security",
          severity: "medium",
          rule: "xcto-invalid-value",
          message: `X-Content-Type-Options should be "nosniff" but is "${value}"`,
          url,
          help: 'Set X-Content-Type-Options to "nosniff".',
        };
      }
      break;
    }
    case "x-frame-options": {
      const lower = value.toLowerCase();
      if (lower !== "deny" && lower !== "sameorigin") {
        return {
          id: `sec-xfo-invalid-${Math.random().toString(36).slice(2, 8)}`,
          category: "security",
          severity: "medium",
          rule: "xfo-invalid-value",
          message: `X-Frame-Options should be "DENY" or "SAMEORIGIN" but is "${value}"`,
          url,
          help: 'Set X-Frame-Options to "DENY" or "SAMEORIGIN".',
        };
      }
      break;
    }
  }
  return null;
}

/**
 * Get helpful description for each security header.
 */
function getHeaderHelp(header: string): string {
  const helpMap: Record<string, string> = {
    "content-security-policy":
      "Add a Content-Security-Policy header to prevent XSS and data injection attacks.",
    "strict-transport-security":
      "Add HSTS header (max-age=31536000) to enforce HTTPS connections.",
    "x-content-type-options":
      'Add "X-Content-Type-Options: nosniff" to prevent MIME type sniffing.',
    "x-frame-options":
      'Add "X-Frame-Options: DENY" or "SAMEORIGIN" to prevent clickjacking.',
    "x-xss-protection":
      'Add "X-XSS-Protection: 1; mode=block" for legacy browser XSS protection.',
    "referrer-policy":
      'Add a Referrer-Policy header (e.g., "strict-origin-when-cross-origin").',
    "permissions-policy":
      "Add a Permissions-Policy header to control browser feature access.",
    "cross-origin-opener-policy":
      'Add "Cross-Origin-Opener-Policy: same-origin" to isolate your browsing context.',
    "cross-origin-resource-policy":
      'Add "Cross-Origin-Resource-Policy: same-origin" to prevent cross-origin reads.',
  };
  return (
    helpMap[header] ||
    `The ${header} header helps protect against common web vulnerabilities.`
  );
}

/**
 * Mask a secret value for safe display in reports.
 * Shows only the first 4 characters followed by asterisks.
 */
function maskSecret(value: string): string {
  if (value.length <= 4) return "****";
  return value.substring(0, 4) + "*".repeat(Math.min(value.length - 4, 16));
}
