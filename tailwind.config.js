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
          100: '#CCD6FF',
          200: '#99ADFF',
          300: '#6685FF',
          400: '#335CFF',
          500: '#0A3AFF',
          600: '#042391',
          700: '#031C74',
          800: '#021457',
          900: '#010C3A',
        },
        navy: {
          950: '#0A0A0A',
          900: '#131313',
          800: '#1C1C1C',
          700: '#232323',
          600: '#2C2C2C',
          500: '#383838',
        },
      },
    },
  },
  plugins: [],
}
