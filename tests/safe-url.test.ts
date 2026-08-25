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

  it("blocks the full 127.0.0.0/8 loopback range, not just 127.0.0.1", () => {
    expect(isSafeUrl("http://127.0.0.2/x")).toBe(false);
    expect(isSafeUrl("http://127.1.2.3/x")).toBe(false);
    expect(isSafeUrl("http://127.255.255.255/x")).toBe(false);
    expect(isSafeUrl("http://2130706433/")).toBe(false);
    expect(isSafeUrl("http://127.1/")).toBe(false);
    expect(isSafeUrl("http://0x7f.0.0.1/")).toBe(false);
  });

  it("blocks trailing-dot FQDNs that resolve to blocked names", () => {
    expect(isSafeUrl("https://localhost./x")).toBe(false);
    expect(isSafeUrl("https://box.local./x")).toBe(false);
    expect(isSafeUrl("https://svc.internal../x")).toBe(false);
    expect(isSafeUrl("https://api.localhost/x")).toBe(false);
    expect(isSafeUrl("https://router.home.arpa/x")).toBe(false);
  });

  it("blocks URLs carrying embedded credentials", () => {
    expect(isSafeUrl("https://github.com@evil.example/x")).toBe(false);
    expect(isSafeUrl("https://user:pass@evil.example/x")).toBe(false);
  });

  it("blocks bracketed IPv6 private and link-local literals", () => {
    expect(isSafeUrl("http://[::1]/")).toBe(false);
    expect(isSafeUrl("http://[0:0:0:0:0:0:0:1]/")).toBe(false);
    expect(isSafeUrl("http://[fe80::1]/")).toBe(false);
    expect(isSafeUrl("http://[fe81::1]/")).toBe(false);
    expect(isSafeUrl("http://[febf::1]/")).toBe(false);
    expect(isSafeUrl("http://[fc00::1]/")).toBe(false);
    expect(isSafeUrl("http://[fd00::1]/")).toBe(false);
    expect(isSafeUrl("http://[::ffff:127.0.0.1]/")).toBe(false);
  });

  it("blocks javascript:, data:, and garbage schemes", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>evil()</script>")).toBe(false);
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeUrl("not-a-url")).toBe(false);
  });

  it("allows a public IPv6 literal", () => {
    expect(isSafeUrl("http://[2001:4860:4860::8888]/")).toBe(true);
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
