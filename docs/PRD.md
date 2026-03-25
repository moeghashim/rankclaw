---
summary: "Scoped execution PRD for the Rankclaw MVP"
read_when:
  - Approving the MVP scope before creating Linear stories.
  - Generating backlog items and defining acceptance, validation, and eval gates.
---

# Rankclaw PRD

## Overview

Rankclaw is a CLI-first SEO operating system for growth operators, consultants, and small teams who want
to turn answer-engine research and SEO execution into a repeatable workflow. The MVP focuses on research,
crawl, normalization, brief generation, audit, and evaluation. The web app exists in the repo as a future
surface for results and onboarding, but the CLI is the primary shipping target for the first milestone set.

## Target users

- solo SEO operators running multiple content and growth experiments
- consultants producing competitor reviews and comparison assets for clients
- in-house growth and content teams that need a repeatable research-to-brief workflow
- technical marketers who want machine-readable outputs instead of ad hoc prompts and spreadsheets

## MVP scope

The MVP must support:
- target and competitor intake
- answer-intent and recommendation capture from Gemini and Grok
- crawl and extraction through a Rankclaw adapter backed initially by `Scrapling`
- normalized source records for competitor pages, reviews, and related pages
- generation of:
  - standalone review-page briefs
  - comparison-page briefs
  - answer-hub style briefs
  - pSEO opportunity seeds
- technical and structural audits of inputs and outputs
- explicit per-feature validation and project-level evals

## Non-goals for the MVP

- full browser UI for day-to-day operation
- automatic publishing to CMS platforms
- complete rank tracking platform behavior
- backlink outreach automation
- multi-tenant SaaS account model
- autonomous Symphony execution before the PRD and backlog are approved

## Primary workflows

### 1. Research workflow

The operator provides a topic, target category, or brand area. Rankclaw queries Gemini and Grok, records
the recommendation patterns and question variants, and produces a structured answer-intent artifact.

### 2. Crawl workflow

The operator provides competitor pages, source pages, or seed URLs. Rankclaw crawls them, extracts useful
page structure, and normalizes the results into reusable records.

### 3. Brief workflow

Using the research and crawl artifacts, Rankclaw generates:
- review-page briefs
- comparison-page briefs
- answer-hub style briefs
- pSEO candidate sets

### 4. Audit workflow

Rankclaw runs structural checks against source pages or generated outputs using the selected audit stack and
produces a structured audit result.

### 5. Eval workflow

Rankclaw scores whether the feature output is actionable, specific, and structurally useful for SEO and
answer-engine work. Eval is mandatory, not optional.

## Core entities

- `Target`: the topic, site, brand, or category under analysis
- `Competitor`: a named competitor with canonical URLs and related references
- `ResearchQuery`: a recorded prompt/question sent to Gemini or Grok
- `RecommendationSnapshot`: the returned recommendation result with citations or notes
- `SourcePage`: a crawled page plus normalized page attributes
- `ReviewBrief`: a structured brief for a standalone competitor review page
- `ComparisonBrief`: a structured brief for a head-to-head page
- `AnswerHubBrief`: a brief for a summary/answer page designed for citation and recommendation contexts
- `PseoOpportunity`: a candidate page pattern or category expansion target
- `AuditResult`: structured output from technical and structural checks
- `EvalResult`: structured judgment of output quality and readiness

## Milestones

### M0 Foundation

Goal: make the repo ready for disciplined feature delivery.

Includes:
- initialize `rankclaw` from `PI-Starter`
- keep `apps/web` as the future product surface
- keep `packages/core` for shared logic
- prepare the repo for a future CLI package
- define docs, templates, and process artifacts

### M1 Research and input layer

Goal: capture what users ask and what engines recommend.

Includes:
- target and competitor intake
- Gemini/Grok answer-intent capture
- external review and source intake

### M2 Crawl and normalization layer

Goal: produce structured records from raw pages.

Includes:
- crawl adapter around `Scrapling`
- extraction of page metadata, headings, schema, lists, and tables
- normalized storage-ready records

### M3 Brief generation layer

Goal: generate useful SEO execution artifacts.

Includes:
- competitor review-page briefs
- comparison-page briefs
- answer-hub style briefs
- pSEO opportunity generation

### M4 Audit and evaluation layer

Goal: prove the outputs are worth shipping.

Includes:
- schema/performance/structure checks
- output scoring and readiness evaluation
- repeatable project scorecard

### M5 Web surface

Goal: expose outputs in a human-friendly interface after CLI flows are stable.

Includes:
- browse and inspect generated artifacts in `apps/web`
- lightweight reporting and onboarding

## Testing model

Every feature must define:
- exact command(s) to run
- exact expected output shape or fixture result
- automated tests that cover the change
- a regression signal so future changes can be judged quickly

Required test types across the MVP:
- unit tests for normalizers, parsers, and scoring logic
- fixture-based crawl and extraction tests
- snapshot-style brief generation tests
- CLI smoke tests for each operator-facing command

## Eval model

Eval is distinct from tests.

Tests answer: does the code behave as specified?
Eval answers: is the output actually useful for the SEO operator?

Each feature must include an eval section with explicit criteria such as:
- specificity of recommendations
- completeness of the brief
- structural clarity
- citation readiness
- answer-engine usefulness
- actionability for the next workflow step

Project-level eval must run at:
- the end of M0
- the end of each milestone
- before public launch or external demo

## Story-level definition of done

A story is only done when all of the following are true:
- the implementation is on a branch
- at least one commit exists for the story
- a PR exists
- Codex review has been completed and passes
- acceptance criteria are complete
- validation steps are complete
- eval steps are complete
- evidence is recorded in the workpad and PR

## Approval gates

### Gate 1

`docs/PRD.md` must be approved before any Linear stories are created.

### Gate 2

The generated Linear backlog must be approved before Symphony executes any story.

### Gate 3

Each story must pass commit, PR, review, validation, and eval gates before the next story begins.
