import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistory } from '../api/scanApi';
import Navbar from '../components/Navbar';
import HistoryTable from '../components/HistoryTable';
import Spinner from '../components/Spinner';

/* 3D tilt card */
function TiltCard({ children, className = '', style = {} }) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const x  = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    const y  = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    el.style.transform = `perspective(800px) rotateY(${x * 4}deg) rotateX(${-y * 3}deg) scale3d(1.01,1.01,1.01)`;
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

const statConfigs = [
  { key: 'total',     label: 'Total Scans', color: '#00d4ff', icon: '📡', bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.15)' },
  { key: 'completed', label: 'Completed',   color: '#10b981', icon: '✓',  bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)' },
  { key: 'failed',    label: 'Failed',      color: '#f87171', icon: '✕',  bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.2)'  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * HistoryPage — dark futuristic scan history with staggered animations.
 */
export default function HistoryPage() {
  const [scans, setScans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await getHistory();
        setScans(data);
      } catch (err) {
        setError(err.response?.data?.message ?? 'Failed to load scan history.');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const completed = scans.filter((s) => s.status === 'COMPLETED').length;
  const failed    = scans.filter((s) => s.status === 'FAILED').length;

  const statsValues = { total: scans.length, completed, failed };

  return (
    <div className="min-h-screen aurora-bg">
      {/* depth orbs */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full" style={{ width: 700, height: 700, top: '-25%', right: '-20%', background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)', filter: 'blur(100px)' }} />
        <div className="absolute rounded-full" style={{ width: 500, height: 500, bottom: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      <div className="fixed inset-0 pointer-events-none cyber-grid" style={{ zIndex: 1 }} />

      <Navbar />

      <main className="relative mx-auto max-w-5xl px-6 pt-28 pb-16 space-y-6" style={{ zIndex: 10 }}>

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-3"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
              <span className="text-xs font-black tracking-widest uppercase" style={{ color: 'rgba(168,85,247,0.7)' }}>
                Security Intelligence
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-100"
              style={{ textShadow: '0 0 40px rgba(168,85,247,0.15)' }}>
              Scan History
            </h1>
            <p className="text-sm text-slate-600 mt-1">All past security scans across your repositories</p>
          </div>

          <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}>
            <Link to="/"
              className="btn-neon inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black tracking-widest uppercase text-white no-underline"
              style={{ letterSpacing: '0.12em' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Scan
            </Link>
          </motion.div>
        </motion.div>

        {/* ── Stats grid ── */}
        <AnimatePresence>
          {!loading && !error && scans.length > 0 && (
            <motion.div
              className="grid grid-cols-3 gap-5"
              initial="hidden"
              animate="show"
              variants={containerVariants}
            >
              {statConfigs.map(({ key, label, color, icon, bg, border }) => (
                <motion.div key={key} variants={cardVariants}>
                  <TiltCard>
                    <motion.div
                      className="rounded-2xl p-6 flex items-center gap-4 holo-shimmer"
                      style={{ background: bg, border: `1px solid ${border}`, backdropFilter: 'blur(20px)', boxShadow: `0 0 30px ${color}10, 0 20px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)` }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-black"
                        style={{ background: `linear-gradient(135deg, ${color}25, ${color}08)`, border: `1px solid ${color}30`, boxShadow: `0 0 15px ${color}25`, color, fontSize: '16px' }}>
                        {icon}
                      </div>
                      <div>
                        <p className="text-4xl font-black tabular-nums leading-none"
                          style={{ color, textShadow: `0 0 20px ${color}60` }}>
                          {statsValues[key]}
                        </p>
                        <p className="text-xs font-bold tracking-widest uppercase mt-1.5"
                          style={{ color: `${color}55` }}>
                          {label}
                        </p>
                      </div>
                    </motion.div>
                  </TiltCard>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading ── */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl py-24 flex flex-col items-center gap-6"
              style={{ background: 'rgba(5,10,24,0.8)', border: '1px solid rgba(0,212,255,0.08)', backdropFilter: 'blur(20px)' }}
            >
              <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
                {[120, 90, 60].map((s, i) => (
                  <div key={s} className="absolute rounded-full border"
                    style={{ width: s, height: s, borderColor: `rgba(0,212,255,${0.08 + i * 0.05})`, borderStyle: 'dashed', animation: `${i % 2 === 0 ? 'spinRing' : 'spinRingReverse'} ${5 + i * 3}s linear infinite`, borderWidth: '1px' }} />
                ))}
                <Spinner size="h-8 w-8" color="text-cyan-400" />
              </div>
              <p className="text-sm text-slate-500">Loading scan history…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl px-6 py-5 flex gap-4"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <span className="text-red-400 text-xl shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-bold text-red-300">Failed to load history</p>
                <p className="text-sm text-red-400 mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Table ── */}
        <AnimatePresence>
          {!loading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <HistoryTable scans={scans} />
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
