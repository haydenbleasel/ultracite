/* biome-ignore-all lint/style/useNamingConvention: "Editor configs use various naming conventions" */

import deepmerge from "deepmerge";
import type { StaticImageData } from "next/image";
import antigravityLogo from "../logos/antigravity.svg";
import cursorLogo from "../logos/cursor.svg";
import kiroLogo from "../logos/kiro.svg";
import traeLogo from "../logos/trae.svg";
import voidLogo from "../logos/void.svg";
import vscodeLogo from "../logos/vscode.svg";
import windsurfLogo from "../logos/windsurf.svg";
import zedLogo from "../logos/zed.svg";
import type { Linter } from "./providers";

/* e.g. .cursor/rules/ultracite.mdc */
export interface EditorRulesConfig {
  path: string;
  header?: string;
  appendMode?: boolean;
}

/* e.g. .cursor/hooks.json */
export interface EditorHooksConfig {
  path: string;
  getContent: (command: string) => Record<string, unknown>;
}

/* e.g. .vscode/settings.json */
export interface EditorSettingsConfig {
  path: string;
  getContent: (linter?: Linter) => Record<string, unknown>;
  extensionCommand?: string;
}

export interface Editor {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  logo: StaticImageData;
  rules?: EditorRulesConfig;
  hooks?: EditorHooksConfig;
  config: EditorSettingsConfig;
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
// Maps https://biomejs.dev/internals/language-support/
// to https://code.visualstudio.com/docs/languages/identifiers
export const vscodeBiomeConfig = {
  // JavaScript
  "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
  // TypeScript
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },

  // JSX
  "[javascriptreact]": { "editor.defaultFormatter": "biomejs.biome" },

  // TSX
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },

  // JSON
  "[json]": { "editor.defaultFormatter": "biomejs.biome" },

  // JSONC
  "[jsonc]": { "editor.defaultFormatter": "biomejs.biome" },

  // HTML
  "[html]": { "editor.defaultFormatter": "biomejs.biome" },

  // Vue
  "[vue]": { "editor.defaultFormatter": "biomejs.biome" },

  // Svelte
  "[svelte]": { "editor.defaultFormatter": "biomejs.biome" },

  // Astro
  // Astro not supported by VSCode

  // CSS
  "[css]": { "editor.defaultFormatter": "biomejs.biome" },

  // YAML
  "[yaml]": { "editor.defaultFormatter": "biomejs.biome" },

  // GraphQL
  "[graphql]": { "editor.defaultFormatter": "biomejs.biome" },

  // Markdown
  "[markdown]": { "editor.defaultFormatter": "biomejs.biome" },

  // MDX
  "[mdx]": { "editor.defaultFormatter": "biomejs.biome" },

  // GritQL
  // GritQL not supported by VSCode

  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit",
  },
};

// VS Code OxLint configuration
// Maps https://oxc.rs/docs/guide/usage/formatter.html#supported-languages
// to https://code.visualstudio.com/docs/languages/identifiers
export const vscodeOxlintConfig = {
  // JS, JSX
  "[javascript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[javascriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },

  // TS, TSX
  "[typescript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },

  // JSON, JSONC, JSON5
  "[json]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[jsonc]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  // JSON5 not supported by VSCode

  // YAML
  "[yaml]": { "editor.defaultFormatter": "oxc.oxc-vscode" },

  // HTML, Angular, Vue, MJML
  "[html]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  // Angular not supported by VSCode
  "[vue]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[vue-html]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  // MJML not supported by VSCode

  // Ember, Handlebars
  // Ember not supported by VSCode
  "[handlebars]": { "editor.defaultFormatter": "oxc.oxc-vscode" },

  // CSS, SCSS, Less
  "[css]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[scss]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[less]": { "editor.defaultFormatter": "oxc.oxc-vscode" },

  // GraphQL
  "[graphql]": { "editor.defaultFormatter": "oxc.oxc-vscode" },

  // Markdown, MDX
  "[markdown]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  // MDX not supported by VSCode

  "editor.codeActionsOnSave": {
    "source.fixAll.oxc": "explicit",
  },
};

// VS Code ESLint/Prettier configuration
export const vscodeEslintConfig = {
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit",
  },
};

export const getVscodeConfig = (linter: Linter = "biome") => {
  switch (linter) {
    case "biome":
      return deepmerge(vscodeBaseConfig, vscodeBiomeConfig);
    case "eslint":
      return deepmerge(vscodeBaseConfig, vscodeEslintConfig);
    case "oxlint":
      return deepmerge(vscodeBaseConfig, vscodeOxlintConfig);
    default:
      return vscodeBaseConfig;
  }
};

