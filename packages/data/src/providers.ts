import type { StaticImageData } from "next/image";
import biomeLogo from "../logos/biome.svg";
import eslintLogo from "../logos/eslint.svg";
import oxlintLogo from "../logos/oxlint.svg";

export type ProviderId = "eslint" | "biome" | "oxlint";

export interface Provider {
  /** Unique identifier (matches CLI --linters value) */
  id: ProviderId;
  /** Display name */
  name: string;
  /** Short tagline for navbar */
  subtitle: string;
  /** Full description */
  description: string;
  /** Provider's website URL */
  website: string;
  /** Key features of the provider */
  features: string[];
  /** Additional tools included with this provider */
  includes?: string[];
  /** Logo for UI display */
  logo: StaticImageData;
  /** Videos for the provider */
  videos?: string[];
}

export const providers: Provider[] = [
  {
    id: "eslint",
    name: "ESLint + Prettier + Stylelint",
    subtitle: "The most mature linting ecosystem",
    description:
      "The industry-standard JavaScript linter with the largest plugin ecosystem, paired with Prettier for formatting and Stylelint for CSS.",
    website: "https://eslint.org",
    features: [
      "Largest plugin ecosystem",
      "Battle-tested stability",
      "Extensive documentation",
      "Wide IDE support",
    ],
    includes: ["ESLint", "Prettier", "Stylelint"],
    logo: eslintLogo,
  },
  {
    id: "biome",
    name: "Biome",
    subtitle: "The modern all-in-one toolchain",
    description:
      "A fast, modern toolchain for web projects that combines linting and formatting in a single tool, built with Rust.",
    website: "https://biomejs.dev",
    features: [
      "All-in-one toolchain",
      "Lightning fast (Rust)",
      "Zero configuration",
      "Drop-in replacement",
    ],
    logo: biomeLogo,
    videos: [
      "https://www.youtube.com/watch?v=lEkXbneUnWg",
      "https://www.youtube.com/watch?v=b_F4LaycQcE",
    ],
  },
  {
    id: "oxlint",
    name: "Oxlint + Oxfmt",
    subtitle: "The fastest linter available",
    description:
      "The fastest JavaScript/TypeScript linter, built with Rust as part of the Oxc project, paired with Oxfmt for formatting.",
    website: "https://oxc.rs",
    features: [
      "Fastest linter available",
      "50-100x faster than ESLint",
      "Growing plugin support",
      "Oxc ecosystem",
    ],
    includes: ["Oxlint", "Oxfmt"],
    logo: oxlintLogo,
  },
];

/** Get all provider IDs */
export const providerIds: ProviderId[] = ["biome", "eslint", "oxlint"];

/** Get a provider by ID */
export const getProviderById = (id: ProviderId): Provider | undefined =>
  providers.find((provider) => provider.id === id);
