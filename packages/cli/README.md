# @rankclaw/cli

CLI workspace scaffold for Rankclaw operator workflows.

## Commands

- `rankclaw --help`: root help and namespace discovery
- `rankclaw intake --help`: namespace-level help
- `rankclaw intake collect --target-topic <topic> --target-site <site> --competitor <name|site> ...`: validate and persist normalized intake input

## Configuration

The CLI uses `@rankclaw/core` to load shared configuration from `rankclaw.config.json`
and `RANKCLAW_*` environment variables.

`intake collect` writes `intake/target-competitors.json` under the configured `outputDir`.
