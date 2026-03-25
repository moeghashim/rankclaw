import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SCHEME_PREFIX_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//;
const WHITESPACE_PATTERN = /\s+/g;
const SLUG_PATTERN = /[^a-z0-9]+/g;
const DUPLICATE_DASH_PATTERN = /-{2,}/g;

export const TARGET_COMPETITOR_ARTIFACT_KIND = "rankclaw/intake/target-competitors";
export const TARGET_COMPETITOR_ARTIFACT_SCHEMA_VERSION = 1;
export const TARGET_COMPETITOR_ARTIFACT_RELATIVE_PATH = "intake/target-competitors.json";

export interface IntakeTargetInput {
	topic: string;
	site: string;
	name?: string;
}

export interface IntakeCompetitorInput {
	name: string;
	site: string;
}

export interface TargetCompetitorInput {
	target: IntakeTargetInput;
	competitors: readonly IntakeCompetitorInput[];
}

export interface IntakeSite {
	input: string;
	origin: string;
	host: string;
}

export interface IntakeTarget {
	id: string;
	topic: string;
	name: string;
	site: IntakeSite;
}

export interface IntakeCompetitor {
	id: string;
	name: string;
	site: IntakeSite;
}

export interface TargetCompetitorArtifact {
	kind: typeof TARGET_COMPETITOR_ARTIFACT_KIND;
	schemaVersion: typeof TARGET_COMPETITOR_ARTIFACT_SCHEMA_VERSION;
	target: IntakeTarget;
	competitors: readonly IntakeCompetitor[];
}

export class IntakeInputValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "IntakeInputValidationError";
	}
}

export function normalizeTargetCompetitorInput(input: TargetCompetitorInput): TargetCompetitorArtifact {
	const targetTopic = normalizeRequiredText(input.target.topic, "target topic");
	const targetSite = normalizeSite(input.target.site, "target site");
	const targetName =
		input.target.name === undefined ? targetSite.host : normalizeRequiredText(input.target.name, "target name");
	const targetId = toSlug(targetName, "target");

	if (input.competitors.length === 0) {
		throw new IntakeInputValidationError("At least one competitor is required.");
	}

	const competitorHosts = new Set<string>();
	const competitorNames = new Set<string>();
	const normalizedCompetitors = input.competitors.map((competitor, index) => {
		const competitorName = normalizeRequiredText(competitor.name, `competitor ${index + 1} name`);
		const competitorSite = normalizeSite(competitor.site, `competitor ${index + 1} site`);
		const competitorId = toSlug(competitorName, `competitor-${index + 1}`);
		const normalizedCompetitorName = competitorName.toLocaleLowerCase();

		if (competitorSite.host === targetSite.host) {
			throw new IntakeInputValidationError(
				`Competitor "${competitorName}" uses the same site as the target (${targetSite.host}).`,
			);
		}

		if (competitorHosts.has(competitorSite.host)) {
			throw new IntakeInputValidationError(`Duplicate competitor site is not allowed: ${competitorSite.host}`);
		}

		if (competitorNames.has(normalizedCompetitorName)) {
			throw new IntakeInputValidationError(`Duplicate competitor name is not allowed: ${competitorName}`);
		}

		competitorHosts.add(competitorSite.host);
		competitorNames.add(normalizedCompetitorName);

		return {
			id: competitorId,
			name: competitorName,
			site: competitorSite,
		} satisfies IntakeCompetitor;
	});

	normalizedCompetitors.sort((left, right) => {
		const byId = left.id.localeCompare(right.id);
		if (byId !== 0) {
			return byId;
		}

		return left.site.origin.localeCompare(right.site.origin);
	});

	return {
		kind: TARGET_COMPETITOR_ARTIFACT_KIND,
		schemaVersion: TARGET_COMPETITOR_ARTIFACT_SCHEMA_VERSION,
		target: {
			id: targetId,
			topic: targetTopic,
			name: targetName,
			site: targetSite,
		},
		competitors: normalizedCompetitors,
	};
}

export function resolveTargetCompetitorArtifactPath(outputDir: string): string {
	return resolve(outputDir, TARGET_COMPETITOR_ARTIFACT_RELATIVE_PATH);
}

export function serializeTargetCompetitorArtifact(artifact: TargetCompetitorArtifact): string {
	return `${JSON.stringify(artifact, null, 2)}\n`;
}

export function writeTargetCompetitorArtifact(outputDir: string, artifact: TargetCompetitorArtifact): string {
	const artifactPath = resolveTargetCompetitorArtifactPath(outputDir);
	mkdirSync(dirname(artifactPath), { recursive: true });
	writeFileSync(artifactPath, serializeTargetCompetitorArtifact(artifact), "utf8");
	return artifactPath;
}

