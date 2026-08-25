import { describe, expect, it } from "vitest";
import { iframeSandbox, runtimeStubCopy } from "@/lib/run-pane";
import { normalizeRuntime, surfaceFor } from "@/lib/entry-runtime";

describe("iframeSandbox", () => {
  it("throws so no caller can mount a sandboxed preview", () => {
    expect(() => iframeSandbox()).toThrow(/iframe previews are disabled/i);
  });
});

describe("runtimeStubCopy", () => {
  it("explains that webcontainer and vm are the next pipes", () => {
    expect(runtimeStubCopy("webcontainer")).toMatch(/Node in-tab/i);
    expect(runtimeStubCopy("vm")).toMatch(/hosted venv/i);
    expect(runtimeStubCopy("none")).toMatch(/Open on GitHub/i);
    expect(runtimeStubCopy("redirect")).toMatch(/new tab/i);
    expect(runtimeStubCopy("html5")).toMatch(/HTML5/i);
  });
});

describe("surfaceFor", () => {
  it("never returns an iframe surface for a homepage", () => {
    const surface = surfaceFor({
      runtime: "iframe",
      entry: "https://example.com/dia",
    });
    expect(surface.kind).toBe("redirect");
    expect(JSON.stringify(surface)).not.toMatch(/iframe/i);
  });

  it("uses native audio for media file entries", () => {
    expect(surfaceFor({ runtime: "html5", entry: "https://example.com/track.mp3" }).kind).toBe(
      "audio",
    );
    expect(surfaceFor({ runtime: "redirect", entry: "https://example.com/clip.webm" }).kind).toBe(
      "video",
    );
  });
});

describe("normalizeRuntime", () => {
  it("maps legacy iframe to redirect or html5, never iframe", () => {
    expect(normalizeRuntime("iframe", "https://example.com")).toBe("redirect");
    expect(normalizeRuntime("iframe", "https://example.com/a.mp4")).toBe("html5");
    expect(normalizeRuntime("iframe", undefined)).toBe("none");
  });
});
