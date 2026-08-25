import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("iframe ban", () => {
  it("does not mount an iframe in playground chrome", () => {
    expect(read("components/RunPane.tsx")).not.toMatch(/<iframe/i);
    expect(read("components/PlaygroundShell.tsx")).not.toMatch(/<iframe/i);
    expect(read("app/play/page.tsx")).not.toMatch(/<iframe/i);
  });

  it("ships CSP that forbids framing and nested frames", () => {
    const config = read("next.config.ts");
    expect(config).toMatch(/frame-src 'none'/);
    expect(config).toMatch(/frame-ancestors 'none'/);
    expect(config).toMatch(/X-Frame-Options/);
    expect(config).toMatch(/DENY/);
  });
});
