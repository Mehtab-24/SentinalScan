import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

/**
 * HistoryTable — renders a clean table of past scan records.
 * @param {{ scans: Array }} props
 */
export default function HistoryTable({ scans = [] }) {
  const navigate = useNavigate();

  if (scans.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 py-16 text-center">
        <p className="text-3xl mb-3">🔍</p>
        <p className="text-sm font-medium text-slate-400">No scans yet</p>
        <p className="text-xs text-slate-600 mt-1">Submit a repository to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead>
          <tr className="bg-slate-900/80">
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Repository
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Score
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Date
            </th>
            <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
          {scans.map((scan) => (
            <tr
              key={scan.id}
              className="hover:bg-slate-800/60 transition-colors duration-150 cursor-pointer"
              onClick={() => navigate(`/scans/${scan.id}`)}
            >
              {/* Repository name */}
              <td className="px-5 py-4 max-w-xs">
                <p className="font-medium text-slate-200 truncate">
                  {scan.repoName ?? scan.repoUrl ?? `Scan #${scan.id}`}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">#{scan.id}</p>
              </td>

              {/* Status badge */}
              <td className="px-5 py-4">
                <StatusBadge status={scan.status} />
              </td>

              {/* Score */}
              <td className="px-5 py-4">
                {scan.overallScore != null ? (
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      scan.overallScore >= 80
                        ? 'text-green-400'
                        : scan.overallScore >= 50
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {scan.overallScore}
                    <span className="text-xs font-normal text-slate-600"> / 100</span>
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>

              {/* Date */}
              <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                {scan.createdAt
                  ? new Date(scan.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </td>

              {/* Action button */}
              <td className="px-5 py-4 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/scans/${scan.id}`);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5
                             text-xs font-semibold text-slate-300
                             hover:border-blue-600/60 hover:bg-blue-600/10 hover:text-blue-400
                             transition-all duration-150"
                >
                  View →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
