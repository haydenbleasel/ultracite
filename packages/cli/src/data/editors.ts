/* biome-ignore-all lint/style/useNamingConvention: "Editor configs use various naming conventions" */

import deepmerge from "deepmerge";

import type { ProviderId } from "./providers";
import type { HooksConfig } from "./types";

/* e.g. .vscode/settings.json */
export interface EditorSettingsConfig {
  extensionCommand?: string;
  getContent: (linter?: ProviderId) => Record<string, unknown>;
  path: string;
}

export interface Editor {
  config: EditorSettingsConfig;
  hooks?: HooksConfig;
  id: string;
  name: string;
}

// VS Code base configuration
const vscodeBaseConfig = {
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnPaste": true,
  "editor.formatOnSave": true,
  "emmet.showExpandedAbbreviation": "never",
  "js/ts.tsdk.path": "node_modules/typescript/lib",
  "js/ts.tsdk.promptToUseWorkspaceVersion": true,
};

// VS Code Biome configuration
// Maps https://biomejs.dev/internals/language-support/
// to https://code.visualstudio.com/docs/languages/identifiers
export const vscodeBiomeConfig = {
  "[css]": { "editor.defaultFormatter": "biomejs.biome" },
  "[graphql]": { "editor.defaultFormatter": "biomejs.biome" },
  "[html]": { "editor.defaultFormatter": "biomejs.biome" },
  "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[javascriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[json]": { "editor.defaultFormatter": "biomejs.biome" },
  "[jsonc]": { "editor.defaultFormatter": "biomejs.biome" },
  "[markdown]": { "editor.defaultFormatter": "biomejs.biome" },
  "[mdx]": { "editor.defaultFormatter": "biomejs.biome" },
  "[svelte]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[vue]": { "editor.defaultFormatter": "biomejs.biome" },
  "[yaml]": { "editor.defaultFormatter": "biomejs.biome" },
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit",
  },
};

// VS Code Oxlint configuration
// Maps https://oxc.rs/docs/guide/usage/formatter.html#supported-languages
// to https://code.visualstudio.com/docs/languages/identifiers
export const vscodeOxlintConfig = {
  "[css]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[graphql]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[handlebars]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[html]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[javascript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[javascriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[json]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[jsonc]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[less]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[markdown]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[scss]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[vue-html]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[vue]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
  "[yaml]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
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
      code_actions_on_format: {
        "source.fixAll.biome": true,
        "source.organizeImports.biome": true,
      },
      formatter: {
        language_server: {
          name: "biome",
        },
      },
    },
    TSX: {
      code_actions_on_format: {
        "source.fixAll.biome": true,
        "source.organizeImports.biome": true,
      },
      formatter: {
        language_server: {
          name: "biome",
        },
      },
    },
    TypeScript: {
      code_actions_on_format: {
        "source.fixAll.biome": true,
        "source.organizeImports.biome": true,
      },
      formatter: {
        language_server: {
          name: "biome",
        },
      },
    },
  },
};

const zedEslintConfig = {
  languages: {
    JavaScript: {
      code_actions_on_format: {
        "source.fixAll.eslint": true,
        "source.organizeImports.eslint": true,
      },
      formatter: {
        language_server: {
          name: "eslint",
        },
      },
    },
    TSX: {
      code_actions_on_format: {
        "source.fixAll.eslint": true,
        "source.organizeImports.eslint": true,
      },
      formatter: {
        language_server: {
          name: "eslint",
        },
      },
    },
    TypeScript: {
      code_actions_on_format: {
        "source.fixAll.eslint": true,
        "source.organizeImports.eslint": true,
      },
      formatter: {
        language_server: {
          name: "eslint",
        },
      },
    },
  },
};

const zedOxcConfig = {
  languages: {
    JavaScript: {
      code_actions_on_format: {
        "source.fixAll.oxc": true,
        "source.organizeImports.oxc": true,
      },
      formatter: {
        language_server: {
          name: "oxfmt",
        },
      },
    },
    TSX: {
      code_actions_on_format: {
        "source.fixAll.oxc": true,
        "source.organizeImports.oxc": true,
      },
      formatter: {
        language_server: {
          name: "oxfmt",
        },
      },
    },
    TypeScript: {
      code_actions_on_format: {
        "source.fixAll.oxc": true,
        "source.organizeImports.oxc": true,
      },
      formatter: {
        language_server: {
          name: "oxfmt",
        },
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
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    id: "vscode",
    name: "Visual Studio Code",
  },
  {
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    hooks: {
      getContent: (command) => ({
        hooks: {
          afterFileEdit: [{ command }],
        },
        version: 1,
      }),
      path: ".cursor/hooks.json",
    },
    id: "cursor",
    name: "Cursor",
  },
  {
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    hooks: {
      getContent: (command) => ({
        hooks: {
          post_write_code: [{ command, show_output: true }],
        },
      }),
      path: ".windsurf/hooks.json",
    },
    id: "windsurf",
    name: "Windsurf",
  },
  {
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    hooks: {
      getContent: (command) => ({
        hooks: {
          PostToolUse: [
            {
              hooks: [
                {
                  command,
                  timeout: 20,
                  type: "command",
                },
              ],
              matcher: "Write|Edit",
            },
          ],
        },
      }),
      path: ".codebuddy/settings.json",
    },
    id: "codebuddy",
    name: "CodeBuddy",
  },
  {
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    id: "antigravity",
    name: "Antigravity",
  },
  {
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    id: "bob",
    name: "IBM Bob",
  },
  {
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    id: "kiro",
    name: "Kiro",
  },
  {
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    id: "trae",
    name: "Trae",
  },
  {
    config: {
      extensionCommand: "code --install-extension",
      getContent: getVscodeConfig,
      path: ".vscode/settings.json",
    },
    id: "void",
    name: "Void",
  },
  {
    config: {
      getContent: getZedConfig,
      path: ".zed/settings.json",
    },
    id: "zed",
    name: "Zed",
  },
];
