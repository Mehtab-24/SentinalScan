import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getScan } from '../api/scanApi';
import StatusBadge from '../components/StatusBadge';
import ScoreCard from '../components/ScoreCard';
import MiniScoreCard from '../components/MiniScoreCard';
import Spinner from '../components/Spinner';

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED'];
const ACTIVE_STATUSES   = ['PENDING', 'RUNNING', 'IN_PROGRESS'];
const POLL_INTERVAL_MS  = 4000;

/** Maps scan status → human-readable message */
const STATUS_MESSAGE = {
  PENDING:     'Queued — waiting to start…',
  RUNNING:     'Scanning repository…',
  IN_PROGRESS: 'Scanning repository…',
  COMPLETED:   'Scan completed',
  FAILED:      'Scan failed',
};

/**
 * ScanResultPage — live-polling scan detail view.
 * Route: /scans/:id
 */
export default function ScanResultPage() {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    async function fetchScan() {
      try {
        const data = await getScan(id);
        setScan(data);
        if (TERMINAL_STATUSES.includes(data.status)) {
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        setFetchError(err.response?.data?.message ?? 'Failed to load scan.');
        clearInterval(intervalRef.current);
      }
    }

    fetchScan();
    intervalRef.current = setInterval(fetchScan, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [id]);

  const isActive   = scan && ACTIVE_STATUSES.includes(scan.status);
  const isComplete = scan?.status === 'COMPLETED';
  const isFailed   = scan?.status === 'FAILED';
  const statusMsg  = scan ? (STATUS_MESSAGE[scan.status] ?? scan.status) : null;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-5">

        {/* Nav */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← New Scan
          </Link>
          <Link
            to="/history"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            History
          </Link>
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          {/* ── Header section ── */}
          <div className="px-7 pt-7 pb-5 space-y-4">

            {/* Initial fetch loading */}
            {!scan && !fetchError && (
              <div className="flex flex-col items-center py-10 gap-4">
                <Spinner size="h-9 w-9" color="text-blue-500" />
                <p className="text-sm text-gray-400">Loading scan…</p>
              </div>
            )}

            {/* Fetch error */}
            {fetchError && (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
                <p className="text-sm text-red-700">{fetchError}</p>
              </div>
            )}

            {scan && (
              <>
                {/* Repo + badge */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-0.5">
                    <h1 className="text-sm font-semibold text-gray-900 truncate">
                      {scan.repoName ?? scan.repoUrl ?? `Scan #${id}`}
                    </h1>
                    <p className="text-xs text-gray-400">Scan ID: {id}</p>
                  </div>
                  <StatusBadge status={scan.status} />
                </div>

                {/* Status message row */}
                <div className={`flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium
                  ${isComplete ? 'bg-green-50 text-green-700 border border-green-200' : ''}
                  ${isFailed   ? 'bg-red-50   text-red-700   border border-red-200'   : ''}
                  ${isActive   ? 'bg-blue-50  text-blue-700  border border-blue-200'  : ''}
                  ${!isActive && !isComplete && !isFailed ? 'bg-gray-50 text-gray-600 border border-gray-200' : ''}
                `}>
                  {isActive && <Spinner size="h-4 w-4" color="text-blue-500" />}
                  {isComplete && <span className="text-lg leading-none">✓</span>}
                  {isFailed   && <span className="text-lg leading-none">✕</span>}
                  {statusMsg}
                </div>
              </>
            )}
          </div>

          {/* ── Score section — COMPLETED only ── */}
          {isComplete && (
            <div className="border-t border-gray-100 px-7 py-6 space-y-4">

              {/* Two mini tool cards */}
              <div className="grid grid-cols-2 gap-3">
                <MiniScoreCard
                  label="Semgrep"
                  score={scan.semgrepScore ?? scan.sast_score ?? null}
                  description="Static analysis"
                />
                <MiniScoreCard
                  label="Trivy"
                  score={scan.trivyScore ?? scan.dependency_score ?? null}
                  description="Dependency scan"
                />
              </div>

              {/* Large overall score */}
              <ScoreCard
                score={scan.overallScore ?? scan.score}
                grade={scan.grade}
                summary={scan.summary}
              />
            </div>
          )}

          {/* ── Error detail — FAILED only ── */}
          {isFailed && (
            <div className="border-t border-gray-100 px-7 py-5">
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 space-y-1">
                <p className="text-sm font-semibold text-red-700">Error details</p>
                <p className="text-sm text-red-600 leading-relaxed">
                  {scan.errorMessage ?? 'An unknown error occurred during the scan.'}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
