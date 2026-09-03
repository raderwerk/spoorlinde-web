import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const seed = JSON.parse(await readFile(new URL("../src/data/reizen.seed.json", import.meta.url)));
const required = ["titel", "land", "samenvatting", "moeilijkheid", "dagen", "vertrekdata"];
export function validate(reis) {
  for (const field of required) assert.ok(reis[field]?.length ?? reis[field], `Vul ‘${field}’ in voordat je publiceert`);
  assert.ok(reis.dagen.every((dag) => dag.nummer && dag.titel && dag.beschrijving && dag.vervoer && dag.verblijf), "Iedere dag heeft nummer, titel, beschrijving, vervoer en verblijf nodig");
  assert.ok(reis.vertrekdata.every((vertrek) => vertrek.datum && vertrek.prijsstaffels?.length && vertrek.prijsstaffels.every((staffel) => staffel.omschrijving && staffel.prijs > 0)), "Iedere vertrekdatum heeft minimaal één geldige prijs nodig");
}
assert.equal(seed.length, 12, "Het seedbestand bevat precies twaalf reizen");
seed.forEach(validate);
const files = (await readdir(new URL("../src/content/reizen/", import.meta.url))).filter((file) => file.endsWith(".md"));
assert.equal(files.length, 12, "Er zijn precies twaalf contentbestanden");
for (const reis of seed) {
  const content = await readFile(new URL(`../src/content/reizen/${reis.slug}.md`, import.meta.url), "utf8");
  assert.ok(content.includes(reis.titel) && !/placeholder|lorem ipsum|todo/i.test(content), `${reis.slug} is compleet en bevat geen placeholdertekst`);
}
console.log("12 complete reizen en het seedbestand zijn geldig.");
