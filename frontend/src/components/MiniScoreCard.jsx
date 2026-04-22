import { scoreNeonColor, scoreNeonGlow, scoreBarGradient, scoreLabel } from '../utils/scoreColors';

/**
 * MiniScoreCard — compact neon score tile (Semgrep / Trivy)
 * @param {{ label: string, score: number|null, description?: string, icon?: string }} props
 */
export default function MiniScoreCard({ label, score, description, icon }) {
  const neonColor = scoreNeonColor(score);
  const neonGlow  = scoreNeonGlow(score);
  const barGrad   = scoreBarGradient(score);
  const riskLabel = scoreLabel(score);

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-5 relative overflow-hidden transition-all duration-300"
      style={{
        background:  'rgba(4, 10, 22, 0.7)',
        border:      `1px solid ${neonColor}30`,
        boxShadow:   `0 0 20px ${neonGlow}20, inset 0 0 20px ${neonGlow}08`,
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Corner accent */}
      <div
        className="absolute top-0 right-0 w-16 h-16 rounded-bl-3xl opacity-20"
        style={{ background: `radial-gradient(circle at top right, ${neonColor}, transparent)` }}
      />

      {/* Label row */}
      <div className="flex items-center gap-2.5">
        {icon && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
            style={{
              background: `${neonColor}15`,
              border:     `1px solid ${neonColor}30`,
            }}
          >
            {icon}
          </span>
        )}
        <div>
          <p
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: neonColor, textShadow: `0 0 8px ${neonGlow}` }}
          >
            {label}
          </p>
          {description && (
            <p className="text-xs text-slate-600 mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {/* Score number */}
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-5xl font-black leading-none tabular-nums"
          style={{
            color:      neonColor,
            textShadow: `0 0 20px ${neonGlow}, 0 0 40px ${neonGlow}60`,
          }}
        >
          {score ?? '—'}
        </span>
        <span className="text-sm text-slate-600 mb-1">/ 100</span>
      </div>

      {/* Bar */}
      <div className="space-y-1.5">
        <div
          className="h-1.5 w-full rounded-full overflow-hidden"
          style={{ background: 'rgba(30,41,59,0.8)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width:      score != null ? `${score}%` : '0%',
              background: barGrad,
              boxShadow:  `0 0 6px ${neonGlow}`,
            }}
          />
        </div>
        <p
          className="text-xs font-bold tracking-widest uppercase text-right"
          style={{ color: `${neonColor}80` }}
        >
          {riskLabel}
        </p>
      </div>
    </div>
  );
}
