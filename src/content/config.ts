import { defineCollection, z } from "astro:content";

export const moeilijkheden = ["makkelijk", "gemiddeld", "uitdagend"] as const;

const dag = z.object({
  nummer: z.number().int().positive(),
  titel: z.string().min(1),
  beschrijving: z.string().min(1),
  vervoer: z.string().min(1),
  verblijf: z.string().min(1),
});

const vertrek = z.object({
  datum: z.coerce.date(),
  prijsstaffels: z.array(z.object({
    omschrijving: z.string().min(1),
    prijs: z.number().positive(),
  })).min(1, "Voeg minimaal één prijs toe aan iedere vertrekdatum"),
});

const reizen = defineCollection({
  type: "content",
  schema: z.object({
    titel: z.string().min(1),
    land: z.string().min(1),
    samenvatting: z.string().min(1),
    duurInDagen: z.number().int().positive(),
    maanden: z.array(z.number().int().min(1).max(12)).min(1),
    prijsVanaf: z.number().positive(),
    moeilijkheid: z.enum(moeilijkheden),
    dagen: z.array(dag).min(1),
    vertrekdata: z.array(vertrek).min(1, "Voeg minimaal één vertrekdatum met prijs toe voordat je publiceert"),
  }),
});

export const collections = { reizen };
