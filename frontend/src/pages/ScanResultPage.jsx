import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getScan, submitScan } from '../api/scanApi';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import ScoreCard from '../components/ScoreCard';
import MiniScoreCard from '../components/MiniScoreCard';
import Spinner from '../components/Spinner';

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED'];
const ACTIVE_STATUSES   = ['PENDING', 'RUNNING', 'IN_PROGRESS'];
const POLL_INTERVAL_MS  = 4000;

function getScanPhase(scan) {
  if (!scan) return null;
  if (scan.status !== 'IN_PROGRESS') return scan.status;

  const phase = scan.errorMessage?.startsWith('PHASE: ')
    ? scan.errorMessage.slice('PHASE: '.length)
    : '';

  switch (phase) {
    case 'CLONING_REPOSITORY': return 'CLONING';
    case 'RUNNING_SEMGREP': return 'SEMGREP_RUNNING';
    case 'RUNNING_TRIVY': return 'TRIVY_RUNNING';
    case 'PARSING_RESULTS':
    case 'CALCULATING_SCORE': return 'SCORING';
    default: return scan.status;
  }
}

/** Compute letter grade from numeric score */
function computeGrade(score) {
  if (score == null) return null;
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/** Format milliseconds to human-readable duration */
function formatDuration(ms) {
  if (!ms) return null;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

/* Terminal log lines that animate in sequence */
const TERMINAL_LINES = [
  { text: '> Initializing scan environment...', color: '#00d4ff', delay: 0 },
  { text: '> Cloning repository from GitHub...', color: '#94a3b8', delay: 0.4 },
  { text: '> Running Semgrep SAST analysis...', color: '#a855f7', delay: 0.9 },
  { text: '  → Scanning for security vulnerabilities', color: '#64748b', delay: 1.3 },
  { text: '  → Checking code quality patterns', color: '#64748b', delay: 1.7 },
  { text: '> Running Trivy dependency scan...', color: '#a855f7', delay: 2.2 },
  { text: '  ⓘ  First run? Trivy may download its CVE DB (~500MB) — this adds ~3 min', color: '#fbbf2488', delay: 2.5 },
  { text: '  → Scanning CVE database...', color: '#64748b', delay: 3.0 },
  { text: '  → Checking SBOM for vulnerabilities', color: '#64748b', delay: 3.5 },
  { text: '> Calculating composite security score...', color: '#10b981', delay: 4.0 },
  { text: '> Awaiting results...', color: '#fbbf24', delay: 4.5, blink: true },
];

/* ── 3D tilt card ── */
function TiltCard({ children, className = '', style = {} }) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const x  = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    const y  = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    el.style.transform = `perspective(800px) rotateY(${x * 5}deg) rotateX(${-y * 4}deg) scale3d(1.01,1.01,1.01)`;
  }, []);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'perspective(800px) rotateY(0) rotateX(0) scale3d(1,1,1)';
  }, []);
  return (
    <div ref={ref} className={className}
      style={{ transition:'transform 0.15s ease', transformStyle:'preserve-3d', willChange:'transform', ...style }}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

/* ── Glass panel wrapper ── */
function GlassPanel({ children, style = {}, className = '' }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background:     'rgba(5, 10, 24, 0.82)',
        border:         '1px solid rgba(0,212,255,0.12)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow:      '0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
        ...style,
      }}>
      {children}
    </div>
  );
}

