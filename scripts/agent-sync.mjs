#!/usr/bin/env node

import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const MANIFEST_PATH = resolve("agent/manifest.json");

function usage() {
	console.log("Usage: node scripts/agent-sync.mjs <sync|verify>");
}

function sha256(content) {
	return createHash("sha256").update(content).digest("hex");
}

function ensureDir(filePath) {
	mkdirSync(dirname(filePath), { recursive: true });
}

function parseGitHubRepo(sourceRepo) {
	const normalized = sourceRepo.replace(/\.git$/, "");
	const match = normalized.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
	if (!match) {
		throw new Error(`Unsupported sourceRepo format: ${sourceRepo}`);
	}
	return { owner: match[1], repo: match[2] };
}

function readManifest() {
	if (!existsSync(MANIFEST_PATH)) {
		throw new Error(`Manifest missing at ${MANIFEST_PATH}`);
	}
	const parsed = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
	if (!parsed.sourceRepo || !parsed.pinnedCommit || !Array.isArray(parsed.files)) {
		throw new Error("Manifest is missing required fields: sourceRepo, pinnedCommit, files");
	}
	return parsed;
}

async function fetchUpstream({ sourceRepo, pinnedCommit, upstreamPath }) {
	const { owner, repo } = parseGitHubRepo(sourceRepo);
	const url = `https://raw.githubusercontent.com/${owner}/${repo}/${pinnedCommit}/${upstreamPath}`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${upstreamPath}: HTTP ${response.status}`);
	}
	return await response.text();
}

async function sync(manifest) {
	let changedFiles = 0;
	const updatedFiles = [];

	for (const entry of manifest.files) {
		const upstreamContent = await fetchUpstream({
			sourceRepo: manifest.sourceRepo,
			pinnedCommit: manifest.pinnedCommit,
			upstreamPath: entry.upstreamPath,
		});
		const expectedHash = sha256(upstreamContent);
		entry.sha256 = expectedHash;

		const localPath = resolve(entry.localPath);
		ensureDir(localPath);

		const previous = existsSync(localPath) ? readFileSync(localPath, "utf8") : null;
		if (previous !== upstreamContent) {
			writeFileSync(localPath, upstreamContent);
			changedFiles += 1;
			updatedFiles.push(entry.localPath);
		}

		if (entry.localPath === "scripts/committer") {
			chmodSync(localPath, 0o755);
		}
	}

	writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

	if (changedFiles === 0) {
		console.log("agent-sync: all managed files already up to date.");
	} else {
		console.log("agent-sync: updated managed files:");
		for (const filePath of updatedFiles) {
			console.log(`- ${filePath}`);
		}
	}

	console.log(`agent-sync: manifest updated at ${manifest.pinnedCommit}.`);
}

async function verify(manifest) {
	const mismatches = [];

	for (const entry of manifest.files) {
		const localPath = resolve(entry.localPath);
		if (!existsSync(localPath)) {
			mismatches.push(`${entry.localPath}: file missing`);
			continue;
		}

		const upstreamContent = await fetchUpstream({
			sourceRepo: manifest.sourceRepo,
			pinnedCommit: manifest.pinnedCommit,
			upstreamPath: entry.upstreamPath,
		});
		const upstreamHash = sha256(upstreamContent);
		const localHash = sha256(readFileSync(localPath, "utf8"));

		if (entry.sha256 !== upstreamHash) {
			mismatches.push(`${entry.localPath}: manifest hash is stale for ${entry.upstreamPath}`);
		}

		if (entry.strategy === "verbatim" && localHash !== upstreamHash) {
			mismatches.push(`${entry.localPath}: drifted from upstream ${entry.upstreamPath}`);
		}

		if (entry.strategy === "reference" && localHash !== upstreamHash) {
			mismatches.push(`${entry.localPath}: reference snapshot drifted from upstream ${entry.upstreamPath}`);
		}
	}

	if (mismatches.length > 0) {
		console.error("agent-sync verify failed:");
		for (const mismatch of mismatches) {
			console.error(`- ${mismatch}`);
		}
		process.exit(1);
	}

	console.log("agent-sync verify passed: managed files match pinned upstream commit.");
}

async function main() {
	const mode = process.argv[2];
	if (mode !== "sync" && mode !== "verify") {
		usage();
		process.exit(1);
	}

	const manifest = readManifest();
	for (const entry of manifest.files) {
		if (!entry.upstreamPath || !entry.localPath || !entry.strategy) {
			throw new Error("Each manifest file entry must include upstreamPath, localPath, and strategy");
		}
	}

	if (mode === "sync") {
		await sync(manifest);
		return;
	}

	await verify(manifest);
}

main().catch((error) => {
	console.error(`agent-sync failed: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
});
