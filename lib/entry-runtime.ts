const AUDIO_EXT = /\.(mp3|wav|ogg|oga|flac|m4a|aac|opus)(?:$|[?#])/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|mov)(?:$|[?#])/i;

/** Browser-safe: no node:dns / node:net. Server Zod still uses lib/safe-url. */
export function isPublicHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!hostname) return false;
    if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      return false;
    }
    if (hostname === "::1" || hostname === "0:0:0:0:0:0:0:1") return false;
    const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
      if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 100 && b >= 64 && b <= 127) return false;
      if (a === 198 && b >= 18 && b <= 19) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export type EntrySurface =
  | { kind: "none" }
  | { kind: "audio"; src: string }
  | { kind: "video"; src: string }
  | { kind: "redirect"; href: string }
  | { kind: "stub"; runtime: "webcontainer" | "vm" };

export type PublicRuntime = "none" | "html5" | "redirect" | "webcontainer" | "vm";

/** Legacy `iframe` cards collapse to HTML5 media or a user-activated redirect. Never iframe. */
export function normalizeRuntime(runtime: string | undefined, entry: string | undefined): PublicRuntime {
  if (runtime === "webcontainer" || runtime === "vm") return runtime;
  if (!entry) return "none";
  if (runtime === "html5" || mediaKindForEntry(entry)) return "html5";
  if (runtime === "none") return mediaKindForEntry(entry) ? "html5" : "redirect";
  return mediaKindForEntry(entry) ? "html5" : "redirect";
}

export function mediaKindForEntry(entry: string): "audio" | "video" | null {
  let path = entry;
  try {
    path = new URL(entry).pathname;
  } catch {
    path = entry;
  }
  if (AUDIO_EXT.test(path) || AUDIO_EXT.test(entry)) return "audio";
  if (VIDEO_EXT.test(path) || VIDEO_EXT.test(entry)) return "video";
  return null;
}

export function runtimeForEntry(entry: string | undefined): PublicRuntime {
  if (!entry) return "none";
  return mediaKindForEntry(entry) ? "html5" : "redirect";
}

export function surfaceFor(card: { runtime: string; entry?: string }): EntrySurface {
  if (card.runtime === "webcontainer" || card.runtime === "vm") {
    return { kind: "stub", runtime: card.runtime };
  }

  const entry = card.entry;
  if (!entry || !isPublicHttpUrl(entry)) return { kind: "none" };

  const media = mediaKindForEntry(entry);
  if (card.runtime === "html5" || media) {
    if (media === "audio") return { kind: "audio", src: entry };
    if (media === "video") return { kind: "video", src: entry };
  }

  return { kind: "redirect", href: entry };
}
