import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Link from "next/link";
import { Logo } from "@/app/(docs)/[[...slug]]/(home)/components/logo";
import { Button } from "@/components/ui/button";

export const baseOptions: BaseLayoutProps = {
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
        <Link href="/">
          <Logo className="size-4" />
          <p className="font-semibold text-lg tracking-tight">Ultracite</p>
        </Link>
      </Button>
    ),
  },
};
