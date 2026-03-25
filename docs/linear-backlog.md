---
summary: "Approved Stage 2 Linear backlog for Rankclaw"
read_when:
  - Reviewing the approved Rankclaw backlog in Linear.
  - Preparing Stage 3 Symphony execution ordering.
---

# Rankclaw Linear Backlog

Linear project:
- `rankclaw`
- `https://linear.app/blyzr/project/rankclaw-73fc1ea67aaf/overview`

Status:
- Stage 1 is approved.
- Stage 2 backlog has been created in Linear.
- Stage 3 has not started yet.
- Stories should remain out of active execution until explicitly selected for Symphony.

## Epics

- `10X-10` Epic: M0 Foundation and CLI scaffold
- `10X-11` Epic: M1 Research and input layer
- `10X-12` Epic: M2 Crawl and normalization layer
- `10X-13` Epic: M3 Brief generation layer
- `10X-14` Epic: M4 Audit and evaluation layer
- `10X-15` Epic: M5 Web surface and reporting

## Stories

### M0 Foundation and CLI scaffold

- `10X-16` [CLI] Add the Rankclaw CLI package scaffold and command runner
- `10X-17` [Quality] Add fixture and snapshot harnesses for crawl, brief, and eval outputs
- `10X-18` [Quality] Enforce Validation and Eval sections in the delivery workflow

### M1 Research and input layer

- `10X-19` [Intake] Accept target and competitor inputs from the CLI
- `10X-20` [Research] Capture Gemini answer-intent snapshots as normalized records
- `10X-21` [Research] Capture Grok recommendation snapshots as normalized records
- `10X-22` [Sources] Import external review and source URLs into reusable records

### M2 Crawl and normalization layer

- `10X-23` [Crawl] Add a Scrapling-backed crawl adapter for URL fetch jobs
- `10X-24` [Extract] Normalize metadata, headings, schema, lists, and tables from crawled pages
- `10X-25` [Storage] Persist crawl outputs as deterministic, fixture-friendly records

### M3 Brief generation layer

- `10X-26` [Briefs] Generate standalone competitor review-page briefs
- `10X-27` [Briefs] Generate head-to-head comparison-page briefs
- `10X-28` [Briefs] Generate answer-hub briefs and FAQ seeds
- `10X-29` [pSEO] Generate pSEO opportunity seeds from structured inputs

### M4 Audit and evaluation layer

- `10X-30` [Audit] Produce structured technical audits from selected SEO tools
- `10X-31` [Eval] Score outputs for specificity, citation readiness, and actionability
- `10X-32` [Scorecard] Update the project scorecard from feature-level eval results

### M5 Web surface and reporting

- `10X-33` [Web] Expose generated artifacts in `apps/web`
- `10X-34` [Web] Add lightweight reporting and onboarding for CLI outputs

## Stage 3 entry rule

Do not move a story into Symphony execution until:
- the story scope is still desired as written
- any sequencing changes are approved
- only one story is active at a time
- the story is ready to go through branch, commit, PR, Codex review, validation, and eval gates
