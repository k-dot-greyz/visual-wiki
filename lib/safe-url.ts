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
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
  // fe80::/10 — fe80 through febf, not just the fe80: prefix
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;
  if (/^f[cd][0-9a-f]/i.test(lower)) return true;
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

/** Fetch with redirects disabled; validates each hop before following. */
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
