import { readBody, ok, fail } from '@/lib/api';
import { offerSchema } from '@/lib/schema';
import { safeURL } from '@/lib/url';
export async function POST(req: Request) {
  try {
    const b = await readBody(req, 12000);
    const offer = offerSchema.parse({
      ...b,
      id: crypto.randomUUID(),
      sourceType: 'manual',
      observedAt: new Date().toISOString(),
      evidence: [],
    });
    offer.productUrl = safeURL(offer.productUrl).href;
    if (
      (offer.deliveryFeeMinBDT === undefined) !== (offer.deliveryFeeMaxBDT === undefined) ||
      (offer.deliveryFeeMinBDT !== undefined && offer.deliveryFeeMaxBDT! < offer.deliveryFeeMinBDT)
    )
      throw new Error('INVALID_INPUT');
    return ok({ offer });
  } catch (e) {
    return fail(e);
  }
}
