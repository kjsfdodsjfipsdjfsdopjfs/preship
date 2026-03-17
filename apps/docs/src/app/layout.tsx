import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "PreShip Documentation",
  description:
    "API documentation for PreShip - automated accessibility, security, and performance scanning for web applications.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 min-w-0">
              <div className="max-w-4xl mx-auto px-6 py-10">
                <article className="prose prose-slate max-w-none">
                  {children}
                </article>
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
