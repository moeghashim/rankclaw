import type { RankclawConfig } from "@rankclaw/core";

export interface CliContext {
	cwd: string;
	env: NodeJS.ProcessEnv;
	config: RankclawConfig;
}

export interface CliIO {
	info: (message: string) => void;
	error: (message: string) => void;
}

export interface CliCommand {
	name: string;
	summary: string;
	run: (context: CliContext, args: readonly string[], io: CliIO) => Promise<number> | number;
}

export interface CliNamespace {
	name: string;
	summary: string;
	commands: readonly CliCommand[];
}
