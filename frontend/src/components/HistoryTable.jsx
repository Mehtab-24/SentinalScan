import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from './StatusBadge';

/**
 * HistoryTable — dark neon table with staggered row entrance and hover glow.
 * @param {{ scans: Array }} props
 */
export default function HistoryTable({ scans = [] }) {
  const navigate = useNavigate();

  if (scans.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-2xl py-20 text-center"
        style={{ background: 'rgba(4,10,22,0.62)', border: '1px solid rgba(0,212,255,0.08)', backdropFilter: 'blur(16px)' }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-2xl mb-4"
          style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>
          🔍
        </div>
        <p className="text-base font-bold tracking-wide" style={{ color: 'rgba(0,212,255,0.7)' }}>
          No scans yet
        </p>
        <p className="text-xs text-slate-600 mt-1">Submit a repository to get started</p>
      </motion.div>
    );
  }

  const scoreColor = (s) => {
    if (s == null) return '#475569';
    if (s >= 80)   return '#10b981';
    if (s >= 50)   return '#fbbf24';
    return '#f87171';
  };

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -16 },
    show:   { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div className="overflow-x-auto rounded-2xl"
      style={{ background: 'rgba(4,10,22,0.65)', border: '1px solid rgba(0,212,255,0.09)', backdropFilter: 'blur(18px)' }}>
      {/* Top glow strip */}
      <div className="absolute top-0 left-12 right-12 h-px rounded-full"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.4), transparent)' }} />

      <table className="min-w-full text-sm">
        {/* Head */}
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
            {['Repository', 'Status', 'Score', 'Date', ''].map((col, i) => (
              <th key={col + i}
                className={`px-6 py-4 text-xs font-bold tracking-widest uppercase ${i === 4 ? 'text-right' : 'text-left'}`}
                style={{ color: 'rgba(0,212,255,0.4)', background: 'rgba(0,212,255,0.02)' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <motion.tbody
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence>
            {scans.map((scan, idx) => (
              <motion.tr
                key={scan.id}
                variants={rowVariants}
                className="cursor-pointer transition-all duration-200 table-row-hover"
                onClick={() => navigate(`/scans/${scan.id}`)}
                style={{ borderBottom: idx < scans.length - 1 ? '1px solid rgba(0,212,255,0.05)' : 'none' }}
                whileHover={{ backgroundColor: 'rgba(0,212,255,0.03)' }}
              >
                {/* Repository */}
                <td className="px-6 py-4 max-w-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs"
                      style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', color: '#00d4ff80' }}>
                      ⬡
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-200 truncate">
                        {scan.repoName ?? scan.repoUrl ?? `Scan #${scan.id}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(0,212,255,0.35)' }}>#{String(scan.id).slice(0, 8)}…</p>
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <StatusBadge status={scan.status} />
                </td>

                {/* Score */}
                <td className="px-6 py-4">
                  {scan.overallScore != null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black tabular-nums"
                        style={{ color: scoreColor(scan.overallScore), textShadow: `0 0 10px ${scoreColor(scan.overallScore)}80` }}>
                        {scan.overallScore}
                      </span>
                      <span className="text-xs text-slate-600">/ 100</span>
                    </div>
                  ) : (
                    <span style={{ color: '#334155' }}>—</span>
                  )}
                </td>

                {/* Date */}
                <td className="px-6 py-4" style={{ color: '#475569' }}>
                  {scan.createdAt
                    ? new Date(scan.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </td>

                {/* Action */}
                <td className="px-6 py-4 text-right">
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); navigate(`/scans/${scan.id}`); }}
                    className="rounded-xl px-4 py-2 text-xs font-bold tracking-wide uppercase transition-all duration-200"
                    style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff80' }}
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(0,212,255,0.12)', color: '#00d4ff', boxShadow: '0 0 14px rgba(0,212,255,0.2)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    View →
                  </motion.button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </motion.tbody>
      </table>
    </div>
  );
}
