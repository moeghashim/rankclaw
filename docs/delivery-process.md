---
summary: "Three-stage approval and execution process for Rankclaw delivery"
read_when:
  - Starting a new planning or execution cycle for Rankclaw.
  - Deciding whether work belongs in PRD, backlog creation, or Symphony execution.
---

# Delivery Process

Rankclaw uses three hard stages.

## Stage 1: PRD

Create and refine:
- `docs/PRD0.md`
- `docs/PRD.md`

Nothing enters implementation until `docs/PRD.md` is approved.

## Stage 2: Linear backlog

Generate Linear epics and user stories from the approved PRD.

Every story must include:
- acceptance criteria
- validation steps
- eval criteria
- outcome-focused description

Nothing enters Symphony execution until the backlog wording and priorities are approved.

## Stage 3: Symphony execution

Symphony works one approved story at a time.

Each story must complete:
1. branch creation
2. implementation
3. commit
4. PR creation
5. Codex review
6. validation
7. eval
8. workpad and PR evidence update

The next story does not begin until the current one satisfies the done gate.

Validation and Eval are mandatory in both the Linear story shape and the PR
template. `npm run agent:check` includes `npm run delivery:check`, which fails
if the managed workflow docs or templates are removed or lose the required
sections.
