/**
 * Score color utilities — returns neon CSS values (not Tailwind classes)
 * for use with inline style props in glassmorphism components.
 */

export function scoreColorText(score) {
  if (score == null) return 'text-slate-500';
  if (score >= 80)   return 'text-emerald-400';
  if (score >= 50)   return 'text-yellow-400';
  return 'text-red-400';
}

export function scoreColorBar(score) {
  if (score == null) return 'bg-slate-700';
  if (score >= 80)   return 'bg-emerald-500';
  if (score >= 50)   return 'bg-yellow-400';
  return 'bg-red-500';
}

export function scoreColorBg(score) {
  if (score == null) return 'bg-slate-800/60 border-slate-700';
  if (score >= 80)   return 'bg-emerald-900/20 border-emerald-800/50';
  if (score >= 50)   return 'bg-yellow-900/20 border-yellow-800/50';
  return 'bg-red-900/20 border-red-800/50';
}

export function scoreLabel(score) {
  if (score == null) return 'N/A';
  if (score >= 80)   return 'SECURE';
  if (score >= 50)   return 'MODERATE';
  return 'AT RISK';
}

/** Returns inline CSS color for score */
export function scoreNeonColor(score) {
  if (score == null) return '#64748b';
  if (score >= 80)   return '#10b981';
  if (score >= 50)   return '#fbbf24';
  return '#f87171';
}

/** Returns inline CSS glow for score */
export function scoreNeonGlow(score) {
  if (score == null) return 'rgba(100,116,139,0.3)';
  if (score >= 80)   return 'rgba(16,185,129,0.5)';
  if (score >= 50)   return 'rgba(251,191,36,0.5)';
  return 'rgba(248,113,113,0.5)';
}

/** Returns the bar gradient for score */
export function scoreBarGradient(score) {
  if (score == null) return 'linear-gradient(90deg, #334155, #475569)';
  if (score >= 80)   return 'linear-gradient(90deg, #059669, #10b981, #34d399)';
  if (score >= 50)   return 'linear-gradient(90deg, #d97706, #fbbf24, #fcd34d)';
  return 'linear-gradient(90deg, #dc2626, #f87171, #fca5a5)';
}
