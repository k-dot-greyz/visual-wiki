"use client";

import type { TreeNode } from "@/lib/github-hydrate";

/**
 * Renders a repository tree visualization and file listing.
 *
 * @param tree - The repository entries to display.
 * @param truncated - Whether the listing contains only a partial tree.
 */
export default function RepoTree({
  tree,
  truncated,
}: {
  tree: TreeNode[];
  truncated: boolean;
}) {
  const blobs = tree.filter((n) => n.type === "blob");
  const w = 320;
  const h = 120;

  return (
    <section aria-label="Repository tree" className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold tracking-tight mb-4">Tree</h2>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-28 mb-4 text-indigo-400"
        role="img"
        aria-label="File tree sketch"
      >
        {blobs.slice(0, 24).map((node, i) => {
          const x = 16 + (i % 12) * 24;
          const y = 24 + Math.floor(i / 12) * 40;
          return (
            <g key={node.path}>
              <circle cx={x} cy={y} r="4" fill="currentColor" opacity="0.8" />
              {i > 0 && (
                <line
                  x1={16 + ((i - 1) % 12) * 24}
                  y1={24 + Math.floor((i - 1) / 12) * 40}
                  x2={x}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.25"
                />
              )}
            </g>
          );
        })}
      </svg>
      <ul className="font-mono text-xs text-zinc-400 space-y-1 max-h-64 overflow-auto">
        {tree.map((node) => (
          <li key={node.path}>
            <span className="text-zinc-600">{node.type === "tree" ? "▸" : "·"}</span> {node.path}
          </li>
        ))}
      </ul>
      {truncated && (
        <p className="text-xs text-zinc-500 mt-3">Tree truncated — GitHub sent a partial listing.</p>
      )}
    </section>
  );
}
