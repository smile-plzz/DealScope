/* eslint-disable react-hooks/set-state-in-effect -- Hydrate browser-only storage after SSR; bounded once per mount/id. */
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, Trash2, Bookmark, ArrowUpRight } from 'lucide-react';
import {
  loadSessions,
  removeSession,
  clearSessions,
  preferences,
  preferenceKey,
} from '@/lib/storage';
export function HistoryPage() {
  const [items, setItems] = useState<ReturnType<typeof loadSessions>>([]);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setItems(loadSessions()), []);
  return (
    <>
      <div className="eyebrow">YOUR WORKSPACE</div>
      <div className="page-heading">
        <div>
          <h1>Your comparisons</h1>
          <p>Stored only in this browser, for up to 30 days.</p>
        </div>
        <button className="secondary" onClick={() => setConfirm(true)}>
          <Trash2 size={14} />
          Clear history
        </button>
      </div>
      {confirm && (
        <div className="notice">
          <p>Delete all saved comparisons and history from this browser?</p>
          <div className="actions">
            <button
              className="secondary"
              onClick={() => {
                clearSessions();
                setItems([]);
                setConfirm(false);
              }}
            >
              Delete all comparisons
            </button>
            <button className="text-button" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <label className="check" style={{ marginBottom: 20 }}>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        Saved only
      </label>
      {items
        .filter((s) => !saved || s.saved)
        .map((s) => (
          <article className="panel history-card" key={s.id}>
            <div>
              <h2>
                <Link href={'/results/' + s.id}>
                  {s.saved && <Bookmark size={15} />} {s.demo ? 'Sample · ' : ''}
                  {s.intent.query}
                </Link>
              </h2>
              <p>
                {s.deliveryArea} · {s.offers.length} offers ·{' '}
                {new Date(s.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="actions">
              <Link className="secondary" href={'/results/' + s.id}>
                Open <ArrowUpRight size={14} />
              </Link>
              <button
                className="secondary"
                aria-label={'Delete ' + s.intent.query}
                onClick={() => {
                  removeSession(s.id);
                  setItems(loadSessions());
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
      {!items.filter((s) => !saved || s.saved).length && (
        <div className="empty">
          <History size={30} />
          <h2>A fresh start</h2>
          <p>Your next comparison will appear here.</p>
          <Link className="primary" href="/">
            Find a product
          </Link>
        </div>
      )}
    </>
  );
}
export function SettingsPage() {
  const [area, setArea] = useState('Dhaka city');
  const [theme, setTheme] = useState('system');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const p = preferences();
    setArea(p.area);
    setTheme(p.theme);
  }, []);
  return (
    <>
      <div className="eyebrow">MAKE IT YOURS</div>
      <div className="page-heading">
        <div>
          <h1>Preferences</h1>
          <p>Small details for a more useful comparison.</p>
        </div>
      </div>
      <form
        className="panel settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            localStorage.setItem(preferenceKey, JSON.stringify({ area, theme }));
            document.documentElement.dataset.theme = theme;
            setMessage('Preferences saved.');
          } catch {
            setMessage('Browser storage is unavailable.');
          }
        }}
      >
        <label>
          Default delivery city / area
          <input
            required
            minLength={2}
            maxLength={100}
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </label>
        <p className="offer-meta">
          A city or area is enough. Please don’t enter your full home address.
        </p>
        <label>
          Appearance
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="system">Use device setting</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Currency
          <input readOnly value="BDT — Bangladeshi taka (৳)" />
        </label>
        <p className="offer-meta">
          AI is optional and requires your consent for each identification. API credentials are
          configured by the operator on the server.
        </p>
        <button className="primary">Save preferences</button>
        {message && (
          <p role="status" className="notice success">
            {message}
          </p>
        )}
      </form>
      <div className="panel prose">
        <h2>Your data, your browser</h2>
        <p>
          Comparisons are kept locally for up to 30 days. Images are not saved to history. Export a
          comparison from its result page or delete it in History.
        </p>
        <Link href="/history">Manage your history →</Link>
      </div>
    </>
  );
}
export function DiagnosticsPage() {
  const [status, setStatus] = useState<Record<string, unknown>>();
  const [message, setMessage] = useState('');
  async function check() {
    setMessage('Checking configuration…');
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      if (!r.ok) throw Error();
      setStatus(await r.json());
      setMessage('Configuration checked. This is not a live AI or seller connectivity test.');
    } catch {
      setMessage('Could not load system status. Please retry.');
    }
  }
  useEffect(() => {
    check();
  }, []);
  return (
    <>
      <div className="eyebrow">TRANSPARENCY, BUILT IN</div>
      <div className="page-heading">
        <div>
          <h1>System status</h1>
          <p>What’s available, and what still needs a little help.</p>
        </div>
        <button className="secondary" onClick={check}>
          Check again
        </button>
      </div>
      <p role="status" className="notice">
        {message}
      </p>
      <div className="panel">
        {status &&
          Object.entries(status).map(([k, v]) => (
            <div className="status-row" key={k}>
              <strong>{k}</strong>
              <span>
                {typeof v === 'object' && v
                  ? Object.entries(v).map(([a, b]) => (
                      <span key={a} style={{ display: 'block' }}>
                        {a}: {String(b)}
                      </span>
                    ))
                  : String(v)}
              </span>
            </div>
          ))}
      </div>
      <p className="offer-meta">
        No keys, private searches, raw errors or administrator controls are exposed here.
      </p>
    </>
  );
}
