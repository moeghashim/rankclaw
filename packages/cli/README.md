# @rankclaw/cli

CLI workspace scaffold for Rankclaw operator workflows.

## Commands

- `rankclaw --help`: root help and namespace discovery
- `rankclaw intake --help`: namespace-level help
- `rankclaw intake collect --target-topic <topic> --target-site <site> --competitor <name|site> ...`: validate and persist normalized intake input
- `rankclaw research gemini --fixture <path> [--intake-artifact <path>] [--captured-at <iso-timestamp>]`: capture fixture-backed Gemini prompts, raw response text, and normalized recommendation snapshot records
- `rankclaw research grok --fixture <path> [--intake-artifact <path>] [--captured-at <iso-timestamp>]`: capture fixture-backed Grok prompts, raw response text, and normalized recommendation snapshot records

## Configuration

The CLI uses `@rankclaw/core` to load shared configuration from `rankclaw.config.json`
and `RANKCLAW_*` environment variables.

`intake collect` writes `intake/target-competitors.json` under the configured `outputDir`.

`research gemini` writes `research/gemini-answer-intent-snapshot.json` under the configured `outputDir`.

`research grok` writes `research/grok-answer-intent-snapshot.json` under the configured `outputDir`.
