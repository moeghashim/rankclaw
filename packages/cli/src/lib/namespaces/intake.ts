import {
	type IntakeCompetitorInput,
	IntakeInputValidationError,
	normalizeTargetCompetitorInput,
	writeTargetCompetitorArtifact,
} from "@rankclaw/core";

import type { CliNamespace } from "../types.js";

const TARGET_TOPIC_FLAG = "--target-topic";
const TARGET_SITE_FLAG = "--target-site";
const TARGET_NAME_FLAG = "--target-name";
const COMPETITOR_FLAG = "--competitor";

const SUPPORTED_FLAGS = new Set([TARGET_TOPIC_FLAG, TARGET_SITE_FLAG, TARGET_NAME_FLAG, COMPETITOR_FLAG]);

interface ParsedCollectArgs {
	targetTopic: string;
	targetSite: string;
	targetName?: string;
	competitors: readonly IntakeCompetitorInput[];
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
				usage:
					'rankclaw intake collect --target-topic <topic> --target-site <site> --competitor <name|site> [--competitor <name|site>] [--target-name <name>]',
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
	],
};

function parseCollectArgs(args: readonly string[]): ParsedCollectArgs {
	let targetTopic: string | undefined;
	let targetSite: string | undefined;
	let targetName: string | undefined;
	const competitors: IntakeCompetitorInput[] = [];

	for (let index = 0; index < args.length; index += 1) {
		const flag = args[index];
		if (!SUPPORTED_FLAGS.has(flag)) {
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

function parseCompetitorValue(value: string): IntakeCompetitorInput {
	const firstDelimiter = value.indexOf("|");
	const lastDelimiter = value.lastIndexOf("|");

	if (firstDelimiter <= 0 || firstDelimiter !== lastDelimiter || firstDelimiter === value.length - 1) {
		throw new IntakeCliArgumentError(`Expected ${COMPETITOR_FLAG} value in "name|site" format, received "${value}".`);
	}

	return {
		name: value.slice(0, firstDelimiter),
		site: value.slice(firstDelimiter + 1),
	};
}
