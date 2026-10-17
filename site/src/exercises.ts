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
      Content: mod.Content,
    }))
    .sort((a, b) => a.number - b.number);
}
