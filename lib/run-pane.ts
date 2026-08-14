import type { PlayableCard } from "./playable-card";

/**
 * Provides security attributes for sandboxed iframe content.
 *
 * @returns Sandbox permissions and the referrer policy for iframe usage.
 */
export function iframeSandbox(): { sandbox: string; referrerPolicy: string } {
  return {
    sandbox: "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox",
    referrerPolicy: "no-referrer",
  };
}

/**
 * Provides placeholder copy for a runtime that does not yet have an embedded preview.
 *
 * @param runtime - The runtime associated with the playable card
 * @returns Runtime-specific placeholder text
 */
export function runtimeStubCopy(runtime: PlayableCard["runtime"]): string {
  if (runtime === "webcontainer") {
    return "Node in-tab and hosted venv are the next pipes. WebContainers need an isolated origin — not this wiki.";
  }
  if (runtime === "vm") {
    return "Hosted venv is the next pipe. A VM preview URL will land here later.";
  }
  return "Open on GitHub — this repo has no live homepage to iframe yet.";
}
