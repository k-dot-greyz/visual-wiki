import { describe, expect, it } from "vitest";
import { readCappedText } from "@/lib/safe-url";

describe("readCappedText", () => {
  it("returns the full body when under the cap", async () => {
    const response = new Response("hello wiki", { status: 200 });
    await expect(readCappedText(response, 1024)).resolves.toBe("hello wiki");
  });

  it("stops reading once the byte cap is reached", async () => {
    const payload = "abcdefghij";
    const response = new Response(payload, { status: 200 });
    const text = await readCappedText(response, 4);
    expect(text.length).toBeLessThanOrEqual(4);
    expect(payload.startsWith(text)).toBe(true);
  });
});
