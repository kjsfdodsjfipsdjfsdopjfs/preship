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
  // Technical (Pillar 1)
  ACCESSIBILITY: "accessibility",
  SECURITY: "security",
  PERFORMANCE: "performance",
  SEO: "seo",
  PRIVACY: "privacy",
  MOBILE: "mobile",
  // Product (Pillar 2)
  UX: "ux",
  DESIGN: "design",
  HUMAN_APPEAL: "human_appeal",
  // Business (Pillar 3)
  BUSINESS: "business",
  REVENUE: "revenue",
  GROWTH: "growth",
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

// ── Assessments (qualitative analysis) ───────────────────────────────

export interface Assessment {
  id: string;
  category: CheckCategory;
  type: "strength" | "weakness" | "opportunity" | "observation";
  title: string;
  description: string;
  score?: number;
  confidence: number;
  source: "automated" | "ai-vision" | "ai-llm";
}

// ── Pillar Scores ────────────────────────────────────────────────────

export const Pillar = {
  TECHNICAL: "technical",
  PRODUCT: "product",
  BUSINESS: "business",
} as const;

export type Pillar = (typeof Pillar)[keyof typeof Pillar];

export interface PillarScore {
  pillar: Pillar;
  score: number;
  categories: CategoryScore[];
}

// ── Ship Readiness ───────────────────────────────────────────────────

export const ShipReadiness = {
  SHIP_IT: "SHIP IT",
  ALMOST_READY: "ALMOST READY",
  NEEDS_WORK: "NEEDS WORK",
  DO_NOT_SHIP: "DO NOT SHIP",
} as const;

export type ShipReadiness = (typeof ShipReadiness)[keyof typeof ShipReadiness];

// ── Check Results (per-check breakdown) ──────────────────────────────

export interface CheckResult {
  id: string;
  category: CheckCategory;
  name: string;
  passed: boolean;
  points: number;
  maxPoints: number;
  howToFix?: string;
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
  checks?: CheckResult[];
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
  shipReadiness?: ShipReadiness;
  pillars?: PillarScore[];
  categories: CategoryScore[];
  violations: Violation[];
  assessments?: Assessment[];
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
        .array(z.enum([
          "accessibility", "security", "performance", "seo", "privacy", "mobile",
          "ux", "design", "human_appeal", "business", "revenue", "growth",
        ]))
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
