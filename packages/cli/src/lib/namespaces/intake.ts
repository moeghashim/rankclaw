import { isAbsolute, resolve } from "node:path";

import {
	type IntakeCompetitorInput,
	IntakeInputValidationError,
	normalizeSourceImportInput,
	normalizeTargetCompetitorInput,
	readTargetCompetitorArtifact,
	resolveTargetCompetitorArtifactPath,
	type SourceImportCompetitorSourceInput,
	SourceImportValidationError,
	writeSourceImportArtifact,
	writeTargetCompetitorArtifact,
} from "@rankclaw/core";

import type { CliNamespace } from "../types.js";

const TARGET_TOPIC_FLAG = "--target-topic";
const TARGET_SITE_FLAG = "--target-site";
const TARGET_NAME_FLAG = "--target-name";
const COMPETITOR_FLAG = "--competitor";

const TARGET_SOURCE_FLAG = "--target-source";
const COMPETITOR_SOURCE_FLAG = "--competitor-source";
const INTAKE_ARTIFACT_FLAG = "--intake-artifact";

const COLLECT_SUPPORTED_FLAGS = new Set([TARGET_TOPIC_FLAG, TARGET_SITE_FLAG, TARGET_NAME_FLAG, COMPETITOR_FLAG]);
const SOURCE_IMPORT_SUPPORTED_FLAGS = new Set([TARGET_SOURCE_FLAG, COMPETITOR_SOURCE_FLAG, INTAKE_ARTIFACT_FLAG]);

interface ParsedCollectArgs {
	targetTopic: string;
	targetSite: string;
	targetName?: string;
	competitors: readonly IntakeCompetitorInput[];
}

interface ParsedSourceArgs {
	targetSources: readonly string[];
	competitorSources: readonly SourceImportCompetitorSourceInput[];
	intakeArtifactPath?: string;
}

class IntakeCliArgumentError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "IntakeCliArgumentError";
	}
}

