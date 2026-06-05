import { NextRequest, NextResponse } from "next/server";
import { getResources, addResourceDirect } from "@/app/actions";
import { Resource } from "@/lib/types";
import { isSafeUrl } from "@/lib/security";

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

// isSafeUrl is imported from @/lib/security above.

// Helper to extract GitHub owner and repo from URL
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (match && match[1] && match[2]) {
      // Remove trailing .git or trailing slashes/hashes
      const owner = match[1];
      const repo = match[2].replace(/\.git$/i, "").split(/[?#]/)[0];
      return { owner, repo };
    }
  } catch (e) {
    // Ignore parsing error
  }
  return null;
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
  // Abort after 15 s to prevent the server from hanging on slow/infinite responses
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Webpage responded with status ${response.status}`);
    }

    // Stream the body with a 1 MB cap to prevent OOM from giant/infinite responses
    const MAX_BYTES = 1_024 * 1_024;
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is not readable");
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        chunks.push(value);
        if (totalBytes >= MAX_BYTES) {
          reader.cancel().catch(() => {});
          break;
        }
      }
    } catch (readErr) {
      reader.cancel().catch(() => {});
      throw readErr;
    }

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    html = new TextDecoder("utf-8", { fatal: false }).decode(merged);
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
    image: image || `https://picsum.photos/id/${Math.floor(Math.random() * 800) + 100}/800/450`,
  };
}

// POST Ingestion / Pipe endpoint
export async function POST(request: NextRequest) {
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

      const resource = await addResourceDirect({
        title,
        description: description || "No description provided.",
        category: category || "example",
        tags: Array.isArray(tags) ? tags : ["raw"],
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

    if (!isSafeUrl(url)) {
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
    const githubParams = parseGitHubUrl(url);
    if (githubParams && type !== "web") {
      try {
        const parsedMetadata = await fetchGitHubMetadata(githubParams.owner, githubParams.repo);

        // Merge optional overrides from user payload
        if (payload) {
          if (payload.title) parsedMetadata.title = payload.title;
          if (payload.description) parsedMetadata.description = payload.description;
          if (payload.category) parsedMetadata.category = payload.category;
          if (Array.isArray(payload.tags)) parsedMetadata.tags = Array.from(new Set([...parsedMetadata.tags, ...payload.tags]));
        }

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
      if (payload) {
        if (payload.title) parsedMetadata.title = payload.title;
        if (payload.description) parsedMetadata.description = payload.description;
        if (payload.category) parsedMetadata.category = payload.category;
        if (Array.isArray(payload.tags)) parsedMetadata.tags = Array.from(new Set([...parsedMetadata.tags, ...payload.tags]));
      }

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
