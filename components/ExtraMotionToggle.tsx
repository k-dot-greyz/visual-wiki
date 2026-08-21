"use client";

import { useEffect, useState } from "react";
import { readFlexPref, type FlexPref } from "@/lib/flex-gate";

const KEY = "gw-flex";

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
      data-testid="wiki-flex-toggle"
      aria-label="Extra motion preference"
      aria-valuetext={pref}
      onClick={cycle}
      className="text-xs text-zinc-500 hover:text-zinc-300 min-h-11 px-3 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
    >
      Extra motion: {pref}
    </button>
  );
}
