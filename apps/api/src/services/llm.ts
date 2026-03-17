import type { Violation, FixSuggestion } from "@preship/shared";
import { config } from "../config";

/**
 * Service for generating AI-powered fix suggestions using an LLM.
 */
export class LLMService {
  private apiKey: string;

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
      return [];
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
    const prompt = this.buildPrompt(violation);

    // TODO: Call OpenAI API
    // For now, return rule-based suggestions for common issues
    return this.getRuleBasedSuggestion(violation);
  }

  private buildPrompt(violation: Violation): string {
    return `You are a web development expert. Suggest a fix for this ${violation.category} issue:

Rule: ${violation.rule}
Message: ${violation.message}
${violation.element ? `Element: ${violation.element}` : ""}
${violation.help ? `Help: ${violation.help}` : ""}

Provide a concise fix with a code snippet if applicable. Format as JSON:
{"description": "...", "codeSnippet": "..."}`;
  }

  private getRuleBasedSuggestion(
    violation: Violation
  ): FixSuggestion | null {
    const suggestions: Record<string, { description: string; codeSnippet?: string }> = {
      "missing-content-security-policy": {
        description:
          "Add a Content-Security-Policy header to protect against XSS and injection attacks.",
        codeSnippet: `// Express middleware\napp.use((req, res, next) => {\n  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");\n  next();\n});`,
      },
      "image-alt": {
        description: "Add descriptive alt text to images for screen reader users.",
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
