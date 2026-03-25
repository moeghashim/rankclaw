import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CONFIG_FILE_NAME = "rankclaw.config.json";

interface RankclawConfigFile {
	profile?: string;
	outputDir?: string;
}

export interface RankclawConfig {
	workspaceRoot: string;
	configFilePath: string | null;
	profile: string;
	outputDir: string;
}

export interface LoadRankclawConfigOptions {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
}

export function loadRankclawConfig(options: LoadRankclawConfigOptions = {}): RankclawConfig {
	const cwd = resolve(options.cwd ?? process.cwd());
	const env = options.env ?? process.env;
	const configFilePath = findConfigFilePath(cwd);
	const configFromFile = configFilePath === null ? {} : readConfigFile(configFilePath);
	const workspaceRoot = configFilePath === null ? cwd : dirname(configFilePath);
	const profile = readOptionalEnvString(env.RANKCLAW_PROFILE) ?? configFromFile.profile ?? "default";
	const outputDirInput = readOptionalEnvString(env.RANKCLAW_OUTPUT_DIR) ?? configFromFile.outputDir ?? ".rankclaw";

	return {
		workspaceRoot,
		configFilePath,
		profile,
		outputDir: resolve(workspaceRoot, outputDirInput),
	};
}

function findConfigFilePath(startDirectory: string): string | null {
	let currentDirectory = startDirectory;
	for (;;) {
		const candidatePath = resolve(currentDirectory, CONFIG_FILE_NAME);
		if (existsSync(candidatePath)) {
			return candidatePath;
		}

		const parentDirectory = dirname(currentDirectory);
		if (parentDirectory === currentDirectory) {
			return null;
		}

		currentDirectory = parentDirectory;
	}
}

function readConfigFile(filePath: string): RankclawConfigFile {
	let parsedData: unknown;
	try {
		parsedData = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
	} catch (error: unknown) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to read ${CONFIG_FILE_NAME} at ${filePath}: ${reason}`);
	}

	if (!isRecord(parsedData)) {
		throw new Error(`${CONFIG_FILE_NAME} at ${filePath} must contain a JSON object`);
	}

	const profile = readOptionalStringField(parsedData.profile, "profile", filePath);
	const outputDir = readOptionalStringField(parsedData.outputDir, "outputDir", filePath);

	return {
		profile,
		outputDir,
	};
}

function readOptionalEnvString(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	const normalizedValue = value.trim();
	return normalizedValue.length === 0 ? undefined : normalizedValue;
}

function readOptionalStringField(value: unknown, field: string, filePath: string): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== "string") {
		throw new Error(`Expected "${field}" in ${CONFIG_FILE_NAME} at ${filePath} to be a string`);
	}

	const normalizedValue = value.trim();
	if (normalizedValue.length === 0) {
		throw new Error(`Expected "${field}" in ${CONFIG_FILE_NAME} at ${filePath} to be non-empty when provided`);
	}

	return normalizedValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
