import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseAetherDeck } from "@/lib/aether-card";

export async function GET() {
  const raw = readFileSync(resolve(process.cwd(), "decks/ux-journey.json"), "utf-8");
  const deck = parseAetherDeck(raw);
  return NextResponse.json(deck);
}
