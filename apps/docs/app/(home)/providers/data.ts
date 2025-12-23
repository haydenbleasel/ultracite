import type { StaticImageData } from "next/image";
import {
  providers as providersData,
  getProviderById as getProviderByIdBase,
  type Provider as BaseProvider,
  type ProviderId,
} from "@ultracite/data";
import biomeLogo from "@ultracite/data/logos/biome.svg";
import eslintLogo from "@ultracite/data/logos/eslint.svg";
import oxlintLogo from "@ultracite/data/logos/oxlint.svg";

// Logo mapping
const logoMap: Record<ProviderId, StaticImageData> = {
  biome: biomeLogo,
  eslint: eslintLogo,
  oxlint: oxlintLogo,
};

// Extended provider type with logo for UI
export interface Provider extends BaseProvider {
  logo: StaticImageData;
}

// Add logos to providers
export const providers: Provider[] = providersData.map((provider) => ({
  ...provider,
  logo: logoMap[provider.id],
}));

// Re-export helpers with logo support
export const getProviderById = (id: ProviderId): Provider | undefined => {
  const provider = getProviderByIdBase(id);
  if (!provider) return undefined;
  return { ...provider, logo: logoMap[provider.id] };
};

// Re-export from shared data
export type { ProviderId };