export function readTargetCompetitorArtifact(path: string): TargetCompetitorArtifact {
	const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
	return parseTargetCompetitorArtifact(parsed, path);
}

export function parseTargetCompetitorArtifact(
	value: unknown,
	sourceLabel = "target competitor artifact",
): TargetCompetitorArtifact {
	if (!isRecord(value)) {
		throw new IntakeInputValidationError(`${sourceLabel} must be an object`);
	}

	if (value.kind !== TARGET_COMPETITOR_ARTIFACT_KIND) {
		throw new IntakeInputValidationError(`${sourceLabel} has unsupported kind`);
	}

	if (value.schemaVersion !== TARGET_COMPETITOR_ARTIFACT_SCHEMA_VERSION) {
		throw new IntakeInputValidationError(`${sourceLabel} has unsupported schemaVersion`);
	}

	const target = parseTarget(value.target, sourceLabel);
	const competitors = parseCompetitors(value.competitors, sourceLabel);

	return {
		kind: TARGET_COMPETITOR_ARTIFACT_KIND,
		schemaVersion: TARGET_COMPETITOR_ARTIFACT_SCHEMA_VERSION,
		target,
		competitors,
	};
}

function parseTarget(value: unknown, sourceLabel: string): IntakeTarget {
	if (!isRecord(value)) {
		throw new IntakeInputValidationError(`${sourceLabel}.target must be an object`);
	}

	return {
		id: expectString(value.id, `${sourceLabel}.target.id`),
		topic: expectString(value.topic, `${sourceLabel}.target.topic`),
		name: expectString(value.name, `${sourceLabel}.target.name`),
		site: parseSite(value.site, `${sourceLabel}.target.site`),
	};
}

function parseCompetitors(value: unknown, sourceLabel: string): readonly IntakeCompetitor[] {
	if (!Array.isArray(value)) {
		throw new IntakeInputValidationError(`${sourceLabel}.competitors must be an array`);
	}

	return value.map((entry, index) => {
		if (!isRecord(entry)) {
			throw new IntakeInputValidationError(`${sourceLabel}.competitors[${index}] must be an object`);
		}

		return {
			id: expectString(entry.id, `${sourceLabel}.competitors[${index}].id`),
			name: expectString(entry.name, `${sourceLabel}.competitors[${index}].name`),
			site: parseSite(entry.site, `${sourceLabel}.competitors[${index}].site`),
		} satisfies IntakeCompetitor;
	});
}

function parseSite(value: unknown, field: string): IntakeSite {
	if (!isRecord(value)) {
		throw new IntakeInputValidationError(`${field} must be an object`);
	}

	return {
		input: expectString(value.input, `${field}.input`),
		origin: expectString(value.origin, `${field}.origin`),
		host: expectString(value.host, `${field}.host`),
	};
}

function expectString(value: unknown, field: string): string {
	if (typeof value !== "string") {
		throw new IntakeInputValidationError(`${field} must be a string`);
	}

	return value;
}

function normalizeRequiredText(value: string, fieldLabel: string): string {
	const normalizedValue = value.trim().replace(WHITESPACE_PATTERN, " ");
	if (normalizedValue.length === 0) {
		throw new IntakeInputValidationError(`Expected ${fieldLabel} to be a non-empty string.`);
	}

	return normalizedValue;
}

function normalizeSite(value: string, fieldLabel: string): IntakeSite {
	const rawInput = normalizeRequiredText(value, fieldLabel);
	const normalizedInput = SCHEME_PREFIX_PATTERN.test(rawInput) ? rawInput : `https://${rawInput}`;
	let url: URL;

	try {
		url = new URL(normalizedInput);
	} catch {
		throw new IntakeInputValidationError(`Expected ${fieldLabel} to be a valid URL or hostname.`);
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new IntakeInputValidationError(`Expected ${fieldLabel} to use http or https.`);
	}

	if (url.hostname.length === 0) {
		throw new IntakeInputValidationError(`Expected ${fieldLabel} to include a hostname.`);
	}

	return {
		input: rawInput,
		origin: url.origin,
		host: url.hostname,
	};
}

function toSlug(value: string, fallback: string): string {
	const normalized = value
		.toLowerCase()
		.replace(SLUG_PATTERN, "-")
		.replace(DUPLICATE_DASH_PATTERN, "-")
		.replace(/^[-]+|[-]+$/g, "");

	return normalized.length === 0 ? fallback : normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
