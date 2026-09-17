"use client";

import { useState } from "react";
import { Plus, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Resource } from "@/lib/types";
import { importResourcesAction } from "@/app/actions";
import { announce, copyText } from "@/lib/wiki-bus";
import AddResourceDialog from "./AddResourceDialog";

interface HeaderActionsProps {
  resources: Resource[];
}

export default function HeaderActions({ resources }: HeaderActionsProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);

  const exportForAI = async () => {
    if (resources.length === 0) {
      toast.error("No resources to export yet!");
      return;
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      total: resources.length,
      resources: resources.map((r) => ({
        id: r.id,
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const prompt =
      `Here is my curated visual wiki (${resources.length} resources):\n\n` +
      resources.map((r) => `• ${r.title} — ${r.description} [${r.link}]`).join("\n");

    const copied = await copyText(prompt);
    if (copied === "copied") {
      toast.success("JSON downloaded + AI-ready prompt copied!");
    } else {
      setFallback(prompt);
      toast.message("JSON downloaded. Clipboard blocked — copy from the text box.");
    }
  };

  async function onImportFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as {
        resources?: Array<{ title?: string; link?: string }>;
      };
      const incoming = Array.isArray(parsed) ? parsed : parsed.resources;
      if (!Array.isArray(incoming)) {
        toast.error("Import JSON must include a resources array");
        return;
      }
      const result = await importResourcesAction(incoming);
      announce(`Imported ${result.added} resources`);
      toast.success(`Imported ${result.added}, skipped ${result.duplicates} duplicates`);
    } catch {
      toast.error("Could not parse import JSON");
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex items-center gap-3 flex-wrap justify-end">
        <label className="flex items-center gap-2 px-6 h-12 rounded-3xl border border-zinc-700 hover:bg-zinc-900 text-sm font-medium cursor-pointer text-zinc-300 focus-within:ring-2 focus-within:ring-indigo-500">
          <Upload aria-hidden="true" className="w-4 h-4" /> Import JSON
          <input
            data-testid="wiki-import-file"
            type="file"
            accept="application/json,.json"
            aria-label="Import JSON"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImportFile(file);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => void exportForAI()}
          aria-label="Export all resources to JSON and copy AI agent prompt to clipboard"
          className="flex items-center gap-2 px-6 h-12 rounded-3xl border border-zinc-700 hover:bg-zinc-900 active:bg-zinc-800 transition-colors text-sm font-medium cursor-pointer text-zinc-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <Download aria-hidden="true" className="w-4 h-4" /> Export for AI
        </button>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          aria-haspopup="dialog"
          aria-label="Add new resource to garden"
          className="flex items-center gap-2 px-6 h-12 bg-white text-black hover:bg-zinc-200 active:bg-zinc-300 rounded-3xl text-sm font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <Plus aria-hidden="true" className="w-4 h-4" /> Add Resource
        </button>
      </div>
      {fallback && (
        <textarea
          data-testid="wiki-clipboard-fallback"
          readOnly
          value={fallback}
          aria-label="Clipboard fallback"
          className="w-full max-w-md min-h-[96px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300"
        />
      )}

      <AddResourceDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
    </div>
  );
}
