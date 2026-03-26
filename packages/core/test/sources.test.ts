import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { normalizeTargetCompetitorInput, readTargetCompetitorArtifact } from "../src/lib/intake.js";
import {
	normalizeSourceImportInput,
	readSourceImportArtifact,
	resolveSourceImportArtifactPath,
	SourceImportValidationError,
	serializeSourceImportArtifact,
	writeSourceImportArtifact,
} from "../src/lib/sources.js";

const CANONICAL_INTAKE_FIXTURE_PATH = "./test/fixtures/intake/canonical-target-and-competitors.json";
const CANONICAL_SOURCE_IMPORT_FIXTURE_PATH = "./test/fixtures/sources/canonical-imported-sources.json";

test("normalizeSourceImportInput imports normalized source records with duplicate + invalid handling", () => {
	const intakeArtifact = normalizeTargetCompetitorInput({
		target: {
			topic: "Running shoes",
			site: "example.com",
		},
		competitors: [
			{
				name: "Fleet Foot",
				site: "fleetfoot.io",
			},
			{
				name: "Stride Labs",
				site: "stridelabs.co",
			},
		],
	});

	const artifact = normalizeSourceImportInput({
		intakeArtifact,
		targetSources: [
			"https://example.com/reviews/running-shoes?utm_source=newsletter",
			"example.com/reviews/running-shoes/",
			"https://",
		],
		competitorSources: [
			{
				competitorId: "fleet-foot",
				url: "https://fleetfoot.io/reviews/best-running-shoes",
			},
			{
				competitorId: "fleet-foot",
				url: "https://fleetfoot.io/reviews/best-running-shoes?utm_medium=email",
			},
			{
				competitorId: "stride-labs",
				url: "https://stridelabs.co/blog/carbon-plate-guide?b=2&a=1",
			},
		],
	});

	assert.deepEqual(artifact, {
		kind: "rankclaw/intake/source-records",
		schemaVersion: 1,
		target: intakeArtifact.target,
		competitors: intakeArtifact.competitors,
		sources: [
			{
				id: "target-example-com-example-com-reviews-running-shoes",
				owner: {
					type: "target",
					id: "example-com",
					name: "example.com",
				},
				input: "https://example.com/reviews/running-shoes?utm_source=newsletter",
				url: {
					href: "https://example.com/reviews/running-shoes",
					origin: "https://example.com",
					host: "example.com",
					pathname: "/reviews/running-shoes",
					search: "",
				},
			},
			{
				id: "competitor-fleet-foot-fleetfoot-io-reviews-best-running-shoes",
				owner: {
					type: "competitor",
					id: "fleet-foot",
					name: "Fleet Foot",
				},
				input: "https://fleetfoot.io/reviews/best-running-shoes",
				url: {
					href: "https://fleetfoot.io/reviews/best-running-shoes",
					origin: "https://fleetfoot.io",
					host: "fleetfoot.io",
					pathname: "/reviews/best-running-shoes",
					search: "",
				},
			},
			{
				id: "competitor-stride-labs-stridelabs-co-blog-carbon-plate-guide-a-1-b-2",
				owner: {
					type: "competitor",
					id: "stride-labs",
					name: "Stride Labs",
				},
				input: "https://stridelabs.co/blog/carbon-plate-guide?b=2&a=1",
				url: {
					href: "https://stridelabs.co/blog/carbon-plate-guide?a=1&b=2",
					origin: "https://stridelabs.co",
					host: "stridelabs.co",
					pathname: "/blog/carbon-plate-guide",
					search: "?a=1&b=2",
				},
			},
		],
		outcomes: [
			{
				owner: {
					type: "target",
					id: "example-com",
					name: "example.com",
				},
				input: "https://example.com/reviews/running-shoes?utm_source=newsletter",
				status: "accepted",
				recordId: "target-example-com-example-com-reviews-running-shoes",
			},
			{
				owner: {
					type: "target",
					id: "example-com",
					name: "example.com",
				},
				input: "example.com/reviews/running-shoes/",
				status: "duplicate",
				reason: 'Duplicate source URL for target "example.com".',
				recordId: "target-example-com-example-com-reviews-running-shoes",
			},
			{
				owner: {
					type: "target",
					id: "example-com",
					name: "example.com",
				},
				input: "https://",
				status: "invalid",
				reason: "Expected target source URL 3 to be a valid URL or hostname.",
			},
			{
				owner: {
					type: "competitor",
					id: "fleet-foot",
					name: "Fleet Foot",
				},
				input: "https://fleetfoot.io/reviews/best-running-shoes",
				status: "accepted",
				recordId: "competitor-fleet-foot-fleetfoot-io-reviews-best-running-shoes",
			},
			{
				owner: {
					type: "competitor",
					id: "fleet-foot",
					name: "Fleet Foot",
				},
				input: "https://fleetfoot.io/reviews/best-running-shoes?utm_medium=email",
				status: "duplicate",
				reason: 'Duplicate source URL for competitor "Fleet Foot".',
				recordId: "competitor-fleet-foot-fleetfoot-io-reviews-best-running-shoes",
			},
			{
				owner: {
					type: "competitor",
					id: "stride-labs",
					name: "Stride Labs",
				},
				input: "https://stridelabs.co/blog/carbon-plate-guide?b=2&a=1",
				status: "accepted",
				recordId: "competitor-stride-labs-stridelabs-co-blog-carbon-plate-guide-a-1-b-2",
			},
		],
		summary: {
			accepted: 3,
			duplicates: 2,
			invalid: 1,
		},
	});
});

