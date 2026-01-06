import * as restate from "@restatedev/restate-sdk";
import { TerminalError } from "@restatedev/restate-sdk";
import { durableCalls } from "@restatedev/vercel-ai-middleware";
import { openai } from "@ai-sdk/openai";
import { generateText, wrapLanguageModel } from "ai";
import { scrapeIdealistaAd } from "./utils/idealista-scraper";
import { scrapeImmobiliareAd } from "./utils/immobiliare-scraper";
import {
  PropertyAd,
  QuestionAnswer,
  AdStatus,
  AdStatusSchema,
} from "./types";

export const researchTracker = restate.object({
  name: "ResearchTracker",
  handlers: {
    /**
     * Initialize a new research with criteria
     */
    createResearch: async (
      ctx: restate.ObjectContext,
      criteria: string
    ): Promise<void> => {
      // Check if research already exists
      const existingCriteria = await ctx.get<string>("criteria");
      if (existingCriteria) {
        throw new TerminalError(
          "Research with this name already exists. Please choose a different name."
        );
      }

      // Initialize research state
      ctx.set("criteria", criteria);
      ctx.set("ads", []);
      ctx.set("questions", []);
      ctx.set("createdAt", new Date().toISOString());
    },

    /**
     * Get research criteria
     */
    getCriteria: restate.handlers.object.shared(
      async (ctx: restate.ObjectSharedContext): Promise<string> => {
        const criteria = await ctx.get<string>("criteria");
        if (!criteria) {
          throw new TerminalError("Research not found");
        }
        return criteria;
      }
    ),

    /**
     * Add a new property ad by URL (with scraping)
     */
    addAd: async (
      ctx: restate.ObjectContext,
      url: string
    ): Promise<PropertyAd> => {
      // Validate URL
      let urlObj: URL;
      try {
        urlObj = new URL(url);
      } catch (e) {
        throw new TerminalError("Invalid URL format");
      }

      // Determine which scraper to use based on domain
      let scrapedAd: PropertyAd;
      if (urlObj.hostname.includes("idealista.it")) {
        // Scraper now uses ctx.run and durableCalls internally for durable execution
        scrapedAd = await scrapeIdealistaAd(ctx, url);
      } else if (urlObj.hostname.includes("immobiliare.it")) {
        // Scraper now uses ctx.run and durableCalls internally for durable execution
        scrapedAd = await scrapeImmobiliareAd(ctx, url);
      } else {
        throw new TerminalError(
          "Only idealista.it and immobiliare.it URLs are supported"
        );
      }

      // Generate deterministic UUID for the ad
      const adId = ctx.rand.uuidv4();
      const propertyAd: PropertyAd = {
        ...scrapedAd,
        id: adId,
      };

      // Add to state
      const ads = (await ctx.get<PropertyAd[]>("ads")) || [];
      ads.push(propertyAd);
      ctx.set("ads", ads);

      return propertyAd;
    },

    /**
     * Get all property ads
     */
    getAds: restate.handlers.object.shared(
      async (ctx: restate.ObjectSharedContext): Promise<PropertyAd[]> => {
        const ads = (await ctx.get<PropertyAd[]>("ads")) || [];
        return ads;
      }
    ),

    /**
     * Update the status of a property ad
     */
    updateAdStatus: async (
      ctx: restate.ObjectContext,
      params: { adId: string; status: AdStatus }
    ): Promise<void> => {
      const { adId, status } = params;

      // Validate status
      const parseResult = AdStatusSchema.safeParse(status);
      if (!parseResult.success) {
        throw new TerminalError(`Invalid status value: ${status}`);
      }

      // Get ads
      const ads = (await ctx.get<PropertyAd[]>("ads")) || [];

      // Find and update ad
      const adIndex = ads.findIndex((ad) => ad.id === adId);
      if (adIndex === -1) {
        throw new TerminalError("Property ad not found in this research");
      }

      ads[adIndex].status = status;
      ctx.set("ads", ads);
    },

    /**
     * Update the notes of a property ad
     */
    updateAdNotes: async (
      ctx: restate.ObjectContext,
      params: { adId: string; notes: string }
    ): Promise<void> => {
      const { adId, notes } = params;

      // Get ads
      const ads = (await ctx.get<PropertyAd[]>("ads")) || [];

      // Find and update ad
      const adIndex = ads.findIndex((ad) => ad.id === adId);
      if (adIndex === -1) {
        throw new TerminalError("Property ad not found in this research");
      }

      ads[adIndex].notes = notes;
      ctx.set("ads", ads);
    },

    /**
     * Ask a question about the properties (AI-powered analysis)
     */
    askQuestion: async (
      ctx: restate.ObjectContext,
      question: string
    ): Promise<string> => {
      if (!question || question.trim().length === 0) {
        throw new TerminalError("Question cannot be empty");
      }

      // Get all ads with notes
      const ads = (await ctx.get<PropertyAd[]>("ads")) || [];
      const criteria = await ctx.get<string>("criteria");

      // Prepare context for AI
      const adsContext = ads
        .map((ad, idx) => {
          return `
Property ${idx + 1}:
- Title: ${ad.title}
- Price: ${ad.price ? `€${ad.price}` : "Not specified"}
- Location: ${ad.location}
- Size: ${ad.size ? `${ad.size}m²` : "Not specified"}
- Rooms: ${ad.rooms || "Not specified"}
- Bathrooms: ${ad.bathrooms || "Not specified"}
- Renovation Status: ${ad.renovationStatus}
- Description Summary: ${ad.descriptionSummary}
- Features: ${ad.features.slice(0, 5).join(", ")}
- Status: ${ad.status}
- Notes: ${ad.notes || "No notes"}
- URL: ${ad.url}
`;
        })
        .join("\n---\n");

      // Use durable AI calls
      const model = wrapLanguageModel({
        model: openai("gpt-4o"),
        middleware: durableCalls(ctx, { maxRetryAttempts: 3 }),
      });

      const result = await generateText({
        model,
        prompt: `Sei un assistente di analisi immobiliare utile e competente.

Criteri di ricerca: ${criteria}

Immobili nella ricerca:
${adsContext}

Domanda dell'utente: ${question}

Fornisci una risposta dettagliata e utile analizzando gli immobili in base alla domanda. Considera prezzi, posizioni, dimensioni, necessità di ristrutturazione e le note dell'utente quando rilevanti. Rispondi sempre in italiano.`,
        maxRetries: 3,
      });

      const answer = result.text;

      // Store Q&A in history
      const questionId = ctx.rand.uuidv4();
      const qa: QuestionAnswer = {
        id: questionId,
        question,
        answer,
        askedAt: new Date().toISOString(),
      };

      const questions = (await ctx.get<QuestionAnswer[]>("questions")) || [];
      questions.push(qa);
      ctx.set("questions", questions);

      return answer;
    },

    /**
     * Get all Q&A history
     */
    getQuestions: restate.handlers.object.shared(
      async (ctx: restate.ObjectSharedContext): Promise<QuestionAnswer[]> => {
        const questions = (await ctx.get<QuestionAnswer[]>("questions")) || [];
        return questions;
      }
    ),
  },
});

export type ResearchTracker = typeof researchTracker;
