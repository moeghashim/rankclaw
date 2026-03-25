# @rankclaw/core

Public entrypoint: `src/index.ts` (re-exports only).

Shared intake utilities include:
- target + competitor input normalization
- deterministic intake artifact serialization
- helper paths for downstream workflow reuse

Shared research utilities include:
- Gemini and Grok prompt construction from normalized intake artifacts
- engine-specific fixture/raw response parsing and normalization into recommendation snapshots
- deterministic research artifact serialization for downstream brief/eval workflows

Test support for canonical artifact fixtures lives in:
- `test/fixtures`
- `test/__snapshots__`
- `test/support`

Update snapshots with:
- `UPDATE_SNAPSHOTS=1 npm test --workspace @rankclaw/core`
