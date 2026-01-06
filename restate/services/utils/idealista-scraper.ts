import { openai } from "@ai-sdk/openai";
import { generateObject, wrapLanguageModel } from "ai";
import { z } from "zod";
import { durableCalls } from "@restatedev/vercel-ai-middleware";
import type * as restate from "@restatedev/restate-sdk";
import { PropertyAd, RenovationStatusSchema } from "../types";
import { fetchWithBrowser } from "./browser-fetcher";
import { DURABLE_AI_RETRY_CONFIG, DURABLE_FETCH_RETRY_CONFIG } from "./ai-config";
import { cleanHtmlForAI } from "./html-cleaner";

/**
 * Scrapes a property listing from idealista.it and extracts structured data.
 * Uses AI to extract everything directly from HTML - no fragile CSS selectors!
 * Uses Restate's durable execution for both fetching and AI extraction.
 */
export async function scrapeIdealistaAd(
  ctx: restate.Context,
  url: string
): Promise<PropertyAd> {
  // Validate URL domain
  const urlObj = new URL(url);
  if (!urlObj.hostname.includes("idealista.it")) {
    throw new Error("URL must be from idealista.it");
  }

  // Fetch the page with browser to bypass DataDome protection
  const html = await ctx.run("fetch-html", () => fetchWithBrowser(url), DURABLE_FETCH_RETRY_CONFIG);

  // Clean HTML to reduce size and improve AI extraction
  const cleanedHtml = cleanHtmlForAI(html);

  // Wrap the AI model with durable calls middleware
  const model = wrapLanguageModel({
    model: openai("gpt-4o"),
    middleware: durableCalls(ctx, DURABLE_AI_RETRY_CONFIG),
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
        .describe("Un riassunto conciso e fattuale della descrizione (2-4 frasi), senza il linguaggio di marketing dell'agenzia, solo i fatti sull'immobile. OBBLIGATORIO - non lasciare vuoto."),
      renovationStatus: RenovationStatusSchema.describe(
        "Lo stato di ristrutturazione: 'new' se nuovo o appena ristrutturato, 'little renovation' se serve solo lavoro minore (pittura, pavimenti), 'to renovate extensively' se serve ristrutturazione importante (riscaldamento, impianti, struttura)"
      ),
      features: z.array(z.string()).describe("Lista delle caratteristiche principali dell'immobile (es. ascensore, terrazzo, cantina, posto auto, ecc.)"),
      adAge: z.string().describe("Da quanto tempo è pubblicato l'annuncio, o quanto tempo fa è stato aggiornato/modificato (es. 'oggi', '3 giorni fa', '2 settimane fa', ecc.). Se non disponibile, usa 'non specificato'"),
    }),
    prompt: `Analizza questa pagina HTML di un annuncio immobiliare da Idealista.it ed estrai tutte le informazioni strutturate.

HTML dell'annuncio:
${cleanedHtml.slice(0, 40000)}

ISTRUZIONI IMPORTANTI:
1. Estrai tutte le informazioni disponibili sull'immobile. Sii preciso con i numeri (prezzo, metri quadri, camere, bagni).
2. Per il riassunto della descrizione (descriptionSummary): OBBLIGATORIO - scrivi sempre un riassunto di 2-4 frasi con solo i fatti oggettivi, eliminando tutto il linguaggio di marketing.
3. Per lo stato di ristrutturazione, valuta attentamente se l'immobile è nuovo/ristrutturato, se ha bisogno di piccoli lavori, o di ristrutturazione importante.
4. Se un campo opzionale non è disponibile, lascialo vuoto (undefined).
5. Per l'età dell'annuncio (adAge), se non trovi l'informazione usa "non specificato".`
  });

  // Validate and construct the PropertyAd object with fallback values
  const extracted = aiExtraction.object;

  // Ensure required fields are present with fallbacks
  const propertyAd: PropertyAd = {
    id: "", // Will be set by caller
    url,
    source: "idealista" as const,
    title: extracted.title || "Annuncio senza titolo",
    price: extracted.price,
    location: extracted.location || "Località non specificata",
    size: extracted.size,
    rooms: extracted.rooms,
    bathrooms: extracted.bathrooms,
    description: extracted.description || "Descrizione non disponibile",
    descriptionSummary: extracted.descriptionSummary || extracted.description?.slice(0, 200) + "..." || "Nessuna descrizione disponibile",
    renovationStatus: extracted.renovationStatus || "little renovation", // Conservative default
    features: extracted.features?.length > 0 ? extracted.features : [],
    status: "to reach out", // Default status
    notes: undefined,
    adAge: extracted.adAge || "non specificato",
    scrapedAt: new Date().toISOString(),
  };

  return propertyAd;
}
