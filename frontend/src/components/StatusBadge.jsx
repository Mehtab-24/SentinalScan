/** Status → Tailwind colour mapping for dark dashboard theme */
const STATUS_STYLES = {
  PENDING:     'bg-slate-700/60  text-slate-300  ring-slate-600',
  QUEUED:      'bg-slate-700/60  text-slate-300  ring-slate-600',
  RUNNING:     'bg-blue-900/60   text-blue-300   ring-blue-700',
  IN_PROGRESS: 'bg-yellow-900/60 text-yellow-300 ring-yellow-700',
  COMPLETED:   'bg-green-900/60  text-green-300  ring-green-700',
  FAILED:      'bg-red-900/60    text-red-300    ring-red-700',
};

const STATUS_DOTS = {
  PENDING:     'bg-slate-400',
  QUEUED:      'bg-slate-400',
  RUNNING:     'bg-blue-400 animate-pulse',
  IN_PROGRESS: 'bg-yellow-400 animate-pulse',
  COMPLETED:   'bg-green-400',
  FAILED:      'bg-red-400',
};

/**
 * StatusBadge — coloured pill with a status dot.
 * @param {{ status: string }} props
 */
export default function StatusBadge({ status }) {
  const label    = status ?? 'UNKNOWN';
  const colours  = STATUS_STYLES[label] ?? 'bg-slate-700/60 text-slate-300 ring-slate-600';
  const dotColor = STATUS_DOTS[label]   ?? 'bg-slate-400';

  return (
    <span
      aria-label={`Scan status: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1
                  text-xs font-semibold ring-1 ring-inset ${colours}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}
