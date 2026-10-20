import ipaddr from 'ipaddr.js';
export function publicIP(ip: string) {
  try {
    const a = ipaddr.process(ip);
    return a.range() === 'unicast';
  } catch {
    return false;
  }
}
export function safeURL(input: string): URL {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw new Error('INVALID_INPUT');
  }
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    (u.port && u.port !== '443') ||
    !host.includes('.') ||
    /\.(localhost|local|internal|test|invalid)$/.test(host) ||
    host === 'localhost' ||
    (ipaddr.isValid(host) && !publicIP(host))
  )
    throw new Error('INVALID_INPUT');
  u.hash = '';
  for (const key of [...u.searchParams.keys()])
    if (key.startsWith('utm_') || ['fbclid', 'gclid'].includes(key)) u.searchParams.delete(key);
  return u;
}
export function isFacebook(u: URL) {
  return ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.watch'].includes(u.hostname);
}
