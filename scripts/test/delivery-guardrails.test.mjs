import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { REQUIRED_DELIVERY_FILES, validateDeliveryGuardrails } from "../lib/delivery-guardrails.mjs";

test("delivery guardrails pass when required templates and docs are present", () => {
	const rootDir = createGuardrailFixtureRoot();

	try {
		const problems = validateDeliveryGuardrails(rootDir);
		assert.deepEqual(problems, []);
	} finally {
		rmSync(rootDir, { recursive: true, force: true });
	}
});

test("delivery guardrails fail when a managed template is removed", () => {
	const rootDir = createGuardrailFixtureRoot({
		".github/ISSUE_TEMPLATE/feature-story.md": null,
	});

	try {
		const problems = validateDeliveryGuardrails(rootDir);
		assert.ok(
			problems.some((problem) => problem.includes("missing required file: .github/ISSUE_TEMPLATE/feature-story.md")),
		);
	} finally {
		rmSync(rootDir, { recursive: true, force: true });
	}
});

test("delivery guardrails fail when validation or eval gates are weakened", () => {
	const rootDir = createGuardrailFixtureRoot({
		".github/pull_request_template.md": ["## Summary", "", "## Validation", "", "## Linear", "", "- Issue:"].join(
			"\n",
		),
	});

	try {
		const problems = validateDeliveryGuardrails(rootDir);
		assert.ok(
			problems.some((problem) =>
				problem.includes(".github/pull_request_template.md missing required snippet: ## Eval"),
			),
		);
		assert.ok(
			problems.some((problem) =>
				problem.includes(".github/pull_request_template.md missing required snippet: - Workpad updated:"),
			),
		);
	} finally {
		rmSync(rootDir, { recursive: true, force: true });
	}
});

function createGuardrailFixtureRoot(overrides = {}) {
	const rootDir = mkdtempSync(join(tmpdir(), "rankclaw-delivery-guardrails-"));
	const fixtureFiles = new Map(
		REQUIRED_DELIVERY_FILES.map((requirement) => [requirement.path, requirement.snippets.join("\n")]),
	);

	for (const [filePath, content] of Object.entries(overrides)) {
		if (content === null) {
			fixtureFiles.delete(filePath);
		} else {
			fixtureFiles.set(filePath, content);
		}
	}

	for (const [filePath, content] of fixtureFiles) {
		const absolutePath = join(rootDir, filePath);
		mkdirSync(dirname(absolutePath), { recursive: true });
		writeFileSync(absolutePath, content, "utf8");
	}

	return rootDir;
}
