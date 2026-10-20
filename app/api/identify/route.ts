import { z } from 'zod';
import { readBody, ok, fail } from '@/lib/api';
import { intentSchema } from '@/lib/schema';
import { identifyAI } from '@/lib/ai/client';
import { safeURL, isFacebook } from '@/lib/url';
import { extractOffer } from '@/lib/extraction';
export const runtime = 'nodejs';
export const maxDuration = 40;
const schema = z.object({
  inputType: z.enum(['text', 'url', 'image']),
  text: z.string().max(2000).optional(),
  url: z.string().max(2000).optional(),
  image: z.string().max(3_400_000).optional(),
  useAI: z.boolean().default(false),
  consent: z.boolean().default(false),
});
export async function POST(req: Request) {
  try {
    const b = schema.parse(await readBody(req));
    let text = b.text?.trim() || '';
    if (b.inputType === 'url') {
      const u = safeURL(b.url || '');
      if (isFacebook(u))
        return ok({
          needsDescription: true,
          message:
            "We couldn't identify the product from this Reel. Add a screenshot or description.",
        });
      const o = await extractOffer(u.href);
      if (!o) throw new Error('UNSUPPORTED_SOURCE');
      text = o.title;
    }
    if (b.inputType === 'image' && !b.image) throw new Error('INVALID_INPUT');
    if (b.inputType !== 'image' && text.length < 2) throw new Error('INVALID_INPUT');
    if (b.useAI && b.consent) {
      try {
        return ok({
          intent: await identifyAI(text, b.inputType === 'image' ? b.image : undefined),
          mode: 'ai',
          message: 'AI suggestions require your confirmation.',
        });
      } catch (e) {
        if (b.inputType === 'image') throw e;
        return ok({
          intent: intentSchema.parse({ query: text.slice(0, 500) }),
          mode: 'manual',
          message:
            e instanceof Error && e.message === 'AI_RATE_LIMITED'
              ? 'AI request limit reached. Continue manually.'
              : 'AI identification is unavailable. Review the product manually.',
        });
      }
    }
    if (b.inputType === 'image')
      return ok({
        needsDescription: true,
        message: 'Enable AI with consent, or describe the screenshot to continue.',
      });
    return ok({
      intent: intentSchema.parse({ query: text.slice(0, 500) }),
      mode: 'manual',
      message: 'Review the product and add specific requirements.',
    });
  } catch (e) {
    return fail(e);
  }
}
