// Loads the participant exercises from /exercises (repo root).
// They live outside site/ so they read well on GitHub too; the site renders
// the same files, so there is only one copy to maintain.
const files = import.meta.glob('../../exercises/[0-9]*.md', { eager: true }) as Record<string, any>;

export function getExercises() {
  return Object.entries(files)
    .map(([path, mod]) => ({
      slug: path.split('/').pop()!.replace(/\.md$/, ''),
      number: mod.frontmatter.number,
      title: mod.frontmatter.title,
      role: mod.frontmatter.role,
      summary: mod.frontmatter.summary,
      // 'aan': the chat next to the exercise has the AI connection (Claude looks things up itself).
      connection: mod.frontmatter.koppeling === 'aan',
      Content: mod.Content,
    }))
    .sort((a, b) => a.number - b.number);
}
