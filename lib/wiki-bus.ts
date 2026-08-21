import type { Resource } from "@/lib/types";

export const WIKI_ANNOUNCE = "wiki-announce";
export const WIKI_INSPECT = "wiki-inspect";
export const WIKI_DELETED = "wiki-deleted";

export function announce(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WIKI_ANNOUNCE, { detail: message }));
}

export function inspectResource(resource: Resource) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WIKI_INSPECT, { detail: resource }));
}

export function resourceDeleted(resource: Resource) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WIKI_DELETED, { detail: resource }));
}

export async function copyText(text: string): Promise<"copied" | "fallback"> {
  try {
    if (!navigator.clipboard?.writeText) return "fallback";
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "fallback";
  }
}
