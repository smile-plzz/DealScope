import { describe, it, expect } from 'vitest';
import {
  parseBDT,
  matchOffer,
  total,
  rangeTotal,
  compare,
  deduplicate,
} from '../../src/lib/comparison';
import { intent, offer, now } from '../fixtures/offers';
describe('BDT parsing', () => {
  it.each(['৳1,299', 'Tk 1,299', 'BDT 1299', '১২৯৯'])('parses %s', (s) =>
    expect(parseBDT(s)).toBe(1299),
  );
  it.each(['was 2000 now 1000', '1,299–1,500', '1,29', '-1', 'Infinity', ''])(
    'rejects ambiguous %s',
    (s) => expect(parseBDT(s)).toBeUndefined(),
  );
});
describe('matching', () => {
  it('recognizes an exact model', () => expect(matchOffer(intent, offer()).match).toBe('exact'));
  it('rejects accessories', () =>
    expect(matchOffer(intent, offer({ title: 'Case for Acme A100 headphones' })).match).toBe(
      'rejected',
    ));
  it('rejects pack mismatch', () =>
    expect(matchOffer(intent, offer({ quantity: 5 })).match).toBe('rejected'));
  it('rejects used against new', () =>
    expect(matchOffer(intent, offer({ condition: 'used' })).match).toBe('rejected'));
  it('separates model numbers, not substring matches', () =>
    expect(
      matchOffer(intent, offer({ model: 'A1000', title: 'Acme A1000 headphones' })).match,
    ).toBe('similar'));
  it('does not assert exact unknown condition', () =>
    expect(matchOffer(intent, offer({ condition: 'unknown' })).match).toBe('likely'));
  it('rejects missing required size', () =>
    expect(matchOffer({ ...intent, variant: '128 GB' }, offer({ variant: '64 GB' })).match).toBe(
      'rejected',
    ));
  it('rejects required specs missing from evidence', () =>
    expect(matchOffer({ ...intent, mustMatch: ['USB-C'] }, offer()).match).toBe('rejected'));
});
describe('totals and winners', () => {
  it('counts shipping and mandatory fees', () =>
    expect(total(offer({ mandatoryFeesBDT: 25 }), 'Dhaka city')).toBe(1125));
  it('never assumes unknown shipping is free', () =>
    expect(total(offer({ deliveryFeeBDT: undefined }), 'Dhaka city')).toBeUndefined());
  it('never assumes mandatory fees are zero', () =>
    expect(total(offer({ mandatoryFeesBDT: undefined }), 'Dhaka city')).toBeUndefined());
  it('invalidates shipping after area change', () =>
    expect(total(offer(), 'Sylhet')).toBeUndefined());
  it('computes ranges without ranking a range as confirmed', () => {
    const o = offer({ deliveryFeeBDT: undefined, deliveryFeeMinBDT: 60, deliveryFeeMaxBDT: 120 });
    expect(rangeTotal(o, 'Dhaka city')).toEqual([1060, 1120]);
    expect(compare(intent, [o], 'Dhaka city', now).cheapestId).toBeUndefined();
  });
  it('selects confirmed B while showing A potentially cheaper', () => {
    const a = offer({ id: 'a', priceBDT: 900, deliveryFeeBDT: undefined });
    const b = offer({ id: 'b' });
    const r = compare(intent, [a, b], 'Dhaka city', now);
    expect(r.cheapestId).toBe('b');
    expect(r.possibleCheaperIds).toContain('a');
  });
  it.each(['manual', 'demo'] as const)('never promotes %s evidence', (sourceType) => {
    const r = compare(intent, [offer({ sourceType })], 'Dhaka city', now);
    expect(r.cheapestId).toBeUndefined();
    expect(r.bestValueId).toBeUndefined();
  });
  it('excludes stale and future timestamps', () => {
    for (const offset of [-3600001, 1])
      expect(
        compare(
          intent,
          [offer({ observedAt: new Date(now + offset).toISOString() })],
          'Dhaka city',
          now,
        ).cheapestId,
      ).toBeUndefined();
  });
  it('excludes unknown stock and out-of-stock winners', () => {
    for (const stock of ['unknown', 'out-of-stock'] as const)
      expect(compare(intent, [offer({ stock })], 'Dhaka city', now).cheapestId).toBeUndefined();
  });
  it('does not award points for missing seller assurances', () => {
    const r = compare(intent, [offer()], 'Dhaka city', now);
    expect(r.scores[0].score).toBe(75);
  });
  it('breaks ties by freshness', () => {
    const r = compare(
      intent,
      [offer({ id: 'old', observedAt: new Date(now - 1000).toISOString() }), offer({ id: 'new' })],
      'Dhaka city',
      now,
    );
    expect(r.cheapestId).toBe('new');
  });
  it('keeps most recent canonical URL', () =>
    expect(
      deduplicate([
        offer({
          id: 'old',
          productUrl: 'https://example.com/product?utm_source=ad',
          observedAt: new Date(now - 1000).toISOString(),
        }),
        offer({ id: 'new' }),
      ])[0].id,
    ).toBe('new'));
});

it('handles confirmed zero totals without NaN scores', () => {
  const r = compare(intent, [offer({ priceBDT: 0, deliveryFeeBDT: 0 })], 'Dhaka city', now);
  expect(r.scores[0].score).toBe(75);
});
it('does not rank mismatched field evidence as verified', () => {
  const o = offer();
  o.evidence[0].value = '1';
  expect(compare(intent, [o], 'Dhaka city', now).cheapestId).toBeUndefined();
});
