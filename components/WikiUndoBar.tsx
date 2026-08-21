"use client";

import { useEffect, useState } from "react";
import { restoreResourceAction } from "@/app/actions";
import { announce, WIKI_DELETED } from "@/lib/wiki-bus";
import type { Resource } from "@/lib/types";

export default function WikiUndoBar() {
  const [deleted, setDeleted] = useState<Resource | null>(null);

  useEffect(() => {
    const onDeleted = (event: Event) => {
      setDeleted((event as CustomEvent<Resource>).detail ?? null);
    };
    window.addEventListener(WIKI_DELETED, onDeleted);
    return () => window.removeEventListener(WIKI_DELETED, onDeleted);
  }, []);

  if (!deleted) return null;

  async function undo() {
    if (!deleted) return;
    const result = await restoreResourceAction(deleted);
    if (result.success) {
      announce(`Restored ${deleted.title}`);
      setDeleted(null);
    }
  }

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-3 rounded-3xl border border-zinc-700 bg-zinc-900 px-5 py-3 shadow-2xl"
    >
      <p className="text-sm text-zinc-300">Removed {deleted.title}</p>
      <button
        type="button"
        data-testid="wiki-undo-delete"
        onClick={() => void undo()}
        className="h-11 px-4 rounded-2xl bg-white text-black text-sm font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
      >
        Undo
      </button>
    </div>
  );
}
