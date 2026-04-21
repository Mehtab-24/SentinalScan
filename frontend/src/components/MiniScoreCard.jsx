import { scoreColorText, scoreColorBar, scoreColorBg } from '../utils/scoreColors';

/**
 * MiniScoreCard — compact tool-specific score tile (Semgrep / Trivy / etc.)
 * @param {{ label: string, score: number|null, description?: string, icon?: string }} props
 */
export default function MiniScoreCard({ label, score, description, icon }) {
  const bgClass   = scoreColorBg(score);
  const textClass = scoreColorText(score);
  const barClass  = scoreColorBar(score);

  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-5 ${bgClass}`}>
      {/* Label row */}
      <div className="flex items-center gap-2">
        {icon && <span className="text-base leading-none">{icon}</span>}
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </p>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-4xl font-extrabold leading-none tabular-nums ${textClass}`}>
          {score ?? '—'}
        </span>
        <span className="text-sm text-slate-600">/ 100</span>
      </div>

      {/* Bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{ width: score != null ? `${score}%` : '0%' }}
        />
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
