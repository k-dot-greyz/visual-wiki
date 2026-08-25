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

/**
 * `iframe` is deliberately absent. `entry` is attacker-controlled, so no card
 * shape may ever ask the UI to frame a third-party document — see
 * `lib/run-pane.ts` for the policy. `media` renders a native HTML5 player,
 * `link` renders a user-initiated link-out.
 */
export const playableCardSchema = z.object({
  kind: z.literal("playable"),
  repo: githubRepoUrl,
  runtime: z.enum(["none", "media", "link", "webcontainer", "vm"]).default("none"),
  entry: safeHttpsEntry.optional(),
  display: z.enum(["tree", "ogl"]).default("tree"),
});

export type PlayableCard = z.infer<typeof playableCardSchema>;
