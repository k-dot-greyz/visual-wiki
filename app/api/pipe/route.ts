import { NextRequest, NextResponse } from "next/server";
import { getResources, addResourceDirect } from "@/app/actions";
import { Resource } from "@/lib/types";
import { parseGitHubRepo } from "@/lib/github-hydrate";
import { isSafeUrl, isSafeUrlResolved, safeFetch, readCappedText } from "@/lib/safe-url";

const CATEGORIES: Resource["category"][] = ["official", "example", "tutorial", "repo", "pattern"];

function normalizeCategory(value: unknown): Resource["category"] | undefined {
  return typeof value === "string" && (CATEGORIES as string[]).includes(value)
    ? (value as Resource["category"])
    : undefined;
}

/** Images are rendered in the browser, so http here would mean mixed content. */
function isSafeImageUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\//i.test(value) && isSafeUrl(value);
}

type ScrapedMetadata = Omit<Resource, "id" | "addedAt">;

/** Merge caller-supplied overrides, keeping category on its enum and fields bounded. */
function applyPayloadOverrides(metadata: ScrapedMetadata, payload: unknown): void {
  if (!payload || typeof payload !== "object") return;
  const p = payload as Record<string, unknown>;

  if (typeof p.title === "string" && p.title.trim()) metadata.title = p.title.slice(0, 300);
  if (typeof p.description === "string" && p.description.trim()) {
    metadata.description = p.description.slice(0, 2000);
  }
  const category = normalizeCategory(p.category);
  if (category) metadata.category = category;
  if (Array.isArray(p.tags)) {
    const extra = p.tags.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 40));
    metadata.tags = Array.from(new Set([...metadata.tags, ...extra])).slice(0, 12);
  }
}

/**
 * `/api/pipe` POST writes to disk with no session behind it. Two guards keep a
 * random web page from driving it through a visitor's browser:
 *  - requiring `application/json` forces a CORS preflight, which a cross-origin
 *    page cannot satisfy (a `text/plain` form post is a "simple request" and
 *    would otherwise go straight through);
 *  - when `VISUAL_WIKI_PIPE_TOKEN` is set, a matching bearer/`x-pipe-token`
 *    header is also required.
 */
function rejectUnauthorizedPipe(request: NextRequest): NextResponse | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 },
    );
  }

  const expected = process.env.VISUAL_WIKI_PIPE_TOKEN;
  if (expected) {
    const presented =
      request.headers.get("x-pipe-token") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      "";
    if (presented !== expected) {
      return NextResponse.json({ error: "Pipe token required" }, { status: 401 });
    }
  }

  return null;
}

// GET Handshake / Sync info
export async function GET() {
  try {
    const resources = await getResources();
    const handshakeData = {
      status: "ready",
      total: resources.length,
      fingerprint: resources.map((r) => `${r.id}:${r.addedAt}`).join("|"),
      schema: {
        id: "string",
        title: "string",
        description: "string",
        category: "official | example | tutorial | repo | pattern",
        tags: "string[]",
        link: "string",
        image: "string",
        addedAt: "string",
      },
      resources: resources.map((r) => ({
        id: r.id,
        title: r.title,
        link: r.link,
        category: r.category,
        addedAt: r.addedAt,
      })),
    };
    return NextResponse.json(handshakeData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to perform GET handshake" },
      { status: 500 }
    );
  }
}

// Fetch GitHub repository metadata from the public API
async function fetchGitHubMetadata(owner: string, repo: string) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const response = await fetch(apiUrl, {
    headers: {
      "User-Agent": "visual-wiki-pipe-agent",
      Accept: "application/vnd.github.v3+json",
    },
    next: { revalidate: 60 }, // Cache briefly
  });

  if (!response.ok) {
    throw new Error(`GitHub API responded with status ${response.status}`);
  }

  const data = await response.json();
  const title = data.full_name || `${owner}/${repo}`;
  const description = data.description || "A public repository on GitHub.";

  const tags: string[] = [];
  if (data.language) {
    tags.push(data.language.toLowerCase());
  }
  if (Array.isArray(data.topics)) {
    data.topics.slice(0, 4).forEach((topic: string) => tags.push(topic.toLowerCase()));
  }
  if (tags.length === 0) {
    tags.push("github", "repo");
  }

  return {
    title,
    description,
    category: "repo" as const,
    tags: Array.from(new Set(tags)), // deduplicate
    link: data.html_url || `https://github.com/${owner}/${repo}`,
    image: `https://picsum.photos/id/${Math.floor(Math.random() * 800) + 100}/800/450`, // Random nice image
  };
}

