import type { Violation, FixSuggestion } from "@preship/shared";
import { config } from "../config";

/**
 * Service for generating AI-powered fix suggestions using an LLM.
 * Falls back to rule-based suggestions when OPENAI_API_KEY is not configured
 * or when the API call fails.
 */
export class LLMService {
  private apiKey: string;
  private cache: Map<string, FixSuggestion> = new Map();

  constructor() {
    this.apiKey = config.openaiApiKey;
  }

  /**
   * Generate fix suggestions for a list of violations.
   */
  async generateFixSuggestions(
    violations: Violation[]
  ): Promise<FixSuggestion[]> {
    if (!this.apiKey) {
      // No API key configured — use rule-based fallback for all violations
      return violations
        .map((v) => this.getRuleBasedSuggestion(v))
        .filter((s): s is FixSuggestion => s !== null);
    }

    const suggestions: FixSuggestion[] = [];

    for (const violation of violations) {
      try {
        const suggestion = await this.suggestFix(violation);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      } catch (error) {
        console.error(
          `Failed to generate suggestion for ${violation.id}:`,
          error
        );
      }
    }

    return suggestions;
  }

  private async suggestFix(
    violation: Violation
  ): Promise<FixSuggestion | null> {
    // Check cache first to avoid duplicate API calls for the same rule
    const cached = this.cache.get(violation.rule);
    if (cached) {
      return { ...cached, violationId: violation.id };
    }

    // If API key is configured, try the OpenAI call
    if (this.apiKey) {
      try {
        const suggestion = await this.callOpenAI(violation);
        if (suggestion) {
          // Cache by rule ID so identical rules don't trigger duplicate calls
          this.cache.set(violation.rule, suggestion);
          return suggestion;
        }
      } catch (error) {
        console.error(
          `OpenAI API error for rule "${violation.rule}", falling back to rule-based suggestion:`,
          error
        );
      }
    }

    // Fallback to rule-based suggestions
    return this.getRuleBasedSuggestion(violation);
  }

  private async callOpenAI(
    violation: Violation
  ): Promise<FixSuggestion | null> {
    const prompt = this.buildPrompt(violation);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a web development expert. You provide concise, actionable fix suggestions for web issues. Always respond with valid JSON only, no markdown fences.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown");
      throw new Error(
        `OpenAI API returned ${response.status}: ${errorBody}`
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    try {
      const parsed = JSON.parse(content) as {
        description?: string;
        codeSnippet?: string;
      };

      if (!parsed.description) {
        return null;
      }

      return {
        violationId: violation.id,
        description: parsed.description,
        codeSnippet: parsed.codeSnippet,
        confidence: 0.9,
        source: "llm",
      };
    } catch {
      // If the LLM returned non-JSON, use the raw text as the description
      return {
        violationId: violation.id,
        description: content.trim(),
        confidence: 0.7,
        source: "llm",
      };
    }
  }

  private buildPrompt(violation: Violation): string {
    return `Suggest a fix for this ${violation.category} issue found on a web page.

Rule: ${violation.rule}
Severity: ${violation.severity}
Message: ${violation.message}
${violation.element ? `Affected Element: ${violation.element}` : ""}
${violation.help ? `Help: ${violation.help}` : ""}

Provide a specific, actionable code fix. Respond with JSON only:
{"description": "Brief explanation of the fix", "codeSnippet": "code showing the fix"}`;
  }

  private getRuleBasedSuggestion(
    violation: Violation
  ): FixSuggestion | null {
    const suggestions: Record<
      string,
      { description: string; codeSnippet?: string }
    > = {
      "missing-content-security-policy": {
        description:
          "Add a Content-Security-Policy header to protect against XSS and injection attacks.",
        codeSnippet: `// Express middleware\napp.use((req, res, next) => {\n  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");\n  next();\n});`,
      },
      "image-alt": {
        description:
          "Add descriptive alt text to images for screen reader users.",
        codeSnippet: `<!-- Before -->\n<img src="photo.jpg">\n\n<!-- After -->\n<img src="photo.jpg" alt="Description of the image content">`,
      },
      "color-contrast": {
        description:
          "Ensure text has sufficient contrast ratio against its background (4.5:1 for normal text, 3:1 for large text).",
      },
    };

    const match = suggestions[violation.rule];
    if (!match) return null;

    return {
      violationId: violation.id,
      description: match.description,
      codeSnippet: match.codeSnippet,
      confidence: 0.8,
      source: "rule-based",
    };
  }
}

export const llmService = new LLMService();
