import type { FC, ReactNode } from 'react';
import '../styles/tailwind.css';
import 'focus-visible';
import { Layout } from '../components/Layout'
import clsx from 'clsx';
import { display, mono, sans } from '../lib/fonts';

const RootLayout: FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className={clsx(
          "flex min-h-full font-sans flex-col bg-white dark:bg-gray-950",
          sans.variable,
          mono.variable,
          display.variable
        )}
      >
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  );
};

export default RootLayout;
