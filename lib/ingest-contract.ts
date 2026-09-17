import { z } from "zod";

export const ingestCategories = ["official", "example", "tutorial", "repo", "pattern"] as const;
export const ingestEngines = ["product", "persona", "investment"] as const;
export const ingestSourceKinds = ["conversation", "url", "github", "file", "webhook"] as const;

export const ingestEnvelopeSchema = z.object({
  schemaVersion: z.literal("1.0"),
  type: z.enum(["raw", "url"]),
  source: z.object({
    kind: z.enum(ingestSourceKinds),
    ref: z.string().min(1).optional(),
  }),
  engine: z.enum(ingestEngines),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().min(1).max(5000),
  category: z.enum(ingestCategories),
  tags: z.array(z.string().trim().min(1).max(64)).max(32),
  link: z.string().url().refine((value) => /^https?:$/i.test(new URL(value).protocol), "link must use http or https"),
  image: z.string().url().optional(),
  provenance: z.object({
    capturedAt: z.string().datetime(),
    capturedBy: z.string().trim().min(1).max(120),
    sessionId: z.string().trim().min(1).max(200).optional(),
  }),
});

export type IngestEnvelope = z.infer<typeof ingestEnvelopeSchema>;

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 32);
}

export function parseIngestEnvelope(input: unknown): IngestEnvelope {
  const parsed = ingestEnvelopeSchema.parse(input);
  return { ...parsed, tags: normalizeTags(parsed.tags) };
}
