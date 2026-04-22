import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHistory } from '../api/scanApi';
import Navbar from '../components/Navbar';
import HistoryTable from '../components/HistoryTable';
import Spinner from '../components/Spinner';

/**
 * HistoryPage — dark futuristic scan history view.
 * Route: /history
 */
export default function HistoryPage() {
  const [scans, setScans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await getHistory();
        setScans(data);
      } catch (err) {
        setError(err.response?.data?.message ?? 'Failed to load scan history.');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const completed = scans.filter((s) => s.status === 'COMPLETED').length;
  const failed    = scans.filter((s) => s.status === 'FAILED').length;

  return (
    <div className="min-h-screen" style={{ background: '#020408' }}>
      {/* Background glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-20%', right: '-10%',
          width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      <div className="scan-line" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-28 pb-16 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-end justify-between">
          <div>
            {/* Tag */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3"
              style={{
                background: 'rgba(168,85,247,0.08)',
                border:     '1px solid rgba(168,85,247,0.2)',
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: '#a855f7', boxShadow: '0 0 6px #a855f7' }}
              />
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: 'rgba(168,85,247,0.7)' }}
              >
                Security Intelligence
              </span>
            </div>
            <h1
              className="text-3xl font-black tracking-tight text-slate-100"
            >
              Scan History
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              All past security scans across your repositories
            </p>
          </div>

          <Link
            to="/"
            className="btn-neon inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold tracking-widest uppercase text-white no-underline"
            style={{ letterSpacing: '0.1em' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Scan
          </Link>
        </div>

        {/* ── Stats row ── */}
        {!loading && !error && scans.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: 'Total Scans',
                value: scans.length,
                color: '#00d4ff',
                glow:  'rgba(0,212,255,0.15)',
                bg:    'rgba(0,212,255,0.05)',
                border:'rgba(0,212,255,0.15)',
                icon:  '📡',
              },
              {
                label: 'Completed',
                value: completed,
                color: '#10b981',
                glow:  'rgba(16,185,129,0.15)',
                bg:    'rgba(16,185,129,0.05)',
                border:'rgba(16,185,129,0.2)',
                icon:  '✓',
              },
              {
                label: 'Failed',
                value: failed,
                color: '#f87171',
                glow:  'rgba(239,68,68,0.15)',
                bg:    'rgba(239,68,68,0.05)',
                border:'rgba(239,68,68,0.2)',
                icon:  '✕',
              },
            ].map(({ label, value, color, glow, bg, border, icon }) => (
              <div
                key={label}
                className="rounded-2xl p-5 flex items-center gap-4"
                style={{
                  background:     bg,
                  border:         `1px solid ${border}`,
                  backdropFilter: 'blur(12px)',
                  boxShadow:      `0 0 20px ${glow}`,
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
                  style={{
                    background: `${color}18`,
                    border:     `1px solid ${color}35`,
                    boxShadow:  `0 0 10px ${color}25`,
                    color,
                    fontWeight: 900,
                  }}
                >
                  {icon}
                </div>
                <div>
                  <p
                    className="text-3xl font-black tabular-nums leading-none"
                    style={{
                      color,
                      textShadow: `0 0 15px ${glow}`,
                    }}
                  >
                    {value}
                  </p>
                  <p
                    className="text-xs font-bold tracking-widest uppercase mt-1"
                    style={{ color: `${color}60` }}
                  >
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div
            className="rounded-2xl py-20 flex flex-col items-center gap-5"
            style={{
              background:     'rgba(4,10,22,0.7)',
              border:         '1px solid rgba(0,212,255,0.08)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-xl animate-pulse"
                style={{
                  background: 'radial-gradient(circle, rgba(0,212,255,0.2) 0%, transparent 70%)',
                  transform: 'scale(2.5)',
                }}
              />
              <Spinner size="h-10 w-10" color="text-cyan-400" />
            </div>
            <p className="text-sm text-slate-500">Loading scan history…</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div
            className="rounded-2xl px-6 py-5 flex gap-4"
            style={{
              background: 'rgba(239,68,68,0.07)',
              border:     '1px solid rgba(239,68,68,0.25)',
            }}
          >
            <span className="text-red-400 text-xl shrink-0 mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-bold text-red-300">Failed to load history</p>
              <p className="text-sm text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        {!loading && !error && <HistoryTable scans={scans} />}

      </main>
    </div>
  );
}
