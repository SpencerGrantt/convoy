/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#E6F1FB',
          100: '#CCE3F7',
          200: '#99C7EF',
          300: '#66AAEB',
          400: '#3393E8',
          500: '#1A7AE0',
          600: '#185FA5',  // primary action
          700: '#134D87',
          800: '#0E3A69',
          900: '#0A274B',
        },
      },
    },
  },
  plugins: [],
}
