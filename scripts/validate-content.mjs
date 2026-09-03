import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { readFile, readdir } from "node:fs/promises";
import { parse } from "yaml";

const contentDirectory = new URL("../src/content/reizen/", import.meta.url);
const required = ["titel", "land", "samenvatting", "duurInDagen", "maanden", "prijsVanaf", "moeilijkheid", "dagen", "vertrekdata"];

export function validate(reis) {
  for (const field of required) assert.ok(reis[field]?.length ?? reis[field], `Vul ‘${field}’ in voordat je publiceert`);
  assert.equal(reis.dagen.length, reis.duurInDagen, "Duur in dagen moet gelijk zijn aan het aantal dagen in het programma");
  assert.ok(reis.dagen.every((dag, index) => dag.nummer === index + 1 && dag.titel && dag.beschrijving && dag.vervoer && dag.verblijf && dag.bron), "Iedere dag heeft een opvolgend nummer, titel, beschrijving, vervoer, verblijf en bron nodig");
  assert.ok(reis.vertrekdata.every((vertrek) => vertrek.datum && vertrek.bron && vertrek.prijsstaffels?.length && vertrek.prijsstaffels.every((staffel) => staffel.omschrijving && staffel.prijs > 0)), "Iedere vertrekdatum heeft een bron en minimaal één geldige prijs nodig");
  const prijzen = reis.vertrekdata.flatMap((vertrek) => vertrek.prijsstaffels.map((staffel) => staffel.prijs));
  assert.equal(reis.prijsVanaf, Math.min(...prijzen), "Vanafprijs moet de laagste prijsstaffel zijn");
}

export async function readJourneyFile(file) {
  const content = await readFile(new URL(file, contentDirectory), "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/);
  assert.ok(match, `${file} heeft geldige frontmatter en een reisverhaal nodig`);
  return { data: parse(match[1]), body: match[2].trim(), content };
}

export async function validateCollection() {
  const files = (await readdir(contentDirectory)).filter((file) => file.endsWith(".md")).sort();
  assert.equal(files.length, 12, "Er zijn precies twaalf contentbestanden");
  const descriptions = new Set();
  for (const file of files) {
    const reis = await readJourneyFile(file);
    validate(reis.data);
    assert.ok(reis.body.length > reis.data.samenvatting.length, `${file} heeft een eigen, volledig reisverhaal nodig`);
    assert.ok(!/placeholder|lorem ipsum|todo/i.test(reis.content), `${file} bevat geen placeholdertekst`);
    for (const dag of reis.data.dagen) {
      assert.ok(!descriptions.has(dag.beschrijving), `${file} heeft een unieke dagbeschrijving nodig`);
      descriptions.add(dag.beschrijving);
    }
  }
  const seed = JSON.parse(await readFile(new URL("../src/data/reizen.seed.json", import.meta.url)));
  assert.equal(seed.length, 12, "Het seedbestand bevat precies twaalf reizen");
  seed.forEach(validate);
  console.log("12 complete contentbestanden en het seedbestand zijn geldig.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await validateCollection();
