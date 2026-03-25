import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runCli } from "../src/index.js";

interface CliInvocationResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

const TEST_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = resolve(TEST_ROOT, "..", "..", "..");

test("root help includes top-level workflow namespaces", async () => {
	const result = await invokeCli(["--help"], process.cwd());

	assert.equal(result.exitCode, 0);
	assert.equal(result.stderr, "");
	assert.match(result.stdout, /\bintake\b/);
	assert.match(result.stdout, /\bresearch\b/);
	assert.match(result.stdout, /\bcrawl\b/);
	assert.match(result.stdout, /\bbrief\b/);
	assert.match(result.stdout, /\baudit\b/);
	assert.match(result.stdout, /\beval\b/);
});

test("intake collect command help shows operator-facing input model", async () => {
	const result = await invokeCli(["intake", "collect", "--help"], process.cwd());

	assert.equal(result.exitCode, 0);
	assert.equal(result.stderr, "");
	assert.match(result.stdout, /--target-topic/);
	assert.match(result.stdout, /--target-site/);
	assert.match(result.stdout, /--competitor/);
	assert.match(result.stdout, /name\|site/);
});

test("research gemini command help shows fixture-backed execution model", async () => {
	const result = await invokeCli(["research", "gemini", "--help"], process.cwd());

	assert.equal(result.exitCode, 0);
	assert.equal(result.stderr, "");
	assert.match(result.stdout, /--fixture/);
	assert.match(result.stdout, /--intake-artifact/);
	assert.match(result.stdout, /--captured-at/);
});

test("intake collect validates and writes normalized target+competitor artifacts", async () => {
	const workingDirectory = mkdtempSync(join(tmpdir(), "rankclaw-cli-intake-"));
	const outputDirectory = resolve(workingDirectory, "captures");
	const artifactPath = resolve(outputDirectory, "intake", "target-competitors.json");

	try {
		writeFileSync(
			join(workingDirectory, "rankclaw.config.json"),
			JSON.stringify({ profile: "smoke-profile", outputDir: "captures" }, null, 2),
			"utf8",
		);

		const result = await invokeCli(
			[
				"intake",
				"collect",
				"--target-topic",
				"  Running   shoes ",
				"--target-site",
				"Example.com/products?category=running",
				"--competitor",
				"Stride Labs|stridelabs.co",
				"--competitor",
				"Fleet Foot|https://fleetfoot.io/reviews",
			],
			workingDirectory,
		);

		assert.equal(result.exitCode, 0);
		assert.equal(result.stderr, "");
		assert.ok(result.stdout.includes(`Wrote intake artifact: ${artifactPath}`));
		assert.ok(existsSync(artifactPath));

		const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as unknown;
		assert.deepEqual(artifact, {
			kind: "rankclaw/intake/target-competitors",
			schemaVersion: 1,
			target: {
				id: "example-com",
				topic: "Running shoes",
				name: "example.com",
				site: {
					input: "Example.com/products?category=running",
					origin: "https://example.com",
					host: "example.com",
				},
			},
			competitors: [
				{
					id: "fleet-foot",
					name: "Fleet Foot",
					site: {
						input: "https://fleetfoot.io/reviews",
						origin: "https://fleetfoot.io",
						host: "fleetfoot.io",
					},
				},
				{
					id: "stride-labs",
					name: "Stride Labs",
					site: {
						input: "stridelabs.co",
						origin: "https://stridelabs.co",
						host: "stridelabs.co",
					},
				},
			],
		});
	} finally {
		rmSync(workingDirectory, { recursive: true, force: true });
	}
});

test("intake collect rejects malformed competitor inputs", async () => {
	const result = await invokeCli(
		[
			"intake",
			"collect",
			"--target-topic",
			"Running shoes",
			"--target-site",
			"example.com",
			"--competitor",
			"bad-format",
		],
		process.cwd(),
	);

	assert.equal(result.exitCode, 1);
	assert.match(result.stderr, /name\|site/);
	assert.match(result.stdout, /--help/);
});

