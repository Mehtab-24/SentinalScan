import { scoreColorText, scoreColorBar, scoreColorBg, scoreLabel } from '../utils/scoreColors';

/**
 * ScoreCard — large overall security score card.
 * @param {{ score: number|null, grade?: string, summary?: string }} props
 */
export default function ScoreCard({ score, grade, summary }) {
  const bgClass    = scoreColorBg(score);
  const textClass  = scoreColorText(score);
  const barClass   = scoreColorBar(score);
  const label      = scoreLabel(score);

  return (
    <section
      aria-label="Overall Security Score"
      className={`rounded-xl border p-6 ${bgClass}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Overall Score
        </p>
        {grade && (
          <span className="rounded-md bg-slate-700 px-2.5 py-1 text-sm font-bold text-slate-200">
            Grade {grade}
          </span>
        )}
      </div>

      {/* Score number */}
      <div className="flex items-end gap-3 mb-4">
        <span className={`text-7xl font-extrabold leading-none tabular-nums ${textClass}`}>
          {score ?? '—'}
        </span>
        <div className="flex flex-col mb-1">
          <span className="text-xl font-semibold text-slate-600">/ 100</span>
          <span className={`text-xs font-semibold ${textClass}`}>{label}</span>
        </div>
      </div>

      {/* Score bar */}
      {score != null && (
        <div className="h-2.5 w-full rounded-full bg-slate-700/60 overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barClass}`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}

      {summary && (
        <p className="text-sm text-slate-400 leading-relaxed border-t border-slate-700/50 pt-4 mt-2">
          {summary}
        </p>
      )}
    </section>
  );
}
