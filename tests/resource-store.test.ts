import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFilePersist, createResourceStore, type Persist } from "@/lib/resource-store";

function memoryPersist(initial: string | null = null): Persist & { snapshot: () => string | null } {
  let data = initial;
  return {
    async read() {
      return data;
    },
    async write(json: string) {
      data = json;
    },
    snapshot: () => data,
  };
}

const sample = {
  title: "Playwright Magician Resource",
  description: "A test card",
  category: "tutorial" as const,
  tags: ["testing"],
  link: "https://playwright.dev",
  image: "https://picsum.photos/id/10/800/450",
};

describe("createResourceStore", () => {
  it("adds a resource and returns it by id", async () => {
    const store = createResourceStore({
      persist: memoryPersist("[]"),
      now: () => new Date("2026-08-21T00:00:00.000Z"),
      id: () => "e2e-ux-magician",
    });
    const result = await store.add(sample);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resource.id).toBe("e2e-ux-magician");
    expect(result.resource.addedAt).toBe("2026-08-21");
    const found = await store.getById("e2e-ux-magician");
    expect(found?.title).toBe(sample.title);
  });

  it("updates a resource by id", async () => {
    const store = createResourceStore({
      persist: memoryPersist("[]"),
      id: () => "card-1",
      now: () => new Date("2026-08-21T00:00:00.000Z"),
    });
    await store.add(sample);
    const updated = await store.update("card-1", { description: "Updated Magician description." });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.resource.description).toBe("Updated Magician description.");
  });

  it("removes a resource by id and can restore it", async () => {
    const store = createResourceStore({
      persist: memoryPersist("[]"),
      id: () => "card-1",
      now: () => new Date("2026-08-21T00:00:00.000Z"),
    });
    await store.add(sample);
    const removed = await store.remove("card-1");
    expect(removed.ok).toBe(true);
    expect(await store.getById("card-1")).toBeNull();
    if (!removed.ok) return;
    const restored = await store.add({ ...removed.resource, id: removed.resource.id });
    expect(restored.ok).toBe(true);
    expect((await store.getById("card-1"))?.title).toBe(sample.title);
  });

  it("rejects javascript: and private-network links without writing", async () => {
    const persist = memoryPersist("[]");
    const store = createResourceStore({ persist, id: () => "x" });
    const js = await store.add({ ...sample, link: "javascript:alert(1)" });
    expect(js.ok).toBe(false);
    const priv = await store.add({ ...sample, link: "http://127.0.0.1/" });
    expect(priv.ok).toBe(false);
    expect(persist.snapshot()).toBe("[]");
  });

  it("treats a normalized link duplicate as idempotent", async () => {
    let n = 0;
    const store = createResourceStore({
      persist: memoryPersist("[]"),
      id: () => `id-${++n}`,
      now: () => new Date("2026-08-21T00:00:00.000Z"),
    });
    const first = await store.add(sample);
    const dup = await store.add({ ...sample, link: "https://playwright.dev/" });
    expect(first.ok && dup.ok).toBe(true);
    if (!first.ok || !dup.ok) return;
    expect(dup.duplicate).toBe(true);
    expect(dup.resource.id).toBe(first.resource.id);
    expect((await store.list()).length).toBe(1);
  });

  it("seeds initial resources when persist is empty", async () => {
    const store = createResourceStore({ persist: memoryPersist(null) });
    const list = await store.list();
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((r) => r.title.includes("React Three Fiber"))).toBe(true);
    expect(list.some((r) => r.title === "UX Journey Deck")).toBe(true);
  });
});

describe("createFilePersist", () => {
  it("honors an explicit RESOURCES_PATH-style file", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "vw-store-")), "garden.json");
    const store = createResourceStore({
      persist: createFilePersist(filePath),
      id: () => "file-1",
      now: () => new Date("2026-08-21T00:00:00.000Z"),
    });
    await store.add(sample);
    const again = createResourceStore({ persist: createFilePersist(filePath) });
    expect((await again.getById("file-1"))?.title).toBe(sample.title);
  });
});
