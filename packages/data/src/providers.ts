/* biome-ignore-all lint/style/useNamingConvention: "Provider configs use various naming conventions" */
import type { StaticImageData } from "next/image";
import biomeLogo from "../logos/biome.svg";
import eslintLogo from "../logos/eslint.svg";
import oxlintLogo from "../logos/oxlint.svg";
import prettierLogo from "../logos/prettier.svg";
import stylelintLogo from "../logos/stylelint.svg";

export { prettierLogo, stylelintLogo };

export type ProviderId = "eslint" | "biome" | "oxlint";

export interface ConfigFile {
  filename: string;
  lang: "json" | "javascript";
  code: (presets: string[]) => string;
}

const biomeConfigFiles: ConfigFile[] = [
  {
    filename: "biome.jsonc",
    lang: "json",
    code: (presets: string[]) => `{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": [
    ${presets.map((p) => `"ultracite/biome/${p}"`).join(",\n    ")}
  ]
}`,
  },
];

const eslintConfigFiles: ConfigFile[] = [
  {
    filename: "eslint.config.mjs",
    lang: "javascript",
    code: (presets: string[]) => `import { defineConfig } from "eslint/config";
${presets.map((p) => `import ${p} from "ultracite/eslint/${p}";`).join("\n")}

export default defineConfig([
  {
    extends: [
      ${presets.join(",\n      ")}
    ],
  },
]);`,
  },
  {
    filename: "prettier.config.mjs",
    lang: "javascript",
    code: () => `export { default } from "ultracite/prettier";`,
  },
  {
    filename: "stylelint.config.mjs",
    lang: "javascript",
    code: () => `export { default } from "ultracite/stylelint";`,
  },
];

const oxlintConfigFiles: ConfigFile[] = [
  {
    filename: ".oxlintrc.json",
    lang: "json",
    code: (presets: string[]) => `{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": [
    ${presets.map((p) => `"ultracite/oxlint/${p}"`).join(",\n    ")}
  ]
}`,
  },
  {
    filename: ".oxfmtrc.jsonc",
    lang: "json",
    code: () => `{
  "$schema": "./node_modules/oxfmt/configuration_schema.json"
}`,
  },
];

/** Get config files for a provider */
export const getConfigFiles = (providerId: ProviderId): ConfigFile[] => {
  if (providerId === "biome") {
    return biomeConfigFiles;
  }
  if (providerId === "eslint") {
    return eslintConfigFiles;
  }
  if (providerId === "oxlint") {
    return oxlintConfigFiles;
  }
  return [];
};

/** Get description text for config section */
export const getConfigDescription = (providerId: ProviderId): string => {
  if (providerId === "biome") {
    return "Biome handles both formatting and linting with one unified config.";
  }
  if (providerId === "eslint") {
    return "Ultracite handles the complexity of combining multiple tools into a cohesive setup.";
  }
  return "Giving you control over each aspect of linting and formatting.";
};

export interface ProviderFeature {
  title: string;
  description: string;
}

export interface ProviderPlugin {
  name: string;
  description: string;
}

export interface ProviderRuleCategory {
  name: string;
  count?: number;
  description: string;
}

export interface Provider {
  /** Unique identifier (matches CLI --linters value) */
  id: ProviderId;
  /** Display name */
  name: string;
  /** Page title */
  title: string;
  /** Short tagline for navbar */
  subtitle: string;
  /** Full description */
  description: string;
  /** Provider's website URL */
  website: string;
  /** Key features shown as cards */
  features: ProviderFeature[];
  /** Additional tools included with this provider */
  includes?: string[];
  /** Logo for UI display */
  logo: StaticImageData;
  /** Additional logos to show (e.g., Prettier, Stylelint) */
  additionalLogos?: StaticImageData[];
  /** Videos for the provider */
  videos?: string[];
  /** Plugins included */
  plugins?: ProviderPlugin[];
  /** Rule categories */
  ruleCategories?: ProviderRuleCategory[];
  /** Supported languages */
  languages?: string[];
  /** Supported frameworks */
  frameworks: string[];
  /** Configuration files */
  configFiles: { name: string; description: string }[];
  /** Why use this provider section */
  whyContent: string;
  /** Smart features (Biome-specific) */
  smartFeatures?: { name: string; description: string }[];
}

