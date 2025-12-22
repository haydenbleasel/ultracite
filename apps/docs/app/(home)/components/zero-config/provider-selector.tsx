import Image from "next/image";
import type { StaticImageData } from "next/image";
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

export const providers = [
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

export type Provider = {
  label: string;
  logo: StaticImageData;
};

type ProviderSelectorProps = {
  value: string | null;
  onValueChange: (value: string) => void;
};

export const ProviderSelector = ({
  value,
  onValueChange,
}: ProviderSelectorProps) => {
  const selectedProvider = providers.find((p) => p.label === value);

  return (
    <Select onValueChange={onValueChange} value={value ?? undefined}>
      <SelectTrigger>
        <SelectValue>
          {selectedProvider && (
            <>
              <Image
                alt={selectedProvider.label}
                className="size-4 rounded-full"
                src={selectedProvider.logo}
              />
              {selectedProvider.label}
            </>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {providers.map((provider) => (
          <SelectItem key={provider.label} value={provider.label}>
            <div className="flex items-center gap-2">
              <Image
                alt={provider.label}
                className="size-4 rounded-full"
                src={provider.logo}
              />
              <span className="hidden lg:block">{provider.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
