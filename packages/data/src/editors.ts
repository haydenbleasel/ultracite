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
import type { ProviderId } from "./providers";
import type { HooksConfig } from "./types";

/* e.g. .cursor/rules/ultracite.mdc */
export interface EditorRulesConfig {
  appendMode?: boolean;
  header?: string;
  path: string;
}

/* e.g. .vscode/settings.json */
export interface EditorSettingsConfig {
  extensionCommand?: string;
  getContent: (linter?: ProviderId) => Record<string, unknown>;
  path: string;
}

export interface Editor {
  config: EditorSettingsConfig;
  description: string;
  hooks?: HooksConfig;
  id: string;
  logo: StaticImageData;
  name: string;
  rules?: EditorRulesConfig;
  subtitle: string;
}

// VS Code base configuration
const vscodeBaseConfig = {
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnPaste": true,
  "editor.formatOnSave": true,
  "emmet.showExpandedAbbreviation": "never",
  "typescript.tsdk": "node_modules/typescript/lib",
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

// VS Code Oxlint configuration
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

export const getVscodeConfig = (linter: ProviderId = "biome") => {
  switch (linter) {
    case "biome": {
      return deepmerge(vscodeBaseConfig, vscodeBiomeConfig);
    }
    case "eslint": {
      return deepmerge(vscodeBaseConfig, vscodeEslintConfig);
    }
    case "oxlint": {
      return deepmerge(vscodeBaseConfig, vscodeOxlintConfig);
    }
    default: {
      return vscodeBaseConfig;
    }
  }
};

// Zed Biome configuration
export const zedBaseConfig = {
  format_on_save: "on",
  formatter: "language_server",
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
  },
  lsp: {
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
  },
};

export const getZedConfig = (linter: ProviderId = "biome") => {
  switch (linter) {
    case "biome": {
      return deepmerge(zedBaseConfig, zedBiomeConfig);
    }
    case "eslint": {
      return deepmerge(zedBaseConfig, zedEslintConfig);
    }
    case "oxlint": {
      return deepmerge(zedBaseConfig, zedOxcConfig);
    }
    default: {
      return zedBaseConfig;
    }
  }
};

export const editors: Editor[] = [
  {
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
    description:
      "Microsoft's popular code editor with extensive extension support and built-in Git integration.",
    id: "vscode",
    logo: vscodeLogo,
    name: "Visual Studio Code",
    subtitle: "The most popular code editor",
  },
  {
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
    description:
      "The AI-first code editor built on VS Code with deep AI integration for coding assistance.",
    hooks: {
      path: ".cursor/hooks.json",
      getContent: (command) => ({
        version: 1,
        hooks: {
          afterFileEdit: [{ command }],
        },
      }),
    },
    id: "cursor",
    logo: cursorLogo,
    name: "Cursor",
    rules: {
      path: ".cursor/rules/ultracite.mdc",
      header: `---
description: Ultracite Rules - AI-Ready Formatter and Linter
globs: "**/*.{ts,tsx,js,jsx,json,jsonc,html,vue,svelte,astro,css,yaml,yml,graphql,gql,md,mdx,grit}"
alwaysApply: false
---`,
    },
    subtitle: "The AI-first code editor",
  },
  {
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
    description:
      "Codeium's agentic IDE that combines AI assistance with a powerful VS Code-based development environment.",
    hooks: {
      path: ".windsurf/hooks.json",
      getContent: (command) => ({
        hooks: {
          post_write_code: [{ command, show_output: true }],
        },
      }),
    },
    id: "windsurf",
    logo: windsurfLogo,
    name: "Windsurf",
    rules: {
      path: ".windsurf/rules/ultracite.md",
    },
    subtitle: "The agentic IDE by Codeium",
  },
  {
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
    description:
      "An AI-powered development platform built on VS Code for building and deploying applications faster.",
    id: "antigravity",
    logo: antigravityLogo,
    name: "Antigravity",
    subtitle: "Google's next-generation IDE",
  },
  {
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
    description:
      "AWS's spec-driven AI development environment for building production-ready applications.",
    id: "kiro",
    logo: kiroLogo,
    name: "Kiro",
    rules: {
      path: ".kiro/steering/ultracite.md",
    },
    subtitle: "AWS's spec-driven IDE",
  },
  {
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
    description:
      "ByteDance's AI-powered IDE built on VS Code - the real AI engineer.",
    id: "trae",
    logo: traeLogo,
    name: "Trae",
    rules: {
      path: ".trae/rules/project_rules.md",
    },
    subtitle: "ByteDance's AI IDE",
  },
  {
    config: {
      path: ".vscode/settings.json",
      getContent: getVscodeConfig,
      extensionCommand: "code --install-extension",
    },
    description:
      "An open-source AI code editor built on VS Code with a focus on privacy and extensibility.",
    id: "void",
    logo: voidLogo,
    name: "Void",
    subtitle: "Open-source AI editor",
  },
  {
    config: {
      path: ".zed/settings.json",
      getContent: getZedConfig,
    },
    description:
      "A high-performance, multiplayer code editor built in Rust with built-in AI assistance.",
    id: "zed",
    logo: zedLogo,
    name: "Zed",
    rules: {
      path: ".rules",
      appendMode: true,
    },
    subtitle: "The high-performance editor",
  },
];
