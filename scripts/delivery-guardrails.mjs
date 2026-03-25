#!/usr/bin/env node

import { validateDeliveryGuardrails } from "./lib/delivery-guardrails.mjs";

const problems = validateDeliveryGuardrails();

if (problems.length > 0) {
	console.error("delivery-check: failed");
	for (const problem of problems) {
		console.error(`- ${problem}`);
	}
	process.exit(1);
}

console.log("delivery-check: passed.");