// Zed Biome configuration
export const zedBaseConfig = {
  formatter: "language_server",
  format_on_save: "on",
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

const zedBiomeConfig = {
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
};

const zedEslintConfig = {
  languages: {
    JavaScript: {
      formatter: {
        language_server: {
          name: "eslint",
        },
      },
      code_actions_on_format: {
        "source.fixAll.eslint": true,
        "source.organizeImports.eslint": true,
      },
    },
    TypeScript: {
      formatter: {
        language_server: {
          name: "eslint",
        },
      },
      code_actions_on_format: {
        "source.fixAll.eslint": true,
        "source.organizeImports.eslint": true,
      },
    },
    TSX: {
      formatter: {
        language_server: {
          name: "eslint",
        },
      },
      code_actions_on_format: {
        "source.fixAll.eslint": true,
        "source.organizeImports.eslint": true,
      },
    },
  },
};

const zedOxcConfig = {
  languages: {
    JavaScript: {
      formatter: {
        language_server: {
          name: "oxfmt",
        },
      },
      code_actions_on_format: {
        "source.fixAll.oxc": true,
        "source.organizeImports.oxc": true,
      },
    },
    TypeScript: {
      formatter: {
        language_server: {
          name: "oxfmt",
        },
      },
      code_actions_on_format: {
        "source.fixAll.oxc": true,
        "source.organizeImports.oxc": true,
      },
    },
    TSX: {
      formatter: {
        language_server: {
          name: "oxfmt",
        },
      },
      code_actions_on_format: {
        "source.fixAll.oxc": true,
        "source.organizeImports.oxc": true,
      },
    },
  },
  lsp: {
    oxlint: {
      initialization_options: {
        settings: {
          disableNestedConfig: false,
          fixKind: "safe_fix",
          run: "onType",
          typeAware: true,
          unusedDisableDirectives: "deny",
        },
      },
    },
    oxfmt: {
      initialization_options: {
        settings: {
          configPath: null,
          flags: {},
          "fmt.configPath": null,
          "fmt.experimental": true,
          run: "onSave",
          typeAware: false,
          unusedDisableDirectives: false,
        },
      },
    },
  },
};

export const getZedConfig = (linter: Linter = "biome") => {
  switch (linter) {
    case "biome":
      return deepmerge(zedBaseConfig, zedBiomeConfig);
    case "eslint":
      return deepmerge(zedBaseConfig, zedEslintConfig);
    case "oxlint":
      return deepmerge(zedBaseConfig, zedOxcConfig);
    default:
      return zedBaseConfig;
  }
};

export const editors: Editor[] = [
  {
    id: "vscode",
    name: "Visual Studio Code",
    subtitle: "The most popular code editor",
    description:
      "Microsoft's popular code editor with extensive extension support and built-in Git integration.",
    logo: vscodeLogo,
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
  },
  {
    id: "cursor",
    name: "Cursor",
    subtitle: "The AI-first code editor",
    description:
      "The AI-first code editor built on VS Code with deep AI integration for coding assistance.",
    logo: cursorLogo,
    rules: {
      path: ".cursor/rules/ultracite.mdc",
      header: `---
description: Ultracite Rules - AI-Ready Formatter and Linter
globs: "**/*.{ts,tsx,js,jsx,json,jsonc,html,vue,svelte,astro,css,yaml,yml,graphql,gql,md,mdx,grit}"
alwaysApply: false
---`,
    },
    hooks: {
      path: ".cursor/hooks.json",
      getContent: (command) => ({
        version: 1,
        hooks: {
          afterFileEdit: [{ command }],
        },
      }),
    },
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
  },
  {
    id: "windsurf",
    name: "Windsurf",
    subtitle: "The agentic IDE by Codeium",
    description:
      "Codeium's agentic IDE that combines AI assistance with a powerful VS Code-based development environment.",
    logo: windsurfLogo,
    rules: {
      path: ".windsurf/rules/ultracite.md",
    },
    hooks: {
      path: ".windsurf/hooks.json",
      getContent: (command) => ({
        hooks: {
          post_write_code: [{ command, show_output: true }],
        },
      }),
    },
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
  },
  {
    id: "antigravity",
    name: "Antigravity",
    subtitle: "Google's next-generation IDE",
    description:
      "An AI-powered development platform built on VS Code for building and deploying applications faster.",
    logo: antigravityLogo,
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
  },
  {
    id: "kiro",
    name: "Kiro",
    subtitle: "AWS's spec-driven IDE",
    description:
      "AWS's spec-driven AI development environment for building production-ready applications.",
    logo: kiroLogo,
    rules: {
      path: ".kiro/steering/ultracite.md",
    },
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
  },
  {
    id: "trae",
    name: "Trae AI",
    subtitle: "ByteDance's AI IDE",
    description:
      "ByteDance's AI-powered IDE built on VS Code - the real AI engineer.",
    logo: traeLogo,
    rules: {
      path: ".trae/rules/project_rules.md",
    },
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
  },
  {
    id: "void",
    name: "Void",
    subtitle: "Open-source AI editor",
    description:
      "An open-source AI code editor built on VS Code with a focus on privacy and extensibility.",
    logo: voidLogo,
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
  },
  {
    id: "zed",
    name: "Zed",
    subtitle: "The high-performance editor",
    description:
      "A high-performance, multiplayer code editor built in Rust with built-in AI assistance.",
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
