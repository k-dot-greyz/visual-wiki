import { lookup } from "dns/promises";
import { isIP } from "net";

/** Strip brackets from IPv6 literals returned by URL.hostname. */
function normalizeHostname(hostname: string): string {
  const h = hostname.toLowerCase();
  if (h.startsWith("[") && h.endsWith("]")) return h.slice(1, -1);
  return h;
}

function parseIpv4Mapped(ipv6: string): string | null {
  const lower = ipv6.toLowerCase();
  const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = parts;
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking (RFC 2544)
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 TEST-NET-3
  if (a === 192 && b === 88 && c === 99) return true; // 192.88.99.0/24 6to4 relay anycast
  if (a >= 224 && a <= 239) return true; // 224.0.0.0/4 multicast
  if (a >= 240) return true; // 240.0.0.0/4 reserved + 255.255.255.255 broadcast
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true; // loopback
  if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true; // unspecified
  // fe80::/10 — fe80 through febf, not just the fe80: prefix
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;
  if (/^f[cd][0-9a-f]/i.test(lower)) return true; // fc00::/7 unique local
  if (/^ff[0-9a-f][0-9a-f]:/i.test(lower)) return true; // ff00::/8 multicast
  // Transition ranges that can smuggle an embedded/translated IPv4 destination.
  if (/^2002:/i.test(lower)) return true; // 6to4 (deprecated, RFC 7526)
  if (/^64:ff9b:/i.test(lower)) return true; // NAT64 well-known prefix (RFC 6052)
  const mapped = parseIpv4Mapped(lower);
  if (mapped) return isPrivateIpv4(mapped);
  return false;
}

export function isPrivateIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIpv4(ip);
  if (kind === 6) return isPrivateIpv6(ip);
  return true;
}

/** SSRF guard — blocks loopback, private, and link-local hosts (sync, literal IPs only). */
export function isSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const hostname = normalizeHostname(url.hostname);

    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }

    if (isIP(hostname)) {
      return !isPrivateIp(hostname);
    }

    return true;
  } catch {
    return false;
  }
}

/** Resolve hostname and reject destinations that map to private or link-local addresses. */
export async function isSafeUrlResolved(urlString: string): Promise<boolean> {
  if (!isSafeUrl(urlString)) return false;

  try {
    const url = new URL(urlString);
    const hostname = normalizeHostname(url.hostname);

    if (isIP(hostname)) {
      return !isPrivateIp(hostname);
    }

    const addresses = await lookup(hostname, { all: true });
    if (addresses.length === 0) return false;
    return addresses.every(({ address }) => !isPrivateIp(address));
  } catch {
    return false;
  }
}

const MAX_REDIRECTS = 5;

/**
 * Fetch with redirects disabled; validates each hop (DNS-resolved) before following.
 *
 * KNOWN RESIDUAL — DNS rebinding (TOCTOU): `isSafeUrlResolved` resolves the host and
 * validates the address, then `fetch` resolves it AGAIN to open the socket. A hostile
 * authoritative server with a sub-second TTL can answer public on the check and private
 * on the connect. This narrows the window (fail-closed on unresolvable names, per-hop
 * revalidation, redirects disabled) but does not close it. Fully closing it requires
 * pinning the validated address at the socket layer (e.g. an undici Agent with a custom
 * `connect`/`lookup`) so the connection cannot be redirected to a different IP. The
 * stronger backstop is network-level egress policy (block RFC1918 + metadata at the
 * container). Do not treat this validator as the only barrier for server-side fetches.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit,
  maxRedirects = MAX_REDIRECTS,
): Promise<Response> {
  let current = url;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!(await isSafeUrlResolved(current))) {
      throw new Error("SSRF Prevention: unsafe redirect or destination");
    }

    const response = await fetch(current, { ...init, redirect: "manual" });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      current = new URL(location, current).href;
      continue;
    }

    return response;
  }

  throw new Error("SSRF Prevention: too many redirects");
}

const DEFAULT_MAX_BODY_BYTES = 1_024 * 1_024;

/** Read a Response body with a hard byte cap so a hostile server cannot OOM the pipe. */
export async function readCappedText(
  response: Response,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return text.length > maxBytes ? text.slice(0, maxBytes) : text;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const remaining = maxBytes - totalBytes;
      if (remaining <= 0) {
        await reader.cancel().catch(() => {});
        break;
      }

      if (value.byteLength > remaining) {
        chunks.push(value.slice(0, remaining));
        totalBytes += remaining;
        await reader.cancel().catch(() => {});
        break;
      }

      chunks.push(value);
      totalBytes += value.byteLength;
    }
  } catch (err) {
    await reader.cancel().catch(() => {});
    throw err;
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}
