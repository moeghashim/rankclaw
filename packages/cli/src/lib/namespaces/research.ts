import { isAbsolute, resolve } from "node:path";

import {
	createGeminiRecommendationSnapshotArtifact,
	createGrokRecommendationSnapshotArtifact,
	IntakeInputValidationError,
	ResearchSnapshotValidationError,
	readGeminiRawResponseFixture,
	readGrokRawResponseFixture,
	readTargetCompetitorArtifact,
	resolveTargetCompetitorArtifactPath,
	writeGeminiRecommendationSnapshotArtifact,
	writeGrokRecommendationSnapshotArtifact,
} from "@rankclaw/core";

import type { CliNamespace } from "../types.js";

const FIXTURE_FLAG = "--fixture";
const INTAKE_ARTIFACT_FLAG = "--intake-artifact";
const CAPTURED_AT_FLAG = "--captured-at";

const SUPPORTED_FLAGS = new Set([FIXTURE_FLAG, INTAKE_ARTIFACT_FLAG, CAPTURED_AT_FLAG]);

interface ParsedGeminiArgs {
	fixturePath: string;
	intakeArtifactPath?: string;
	capturedAt?: string;
}

interface ResearchSnapshotArtifact {
	prompts: readonly { id: string; role: "system" | "user"; content: string }[];
	snapshot: {
		questions: readonly { id: string; question: string; intent: string }[];
		recommendations: readonly { id: string; recommendation: string; rationale: string }[];
	};
}

class ResearchCliArgumentError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ResearchCliArgumentError";
	}
}

export const researchNamespace: CliNamespace = {
	name: "research",
	summary: "Capture answer-intent and recommendation snapshots from research engines.",
	commands: [
		{
			name: "gemini",
			summary: "Capture Gemini answer-intent output into a normalized research snapshot artifact.",
			help: {
				usage: "rankclaw research gemini --fixture <path> [--intake-artifact <path>] [--captured-at <iso-timestamp>]",
				options: [
					{
						flag: "--fixture <path>",
						description: "Required fixture JSON containing Gemini model + rawResponse text.",
					},
					{
						flag: "--intake-artifact <path>",
						description:
							"Optional path to intake artifact (defaults to configured outputDir intake artifact path).",
					},
					{
						flag: "--captured-at <iso-timestamp>",
						description: "Optional capture timestamp override for deterministic fixture/testing flows.",
					},
				],
				examples: [
					"rankclaw research gemini --fixture ./fixtures/gemini-response.json",
					"rankclaw research gemini --fixture ./fixtures/gemini-response.json --captured-at 2026-03-25T00:00:00.000Z",
				],
			},
			run(context, args, io) {
				return runResearchCommand(context.cwd, context.config.outputDir, args, io, {
					engineName: "Gemini",
					helpCommand: "rankclaw research gemini --help",
					readFixture: readGeminiRawResponseFixture,
					createArtifact: createGeminiRecommendationSnapshotArtifact,
					writeArtifact: writeGeminiRecommendationSnapshotArtifact,
				});
			},
		},
		{
			name: "grok",
			summary: "Capture Grok answer-intent output into a normalized research snapshot artifact.",
			help: {
				usage: "rankclaw research grok --fixture <path> [--intake-artifact <path>] [--captured-at <iso-timestamp>]",
				options: [
					{
						flag: "--fixture <path>",
						description: "Required fixture JSON containing Grok model + rawResponse text.",
					},
					{
						flag: "--intake-artifact <path>",
						description:
							"Optional path to intake artifact (defaults to configured outputDir intake artifact path).",
					},
					{
						flag: "--captured-at <iso-timestamp>",
						description: "Optional capture timestamp override for deterministic fixture/testing flows.",
					},
				],
				examples: [
					"rankclaw research grok --fixture ./fixtures/grok-response.json",
					"rankclaw research grok --fixture ./fixtures/grok-response.json --captured-at 2026-03-25T00:00:00.000Z",
				],
			},
			run(context, args, io) {
				return runResearchCommand(context.cwd, context.config.outputDir, args, io, {
					engineName: "Grok",
					helpCommand: "rankclaw research grok --help",
					readFixture: readGrokRawResponseFixture,
					createArtifact: createGrokRecommendationSnapshotArtifact,
					writeArtifact: writeGrokRecommendationSnapshotArtifact,
				});
			},
		},
	],
};

