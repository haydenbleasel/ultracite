const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./{app,mdx,components}/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontSize: {
        '2xs': '.6875rem',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Mona Sans', ...defaultTheme.fontFamily.sans],
      },
      opacity: {
        2.5: '0.025',
        7.5: '0.075',
        15: '0.15',
      },
    },
  },
  plugins: [],
}
