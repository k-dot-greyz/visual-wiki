import { NextRequest, NextResponse } from "next/server";
import { resetGardenAction, addResourceDirect } from "@/app/actions";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const op = body.op ?? "reset";

  if (process.env.E2E_GARDEN_RESET !== "1") {
    return NextResponse.json({ error: "Garden test helpers are disabled" }, { status: 403 });
  }

  if (op === "reset") {
    await resetGardenAction();
    return NextResponse.json({ ok: true });
  }

  if (op === "seed" && body.resource) {
    const resource = await addResourceDirect(body.resource);
    return NextResponse.json({ ok: true, resource });
  }

  return NextResponse.json({ error: "Unknown op" }, { status: 400 });
}
