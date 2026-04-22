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
        },
      },
      animation: {
        'spin-ring':         'spinRing 4s linear infinite',
        'spin-ring-reverse': 'spinRingReverse 6s linear infinite',
        'spin-ring-slow':    'spinRing 12s linear infinite',
        'aurora':            'aurora 20s ease infinite',
        'fade-in-up':        'fadeInUp 0.65s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in':           'fadeIn 0.45s ease forwards',
        'float':             'float 7s ease-in-out infinite',
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
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
