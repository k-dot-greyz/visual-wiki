"use client";

import type { PlayableCard } from "@/lib/playable-card";
import { iframeSandbox, runtimeStubCopy } from "@/lib/run-pane";

/**
 * Renders a card's live preview or runtime information.
 *
 * @param card - The card whose runtime interface is displayed
 */
export default function RunPane({ card }: { card: PlayableCard }) {
  const attrs = iframeSandbox();

  if (card.runtime === "iframe" && card.entry) {
    return (
      <section aria-label="Live preview" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-semibold tracking-tight mb-4">Run</h2>
        <iframe
          src={card.entry}
          title="Sandboxed live preview"
          className="w-full h-80 rounded-2xl border border-zinc-800 bg-black"
          sandbox={attrs.sandbox}
          referrerPolicy="no-referrer"
        />
      </section>
    );
  }

  return (
    <section aria-label="Runtime stub" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold tracking-tight mb-3">Run</h2>
      <p className="text-sm text-zinc-400 leading-relaxed">{runtimeStubCopy(card.runtime)}</p>
      <a
        href={card.repo}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex mt-4 text-sm text-indigo-300 hover:text-indigo-200 underline-offset-4 hover:underline"
      >
        Open on GitHub
      </a>
    </section>
  );
}
