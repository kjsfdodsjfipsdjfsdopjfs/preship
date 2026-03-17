"use client";

import Button from "@/components/Button";
import Badge from "@/components/Badge";
import UsageMeter from "@/components/UsageMeter";

const currentPlan = { name: "Pro", price: "$29", period: "/month", renewsAt: "April 16, 2026", scansUsed: 47, scansLimit: 100, projectsUsed: 3, projectsLimit: 5 };

const invoices = [
  { id: "inv_005", date: "Mar 1, 2026", amount: "$29.00", status: "Paid" },
  { id: "inv_004", date: "Feb 1, 2026", amount: "$29.00", status: "Paid" },
  { id: "inv_003", date: "Jan 1, 2026", amount: "$29.00", status: "Paid" },
  { id: "inv_002", date: "Dec 1, 2025", amount: "$29.00", status: "Paid" },
];

const plans = [
  { name: "Free", price: "$0", scans: "5 / mo", projects: "1", current: false },
  { name: "Pro", price: "$29", scans: "100 / mo", projects: "5", current: true },
  { name: "Team", price: "$99", scans: "500 / mo", projects: "Unlimited", current: false },
  { name: "Business", price: "$299", scans: "Unlimited", projects: "Unlimited", current: false },
];

export default function BillingPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Billing</h1>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Current Plan</h2>
              <Badge variant="info">{currentPlan.name}</Badge>
            </div>
            <p className="text-sm text-neutral-400 mt-1">
              <span className="text-2xl font-bold text-white">{currentPlan.price}</span>
              <span className="text-neutral-500">{currentPlan.period}</span>
            </p>
            <p className="text-xs text-neutral-500 mt-2">Renews on {currentPlan.renewsAt}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Manage in Stripe</Button>
            <Button size="sm">Upgrade Plan</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UsageMeter used={currentPlan.scansUsed} limit={currentPlan.scansLimit} label="Scans this month" />
          <UsageMeter used={currentPlan.projectsUsed} limit={currentPlan.projectsLimit} label="Active projects" />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Available Plans</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-lg border p-4 text-center transition-all ${plan.current ? "border-orange-500 bg-orange-500/5" : "border-neutral-800 bg-neutral-800/50 hover:border-neutral-700"}`}>
              <p className="text-sm font-medium text-white">{plan.name}</p>
              <p className="text-xl font-bold text-white mt-1">{plan.price}</p>
              <p className="text-xs text-neutral-500 mt-1">/month</p>
              <div className="mt-3 space-y-1 text-xs text-neutral-400">
                <p>{plan.scans} scans</p>
                <p>{plan.projects} projects</p>
              </div>
              <div className="mt-3">
                {plan.current ? <Badge variant="info">Current</Badge> : (
                  <Button variant="outline" size="sm" className="w-full text-xs">{plan.price === "$0" ? "Downgrade" : "Upgrade"}</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Invoice History</h2>
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-neutral-800 transition-colors">
              <div className="flex items-center gap-4">
                <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <div><p className="text-sm text-white">{inv.date}</p><p className="text-xs text-neutral-500">{inv.id}</p></div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-white">{inv.amount}</span>
                <Badge variant="success">{inv.status}</Badge>
                <button className="text-xs text-orange-400 hover:text-orange-300 transition-colors">Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Payment Method</h2>
        <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-800 bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-7 rounded bg-neutral-700 flex items-center justify-center text-xs font-bold text-white">VISA</div>
            <div><p className="text-sm text-white">Visa ending in 4242</p><p className="text-xs text-neutral-500">Expires 12/2028</p></div>
          </div>
          <Button variant="outline" size="sm">Update</Button>
        </div>
      </div>
    </div>
  );
}
