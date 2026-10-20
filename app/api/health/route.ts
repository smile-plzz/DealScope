import { aiReady } from '@/lib/ai/client';
import { ok } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  return ok({
    version: '0.1.0-beta.1',
    status: 'limited-beta',
    ai: {
      text: aiReady() ? 'configured-not-verified' : 'unavailable',
      vision: aiReady(true) ? 'configured-not-verified' : 'unavailable',
    },
    adapters: {
      manual: 'available',
      startech:
        process.env.STARTECH_EXTRACTION_ENABLED === 'true' ? 'opt-in-unverified' : 'disabled',
      discovery: 'manual-search-leads',
    },
    storage: 'browser-local',
    rateLimits: 'per-instance; not a distributed budget',
  });
}
