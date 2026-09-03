import type { CollectionEntry } from "astro:content";

export type Reis = CollectionEntry<"reizen">;

export const euro = (prijs: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(prijs);

export const maand = (datum: Date) =>
  new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(datum);

export function regelsVoorPdf(reis: Reis) {
  const regels = [reis.data.titel, reis.data.land, reis.data.samenvatting, `Niveau: ${reis.data.moeilijkheid}`, "", "Dag voor dag"];
  for (const dag of reis.data.dagen) {
    regels.push(`Dag ${dag.nummer}: ${dag.titel}`, dag.beschrijving, `Vervoer: ${dag.vervoer}`, `Verblijf: ${dag.verblijf}`, `Bron: ${dag.bron}`, "");
  }
  regels.push("Prijzen per persoon");
  for (const vertrek of reis.data.vertrekdata) {
    regels.push(maand(vertrek.datum));
    for (const staffel of vertrek.prijsstaffels) regels.push(`${staffel.omschrijving}: ${euro(staffel.prijs)}`);
    regels.push(`Bron: ${vertrek.bron}`, "");
  }
  regels.push("Alle bedragen zijn per persoon. De eenpersoonskamertoeslag is het verschil tussen de getoonde kamerprijzen.");
  return regels;
}
