import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import type { ComponentType } from "react";
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

export const frameworks = [
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

export interface Framework {
  label: string;
  logo: ComponentType<{ className?: string }>;
  presets: string[];
}

interface FrameworkSelectorProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
}

export const FrameworkSelector = ({
  value,
  onValueChange,
}: FrameworkSelectorProps) => {
  const selectedFramework = frameworks.find((f) => f.label === value);

  return (
    <Select onValueChange={onValueChange} value={value ?? undefined}>
      <SelectTrigger>
        <SelectValue>
          {selectedFramework && (
            <div className="flex items-center gap-1.5">
              <selectedFramework.logo className="size-4" />
              {selectedFramework.label}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {frameworks.map((framework) => (
          <SelectItem key={framework.label} value={framework.label}>
            <div className="flex items-center gap-1.5">
              <framework.logo className="size-4" />
              <span>{framework.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
