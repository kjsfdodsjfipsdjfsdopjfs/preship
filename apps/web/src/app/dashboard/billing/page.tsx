"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import UsageMeter from "@/components/UsageMeter";
import { apiFetch } from "@/hooks/useApi";

/* ------------------------------------------------------------------ */
/* Mock fallback data                                                  */
/* ------------------------------------------------------------------ */
const mockCurrentPlan = {
  name: "Pro",
  price: "$29",
  period: "/month",
  renewsAt: "April 16, 2026",
  scansUsed: 47,
  scansLimit: 100,
  projectsUsed: 3,
  projectsLimit: 5,
};

const mockPlans = [
  { id: "free", name: "Free", price: "$0", scans: "5 / mo", projects: "1", current: false },
  { id: "pro", name: "Pro", price: "$29", scans: "100 / mo", projects: "5", current: true },
  { id: "team", name: "Team", price: "$99", scans: "500 / mo", projects: "Unlimited", current: false },
  { id: "enterprise", name: "Business", price: "$299", scans: "Unlimited", projects: "Unlimited", current: false },
];

const mockInvoices = [
  { id: "inv_005", date: "Mar 1, 2026", amount: "$29.00", status: "Paid" },
  { id: "inv_004", date: "Feb 1, 2026", amount: "$29.00", status: "Paid" },
  { id: "inv_003", date: "Jan 1, 2026", amount: "$29.00", status: "Paid" },
];

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function BillingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-24 bg-neutral-800 rounded" />
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-48" />
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-40" />
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-48" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Demo banner                                                         */
/* ------------------------------------------------------------------ */
function DemoBanner() {
  return (
    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-400 flex items-center gap-2">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      Demo mode — API not connected
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Billing Page                                                        */
/* ------------------------------------------------------------------ */
export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  // Data
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [invoices] = useState(mockInvoices); // Invoices come from Stripe portal

  // Actions
  const [managingPortal, setManagingPortal] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDemoMode(false);

    try {
      const [planRes, usageRes] = await Promise.all([
        apiFetch<any>("/api/billing/plan").catch(() => null),
        apiFetch<any>("/api/billing/usage").catch(() => null),
      ]);

      if (!planRes && !usageRes) {
        throw new Error("API not available");
      }

      if (planRes?.data) {
        const cp = planRes.data.currentPlan;
        setCurrentPlan({
          name: cp.name,
          price: cp.price ? `$${cp.price}` : "$0",
          period: "/month",
          renewsAt: "", // From Stripe
          scansUsed: usageRes?.data?.scansUsed ?? 0,
          scansLimit: cp.scansPerMonth ?? 5,
          projectsUsed: usageRes?.data?.projectsUsed ?? 0,
          projectsLimit: cp.projectsLimit ?? 1,
        });

        const availPlans = (planRes.data.availablePlans ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price ? `$${p.price}` : "$0",
          scans: p.scansPerMonth === -1 ? "Unlimited" : `${p.scansPerMonth} / mo`,
          projects: p.projectsLimit === -1 ? "Unlimited" : String(p.projectsLimit ?? 1),
          current: p.id === cp.id,
        }));
        setPlans(availPlans);
      } else {
        throw new Error("No plan data");
      }

      if (usageRes?.data) {
        setUsage(usageRes.data);
      }
    } catch {
      setDemoMode(true);
      setCurrentPlan(mockCurrentPlan);
      setPlans(mockPlans);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleManageStripe = async () => {
    setManagingPortal(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/billing/portal", {
        method: "POST",
        body: { returnUrl: window.location.href },
      });
      if (res?.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open Stripe portal");
    } finally {
      setManagingPortal(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlan(planId);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/billing/checkout", {
        method: "POST",
        body: {
          planId,
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: window.location.href,
        },
      });
      if (res?.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setUpgradingPlan(null);
    }
  };

  if (loading) return <BillingSkeleton />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {demoMode && <DemoBanner />}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-sm text-red-400 hover:text-red-300 font-medium">Dismiss</button>
        </div>
      )}

      <h1 className="text-2xl font-bold text-white">Billing</h1>

      {/* Current Plan */}
      {currentPlan && (
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
              {currentPlan.renewsAt && (
                <p className="text-xs text-neutral-500 mt-2">Renews on {currentPlan.renewsAt}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleManageStripe} loading={managingPortal}>
                Manage in Stripe
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UsageMeter
              used={currentPlan.scansUsed}
              limit={currentPlan.scansLimit}
              label="Scans this month"
            />
            <UsageMeter
              used={currentPlan.projectsUsed}
              limit={currentPlan.projectsLimit}
              label="Active projects"
            />
          </div>
        </div>
      )}

      {/* Available Plans */}
      {plans.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Available Plans</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-lg border p-4 text-center transition-all ${
                  plan.current
                    ? "border-orange-500 bg-orange-500/5"
                    : "border-neutral-800 bg-neutral-800/50 hover:border-neutral-700"
                }`}
              >
                <p className="text-sm font-medium text-white">{plan.name}</p>
                <p className="text-xl font-bold text-white mt-1">{plan.price}</p>
                <p className="text-xs text-neutral-500 mt-1">/month</p>
                <div className="mt-3 space-y-1 text-xs text-neutral-400">
                  <p>{plan.scans} scans</p>
                  <p>{plan.projects} projects</p>
                </div>
                <div className="mt-3">
                  {plan.current ? (
                    <Badge variant="info">Current</Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => handleUpgrade(plan.id)}
                      loading={upgradingPlan === plan.id}
                    >
                      {plan.price === "$0" ? "Downgrade" : "Upgrade"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice History */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Invoice History</h2>
          <Button variant="outline" size="sm" onClick={handleManageStripe} loading={managingPortal}>
            View in Stripe
          </Button>
        </div>
        {invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-neutral-800 transition-colors">
                <div className="flex items-center gap-4">
                  <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <div>
                    <p className="text-sm text-white">{inv.date}</p>
                    <p className="text-xs text-neutral-500">{inv.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white">{inv.amount}</span>
                  <Badge variant="success">{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500">No invoices yet. Invoices will appear after your first billing cycle.</p>
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Payment Method</h2>
        <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-800 bg-neutral-800/50">
          <p className="text-sm text-neutral-400">Manage your payment methods through the Stripe portal.</p>
          <Button variant="outline" size="sm" onClick={handleManageStripe} loading={managingPortal}>
            Manage
          </Button>
        </div>
      </div>
    </div>
  );
}
