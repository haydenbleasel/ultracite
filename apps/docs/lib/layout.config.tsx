import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/app/[lang]/(home)/components/logo";
import { Button } from "@/components/ui/button";
import { i18n } from "./i18n";

export const baseOptions: BaseLayoutProps = {
  i18n,
  links: [
    {
      text: "Home",
      url: "/",
      active: "none",
    },
    {
      text: "Docs",
      url: "/introduction",
      active: "none",
    },
  ],
  githubUrl: "https://github.com/haydenbleasel/ultracite",
  nav: {
    title: (
      <Button asChild variant="ghost">
        <span>
          <Logo className="size-4" />
          <p className="font-semibold text-lg tracking-tight">Ultracite</p>
        </span>
      </Button>
    ),
  },
};
