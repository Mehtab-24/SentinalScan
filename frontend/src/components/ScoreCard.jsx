import { scoreNeonColor, scoreNeonGlow, scoreBarGradient, scoreLabel } from '../utils/scoreColors';

/**
 * ScoreCard — large overall security score card with glow ring.
 * @param {{ score: number|null, grade?: string, summary?: string }} props
 */
export default function ScoreCard({ score, grade, summary }) {
  const neonColor = scoreNeonColor(score);
  const neonGlow  = scoreNeonGlow(score);
  const barGrad   = scoreBarGradient(score);
  const riskLabel = scoreLabel(score);

  // SVG ring parameters
  const radius      = 52;
  const circ        = 2 * Math.PI * radius;
  const fillPercent = score != null ? score / 100 : 0;
  const dashOffset  = circ * (1 - fillPercent);

  return (
    <section
      aria-label="Overall Security Score"
      className="rounded-2xl p-6 relative overflow-hidden"
      style={{
        background:     'rgba(4, 10, 22, 0.75)',
        border:         `1px solid ${neonColor}25`,
        boxShadow:      `0 0 40px ${neonGlow}15, inset 0 0 40px ${neonGlow}06`,
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Background glow blob */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 80% 20%, ${neonColor}12 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: `${neonColor}80` }}
            >
              Overall Score
            </p>
            <p className="text-slate-500 text-xs mt-0.5">Security assessment result</p>
          </div>
          {grade && (
            <span
              className="rounded-xl px-4 py-2 text-lg font-black"
              style={{
                background: `${neonColor}15`,
                border:     `1px solid ${neonColor}40`,
                color:      neonColor,
                boxShadow:  `0 0 15px ${neonGlow}40`,
                textShadow: `0 0 10px ${neonGlow}`,
              }}
            >
              {grade}
            </span>
          )}
        </div>

        {/* Score display row — ring + number */}
        <div className="flex items-center gap-8 mb-6">
          {/* SVG Score Ring */}
          <div className="relative shrink-0">
            <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
              {/* Track */}
              <circle
                cx="65" cy="65" r={radius}
                fill="none"
                stroke="rgba(30,41,59,0.8)"
                strokeWidth="8"
              />
              {/* Progress */}
              <circle
                cx="65" cy="65" r={radius}
                fill="none"
                stroke={neonColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000"
                style={{ filter: `drop-shadow(0 0 8px ${neonColor})` }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-4xl font-black tabular-nums leading-none"
                style={{
                  color:      neonColor,
                  textShadow: `0 0 20px ${neonGlow}`,
                }}
              >
                {score ?? '—'}
              </span>
              <span className="text-xs text-slate-600 mt-1">/ 100</span>
            </div>
          </div>

          {/* Risk label + bar */}
          <div className="flex-1 space-y-4">
            <div>
              <p
                className="text-3xl font-black tracking-tight"
                style={{
                  color:      neonColor,
                  textShadow: `0 0 25px ${neonGlow}`,
                }}
              >
                {riskLabel}
              </p>
              <p className="text-sm text-slate-500 mt-1">Security risk level</p>
            </div>

            {/* Progress bar */}
            {score != null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Score</span>
                  <span style={{ color: neonColor }}>{score}%</span>
                </div>
                <div
                  className="h-2 w-full rounded-full overflow-hidden"
                  style={{ background: 'rgba(30,41,59,0.8)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width:     `${score}%`,
                      background: barGrad,
                      boxShadow:  `0 0 8px ${neonGlow}`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-slate-400 leading-relaxed"
            style={{
              background: 'rgba(15,23,42,0.6)',
              border:     '1px solid rgba(30,41,59,0.8)',
            }}
          >
            {summary}
          </div>
        )}
      </div>
    </section>
  );
}
