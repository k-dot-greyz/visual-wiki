"use client";

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      onClick={(event) => {
        const main = document.getElementById("main-content");
        if (!main) return;
        event.preventDefault();
        main.focus();
        main.scrollIntoView({ block: "start" });
      }}
      className="absolute left-4 top-4 z-[100] opacity-0 focus:opacity-100 bg-white text-black px-4 py-3 rounded-xl font-medium focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
    >
      Skip to main content
    </a>
  );
}
