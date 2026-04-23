import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { submitScan } from '../api/scanApi';
import Spinner from './Spinner';

/**
 * RepoSubmitForm — neon glass form with shake-on-error and typing glow.
 */
export default function RepoSubmitForm() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const scan = await submitScan(repoUrl);
      navigate(`/scans/${scan.id}`);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to submit scan. Please try again.';
      setError(msg);
      setShakeKey(k => k + 1); // trigger shake re-mount
    } finally {
      setLoading(false);
    }
  }

  const shakeVariants = {
    shake: {
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.45, ease: 'easeInOut' },
    },
    rest: { x: 0 },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* URL input */}
      <div className="space-y-2">
        <label htmlFor="repo-url"
          className="block text-xs font-bold tracking-widest uppercase"
          style={{ color: '#00d4ff80' }}>
          GitHub Repository URL
        </label>
        <div className="relative">
          {/* Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded text-sm"
            style={{ color: '#00d4ff80' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </div>
          <input
            id="repo-url"
            type="url"
            required
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="input-neon w-full rounded-xl pl-12 pr-4 py-4 text-sm"
            style={{
              background: 'rgba(4, 10, 22, 0.82)',
              border:     '1px solid rgba(0,212,255,0.15)',
              color:      '#e2e8f0',
              outline:    'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(0,212,255,0.55)';
              e.target.style.boxShadow   = '0 0 0 3px rgba(0,212,255,0.08), 0 0 25px rgba(0,212,255,0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(0,212,255,0.15)';
              e.target.style.boxShadow   = 'none';
            }}
          />
        </div>
        <p className="text-xs pl-1" style={{ color: '#475569' }}>
          Supports public GitHub repositories only
        </p>
      </div>

      {/* Error — shake animation */}
      <AnimatePresence>
        {error && (
          <motion.div
            key={shakeKey}
            initial="rest"
            animate="shake"
            variants={shakeVariants}
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 20px rgba(239,68,68,0.08)' }}
          >
            <span className="mt-0.5 text-red-400 shrink-0">⚠</span>
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <motion.button
        type="submit"
        disabled={loading}
        whileHover={!loading ? { scale: 1.02, y: -1 } : {}}
        whileTap={!loading ? { scale: 0.98 } : {}}
        className="btn-neon relative flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-4 text-sm font-bold tracking-wide uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ color: '#fff', letterSpacing: '0.1em' }}
      >
        {loading ? (
          <>
            <Spinner size="h-4 w-4" color="text-white" />
            <span>Initiating Scan…</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <span>Start Security Scan</span>
          </>
        )}
      </motion.button>
    </form>
  );
}
