import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import RepoSubmitForm from '../components/RepoSubmitForm';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────
   Animated canvas: dense particles + connecting lines
───────────────────────────────────────────────────────── */
function ParticleField() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let W = (canvas.width  = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const COLORS = ['rgba(0,212,255,', 'rgba(168,85,247,', 'rgba(16,185,129,', 'rgba(6,182,212,'];
    const pts = Array.from({ length: 110 }, () => ({
      x:   Math.random() * W,
      y:   Math.random() * H,
      r:   Math.random() * 1.6 + 0.2,
      dx:  (Math.random() - 0.5) * 0.3,
      dy:  (Math.random() - 0.5) * 0.3,
      a:   Math.random() * 0.6 + 0.1,
      col: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d  = Math.hypot(dx, dy);
          if (d < 140) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(0,212,255,${(1 - d / 140) * 0.12})`;
            ctx.lineWidth   = 0.7;
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.col}${p.a})`;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      }
      raf = requestAnimationFrame(tick);
    }
    tick();
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, opacity: 0.7 }} />;
}

/* ─────────────────────────────────────────────────────────
   3D-tilt card wrapper (mouse parallax)
───────────────────────────────────────────────────────── */
function TiltCard({ children, className = '', style = {} }) {
  const ref    = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    el.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 5}deg) scale3d(1.02,1.02,1.02)`;
  }, []);
  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)';
  }, []);
  return (
    <div ref={ref} className={className}
      style={{ transition:'transform 0.15s ease', transformStyle:'preserve-3d', willChange:'transform', ...style }}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Feature chip with Framer Motion hover
───────────────────────────────────────────────────────── */
function FeatureChip({ icon, label, description, accentColor, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.03, transition: { duration: 0.25 } }}
      className="flex flex-col items-center gap-3 p-5 rounded-2xl text-center cursor-default holo-shimmer"
      style={{
        background:     'rgba(6,12,28,0.75)',
        border:         `1px solid ${accentColor}25`,
        backdropFilter: 'blur(20px)',
        boxShadow:      `0 0 30px ${accentColor}12, 0 20px 40px rgba(0,0,0,0.4)`,
      }}
    >
      <motion.div
        className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl"
        style={{
          background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`,
          border:     `1px solid ${accentColor}35`,
          boxShadow:  `0 0 24px ${accentColor}30, inset 0 1px 0 rgba(255,255,255,0.07)`,
        }}
        whileHover={{ boxShadow: `0 0 40px ${accentColor}60, inset 0 1px 0 rgba(255,255,255,0.1)` }}
      >
        {icon}
      </motion.div>
      <div>
        <p className="text-sm font-bold text-slate-200">{label}</p>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Floating 3-D orb (pure CSS)
───────────────────────────────────────────────────────── */
function FloatingOrb({ color, size, top, left, right, bottom, blur = 160, opacity = 0.18 }) {
  return (
    <div className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, top, left, right, bottom,
        background: `radial-gradient(circle at 35% 35%, ${color}, transparent 70%)`,
        filter: `blur(${blur}px)`, opacity }} />
  );
}

/* ─────────────────────────────────────────────────────────
   Spinning dashed rings (decorative)
───────────────────────────────────────────────────────── */
function RingDecor({ size, color, speed = 'spin-ring', dash = '8 6', opacity = 0.25 }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      className={`absolute pointer-events-none ${speed}`} style={{ opacity }}>
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 2}
        fill="none" stroke={color} strokeWidth="1" strokeDasharray={dash} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   Animated counter number
───────────────────────────────────────────────────────── */
function AnimatedStat({ value, label, color, delay = 0 }) {
  const ref     = useRef(null);
  const inView  = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.04, transition: { duration: 0.2 } }}
      className="text-center py-5 rounded-2xl cursor-default"
      style={{
        background:     'rgba(6,12,28,0.55)',
        border:         `1px solid ${color}15`,
        backdropFilter: 'blur(12px)',
        boxShadow:      `0 0 30px ${color}08`,
      }}
    >
      <p className="text-3xl font-black tabular-nums"
        style={{ color, textShadow: `0 0 20px ${color}70` }}>
        {value}
      </p>
      <p className="text-xs text-slate-600 mt-1 font-medium tracking-wide uppercase">{label}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────── */
