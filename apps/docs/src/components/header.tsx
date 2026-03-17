import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-900 no-underline">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-brand-600">
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <path d="M7 12.5l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            PreShip
          </Link>
          <span className="text-sm text-slate-400 hidden sm:inline">Documentation</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://app.preship.dev"
            className="text-sm text-slate-600 hover:text-slate-900 no-underline"
          >
            Dashboard
          </a>
          <a
            href="https://github.com/preship"
            className="text-sm text-slate-600 hover:text-slate-900 no-underline"
          >
            GitHub
          </a>
          <a
            href="https://app.preship.dev/signup"
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 no-underline transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
}