test("normalizeSourceImportInput rejects unknown competitor source owner ids", () => {
	const intakeArtifact = normalizeTargetCompetitorInput({
		target: {
			topic: "Running shoes",
			site: "example.com",
		},
		competitors: [
			{
				name: "Fleet Foot",
				site: "fleetfoot.io",
			},
		],
	});

	assert.throws(
		() =>
			normalizeSourceImportInput({
				intakeArtifact,
				targetSources: [],
				competitorSources: [
					{
						competitorId: "missing-competitor",
						url: "https://fleetfoot.io/reviews/best-running-shoes",
					},
				],
			}),
		(error: unknown) => error instanceof SourceImportValidationError && /Unknown competitor id/.test(error.message),
	);
});


test("normalizeSourceImportInput rejects numeric scheme-like inputs without clobbering recognizable hostname:port entries", () => {
	const intakeArtifact = normalizeTargetCompetitorInput({
		target: {
			topic: "Running shoes",
			site: "example.com",
		},
		competitors: [],
	});

	const artifact = normalizeSourceImportInput({
		intakeArtifact,
		targetSources: [
			"mailto:test@example.com",
			"tel:911",
			"mailto:443",
			"example.com:8080/reviews",
			"localhost:3000/reviews",
			"127.0.0.1:3000/reviews",
		],
		competitorSources: [],
	});

	assert.deepEqual(artifact.sources, [
		{
			id: "target-example-com-example-com-8080-reviews",
			owner: {
				type: "target",
				id: "example-com",
				name: "example.com",
			},
			input: "example.com:8080/reviews",
			url: {
				href: "https://example.com:8080/reviews",
				origin: "https://example.com:8080",
				host: "example.com",
				pathname: "/reviews",
				search: "",
			},
		},
		{
			id: "target-example-com-localhost-3000-reviews",
			owner: {
				type: "target",
				id: "example-com",
				name: "example.com",
			},
			input: "localhost:3000/reviews",
			url: {
				href: "https://localhost:3000/reviews",
				origin: "https://localhost:3000",
				host: "localhost",
				pathname: "/reviews",
				search: "",
			},
		},
		{
			id: "target-example-com-127-0-0-1-3000-reviews",
			owner: {
				type: "target",
				id: "example-com",
				name: "example.com",
			},
			input: "127.0.0.1:3000/reviews",
			url: {
				href: "https://127.0.0.1:3000/reviews",
				origin: "https://127.0.0.1:3000",
				host: "127.0.0.1",
				pathname: "/reviews",
				search: "",
			},
		},
	]);
	assert.deepEqual(artifact.outcomes, [
		{
			owner: {
				type: "target",
				id: "example-com",
				name: "example.com",
			},
			input: "mailto:test@example.com",
			status: "invalid",
			reason: "Expected target source URL 1 to use http or https.",
		},
		{
			owner: {
				type: "target",
				id: "example-com",
				name: "example.com",
			},
			input: "tel:911",
			status: "invalid",
			reason: "Expected target source URL 2 to use http or https.",
		},
		{
			owner: {
				type: "target",
				id: "example-com",
				name: "example.com",
			},
			input: "mailto:443",
			status: "invalid",
			reason: "Expected target source URL 3 to use http or https.",
		},
		{
			owner: {
				type: "target",
				id: "example-com",
				name: "example.com",
			},
			input: "example.com:8080/reviews",
			status: "accepted",
			recordId: "target-example-com-example-com-8080-reviews",
		},
		{
			owner: {
				type: "target",
				id: "example-com",
				name: "example.com",
			},
			input: "localhost:3000/reviews",
			status: "accepted",
			recordId: "target-example-com-localhost-3000-reviews",
		},
		{
			owner: {
				type: "target",
				id: "example-com",
				name: "example.com",
			},
			input: "127.0.0.1:3000/reviews",
			status: "accepted",
			recordId: "target-example-com-127-0-0-1-3000-reviews",
		},
	]);
	assert.deepEqual(artifact.summary, {
		accepted: 3,
		duplicates: 0,
		invalid: 3,
	});
});