/* ── Animated radar/scanner orb ── */
function ScannerOrb({ size = 180 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {[size, size * 0.78, size * 0.56].map((s, i) => (
        <div key={s} className="absolute rounded-full border"
          style={{
            width: s, height: s,
            borderColor: `rgba(0,212,255,${0.08 + i * 0.04})`,
            borderStyle: i === 0 ? 'solid' : 'dashed',
            animation: `${i % 2 === 0 ? 'spinRing' : 'spinRingReverse'} ${7 + i * 4}s linear infinite`,
            borderWidth: '1px',
          }} />
      ))}
      {/* Sweeping radar beam */}
      <div className="absolute rounded-full overflow-hidden" style={{ width: size * 0.44, height: size * 0.44 }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: '50%', height: '50%',
          transformOrigin: '0% 100%',
          background: 'conic-gradient(transparent 270deg, rgba(0,212,255,0.65) 360deg)',
          animation: 'spinRing 2s linear infinite',
        }} />
      </div>
      {/* Pulsing center core */}
      <div className="absolute rounded-full animate-ping"
        style={{ width: size * 0.2, height: size * 0.2, background: 'rgba(0,212,255,0.12)', animationDuration: '1.5s' }} />
      <div className="relative z-10 flex items-center justify-center rounded-full"
        style={{
          width: size * 0.29, height: size * 0.29,
          background: 'radial-gradient(circle at 35% 35%, rgba(0,212,255,0.35), rgba(0,68,136,0.65))',
          border: '1px solid rgba(0,212,255,0.5)',
          boxShadow: '0 0 30px rgba(0,212,255,0.45), inset 0 0 20px rgba(0,212,255,0.15)',
        }}>
        <Spinner size="h-7 w-7" color="text-cyan-400" />
      </div>
    </div>
  );
}

/* ── Terminal Line ── */
function TerminalLine({ text, color, blink = false }) {
  return (
    <p className="terminal-text text-xs leading-relaxed" style={{ color }}>
      {text}
      {blink && <span className="terminal-cursor" />}
    </p>
  );
}

/* ── Time-based phase constants ── */
const PHASE_DB_DOWNLOAD = 10;   // seconds — show Trivy DB warning
const PHASE_STILL_WORKING = 30; // seconds — "still analysing" message
const PHASE_TIMEOUT_WARN = 180; // seconds — 3 min timeout warning