export default function SubmitPage() {
  return (
    <div className="min-h-screen relative overflow-hidden aurora-bg">
      <ParticleField />

      {/* Floating orbs (depth layers) */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <FloatingOrb color="#00d4ff" size="700px" top="-15%"  left="-10%"  blur={200} opacity={0.13} />
        <FloatingOrb color="#a855f7" size="600px" top="20%"   right="-15%" blur={200} opacity={0.10} />
        <FloatingOrb color="#10b981" size="400px" bottom="-10%" left="30%" blur={160} opacity={0.08} />
        <FloatingOrb color="#00d4ff" size="300px" top="60%"   right="10%"  blur={120} opacity={0.07} />
      </div>

      {/* Decorative grid overlay */}
      <div className="fixed inset-0 pointer-events-none cyber-grid" style={{ zIndex: 1 }} />

      <Navbar />

      <main className="relative px-6 pt-32 pb-24 mx-auto max-w-5xl" style={{ zIndex: 10 }}>

        {/* ═══════════════════ HERO ═══════════════════ */}
        <section className="text-center mb-20 space-y-7">

          {/* Glowing ring decor behind heading */}
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-8 pointer-events-none" style={{ zIndex: 0 }}>
            <div className="relative w-72 h-72 flex items-center justify-center">
              <RingDecor size={280} color="#00d4ff" speed="spin-ring-slow"    dash="10 8"  opacity={0.13} />
              <RingDecor size={220} color="#a855f7" speed="spin-ring-reverse" dash="6 10"  opacity={0.10} />
              <RingDecor size={160} color="#00d4ff" speed="spin-ring"         dash="4 12"  opacity={0.08} />
              <div className="absolute w-20 h-20 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.25) 0%, transparent 70%)', filter: 'blur(20px)' }} />
            </div>
          </div>

          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative z-10 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', backdropFilter: 'blur(12px)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(0,212,255,0.7)' }}>
              DevSecOps · Automated Security Analysis
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.06] tracking-tight"
          >
            <span className="block text-white" style={{ textShadow: '0 0 80px rgba(255,255,255,0.08)' }}>
              Scan Your Code.
            </span>
            <span className="block mt-2 gradient-heading"
              style={{ filter: 'drop-shadow(0 0 40px rgba(0,212,255,0.3))' }}>
              Secure Your Future.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-base sm:text-lg text-slate-400 max-w-lg mx-auto leading-relaxed"
          >
            Automatically scan any public GitHub repo with{' '}
            <span className="text-slate-200 font-semibold">Semgrep SAST</span> and{' '}
            <span className="text-slate-200 font-semibold">Trivy dependency analysis</span>.
            Get a comprehensive security score in under 2 minutes.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10"
          >
            <motion.a
              href="#scan-form"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="btn-neon inline-flex items-center gap-2.5 rounded-2xl px-9 py-4 text-sm font-black tracking-widest uppercase text-white no-underline"
              style={{ letterSpacing: '0.14em' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Start Scanning
            </motion.a>
          </motion.div>
        </section>

        {/* ═══════════════════ FEATURE GRID ═══════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
          <FeatureChip icon="🔬" label="Semgrep SAST"
            description="Static code analysis for security vulnerabilities and code quality issues"
            accentColor="#00d4ff" delay={0.44} />
          <FeatureChip icon="📦" label="Trivy SCA"
            description="Deep dependency & container image vulnerability scanning"
            accentColor="#a855f7" delay={0.54} />
          <FeatureChip icon="📊" label="Security Score"
            description="Composite A–F grade with per-tool breakdown and remediation guidance"
            accentColor="#10b981" delay={0.64} />
        </div>

        {/* ═══════════════════ GLASS SUBMIT CARD ═══════════════════ */}
        <motion.div
          id="scan-form"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.56, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-xl"
        >
          <TiltCard
            className="rounded-3xl holo-shimmer border-animated"
            style={{
              background:          'rgba(6, 11, 26, 0.82)',
              border:              '1px solid rgba(0,212,255,0.18)',
              backdropFilter:      'blur(28px)',
              WebkitBackdropFilter:'blur(28px)',
              boxShadow:
                '0 0 80px rgba(0,212,255,0.09), ' +
                '0 40px 80px rgba(0,0,0,0.6), ' +
                'inset 0 1px 0 rgba(255,255,255,0.06)',
              padding: '2rem',
            }}
          >
            {/* Card top glow strip */}
            <div className="absolute top-0 left-8 right-8 h-px rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.55), transparent)' }} />

            {/* Header */}
            <div className="flex items-center gap-4 mb-7">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                style={{ background: 'linear-gradient(135deg, #0055bb, #00d4ff)', boxShadow: '0 0 25px rgba(0,212,255,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                🛡
                <div className="absolute inset-0 rounded-2xl spin-ring"
                  style={{ border: '1px dashed rgba(0,212,255,0.4)', scale: '1.3' }} />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Repository Scanner</h2>
                <p className="text-xs text-slate-600 mt-0.5">Enter a public GitHub URL to begin analysis</p>
              </div>
              {/* Live dot */}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full animate-pulse"
                  style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                <span className="text-xs font-bold tracking-wide" style={{ color: 'rgba(16,185,129,0.7)' }}>LIVE</span>
              </div>
            </div>

            {/* Divider */}
            <div className="mb-7" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent)' }} />

            <RepoSubmitForm />

            {/* Footer */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.08))' }} />
              <Link to="/history"
                className="text-xs font-semibold transition-colors duration-200 no-underline px-2"
                style={{ color: 'rgba(0,212,255,0.35)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#00d4ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(0,212,255,0.35)'; }}>
                View scan history →
              </Link>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(270deg, transparent, rgba(0,212,255,0.08))' }} />
            </div>
          </TiltCard>
        </motion.div>

        {/* ═══════════════════ STATS ROW ═══════════════════ */}
        <div className="mt-16 grid grid-cols-3 gap-6">
          <AnimatedStat value="100%" label="Open Source" color="#00d4ff" delay={0.68} />
          <AnimatedStat value="<2m"  label="Scan Time"   color="#a855f7" delay={0.76} />
          <AnimatedStat value="2x"   label="Tools Used"  color="#10b981" delay={0.84} />
        </div>

      </main>
    </div>
  );
}
