import { useEffect, useRef } from 'react';
import RepoSubmitForm from '../components/RepoSubmitForm';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

/** Animated particle canvas background */
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas  = canvasRef.current;
    if (!canvas) return;
    const ctx     = canvas.getContext('2d');
    let raf;
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const particles = Array.from({ length: 80 }, () => ({
      x:    Math.random() * W,
      y:    Math.random() * H,
      r:    Math.random() * 1.5 + 0.3,
      dx:   (Math.random() - 0.5) * 0.3,
      dy:   (Math.random() - 0.5) * 0.3,
      a:    Math.random() * 0.6 + 0.1,
      blue: Math.random() > 0.5,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.blue
          ? `rgba(0,212,255,${p.a})`
          : `rgba(168,85,247,${p.a})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      }
      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const alpha = (1 - d / 120) * 0.12;
            ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }

    draw();

    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.7 }}
    />
  );
}

/** Feature chip */
function FeatureChip({ icon, label, description }) {
  return (
    <div
      className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all duration-300 text-center"
      style={{
        background:     'rgba(4,10,22,0.7)',
        border:         '1px solid rgba(0,212,255,0.1)',
        backdropFilter: 'blur(12px)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)';
        e.currentTarget.style.boxShadow   = '0 0 20px rgba(0,212,255,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)';
        e.currentTarget.style.boxShadow   = 'none';
      }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
        style={{
          background: 'rgba(0,212,255,0.1)',
          border:     '1px solid rgba(0,212,255,0.2)',
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-200">{label}</p>
        <p className="text-xs text-slate-600 mt-1">{description}</p>
      </div>
    </div>
  );
}

/**
 * SubmitPage — full-screen hero with animated particles + glass submit card.
 * Route: /
 */
export default function SubmitPage() {
  return (
    <div className="min-h-screen relative" style={{ background: '#020408' }}>
      {/* Animated particle background */}
      <ParticleCanvas />

      {/* Radial glow blobs */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-20%', left: '-10%',
          width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: '-20%', right: '-10%',
          width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      {/* Scan line */}
      <div className="scan-line" />

      {/* Navbar */}
      <Navbar />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-32 pb-20">

        {/* ── Hero Section ── */}
        <div className="text-center mb-20 space-y-6">
          {/* Status pill */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-2 animate-fade-in"
            style={{
              background: 'rgba(0,212,255,0.06)',
              border:     '1px solid rgba(0,212,255,0.2)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }}
            />
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: '#00d4ff80' }}
            >
              DevSecOps · Automated Security Analysis
            </span>
          </div>

          {/* Main heading */}
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight animate-fade-in-up"
            style={{ animationDelay: '0.1s', opacity: 0 }}
          >
            <span className="block text-white">Scan Your Code.</span>
            <span
              className="block mt-1"
              style={{
                background:           'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
                backgroundClip:       'text',
                textShadow:           'none',
                filter:               'drop-shadow(0 0 30px rgba(0,212,255,0.3))',
              }}
            >
              Secure Your Future.
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '0.2s', opacity: 0 }}
          >
            Automatically scan any public GitHub repository with{' '}
            <span className="text-slate-200 font-medium">Semgrep SAST</span> and{' '}
            <span className="text-slate-200 font-medium">Trivy dependency analysis</span>.
            Get a comprehensive security score in under 2 minutes.
          </p>

          {/* CTA link to form */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '0.3s', opacity: 0 }}
          >
            <a
              href="#scan-form"
              className="btn-neon inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-sm font-bold tracking-widest uppercase text-white no-underline"
              style={{ letterSpacing: '0.12em' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Start Scanning
            </a>
          </div>
        </div>

        {/* ── Feature grid ── */}
        <div
          className="grid grid-cols-3 gap-4 mb-16 animate-fade-in-up"
          style={{ animationDelay: '0.4s', opacity: 0 }}
        >
          <FeatureChip icon="🔬" label="Semgrep SAST"   description="Static code analysis for security vulnerabilities" />
          <FeatureChip icon="📦" label="Trivy SCA"      description="Dependency & container vulnerability scanning" />
          <FeatureChip icon="📊" label="Security Score" description="Composite A–F grade based on findings" />
        </div>

        {/* ── Submit card ── */}
        <div
          id="scan-form"
          className="mx-auto max-w-xl rounded-3xl p-8 animate-fade-in-up"
          style={{
            background:     'rgba(4, 10, 22, 0.75)',
            border:         '1px solid rgba(0,212,255,0.15)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow:      '0 0 60px rgba(0,212,255,0.06), 0 32px 64px rgba(0,0,0,0.5)',
            animationDelay: '0.5s',
            opacity:        0,
          }}
        >
          {/* Card header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
              style={{
                background: 'linear-gradient(135deg, #0066cc, #00d4ff)',
                boxShadow:  '0 0 20px rgba(0,212,255,0.4)',
              }}
            >
              🛡
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Repository Scanner
              </h2>
              <p className="text-xs text-slate-600">Enter a public GitHub URL to begin</p>
            </div>
          </div>

          {/* Divider */}
          <div
            className="mb-6"
            style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.2), transparent)' }}
          />

          <RepoSubmitForm />

          {/* Footer note */}
          <div className="mt-5 flex items-center justify-center gap-4">
            <Link
              to="/history"
              className="text-xs transition-colors duration-200 no-underline"
              style={{ color: 'rgba(0,212,255,0.4)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#00d4ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(0,212,255,0.4)'; }}
            >
              View scan history →
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
