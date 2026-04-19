import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHistory } from '../api/scanApi';
import HistoryTable from '../components/HistoryTable';
import Spinner from '../components/Spinner';

/**
 * HistoryPage — lists all past scans.
 * Route: /history
 */
export default function HistoryPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Scan History</h1>
            <p className="text-sm text-gray-400 mt-0.5">All past security scans</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600
                       px-4 py-2 text-sm font-semibold text-white shadow-sm
                       hover:bg-blue-700 hover:shadow-md transition-all duration-150
                       active:scale-[0.98]"
          >
            + New Scan
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Spinner size="h-4 w-4" color="text-blue-400" />
            Loading history…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <span className="text-red-500">⚠</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <HistoryTable scans={scans} />
        )}

      </div>
    </main>
  );
}
