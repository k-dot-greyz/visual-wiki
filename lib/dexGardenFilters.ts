import { Resource } from "@/lib/types";

/** Dex path after `/dex/` in GitHub blob links (keep in sync with import-dex-to-wiki.py). */
function dexPathFromLink(link: string): string | null {
  const marker = "/dex/";
  const idx = link.toLowerCase().indexOf(marker);
  if (idx === -1) {
    return null;
  }
  return link.slice(idx + marker.length).split("?")[0] ?? "";
}

const ARCHIVE_SEGMENT = /(^|\/)archive(\/|$)/i;
const CONFIG_SEGMENT = /(^|\/)(config|configuration)(\/|$)/i;
const CONFIG_TOP_LEVEL = new Set(["reference"]);

export function isDexArchiveResource(resource: Resource): boolean {
  if (resource.tags.includes("dex-archive")) {
    return true;
  }
  const dexPath = dexPathFromLink(resource.link);
  if (!dexPath) {
    return false;
  }
  return ARCHIVE_SEGMENT.test(dexPath);
}

export function isDexConfigResource(resource: Resource): boolean {
  if (resource.tags.includes("dex-config")) {
    return true;
  }
  const dexPath = dexPathFromLink(resource.link);
  if (!dexPath) {
    return false;
  }
  const top = dexPath.split("/")[0] ?? "";
  if (CONFIG_TOP_LEVEL.has(top)) {
    return true;
  }
  return CONFIG_SEGMENT.test(dexPath);
}

export type GardenVisibility = {
  showArchive: boolean;
  showConfig: boolean;
};

export function applyGardenVisibility(
  resources: Resource[],
  visibility: GardenVisibility
): Resource[] {
  return resources.filter((r) => {
    if (!visibility.showArchive && isDexArchiveResource(r)) {
      return false;
    }
    if (!visibility.showConfig && isDexConfigResource(r)) {
      return false;
    }
    return true;
  });
}

export function countHiddenByDefault(resources: Resource[]): {
  archive: number;
  config: number;
} {
  let archive = 0;
  let config = 0;
  for (const r of resources) {
    if (isDexArchiveResource(r)) {
      archive += 1;
    }
    if (isDexConfigResource(r)) {
      config += 1;
    }
  }
  return { archive, config };
}
