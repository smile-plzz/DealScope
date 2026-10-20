import { readBody, ok, fail } from '@/lib/api';
import { searchSchema } from '@/lib/schema';
import { extractOffer } from '@/lib/extraction';
import { deduplicate } from '@/lib/comparison';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function POST(req: Request) {
  try {
    const b = searchSchema.parse(await readBody(req, 30000));
    const results = await Promise.allSettled(b.urls.map(extractOffer));
    const offers = deduplicate(
      results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : [])),
    );
    return ok({
      id: crypto.randomUUID(),
      status: 'complete',
      offers,
      outcomes: results.map((r, index) => ({
        url: b.urls[index],
        status: r.status === 'fulfilled' && r.value ? 'extracted' : 'unavailable',
      })),
      notices: [
        'Limited beta: automatic store-wide search is not available. Open a search lead or add seller links.',
        ...(!offers.length
          ? ['No verified offers found yet. Try another query or add a seller link.']
          : []),
      ],
    });
  } catch (e) {
    return fail(e);
  }
}
