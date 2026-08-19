import type { PlayableCard } from "./playable-card";

export function iframeSandbox(): { sandbox: string; referrerPolicy: string } {
  return {
    sandbox: "allow-scripts allow-forms allow-popups",
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
  return "Open on GitHub — this repo has no live homepage to iframe yet.";
}
