"use client";

import { cn } from "@/lib/utils";
import Button from "./Button";

const tiers = [
  {
    name: "Free", price: "$0", period: "forever", description: "Try it out on personal projects", cta: "Start Free",
    href: "/signup?plan=free",
    features: ["5 scans / month", "Accessibility checks", "Basic reports", "1 project", "Community support"],
  },
  {
    name: "Pro", price: "$29", period: "/month", description: "For indie developers and freelancers", cta: "Start Pro Trial", badge: "Popular", highlighted: true,
    href: "/signup?plan=pro",
    features: ["100 scans / month", "Accessibility + Security + Performance", "Fix suggestions with code", "5 projects", "CI/CD integration", "API access", "PDF reports", "Email support"],
  },
  {
    name: "Team", price: "$99", period: "/month", description: "For small teams shipping fast", cta: "Start Team Trial",
    href: "/signup?plan=team",
    features: ["500 scans / month", "Everything in Pro", "Unlimited projects", "Team members (up to 10)", "Scheduled scans", "Slack notifications", "Priority support", "Custom rules"],
  },
  {
    name: "Business", price: "$299", period: "/month", description: "For agencies and enterprises", cta: "Contact Sales",
    href: "/contact?plan=business",
    features: ["Unlimited scans", "Everything in Team", "Unlimited team members", "Compliance reports (VPAT)", "White-label reports", "SSO / SAML", "Dedicated support", "SLA guarantee", "Custom integrations"],
  },
];

export default function PricingTable() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {tiers.map((tier) => (
        <div key={tier.name} className={cn("relative rounded-2xl border p-6 flex flex-col", tier.highlighted ? "border-orange-500 bg-neutral-900 shadow-[0_0_20px_rgba(249,115,22,0.15)]" : "border-neutral-800 bg-neutral-900")}>
          {tier.badge && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-orange-700 text-white text-xs font-semibold px-3 py-1 rounded-full">{tier.badge}</span>
            </div>
          )}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">{tier.price}</span>
              {tier.period && <span className="text-sm text-neutral-300">{tier.period}</span>}
            </div>
            <p className="mt-2 text-sm text-neutral-300">{tier.description}</p>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <svg className={cn("w-4 h-4 mt-0.5 flex-shrink-0", tier.highlighted ? "text-orange-400" : "text-neutral-300")} aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" role="presentation">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-neutral-300">{feature}</span>
              </li>
            ))}
          </ul>
          <a href={tier.href}>
            <Button variant={tier.highlighted ? "primary" : "outline"} size="lg" className="w-full">{tier.cta}</Button>
          </a>
        </div>
      ))}
    </div>
  );
}
