"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Badge from "@/components/Badge";
import { apiFetch } from "@/hooks/useApi";

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function SettingsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="h-7 w-32 bg-neutral-800 rounded mb-6" />
      <div className="flex gap-1 mb-8 p-1 rounded-lg bg-neutral-900 border border-neutral-800 w-fit">
        {[1, 2, 3].map((i) => <div key={i} className="h-9 w-24 bg-neutral-800 rounded-md" />)}
      </div>
      <div className="space-y-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-64" />
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 h-48" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error banner                                                        */
/* ------------------------------------------------------------------ */
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center justify-between mb-6">
      <div className="flex items-center gap-2 text-sm text-red-400">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {message}
      </div>
      <button onClick={onRetry} className="text-sm text-red-400 hover:text-red-300 font-medium">
        Retry
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings Page                                                       */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  const [showNewKey, setShowNewKey] = useState(false);
  const [activeSection, setActiveSection] = useState<"profile" | "notifications" | "api-keys">("profile");

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // API keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [keysLoading, setKeysLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/auth/me");
      const data = res?.data;
      if (data) {
        setProfileName(data.name ?? "");
        setProfileEmail(data.email ?? "");
      }
    } catch {
      setError("Could not load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await apiFetch<any>("/api/auth/api-keys");
      const keys = (res?.data ?? []).map((k: any) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        created: k.createdAt ? new Date(k.createdAt).toLocaleDateString() : "--",
        lastUsed: k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never",
      }));
      setApiKeys(keys);
    } catch {
      setError("Could not load API keys. Please try again.");
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (activeSection === "api-keys") {
      fetchApiKeys();
    }
  }, [activeSection, fetchApiKeys]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileSuccess(false);
    setError(null);
    try {
      await apiFetch<any>("/api/auth/profile", {
        method: "PUT",
        body: { name: profileName, email: profileEmail },
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/auth/api-keys", {
        method: "POST",
        body: { name: newKeyName },
      });
      setNewKeyValue(res?.data?.key ?? null);
      setNewKeyName("");
      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    setRevokingId(keyId);
    setError(null);
    try {
      await apiFetch<any>(`/api/auth/api-keys/${keyId}`, { method: "DELETE" });
      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key");
    } finally {
      setRevokingId(null);
    }
  };

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="max-w-4xl mx-auto">
      {error && <ErrorBanner message={error} onRetry={activeSection === "api-keys" ? fetchApiKeys : fetchProfile} />}

      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="flex gap-1 mb-8 p-1 rounded-lg bg-neutral-900 border border-neutral-800 w-fit">
        {[
          { key: "profile", label: "Profile" },
          { key: "notifications", label: "Notifications" },
          { key: "api-keys", label: "API Keys" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key as typeof activeSection)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeSection === s.key ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === "profile" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Profile Information</h2>
            {profileSuccess && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-2 text-sm text-green-400 mb-4">
                Profile saved successfully.
              </div>
            )}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xl font-bold">
                {profileName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?"}
              </div>
              <Button variant="outline" size="sm">Change avatar</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              <Input label="Email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} type="email" />
              <Input label="Company" defaultValue="" placeholder="Your company" />
              <Input label="Website" defaultValue="" placeholder="https://example.com" type="url" />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveProfile} loading={savingProfile}>Save Changes</Button>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
            <div className="space-y-4 max-w-md">
              <Input label="Current Password" type="password" />
              <Input label="New Password" type="password" />
              <Input label="Confirm New Password" type="password" />
            </div>
            <div className="mt-6 flex justify-end">
              <Button>Update Password</Button>
            </div>
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
                <div>
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{n.desc}</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-neutral-400">
                    <input type="checkbox" defaultChecked={n.email} className="rounded border-neutral-700 bg-neutral-800 text-orange-500 focus:ring-orange-500" />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-400">
                    <input type="checkbox" defaultChecked={n.slack} className="rounded border-neutral-700 bg-neutral-800 text-orange-500 focus:ring-orange-500" />
                    Slack
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button>Save Preferences</Button>
          </div>
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
              <Button onClick={() => { setShowNewKey(true); setNewKeyValue(null); }}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create Key
              </Button>
            </div>

            {newKeyValue && (
              <div className="mb-6 p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                <p className="text-sm text-green-400 font-medium mb-2">API Key Created</p>
                <p className="text-xs text-neutral-400 mb-2">Copy this key now. It will not be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-white bg-neutral-800 px-3 py-2 rounded-lg break-all">{newKeyValue}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(newKeyValue)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            {showNewKey && !newKeyValue && (
              <div className="mb-6 p-4 rounded-lg border border-orange-500/20 bg-orange-500/5">
                <Input
                  label="Key Name"
                  placeholder="e.g., Production, CI/CD"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewKey(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleCreateKey} loading={creatingKey} disabled={!newKeyName.trim()}>
                    Generate Key
                  </Button>
                </div>
              </div>
            )}

            {keysLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-neutral-800 rounded-lg" />
                ))}
              </div>
            ) : apiKeys.length > 0 ? (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-800 bg-neutral-800/50">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                      <div>
                        <p className="text-sm font-medium text-white">{key.name}</p>
                        <p className="text-xs text-neutral-500 font-mono">{key.prefix}...****</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-neutral-500">Created {key.created}</p>
                        <p className="text-xs text-neutral-500">Last used {key.lastUsed}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleRevokeKey(key.id)}
                        loading={revokingId === key.id}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-neutral-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <h3 className="text-sm font-medium text-white mb-1">No API keys</h3>
                <p className="text-xs text-neutral-500">Create an API key to access the PreShip API programmatically.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
