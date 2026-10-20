import Link from 'next/link';
export default function About() {
  return (
    <div className="prose">
      <div className="eyebrow">A CLEARER WAY TO SHOP</div>
      <div className="page-heading">
        <div>
          <h1>
            Good decisions need
            <br />
            honest information.
          </h1>
          <p>DealScope · Bangladesh Shopping Intelligence · v0.1.0-beta.1</p>
        </div>
      </div>
      <div className="panel">
        <h2>Built for your next purchase</h2>
        <p>
          Bring a product, collect seller offers, and compare the details that matter. We show both
          the cheapest confirmed delivered option and the best value when the evidence supports
          them.
        </p>
        <p>
          Created for Bangladesh by{' '}
          <a href="https://github.com/smile-plzz" target="_blank" rel="noopener noreferrer">
            Ismail Hossain
          </a>
          .{' '}
          <a
            href="https://github.com/smile-plzz/DealScope"
            target="_blank"
            rel="noopener noreferrer"
          >
            View the project on GitHub ↗
          </a>
        </p>
      </div>
      <h2>What this beta can and cannot do</h2>
      <p>
        Manual comparison works without an account or AI key. Automated store-wide discovery is not
        available. Search links open external searches; snippets are leads, not verified offers. A
        disabled-by-default Star Tech structured-data extractor is available to operators after
        access-policy review. No live seller coverage is claimed.
      </p>
      <p>
        We cannot watch arbitrary Facebook Reels or access private pages. Use a screenshot or
        description instead. We never bypass logins, CAPTCHAs or website access controls.
      </p>
      <p>
        Manual entries are unverified. Unknown fees are never treated as zero. Prices older than one
        hour are stale. Confirm availability, condition, warranty and all fees with the seller
        before buying. There is no checkout or payment service here.
      </p>
      <h2>Privacy</h2>
      <p>
        Comparisons and settings are saved in this browser. History expires from the interface after
        30 days and is pruned on the next save. Delete it immediately from{' '}
        <Link href="/history">History</Link>. Shared-device users can see local history. Exported
        files are your responsibility.
      </p>
      <p>
        Only when you explicitly opt in, the submitted text or resized image is sent through our
        server to Mistral for identification. Images are decoded, resized and re-encoded without
        EXIF metadata, and are not persisted by DealScope. Mistral processes submissions under its
        own policies. Avoid uploading personal or sensitive information.
      </p>
      <p>
        API requests process submitted fields transiently. The server caches public extracted offer
        data for up to one hour, with a 100-entry limit. Rate limiting uses a salted, hashed network
        identifier held in memory for one minute. Hosting providers may keep infrastructure logs
        under their policies. We do not add analytics, advertising cookies or tracking pixels.
      </p>
      <h2>Independent by design</h2>
      <p>
        DealScope is not affiliated with or endorsed by sellers, Facebook or Mistral. There are no
        affiliate commissions in this release. Seller images are not rehosted. Value scores describe
        the available evidence, not a guarantee of seller reliability.
      </p>
      <h2>Install and offline use</h2>
      <p>
        Use your browser’s “Add to Home Screen” or install option where supported. An offline help
        page is available; identification and extraction require an internet connection. Your local
        comparisons return when you reconnect.
      </p>
      <h2>Need help?</h2>
      <p>
        Check <Link href="/diagnostics">System status</Link>. If AI is unavailable, type the product
        name and continue manually. Report reproducible problems on the project’s GitHub page
        without including API keys or personal data.
      </p>
    </div>
  );
}
