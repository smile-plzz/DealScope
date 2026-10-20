'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h2>We couldn’t open this page.</h2>
      <p>Your browser may be offline. Please retry; no automatic purchase has taken place.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
