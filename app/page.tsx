import ResourceCard from "@/components/ResourceCard";
import HeaderActions from "@/components/HeaderActions";
import SearchFilters from "@/components/SearchFilters";
import { getResources } from "./actions";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function VisualWiki({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedParams = await searchParams;
  const search = typeof resolvedParams.search === "string" ? resolvedParams.search : "";
  const category = typeof resolvedParams.category === "string" ? resolvedParams.category : "";

  const resources = await getResources();

  const filtered = resources
    .filter(
      (r) =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
    )
    .filter((r) => !category || r.category === category);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="max-w-7xl mx-auto px-8 py-16">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-3xl bg-indigo-600 flex items-center justify-center">
                <span className="text-3xl" role="img" aria-label="Seedling icon">🌿</span>
              </div>
              <div>
                <h1 className="font-semibold text-6xl tracking-tighter">
                  visual wiki
                </h1>
                <p className="text-2xl text-zinc-400 -mt-2">
                  your personal knowledge garden
                </p>
              </div>
            </div>
            <p className="text-zinc-500 max-w-md">
              Curate once. Feed your AI agents forever.
            </p>
          </div>

          <HeaderActions resources={resources} />
        </header>

        <SearchFilters initialSearch={search} initialCategory={category} resources={resources} />

        <section aria-label="Curated knowledge garden" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length > 0 ? (
            filtered.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-6xl mb-4" role="img" aria-label="Sprout">🌱</p>
              <p className="text-xl text-zinc-400">
                No resources found. Add your first one!
              </p>
            </div>
          )}
        </section>

        <footer className="mt-16 text-center text-xs text-zinc-500">
          {resources.length} resources • Last synced{" "}
          {new Date().toLocaleDateString()}
        </footer>
      </main>
    </div>
  );
}
