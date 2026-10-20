import type { Intent, Match, Offer } from './schema';
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const has = (text: string, value: string) =>
  (' ' + norm(text) + ' ').includes(' ' + norm(value) + ' ');
export function parseBDT(value: unknown): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) && value >= 0 && value <= 100_000_000 ? value : undefined;
  if (typeof value !== 'string') return;
  const s = value
    .replace(/[০-৯]/g, (c) => String('০১২৩৪৫৬৭৮৯'.indexOf(c)))
    .trim()
    .replace(/^(?:৳|Tk\.?|BDT)\s*/i, '');
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s)) return;
  return parseBDT(Number(s.replaceAll(',', '')));
}
export function matchOffer(i: Intent, o: Offer): { match: Match; reasons: string[] } {
  const all = [o.title, o.brand, o.model, o.variant].join(' ');
  if (i.quantity !== o.quantity) return { match: 'rejected', reasons: ['Different pack quantity'] };
  if (i.condition !== 'any' && o.condition !== 'unknown' && i.condition !== o.condition)
    return { match: 'rejected', reasons: ['Different condition'] };
  if (i.excludedFeatures.some((x) => has(all, x)))
    return { match: 'rejected', reasons: ['Contains an excluded feature'] };
  const accessory = /\b(case|cover|protector|replacement|for\s+\w+|strap)\b/i;
  if (accessory.test(o.title) && !accessory.test(i.query))
    return { match: 'rejected', reasons: ['Possible accessory rather than requested product'] };
  if (i.variant && !has(all, i.variant))
    return { match: 'rejected', reasons: ['Required variant not evidenced'] };
  if (i.mustMatch.some((x) => !has(all, x)))
    return { match: 'rejected', reasons: ['Required specification not evidenced'] };
  if (i.model && o.model && norm(i.model) !== norm(o.model))
    return { match: 'similar', reasons: ['Different model'] };
  if (i.brand && o.brand && norm(i.brand) !== norm(o.brand))
    return { match: 'similar', reasons: ['Different brand'] };
  const identity = i.brand && i.model && has(all, i.brand) && has(all, i.model);
  if (
    identity &&
    norm(o.brand) === norm(i.brand) &&
    norm(o.model) === norm(i.model) &&
    o.condition !== 'unknown'
  )
    return { match: 'exact', reasons: ['Brand, model and specified requirements match'] };
  const words = norm(i.query)
    .split(' ')
    .filter((x) => x.length > 1);
  const overlap = words.filter((x) => has(all, x)).length / Math.max(words.length, 1);
  if (identity || overlap >= 0.8)
    return {
      match: 'likely',
      reasons: ['Title matches; confirm identity and specifications with seller'],
    };
  return {
    match: 'similar',
    reasons: ['Different or insufficiently established product identity'],
  };
}
export function total(o: Offer, area: string): number | undefined {
  if (
    o.priceBDT === undefined ||
    o.deliveryFeeBDT === undefined ||
    o.mandatoryFeesBDT === undefined ||
    norm(o.deliveryArea) !== norm(area)
  )
    return;
  return Math.round((o.priceBDT + o.deliveryFeeBDT + o.mandatoryFeesBDT) * 100) / 100;
}
export function rangeTotal(o: Offer, area: string): [number, number] | undefined {
  if (
    norm(o.deliveryArea) !== norm(area) ||
    o.priceBDT === undefined ||
    o.mandatoryFeesBDT === undefined ||
    o.deliveryFeeMinBDT === undefined ||
    o.deliveryFeeMaxBDT === undefined ||
    o.deliveryFeeMinBDT > o.deliveryFeeMaxBDT
  )
    return;
  return [
    o.priceBDT + o.deliveryFeeMinBDT + o.mandatoryFeesBDT,
    o.priceBDT + o.deliveryFeeMaxBDT + o.mandatoryFeesBDT,
  ];
}
export function isFresh(o: Offer, now = Date.now()) {
  const age = now - Date.parse(o.observedAt);
  return age >= 0 && age <= 3600_000;
}
function evidenced(o: Offer, field: string) {
  return (
    o.sourceType === 'seller-page' &&
    o.evidence.some(
      (e) =>
        e.field === field &&
        e.sourceUrl === o.productUrl &&
        e.observedAt === o.observedAt &&
        e.value === String(o[field as keyof Offer]),
    )
  );
}
export function compare(intent: Intent, offers: Offer[], area: string, now = Date.now()) {
  const rows = offers.map((o) => ({
    ...o,
    ...matchOffer(intent, o),
    total: total(o, area),
    fresh: isFresh(o, now),
  }));
  const comparable = rows.filter(
    (o) =>
      ['exact', 'likely'].includes(o.match) &&
      o.stock !== 'out-of-stock' &&
      o.fresh &&
      o.condition !== 'unknown' &&
      (intent.condition !== 'any' || o.condition === 'new'),
  );
  const confirmed = comparable.filter(
    (o) =>
      o.stock === 'in-stock' &&
      o.total !== undefined &&
      ['priceBDT', 'deliveryFeeBDT', 'mandatoryFeesBDT', 'stock'].every((f) => evidenced(o, f)),
  );
  const sorted = [...confirmed].sort(
    (a, b) =>
      a.total! - b.total! ||
      (a.match === 'exact' ? 0 : 1) - (b.match === 'exact' ? 0 : 1) ||
      Date.parse(b.observedAt) - Date.parse(a.observedAt) ||
      a.id.localeCompare(b.id),
  );
  const min = sorted[0]?.total;
  const scores = comparable
    .filter((o) => evidenced(o, 'priceBDT'))
    .map((o) => {
      const cost =
        min !== undefined && o.total !== undefined && confirmed.some((c) => c.id === o.id)
          ? o.total === 0
            ? 35
            : (35 * min) / o.total
          : 0;
      const match = o.match === 'exact' ? 30 : 18;
      const policies =
        (evidenced(o, 'warrantyText') ? 7.5 : 0) + (evidenced(o, 'returnPolicyText') ? 7.5 : 0);
      // No seller assurance points without independently verified assurance evidence.
      return {
        id: o.id,
        score: Math.round((cost + match + policies + 10) * 10) / 10,
        explanation: `Cost ${cost.toFixed(1)}/35 · match ${match}/30 · policies ${policies}/15 · seller assurance 0/10 · freshness 10/10`,
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const manual = comparable
    .filter((o) => o.sourceType === 'manual' && o.total !== undefined)
    .sort((a, b) => a.total! - b.total! || a.id.localeCompare(b.id));
  return {
    rows,
    cheapestId: sorted[0]?.id,
    bestValueId: scores[0]?.id,
    scores,
    manualLowestId: manual[0]?.id,
    possibleCheaperIds: comparable
      .filter(
        (o) =>
          o.priceBDT !== undefined &&
          (o.total === undefined || !confirmed.some((c) => c.id === o.id)) &&
          (min === undefined || o.priceBDT < min),
      )
      .map((o) => o.id),
    note: sorted.length
      ? 'Lowest confirmed delivered cost among eligible collected offers.'
      : 'Cheapest delivered option cannot be verified.',
  };
}
export function deduplicate(offers: Offer[]) {
  const m = new Map<string, Offer>();
  for (const o of offers) {
    const k = new URL(o.productUrl);
    k.hash = '';
    for (const p of [...k.searchParams.keys()])
      if (p.startsWith('utm_') || ['fbclid', 'gclid'].includes(p)) k.searchParams.delete(p);
    const old = m.get(k.href);
    if (!old || Date.parse(o.observedAt) > Date.parse(old.observedAt)) m.set(k.href, o);
  }
  return [...m.values()];
}
export const bdt = (value: number | undefined) =>
  value === undefined
    ? 'Unknown'
    : new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
        maximumFractionDigits: 2,
      }).format(value);
