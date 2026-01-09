import { cn } from "@repo/design-system/lib/utils";
import { Geist, Geist_Mono } from "next/font/google";

const sans = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sans",
  weight: "variable",
});

const mono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-mono",
  weight: "variable",
});

export const fonts = cn(
  sans.variable,
  mono.variable,
  "touch-manipulation font-sans antialiased"
);
