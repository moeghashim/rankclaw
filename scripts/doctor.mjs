#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const EXPECTED_NODE_MAJOR = 22;

const issues = [];
const warnings = [];

function readCommand(command, args) {
	const result = spawnSync(command, args, { encoding: "utf8" });
	if (result.status !== 0) {
		return null;
	}
	return result.stdout.trim();
}

function addIssue(message) {
	issues.push(message);
}

function addWarning(message) {
	warnings.push(message);
}

function platformArchSuffix() {
	const arch = process.arch;
	const platform = process.platform;
	if (!["arm64", "x64"].includes(arch)) {
		return null;
	}
	if (!["darwin", "linux", "win32"].includes(platform)) {
		return null;
	}
	return `${platform}-${arch}`;
}

function scanInstalledVariants(scopeName, expectedPrefix) {
	const scopePath = join(process.cwd(), "node_modules", scopeName);
	if (!existsSync(scopePath)) {
		return [];
	}
	return readdirSync(scopePath)
		.map((entry) => `${scopeName}/${entry}`)
		.filter((name) => name.startsWith(expectedPrefix));
}

function checkNativePackage(label, expectedPackage) {
	const suffix = platformArchSuffix();
	if (!suffix) {
		addWarning(`${label}: no explicit check for ${process.platform}/${process.arch}.`);
		return;
	}
	const expected = expectedPackage(suffix);

	if (!existsSync(join(process.cwd(), "node_modules"))) {
		return;
	}

	if (existsSync(join(process.cwd(), "node_modules", ...expected.split("/")))) {
		return;
	}

	const [scopeName] = expected.split("/");
	const variantPrefix = expected.replace(/-[^-]+-[^-]+$/, "");
	const installedVariants = scanInstalledVariants(scopeName, variantPrefix);
	if (installedVariants.length === 0) {
		addIssue(`${label}: expected ${expected} but it is not installed. Run npm install or npm run reinstall:clean.`);
		return;
	}

	addIssue(
		`${label}: expected ${expected}, but found ${installedVariants.join(", ")}. Reinstall dependencies for the current architecture.`,
	);
}

const nodeVersion = process.version;
const npmVersion = readCommand("npm", ["-v"]);

console.log(`Node: ${nodeVersion}`);
console.log(`npm: ${npmVersion ?? "not found"}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);

if (Number(process.versions.node.split(".")[0]) !== EXPECTED_NODE_MAJOR) {
	addIssue(`Expected Node ${EXPECTED_NODE_MAJOR}.x, found ${nodeVersion}.`);
}

if (!npmVersion) {
	addIssue("npm is not available on PATH.");
}

if (!existsSync(join(process.cwd(), "node_modules"))) {
	addWarning("Dependencies are not installed yet. Run npm install after fixing any Node/npm mismatch.");
} else {
	checkNativePackage("Biome", (suffix) => `@biomejs/cli-${suffix}`);
	checkNativePackage("esbuild", (suffix) => `@esbuild/${suffix}`);
	checkNativePackage("TypeScript native preview", (suffix) => `@typescript/native-preview-${suffix}`);
}

if (warnings.length > 0) {
	console.log("\nWarnings:");
	for (const warning of warnings) {
		console.log(`- ${warning}`);
	}
}

if (issues.length > 0) {
	console.error("\nIssues:");
	for (const issue of issues) {
		console.error(`- ${issue}`);
	}
	console.error("\nSuggested fix: switch to Node 22 and run npm run reinstall:clean.");
	process.exit(1);
}

console.log("\nEnvironment looks good.");
