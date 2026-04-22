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
        },
      },
      backgroundImage: {
        'cyber-grid': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%23ffffff' stroke-opacity='0.03' stroke-width='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'glow-pulse':    'glowPulse 2s ease-in-out infinite',
        'float':         'float 6s ease-in-out infinite',
        'scan-line':     'scanLine 3s linear infinite',
        'border-glow':   'borderGlow 2s ease-in-out infinite',
        'gradient-x':    'gradientX 4s ease infinite',
        'fade-in-up':    'fadeInUp 0.6s ease-out forwards',
        'fade-in':       'fadeIn 0.4s ease-out forwards',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%':      { opacity: '0.7', filter: 'brightness(1.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        borderGlow: {
          '0%, 100%': { 'box-shadow': '0 0 5px rgba(0,212,255,0.3), inset 0 0 5px rgba(0,212,255,0.1)' },
          '50%':      { 'box-shadow': '0 0 20px rgba(0,212,255,0.6), inset 0 0 10px rgba(0,212,255,0.2)' },
        },
        gradientX: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%':      { 'background-position': '100% 50%' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
