import "./globals.css";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html className="dark" lang="en">
    <body className={cn(fonts, "dark")}>
      <DesignSystemProvider>{children}</DesignSystemProvider>
    </body>
  </html>
);

export default RootLayout;
