import { describe, expect, it, vi } from "vitest";
import { createPipeIngest } from "@/lib/pipe-ingest";

describe("createPipeIngest", () => {
  it("rejects loopback pipe URLs without writing", async () => {
    const addResource = vi.fn();
    const pipe = createPipeIngest({
      listResources: async () => [],
      addResource,
    });
    const result = await pipe.ingestUrl("https://127.0.0.1/");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(addResource).not.toHaveBeenCalled();
  });

  it("returns a duplicate without adding twice", async () => {
    const existing = {
      id: "1",
      title: "Example",
      description: "",
      category: "example" as const,
      tags: [],
      link: "https://example.com",
      image: "https://picsum.photos/id/10/800/450",
      addedAt: "2026-08-21",
    };
    const addResource = vi.fn();
    const pipe = createPipeIngest({
      listResources: async () => [existing],
      addResource,
    });
    const result = await pipe.ingestUrl("https://example.com/");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.method).toBe("duplicate");
    expect(addResource).not.toHaveBeenCalled();
  });
});
