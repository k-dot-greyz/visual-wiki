import { describe, expect, it } from "vitest";
import { classifyEntry, isMediaUrl, runtimeStubCopy } from "@/lib/run-pane";

describe("classifyEntry", () => {
  it("classifies direct video files as video", () => {
    expect(classifyEntry("https://cdn.example.com/clip.mp4")).toBe("video");
    expect(classifyEntry("https://cdn.example.com/clip.webm?token=abc")).toBe("video");
    expect(classifyEntry("https://cdn.example.com/clip.mov")).toBe("video");
  });

  it("classifies direct audio files as audio", () => {
    expect(classifyEntry("https://cdn.example.com/track.mp3")).toBe("audio");
    expect(classifyEntry("https://cdn.example.com/track.flac")).toBe("audio");
    expect(classifyEntry("https://cdn.example.com/track.ogg")).toBe("audio");
  });

  it("treats websites (and anything non-media) as external", () => {
    expect(classifyEntry("https://glitchworks.tech")).toBe("external");
    expect(classifyEntry("https://example.com/dia")).toBe("external");
    expect(classifyEntry("not-a-url")).toBe("external");
  });

  it("isMediaUrl is true only for playable media", () => {
    expect(isMediaUrl("https://cdn.example.com/clip.mp4")).toBe(true);
    expect(isMediaUrl("https://cdn.example.com/track.mp3")).toBe(true);
    expect(isMediaUrl("https://glitchworks.tech")).toBe(false);
  });
});

describe("runtimeStubCopy", () => {
  it("explains that webcontainer and vm are the next pipes", () => {
    expect(runtimeStubCopy("webcontainer")).toMatch(/Node in-tab/i);
    expect(runtimeStubCopy("vm")).toMatch(/hosted venv/i);
    expect(runtimeStubCopy("none")).toMatch(/Open on GitHub/i);
  });

  it("no longer references an iframe anywhere in stub copy", () => {
    for (const runtime of ["none", "external", "media", "webcontainer", "vm"] as const) {
      expect(runtimeStubCopy(runtime)).not.toMatch(/iframe/i);
    }
  });
});
