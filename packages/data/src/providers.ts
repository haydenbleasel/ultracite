/* biome-ignore-all lint/style/useNamingConvention: "Provider configs use various naming conventions" */
import type { StaticImageData } from "next/image";
import biomeLogo from "../logos/biome.svg";
import eslintLogo from "../logos/eslint.svg";
import oxlintLogo from "../logos/oxlint.svg";
import prettierLogo from "../logos/prettier.svg";
import stylelintLogo from "../logos/stylelint.svg";

export type ProviderId = "eslint" | "biome" | "oxlint";

export interface ConfigFile {
  name: string;
  lang: "json" | "javascript";
  code: (presets: string[]) => string;
}

export interface ProviderBenefit {
  title: string;
  description: string;
  icon: string;
}

export interface Provider {
  id: ProviderId;
  name: string;
  subtitle: string;
  description: string;
  benefits: ProviderBenefit[];
  includes?: string[];
  logo: StaticImageData;
  additionalLogos?: StaticImageData[];
  videos?: string[];
  configFiles: ConfigFile[];
  vscodeExtensionId: string;
}

export const providers: Provider[] = [
  {
    id: "biome",
    name: "Biome",
    subtitle: "The modern all-in-one toolchain",
    description:
      "The modern, all-in-one toolchain. Biome is a fast formatter and linter written in Rust that handles JavaScript, TypeScript, JSON, CSS, and more with a single tool.",
    benefits: [
      {
        title: "Lightning fast",
        description:
          "Written in Rust, Biome is 25x faster than Prettier and can format a large codebase in milliseconds.",
        icon: "Zap",
      },
      {
        title: "All-in-one toolchain",
        description:
          "No more juggling ESLint, Prettier, and other tools. Biome handles formatting and linting in a single pass.",
        icon: "Layers",
      },
      {
        title: "287 preconfigured rules",
        description:
          "Covers accessibility, complexity, correctness, performance, security, style, and suspicious patterns.",
        icon: "ShieldCheck",
      },
      {
        title: "Multi-language support",
        description:
          "Natively supports JavaScript, TypeScript, JSX, TSX, JSON, JSONC, CSS, GraphQL, and HTML.",
        icon: "Code",
      },
      {
        title: "Smart sorting",
        description:
          "Automatically organizes imports and JSX attributes, plus sorts Tailwind CSS classes.",
        icon: "ArrowUpDown",
      },
      {
        title: "Zero dependencies",
        description:
          "Biome has no JavaScript dependencies. One binary does everything with consistent behavior.",
        icon: "Package",
      },
    ],
    logo: biomeLogo,
    videos: [
      "https://www.youtube.com/watch?v=lEkXbneUnWg",
      "https://www.youtube.com/watch?v=b_F4LaycQcE",
    ],

    configFiles: [
      {
        name: "biome.jsonc",
        lang: "json",
        code: (presets: string[]) => `{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": [
    ${presets.map((p) => `"ultracite/biome/${p}"`).join(",\n    ")}
  ]
}`,
      },
    ],
    vscodeExtensionId: "biomejs.biome",
  },
  {
    id: "eslint",
    name: "ESLint + Prettier + Stylelint",
    subtitle: "The most mature linting ecosystem",
    description:
      "The most mature and comprehensive linting solution. Combines ESLint for JavaScript/TypeScript, Prettier for formatting, and Stylelint for CSS with 20+ plugins and hundreds of preconfigured rules.",
    benefits: [
      {
        title: "Battle-tested",
        description:
          "Used by millions of developers worldwide. The largest ecosystem of plugins and configurations available.",
        icon: "ShieldCheck",
      },
      {
        title: "20+ plugins included",
        description:
          "React, TypeScript, JSX A11y, Import, Promise, Node, Next.js, Unicorn, SonarJS, and more preconfigured.",
        icon: "Puzzle",
      },
      {
        title: "Three tools in one",
        description:
          "ESLint handles code quality, Prettier ensures consistent formatting, and Stylelint keeps your CSS clean.",
        icon: "Layers",
      },
      {
        title: "Framework-aware",
        description:
          "First-class support for React, Next.js, Vue, Svelte, and more with framework-specific rules.",
        icon: "Box",
      },
      {
        title: "Type-aware linting",
        description:
          "Deep TypeScript integration with type-aware rules that catch bugs static analysis alone can't find.",
        icon: "FileCode",
      },
      {
        title: "Maximum coverage",
        description:
          "Hundreds of rules covering accessibility, security, performance, and best practices out of the box.",
        icon: "Target",
      },
    ],
    includes: ["ESLint", "Prettier", "Stylelint"],
    logo: eslintLogo,
    additionalLogos: [prettierLogo, stylelintLogo],

    configFiles: [
      {
        name: "eslint.config.mjs",
        lang: "javascript",
        code: (
          presets: string[]
        ) => `import { defineConfig } from "eslint/config";
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
        name: "prettier.config.mjs",
        lang: "javascript",
        code: () => `export { default } from "ultracite/prettier";`,
      },
      {
        name: "stylelint.config.mjs",
        lang: "javascript",
        code: () => `export { default } from "ultracite/stylelint";`,
      },
    ],
    vscodeExtensionId: "dbaeumer.vscode-eslint",
  },
  {
    id: "oxlint",
    name: "Oxlint + Oxfmt",
    subtitle: "The fastest linter available",
    description:
      "The fastest linter available. Oxlint is part of the Oxc project, running 50-100x faster than ESLint with a focus on catching bugs and reducing false positives.",
    benefits: [
      {
        title: "50-100x faster",
        description:
          "Lint your entire codebase in milliseconds. No more waiting for slow linting processes.",
        icon: "Zap",
      },
      {
        title: "15 plugin equivalents",
        description:
          "Built-in support for React, TypeScript, Next.js, Vue, Jest, Vitest, JSDoc, and more without extra deps.",
        icon: "Puzzle",
      },
      {
        title: "Bug-focused rules",
        description:
          "Prioritizes catching real bugs over stylistic issues. High signal-to-noise ratio.",
        icon: "Bug",
      },
      {
        title: "Oxc ecosystem",
        description:
          "Part of the larger Oxc project with parser, resolver, transformer, and minifier built for speed.",
        icon: "Boxes",
      },
      {
        title: "Category-based config",
        description:
          "Rules organized into correctness, suspicious, pedantic, performance, restriction, and style categories.",
        icon: "FolderTree",
      },
      {
        title: "Drop-in ready",
        description:
          "Works alongside your existing ESLint setup or as a complete replacement with Oxfmt for formatting.",
        icon: "RefreshCw",
      },
    ],
    includes: ["Oxlint", "Oxfmt"],
    logo: oxlintLogo,

    configFiles: [
      {
        name: ".oxlintrc.json",
        lang: "json",
        code: (presets: string[]) => `{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": [
    ${presets.map((p) => `"ultracite/oxlint/${p}"`).join(",\n    ")}
  ]
}`,
      },
      {
        name: ".oxfmtrc.jsonc",
        lang: "json",
        code: () => `{
  "$schema": "./node_modules/oxfmt/configuration_schema.json"
}`,
      },
    ],
    vscodeExtensionId: "oxc.oxc-vscode",
  },
];
