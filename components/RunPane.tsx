"use client";

import type { PlayableCard } from "@/lib/playable-card";
import { detectMediaKind, externalPreviewCopy } from "@/lib/run-pane";

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex mt-4 text-sm text-indigo-300 hover:text-indigo-200 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
    >
      {label}
    </a>
  );
}

export default function RunPane({ card }: { card: PlayableCard }) {
  const entry = card.entry;

  if (card.runtime === "redirect" && entry) {
    const media = detectMediaKind(entry);

    return (
      <section aria-label="External preview" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-semibold tracking-tight mb-3">Run</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">{externalPreviewCopy(card)}</p>

        {media === "video" && (
          <video
            className="w-full mt-4 rounded-2xl border border-zinc-800 bg-black"
            controls
            playsInline
            preload="metadata"
            src={entry}
          >
            <track kind="captions" />
          </video>
        )}

        {media === "audio" && (
          <audio className="w-full mt-4" controls preload="metadata" src={entry}>
            <track kind="captions" />
          </audio>
        )}

        <ExternalLink href={entry} label={media ? "Open source in new tab" : "Open live preview in new tab"} />
        <ExternalLink href={card.repo} label="Open on GitHub" />
      </section>
    );
  }

  return (
    <section aria-label="Runtime stub" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold tracking-tight mb-3">Run</h2>
      <p className="text-sm text-zinc-400 leading-relaxed">{externalPreviewCopy(card)}</p>
      <ExternalLink href={card.repo} label="Open on GitHub" />
    </section>
  );
}
