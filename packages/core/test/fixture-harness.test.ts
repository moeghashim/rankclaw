import assert from "node:assert/strict";
import test from "node:test";

import { ARTIFACT_FIXTURE_KINDS, listArtifactFixtures, loadArtifactFixture } from "./support/fixtures.js";
import { assertMatchesSnapshot } from "./support/snapshots.js";

test("artifact fixtures load through shared helpers instead of ad hoc paths", () => {
	for (const kind of ARTIFACT_FIXTURE_KINDS) {
		const fixtureNames = listArtifactFixtures(kind);
		assert.ok(fixtureNames.length > 0, `Expected at least one ${kind} fixture`);

		for (const fixtureName of fixtureNames) {
			const fixture = loadArtifactFixture(kind, fixtureName);
			assert.notEqual(fixture, null);
		}
	}
});

test("artifact fixture reads remain stable across repeated loads", () => {
	const firstLoad = loadArtifactFixture("crawl", "serp-title-capture");
	const secondLoad = loadArtifactFixture("crawl", "serp-title-capture");

	assert.deepEqual(secondLoad, firstLoad);
});

test("artifact harness snapshot remains readable for future workflow diffs", () => {
	const snapshotPayload = {
		fixtures: {
			crawl: listArtifactFixtures("crawl"),
			brief: listArtifactFixtures("brief"),
			eval: listArtifactFixtures("eval"),
		},
		sampleArtifacts: {
			crawl: loadArtifactFixture("crawl", "serp-title-capture"),
			brief: loadArtifactFixture("brief", "competitor-review-brief"),
			eval: loadArtifactFixture("eval", "answer-hub-scorecard"),
		},
	};

	assertMatchesSnapshot("fixture-harness/artifact-catalog", snapshotPayload);
});
