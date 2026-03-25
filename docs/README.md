---
summary: "Documentation index and front-matter contract for Rankclaw"
read_when:
  - Adding or editing documentation in this repository.
  - Setting up Rankclaw delivery workflows and docs validation.
---

# Docs

This folder contains product, process, and evaluation docs used by humans and coding agents.

## Front-Matter Contract

Every markdown file in `docs/` must include YAML front matter with:

- `summary`: concise one-line description.
- `read_when`: non-empty list of situations when this doc should be read.

Validation is enforced by `npm run docs:list`.

## Current Docs

- `docs/PRD0.md`: source synthesis for the initial Rankclaw product definition.
- `docs/PRD.md`: scoped execution PRD that must be approved before backlog creation.
- `docs/linear-backlog.md`: approved Stage 2 backlog and Stage 3 entry notes.
- `docs/delivery-process.md`: three-stage approval and execution process.
- `docs/linear-story-template.md`: canonical story template for Linear issues.
- `docs/testing-fixtures.md`: fixture and snapshot layout for deterministic artifact tests.
- `docs/evals/project-scorecard.md`: reusable project-level evaluation rubric.
- `docs/agent-workflow.md`: codex-first agent workflow and guardrails.
- `docs/commands.md`: in-repo command prompt index.
- `docs/deploying-to-vercel.md`: minimal Vercel deployment path for `apps/web`.
