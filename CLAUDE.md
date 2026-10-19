# Working rules for this repository

## Language
- Code, comments, identifiers, file names and commit messages: English.
- Everything participants see (site, screens, exercises): Dutch.

## Public versus private
- This repo is public. Answers, the pitfall register (V-001 to V-008), trainer versions of exercises and expected outcomes live only in `trainer-private/` (its own private repo, `methodicaai/vezelvriend-trainer`), which is in `.gitignore`.
- Before every push: `git ls-files | grep trainer-private` must return nothing, and no secrets or `.env` files may be staged.
- Never name pitfalls in public data, docs or exercises.

## Site design
- **Card grids always use `site/src/components/Vlak.astro`** (the methodica.nl "tweedeling" style: one surface split into cells with shared lines, first cell tinted, small label, large heading, text, link with an arrow). Never build new card grids with other markup.
- The company website (`/`) uses `CompanyLayout.astro` and `/vv/vezelvriend.css`; the training (`/training/`) uses `TrainingLayout.astro` and the methodica.nl theme in `/assets/`.
- No inline scripts or styles (strict Content-Security-Policy), no forms that collect data, the fictional-company notice and `noindex` on every page.

## Data
- `data/seed/*.json` is the single source; the systems rebuild SQLite from it on every start, and the site reads prices and outages from it.
- The world clock is fixed at Saturday 17-10-2026 10:15 (`config/world.json`).
