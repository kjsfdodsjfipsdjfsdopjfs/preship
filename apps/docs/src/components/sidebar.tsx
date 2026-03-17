import Link from "next/link";

const navigation = [
  {
    title: "Overview",
    items: [
      { title: "Introduction", href: "/" },
      { title: "Getting Started", href: "/getting-started" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { title: "Authentication", href: "/api-reference/authentication" },
      { title: "Scans", href: "/api-reference/scans" },
      { title: "Projects", href: "/api-reference/projects" },
      { title: "Billing", href: "/api-reference/billing" },
      { title: "Rate Limits", href: "/api-reference/rate-limits" },
      { title: "Error Codes", href: "/api-reference/errors" },
    ],
  },
  {
    title: "Tools",
    items: [
      { title: "CLI Reference", href: "/cli" },
      { title: "GitHub Action", href: "/github-action" },
      { title: "SDKs", href: "/sdks" },
    ],
  },
  {
    title: "Guides",
    items: [
      { title: "Vercel Integration", href: "/guides/vercel-integration" },
      { title: "GitHub Actions CI", href: "/guides/github-actions-integration" },
      { title: "Continuous Monitoring", href: "/guides/continuous-monitoring" },
      { title: "Understanding Scores", href: "/guides/understanding-scores" },
    ],
  },
  {
    title: "Resources",
    items: [
      { title: "Webhooks", href: "/webhooks" },
      { title: "Changelog", href: "/changelog" },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
      <nav className="p-4 space-y-6">
        {navigation.map((group) => (
          <div key={group.title}>
            <h3 className="sidebar-heading">{group.title}</h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="sidebar-link no-underline">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
