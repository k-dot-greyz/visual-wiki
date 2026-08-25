import type { PlayableCard } from "./playable-card";

/**
 * Third-party frames are banned in this codebase.
 *
 * `entry` is attacker-controlled: it comes from the `homepage` field of an
 * arbitrary public GitHub repository, and any GitHub user can set that field to
 * any https URL. Framing it executes unvetted third-party script in the
 * visitor's browser from a shareable `/play?repo=` link. A `sandbox` attribute
 * narrows that blast radius but does not remove it, and the browser's own
 * sandbox enforcement has shipped navigation-restriction bypasses
 * (CVE-2026-8563, CVE-2026-5903). We render media with native elements and send
 * everything else out through an explicit, user-initiated link instead.
 */
export const EMBED_POLICY = "no-third-party-frames" as const;

const AUDIO_EXTENSIONS = ["mp3", "m4a", "aac", "oga", "ogg", "opus", "wav", "flac"];
const VIDEO_EXTENSIONS = ["mp4", "m4v", "webm", "ogv", "mov"];

export type EntryKind = "audio" | "video" | "link";

export type EntryPlan =
  | { kind: "audio" | "video"; src: string; host: string }
  | { kind: "link"; href: string; host: string }
  | null;

function extensionOf(pathname: string): string {
  const last = pathname.split("/").pop() ?? "";
  const dot = last.lastIndexOf(".");
  if (dot <= 0) return "";
  return last.slice(dot + 1).toLowerCase();
}

/**
 * Decide how an entry URL may be presented. Only https survives; direct media
 * files get a native HTML5 player, everything else becomes a link-out.
 * Never returns anything that embeds a third-party document.
 */
export function planEntry(entry: string | undefined): EntryPlan {
  if (!entry) return null;

  let url: URL;
  try {
    url = new URL(entry);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  // Embedded credentials make the rendered host label lie about the destination.
  if (url.username || url.password) return null;

  const host = url.hostname;
  const ext = extensionOf(url.pathname);

  if (AUDIO_EXTENSIONS.includes(ext)) return { kind: "audio", src: url.href, host };
  if (VIDEO_EXTENSIONS.includes(ext)) return { kind: "video", src: url.href, host };

  return { kind: "link", href: url.href, host };
}

/** Attributes for every outbound link to untrusted content. */
export function externalLinkAttrs(): {
  target: string;
  rel: string;
  referrerPolicy: string;
} {
  return {
    target: "_blank",
    rel: "noopener noreferrer nofollow external",
    referrerPolicy: "no-referrer",
  };
}

export function runtimeStubCopy(runtime: PlayableCard["runtime"]): string {
  if (runtime === "webcontainer") {
    return "Node in-tab and hosted venv are the next pipes. WebContainers need an isolated origin — not this wiki.";
  }
  if (runtime === "vm") {
    return "Hosted venv is the next pipe. A VM preview URL will land here later.";
  }
  return "Open on GitHub — this repo has no live homepage we can safely surface yet.";
}
