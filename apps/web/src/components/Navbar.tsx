"use client";

import { useState } from "react";
import Logo from "./Logo";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "/docs" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-neutral-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center">
            <Logo size="sm" variant="full" />
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-sm text-neutral-300 hover:text-white transition-colors">{link.label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/login" className="inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-white px-3 py-1.5 text-sm rounded-md">Log in</a>
            <a href="/signup" className="inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] bg-orange-700 text-white hover:bg-orange-800 active:bg-orange-900 shadow-lg shadow-orange-700/20 px-3 py-1.5 text-sm rounded-md">Sign up free</a>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-neutral-300 hover:text-white" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}>
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-900 animate-fade-in">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="block text-sm text-neutral-300 hover:text-white transition-colors py-2" onClick={() => setMobileOpen(false)}>{link.label}</a>
            ))}
            <div className="pt-3 border-t border-neutral-800 space-y-2">
              <a href="/login" className="block w-full text-center font-medium transition-all duration-200 bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-white px-4 py-2 text-sm rounded-lg">Log in</a>
              <a href="/signup" className="block w-full text-center font-medium transition-all duration-200 bg-orange-700 text-white hover:bg-orange-800 active:bg-orange-900 shadow-lg shadow-orange-700/20 px-4 py-2 text-sm rounded-lg">Sign up free</a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
