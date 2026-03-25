import type { CliCommand, CliNamespace } from "./types.js";

export function renderRootHelp(namespaces: readonly CliNamespace[]): string {
	const namespaceRows = namespaces.map((namespace) => [namespace.name, namespace.summary] as const);

	return [
		"Rankclaw CLI",
		"",
		"Usage:",
		"  rankclaw <namespace> <command> [options]",
		"",
		"Namespaces:",
		formatRows(namespaceRows),
		"",
		'Run "rankclaw <namespace> --help" for namespace-specific commands.',
	].join("\n");
}

export function renderNamespaceHelp(namespace: CliNamespace): string {
	if (namespace.commands.length === 0) {
		return [
			`Namespace: ${namespace.name}`,
			"",
			"Usage:",
			`  rankclaw ${namespace.name} <command> [options]`,
			"",
			"Commands:",
			"  (none scaffolded yet)",
		].join("\n");
	}

	const commandRows = namespace.commands.map((command) => [command.name, command.summary] as const);

	return [
		`Namespace: ${namespace.name}`,
		"",
		"Usage:",
		`  rankclaw ${namespace.name} <command> [options]`,
		"",
		"Commands:",
		formatRows(commandRows),
	].join("\n");
}

export function renderCommandHelp(namespace: CliNamespace, command: CliCommand): string {
	return [
		`Command: ${namespace.name} ${command.name}`,
		"",
		"Usage:",
		`  rankclaw ${namespace.name} ${command.name} [options]`,
		"",
		command.summary,
	].join("\n");
}

function formatRows(rows: readonly (readonly [string, string])[]): string {
	const leftColumnWidth = rows.reduce((currentWidth, row) => {
		return Math.max(currentWidth, row[0].length);
	}, 0);

	return rows
		.map(([leftColumn, rightColumn]) => {
			const paddedLeftColumn = leftColumn.padEnd(leftColumnWidth + 2, " ");
			return `  ${paddedLeftColumn}${rightColumn}`;
		})
		.join("\n");
}
