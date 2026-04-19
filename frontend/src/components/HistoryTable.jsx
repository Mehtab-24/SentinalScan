import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

/**
 * HistoryTable — renders a Tailwind-styled table of past scan records.
 * @param {{ scans: Array }} props
 */
export default function HistoryTable({ scans = [] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Repository</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Score</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {scans.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No scans found.
              </td>
            </tr>
          ) : (
            scans.map((scan) => (
              <tr key={scan.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">
                  {scan.repoName ?? scan.repoUrl ?? `Scan #${scan.id}`}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={scan.status} />
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {scan.overallScore ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {scan.createdAt
                    ? new Date(scan.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/scans/${scan.id}`)}
                    className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white
                               hover:bg-blue-700 transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
