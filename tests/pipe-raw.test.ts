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

  it("rejects plaintext http image URLs with 400", async () => {
    const res = await makeRawPost({
      title: "Mixed content",
      link: "https://github.com/nari-labs/dia",
      image: "http://tracker.example/beacon.png",
    });
    expect(res.status).toBe(400);
    expect(addResourceDirectMock).not.toHaveBeenCalled();
  });

  it("clamps an unknown category back onto the enum", async () => {
    const res = await makeRawPost({
      title: "Weird",
      link: "https://github.com/nari-labs/dia",
      category: "<img src=x onerror=alert(1)>",
    });
    expect(res.status).toBe(200);
    expect(addResourceDirectMock.mock.calls[0][0]).toMatchObject({ category: "example" });
  });

  it("accepts a valid https link and persists the resource", async () => {
    const res = await makeRawPost({ title: "Good", link: "https://github.com/nari-labs/dia" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(addResourceDirectMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/pipe — cross-origin write guards", () => {
  beforeEach(() => {
    vi.resetModules();
    addResourceDirectMock.mockClear();
    delete process.env.VISUAL_WIKI_PIPE_TOKEN;
  });

  it("rejects a simple-request content type that would skip CORS preflight", async () => {
    const { POST } = await import("@/app/api/pipe/route");
    const req = new NextRequest("http://localhost/api/pipe", {
      method: "POST",
      body: JSON.stringify({ type: "raw", payload: { title: "CSRF", link: "https://evil.example" } }),
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
    expect(addResourceDirectMock).not.toHaveBeenCalled();
  });

  it("requires the pipe token when one is configured", async () => {
    process.env.VISUAL_WIKI_PIPE_TOKEN = "s3cret";
    const { POST } = await import("@/app/api/pipe/route");
    const build = (headers: Record<string, string>) =>
      new NextRequest("http://localhost/api/pipe", {
        method: "POST",
        body: JSON.stringify({
          type: "raw",
          payload: { title: "Good", link: "https://github.com/nari-labs/dia" },
        }),
        headers: { "Content-Type": "application/json", ...headers },
      });

    expect((await POST(build({}))).status).toBe(401);
    expect((await POST(build({ "x-pipe-token": "wrong" }))).status).toBe(401);
    expect(addResourceDirectMock).not.toHaveBeenCalled();

    expect((await POST(build({ "x-pipe-token": "s3cret" }))).status).toBe(200);
    expect(addResourceDirectMock).toHaveBeenCalledTimes(1);
  });
});
