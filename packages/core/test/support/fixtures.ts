import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ARTIFACT_FIXTURE_KINDS = ["intake", "research", "crawl", "brief", "eval"] as const;

export type ArtifactFixtureKind = (typeof ARTIFACT_FIXTURE_KINDS)[number];
export type JsonFixtureValue =
	| null
	| boolean
	| number
	| string
	| JsonFixtureValue[]
	| { [key: string]: JsonFixtureValue };

const TEST_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_ROOT = join(TEST_ROOT, "fixtures");
const SNAPSHOT_ROOT = join(TEST_ROOT, "__snapshots__");

export function getFixtureRoot(): string {
	return FIXTURE_ROOT;
}

export function getSnapshotRoot(): string {
	return SNAPSHOT_ROOT;
}

export function listArtifactFixtures(kind: ArtifactFixtureKind): readonly string[] {
	return readdirSync(resolveFixtureKindRoot(kind))
		.filter((entry) => entry.endsWith(".json"))
		.map((entry) => entry.slice(0, -".json".length))
		.sort();
}

export function loadArtifactFixture(kind: ArtifactFixtureKind, name: string): JsonFixtureValue {
	const fixturePath = getArtifactFixturePath(kind, name);
	return JSON.parse(readFileSync(fixturePath, "utf8")) as JsonFixtureValue;
}

export function getArtifactFixturePath(kind: ArtifactFixtureKind, name: string): string {
	return join(resolveFixtureKindRoot(kind), `${name}.json`);
}

function resolveFixtureKindRoot(kind: ArtifactFixtureKind): string {
	return join(FIXTURE_ROOT, kind);
}
