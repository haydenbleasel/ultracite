import Prettier from "@repo/data/logos/prettier.svg";
import Stylelint from "@repo/data/logos/stylelint.svg";
import { providers } from "@repo/data/providers";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Installer } from "../installer";

interface HeroProps {
  children: ReactNode;
  description: string;
}

const logos = [
  ...providers.map((provider) => ({
    name: provider.name.split(" ")[0],
    src: provider.logo,
  })),
  {
    name: "Prettier",
    src: Prettier,
  },
  {
    name: "Stylelint",
    src: Stylelint,
  },
];

export const Hero = ({ description, children }: HeroProps) => (
  <div className="grid gap-8 sm:gap-20">
    <div className="grid gap-4">
      <h1 className="mb-0 max-w-xl text-balance font-semibold text-4xl leading-none tracking-tighter md:text-5xl lg:text-6xl">
        A production-grade, zero-configuration preset for{" "}
        <span className="inline-flex translate-y-0.5 items-center -space-x-1 md:translate-y-1">
          {logos.map((logo) => (
            <Tooltip key={logo.name}>
              <TooltipTrigger>
                <Image
                  alt={logo.name}
                  className="size-7 overflow-hidden rounded-full object-cover ring-2 ring-background md:size-10 lg:size-12"
                  height={48}
                  key={logo.name}
                  priority
                  src={logo.src}
                  width={48}
                />
              </TooltipTrigger>
              <TooltipContent>{logo.name}</TooltipContent>
            </Tooltip>
          ))}
        </span>
      </h1>
      <p className="max-w-xl text-balance text-muted-foreground tracking-tight sm:text-lg">
        {description}
      </p>
      <div className="flex w-full max-w-md flex-col items-center gap-2 sm:flex-row">
        <Installer command="npx ultracite@latest init" />
        <Button asChild className="px-4" size="lg" variant="link">
          <Link href="/docs">Read the docs</Link>
        </Button>
      </div>
    </div>
    {children}
  </div>
);
