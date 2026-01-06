import { z } from "zod";

// Renovation status enum
export const RenovationStatusSchema = z.enum([
  "new",
  "little renovation",
  "to renovate extensively",
]);

export type RenovationStatus = z.infer<typeof RenovationStatusSchema>;

// Ad status enum
export const AdStatusSchema = z.enum([
  "to reach out",
  "visit appointment taken",
  "sent the offer",
  "bought",
  "rejected",
]);

export type AdStatus = z.infer<typeof AdStatusSchema>;

// Property Ad schema
export const PropertyAdSchema = z.object({
  id: z.string(), // Generated UUID
  url: z.string().url(),
  source: z.enum(["idealista", "immobiliare"]),
  title: z.string(),
  price: z.number().optional(),
  location: z.string(),
  size: z.number().optional(), // Square meters
  rooms: z.number().optional(),
  bathrooms: z.number().optional(),
  description: z.string(),
  descriptionSummary: z.string(), // Summary without real estate agent fluff
  renovationStatus: RenovationStatusSchema,
  features: z.array(z.string()),
  status: AdStatusSchema,
  notes: z.string().optional(), // User's manual notes
  adAge: z.string(), // Number of months/weeks/days
  scrapedAt: z.string(), // ISO timestamp
});

export type PropertyAd = z.infer<typeof PropertyAdSchema>;

// Question/Answer schema
export const QuestionAnswerSchema = z.object({
  id: z.string(), // Generated UUID
  question: z.string(),
  answer: z.string(),
  askedAt: z.string(), // ISO timestamp
});

export type QuestionAnswer = z.infer<typeof QuestionAnswerSchema>;

// Research state schema
export const ResearchStateSchema = z.object({
  name: z.string(), // Virtual Object key
  criteria: z.string(),
  ads: z.array(PropertyAdSchema),
  questions: z.array(QuestionAnswerSchema),
  createdAt: z.string(), // ISO timestamp
});

export type ResearchState = z.infer<typeof ResearchStateSchema>;
