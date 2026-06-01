"use client";

import { useState } from "react";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { Resource } from "@/lib/types";
import AddResourceDialog from "./AddResourceDialog";

interface HeaderActionsProps {
  resources: Resource[];
}

export default function HeaderActions({ resources }: HeaderActionsProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const exportForAI = () => {
    if (resources.length === 0) {
      toast.error("No resources to export yet!");
      return;
    }

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

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={exportForAI}
        className="flex items-center gap-2 px-6 h-12 rounded-3xl border border-zinc-700 hover:bg-zinc-900 active:bg-zinc-800 transition-colors text-sm font-medium cursor-pointer text-zinc-300"
      >
        <Download className="w-4 h-4" /> Export for AI
      </button>
      <button
        onClick={() => setIsAddOpen(true)}
        className="flex items-center gap-2 px-6 h-12 bg-white text-black hover:bg-zinc-200 active:bg-zinc-300 rounded-3xl text-sm font-semibold transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Add Resource
      </button>

      <AddResourceDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
    </div>
  );
}
