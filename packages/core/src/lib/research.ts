import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
	type IntakeCompetitor,
	type IntakeTarget,
	parseTargetCompetitorArtifact,
	TARGET_COMPETITOR_ARTIFACT_KIND,
	TARGET_COMPETITOR_ARTIFACT_SCHEMA_VERSION,
	type TargetCompetitorArtifact,
} from "./intake.js";

const WHITESPACE_PATTERN = /\s+/g;
const SLUG_PATTERN = /[^a-z0-9]+/g;
const DUPLICATE_DASH_PATTERN = /-{2,}/g;
const JSON_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

export const GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_KIND = "rankclaw/research/recommendation-snapshot";
export const GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_SCHEMA_VERSION = 1;
export const GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_RELATIVE_PATH = "research/gemini-answer-intent-snapshot.json";
export const GEMINI_RESEARCH_ENGINE = "gemini";

export interface RecommendationPromptRecord {
	id: string;
	role: "system" | "user";
	content: string;
}

export interface GeminiRawResponseEnvelope {
	model: string;
	rawResponse: string;
}

export interface AnswerIntentQuestion {
	id: string;
	question: string;
	intent: string;
}

export interface AnswerIntentRecommendation {
	id: string;
	recommendation: string;
	rationale: string;
}

export interface NormalizedRecommendationSnapshot {
	summary: string;
	questions: readonly AnswerIntentQuestion[];
	recommendations: readonly AnswerIntentRecommendation[];
}

export interface GeminiRecommendationSnapshotArtifact {
	kind: typeof GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_KIND;
	schemaVersion: typeof GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_SCHEMA_VERSION;
	engine: typeof GEMINI_RESEARCH_ENGINE;
	capturedAt: string;
	context: {
		target: IntakeTarget;
		competitors: readonly IntakeCompetitor[];
	};
	prompts: readonly RecommendationPromptRecord[];
	response: GeminiRawResponseEnvelope;
	snapshot: NormalizedRecommendationSnapshot;
}

export interface CreateGeminiRecommendationSnapshotOptions {
	intakeArtifact: TargetCompetitorArtifact;
	response: GeminiRawResponseEnvelope;
	prompts?: readonly RecommendationPromptRecord[];
	capturedAt?: string;
}

export class ResearchSnapshotValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ResearchSnapshotValidationError";
	}
}

export function buildGeminiAnswerIntentPrompts(
	intakeArtifact: TargetCompetitorArtifact,
): readonly RecommendationPromptRecord[] {
	const competitorLines = intakeArtifact.competitors
		.map((competitor, index) => `${index + 1}. ${competitor.name} (${competitor.site.origin})`)
		.join("\n");

	const systemPrompt = [
		"You are Rankclaw's answer-intent research assistant.",
		"Return JSON only with this exact shape:",
		'{"summary": string, "questions": [{"question": string, "intent": string}], "recommendations": [{"recommendation": string, "rationale": string}]}',
		"Do not wrap the JSON in markdown.",
	].join("\n");

	const userPrompt = [
		`Target topic: ${intakeArtifact.target.topic}`,
		`Target name: ${intakeArtifact.target.name}`,
		`Target site: ${intakeArtifact.target.site.origin}`,
		"Competitors:",
		competitorLines,
		"Identify high-intent customer questions and concrete recommendations for content and positioning.",
	].join("\n");

	return [
		{
			id: "system-1",
			role: "system",
			content: systemPrompt,
		},
		{
			id: "user-1",
			role: "user",
			content: userPrompt,
		},
	];
}

export function normalizeGeminiAnswerIntentResponse(rawResponse: string): NormalizedRecommendationSnapshot {
	const parsedPayload = parseGeminiPayload(rawResponse);
	return {
		summary: parsedPayload.summary,
		questions: parsedPayload.questions,
		recommendations: parsedPayload.recommendations,
	};
}

