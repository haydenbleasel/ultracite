import "./global.css";
import { DesignSystemProvider } from "@repo/design-system";
import { Navbar } from "@repo/design-system/components/ultracite/navbar";
import { fonts } from "@repo/design-system/lib/fonts";
import type { ReactNode } from "react";
import { CTA } from "@/components/cta";
import { Footer } from "../components/footer";

interface LayoutProps {
  children: ReactNode;
}

const Layout = async ({ children }: LayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body className={fonts}>
      <DesignSystemProvider>
        <Navbar />
        <div className="container relative mx-auto mt-16 grid px-4 sm:mt-24 2xl:max-w-7xl">
          {children}
          <div className="mt-16 sm:mt-24 md:mt-32">
            <CTA />
            <Footer />
          </div>
        </div>
      </DesignSystemProvider>
    </body>
  </html>
);

export default Layout;
