import { Toaster } from "@/components/ui/sonner";
import "../global.css";
import { Analytics } from "@vercel/analytics/next";
import { defineI18nUI } from "fumadocs-ui/i18n";
import { RootProvider } from "fumadocs-ui/provider/next";
import { cn } from "fumadocs-ui/utils/cn";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { i18n } from "@/lib/i18n";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

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

const { provider } = defineI18nUI(i18n, {
  translations: {
    da: {
      displayName: "🇩🇰 Danish",
    },
    nl: {
      displayName: "🇳🇱 Dutch",
    },
    fi: {
      displayName: "🇫🇮 Finnish",
    },
    fr: {
      displayName: "🇫🇷 French",
    },
    hu: {
      displayName: "🇭🇺 Hungarian",
    },
    id: {
      displayName: "🇮🇩 Indonesian",
    },
    ga: {
      displayName: "🇮🇪 Irish",
    },
    it: {
      displayName: "🇮🇹 Italian",
    },
    no: {
      displayName: "🇳🇴 Norwegian",
    },
    pt: {
      displayName: "🇵🇹 Portuguese",
    },
    ro: {
      displayName: "🇷🇴 Romanian",
    },
    sr: {
      displayName: "🇷🇸 Serbian",
    },
    sl: {
      displayName: "🇸🇱 Slovenian",
    },
    es: {
      displayName: "🇪🇸 Spanish",
    },
    sv: {
      displayName: "🇸🇪 Swedish",
    },
    tr: {
      displayName: "🇹🇷 Turkish",
    },
    de: {
      displayName: "🇩🇪 German",
    },
    en: {
      displayName: "🇬🇧 English",
    },
  },
});

const Layout = async ({ children, params }: LayoutProps) => {
  const { lang } = await params;

  return (
    <html
      className={cn(
        "touch-manipulation font-sans antialiased",
        sans.variable,
        mono.variable
      )}
      lang={lang}
      suppressHydrationWarning
    >
      <body>
        <RootProvider
          i18n={provider(lang)}
          theme={{
            defaultTheme: undefined,
            enableSystem: true,
          }}
        >
          <Navbar />
          {children}
        </RootProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
};

export default Layout;
