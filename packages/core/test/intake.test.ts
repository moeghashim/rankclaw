import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
	IntakeInputValidationError,
	normalizeTargetCompetitorInput,
	readTargetCompetitorArtifact,
	resolveTargetCompetitorArtifactPath,
	serializeTargetCompetitorArtifact,
	writeTargetCompetitorArtifact,
} from "../src/lib/intake.js";

const CANONICAL_FIXTURE_PATH = "./test/fixtures/intake/canonical-target-and-competitors.json";

test("normalizeTargetCompetitorInput validates and normalizes target + competitor records", () => {
	const artifact = normalizeTargetCompetitorInput({
		target: {
			topic: "  Running   shoes ",
			site: "Example.com/products?category=running",
		},
		competitors: [
			{
				name: "  Stride   Labs ",
				site: "stridelabs.co",
			},
			{
				name: "Fleet Foot",
				site: "https://fleetfoot.io/reviews",
			},
		],
	});

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
});

test("normalizeTargetCompetitorInput rejects invalid or ambiguous competitor definitions", () => {
	assert.throws(
		() =>
			normalizeTargetCompetitorInput({
				target: {
					topic: "Running shoes",
					site: "example.com",
				},
				competitors: [],
			}),
		(error: unknown) => error instanceof IntakeInputValidationError && /At least one competitor/.test(error.message),
	);

	assert.throws(
		() =>
			normalizeTargetCompetitorInput({
				target: {
					topic: "Running shoes",
					site: "example.com",
				},
				competitors: [
					{
						name: "Acme",
						site: "http://example.com/path",
					},
				],
			}),
		(error: unknown) => error instanceof IntakeInputValidationError && /same site as the target/.test(error.message),
	);

	assert.throws(
		() =>
			normalizeTargetCompetitorInput({
				target: {
					topic: "Running shoes",
					site: "example.com",
				},
				competitors: [
					{
						name: "Acme",
						site: "https://example.com./reviews",
					},
				],
			}),
		(error: unknown) => error instanceof IntakeInputValidationError && /same site as the target/.test(error.message),
	);

	assert.throws(
		() =>
			normalizeTargetCompetitorInput({
				target: {
					topic: "Running shoes",
					site: "https://example.com",
				},
				competitors: [
					{
						name: "Acme",
						site: "http://acme.test/one",
					},
					{
						name: "Acme Two",
						site: "https://acme.test/two",
					},
				],
			}),
		(error: unknown) =>
			error instanceof IntakeInputValidationError && /Duplicate competitor site/.test(error.message),
	);

	assert.throws(
		() =>
			normalizeTargetCompetitorInput({
				target: {
					topic: "Running shoes",
					site: "example.com",
				},
				competitors: [
					{
						name: "Acme",
						site: "acme.test",
					},
					{
						name: "Acme",
						site: "acme-two.test",
					},
				],
			}),
		(error: unknown) =>
			error instanceof IntakeInputValidationError && /Duplicate competitor name/.test(error.message),
	);

	assert.throws(
		() =>
			normalizeTargetCompetitorInput({
				target: {
					topic: "Running shoes",
					site: "example.com",
				},
				competitors: [
					{
						name: "Acme",
						site: "acme.test",
					},
					{
						name: "Acme!",
						site: "acme-two.test",
					},
				],
			}),
		(error: unknown) =>
			error instanceof IntakeInputValidationError && /Duplicate competitor slug/.test(error.message),
	);

	assert.throws(
		() =>
			normalizeTargetCompetitorInput({
				target: {
					topic: "Running shoes",
					site: "example.com",
				},
				competitors: [
					{
						name: "東京",
						site: "tokyo-one.test",
					},
					{
						name: "東京",
						site: "tokyo-two.test",
					},
				],
			}),
		(error: unknown) =>
			error instanceof IntakeInputValidationError && /Duplicate competitor name/.test(error.message),
	);
});

test("canonical intake fixture stays stable for regression checks", () => {
	const expectedArtifact = JSON.parse(readFileSync(CANONICAL_FIXTURE_PATH, "utf8")) as unknown;
	const normalizedArtifact = normalizeTargetCompetitorInput({
		target: {
			topic: "  Running   shoes ",
			site: "Example.com/products?category=running",
		},
		competitors: [
			{
				name: "Fleet Foot",
				site: "https://fleetfoot.io/reviews",
			},
			{
				name: "Stride Labs",
				site: "stridelabs.co",
			},
		],
	});

	assert.deepEqual(normalizedArtifact, expectedArtifact);
});

test("write/read helpers round-trip serialized intake artifacts", () => {
	const workspaceDirectory = mkdtempSync(join(tmpdir(), "rankclaw-intake-artifact-"));

	try {
		const artifact = normalizeTargetCompetitorInput({
			target: {
				topic: "Running shoes",
				site: "example.com",
			},
			competitors: [
				{
					name: "Stride Labs",
					site: "stridelabs.co",
				},
			],
		});

		const artifactPath = writeTargetCompetitorArtifact(workspaceDirectory, artifact);
		assert.equal(artifactPath, resolveTargetCompetitorArtifactPath(workspaceDirectory));
		assert.equal(readFileSync(artifactPath, "utf8"), serializeTargetCompetitorArtifact(artifact));
		assert.deepEqual(readTargetCompetitorArtifact(artifactPath), artifact);
	} finally {
		rmSync(workspaceDirectory, { recursive: true, force: true });
	}
});
