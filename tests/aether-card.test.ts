import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  aetherCardSchema,
  aetherDeckSchema,
  aetherTypeSchema,
  parseAetherDeck,
  validateCard,
  validateDeck,
} from "@/lib/aether-card";

const fool = {
  id: "000",
  name: "The Fool",
  sub: "Journey: Land the garden",
  type: "void" as const,
  stats: { atk: 0, def: 90, spd: 0 },
  desc: "A blank slate. Land / with landmarks, skip link, and an honest footer count.",
};

const magician = {
  id: "004",
  name: "The Magician",
  sub: "Journey: Add a resource",
  type: "fire" as const,
  stats: { atk: 55, def: 80, spd: 16 },
  desc: "Will into form. Open Add, autofocus title, plant e2e-ux-magician.",
  image: "text-red-400",
  icon: "Flame",
  depends_on: ["003"],
  metadata: {
    wiki: {
      route: "/",
      testidPrefix: "wiki-add",
      journey: "mutate",
    },
  },
};

describe("validateCard", () => {
  it("accepts The Fool with required Aether fields", () => {
    expect(validateCard(fool)).toBe(true);
    expect(aetherCardSchema.parse(fool).id).toBe("000");
  });

  it("accepts The Magician plus extra wiki keys tarot ignores", () => {
    expect(validateCard(magician)).toBe(true);
    const parsed = aetherCardSchema.parse(magician);
    expect(parsed.depends_on).toEqual(["003"]);
    expect(parsed.metadata?.wiki?.route).toBe("/");
  });

  it("rejects a card missing stats.atk", () => {
    const broken = {
      ...fool,
      stats: { def: 90, spd: 0 },
    };
    expect(validateCard(broken)).toBe(false);
    expect(aetherCardSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects empty id or name", () => {
    expect(validateCard({ ...fool, id: "   " })).toBe(false);
    expect(validateCard({ ...fool, name: "" })).toBe(false);
  });

  it("rejects unknown elemental types", () => {
    expect(aetherTypeSchema.safeParse("plasma").success).toBe(false);
    expect(validateCard({ ...fool, type: "plasma" })).toBe(false);
  });
});

describe("validateDeck", () => {
  it("accepts an ordered Fool + Magician pair", () => {
    expect(validateDeck([fool, magician])).toBe(true);
  });

  it("rejects a non-array", () => {
    expect(validateDeck({ cards: [fool] })).toBe(false);
  });
});

describe("ux-journey deck", () => {
  const raw = readFileSync(resolve("decks/ux-journey.json"), "utf-8");
  const deck = parseAetherDeck(raw);

  it("is a tarot-valid 22-card FIFO", () => {
    expect(deck).toHaveLength(22);
    expect(validateDeck(deck)).toBe(true);
    expect(aetherDeckSchema.parse(deck)).toHaveLength(22);
  });

  it("uses 3-digit ids 000-021 in spd order", () => {
    const ids = deck.map((c) => c.id);
    expect(ids).toEqual(Array.from({ length: 22 }, (_, i) => String(i).padStart(3, "0")));
    const spds = deck.map((c) => c.stats.spd);
    expect(spds).toEqual([...spds].sort((a, b) => a - b));
    expect(spds[0]).toBe(0);
    expect(spds[21]).toBe(84);
  });

  it("keeps depends_on pointing at earlier cards only", () => {
    const seen = new Set<string>();
    for (const card of deck) {
      for (const dep of card.depends_on ?? []) {
        expect(seen.has(dep), `${card.id} depends on unseen ${dep}`).toBe(true);
      }
      seen.add(card.id);
    }
  });

  it("covers the named Major Arcana UX steps", () => {
    const names = deck.map((c) => c.name);
    expect(names).toContain("The Fool");
    expect(names).toContain("The Magician");
    expect(names).toContain("High Priestess");
    expect(names).toContain("Death");
    expect(names).toContain("The World");
  });
});
