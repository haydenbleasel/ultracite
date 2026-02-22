import "./global.css";
import { DesignSystemProvider } from "@repo/design-system";
import { Navbar } from "@repo/design-system/components/ultracite/navbar";
import { fonts } from "@repo/design-system/lib/fonts";
import type { ReactNode } from "react";
import { ConvexClerkProvider } from "@/components/convex-clerk-provider";

interface LayoutProps {
  children: ReactNode;
}

const Layout = async ({ children }: LayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body className={fonts}>
      <ConvexClerkProvider>
        <DesignSystemProvider>
          <Navbar />
          {children}
        </DesignSystemProvider>
      </ConvexClerkProvider>
    </body>
  </html>
);

export default Layout;
