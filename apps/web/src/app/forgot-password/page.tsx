"use client";

import { useState } from "react";
import Logo from "@/components/Logo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.preship.dev";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Silently handle - we show the same message regardless
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <a href="/" aria-label="Go to PreShip homepage">
            <Logo size="lg" variant="full" />
          </a>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-2">Reset your password</h1>
          <p className="text-sm text-neutral-400 text-center mb-8">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {submitted ? (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-4 text-sm text-green-400 text-center">
              If an account exists with that email, we&apos;ll send a reset link. Please check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Remember your password?{" "}
          <a href="/login" className="text-orange-400 hover:text-orange-300 transition-colors font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
