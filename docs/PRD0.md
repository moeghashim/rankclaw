---
summary: "Source synthesis for the initial Rankclaw SEO product definition"
read_when:
  - Turning the shared strategy and research inputs into a product definition.
  - Needing the raw rationale behind the scoped PRD and backlog.
---

# Rankclaw PRD0

## Product thesis

Rankclaw is a CLI-first SEO operating system for operators who want to win both traditional search and
answer-engine discovery. It helps a small team move from research to crawl to brief to audit to evaluation
with a repeatable workflow.

The product should make it easier to:
- map answer intent, not just keywords
- inspect competitors and third-party citations
- generate high-conviction review and comparison page briefs
- identify pSEO opportunities that are worth shipping
- evaluate whether the resulting pages are structurally strong for Google, AI overviews, ChatGPT, Gemini,
  Grok, and similar systems

## Inputs captured in this synthesis

### Crawl and extraction reference

- `Scrapling` is the starting reference for crawl, fetch, and extraction behavior.
- Rankclaw should wrap crawl/extraction through its own adapter layer so crawl logic can evolve later
  without rewriting the product contract.

### Research and answer engines

- Gemini and Grok are the first engines for research and answer-intent checks.
- The product should treat engine responses as structured research artifacts, not just chat output.

### Google and answer-engine strategy themes

The shared material points to a repeatable playbook:
- pick targets first
- inspect competitors and their external reviews
- build review pages and comparison pages for named competitors
- optimize pages so AI overviews and answer engines can quote them directly
- add structured tables, graphics, FAQs, and comparison grids
- maintain clear factual summaries and machine-readable brand facts
- support schema, page speed, and crawl quality validation

### ChatGPT and recommendation-engine strategy themes

The shared material highlights a recommendation-driven discovery model:
- users ask direct buying questions instead of browsing search results
- recommendation traffic converts better than generic organic traffic
- visibility depends on being the answer, not merely appearing in a list
- a useful system starts with an answer-intent map and then builds source pages that can be cited

### pSEO patterns to incorporate

The shared Levels/RemoteOK/PhotoAI examples suggest:
- treat pSEO as landing-page generation, not thin page spam
- use structured and semi-structured data to create useful pages at scale
- prioritize template systems that support many targeted pages with real user intent
- favor pages that combine search capture with strong conversion framing

### Audit and validation inputs

The audit stack captured so far:
- Schema Markup Validator
- PageSpeed Insights
- GTMetrix
- Google Search Console / Analytics
- Ahrefs MCP as a backlink and keyword intelligence input

## Product opportunity

Most teams have fragmented SEO workflows:
- research lives in spreadsheets and chat tabs
- crawl data lives in separate scripts and point tools
- competitor analysis is manual
- briefs are inconsistent
- audits do not connect back to page-generation opportunities
- answer-engine optimization is handled as vague content advice rather than an operational loop

Rankclaw should unify those steps into one operator workflow.

## Expected operator workflow

1. define a target topic or category
2. define competitors and external source targets
3. collect answer-intent questions and recommendation patterns
4. crawl and extract relevant pages
5. normalize extracted data
6. generate review-page and comparison-page briefs
7. identify pSEO expansion opportunities
8. run audits against proposed or existing pages
9. evaluate the output with explicit tests and heuristics

## Core output types

Rankclaw should eventually produce structured outputs for:
- answer-intent maps
- competitor source inventories
- extracted page records
- review-page briefs
- comparison-page briefs
- answer-hub briefs
- brand-facts / machine-readable fact recommendations
- pSEO opportunity sets
- audit results
- eval results

## MVP shape implied by the research

The first useful version does not need to publish pages or run as a full SaaS app.

The first useful version should:
- run as a CLI
- accept targets and competitors
- crawl and normalize source pages
- capture answer-intent data from Gemini and Grok
- generate high-signal review and comparison briefs
- run audit and eval checks on those outputs

The future web app should be a secondary surface for reporting, browsing outputs, and onboarding.

## Design constraints

- CLI-first for the MVP
- web app later
- every feature must be testable and evaluable independently
- every work item must be small enough to ship through one PR and one Codex review cycle
- the system should be open source and comfortable for direct GitHub-based collaboration
