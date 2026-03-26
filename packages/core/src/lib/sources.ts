import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
	type IntakeCompetitor,
	type IntakeTarget,
	parseTargetCompetitorArtifact,
	type TargetCompetitorArtifact,
} from "./intake.js";

const SCHEME_PREFIX_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//;
const SCHEME_LIKE_INPUT_PATTERN = /^([a-zA-Z][a-zA-Z\d+.-]*):(?!\/\/)(.*)$/;
const WHITESPACE_PATTERN = /\s+/g;
const DUPLICATE_SLASH_PATTERN = /\/{2,}/g;
const SLUG_PATTERN = /[^a-z0-9]+/g;
const DUPLICATE_DASH_PATTERN = /-{2,}/g;

const TRACKING_QUERY_PARAM_NAMES = new Set([
	"utm_campaign",
	"utm_content",
	"utm_id",
	"utm_medium",
	"utm_source",
	"utm_term",
	"fbclid",
	"gclid",
	"mc_cid",
	"mc_eid",
]);

export const SOURCE_IMPORT_ARTIFACT_KIND = "rankclaw/intake/source-records";
export const SOURCE_IMPORT_ARTIFACT_SCHEMA_VERSION = 1;
export const SOURCE_IMPORT_ARTIFACT_RELATIVE_PATH = "sources/imported-sources.json";

export type SourceOwnerType = "target" | "competitor";
export type SourceImportOutcomeStatus = "accepted" | "duplicate" | "invalid";

export interface SourceOwnerReference {
	type: SourceOwnerType;
	id: string;
	name: string;
}

export interface SourceRecordUrl {
	href: string;
	origin: string;
	host: string;
	pathname: string;
	search: string;
}

export interface SourceRecord {
	id: string;
	owner: SourceOwnerReference;
	input: string;
	url: SourceRecordUrl;
}

export interface SourceImportOutcome {
	owner: SourceOwnerReference;
	input: string;
	status: SourceImportOutcomeStatus;
	reason?: string;
	recordId?: string;
}

export interface SourceImportSummary {
	accepted: number;
	duplicates: number;
	invalid: number;
}

export interface SourceImportCompetitorSourceInput {
	competitorId: string;
	url: string;
}

export interface SourceImportInput {
	intakeArtifact: TargetCompetitorArtifact;
	targetSources: readonly string[];
	competitorSources: readonly SourceImportCompetitorSourceInput[];
}

export interface SourceImportArtifact {
	kind: typeof SOURCE_IMPORT_ARTIFACT_KIND;
	schemaVersion: typeof SOURCE_IMPORT_ARTIFACT_SCHEMA_VERSION;
	target: IntakeTarget;
	competitors: readonly IntakeCompetitor[];
	sources: readonly SourceRecord[];
	outcomes: readonly SourceImportOutcome[];
	summary: SourceImportSummary;
}

interface SourceImportEntry {
	owner: SourceOwnerReference;
	input: string;
	fieldLabel: string;
}

export class SourceImportValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SourceImportValidationError";
	}
}

