import { defineCollection, z } from "astro:content";

// Contentmodel voor de reizen. Eén reis = één markdown-bestand met frontmatter
// in src/content/reizen. Dit schema is de bron van waarheid; S01 vult de
// resterende reizen aan tot twaalf.
const reizen = defineCollection({
  type: "content",
  schema: z.object({
    titel: z.string(),
    land: z.string(),
    duurInDagen: z.number().int().positive(),
    maanden: z.array(z.string()),
    samenvatting: z.string(),
    prijsVanaf: z.number().positive(),
  }),
});

export const collections = { reizen };
