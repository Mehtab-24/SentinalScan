/**
 * Returns the Tailwind colour classes for a given numeric score.
 * ≥80 → green, ≥50 → yellow, <50 → red, null → grey
 */
export function scoreColorText(score) {
  if (score == null) return 'text-gray-400';
  if (score >= 80)   return 'text-green-600';
  if (score >= 50)   return 'text-yellow-500';
  return 'text-red-600';
}

export function scoreColorBar(score) {
  if (score == null) return 'bg-gray-200';
  if (score >= 80)   return 'bg-green-500';
  if (score >= 50)   return 'bg-yellow-400';
  return 'bg-red-500';
}
