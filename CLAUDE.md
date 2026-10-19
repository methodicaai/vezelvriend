# Working rules for this repository

Vezelvriend B.V. is a FICTIONAL fibre company: the practice environment of the Dutch AI training of Methodica (for business analysts and testers). Core message: "AI is zo goed als de context die je meegeeft." Live at https://vezelvriend.nl (company website at `/`, training at `/training/`).

## Language
- Code, comments, identifiers, file names and commit messages: English.
- Everything participants see (site, screens, exercises): Dutch. Talk to the owner in Dutch, in plain language; the owner is not a developer.

## Public versus private
- This repo (`methodicaai/vezelvriend`) is public. Answers, the pitfall register (V-001 to V-008), trainer versions of exercises, the five modem scenarios with expected outcomes and the decision-tree test live only in `trainer-private/`: its own git repo pushing to the private `methodicaai/vezelvriend-trainer`, and listed in `.gitignore`.
- Before every push: `git ls-files | grep trainer-private` must return nothing, no `.env` and no secrets may be staged.
- Never name pitfalls in public data, docs or exercises.
- Trainer test: `node --test "trainer-private/tests/*.test.js"`.

## Site design
- **Card grids always use `site/src/components/Vlak.astro`** (the methodica.nl "tweedeling" style: one surface split into cells with shared lines, first cell tinted, small label, large heading, text, link with an arrow). Never build new card grids with other markup.
- Company website (`/`): `CompanyLayout.astro` + `/vv/vezelvriend.css` (own teal/coral house style). Training (`/training/`): `TrainingLayout.astro` + the methodica.nl theme in `/assets/`.
- No inline scripts or styles (strict CSP; Markdown syntax highlighting is off for that reason), no forms that collect data, the fictional-company notice and `noindex` on every page.
- Exercise prompts are ```prompt blocks: `{{fill in by hand}}` and `{{auto:key|label}}` (filled from `/klantbeeld/api/context/:id`); `site/public/assets/prompt.js` turns them into fields with "Kopieer prompt" and "Stuur naar AI".

## Architecture (one Docker Compose project)
- `gateway`: nginx + the built Astro site; routes `/klantsysteem/`, `/klantbeeld/`, `/api/ai/`, `/trainer/`.
- `klantsysteem`, `klantbeeld`: Node without framework; rebuild a read-only SQLite DB from `data/seed/*.json` on every start.
- `mijn`: API of the customer app (`/api/mijn/`), reads the fake data, only gets SESSION_SECRET.
- `ai`: participant codes, Claude calls (official SDK, model from `AI_MODEL`, default `claude-opus-5-5`), conversations stored in SQLite on volume `ai-data`. Trainer screen `/trainer/`. Secrets only in `.env` on the server (see `.env.example`).
- World clock fixed at Saturday 17-10-2026 10:15, city in `config/world.json`.
- Local without Docker: `npm run --prefix site build`, then `npm start` -> http://localhost:8080 (AI in test mode, trainer password `test`).

## Server and deploy
- Server: Hetzner "poseidon", 91.98.116.84, SSH `ssh -i ~/.ssh/hetzner_claude claude@91.98.116.84` (sudo). Overall server notes: `C:\Users\david\GitHub\methodica-server\SERVER.md`.
- Code on the server: `/root/apps/vezelvriend` (clone of this repo) with a server-only `docker-compose.override.yml` (gateway on network `governorth_shared`, no host ports) and `.env`.
- Deploy (manual for now): commit + push, then `sudo bash -c "cd /root/apps/vezelvriend && git pull --ff-only && docker compose up -d --build"`. Test risky changes first as a separate project: `VEZELVRIEND_PORT=18090 docker compose -p vvtest -f docker-compose.yml up -d --build`, curl 127.0.0.1:18090, then `down -v`.
- Proxy: NOT in the Nginx Proxy Manager database. Hand-written config in `/root/infra/nginx-proxy/data/nginx/custom/http.conf`; certificate `/etc/letsencrypt/live/vezelvriend` (inside the nginx-proxy container), renewed by `/etc/cron.d/vezelvriend-cert`.
- Ask the owner first for: DNS, certificates, firewall, deleting data, changes outside `/root/apps/vezelvriend`. The owner pastes passwords and API keys themselves; never type them in for them.

## Status (2026-10-19) and next steps
- Done: customer app "Mijn Vezelvriend" at /app/ (PWA, login with fake customer number + postcode, service `mijn`), company website, training pages, Klantsysteem (with SQL screen), Klantbeeld, decision tree, six exercises, fill-in prompt blocks, prompt C with automatic context, AI box with codes, stored conversations and trainer screen (deployed, but AI still off: no `.env` yet).
- Waiting for the owner: Anthropic API account + key, then `.env` on the server (ANTHROPIC_API_KEY, TRAINER_PASSWORD, SESSION_SECRET).
- Open security improvement (needs the owner's OK, touches the proxy): put the Vezelvriend gateway on its own network with Nginx Proxy Manager instead of `governorth_shared`, which it now shares with the other apps' containers (including the Postgres database).
- Roadmap (`docs/roadmap.md`): next system is mail and documents, then servicedesk, backlog, the rest; later real BAG addresses (PDOK) and MCP.
- Possibly: automatic deploy via GitHub Actions like the owner's other sites (needs a change to `/usr/local/bin/methodica-deploy` on the server: ask first).
