import { describe, expect, it } from "vitest";
import { iframeSandbox, runtimeStubCopy } from "@/lib/run-pane";

describe("iframeSandbox", () => {
  it("uses a restricted sandbox without allow-same-origin", () => {
    const attrs = iframeSandbox();
    expect(attrs.sandbox.split(" ")).toEqual(
      expect.arrayContaining(["allow-scripts", "allow-forms", "allow-popups"]),
    );
    expect(attrs.sandbox).not.toMatch(/allow-same-origin/);
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
