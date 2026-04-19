import { scoreColorText, scoreColorBar } from '../utils/scoreColors';

/**
 * ScoreCard — large overall security score card.
 * @param {{ score: number|null, grade?: string, summary?: string }} props
 */
export default function ScoreCard({ score, grade, summary }) {
  return (
    <section
      aria-label="Overall Security Score"
      className="rounded-xl border border-gray-200 bg-gray-50 p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Overall Score
      </p>

      <div className="flex items-end gap-3 mb-3">
        <span className={`text-6xl font-bold leading-none ${scoreColorText(score)}`}>
          {score ?? '—'}
        </span>
        <span className="text-2xl font-semibold text-gray-300 mb-1">/ 100</span>
        {grade && (
          <span className="mb-1 rounded-md bg-gray-200 px-2 py-0.5 text-sm font-semibold text-gray-600">
            {grade}
          </span>
        )}
      </div>

      {/* Score bar */}
      {score != null && (
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-700 ${scoreColorBar(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}

      {summary && (
        <p className="text-sm text-gray-500 leading-relaxed">{summary}</p>
      )}
    </section>
  );
}
