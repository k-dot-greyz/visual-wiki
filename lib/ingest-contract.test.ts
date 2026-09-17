import { describe, expect, it } from "vitest";
import { normalizeTags, parseIngestEnvelope } from "./ingest-contract";

const valid = {
  schemaVersion: "1.0",
  type: "raw",
  source: { kind: "conversation", ref: "session-1" },
  engine: "persona",
  title: "Conversation pattern",
  description: "A staged ingestion pattern.",
  category: "pattern",
  tags: [" Ingest ", "pattern", "ingest"],
  link: "https://example.com/resource",
  provenance: { capturedAt: "2026-09-15T01:00:00.000Z", capturedBy: "perplexity", sessionId: "session-1" },
};

describe("ingest contract", () => {
  it("accepts valid envelopes and normalizes tags", () => {
    expect(parseIngestEnvelope(valid).tags).toEqual(["ingest", "pattern"]);
  });

  it("rejects missing organization fields", () => {
    expect(() => parseIngestEnvelope({ ...valid, engine: undefined })).toThrow();
    expect(() => parseIngestEnvelope({ ...valid, category: "unclassified" })).toThrow();
  });

  it("rejects unsafe links", () => {
    expect(() => parseIngestEnvelope({ ...valid, link: "javascript:alert(1)" })).toThrow();
  });

  it("normalizes and deduplicates tags", () => {
    expect(normalizeTags([" Rust ", "rust", "", "AI"])).toEqual(["rust", "ai"]);
  });
});
