import {
  Inter as createSans,
  Inter_Tight as createDisplay,
  IBM_Plex_Mono as createMono,
} from 'next/font/google';

export const display = createDisplay({
  weight: 'variable',
  subsets: ['latin'],
  variable: '--font-display',
});

export const sans = createSans({
  weight: 'variable',
  subsets: ['latin'],
  variable: '--font-sans',
});

export const mono = createMono({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-mono',
});
