import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { isSafeUrl } from "./safe-url";
import type { Resource } from "./types";

export const resourceCategorySchema = z.enum(["official", "example", "tutorial", "repo", "pattern"]);

export const resourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  category: resourceCategorySchema,
  tags: z.array(z.string()),
  link: z.string().min(1),
  image: z.string(),
  addedAt: z.string(),
  kind: z.enum(["resource", "playable"]).optional(),
  runtime: z.enum(["none", "external", "media", "webcontainer", "vm"]).optional(),
  entry: z.string().optional(),
  display: z.enum(["tree", "ogl"]).optional(),
});

export type Persist = {
  read: () => Promise<string | null>;
  write: (json: string) => Promise<void>;
};

export type ResourceStoreDeps = {
  persist: Persist;
  now?: () => Date;
  id?: () => string;
};

export type NewResource = Omit<Resource, "id" | "addedAt"> & { id?: string; addedAt?: string };

export type StoreOk<T> = { ok: true } & T;
export type StoreErr = { ok: false; error: string };
export type StoreResult<T> = StoreOk<T> | StoreErr;

export const initialResources: Resource[] = [
  {
    id: "1",
    title: "React Three Fiber — Official Docs",
    description:
      "The single source of truth. Declarative, performant, and beautifully documented.",
    category: "official",
    tags: ["core", "react", "docs"],
    link: "https://docs.pmnd.rs/react-three-fiber",
    image: "https://picsum.photos/id/1015/800/450",
    addedAt: "2026-01-12",
  },
  {
    id: "2",
    title: "Anti-Gravity Racing Demo",
    description:
      "Beautiful example of vehicle physics + custom shaders in R3F. Perfect reference for track feel.",
    category: "example",
    tags: ["physics", "racing", "shaders"],
    link: "https://github.com/pmndrs/drei",
    image: "https://picsum.photos/id/1074/800/450",
    addedAt: "2026-02-03",
  },
  {
    id: "3",
    title: "Three.js Journey — Bruno Simon",
    description: "The best paid course on the planet for mastering Three.js fundamentals.",
    category: "tutorial",
    tags: ["course", "beginner", "bruno"],
    link: "https://threejs-journey.com/",
    image: "https://picsum.photos/id/106/800/450",
    addedAt: "2026-01-20",
  },
  {
    id: "4",
    title: "@react-three/drei",
    description: "Essential helpers, controls, and abstractions. You will use this every single day.",
    category: "repo",
    tags: ["helpers", "controls", "must-have"],
    link: "https://github.com/pmndrs/drei",
    image: "https://picsum.photos/id/160/800/450",
    addedAt: "2026-01-15",
  },
  {
    id: "5",
    title: "R3F Performance Patterns",
    description: "Advanced techniques for keeping 60fps even with thousands of objects.",
    category: "pattern",
    tags: ["performance", "optimization", "advanced"],
    link: "https://docs.pmnd.rs/react-three-fiber/advanced/performance",
    image: "https://picsum.photos/id/201/800/450",
    addedAt: "2026-02-10",
  },
  {
    id: "ux-deck",
    title: "UX Journey Deck",
    description:
      "22-card Aether-compatible UX journey. Playable in this garden and in glitchworks-tarot.",
    category: "pattern",
    tags: ["aether", "playwright", "a11y", "tarot"],
    link: "https://github.com/k-dot-greyz/visual-wiki",
    image: "https://picsum.photos/id/1015/800/450",
    addedAt: "2026-08-21",
    kind: "playable",
    runtime: "none",
    display: "tree",
  },
];

export function normalizeLink(link: string): string {
  return link.trim().replace(/\/+$/, "").toLowerCase();
}

export function resourcesFilePath(): string {
  return process.env.RESOURCES_PATH || path.join(process.cwd(), "resources.json");
}

export function createFilePersist(filePath = resourcesFilePath()): Persist {
  return {
    async read() {
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, "utf-8");
    },
    async write(json: string) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, json, "utf-8");
    },
  };
}

function parseList(raw: string | null): Resource[] {
  if (raw == null) return initialResources.map((r) => ({ ...r }));
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialResources.map((r) => ({ ...r }));
    return parsed
      .map((item) => resourceSchema.safeParse(item))
      .filter((r): r is { success: true; data: Resource } => r.success)
      .map((r) => r.data);
  } catch {
    return initialResources.map((r) => ({ ...r }));
  }
}

function defaultId(): string {
  return Date.now().toString(36);
}

