import { describe, expect, it } from "vitest";
import { detectMediaKind, externalPreviewCopy, runtimeStubCopy } from "@/lib/run-pane";

describe("detectMediaKind", () => {
  it("detects common video extensions", () => {
    expect(detectMediaKind("https://cdn.example.com/demo.mp4")).toBe("video");
    expect(detectMediaKind("https://cdn.example.com/demo.webm?token=1")).toBe("video");
  });

  it("detects common audio extensions", () => {
    expect(detectMediaKind("https://cdn.example.com/track.mp3")).toBe("audio");
    expect(detectMediaKind("https://cdn.example.com/track.ogg")).toBe("audio");
  });

  it("returns null for non-media URLs", () => {
    expect(detectMediaKind("https://example.com/dia")).toBeNull();
  });
});

describe("externalPreviewCopy", () => {
  it("explains redirect previews without iframes", () => {
    expect(
      externalPreviewCopy({
        kind: "playable",
        repo: "https://github.com/nari-labs/dia",
        runtime: "redirect",
        entry: "https://example.com/dia",
        display: "tree",
      }),
    ).toMatch(/new tab/i);
    expect(
      externalPreviewCopy({
        kind: "playable",
        repo: "https://github.com/nari-labs/dia",
        runtime: "redirect",
        entry: "https://cdn.example.com/demo.mp4",
        display: "tree",
      }),
    ).toMatch(/HTML5/i);
  });
});

describe("runtimeStubCopy", () => {
  it("explains that webcontainer and vm are the next pipes", () => {
    expect(runtimeStubCopy("webcontainer")).toMatch(/Node in-tab/i);
    expect(runtimeStubCopy("vm")).toMatch(/hosted venv/i);
    expect(runtimeStubCopy("none")).toMatch(/Open on GitHub/i);
  });
});
