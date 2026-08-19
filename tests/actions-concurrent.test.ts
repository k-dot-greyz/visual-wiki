/**
 * Regression test: concurrent addResourceDirect calls must not lose writes.
 *
 * Root cause (pre-mutex): addResourceDirect / deleteResourceAction both do
 * read-then-write with no synchronisation. Two async callers that both
 * complete getResources() before either calls saveResources() will each build
 * their update on top of the *same stale baseline*, so the last writer silently
 * discards the first writer's resource.
 *
 * The realistic trigger is the pipe POST route: it awaits isSafeUrlResolved()
 * (a real DNS lookup) before calling addResourceDirect. Two concurrent pipe
 * requests whose lookups resolve in the same I/O event batch both continue into
 * addResourceDirect with the same view of the file.
 *
 * Fix: a module-level Promise chain (withModifyLock) serialises every
 * read-modify-write so callers are queued and only one runs at a time.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Resource } from "@/lib/types";

// next/cache is Next.js server-only; mock it so the actions module loads in
// Vitest's plain Node environment.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("actions — concurrent-write safety", () => {
  let tmpDir: string;
  let prevCwd: string;

  beforeEach(() => {
    // Point DATA_FILE (= path.join(process.cwd(), "resources.json")) at a fresh
    // temp directory for each test, then reset modules so the next import picks
    // up the new cwd.
    prevCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "visual-wiki-actions-test-"));
    process.chdir(tmpDir);
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(prevCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.resetModules();
  });

  it("preserves all resources when addResourceDirect is called concurrently", async () => {
    const { addResourceDirect } = await import("@/app/actions");

    const base = {
      description: "test resource",
      category: "official" as Resource["category"],
      tags: ["test"],
      image: "https://picsum.photos/id/100/800/450",
    };

    // Fire two writes at the same time — without the mutex the second write
    // would overwrite the first (silent data loss).
    await Promise.all([
      addResourceDirect({ ...base, title: "Resource A", link: "https://example.com/a" }),
      addResourceDirect({ ...base, title: "Resource B", link: "https://example.com/b" }),
    ]);

    const dataFile = path.join(tmpDir, "resources.json");
    const saved = JSON.parse(fs.readFileSync(dataFile, "utf-8")) as { title: string }[];
    const titles = saved.map((r) => r.title);

    expect(titles).toContain("Resource A");
    expect(titles).toContain("Resource B");
  });

  it("preserves existing resources after deleteResourceAction", async () => {
    const { addResourceDirect, deleteResourceAction, getResources } =
      await import("@/app/actions");

    const base = {
      description: "to delete",
      category: "example" as Resource["category"],
      tags: [],
      image: "https://picsum.photos/id/200/800/450",
    };

    // Add sequentially to guarantee unique millisecond-based IDs.
    const rA = await addResourceDirect({ ...base, title: "Keep A", link: "https://example.com/keep-a" });
    const rB = await addResourceDirect({ ...base, title: "Delete Me", link: "https://example.com/delete" });
    const rC = await addResourceDirect({ ...base, title: "Keep C", link: "https://example.com/keep-c" });

    await deleteResourceAction(rB.id);

    const remaining = await getResources();
    const titles = remaining.map((r) => r.title);
    expect(titles).toContain("Keep A");
    expect(titles).toContain("Keep C");
    expect(titles).not.toContain("Delete Me");
  });
});
