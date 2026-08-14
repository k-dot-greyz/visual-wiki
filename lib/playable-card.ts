import { z } from "zod";
import { isSafeUrl } from "./safe-url";

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

export const playableCardSchema = z.object({
  kind: z.literal("playable"),
  repo: githubRepoUrl,
  runtime: z.enum(["none", "iframe", "webcontainer", "vm"]).default("none"),
  entry: safeHttpsEntry.optional(),
  display: z.enum(["tree", "ogl"]).default("tree"),
});

export type PlayableCard = z.infer<typeof playableCardSchema>;
