"use client";

import { useState } from "react";

// ── Tool Data ────────────────────────────────────────────────────────

interface Tool {
  name: string;
  slug: string;
  description: string;
  oneLiner: string;
  category: ToolCategory;
  level: "beginner" | "intermediate" | "advanced";
  installCommand: string;
  installType: "skill" | "mcp" | "npm";
  tags: string[];
  worksWellWith?: string[];
  url?: string;
}

type ToolCategory =
  | "design"
  | "testing"
  | "deploy"
  | "productivity"
  | "backend"
  | "browser";

const CATEGORY_INFO: Record<
  ToolCategory,
  { label: string; emoji: string; color: string }
> = {
  design: { label: "Design & UI", emoji: "🎨", color: "#F97316" },
  testing: { label: "Testing & QA", emoji: "🧪", color: "#22C55E" },
  deploy: { label: "Deploy & Ship", emoji: "🚀", color: "#3B82F6" },
  productivity: { label: "Productivity", emoji: "⚡", color: "#EAB308" },
  backend: { label: "Database & Backend", emoji: "🗄️", color: "#8B5CF6" },
  browser: { label: "Browser & Web", emoji: "🌐", color: "#EC4899" },
};

const TOOLS: Tool[] = [
  // Design & UI
  {
    name: "UI/UX Pro Max",
    slug: "ui-ux-pro-max",
    description:
      "Complete UI/UX design intelligence. 50+ styles, 161 color palettes, 57 font pairings, 161 product types. Plan, build, review, and fix interfaces across React, Next.js, Vue, Svelte, and more.",
    oneLiner: "AI design assistant that makes your UI beautiful",
    category: "design",
    level: "beginner",
    installCommand:
      "npx claude-code skills add https://github.com/chuangli/ui-ux-pro-max-skill",
    installType: "skill",
    tags: ["design", "ui", "ux", "tailwind", "shadcn"],
    worksWellWith: ["shadcn/ui", "Tailwind CSS"],
  },
  {
    name: "shadcn/ui MCP",
    slug: "shadcn-ui",
    description:
      "Access shadcn/ui component library directly in Claude Code. Search components, get examples, and implement accessible UI elements built on Radix UI + Tailwind.",
    oneLiner: "Beautiful, accessible components ready to copy-paste",
    category: "design",
    level: "beginner",
    installCommand:
      'claude mcp add shadcn-ui -- npx -y @nicholasxwz/shadcn-ui-mcp@latest',
    installType: "mcp",
    tags: ["components", "radix", "tailwind", "accessible"],
    worksWellWith: ["UI/UX Pro Max"],
  },
  {
    name: "Design Consultation",
    slug: "design-consultation",
    description:
      "Understands your product, researches the landscape, proposes a complete design system — aesthetic, typography, colors, layout, spacing, motion. Creates DESIGN.md as your project's design source of truth.",
    oneLiner: "Get a professional design system for your project",
    category: "design",
    level: "beginner",
    installCommand: "Part of gstack — install gstack to get this skill",
    installType: "skill",
    tags: ["design system", "brand", "typography", "colors"],
    url: "https://github.com/garry/gstack",
  },
  {
    name: "Banner Design",
    slug: "banner-design",
    description:
      "Design banners for social media, ads, website heroes, and print. Multiple art direction options with AI-generated visuals. Supports Facebook, Twitter, LinkedIn, YouTube, Instagram, and Google Display.",
    oneLiner: "Create social media banners and marketing visuals",
    category: "design",
    level: "intermediate",
    installCommand: "Part of gstack — install gstack to get this skill",
    installType: "skill",
    tags: ["banners", "social media", "marketing", "visuals"],
  },

  // Testing & QA
  {
    name: "QA Testing",
    slug: "qa",
    description:
      "Systematically QA test a web application and fix bugs found. Runs browser-based testing, then iteratively fixes bugs in source code, committing each fix atomically and re-verifying. Three tiers: Quick, Standard, Exhaustive.",
    oneLiner: "Find and fix bugs automatically with real browser testing",
    category: "testing",
    level: "beginner",
    installCommand: "Part of gstack — use /qa command",
    installType: "skill",
    tags: ["qa", "testing", "bugs", "browser"],
  },
  {
    name: "Design Review",
    slug: "design-review",
    description:
      "Designer's eye QA: finds visual inconsistency, spacing issues, hierarchy problems, AI slop patterns, and slow interactions — then fixes them with before/after screenshots.",
    oneLiner: "Visual QA — catch ugly UI before your users do",
    category: "testing",
    level: "beginner",
    installCommand: "Part of gstack — use /design-review command",
    installType: "skill",
    tags: ["design", "visual", "qa", "polish"],
  },
  {
    name: "Code Review",
    slug: "review",
    description:
      "Pre-landing PR review. Analyzes diff against the base branch for SQL safety, LLM trust boundary violations, conditional side effects, and other structural issues.",
    oneLiner: "Paranoid code review before you merge",
    category: "testing",
    level: "intermediate",
    installCommand: "Part of gstack — use /review command",
    installType: "skill",
    tags: ["code review", "security", "pr", "diff"],
  },

  // Deploy & Ship
  {
    name: "Ship",
    slug: "ship",
    description:
      "Complete ship workflow: detect + merge base branch, run tests, review diff, bump VERSION, update CHANGELOG, commit, push, create PR. One command to go from code to production.",
    oneLiner: "One command to ship your code to production",
    category: "deploy",
    level: "beginner",
    installCommand: "Part of gstack — use /ship command",
    installType: "skill",
    tags: ["deploy", "git", "pr", "changelog"],
  },
  {
    name: "Document Release",
    slug: "document-release",
    description:
      "Post-ship documentation update. Reads all project docs, cross-references the diff, updates README/ARCHITECTURE/CONTRIBUTING/CLAUDE.md to match what shipped.",
    oneLiner: "Auto-update docs after shipping code",
    category: "deploy",
    level: "intermediate",
    installCommand: "Part of gstack — use /document-release command",
    installType: "skill",
    tags: ["docs", "readme", "changelog", "documentation"],
  },

  // Productivity
  {
    name: "Office Hours",
    slug: "office-hours",
    description:
      "YC-style office hours. Startup mode: six forcing questions that expose demand reality, status quo, and narrowest wedge. Builder mode: design thinking brainstorming for side projects and hackathons.",
    oneLiner: "Brainstorm and validate your product idea like at YC",
    category: "productivity",
    level: "beginner",
    installCommand: "Part of gstack — use /office-hours command",
    installType: "skill",
    tags: ["brainstorm", "ideas", "startup", "yc"],
  },
  {
    name: "CEO Review",
    slug: "plan-ceo-review",
    description:
      "CEO/founder-mode plan review. Rethink the problem, find the 10-star product, challenge premises, expand scope when it creates a better product. Four modes: scope expansion, selective expansion, hold scope, scope reduction.",
    oneLiner: "Think bigger about your product strategy",
    category: "productivity",
    level: "intermediate",
    installCommand: "Part of gstack — use /plan-ceo-review command",
    installType: "skill",
    tags: ["strategy", "planning", "ceo", "product"],
  },
  {
    name: "Weekly Retro",
    slug: "retro",
    description:
      "Weekly engineering retrospective. Analyzes commit history, work patterns, and code quality metrics with persistent history and trend tracking. Team-aware: per-person contributions with praise and growth areas.",
    oneLiner: "Automated weekly retro from your git history",
    category: "productivity",
    level: "beginner",
    installCommand: "Part of gstack — use /retro command",
    installType: "skill",
    tags: ["retro", "analytics", "team", "commits"],
  },
  {
    name: "Slides & Presentations",
    slug: "slides",
    description:
      "Create strategic HTML presentations with Chart.js, design tokens, responsive layouts, copywriting formulas, and contextual slide strategies. Perfect for pitch decks and demos.",
    oneLiner: "Create beautiful presentations with code",
    category: "productivity",
    level: "intermediate",
    installCommand: "Part of gstack — use /slides command",
    installType: "skill",
    tags: ["slides", "presentation", "pitch deck", "charts"],
  },

  // Database & Backend
  {
    name: "Supabase MCP",
    slug: "supabase-mcp",
    description:
      "Connect Claude Code to your Supabase project. Query databases, manage tables, run migrations, and interact with your Supabase backend directly from the terminal.",
    oneLiner: "Manage your Supabase database from Claude Code",
    category: "backend",
    level: "intermediate",
    installCommand:
      "claude mcp add supabase -- npx -y @supabase/mcp-server",
    installType: "mcp",
    tags: ["supabase", "database", "postgres", "backend"],
  },
  {
    name: "Prisma MCP",
    slug: "prisma-mcp",
    description:
      "Prisma MCP server for Claude Code. Manage your database schema, run migrations, and query data through Prisma ORM directly in your coding workflow.",
    oneLiner: "Database management with Prisma ORM in Claude Code",
    category: "backend",
    level: "intermediate",
    installCommand:
      "claude mcp add prisma -- npx -y @nicholasxwz/prisma-mcp@latest",
    installType: "mcp",
    tags: ["prisma", "orm", "database", "migrations"],
  },

  // Browser & Web
  {
    name: "Browse (Headless)",
    slug: "browse",
    description:
      "Fast headless browser for QA testing and site dogfooding. Navigate any URL, interact with elements, verify page state, take annotated screenshots, check responsive layouts, and test forms. ~100ms per command.",
    oneLiner: "Control a browser from Claude Code for testing",
    category: "browser",
    level: "beginner",
    installCommand: "Part of gstack — use /browse command",
    installType: "skill",
    tags: ["browser", "testing", "screenshots", "headless"],
  },
  {
    name: "Puppeteer MCP",
    slug: "puppeteer-mcp",
    description:
      "Full Puppeteer browser automation from Claude Code. Navigate pages, click elements, fill forms, take screenshots, and run JavaScript in the browser context.",
    oneLiner: "Automate browser actions with Puppeteer",
    category: "browser",
    level: "advanced",
    installCommand:
      "claude mcp add puppeteer -- npx -y @nicholasxwz/puppeteer-mcp@latest",
    installType: "mcp",
    tags: ["puppeteer", "automation", "scraping", "browser"],
  },
];