function guardUrls(link: string, image?: string): string | null {
  if (!isSafeUrl(link)) return "Link must be a public http or https URL.";
  if (image && !isSafeUrl(image)) return "Image URL must be a public http or https URL.";
  if (image && image.startsWith("javascript:")) return "Image URL must be a public http or https URL.";
  return null;
}

export function createResourceStore(deps: ResourceStoreDeps) {
  const now = deps.now ?? (() => new Date());
  const idGen = deps.id ?? defaultId;

  async function load(): Promise<Resource[]> {
    const raw = await deps.persist.read();
    const list = parseList(raw);
    if (raw == null) {
      await deps.persist.write(JSON.stringify(list, null, 2));
    }
    return list;
  }

  async function save(list: Resource[]): Promise<void> {
    await deps.persist.write(JSON.stringify(list, null, 2));
  }

  return {
    async list(): Promise<Resource[]> {
      return load();
    },

    async getById(id: string): Promise<Resource | null> {
      const list = await load();
      return list.find((r) => r.id === id) ?? null;
    },

    async add(input: NewResource): Promise<StoreResult<{ resource: Resource; duplicate?: boolean }>> {
      const title = input.title?.trim();
      const link = input.link?.trim();
      if (!title || !link) {
        return { ok: false, error: "Title and Link are required fields." };
      }
      const image =
        input.image?.trim() ||
        `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/800/450`;
      const urlError = guardUrls(link, image);
      if (urlError) return { ok: false, error: urlError };

      const list = await load();
      const existing = list.find((r) => normalizeLink(r.link) === normalizeLink(link));
      if (existing) {
        return { ok: true, resource: existing, duplicate: true };
      }

      const resource: Resource = {
        ...input,
        id: input.id?.trim() || idGen(),
        title,
        description: input.description?.trim() || "No description yet.",
        category: input.category || "example",
        tags: input.tags?.length ? input.tags : ["new"],
        link,
        image,
        addedAt: input.addedAt || now().toISOString().split("T")[0],
      };

      const parsed = resourceSchema.safeParse(resource);
      if (!parsed.success) {
        return { ok: false, error: "Resource failed validation" };
      }

      const next = [parsed.data, ...list];
      await save(next);
      return { ok: true, resource: parsed.data };
    },

    async update(
      id: string,
      patch: Partial<Omit<Resource, "id">>,
    ): Promise<StoreResult<{ resource: Resource }>> {
      const list = await load();
      const idx = list.findIndex((r) => r.id === id);
      if (idx === -1) return { ok: false, error: "Resource not found" };

      const merged: Resource = { ...list[idx], ...patch, id };
      if (patch.link || patch.image) {
        const urlError = guardUrls(merged.link, merged.image);
        if (urlError) return { ok: false, error: urlError };
      }
      const parsed = resourceSchema.safeParse(merged);
      if (!parsed.success) return { ok: false, error: "Resource failed validation" };

      list[idx] = parsed.data;
      await save(list);
      return { ok: true, resource: parsed.data };
    },

    async remove(id: string): Promise<StoreResult<{ resource: Resource }>> {
      const list = await load();
      const resource = list.find((r) => r.id === id);
      if (!resource) return { ok: false, error: "Resource not found" };
      await save(list.filter((r) => r.id !== id));
      return { ok: true, resource };
    },

    async reset(seed: Resource[] = initialResources): Promise<void> {
      await save(seed.map((r) => ({ ...r })));
    },

    async importAll(
      incoming: Array<Partial<Resource> & { title?: string; link?: string }>,
    ): Promise<{ added: number; duplicates: number; errors: number }> {
      let added = 0;
      let duplicates = 0;
      let errors = 0;
      for (const item of incoming) {
        if (!item.title || !item.link) {
          errors += 1;
          continue;
        }
        const result = await this.add({
          id: item.id,
          title: item.title,
          description: item.description || "No description yet.",
          category: (item.category as Resource["category"]) || "example",
          tags: Array.isArray(item.tags) ? item.tags : ["imported"],
          link: item.link,
          image: item.image || "",
          kind: item.kind,
          runtime: item.runtime,
          entry: item.entry,
          display: item.display,
        });
        if (!result.ok) errors += 1;
        else if (result.duplicate) duplicates += 1;
        else added += 1;
      }
      return { added, duplicates, errors };
    },
  };
}

export type ResourceStore = ReturnType<typeof createResourceStore>;

let defaultStore: ResourceStore | null = null;

export function getDefaultStore(): ResourceStore {
  if (!defaultStore) {
    defaultStore = createResourceStore({ persist: createFilePersist() });
  }
  return defaultStore;
}

/** Test-only: drop the process-wide singleton after swapping RESOURCES_PATH. */
export function resetDefaultStore(): void {
  defaultStore = null;
}