function parseGeminiArgs(args: readonly string[]): ParsedGeminiArgs {
	let fixturePath: string | undefined;
	let intakeArtifactPath: string | undefined;
	let capturedAt: string | undefined;

	for (let index = 0; index < args.length; index += 1) {
		const flag = args[index];
		if (!SUPPORTED_FLAGS.has(flag)) {
			throw new ResearchCliArgumentError(`Unknown argument "${flag}".`);
		}

		const value = args[index + 1];
		if (value === undefined || value.startsWith("--")) {
			throw new ResearchCliArgumentError(`Expected a value after ${flag}.`);
		}

		switch (flag) {
			case FIXTURE_FLAG: {
				if (fixturePath !== undefined) {
					throw new ResearchCliArgumentError(`${FIXTURE_FLAG} can only be provided once.`);
				}
				fixturePath = value;
				break;
			}
			case INTAKE_ARTIFACT_FLAG: {
				if (intakeArtifactPath !== undefined) {
					throw new ResearchCliArgumentError(`${INTAKE_ARTIFACT_FLAG} can only be provided once.`);
				}
				intakeArtifactPath = value;
				break;
			}
			case CAPTURED_AT_FLAG: {
				if (capturedAt !== undefined) {
					throw new ResearchCliArgumentError(`${CAPTURED_AT_FLAG} can only be provided once.`);
				}
				capturedAt = value;
				break;
			}
			default: {
				throw new ResearchCliArgumentError(`Unknown argument "${flag}".`);
			}
		}

		index += 1;
	}

	if (fixturePath === undefined) {
		throw new ResearchCliArgumentError(`Missing required ${FIXTURE_FLAG}.`);
	}

	return {
		fixturePath,
		intakeArtifactPath,
		capturedAt,
	};
}

function runResearchCommand(
	cwd: string,
	outputDir: string,
	args: readonly string[],
	io: { info(message: string): void; error(message: string): void },
	options: {
		engineName: "Gemini" | "Grok";
		helpCommand: string;
		readFixture(path: string): { model: string; rawResponse: string };
		createArtifact(input: {
			intakeArtifact: ReturnType<typeof readTargetCompetitorArtifact>;
			response: { model: string; rawResponse: string };
			capturedAt?: string;
		}): ResearchSnapshotArtifact;
		writeArtifact(outputDir: string, artifact: ResearchSnapshotArtifact): string;
	},
): number {
	try {
		const parsedArgs = parseGeminiArgs(args);
		const fixturePath = resolveFromCwd(cwd, parsedArgs.fixturePath);
		const intakeArtifactPath =
			parsedArgs.intakeArtifactPath === undefined
				? resolveTargetCompetitorArtifactPath(outputDir)
				: resolveFromCwd(cwd, parsedArgs.intakeArtifactPath);

		const intakeArtifact = readTargetCompetitorArtifact(intakeArtifactPath);
		const fixtureResponse = options.readFixture(fixturePath);
		const artifact = options.createArtifact({
			intakeArtifact,
			response: fixtureResponse,
			capturedAt: parsedArgs.capturedAt,
		});
		const artifactPath = options.writeArtifact(outputDir, artifact);

		io.info(`Wrote ${options.engineName} research snapshot: ${artifactPath}`);
		io.info(`Captured prompts: ${artifact.prompts.length}`);
		io.info(`Normalized questions: ${artifact.snapshot.questions.length}`);
		io.info(`Normalized recommendations: ${artifact.snapshot.recommendations.length}`);

		return 0;
	} catch (error: unknown) {
		if (
			error instanceof ResearchCliArgumentError ||
			error instanceof IntakeInputValidationError ||
			error instanceof ResearchSnapshotValidationError
		) {
			io.error(error.message);
			io.info(`Run "${options.helpCommand}" for usage.`);
			return 1;
		}

		if (error instanceof Error) {
			io.error(error.message);
			return 1;
		}

		throw error;
	}
}

function resolveFromCwd(cwd: string, pathInput: string): string {
	if (isAbsolute(pathInput)) {
		return pathInput;
	}

	return resolve(cwd, pathInput);
}
