"use client";

import { useEffect, useState } from "react";
import { WIKI_ANNOUNCE } from "@/lib/wiki-bus";

export default function WikiLiveRegion() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onAnnounce = (event: Event) => {
      setMessage((event as CustomEvent<string>).detail ?? "");
    };
    window.addEventListener(WIKI_ANNOUNCE, onAnnounce);
    return () => window.removeEventListener(WIKI_ANNOUNCE, onAnnounce);
  }, []);

  return (
    <div
      data-testid="wiki-live-region"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-2 left-2 z-[60] max-w-sm text-xs text-zinc-400 pointer-events-none"
    >
      {message}
    </div>
  );
}
