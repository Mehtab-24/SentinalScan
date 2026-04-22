/** Neon status badge mapping */
const STATUS_CONFIG = {
  PENDING: {
    bg:     'rgba(71,85,105,0.25)',
    border: 'rgba(71,85,105,0.5)',
    text:   '#94a3b8',
    dot:    '#94a3b8',
    glow:   'rgba(148,163,184,0.2)',
    pulse:  false,
  },
  QUEUED: {
    bg:     'rgba(71,85,105,0.25)',
    border: 'rgba(71,85,105,0.5)',
    text:   '#94a3b8',
    dot:    '#94a3b8',
    glow:   'rgba(148,163,184,0.2)',
    pulse:  false,
  },
  RUNNING: {
    bg:     'rgba(0,212,255,0.1)',
    border: 'rgba(0,212,255,0.35)',
    text:   '#00d4ff',
    dot:    '#00d4ff',
    glow:   'rgba(0,212,255,0.3)',
    pulse:  true,
  },
  IN_PROGRESS: {
    bg:     'rgba(234,179,8,0.1)',
    border: 'rgba(234,179,8,0.35)',
    text:   '#fbbf24',
    dot:    '#fbbf24',
    glow:   'rgba(234,179,8,0.3)',
    pulse:  true,
  },
  COMPLETED: {
    bg:     'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.35)',
    text:   '#10b981',
    dot:    '#10b981',
    glow:   'rgba(16,185,129,0.35)',
    pulse:  false,
  },
  FAILED: {
    bg:     'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.35)',
    text:   '#f87171',
    dot:    '#f87171',
    glow:   'rgba(239,68,68,0.3)',
    pulse:  false,
  },
};

/**
 * StatusBadge — glowing neon pill badge.
 * @param {{ status: string }} props
 */
export default function StatusBadge({ status }) {
  const label  = status ?? 'UNKNOWN';
  const config = STATUS_CONFIG[label] ?? STATUS_CONFIG.PENDING;

  return (
    <span
      aria-label={`Scan status: ${label}`}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-widest uppercase"
      style={{
        background:  config.bg,
        border:      `1px solid ${config.border}`,
        color:       config.text,
        boxShadow:   `0 0 12px ${config.glow}, inset 0 0 8px ${config.glow}30`,
        textShadow:  `0 0 8px ${config.glow}`,
        letterSpacing: '0.1em',
      }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.pulse ? 'animate-pulse' : ''}`}
        style={{
          background: config.dot,
          boxShadow:  `0 0 6px ${config.dot}`,
        }}
      />
      {label}
    </span>
  );
}
