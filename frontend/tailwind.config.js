/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          blue:   '#00d4ff',
          purple: '#a855f7',
          cyan:   '#06b6d4',
          green:  '#10b981',
          pink:   '#ec4899',
          amber:  '#fbbf24',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'spin-ring':         'spinRing 4s linear infinite',
        'spin-ring-reverse': 'spinRingReverse 6s linear infinite',
        'spin-ring-slow':    'spinRing 12s linear infinite',
        'aurora':            'aurora 20s ease infinite',
        'fade-in-up':        'fadeInUp 0.65s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in':           'fadeIn 0.45s ease forwards',
        'float':             'float 7s ease-in-out infinite',
        'pulse-glow':        'pulseGlow 2.5s ease-in-out infinite',
        'scan-line':         'scanLine 3s ease-in-out infinite',
        'terminal-blink':    'terminalBlink 1s step-end infinite',
        'progress-beam':     'progressBeam 2s ease-in-out infinite',
        'shimmer':           'shimmer 3.5s ease-in-out infinite',
        'shimmer-fast':      'shimmer 2s ease-in-out infinite',
        'border-flow':       'borderFlow 3s linear infinite',
        'number-up':         'numberUp 0.8s cubic-bezier(0.22,1,0.36,1) forwards',
      },
      keyframes: {
        spinRing: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        spinRingReverse: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(-360deg)' },
        },
        aurora: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%':      { 'background-position': '100% 50%' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-14px)' },
        },
        pulseGlow: {
          '0%, 100%': { 'box-shadow': '0 0 20px rgba(0,212,255,0.2), 0 0 40px rgba(0,212,255,0.05)' },
          '50%':      { 'box-shadow': '0 0 40px rgba(0,212,255,0.5), 0 0 80px rgba(0,212,255,0.15)' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)', opacity: '0' },
          '10%':  { opacity: '0.6' },
          '90%':  { opacity: '0.6' },
          '100%': { transform: 'translateY(200%)', opacity: '0' },
        },
        terminalBlink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        progressBeam: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(500%)' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%) rotate(25deg)' },
          '100%': { transform: 'translateX(300%) rotate(25deg)' },
        },
        borderFlow: {
          '0%':   { 'background-position': '0% 50%' },
          '100%': { 'background-position': '200% 50%' },
        },
        numberUp: {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.9)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
    },
  },
  plugins: [],
};
