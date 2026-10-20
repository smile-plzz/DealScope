import { intentSchema, offerSchema, type Offer } from '../../src/lib/schema';
export const now = Date.parse('2026-10-20T10:00:00Z');
export const intent = intentSchema.parse({
  query: 'Acme A100 headphones',
  brand: 'Acme',
  model: 'A100',
});
export function offer(overrides: Partial<Offer> = {}): Offer {
  const o = offerSchema.parse({
    id: 'a',
    title: 'Acme A100 headphones',
    sellerName: 'Fixture seller',
    productUrl: 'https://example.com/product',
    brand: 'Acme',
    model: 'A100',
    condition: 'new',
    quantity: 1,
    stock: 'in-stock',
    priceBDT: 1000,
    deliveryFeeBDT: 100,
    mandatoryFeesBDT: 0,
    deliveryArea: 'Dhaka city',
    sourceType: 'seller-page',
    observedAt: new Date(now).toISOString(),
    ...overrides,
  });
  if (!overrides.evidence)
    o.evidence = ['priceBDT', 'deliveryFeeBDT', 'mandatoryFeesBDT', 'stock'].map((field) => ({
      field,
      value: String(o[field as keyof Offer]),
      sourceUrl: o.productUrl,
      observedAt: o.observedAt,
    }));
  return o;
}
