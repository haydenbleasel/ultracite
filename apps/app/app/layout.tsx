import "./global.css";
import { DesignSystemProvider } from "@repo/design-system";
import { Navbar } from "@repo/design-system/components/ultracite/navbar";
import { fonts } from "@repo/design-system/lib/fonts";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = async ({ children }: LayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body className={fonts}>
      <DesignSystemProvider>
        <Navbar />
        {children}
      </DesignSystemProvider>
    </body>
  </html>
);

export default Layout;
