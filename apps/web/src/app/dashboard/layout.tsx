"use client";

import Sidebar from "@/components/Sidebar";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setUserMenuOpen(false), []);

  useEffect(() => {
    if (!userMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeMenu(); }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { closeMenu(); }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen, closeMenu]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <svg
          className="animate-spin h-8 w-8 text-orange-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <div className="ml-60">
        <header className="sticky top-0 z-30 h-16 border-b border-neutral-800 bg-[#0A0A0A]/80 backdrop-blur-md flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-4">
            <button aria-label="Search" className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
            <button aria-label="Notifications" className="relative text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
              <span className="sr-only">You have new notifications</span>
            </button>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} aria-haspopup="menu" aria-expanded={userMenuOpen} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm font-semibold">JD</div>
                <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {userMenuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-56 rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl py-1 animate-fade-in">
                  <div className="px-4 py-3 border-b border-neutral-800">
                    <p className="text-sm font-medium text-white">John Doe</p>
                    <p className="text-xs text-neutral-500">john@example.com</p>
                  </div>
                  <a role="menuitem" href="/dashboard/settings" className="block px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">Settings</a>
                  <a role="menuitem" href="/dashboard/billing" className="block px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">Billing</a>
                  <div className="border-t border-neutral-800 mt-1 pt-1">
                    <button role="menuitem" className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-neutral-800 transition-colors">Sign out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
