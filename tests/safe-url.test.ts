import { describe, expect, it } from "vitest";
import { isPrivateIp, isSafeUrl } from "@/lib/safe-url";

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

  it("blocks bracketed IPv6 private and link-local literals", () => {
    expect(isSafeUrl("http://[::1]/")).toBe(false);
    expect(isSafeUrl("http://[fe80::1]/")).toBe(false);
    expect(isSafeUrl("http://[fc00::1]/")).toBe(false);
    expect(isSafeUrl("http://[fd00::1]/")).toBe(false);
    expect(isSafeUrl("http://[::ffff:127.0.0.1]/")).toBe(false);
  });

  it("blocks javascript: and garbage", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("not-a-url")).toBe(false);
  });
});

describe("isPrivateIp", () => {
  it("flags private IPv4 and mapped loopback", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows public IPv4", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });
});
