import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { scoreNeonColor, scoreNeonGlow, scoreBarGradient, scoreLabel } from '../utils/scoreColors';

/**
 * MiniScoreCard — compact neon score tile with score-based glow
 * @param {{ label: string, score: number|null, description?: string, icon?: string }} props
 */
export default function MiniScoreCard({ label, score, description, icon }) {
  const neonColor = scoreNeonColor(score);
  const neonGlow  = scoreNeonGlow(score);
  const barGrad   = scoreBarGradient(score);
  const riskLabel = scoreLabel(score);

  // Determine glow class based on score
  const glowClass = score == null ? 'score-glow-default'
    : score >= 80 ? 'score-glow-green'
    : score >= 50 ? 'score-glow-amber'
    : 'score-glow-red';

  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col gap-4 rounded-2xl p-5 relative overflow-hidden ${glowClass}`}
      style={{
        background:     'rgba(4, 10, 22, 0.75)',
        border:         `1px solid ${neonColor}32`,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Corner accent glow */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${neonColor}25, transparent)` }} />

      {/* Top glow strip */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${neonColor}45, transparent)` }} />

      {/* Label row */}
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg text-base"
            style={{ background: `${neonColor}18`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 12px ${neonColor}20` }}>
            {icon}
          </span>
        )}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase"
            style={{ color: neonColor, textShadow: `0 0 8px ${neonGlow}` }}>
            {label}
          </p>
          {description && <p className="text-xs text-slate-600 mt-0.5">{description}</p>}
        </div>
      </div>

      {/* Score number */}
      <div className="flex items-baseline gap-1.5">
        <motion.span
          className="text-5xl font-black leading-none tabular-nums"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 160 }}
          style={{ color: neonColor, textShadow: `0 0 20px ${neonGlow}, 0 0 40px ${neonGlow}60` }}
        >
          {score ?? '—'}
        </motion.span>
        <span className="text-sm text-slate-600 mb-1">/ 100</span>
      </div>

      {/* Bar */}
      <div className="space-y-1.5">
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(30,41,59,0.8)' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={inView ? { width: score != null ? `${score}%` : '0%' } : {}}
            transition={{ duration: 1.0, delay: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ background: barGrad, boxShadow: `0 0 6px ${neonGlow}` }}
          />
        </div>
        <p className="text-xs font-bold tracking-widest uppercase text-right"
          style={{ color: `${neonColor}80` }}>
          {riskLabel}
        </p>
      </div>
    </motion.div>
  );
}
