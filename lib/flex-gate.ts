export type FlexPref = "off" | "auto" | "on";

export type FlexSignals = {
  reducedMotion: boolean;
  finePointer: boolean;
  hover: boolean;
  saveData: boolean;
  deviceMemory?: number;
  pref: FlexPref;
};

/**
 * Determines whether the desktop-grade OGL experience should be mounted.
 *
 * @param s - Rendering capability, user preference, and device condition signals
 * @returns `true` when OGL should be mounted, `false` otherwise
 */
export function shouldMountOgl(s: FlexSignals): boolean {
  if (s.reducedMotion) return false;
  if (s.pref === "off") return false;
  if (s.pref === "on") return true;
  if (!s.finePointer || !s.hover) return false;
  if (s.saveData) return false;
  if (typeof s.deviceMemory === "number" && s.deviceMemory < 4) return false;
  return true;
}

/**
 * Normalizes a raw rendering preference to a supported flexible rendering mode.
 *
 * @param raw - The raw preference value to interpret
 * @returns `off` or `on` when explicitly specified; otherwise, `auto`
 */
export function readFlexPref(raw: string | null): FlexPref {
  if (raw === "off" || raw === "on") return raw;
  return "auto";
}
