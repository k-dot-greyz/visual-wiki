export type FlexPref = "off" | "auto" | "on";

export type FlexSignals = {
  reducedMotion: boolean;
  finePointer: boolean;
  hover: boolean;
  saveData: boolean;
  deviceMemory?: number;
  pref: FlexPref;
};

/** Desktop-grade ogl mount. Reduced-motion always wins. Force-on still loses to it. */
export function shouldMountOgl(s: FlexSignals): boolean {
  if (s.reducedMotion) return false;
  if (s.pref === "off") return false;
  if (s.pref === "on") return true;
  if (!s.finePointer || !s.hover) return false;
  if (s.saveData) return false;
  if (typeof s.deviceMemory === "number" && s.deviceMemory < 4) return false;
  return true;
}

export function readFlexPref(raw: string | null): FlexPref {
  if (raw === "off" || raw === "on") return raw;
  return "auto";
}
