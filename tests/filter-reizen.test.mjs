import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSort, nearestAlternatives } from "../public/filter-reizen.js";

const reizen = [
  { maand: "5", duur: 7, land: "Italië", prijs: 1200, datum: "2027-05-20" },
  { maand: "5", duur: 4, land: "Italië", prijs: 800, datum: "2027-05-10" },
  { maand: "6", duur: 7, land: "Noorwegen", prijs: 1400, datum: "2027-06-01" },
];

test("filters every combination and sorts by price", () => {
  assert.deepEqual(filterAndSort(reizen, { maand: "5", land: "Italië", sortering: "prijs" }).map((reis) => reis.prijs), [800, 1200]);
  assert.equal(filterAndSort(reizen, { maand: "5", duur: "7", land: "Italië" }).length, 1);
});

test("offers the closest alternatives for an empty result", () => {
  const alternatives = nearestAlternatives(reizen, { maand: "6", duur: "4", land: "Italië" }, 2);
  assert.equal(alternatives.length, 2);
  assert.equal(alternatives[0].afstand, 1);
});
