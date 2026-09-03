import assert from "node:assert/strict";
import { validate } from "../scripts/validate-content.mjs";
const onvolledig = { titel: "Testreis", land: "Testland", samenvatting: "Test", duurInDagen: 1, maanden: [5], prijsVanaf: 100, moeilijkheid: "makkelijk", dagen: [{ nummer: 1, titel: "Dag", beschrijving: "Beschrijving", vervoer: "trein", verblijf: "hotel" }], vertrekdata: [] };
assert.throws(() => validate(onvolledig), /Vul ‘vertrekdata’ in voordat je publiceert/);
console.log("Een reis zonder vertrekdatum of prijs wordt begrijpelijk geweigerd.");
