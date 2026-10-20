import { createHash, randomBytes } from 'node:crypto';
import { ZodError } from 'zod';
const salt = randomBytes(24).toString('hex');
const windows = new Map<string, { count: number; until: number }>();
export const errors: Record<string, string> = {
  INVALID_INPUT: 'Please check the fields and try again.',
  UNSUPPORTED_SOURCE:
    'Automatic extraction is unavailable for this source. Add the seller details manually.',
  SOURCE_BLOCKED: 'The source could not be accessed. Add the offer manually.',
  SOURCE_RATE_LIMITED: 'This source is temporarily paused. Please try later.',
  AI_UNAVAILABLE:
    'AI identification is temporarily unavailable. Enter the product name to continue.',
  AI_RATE_LIMITED: 'AI request limit reached. Enter the product name to continue.',
  TIMEOUT: 'The request took too long. Please try again.',
  INTERNAL_ERROR: 'Something went wrong. Your manual comparison remains available.',
};
export async function readBody(req: Request, max = 3_500_000) {
  const origin = req.headers.get('origin');
  // Next may normalize req.url to an internal localhost origin. Match the
  // browser-facing Host and the protocol supplied by the trusted ingress.
  const requestURL = new URL(req.url);
  const host = req.headers.get('host') || requestURL.host;
  const protocol = req.headers.get('x-forwarded-proto') || requestURL.protocol.slice(0, -1);
  if (origin && origin !== `${protocol}://${host}`) throw new Error('INVALID_INPUT');
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'shared';
  const key = createHash('sha256')
    .update(salt + ip)
    .digest('hex');
  const now = Date.now();
  for (const [k, v] of windows) if (v.until < now) windows.delete(k);
  if (windows.size > 5000) throw new Error('SOURCE_RATE_LIMITED');
  const w = windows.get(key) || { count: 0, until: now + 60_000 };
  if (++w.count > 30) throw new Error('SOURCE_RATE_LIMITED');
  windows.set(key, w);
  if (!req.headers.get('content-type')?.includes('application/json'))
    throw new Error('INVALID_INPUT');
  if (Number(req.headers.get('content-length')) > max) throw new Error('INVALID_INPUT');
  const reader = req.body?.getReader();
  if (!reader) throw new Error('INVALID_INPUT');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error('INVALID_INPUT');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('INVALID_INPUT');
  }
}
export function fail(error: unknown) {
  const code =
    error instanceof ZodError
      ? 'INVALID_INPUT'
      : error instanceof Error && error.message in errors
        ? error.message
        : 'INTERNAL_ERROR';
  return Response.json(
    { error: { code, message: errors[code] } },
    {
      status:
        code === 'INVALID_INPUT'
          ? 400
          : code.includes('RATE_LIMITED')
            ? 429
            : code === 'INTERNAL_ERROR'
              ? 500
              : 422,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
export const ok = (body: unknown) =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
