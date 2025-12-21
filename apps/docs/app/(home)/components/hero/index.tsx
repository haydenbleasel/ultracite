import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Installer } from "../installer";
import Link from "fumadocs-core/link";

import Biome from './biome.jpg';
import ESLint from './eslint.jpg';
import Oxlint from './oxlint.jpg';
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type HeroProps = {
  children: ReactNode;
  title: string;
  description: string;
};

const logos = [
  {
    name: "ESLint",
    src: ESLint,
  },
  {
    name: "Biome",
    src: Biome,
  },
  {
    name: "Oxlint",
    src: Oxlint,
  },
];

export const Hero = ({ title, description, children }: HeroProps) => (
  <div className="grid gap-8 pt-8 sm:gap-20 sm:pt-20">
    <div className="grid gap-4">
      <h1 className="mb-0 max-w-xl text-balance font-semibold text-3xl leading-none sm:text-4xl md:text-5xl lg:text-6xl tracking-tighter">
        {title.replace("ESLint, Biome and Oxlint.", "")}
        <span className="inline-flex items-center -space-x-1 translate-y-1">
        {logos.map((logo, index) => (
          <Tooltip key={index}>
            <TooltipTrigger>
              <Image alt={logo.name} height={48} src={logo.src} width={48} className="rounded-full ring-2 ring-background size-12 object-cover overflow-hidden" key={index} />
            </TooltipTrigger>
            <TooltipContent>{logo.name}</TooltipContent>
          </Tooltip>
        ))}
        </span>
      </h1>
      <p className="max-w-xl text-balance text-lg text-muted-foreground tracking-tight">
        {description}
      </p>
      <div className="flex w-full max-w-md flex-col items-center gap-2 sm:flex-row">
        <Installer command="npx ultracite@latest init" />
        <Button nativeButton={false} className="px-4" size="lg" variant="link" render={
          <Link href="/introduction">Read the docs</Link>
        } />
      </div>
    </div>
    {children}
  </div>
);
