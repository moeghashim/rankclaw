import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { loadRankclawConfig } from "../src/lib/config.js";

test("loadRankclawConfig returns defaults when no config file is present", () => {
	const workingDirectory = mkdtempSync(join(tmpdir(), "rankclaw-core-config-"));
	try {
		const config = loadRankclawConfig({ cwd: workingDirectory, env: {} });

		assert.equal(config.workspaceRoot, workingDirectory);
		assert.equal(config.configFilePath, null);
		assert.equal(config.profile, "default");
		assert.equal(config.outputDir, resolve(workingDirectory, ".rankclaw"));
	} finally {
		rmSync(workingDirectory, { recursive: true, force: true });
	}
});

test("loadRankclawConfig discovers rankclaw.config.json in ancestor directories", () => {
	const workspaceRoot = mkdtempSync(join(tmpdir(), "rankclaw-core-config-"));
	const nestedDirectory = join(workspaceRoot, "nested", "child");

	try {
		mkdirSync(nestedDirectory, { recursive: true });
		writeFileSync(
			join(workspaceRoot, "rankclaw.config.json"),
			JSON.stringify({ profile: "campaign", outputDir: "artifacts" }, null, 2),
			"utf8",
		);

		const config = loadRankclawConfig({ cwd: nestedDirectory, env: {} });

		assert.equal(config.workspaceRoot, workspaceRoot);
		assert.equal(config.configFilePath, join(workspaceRoot, "rankclaw.config.json"));
		assert.equal(config.profile, "campaign");
		assert.equal(config.outputDir, resolve(workspaceRoot, "artifacts"));
	} finally {
		rmSync(workspaceRoot, { recursive: true, force: true });
	}
});

test("loadRankclawConfig lets environment variables override file values", () => {
	const workspaceRoot = mkdtempSync(join(tmpdir(), "rankclaw-core-config-"));

	try {
		writeFileSync(
			join(workspaceRoot, "rankclaw.config.json"),
			JSON.stringify({ profile: "file-profile", outputDir: "file-output" }, null, 2),
			"utf8",
		);

		const config = loadRankclawConfig({
			cwd: workspaceRoot,
			env: {
				RANKCLAW_PROFILE: "env-profile",
				RANKCLAW_OUTPUT_DIR: "env-output",
			},
		});

		assert.equal(config.profile, "env-profile");
		assert.equal(config.outputDir, resolve(workspaceRoot, "env-output"));
	} finally {
		rmSync(workspaceRoot, { recursive: true, force: true });
	}
});

test("loadRankclawConfig rejects array payloads in rankclaw.config.json", () => {
	const workspaceRoot = mkdtempSync(join(tmpdir(), "rankclaw-core-config-"));

	try {
		writeFileSync(join(workspaceRoot, "rankclaw.config.json"), JSON.stringify([], null, 2), "utf8");

		assert.throws(
			() => loadRankclawConfig({ cwd: workspaceRoot, env: {} }),
			/error: rankclaw\.config\.json .* must contain a JSON object/i,
		);
	} finally {
		rmSync(workspaceRoot, { recursive: true, force: true });
	}
});
