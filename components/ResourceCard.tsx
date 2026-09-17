"use client";

import { useState, useTransition } from "react";
import { Trash2, ExternalLink, Copy, Eye } from "lucide-react";
import { Resource } from "@/lib/types";
import { toast } from "sonner";
import { deleteResourceAction } from "@/app/actions";
import { announce, copyText, inspectResource, resourceDeleted } from "@/lib/wiki-bus";
import ConfirmDialog from "./ConfirmDialog";

interface ResourceCardProps {
  resource: Resource;
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"copied" | "fallback" | null>(null);
  const [fallbackText, setFallbackText] = useState("");

  const structured = `Resource: ${resource.title}\nDescription: ${resource.description}\nCategory: ${resource.category}\nTags: ${resource.tags.join(", ")}\nLink: ${resource.link}\n---`;

  const copyForAI = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await copyText(structured);
    setCopyStatus(result);
    if (result === "copied") {
      toast.success("Copied structured block for your AI agent");
      announce("Copied structured block for AI");
    } else {
      setFallbackText(structured);
      toast.message("Clipboard blocked — copy from the text box");
    }
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteResourceAction(resource.id);
        resourceDeleted(result.resource);
        announce(`Deleted ${resource.title}`);
        toast.success("Resource removed");
        setConfirmOpen(false);
      } catch {
        toast.error("Failed to delete resource");
      }
    });
  };

  return (
    <article
      className={`wiki-card relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden transition-opacity duration-300 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="relative h-52 overflow-hidden bg-zinc-950">
        <img
          src={resource.image}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 motion-reduce:transform-none motion-reduce:transition-none"
          loading="lazy"
        />
        <div className="absolute top-4 right-4 z-20">
          <span className="px-3 py-1 text-xs font-medium bg-black/70 backdrop-blur rounded-full text-white">
            {resource.category}
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col justify-between min-h-[260px]">
        <div>
          <h3 className="font-semibold text-xl leading-tight pr-8 line-clamp-2 mb-3 text-white">
            {resource.title}
          </h3>
          <p className="text-zinc-400 text-sm line-clamp-3 mb-5">{resource.description}</p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {resource.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2.5 py-px bg-zinc-800 text-zinc-400 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/50">
          <button
            type="button"
            onClick={(e) => void copyForAI(e)}
            aria-label={`Copy structured AI prompt block for ${resource.title}`}
            className="flex items-center gap-1 min-h-11 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none px-2 py-1 rounded"
          >
            <Copy aria-hidden="true" className="w-3.5 h-3.5" /> <span>Copy for AI</span>
          </button>
          {copyStatus && (
            <span data-testid="wiki-copy-status" className="text-[10px] text-zinc-500">
              {copyStatus === "copied" ? "Copied" : "Clipboard fallback ready"}
            </span>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => inspectResource(resource)}
              aria-label={`Inspect ${resource.title}`}
              className="p-2 min-h-11 min-w-11 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              <Eye aria-hidden="true" className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={isPending}
              aria-label={`Delete resource: ${resource.title}`}
              className="p-2 min-h-11 min-w-11 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="w-4 h-4" />
            </button>
            <a
              href={resource.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open external link for ${resource.title}`}
              className="p-2 min-h-11 min-w-11 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none inline-flex items-center justify-center"
            >
              <ExternalLink aria-hidden="true" className="w-4 h-4" />
            </a>
          </div>
        </div>
        {copyStatus === "fallback" && (
          <textarea
            data-testid="wiki-clipboard-fallback"
            readOnly
            value={fallbackText}
            className="mt-3 w-full min-h-[96px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300"
            aria-label="Clipboard fallback"
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete resource?"
        description={`Delete this resource: "${resource.title}"? You can undo afterwards.`}
        onConfirm={handleDelete}
      />
    </article>
  );
}
