"use client";

import { useTheme } from "next-themes";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";

export const Footer = () => {
  const { theme, setTheme } = useTheme();

  return (
    <footer className="flex items-center justify-between p-8">
      <p className="font-medium text-muted-foreground text-sm">
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
  );
};
