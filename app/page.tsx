"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Download, Shuffle } from "lucide-react";
import ResourceCard from "@/components/ResourceCard";
import AddResourceDialog from "@/components/AddResourceDialog";
import { Resource } from "@/lib/types";
import { toast } from "sonner";

const initialResources: Resource[] = [
  {
    id: "1",
    title: "React Three Fiber — Official Docs",
    description:
      "The single source of truth. Declarative, performant, and beautifully documented.",
    category: "official",
    tags: ["core", "react", "docs"],
    link: "https://docs.pmnd.rs/react-three-fiber",
    image: "https://picsum.photos/id/1015/800/450",
    addedAt: "2026-01-12",
  },
  {
    id: "2",
    title: "Anti-Gravity Racing Demo",
    description:
      "Beautiful example of vehicle physics + custom shaders in R3F. Perfect reference for track feel.",
    category: "example",
    tags: ["physics", "racing", "shaders"],
    link: "https://github.com/pmndrs/drei",
    image: "https://picsum.photos/id/1074/800/450",
    addedAt: "2026-02-03",
  },
  {
    id: "3",
    title: "Three.js Journey — Bruno Simon",
    description:
      "The best paid course on the planet for mastering Three.js fundamentals.",
    category: "tutorial",
    tags: ["course", "beginner", "bruno"],
    link: "https://threejs-journey.com/",
    image: "https://picsum.photos/id/106/800/450",
    addedAt: "2026-01-20",
  },
  {
    id: "4",
    title: "@react-three/drei",
    description:
      "Essential helpers, controls, and abstractions. You will use this every single day.",
    category: "repo",
    tags: ["helpers", "controls", "must-have"],
    link: "https://github.com/pmndrs/drei",
    image: "https://picsum.photos/id/160/800/450",
    addedAt: "2026-01-15",
  },
  {
    id: "5",
    title: "R3F Performance Patterns",
    description:
      "Advanced techniques for keeping 60fps even with thousands of objects.",
    category: "pattern",
    tags: ["performance", "optimization", "advanced"],
    link: "https://docs.pmnd.rs/react-three-fiber/advanced/performance",
    image: "https://picsum.photos/id/201/800/450",
    addedAt: "2026-02-10",
  },
];

export default function VisualWiki() {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("visual-wiki-resources");
    if (saved) setResources(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("visual-wiki-resources", JSON.stringify(resources));
  }, [resources]);

  const filtered = resources
    .filter(
      (r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
    )
    .filter((r) => !categoryFilter || r.category === categoryFilter);

  const exportForAI = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      total: resources.length,
      resources: resources.map((r) => ({
        title: r.title,
        description: r.description,
        category: r.category,
        tags: r.tags,
        link: r.link,
      })),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visual-wiki-${new Date().toISOString().split("T")[0]}.json`;
    a.click();

    const prompt =
      `Here is my curated visual wiki (${resources.length} resources):\n\n` +
      resources
        .map((r) => `• ${r.title} — ${r.description} [${r.link}]`)
        .join("\n");

    navigator.clipboard.writeText(prompt);
    toast.success("JSON downloaded + AI-ready prompt copied!");
  };

  const addResource = (newRes: Omit<Resource, "id" | "addedAt">) => {
    const resource: Resource = {
      ...newRes,
      id: Date.now().toString(36),
      addedAt: new Date().toISOString(),
    };
    setResources([resource, ...resources]);
    setIsAddOpen(false);
    toast.success("Resource added to the garden 🌱");
  };

  const deleteResource = (id: string) => {
    setResources(resources.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-3xl bg-indigo-600 flex items-center justify-center">
                <span className="text-3xl">🌿</span>
              </div>
              <div>
                <h1 className="font-semibold text-6xl tracking-tighter">
                  visual wiki
                </h1>
                <p className="text-2xl text-zinc-400 -mt-2">
                  your personal knowledge garden
                </p>
              </div>
            </div>
            <p className="text-zinc-500 max-w-md">
              Curate once. Feed your AI agents forever.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportForAI}
              className="flex items-center gap-2 px-6 h-12 rounded-3xl border border-zinc-700 hover:bg-zinc-900 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Export for AI
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 px-6 h-12 bg-white text-black hover:bg-zinc-200 rounded-3xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Resource
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-4 text-zinc-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search titles, descriptions, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-14 pl-14 bg-zinc-900 border border-zinc-800 rounded-3xl text-lg placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-14 px-6 bg-zinc-900 border border-zinc-800 rounded-3xl text-sm font-medium"
          >
            <option value="">All Categories</option>
            <option value="official">Official</option>
            <option value="example">Examples &amp; Demos</option>
            <option value="tutorial">Tutorials</option>
            <option value="repo">Repositories</option>
            <option value="pattern">Patterns</option>
          </select>

          <button
            onClick={() => {
              if (resources.length === 0) return;
              const random =
                resources[Math.floor(Math.random() * resources.length)];
              window.open(random.link, "_blank");
            }}
            className="h-14 px-6 flex items-center gap-2 border border-zinc-700 hover:bg-zinc-900 rounded-3xl text-sm font-medium"
          >
            <Shuffle className="w-4 h-4" /> Random
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length > 0 ? (
            filtered.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onDelete={deleteResource}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-6xl mb-4">🌱</p>
              <p className="text-xl text-zinc-400">
                No resources found. Add your first one!
              </p>
            </div>
          )}
        </div>

        <div className="mt-16 text-center text-xs text-zinc-500">
          {resources.length} resources • Last synced{" "}
          {new Date().toLocaleDateString()}
        </div>
      </div>

      <AddResourceDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdd={addResource}
      />
    </div>
  );
}