// ── Components ───────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors whitespace-nowrap"
    >
      {copied ? "✓ Copied!" : "Copy"}
    </button>
  );
}

function LevelBadge({ level }: { level: Tool["level"] }) {
  const config = {
    beginner: { label: "Beginner", bg: "bg-green-500/20", text: "text-green-400" },
    intermediate: { label: "Intermediate", bg: "bg-yellow-500/20", text: "text-yellow-400" },
    advanced: { label: "Advanced", bg: "bg-red-500/20", text: "text-red-400" },
  };
  const c = config[level];
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const catInfo = CATEGORY_INFO[tool.category];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 hover:border-neutral-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{tool.name}</h3>
          <p className="text-sm text-neutral-400 mt-0.5">{tool.oneLiner}</p>
        </div>
        <LevelBadge level={tool.level} />
      </div>

      <p className="text-sm text-neutral-300 mb-4 leading-relaxed">
        {tool.description}
      </p>

      {/* Install command */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-md p-3 mb-3">
        <div className="flex items-center justify-between gap-2">
          <code className="text-xs text-orange-400 font-mono overflow-x-auto">
            $ {tool.installCommand}
          </code>
          <CopyButton text={tool.installCommand} />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className="px-2 py-0.5 text-xs rounded-full"
          style={{
            backgroundColor: catInfo.color + "20",
            color: catInfo.color,
          }}
        >
          {catInfo.emoji} {catInfo.label}
        </span>
        {tool.worksWellWith?.map((w) => (
          <span
            key={w}
            className="px-2 py-0.5 text-xs rounded-full bg-neutral-800 text-neutral-400"
          >
            Works with {w}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [selectedCategory, setSelectedCategory] = useState<
    ToolCategory | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTools = TOOLS.filter((tool) => {
    const matchesCategory =
      selectedCategory === "all" || tool.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tags.some((t) =>
        t.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <a href="/" className="text-sm text-neutral-500 hover:text-neutral-300 mb-2 inline-block">
            ← Back to PreShip
          </a>
          <h1 className="text-3xl font-bold">
            Claude Code Tools Hub{" "}
            <span className="text-orange-500">⚡</span>
          </h1>
          <p className="text-neutral-400 mt-2 max-w-2xl">
            Curated collection of the best plugins, skills, and MCP servers for
            Claude Code. Install with one command. No experience needed.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
          />

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedCategory === "all"
                  ? "bg-orange-500 text-white"
                  : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              All ({TOOLS.length})
            </button>
            {Object.entries(CATEGORY_INFO).map(([key, info]) => {
              const count = TOOLS.filter(
                (t) => t.category === key
              ).length;
              return (
                <button
                  key={key}
                  onClick={() =>
                    setSelectedCategory(key as ToolCategory)
                  }
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedCategory === key
                      ? "bg-orange-500 text-white"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  {info.emoji} {info.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            No tools found matching your search.
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-neutral-400 mb-2">
            Want to suggest a tool?{" "}
            <a
              href="https://x.com/preshipdev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-400"
            >
              DM us on Twitter
            </a>
          </p>
          <p className="text-sm text-neutral-600">
            Powered by{" "}
            <a href="/" className="text-neutral-500 hover:text-white">
              PreShip
            </a>{" "}
            — Quality gate for AI-generated code
          </p>
        </div>
      </div>
    </div>
  );
}
