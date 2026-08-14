import { describe, expect, it } from "vitest";
import { shouldMountOgl } from "@/lib/flex-gate";

describe("shouldMountOgl", () => {
  const desktop = {
    reducedMotion: false,
    finePointer: true,
    hover: true,
    saveData: false,
    deviceMemory: 8,
    pref: "auto" as const,
  };

  it("mounts on desktop-grade auto when motion is allowed", () => {
    expect(shouldMountOgl(desktop)).toBe(true);
  });

  it("never mounts when prefers-reduced-motion", () => {
    expect(shouldMountOgl({ ...desktop, reducedMotion: true, pref: "on" })).toBe(false);
  });

  it("stays off for coarse pointer (phones)", () => {
    expect(shouldMountOgl({ ...desktop, finePointer: false, hover: false })).toBe(false);
  });

  it("stays off on Save-Data and low RAM", () => {
    expect(shouldMountOgl({ ...desktop, saveData: true })).toBe(false);
    expect(shouldMountOgl({ ...desktop, deviceMemory: 2 })).toBe(false);
  });

  it("off pref always wins; on pref still loses to reduced-motion", () => {
    expect(shouldMountOgl({ ...desktop, pref: "off" })).toBe(false);
    expect(shouldMountOgl({ ...desktop, pref: "on", reducedMotion: true })).toBe(false);
    expect(
      shouldMountOgl({
        ...desktop,
        pref: "on",
        finePointer: false,
        hover: false,
      }),
    ).toBe(true);
  });
});
