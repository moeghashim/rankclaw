import { loadRankclawConfig } from "@rankclaw/core";

import { renderCommandHelp, renderNamespaceHelp, renderRootHelp } from "./help.js";
import { findNamespace, findNamespaceCommand, listNamespaces } from "./registry.js";
import type { CliIO } from "./types.js";

const HELP_FLAGS = new Set(["-h", "--help", "help"]);

export interface RunCliOptions {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	io?: CliIO;
}

export async function runCli(argv: readonly string[], options: RunCliOptions = {}): Promise<number> {
	const namespaces = listNamespaces();
	const io = options.io ?? createDefaultCliIO();
	const cwd = options.cwd ?? process.cwd();
	const env = options.env ?? process.env;
	const [namespaceInput, commandInput, ...commandArgs] = argv;

	if (namespaceInput === undefined || isHelpFlag(namespaceInput)) {
		io.info(renderRootHelp(namespaces));
		return 0;
	}

	const namespace = findNamespace(namespaceInput);
	if (namespace === undefined) {
		io.error(`Unknown namespace "${namespaceInput}".`);
		io.info(renderRootHelp(namespaces));
		return 1;
	}

	if (commandInput === undefined || isHelpFlag(commandInput)) {
		io.info(renderNamespaceHelp(namespace));
		return 0;
	}

	const command = findNamespaceCommand(namespace, commandInput);
	if (command === undefined) {
		io.error(`Unknown command "${commandInput}" for namespace "${namespace.name}".`);
		io.info(renderNamespaceHelp(namespace));
		return 1;
	}

	if (commandArgs[0] !== undefined && isHelpFlag(commandArgs[0])) {
		io.info(renderCommandHelp(namespace, command));
		return 0;
	}

	const config = loadRankclawConfig({
		cwd,
		env,
	});

	return Promise.resolve(
		command.run(
			{
				cwd,
				env,
				config,
			},
			commandArgs,
			io,
		),
	);
}

function createDefaultCliIO(): CliIO {
	return {
		info(message) {
			console.log(message);
		},
		error(message) {
			console.error(message);
		},
	};
}

function isHelpFlag(value: string): boolean {
	return HELP_FLAGS.has(value);
}
