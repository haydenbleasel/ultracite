"use client";

import { useTheme } from "next-themes";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import { Installer } from "./installer";

export const Footer = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mb-12 grid gap-8">
      <div className="grid items-center gap-8 rounded-2xl bg-sidebar sm:p-16 md:p-24">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <h2 className="text-balance font-medium text-2xl tracking-tighter sm:text-3xl md:text-4xl">
            Install in seconds. Run in milliseconds.
          </h2>
          <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
            Install Ultracite and start shipping code faster in seconds.
          </p>
        </div>
        <div className="mx-auto w-full max-w-xs">
          <Installer command="npx ultracite@latest init" />
        </div>
      </div>
      <footer className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="text-balance font-medium text-muted-foreground text-sm">
          Made with ❤️ and ☕ by{" "}
          <a
            className="text-primary underline"
            href="https://x.com/haydenbleasel"
            rel="noreferrer"
            target="_blank"
          >
            @haydenbleasel
          </a>
          . Free and{" "}
          <a
            className="text-primary underline"
            href="https://github.com/haydenbleasel/ultracite"
            rel="noreferrer"
            target="_blank"
          >
            open source
          </a>
          , forever.
        </p>
        <ThemeSwitcher
          onChange={setTheme}
          value={(theme ?? "system") as "light" | "dark" | "system"}
        />
      </footer>
    </div>
  );
};
