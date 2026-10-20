import { z } from 'zod';
import { readBody, ok, fail } from '@/lib/api';
import { intentSchema, offerSchema } from '@/lib/schema';
import { compare } from '@/lib/comparison';
import { safeURL } from '@/lib/url';
export async function POST(req: Request) {
  try {
    const b = z
      .object({
        productIntent: intentSchema,
        deliveryArea: z.string().min(2).max(100),
        offers: z.array(offerSchema).max(50),
      })
      .parse(await readBody(req, 100000));
    // Untrusted client claims cannot create server-verified evidence.
    const offers = b.offers.map((o) => ({
      ...o,
      productUrl: safeURL(o.productUrl).href,
      sourceType: 'manual' as const,
      evidence: [],
    }));
    return ok(compare(b.productIntent, offers, b.deliveryArea));
  } catch (e) {
    return fail(e);
  }
}
