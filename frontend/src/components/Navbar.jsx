/**
 * Navbar — shared top navigation bar used across all pages.
 */
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { pathname } = useLocation();

  const linkClass = (path) =>
    `text-sm font-medium transition-colors duration-150 ${
      pathname === path
        ? 'text-blue-400'
        : 'text-slate-400 hover:text-slate-100'
    }`;

  return (
    <nav className="border-b border-slate-800 bg-[#0f1117]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-base shadow-lg shadow-blue-900/40 group-hover:bg-blue-500 transition-colors">
            🛡
          </div>
          <span className="text-base font-bold text-slate-100 tracking-tight">
            SentinelScan
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className={linkClass('/')}>
            New Scan
          </Link>
          <Link to="/history" className={linkClass('/history')}>
            History
          </Link>
        </div>
      </div>
    </nav>
  );
}
