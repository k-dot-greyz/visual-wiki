import { describe, expect, it, vi } from "vitest";
import { hydrateGithub, parseGitHubRepo } from "@/lib/github-hydrate";

describe("parseGitHubRepo", () => {
  it("parses owner/repo from a github URL", () => {
    expect(parseGitHubRepo("https://github.com/nari-labs/dia.git")).toEqual({
      owner: "nari-labs",
      repo: "dia",
    });
  });

  it("parses owner/repo when query params are present", () => {
    expect(parseGitHubRepo("https://github.com/nari-labs/dia?tab=readme")).toEqual({
      owner: "nari-labs",
      repo: "dia",
    });
  });

  it("returns null for non-github URLs", () => {
    expect(parseGitHubRepo("https://gitlab.com/nari-labs/dia")).toBeNull();
  });

  it("rejects deceptive hostnames that embed github.com", () => {
    expect(parseGitHubRepo("https://evilgithub.com/nari-labs/dia")).toBeNull();
    expect(parseGitHubRepo("https://notgithub.com/owner/repo")).toBeNull();
  });
});

describe("hydrateGithub", () => {
  it("returns metadata and a truncated tree for a public repo", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/repos/nari-labs/dia")) {
        return new Response(
          JSON.stringify({
            full_name: "nari-labs/dia",
            description: "Dialogue TTS",
            private: false,
            default_branch: "main",
            language: "Python",
            homepage: "https://example.com/dia",
            html_url: "https://github.com/nari-labs/dia",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/git/trees/main")) {
        return new Response(
          JSON.stringify({
            truncated: true,
            tree: [
              { path: "README.md", type: "blob" },
              { path: "src/model.py", type: "blob" },
              { path: "src", type: "tree" },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("nope", { status: 404 });
    });

    const result = await hydrateGithub("https://github.com/nari-labs/dia", { fetch: fetchMock });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.repo).toBe("https://github.com/nari-labs/dia");
    expect(result.card.runtime).toBe("external");
    expect(result.card.entry).toBe("https://example.com/dia");
    expect(result.title).toBe("nari-labs/dia");
    expect(result.tree.map((n) => n.path)).toContain("README.md");
    expect(result.truncated).toBe(true);
  });

  it("hydrates a media homepage as the media runtime", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/repos/nari-labs/dia")) {
        return new Response(
          JSON.stringify({
            full_name: "nari-labs/dia",
            private: false,
            default_branch: "main",
            homepage: "https://cdn.example.com/demo.mp4",
            html_url: "https://github.com/nari-labs/dia",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ tree: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const result = await hydrateGithub("https://github.com/nari-labs/dia", { fetch: fetchMock });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.runtime).toBe("media");
    expect(result.card.entry).toBe("https://cdn.example.com/demo.mp4");
  });

  it("never emits the removed iframe runtime for a homepage", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/repos/nari-labs/dia")) {
        return new Response(
          JSON.stringify({
            full_name: "nari-labs/dia",
            private: false,
            default_branch: "main",
            homepage: "https://example.com/dia",
            html_url: "https://github.com/nari-labs/dia",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ tree: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const result = await hydrateGithub("https://github.com/nari-labs/dia", { fetch: fetchMock });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.runtime).not.toBe("iframe");
  });

  it("fails closed for private repos", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ private: true, full_name: "k-dot-greyz/secret" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const result = await hydrateGithub("https://github.com/k-dot-greyz/secret", {
      fetch: fetchMock,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/private/i);
  });

  it("fails closed on GitHub 404", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 404 }));
    const result = await hydrateGithub("https://github.com/nari-labs/missing", {
      fetch: fetchMock,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unsafe repo URLs without fetching", async () => {
    const fetchMock = vi.fn();
    const result = await hydrateGithub("https://localhost/nari-labs/dia", { fetch: fetchMock });
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a hydration error when fetch rejects", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    const result = await hydrateGithub("https://github.com/nari-labs/dia", { fetch: fetchMock });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Failed to reach GitHub");
  });
});
