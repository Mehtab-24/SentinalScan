import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { scoreNeonColor, scoreNeonGlow, scoreBarGradient, scoreLabel } from '../utils/scoreColors';

/**
 * ScoreCard — large overall security score card with animated glow ring.
 * Score-based glow:  ≥80 → green, 50-79 → amber, <50 → red
 * @param {{ score: number|null, grade?: string, summary?: string }} props
 */
export default function ScoreCard({ score, grade, summary }) {
  const neonColor = scoreNeonColor(score);
  const neonGlow  = scoreNeonGlow(score);
  const barGrad   = scoreBarGradient(score);
  const riskLabel = scoreLabel(score);

  // Determine glow class based on score
  const glowClass = score == null ? 'score-glow-default'
    : score >= 80 ? 'score-glow-green'
    : score >= 50 ? 'score-glow-amber'
    : 'score-glow-red';

  // SVG ring parameters
  const radius      = 52;
  const circ        = 2 * Math.PI * radius;
  const fillPercent = score != null ? score / 100 : 0;
  const dashOffset  = circ * (1 - fillPercent);

  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.section
      ref={ref}
      aria-label="Overall Security Score"
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl p-6 relative overflow-hidden ${glowClass}`}
      style={{
        background:     'rgba(4, 10, 22, 0.78)',
        border:         `1px solid ${neonColor}28`,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Background glow blob */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 80% 20%, ${neonColor}14 0%, transparent 60%)` }} />

      {/* Top glow strip */}
      <div className="absolute top-0 left-8 right-8 h-px rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${neonColor}50, transparent)` }} />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: `${neonColor}80` }}>
              Overall Score
            </p>
            <p className="text-slate-500 text-xs mt-0.5">Security assessment result</p>
          </div>
          {grade && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={inView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.45, delay: 0.3, type: 'spring', stiffness: 200 }}
              className="rounded-xl px-4 py-2 text-lg font-black"
              style={{
                background: `${neonColor}18`,
                border:     `1px solid ${neonColor}45`,
                color:      neonColor,
                boxShadow:  `0 0 20px ${neonGlow}50, 0 0 40px ${neonGlow}20`,
                textShadow: `0 0 12px ${neonGlow}`,
              }}
            >
              {grade}
            </motion.span>
          )}
        </div>

        {/* Score display row — ring + number */}
        <div className="flex items-center gap-8 mb-6">
          {/* SVG Score Ring with animated stroke */}
          <div className="relative shrink-0">
            <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
              {/* Track */}
              <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="8" />
              {/* Progress — animates in */}
              <motion.circle
                cx="65" cy="65" r={radius}
                fill="none"
                stroke={neonColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={inView ? { strokeDashoffset: dashOffset } : {}}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                style={{ filter: `drop-shadow(0 0 10px ${neonColor}) drop-shadow(0 0 20px ${neonColor}60)` }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-4xl font-black tabular-nums leading-none"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5, type: 'spring', stiffness: 180 }}
                style={{ color: neonColor, textShadow: `0 0 20px ${neonGlow}, 0 0 40px ${neonGlow}60` }}
              >
                {score ?? '—'}
              </motion.span>
              <span className="text-xs text-slate-600 mt-1">/ 100</span>
            </div>
          </div>

          {/* Risk label + bar */}
          <div className="flex-1 space-y-4">
            <div>
              <motion.p
                className="text-3xl font-black tracking-tight"
                initial={{ opacity: 0, x: -12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.35 }}
                style={{ color: neonColor, textShadow: `0 0 25px ${neonGlow}` }}
              >
                {riskLabel}
              </motion.p>
              <p className="text-sm text-slate-500 mt-1">Security risk level</p>
            </div>

            {/* Progress bar */}
            {score != null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Score</span>
                  <span style={{ color: neonColor }}>{score}%</span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(30,41,59,0.8)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${score}%` } : {}}
                    transition={{ duration: 1.1, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    style={{ background: barGrad, boxShadow: `0 0 10px ${neonGlow}` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.6 }}
            className="rounded-xl px-4 py-3 text-sm text-slate-400 leading-relaxed"
            style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(30,41,59,0.8)' }}
          >
            {summary}
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
