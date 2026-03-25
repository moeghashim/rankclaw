const appCards = [
	{
		title: "Create the PRD",
		description:
			"Capture the SEO product thesis, MVP scope, milestones, and evaluation model before any implementation work begins.",
		accent: "Stage 1",
	},
	{
		title: "Approve the backlog",
		description:
			"Generate small, outcome-focused Linear stories with acceptance criteria, validation steps, and eval criteria from the approved PRD.",
		accent: "Stage 2",
	},
	{
		title: "Execute sequentially",
		description:
			"Use Symphony to work approved stories one by one, with commit, PR, Codex review, validation, and eval gates on every story.",
		accent: "Stage 3",
	},
];

export default function HomePage() {
	return (
		<main className="page-shell">
			<section className="hero">
				<p className="eyebrow">Rankclaw</p>
				<h1>
					Build the brief first.
					<br />
					Ship the story after review.
				</h1>
				<p className="hero-copy">
					Rankclaw is a CLI-first SEO operating system for research, crawling, review synthesis, comparison briefs,
					audits, and evaluation. This repo starts from PI-Starter but uses a three-stage approval process before
					Symphony touches implementation.
				</p>
				<div className="hero-actions">
					<a className="primary-action" href="https://github.com/moeghashim/rankclaw">
						View Rankclaw
					</a>
					<a className="secondary-action" href="https://linear.app/blyzr/project/rankclaw-73fc1ea67aaf/overview">
						Open Linear project
					</a>
				</div>
			</section>

			<section className="card-grid" aria-label="Starter capabilities">
				{appCards.map((card) => (
					<article className="feature-card" key={card.title}>
						<p className="card-accent">{card.accent}</p>
						<h2>{card.title}</h2>
						<p>{card.description}</p>
					</article>
				))}
			</section>

			<section className="workflow-panel">
				<div>
					<p className="eyebrow">Approval flow</p>
					<h2>Lock scope before execution.</h2>
				</div>
				<pre>
					<code>{`1. Write docs/PRD0.md + docs/PRD.md
2. Approve Linear stories
3. Let Symphony ship one story at a time`}</code>
				</pre>
			</section>
		</main>
	);
}
