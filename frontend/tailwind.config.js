/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#f3eee3',
          900: '#fbf7ee',
          850: '#fffdf7',
          800: '#e9e1d2',
          750: '#ded4c3',
          700: '#c9beaa',
          600: '#a99c86',
        },
        paper: '#171511',
        mist: '#5e574c',
        dim: '#8f8677',
        teal: {
          100: '#162fa8',
          200: '#1e3ad1',
          300: '#2b4bf2',
          400: '#4d6aff',
          500: '#8b9dff',
          600: '#b9c4ff',
          700: '#dfe4ff',
        },
        amber: {
          100: '#7a2c0c',
          200: '#a9360f',
          300: '#df4b16',
          400: '#ff6a33',
          500: '#ff8b5f',
        },
        rust: '#c92a2a',
        lime: '#d7f75b',
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
        lift: '0 30px 90px -45px rgba(23,21,17,0.42)',
        soft: '0 18px 55px -35px rgba(23,21,17,0.3)',
        insetline: 'inset 0 1px 0 0 rgba(255,255,255,0.8)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(rgba(23,21,17,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(23,21,17,0.055) 1px, transparent 1px)',
        'paper-wash':
          'radial-gradient(1200px 720px at 88% -12%, rgba(255,106,51,0.15), transparent 62%), radial-gradient(980px 680px at 2% 8%, rgba(43,75,242,0.1), transparent 60%)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.8s ease-in-out infinite',
        float: 'float 8s ease-in-out infinite',
        marquee: 'marquee 34s linear infinite',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -12px, 0)' },
        },
        marquee: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-50%, 0, 0)' },
        },
      },
    },
  },
  plugins: [],
};
