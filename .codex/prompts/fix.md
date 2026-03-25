# /fix

Purpose: fix a bug or issue end-to-end with regression safety.

Workflow:
1. Reproduce and isolate the root cause.
2. Implement the smallest safe fix.
3. Add or update regression tests.
4. Run `npm run check`, `npm test`, and `npm run agent:check`.
5. Summarize behavior change, tests added, and residual risks.
