import type { Resource } from "./types";
import { parseGitHubRepo } from "./github-hydrate";
import { isSafeUrl, isSafeUrlResolved, safeFetch, readCappedText } from "./safe-url";
import { normalizeLink } from "./resource-store";

export type PipeDeps = {
  listResources: () => Promise<Resource[]>;
  addResource: (input: Omit<Resource, "id" | "addedAt"> & { id?: string }) => Promise<Resource>;
  fetchImpl?: typeof fetch;
  safeFetchImpl?: typeof safeFetch;
};

export type RawPayload = {
  id?: string;
  title?: string;
  description?: string;
  category?: Resource["category"];
  tags?: string[];
  link?: string;
  image?: string;
  kind?: Resource["kind"];
  runtime?: Resource["runtime"];
  entry?: string;
  display?: Resource["display"];
};

async function fetchGitHubMetadata(
  owner: string,
  repo: string,
  fetchImpl: typeof fetch,
): Promise<Omit<Resource, "id" | "addedAt">> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const response = await fetchImpl(apiUrl, {
    headers: {
      "User-Agent": "visual-wiki-pipe-agent",
      Accept: "application/vnd.github.v3+json",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`GitHub API responded with status ${response.status}`);
  }

  const data = await response.json();
  const tags: string[] = [];
  if (data.language) tags.push(String(data.language).toLowerCase());
  if (Array.isArray(data.topics)) {
    data.topics.slice(0, 4).forEach((topic: string) => tags.push(topic.toLowerCase()));
  }
  if (tags.length === 0) tags.push("github", "repo");

  return {
    title: data.full_name || `${owner}/${repo}`,
    description: data.description || "A public repository on GitHub.",
    category: "repo",
    tags: Array.from(new Set(tags)),
    link: data.html_url || `https://github.com/${owner}/${repo}`,
    image: `https://picsum.photos/id/${Math.floor(Math.random() * 800) + 100}/800/450`,
  };
}