test("intake collect requires at least one competitor", async () => {
	const result = await invokeCli(
		["intake", "collect", "--target-topic", "Running shoes", "--target-site", "example.com"],
		process.cwd(),
	);

	assert.equal(result.exitCode, 1);
	assert.match(result.stderr, /At least one --competitor/);
	assert.match(result.stdout, /--help/);
});

test("research gemini reads fixture response and writes normalized recommendation snapshot", async () => {
	const workingDirectory = mkdtempSync(join(tmpdir(), "rankclaw-cli-research-"));
	const outputDirectory = resolve(workingDirectory, "captures");
	const intakeArtifactPath = resolve(outputDirectory, "intake", "target-competitors.json");
	const outputArtifactPath = resolve(outputDirectory, "research", "gemini-answer-intent-snapshot.json");
	const fixturePath = resolve(workingDirectory, "gemini-response.json");
	const capturedAt = "2026-03-25T00:00:00.000Z";

	try {
		writeFileSync(
			join(workingDirectory, "rankclaw.config.json"),
			JSON.stringify({ profile: "smoke-profile", outputDir: "captures" }, null, 2),
			"utf8",
		);

		const canonicalIntakeFixturePath = resolve(
			REPO_ROOT,
			"packages",
			"core",
			"test",
			"fixtures",
			"intake",
			"canonical-target-and-competitors.json",
		);
		const canonicalGeminiResponseFixturePath = resolve(
			REPO_ROOT,
			"packages",
			"core",
			"test",
			"fixtures",
			"research",
			"canonical-gemini-response.json",
		);
		const canonicalSnapshotFixturePath = resolve(
			REPO_ROOT,
			"packages",
			"core",
			"test",
			"fixtures",
			"research",
			"canonical-gemini-answer-intent-snapshot.json",
		);

		mkdirSync(dirname(intakeArtifactPath), { recursive: true });
		writeFileSync(intakeArtifactPath, readFileSync(canonicalIntakeFixturePath, "utf8"), "utf8");
		writeFileSync(fixturePath, readFileSync(canonicalGeminiResponseFixturePath, "utf8"), "utf8");

		const result = await invokeCli(
			["research", "gemini", "--fixture", fixturePath, "--captured-at", capturedAt],
			workingDirectory,
		);

		assert.equal(result.exitCode, 0);
		assert.equal(result.stderr, "");
		assert.ok(result.stdout.includes(`Wrote Gemini research snapshot: ${outputArtifactPath}`));
		assert.ok(existsSync(outputArtifactPath));

		const artifact = JSON.parse(readFileSync(outputArtifactPath, "utf8")) as unknown;
		const expectedArtifact = JSON.parse(readFileSync(canonicalSnapshotFixturePath, "utf8")) as unknown;
		assert.deepEqual(artifact, expectedArtifact);
	} finally {
		rmSync(workingDirectory, { recursive: true, force: true });
	}
});

test("research gemini fails when fixture payload is invalid", async () => {
	const workingDirectory = mkdtempSync(join(tmpdir(), "rankclaw-cli-research-failure-"));
	const outputDirectory = resolve(workingDirectory, "captures");
	const intakeArtifactPath = resolve(outputDirectory, "intake", "target-competitors.json");
	const fixturePath = resolve(workingDirectory, "gemini-response.json");

	try {
		writeFileSync(
			join(workingDirectory, "rankclaw.config.json"),
			JSON.stringify({ profile: "smoke-profile", outputDir: "captures" }, null, 2),
			"utf8",
		);

		const canonicalIntakeFixturePath = resolve(
			REPO_ROOT,
			"packages",
			"core",
			"test",
			"fixtures",
			"intake",
			"canonical-target-and-competitors.json",
		);

		mkdirSync(dirname(intakeArtifactPath), { recursive: true });
		writeFileSync(intakeArtifactPath, readFileSync(canonicalIntakeFixturePath, "utf8"), "utf8");
		writeFileSync(fixturePath, JSON.stringify({ model: "gemini-2.5-pro", rawResponse: "" }, null, 2), "utf8");

		const result = await invokeCli(["research", "gemini", "--fixture", fixturePath], workingDirectory);
		assert.equal(result.exitCode, 1);
		assert.match(result.stderr, /rawResponse/);
		assert.match(result.stdout, /--help/);
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