test("canonical source import fixture stays stable for regression checks", () => {
	const expectedArtifact = JSON.parse(readFileSync(CANONICAL_SOURCE_IMPORT_FIXTURE_PATH, "utf8")) as unknown;
	const intakeArtifact = readTargetCompetitorArtifact(CANONICAL_INTAKE_FIXTURE_PATH);

	const normalizedArtifact = normalizeSourceImportInput({
		intakeArtifact,
		targetSources: [
			"https://example.com/reviews/running-shoes?utm_source=newsletter",
			"example.com/reviews/running-shoes/",
			"https://",
		],
		competitorSources: [
			{
				competitorId: "fleet-foot",
				url: "https://fleetfoot.io/reviews/best-running-shoes",
			},
			{
				competitorId: "fleet-foot",
				url: "https://fleetfoot.io/reviews/best-running-shoes?utm_medium=email",
			},
			{
				competitorId: "stride-labs",
				url: "https://stridelabs.co/blog/carbon-plate-guide?b=2&a=1",
			},
		],
	});

	assert.deepEqual(normalizedArtifact, expectedArtifact);
});

test("write/read helpers round-trip serialized source import artifacts", () => {
	const workspaceDirectory = mkdtempSync(join(tmpdir(), "rankclaw-source-import-artifact-"));

	try {
		const intakeArtifact = normalizeTargetCompetitorInput({
			target: {
				topic: "Running shoes",
				site: "example.com",
			},
			competitors: [
				{
					name: "Fleet Foot",
					site: "fleetfoot.io",
				},
			],
		});

		const artifact = normalizeSourceImportInput({
			intakeArtifact,
			targetSources: ["https://example.com/reviews/running-shoes"],
			competitorSources: [
				{
					competitorId: "fleet-foot",
					url: "https://fleetfoot.io/reviews/best-running-shoes",
				},
			],
		});

		const artifactPath = writeSourceImportArtifact(workspaceDirectory, artifact);
		assert.equal(artifactPath, resolveSourceImportArtifactPath(workspaceDirectory));
		assert.equal(readFileSync(artifactPath, "utf8"), serializeSourceImportArtifact(artifact));
		assert.deepEqual(readSourceImportArtifact(artifactPath), artifact);
	} finally {
		rmSync(workspaceDirectory, { recursive: true, force: true });
	}
});
