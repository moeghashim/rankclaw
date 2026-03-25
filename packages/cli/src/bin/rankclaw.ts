#!/usr/bin/env node
import { runCli } from "../index.js";

try {
	const exitCode = await runCli(process.argv.slice(2));
	process.exitCode = exitCode;
} catch (error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exitCode = 1;
}
