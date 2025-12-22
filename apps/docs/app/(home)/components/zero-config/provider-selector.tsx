import Image from "next/image";
import type { ReactNode } from "react";
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
import Prettier from "../hero/prettier.jpg";
import Stylelint from "../hero/stylelint.jpg";

export const providers = [
  {
    id: "eslint",
    title: () => (
      <span className="flex items-center gap-1">
        <Image alt="ESLint" className="size-4 rounded-full" src={ESLint} />
        <span>ESLint, </span>
        <Image alt="Prettier" className="size-4 rounded-full" src={Prettier} />
        <span>Prettier and </span>
        <Image
          alt="Stylelint"
          className="size-4 rounded-full"
          src={Stylelint}
        />
        <span>Stylelint</span>
      </span>
    ),
  },
  {
    id: "biome",
    title: () => (
      <span className="flex items-center gap-1">
        <Image alt="Biome" className="size-4 rounded-full" src={Biome} />
        <span>Biome</span>
      </span>
    ),
  },
  {
    id: "oxlint",
    title: () => (
      <span className="flex items-center gap-1">
        <Image alt="Oxlint" className="size-4 rounded-full" src={Oxlint} />
        <span>Oxlint and Oxfmt</span>
      </span>
    ),
  },
];

export interface Provider {
  id: string;
  title: ReactNode;
}

interface ProviderSelectorProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
}

export const ProviderSelector = ({
  value,
  onValueChange,
}: ProviderSelectorProps) => {
  const selectedProvider = providers.find((p) => p.id === value);

  return (
    <Select onValueChange={onValueChange} value={value ?? undefined}>
      <SelectTrigger>
        {selectedProvider ? (
          <SelectValue>
            <selectedProvider.title />
          </SelectValue>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent className="w-2xs">
        {providers.map((provider) => (
          <SelectItem key={provider.id} value={provider.id}>
            <provider.title />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
