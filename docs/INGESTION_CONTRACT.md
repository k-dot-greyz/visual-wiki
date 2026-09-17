# Organize-on-Ingest Contract

## Status

Version `1.0`. The pipe is a classification boundary: payloads without an engine, category, provenance, and safe HTTP(S) link are rejected rather than organized later.

## Envelope

Required fields:

- `schemaVersion`: `"1.0"`
- `type`: `raw` or `url`
- `source.kind`: `conversation`, `url`, `github`, `file`, or `webhook`
- `engine`: `product`, `persona`, or `investment`
- `title`, `description`, `category`, `tags`, and `link`
- `provenance.capturedAt` and `provenance.capturedBy`

Categories are `official`, `example`, `tutorial`, `repo`, and `pattern`.

Tags are trimmed, lowercased, deduplicated, and capped at 32 values. Links must use `http` or `https`; unsafe schemes are rejected. A missing category never silently becomes `example`.

## Route semantics

The envelope is the shared boundary between zenOS inbox staging and visual-wiki. zenOS may retain the original envelope as a receipt, but visual-wiki receives only validated data. Duplicate links resolve to the existing resource.

## Compatibility

The existing resource card remains unchanged. This contract adds validation and provenance around the pipe; adapters may map a valid envelope into the current card shape.
