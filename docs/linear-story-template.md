---
summary: "Canonical template for Rankclaw Linear user stories"
read_when:
  - Creating Linear stories from the approved PRD.
  - Reviewing whether a story is small enough for one PR and one review cycle.
---

# Linear Story Template

Use this shape for every Rankclaw story.

## Title

`[Area] Outcome-focused story title`

## Description

State:
- who benefits
- what changes
- why it matters to the workflow

## Acceptance Criteria

- [ ] Clear outcome 1
- [ ] Clear outcome 2
- [ ] Clear outcome 3

## Validation

- [ ] Command: `...`
- [ ] Expected result: `...`
- [ ] Automated tests: `...`
- [ ] Regression or fixture check: `...`

## Eval

- [ ] Output is specific enough for the operator to use without rewriting it
- [ ] Output is structurally clear and easy to inspect
- [ ] Output is aligned with answer-engine and SEO use cases
- [ ] Any relevant scorecard dimension is updated

## Dependencies

- List only blocking dependencies

## Done gate

This story is not done until it has:
- a commit
- a PR
- a Codex review pass
- completed validation
- completed eval
