import * as cheerio from "cheerio";
import { openai } from "@ai-sdk/openai";
import { generateObject, wrapLanguageModel } from "ai";
import { z } from "zod";
import { durableCalls } from "@restatedev/vercel-ai-middleware";
import type * as restate from "@restatedev/restate-sdk";
import { PropertyAd, RenovationStatusSchema } from "../types";
import { fetchWithBrowser } from "./browser-fetcher";

/**
 * Scrapes a property listing from immobiliare.it and extracts structured data.
 * Uses AI to extract everything directly from HTML - no fragile CSS selectors!
 * Uses Restate's durable execution for both fetching and AI extraction.
 */
export async function scrapeImmobiliareAd(
  ctx: restate.Context,
  url: string
): Promise<PropertyAd> {
  // Validate URL domain
  const urlObj = new URL(url);
  if (!urlObj.hostname.includes("immobiliare.it")) {
    throw new Error("URL must be from immobiliare.it");
  }

  // Fetch the page with browser to bypass anti-bot protection
  const html = await ctx.run("fetch-html", () => fetchWithBrowser(url));

  // Minimal cleanup - just remove scripts, styles, and obvious noise
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, iframe, noscript").remove();

  // Get the cleaned HTML
  const cleanedHtml = $.html();

  // Wrap the AI model with durable calls middleware
  const model = wrapLanguageModel({
    model: openai("gpt-4o-mini"),
    middleware: durableCalls(ctx, { maxRetryAttempts: 3 }),
  });

  // Let AI do ALL the extraction work with an Italian prompt
  const aiExtraction = await generateObject({
    model,
    schema: z.object({
      title: z.string().describe("Il titolo dell'annuncio"),
      price: z.number().optional().describe("Il prezzo in euro (solo il numero, senza simboli)"),
      location: z.string().describe("La località/zona dell'immobile"),
      size: z.number().optional().describe("La superficie in metri quadri (m²)"),
      rooms: z.number().optional().describe("Il numero di camere/locali"),
      bathrooms: z.number().optional().describe("Il numero di bagni"),
      description: z.string().describe("La descrizione completa dell'immobile"),
      descriptionSummary: z
        .string()
        .describe("Un riassunto conciso e fattuale della descrizione, senza il linguaggio di marketing dell'agenzia, solo i fatti sull'immobile"),
      renovationStatus: RenovationStatusSchema.describe(
        "Lo stato di ristrutturazione: 'new' se nuovo o appena ristrutturato, 'little renovation' se serve solo lavoro minore (pittura, pavimenti), 'to renovate extensively' se serve ristrutturazione importante (riscaldamento, impianti, struttura)"
      ),
      features: z.array(z.string()).describe("Lista delle caratteristiche principali dell'immobile (es. ascensore, terrazzo, cantina, posto auto, ecc.)"),
      adAge: z.string().describe("Da quanto tempo è pubblicato l'annuncio (es. 'oggi', '3 giorni fa', '2 settimane fa', ecc.)"),
    }),
    prompt: `Analizza questa pagina HTML di un annuncio immobiliare da Immobiliare.it ed estrai tutte le informazioni strutturate.

HTML dell'annuncio:
${cleanedHtml.slice(0, 50000)}

Estrai tutte le informazioni disponibili sull'immobile. Sii preciso con i numeri (prezzo, metri quadri, camere, bagni).
Per il riassunto della descrizione, elimina tutto il linguaggio di marketing e fornisci solo i fatti oggettivi.
Per lo stato di ristrutturazione, valuta attentamente se l'immobile è nuovo/ristrutturato, se ha bisogno di piccoli lavori, o di ristrutturazione importante.`,
  });

  // Construct the PropertyAd object
  const propertyAd: PropertyAd = {
    id: "", // Will be set by caller
    url,
    source: "immobiliare" as const,
    title: aiExtraction.object.title,
    price: aiExtraction.object.price,
    location: aiExtraction.object.location,
    size: aiExtraction.object.size,
    rooms: aiExtraction.object.rooms,
    bathrooms: aiExtraction.object.bathrooms,
    description: aiExtraction.object.description,
    descriptionSummary: aiExtraction.object.descriptionSummary,
    renovationStatus: aiExtraction.object.renovationStatus,
    features: aiExtraction.object.features,
    status: "to reach out", // Default status
    notes: undefined,
    adAge: aiExtraction.object.adAge,
    scrapedAt: new Date().toISOString(),
  };

  return propertyAd;
}
