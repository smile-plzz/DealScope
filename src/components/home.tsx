/* eslint-disable react-hooks/set-state-in-effect -- Hydrate browser-only storage after SSR; bounded once per mount/id. */
'use client';
import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Link2,
  ImagePlus,
  Text,
  ArrowRight,
  MapPin,
  Search,
  Check,
  Layers,
  ShieldCheck,
  ArrowUpRight,
  LoaderCircle,
} from 'lucide-react';
import { type Intent } from '@/lib/schema';
import { storeSession, loadSessions, preferences } from '@/lib/storage';
import { demoSession } from '@/lib/demo';
export async function post(path: string, body: unknown) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message || 'Unable to finish this request. Try again.');
  return data;
}
export function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'text' | 'url' | 'image'>('text');
  const [input, setInput] = useState('');
  const [image, setImage] = useState('');
  const [fileName, setFileName] = useState('');
  const [area, setArea] = useState('Dhaka city');
  const [ai, setAI] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [intent, setIntent] = useState<Intent>();
  const [requirements, setRequirements] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [recent, setRecent] = useState<ReturnType<typeof loadSessions>>([]);
  useEffect(() => {
    setArea(preferences().area);
    setRecent(loadSessions().slice(0, 3));
  }, []);
  async function identify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const r = await post('/api/identify', {
        inputType: mode,
        text: mode === 'text' ? input : undefined,
        url: mode === 'url' ? input : undefined,
        image: mode === 'image' ? image : undefined,
        useAI: ai,
        consent: ai,
      });
      setMessage(r.message || '');
      if (r.intent) {
        setIntent(r.intent);
        setRequirements(r.intent.mustMatch.join(', '));
        setExclusions(r.intent.excludedFeatures.join(', '));
      } else if (r.needsDescription) {
        setMode('text');
        setInput('');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function selectImage(file: File | undefined) {
    setMessage('');
    setImage('');
    setFileName('');
    if (!file) return;
    if (
      file.size > 8 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      setMessage('Choose a JPEG, PNG or WebP image up to 8 MB.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 20_000_000) {
        bitmap.close();
        throw new Error('Please choose an image under 20 megapixels.');
      }
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      canvas.width = bitmap.width * scale;
      canvas.height = bitmap.height * scale;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const data = canvas.toDataURL('image/jpeg', 0.8);
      if (data.length > 3_300_000)
        throw new Error('Image is too large after resizing. Please crop it.');
      setImage(data);
      setFileName(file.name);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'This image could not be decoded.');
    }
  }
  async function start(e: FormEvent) {
    e.preventDefault();
    if (!intent) return;
    setBusy(true);
    setMessage('');
    try {
      const i = {
        ...intent,
        mustMatch: requirements
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        excludedFeatures: exclusions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const r = await post('/api/search', { productIntent: i, deliveryArea: area, urls: [] });
      storeSession({
        id: r.id,
        createdAt: new Date().toISOString(),
        intent: i,
        deliveryArea: area,
        offers: r.offers,
        saved: false,
        demo: false,
        notices: r.notices,
      });
      router.push('/results/' + r.id);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'Could not save this comparison. Check browser storage.',
      );
      setBusy(false);
    }
  }
  function demo() {
    try {
      const s = demoSession();
      storeSession(s);
      router.push('/results/' + s.id);
    } catch {
      setMessage('Browser storage is unavailable. Enable site storage to continue.');
    }
  }
  return (
    <div className="home">
      <div className="eyebrow">
        <span className="tiny-line" /> BUY BETTER, NOT JUST CHEAPER
      </div>
      <div className="hero-row">
        <div>
          <h1>
            The right product.
            <br />
            <span>A clearer choice.</span>
          </h1>
          <p className="hero-copy">
            From “where can I find this?” to a confident comparison.
            <br className="desktop" /> Bring a link, a screenshot, or simply an idea.
          </p>
        </div>
        <div className="hero-stamp">
          <ScanMark />
          <span>
            YOUR NEXT PURCHASE,
            <br />
            WITH PERSPECTIVE.
          </span>
        </div>
      </div>
      <div className="search-layout">
        <section className="search-panel" aria-label="Product search">
          <div className="section-top">
            <h2>{intent ? 'Let’s make sure it’s the right one.' : 'What are you looking for?'}</h2>
            <span className="step">{intent ? '02' : '01'} / 03</span>
          </div>
          {!intent ? (
            <>
              <div className="input-tabs" role="group" aria-label="Input method">
                {(
                  [
                    { id: 'text', label: 'Describe it', icon: Text },
                    { id: 'url', label: 'Paste a link', icon: Link2 },
                    { id: 'image', label: 'Upload an image', icon: ImagePlus },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    type="button"
                    aria-pressed={mode === id}
                    className={mode === id ? 'selected' : ''}
                    key={id}
                    onClick={() => {
                      setMode(id);
                      setInput('');
                      setMessage('');
                    }}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                ))}
              </div>
              <form onSubmit={identify}>
                {mode === 'image' ? (
                  <label className="upload">
                    <ImagePlus size={30} />
                    <strong>{fileName || 'Drop in a little inspiration'}</strong>
                    <span>Choose a screenshot or product photo · JPEG, PNG, WebP · up to 8 MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => selectImage(e.target.files?.[0])}
                    />
                  </label>
                ) : (
                  <label className="input-label">
                    <span className="sr-only">
                      {mode === 'url' ? 'Product or Facebook URL' : 'Product description'}
                    </span>
                    <textarea
                      required
                      minLength={2}
                      maxLength={2000}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        mode === 'url'
                          ? 'https://… Paste a product page or Facebook Reel link'
                          : 'e.g. Anker Soundcore R50i, black, new with warranty'
                      }
                      rows={4}
                    />
                  </label>
                )}
                <div className="search-meta">
                  <label className="area">
                    <MapPin size={16} />
                    <span className="sr-only">Delivery area</span>
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    />
                  </label>
                  <span>Prices in ৳ BDT</span>
                </div>
                <label className="check consent">
                  <input type="checkbox" checked={ai} onChange={(e) => setAI(e.target.checked)} />
                  Use AI to identify this product. I agree to send this{' '}
                  {mode === 'image' ? 'image' : 'text'} to Mistral.
                </label>
                <button className="primary full" disabled={busy || (mode === 'image' && !image)}>
                  {busy ? <LoaderCircle className="spin" size={19} /> : <Search size={19} />}{' '}
                  {busy ? 'Identifying product…' : 'Start my comparison'}
                  <ArrowRight size={18} />
                </button>
              </form>
              <p className="micro">
                <ShieldCheck size={14} />
                No account needed. You stay in control.
              </p>
            </>
          ) : (
            <form onSubmit={start} className="intent-form">
              <p className="muted">
                Confirm the identity before comparing. AI suggestions are not verified
                specifications.
              </p>
              <label>
                Product name
                <input
                  required
                  minLength={2}
                  maxLength={500}
                  value={intent.query}
                  onChange={(e) => setIntent({ ...intent, query: e.target.value })}
                />
              </label>
              <div className="form-grid">
                <label>
                  Brand
                  <input
                    maxLength={80}
                    value={intent.brand}
                    onChange={(e) => setIntent({ ...intent, brand: e.target.value })}
                  />
                </label>
                <label>
                  Model
                  <input
                    maxLength={80}
                    value={intent.model}
                    onChange={(e) => setIntent({ ...intent, model: e.target.value })}
                  />
                </label>
                <label>
                  Required variant
                  <input
                    maxLength={100}
                    placeholder="e.g. 128 GB, black"
                    value={intent.variant}
                    onChange={(e) => setIntent({ ...intent, variant: e.target.value })}
                  />
                </label>
                <label>
                  Condition
                  <select
                    value={intent.condition}
                    onChange={(e) =>
                      setIntent({ ...intent, condition: e.target.value as Intent['condition'] })
                    }
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="any">Any (rank new separately)</option>
                  </select>
                </label>
                <label>
                  Pack quantity
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={intent.quantity}
                    onChange={(e) => setIntent({ ...intent, quantity: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Delivery area
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Must include (comma separated)
                <input
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="e.g. USB-C, 65W"
                />
              </label>
              <label>
                Exclude (comma separated)
                <input
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                  placeholder="e.g. refurbished, case"
                />
              </label>
              {intent.ambiguities.length > 0 && (
                <div className="notice">
                  <strong>Please check</strong>
                  <ul>
                    {intent.ambiguities.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button className="primary full" disabled={busy}>
                {busy ? 'Preparing comparison…' : 'Confirm & find offers'}
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setIntent(undefined);
                  setMessage('');
                }}
              >
                ← Edit original input
              </button>
            </form>
          )}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
        </section>
        <aside className="context-card">
          <span className="eyebrow">MORE THAN A PRICE TAG</span>
          <h2>
            Two useful answers.
            <br />
            One better decision.
          </h2>
          <div className="answer-preview">
            <span className="answer-icon mint">৳</span>
            <div>
              <strong>The cheapest option</strong>
              <p>
                The lowest confirmed total,
                <br />
                including delivery.
              </p>
            </div>
            <Check size={16} />
          </div>
          <div className="answer-preview">
            <span className="answer-icon cream">
              <ShieldCheck size={22} />
            </span>
            <div>
              <strong>The best-value option</strong>
              <p>
                Price, product match and
                <br />
                documented assurances.
              </p>
            </div>
            <Check size={16} />
          </div>
          <div className="context-bottom">
            <span className="small-dot" /> No hidden assumptions.
            <p>
              If a delivery fee or detail is unknown,
              <br />
              we’ll say so.
            </p>
          </div>
        </aside>
      </div>
      <div className="beta-notice">
        <span className="pill">A NOTE ON THE BETA</span>
        <p>
          Start with your own seller links and offers. Automatic store-wide discovery is not
          available yet.
        </p>
        <button className="text-button" onClick={demo}>
          Try a sample comparison <ArrowUpRight size={16} />
        </button>
      </div>
      <section className="how">
        <div className="section-top">
          <h2>A little research. A lot more clarity.</h2>
          <span className="muted small">HOW IT WORKS</span>
        </div>
        <div className="how-grid">
          {[
            {
              icon: Search,
              title: 'Bring your find',
              body: 'A product name, link or screenshot. Tell us what matters to you.',
            },
            {
              icon: Layers,
              title: 'Build your shortlist',
              body: 'Add seller offers. Keep exact matches and alternatives clearly separated.',
            },
            {
              icon: ShieldCheck,
              title: 'See the whole picture',
              body: 'Compare item prices, delivery and evidence before you decide.',
            },
          ].map(({ icon: Icon, title, body }, i) => (
            <article key={title}>
              <div className="how-number">
                <Icon size={20} />
                <span>0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      {recent.length > 0 && (
        <section className="recent">
          <h2>Pick up where you left off</h2>
          {recent.map((s) => (
            <button
              className="recent-row"
              key={s.id}
              onClick={() => router.push('/results/' + s.id)}
            >
              <span>
                {s.demo ? 'Sample · ' : ''}
                {s.intent.query}
              </span>
              <span>
                {s.offers.length} offers <ArrowRight size={16} />
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
function ScanMark() {
  return (
    <div className="scan-mark">
      <span />
      <span />
      <span />
      <span />
      <Search size={34} />
    </div>
  );
}
