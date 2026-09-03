import { getCollection, type CollectionEntry } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import PDFDocument from "pdfkit";
import { regelsVoorPdf } from "../../../lib/reisschema";

export const getStaticPaths = (async () =>
  (await getCollection("reizen")).map((reis) => ({ params: { slug: reis.slug }, props: { reis } }))) satisfies GetStaticPaths;

function maakPdf(reis: CollectionEntry<"reizen">): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 54, size: "A4", info: { Title: `${reis.data.titel} — reisschema` } });
    const delen: Uint8Array[] = [];
    document.on("data", (deel) => delen.push(deel));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(delen)));
    for (const [index, regel] of regelsVoorPdf(reis).entries()) {
      document.font(index === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(index === 0 ? 20 : 10).text(regel || " ", { paragraphGap: 3 });
    }
    document.end();
  });
}

export const GET: APIRoute = async ({ props }) => {
  const reis = props.reis as CollectionEntry<"reizen">;
  const inhoud = await maakPdf(reis);
  return new Response(inhoud.buffer.slice(inhoud.byteOffset, inhoud.byteOffset + inhoud.byteLength) as ArrayBuffer, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${reis.slug}-reisschema.pdf"` },
  });
};
