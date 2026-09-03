# spoorlinde-web

## Doel

Boekingssite voor Spoorlinde, een fictieve aanbieder van langzame treinreizen door Europa. De site toont het reisaanbod vanuit een contentmodel in deze repo, laat bezoekers zoeken en filteren op maand, duur en land, en verzamelt aanvragen via een formulier dat straks naar een CRM-koppeling (mock) gaat, met dubbeldetectie op binnenkomende aanvragen.

## Klant

Spoorlinde is een **fictieve** klant in de Raderwerk-demo. Er bestaat geen echt bedrijf met deze naam, er gaat geen bericht naar een echt mens en er wordt geen euro besteed. Zie `client-portfolio.md` in de Raderwerk-hq voor de volledige briefing. Elke publiek bereikbare pagina draagt daarom de zin:

> Demonstratiebedrijf van Raderwerk. Dit bedrijf bestaat niet.

## Stack en waarom

**Astro**, statisch gebouwd en gehost op GitHub Pages, met **Decap CMS** als redactionele interface.

- De reizen zijn contentmodel-in-repo: Astro's content collections (`src/content/reizen`) geven elke reis een markdown-bestand met gevalideerde frontmatter (`src/content/config.ts`). Een redacteur voegt lokaal via `/admin/` een reis toe zonder code te wijzigen. De publieke Pages-build sluit `/admin/` uit totdat een betrouwbare GitHub OAuth-proxy beschikbaar is; lokaal start je `npx decap-server`.
- Geen betalingen, geen serverstatus nodig voor de contentpagina's zelf: een statische build past bij "geen betalingen, wél een aanvraagformulier".
- Bouwt met één commando, draait met één commando, deployt naar GitHub Pages zonder extra infrastructuur.

Het aanvraagformulier met CRM-koppeling en dubbeldetectie (issue S04) komt in een latere PR; dat vraagt een lichte serverless laag (bijvoorbeeld een Pages Function of losse endpoint) bovenop dit statische fundament. Dit bootstrap-skelet legt alleen het contentmodel en de sitestructuur vast.

## Lokaal draaien

Vereist: Node.js 22 of hoger.

```bash
npm install
npm run dev       # lokale server op http://localhost:4321
npm run build     # typecheck + statische build naar dist/
npm run test:content # controleert twaalf reizen plus een ongeldige reis
npm run preview   # de build lokaal bekijken
```

## Reizen zoeken en filteren

Op `/reizen` filter je het volledige aanbod direct op vertrekmaand, reisduur en land. De selectie staat in de querystring, zodat een gekopieerde URL dezelfde resultaten toont. Sorteren kan op vertrekdatum of prijs. Als een combinatie geen exacte reis oplevert, toont de pagina maximaal drie alternatieven die op de meeste gekozen kenmerken overeenkomen.

Open voor lokaal redigeren een tweede terminal met `npx decap-server` en bezoek
`http://localhost:4321/spoorlinde-web/admin/`. Kies **Reizen → Nieuwe reis**. Alle
velden hebben hulptekst. Door de verplichte velden en minimale lijstlengtes kan een
reis zonder vertrekdatum of zonder prijsstaffel niet worden gepubliceerd.

## Contentmodel en seed

| Veld | Type | Verplicht | Voorbeeld |
| --- | --- | --- | --- |
| reis.titel | tekst | ja | Dolomieten per nachttrein |
| reis.land | tekst | ja | Italië |
| reis.samenvatting | tekst | ja | Treinreis naar Zuid-Tirol… |
| reis.duurInDagen | positief geheel getal | ja | 6 |
| reis.maanden | lijst van maandnummers | ja, minimaal 1 | 5 |
| reis.prijsVanaf | positief geheel getal (euro) | ja | 1295 |
| reis.moeilijkheid | keuze | ja | gemiddeld |
| reis.dagen | lijst van dagen | ja, minimaal 1 | dag 1 |
| dag.nummer | positief geheel getal | ja | 1 |
| dag.titel | tekst | ja | Aankomst in Bolzano |
| dag.beschrijving | tekst | ja | We verkennen de stad… |
| dag.vervoer | tekst | ja | nachttrein en regionale trein |
| dag.verblijf | tekst | ja | familiehotel in Bolzano |
| reis.vertrekdata | lijst van vertrekdata | ja, minimaal 1 | 2027-05-14 |
| vertrek.datum | datum | ja | 2027-05-14 |
| vertrek.prijsstaffels | lijst van prijzen | ja, minimaal 1 | gedeelde kamer, € 1295 |
| prijs.omschrijving | tekst | ja | per persoon, gedeelde kamer |
| prijs.prijs | positief geheel getal (euro) | ja | 1295 |
| reisverhaal | Markdown | ja | De route combineert… |

De twaalf bronbestanden staan in `src/content/reizen`. Dezelfde records staan als
machineleesbaar seedbestand in `src/data/reizen.seed.json`, zodat een nieuwe
omgeving reproduceerbaar gevuld en gecontroleerd kan worden.

## Bijdragen via PR

1. Vertak vanaf `main`: `feat/<issue>-<korte-titel>`.
2. Commit in het Engels, kleine stappen.
3. Draai `npm run build` lokaal voordat je een PR opent — dat is dezelfde check als CI (job `ci`).
4. Open de PR met het sjabloon (`.github/pull_request_template.md`) volledig ingevuld, inclusief bewijs en Definition of Done.
5. Een mens keurt goed en merget. Agents mergen nooit, forcen nooit en deployen nooit rechtstreeks naar productie; zie `AGENTS.md`.

## Poorten

Deze repo hoort bij het Raderwerk-werkvloerproces (zie `linear-workspace-spec.md`): Agentreview → QA op preview → **Poort · Merge of publicatie** (mens) → Na-merge controle. Elke PR die naar `main` gaat, doorloopt de ruleset op deze branch: verplichte pull request, verplichte status check `ci`, geen directe push.

## Poort / omgeving

- CI-workflow: `.github/workflows/ci.yml`, job `ci`.
- Preview/publicatie: `.github/workflows/pages.yml`, publiceert naar GitHub Pages op elke push naar `main`.
- Site-URL: https://raderwerk.github.io/spoorlinde-web/
