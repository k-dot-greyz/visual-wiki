/**
 * Security utility functions shared between server actions and the pipe API route.
 */

/**
 * Returns true only for http and https URLs.
 * Rejects javascript:, data:, file:, and every other scheme that could be
 * stored in a resource field and later rendered as an href or img src.
 */
export function isAllowedUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Returns true when urlString is safe to fetch server-side (SSRF defence).
 *
 * Blocks:
 *  - non-http/https schemes
 *  - localhost and common local hostnames
 *  - IPv4 loopback (127.0.0.0/8), private (RFC 1918), and link-local (169.254.x.x)
 *  - IPv6 loopback (::1), link-local (fe80::/10), and ULA (fc00::/7)
 *
 * Note: This is a hostname-string blocklist and is not a substitute for network-level
 * egress filtering. DNS rebinding attacks can still bypass it; combine with egress
 * firewall rules in production.
 */
export function isSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http and https schemes to prevent protocol-handler abuse
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    // url.hostname wraps IPv6 addresses in brackets — e.g. "[::1]" or "[fd12::1]".
    // Strip the brackets before prefix/equality checks so the regexes work correctly.
    const rawHostname = url.hostname.toLowerCase();
    const hostname =
      rawHostname.startsWith("[") && rawHostname.endsWith("]")
        ? rawHostname.slice(1, -1)
        : rawHostname;

    // Loopback and well-known local names
    if (
      hostname === "localhost" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }

    // IPv4 loopback (full 127.0.0.0/8 range, not just 127.0.0.1)
    if (/^127\./.test(hostname)) return false;
    // IPv4 private ranges (RFC 1918)
    if (/^10\./.test(hostname)) return false;
    if (/^192\.168\./.test(hostname)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return false;
    // IPv4 link-local / cloud provider metadata (169.254.x.x)
    if (/^169\.254\./.test(hostname)) return false;

    // IPv6 link-local (fe80::/10 — fe80:: through febf::)
    if (/^fe[89ab][0-9a-f]:/i.test(hostname)) return false;
    // IPv6 ULA (fc00::/7 — all fc** and fd** first groups)
    if (/^f[cd][0-9a-f]{2}:/i.test(hostname)) return false;

    return true;
  } catch (e) {
    return false;
  }
}
