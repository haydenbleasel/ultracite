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

// Extension IDs and shared VS Code paths, extracted to avoid repeated literals.
const BIOME_FORMATTER = "biomejs.biome";
const OXC_FORMATTER = "oxc.oxc-vscode";
const VSCODE_INSTALL_COMMAND = "code --install-extension";
const VSCODE_SETTINGS_PATH = ".vscode/settings.json";

// VS Code Biome configuration
// Maps https://biomejs.dev/internals/language-support/
// to https://code.visualstudio.com/docs/languages/identifiers
export const vscodeBiomeConfig = {
  "[css]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[graphql]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[html]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[javascript]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[javascriptreact]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[json]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[jsonc]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[markdown]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[mdx]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[svelte]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[typescript]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[typescriptreact]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[vue]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "[yaml]": { "editor.defaultFormatter": BIOME_FORMATTER },
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit",
  },
};

// VS Code Oxlint configuration
// Maps https://oxc.rs/docs/guide/usage/formatter.html#supported-languages
// to https://code.visualstudio.com/docs/languages/identifiers
export const vscodeOxlintConfig = {
  "[css]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[graphql]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[handlebars]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[html]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[javascript]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[javascriptreact]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[json]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[jsonc]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[less]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[markdown]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[scss]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[typescript]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[typescriptreact]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[vue-html]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[vue]": { "editor.defaultFormatter": OXC_FORMATTER },
  "[yaml]": { "editor.defaultFormatter": OXC_FORMATTER },
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
      extensionCommand: VSCODE_INSTALL_COMMAND,
      getContent: getVscodeConfig,
      path: VSCODE_SETTINGS_PATH,
    },
    id: "vscode",
    name: "Visual Studio Code",
  },
  {
    config: {
      extensionCommand: VSCODE_INSTALL_COMMAND,
      getContent: getVscodeConfig,
      path: VSCODE_SETTINGS_PATH,
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
      extensionCommand: VSCODE_INSTALL_COMMAND,
      getContent: getVscodeConfig,
      path: VSCODE_SETTINGS_PATH,
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
      extensionCommand: VSCODE_INSTALL_COMMAND,
      getContent: getVscodeConfig,
      path: VSCODE_SETTINGS_PATH,
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
      extensionCommand: VSCODE_INSTALL_COMMAND,
      getContent: getVscodeConfig,
      path: VSCODE_SETTINGS_PATH,
    },
    id: "antigravity",
    name: "Antigravity",
  },
  {
    config: {
      extensionCommand: VSCODE_INSTALL_COMMAND,
      getContent: getVscodeConfig,
      path: VSCODE_SETTINGS_PATH,
    },
    id: "bob",
    name: "IBM Bob",
  },
  {
    config: {
      extensionCommand: VSCODE_INSTALL_COMMAND,
      getContent: getVscodeConfig,
      path: VSCODE_SETTINGS_PATH,
    },
    id: "kiro",
    name: "Kiro",
  },
  {
    config: {
      extensionCommand: VSCODE_INSTALL_COMMAND,
      getContent: getVscodeConfig,
      path: VSCODE_SETTINGS_PATH,
    },
    id: "trae",
    name: "Trae",
  },
  {
    config: {
      extensionCommand: VSCODE_INSTALL_COMMAND,
      getContent: getVscodeConfig,
      path: VSCODE_SETTINGS_PATH,
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
