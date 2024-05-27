import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          50: '#fff8f3',
          100: '#ffe8d8',
          200: '#ffc59b',
          300: '#fc9c66',
          400: '#fd812d',
          500: '#f35815',
          600: '#b83a05',
          700: '#962d00',
          800: '#672002',
          900: '#3c1403',
          950: '#240b00',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      typography: (theme: (path: string) => string) => ({
        DEFAULT: {
          css: {
            color: theme('colors.neutral.600'),
            letterSpacing: '-0.01em',
            a: {
              color: theme('colors.orange.500'),
              transition: 'color 0.2s ease',
              '&:hover': {
                color: theme('colors.orange.600'),
              },
            },
            'h1, h2, h3, h4, h5, h6': {
              fontWeight: theme('fontWeight.semibold'),
              letterSpacing: '-0.02em',
            },
            pre: {
              padding: theme('spacing.6'),
              backgroundColor: theme('colors.white'),
              color: theme('colors.neutral.900'),
              borderWidth: 1,
              borderColor: theme('colors.neutral.200'),
              borderRadius: theme('borderRadius.lg'),
            },
          },
        },
        invert: {
          css: {
            color: theme('colors.neutral.400'),
          },
        },
      }),
    },
  },
  plugins: [typography],
};

export default config;
