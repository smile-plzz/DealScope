import sharp from 'sharp';
import { intentSchema, type Intent } from '../schema';
import { identifyPrompt } from './prompts/identify';
let day = '',
  requests = 0,
  cooldown = 0;
export function aiReady(image = false) {
  return (
    process.env.AI_ENABLED === 'true' &&
    !!process.env.MISTRAL_API_KEY &&
    !!(image ? process.env.MISTRAL_VISION_MODEL : process.env.MISTRAL_TEXT_MODEL)
  );
}
export async function sanitizedImage(data: string) {
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if (!m) throw new Error('INVALID_INPUT');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > 2_500_000) throw new Error('INVALID_INPUT');
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!png && !jpg && !webp) throw new Error('INVALID_INPUT');
  try {
    const image = await sharp(bytes, { limitInputPixels: 20_000_000, animated: false })
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${image.toString('base64')}`;
  } catch {
    throw new Error('INVALID_INPUT');
  }
}
export async function identifyAI(text: string, image?: string): Promise<Intent> {
  if (!aiReady(!!image)) throw new Error('AI_UNAVAILABLE');
  if (Date.now() < cooldown) throw new Error('AI_RATE_LIMITED');
  const today = new Date().toISOString().slice(0, 10);
  if (day !== today) {
    day = today;
    requests = 0;
  }
  const configured = Number(process.env.AI_DAILY_REQUEST_BUDGET ?? 20);
  const budget = Number.isFinite(configured) ? Math.min(1000, Math.max(0, configured)) : 0;
  const cleaned = image ? await sanitizedImage(image) : undefined;
  const timeout = Math.min(
    15000,
    Math.max(1000, Number(process.env.AI_REQUEST_TIMEOUT_MS) || 12000),
  );
  for (let attempt = 0; attempt < 2; attempt++) {
    if (requests >= budget) throw new Error('AI_RATE_LIMITED');
    requests++;
    let res: Response;
    try {
      res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(timeout),
        headers: {
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: cleaned ? process.env.MISTRAL_VISION_MODEL : process.env.MISTRAL_TEXT_MODEL,
          temperature: 0,
          max_tokens: 700,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                identifyPrompt +
                (attempt ? ' Previous output was invalid. Follow the JSON schema exactly.' : ''),
            },
            {
              role: 'user',
              content: cleaned
                ? [
                    { type: 'text', text: text || 'Identify this product; state uncertainty.' },
                    { type: 'image_url', image_url: cleaned },
                  ]
                : text,
            },
          ],
        }),
      });
    } catch {
      throw new Error('AI_UNAVAILABLE');
    }
    if (res.status === 429) {
      cooldown = Date.now() + 60_000;
      throw new Error('AI_RATE_LIMITED');
    }
    if (!res.ok) {
      if (res.status >= 500) cooldown = Date.now() + 30_000;
      throw new Error('AI_UNAVAILABLE');
    }
    try {
      const json = await res.json();
      return intentSchema.strict().parse(JSON.parse(json.choices[0].message.content));
    } catch {
      if (attempt === 1) throw new Error('AI_UNAVAILABLE');
    }
  }
  throw new Error('AI_UNAVAILABLE');
}
