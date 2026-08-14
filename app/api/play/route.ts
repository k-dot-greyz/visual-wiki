import { NextRequest, NextResponse } from "next/server";
import { hydrateGithub, parseGitHubRepo } from "@/lib/github-hydrate";
import { isSafeUrl } from "@/lib/safe-url";

function normalizeRepoParam(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https:\/\/github\.com\//i.test(trimmed)) return trimmed;
  if (/^[^/]+\/[^/]+$/.test(trimmed)) return `https://github.com/${trimmed}`;
  return null;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("repo") ?? "";
  const repoUrl = normalizeRepoParam(raw);
  if (!repoUrl || !isSafeUrl(repoUrl) || !parseGitHubRepo(repoUrl)) {
    return NextResponse.json({ ok: false, error: "Provide a public GitHub owner/repo" }, { status: 400 });
  }

  const result = await hydrateGithub(repoUrl);
  const status = result.ok ? 200 : result.error.match(/private/i) ? 404 : 502;
  return NextResponse.json(result, {
    status: result.ok ? 200 : status,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
