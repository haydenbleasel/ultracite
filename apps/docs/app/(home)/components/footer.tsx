"use client";

import { useTheme } from "next-themes";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";

export const Footer = () => {
  const { theme, setTheme } = useTheme();

  return (
    <footer className="flex items-center justify-between p-8">
      <p className="text-muted-foreground text-sm">
        Made with ❤️ and ☕ by{" "}
        <a
          className="text-primary underline"
          href="https://x.com/haydenbleasel"
          rel="noreferrer"
          target="_blank"
        >
          @haydenbleasel
        </a>
      </p>
      <ThemeSwitcher
        onChange={setTheme}
        value={(theme ?? "system") as "light" | "dark" | "system"}
      />
    </footer>
  );
};
