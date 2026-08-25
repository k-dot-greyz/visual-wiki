import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EMBED_POLICY, externalLinkAttrs, planEntry, runtimeStubCopy } from "@/lib/run-pane";

describe("planEntry", () => {
  it("never returns a framing plan for an arbitrary third-party site", () => {
    const plan = planEntry("https://evil.example/pwn");
    expect(plan).toEqual({ kind: "link", href: "https://evil.example/pwn", host: "evil.example" });
  });

  it("routes direct media files to a native player", () => {
    expect(planEntry("https://cdn.example/track.mp3")?.kind).toBe("audio");
    expect(planEntry("https://cdn.example/clip.WEBM")?.kind).toBe("video");
    expect(planEntry("https://cdn.example/song.flac")?.kind).toBe("audio");
  });

  it("rejects non-https, javascript:, data: and credentialed URLs", () => {
    expect(planEntry("http://example.com")).toBeNull();
    expect(planEntry("javascript:alert(1)")).toBeNull();
    expect(planEntry("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(planEntry("https://github.com@evil.example/")).toBeNull();
    expect(planEntry(undefined)).toBeNull();
    expect(planEntry("not a url")).toBeNull();
  });

  it("reports the real host so the UI cannot mislabel the destination", () => {
    expect(planEntry("https://sub.example.co.uk/a/b")?.host).toBe("sub.example.co.uk");
  });
});

describe("externalLinkAttrs", () => {
  it("opts out of opener access, referrers, and link equity", () => {
    const attrs = externalLinkAttrs();
    expect(attrs.target).toBe("_blank");
    expect(attrs.rel.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    expect(attrs.referrerPolicy).toBe("no-referrer");
  });
});

describe("runtimeStubCopy", () => {
  it("explains that webcontainer and vm are the next pipes", () => {
    expect(runtimeStubCopy("webcontainer")).toMatch(/Node in-tab/i);
    expect(runtimeStubCopy("vm")).toMatch(/hosted venv/i);
    expect(runtimeStubCopy("none")).toMatch(/Open on GitHub/i);
  });
});

const SOURCE_DIRS = ["app", "components", "lib"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function sourceFiles(dir: string): string[] {
  const root = path.resolve(__dirname, "..", dir);
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = path.join(current, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (SOURCE_EXTENSIONS.has(path.extname(full))) out.push(full);
    }
  };
  walk(root);
  return out;
}

describe("no-third-party-frames policy", () => {
  it("is the declared embed policy", () => {
    expect(EMBED_POLICY).toBe("no-third-party-frames");
  });

  it("ships no frame element anywhere in app, components, or lib", () => {
    const offenders = SOURCE_DIRS.flatMap(sourceFiles).filter((file) => {
      const source = readFileSync(file, "utf-8");
      return /<\s*(iframe|frame|frameset|object|embed)\b/i.test(source) ||
        /createElement\(\s*["'](iframe|object|embed)["']/i.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
