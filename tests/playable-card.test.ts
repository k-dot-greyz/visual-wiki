import { describe, expect, it } from "vitest";
import { playableCardSchema } from "@/lib/playable-card";

const valid = {
  kind: "playable" as const,
  repo: "https://github.com/nari-labs/dia",
};

describe("playableCardSchema", () => {
  it("accepts a public GitHub repo with defaults", () => {
    expect(playableCardSchema.parse(valid)).toMatchObject({
      kind: "playable",
      repo: "https://github.com/nari-labs/dia",
      runtime: "none",
      display: "tree",
    });
  });

  it("accepts redirect runtime with https entry", () => {
    const parsed = playableCardSchema.parse({
      ...valid,
      runtime: "redirect",
      entry: "https://glitchworks.tech",
      display: "ogl",
    });
    expect(parsed.runtime).toBe("redirect");
    expect(parsed.entry).toBe("https://glitchworks.tech");
    expect(parsed.display).toBe("ogl");
  });

  it("accepts stub runtimes webcontainer and vm", () => {
    expect(playableCardSchema.parse({ ...valid, runtime: "webcontainer" }).runtime).toBe(
      "webcontainer",
    );
    expect(playableCardSchema.parse({ ...valid, runtime: "vm" }).runtime).toBe("vm");
  });

  it("rejects javascript: repo", () => {
    expect(
      playableCardSchema.safeParse({ kind: "playable", repo: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("rejects non-https and non-github repos", () => {
    expect(
      playableCardSchema.safeParse({ kind: "playable", repo: "http://github.com/nari-labs/dia" })
        .success,
    ).toBe(false);
    expect(
      playableCardSchema.safeParse({ kind: "playable", repo: "https://gitlab.com/nari-labs/dia" })
        .success,
    ).toBe(false);
  });

  it("rejects a GitHub URL missing owner/repo", () => {
    expect(
      playableCardSchema.safeParse({ kind: "playable", repo: "https://github.com/nari-labs" })
        .success,
    ).toBe(false);
  });

  it("rejects javascript: and localhost entry URLs", () => {
    expect(
      playableCardSchema.safeParse({
        ...valid,
        runtime: "redirect",
        entry: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      playableCardSchema.safeParse({
        ...valid,
        runtime: "redirect",
        entry: "https://localhost/preview",
      }).success,
    ).toBe(false);
    expect(
      playableCardSchema.safeParse({
        ...valid,
        runtime: "redirect",
        entry: "https://[fe80::1]/",
      }).success,
    ).toBe(false);
  });
});
