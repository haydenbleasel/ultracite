import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import Prettier from "@ultracite/data/logos/prettier.svg";
import Stylelint from "@ultracite/data/logos/stylelint.svg";
import { providers as providersData } from "@ultracite/data/providers";
import Image from "next/image";

const eslintProvider = providersData.find((p) => p.id === "eslint");
const biomeProvider = providersData.find((p) => p.id === "biome");
const oxlintProvider = providersData.find((p) => p.id === "oxlint");

export const providers = [
  {
    ...eslintProvider,
    title: () =>
      eslintProvider ? (
        <span className="flex items-center gap-1">
          <Image
            alt="ESLint"
            className="size-4 rounded-full"
            src={eslintProvider.logo}
          />
          <span>ESLint, </span>
          <Image
            alt="Prettier"
            className="size-4 rounded-full"
            src={Prettier}
          />
          <span>Prettier and </span>
          <Image
            alt="Stylelint"
            className="size-4 rounded-full"
            src={Stylelint}
          />
          <span>Stylelint</span>
        </span>
      ) : null,
  },
  {
    ...biomeProvider,
    title: () =>
      biomeProvider ? (
        <span className="flex items-center gap-1">
          <Image
            alt="Biome"
            className="size-4 rounded-full"
            src={biomeProvider.logo}
          />
          <span>Biome</span>
        </span>
      ) : null,
  },
  {
    ...oxlintProvider,
    title: () =>
      oxlintProvider ? (
        <span className="flex items-center gap-1">
          <Image
            alt="Oxlint"
            className="size-4 rounded-full"
            src={oxlintProvider.logo}
          />
          <span>Oxlint and Oxfmt</span>
        </span>
      ) : null,
  },
];

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
          <SelectItem key={provider.id} value={provider.id ?? ""}>
            <provider.title />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
