/* eslint-disable react-hooks/set-state-in-effect -- Hydrate browser-only storage after SSR; bounded once per mount/id. */
'use client';
import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  ArrowUpRight,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { type Session, type Offer } from '@/lib/schema';
import { loadSessions, storeSession } from '@/lib/storage';
import { compare, bdt, rangeTotal, deduplicate } from '@/lib/comparison';
import { safeURL } from '@/lib/url';
import { post } from './home';
export function Results({ id }: { id: string }) {
  const [session, setSession] = useState<Session>();
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [exact, setExact] = useState(false);
  const [budget, setBudget] = useState('');
  const [condition, setCondition] = useState('all');
  const [warranty, setWarranty] = useState(false);
  const [brand, setBrand] = useState('');
  const [areaDraft, setAreaDraft] = useState('');
  useEffect(() => {
    const s = loadSessions().find((x) => x.id === id);
    setSession(s);
    setAreaDraft(s?.deliveryArea || 'Dhaka city');
    setLoaded(true);
  }, [id]);
  function update(s: Session) {
    try {
      storeSession(s);
      setSession(s);
    } catch {
      setNotice('Your changes could not be saved. Browser storage may be full or disabled.');
    }
  }
  async function refresh() {
    if (!session) return;
    setBusy(true);
    try {
      const urls = session.offers
        .filter((o) => o.sourceType === 'seller-page')
        .map((o) => o.productUrl)
        .slice(0, 3);
      if (!urls.length) {
        setNotice(
          'No automatically extracted offers to refresh. Re-check your seller pages, then remove and re-add updated manual offers.',
        );
        return;
      }
      const r = await post('/api/search', {
        productIntent: session.intent,
        deliveryArea: session.deliveryArea,
        urls,
      });
      update({ ...session, offers: deduplicate([...session.offers, ...r.offers]) });
      setNotice(
        `Refreshed ${r.offers.length} of ${urls.length} source pages. Other evidence keeps its original timestamp.`,
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Refresh failed.');
    } finally {
      setBusy(false);
    }
  }
  function download() {
    if (!session) return;
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dealscope-comparison.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!loaded)
    return (
      <div className="panel" role="status">
        Opening your comparison…
      </div>
    );
  if (!session)
    return (
      <div className="empty">
        <Search />
        <h1>Comparison not found</h1>
        <p>
          This comparison may have been deleted, expired after 30 days, or created in another
          browser.
        </p>
        <Link className="primary" href="/">
          Start a comparison
        </Link>
      </div>
    );
  const all = compare(session.intent, session.offers, session.deliveryArea);
  const filtered = session.offers.filter(
    (o) =>
      (!exact || all.rows.find((r) => r.id === o.id)?.match === 'exact') &&
      (!budget || (o.priceBDT !== undefined && o.priceBDT <= Number(budget))) &&
      (condition === 'all' || o.condition === condition) &&
      (!warranty || !!o.warrantyText) &&
      (!brand || o.brand.toLowerCase().includes(brand.toLowerCase())),
  );
  const result = compare(session.intent, filtered, session.deliveryArea);
  const cheapest = result.rows.find((o) => o.id === result.cheapestId);
  const value = result.rows.find((o) => o.id === result.bestValueId);
  const provisional = result.rows.find((o) => o.id === result.manualLowestId);
  const leads = [
    [
      'Search the web',
      'https://www.google.com/search?q=' +
        encodeURIComponent(session.intent.query + ' Bangladesh price'),
    ],
    [
      'Daraz listings',
      'https://www.google.com/search?q=' +
        encodeURIComponent('site:daraz.com.bd ' + session.intent.query),
    ],
    [
      'Star Tech listings',
      'https://www.google.com/search?q=' +
        encodeURIComponent('site:startech.com.bd ' + session.intent.query),
    ],
  ];
  return (
    <>
      <Link href="/" className="text-button">
        ← Find another product
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            YOUR COMPARISON · {session.demo ? 'ILLUSTRATIVE SAMPLE' : 'LIMITED BETA'}
          </div>
          <h1>{session.intent.query}</h1>
          <p>
            {session.intent.condition} · quantity {session.intent.quantity} · {session.deliveryArea}{' '}
            · {session.offers.length} collected offers
          </p>
        </div>
        <div className="actions">
          <button
            className="secondary"
            onClick={() => update({ ...session, saved: !session.saved })}
          >
            <Bookmark size={15} />
            {session.saved ? 'Saved' : 'Save'}
          </button>
          <button className="secondary" onClick={download}>
            <Download size={15} />
            Export
          </button>
        </div>
      </div>
      {session.demo ? (
        <div className="notice">
          <strong>Illustrative sample only.</strong> Fictional offers show how uncertain shipping
          affects a comparison. No live prices, verified winners or purchase links.
        </div>
      ) : (
        <div className="notice success">
          {session.notices[0]} Search snippets are leads, not price verification.
        </div>
      )}
      <form
        className="actions"
        onSubmit={(e) => {
          e.preventDefault();
          update({ ...session, deliveryArea: areaDraft });
          setNotice(
            'Delivery area changed. Existing shipping quotes only apply to their original area.',
          );
        }}
      >
        <label className="area">
          Deliver to{' '}
          <input
            aria-label="Comparison delivery area"
            required
            minLength={2}
            maxLength={100}
            value={areaDraft}
            onChange={(e) => setAreaDraft(e.target.value)}
          />
        </label>
        <button className="secondary">Update area</button>
        <button type="button" className="secondary" disabled={busy} onClick={refresh}>
          <RefreshCw size={13} />
          Refresh evidence
        </button>
      </form>
      <div className="result-summary">
        <article className="winner">
          <div className="eyebrow">৳ CHEAPEST CONFIRMED DELIVERED</div>
          {cheapest ? (
            <>
              <h2>{cheapest.sellerName}</h2>
              <div className="amount">{bdt(cheapest.total)}</div>
              <p>Lowest confirmed delivered total among these eligible offers.</p>
            </>
          ) : (
            <>
              <h2>Not enough evidence yet</h2>
              <p>
                {result.note} We need a comparable product, current stock, and evidenced delivery
                and mandatory fees.
              </p>
              {provisional && (
                <p>
                  <strong>Lowest user-entered total: {bdt(provisional.total)}</strong>
                  <br />
                  {provisional.sellerName} · unverified, based on your entries.
                </p>
              )}
            </>
          )}
        </article>
        <article className="winner">
          <div className="eyebrow">
            <ShieldCheck size={14} /> BEST VALUE
          </div>
          {value ? (
            <>
              <h2>{value.sellerName}</h2>
              <div className="amount">
                {bdt(value.priceBDT)} <span className="small">ITEM PRICE</span>
              </div>
              <p>{result.scores.find((s) => s.id === value.id)?.explanation}</p>
              <p>
                {value.total === undefined
                  ? 'Delivery is unknown; value ranking is provisional.'
                  : 'Confirm all costs before purchasing.'}
              </p>
            </>
          ) : (
            <>
              <h2>Value needs more than a price</h2>
              <p>
                No evidence-backed recommendation yet. Add matching offers with documented warranty,
                returns and current prices.
              </p>
            </>
          )}
          <details>
            <summary>How we weigh value</summary>
            <p>
              Total cost 35%, match 30%, warranty/returns 15%, seller assurance 10%, freshness 10%.
              Missing evidence earns no points. Manual and demo offers cannot become verified
              winners. Seller assurance is currently unscored.
            </p>
          </details>
        </article>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="results-layout">
        <section>
          <div className="section-top">
            <h2>Your shortlist</h2>
            <span className="muted small">
              {filtered.length} OF {session.offers.length} OFFERS
            </span>
          </div>
          <div className="filters">
            <label>
              Match
              <select
                value={exact ? 'exact' : 'all'}
                onChange={(e) => setExact(e.target.value === 'exact')}
              >
                <option value="all">All matches</option>
                <option value="exact">Exact only</option>
              </select>
            </label>
            <label>
              Max item price
              <input
                type="number"
                min="0"
                placeholder="Any budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>
            <label>
              Condition
              <select value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="all">All conditions</option>
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </label>
            <label>
              Brand
              <input
                placeholder="Any brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={warranty}
                onChange={(e) => setWarranty(e.target.checked)}
              />
              Has warranty notes
            </label>
          </div>
          {session.offers.length === 0 && (
            <div className="empty">
              <Search size={30} />
              <h3>No verified offers found yet</h3>
              <p>
                Explore search leads, then add a seller’s product link and the details you can
                confirm.
              </p>
            </div>
          )}
          {session.offers.length > 0 && !filtered.length && (
            <div className="empty">
              <h3>No offers match these filters</h3>
              <p>Try removing a filter to see your shortlist.</p>
            </div>
          )}
          {(['exact', 'likely', 'similar', 'rejected'] as const).map((group) => {
            const rows = result.rows.filter((o) => o.match === group);
            return rows.length ? (
              <section key={group}>
                <h3 style={{ marginTop: 24 }}>
                  {group === 'exact'
                    ? 'Exact matches'
                    : group === 'likely'
                      ? 'Likely matches — check details'
                      : group === 'similar'
                        ? 'Similar alternatives'
                        : 'Excluded from recommendations'}
                </h3>
                {rows.map((o) => (
                  <OfferCard
                    key={o.id}
                    offer={o}
                    area={session.deliveryArea}
                    possible={result.possibleCheaperIds.includes(o.id)}
                    onRemove={() =>
                      update({ ...session, offers: session.offers.filter((x) => x.id !== o.id) })
                    }
                  />
                ))}
              </section>
            ) : null;
          })}
          <div className="panel" style={{ marginTop: 22 }}>
            <h2>Find more options</h2>
            <p className="offer-meta">
              These open web searches. They are not verified offers or proof of stock.
            </p>
            <div className="lead-links">
              {leads.map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer">
                  {label}
                  <ArrowUpRight size={13} />
                </a>
              ))}
            </div>
            {[...session.intent.keywordsEn, ...session.intent.keywordsBn].length > 0 && (
              <p className="offer-meta">
                Other terms to try:{' '}
                {[...session.intent.keywordsEn, ...session.intent.keywordsBn].join(' · ')}
              </p>
            )}
          </div>
        </section>
        <aside className="panel add-panel">
          <h2>Add an offer</h2>
          <p>Use a direct product page. Your entries stay labeled as unverified.</p>
          {session.demo ? (
            <>
              <p>Start your own comparison to add real seller offers.</p>
              <Link className="primary" href="/">
                Start a comparison <Plus size={15} />
              </Link>
            </>
          ) : (
            <ManualForm
              area={session.deliveryArea}
              intentTitle={session.intent.query}
              onAdd={(o) => {
                if (session.offers.length >= 50) {
                  setNotice('A comparison supports up to 50 offers. Remove an offer first.');
                  return;
                }
                update({ ...session, offers: deduplicate([...session.offers, o]) });
                setNotice('Offer added. User-entered details are unverified.');
              }}
            />
          )}
        </aside>
      </div>
    </>
  );
}
function OfferCard({
  offer: o,
  area,
  possible,
  onRemove,
}: {
  offer: ReturnType<typeof compare>['rows'][number];
  area: string;
  possible: boolean;
  onRemove: () => void;
}) {
  let href = '';
  try {
    href = safeURL(o.productUrl).href;
  } catch {}
  const range = rangeTotal(o, area);
  return (
    <article className="offer-card">
      <div className="offer-top">
        <div>
          <span className="badge">{o.match}</span>
          <span className={'badge ' + (o.sourceType === 'manual' ? 'manual' : '')}>
            {o.sourceType === 'manual'
              ? 'User-provided · unverified'
              : o.sourceType === 'demo'
                ? 'Demo · fictional'
                : 'Seller-page evidence'}
          </span>
          <h3 className="offer-title">{o.title}</h3>
          <p className="offer-meta">
            {o.sellerName} · {o.condition} · {o.stock} · pack {o.quantity}
          </p>
        </div>
        <button className="text-button" aria-label={'Remove ' + o.sellerName} onClick={onRemove}>
          <Trash2 size={15} />
        </button>
      </div>
      <dl className="offer-prices">
        <div>
          <dt>Item price</dt>
          <dd>{bdt(o.priceBDT)}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>{o.deliveryArea === area ? bdt(o.deliveryFeeBDT) : 'Unknown'}</dd>
        </div>
        <div>
          <dt>Total delivered</dt>
          <dd>
            {o.total !== undefined
              ? bdt(o.total)
              : range
                ? `${bdt(range[0])}–${bdt(range[1])}`
                : 'Unconfirmed'}
          </dd>
        </div>
      </dl>
      {possible && (
        <p className="offer-meta">
          Potentially cheaper — total unconfirmed or not independently verified.
        </p>
      )}
      {o.total === undefined && (
        <p className="offer-meta">Delivery fee or mandatory fees not confirmed for your area.</p>
      )}
      <p className="offer-meta">
        {o.sourceType === 'seller-page' ? 'Retrieved' : 'Entered'}{' '}
        {new Date(o.observedAt).toLocaleString('en-BD')} ·{' '}
        {!o.fresh ? 'Stale — recheck on seller site' : 'Within 1 hour; confirm at checkout'}
      </p>
      <details>
        <summary>View evidence & match details</summary>
        <p>{o.reasons.join('. ')}</p>
        <p>
          Warranty: {o.warrantyText || 'Unknown'}
          <br />
          Returns: {o.returnPolicyText || 'Unknown'}
          <br />
          Mandatory fees: {bdt(o.mandatoryFeesBDT)}
          <br />
          Shipping quote area: {o.deliveryArea || 'Not specified'}
        </p>
        {o.evidence.map((e) => (
          <p key={e.field}>
            {e.field}: {e.value} · {e.observedAt}
            <br />
            {e.sourceUrl}
          </p>
        ))}
        {o.sourceType === 'manual' && (
          <p>
            These details were entered by you. DealScope has not independently checked the listing.
          </p>
        )}
      </details>
      {href && o.sourceType !== 'demo' && (
        <a className="secondary" href={href} target="_blank" rel="noopener noreferrer">
          View seller page
          <ArrowUpRight size={14} />
        </a>
      )}
    </article>
  );
}
function ManualForm({
  area,
  intentTitle,
  onAdd,
}: {
  area: string;
  intentTitle: string;
  onAdd: (o: Offer) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [range, setRange] = useState(false);
  async function extract() {
    setBusy(true);
    setMessage('');
    try {
      const r = await post('/api/extract', { url });
      onAdd(r.offer);
      setMessage('Extracted the available seller-page evidence. Shipping may still be unknown.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Enter the offer manually.');
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    setBusy(true);
    setMessage('');
    try {
      const number = (key: string) =>
        d.get(key) === '' || d.get(key) === null ? undefined : Number(d.get(key));
      const r = await post('/api/offers/manual', {
        sellerName: d.get('seller'),
        title: d.get('title'),
        productUrl: url,
        priceBDT: number('price'),
        deliveryFeeBDT: number('shipping'),
        deliveryFeeMinBDT: number('minShipping'),
        deliveryFeeMaxBDT: number('maxShipping'),
        mandatoryFeesBDT: number('fees'),
        deliveryArea: area,
        brand: d.get('brand'),
        model: d.get('model'),
        variant: d.get('variant'),
        quantity: number('quantity'),
        condition: d.get('condition'),
        stock: d.get('stock'),
        warrantyText: d.get('warranty'),
        returnPolicyText: d.get('returns'),
      });
      onAdd(r.offer);
      form.reset();
      setUrl('');
      setRange(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Please check your offer.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="offer-form" onSubmit={submit}>
      <label>
        Seller product URL
        <input
          type="url"
          name="url"
          required
          maxLength={2000}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://shop.com/product"
        />
      </label>
      <button type="button" className="secondary" disabled={busy || !url} onClick={extract}>
        <RefreshCw size={13} />
        Try automatic extraction
      </button>
      <label>
        Seller name
        <input required name="seller" maxLength={100} placeholder="Name shown on the listing" />
      </label>
      <label>
        Product title
        <input required name="title" maxLength={400} defaultValue={intentTitle} />
      </label>
      <div className="form-grid">
        <label>
          Brand
          <input name="brand" maxLength={80} />
        </label>
        <label>
          Model
          <input name="model" maxLength={80} />
        </label>
      </div>
      <label>
        Variant / size
        <input name="variant" maxLength={100} placeholder="e.g. black, 128 GB" />
      </label>
      <div className="form-grid">
        <label>
          Item price (৳)
          <input type="number" name="price" min={0} max={100000000} step="0.01" required />
        </label>
        <label>
          Pack quantity
          <input type="number" name="quantity" min={1} max={1000} required defaultValue={1} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={range} onChange={(e) => setRange(e.target.checked)} />
        Delivery is a range
      </label>
      {range ? (
        <div className="form-grid">
          <label>
            Delivery min (৳)
            <input name="minShipping" type="number" min={0} max={100000000} step="0.01" required />
          </label>
          <label>
            Delivery max (৳)
            <input name="maxShipping" type="number" min={0} max={100000000} step="0.01" required />
          </label>
        </div>
      ) : (
        <label>
          Delivery to {area} (৳)
          <input
            name="shipping"
            type="number"
            min={0}
            max={100000000}
            step="0.01"
            placeholder="Leave blank if unknown"
          />
        </label>
      )}
      <label>
        Other mandatory / COD fees (৳)
        <input
          name="fees"
          type="number"
          min={0}
          max={100000000}
          step="0.01"
          placeholder="0 only if confirmed none"
        />
      </label>
      <div className="form-grid">
        <label>
          Condition
          <select name="condition" defaultValue="unknown">
            <option value="unknown">Unknown</option>
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
          </select>
        </label>
        <label>
          Availability
          <select name="stock" defaultValue="unknown">
            <option value="unknown">Unknown</option>
            <option value="in-stock">In stock</option>
            <option value="out-of-stock">Out of stock</option>
          </select>
        </label>
      </div>
      <label>
        Warranty notes
        <input name="warranty" maxLength={300} placeholder="Only what the seller states" />
      </label>
      <label>
        Return policy notes
        <input name="returns" maxLength={300} placeholder="Only what the seller states" />
      </label>
      <p>Blank fees mean unknown, never free. Confirm all costs at checkout.</p>
      <button className="primary full" disabled={busy}>
        {busy ? 'Working…' : 'Add to shortlist'}
        <Plus size={17} />
      </button>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </form>
  );
}
