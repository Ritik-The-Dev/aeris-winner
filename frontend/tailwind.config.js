/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#04090c',
          900: '#071116',
          850: '#09171d',
          800: '#0c1d24',
          750: '#10262e',
          700: '#15313a',
          600: '#1d414b',
        },
        paper: '#eeeade',
        mist: '#a9b7b6',
        dim: '#758684',
        teal: {
          200: '#a8f2e8',
          300: '#74e5d9',
          400: '#3fd4c5',
          500: '#1fb9ac',
          600: '#138e86',
          700: '#0c6964',
        },
        amber: {
          200: '#f6d8ad',
          300: '#f0bb78',
          400: '#e89b4b',
          500: '#d77d2e',
        },
        rust: '#b9563f',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Manrope Variable"', 'Manrope', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        label: '0.18em',
      },
      opacity: {
        8: '0.08',
        12: '0.12',
        15: '0.15',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
      },
      boxShadow: {
        lift: '0 24px 80px -32px rgba(0,0,0,0.8)',
        insetline: 'inset 0 1px 0 0 rgba(238,234,222,0.05)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(rgba(116,229,217,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(116,229,217,0.05) 1px, transparent 1px)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.8s ease-in-out infinite',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