export const intakeNamespace: CliNamespace = {
	name: "intake",
	summary: "Capture target and competitor inputs for downstream workflows.",
	commands: [
		{
			name: "collect",
			summary: "Validate, normalize, and persist target + competitor intake input.",
			help: {
				usage: "rankclaw intake collect --target-topic <topic> --target-site <site> --competitor <name|site> [--competitor <name|site>] [--target-name <name>]",
				options: [
					{
						flag: "--target-topic <topic>",
						description: "Required topic/category under analysis.",
					},
					{
						flag: "--target-site <site>",
						description: "Required target site URL or hostname.",
					},
					{
						flag: "--target-name <name>",
						description: "Optional display name for the target (defaults to site host).",
					},
					{
						flag: "--competitor <name|site>",
						description: "Required one or more competitor definitions.",
					},
				],
				examples: [
					'rankclaw intake collect --target-topic "running shoes" --target-site example.com --competitor "Fleet Foot|fleetfoot.io" --competitor "Stride Labs|https://stridelabs.co/reviews"',
				],
			},
			run(context, args, io) {
				try {
					const parsedArgs = parseCollectArgs(args);
					const artifact = normalizeTargetCompetitorInput({
						target: {
							topic: parsedArgs.targetTopic,
							site: parsedArgs.targetSite,
							name: parsedArgs.targetName,
						},
						competitors: parsedArgs.competitors,
					});
					const artifactPath = writeTargetCompetitorArtifact(context.config.outputDir, artifact);

					io.info(`Wrote intake artifact: ${artifactPath}`);
					io.info(`Target topic: ${artifact.target.topic}`);
					io.info(`Target site: ${artifact.target.site.origin}`);
					io.info(`Competitors: ${artifact.competitors.length}`);

					for (const competitor of artifact.competitors) {
						io.info(`- ${competitor.name} (${competitor.site.origin})`);
					}

					return 0;
				} catch (error: unknown) {
					if (error instanceof IntakeCliArgumentError || error instanceof IntakeInputValidationError) {
						io.error(error.message);
						io.info('Run "rankclaw intake collect --help" for usage.');
						return 1;
					}

					throw error;
				}
			},
		},
		{
			name: "sources",
			summary: "Import external review/source URLs into normalized target and competitor source records.",
			help: {
				usage: "rankclaw intake sources [--target-source <url>] [--competitor-source <competitor-id|url>] [--intake-artifact <path>]",
				options: [
					{
						flag: "--target-source <url>",
						description: "Optional repeatable source URL associated with the target.",
					},
					{
						flag: "--competitor-source <competitor-id|url>",
						description: "Optional repeatable source URL associated with a competitor id from intake.",
					},
					{
						flag: "--intake-artifact <path>",
						description:
							"Optional path to target/competitor intake artifact (defaults to configured outputDir intake artifact path).",
					},
				],
				examples: [
					"rankclaw intake sources --target-source https://example.com/reviews/running-shoes --competitor-source fleet-foot|https://fleetfoot.io/reviews/best-running-shoes",
				],
			},
			run(context, args, io) {
				try {
					const parsedArgs = parseSourceArgs(args);
					const intakeArtifactPath =
						parsedArgs.intakeArtifactPath === undefined
							? resolveTargetCompetitorArtifactPath(context.config.outputDir)
							: resolveFromCwd(context.cwd, parsedArgs.intakeArtifactPath);
					const intakeArtifact = readTargetCompetitorArtifact(intakeArtifactPath);
					const artifact = normalizeSourceImportInput({
						intakeArtifact,
						targetSources: parsedArgs.targetSources,
						competitorSources: parsedArgs.competitorSources,
					});
					const artifactPath = writeSourceImportArtifact(context.config.outputDir, artifact);
					const recordsById = new Map(artifact.sources.map((record) => [record.id, record]));

					io.info(`Wrote source import artifact: ${artifactPath}`);
					io.info(`Accepted URLs: ${artifact.summary.accepted}`);
					io.info(`Duplicate URLs: ${artifact.summary.duplicates}`);
					io.info(`Invalid URLs: ${artifact.summary.invalid}`);

					for (const outcome of artifact.outcomes) {
						if (outcome.status === "accepted") {
							const record = outcome.recordId === undefined ? undefined : recordsById.get(outcome.recordId);
							const normalizedUrl = record === undefined ? outcome.input : record.url.href;
							io.info(`ACCEPTED ${outcome.owner.type}:${outcome.owner.id} ${outcome.input} -> ${normalizedUrl}`);
							continue;
						}

						if (outcome.status === "duplicate") {
							io.info(
								`DUPLICATE ${outcome.owner.type}:${outcome.owner.id} ${outcome.input} (${outcome.reason ?? "duplicate URL"})`,
							);
							continue;
						}

						io.info(
							`INVALID ${outcome.owner.type}:${outcome.owner.id} ${outcome.input} (${outcome.reason ?? "invalid URL"})`,
						);
					}

					return artifact.summary.accepted > 0 ? 0 : 1;
				} catch (error: unknown) {
					if (
						error instanceof IntakeCliArgumentError ||
						error instanceof IntakeInputValidationError ||
						error instanceof SourceImportValidationError
					) {
						io.error(error.message);
						io.info('Run "rankclaw intake sources --help" for usage.');
						return 1;
					}

					if (error instanceof Error) {
						io.error(error.message);
						return 1;
					}

					throw error;
				}
			},
		},
	],
};

