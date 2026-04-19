import { scoreColorText, scoreColorBar } from '../utils/scoreColors';

/**
 * MiniScoreCard — compact tool-specific score tile (Semgrep / Trivy / etc.)
 * @param {{ label: string, score: number|null, description?: string }} props
 */
export default function MiniScoreCard({ label, score, description }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
      {/* Label */}
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </p>

      {/* Score */}
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold leading-none ${scoreColorText(score)}`}>
          {score ?? '—'}
        </span>
        <span className="text-sm text-gray-300">/&nbsp;100</span>
      </div>

      {/* Bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreColorBar(score)}`}
          style={{ width: score != null ? `${score}%` : '0%' }}
        />
      </div>

      {/* Optional description */}
      {description && (
        <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
