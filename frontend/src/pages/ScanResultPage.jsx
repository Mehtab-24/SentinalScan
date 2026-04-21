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

/**
 * ScanResultPage — live-polling scan detail view.
 * Route: /scans/:id
 */
export default function ScanResultPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();

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

  // Manual retry — clears error state and re-starts polling
  function handleRetryFetch() {
    setFetchError('');
    setRetrying(true);
    clearInterval(intervalRef.current);
    setTimeout(() => {
      setRetrying(false);
      startPolling();
    }, 600);
  }

  // Retry the scan itself (navigate to home pre-filled — simplest approach: go home)
  function handleRetryScan() {
    navigate('/');
  }

  const isActive   = scan && ACTIVE_STATUSES.includes(scan.status);
  const isComplete = scan?.status === 'COMPLETED';
  const isFailed   = scan?.status === 'FAILED';

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-5">

        {/* ── Initial page load ── */}
        {!scan && !fetchError && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 py-20 flex flex-col items-center gap-5">
            <Spinner size="h-10 w-10" color="text-blue-500" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-300">Loading scan details…</p>
              <p className="text-xs text-slate-600">Scan ID: {id}</p>
            </div>
          </div>
        )}

        {/* ── Fetch / network error ── */}
        {fetchError && (
          <div className="rounded-2xl border border-red-800/60 bg-red-900/20 p-6">
            <div className="flex gap-3 mb-4">
              <span className="text-red-400 text-xl shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-semibold text-red-300">Unable to load scan</p>
                <p className="text-sm text-red-400 mt-1 leading-relaxed">{fetchError}</p>
              </div>
            </div>
            <button
              onClick={handleRetryFetch}
              disabled={retrying}
              className="flex items-center gap-2 rounded-xl border border-red-700/50 bg-red-900/40
                         px-4 py-2 text-sm font-semibold text-red-300
                         hover:bg-red-800/40 hover:text-red-200 transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retrying ? <Spinner size="h-3.5 w-3.5" color="text-red-400" /> : '↺'}
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}

        {scan && (
          <>
            {/* ── Header card ── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              {/* Repo name + badge */}
              <div className="px-7 py-5 flex items-start justify-between gap-4 border-b border-slate-800">
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-slate-100 truncate">
                    {scan.repoName ?? scan.repoUrl ?? `Scan #${id}`}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">Scan ID: {id}</p>
                </div>
                <StatusBadge status={scan.status} />
              </div>

              {/* Status banner — adapts colour per state */}
              <div
                className={[
                  'px-7 py-3.5 flex items-center gap-3 text-sm font-medium border-b',
                  isComplete
                    ? 'bg-green-900/20 border-green-800/30 text-green-300'
                    : isFailed
                    ? 'bg-red-900/20 border-red-800/30 text-red-300'
                    : isActive
                    ? 'bg-blue-900/20 border-blue-800/30 text-blue-300'
                    : 'bg-slate-800/40 border-slate-700/30 text-slate-400',
                ].join(' ')}
              >
                {isActive   && <Spinner size="h-4 w-4" color="text-blue-400" />}
                {isComplete && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs font-bold">✓</span>
                )}
                {isFailed && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-xs font-bold">✕</span>
                )}

                {/* State-specific messages */}
                {isActive && (
                  <span>Scanning repository… this may take up to 1–2 minutes</span>
                )}
                {isComplete && <span>Scan completed successfully</span>}
                {isFailed   && <span>Scan failed — see error details below</span>}
                {!isActive && !isComplete && !isFailed && (
                  <span>{scan.status}</span>
                )}

                {isActive && (
                  <span className="ml-auto text-xs text-slate-600 tabular-nums">
                    Auto-updating…
                  </span>
                )}
              </div>
            </div>

            {/* ── Scanning progress card ── */}
            {isActive && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 py-14 flex flex-col items-center gap-5">
                <div className="relative">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl scale-150" />
                  <Spinner size="h-14 w-14" color="text-blue-500" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-base font-semibold text-slate-200">
                    Scanning repository…
                  </p>
                  <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                    Running Semgrep static analysis and Trivy dependency scanning.
                    This may take up to <span className="text-slate-300 font-medium">1–2 minutes</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-1.5 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs text-slate-500">Results will appear here automatically</span>
                </div>
              </div>
            )}

            {/* ── Score section — COMPLETED only ── */}
            {isComplete && (
              <div className="space-y-4">
                {/* Success banner */}
                <div className="rounded-2xl border border-green-800/40 bg-green-900/15 px-6 py-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-sm font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-300">Scan completed successfully</p>
                    <p className="text-xs text-green-600 mt-0.5">Your security report is ready below</p>
                  </div>
                </div>

                {/* Tool score cards */}
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

            {/* ── Failure alert — FAILED only ── */}
            {isFailed && (
              <div className="rounded-2xl border border-red-800/60 bg-red-900/20 overflow-hidden">
                {/* Alert header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-red-800/40">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-sm font-bold">
                    ✕
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-300">Scan failed</p>
                    <p className="text-xs text-red-600 mt-0.5">The scan could not be completed</p>
                  </div>
                </div>

                {/* Error message body */}
                <div className="px-6 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-2">
                    Error details
                  </p>
                  <p className="text-sm text-red-300 leading-relaxed font-mono bg-red-950/40 rounded-lg px-4 py-3 border border-red-900/60">
                    {scan.errorMessage ?? 'An unknown error occurred during the scan.'}
                  </p>
                </div>

                {/* Retry action */}
                <div className="px-6 pb-5 pt-1">
                  <button
                    onClick={handleRetryScan}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600/80 px-5 py-2.5
                               text-sm font-semibold text-white
                               hover:bg-red-600 transition-all duration-150
                               active:scale-[0.98]"
                  >
                    ↺ Try a new scan
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
