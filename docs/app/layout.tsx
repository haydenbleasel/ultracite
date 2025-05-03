import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { cn } from 'fumadocs-ui/utils/cn';

type LayoutProps = {
  children: ReactNode;
};

const sans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const Layout = ({ children }: LayoutProps) => (
  <html lang="en" className={cn(
    'touch-manipulation font-sans antialiased',
    sans.variable,
    mono.variable
  )} suppressHydrationWarning>
    <body className="flex flex-col min-h-screen">
      <RootProvider>{children}</RootProvider>
    </body>
  </html>
);

export default Layout;