// Scrape title, description, and Open Graph image from a general web page
async function fetchWebpageMetadata(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let html: string;
  try {
    const response = await safeFetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

  // Simple clean-up to prevent regex matching inside script tags
  const bodyLessHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Extract Title
  let title = "Curated Resource";
  const titleMatch = bodyLessHtml.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  // Extract Description
  let description = "No description found.";

  // Look for og:description first
  const ogDescMatch = bodyLessHtml.match(/<meta[^>]*?property=["']og:description["'][^>]*?content=["']([^"']+)["']/i) ||
                      bodyLessHtml.match(/<meta[^>]*?content=["']([^"']+)["'][^>]*?property=["']og:description["']/i);

  if (ogDescMatch && ogDescMatch[1]) {
    description = ogDescMatch[1].trim();
  } else {
    // Fallback to meta description
    const metaDescMatch = bodyLessHtml.match(/<meta[^>]*?name=["']description["'][^>]*?content=["']([^"']+)["']/i) ||
                          bodyLessHtml.match(/<meta[^>]*?content=["']([^"']+)["'][^>]*?name=["']description["']/i);
    if (metaDescMatch && metaDescMatch[1]) {
      description = metaDescMatch[1].trim();
    }
  }

  // Decode basic HTML entities for title and description
  const decodeHtml = (str: string) => {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  title = decodeHtml(title);
  description = decodeHtml(description);

  // Extract Image
  let image = "";
  const ogImageMatch = bodyLessHtml.match(/<meta[^>]*?property=["']og:image["'][^>]*?content=["']([^"']+)["']/i) ||
                       bodyLessHtml.match(/<meta[^>]*?content=["']([^"']+)["'][^>]*?property=["']og:image["']/i);
  if (ogImageMatch && ogImageMatch[1]) {
    image = ogImageMatch[1].trim();
  }

  // Basic classification
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
    image: isSafeImageUrl(image)
      ? image
      : `https://picsum.photos/id/${Math.floor(Math.random() * 800) + 100}/800/450`,
  };
}

// POST Ingestion / Pipe endpoint
export async function POST(request: NextRequest) {
  const unauthorized = rejectUnauthorizedPipe(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { type, url, payload } = body;

    // 1. RAW/DIRECT MAPPING MODE
    if (type === "raw" || (!url && payload)) {
      const { title, description, category, tags, link, image } = payload || body;

      if (!title || !link) {
        return NextResponse.json(
          { error: "Payload title and link are required" },
          { status: 400 }
        );
      }

      if (!isSafeUrl(link)) {
        return NextResponse.json(
          { error: "SSRF Prevention: link must be an http or https URL pointing to a public host." },
          { status: 400 }
        );
      }

      if (image && !isSafeImageUrl(image)) {
        return NextResponse.json(
          { error: "SSRF Prevention: image must be an https URL pointing to a public host." },
          { status: 400 }
        );
      }

      const resource = await addResourceDirect({
        title: String(title).slice(0, 300),
        description: String(description || "No description provided.").slice(0, 2000),
        category: normalizeCategory(category) ?? "example",
        tags: Array.isArray(tags) ? tags.slice(0, 12).map((t) => String(t).slice(0, 40)) : ["raw"],
        link,
        image: image || `https://picsum.photos/id/${Math.floor(Math.random() * 800) + 100}/800/450`,
      });

      return NextResponse.json({ success: true, method: "raw", resource });
    }

    // Validation for URL-based piping
    if (!url) {
      return NextResponse.json(
        { error: "Target url parameter is required" },
        { status: 400 }
      );
    }

    if (!(await isSafeUrlResolved(url))) {
      return NextResponse.json(
        { error: "SSRF Prevention: Ingestion of internal, loopback, or private network ranges is prohibited." },
        { status: 400 }
      );
    }

    // 2. CHECK IF CURRENTLY EXISTS IN THE GARDEN (PREVENT DUPLICATES)
    const currentResources = await getResources();
    const existing = currentResources.find(
      (r) => r.link.toLowerCase().replace(/\/$/, "") === url.toLowerCase().replace(/\/$/, "")
    );

    if (existing) {
      return NextResponse.json({
        success: true,
        method: "duplicate",
        message: "Resource already exists in the garden",
        resource: existing,
      });
    }

    // 3. ATTEMPT GITHUB API PARSING IF MATCHED
    const githubParams = parseGitHubRepo(url);
    if (githubParams && type !== "web") {
      try {
        const parsedMetadata = await fetchGitHubMetadata(githubParams.owner, githubParams.repo);

        // Merge optional overrides from user payload
        applyPayloadOverrides(parsedMetadata, payload);

        const resource = await addResourceDirect(parsedMetadata);
        return NextResponse.json({ success: true, method: "github-api", resource });
      } catch (ghError: any) {
        console.warn(`GitHub API resolution failed: ${ghError.message}. Falling back to general web scraper.`);
      }
    }

    // 4. GENERAL WEBPAGE SCRAPER (FALLBACK)
    try {
      const parsedMetadata = await fetchWebpageMetadata(url);

      // Merge optional overrides from user payload
      applyPayloadOverrides(parsedMetadata, payload);

      const resource = await addResourceDirect(parsedMetadata);
      return NextResponse.json({ success: true, method: "web-scraper", resource });
    } catch (scrapeError: any) {
      return NextResponse.json(
        { error: `Failed to resolve or parse webpage metadata: ${scrapeError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: `Internal server error during ingestion: ${error.message}` },
      { status: 500 }
    );
  }
}
