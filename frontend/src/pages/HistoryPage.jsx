import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHistory } from '../api/scanApi';
import Navbar from '../components/Navbar';
import HistoryTable from '../components/HistoryTable';
import Spinner from '../components/Spinner';

/**
 * HistoryPage — lists all past scans.
 * Route: /history
 */
export default function HistoryPage() {
  const [scans, setScans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

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

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Scan History</h1>
            <p className="text-sm text-slate-500 mt-1">
              All past security scans across your repositories
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5
                       text-sm font-semibold text-white shadow-lg shadow-blue-900/40
                       hover:bg-blue-500 transition-all duration-150
                       active:scale-[0.98]"
          >
            + New Scan
          </Link>
        </div>

        {/* Stats row (optional summary chips) */}
        {!loading && !error && scans.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total</span>
              <span className="text-sm font-bold text-slate-200">{scans.length}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-green-800/40 bg-green-900/20 px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-xs font-medium text-green-400">
                {scans.filter(s => s.status === 'COMPLETED').length} Completed
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span className="text-xs font-medium text-red-400">
                {scans.filter(s => s.status === 'FAILED').length} Failed
              </span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 py-16 flex flex-col items-center gap-4">
            <Spinner size="h-8 w-8" color="text-blue-500" />
            <p className="text-sm text-slate-500">Loading scan history…</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-2xl border border-red-800/60 bg-red-900/20 px-6 py-5 flex gap-3">
            <span className="text-red-400 text-xl shrink-0 mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-semibold text-red-300">Failed to load history</p>
              <p className="text-sm text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <HistoryTable scans={scans} />
        )}

      </main>
    </div>
  );
}
