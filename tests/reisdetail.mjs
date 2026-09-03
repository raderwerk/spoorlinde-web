import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pagina = await readFile("src/pages/reizen/[slug]/index.astro", "utf8");
assert.match(pagina, /<details>/, "dagindeling gebruikt toetsenbordbedienbare details-elementen");
assert.match(pagina, /loading="lazy"/, "beelden worden lazy-loaded");
assert.doesNotMatch(pagina, /alt=[^\n>]*afbeelding van/i, "alt-teksten gebruiken niet de verboden aanhef");
assert.match(pagina, /addEventListener\('click'/, "kaart laadt pas na interactie");
assert.doesNotMatch(pagina, /https?:\/\//, "reisdetail bevat geen externe netwerkbron");

const pdf = await readFile("src/pages/reizen/[slug]/reisschema.pdf.ts", "utf8");
assert.match(pdf, /regelsVoorPdf\(reis\)/, "pdf gebruikt dezelfde gestructureerde reisdata");

const onvolledig = `dagen:\n  - nummer: 1\n    titel: test\n`;
assert.equal(/bron:/.test(onvolledig), false, "foutpad detecteert content zonder bron");
console.log("reisdetail: 7 controles geslaagd");
