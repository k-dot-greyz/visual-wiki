"use client";

import { Trash2, ExternalLink, Copy } from "lucide-react";
import { Resource } from "@/lib/types";
import { toast } from "sonner";

interface ResourceCardProps {
  resource: Resource;
  onDelete: (id: string) => void;
}

export default function ResourceCard({
  resource,
  onDelete,
}: ResourceCardProps) {
  const copyForAI = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Resource: ${resource.title}\nDescription: ${resource.description}\nCategory: ${resource.category}\nTags: ${resource.tags.join(", ")}\nLink: ${resource.link}\n---`;
    navigator.clipboard.writeText(text);
    toast.success("Copied structured block for your AI agent");
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this resource?")) {
      onDelete(resource.id);
      toast.error("Resource removed");
    }
  };

  return (
    <div
      className="wiki-card group bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden cursor-pointer"
      onClick={() => window.open(resource.link, "_blank")}
    >
      <div className="relative h-52 overflow-hidden">
        <img
          src={resource.image}
          alt={resource.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 text-xs font-medium bg-black/70 backdrop-blur rounded-full text-white">
            {resource.category}
          </span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="font-semibold text-xl leading-tight pr-8 line-clamp-2 mb-3">
          {resource.title}
        </h3>
        <p className="text-zinc-400 text-sm line-clamp-3 mb-5">
          {resource.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {resource.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] px-2.5 py-px bg-zinc-800 text-zinc-400 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs">
          <button
            onClick={copyForAI}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> <span>Copy for AI</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <a
              href={resource.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
