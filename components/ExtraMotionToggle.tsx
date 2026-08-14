"use client";

import { useEffect, useState } from "react";
import { readFlexPref, type FlexPref } from "@/lib/flex-gate";

const KEY = "gw-flex";

/**
 * Renders a button for viewing and cycling the extra-motion preference.
 */
export default function ExtraMotionToggle() {
  const [pref, setPref] = useState<FlexPref>("auto");

  useEffect(() => {
    setPref(readFlexPref(window.localStorage.getItem(KEY)));
  }, []);

  const cycle = () => {
    const next: FlexPref = pref === "auto" ? "on" : pref === "on" ? "off" : "auto";
    window.localStorage.setItem(KEY, next);
    setPref(next);
    window.dispatchEvent(new Event("gw-flex"));
  };

  return (
    <button
      type="button"
      aria-pressed={pref !== "off"}
      onClick={cycle}
      className="text-xs text-zinc-500 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded-lg px-2 py-1"
    >
      Extra motion: {pref}
    </button>
  );
}
