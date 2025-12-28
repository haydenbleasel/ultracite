import "./global.css";
import { Navbar } from "@repo/design-system/components/ultracite/navbar";
import { fonts } from "@repo/design-system/lib/fonts";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = async ({ children }: LayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body className={fonts}>
      <RootProvider>
        <Navbar />
        {children}
      </RootProvider>
    </body>
  </html>
);

export default Layout;
