# CLAUDE.md — spoorlinde-web

Zie `AGENTS.md`. Dat document is leidend voor elke agent die hier werkt, inclusief Claude.

Kortweg, zonder uitzondering:

- Scope: alleen `spoorlinde-web` (Spoorlinde, fictieve klant, `dienst/web`). Geen ander-klantwerk, geen bureaubrede tooling.
- Definition of Done: zie het Feature-sjabloon in `AGENTS.md`, elk punt met bewijs.
- Draai `npm run build` lokaal vóór je een PR opent — dat is de CI-check (job `ci`).
- Verboden: mergen, force-pushen, rechtstreeks deployen, geheimen of echte klantdata in de repo.
- Onderteken elke Linear-comment volgens je rolcontract in `agent-roster.md`.