function parseCollectArgs(args: readonly string[]): ParsedCollectArgs {
	let targetTopic: string | undefined;
	let targetSite: string | undefined;
	let targetName: string | undefined;
	const competitors: IntakeCompetitorInput[] = [];

	for (let index = 0; index < args.length; index += 1) {
		const flag = args[index];
		if (!COLLECT_SUPPORTED_FLAGS.has(flag)) {
			throw new IntakeCliArgumentError(`Unknown argument "${flag}".`);
		}

		const value = args[index + 1];
		if (value === undefined || value.startsWith("--")) {
			throw new IntakeCliArgumentError(`Expected a value after ${flag}.`);
		}

		switch (flag) {
			case TARGET_TOPIC_FLAG: {
				if (targetTopic !== undefined) {
					throw new IntakeCliArgumentError(`${TARGET_TOPIC_FLAG} can only be provided once.`);
				}
				targetTopic = value;
				break;
			}
			case TARGET_SITE_FLAG: {
				if (targetSite !== undefined) {
					throw new IntakeCliArgumentError(`${TARGET_SITE_FLAG} can only be provided once.`);
				}
				targetSite = value;
				break;
			}
			case TARGET_NAME_FLAG: {
				if (targetName !== undefined) {
					throw new IntakeCliArgumentError(`${TARGET_NAME_FLAG} can only be provided once.`);
				}
				targetName = value;
				break;
			}
			case COMPETITOR_FLAG: {
				competitors.push(parseCompetitorValue(value));
				break;
			}
			default: {
				throw new IntakeCliArgumentError(`Unknown argument "${flag}".`);
			}
		}

		index += 1;
	}

	if (targetTopic === undefined) {
		throw new IntakeCliArgumentError(`Missing required ${TARGET_TOPIC_FLAG}.`);
	}

	if (targetSite === undefined) {
		throw new IntakeCliArgumentError(`Missing required ${TARGET_SITE_FLAG}.`);
	}

	if (competitors.length === 0) {
		throw new IntakeCliArgumentError(`At least one ${COMPETITOR_FLAG} is required.`);
	}

	return {
		targetTopic,
		targetSite,
		targetName,
		competitors,
	};
}

function parseSourceArgs(args: readonly string[]): ParsedSourceArgs {
	const targetSources: string[] = [];
	const competitorSources: SourceImportCompetitorSourceInput[] = [];
	let intakeArtifactPath: string | undefined;

	for (let index = 0; index < args.length; index += 1) {
		const flag = args[index];
		if (!SOURCE_IMPORT_SUPPORTED_FLAGS.has(flag)) {
			throw new IntakeCliArgumentError(`Unknown argument "${flag}".`);
		}

		const value = args[index + 1];
		if (value === undefined || value.startsWith("--")) {
			throw new IntakeCliArgumentError(`Expected a value after ${flag}.`);
		}

		switch (flag) {
			case TARGET_SOURCE_FLAG: {
				targetSources.push(value);
				break;
			}
			case COMPETITOR_SOURCE_FLAG: {
				competitorSources.push(parseCompetitorSourceValue(value));
				break;
			}
			case INTAKE_ARTIFACT_FLAG: {
				if (intakeArtifactPath !== undefined) {
					throw new IntakeCliArgumentError(`${INTAKE_ARTIFACT_FLAG} can only be provided once.`);
				}
				intakeArtifactPath = value;
				break;
			}
			default: {
				throw new IntakeCliArgumentError(`Unknown argument "${flag}".`);
			}
		}

		index += 1;
	}

	if (targetSources.length === 0 && competitorSources.length === 0) {
		throw new IntakeCliArgumentError(
			`At least one ${TARGET_SOURCE_FLAG} or ${COMPETITOR_SOURCE_FLAG} value is required.`,
		);
	}

	return {
		targetSources,
		competitorSources,
		intakeArtifactPath,
	};
}

function parseCompetitorValue(value: string): IntakeCompetitorInput {
	const firstDelimiter = value.indexOf("|");
	const lastDelimiter = value.lastIndexOf("|");

	if (firstDelimiter <= 0 || firstDelimiter !== lastDelimiter || firstDelimiter === value.length - 1) {
		throw new IntakeCliArgumentError(`Expected ${COMPETITOR_FLAG} value in "name|site" format, received "${value}".`);
	}

	const name = value.slice(0, firstDelimiter);
	const site = value.slice(firstDelimiter + 1);

	return {
		name,
		site,
	};
}

function parseCompetitorSourceValue(value: string): SourceImportCompetitorSourceInput {
	const firstDelimiter = value.indexOf("|");
	const lastDelimiter = value.lastIndexOf("|");

	if (firstDelimiter <= 0 || firstDelimiter !== lastDelimiter || firstDelimiter === value.length - 1) {
		throw new IntakeCliArgumentError(
			`Expected ${COMPETITOR_SOURCE_FLAG} value in "competitor-id|url" format, received "${value}".`,
		);
	}

	return {
		competitorId: value.slice(0, firstDelimiter),
		url: value.slice(firstDelimiter + 1),
	};
}

function resolveFromCwd(cwd: string, pathInput: string): string {
	if (isAbsolute(pathInput)) {
		return pathInput;
	}

	return resolve(cwd, pathInput);
}
