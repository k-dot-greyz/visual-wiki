"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Shuffle } from "lucide-react";
import { Resource } from "@/lib/types";

interface SearchFiltersProps {
  initialSearch: string;
  initialCategory: string;
  resources: Resource[];
}

export default function SearchFilters({
  initialSearch,
  initialCategory,
  resources,
}: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);

  // Sync state if URL changes externally (e.g. back button)
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  // Debounced filter push to the router
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

      const currentParams = new URLSearchParams(window.location.search);
      const currentSearch = currentParams.get("search") || "";
      const currentCategory = currentParams.get("category") || "";

      if (search !== currentSearch || category !== currentCategory) {
        startTransition(() => {
          router.push(targetUrl, { scroll: false });
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [search, category, pathname, router]);

  const handleRandom = () => {
    if (resources.length === 0) return;
    const random = resources[Math.floor(Math.random() * resources.length)];
    window.open(random.link, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="relative flex-1">
        <Search className={`absolute left-5 top-4 text-zinc-500 w-5 h-5 transition-colors ${isPending ? "text-indigo-500 animate-pulse" : ""}`} />
        <input
          type="text"
          placeholder="Search titles, descriptions, or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-14 pl-14 bg-zinc-900 border border-zinc-800 rounded-3xl text-lg placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="h-14 px-6 bg-zinc-900 border border-zinc-800 rounded-3xl text-sm font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
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
        disabled={resources.length === 0}
        className="h-14 px-6 flex items-center gap-2 border border-zinc-700 hover:bg-zinc-900 active:bg-zinc-800 rounded-3xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Shuffle className="w-4 h-4" /> Random
      </button>
    </div>
  );
}
