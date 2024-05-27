import '../styles/tailwind.css';
import '../styles/github-light.css';
import '../styles/github.css';
import 'focus-visible';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/react';
import { cn } from '@/lib/utils';
import type { ReactNode, FC } from 'react';

type RootLayoutProps = {
  readonly children: ReactNode;
};

const RootLayout: FC<RootLayoutProps> = ({ children }) => (
  <html lang="en" className="h-full scroll-smooth antialiased">
    <body
      className={cn(
        'bg-white font-sans',
        GeistSans.variable,
        GeistMono.variable
      )}
    >
      {children}
      <Analytics />
    </body>
  </html>
);

export default RootLayout;
