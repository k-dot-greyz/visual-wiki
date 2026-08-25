import { z } from "zod";
import { isSafeUrl } from "./safe-url";
import { normalizeRuntime } from "./entry-runtime";

const githubRepoUrl = z
  .string()
  .url()
  .refine((u) => /^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(u), {
    message: "repo must be an https://github.com/owner/name URL",
  })
  .refine((u) => isSafeUrl(u), { message: "repo URL failed SSRF guard" });

const safeHttpsEntry = z
  .string()
  .url()
  .refine((u) => /^https:\/\//i.test(u), { message: "entry must be https" })
  .refine((u) => isSafeUrl(u), { message: "entry URL failed SSRF guard" });

const runtimeIn = z.enum(["none", "iframe", "html5", "redirect", "webcontainer", "vm"]).default("none");

export const playableCardSchema = z
  .object({
    kind: z.literal("playable"),
    repo: githubRepoUrl,
    runtime: runtimeIn,
    entry: safeHttpsEntry.optional(),
    display: z.enum(["tree", "ogl"]).default("tree"),
  })
  .transform((card) => ({
    ...card,
    runtime: normalizeRuntime(card.runtime, card.entry),
  }));

export type PlayableCard = z.infer<typeof playableCardSchema>;