export function createGeminiRecommendationSnapshotArtifact(
	options: CreateGeminiRecommendationSnapshotOptions,
): GeminiRecommendationSnapshotArtifact {
	const prompts = normalizePromptRecords(
		options.prompts ?? buildGeminiAnswerIntentPrompts(options.intakeArtifact),
		"prompts",
	);
	const response = parseGeminiRawResponseEnvelope(options.response, "gemini response");
	const snapshot = normalizeGeminiAnswerIntentResponse(response.rawResponse);

	return {
		kind: GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_KIND,
		schemaVersion: GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_SCHEMA_VERSION,
		engine: GEMINI_RESEARCH_ENGINE,
		capturedAt: normalizeTimestamp(options.capturedAt ?? new Date().toISOString(), "capturedAt"),
		context: {
			target: options.intakeArtifact.target,
			competitors: options.intakeArtifact.competitors,
		},
		prompts,
		response,
		snapshot,
	};
}

export function resolveGeminiRecommendationSnapshotArtifactPath(outputDir: string): string {
	return resolve(outputDir, GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_RELATIVE_PATH);
}

export function serializeGeminiRecommendationSnapshotArtifact(artifact: GeminiRecommendationSnapshotArtifact): string {
	return `${JSON.stringify(artifact, null, 2)}\n`;
}

export function writeGeminiRecommendationSnapshotArtifact(
	outputDir: string,
	artifact: GeminiRecommendationSnapshotArtifact,
): string {
	const artifactPath = resolveGeminiRecommendationSnapshotArtifactPath(outputDir);
	mkdirSync(dirname(artifactPath), { recursive: true });
	writeFileSync(artifactPath, serializeGeminiRecommendationSnapshotArtifact(artifact), "utf8");
	return artifactPath;
}

export function readGeminiRecommendationSnapshotArtifact(path: string): GeminiRecommendationSnapshotArtifact {
	const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
	return parseGeminiRecommendationSnapshotArtifact(parsed, path);
}

export function readGeminiRawResponseFixture(path: string): GeminiRawResponseEnvelope {
	let parsedFixture: unknown;
	try {
		parsedFixture = JSON.parse(readFileSync(path, "utf8")) as unknown;
	} catch (error: unknown) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new ResearchSnapshotValidationError(`Failed to read Gemini fixture at ${path}: ${reason}`);
	}

	return parseGeminiRawResponseEnvelope(parsedFixture, `gemini fixture at ${path}`);
}

export function parseGeminiRecommendationSnapshotArtifact(
	value: unknown,
	sourceLabel = "gemini recommendation snapshot artifact",
): GeminiRecommendationSnapshotArtifact {
	if (!isRecord(value)) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} must be an object`);
	}

	if (value.kind !== GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_KIND) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} has unsupported kind`);
	}

	if (value.schemaVersion !== GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_SCHEMA_VERSION) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} has unsupported schemaVersion`);
	}

	if (value.engine !== GEMINI_RESEARCH_ENGINE) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} has unsupported engine`);
	}

	if (!isRecord(value.context)) {
		throw new ResearchSnapshotValidationError(`${sourceLabel}.context must be an object`);
	}

	const contextArtifact = parseTargetCompetitorArtifact(
		{
			kind: TARGET_COMPETITOR_ARTIFACT_KIND,
			schemaVersion: TARGET_COMPETITOR_ARTIFACT_SCHEMA_VERSION,
			target: value.context.target,
			competitors: value.context.competitors,
		},
		`${sourceLabel}.context`,
	);

	return {
		kind: GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_KIND,
		schemaVersion: GEMINI_RECOMMENDATION_SNAPSHOT_ARTIFACT_SCHEMA_VERSION,
		engine: GEMINI_RESEARCH_ENGINE,
		capturedAt: normalizeTimestamp(
			expectString(value.capturedAt, `${sourceLabel}.capturedAt`),
			`${sourceLabel}.capturedAt`,
		),
		context: {
			target: contextArtifact.target,
			competitors: contextArtifact.competitors,
		},
		prompts: normalizePromptRecords(value.prompts, `${sourceLabel}.prompts`),
		response: parseGeminiRawResponseEnvelope(value.response, `${sourceLabel}.response`),
		snapshot: parseNormalizedSnapshot(value.snapshot, `${sourceLabel}.snapshot`),
	};
}

