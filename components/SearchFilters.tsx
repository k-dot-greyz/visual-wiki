"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Shuffle, Zap, Link2, Loader2 } from "lucide-react";
import { applyGardenVisibility } from "@/lib/dexGardenFilters";
import { Resource } from "@/lib/types";
import { toast } from "sonner";

interface SearchFiltersProps {
  initialSearch: string;
  initialCategory: string;
  initialShowArchive: boolean;
  initialShowConfig: boolean;
  resources: Resource[];
  visibleCount: number;
  hiddenArchiveCount: number;
  hiddenConfigCount: number;
}

export default function SearchFilters({
  initialSearch,
  initialCategory,
  initialShowArchive,
  initialShowConfig,
  resources,
  visibleCount,
  hiddenArchiveCount,
  hiddenConfigCount,
}: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [showArchive, setShowArchive] = useState(initialShowArchive);
  const [showConfig, setShowConfig] = useState(initialShowConfig);

  // Ingestion Piping State
  const [pipeUrl, setPipeUrl] = useState("");
  const [isPiping, setIsPiping] = useState(false);

  // Sync state if URL changes externally (e.g. back button)
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setShowArchive(initialShowArchive);
  }, [initialShowArchive]);

  useEffect(() => {
    setShowConfig(initialShowConfig);
  }, [initialShowConfig]);

  // Debounced filter push to the router
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (showArchive) params.set("showArchive", "1");
      if (showConfig) params.set("showConfig", "1");

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

      const currentParams = new URLSearchParams(window.location.search);
      const currentSearch = currentParams.get("search") || "";
      const currentCategory = currentParams.get("category") || "";
      const currentArchive = currentParams.get("showArchive") === "1";
      const currentConfig = currentParams.get("showConfig") === "1";

      if (
        search !== currentSearch ||
        category !== currentCategory ||
        showArchive !== currentArchive ||
        showConfig !== currentConfig
      ) {
        startTransition(() => {
          router.push(targetUrl, { scroll: false });
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [search, category, showArchive, showConfig, pathname, router]);

  const handleRandom = () => {
    const pool = applyGardenVisibility(resources, { showArchive, showConfig });
    if (pool.length === 0) return;
    const random = pool[Math.floor(Math.random() * pool.length)];
    window.open(random.link, "_blank", "noopener,noreferrer");
  };

  const handlePipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipeUrl.trim()) return;

    // Validate protocol
    if (!/^https?:\/\//i.test(pipeUrl)) {
      toast.error("Please enter a valid HTTP or HTTPS URL");
      return;
    }

    setIsPiping(true);
    const toastId = toast.loading("Piping resource into the garden...");

    try {
      const response = await fetch("/api/pipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pipeUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to pipe resource");
      }

      if (data.method === "duplicate") {
        toast.dismiss(toastId);
        toast.info("Resource already exists in your garden!");
      } else {
        toast.dismiss(toastId);
        toast.success(`Successfully piped: ${data.resource.title} 🌱`);
        setPipeUrl("");
        router.refresh(); // Fetch new server data
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to pipe resource. Verify the URL.");
    } finally {
      setIsPiping(false);
    }
  };

  return (
    <div className="space-y-6 mb-12">
      {/* Filtering Row */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <label htmlFor="search-input" className="sr-only">
            Search titles, descriptions, or tags
          </label>
          <Search
            aria-hidden="true"
            className={`absolute left-5 top-4 text-zinc-500 w-5 h-5 transition-colors ${isPending ? "text-indigo-500 animate-pulse" : ""}`}
          />
          <input
            id="search-input"
            type="text"
            placeholder="Search titles, descriptions, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 pl-14 bg-zinc-900 border border-zinc-800 rounded-3xl text-lg placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          />
        </div>

        <label htmlFor="category-select" className="sr-only">
          Filter by Category
        </label>
        <select
          id="category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-14 px-6 bg-zinc-900 border border-zinc-800 rounded-3xl text-sm font-medium focus:outline-none focus:border-indigo-500 cursor-pointer text-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <option value="">All Categories</option>
          <option value="official">Official</option>
          <option value="example">Examples &amp; Demos</option>
          <option value="tutorial">Tutorials</option>
          <option value="repo">Repositories</option>
          <option value="pattern">Patterns</option>
        </select>

        <button
          onClick={handleRandom}
          disabled={visibleCount === 0}
          aria-label="Open a random resource link"
          className="h-14 px-6 flex items-center gap-2 border border-zinc-700 hover:bg-zinc-900 active:bg-zinc-800 rounded-3xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <Shuffle aria-hidden="true" className="w-4 h-4" /> Random
        </button>
      </div>

      {/* Dex garden visibility (archive + configuration excluded by default) */}
      <div
        className="flex flex-wrap items-center gap-3 text-sm text-zinc-400"
        role="group"
        aria-label="Dex import visibility filters"
      >
        <span className="text-zinc-500 font-medium">Dex garden:</span>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showArchive}
            onChange={(e) => setShowArchive(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950"
          />
          <span>
            Show archive
            {hiddenArchiveCount > 0 && !showArchive ? (
              <span className="text-zinc-600"> ({hiddenArchiveCount} hidden)</span>
            ) : null}
          </span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showConfig}
            onChange={(e) => setShowConfig(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950"
          />
          <span>
            Show configuration
            {hiddenConfigCount > 0 && !showConfig ? (
              <span className="text-zinc-600"> ({hiddenConfigCount} hidden)</span>
            ) : null}
          </span>
        </label>
      </div>

      {/* Ingestion Pipe Row */}
      <form
        onSubmit={handlePipeSubmit}
        aria-label="Quick pipe resource URL ingestion"
        className="flex flex-col md:flex-row gap-4 bg-zinc-900/40 p-4 rounded-[32px] border border-zinc-800/80 backdrop-blur-sm"
      >
        <div className="relative flex-1 flex items-center">
          <label htmlFor="pipe-url-input" className="sr-only">
            Git repository or webpage URL to pipe in
          </label>
          <Link2 aria-hidden="true" className="absolute left-5 text-zinc-500 w-5 h-5" />
          <input
            id="pipe-url-input"
            type="text"
            placeholder="Pipe Git repository or web page (e.g. https://github.com/owner/repo)"
            value={pipeUrl}
            onChange={(e) => setPipeUrl(e.target.value)}
            disabled={isPiping}
            className="w-full h-12 pl-14 pr-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-base placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/80 transition-colors text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500/80 focus-visible:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPiping || !pipeUrl.trim()}
          className="h-12 px-6 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-2xl text-sm font-semibold text-white transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          {isPiping ? (
            <>
              <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" /> Piping...
            </>
          ) : (
            <>
              <Zap aria-hidden="true" className="w-4 h-4 fill-white" /> Pipe It In!
            </>
          )}
        </button>
      </form>
    </div>
  );
}
