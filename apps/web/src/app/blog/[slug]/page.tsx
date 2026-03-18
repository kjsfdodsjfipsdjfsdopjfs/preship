import Navbar from "@/components/Navbar";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";

// Map slugs to markdown filenames
const slugToFile: Record<string, string> = {
  "why-vibe-coding-needs-qa": "01-why-vibe-coding-needs-qa.md",
  "ada-lawsuits-2025": "02-ada-lawsuits-2025.md",
  "api-first-scanning": "03-api-first-scanning.md",
  "accessibility-checklist": "04-accessibility-checklist.md",
};

interface Frontmatter {
  title: string;
  date: string;
  readTime: string;
  excerpt: string;
}

function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  // The markdown files don't have YAML frontmatter — extract from content
  const lines = content.split("\n");

  // Title is the first H1
  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine ? titleLine.replace(/^# /, "") : "Untitled";

  // Remove the title and the "Published on" line and the --- separator
  const bodyLines: string[] = [];
  let pastHeader = false;
  let skipCount = 0;
  for (const line of lines) {
    if (!pastHeader) {
      if (line.startsWith("# ")) {
        skipCount++;
        continue;
      }
      if (line.startsWith("*Published")) {
        skipCount++;
        continue;
      }
      if (line === "---") {
        pastHeader = true;
        continue;
      }
      if (line.trim() === "") continue;
    }
    if (pastHeader) {
      bodyLines.push(line);
    }
  }

  const body = bodyLines.join("\n").trim();

  // Estimate read time: ~200 words per minute
  const wordCount = body.split(/\s+/).length;
  const readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min read`;

  // Extract first paragraph as excerpt
  const firstParagraph = body
    .split("\n\n")
    .find((p) => p.trim() && !p.startsWith("#") && !p.startsWith("```"));
  const excerpt = firstParagraph
    ? firstParagraph.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").slice(0, 200)
    : "";

  return {
    frontmatter: { title, date: "", readTime, excerpt },
    body,
  };
}

// Post metadata with dates (since the markdown files don't have frontmatter dates)
const postMeta: Record<string, { date: string }> = {
  "why-vibe-coding-needs-qa": { date: "March 12, 2026" },
  "ada-lawsuits-2025": { date: "March 8, 2026" },
  "api-first-scanning": { date: "March 3, 2026" },
  "accessibility-checklist": { date: "February 25, 2026" },
};

