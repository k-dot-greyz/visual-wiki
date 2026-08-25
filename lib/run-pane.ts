import type { PlayableCard } from "./playable-card";

export type MediaKind = "video" | "audio" | null;

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i;

/** Detect direct media URLs suitable for native HTML5 playback (no iframe). */
export function detectMediaKind(url: string): MediaKind {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (AUDIO_EXT.test(pathname)) return "audio";
    if (VIDEO_EXT.test(pathname)) return "video";
    return null;
  } catch {
    return null;
  }
}

export function externalPreviewCopy(card: PlayableCard): string {
  if (card.runtime === "redirect" && card.entry) {
    const media = detectMediaKind(card.entry);
    if (media === "video") {
      return "Direct video preview plays here with the native HTML5 player. Full site opens in a new tab.";
    }
    if (media === "audio") {
      return "Direct audio preview plays here with the native HTML5 player. Full site opens in a new tab.";
    }
    return "Live preview opens in a new tab — we never embed third-party pages in an iframe.";
  }
  return runtimeStubCopy(card.runtime);
}

export function runtimeStubCopy(runtime: PlayableCard["runtime"]): string {
  if (runtime === "webcontainer") {
    return "Node in-tab and hosted venv are the next pipes. WebContainers need an isolated origin — not this wiki.";
  }
  if (runtime === "vm") {
    return "Hosted venv is the next pipe. A VM preview URL will land here later.";
  }
  return "Open on GitHub — this repo has no live homepage to preview yet.";
}
