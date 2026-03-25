# Rankclaw

Rankclaw is a CLI-first SEO operating system for research, crawling, review synthesis, comparison briefs,
technical audits, and evaluation. This repo is initialized from `PI-Starter` and uses a strict three-stage
delivery model before any implementation work is delegated to Symphony.

## Delivery model

1. Create and approve the PRD
2. Create and approve Linear user stories with acceptance criteria
3. Let Symphony execute approved stories one by one with PR and review gates

See [docs/delivery-process.md](./docs/delivery-process.md), [docs/PRD0.md](./docs/PRD0.md), and
[docs/PRD.md](./docs/PRD.md).

## Product shape

- `apps/web`: future dashboard, reports, docs, and onboarding surface
- `packages/core`: shared domain logic, schemas, and reusable operators
- future CLI package: the primary execution layer for the MVP

## Setup

```bash
npm run doctor
npm install
npm run docs:list
npm run check
npm test
npm run agent:check
```

If you switch between `arm64` and `x64`, or between Rosetta and native Node, run `npm run reinstall:clean`
to refresh native dependencies.

## Current focus

Stage 1 only is implemented in-repo right now:
- PRD synthesis and scoped PRD
- Linear story template
- project eval scorecard template
- PR template with validation and eval gates

Linear issue creation and Symphony execution start only after the PRD is approved.

## Workspaces

- `@rankclaw/web`
- `@rankclaw/core`
