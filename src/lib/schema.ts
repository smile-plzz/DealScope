import { z } from 'zod';
export const money = z.number().finite().min(0).max(100_000_000);
export const intentSchema = z.object({
  query: z.string().trim().min(2).max(500),
  brand: z.string().max(80).default(''),
  model: z.string().max(80).default(''),
  variant: z.string().max(100).default(''),
  mustMatch: z.array(z.string().min(1).max(80)).max(12).default([]),
  excludedFeatures: z.array(z.string().min(1).max(80)).max(12).default([]),
  keywordsEn: z.array(z.string().max(100)).max(8).default([]),
  keywordsBn: z.array(z.string().max(100)).max(8).default([]),
  condition: z.enum(['new', 'used', 'refurbished', 'any']).default('new'),
  quantity: z.number().int().min(1).max(1000).default(1),
  confidence: z.number().min(0).max(1).default(0),
  ambiguities: z.array(z.string().max(300)).max(6).default([]),
});
export type Intent = z.infer<typeof intentSchema>;
export const offerSchema = z.object({
  id: z.string().max(80),
  sellerName: z.string().trim().min(1).max(100),
  title: z.string().trim().min(2).max(400),
  productUrl: z.string().url().max(2000),
  brand: z.string().max(80).default(''),
  model: z.string().max(80).default(''),
  variant: z.string().max(100).default(''),
  quantity: z.number().int().min(1).max(1000).default(1),
  condition: z.enum(['new', 'used', 'refurbished', 'unknown']).default('unknown'),
  priceBDT: money.optional(),
  deliveryFeeBDT: money.optional(),
  deliveryFeeMinBDT: money.optional(),
  deliveryFeeMaxBDT: money.optional(),
  mandatoryFeesBDT: money.optional(),
  deliveryArea: z.string().max(100).default(''),
  stock: z.enum(['in-stock', 'out-of-stock', 'unknown']).default('unknown'),
  warrantyText: z.string().max(300).default(''),
  returnPolicyText: z.string().max(300).default(''),
  sourceType: z.enum(['manual', 'seller-page', 'demo']),
  observedAt: z.string().datetime(),
  evidence: z
    .array(
      z.object({
        field: z.string().max(40),
        value: z.string().max(400),
        sourceUrl: z.string().url().max(2000),
        observedAt: z.string().datetime(),
      }),
    )
    .max(20)
    .default([]),
});
export type Offer = z.infer<typeof offerSchema>;
export const searchSchema = z.object({
  productIntent: intentSchema,
  deliveryArea: z.string().trim().min(2).max(100),
  urls: z.array(z.string().url().max(2000)).max(3).default([]),
});
export type Match = 'exact' | 'likely' | 'similar' | 'rejected';
export type Session = {
  id: string;
  createdAt: string;
  intent: Intent;
  deliveryArea: string;
  offers: Offer[];
  saved: boolean;
  demo: boolean;
  notices: string[];
};