export function parseGeminiRawResponseEnvelope(
	value: unknown,
	sourceLabel = "gemini raw response envelope",
): GeminiRawResponseEnvelope {
	if (!isRecord(value)) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} must be an object`);
	}

	return {
		model: normalizeNonEmptyText(expectString(value.model, `${sourceLabel}.model`), `${sourceLabel}.model`),
		rawResponse: normalizeNonEmptyText(
			expectString(value.rawResponse, `${sourceLabel}.rawResponse`),
			`${sourceLabel}.rawResponse`,
		),
	};
}

function parseNormalizedSnapshot(value: unknown, sourceLabel: string): NormalizedRecommendationSnapshot {
	if (!isRecord(value)) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} must be an object`);
	}

	const summary = normalizeRequiredText(
		expectString(value.summary, `${sourceLabel}.summary`),
		`${sourceLabel}.summary`,
	);
	const questions = parseQuestions(value.questions, `${sourceLabel}.questions`);
	const recommendations = parseRecommendations(value.recommendations, `${sourceLabel}.recommendations`);

	return {
		summary,
		questions,
		recommendations,
	};
}

function normalizePromptRecords(value: unknown, sourceLabel: string): readonly RecommendationPromptRecord[] {
	if (!Array.isArray(value)) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} must be an array`);
	}

	if (value.length === 0) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} must include at least one prompt`);
	}

	return value.map((entry, index) => {
		if (!isRecord(entry)) {
			throw new ResearchSnapshotValidationError(`${sourceLabel}[${index}] must be an object`);
		}

		const role = expectString(entry.role, `${sourceLabel}[${index}].role`);
		if (role !== "system" && role !== "user") {
			throw new ResearchSnapshotValidationError(`${sourceLabel}[${index}].role must be "system" or "user"`);
		}

		return {
			id: normalizeNonEmptyText(
				expectString(entry.id, `${sourceLabel}[${index}].id`),
				`${sourceLabel}[${index}].id`,
			),
			role,
			content: normalizeNonEmptyText(
				expectString(entry.content, `${sourceLabel}[${index}].content`),
				`${sourceLabel}[${index}].content`,
			),
		} satisfies RecommendationPromptRecord;
	});
}

function parseGeminiPayload(rawResponse: string): NormalizedRecommendationSnapshot {
	const normalizedRawResponse = normalizeNonEmptyText(rawResponse, "gemini raw response");
	const payload = parseJsonPayload(normalizedRawResponse);
	if (!isRecord(payload)) {
		throw new ResearchSnapshotValidationError("Gemini response payload must be a JSON object.");
	}

	const summary = normalizeRequiredText(
		expectString(payload.summary, "Gemini payload.summary"),
		"Gemini payload.summary",
	);
	const questions = parseQuestions(payload.questions, "Gemini payload.questions");
	const recommendations = parseRecommendations(payload.recommendations, "Gemini payload.recommendations");

	return {
		summary,
		questions,
		recommendations,
	};
}

function parseJsonPayload(rawResponse: string): unknown {
	const trimmedResponse = rawResponse.trim();
	const fencedPayload = trimmedResponse.match(JSON_FENCE_PATTERN)?.[1]?.trim() ?? trimmedResponse;
	const candidates = [fencedPayload];
	const firstBrace = fencedPayload.indexOf("{");
	const lastBrace = fencedPayload.lastIndexOf("}");

	if (firstBrace >= 0 && lastBrace > firstBrace) {
		candidates.push(fencedPayload.slice(firstBrace, lastBrace + 1));
	}

	for (const candidate of candidates) {
		try {
			return JSON.parse(candidate) as unknown;
		} catch {
			// Ignore and continue to next candidate.
		}
	}

	throw new ResearchSnapshotValidationError("Gemini response payload is not valid JSON.");
}

