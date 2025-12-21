import { Toaster } from "@/components/ui/sonner";
import "./global.css";
import { Analytics } from "@vercel/analytics/next";
import { RootProvider } from "fumadocs-ui/provider/next";
import { cn } from "fumadocs-ui/utils/cn";
import {
  Geist_Mono,
  Instrument_Sans,
  Instrument_Serif,
} from "next/font/google";
import type { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
};

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: "variable",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: "400",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: "variable",
});

const Layout = ({ children }: LayoutProps) => {
  return (
    <html
      className={cn(
        "touch-manipulation font-sans antialiased",
        sans.variable,
        serif.variable,
        mono.variable
      )}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <RootProvider
          theme={{
            defaultTheme: undefined,
            enableSystem: true,
          }}
        >
          {children}
        </RootProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
};

export default Layout;
