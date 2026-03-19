import "./global.css";
import { webUrl } from "@repo/data/consts";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CallToAction } from "@/components/ultracite/cta";
import { Footer } from "@/components/ultracite/footer";
import { Navbar } from "@/components/ultracite/navbar";
import { fonts } from "@/lib/fonts";

export const metadata: Metadata = {
  description:
    "A highly opinionated, zero-configuration preset for ESLint, Biome and Oxlint.",
  metadataBase: new URL(webUrl),
  title: {
    default: "Ultracite",
    template: "%s | Ultracite",
  },
};

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body className={fonts}>
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