export function normalizeSourceImportInput(input: SourceImportInput): SourceImportArtifact {
	const intakeArtifact = parseTargetCompetitorArtifact(input.intakeArtifact, "source import intake artifact");
	const entries = normalizeSourceImportEntries(input, intakeArtifact.competitors);

	if (entries.length === 0) {
		throw new SourceImportValidationError("At least one source URL is required.");
	}

	const sourceKeyToRecordId = new Map<string, string>();
	const recordIds = new Set<string>();
	const sources: SourceRecord[] = [];
	const outcomes: SourceImportOutcome[] = [];

	for (const entry of entries) {
		try {
			const normalizedSource = normalizeSourceUrl(entry.input, entry.fieldLabel);
			const sourceKey = `${entry.owner.type}:${entry.owner.id}|${normalizedSource.url.href}`;
			const existingRecordId = sourceKeyToRecordId.get(sourceKey);

			if (existingRecordId !== undefined) {
				outcomes.push({
					owner: entry.owner,
					input: normalizedSource.input,
					status: "duplicate",
					reason: `Duplicate source URL for ${entry.owner.type} "${entry.owner.name}".`,
					recordId: existingRecordId,
				});
				continue;
			}

			const recordId = createUniqueSourceRecordId(entry.owner, normalizedSource.url, recordIds);
			sources.push({
				id: recordId,
				owner: entry.owner,
				input: normalizedSource.input,
				url: normalizedSource.url,
			});
			sourceKeyToRecordId.set(sourceKey, recordId);
			outcomes.push({
				owner: entry.owner,
				input: normalizedSource.input,
				status: "accepted",
				recordId,
			});
		} catch (error: unknown) {
			if (error instanceof SourceImportValidationError) {
				outcomes.push({
					owner: entry.owner,
					input: entry.input,
					status: "invalid",
					reason: error.message,
				});
				continue;
			}

			throw error;
		}
	}

	return {
		kind: SOURCE_IMPORT_ARTIFACT_KIND,
		schemaVersion: SOURCE_IMPORT_ARTIFACT_SCHEMA_VERSION,
		target: intakeArtifact.target,
		competitors: intakeArtifact.competitors,
		sources,
		outcomes,
		summary: summarizeOutcomes(outcomes),
	};
}

export function resolveSourceImportArtifactPath(outputDir: string): string {
	return resolve(outputDir, SOURCE_IMPORT_ARTIFACT_RELATIVE_PATH);
}

export function serializeSourceImportArtifact(artifact: SourceImportArtifact): string {
	return `${JSON.stringify(artifact, null, 2)}\n`;
}

export function writeSourceImportArtifact(outputDir: string, artifact: SourceImportArtifact): string {
	const artifactPath = resolveSourceImportArtifactPath(outputDir);
	mkdirSync(dirname(artifactPath), { recursive: true });
	writeFileSync(artifactPath, serializeSourceImportArtifact(artifact), "utf8");
	return artifactPath;
}

export function readSourceImportArtifact(path: string): SourceImportArtifact {
	const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
	return parseSourceImportArtifact(parsed, path);
}

export function parseSourceImportArtifact(
	value: unknown,
	sourceLabel = "source import artifact",
): SourceImportArtifact {
	if (!isRecord(value)) {
		throw new SourceImportValidationError(`${sourceLabel} must be an object`);
	}

	if (value.kind !== SOURCE_IMPORT_ARTIFACT_KIND) {
		throw new SourceImportValidationError(`${sourceLabel} has unsupported kind`);
	}

	if (value.schemaVersion !== SOURCE_IMPORT_ARTIFACT_SCHEMA_VERSION) {
		throw new SourceImportValidationError(`${sourceLabel} has unsupported schemaVersion`);
	}

	const intakeArtifact = parseTargetCompetitorArtifact(
		{
			kind: "rankclaw/intake/target-competitors",
			schemaVersion: 1,
			target: value.target,
			competitors: value.competitors,
		},
		sourceLabel,
	);
	const sources = parseSourceRecords(value.sources, `${sourceLabel}.sources`);
	const outcomes = parseSourceImportOutcomes(value.outcomes, `${sourceLabel}.outcomes`);
	const summary = parseSummary(value.summary, `${sourceLabel}.summary`);
	const computedSummary = summarizeOutcomes(outcomes);

	if (
		summary.accepted !== computedSummary.accepted ||
		summary.duplicates !== computedSummary.duplicates ||
		summary.invalid !== computedSummary.invalid
	) {
		throw new SourceImportValidationError(`${sourceLabel}.summary must match the outcome statuses`);
	}

	return {
		kind: SOURCE_IMPORT_ARTIFACT_KIND,
		schemaVersion: SOURCE_IMPORT_ARTIFACT_SCHEMA_VERSION,
		target: intakeArtifact.target,
		competitors: intakeArtifact.competitors,
		sources,
		outcomes,
		summary,
	};
}

