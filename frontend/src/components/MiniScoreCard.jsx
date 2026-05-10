import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * MiniScoreCard — Premium glassmorphism card for finding counts
 */
export default function MiniScoreCard({ label, count, description, icon }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });

  // Neon styling logic
  const isZero = count === 0;
  const neonColor = isZero ? '#10b981' : '#f87171'; // emerald for 0, red for >0
  const glowShadow = isZero ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-4 rounded-2xl p-6 relative overflow-hidden group h-full"
      style={{
        background: 'rgba(5, 10, 24, 0.7)',
        border: `1px solid rgba(255, 255, 255, 0.05)`,
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Animated glowing border effect */}
      <motion.div className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{ boxShadow: [`inset 0 0 5px ${glowShadow}`, `inset 0 0 15px ${glowShadow}`, `inset 0 0 5px ${glowShadow}`] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ border: `1px solid ${neonColor}30` }} 
      />

      {/* Label row */}
      <div className="flex items-center gap-3 relative z-10">
        {icon && (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg bg-slate-900/50 border border-slate-700/50 shadow-inner">
            {icon}
          </span>
        )}
        <div>
          <p className="text-sm font-bold tracking-wider text-slate-200">
            {label}
          </p>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>

      {/* Findings Count */}
      <div className="flex flex-col mt-3 relative z-10">
        <motion.span
          className="text-5xl font-mono font-black tabular-nums tracking-tight"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 150 }}
          style={{ 
            color: neonColor, 
            textShadow: `0 0 15px ${neonColor}80` 
          }}
        >
          {count ?? 0}
        </motion.span>
        <span className="text-[10px] font-bold tracking-widest uppercase mt-2 text-slate-500">
          Total Findings
        </span>
      </div>
    </motion.div>
  );
}
