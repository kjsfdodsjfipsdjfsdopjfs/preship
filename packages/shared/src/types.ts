import { z } from "zod";

// ── Severity & Category ──────────────────────────────────────────────

export const Severity = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
} as const;

export type Severity = (typeof Severity)[keyof typeof Severity];

export const CheckCategory = {
  ACCESSIBILITY: "accessibility",
  SECURITY: "security",
  PERFORMANCE: "performance",
  SEO: "seo",
  PRIVACY: "privacy",
  MOBILE: "mobile",
} as const;

export type CheckCategory = (typeof CheckCategory)[keyof typeof CheckCategory];

// ── Violations & Suggestions ─────────────────────────────────────────

export interface Violation {
  id: string;
  category: CheckCategory;
  severity: Severity;
  rule: string;
  message: string;
  element?: string;
  selector?: string;
  url: string;
  help?: string;
  helpUrl?: string;
}

export interface FixSuggestion {
  violationId: string;
  description: string;
  codeSnippet?: string;
  confidence: number;
  source: "rule-based" | "llm";
}

// ── Scan Types ───────────────────────────────────────────────────────

export const ScanStatus = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ScanStatus = (typeof ScanStatus)[keyof typeof ScanStatus];

export interface CategoryScore {
  category: CheckCategory;
  score: number;
  violations: number;
  passed: number;
}

export interface FrameworkInfo {
  /** Detected framework name, or null if unidentified */
  framework: string | null;
  /** Additional detection metadata */
  meta: {
    generator?: string;
    poweredBy?: string;
  };
}

export interface ScanResult {
  id: string;
  projectId: string;
  url: string;
  status: ScanStatus;
  overallScore: number;
  categories: CategoryScore[];
  violations: Violation[];
  suggestions: FixSuggestion[];
  pagesScanned: number;
  blockedPages?: number;
  duration: number;
  framework?: FrameworkInfo;
  createdAt: string;
  completedAt?: string;
}

export interface ScanRequest {
  url: string;
  projectId?: string;
  options?: ScanOptions;
}

export interface ScanOptions {
  maxPages?: number;
  categories?: CheckCategory[];
  waitForTimeout?: number;
  includeFixSuggestions?: boolean;
  viewport?: { width: number; height: number };
}

// ── Project & User ───────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  url: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro" | "team" | "enterprise";
  stripeCustomerId?: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  prefix: string;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

// ── Zod Schemas (for runtime validation) ─────────────────────────────

export const ScanRequestSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  projectId: z.string().uuid().optional(),
  options: z
    .object({
      maxPages: z.number().min(1).max(100).optional(),
      categories: z
        .array(z.enum(["accessibility", "security", "performance", "seo", "privacy", "mobile"]))
        .optional(),
      waitForTimeout: z.number().min(0).max(30000).optional(),
      includeFixSuggestions: z.boolean().optional(),
      viewport: z
        .object({
          width: z.number().min(320).max(3840),
          height: z.number().min(480).max(2160),
        })
        .optional(),
    })
    .optional(),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(50),
  expiresInDays: z.number().min(1).max(365).optional(),
});
