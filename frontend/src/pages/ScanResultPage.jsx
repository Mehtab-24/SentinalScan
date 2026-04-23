import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getScan } from '../api/scanApi';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import ScoreCard from '../components/ScoreCard';
import MiniScoreCard from '../components/MiniScoreCard';
import Spinner from '../components/Spinner';

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED'];
const ACTIVE_STATUSES   = ['PENDING', 'RUNNING', 'IN_PROGRESS'];
const POLL_INTERVAL_MS  = 4000;

/* Terminal log lines that animate in sequence */
const TERMINAL_LINES = [
  { text: '> Initializing scan environment...', color: '#00d4ff', delay: 0 },
  { text: '> Cloning repository from GitHub...', color: '#94a3b8', delay: 0.4 },
  { text: '> Running Semgrep SAST analysis...', color: '#a855f7', delay: 0.9 },
  { text: '  → Scanning for security vulnerabilities', color: '#64748b', delay: 1.3 },
  { text: '  → Checking code quality patterns', color: '#64748b', delay: 1.7 },
  { text: '> Running Trivy dependency scan...', color: '#a855f7', delay: 2.2 },
  { text: '  → Scanning CVE database...', color: '#64748b', delay: 2.6 },
  { text: '  → Checking SBOM for vulnerabilities', color: '#64748b', delay: 3.1 },
  { text: '> Calculating composite security score...', color: '#10b981', delay: 3.6 },
  { text: '> Awaiting results...', color: '#fbbf24', delay: 4.0, blink: true },
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

/* ── Active Scanning — Terminal UI ── */
function TerminalScanUI({ scanId }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timers = TERMINAL_LINES.map((line, i) =>
      setTimeout(() => setVisibleLines(v => Math.max(v, i + 1)), line.delay * 1000)
    );
    // Animate progress bar
    const progressTimer = setInterval(() => {
      setProgress(p => {
        if (p >= 85) { clearInterval(progressTimer); return 85; }
        return p + Math.random() * 2.5;
      });
    }, 300);
    return () => { timers.forEach(clearTimeout); clearInterval(progressTimer); };
  }, []);

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
          <div className="ml-auto flex items-center gap-1.5">
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

        {/* Progress bar */}
        <div className="px-7 pb-6">
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
          <p className="text-xs text-slate-600 mt-2 text-center">Auto-refreshing every 4s · Up to 1–2 minutes total</p>
        </div>
      </GlassPanel>
    </motion.div>
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
  const intervalRef                 = useRef(null);

  const startPolling = useCallback(() => {
    async function fetchScan() {
      try {
        const data = await getScan(id);
        setScan(data);
        setFetchError('');
        if (TERMINAL_STATUSES.includes(data.status)) clearInterval(intervalRef.current);
      } catch (err) {
        setFetchError(err.response?.data?.message ?? 'Could not reach the server.');
        clearInterval(intervalRef.current);
      }
    }
    fetchScan();
    intervalRef.current = setInterval(fetchScan, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [id]);

  useEffect(() => { const c = startPolling(); return c; }, [startPolling]);

  function handleRetryFetch() {
    setFetchError(''); setRetrying(true);
    clearInterval(intervalRef.current);
    setTimeout(() => { setRetrying(false); startPolling(); }, 600);
  }
  function handleRetryScan() { navigate('/'); }

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
                        <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(0,212,255,0.35)' }}>ID · {id}</p>
                      </div>
                    </div>
                    <StatusBadge status={scan.status} />
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
              {isActive && <TerminalScanUI scanId={id} />}
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

                  {/* 3-card grid: Semgrep + Trivy + Overall */}
                  <motion.div variants={cardVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TiltCard>
                      <MiniScoreCard label="Semgrep" score={scan.semgrepScore ?? scan.sast_score ?? null}
                        description="Static code analysis" icon="🔬" />
                    </TiltCard>
                    <TiltCard>
                      <MiniScoreCard label="Trivy" score={scan.trivyScore ?? scan.dependency_score ?? null}
                        description="Dependency vulnerability scan" icon="📦" />
                    </TiltCard>
                  </motion.div>

                  <motion.div variants={cardVariants}>
                    <TiltCard>
                      <ScoreCard score={scan.overallScore ?? scan.score} grade={scan.grade} summary={scan.summary} />
                    </TiltCard>
                  </motion.div>
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
                      <div className="px-6 py-4">
                        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(239,68,68,0.5)' }}>Error Details</p>
                        <div className="rounded-xl px-4 py-3 font-mono text-sm text-red-300 leading-relaxed"
                          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                          {scan.errorMessage ?? 'An unknown error occurred during the scan.'}
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
