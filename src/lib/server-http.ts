import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { publicIP, safeURL } from './url';
// Pin the validated DNS address to the actual socket. Never follow redirects.
export async function safeGet(input: string, kind: 'html' | 'robots' = 'html'): Promise<string> {
  const u = safeURL(input);
  if (u.hostname !== 'www.startech.com.bd') throw new Error('UNSUPPORTED_SOURCE');
  const addresses = await Promise.race([
    lookup(u.hostname, { all: true }),
    new Promise<never>((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TIMEOUT')), 3000);
      timer.unref();
    }),
  ]).catch(() => {
    throw new Error('SOURCE_BLOCKED');
  });
  if (!addresses.length || addresses.some((a) => !publicIP(a.address)))
    throw new Error('SOURCE_BLOCKED');
  const a = addresses[0];
  return new Promise((resolve, reject) => {
    const req = https.get(
      u,
      {
        headers: {
          'User-Agent': 'DealScope/0.1 (user-requested product comparison)',
          Accept: kind === 'robots' ? 'text/plain' : 'text/html',
        },
        family: a.family,
        lookup: (_hostname, options, cb) => cb(null, options.all ? [a] : a.address, a.family),
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(res.statusCode === 429 ? 'SOURCE_RATE_LIMITED' : 'SOURCE_BLOCKED'));
          return;
        }
        if (
          !(kind === 'robots' ? /text\/plain/ : /text\/html/).test(
            String(res.headers['content-type']),
          )
        ) {
          res.destroy();
          reject(new Error('UNSUPPORTED_SOURCE'));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 1_500_000) {
            res.destroy();
            reject(new Error('SOURCE_BLOCKED'));
          } else chunks.push(chunk);
        });
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', () => reject(new Error('SOURCE_BLOCKED')));
      },
    );
    const timer = setTimeout(() => req.destroy(new Error('TIMEOUT')), 8000);
    req.on('close', () => clearTimeout(timer));
    req.on('error', () => reject(new Error('SOURCE_BLOCKED')));
  });
}
