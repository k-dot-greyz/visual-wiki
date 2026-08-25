import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { rejectUnsafePipePost } from "@/lib/pipe-ingress";

function post(url: string, origin?: string): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin) headers.origin = origin;
  return new NextRequest(url, { method: "POST", headers });
}

describe("rejectUnsafePipePost", () => {
  it("allows loopback CLI posts with no Origin", () => {
    expect(rejectUnsafePipePost(post("http://127.0.0.1:3000/api/pipe"))).toBeNull();
    expect(rejectUnsafePipePost(post("http://localhost:3000/api/pipe"))).toBeNull();
  });

  it("allows same-origin browser Origin", () => {
    expect(rejectUnsafePipePost(post("http://localhost:3000/api/pipe", "http://localhost:3000"))).toBeNull();
  });

  it("rejects a foreign Origin (clickjacked / CSRF ingest)", async () => {
    const res = rejectUnsafePipePost(
      post("http://localhost:3000/api/pipe", "https://evil.example"),
    );
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
    const body = await res?.json();
    expect(body.error).toMatch(/Origin/i);
  });

  it("rejects Origin-less posts that are not loopback", async () => {
    const res = rejectUnsafePipePost(post("https://wiki.example/api/pipe"));
    expect(res?.status).toBe(403);
    const body = await res?.json();
    expect(body.error).toMatch(/loopback/i);
  });
});
