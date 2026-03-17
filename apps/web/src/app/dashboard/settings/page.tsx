"use client";

import { useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Badge from "@/components/Badge";

const apiKeys = [
  { id: "key_001", name: "Production", prefix: "sk_live_a3f8", created: "2026-02-10", lastUsed: "2026-03-16" },
  { id: "key_002", name: "Development", prefix: "sk_test_7b2c", created: "2026-01-20", lastUsed: "2026-03-15" },
];

export default function SettingsPage() {
  const [showNewKey, setShowNewKey] = useState(false);
  const [activeSection, setActiveSection] = useState<"profile" | "notifications" | "api-keys">("profile");

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="flex gap-1 mb-8 p-1 rounded-lg bg-neutral-900 border border-neutral-800 w-fit">
        {[{ key: "profile", label: "Profile" }, { key: "notifications", label: "Notifications" }, { key: "api-keys", label: "API Keys" }].map((s) => (
          <button key={s.key} onClick={() => setActiveSection(s.key as typeof activeSection)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === s.key ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === "profile" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Profile Information</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xl font-bold">JD</div>
              <Button variant="outline" size="sm">Change avatar</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name" defaultValue="John Doe" />
              <Input label="Email" defaultValue="john@example.com" type="email" />
              <Input label="Company" defaultValue="Acme Inc." />
              <Input label="Website" defaultValue="https://johndoe.com" type="url" />
            </div>
            <div className="mt-6 flex justify-end"><Button>Save Changes</Button></div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
            <div className="space-y-4 max-w-md">
              <Input label="Current Password" type="password" />
              <Input label="New Password" type="password" />
              <Input label="Confirm New Password" type="password" />
            </div>
            <div className="mt-6 flex justify-end"><Button>Update Password</Button></div>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
            <p className="text-sm text-neutral-400 mb-4">Permanently delete your account and all associated data.</p>
            <Button variant="destructive" size="sm">Delete Account</Button>
          </div>
        </div>
      )}

      {activeSection === "notifications" && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Notification Preferences</h2>
          <div className="space-y-6">
            {[
              { title: "Scan completed", desc: "Get notified when a scan finishes", email: true, slack: false },
              { title: "Score dropped", desc: "Alert when score drops below threshold", email: true, slack: true },
              { title: "Weekly digest", desc: "Summary of all scan activity", email: true, slack: false },
              { title: "New vulnerabilities", desc: "Alert for new security issues", email: true, slack: true },
              { title: "Usage alerts", desc: "Notify when approaching scan limit", email: true, slack: false },
              { title: "Product updates", desc: "New features and platform updates", email: false, slack: false },
            ].map((n) => (
              <div key={n.title} className="flex items-start justify-between py-3 border-b border-neutral-800 last:border-0">
                <div><p className="text-sm font-medium text-white">{n.title}</p><p className="text-xs text-neutral-500 mt-0.5">{n.desc}</p></div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-neutral-400"><input type="checkbox" defaultChecked={n.email} className="rounded border-neutral-700 bg-neutral-800 text-orange-500 focus:ring-orange-500" />Email</label>
                  <label className="flex items-center gap-2 text-sm text-neutral-400"><input type="checkbox" defaultChecked={n.slack} className="rounded border-neutral-700 bg-neutral-800 text-orange-500 focus:ring-orange-500" />Slack</label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end"><Button>Save Preferences</Button></div>
        </div>
      )}

      {activeSection === "api-keys" && (
        <div className="space-y-6" id="api-keys">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">API Keys</h2>
                <p className="text-sm text-neutral-400 mt-1">Manage your API keys for programmatic access</p>
              </div>
              <Button onClick={() => setShowNewKey(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create Key
              </Button>
            </div>
            {showNewKey && (
              <div className="mb-6 p-4 rounded-lg border border-orange-500/20 bg-orange-500/5">
                <Input label="Key Name" placeholder="e.g., Production, CI/CD" />
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewKey(false)}>Cancel</Button>
                  <Button size="sm">Generate Key</Button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-800 bg-neutral-800/50">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    <div><p className="text-sm font-medium text-white">{key.name}</p><p className="text-xs text-neutral-500 font-mono">{key.prefix}...****</p></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right"><p className="text-xs text-neutral-500">Created {key.created}</p><p className="text-xs text-neutral-500">Last used {key.lastUsed}</p></div>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">Revoke</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
