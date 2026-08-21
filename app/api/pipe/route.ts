import { NextRequest, NextResponse } from "next/server";
import { getResources, addResourceDirect } from "@/app/actions";
import { createPipeIngest } from "@/lib/pipe-ingest";

function ingest() {
  return createPipeIngest({
    listResources: getResources,
    addResource: addResourceDirect,
  });
}

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
  } catch {
    return NextResponse.json({ error: "Failed to perform GET handshake" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, url, payload } = body;
    const pipe = ingest();

    if (type === "raw" || (!url && payload)) {
      const result = await pipe.ingestRaw(payload || body);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ success: true, method: result.method, resource: result.resource });
    }

    if (!url) {
      return NextResponse.json({ error: "Target url parameter is required" }, { status: 400 });
    }

    const result = await pipe.ingestUrl(url, type, payload);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      success: true,
      method: result.method,
      message: result.method === "duplicate" ? result.message : undefined,
      resource: result.resource,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { error: `Internal server error during ingestion: ${message}` },
      { status: 500 },
    );
  }
}
