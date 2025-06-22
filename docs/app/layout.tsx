import { Toaster } from '@/components/ui/sonner';
import './global.css';
import { Analytics } from '@vercel/analytics/next';
import { RootProvider } from 'fumadocs-ui/provider';
import { cn } from 'fumadocs-ui/utils/cn';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
};

const sans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: 'variable',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: 'variable',
});

const Layout = ({ children }: LayoutProps) => (
  <html
    className={cn(
      'touch-manipulation font-sans antialiased',
      sans.variable,
      mono.variable
    )}
    lang="en"
    suppressHydrationWarning
  >
    <body className="flex min-h-screen flex-col">
      <RootProvider
        theme={{
          forcedTheme: 'dark',
        }}
      >
        {children}
      </RootProvider>
      <Toaster />
      <Analytics />
    </body>
  </html>
);

export default Layout;
