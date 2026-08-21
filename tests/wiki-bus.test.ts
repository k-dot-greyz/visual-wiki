import { describe, expect, it } from "vitest";
import { copyText } from "@/lib/wiki-bus";

describe("copyText", () => {
  it("returns fallback when clipboard is missing", async () => {
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });
    expect(await copyText("hello")).toBe("fallback");
    Object.defineProperty(globalThis, "navigator", {
      value: original,
      configurable: true,
    });
  });
});
