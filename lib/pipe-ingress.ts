import { NextRequest, NextResponse } from "next/server";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLoopbackHost(host: string): boolean {
  const hostname = host.toLowerCase().split("%")[0];
  if (LOOPBACK.has(hostname)) return true;
  if (hostname.startsWith("127.")) return true;
  return false;
}

function hostnameOnly(host: string): string {
  const trimmed = host.trim().toLowerCase();
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end >= 0 ? trimmed.slice(1, end) : trimmed;
  }
  return trimmed.split(":")[0];
}

/**
 * Mutation ingress for POST /api/pipe.
 *
 * Browser requests must send a same-origin Origin.
 * CLI (curl, pipe-to-wiki.sh) has no Origin — those are loopback-only.
 */
export function rejectUnsafePipePost(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const requestHost = hostnameOnly(request.nextUrl.hostname || request.nextUrl.host);

  if (origin) {
    try {
      const originHost = hostnameOnly(new URL(origin).hostname);
      if (originHost !== requestHost) {
        return NextResponse.json(
          { error: "CSRF Prevention: Origin does not match this wiki." },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json({ error: "CSRF Prevention: malformed Origin." }, { status: 403 });
    }
    return null;
  }

  if (!isLoopbackHost(requestHost)) {
    return NextResponse.json(
      { error: "Pipe ingest without Origin is only allowed on loopback." },
      { status: 403 },
    );
  }

  return null;
}
