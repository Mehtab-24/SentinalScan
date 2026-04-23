/**
 * Navbar — 3D glassmorphism nav with scroll-aware glass and motion active indicator.
 */
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Navbar() {
  const { pathname } = useLocation();
  const isActive = (p) => pathname === p;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 pt-3">
      <motion.div
        className="mx-auto max-w-5xl rounded-2xl relative overflow-hidden"
        animate={{
          backgroundColor: scrolled ? 'rgba(2, 5, 14, 0.92)' : 'rgba(4, 8, 20, 0.72)',
          boxShadow: scrolled
            ? '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 60px rgba(0,212,255,0.04)'
            : '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          backdropFilter:      'blur(24px) saturate(200%)',
          WebkitBackdropFilter:'blur(24px) saturate(200%)',
          border:              '1px solid rgba(0,212,255,0.1)',
        }}
      >
        {/* Top edge glow */}
        <div className="absolute top-0 left-12 right-12 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.35), transparent)' }} />

        <div className="px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group no-underline">
            <motion.div
              className="relative flex h-8 w-8 items-center justify-center rounded-xl text-sm"
              style={{
                background: 'linear-gradient(135deg, #0044cc, #00d4ff)',
                boxShadow:  '0 0 20px rgba(0,212,255,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
              whileHover={{ scale: 1.1, boxShadow: '0 0 30px rgba(0,212,255,0.7), inset 0 1px 0 rgba(255,255,255,0.25)' }}
              transition={{ duration: 0.2 }}
            >
              🛡
            </motion.div>
            <span className="text-sm font-black tracking-widest uppercase"
              style={{ color: '#e2e8f0', letterSpacing: '0.14em' }}>
              Sentinel<span style={{ color: '#00d4ff', textShadow: '0 0 10px rgba(0,212,255,0.6)' }}>Scan</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-1">
            {[
              { to: '/',        label: 'New Scan' },
              { to: '/history', label: 'History'  },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="relative px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-200 no-underline"
                style={{
                  color:      isActive(to) ? '#00d4ff' : 'rgba(148,163,184,0.7)',
                  background: isActive(to) ? 'rgba(0,212,255,0.08)' : 'transparent',
                  border:     isActive(to) ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
                  textShadow: isActive(to) ? '0 0 12px rgba(0,212,255,0.6)' : 'none',
                  boxShadow:  isActive(to) ? '0 0 15px rgba(0,212,255,0.1), inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
                  letterSpacing: '0.1em',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(to)) {
                    e.currentTarget.style.color      = '#00d4ff';
                    e.currentTarget.style.background = 'rgba(0,212,255,0.05)';
                    e.currentTarget.style.transform  = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(to)) {
                    e.currentTarget.style.color      = 'rgba(148,163,184,0.7)';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform  = 'translateY(0)';
                  }
                }}
              >
                {label}
                {isActive(to) && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full"
                    style={{ background: '#00d4ff', boxShadow: '0 0 8px rgba(0,212,255,0.9)' }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </nav>
  );
}
