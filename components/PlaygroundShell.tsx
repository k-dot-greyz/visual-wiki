"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { HydrateOk } from "@/lib/github-hydrate";
import RepoTree from "./RepoTree";
import RunPane from "./RunPane";
import OglDisplay from "./OglDisplay";
import ExtraMotionToggle from "./ExtraMotionToggle";

export default function PlaygroundShell() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("repo") ?? "";
  const [repo, setRepo] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HydrateOk | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!initial) return;
    const controller = new AbortController();
    void load(initial, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  async function load(raw: string, signal?: AbortSignal) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/play?repo=${encodeURIComponent(raw)}`, { signal });
      const body = await res.json();
      if (signal?.aborted) return;
      if (!body.ok) {
        setResult(null);
        setError(body.error ?? "Could not hydrate that repository.");
        return;
      }
      setResult(body as HydrateOk);
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      setResult(null);
      setError("Could not hydrate that repository.");
    } finally {
      if (!signal?.aborted) setPending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = repo.trim();
    router.push(`/play?repo=${encodeURIComponent(next)}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
        <label className="sr-only" htmlFor="play-repo">
          Public GitHub repository
        </label>
        <input
          id="play-repo"
          name="repo"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="owner/name or https://github.com/owner/name"
          className="flex-1 h-12 rounded-3xl bg-zinc-900 border border-zinc-700 px-5 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        />
        <button
          type="submit"
          className="h-12 px-6 rounded-3xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          Hydrate
        </button>
      </form>

      {pending && <p className="text-sm text-zinc-500">Talking to GitHub…</p>}
      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-6">
          <div>
            <p className="font-mono text-xs text-indigo-400 uppercase tracking-widest mb-1">Playable</p>
            <h2 className="text-3xl font-semibold tracking-tight">{result.title}</h2>
            <p className="text-zinc-400 mt-2 max-w-2xl">{result.description}</p>
            {result.language && (
              <p className="font-mono text-xs text-zinc-500 mt-2">{result.language}</p>
            )}
          </div>
          <OglDisplay tree={result.tree} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RepoTree tree={result.tree} truncated={result.truncated} />
            <RunPane card={result.card} />
          </div>
        </div>
      )}

      <footer className="pt-4 border-t border-zinc-900 flex items-center justify-between">
        <p className="text-xs text-zinc-600">
          Public repos only. WebGL is display chrome, not a compiler.
        </p>
        <ExtraMotionToggle />
      </footer>
    </div>
  );
}
