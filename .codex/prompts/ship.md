# /ship

Purpose: ship solo changes cleanly without a PR workflow.

Workflow:
1. Confirm whether the target is an app deploy, a package release, or both.
2. Run full validation (`npm run check`, `npm test`, `npm run agent:check`).
3. If shipping the app, push `main` and let Vercel deploy `apps/web`.
4. If shipping a package, run the correct `npm run release:<patch|minor|major> -- --learning "..."` command and pass `--publish` only when intentionally publishing.
5. Summarize what shipped, which validations ran, and any manual follow-up.
