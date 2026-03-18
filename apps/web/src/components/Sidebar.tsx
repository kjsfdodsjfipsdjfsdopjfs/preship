"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { apiFetch } from "@/hooks/useApi";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { label: "Projects", href: "/dashboard/projects", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> },
  { label: "Scans", href: "/dashboard/scans", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
  { label: "Settings", href: "/dashboard/settings", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { label: "Billing", href: "/dashboard/billing", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
  { label: "API Keys", href: "/dashboard/settings#api-keys", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg> },
  { label: "Docs", href: "/docs", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    apiFetch<{ success: boolean; data: { scansUsed: number; scansLimit: number } }>("/api/billing/usage")
      .then((res) => {
        setUsage({ used: res.data.scansUsed, limit: res.data.scansLimit });
      })
      .catch(() => {
        // Silently fail — usage meter just won't show
      });
  }, []);

  const usagePercent = usage ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;

  return (
    <aside className="w-60 h-screen fixed left-0 top-0 bg-neutral-950 border-r border-neutral-800 flex flex-col z-40">
      <div className="h-16 flex items-center px-5 border-b border-neutral-800">
        <a href="/dashboard" className="flex items-center">
          <Logo size="sm" variant="full" />
        </a>
      </div>

      <nav aria-label="Dashboard navigation" className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href);
          return (
            <a key={item.label} href={item.href} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200", isActive ? "bg-orange-500/10 text-orange-400" : "text-neutral-400 hover:bg-neutral-800 hover:text-white")}>
              <span className={cn(isActive ? "text-orange-400" : "text-neutral-500")}>{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {usage && (
        <div className="px-4 py-4 border-t border-neutral-800">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
            <span>Scans this month</span>
            <span className="tabular-nums">{usage.used} / {usage.limit}</span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div className={`h-full rounded-full ${usagePercent > 80 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${usagePercent}%` }} />
          </div>
          <a href="/dashboard/billing" className="block mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors">Upgrade plan</a>
        </div>
      )}
    </aside>
  );
}
