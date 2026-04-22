import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getScan } from '../api/scanApi';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import ScoreCard from '../components/ScoreCard';
import MiniScoreCard from '../components/MiniScoreCard';
import Spinner from '../components/Spinner';

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED'];
const ACTIVE_STATUSES   = ['PENDING', 'RUNNING', 'IN_PROGRESS'];
const POLL_INTERVAL_MS  = 4000;

/** Neon glow panel wrapper */
function GlassPanel({ children, style = {}, className = '' }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background:     'rgba(4, 10, 22, 0.75)',
        border:         '1px solid rgba(0,212,255,0.1)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow:      '0 4px 32px rgba(0,0,0,0.4)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * ScanResultPage — live-polling scan detail view with neon theme.
 * Route: /scans/:id
 */
export default function ScanResultPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [scan, setScan]             = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [retrying, setRetrying]     = useState(false);
  const intervalRef                 = useRef(null);

  const startPolling = useCallback(() => {
    async function fetchScan() {
      try {
        const data = await getScan(id);
        setScan(data);
        setFetchError('');
        if (TERMINAL_STATUSES.includes(data.status)) {
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        setFetchError(err.response?.data?.message ?? 'Could not reach the server. Check your connection and try again.');
        clearInterval(intervalRef.current);
      }
    }
    fetchScan();
    intervalRef.current = setInterval(fetchScan, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [id]);

  useEffect(() => {
    const cleanup = startPolling();
    return cleanup;
  }, [startPolling]);

  function handleRetryFetch() {
    setFetchError('');
    setRetrying(true);
    clearInterval(intervalRef.current);
    setTimeout(() => { setRetrying(false); startPolling(); }, 600);
  }

  function handleRetryScan() { navigate('/'); }

  const isActive   = scan && ACTIVE_STATUSES.includes(scan.status);
  const isComplete = scan?.status === 'COMPLETED';
  const isFailed   = scan?.status === 'FAILED';

  return (
    <div className="min-h-screen" style={{ background: '#020408' }}>
      {/* Background glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-30%', left: '20%',
          width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      <div className="scan-line" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-28 pb-16 space-y-5">

        {/* ── Initial loading ── */}
        {!scan && !fetchError && (
          <GlassPanel>
            <div className="py-24 flex flex-col items-center gap-6">
              {/* Glow ring spinner */}
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full blur-xl animate-pulse"
                  style={{
                    background: 'radial-gradient(circle, rgba(0,212,255,0.3) 0%, transparent 70%)',
                    transform:  'scale(2)',
                  }}
                />
                <Spinner size="h-14 w-14" color="text-cyan-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-bold text-slate-200">Loading scan details…</p>
                <p
                  className="text-xs font-mono"
                  style={{ color: 'rgba(0,212,255,0.4)' }}
                >
                  SCAN_ID: {id}
                </p>
              </div>
            </div>
          </GlassPanel>
        )}

        {/* ── Fetch error ── */}
        {fetchError && (
          <GlassPanel
            style={{
              border:     '1px solid rgba(239,68,68,0.3)',
              boxShadow:  '0 0 20px rgba(239,68,68,0.08)',
            }}
          >
            <div className="p-6 flex gap-4 border-b border-red-900/30">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-red-400"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                ✕
              </div>
              <div>
                <p className="text-sm font-bold text-red-300">Unable to load scan</p>
                <p className="text-sm text-red-400 mt-1 leading-relaxed">{fetchError}</p>
              </div>
            </div>
            <div className="px-6 py-4">
              <button
                onClick={handleRetryFetch}
                disabled={retrying}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border:     '1px solid rgba(239,68,68,0.3)',
                  color:      '#f87171',
                }}
              >
                {retrying ? <Spinner size="h-3.5 w-3.5" color="text-red-400" /> : '↺'}
                {retrying ? 'Retrying…' : 'Retry Connection'}
              </button>
            </div>
          </GlassPanel>
        )}

        {scan && (
          <>
            {/* ── Header card ── */}
            <GlassPanel>
              {/* Repo name + badge */}
              <div className="px-7 py-5 flex items-start justify-between gap-4" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
                <div className="min-w-0 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,102,204,0.6), rgba(0,212,255,0.4))',
                      border:     '1px solid rgba(0,212,255,0.3)',
                      boxShadow:  '0 0 12px rgba(0,212,255,0.2)',
                    }}
                  >
                    ⬡
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold text-slate-100 truncate">
                      {scan.repoName ?? scan.repoUrl ?? `Scan #${id}`}
                    </h1>
                    <p
                      className="text-xs mt-0.5 font-mono"
                      style={{ color: 'rgba(0,212,255,0.35)' }}
                    >
                      ID: {id}
                    </p>
                  </div>
                </div>
                <StatusBadge status={scan.status} />
              </div>

              {/* Status banner */}
              <div
                className="px-7 py-3.5 flex items-center gap-3 text-sm font-medium"
                style={{
                  background: isComplete
                    ? 'rgba(16,185,129,0.06)'
                    : isFailed
                    ? 'rgba(239,68,68,0.06)'
                    : 'rgba(0,212,255,0.06)',
                  borderBottom: '1px solid rgba(0,212,255,0.05)',
                }}
              >
                {isActive   && <Spinner size="h-4 w-4" color="text-cyan-400" />}
                {isComplete && (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-emerald-400"
                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }}
                  >
                    ✓
                  </span>
                )}
                {isFailed && (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-red-400"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}
                  >
                    ✕
                  </span>
                )}

                <span
                  style={{
                    color: isComplete ? '#10b981' : isFailed ? '#f87171' : '#00d4ff',
                    textShadow: isComplete
                      ? '0 0 8px rgba(16,185,129,0.5)'
                      : isFailed
                      ? '0 0 8px rgba(239,68,68,0.5)'
                      : '0 0 8px rgba(0,212,255,0.5)',
                  }}
                >
                  {isActive   && 'Scanning repository… this may take up to 1–2 minutes'}
                  {isComplete && 'Scan completed successfully'}
                  {isFailed   && 'Scan failed — see error details below'}
                  {!isActive && !isComplete && !isFailed && scan.status}
                </span>

                {isActive && (
                  <span className="ml-auto text-xs" style={{ color: 'rgba(0,212,255,0.3)' }}>
                    Auto-updating every 4s…
                  </span>
                )}
              </div>
            </GlassPanel>

            {/* ── Scanning in progress ── */}
            {isActive && (
              <GlassPanel>
                <div className="py-20 flex flex-col items-center gap-6">
                  {/* Animated scanner rings */}
                  <div className="relative flex items-center justify-center">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="absolute rounded-full border animate-ping"
                        style={{
                          width:         `${i * 40 + 40}px`,
                          height:        `${i * 40 + 40}px`,
                          borderColor:   `rgba(0,212,255,${0.3 / i})`,
                          animationDuration: `${1.5 + i * 0.5}s`,
                          animationDelay:    `${(i - 1) * 0.3}s`,
                        }}
                      />
                    ))}
                    <div
                      className="relative flex h-16 w-16 items-center justify-center rounded-full"
                      style={{
                        background: 'rgba(0,212,255,0.1)',
                        border:     '2px solid rgba(0,212,255,0.4)',
                        boxShadow:  '0 0 30px rgba(0,212,255,0.3)',
                      }}
                    >
                      <Spinner size="h-8 w-8" color="text-cyan-400" />
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <p
                      className="text-lg font-bold"
                      style={{ color: '#00d4ff', textShadow: '0 0 15px rgba(0,212,255,0.5)' }}
                    >
                      Scanning Repository…
                    </p>
                    <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                      Running Semgrep static analysis and Trivy dependency scanning.
                      This may take up to{' '}
                      <span className="text-slate-300 font-medium">1–2 minutes</span>.
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-2 rounded-full px-4 py-2"
                    style={{
                      background: 'rgba(0,212,255,0.05)',
                      border:     '1px solid rgba(0,212,255,0.15)',
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }}
                    />
                    <span className="text-xs" style={{ color: 'rgba(0,212,255,0.5)' }}>
                      Results will appear here automatically
                    </span>
                  </div>
                </div>
              </GlassPanel>
            )}

            {/* ── Score section — COMPLETED ── */}
            {isComplete && (
              <div className="space-y-4 animate-fade-in">
                {/* Success banner */}
                <div
                  className="rounded-2xl px-6 py-4 flex items-center gap-3"
                  style={{
                    background: 'rgba(16,185,129,0.07)',
                    border:     '1px solid rgba(16,185,129,0.25)',
                    boxShadow:  '0 0 20px rgba(16,185,129,0.08)',
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-emerald-400"
                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', boxShadow: '0 0 12px rgba(16,185,129,0.3)' }}
                  >
                    ✓
                  </div>
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: '#10b981', textShadow: '0 0 8px rgba(16,185,129,0.5)' }}
                    >
                      Scan completed successfully
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">Your security report is ready below</p>
                  </div>
                </div>

                {/* Mini score cards — 2-col */}
                <div className="grid grid-cols-2 gap-4">
                  <MiniScoreCard
                    label="Semgrep"
                    score={scan.semgrepScore ?? scan.sast_score ?? null}
                    description="Static code analysis"
                    icon="🔬"
                  />
                  <MiniScoreCard
                    label="Trivy"
                    score={scan.trivyScore ?? scan.dependency_score ?? null}
                    description="Dependency vulnerability scan"
                    icon="📦"
                  />
                </div>

                {/* Overall score */}
                <ScoreCard
                  score={scan.overallScore ?? scan.score}
                  grade={scan.grade}
                  summary={scan.summary}
                />
              </div>
            )}

            {/* ── Failure — FAILED ── */}
            {isFailed && (
              <GlassPanel
                style={{
                  border:    '1px solid rgba(239,68,68,0.25)',
                  boxShadow: '0 0 30px rgba(239,68,68,0.07)',
                }}
              >
                {/* Alert header */}
                <div
                  className="flex items-center gap-3 px-6 py-4"
                  style={{ borderBottom: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-red-400"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', boxShadow: '0 0 12px rgba(239,68,68,0.25)' }}
                  >
                    ✕
                  </div>
                  <div>
                    <p
                      className="text-sm font-bold text-red-300"
                      style={{ textShadow: '0 0 8px rgba(239,68,68,0.4)' }}
                    >
                      Scan Failed
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">The scan could not be completed</p>
                  </div>
                </div>

                {/* Error body */}
                <div className="px-6 py-4">
                  <p
                    className="text-xs font-bold tracking-widest uppercase mb-3"
                    style={{ color: 'rgba(239,68,68,0.5)' }}
                  >
                    Error Details
                  </p>
                  <div
                    className="rounded-xl px-4 py-3 font-mono text-sm text-red-300 leading-relaxed"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                  >
                    {scan.errorMessage ?? 'An unknown error occurred during the scan.'}
                  </div>
                </div>

                {/* Retry */}
                <div className="px-6 pb-5">
                  <button
                    onClick={handleRetryScan}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide text-white transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, rgba(220,38,38,0.8), rgba(239,68,68,0.8))',
                      border:     '1px solid rgba(239,68,68,0.4)',
                      boxShadow:  '0 0 20px rgba(239,68,68,0.2)',
                    }}
                  >
                    ↺ Try a New Scan
                  </button>
                </div>
              </GlassPanel>
            )}
          </>
        )}
      </main>
    </div>
  );
}