function renderMarkdown(md: string): string {
  // Process code blocks first (to protect them from other transformations)
  const codeBlocks: string[] = [];
  let processed = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const index = codeBlocks.length;
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    codeBlocks.push(
      `<pre class="blog-code-block"><code class="language-${lang || "text"}">${escaped}</code></pre>`
    );
    return `%%CODEBLOCK_${index}%%`;
  });

  // Inline code
  processed = processed.replace(
    /`([^`]+)`/g,
    '<code class="blog-inline-code">$1</code>'
  );

  // Split into blocks by double newlines
  const blocks = processed.split(/\n\n+/);
  const html = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      // Code block placeholder
      const codeMatch = trimmed.match(/^%%CODEBLOCK_(\d+)%%$/);
      if (codeMatch) {
        return codeBlocks[parseInt(codeMatch[1])]!;
      }

      // Headings
      if (trimmed.startsWith("### ")) {
        return `<h3 class="blog-h3">${inlineFormat(trimmed.slice(4))}</h3>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h2 class="blog-h2">${inlineFormat(trimmed.slice(3))}</h2>`;
      }

      // Unordered list
      if (trimmed.match(/^[-*] /m)) {
        const items = trimmed.split(/\n/).map((line) =>
          `<li class="blog-li">${inlineFormat(line.replace(/^[-*] \[[ x]\] /, "").replace(/^[-*] /, ""))}</li>`
        );
        return `<ul class="blog-ul">${items.join("")}</ul>`;
      }

      // Ordered list
      if (trimmed.match(/^\d+\. /m)) {
        const items = trimmed.split(/\n/).map((line) =>
          `<li class="blog-li">${inlineFormat(line.replace(/^\d+\.\s*/, ""))}</li>`
        );
        return `<ol class="blog-ol">${items.join("")}</ol>`;
      }

      // Paragraph (may contain code block placeholders inline)
      if (trimmed.includes("%%CODEBLOCK_")) {
        // Mixed content — return code blocks and paragraphs
        return trimmed
          .split(/(%%CODEBLOCK_\d+%%)/)
          .map((part) => {
            const m = part.match(/^%%CODEBLOCK_(\d+)%%$/);
            if (m) return codeBlocks[parseInt(m[1])]!;
            if (part.trim()) return `<p class="blog-p">${inlineFormat(part.trim())}</p>`;
            return "";
          })
          .join("");
      }

      return `<p class="blog-p">${inlineFormat(trimmed)}</p>`;
    })
    .join("");

  return html;
}

function inlineFormat(text: string): string {
  // Bold
  let result = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="blog-strong">$1</strong>');
  // Italic
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Links
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="blog-link" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return result;
}

export function generateStaticParams() {
  return Object.keys(slugToFile).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const filename = slugToFile[slug];
  if (!filename) return { title: "Not Found" };

  const filePath = [
    path.join(process.cwd(), "../../content/blog", filename),
    path.join(process.cwd(), "content/blog", filename),
  ].find((p) => fs.existsSync(p)) || path.join(process.cwd(), "content/blog", filename);
  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter } = parseFrontmatter(content);

  return {
    title: `${frontmatter.title} | PreShip Blog`,
    description: frontmatter.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const filename = slugToFile[slug];
  if (!filename) notFound();

  const filePath = [
    path.join(process.cwd(), "../../content/blog", filename),
    path.join(process.cwd(), "content/blog", filename),
  ].find((p) => fs.existsSync(p)) || path.join(process.cwd(), "content/blog", filename);

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    notFound();
  }

  const { frontmatter, body } = parseFrontmatter(content);
  const date = postMeta[slug]?.date || frontmatter.date;
  const htmlContent = renderMarkdown(body);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <article className="max-w-3xl mx-auto px-4 pt-32 pb-20">
        {/* Back link */}
        <a
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-orange-400 transition-colors mb-8"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Blog
        </a>

        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            {frontmatter.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span>{date}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{frontmatter.readTime}</span>
          </div>
        </header>

        {/* Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </article>

      {/* Prose styles */}
      <style>{`
        .blog-content .blog-h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.3;
        }
        .blog-content .blog-h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #fff;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }
        .blog-content .blog-p {
          color: #d4d4d4;
          line-height: 1.8;
          margin-bottom: 1.25rem;
          font-size: 1.0625rem;
        }
        .blog-content .blog-strong {
          color: #fff;
          font-weight: 600;
        }
        .blog-content .blog-link {
          color: #fb923c;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .blog-content .blog-link:hover {
          color: #fdba74;
        }
        .blog-content .blog-ul,
        .blog-content .blog-ol {
          color: #d4d4d4;
          margin-bottom: 1.25rem;
          padding-left: 1.5rem;
        }
        .blog-content .blog-ul {
          list-style-type: disc;
        }
        .blog-content .blog-ol {
          list-style-type: decimal;
        }
        .blog-content .blog-li {
          margin-bottom: 0.5rem;
          line-height: 1.7;
          font-size: 1.0625rem;
        }
        .blog-content .blog-code-block {
          background: #171717;
          border: 1px solid #262626;
          border-radius: 0.5rem;
          padding: 1.25rem;
          overflow-x: auto;
          margin-bottom: 1.25rem;
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .blog-content .blog-code-block code {
          color: #e5e5e5;
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
        }
        .blog-content .blog-inline-code {
          background: #262626;
          color: #fb923c;
          padding: 0.15rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
        }
      `}</style>
    </div>
  );
}
