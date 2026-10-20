'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  ScanLine,
  Search,
  History,
  SlidersHorizontal,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Info,
} from 'lucide-react';
import { preferences } from '@/lib/storage';
const links = [
  { href: '/', label: 'Find a product', icon: Search },
  { href: '/history', label: 'Your comparisons', icon: History },
  { href: '/settings', label: 'Preferences', icon: SlidersHorizontal },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  useEffect(() => {
    const p = preferences();
    document.documentElement.dataset.theme = p.theme;
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <ScanLine size={23} />
          </span>
          DealScope<span className="brand-dot">.</span>
        </Link>
        <div className="workspace-label">YOUR SHOPPING WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              className={'nav-link ' + (path === href ? 'active' : '')}
              aria-current={path === href ? 'page' : undefined}
              key={href}
              href={href}
            >
              <Icon size={19} />
              {label}
              {path === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-note">
            <ShieldCheck size={22} />
            <strong>A little more certainty.</strong>
            <p>
              Real sources. Clear costs.
              <br />
              No made-up deals.
            </p>
          </div>
          <Link className="nav-link" href="/diagnostics">
            <Activity size={18} />
            System status
          </Link>
          <Link className="nav-link" href="/about">
            <Info size={18} />
            About & privacy
            <ArrowUpRight size={14} />
          </Link>
          <div className="version">
            MADE FOR BANGLADESH <span>v0.1 beta</span>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>Thoughtful shopping starts here</span>
          <span className="beta">
            <span /> Limited beta
          </span>
        </header>
        <main id="main">{children}</main>
        <footer>
          <span>Compare with confidence. Always confirm at checkout.</span>
          <Link href="/about">Privacy & limitations ↗</Link>
        </footer>
      </div>
    </>
  );
}
