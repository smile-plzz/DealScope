import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { intent } from '../fixtures/offers';
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('AI_ENABLED', 'true');
  vi.stubEnv('MISTRAL_API_KEY', 'test-not-a-real-key');
  vi.stubEnv('MISTRAL_TEXT_MODEL', 'fixture-model');
  vi.stubEnv('AI_DAILY_REQUEST_BUDGET', '20');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const good = () => Response.json({ choices: [{ message: { content: JSON.stringify(intent) } }] });
describe('Mistral client', () => {
  it('validates successful JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(good()));
    const { identifyAI } = await import('../../src/lib/ai/client');
    expect((await identifyAI('headphones')).model).toBe('A100');
  });
  it.each([401, 429, 500])('handles HTTP %s', async (code) => {
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: code }));
    vi.stubGlobal('fetch', fetch);
    const { identifyAI } = await import('../../src/lib/ai/client');
    await expect(identifyAI('headphones')).rejects.toThrow(
      code === 429 ? 'AI_RATE_LIMITED' : 'AI_UNAVAILABLE',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('handles timeout without exposing errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret detail')));
    const { identifyAI } = await import('../../src/lib/ai/client');
    await expect(identifyAI('headphones')).rejects.toThrow('AI_UNAVAILABLE');
  });
  it('repairs malformed JSON once', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'broken' } }] }))
      .mockResolvedValueOnce(good());
    vi.stubGlobal('fetch', fetch);
    const { identifyAI } = await import('../../src/lib/ai/client');
    expect((await identifyAI('headphones')).brand).toBe('Acme');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('rejects hallucinated offers and stops after two calls', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          Response.json({
            choices: [
              { message: { content: JSON.stringify({ ...intent, offers: [{ price: 5 }] }) } },
            ],
          }),
        ),
      );
    vi.stubGlobal('fetch', fetch);
    const { identifyAI } = await import('../../src/lib/ai/client');
    await expect(identifyAI('headphones')).rejects.toThrow('AI_UNAVAILABLE');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('respects a zero request budget', async () => {
    vi.stubEnv('AI_DAILY_REQUEST_BUDGET', '0');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { identifyAI } = await import('../../src/lib/ai/client');
    await expect(identifyAI('headphones')).rejects.toThrow('AI_RATE_LIMITED');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not call unavailable vision', async () => {
    vi.stubEnv('MISTRAL_VISION_MODEL', '');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { identifyAI } = await import('../../src/lib/ai/client');
    await expect(identifyAI('', 'data:image/png;base64,eA==')).rejects.toThrow('AI_UNAVAILABLE');
    expect(fetch).not.toHaveBeenCalled();
  });
});
