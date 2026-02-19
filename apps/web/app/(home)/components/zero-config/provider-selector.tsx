import Prettier from "@repo/data/logos/prettier.svg";
import Stylelint from "@repo/data/logos/stylelint.svg";
import { type ProviderId, providers } from "@repo/data/providers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import Image from "next/image";
import type { ReactNode } from "react";

const eslintProvider = providers.find((p) => p.id === "eslint");
const biomeProvider = providers.find((p) => p.id === "biome");
const oxlintProvider = providers.find((p) => p.id === "oxlint");

const providerTitles: Record<ProviderId, ReactNode> = {
  eslint: eslintProvider ? (
    <span className="flex items-center gap-1">
      <Image
        alt="ESLint"
        className="size-4 rounded-full"
        src={eslintProvider.logo}
      />
      <span>ESLint, </span>
      <Image alt="Prettier" className="size-4 rounded-full" src={Prettier} />
      <span>Prettier and </span>
      <Image alt="Stylelint" className="size-4 rounded-full" src={Stylelint} />
      <span>Stylelint</span>
    </span>
  ) : null,
  biome: biomeProvider ? (
    <span className="flex items-center gap-1">
      <Image
        alt="Biome"
        className="size-4 rounded-full"
        src={biomeProvider.logo}
      />
      <span>Biome</span>
    </span>
  ) : null,
  oxlint: oxlintProvider ? (
    <span className="flex items-center gap-1">
      <Image
        alt="Oxlint"
        className="size-4 rounded-full"
        src={oxlintProvider.logo}
      />
      <span>Oxlint and Oxfmt</span>
    </span>
  ) : null,
};

interface ProviderSelectorProps {
  onValueChange: (value: string | null) => void;
  value: string | null;
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
          <SelectValue>{providerTitles[selectedProvider.id]}</SelectValue>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent className="w-2xs">
        {providers.map((provider) => (
          <SelectItem key={provider.id} value={provider.id ?? ""}>
            {providerTitles[provider.id]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
