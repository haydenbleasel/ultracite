import { Toaster } from "@/components/ui/sonner";
import "./global.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Navbar } from "@/components/ultracite/navbar";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: "variable",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: "variable",
});

const Layout = ({ children }: LayoutProps) => {
  return (
    <ClerkProvider>
      <html
        className={cn(
          "touch-manipulation font-sans antialiased",
          sans.variable,
          mono.variable
        )}
        lang="en"
        suppressHydrationWarning
      >
        <body>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <RootProvider
              theme={{
                defaultTheme: undefined,
                enableSystem: true,
              }}
            >
              <Navbar />
              {children}
            </RootProvider>
            <Toaster />
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
};

export default Layout;
