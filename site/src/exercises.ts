// Loads the participant exercises from /exercises (repo root).
// They live outside site/ so they read well on GitHub too; the site renders
// the same files, so there is only one copy to maintain.
const files = import.meta.glob('../../exercises/[0-9]*.md', { eager: true }) as Record<string, any>;

export function getExercises() {
  return Object.entries(files)
    .map(([path, mod]) => ({
      slug: path.split('/').pop()!.replace(/\.md$/, ''),
      // The step on the route ("3", "9a"): the same number the participant sees everywhere.
      step: String(mod.frontmatter.stap),
      title: mod.frontmatter.title,
      role: mod.frontmatter.role,
      summary: mod.frontmatter.summary,
      // 'aan': the chat next to the exercise has the AI connection (Claude looks things up itself).
      connection: mod.frontmatter.koppeling === 'aan',
      // Steps of the context ladder explained above the exercise (frontmatter "trede: [0, 1]").
      ladder: (mod.frontmatter.trede ?? []) as number[],
      Content: mod.Content,
    }))
    .sort((a, b) => a.step.localeCompare(b.step, 'nl', { numeric: true }));
}
