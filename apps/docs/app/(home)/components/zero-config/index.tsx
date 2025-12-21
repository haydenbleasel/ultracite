"use client";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import Image from "next/image";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Biome from "../hero/biome.jpg";
import ESLint from "../hero/eslint.jpg";
import Oxlint from "../hero/oxlint.jpg";
import {
  Angular,
  Astro,
  Nextjs,
  Qwik,
  React,
  Remix,
  Solid,
  Svelte,
  Vue,
} from "./icons";

const providers = [
  {
    label: "ESLint",
    logo: ESLint,
  },
  {
    label: "Biome",
    logo: Biome,
  },
  {
    label: "Oxlint",
    logo: Oxlint,
  },
];

const configs = [
  {
    label: "Next.js",
    logo: Nextjs,
    presets: ["core", "react", "next"],
  },
  {
    label: "React",
    logo: React,
    presets: ["core", "react"],
  },
  {
    label: "Solid",
    logo: Solid,
    presets: ["core", "solid"],
  },
  {
    label: "Vue",
    logo: Vue,
    presets: ["core", "vue"],
  },
  {
    label: "Svelte",
    logo: Svelte,
    presets: ["core", "svelte"],
  },
  {
    label: "Qwik",
    logo: Qwik,
    presets: ["core", "qwik"],
  },
  {
    label: "Angular",
    logo: Angular,
    presets: ["core", "angular"],
  },
  {
    label: "Remix",
    logo: Remix,
    presets: ["core", "remix"],
  },
  {
    label: "Astro",
    logo: Astro,
    presets: ["core", "astro"],
  },
];

export const ZeroConfig = () => {
  const [provider, setProvider] = useState<string | null>(providers[0].label);
  const [config, setConfig] = useState<string | null>(configs[0].label);

  return (
    <div className="grid gap-8">
      <div className="mx-auto grid max-w-xl gap-4 text-center">
        <h2 className="text-balance font-semibold text-3xl tracking-tighter md:text-4xl">
          Zero-config by design
        </h2>
        <p className="text-balance text-lg text-muted-foreground tracking-tight">
          Hundreds of rules for your framework to optimize your JavaScript /
          TypeScript code, while still allowing you to customize when needed.
        </p>
      </div>

      <div className="divide-y overflow-hidden rounded-lg border">
        <div className="flex items-center gap-2 p-4">
          <span className="text-muted-foreground text-sm">I'm using</span>
          <Select onValueChange={setProvider} value={provider}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) => (
                <SelectItem key={provider.label} value={provider.label}>
                  <Image
                    alt={provider.label}
                    className="size-4 rounded-full"
                    src={provider.logo}
                  />
                  <span className="hidden lg:block">{provider.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-sm">on my</span>
          <Select onValueChange={setConfig} value={config}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {configs.map((config) => (
                <SelectItem key={config.label} value={config.label}>
                  <config.logo className="size-4" />
                  <span className="hidden lg:block">{config.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-sm">project</span>
        </div>
        <div className="p-4">
          <DynamicCodeBlock
            code={`{
  "extends": ["ultracite/biome/core", "ultracite/biome/react", "ultracite/biome/next"]
}`}
            lang="json"
          />
        </div>
      </div>
    </div>
  );
};
