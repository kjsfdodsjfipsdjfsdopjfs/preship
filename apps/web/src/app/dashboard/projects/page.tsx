"use client";

import { useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";
import ProjectCard from "@/components/ProjectCard";

const projects = [
  { id: "proj_001", name: "SaaS Dashboard", url: "https://my-saas.vercel.app", score: 82, lastScanned: "2026-03-16T14:30:00Z", scanCount: 47 },
  { id: "proj_002", name: "Portfolio Site", url: "https://portfolio.dev", score: 45, lastScanned: "2026-03-16T12:15:00Z", scanCount: 12 },
  { id: "proj_003", name: "E-Commerce Shop", url: "https://shop.example.com", score: 91, lastScanned: "2026-03-15T18:00:00Z", scanCount: 89 },
  { id: "proj_004", name: "Blog", url: "https://blog.johndoe.com", score: 67, lastScanned: "2026-03-15T10:45:00Z", scanCount: 23 },
  { id: "proj_005", name: "Startup App", url: "https://app.startup.io", score: 23, lastScanned: "2026-03-14T22:00:00Z", scanCount: 5 },
  { id: "proj_006", name: "Documentation", url: "https://docs.acme.dev", score: 88, lastScanned: "2026-03-13T09:00:00Z", scanCount: 34 },
];

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = projects.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-neutral-400 mt-1">{projects.length} projects tracked</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Project
        </Button>
      </div>

      <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm"
        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
      />

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-white mb-4">New Project</h2>
            <div className="space-y-4">
              <Input label="Project Name" placeholder="My Awesome App" />
              <Input label="URL" placeholder="https://your-app.com" type="url" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button>Create Project</Button>
            </div>
          </div>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => <ProjectCard key={project.id} {...project} />)}
        </div>
      ) : (
        <div className="text-center py-16"><p className="text-neutral-500">No projects match your search.</p></div>
      )}
    </div>
  );
}
