import type { PlayableCard } from "./playable-card";
import type { EntrySurface } from "./entry-runtime";

/** Iframes are disabled. Kept as a tripwire: callers must not mount one. */
export function iframeSandbox(): never {
  throw new Error("iframe previews are disabled; use HTML5 media or a user-activated redirect");
}

export function runtimeStubCopy(runtime: PlayableCard["runtime"]): string {
  if (runtime === "webcontainer") {
    return "Node in-tab and hosted venv are the next pipes. WebContainers need an isolated origin — not this wiki.";
  }
  if (runtime === "vm") {
    return "Hosted venv is the next pipe. A VM preview URL will land here later.";
  }
  if (runtime === "html5") {
    return "Native HTML5 audio/video — no third-party player frame.";
  }
  if (runtime === "redirect") {
    return "Live sites open in a new tab. This wiki does not embed third-party pages.";
  }
  return "Open on GitHub — this repo has no live homepage to open yet.";
}

export function surfaceCopy(surface: EntrySurface): string {
  if (surface.kind === "audio") return "Native HTML5 audio. Nothing autoplays.";
  if (surface.kind === "video") return "Native HTML5 video. Nothing autoplays.";
  if (surface.kind === "redirect") {
    return "Third-party pages are not embedded (iframes are disabled). Open the live site yourself.";
  }
  if (surface.kind === "stub") return runtimeStubCopy(surface.runtime);
  return runtimeStubCopy("none");
}
