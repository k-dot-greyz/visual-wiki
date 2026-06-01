"use client";

import { useActionState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { addResourceAction } from "@/app/actions";

interface AddResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddResourceDialog({
  open,
  onOpenChange,
}: AddResourceDialogProps) {
  const [state, formAction, isPending] = useActionState(addResourceAction, null);

  useEffect(() => {
    if (state?.success) {
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Modal Overlay */}
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur z-50 transition-opacity" />

        {/* Modal Content container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <Dialog.Content
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden focus:outline-none shadow-2xl flex flex-col max-h-[90vh] transition-all"
            onOpenAutoFocus={(e) => {
              // Focus the first input field on open
              const titleInput = document.getElementById("title");
              if (titleInput) {
                e.preventDefault();
                titleInput.focus();
              }
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-800 shrink-0">
              <Dialog.Title className="text-2xl font-semibold tracking-tight text-white">
                Add new resource
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close dialog"
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none p-1 rounded"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>

            {/* Scrollable Form Body */}
            <form action={formAction} className="p-8 space-y-6 overflow-y-auto">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2 text-zinc-400">
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="React Three Fiber — Official Docs"
                  className="w-full bg-zinc-950 border border-zinc-800 h-12 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2 text-zinc-400">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="The single source of truth..."
                  className="w-full bg-zinc-950 border border-zinc-800 min-h-[100px] rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-2 text-zinc-400">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    defaultValue="example"
                    className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <option value="official">Official</option>
                    <option value="example">Example / Demo</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="repo">Repository</option>
                    <option value="pattern">Pattern / Technique</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium mb-2 text-zinc-400">
                    Tags (comma separated)
                  </label>
                  <input
                    id="tags"
                    name="tags"
                    type="text"
                    placeholder="react, three, physics"
                    className="w-full bg-zinc-950 border border-zinc-800 h-12 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="link" className="block text-sm font-medium mb-2 text-zinc-400">
                  Link
                </label>
                <input
                  id="link"
                  name="link"
                  type="url"
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-800 h-12 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="image" className="block text-sm font-medium mb-2 text-zinc-400">
                  Image URL (optional)
                </label>
                <input
                  id="image"
                  name="image"
                  type="url"
                  placeholder="Leave blank for random"
                  className="w-full bg-zinc-950 border border-zinc-800 h-12 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-4 shrink-0">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    disabled={isPending}
                    className="flex-1 h-12 border border-zinc-700 rounded-3xl hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50 text-zinc-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 h-12 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-500 rounded-3xl font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                >
                  {isPending ? "Adding..." : "Add to Garden"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
