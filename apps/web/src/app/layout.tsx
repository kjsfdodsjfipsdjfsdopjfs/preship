import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PreShip - Quality Gate for AI-Generated Code",
  description:
    "Accessibility, security, and performance scanning for vibe-coded apps. API-first. Results in seconds.",
  keywords: [
    "accessibility",
    "security",
    "performance",
    "AI code",
    "vibe coding",
    "ADA compliance",
    "WCAG",
    "web scanning",
  ],
  openGraph: {
    title: "PreShip - Quality Gate for AI-Generated Code",
    description:
      "Accessibility, security, and performance scanning for vibe-coded apps. API-first. Results in seconds.",
    url: "https://preship.dev",
    siteName: "PreShip",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PreShip - Quality Gate for AI-Generated Code",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PreShip - Quality Gate for AI-Generated Code",
    description:
      "Accessibility, security, and performance scanning for vibe-coded apps.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="font-sans bg-[#0A0A0A] text-white antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