async function fetchWebpageMetadata(
  url: string,
  safeFetchImpl: typeof safeFetch,
): Promise<Omit<Resource, "id" | "addedAt">> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let html: string;
  try {
    const response = await safeFetchImpl(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      throw new Error(`Webpage responded with status ${response.status}`);
    }
    html = await readCappedText(response);
  } finally {
    clearTimeout(timeoutId);
  }

  const bodyLessHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  let title = "Curated Resource";
  const titleMatch = bodyLessHtml.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) title = titleMatch[1].trim();

  let description = "No description found.";
  const ogDescMatch =
    bodyLessHtml.match(/<meta[^>]*?property=["']og:description["'][^>]*?content=["']([^"']+)["']/i) ||
    bodyLessHtml.match(/<meta[^>]*?content=["']([^"']+)["'][^>]*?property=["']og:description["']/i);
  if (ogDescMatch?.[1]) {
    description = ogDescMatch[1].trim();
  } else {
    const metaDescMatch =
      bodyLessHtml.match(/<meta[^>]*?name=["']description["'][^>]*?content=["']([^"']+)["']/i) ||
      bodyLessHtml.match(/<meta[^>]*?content=["']([^"']+)["'][^>]*?name=["']description["']/i);
    if (metaDescMatch?.[1]) description = metaDescMatch[1].trim();
  }

  const decodeHtml = (str: string) =>
    str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  title = decodeHtml(title);
  description = decodeHtml(description);

  let image = "";
  const ogImageMatch =
    bodyLessHtml.match(/<meta[^>]*?property=["']og:image["'][^>]*?content=["']([^"']+)["']/i) ||
    bodyLessHtml.match(/<meta[^>]*?content=["']([^"']+)["'][^>]*?property=["']og:image["']/i);
  if (ogImageMatch?.[1]) image = ogImageMatch[1].trim();

  let category: Resource["category"] = "example";
  const tags: string[] = ["web"];
  const urlLower = url.toLowerCase();
  if (urlLower.includes("docs") || urlLower.includes("documentation") || urlLower.includes("wiki")) {
    category = "official";
    tags.push("docs");
  } else if (urlLower.includes("tutorial") || urlLower.includes("course") || urlLower.includes("learn")) {
    category = "tutorial";
    tags.push("tutorial");
  } else if (urlLower.includes("github.com") || urlLower.includes("gitlab.com")) {
    category = "repo";
    tags.push("git");
  }

  return {
    title,
    description,
    category,
    tags,
    link: url,
    image:
      image && isSafeUrl(image)
        ? image
        : `https://picsum.photos/id/${Math.floor(Math.random() * 800) + 100}/800/450`,
  };
}

export function createPipeIngest(deps: PipeDeps) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const safeFetchImpl = deps.safeFetchImpl ?? safeFetch;

  return {
    async ingestRaw(payload: RawPayload) {
      const { title, link } = payload;
      if (!title || !link) {
        return { ok: false as const, status: 400, error: "Payload title and link are required" };
      }
      if (!isSafeUrl(link)) {
        return {
          ok: false as const,
          status: 400,
          error: "SSRF Prevention: link must be an http or https URL pointing to a public host.",
        };
      }
      if (payload.image && !isSafeUrl(payload.image)) {
        return {
          ok: false as const,
          status: 400,
          error: "SSRF Prevention: image must be an http or https URL pointing to a public host.",
        };
      }
      const resource = await deps.addResource({
        id: payload.id,
        title,
        description: payload.description || "No description provided.",
        category: payload.category || "example",
        tags: Array.isArray(payload.tags) ? payload.tags : ["raw"],
        link,
        image: payload.image || `https://picsum.photos/id/${Math.floor(Math.random() * 800) + 100}/800/450`,
        kind: payload.kind,
        runtime: payload.runtime,
        entry: payload.entry,
        display: payload.display,
      });
      return { ok: true as const, method: "raw" as const, resource };
    },

    async ingestUrl(url: string, type?: string, payload?: RawPayload) {
      if (!(await isSafeUrlResolved(url))) {
        return {
          ok: false as const,
          status: 400,
          error: "SSRF Prevention: Ingestion of internal, loopback, or private network ranges is prohibited.",
        };
      }

      const current = await deps.listResources();
      const existing = current.find((r) => normalizeLink(r.link) === normalizeLink(url));
      if (existing) {
        return {
          ok: true as const,
          method: "duplicate" as const,
          message: "Resource already exists in the garden",
          resource: existing,
        };
      }

      const githubParams = parseGitHubRepo(url);
      if (githubParams && type !== "web") {
        try {
          const parsedMetadata = await fetchGitHubMetadata(githubParams.owner, githubParams.repo, fetchImpl);
          if (payload?.title) parsedMetadata.title = payload.title;
          if (payload?.description) parsedMetadata.description = payload.description;
          if (payload?.category) parsedMetadata.category = payload.category;
          if (Array.isArray(payload?.tags)) {
            parsedMetadata.tags = Array.from(new Set([...parsedMetadata.tags, ...payload.tags]));
          }
          const resource = await deps.addResource(parsedMetadata);
          return { ok: true as const, method: "github-api" as const, resource };
        } catch (ghError: unknown) {
          const message = ghError instanceof Error ? ghError.message : "GitHub failed";
          console.warn(`GitHub API resolution failed: ${message}. Falling back to general web scraper.`);
        }
      }

      try {
        const parsedMetadata = await fetchWebpageMetadata(url, safeFetchImpl);
        if (payload?.title) parsedMetadata.title = payload.title;
        if (payload?.description) parsedMetadata.description = payload.description;
        if (payload?.category) parsedMetadata.category = payload.category;
        if (Array.isArray(payload?.tags)) {
          parsedMetadata.tags = Array.from(new Set([...parsedMetadata.tags, ...payload.tags]));
        }
        const resource = await deps.addResource(parsedMetadata);
        return { ok: true as const, method: "web-scraper" as const, resource };
      } catch (scrapeError: unknown) {
        const message = scrapeError instanceof Error ? scrapeError.message : "scrape failed";
        return {
          ok: false as const,
          status: 500,
          error: `Failed to resolve or parse webpage metadata: ${message}`,
        };
      }
    },
  };
}
