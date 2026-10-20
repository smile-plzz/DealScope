import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, it, expect, vi } from 'vitest';
const { dns, get } = vi.hoisted(() => ({ dns: vi.fn(), get: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup: dns }));
vi.mock('node:https', () => ({ default: { get } }));
import { safeGet } from '../../src/lib/server-http';
function serve(status = 200, body = '<html>safe</html>', contentType = 'text/html') {
  const req = Object.assign(new EventEmitter(), { destroy: vi.fn() });
  get.mockImplementation((_url, _options, callback) => {
    const res = Object.assign(new PassThrough(), {
      statusCode: status,
      headers: { 'content-type': contentType, location: 'https://127.0.0.1/private' },
    });
    queueMicrotask(() => {
      callback(res);
      res.end(body);
      req.emit('close');
    });
    return req;
  });
}
beforeEach(() => {
  dns.mockReset();
  get.mockReset();
  dns.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
});
it('pins the checked address and disables alternate family resolution', async () => {
  serve();
  await expect(safeGet('https://www.startech.com.bd/product')).resolves.toBe('<html>safe</html>');
  const options = get.mock.calls[0][1];
  const callback = vi.fn();
  options.lookup('www.startech.com.bd', {}, callback);
  expect(callback).toHaveBeenCalledWith(null, '8.8.8.8', 4);
  expect(options.family).toBe(4);
  const allCallback = vi.fn();
  options.lookup('www.startech.com.bd', { all: true }, allCallback);
  expect(allCallback).toHaveBeenCalledWith(null, [{ address: '8.8.8.8', family: 4 }], 4);
  expect(dns).toHaveBeenCalledTimes(1);
});
it('rejects private and mixed DNS answers before opening a socket', async () => {
  dns.mockResolvedValue([
    { address: '8.8.8.8', family: 4 },
    { address: '127.0.0.1', family: 4 },
  ]);
  await expect(safeGet('https://www.startech.com.bd/product')).rejects.toThrow('SOURCE_BLOCKED');
  expect(get).not.toHaveBeenCalled();
});
it('rejects redirects instead of fetching private redirect target', async () => {
  serve(302);
  await expect(safeGet('https://www.startech.com.bd/product')).rejects.toThrow('SOURCE_BLOCKED');
  expect(get).toHaveBeenCalledTimes(1);
});
it('backs off on HTTP 429', async () => {
  serve(429);
  await expect(safeGet('https://www.startech.com.bd/product')).rejects.toThrow(
    'SOURCE_RATE_LIMITED',
  );
});
it('rejects oversized and non-HTML content', async () => {
  serve(200, 'x', 'application/octet-stream');
  await expect(safeGet('https://www.startech.com.bd/product')).rejects.toThrow(
    'UNSUPPORTED_SOURCE',
  );
  serve(200, 'x'.repeat(1_500_001));
  await expect(safeGet('https://www.startech.com.bd/product')).rejects.toThrow('SOURCE_BLOCKED');
});
