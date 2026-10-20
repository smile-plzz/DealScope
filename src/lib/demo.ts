import { intentSchema, offerSchema, type Session } from './schema';
export function demoSession(): Session {
  const now = new Date().toISOString();
  const intent = intentSchema.parse({
    query: 'Example Sound One headphones',
    brand: 'Example',
    model: 'Sound One',
    condition: 'new',
  });
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    intent,
    deliveryArea: 'Dhaka city',
    saved: false,
    demo: true,
    notices: ['Demo only. Fictional products and prices. These are not live offers.'],
    offers: [
      { sellerName: 'Example Shop A', priceBDT: 2400, deliveryFeeBDT: undefined, warrantyText: '' },
      {
        sellerName: 'Example Shop B',
        priceBDT: 2500,
        deliveryFeeBDT: 60,
        warrantyText: 'Illustrative 1-year warranty',
      },
      {
        sellerName: 'Example Shop C',
        priceBDT: 2650,
        deliveryFeeBDT: 0,
        warrantyText: 'Illustrative 2-year warranty',
      },
    ].map((o, index) =>
      offerSchema.parse({
        ...o,
        id: String(index),
        title: intent.query,
        brand: intent.brand,
        model: intent.model,
        productUrl: 'https://example.com/demo/' + index,
        mandatoryFeesBDT: 0,
        deliveryArea: 'Dhaka city',
        condition: 'new',
        stock: 'in-stock',
        sourceType: 'demo',
        observedAt: now,
      }),
    ),
  };
}
