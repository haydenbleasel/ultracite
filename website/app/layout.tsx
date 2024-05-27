import '../styles/tailwind.css';
import 'focus-visible';
import { twMerge } from 'tailwind-merge';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import type { ReactNode, FC } from 'react';

type RootLayoutProps = {
  readonly children: ReactNode;
};

const RootLayout: FC<RootLayoutProps> = ({ children }) => (
  <html lang="en" className="h-full scroll-smooth antialiased">
    <body
      className={twMerge(
        'bg-white font-sans',
        GeistSans.variable,
        GeistMono.variable
      )}
    >
      {children}
    </body>
  </html>
);

export default RootLayout;
