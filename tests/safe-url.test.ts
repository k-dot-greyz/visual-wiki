import { describe, expect, it } from "vitest";
import { isSafeUrl } from "@/lib/safe-url";

describe("isSafeUrl", () => {
  it("allows public https hosts", () => {
    expect(isSafeUrl("https://github.com/nari-labs/dia")).toBe(true);
  });

  it("blocks loopback, private, and metadata ranges", () => {
    expect(isSafeUrl("https://localhost/x")).toBe(false);
    expect(isSafeUrl("http://127.0.0.1/x")).toBe(false);
    expect(isSafeUrl("https://10.0.0.1/x")).toBe(false);
    expect(isSafeUrl("https://192.168.1.1/x")).toBe(false);
    expect(isSafeUrl("https://169.254.169.254/latest")).toBe(false);
  });

  it("blocks javascript: and garbage", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("not-a-url")).toBe(false);
  });
});
