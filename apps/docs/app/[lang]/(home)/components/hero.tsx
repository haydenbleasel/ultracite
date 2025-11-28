import { DynamicLink } from "fumadocs-core/dynamic-link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Installer } from "./installer";

type HeroProps = {
  children: ReactNode;
};

export const Hero = ({ children }: HeroProps) => (
  <div className="grid gap-8 pt-8 sm:gap-20 sm:pt-20">
    <div className="grid gap-4">
      <h1 className="mb-0 max-w-md text-balance font-medium text-3xl tracking-tighter sm:text-4xl md:text-5xl">
        A highly opinionated, zero-configuration linter and formatter
      </h1>
      <p className="max-w-md text-balance text-muted-foreground">
        Ultracite is a highly opinionated preset for{" "}
        <a
          className="underline"
          href="https://biomejs.dev"
          rel="noopener"
          target="_blank"
        >
          Biome
        </a>
        , designed to help you and your AI models write consistent and type-safe
        code without the hassle of configuration.
      </p>
      <div className="flex w-full max-w-md flex-col items-center gap-4 sm:flex-row">
        <Installer command="npx ultracite@latest init" />
        <Button asChild className="px-4" size="lg" variant="link">
          <DynamicLink href="/[lang]/introduction">Read the docs</DynamicLink>
        </Button>
      </div>
    </div>
    {children}
  </div>
);
