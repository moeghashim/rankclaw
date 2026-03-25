---
summary: "Fixture and snapshot layout for deterministic Rankclaw artifact tests"
read_when:
  - Adding tests for crawl, brief, audit, or eval artifacts.
  - Updating or reviewing snapshot-backed fixtures in the repo.
---

# Testing Fixtures

Rankclaw keeps canonical artifact fixtures in `packages/core/test/fixtures`.

Layout:
- `packages/core/test/fixtures/crawl`: representative crawl payloads and extracted page records
- `packages/core/test/fixtures/brief`: generated brief inputs or outputs used by brief-generation stories
- `packages/core/test/fixtures/eval`: scored eval artifacts and quality summaries
- `packages/core/test/__snapshots__`: readable expected-output snapshots for fixture-backed tests
- `packages/core/test/support`: shared helpers for loading fixtures and asserting snapshots

Rules:
- Store canonical fixtures as JSON with realistic-but-small SEO data.
- Load fixtures through the shared helpers in `packages/core/test/support`.
- Prefer one readable snapshot per workflow shape over many tiny opaque snapshots.
- Keep fixture names stable and descriptive so future stories can reuse them.

Snapshot update path:

```bash
UPDATE_SNAPSHOTS=1 npm test --workspace @rankclaw/core
```

Review expectation:
- Snapshot diffs should be readable enough that a reviewer can understand output drift quickly.
- If a fixture changes, update the fixture and snapshot in the same PR and explain why in the PR body.
