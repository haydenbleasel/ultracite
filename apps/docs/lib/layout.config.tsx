import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Link from "next/link";
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
          <svg
            fill="none"
            height={16}
            viewBox="0 0 420 420"
            width={16}
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Ultracite</title>
            <path
              d="M105 315H210L315 210V0H420V250L250 420H0V0H105V315Z"
              fill="currentColor"
            />
            <path d="M420 420H335V335H420V420Z" fill="currentColor" />
          </svg>

          <p className="font-semibold text-lg tracking-tight">Ultracite</p>
        </Link>
      </Button>
    ),
  },
};
