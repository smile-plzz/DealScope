import { describe, it, expect } from 'vitest';
import { safeURL, publicIP } from '../../src/lib/url';
import { sanitizedImage } from '../../src/lib/ai/client';
import sharp from 'sharp';
describe('URL safety', () => {
  it.each([
    'http://example.com',
    'file:///etc/passwd',
    'https://localhost',
    'https://127.0.0.1',
    'https://127.1',
    'https://0x7f000001',
    'https://[::1]',
    'https://[::ffff:127.0.0.1]',
    'https://169.254.169.254/latest/meta-data',
    'https://10.0.0.1',
    'https://192.168.1.1',
    'https://172.16.0.1',
    'https://100.64.0.1',
    'https://user:pass@example.com',
    'https://example.com:8443',
    'https://host.internal',
  ])('blocks %s', (url) => expect(() => safeURL(url)).toThrow());
  it('allows public HTTPS and removes tracking', () =>
    expect(safeURL('https://www.startech.com.bd/product?utm_source=foo').href).toBe(
      'https://www.startech.com.bd/product',
    ));
  it.each(['0.0.0.0', '224.0.0.1', '255.255.255.255', 'fe80::1', 'fc00::1', '::ffff:192.168.0.1'])(
    'blocks IP %s',
    (ip) => expect(publicIP(ip)).toBe(false),
  );
});
describe('image safety', () => {
  it('rejects spoofed content', async () =>
    expect(sanitizedImage('data:image/png;base64,PHNjcmlwdD4=')).rejects.toThrow());
  it('decodes and reencodes a genuine PNG', async () => {
    const b = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    expect(await sanitizedImage('data:image/png;base64,' + b.toString('base64'))).toMatch(
      /^data:image\/jpeg;base64,/,
    );
  });
});
