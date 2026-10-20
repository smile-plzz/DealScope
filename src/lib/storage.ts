import { intentSchema, offerSchema, type Session } from './schema';
import { z } from 'zod';
const key = 'dealscope.sessions.v1';
const sessionSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  intent: intentSchema,
  deliveryArea: z.string(),
  offers: z.array(offerSchema).max(50),
  saved: z.boolean(),
  demo: z.boolean(),
  notices: z.array(z.string()),
});
export function loadSessions(): Session[] {
  try {
    const raw = z.array(sessionSchema).parse(JSON.parse(localStorage.getItem(key) || '[]'));
    return raw.filter((s) => Date.now() - Date.parse(s.createdAt) < 30 * 86400_000).slice(0, 30);
  } catch {
    return [];
  }
}
export function storeSession(s: Session) {
  localStorage.setItem(
    key,
    JSON.stringify([s, ...loadSessions().filter((x) => x.id !== s.id)].slice(0, 30)),
  );
}
export function removeSession(id: string) {
  localStorage.setItem(key, JSON.stringify(loadSessions().filter((x) => x.id !== id)));
}
export function clearSessions() {
  localStorage.removeItem(key);
}
export const preferenceKey = 'dealscope.preferences.v1';
export function preferences() {
  try {
    return z
      .object({ area: z.string().max(100), theme: z.enum(['light', 'dark', 'system']) })
      .parse(JSON.parse(localStorage.getItem(preferenceKey) || ''));
  } catch {
    return { area: 'Dhaka city', theme: 'system' as const };
  }
}
