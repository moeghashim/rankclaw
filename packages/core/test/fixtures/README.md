# Rankclaw Canonical Fixtures

This folder holds deterministic artifact fixtures for test coverage that should
survive future crawl, brief, and eval story work.

Structure:
- `crawl`: canonical page and crawl record payloads
- `brief`: canonical brief-generation inputs or outputs
- `eval`: canonical eval result payloads

Load these fixtures through `packages/core/test/support/fixtures.ts` instead of
hard-coding file paths in individual tests.
