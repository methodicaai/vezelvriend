// Loads the participant exercises from /exercises (repo root).
// They live outside site/ so they read well on GitHub too; the site renders
// the same files, so there is only one copy to maintain.
const files = import.meta.glob('../../exercises/[0-9]*.md', { eager: true }) as Record<string, any>;

export function getExercises() {
  return Object.entries(files)
    .map(([path, mod]) => ({
      slug: path.split('/').pop()!.replace(/\.md$/, ''),
      // The step on the route: the same number the participant sees everywhere.
      step: Number(mod.frontmatter.stap),
      title: mod.frontmatter.title,
      role: mod.frontmatter.role,
      summary: mod.frontmatter.summary,
      // 'aan': the chat next to the exercise has the AI connection (Claude looks things up itself).
      connection: mod.frontmatter.koppeling === 'aan',
      // Part of a page with several choices (step 9: "verdiepen"); such files get no page of their own.
      part: (mod.frontmatter.onderdeel ?? null) as string | null,
      choice: (mod.frontmatter.keuze ?? null) as string | null,
      Content: mod.Content,
    }))
    .sort((a, b) => a.step - b.step || a.slug.localeCompare(b.slug));
}
