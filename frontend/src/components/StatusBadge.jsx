/** Status → Tailwind colour mapping (covers backend values + common variants) */
const STATUS_STYLES = {
  PENDING:     'bg-slate-100  text-slate-600  ring-slate-300',
  QUEUED:      'bg-slate-100  text-slate-600  ring-slate-300',
  RUNNING:     'bg-blue-100   text-blue-700   ring-blue-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 ring-yellow-300',
  COMPLETED:   'bg-green-100  text-green-700  ring-green-300',
  FAILED:      'bg-red-100    text-red-700    ring-red-300',
};

const STATUS_DOTS = {
  PENDING:     'bg-slate-400',
  QUEUED:      'bg-slate-400',
  RUNNING:     'bg-blue-500 animate-pulse',
  IN_PROGRESS: 'bg-yellow-500 animate-pulse',
  COMPLETED:   'bg-green-500',
  FAILED:      'bg-red-500',
};

/**
 * StatusBadge — coloured pill with a status dot.
 * @param {{ status: string }} props
 */
export default function StatusBadge({ status }) {
  const label    = status ?? 'UNKNOWN';
  const colours  = STATUS_STYLES[label] ?? 'bg-slate-100 text-slate-600 ring-slate-300';
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
