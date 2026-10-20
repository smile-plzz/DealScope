import { it, expect, vi, afterEach } from 'vitest';
import { parseProduct, extractOffer } from '../../src/lib/extraction';
const product = {
  '@type': 'Product',
  name: 'Fixture Acme headphones',
  offers: {
    '@type': 'Offer',
    price: '1299.00',
    priceCurrency: 'BDT',
    availability: 'https://schema.org/InStock',
  },
};
const html = (x: unknown) =>
  `<html><script type="application/ld+json">${JSON.stringify(x)}</script></html>`;
afterEach(() => vi.unstubAllEnvs());
it('extracts seller structured data without making up shipping', () => {
  const o = parseProduct(html(product), 'https://www.startech.com.bd/fixture');
  expect(o?.priceBDT).toBe(1299);
  expect(o?.deliveryFeeBDT).toBeUndefined();
  expect(o?.condition).toBe('unknown');
  expect(o?.evidence.find((e) => e.field === 'priceBDT')?.value).toBe('1299');
});
it('handles graph data', () =>
  expect(
    parseProduct(html({ '@graph': [product] }), 'https://www.startech.com.bd/fixture'),
  ).not.toBeNull());
it('rejects ambiguous variants and aggregate prices', () => {
  expect(parseProduct(html([product, product]), 'https://www.startech.com.bd/fixture')).toBeNull();
  expect(
    parseProduct(
      html({ ...product, offers: { '@type': 'AggregateOffer', lowPrice: 500 } }),
      'https://www.startech.com.bd/fixture',
    ),
  ).toBeNull();
});
it('rejects invalid and non-BDT prices', () => {
  for (const fields of [{ priceCurrency: 'USD' }, { price: 'now 1000 was 2000' }])
    expect(
      parseProduct(
        html({ ...product, offers: { ...product.offers, ...fields } }),
        'https://www.startech.com.bd/fixture',
      ),
    ).toBeNull();
});
it('fails closed when disabled or unapproved', async () => {
  vi.stubEnv('STARTECH_EXTRACTION_ENABLED', 'false');
  await expect(extractOffer('https://www.startech.com.bd/fixture')).rejects.toThrow(
    'UNSUPPORTED_SOURCE',
  );
  vi.stubEnv('STARTECH_EXTRACTION_ENABLED', 'true');
  await expect(extractOffer('https://www.ryans.com/fixture')).rejects.toThrow('UNSUPPORTED_SOURCE');
  await expect(extractOffer('https://www.startech.com.bd/product/search?search=x')).rejects.toThrow(
    'UNSUPPORTED_SOURCE',
  );
});
