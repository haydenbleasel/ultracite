import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/app/(home)/components/logo";

export const baseOptions = (): BaseLayoutProps => ({
  nav: {
    title: (
      <span className="flex items-center gap-2">
        <Logo className="size-4" />
        <span className="font-semibold text-lg tracking-tight">Ultracite</span>
      </span>
    ),
    url: "/",
  },
  links: [
    { url: "/", text: "Home", active: "url" },
    { url: "/introduction", text: "Docs", active: "nested-url" },
    { url: "/social", text: "Social", active: "url" },
  ],
  githubUrl: "https://github.com/haydenbleasel/ultracite",
  themeSwitch: {
    mode: "light-dark-system",
  },
});
