/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#E6EBFF',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: '#0A3AFF',
          600: '#042391',
          700: '#031C74',
          800: '#021457',
          900: '#010C3A',
        },
        navy: {
          950: 'rgb(var(--navy-950) / <alpha-value>)',
          900: 'rgb(var(--navy-900) / <alpha-value>)',
          800: 'rgb(var(--navy-800) / <alpha-value>)',
          700: 'rgb(var(--navy-700) / <alpha-value>)',
          600: 'rgb(var(--navy-600) / <alpha-value>)',
          500: 'rgb(var(--navy-500) / <alpha-value>)',
        },
        fg: 'rgb(var(--fg) / <alpha-value>)',
        // Only the 300/400 shades are overridden — these are the ones used
        // as status-badge/icon text (e.g. StatusPill.jsx) directly on the
        // page or on a same-hue translucent tint. The dark-theme values
        // (pale, tuned for a dark background) are unreadable on a light one,
        // so light mode swaps in a darker, more saturated shade of the same
        // hue. 500+ stay fixed hex — those are solid button/badge fills with
        // literal white text, unaffected by page theme either way.
        green:  { 300: 'rgb(var(--green-300) / <alpha-value>)',  400: 'rgb(var(--green-400) / <alpha-value>)' },
        red:    { 300: 'rgb(var(--red-300) / <alpha-value>)',    400: 'rgb(var(--red-400) / <alpha-value>)' },
        yellow: { 300: 'rgb(var(--yellow-300) / <alpha-value>)', 400: 'rgb(var(--yellow-400) / <alpha-value>)' },
        blue:   { 300: 'rgb(var(--blue-300) / <alpha-value>)',   400: 'rgb(var(--blue-400) / <alpha-value>)' },
        orange: { 300: 'rgb(var(--orange-300) / <alpha-value>)', 400: 'rgb(var(--orange-400) / <alpha-value>)' },
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.35s ease-out',
      },
    },
  },
  plugins: [],
}