function parseSourceRecords(value: unknown, sourceLabel: string): readonly SourceRecord[] {
	if (!Array.isArray(value)) {
		throw new SourceImportValidationError(`${sourceLabel} must be an array`);
	}

	return value.map((entry, index) => {
		if (!isRecord(entry)) {
			throw new SourceImportValidationError(`${sourceLabel}[${index}] must be an object`);
		}

		return {
			id: expectString(entry.id, `${sourceLabel}[${index}].id`),
			owner: parseOwner(entry.owner, `${sourceLabel}[${index}].owner`),
			input: expectString(entry.input, `${sourceLabel}[${index}].input`),
			url: parseSourceUrl(entry.url, `${sourceLabel}[${index}].url`),
		} satisfies SourceRecord;
	});
}

function parseSourceImportOutcomes(value: unknown, sourceLabel: string): readonly SourceImportOutcome[] {
	if (!Array.isArray(value)) {
		throw new SourceImportValidationError(`${sourceLabel} must be an array`);
	}

	return value.map((entry, index) => {
		if (!isRecord(entry)) {
			throw new SourceImportValidationError(`${sourceLabel}[${index}] must be an object`);
		}

		const status = expectString(entry.status, `${sourceLabel}[${index}].status`);
		if (status !== "accepted" && status !== "duplicate" && status !== "invalid") {
			throw new SourceImportValidationError(
				`${sourceLabel}[${index}].status must be "accepted", "duplicate", or "invalid"`,
			);
		}

		const parsedRecordId = expectOptionalString(entry.recordId, `${sourceLabel}[${index}].recordId`);
		const parsedReason = expectOptionalString(entry.reason, `${sourceLabel}[${index}].reason`);

		if (status === "accepted" && parsedRecordId === undefined) {
			throw new SourceImportValidationError(`${sourceLabel}[${index}].recordId is required for accepted outcomes`);
		}

		if (status === "duplicate" && parsedRecordId === undefined) {
			throw new SourceImportValidationError(`${sourceLabel}[${index}].recordId is required for duplicate outcomes`);
		}

		if (status === "invalid" && parsedReason === undefined) {
			throw new SourceImportValidationError(`${sourceLabel}[${index}].reason is required for invalid outcomes`);
		}

		const parsedOutcome: SourceImportOutcome = {
			owner: parseOwner(entry.owner, `${sourceLabel}[${index}].owner`),
			input: expectString(entry.input, `${sourceLabel}[${index}].input`),
			status,
		};

		if (parsedRecordId !== undefined) {
			parsedOutcome.recordId = parsedRecordId;
		}

		if (parsedReason !== undefined) {
			parsedOutcome.reason = parsedReason;
		}

		return parsedOutcome;
	});
}

function parseSummary(value: unknown, sourceLabel: string): SourceImportSummary {
	if (!isRecord(value)) {
		throw new SourceImportValidationError(`${sourceLabel} must be an object`);
	}

	return {
		accepted: expectCount(value.accepted, `${sourceLabel}.accepted`),
		duplicates: expectCount(value.duplicates, `${sourceLabel}.duplicates`),
		invalid: expectCount(value.invalid, `${sourceLabel}.invalid`),
	};
}

function parseOwner(value: unknown, sourceLabel: string): SourceOwnerReference {
	if (!isRecord(value)) {
		throw new SourceImportValidationError(`${sourceLabel} must be an object`);
	}

	const type = expectString(value.type, `${sourceLabel}.type`);
	if (type !== "target" && type !== "competitor") {
		throw new SourceImportValidationError(`${sourceLabel}.type must be "target" or "competitor"`);
	}

	return {
		type,
		id: expectString(value.id, `${sourceLabel}.id`),
		name: expectString(value.name, `${sourceLabel}.name`),
	};
}

