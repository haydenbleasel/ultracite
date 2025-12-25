/* biome-ignore-all lint/style/useNamingConvention: "Editor configs use various naming conventions" */
import type { StaticImageData } from "next/image";
import antigravityLogo from "../logos/antigravity.svg";
import cursorLogo from "../logos/cursor.svg";
import kiroLogo from "../logos/kiro.svg";
import traeLogo from "../logos/trae.svg";
import voidLogo from "../logos/void.svg";
import vscodeLogo from "../logos/vscode.svg";
import windsurfLogo from "../logos/windsurf.svg";
import zedLogo from "../logos/zed.svg";

export type EditorCliValue = "vscode" | "zed";
export type Linter = "biome" | "eslint" | "oxlint";

export interface LinterExtension {
  /** VS Code extension ID */
  id: string;
  /** Display name */
  name: string;
}

/** Linter VS Code extension mappings */
export const linterExtensions: Record<Linter, LinterExtension> = {
  biome: { id: "biomejs.biome", name: "Biome" },
  eslint: { id: "dbaeumer.vscode-eslint", name: "ESLint" },
  oxlint: { id: "oxc.oxc-vscode", name: "Oxlint" },
};

export interface EditorRulesConfig {
  /** Path to the rules file */
  path: string;
  /** Header content to prepend to the rules file (e.g., frontmatter) */
  header?: string;
  /** Whether to append to existing file instead of replacing */
  appendMode?: boolean;
}

export interface EditorConfig {
  /** Path to the settings config file */
  path: string;
  /** Get editor settings configuration for a linter */
  getContent: (linters?: Linter[]) => Record<string, unknown>;
}

export interface Editor {
  /** Unique identifier for the editor */
  id: string;
  /** Display name */
  name: string;
  /** Short tagline for navbar */
  subtitle: string;
  /** Full description */
  description: string;
  /** Editor's website URL */
  website: string;
  /** CLI value for --editors flag */
  cliValue: EditorCliValue;
  /** Key features of the editor */
  features: string[];
  /** Logo for UI display */
  logo: StaticImageData;
  /** Rules file configuration (for AI agent rules) */
  rules?: EditorRulesConfig;
  /** Editor settings configuration */
  config: EditorConfig;
}

// VS Code base configuration
const vscodeBaseConfig = {
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "emmet.showExpandedAbbreviation": "never",
};

// VS Code Biome configuration
export const vscodeBiomeConfig = {
  ...vscodeBaseConfig,
  "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[javascriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[json]": { "editor.defaultFormatter": "biomejs.biome" },
  "[jsonc]": { "editor.defaultFormatter": "biomejs.biome" },
  "[css]": { "editor.defaultFormatter": "biomejs.biome" },
  "[graphql]": { "editor.defaultFormatter": "biomejs.biome" },
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit",
  },
};

// VS Code OxLint configuration
export const vscodeOxlintConfig = {
  ...vscodeBaseConfig,
  "[javascript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[javascriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[json]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[jsonc]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[css]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[graphql]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "editor.codeActionsOnSave": {
    "source.fixAll.oxc": "explicit",
  },
};

// VS Code ESLint/Prettier configuration
export const vscodeEslintConfig = {
  ...vscodeBaseConfig,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit",
  },
};

/** Get VS Code config based on linter selection */
export const getVscodeConfig = (linters: Linter[] = ["biome"]) => {
  if (linters.includes("biome")) {
    return vscodeBiomeConfig;
  }
  if (linters.includes("oxlint")) {
    return vscodeOxlintConfig;
  }
  if (linters.includes("eslint")) {
    return vscodeEslintConfig;
  }
  return vscodeBiomeConfig;
};

// Zed Biome configuration
export const zedBiomeConfig = {
  formatter: "language_server",
  format_on_save: "on",
  languages: {
    JavaScript: {
      formatter: {
        language_server: {
          name: "biome",
        },
      },
      code_actions_on_format: {
        "source.fixAll.biome": true,
        "source.organizeImports.biome": true,
      },
    },
    TypeScript: {
      formatter: {
        language_server: {
          name: "biome",
        },
      },
      code_actions_on_format: {
        "source.fixAll.biome": true,
        "source.organizeImports.biome": true,
      },
    },
    TSX: {
      formatter: {
        language_server: {
          name: "biome",
        },
      },
      code_actions_on_format: {
        "source.fixAll.biome": true,
        "source.organizeImports.biome": true,
      },
    },
  },
  lsp: {
    "typescript-language-server": {
      settings: {
        typescript: {
          preferences: {
            includePackageJsonAutoImports: "on",
          },
        },
      },
    },
  },
};

/** @deprecated Use zedBiomeConfig instead */
export const zedConfig = zedBiomeConfig;

/** Get Zed config based on linter selection */
export const getZedConfig = (linters: Linter[] = ["biome"]) => {
  // Zed currently only has good support for Biome
  // ESLint and Oxlint support is limited
  if (linters.includes("biome")) {
    return zedBiomeConfig;
  }
  // Default to Biome config for other linters
  return zedBiomeConfig;
};

