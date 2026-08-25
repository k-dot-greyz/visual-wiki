"use client";

import type { PlayableCard } from "@/lib/playable-card";
import { surfaceFor } from "@/lib/entry-runtime";
import { runtimeStubCopy, surfaceCopy } from "@/lib/run-pane";

function OutboundLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex mt-4 text-sm text-indigo-300 hover:text-indigo-200 underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}

export default function RunPane({ card }: { card: PlayableCard }) {
  const surface = surfaceFor(card);

  if (surface.kind === "audio") {
    return (
      <section aria-label="HTML5 audio player" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-semibold tracking-tight mb-3">Play</h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">{surfaceCopy(surface)}</p>
        <audio controls preload="metadata" src={surface.src} className="w-full">
          <a href={surface.src} rel="noopener noreferrer">
            Open audio file
          </a>
        </audio>
        <OutboundLink href={surface.src}>Open source</OutboundLink>
      </section>
    );
  }

  if (surface.kind === "video") {
    return (
      <section aria-label="HTML5 video player" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-semibold tracking-tight mb-3">Play</h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">{surfaceCopy(surface)}</p>
        <video controls preload="metadata" playsInline src={surface.src} className="w-full rounded-2xl bg-black">
          <a href={surface.src} rel="noopener noreferrer">
            Open video file
          </a>
        </video>
        <OutboundLink href={surface.src}>Open source</OutboundLink>
      </section>
    );
  }

  if (surface.kind === "redirect") {
    return (
      <section aria-label="Live site redirect" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-semibold tracking-tight mb-3">Open</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">{surfaceCopy(surface)}</p>
        <OutboundLink href={surface.href}>Open live site</OutboundLink>
      </section>
    );
  }

  return (
    <section aria-label="Runtime stub" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold tracking-tight mb-3">Run</h2>
      <p className="text-sm text-zinc-400 leading-relaxed">
        {surface.kind === "stub" ? runtimeStubCopy(surface.runtime) : runtimeStubCopy("none")}
      </p>
      <OutboundLink href={card.repo}>Open on GitHub</OutboundLink>
    </section>
  );
}