/* ── Active Scanning — Terminal UI ── */
function TerminalScanUI({ scanId, onRetry, scanStatus }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds since mount

  // Map backend status to progress percentage
  const getProgressFromStatus = (status) => {
    switch (status) {
      case 'PENDING': return 10;
      case 'CLONING': return 30;
      case 'SEMGREP_RUNNING': return 50;
      case 'TRIVY_RUNNING': return 75;
      case 'SCORING': return 90;
      case 'COMPLETED': return 100;
      case 'FAILED': return 100; // Will show error state
      default: return 0;
    }
  };

  useEffect(() => {
    const timers = TERMINAL_LINES.map((line, i) =>
      setTimeout(() => setVisibleLines(v => Math.max(v, i + 1)), line.delay * 1000)
    );
    // Wall-clock elapsed seconds counter
    const elapsedTimer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { timers.forEach(clearTimeout); clearInterval(elapsedTimer); };
  }, []);

  const progress = getProgressFromStatus(scanStatus);
  const isFailed = scanStatus === 'FAILED';

  // Derive phase from elapsed time
  const isDbDownload   = elapsed >= PHASE_DB_DOWNLOAD && elapsed < PHASE_STILL_WORKING;
  const isStillWorking = elapsed >= PHASE_STILL_WORKING && elapsed < PHASE_TIMEOUT_WARN;
  const isTimeoutWarn  = elapsed >= PHASE_TIMEOUT_WARN;

  // Format elapsed as m:ss
  const elapsedLabel = elapsed < 60
    ? `${elapsed}s`
    : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassPanel>
        {/* Top beam */}
        <div className="absolute top-0 left-8 right-8 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)' }} />

        <div className="px-7 py-6 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
          <ScannerOrb size={56} />
          <div>
            <p className="text-base font-black" style={{ color: '#00d4ff', textShadow: '0 0 20px rgba(0,212,255,0.5)' }}>
              Security Analysis In Progress
            </p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">SCAN_ID · {scanId}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Elapsed timer */}
            <span className="text-xs font-mono tabular-nums" style={{ color: 'rgba(0,212,255,0.4)' }}>{elapsedLabel}</span>
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }} />
            <span className="text-xs font-bold" style={{ color: 'rgba(0,212,255,0.6)' }}>LIVE</span>
          </div>
        </div>

        {/* Terminal output */}
        <div className="scan-beam-container px-7 py-6 space-y-1.5 min-h-[220px]">
          <AnimatePresence>
            {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}>
                <TerminalLine text={line.text} color={line.color} blink={line.blink && i === visibleLines - 1} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Time-based status banners ── */}
        <AnimatePresence mode="wait">
          {isTimeoutWarn && (
            <motion.div key="timeout"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="mx-7 mb-4 rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <span className="shrink-0 mt-0.5 text-sm">⚠</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black" style={{ color: '#f87171' }}>
                  Scan taking longer than expected ({elapsedLabel})
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  The process may be stuck or waiting for the Trivy CVE DB (~500 MB). You can retry.
                </p>
              </div>
              <button
                onClick={onRetry}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all duration-200"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
              >
                ↺ Retry
              </button>
            </motion.div>
          )}
          {isStillWorking && !isTimeoutWarn && (
            <motion.div key="still"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="mx-7 mb-4 rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}
            >
              <Spinner size="h-3.5 w-3.5" color="text-yellow-400" />
              <div>
                <p className="text-xs font-black" style={{ color: '#fbbf24' }}>
                  Still working… analysing dependencies ({elapsedLabel})
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Trivy is scanning the dependency graph — hang tight.</p>
              </div>
            </motion.div>
          )}
          {isDbDownload && !isStillWorking && !isTimeoutWarn && (
            <motion.div key="db"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="mx-7 mb-4 rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.22)' }}
            >
              <Spinner size="h-3.5 w-3.5" color="text-purple-400" />
              <div>
                <p className="text-xs font-black" style={{ color: '#a855f7' }}>
                  Downloading vulnerability database (first run)
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Trivy CVE DB is ~500 MB — this may take a few minutes.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar or Error state */}
        <div className="px-7 pb-6">
          {isFailed ? (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <span className="shrink-0 text-sm">❌</span>
              <div className="flex-1">
                <p className="text-xs font-black" style={{ color: '#f87171' }}>
                  Scan Failed
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  The security analysis encountered an error and could not complete.
                </p>
              </div>
              <button
                onClick={onRetry}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all duration-200"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
              >
                ↺ Retry
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs terminal-text" style={{ color: 'rgba(0,212,255,0.5)' }}>Analysis Progress</span>
                <span className="text-xs terminal-text font-bold" style={{ color: '#00d4ff' }}>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden progress-beam"
                style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(0,212,255,0.1)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #0055bb, #00d4ff, #06b6d4)' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2 text-center">Auto-refreshing every 4s · Trivy first-run may take up to 5 min</p>
            </>
          )}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

/* ── Severity colours helper ── */
const SEVERITY_STYLES = {
  CRITICAL: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)',  label: 'CRIT' },
  HIGH:     { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)', label: 'HIGH' },
  MEDIUM:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', label: 'MED'  },
  LOW:      { color: '#34d399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.3)', label: 'LOW'  },
  INFO:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', label: 'INFO' },
};
const SEVERITY_ORDER = ['CRITICAL','HIGH','MEDIUM','LOW','INFO'];

/** Truncate a file path to last 2 segments */
function shortPath(p) {
  if (!p) return '';
  const parts = p.replace(/\\/g, '/').split('/');
  return parts.length > 2 ? '…/' + parts.slice(-2).join('/') : p;
}

