import Link from "next/link";
import { Suspense } from "react";
import PlaygroundShell from "@/components/PlaygroundShell";

export const metadata = {
  title: "playground • visual wiki",
  description: "Hydrate a public GitHub repo into a playable card — tree display, external redirect preview, stub runtimes.",
};

export default function PlayPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <div className="max-w-7xl w-full mx-auto px-8 py-16 flex flex-col gap-12">
        <header className="flex flex-col gap-4">
          <Link
            href="/"
            className="text-xs font-mono text-zinc-500 hover:text-indigo-300 w-fit focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
          >
            ← Garden
          </Link>
          <h1 className="font-semibold text-5xl tracking-tighter">playground</h1>
          <p className="text-zinc-400 max-w-xl">
            Paste a public GitHub URL. We hydrate metadata and a truncated file tree.
            Live sites open in a new tab — no third-party iframes. Node in-tab and hosted venv are the next pipes.
          </p>
        </header>
        <main>
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading playground…</p>}>
            <PlaygroundShell />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
