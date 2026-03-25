import { auditNamespace } from "./namespaces/audit.js";
import { briefNamespace } from "./namespaces/brief.js";
import { crawlNamespace } from "./namespaces/crawl.js";
import { evalNamespace } from "./namespaces/eval.js";
import { intakeNamespace } from "./namespaces/intake.js";
import { researchNamespace } from "./namespaces/research.js";
import type { CliCommand, CliNamespace } from "./types.js";

const NAMESPACES: readonly CliNamespace[] = [
	intakeNamespace,
	researchNamespace,
	crawlNamespace,
	briefNamespace,
	auditNamespace,
	evalNamespace,
];

export function listNamespaces(): readonly CliNamespace[] {
	return NAMESPACES;
}

export function findNamespace(name: string): CliNamespace | undefined {
	return NAMESPACES.find((namespace) => namespace.name === name);
}

export function findNamespaceCommand(namespace: CliNamespace, commandName: string): CliCommand | undefined {
	return namespace.commands.find((command) => command.name === commandName);
}
