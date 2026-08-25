import { isSafeUrl } from "./safe-url";
import { playableCardSchema, type PlayableCard } from "./playable-card";
import { planEntry } from "./run-pane";

export type TreeNode = { path: string; type: "blob" | "tree" };

export type HydrateOk = {
  ok: true;
  card: PlayableCard;
  title: string;
  description: string;
  language?: string;
  tree: TreeNode[];
  truncated: boolean;
};

export type HydrateErr = { ok: false; error: string };

const TREE_CAP = 80;
const GITHUB_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== "github.com") return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    const owner = decodeURIComponent(segments[0]);
    const repo = decodeURIComponent(segments[1]).replace(/\.git$/i, "");
    // GitHub's own charset. Rejecting anything else keeps encoded separators
    // and traversal sequences out of the api.github.com path we build below.
    if (!GITHUB_NAME.test(owner) || !GITHUB_NAME.test(repo)) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

type FetchLike = typeof fetch;

export async function hydrateGithub(
  repoUrl: string,
  opts: { fetch?: FetchLike } = {},
): Promise<HydrateOk | HydrateErr> {
  if (!isSafeUrl(repoUrl)) {
    return { ok: false, error: "Unsafe repository URL" };
  }

  const parsed = parseGitHubRepo(repoUrl);
  if (!parsed) {
    return { ok: false, error: "Not a GitHub owner/repo URL" };
  }

  const fetchImpl = opts.fetch ?? fetch;

  try {
    const metaRes = await fetchImpl(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
      headers: {
        "User-Agent": "visual-wiki-playground",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!metaRes.ok) {
      return { ok: false, error: `GitHub responded ${metaRes.status}` };
    }

    const meta = (await metaRes.json()) as {
      private?: boolean;
      full_name?: string;
      description?: string | null;
      default_branch?: string;
      language?: string | null;
      homepage?: string | null;
      html_url?: string;
    };

    if (meta.private) {
      return { ok: false, error: "Private repositories are not allowed" };
    }

    const htmlUrl = meta.html_url || `https://github.com/${parsed.owner}/${parsed.repo}`;
    const homepage =
      meta.homepage && /^https:\/\//i.test(meta.homepage) && isSafeUrl(meta.homepage)
        ? meta.homepage
        : undefined;
    const entryPlan = planEntry(homepage);
    const cardParsed = playableCardSchema.safeParse({
      kind: "playable",
      repo: htmlUrl,
      runtime: entryPlan ? (entryPlan.kind === "link" ? "link" : "media") : "none",
      entry: entryPlan ? homepage : undefined,
      display: "tree",
    });

    if (!cardParsed.success) {
      return { ok: false, error: "Playable card failed validation" };
    }

    const rawBranch = meta.default_branch || "main";
    const branch = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(rawBranch) ? rawBranch : "main";
    const treeRes = await fetchImpl(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          "User-Agent": "visual-wiki-playground",
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    let tree: TreeNode[] = [];
    let truncated = false;
    if (treeRes.ok) {
      const body = (await treeRes.json()) as {
        truncated?: boolean;
        tree?: { path?: string; type?: string }[];
      };
      truncated = Boolean(body.truncated);
      tree = (body.tree ?? [])
        .filter((n): n is { path: string; type: "blob" | "tree" } =>
          Boolean(n.path && (n.type === "blob" || n.type === "tree")),
        )
        .slice(0, TREE_CAP);
      if ((body.tree?.length ?? 0) > TREE_CAP) truncated = true;
    }

    return {
      ok: true,
      card: cardParsed.data,
      title: meta.full_name || `${parsed.owner}/${parsed.repo}`,
      description: meta.description || "A public repository on GitHub.",
      language: meta.language ?? undefined,
      tree,
      truncated,
    };
  } catch {
    return { ok: false, error: "Failed to reach GitHub" };
  }
}