function parseSourceUrl(value: unknown, sourceLabel: string): SourceRecordUrl {
	if (!isRecord(value)) {
		throw new SourceImportValidationError(`${sourceLabel} must be an object`);
	}

	return {
		href: expectString(value.href, `${sourceLabel}.href`),
		origin: expectString(value.origin, `${sourceLabel}.origin`),
		host: expectString(value.host, `${sourceLabel}.host`),
		pathname: expectString(value.pathname, `${sourceLabel}.pathname`),
		search: expectString(value.search, `${sourceLabel}.search`),
	};
}

function normalizeSourceImportEntries(
	input: SourceImportInput,
	competitors: readonly IntakeCompetitor[],
): readonly SourceImportEntry[] {
	const entries: SourceImportEntry[] = [];

	for (const [index, targetSource] of input.targetSources.entries()) {
		entries.push({
			owner: {
				type: "target",
				id: input.intakeArtifact.target.id,
				name: input.intakeArtifact.target.name,
			},
			input: targetSource,
			fieldLabel: `target source URL ${index + 1}`,
		});
	}

	const competitorsById = new Map(competitors.map((competitor) => [competitor.id, competitor]));

	for (const [index, competitorSource] of input.competitorSources.entries()) {
		const competitorId = normalizeRequiredText(competitorSource.competitorId, `competitor source ${index + 1} id`);
		const competitor = competitorsById.get(competitorId);
		if (competitor === undefined) {
			throw new SourceImportValidationError(
				`Unknown competitor id "${competitorId}". Expected one of: ${competitors.map((entry) => entry.id).join(", ")}`,
			);
		}

		entries.push({
			owner: {
				type: "competitor",
				id: competitor.id,
				name: competitor.name,
			},
			input: competitorSource.url,
			fieldLabel: `competitor source URL ${index + 1} for ${competitor.id}`,
		});
	}

	return entries;
}

function normalizeSourceUrl(value: string, fieldLabel: string): { input: string; url: SourceRecordUrl } {
	const rawInput = normalizeRequiredText(value, fieldLabel);
	const schemeLikeMatch = rawInput.match(SCHEME_LIKE_INPUT_PATTERN);
	if (schemeLikeMatch !== null && !looksLikeHostnameWithPort(schemeLikeMatch[1], schemeLikeMatch[2])) {
		throw new SourceImportValidationError(`Expected ${fieldLabel} to use http or https.`);
	}
	const normalizedInput = SCHEME_PREFIX_PATTERN.test(rawInput) ? rawInput : `https://${rawInput}`;
	let url: URL;

	try {
		url = new URL(normalizedInput);
	} catch {
		throw new SourceImportValidationError(`Expected ${fieldLabel} to be a valid URL or hostname.`);
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new SourceImportValidationError(`Expected ${fieldLabel} to use http or https.`);
	}

	if (url.hostname.length === 0) {
		throw new SourceImportValidationError(`Expected ${fieldLabel} to include a hostname.`);
	}

	url.hash = "";
	url.username = "";
	url.password = "";
	url.hostname = normalizeHostname(url.hostname);

	const pathname = normalizePathname(url.pathname);
	const search = normalizeSearch(url.searchParams);
	const origin = url.origin;
	const href = `${origin}${pathname}${search}`;

	return {
		input: rawInput,
		url: {
			href,
			origin,
			host: normalizeHostname(url.hostname),
			pathname,
			search,
		},
	};
}

