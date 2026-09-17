import { z } from "zod";

/** Aether Deck v2.1 elementals — names frozen for glitchworks-tarot. */
export const aetherTypeSchema = z.enum(["fire", "water", "electric", "wind", "void", "dark"]);

export const aetherStatsSchema = z.object({
  atk: z.number(),
  def: z.number(),
  spd: z.number(),
});

const nonempty = z.string().refine((s) => s.trim().length > 0, "must be a non-empty string");

export const playwrightStepSchema = z
  .object({
    action: nonempty,
    url: z.string().optional(),
    selector: z.string().optional(),
    testid: z.string().optional(),
    role: z.string().optional(),
    name: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
    pattern: z.string().optional(),
    count: z.number().optional(),
    attribute: z.string().optional(),
    contains: z.string().optional(),
    notContains: z.string().optional(),
    status: z.number().optional(),
    body: z.unknown().optional(),
    keys: z.array(z.string()).optional(),
    text: z.string().optional(),
    method: z.string().optional(),
    expectLength: z.number().optional(),
  })
  .passthrough();

export const aetherLinkSchema = z.object({
  rel: z.string(),
  href: z.string(),
  label: z.string().optional(),
});

export const wikiPlaywrightSchema = z.object({
  steps: z.array(playwrightStepSchema),
  seed: z
    .object({ id: z.string() })
    .passthrough()
    .optional(),
  cleanup: z
    .object({ id: z.string() })
    .passthrough()
    .optional(),
  reducedMotion: z.boolean().optional(),
});

export const aetherCardSchema = z
  .object({
    id: nonempty,
    name: nonempty,
    sub: z.string(),
    type: aetherTypeSchema,
    stats: aetherStatsSchema,
    desc: z.string(),
    image: z.string().optional(),
    icon: z.string().optional(),
    customImage: z.string().optional(),
    hideStats: z.boolean().optional(),
    hideDesc: z.boolean().optional(),
    frame: z.string().optional(),
    hat: z.string().optional(),
    rarity: z.string().optional(),
    ability: z.string().optional(),
    deckBack: z.string().optional(),
    depends_on: z.array(z.string()).optional(),
    skippable: z.boolean().optional(),
    links: z.array(aetherLinkSchema).optional(),
    metadata: z
      .object({
        wiki: z
          .object({
            route: z.string(),
            testidPrefix: z.string(),
            journey: z.string(),
            wcag: z.array(z.string()).optional(),
            playwright: wikiPlaywrightSchema.optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough();

export const aetherDeckSchema = z.array(aetherCardSchema);

export type AetherType = z.infer<typeof aetherTypeSchema>;
export type AetherCard = z.infer<typeof aetherCardSchema>;
export type PlaywrightStep = z.infer<typeof playwrightStepSchema>;

/** Tarot-compatible boolean gate (extras allowed). */
export function validateCard(card: unknown): boolean {
  return aetherCardSchema.safeParse(card).success;
}

export function validateDeck(deck: unknown): boolean {
  return aetherDeckSchema.safeParse(deck).success;
}

export function parseAetherDeck(raw: string): AetherCard[] {
  return aetherDeckSchema.parse(JSON.parse(raw));
}
