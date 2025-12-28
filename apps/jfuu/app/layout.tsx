import "./globals.css";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import type { ReactNode } from "react";

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html className="dark" lang="en">
    <body className={fonts}>
      <DesignSystemProvider>{children}</DesignSystemProvider>
    </body>
  </html>
);

export default RootLayout;
