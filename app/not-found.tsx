import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Nothing here yet.</h1>
      <p>This page could not be found.</p>
      <Link className="primary" href="/">
        Back to DealScope
      </Link>
    </div>
  );
}
