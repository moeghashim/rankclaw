import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { readTargetCompetitorArtifact } from "../src/lib/intake.js";
import {
	buildGeminiAnswerIntentPrompts,
	buildGrokAnswerIntentPrompts,
	createGeminiRecommendationSnapshotArtifact,
	createGrokRecommendationSnapshotArtifact,
	normalizeGeminiAnswerIntentResponse,
	normalizeGrokAnswerIntentResponse,
	ResearchSnapshotValidationError,
	readGeminiRawResponseFixture,
	readGeminiRecommendationSnapshotArtifact,
	readGrokRawResponseFixture,
	readGrokRecommendationSnapshotArtifact,
	resolveGeminiRecommendationSnapshotArtifactPath,
	resolveGrokRecommendationSnapshotArtifactPath,
	serializeGeminiRecommendationSnapshotArtifact,
	writeGeminiRecommendationSnapshotArtifact,
	writeGrokRecommendationSnapshotArtifact,
} from "../src/lib/research.js";

const INTAKE_FIXTURE_PATH = "./test/fixtures/intake/canonical-target-and-competitors.json";
const GEMINI_RESPONSE_FIXTURE_PATH = "./test/fixtures/research/canonical-gemini-response.json";
const GEMINI_SNAPSHOT_FIXTURE_PATH = "./test/fixtures/research/canonical-gemini-answer-intent-snapshot.json";
const GROK_RESPONSE_FIXTURE_PATH = "./test/fixtures/research/canonical-grok-response.json";
const GROK_SNAPSHOT_FIXTURE_PATH = "./test/fixtures/research/canonical-grok-answer-intent-snapshot.json";
const FIXTURE_CAPTURED_AT = "2026-03-25T00:00:00.000Z";

test("buildGeminiAnswerIntentPrompts captures target and competitor context", () => {
	const intakeArtifact = readTargetCompetitorArtifact(INTAKE_FIXTURE_PATH);
	const prompts = buildGeminiAnswerIntentPrompts(intakeArtifact);

	assert.equal(prompts.length, 2);
	assert.equal(prompts[0]?.id, "system-1");
	assert.equal(prompts[1]?.id, "user-1");
	assert.match(prompts[1]?.content ?? "", /Target topic: Running shoes/);
	assert.match(prompts[1]?.content ?? "", /1\. Fleet Foot \(https:\/\/fleetfoot\.io\)/);
	assert.match(prompts[1]?.content ?? "", /2\. Stride Labs \(https:\/\/stridelabs\.co\)/);
});

test("buildGrokAnswerIntentPrompts captures target and competitor context", () => {
	const intakeArtifact = readTargetCompetitorArtifact(INTAKE_FIXTURE_PATH);
	const prompts = buildGrokAnswerIntentPrompts(intakeArtifact);

	assert.equal(prompts.length, 2);
	assert.equal(prompts[0]?.id, "system-1");
	assert.equal(prompts[1]?.id, "user-1");
	assert.match(prompts[1]?.content ?? "", /Target topic: Running shoes/);
	assert.match(prompts[1]?.content ?? "", /1\. Fleet Foot \(https:\/\/fleetfoot\.io\)/);
	assert.match(prompts[1]?.content ?? "", /2\. Stride Labs \(https:\/\/stridelabs\.co\)/);
});

test("normalizeGeminiAnswerIntentResponse transforms raw response text into stable snapshot fields", () => {
	const fixtureResponse = readGeminiRawResponseFixture(GEMINI_RESPONSE_FIXTURE_PATH);
	const expectedArtifact = readGeminiRecommendationSnapshotArtifact(GEMINI_SNAPSHOT_FIXTURE_PATH);
	const normalizedSnapshot = normalizeGeminiAnswerIntentResponse(fixtureResponse.rawResponse);

	assert.deepEqual(normalizedSnapshot, expectedArtifact.snapshot);
});

test("normalizeGrokAnswerIntentResponse transforms raw response text into stable snapshot fields", () => {
	const fixtureResponse = readGrokRawResponseFixture(GROK_RESPONSE_FIXTURE_PATH);
	const expectedArtifact = readGrokRecommendationSnapshotArtifact(GROK_SNAPSHOT_FIXTURE_PATH);
	const normalizedSnapshot = normalizeGrokAnswerIntentResponse(fixtureResponse.rawResponse);

	assert.deepEqual(normalizedSnapshot, expectedArtifact.snapshot);
});

test("normalizeGeminiAnswerIntentResponse preserves entries when slugified ids collide", () => {
	const normalizedSnapshot = normalizeGeminiAnswerIntentResponse(`{
		"summary": "collision test",
		"questions": [
			{ "question": "Plan A/B?", "intent": "compare" },
			{ "question": "Plan A B", "intent": "compare" }
		],
		"recommendations": [
			{ "recommendation": "Ship A/B guidance", "rationale": "symbols" },
			{ "recommendation": "Ship A B guidance", "rationale": "spacing" }
		]
	}`);

	assert.deepEqual(
		normalizedSnapshot.questions.map((entry) => entry.id),
		["plan-a-b", "plan-a-b-2"],
	);
	assert.deepEqual(
		normalizedSnapshot.recommendations.map((entry) => entry.id),
		["ship-a-b-guidance", "ship-a-b-guidance-2"],
	);
});

