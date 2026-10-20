import { z } from 'zod';
import { readBody, ok, fail } from '@/lib/api';
import { extractOffer } from '@/lib/extraction';
export const runtime = 'nodejs';
export const maxDuration = 25;
export async function POST(req: Request) {
  try {
    const b = z.object({ url: z.string().url().max(2000) }).parse(await readBody(req, 5000));
    const offer = await extractOffer(b.url);
    if (!offer) throw new Error('UNSUPPORTED_SOURCE');
    return ok({ offer });
  } catch (e) {
    return fail(e);
  }
}
