import { it, expect, vi, afterEach } from 'vitest';
import { POST as identify } from '../../app/api/identify/route';
import { POST as manual } from '../../app/api/offers/manual/route';
import { POST as search } from '../../app/api/search/route';
import { POST as compare } from '../../app/api/compare/route';
import { intent, offer } from '../fixtures/offers';
const request = (body: unknown, origin = 'http://localhost:3000') =>
  new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin, 'x-forwarded-for': crypto.randomUUID() },
    body: JSON.stringify(body),
  });
afterEach(() => vi.unstubAllEnvs());
it('keeps text identification working without a key', async () => {
  vi.stubEnv('AI_ENABLED', 'false');
  const r = await identify(
    request({ inputType: 'text', text: 'Acme headphones', useAI: true, consent: true }),
  );
  expect(r.status).toBe(200);
  expect((await r.json()).mode).toBe('manual');
});
it('returns actionable Facebook fallback', async () => {
  const r = await identify(request({ inputType: 'url', url: 'https://www.facebook.com/reel/123' }));
  expect((await r.json()).needsDescription).toBe(true);
});
it('rejects cross-origin writes', async () =>
  expect(
    (await identify(request({ inputType: 'text', text: 'headphones' }, 'https://evil.example.com')))
      .status,
  ).toBe(400));
it('manual endpoint cannot create verified evidence', async () => {
  const r = await manual(request(offer()));
  const { offer: o } = await r.json();
  expect(o.sourceType).toBe('manual');
  expect(o.evidence).toEqual([]);
});
it('manual endpoint rejects unsafe links and invalid ranges', async () => {
  expect((await manual(request(offer({ productUrl: 'https://127.0.0.1' })))).status).toBe(400);
  expect(
    (await manual(request(offer({ deliveryFeeMinBDT: 100, deliveryFeeMaxBDT: 50 })))).status,
  ).toBe(400);
});
it('stateless compare distrusts client verification', async () => {
  const r = await compare(
    request({
      productIntent: intent,
      deliveryArea: 'Dhaka city',
      offers: [offer({ observedAt: new Date().toISOString() })],
    }),
  );
  const data = await r.json();
  expect(data.cheapestId).toBeUndefined();
  expect(data.bestValueId).toBeUndefined();
});
it('partial failures do not invent search offers', async () => {
  vi.stubEnv('STARTECH_EXTRACTION_ENABLED', 'false');
  const r = await search(
    request({
      productIntent: intent,
      deliveryArea: 'Dhaka city',
      urls: ['https://www.startech.com.bd/fixture', 'https://www.ryans.com/fixture'],
    }),
  );
  const data = await r.json();
  expect(data.status).toBe('complete');
  expect(data.offers).toEqual([]);
  expect(data.outcomes).toHaveLength(2);
});

it('accepts browser-facing host despite internal Next URL normalization', async () => {
  const req = new Request('http://localhost:3000/api/identify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://127.0.0.1:3000',
      host: '127.0.0.1:3000',
    },
    body: JSON.stringify({ inputType: 'text', text: 'Acme headphones' }),
  });
  expect((await identify(req)).status).toBe(200);
});
