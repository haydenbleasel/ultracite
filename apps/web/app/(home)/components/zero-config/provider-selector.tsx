import { providers } from "@repo/data/providers";
import type { ProviderId } from "@repo/data/providers";
import Image from "next/image";
import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { prettierLogo, providerLogos, stylelintLogo } from "@/lib/logos";

const eslintProvider = providers.find((p) => p.id === "eslint");
const biomeProvider = providers.find((p) => p.id === "biome");
const oxlintProvider = providers.find((p) => p.id === "oxlint");

const providerTitles: Record<ProviderId, ReactNode> = {
  biome: biomeProvider ? (
    <span className="flex items-center gap-1">
      <Image
        alt="Biome"
        className="size-4 rounded-full"
        src={providerLogos.biome}
      />
      <span>Biome</span>
    </span>
  ) : null,
  eslint: eslintProvider ? (
    <span className="flex items-center gap-1">
      <Image
        alt="ESLint"
        className="size-4 rounded-full"
        src={providerLogos.eslint}
      />
      <span>ESLint, </span>
      <Image
        alt="Prettier"
        className="size-4 rounded-full"
        src={prettierLogo}
      />
      <span>Prettier and </span>
      <Image
        alt="Stylelint"
        className="size-4 rounded-full"
        src={stylelintLogo}
      />
      <span>Stylelint</span>
    </span>
  ) : null,
  oxlint: oxlintProvider ? (
    <span className="flex items-center gap-1">
      <Image
        alt="Oxlint"
        className="size-4 rounded-full"
        src={providerLogos.oxlint}
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
