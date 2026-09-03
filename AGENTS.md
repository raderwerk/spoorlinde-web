# AGENTS.md — spoorlinde-web

Voor Codex, Cursor en Claude die in deze repo werken. Dit document is een uitwerking van de rolcontracten in `agent-roster.md` en de sjablonen in `linear-workspace-spec.md` (beide in de Raderwerk-hq), specifiek voor deze repo. Bij tegenspraak wint het rolcontract van het aanroepende issue.

## Scope van deze repo

`spoorlinde-web` is de boekingssite van Spoorlinde (**fictieve** klant, `dienst/web`). Hier hoort in:

- Het contentmodel en de contentbestanden voor de reizen (`src/content/reizen`).
- De reisdetailpagina, zoeken/filteren, en het aanvraagformulier met CRM-koppeling (mock) en dubbeldetectie.
- Sitebrede componenten, styling en de Pages-deployconfiguratie voor déze site.

Hier hoort **niet** in: contentstukken voor andere klanten (die gaan naar `raderwerk-content`), bureaubrede tooling (`agency-os`), of iets dat met een echte klant, een echte betaling of een echt verstuurd bericht te maken heeft. Er wordt uitsluitend met testgegevens gewerkt; er gaat geen mail naar een echt adres.

## Definition of Done (dienst/web, sjabloon `Feature`)

Elke PR in deze repo voldoet aan dezelfde DoD als in het Feature-sjabloon van de werkvloer, tenzij het issue expliciet afwijkt:

- [ ] Elk acceptatiecriterium uit het issue afgevinkt met een link naar bewijs
- [ ] Tests voor het gelukkige pad en minimaal één foutpad; volledige suite groen, uitvoer in de PR
- [ ] PR geopend met beschrijving, groene CI (job `ci`) en een preview-URL
- [ ] Twee onafhankelijke reviews afgerond, uit verschillende modelfamilies (zie Reviewer-contract)
- [ ] Toegankelijkheid: toetsenbordpad compleet, tekstcontrast minimaal 4,5:1, gemeten
- [ ] Werkt op 360, 768 en 1440 pixels breed, met screenshots
- [ ] Geen geheimen in de repo, geen productiecredentials gebruikt
- [ ] README bijgewerkt als het gedrag verandert

Een DoD-punt afvinken zonder verifieerbaar bewijs in dezelfde comment is niet toegestaan (rolcontract, regel 5 van "wat geen enkele rol ooit mag").

## PR-conventies

- Branch: `feat/<ISSUE>-<korte-titel>` of `fix/<ISSUE>-<korte-titel>`.
- Commits en PR-titel/-beschrijving in het Engels.
- Gebruik `.github/pull_request_template.md` volledig; laat geen sectie leeg.
- **Draai `npm run build` lokaal vóór je een PR opent.** Dat is exact de check die CI (job `ci`) draait: typecheck + build. Een PR met een build die lokaal al faalt, is geen PR.
- Eén PR per issue, geen ongevraagde scope-uitbreiding.

## Verboden acties

- **Nooit mergen.** Een mens merget, altijd, bij de poort "Merge of publicatie".
- **Nooit force-pushen** naar `main` of naar de PR-branch van een andere agent.
- **Nooit rechtstreeks deployen.** De enige deploy is de `pages.yml`-workflow op push naar `main`, en die push gebeurt alleen via een gemergede PR.
- **Nooit geheimen** in commits, code of comments. Geen productiecredentials, geen echte klantdata, geen echte e-mailadressen.
- **Nooit** een status verlaten waarvan de naam met "Poort" begint, en nooit `poort/akkoord` of `poort/afgekeurd` zetten — dat is aan de mens.

## Ondertekening

Sluit elke Linear-comment die bij werk in deze repo hoort af met de handtekening uit je rolcontract, bijvoorbeeld:

```
**Ontwikkelaar · Opus 5 · run <id> · <tijd>**
```

Codex en Cursor tekenen niet met tekst; hun Agent Session is de handtekening.
