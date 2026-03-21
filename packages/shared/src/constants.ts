import { CheckCategory, Severity } from "./types";

// ── Severity weights for scoring ─────────────────────────────────────

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

// ── Category labels ──────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  // Technical
  accessibility: "Accessibility",
  security: "Security",
  performance: "Performance",
  seo: "SEO",
  privacy: "Privacy",
  mobile: "Mobile",
  // Product
  ux: "UX/UI",
  design: "Design",
  human_appeal: "Human Appeal",
  // Business
  business: "Business Viability",
  revenue: "Revenue Potential",
  growth: "Growth Potential",
};

// ── Pillar configuration ────────────────────────────────────────────

export const PILLAR_LABELS: Record<string, string> = {
  technical: "Technical",
  product: "Product",
  business: "Business",
};

export const PILLAR_CATEGORIES: Record<string, CheckCategory[]> = {
  technical: ["accessibility", "security", "performance", "seo", "privacy", "mobile"],
  product: ["ux", "design", "human_appeal"],
  business: ["business", "revenue", "growth"],
};

export const PILLAR_WEIGHTS: Record<string, number> = {
  technical: 0.40,
  product: 0.35,
  business: 0.25,
};

export const CATEGORY_WEIGHTS: Record<CheckCategory, number> = {
  // Technical pillar (40% total)
  accessibility: 0.08,
  security: 0.08,
  performance: 0.07,
  seo: 0.06,
  privacy: 0.06,
  mobile: 0.05,
  // Product pillar (35% total)
  ux: 0.13,
  design: 0.12,
  human_appeal: 0.10,
  // Business pillar (25% total)
  business: 0.09,
  revenue: 0.08,
  growth: 0.08,
};

// ── Score thresholds ─────────────────────────────────────────────────

export const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  NEEDS_WORK: 50,
  POOR: 0,
} as const;

export const SCORE_LABELS = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  NEEDS_WORK: "Needs Work",
  POOR: "Poor",
} as const;

export const SHIP_READINESS_THRESHOLDS = {
  SHIP_IT: 90,
  ALMOST_READY: 70,
  NEEDS_WORK: 50,
  DO_NOT_SHIP: 0,
} as const;

// ── Plan limits ──────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  free: {
    scansPerMonth: 10,
    maxPagesPerScan: 5,
    apiKeys: 1,
    projects: 2,
    retentionDays: 7,
  },
  pro: {
    scansPerMonth: 200,
    maxPagesPerScan: 50,
    apiKeys: 5,
    projects: 20,
    retentionDays: 90,
  },
  team: {
    scansPerMonth: 1000,
    maxPagesPerScan: 100,
    apiKeys: 20,
    projects: 100,
    retentionDays: 365,
  },
  enterprise: {
    scansPerMonth: Infinity,
    maxPagesPerScan: 100,
    apiKeys: 100,
    projects: Infinity,
    retentionDays: Infinity,
  },
  internal: {
    scansPerMonth: Infinity,
    maxPagesPerScan: 100,
    apiKeys: 100,
    projects: Infinity,
    retentionDays: Infinity,
  },
} as const;

// ── Default scan options ─────────────────────────────────────────────

export const DEFAULT_SCAN_OPTIONS = {
  maxPages: 5,
  waitForTimeout: 5000,
  includeFixSuggestions: true,
  viewport: { width: 1280, height: 720 },
  categories: [
    "accessibility" as CheckCategory,
    "security" as CheckCategory,
    "performance" as CheckCategory,
    "seo" as CheckCategory,
    "privacy" as CheckCategory,
    "mobile" as CheckCategory,
    "ux" as CheckCategory,
    "design" as CheckCategory,
    "human_appeal" as CheckCategory,
    "business" as CheckCategory,
    "revenue" as CheckCategory,
    "growth" as CheckCategory,
  ],
};

// ── Security headers to check ────────────────────────────────────────

export const SECURITY_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "x-xss-protection",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
] as const;