/* ── Findings Preview Panel ── */
function FindingsPanel({ semgrepFindings, trivyFindings }) {
  const [open, setOpen] = useState(false);

  // Parse and normalise findings from both tools
  const findings = (() => {
    const list = [];
    // Semgrep findings
    try {
      const sg = typeof semgrepFindings === 'string' ? JSON.parse(semgrepFindings) : semgrepFindings;
      const results = sg?.results ?? [];
      results.forEach((r) => {
        list.push({
          tool: 'Semgrep',
          severity: (r.extra?.severity ?? r.severity ?? 'LOW').toUpperCase(),
          rule: r.check_id ?? r.rule_id ?? 'unknown',
          path: r.path ?? '',
          message: r.extra?.message ?? r.message ?? '',
        });
      });
    } catch { /* ignore parse errors */ }
    // Trivy findings
    try {
      const tv = typeof trivyFindings === 'string' ? JSON.parse(trivyFindings) : trivyFindings;
      const resultSets = tv?.Results ?? [];
      resultSets.forEach((rs) => {
        (rs.Vulnerabilities ?? []).forEach((v) => {
          list.push({
            tool: 'Trivy',
            severity: (v.Severity ?? 'LOW').toUpperCase(),
            rule: v.VulnerabilityID ?? 'CVE-???',
            path: rs.Target ?? '',
            message: v.Title ?? v.Description ?? '',
          });
        });
      });
    } catch { /* ignore parse errors */ }
    // Sort by severity order
    list.sort((a, b) => {
      const ai = SEVERITY_ORDER.indexOf(a.severity);
      const bi = SEVERITY_ORDER.indexOf(b.severity);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return list.slice(0, 5);
  })();

  if (findings.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(5,10,24,0.82)', border: '1px solid rgba(0,212,255,0.10)', backdropFilter: 'blur(20px)' }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ cursor: 'pointer', background: 'transparent', border: 'none' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}>⚑</span>
          <div>
            <p className="text-sm font-black text-slate-200">Top Findings Preview</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(0,212,255,0.35)' }}>Showing top {findings.length} of all issues found</p>
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-slate-500 text-lg select-none"
        >⌄</motion.span>
      </button>

      {/* Collapsible findings list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-5 space-y-2"
              style={{ borderTop: '1px solid rgba(0,212,255,0.07)' }}>
              <p className="text-xs font-bold tracking-widest uppercase pt-4 mb-3"
                style={{ color: 'rgba(0,212,255,0.35)' }}>Results</p>
              {findings.map((f, i) => {
                const sty = SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.INFO;
                return (
                  <div key={i}
                    className="rounded-xl px-4 py-3 flex items-start gap-3"
                    style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid rgba(255,255,255,0.04)` }}>
                    {/* Severity badge */}
                    <span className="shrink-0 mt-0.5 rounded-md px-2 py-0.5 text-xs font-black tabular-nums"
                      style={{ background: sty.bg, border: `1px solid ${sty.border}`, color: sty.color, minWidth: 42, textAlign: 'center' }}>
                      {sty.label}
                    </span>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-black text-slate-200 truncate">{f.rule}</span>
                        <span className="shrink-0 text-xs rounded px-1.5 py-0.5 font-mono"
                          style={{ background: 'rgba(255,255,255,0.04)', color: f.tool === 'Semgrep' ? '#00d4ff' : '#a855f7', fontSize: 10 }}>
                          {f.tool}
                        </span>
                      </div>
                      {f.path && (
                        <p className="text-xs font-mono truncate" style={{ color: 'rgba(148,163,184,0.6)' }}>
                          {shortPath(f.path)}
                        </p>
                      )}
                      {f.message && (
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{f.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Animated results cards container ── */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * ScanResultPage — live-polling scan detail with full 3D treatment.
 */
export default function ScanResultPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [scan, setScan]             = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [retrying, setRetrying]     = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const intervalRef                 = useRef(null);

  const startPolling = useCallback(() => {
    clearInterval(intervalRef.current);

    async function fetchScan() {
      try {
        const data = await getScan(id);
        setScan(data);
        setFetchError('');
        if (TERMINAL_STATUSES.includes(data.status)) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (err) {
        const message = err.code === 'ECONNABORTED'
          ? 'The server did not respond in time. Check that the backend is running on port 8080.'
          : err.response?.data?.message ?? 'Could not reach the server.';
        setFetchError(message);
      }
    }
    fetchScan();
    intervalRef.current = setInterval(fetchScan, POLL_INTERVAL_MS);
    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [id]);

  useEffect(() => { const c = startPolling(); return c; }, [startPolling]);

  function handleRetryFetch() {
    setFetchError(''); setRetrying(true);
    clearInterval(intervalRef.current);
    setTimeout(() => { setRetrying(false); startPolling(); }, 600);
  }
  function handleRetryScan() { navigate('/'); }

  async function handleRescan() {
    if (!scan?.repoUrl || rescanning) return;
    setRescanning(true);
    try {
      const newScan = await submitScan(scan.repoUrl);
      navigate(`/scans/${newScan.id}`);
    } catch (err) {
      console.error('Rescan failed', err);
    } finally {
      setRescanning(false);
    }
  }

  const scanPhase  = getScanPhase(scan);
  const isActive   = scan && ACTIVE_STATUSES.includes(scan.status);
  const isComplete = scan?.status === 'COMPLETED';
  const isFailed   = scan?.status === 'FAILED';

  return (
    <div className="min-h-screen aurora-bg">
      {/* depth orbs */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full" style={{ width: 600, height: 600, top: '-20%', left: '-15%', background: 'radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute rounded-full" style={{ width: 500, height: 500, bottom: '-10%', right: '-10%', background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      <div className="fixed inset-0 pointer-events-none cyber-grid" style={{ zIndex: 1 }} />

      <Navbar />

      <main className="relative mx-auto max-w-3xl px-6 pt-28 pb-16 space-y-5" style={{ zIndex: 10 }}>

        {/* ── Initial loading ── */}
        <AnimatePresence>
          {!scan && !fetchError && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TiltCard>
                <GlassPanel>
                  <div className="py-24 flex flex-col items-center gap-7">
                    <ScannerOrb size={180} />
                    <div className="text-center space-y-2">
                      <p className="text-base font-black text-white">Loading Scan Details…</p>
                      <p className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.4)' }}>SCAN_ID · {id}</p>
                    </div>
                  </div>
                </GlassPanel>
              </TiltCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Fetch error ── */}
        <AnimatePresence>
          {fetchError && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TiltCard>
                <GlassPanel style={{ border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 30px rgba(239,68,68,0.08)' }}>
                  <div className="p-6 flex gap-4" style={{ borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-red-400"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', boxShadow: '0 0 15px rgba(239,68,68,0.25)' }}>✕</div>
                    <div>
                      <p className="text-sm font-bold text-red-300">Unable to Load Scan</p>
                      <p className="text-sm text-red-400 mt-1 leading-relaxed">{fetchError}</p>
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <button onClick={handleRetryFetch} disabled={retrying}
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide disabled:opacity-50 transition-all duration-200"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                      {retrying ? <Spinner size="h-3.5 w-3.5" color="text-red-400" /> : '↺'}
                      {retrying ? 'Retrying…' : 'Retry Connection'}
                    </button>
                  </div>
                </GlassPanel>
              </TiltCard>
            </motion.div>
          )}
        </AnimatePresence>

        {scan && (
          <>
            {/* ── Header card ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <TiltCard>
                <GlassPanel>
                  <div className="absolute top-0 left-8 right-8 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)' }} />
                  <div className="px-7 py-5 flex items-start justify-between gap-4"
                    style={{ borderBottom: '1px solid rgba(0,212,255,0.07)' }}>
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg relative"
                        style={{ background: 'linear-gradient(135deg, rgba(0,85,187,0.8), rgba(0,212,255,0.5))', border: '1px solid rgba(0,212,255,0.4)', boxShadow: '0 0 20px rgba(0,212,255,0.25)' }}>
                        ⬡
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-base font-black text-slate-100 truncate">
                          {scan.repoName ?? scan.repoUrl ?? `Scan #${id}`}
                        </h1>
                        <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(0,212,255,0.35)' }}>ID · {String(id).slice(0,8)}…</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={scan.status} />
                      {scan.durationMs && (
                        <span className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.35)' }}>⏱ {formatDuration(scan.durationMs)}</span>
                      )}
                      {/* Rescan button — primary CTA on completed scans */}
                      {isComplete && (
                        <motion.button
                          id="rescan-btn"
                          onClick={handleRescan}
                          disabled={rescanning}
                          whileHover={!rescanning ? { scale: 1.05, y: -2 } : {}}
                          whileTap={!rescanning ? { scale: 0.96 } : {}}
                          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200"
                          style={{
                            background: rescanning
                              ? 'linear-gradient(135deg,#0369a1,#0e7490)'
                              : 'linear-gradient(135deg,#06b6d4,#3b82f6)',
                            boxShadow: rescanning
                              ? 'none'
                              : '0 0 18px rgba(6,182,212,0.55), 0 0 6px rgba(59,130,246,0.35)',
                            border: '1px solid rgba(6,182,212,0.45)',
                          }}
                        >
                          {rescanning ? (
                            <Spinner size="h-3.5 w-3.5" color="text-white" />
                          ) : (
                            /* Refresh SVG icon */
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
                              <path fillRule="evenodd" d="M15.312 3.313a.75.75 0 0 1 .938 1.168A7.5 7.5 0 1 1 3.25 10a.75.75 0 0 1 1.5 0 6 6 0 1 0 10.563-3.937.75.75 0 0 1-.001-1.75Zm-5.5-.063a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1 0-1.5h2.75V4a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                            </svg>
                          )}
                          {rescanning ? 'Starting new scan…' : 'Rescan Repository'}
                        </motion.button>
                      )}
                    </div>
                  </div>
                  {/* Status banner */}
                  <div className="px-7 py-3.5 flex items-center gap-3 text-sm font-semibold"
                    style={{ background: isComplete ? 'rgba(16,185,129,0.05)' : isFailed ? 'rgba(239,68,68,0.05)' : 'rgba(0,212,255,0.04)' }}>
                    {isActive && <Spinner size="h-4 w-4" color="text-cyan-400" />}
                    {isComplete && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-emerald-400"
                        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }}>✓</span>
                    )}
                    {isFailed && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-red-400"
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}>✕</span>
                    )}
                    <span style={{
                      color: isComplete ? '#10b981' : isFailed ? '#f87171' : '#00d4ff',
                      textShadow: isComplete ? '0 0 10px rgba(16,185,129,0.5)' : isFailed ? '0 0 10px rgba(239,68,68,0.5)' : '0 0 10px rgba(0,212,255,0.5)',
                    }}>
                      {isActive   && 'Scanning repository… up to 1–2 min'}
                      {isComplete && 'Scan completed successfully'}
                      {isFailed   && 'Scan failed — see details below'}
                      {!isActive && !isComplete && !isFailed && scan.status}
                    </span>
                    {isActive && (
                      <span className="ml-auto text-xs" style={{ color: 'rgba(0,212,255,0.3)' }}>Auto-refreshing every 4s…</span>
                    )}
                  </div>
                </GlassPanel>
              </TiltCard>
            </motion.div>

            {/* ── Scanning in progress — Terminal UI ── */}
            <AnimatePresence>
              {isActive && <TerminalScanUI scanId={id} onRetry={handleRetryScan} scanStatus={scanPhase} />}
            </AnimatePresence>

            {/* ── Completed ── 3-card grid ── */}
            <AnimatePresence>
              {isComplete && (
                <motion.div
                  className="space-y-4"
                  initial="hidden"
                  animate="show"
                  variants={containerVariants}
                >
                  {/* Success banner */}
                  <motion.div variants={cardVariants}>
                    <TiltCard>
                      <div className="rounded-2xl px-6 py-4 flex items-center gap-3"
                        style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 0 30px rgba(16,185,129,0.07), inset 0 1px 0 rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)' }}>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-emerald-400"
                          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', boxShadow: '0 0 15px rgba(16,185,129,0.3)' }}>✓</div>
                        <div>
                          <p className="text-sm font-black" style={{ color: '#10b981', textShadow: '0 0 10px rgba(16,185,129,0.5)' }}>
                            Scan Completed Successfully
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">Your security report is ready below</p>
                        </div>
                      </div>
                    </TiltCard>
                  </motion.div>

                  {/* AI Repository Summary Card */}
                  {scan.aiSummary && (
                    <motion.div variants={cardVariants}>
                      <TiltCard>
                        <div className="rounded-2xl overflow-hidden"
                          style={{ background: 'rgba(5,10,24,0.82)', border: '1px solid rgba(59,130,246,0.15)', backdropFilter: 'blur(20px)' }}>
                          <div className="absolute top-0 left-8 right-8 h-px"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)' }} />
                          <div className="px-6 py-5 flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', color: '#3b82f6', boxShadow: '0 0 15px rgba(59,130,246,0.25)' }}>🤖</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-100 mb-2">AI Repository Summary</p>
                              <p className="text-sm text-slate-300 leading-relaxed">{scan.aiSummary}</p>
                            </div>
                          </div>
                        </div>
                      </TiltCard>
                    </motion.div>
                  )}

                  {/* Critical Warning: Sensitive Files Detected */}
                  {scan.leakedFiles && scan.leakedFiles.length > 0 && (
                    <motion.div variants={cardVariants}>
                      <TiltCard>
                        <div className="rounded-2xl overflow-hidden"
                          style={{ background: 'rgba(5,10,24,0.82)', border: '1px solid rgba(239,68,68,0.25)', backdropFilter: 'blur(20px)', boxShadow: '0 0 30px rgba(239,68,68,0.08)' }}>
                          <div className="absolute top-0 left-8 right-8 h-px"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)' }} />
                          <div className="px-6 py-5 flex items-start gap-4" style={{ borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold animate-pulse"
                              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', boxShadow: '0 0 20px rgba(239,68,68,0.35)' }}>⚠</div>
                            <div className="flex-1">
                              <p className="text-sm font-black" style={{ color: '#f87171', textShadow: '0 0 10px rgba(239,68,68,0.5)' }}>Critical Warning: Sensitive Files Detected</p>
                              <p className="text-xs text-slate-500 mt-0.5">The following files may contain secrets and should be removed from the repository immediately</p>
                            </div>
                          </div>
                          <div className="px-6 py-4 space-y-2">
                            {scan.leakedFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-3 rounded-lg px-3 py-2"
                                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                <span className="shrink-0 text-sm" style={{ color: '#f87171' }}>🔓</span>
                                <span className="text-sm font-mono text-slate-300 truncate" title={file}>{file}</span>
                              </div>
                            ))}
                          </div>
                          <div className="px-6 py-4 bg-red-950/10 border-t border-red-900/20">
                            <p className="text-xs text-slate-400 leading-relaxed">
                              <span className="font-bold text-red-300">Recommended Actions:</span> Remove these files from git history using <code className="bg-slate-900/50 px-1.5 py-0.5 rounded text-xs">git filter-branch</code> or <code className="bg-slate-900/50 px-1.5 py-0.5 rounded text-xs">BFG Repo-Cleaner</code>, rotate any exposed credentials, and add them to <code className="bg-slate-900/50 px-1.5 py-0.5 rounded text-xs">.gitignore</code>.
                            </p>
                          </div>
                        </div>
                      </TiltCard>
                    </motion.div>
                  )}

                  {/* 3-card grid: Semgrep + Trivy + Overall */}
                  <motion.div variants={cardVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginTop: '1rem' }}>
                    <TiltCard>
                      <MiniScoreCard label="Semgrep" score={scan.semgrepScore ?? scan.sast_score ?? null}
                        description="Static code analysis" icon="🔬" />
                    </TiltCard>
                    <TiltCard>
                      <MiniScoreCard label="Trivy" score={scan.trivyScore ?? scan.dependency_score ?? null}
                        description="Dependency vulnerability scan" icon="📦" />
                    </TiltCard>
                  </motion.div>

                  {/* Severity breakdown grid */}
                  <motion.div variants={cardVariants}>
                    <div className="rounded-2xl overflow-hidden"
                      style={{ background: 'rgba(5,10,24,0.82)', border: '1px solid rgba(0,212,255,0.10)', backdropFilter: 'blur(20px)' }}>
                      <div className="absolute top-0 left-8 right-8 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.4), transparent)' }} />
                      <div className="px-5 pt-5 pb-4">
                        <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'rgba(0,212,255,0.5)' }}>Severity Breakdown</p>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Semgrep */}
                          <div className="rounded-xl p-4" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)' }}>
                            <p className="text-xs font-bold mb-3" style={{ color: '#00d4ff' }}>🔬 Semgrep SAST</p>
                            <div className="space-y-2">
                              {[
                                { label: 'Critical', val: scan.semgrepCritical ?? 0, color: '#f87171' },
                                { label: 'High',     val: scan.semgrepHigh     ?? 0, color: '#fb923c' },
                                { label: 'Medium',   val: scan.semgrepMedium   ?? 0, color: '#fbbf24' },
                                { label: 'Low',      val: scan.semgrepLow      ?? 0, color: '#34d399' },
                              ].map(({ label, val, color }) => (
                                <div key={label} className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">{label}</span>
                                  <span className="text-sm font-black tabular-nums"
                                    style={{ color: val > 0 ? color : '#334155', textShadow: val > 0 ? `0 0 8px ${color}70` : 'none' }}>
                                    {val}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Trivy */}
                          <div className="rounded-xl p-4" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.12)' }}>
                            <p className="text-xs font-bold mb-3" style={{ color: '#a855f7' }}>📦 Trivy SCA</p>
                            <div className="space-y-2">
                              {[
                                { label: 'Critical', val: scan.trivyCritical ?? 0, color: '#f87171' },
                                { label: 'High',     val: scan.trivyHigh     ?? 0, color: '#fb923c' },
                                { label: 'Medium',   val: scan.trivyMedium   ?? 0, color: '#fbbf24' },
                                { label: 'Low',      val: scan.trivyLow      ?? 0, color: '#34d399' },
                              ].map(({ label, val, color }) => (
                                <div key={label} className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">{label}</span>
                                  <span className="text-sm font-black tabular-nums"
                                    style={{ color: val > 0 ? color : '#334155', textShadow: val > 0 ? `0 0 8px ${color}70` : 'none' }}>
                                    {val}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <TiltCard>
                      <ScoreCard score={scan.overallScore ?? scan.score} grade={computeGrade(scan.overallScore ?? scan.score)} summary={scan.summary} />
                    </TiltCard>
                  </motion.div>

                  {/* Findings preview panel — only shown when findings are present */}
                  {(scan.semgrepFindings || scan.trivyFindings) && (
                    <motion.div variants={cardVariants}>
                      <FindingsPanel
                        semgrepFindings={scan.semgrepFindings}
                        trivyFindings={scan.trivyFindings}
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Failed ── */}
            <AnimatePresence>
              {isFailed && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <TiltCard>
                    <GlassPanel style={{ border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 0 40px rgba(239,68,68,0.06)' }}>
                      <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-red-400"
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', boxShadow: '0 0 15px rgba(239,68,68,0.25)' }}>✕</div>
                        <div>
                          <p className="text-sm font-black text-red-300" style={{ textShadow: '0 0 10px rgba(239,68,68,0.4)' }}>Scan Failed</p>
                          <p className="text-xs text-slate-600 mt-0.5">The scan could not be completed</p>
                        </div>
                      </div>
                      <div className="px-6 py-4 space-y-4">
                        <div>
                          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: 'rgba(239,68,68,0.5)' }}>Error Details</p>
                          <div className="rounded-xl px-4 py-3 font-mono text-sm text-red-300 leading-relaxed"
                            style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                            {scan.errorMessage ?? 'An unknown error occurred during the scan.'}
                          </div>
                        </div>
                        <div className="rounded-xl px-4 py-3"
                          style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)' }}>
                          <p className="text-xs font-bold mb-2" style={{ color: 'rgba(251,191,36,0.7)' }}>⚠ Common Causes</p>
                          <ul className="space-y-1">
                            {[
                              'Semgrep or Trivy is not installed / not on PATH',
                              'Repository is private or URL is invalid',
                              'Network timeout during git clone or CVE DB download',
                              'First-time Trivy run — CVE database download (~500 MB) may time out',
                            ].map((hint) => (
                              <li key={hint} className="flex items-start gap-2 text-xs text-slate-500">
                                <span className="shrink-0 mt-0.5" style={{ color: 'rgba(251,191,36,0.5)' }}>·</span>
                                {hint}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="px-6 pb-5">
                        <motion.button onClick={handleRetryScan}
                          whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
                          className="btn-neon inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black tracking-wide text-white">
                          ↺ Try a New Scan
                        </motion.button>
                      </div>
                    </GlassPanel>
                  </TiltCard>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}
