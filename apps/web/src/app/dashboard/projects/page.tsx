"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import ProjectCard from "@/components/ProjectCard";
import { apiFetch } from "@/hooks/useApi";

/* ------------------------------------------------------------------ */
/* Mock fallback data                                                  */
/* ------------------------------------------------------------------ */
const mockProjects = [
  { id: "proj_001", name: "SaaS Dashboard", url: "https://my-saas.vercel.app", score: 82, lastScanned: "2026-03-16T14:30:00Z", scanCount: 47 },
  { id: "proj_002", name: "Portfolio Site", url: "https://portfolio.dev", score: 45, lastScanned: "2026-03-16T12:15:00Z", scanCount: 12 },
  { id: "proj_003", name: "E-Commerce Shop", url: "https://shop.example.com", score: 91, lastScanned: "2026-03-15T18:00:00Z", scanCount: 89 },
];

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function ProjectsSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-32 bg-neutral-800 rounded" />
          <div className="h-4 w-48 bg-neutral-800 rounded mt-2" />
        </div>
        <div className="h-10 w-32 bg-neutral-800 rounded-lg" />
      </div>
      <div className="h-10 w-64 bg-neutral-800 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 h-36" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16">
      <svg className="w-16 h-16 mx-auto text-neutral-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
      <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
        Create a project to track a website and monitor its score over time.
      </p>
      <Button onClick={onCreate}>Create Your First Project</Button>
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
/* Projects Page                                                       */
/* ------------------------------------------------------------------ */
export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDemoMode(false);

    try {
      const res = await apiFetch<any>("/api/projects?limit=100");
      const apiProjects = (res?.data?.projects ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        url: p.url,
        score: p.latestScan?.overallScore ?? 0,
        lastScanned: p.latestScan?.createdAt ?? p.updated_at ?? p.created_at,
        scanCount: p.scan_count ?? 0,
      }));
      setProjects(apiProjects);
      setTotalProjects(res?.data?.pagination?.total ?? apiProjects.length);
    } catch {
      setDemoMode(true);
      setProjects(mockProjects);
      setTotalProjects(mockProjects.length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setCreating(true);
    setCreateError(null);

    try {
      await apiFetch<any>("/api/projects", {
        method: "POST",
        body: { name: newName, url: newUrl },
      });
      setShowNew(false);
      setNewName("");
      setNewUrl("");
      await fetchProjects();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const filtered = projects.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.url.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <ProjectsSkeleton />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {demoMode && <DemoBanner />}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
          <button onClick={fetchProjects} className="text-sm text-red-400 hover:text-red-300 font-medium">Retry</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-neutral-400 mt-1">{totalProjects} project{totalProjects !== 1 ? "s" : ""} tracked</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Project
        </Button>
      </div>

      <Input
        placeholder="Search projects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
      />

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4">New Project</h2>
            {createError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400 mb-4">{createError}</div>
            )}
            <div className="space-y-4">
              <Input label="Project Name" placeholder="My Awesome App" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input label="URL" placeholder="https://your-app.com" type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => { setShowNew(false); setCreateError(null); }}>Cancel</Button>
              <Button onClick={handleCreate} loading={creating} disabled={!newName.trim() || !newUrl.trim()}>
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState onCreate={() => setShowNew(true)} />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => <ProjectCard key={project.id} {...project} />)}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-neutral-500">No projects match your search.</p>
        </div>
      )}
    </div>
  );
}
