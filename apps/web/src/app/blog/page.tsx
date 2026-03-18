import Navbar from "@/components/Navbar";

const posts = [
  {
    slug: "why-your-vibe-coded-app-is-probably-inaccessible",
    title: "Why Your Vibe-Coded App Is Probably Inaccessible",
    excerpt:
      "AI code generators optimize for speed and visual output, not for screen readers or keyboard navigation. Here is what they get wrong and how to fix it.",
    date: "March 12, 2026",
    readTime: "7 min read",
  },
  {
    slug: "ada-lawsuits-is-your-ai-built-app-next",
    title: "5,114 ADA Lawsuits: Is Your AI-Built App Next?",
    excerpt:
      "Web accessibility lawsuits hit a record high in 2025. We break down the numbers, the most common violations, and what developers shipping AI-generated code need to know.",
    date: "March 8, 2026",
    readTime: "10 min read",
  },
  {
    slug: "api-first-scanning-cicd-quality-gate",
    title: "API-First Scanning: Why Your CI/CD Needs a Quality Gate",
    excerpt:
      "Adding a scan step to your deployment pipeline catches accessibility and security regressions before they reach production. Here is how to set it up in under five minutes.",
    date: "March 3, 2026",
    readTime: "5 min read",
  },
  {
    slug: "developer-accessibility-checklist-2026",
    title: "The Developer's Accessibility Checklist for 2026",
    excerpt:
      "A practical, no-nonsense checklist covering WCAG 2.2 AA requirements that every frontend developer should verify before shipping. Bookmark this one.",
    date: "February 25, 2026",
    readTime: "8 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 pt-32 pb-20">
        <h1 className="text-4xl font-bold text-white mb-4">Blog</h1>
        <p className="text-lg text-neutral-300 mb-12">
          Insights on accessibility, security, and building quality software with AI.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-xl border border-neutral-800 bg-neutral-900 p-6 hover:border-orange-500/30 hover:bg-neutral-800/80 transition-all duration-300"
            >
              <div className="flex items-center gap-3 text-xs text-neutral-500 mb-3">
                <span>{post.date}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed mb-4">
                {post.excerpt}
              </p>
              <span className="text-sm font-medium text-orange-400 group-hover:text-orange-300 transition-colors">
                Read more &rarr;
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
