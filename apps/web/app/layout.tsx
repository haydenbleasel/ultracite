import "./global.css";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { JsonLd } from "@/components/seo/json-ld";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CallToAction } from "@/components/ultracite/cta";
import { Footer } from "@/components/ultracite/footer";
import { Navbar } from "@/components/ultracite/navbar";
import { fonts } from "@/lib/fonts";
import { createSiteStructuredData, rootMetadata } from "@/lib/site-metadata";

interface LayoutProps {
  children: ReactNode;
}

export const metadata: Metadata = rootMetadata;

const Layout = ({ children }: LayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body className={fonts}>
      <JsonLd data={createSiteStructuredData()} />
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        <TooltipProvider>
          <Navbar />
          <div className="container relative mx-auto mt-16 grid px-4 sm:mt-24 2xl:max-w-7xl">
            {children}
            <div className="mt-16 sm:mt-24 md:mt-32">
              <CallToAction />
              <Footer />
            </div>
          </div>
        </TooltipProvider>
        <Toaster />
        <Analytics />
      </ThemeProvider>
    </body>
  </html>
);

export default Layout;