/** Get editor config by CLI value */
export const getEditorConfig = (
  cliValue: EditorCliValue,
  linters: Linter[] = ["biome"]
) => {
  if (cliValue === "zed") {
    return getZedConfig(linters);
  }
  return getVscodeConfig(linters);
};

export const editors: Editor[] = [
  {
    id: "vscode",
    name: "Visual Studio Code",
    subtitle: "The most popular code editor",
    description:
      "Microsoft's popular code editor with extensive extension support and built-in Git integration.",
    website: "https://code.visualstudio.com",
    cliValue: "vscode",
    features: [
      "Extension marketplace",
      "Integrated terminal",
      "Git integration",
      "IntelliSense",
    ],
    logo: vscodeLogo,
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
    },
  },
  {
    id: "cursor",
    name: "Cursor",
    subtitle: "The AI-first code editor",
    description:
      "The AI-first code editor built on VS Code with deep AI integration for coding assistance.",
    website: "https://cursor.com",
    cliValue: "vscode",
    features: [
      "AI-native editor",
      "Inline completions",
      "Chat interface",
      "Codebase understanding",
    ],
    logo: cursorLogo,
    rules: {
      path: ".cursor/rules/ultracite.mdc",
      header: `---
description: Ultracite Rules - AI-Ready Formatter and Linter
globs: "**/*.{ts,tsx,js,jsx,json,jsonc,html,vue,svelte,astro,css,yaml,yml,graphql,gql,md,mdx,grit}"
alwaysApply: false
---`,
    },
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
    },
  },
  {
    id: "windsurf",
    name: "Windsurf",
    subtitle: "The agentic IDE by Codeium",
    description:
      "Codeium's agentic IDE that combines AI assistance with a powerful VS Code-based development environment.",
    website: "https://codeium.com/windsurf",
    cliValue: "vscode",
    features: [
      "Agentic workflows",
      "Cascade AI system",
      "VS Code compatibility",
      "Multi-file editing",
    ],
    logo: windsurfLogo,
    rules: {
      path: ".windsurf/rules/ultracite.md",
    },
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
    },
  },
  {
    id: "antigravity",
    name: "Antigravity",
    subtitle: "Google's next-generation IDE",
    description:
      "An AI-powered development platform built on VS Code for building and deploying applications faster.",
    website: "https://antigravity.dev",
    cliValue: "vscode",
    features: [
      "Rapid development",
      "Cloud deployment",
      "AI assistance",
      "Full-stack support",
    ],
    logo: antigravityLogo,
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
    },
  },
  {
    id: "kiro",
    name: "Kiro",
    subtitle: "AWS's spec-driven IDE",
    description:
      "AWS's spec-driven AI development environment for building production-ready applications.",
    website: "https://kiro.dev",
    cliValue: "vscode",
    features: [
      "Spec-driven development",
      "AWS integration",
      "Automated testing",
      "Production-ready output",
    ],
    logo: kiroLogo,
    rules: {
      path: ".kiro/steering/ultracite.md",
    },
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
    },
  },
  {
    id: "trae",
    name: "Trae AI",
    subtitle: "ByteDance's AI IDE",
    description:
      "ByteDance's AI-powered IDE built on VS Code with free access to GPT-4o and Claude 3.5 Sonnet.",
    website: "https://www.trae.ai",
    cliValue: "vscode",
    features: [
      "Free AI models",
      "VS Code based",
      "Bilingual support",
      "Project-level code generation",
    ],
    logo: traeLogo,
    rules: {
      path: ".trae/rules/project_rules.md",
    },
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
    },
  },
  {
    id: "void",
    name: "Void",
    subtitle: "Open-source AI editor",
    description:
      "An open-source AI code editor built on VS Code with a focus on privacy and extensibility.",
    website: "https://voideditor.com",
    cliValue: "vscode",
    features: [
      "Open source",
      "AI-native editor",
      "VS Code compatible",
      "Privacy focused",
    ],
    logo: voidLogo,
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
    },
  },
  {
    id: "zed",
    name: "Zed",
    subtitle: "The high-performance editor",
    description:
      "A high-performance, multiplayer code editor built in Rust with built-in AI assistance.",
    website: "https://zed.dev",
    cliValue: "zed",
    features: [
      "Lightning fast",
      "Collaborative editing",
      "Built-in AI assistant",
      "GPU-accelerated",
    ],
    logo: zedLogo,
    rules: {
      path: ".rules",
      appendMode: true,
    },
    config: {
      path: ".zed/settings.json",
      getContent: getZedConfig,
    },
  },
];

/** Get all editor IDs */
export const editorIds = editors.map((editor) => editor.id) as [
  string,
  ...string[],
];

/** Get all unique CLI values */
export const editorCliValues: EditorCliValue[] = ["vscode", "zed"];

/** Get an editor by ID */
export const getEditorById = (id: string): Editor | undefined =>
  editors.find((editor) => editor.id === id);

/** Get editors by CLI value */
export const getEditorsByCliValue = (cliValue: EditorCliValue): Editor[] =>
  editors.filter((editor) => editor.cliValue === cliValue);
