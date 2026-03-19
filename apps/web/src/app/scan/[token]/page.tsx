import { redirect } from "next/navigation";
import { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.preship.dev";

/* ------------------------------------------------------------------ */
/* Metadata (preserve OG tags for existing shared links)               */
/* ------------------------------------------------------------------ */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  try {
    const res = await fetch(`${API_BASE}/api/scan/public/${token}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { title: "Scan Not Found" };
    const json = await res.json();
    const scan = json.data ?? json;

    const domain = new URL(scan.url).hostname;
    const title = `${domain} scored ${scan.overallScore}/100 | PreShip`;
    const description = `Accessibility, security & performance scan results for ${domain}. Overall score: ${scan.overallScore}/100.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        url: `https://preship.dev/results/${token}`,
        images: [
          {
            url: `/api/og/scan/${token}`,
            width: 1200,
            height: 630,
            alt: `PreShip scan results for ${domain}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`/api/og/scan/${token}`],
      },
    };
  } catch {
    return { title: "Scan Not Found" };
  }
}

/* ------------------------------------------------------------------ */
/* Redirect to /results/[token]                                        */
/* ------------------------------------------------------------------ */
export default async function LegacyScanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/results/${token}`);
}
