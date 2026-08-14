/**
 * Regression: raw POST mode used to skip isSafeUrl() and persist javascript: links.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const addResourceDirectMock = vi.fn(async (r: object) => ({
  ...r,
  id: "test-id",
  addedAt: "2026-01-01",
}));

vi.mock("@/app/actions", () => ({
  getResources: vi.fn(async () => []),
  addResourceDirect: addResourceDirectMock,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

async function makeRawPost(payload: object) {
  const { POST } = await import("@/app/api/pipe/route");
  const req = new NextRequest("http://localhost/api/pipe", {
    method: "POST",
    body: JSON.stringify({ type: "raw", payload }),
    headers: { "Content-Type": "application/json" },
  });
  return POST(req);
}

describe("POST /api/pipe — raw mode link validation", () => {
  beforeEach(() => {
    vi.resetModules();
    addResourceDirectMock.mockClear();
  });

  it("rejects javascript: links with 400", async () => {
    const res = await makeRawPost({ title: "XSS", link: "javascript:alert(document.cookie)" });
    expect(res.status).toBe(400);
    expect(addResourceDirectMock).not.toHaveBeenCalled();
  });

  it("rejects data: links with 400", async () => {
    const res = await makeRawPost({ title: "XSS", link: "data:text/html,<script>evil()</script>" });
    expect(res.status).toBe(400);
    expect(addResourceDirectMock).not.toHaveBeenCalled();
  });

  it("rejects private-network links with 400", async () => {
    const res = await makeRawPost({ title: "SSRF", link: "http://169.254.169.254/latest/meta-data" });
    expect(res.status).toBe(400);
    expect(addResourceDirectMock).not.toHaveBeenCalled();
  });

  it("rejects javascript: image URLs with 400", async () => {
    const res = await makeRawPost({
      title: "XSS",
      link: "https://github.com/nari-labs/dia",
      image: "javascript:alert(1)",
    });
    expect(res.status).toBe(400);
    expect(addResourceDirectMock).not.toHaveBeenCalled();
  });

  it("accepts a valid https link and persists the resource", async () => {
    const res = await makeRawPost({ title: "Good", link: "https://github.com/nari-labs/dia" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(addResourceDirectMock).toHaveBeenCalledTimes(1);
  });
});
