import { isSafeUrl } from "./safe-url";

const AUDIO_EXT = /\.(mp3|wav|ogg|oga|flac|m4a|aac|opus)(?:$|[?#])/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|mov)(?:$|[?#])/i;

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
  if (!entry || !isSafeUrl(entry)) return { kind: "none" };

  const media = mediaKindForEntry(entry);
  if (card.runtime === "html5" || media) {
    if (media === "audio") return { kind: "audio", src: entry };
    if (media === "video") return { kind: "video", src: entry };
  }

  return { kind: "redirect", href: entry };
}
