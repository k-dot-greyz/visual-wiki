"use client";

import { useTransition } from "react";
import { Trash2, ExternalLink, Copy } from "lucide-react";
import { Resource } from "@/lib/types";
import { toast } from "sonner";
import { deleteResourceAction } from "@/app/actions";

interface ResourceCardProps {
  resource: Resource;
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  const [isPending, startTransition] = useTransition();

  const copyForAI = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = `Resource: ${resource.title}\nDescription: ${resource.description}\nCategory: ${resource.category}\nTags: ${resource.tags.join(", ")}\nLink: ${resource.link}\n---`;
    navigator.clipboard.writeText(text);
    toast.success("Copied structured block for your AI agent");
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete this resource: "${resource.title}"?`)) {
      startTransition(async () => {
        try {
          await deleteResourceAction(resource.id);
          toast.success("Resource removed");
        } catch (err) {
          toast.error("Failed to delete resource");
        }
      });
    }
  };

  return (
    <article
      className={`wiki-card group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden transition-opacity duration-300 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Visual Header / Thumbnail */}
      <div className="relative h-52 overflow-hidden bg-zinc-950">
        <img
          src={resource.image}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 motion-reduce:transform-none motion-reduce:transition-none"
          loading="lazy"
        />
        <div className="absolute top-4 right-4 z-20">
          <span className="px-3 py-1 text-xs font-medium bg-black/70 backdrop-blur rounded-full text-white">
            {resource.category}
          </span>
        </div>
      </div>

      {/* Resource Card Content */}
      <div className="p-6 flex flex-col justify-between min-h-[260px]">
        <div>
          <h3 className="font-semibold text-xl leading-tight pr-8 line-clamp-2 mb-3 text-white">
            <a
              href={resource.link}
              target="_blank"
              rel="noopener noreferrer"
              className="focus:outline-none after:absolute after:inset-0 after:z-10 focus-visible:after:ring-2 focus-visible:after:ring-indigo-500 focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-zinc-900 rounded-3xl"
            >
              {resource.title}
            </a>
          </h3>
          <p className="text-zinc-400 text-sm line-clamp-3 mb-5">
            {resource.description}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-5 relative z-20">
            {resource.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[10px] px-2.5 py-px bg-zinc-800 text-zinc-400 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="flex items-center justify-between text-xs text-zinc-400 relative z-20 pt-2 border-t border-zinc-800/50">
          <button
            onClick={copyForAI}
            aria-label={`Copy structured AI prompt block for ${resource.title}`}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none px-2 py-1 rounded"
          >
            <Copy aria-hidden="true" className="w-3.5 h-3.5" /> <span>Copy for AI</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isPending}
              aria-label={`Delete resource: ${resource.title}`}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="w-4 h-4" />
            </button>
            <a
              href={resource.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Open external link for ${resource.title}`}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              <ExternalLink aria-hidden="true" className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
