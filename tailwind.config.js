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
          50:  '#E6F1FB',
          100: '#CCE3F7',
          200: '#99C7EF',
          300: '#66AAEB',
          400: '#3393E8',
          500: '#1A7AE0',
          600: '#185FA5',
          700: '#134D87',
          800: '#0E3A69',
          900: '#0A274B',
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
