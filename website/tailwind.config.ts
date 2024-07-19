import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
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
      typography: (theme: (path: string) => string) => ({
        // biome-ignore lint/style/useNamingConvention: This is a Tailwind CSS plugin
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
  plugins: [typography, animate],
};

export default config;
