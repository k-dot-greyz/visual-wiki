"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Resource } from "@/lib/types";

interface AddResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (resource: Omit<Resource, "id" | "addedAt">) => void;
}

export default function AddResourceDialog({
  open,
  onOpenChange,
  onAdd,
}: AddResourceDialogProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "example" as Resource["category"],
    tags: "",
    link: "",
    image: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.link) {
      alert("Title and link are required");
      return;
    }

    const tagsArray = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onAdd({
      title: form.title,
      description: form.description || "No description yet.",
      category: form.category,
      tags: tagsArray.length ? tagsArray : ["new"],
      link: form.link,
      image:
        form.image ||
        `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/800/450`,
    });

    setForm({
      title: "",
      description: "",
      category: "example",
      tags: "",
      link: "",
      image: "",
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-800">
          <h2 className="text-2xl font-semibold tracking-tight">
            Add new resource
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-400">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="React Three Fiber — Official Docs"
              className="w-full bg-zinc-950 border border-zinc-800 h-12 rounded-xl px-4"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-400">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="The single source of truth..."
              className="w-full bg-zinc-950 border border-zinc-800 min-h-[100px] rounded-xl p-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-400">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as Resource["category"],
                  })
                }
                className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-sm"
              >
                <option value="official">Official</option>
                <option value="example">Example / Demo</option>
                <option value="tutorial">Tutorial</option>
                <option value="repo">Repository</option>
                <option value="pattern">Pattern / Technique</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-400">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="react, three, physics"
                className="w-full bg-zinc-950 border border-zinc-800 h-12 rounded-xl px-4"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-400">
              Link
            </label>
            <input
              type="url"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://..."
              className="w-full bg-zinc-950 border border-zinc-800 h-12 rounded-xl px-4"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-400">
              Image URL (optional)
            </label>
            <input
              type="url"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="Leave blank for random"
              className="w-full bg-zinc-950 border border-zinc-800 h-12 rounded-xl px-4"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 border border-zinc-700 rounded-3xl hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-12 bg-white text-black hover:bg-zinc-200 rounded-3xl font-semibold"
            >
              Add to Garden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
