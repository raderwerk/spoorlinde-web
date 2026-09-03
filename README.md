# spoorlinde-web

## Doel

Boekingssite voor Spoorlinde, een fictieve aanbieder van langzame treinreizen door Europa. De site toont het reisaanbod vanuit een contentmodel in deze repo, laat bezoekers zoeken en filteren op maand, duur en land, en verzamelt aanvragen via een formulier met een CRM-koppeling (mock) en dubbeldetectie.

## Klant

Spoorlinde is een **fictieve** klant in de Raderwerk-demo. Er bestaat geen echt bedrijf met deze naam, er gaat geen bericht naar een echt mens en er wordt geen euro besteed. Zie `client-portfolio.md` in de Raderwerk-hq voor de volledige briefing. Elke publiek bereikbare pagina draagt daarom de zin:

> Demonstratiebedrijf van Raderwerk. Dit bedrijf bestaat niet.

## Stack en waarom

**Astro**, statisch gebouwd en gehost op GitHub Pages.

- De reizen zijn contentmodel-in-repo: Astro's content collections (`src/content/reizen`) geven elke reis een markdown-bestand met gevalideerde frontmatter (`src/content/config.ts`). Een redacteur voegt een reis toe zonder ontwikkelaar en zonder los CMS.
- Geen betalingen, geen serverstatus nodig voor de contentpagina's zelf: een statische build past bij "geen betalingen, wél een aanvraagformulier".
- Bouwt met één commando, draait met één commando, deployt naar GitHub Pages zonder extra infrastructuur.

## Aanvraagformulier, mock-CRM en dubbeldetectie

Het formulier staat op `/aanvraag` (maximaal drie stappen: reis, gegevens, controle). Er worden **geen betaalgegevens** gevraagd. Na een geslaagde aanvraag volgt een bevestigingsscherm met referentienummer (`SL-…`).

De CRM-koppeling is een **mock** in `src/lib/crm`: een gratis testomgeving in de browser (localStorage), geen productiesysteem, geen API-sleutels. Zie `.env.example`.

- Een nieuwe aanvraag maakt **één contact** met de gekozen reis.
- Dezelfde testdomein-e-mail binnen 24 uur: **geen tweede contact**, wel een notitie op het bestaande.
- Als het CRM onbereikbaar is, gaat de aanvraag naar een **outbox**, wordt opnieuw geprobeerd, en de bezoeker krijgt een **foutmelding** — nooit een succesmelding.

### Geen mail naar een echt adres

Er is geen mailer. `sendTransactionalEmail` gooit altijd. Het formulier accepteert alleen gereserveerde testdomeinen:

- `example.com`, `example.org`, `example.net` (RFC 2606)
- `spoorlinde.test` (`.test` is gereserveerd)

Een adres als `iemand@gmail.com` wordt geweigerd. Dit is afgedekt in `src/lib/email/guard.ts` en in `tests/aanvraag-crm.test.ts`.

## Lokaal draaien

Vereist: Node.js 22 of hoger.

```bash
npm install
npm run dev       # lokale server op http://localhost:4321
npm test          # CRM-scenario's: nieuw contact, duplicaat, storing
npm run build     # typecheck + statische build naar dist/
npm run preview   # de build lokaal bekijken
```

Het formulier is lokaal bereikbaar op `http://localhost:4321/spoorlinde-web/aanvraag` (de site draait onder het GitHub Pages-projectpad).

## Bijdragen via PR

1. Vertak vanaf `main`: `feat/<issue>-<korte-titel>`.
2. Commit in het Engels, kleine stappen.
3. Draai `npm test` en `npm run build` lokaal voordat je een PR opent — CI (job `ci`) draait beide.
4. Open de PR met het sjabloon (`.github/pull_request_template.md`) volledig ingevuld, inclusief bewijs en Definition of Done.
5. Een mens keurt goed en merget. Agents mergen nooit, forcen nooit en deployen nooit rechtstreeks naar productie; zie `AGENTS.md`.

## Poorten

Deze repo hoort bij het Raderwerk-werkvloerproces (zie `linear-workspace-spec.md`): Agentreview → QA op preview → **Poort · Merge of publicatie** (mens) → Na-merge controle. Elke PR die naar `main` gaat, doorloopt de ruleset op deze branch: verplichte pull request, verplichte status check `ci`, geen directe push.

## Poort / omgeving

- CI-workflow: `.github/workflows/ci.yml`, job `ci` (test + typecheck + build).
- Preview/publicatie: `.github/workflows/pages.yml`, publiceert naar GitHub Pages op elke push naar `main`.
- Site-URL: https://raderwerk.github.io/spoorlinde-web/
