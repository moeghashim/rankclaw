import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const REQUIRED_DELIVERY_FILES = [
	{
		path: "docs/delivery-process.md",
		snippets: [
			"## Stage 3: Symphony execution",
			"3. commit",
			"4. PR creation",
			"5. Codex review",
			"6. validation",
			"7. eval",
		],
	},
	{
		path: "docs/linear-story-template.md",
		snippets: ["## Validation", "## Eval", "## Done gate", "- a PR", "- a Codex review pass"],
	},
	{
		path: "docs/README.md",
		snippets: ["docs/delivery-process.md", "docs/linear-story-template.md"],
	},
	{
		path: ".github/ISSUE_TEMPLATE/feature-story.md",
		snippets: ["## Acceptance Criteria", "## Validation", "## Eval", "## Done gate"],
	},
	{
		path: ".github/pull_request_template.md",
		snippets: ["## Validation", "## Eval", "- Issue:", "- Workpad updated:"],
	},
];

export function validateDeliveryGuardrails(rootDir = process.cwd()) {
	const problems = [];

	for (const requirement of REQUIRED_DELIVERY_FILES) {
		const targetPath = join(rootDir, requirement.path);
		if (!existsSync(targetPath)) {
			problems.push(`missing required file: ${requirement.path}`);
			continue;
		}

		const content = readFileSync(targetPath, "utf8");
		for (const snippet of requirement.snippets) {
			if (!content.includes(snippet)) {
				problems.push(`${requirement.path} missing required snippet: ${snippet}`);
			}
		}
	}

	return problems;
}
