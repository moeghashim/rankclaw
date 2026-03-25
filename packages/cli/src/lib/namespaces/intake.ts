import type { CliNamespace } from "../types.js";

export const intakeNamespace: CliNamespace = {
	name: "intake",
	summary: "Capture target and competitor inputs for downstream workflows.",
	commands: [
		{
			name: "collect",
			summary: "Placeholder command for upcoming intake capture automation.",
			run(context, _args, io) {
				io.info("intake collect is scaffolded and ready for implementation.");
				io.info(`Config profile: ${context.config.profile}`);
				io.info(`Output directory: ${context.config.outputDir}`);
				return 0;
			},
		},
	],
};
