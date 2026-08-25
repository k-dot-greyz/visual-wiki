"use client";

import type { PlayableCard } from "@/lib/playable-card";
import { externalLinkAttrs, planEntry, runtimeStubCopy } from "@/lib/run-pane";

function OpenExternally({ href, label }: { href: string; label: string }) {
  const link = externalLinkAttrs();
  return (
    <a
      href={href}
      target={link.target}
      rel={link.rel}
      referrerPolicy={link.referrerPolicy as React.HTMLAttributeReferrerPolicy}
      className="inline-flex mt-4 text-sm text-indigo-300 hover:text-indigo-200 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
    >
      {label}
    </a>
  );
}

export default function RunPane({ card }: { card: PlayableCard }) {
  const plan = card.runtime === "media" || card.runtime === "link" ? planEntry(card.entry) : null;

  if (plan?.kind === "audio" || plan?.kind === "video") {
    return (
      <section aria-label="Media preview" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-semibold tracking-tight mb-4">Run</h2>
        {plan.kind === "audio" ? (
          <audio
            controls
            preload="none"
            src={plan.src}
            className="w-full"
            aria-label={`Audio from ${plan.host}`}
          >
            Your browser cannot play this audio file.
          </audio>
        ) : (
          <video
            controls
            preload="none"
            playsInline
            src={plan.src}
            className="w-full h-80 rounded-2xl border border-zinc-800 bg-black"
            aria-label={`Video from ${plan.host}`}
          >
            Your browser cannot play this video file.
          </video>
        )}
        <p className="text-xs text-zinc-500 mt-3">
          Native player, no third-party frame. Served by <span className="font-mono">{plan.host}</span>.
        </p>
      </section>
    );
  }

  if (plan?.kind === "link") {
    return (
      <section aria-label="External site" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-semibold tracking-tight mb-3">Run</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          This repo publishes a live site at <span className="font-mono text-zinc-300">{plan.host}</span>. We do
          not frame third-party pages, so it opens in its own tab.
        </p>
        <div className="flex flex-col gap-1">
          <OpenExternally href={plan.href} label={`Open ${plan.host} in a new tab ↗`} />
          <OpenExternally href={card.repo} label="Open on GitHub ↗" />
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Runtime stub" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold tracking-tight mb-3">Run</h2>
      <p className="text-sm text-zinc-400 leading-relaxed">{runtimeStubCopy(card.runtime)}</p>
      <OpenExternally href={card.repo} label="Open on GitHub ↗" />
    </section>
  );
}
