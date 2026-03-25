import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { getSnapshotRoot } from "./fixtures.js";

interface SnapshotOptions {
	env?: NodeJS.ProcessEnv;
}

const UPDATE_SNAPSHOTS_ENV = "UPDATE_SNAPSHOTS";

export function assertMatchesSnapshot(snapshotName: string, value: unknown, options: SnapshotOptions = {}): void {
	const env = options.env ?? process.env;
	const snapshotPath = getSnapshotPath(snapshotName);
	const serializedValue = serializeSnapshot(value);
	const shouldUpdateSnapshots = env[UPDATE_SNAPSHOTS_ENV] === "1";

	if (shouldUpdateSnapshots || !existsSync(snapshotPath)) {
		mkdirSync(dirname(snapshotPath), { recursive: true });
		writeFileSync(snapshotPath, serializedValue, "utf8");
		return;
	}

	const expectedValue = readFileSync(snapshotPath, "utf8");
	assert.equal(
		serializedValue,
		expectedValue,
		`Snapshot mismatch for ${snapshotName}. Re-run with ${UPDATE_SNAPSHOTS_ENV}=1 to update the snapshot if the new output is expected.`,
	);
}

export function getSnapshotPath(snapshotName: string): string {
	return join(getSnapshotRoot(), `${snapshotName}.snap`);
}

function serializeSnapshot(value: unknown): string {
	return `${JSON.stringify(normalizeSnapshotValue(value), null, 2)}\n`;
}

function normalizeSnapshotValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => normalizeSnapshotValue(entry));
	}

	if (typeof value === "object" && value !== null) {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
				.map(([key, nestedValue]) => [key, normalizeSnapshotValue(nestedValue)]),
		);
	}

	return value;
}
