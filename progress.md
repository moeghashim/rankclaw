# Progress Log

Append-only learning log for commits and deploys. Add new entries only at the end of this file. Do not edit or delete previous entries.

## Entry Template

## <ISO timestamp>
- Trigger: <commit|deploy>
- Learning: <required learning>
- Context: <commit message or release bump/version>
- Branch: <branch>
- Actor: <git user.name <git user.email>>
- Changed Paths:
  - <path> (commit entries only)

## 2026-03-04T20:49:52.441Z
- Trigger: commit
- Learning: Established a durable task-memory loop by logging commit/deploy learnings in an append-only progress file and requiring startup review of recent entries.
- Context: feat(agent): add append-only progress learning workflow
- Branch: main
- Actor: Ja3ood <moeghashim@users.noreply.github.com>
- Changed Paths:
  - .codex/prompts/pickup.md
  - .husky/pre-commit
  - AGENTS.md
  - CONTRIBUTING.md
  - README.md
  - docs/agent-workflow.md
  - package.json
  - scripts/agent-check.mjs
  - scripts/release.mjs
  - progress.md
  - scripts/commit-with-progress.mjs
  - scripts/progress-append-only-check.mjs
  - scripts/progress-log.mjs
## 2026-03-04T20:50:00.427Z
- Trigger: deploy
- Learning: Release automation now captures deploy learnings in progress.md and keeps startup context aligned with recent execution history.
- Context: bump=patch; version=0.0.2
- Branch: main
- Actor: Ja3ood <moeghashim@users.noreply.github.com>
## 2026-03-04T22:52:22.880Z
- Trigger: commit
- Learning: Closing the release cycle with an explicit Unreleased bucket keeps the next change set structured and prevents changelog drift.
- Context: chore(release): add [Unreleased] section for next cycle
- Branch: main
- Actor: Ja3ood <moeghashim@users.noreply.github.com>
- Changed Paths:
  - packages/core/CHANGELOG.md
## 2026-03-04T22:52:26.690Z
- Trigger: commit
- Learning: Starter releases should not require registry credentials by default; publish must be explicit to avoid blocked deploy flows.
- Context: feat(release): make npm publish opt-in for starter
- Branch: main
- Actor: Ja3ood <moeghashim@users.noreply.github.com>
- Changed Paths:
  - scripts/release.mjs
  - README.md
  - CONTRIBUTING.md
## 2026-03-22T13:11:46.547Z
- Trigger: commit
- Learning: The starter now defaults to a Vercel-ready app, keeps solo progress logging, and hardens setup against architecture drift and accidental useEffect usage.
- Context: feat(starter): add solo Vercel app workflow
- Branch: main
- Actor: Ja3ood <moeghashim@users.noreply.github.com>
- Changed Paths:
  - .codex/prompts
  - .github/workflows/ci.yml
  - .gitignore
  - AGENTS.md
  - CONTRIBUTING.md
  - README.md
  - biome.json
  - docs
  - package-lock.json
  - package.json
  - scripts
  - .nvmrc
  - apps