function parseQuestions(value: unknown, sourceLabel: string): readonly AnswerIntentQuestion[] {
	if (!Array.isArray(value)) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} must be an array`);
	}

	const seenEntries = new Set<string>();
	const usedIds = new Set<string>();
	const normalizedQuestions: AnswerIntentQuestion[] = [];

	for (const [index, entry] of value.entries()) {
		if (!isRecord(entry)) {
			throw new ResearchSnapshotValidationError(`${sourceLabel}[${index}] must be an object`);
		}

		const question = normalizeRequiredText(
			expectString(entry.question, `${sourceLabel}[${index}].question`),
			`${sourceLabel}[${index}].question`,
		);
		const intent = normalizeRequiredText(
			expectString(entry.intent, `${sourceLabel}[${index}].intent`),
			`${sourceLabel}[${index}].intent`,
		);
		const dedupeKey = `${question}\u0000${intent}`;
		if (seenEntries.has(dedupeKey)) {
			continue;
		}

		seenEntries.add(dedupeKey);
		normalizedQuestions.push({
			id: createStableUniqueId(question, `question-${index + 1}`, usedIds),
			question,
			intent,
		});
	}

	normalizedQuestions.sort((left, right) => left.id.localeCompare(right.id));
	if (normalizedQuestions.length === 0) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} must include at least one question`);
	}

	return normalizedQuestions;
}

function parseRecommendations(value: unknown, sourceLabel: string): readonly AnswerIntentRecommendation[] {
	if (!Array.isArray(value)) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} must be an array`);
	}

	const seenEntries = new Set<string>();
	const usedIds = new Set<string>();
	const normalizedRecommendations: AnswerIntentRecommendation[] = [];

	for (const [index, entry] of value.entries()) {
		if (!isRecord(entry)) {
			throw new ResearchSnapshotValidationError(`${sourceLabel}[${index}] must be an object`);
		}

		const recommendation = normalizeRequiredText(
			expectString(entry.recommendation, `${sourceLabel}[${index}].recommendation`),
			`${sourceLabel}[${index}].recommendation`,
		);
		const rationale = normalizeRequiredText(
			expectString(entry.rationale, `${sourceLabel}[${index}].rationale`),
			`${sourceLabel}[${index}].rationale`,
		);
		const dedupeKey = `${recommendation}\u0000${rationale}`;
		if (seenEntries.has(dedupeKey)) {
			continue;
		}

		seenEntries.add(dedupeKey);
		normalizedRecommendations.push({
			id: createStableUniqueId(recommendation, `recommendation-${index + 1}`, usedIds),
			recommendation,
			rationale,
		});
	}

	normalizedRecommendations.sort((left, right) => left.id.localeCompare(right.id));

	if (normalizedRecommendations.length === 0) {
		throw new ResearchSnapshotValidationError(`${sourceLabel} must include at least one recommendation`);
	}

	return normalizedRecommendations;
}

function createStableUniqueId(value: string, fallback: string, usedIds: Set<string>): string {
	const baseId = toSlug(value, fallback);
	let candidateId = baseId;
	let suffix = 2;

	while (usedIds.has(candidateId)) {
		candidateId = `${baseId}-${suffix}`;
		suffix += 1;
	}

	usedIds.add(candidateId);
	return candidateId;
}

function normalizeRequiredText(value: string, fieldLabel: string): string {
	const normalizedValue = value.trim().replace(WHITESPACE_PATTERN, " ");
	if (normalizedValue.length === 0) {
		throw new ResearchSnapshotValidationError(`Expected ${fieldLabel} to be a non-empty string.`);
	}

	return normalizedValue;
}

function normalizeTimestamp(value: string, fieldLabel: string): string {
	const normalizedValue = normalizeNonEmptyText(value, fieldLabel);
	const parsedTimestamp = new Date(normalizedValue);
	if (Number.isNaN(parsedTimestamp.getTime())) {
		throw new ResearchSnapshotValidationError(`Expected ${fieldLabel} to be a valid ISO timestamp.`);
	}

	return parsedTimestamp.toISOString();
}

function normalizeNonEmptyText(value: string, fieldLabel: string): string {
	const normalizedValue = value.trim();
	if (normalizedValue.length === 0) {
		throw new ResearchSnapshotValidationError(`Expected ${fieldLabel} to be a non-empty string.`);
	}

	return normalizedValue;
}

function expectString(value: unknown, field: string): string {
	if (typeof value !== "string") {
		throw new ResearchSnapshotValidationError(`${field} must be a string`);
	}

	return value;
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
