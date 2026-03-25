import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { runCli } from "../src/index.js";

interface CliInvocationResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

test("root help includes top-level workflow namespaces", async () => {
	const result = await invokeCli(["--help"], process.cwd());

	assert.equal(result.exitCode, 0);
	assert.equal(result.stderr, "");
	assert.match(result.stdout, /\bintake\b/);
	assert.match(result.stdout, /\bcrawl\b/);
	assert.match(result.stdout, /\bbrief\b/);
	assert.match(result.stdout, /\baudit\b/);
	assert.match(result.stdout, /\beval\b/);
});

test("namespace help shows intake placeholder command", async () => {
	const result = await invokeCli(["intake", "--help"], process.cwd());

	assert.equal(result.exitCode, 0);
	assert.equal(result.stderr, "");
	assert.match(result.stdout, /\bcollect\b/);
});

test("placeholder command loads shared config values from rankclaw.config.json", async () => {
	const workingDirectory = mkdtempSync(join(tmpdir(), "rankclaw-cli-smoke-"));
	const outputDirectory = resolve(workingDirectory, "captures");

	try {
		writeFileSync(
			join(workingDirectory, "rankclaw.config.json"),
			JSON.stringify({ profile: "smoke-profile", outputDir: "captures" }, null, 2),
			"utf8",
		);

		const result = await invokeCli(["intake", "collect"], workingDirectory);

		assert.equal(result.exitCode, 0);
		assert.equal(result.stderr, "");
		assert.ok(result.stdout.includes("Config profile: smoke-profile"));
		assert.ok(result.stdout.includes(`Output directory: ${outputDirectory}`));
	} finally {
		rmSync(workingDirectory, { recursive: true, force: true });
	}
});

async function invokeCli(args: readonly string[], cwd: string): Promise<CliInvocationResult> {
	const stdout: string[] = [];
	const stderr: string[] = [];
	const exitCode = await runCli(args, {
		cwd,
		env: {},
		io: {
			info(message) {
				stdout.push(message);
			},
			error(message) {
				stderr.push(message);
			},
		},
	});

	return {
		exitCode,
		stdout: stdout.join("\n"),
		stderr: stderr.join("\n"),
	};
}
