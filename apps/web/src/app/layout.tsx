import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import CookieConsent from "@/components/CookieConsent";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "PreShip - Quality Gate for AI-Generated Code",
    template: "%s | PreShip",
  },
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
    "accessibility testing",
    "security scanning",
  ],
  metadataBase: new URL("https://preship.dev"),
  openGraph: {
    title: "PreShip - Quality Gate for AI-Generated Code",
    description:
      "Accessibility, security, and performance scanning for vibe-coded apps. API-first. Results in seconds.",
    url: "https://preship.dev",
    siteName: "PreShip",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
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
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
        <CookieConsent />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
