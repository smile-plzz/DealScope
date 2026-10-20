import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { safeURL } from './url';
import { safeGet } from './server-http';
import { parseBDT } from './comparison';
import { offerSchema, type Offer } from './schema';
const cache = new Map<string, { expires: number; offer: Offer }>();
let blockedUntil = 0;
export function parseProduct(
  html: string,
  url: string,
  now = new Date().toISOString(),
): Offer | null {
  const $ = load(html);
  const products: Record<string, unknown>[] = [];
  function walk(x: unknown) {
    if (Array.isArray(x)) {
      x.forEach(walk);
      return;
    }
    if (!x || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    if (o['@type'] === 'Product' || (Array.isArray(o['@type']) && o['@type'].includes('Product')))
      products.push(o);
    if (o['@graph']) walk(o['@graph']);
  }
  $('script[type="application/ld+json"]').each((_i, e) => {
    try {
      walk(JSON.parse($(e).text()));
    } catch {
      /* invalid metadata ignored */
    }
  });
  if (products.length !== 1) return null;
  const p = products[0];
  const os = Array.isArray(p.offers) ? p.offers : [p.offers];
  // Multiple variants / aggregate prices are deliberately not treated as a single purchasable offer.
  if (os.length !== 1 || !os[0] || typeof os[0] !== 'object') return null;
  const o = os[0] as Record<string, unknown>;
  if (o['@type'] !== 'Offer' || o.priceCurrency !== 'BDT') return null;
  const price = parseBDT(o.price);
  if (price === undefined || typeof p.name !== 'string') return null;
  const stock =
    o.availability === 'https://schema.org/InStock' ||
    o.availability === 'http://schema.org/InStock'
      ? 'in-stock'
      : String(o.availability).endsWith('/OutOfStock')
        ? 'out-of-stock'
        : 'unknown';
  const fields = { title: p.name, priceBDT: String(price), stock };
  return offerSchema.parse({
    id: crypto.randomUUID(),
    sellerName: 'Star Tech',
    title: p.name,
    productUrl: url,
    priceBDT: price,
    stock,
    brand:
      typeof p.brand === 'object' && p.brand
        ? String((p.brand as Record<string, unknown>).name ?? '')
        : typeof p.brand === 'string'
          ? p.brand
          : '',
    model: typeof p.model === 'string' ? p.model : '',
    condition: String(o.itemCondition || p.itemCondition).endsWith('/NewCondition')
      ? 'new'
      : 'unknown',
    sourceType: 'seller-page',
    observedAt: now,
    evidence: Object.entries(fields).map(([field, value]) => ({
      field,
      value,
      sourceUrl: url,
      observedAt: now,
    })),
  });
}
export async function extractOffer(input: string): Promise<Offer | null> {
  const u = safeURL(input);
  if (process.env.STARTECH_EXTRACTION_ENABLED !== 'true' || u.hostname !== 'www.startech.com.bd')
    throw new Error('UNSUPPORTED_SOURCE');
  if (
    u.search ||
    u.pathname.includes('/product/search') ||
    u.pathname === '/' ||
    u.pathname.length > 300
  )
    throw new Error('UNSUPPORTED_SOURCE');
  if (Date.now() < blockedUntil) throw new Error('SOURCE_RATE_LIMITED');
  const hit = cache.get(u.href);
  if (hit && hit.expires > Date.now()) return hit.offer;
  try {
    const robots = await safeGet(u.origin + '/robots.txt', 'robots');
    if (robotsParser(u.origin + '/robots.txt', robots).isAllowed(u.href, 'DealScope') !== true)
      throw new Error('SOURCE_BLOCKED');
    const result = parseProduct(await safeGet(u.href), u.href);
    if (result) {
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(u.href, { expires: Date.now() + 3600_000, offer: result });
    }
    return result;
  } catch (e) {
    blockedUntil = Date.now() + 60_000;
    throw e;
  }
}
