import type { ComponentType } from "react";

import {
  Angular,
  Astro,
  Jest,
  Nestjs,
  Nextjs,
  Qwik,
  React,
  Remix,
  Solid,
  Svelte,
  TanStack,
  Vitest,
  Vue,
} from "./icons";

export interface Framework {
  label: string;
  logo: ComponentType<{ className?: string }>;
  presets: string[];
}

export const frameworks: Framework[] = [
  {
    label: "Next.js",
    logo: Nextjs,
    presets: ["next"],
  },
  {
    label: "React",
    logo: React,
    presets: ["react"],
  },
  {
    label: "Solid",
    logo: Solid,
    presets: ["solid"],
  },
  {
    label: "Vue",
    logo: Vue,
    presets: ["vue"],
  },
  {
    label: "Svelte",
    logo: Svelte,
    presets: ["svelte"],
  },
  {
    label: "Qwik",
    logo: Qwik,
    presets: ["qwik"],
  },
  {
    label: "Angular",
    logo: Angular,
    presets: ["angular"],
  },
  {
    label: "Remix",
    logo: Remix,
    presets: ["remix"],
  },
  {
    label: "TanStack",
    logo: TanStack,
    presets: ["tanstack"],
  },
  {
    label: "Astro",
    logo: Astro,
    presets: ["astro"],
  },
  {
    label: "NestJS",
    logo: Nestjs,
    presets: ["nestjs"],
  },
  {
    label: "Jest",
    logo: Jest,
    presets: ["jest"],
  },
  {
    label: "Vitest",
    logo: Vitest,
    presets: ["vitest"],
  },
];
