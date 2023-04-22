import type { FC, ReactNode } from 'react';
import '../styles/tailwind.css';
import 'focus-visible';
import { Layout } from '../components/Layout'

const RootLayout: FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="flex min-h-full flex-col bg-white dark:bg-gray-950"
      >
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  );
};

export default RootLayout;
