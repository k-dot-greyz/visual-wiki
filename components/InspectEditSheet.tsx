"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateResourceAction } from "@/app/actions";
import { announce, WIKI_INSPECT } from "@/lib/wiki-bus";
import type { Resource } from "@/lib/types";

export default function InspectEditSheet() {
  const [resource, setResource] = useState<Resource | null>(null);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onInspect = (event: Event) => {
      const next = (event as CustomEvent<Resource>).detail;
      setResource(next);
      setTitle(next.title);
      setDescription(next.description);
      setEditing(false);
    };
    window.addEventListener(WIKI_INSPECT, onInspect);
    return () => window.removeEventListener(WIKI_INSPECT, onInspect);
  }, []);

  const open = Boolean(resource);

  async function save() {
    if (!resource) return;
    const result = await updateResourceAction(resource.id, { title, description });
    if (!result.success) {
      toast.error(result.error ?? "Could not save");
      return;
    }
    announce("Resource updated");
    setResource({ ...resource, title, description });
    setEditing(false);
    router.refresh();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setResource(null);
          setEditing(false);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur z-50" />
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <Dialog.Content
            aria-describedby="inspect-description"
            className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-800">
              <Dialog.Title className="text-2xl font-semibold tracking-tight text-white">
                Inspect resource
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close dialog"
                  className="text-zinc-400 hover:text-white p-1 rounded focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description id="inspect-description" className="sr-only">
              Resource details, original link, and edit controls.
            </Dialog.Description>
            {resource && (
              <div className="p-8 space-y-5 overflow-y-auto">
                {editing ? (
                  <>
                    <label htmlFor="inspect-title" className="block text-sm text-zinc-400">
                      Title
                    </label>
                    <input
                      id="inspect-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    />
                    <label htmlFor="inspect-description" className="block text-sm text-zinc-400">
                      Description
                    </label>
                    <textarea
                      id="inspect-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full min-h-[120px] bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void save()}
                      className="w-full h-12 bg-white text-black rounded-3xl font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    >
                      Save changes
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-white">{resource.title}</h3>
                    <p className="text-sm text-zinc-400">{resource.description}</p>
                    <p className="text-xs uppercase tracking-widest text-zinc-500">{resource.category}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resource.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-2.5 py-px bg-zinc-800 text-zinc-400 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <a
                      href={resource.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm text-indigo-300 hover:text-indigo-200 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
                    >
                      Open original resource
                    </a>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="w-full h-12 border border-zinc-700 rounded-3xl text-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    >
                      Edit resource
                    </button>
                  </>
                )}
              </div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
