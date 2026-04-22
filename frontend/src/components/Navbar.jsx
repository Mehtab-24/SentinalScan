/**
 * Navbar — futuristic glassmorphism top nav.
 */
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { pathname } = useLocation();

  const isActive = (path) => pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Glass bar */}
      <div
        className="mx-4 mt-3 rounded-2xl glass border-neon"
        style={{
          background: 'rgba(2, 6, 16, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,212,255,0.12)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,255,0.05)',
        }}
      >
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-base transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #0066cc, #00d4ff)',
                boxShadow: '0 0 15px rgba(0,212,255,0.4)',
              }}
            >
              🛡
            </div>
            <span
              className="text-sm font-bold tracking-widest uppercase"
              style={{ color: '#e2e8f0', letterSpacing: '0.12em' }}
            >
              Sentinel<span style={{ color: '#00d4ff' }}>Scan</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {[
              { to: '/', label: 'New Scan' },
              { to: '/history', label: 'History' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="relative px-4 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-200"
                style={{
                  color: isActive(to) ? '#00d4ff' : 'rgba(148,163,184,0.8)',
                  background: isActive(to) ? 'rgba(0,212,255,0.08)' : 'transparent',
                  border: isActive(to) ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
                  textShadow: isActive(to) ? '0 0 10px rgba(0,212,255,0.5)' : 'none',
                }}
              >
                {label}
                {isActive(to) && (
                  <span
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full"
                    style={{ background: '#00d4ff', boxShadow: '0 0 6px rgba(0,212,255,0.8)' }}
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
