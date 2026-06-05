/**
 * Unit tests for lib/security.ts using Node.js built-in test runner.
 * Run with:  npx tsx --test lib/security.test.ts
 *
 * These tests lock in the behaviour corrected by the critical-bug fixes:
 *   1. isSafeUrl — IPv6 ULA/link-local bypass via bracket notation
 *   2. isAllowedUrl — javascript: / data: scheme injection (XSS)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isSafeUrl, isAllowedUrl } from "./security.js";

// ──────────────────────────────────────────────────────────────────────────────
// isAllowedUrl
// ──────────────────────────────────────────────────────────────────────────────

describe("isAllowedUrl", () => {
  test("accepts https URLs", () => {
    assert.equal(isAllowedUrl("https://example.com/path"), true);
    assert.equal(isAllowedUrl("https://github.com/owner/repo"), true);
  });

  test("accepts http URLs", () => {
    assert.equal(isAllowedUrl("http://example.com"), true);
  });

  // Regression: javascript: URLs must be rejected to prevent stored XSS
  test("rejects javascript: scheme (XSS vector)", () => {
    assert.equal(isAllowedUrl("javascript:alert(document.cookie)"), false);
    assert.equal(isAllowedUrl("JAVASCRIPT:void(0)"), false);
  });

  test("rejects data: scheme", () => {
    assert.equal(isAllowedUrl("data:text/html,<script>alert(1)</script>"), false);
  });

  test("rejects file: scheme", () => {
    assert.equal(isAllowedUrl("file:///etc/passwd"), false);
  });

  test("rejects empty string and garbage", () => {
    assert.equal(isAllowedUrl(""), false);
    assert.equal(isAllowedUrl("not a url"), false);
    assert.equal(isAllowedUrl("//relative"), false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// isSafeUrl — legitimate public URLs
// ──────────────────────────────────────────────────────────────────────────────

describe("isSafeUrl — public URLs are allowed", () => {
  test("allows normal public https domains", () => {
    assert.equal(isSafeUrl("https://example.com"), true);
    assert.equal(isSafeUrl("https://github.com/pmndrs/drei"), true);
    assert.equal(isSafeUrl("https://docs.pmnd.rs/react-three-fiber"), true);
  });

  test("allows normal public http domains", () => {
    assert.equal(isSafeUrl("http://example.com"), true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// isSafeUrl — blocked cases
// ──────────────────────────────────────────────────────────────────────────────

describe("isSafeUrl — loopback and special hostnames are blocked", () => {
  test("blocks localhost", () => {
    assert.equal(isSafeUrl("http://localhost/"), false);
    assert.equal(isSafeUrl("http://localhost:8080/admin"), false);
  });

  test("blocks 0.0.0.0", () => {
    assert.equal(isSafeUrl("http://0.0.0.0/"), false);
  });

  test("blocks .local and .internal TLDs", () => {
    assert.equal(isSafeUrl("http://my-service.local/"), false);
    assert.equal(isSafeUrl("http://cluster.internal/secret"), false);
  });

  test("blocks non-http schemes", () => {
    assert.equal(isSafeUrl("javascript:alert(1)"), false);
    assert.equal(isSafeUrl("file:///etc/passwd"), false);
    assert.equal(isSafeUrl("ftp://internal/"), false);
  });
});

describe("isSafeUrl — IPv4 private ranges are blocked", () => {
  test("blocks 127.0.0.0/8 (full loopback range, not just 127.0.0.1)", () => {
    assert.equal(isSafeUrl("http://127.0.0.1/"), false);
    assert.equal(isSafeUrl("http://127.1.2.3/"), false);
    assert.equal(isSafeUrl("http://127.255.255.255/"), false);
  });

  test("blocks 10.0.0.0/8", () => {
    assert.equal(isSafeUrl("http://10.0.0.1/"), false);
    assert.equal(isSafeUrl("http://10.255.255.255/"), false);
  });

  test("blocks 192.168.0.0/16", () => {
    assert.equal(isSafeUrl("http://192.168.1.1/"), false);
  });

  test("blocks 172.16.0.0/12", () => {
    assert.equal(isSafeUrl("http://172.16.0.1/"), false);
    assert.equal(isSafeUrl("http://172.31.255.255/"), false);
    assert.equal(isSafeUrl("http://172.15.0.1/"), true); // just outside range
    assert.equal(isSafeUrl("http://172.32.0.1/"), true); // just outside range
  });

  test("blocks 169.254.0.0/16 (link-local / cloud metadata)", () => {
    assert.equal(isSafeUrl("http://169.254.169.254/latest/meta-data"), false);
    assert.equal(isSafeUrl("http://169.254.0.1/"), false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Regression: IPv6 private addresses were NOT blocked before the fix because
// url.hostname returns bracketed form "[fd12::1]" while the old checks tested
// unbracketed prefixes ("fd00:"). All of these must be blocked.
// ──────────────────────────────────────────────────────────────────────────────

describe("isSafeUrl — IPv6 private ranges (regression: bracket notation bypass)", () => {
  test("blocks ::1 (loopback)", () => {
    assert.equal(isSafeUrl("http://[::1]/"), false);
    assert.equal(isSafeUrl("http://[::1]:8080/"), false);
  });

  test("blocks fe80::/10 link-local — all variants in the range", () => {
    assert.equal(isSafeUrl("http://[fe80::1]/"), false);      // fe80
    assert.equal(isSafeUrl("http://[fe90::1]/"), false);      // fe90
    assert.equal(isSafeUrl("http://[fea0::1]/"), false);      // feA0
    assert.equal(isSafeUrl("http://[feb0::1]/"), false);      // feB0
    // febf is still in fe80::/10
    assert.equal(isSafeUrl("http://[febf::1]/"), false);
  });

  test("blocks fc00::/7 ULA — fc** addresses", () => {
    assert.equal(isSafeUrl("http://[fc00::1]/"), false);
    assert.equal(isSafeUrl("http://[fc80::1]/"), false);
    assert.equal(isSafeUrl("http://[fcff::1]/"), false);
  });

  test("blocks fc00::/7 ULA — fd** addresses (REGRESSION: was bypassed before fix)", () => {
    // These were all returned true (unsafe) before the bracket-stripping fix:
    assert.equal(isSafeUrl("http://[fd00::1]/"), false);
    assert.equal(isSafeUrl("http://[fd12:3456:789a::1]/"), false);
    assert.equal(isSafeUrl("http://[fdff::1]/"), false);
  });
});
