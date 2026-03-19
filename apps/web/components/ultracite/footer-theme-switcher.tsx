"use client";

import { useTheme } from "next-themes";

import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";

export const FooterThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  return (
    <ThemeSwitcher
      onChange={setTheme}
      value={(theme ?? "system") as "light" | "dark" | "system"}
    />
  );
};
