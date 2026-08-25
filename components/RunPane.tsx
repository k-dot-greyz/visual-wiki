"use client";

import type { PlayableCard } from "@/lib/playable-card";
import { classifyEntry, runtimeStubCopy } from "@/lib/run-pane";

const PANE_CLASS = "rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6";

export default function RunPane({ card }: { card: PlayableCard }) {
  const hasLiveEntry = Boolean(card.entry) && (card.runtime === "external" || card.runtime === "media");

  if (hasLiveEntry && card.entry) {
    const kind = classifyEntry(card.entry);

    if (kind === "video") {
      return (
        <section aria-label="Live preview" className={PANE_CLASS}>
          <h2 className="text-sm font-semibold tracking-tight mb-4">Run</h2>
          <video
            data-run="media"
            src={card.entry}
            controls
            preload="metadata"
            playsInline
            crossOrigin="anonymous"
            className="w-full h-80 rounded-2xl border border-zinc-800 bg-black"
          >
            <a href={card.entry} target="_blank" rel="noopener noreferrer nofollow">
              Open media in a new tab
            </a>
          </video>
        </section>
      );
    }

    if (kind === "audio") {
      return (
        <section aria-label="Live preview" className={PANE_CLASS}>
          <h2 className="text-sm font-semibold tracking-tight mb-4">Run</h2>
          <audio
            data-run="media"
            src={card.entry}
            controls
            preload="metadata"
            crossOrigin="anonymous"
            className="w-full"
          >
            <a href={card.entry} target="_blank" rel="noopener noreferrer nofollow">
              Open audio in a new tab
            </a>
          </audio>
        </section>
      );
    }

    return (
      <section aria-label="Live preview" className={PANE_CLASS}>
        <h2 className="text-sm font-semibold tracking-tight mb-3">Run</h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
          Live sites open in a new tab — we don&apos;t embed untrusted pages in the wiki.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            data-run="external"
            href={card.entry}
            target="_blank"
            rel="noopener noreferrer nofollow"
            referrerPolicy="no-referrer"
            className="inline-flex items-center gap-1 h-10 px-5 rounded-3xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            Open live homepage ↗
          </a>
          <a
            data-run="repo"
            href={card.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-indigo-300 hover:text-indigo-200 underline-offset-4 hover:underline"
          >
            Open on GitHub
          </a>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Runtime stub" className={PANE_CLASS}>
      <h2 className="text-sm font-semibold tracking-tight mb-3">Run</h2>
      <p className="text-sm text-zinc-400 leading-relaxed">{runtimeStubCopy(card.runtime)}</p>
      <a
        data-run="repo"
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
