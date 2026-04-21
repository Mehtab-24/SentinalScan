/**
 * Returns the Tailwind colour classes for a given numeric score.
 * ≥80 → green, ≥50 → yellow, <50 → red, null → grey
 */
export function scoreColorText(score) {
  if (score == null) return 'text-slate-500';
  if (score >= 80)   return 'text-green-400';
  if (score >= 50)   return 'text-yellow-400';
  return 'text-red-400';
}

export function scoreColorBar(score) {
  if (score == null) return 'bg-slate-700';
  if (score >= 80)   return 'bg-green-500';
  if (score >= 50)   return 'bg-yellow-400';
  return 'bg-red-500';
}

export function scoreColorBg(score) {
  if (score == null) return 'bg-slate-800/60 border-slate-700';
  if (score >= 80)   return 'bg-green-900/20 border-green-800/50';
  if (score >= 50)   return 'bg-yellow-900/20 border-yellow-800/50';
  return 'bg-red-900/20 border-red-800/50';
}

export function scoreLabel(score) {
  if (score == null) return 'N/A';
  if (score >= 80)   return 'Secure';
  if (score >= 50)   return 'Moderate';
  return 'At Risk';
}