test("normalizeGeminiAnswerIntentResponse fails for malformed response payloads", () => {
	assert.throws(
		() => normalizeGeminiAnswerIntentResponse("not-json"),
		(error: unknown) => error instanceof ResearchSnapshotValidationError && /not valid JSON/.test(error.message),
	);

	assert.throws(
		() =>
			normalizeGeminiAnswerIntentResponse(
				'{"summary":"test","questions":[{"question":"What should I buy?","intent":"comparison"}],"recommendations":[]}',
			),
		(error: unknown) =>
			error instanceof ResearchSnapshotValidationError && /at least one recommendation/.test(error.message),
	);
});

test("normalizeGrokAnswerIntentResponse fails for malformed response payloads", () => {
	assert.throws(
		() => normalizeGrokAnswerIntentResponse("not-json"),
		(error: unknown) => error instanceof ResearchSnapshotValidationError && /not valid JSON/.test(error.message),
	);

	assert.throws(
		() =>
			normalizeGrokAnswerIntentResponse(
				'{"summary":"test","questions":[],"recommendations":[{"recommendation":"Keep it current","rationale":"freshness"}]}',
			),
		(error: unknown) =>
			error instanceof ResearchSnapshotValidationError && /at least one question/.test(error.message),
	);
});

test("canonical Gemini snapshot fixture stays stable for regression checks", () => {
	const intakeArtifact = readTargetCompetitorArtifact(INTAKE_FIXTURE_PATH);
	const fixtureResponse = readGeminiRawResponseFixture(GEMINI_RESPONSE_FIXTURE_PATH);
	const expectedArtifact = readGeminiRecommendationSnapshotArtifact(GEMINI_SNAPSHOT_FIXTURE_PATH);
	const generatedArtifact = createGeminiRecommendationSnapshotArtifact({
		intakeArtifact,
		response: fixtureResponse,
		capturedAt: FIXTURE_CAPTURED_AT,
	});

	assert.deepEqual(generatedArtifact, expectedArtifact);
});

test("canonical Grok snapshot fixture stays stable for regression checks", () => {
	const intakeArtifact = readTargetCompetitorArtifact(INTAKE_FIXTURE_PATH);
	const fixtureResponse = readGrokRawResponseFixture(GROK_RESPONSE_FIXTURE_PATH);
	const expectedArtifact = readGrokRecommendationSnapshotArtifact(GROK_SNAPSHOT_FIXTURE_PATH);
	const generatedArtifact = createGrokRecommendationSnapshotArtifact({
		intakeArtifact,
		response: fixtureResponse,
		capturedAt: FIXTURE_CAPTURED_AT,
	});

	assert.deepEqual(generatedArtifact, expectedArtifact);
});

test("write/read helpers round-trip serialized Gemini snapshot artifacts", () => {
	const workspaceDirectory = mkdtempSync(join(tmpdir(), "rankclaw-research-artifact-"));
	const intakeArtifact = readTargetCompetitorArtifact(INTAKE_FIXTURE_PATH);
	const fixtureResponse = readGeminiRawResponseFixture(GEMINI_RESPONSE_FIXTURE_PATH);

	try {
		const artifact = createGeminiRecommendationSnapshotArtifact({
			intakeArtifact,
			response: fixtureResponse,
			capturedAt: FIXTURE_CAPTURED_AT,
		});

		const artifactPath = writeGeminiRecommendationSnapshotArtifact(workspaceDirectory, artifact);
		assert.equal(artifactPath, resolveGeminiRecommendationSnapshotArtifactPath(workspaceDirectory));
		assert.equal(readFileSync(artifactPath, "utf8"), serializeGeminiRecommendationSnapshotArtifact(artifact));
		assert.deepEqual(readGeminiRecommendationSnapshotArtifact(artifactPath), artifact);
	} finally {
		rmSync(workspaceDirectory, { recursive: true, force: true });
	}
});

test("write/read helpers round-trip serialized Grok snapshot artifacts", () => {
	const workspaceDirectory = mkdtempSync(join(tmpdir(), "rankclaw-grok-artifact-"));
	const intakeArtifact = readTargetCompetitorArtifact(INTAKE_FIXTURE_PATH);
	const fixtureResponse = readGrokRawResponseFixture(GROK_RESPONSE_FIXTURE_PATH);

	try {
		const artifact = createGrokRecommendationSnapshotArtifact({
			intakeArtifact,
			response: fixtureResponse,
			capturedAt: FIXTURE_CAPTURED_AT,
		});

		const artifactPath = writeGrokRecommendationSnapshotArtifact(workspaceDirectory, artifact);
		assert.equal(artifactPath, resolveGrokRecommendationSnapshotArtifactPath(workspaceDirectory));
		assert.equal(readFileSync(artifactPath, "utf8"), serializeGeminiRecommendationSnapshotArtifact(artifact));
		assert.deepEqual(readGrokRecommendationSnapshotArtifact(artifactPath), artifact);
	} finally {
		rmSync(workspaceDirectory, { recursive: true, force: true });
	}
});
