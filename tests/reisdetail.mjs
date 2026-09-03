import assert from "node:assert/strict";
import { copyFile, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const content = new URL("../src/content/reizen/dolomieten-per-nachttrein.md", import.meta.url);
const invalidContent = new URL("../src/content/reizen/test-zonder-bron.md", import.meta.url);

function build() {
  return spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["astro", "build"], {
    cwd: root,
    env: { ...process.env, TZ: "America/New_York" },
    encoding: "utf8",
  });
}

const result = build();
assert.equal(result.status, 0, `De reisdetailpagina's moeten bouwen:\n${result.stderr}`);

const html = await readFile(new URL("../dist/reizen/dolomieten-per-nachttrein/index.html", import.meta.url), "utf8");
const timezoneBoundaryHtml = await readFile(new URL("../dist/reizen/zwitserse-merenroute/index.html", import.meta.url), "utf8");
assert.match(html, /<details(?:\s[^>]*)?>/, "De gebouwde dagindeling gebruikt toetsenbordbedienbare details-elementen");
assert.match(html, /<caption(?:\s[^>]*)?>Vertrekmaand, kamertype en prijs per persoon<\/caption>/, "De gebouwde prijstabel heeft een duidelijke caption");
assert.match(timezoneBoundaryHtml, />mei 2027<\//, "Een vertrek op 1 mei blijft mei wanneer de build in America\/New_York draait");
assert.doesNotMatch(timezoneBoundaryHtml, />april 2027<\//, "Een vertrek op 1 mei verschuift niet naar april door de tijdzone");
assert.match(html, /id="kaart" tabindex="-1"/, "Het kaartdoel kan programmatisch focus ontvangen");
assert.doesNotMatch(html, /route-landschap\.svg"[^>]*loading="lazy"/, "De LCP-kandidaat wordt niet lazy-loaded");
assert.match(html, />Vraag deze reis aan<\//, "De detailpagina behoudt de aanvraagknop op de enige route voor de reis");
assert.match(html, /Tijdens deze reis volgen we/, "De detailpagina rendert het redactionele reisverhaal uit de markdown-body");
const summary = "Treinreis naar Zuid-Tirol met rustige wandelingen tussen bergdorpen.";
assert.equal(html.split(summary).length - 1, 1, "De samenvatting staat niet dubbel in intro en reisverhaal");
assert.match(html, /grid-template-columns:minmax\(0,1fr\)/, "De artikelkolom mag op kleine schermen smaller zijn dan de prijstabel");
assert.match(html, /aria-current="page"/, "De hoofdnavigatie markeert Reizen als de huidige pagina");
assert.ok((await stat(new URL("../dist/reizen/dolomieten-per-nachttrein/reisschema.pdf", import.meta.url))).size > 1_000, "Het gebouwde pdf-reisschema is niet leeg");

await copyFile(content, invalidContent);
try {
  const invalid = (await readFile(invalidContent, "utf8"))
    .replace("titel: Dolomieten per nachttrein", "titel: Testreis zonder bron")
    .replace(/^  bron:.*\n/m, "");
  await writeFile(invalidContent, invalid);
  const rejected = build();
  assert.notEqual(rejected.status, 0, "Een echt contentbestand zonder verplichte bron moet worden afgewezen");
  assert.match(`${rejected.stdout}\n${rejected.stderr}`, /bron/i, "De buildfout benoemt het ontbrekende bronveld");
} finally {
  await rm(invalidContent, { force: true });
}

const restored = build();
assert.equal(restored.status, 0, `De detailtest moet dist herstellen met een geslaagde eindbuild:\n${restored.stderr}`);

console.log("Gebouwde reisdetailpagina, tijdzonevaste prijsmaand, pdf en foutpad zijn gecontroleerd.");
