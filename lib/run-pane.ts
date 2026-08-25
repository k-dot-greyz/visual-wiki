import type { PlayableCard } from "./playable-card";

export type EntryKind = "video" | "audio" | "external";

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogv", ".mov", ".m4v"];
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".flac", ".m4a", ".aac", ".oga", ".opus", ".ogg"];

/**
 * Classify a live entry URL so the run pane can pick a safe renderer.
 *
 * We never embed a live entry in an <iframe> — arbitrary, attacker-influenced homepages
 * with script access are a browser-side SSRF/phishing pivot. Direct media files play in a
 * native <video>/<audio> element (no script execution); everything else becomes a plain
 * "open in a new tab" redirect out of our origin.
 */
export function classifyEntry(url: string): EntryKind {
  let pathname: string;
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch {
    return "external";
  }
  if (VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return "video";
  if (AUDIO_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return "audio";
  return "external";
}

/** True when a live entry should hydrate as a native HTML5 media player rather than a redirect. */
export function isMediaUrl(url: string): boolean {
  return classifyEntry(url) !== "external";
}

export function runtimeStubCopy(runtime: PlayableCard["runtime"]): string {
  if (runtime === "webcontainer") {
    return "Node in-tab and hosted venv are the next pipes. WebContainers need an isolated origin — not this wiki.";
  }
  if (runtime === "vm") {
    return "Hosted venv is the next pipe. A VM preview URL will land here later.";
  }
  return "Open on GitHub — this repo has no live homepage yet.";
}
