import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * ScoreCard — Premium overall summary card with total findings
 */
export default function ScoreCard({ count, summary }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const isZero = count === 0;
  const neonColor = isZero ? '#10b981' : '#f87171'; // Emerald or Red
  const neonGlow = isZero ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';

  return (
    <motion.section
      ref={ref}
      aria-label="Overall Security Findings"
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-8 relative overflow-hidden group"
      style={{
        background: 'rgba(5, 10, 24, 0.8)',
        border: `1px solid rgba(255, 255, 255, 0.05)`,
        backdropFilter: 'blur(25px)',
      }}
    >
      {/* Animated glowing border effect */}
      <motion.div 
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-700"
        animate={{ boxShadow: [`inset 0 0 10px ${neonGlow}`, `inset 0 0 25px ${neonGlow}`, `inset 0 0 10px ${neonGlow}`] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ border: `1px solid ${neonColor}40` }} 
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        
        {/* Left side: Header & Findings count */}
        <div className="flex-1">
          <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-3">
            Overall Assessment
          </p>
          <div className="flex items-baseline gap-3 mb-2">
            <motion.span
              className="text-7xl font-mono font-black tabular-nums tracking-tighter"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.7, delay: 0.2, type: 'spring', stiffness: 120 }}
              style={{ color: neonColor, textShadow: `0 0 20px ${neonColor}80` }}
            >
              {count ?? 0}
            </motion.span>
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase text-slate-500">
            Total Raw Findings
          </span>
        </div>

        {/* Right side: AI Summary */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex-1 rounded-xl p-5 w-full"
            style={{ 
              background: 'rgba(15, 23, 42, 0.4)', 
              border: '1px solid rgba(255, 255, 255, 0.03)',
              boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              {summary}
            </p>
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