function looksLikeHostnameWithPort(hostCandidate: string, remainder: string): boolean {
	if (!/^\d+(?:[/?#].*)?$/u.test(remainder)) {
		return false;
	}

	const normalizedHost = normalizeHostname(hostCandidate);
	return normalizedHost === "localhost" || isIpv4Literal(normalizedHost) || isDottedHostname(normalizedHost);
}

function isIpv4Literal(value: string): boolean {
	if (!/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(value)) {
		return false;
	}

	return value.split(".").every((segment) => Number(segment) >= 0 && Number(segment) <= 255);
}

function isDottedHostname(value: string): boolean {
	if (!value.includes(".")) {
		return false;
	}

	return value.split(".").every((label) => /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/iu.test(label));
}

function normalizeSearch(searchParams: URLSearchParams): string {
	const normalizedEntries = Array.from(searchParams.entries()).filter(([key]) => !isTrackingQueryParam(key));
	normalizedEntries.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
		const byKey = leftKey.localeCompare(rightKey);
		if (byKey !== 0) {
			return byKey;
		}

		return leftValue.localeCompare(rightValue);
	});

	if (normalizedEntries.length === 0) {
		return "";
	}

	const normalizedParams = new URLSearchParams();
	for (const [key, value] of normalizedEntries) {
		normalizedParams.append(key, value);
	}

	return `?${normalizedParams.toString()}`;
}

function isTrackingQueryParam(value: string): boolean {
	return TRACKING_QUERY_PARAM_NAMES.has(value.toLowerCase());
}

function createUniqueSourceRecordId(
	owner: SourceOwnerReference,
	url: SourceRecordUrl,
	existingIds: Set<string>,
): string {
	const baseId = toSlug(`${owner.type}-${owner.id}-${url.host}-${url.pathname}-${url.search}`, `${owner.type}-source`);
	let candidateId = baseId;
	let suffix = 2;

	while (existingIds.has(candidateId)) {
		candidateId = `${baseId}-${suffix}`;
		suffix += 1;
	}

	existingIds.add(candidateId);
	return candidateId;
}

function summarizeOutcomes(outcomes: readonly SourceImportOutcome[]): SourceImportSummary {
	let accepted = 0;
	let duplicates = 0;
	let invalid = 0;

	for (const outcome of outcomes) {
		if (outcome.status === "accepted") {
			accepted += 1;
			continue;
		}

		if (outcome.status === "duplicate") {
			duplicates += 1;
			continue;
		}

		invalid += 1;
	}

	return {
		accepted,
		duplicates,
		invalid,
	};
}

function normalizeRequiredText(value: string, fieldLabel: string): string {
	const normalizedValue = value.trim().replace(WHITESPACE_PATTERN, " ");
	if (normalizedValue.length === 0) {
		throw new SourceImportValidationError(`Expected ${fieldLabel} to be a non-empty string.`);
	}

	return normalizedValue;
}

function normalizePathname(pathname: string): string {
	const collapsedPathname = (pathname.length === 0 ? "/" : pathname).replace(DUPLICATE_SLASH_PATTERN, "/");

	if (collapsedPathname !== "/" && collapsedPathname.endsWith("/")) {
		return collapsedPathname.slice(0, -1);
	}

	return collapsedPathname;
}

function normalizeHostname(value: string): string {
	return value.trim().replace(/\.+$/u, "").toLowerCase();
}

function toSlug(value: string, fallbackPrefix: string): string {
	const normalizedSlug = value
		.toLowerCase()
		.replace(SLUG_PATTERN, "-")
		.replace(DUPLICATE_DASH_PATTERN, "-")
		.replace(/^-|-$/g, "");

	if (normalizedSlug.length > 0) {
		return normalizedSlug;
	}

	return `${fallbackPrefix}-record`;
}

function expectString(value: unknown, field: string): string {
	if (typeof value !== "string") {
		throw new SourceImportValidationError(`${field} must be a string`);
	}

	return value;
}

function expectOptionalString(value: unknown, field: string): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== "string") {
		throw new SourceImportValidationError(`${field} must be a string when provided`);
	}

	return value;
}

function expectCount(value: unknown, field: string): number {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
		throw new SourceImportValidationError(`${field} must be a non-negative integer`);
	}

	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