export const providers: Provider[] = [
  {
    id: "biome",
    name: "Biome",
    title: "Biome | Ultracite",
    subtitle: "The modern all-in-one toolchain",
    description:
      "The modern, all-in-one toolchain. Biome is a fast formatter and linter written in Rust that handles JavaScript, TypeScript, JSON, CSS, and more with a single tool.",
    website: "https://biomejs.dev",
    whyContent:
      "Biome is the successor to Rome, built from the ground up in Rust for maximum performance. It provides formatting and linting with near-instant feedback, making it ideal for large codebases.",
    features: [
      {
        title: "Lightning fast",
        description:
          "Written in Rust, Biome is 25x faster than Prettier and can format a large codebase in milliseconds.",
      },
      {
        title: "All-in-one",
        description:
          "No more juggling ESLint, Prettier, and other tools. Biome handles formatting and linting in a single pass.",
      },
      {
        title: "Zero dependencies",
        description:
          "Biome has no JavaScript dependencies. One binary does everything with consistent behavior.",
      },
      {
        title: "Editor integration",
        description:
          "First-class VS Code extension with real-time diagnostics and code actions.",
      },
    ],
    logo: biomeLogo,
    videos: [
      "https://www.youtube.com/watch?v=lEkXbneUnWg",
      "https://www.youtube.com/watch?v=b_F4LaycQcE",
    ],
    ruleCategories: [
      {
        name: "Accessibility",
        count: 35,
        description: "WCAG and ARIA compliance",
      },
      {
        name: "Complexity",
        count: 41,
        description: "Code complexity management",
      },
      {
        name: "Correctness",
        count: 45,
        description: "Bug prevention and safety",
      },
      { name: "Performance", count: 10, description: "Runtime optimizations" },
      { name: "Security", count: 5, description: "Security best practices" },
      { name: "Style", count: 70, description: "Code style consistency" },
      {
        name: "Suspicious",
        count: 80,
        description: "Potentially buggy patterns",
      },
    ],
    languages: [
      "JavaScript",
      "TypeScript",
      "JSX",
      "TSX",
      "JSON",
      "JSONC",
      "CSS",
      "GraphQL",
      "HTML",
    ],
    frameworks: [
      "Next.js",
      "React",
      "Vue",
      "Svelte",
      "Solid",
      "Qwik",
      "Angular",
      "Remix",
      "Astro",
    ],
    configFiles: [
      {
        name: "biome.jsonc",
        description:
          "Extends Ultracite presets with support for framework-specific rules",
      },
    ],
    smartFeatures: [
      {
        name: "Import sorting",
        description:
          "Automatically organizes imports by type and alphabetically",
      },
      {
        name: "Attribute sorting",
        description: "Sorts JSX attributes for consistent component props",
      },
      {
        name: "Tailwind CSS",
        description:
          "Sorts Tailwind classes automatically with useSortedClasses",
      },
    ],
  },
  {
    id: "eslint",
    name: "ESLint + Prettier + Stylelint",
    title: "ESLint, Prettier & Stylelint | Ultracite",
    subtitle: "The most mature linting ecosystem",
    description:
      "The most mature and comprehensive linting solution. Combines ESLint for JavaScript/TypeScript, Prettier for formatting, and Stylelint for CSS with 20+ plugins and hundreds of preconfigured rules.",
    website: "https://eslint.org",
    whyContent:
      "This combination is the industry standard for JavaScript/TypeScript projects. ESLint handles code quality and potential bugs, Prettier ensures consistent formatting, and Stylelint keeps your CSS clean. Together, they provide the most comprehensive coverage available.",
    features: [
      {
        title: "Battle-tested",
        description:
          "Used by millions of developers worldwide. The largest ecosystem of plugins and configurations available.",
      },
      {
        title: "Maximum coverage",
        description:
          "20+ plugins preconfigured with hundreds of rules covering accessibility, security, performance, and best practices.",
      },
      {
        title: "Framework-aware",
        description:
          "First-class support for React, Next.js, Vue, Svelte, and more with framework-specific rules and optimizations.",
      },
    ],
    includes: ["ESLint", "Prettier", "Stylelint"],
    logo: eslintLogo,
    additionalLogos: [prettierLogo, stylelintLogo],
    plugins: [
      { name: "React", description: "React-specific linting rules" },
      { name: "React Hooks", description: "Rules of Hooks enforcement" },
      { name: "TypeScript", description: "Type-aware linting rules" },
      { name: "JSX A11y", description: "Accessibility linting for JSX" },
      { name: "Import", description: "Import/export syntax validation" },
      { name: "Promise", description: "Promise best practices" },
      { name: "Node", description: "Node.js specific rules" },
      { name: "Next.js", description: "Next.js specific rules" },
      { name: "Unicorn", description: "Various awesome ESLint rules" },
      { name: "SonarJS", description: "Code quality and security" },
      { name: "Compat", description: "Browser compatibility checking" },
      { name: "TanStack Query", description: "React Query best practices" },
    ],
    frameworks: [
      "Next.js",
      "React",
      "Vue",
      "Svelte",
      "Solid",
      "Qwik",
      "Angular",
      "Remix",
      "Astro",
    ],
    configFiles: [
      {
        name: "eslint.config.mjs",
        description: "ESLint flat config format with Ultracite presets",
      },
      {
        name: "prettier.config.mjs",
        description: "Consistent formatting with sensible defaults",
      },
      {
        name: "stylelint.config.mjs",
        description: "CSS linting with modern best practices",
      },
    ],
  },
  {
    id: "oxlint",
    name: "Oxlint + Oxfmt",
    title: "Oxlint & Oxfmt | Ultracite",
    subtitle: "The fastest linter available",
    description:
      "The fastest linter available. Oxlint is part of the Oxc project, running 50-100x faster than ESLint with a focus on catching bugs and reducing false positives.",
    website: "https://oxc.rs",
    whyContent:
      "Oxlint is built on the Oxc (Oxidation Compiler) project, designed from scratch in Rust for maximum performance. It's designed to complement or replace ESLint, focusing on speed and catching real bugs while minimizing false positives.",
    features: [
      {
        title: "50-100x faster",
        description:
          "Lint your entire codebase in milliseconds. No more waiting for slow linting processes.",
      },
      {
        title: "Bug-focused",
        description:
          "Prioritizes catching real bugs over stylistic issues. High signal-to-noise ratio.",
      },
      {
        title: "Drop-in ready",
        description:
          "Works alongside your existing ESLint setup or as a complete replacement.",
      },
    ],
    includes: ["Oxlint", "Oxfmt"],
    logo: oxlintLogo,
    plugins: [
      { name: "ESLint", description: "Core JavaScript rules" },
      { name: "TypeScript", description: "Type-aware rules" },
      { name: "Unicorn", description: "Various best practices" },
      { name: "React", description: "React-specific rules" },
      { name: "React Perf", description: "Performance optimizations" },
      { name: "Next.js", description: "Next.js specific rules" },
      { name: "JSX A11y", description: "Accessibility rules" },
      { name: "Import", description: "Import/export validation" },
      { name: "Node", description: "Node.js rules" },
      { name: "Promise", description: "Promise best practices" },
      { name: "Jest", description: "Jest testing rules" },
      { name: "Vitest", description: "Vitest testing rules" },
      { name: "JSDoc", description: "Documentation rules" },
      { name: "Oxc", description: "Oxc-specific rules" },
      { name: "Vue", description: "Vue.js rules" },
    ],
    ruleCategories: [
      {
        name: "Correctness",
        description: "Rules that prevent bugs and incorrect code",
      },
      {
        name: "Suspicious",
        description: "Rules that detect potentially problematic patterns",
      },
      {
        name: "Pedantic",
        description: "Strict rules for code quality purists",
      },
      {
        name: "Performance",
        description: "Rules that catch performance issues",
      },
      {
        name: "Restriction",
        description: "Rules that restrict certain patterns",
      },
      {
        name: "Style",
        description: "Rules that enforce consistent code style",
      },
    ],
    frameworks: [
      "Next.js",
      "React",
      "Vue",
      "Svelte",
      "Solid",
      "Qwik",
      "Angular",
      "Remix",
      "Astro",
    ],
    configFiles: [
      {
        name: ".oxlintrc.json",
        description:
          "Linting configuration with Ultracite presets and category-based rules",
      },
      {
        name: ".oxfmtrc.jsonc",
        description:
          "Formatting configuration powered by Oxfmt for consistent code style",
      },
    ],
  },
];

/** Get all provider IDs */
export const providerIds: ProviderId[] = ["biome", "eslint", "oxlint"];

/** Get a provider by ID */
export const getProviderById = (id: ProviderId): Provider | undefined =>
  providers.find((provider) => provider.id === id);
