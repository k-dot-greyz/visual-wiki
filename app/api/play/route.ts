import { NextRequest, NextResponse } from "next/server";
import { hydrateGithub, parseGitHubRepo } from "@/lib/github-hydrate";
import { isSafeUrl } from "@/lib/safe-url";

/**
 * Normalizes a repository parameter into a GitHub repository URL.
 *
 * @param raw - A GitHub repository URL or an `owner/repository` identifier
 * @returns The normalized GitHub URL, or `null` for an empty or invalid value
 */
function normalizeRepoParam(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https:\/\/github\.com\//i.test(trimmed)) return trimmed;
  if (/^[^/]+\/[^/]+$/.test(trimmed)) return `https://github.com/${trimmed}`;
  return null;
}

/**
 * Retrieves hydrated data for a public GitHub repository specified by the `repo` query parameter.
 *
 * @param request - The request containing the repository identifier.
 * @returns A JSON response with repository data, or an error response with status 400, 404, or 502.
 */
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
