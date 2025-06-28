import { mkdir, readFile, writeFile } from 'node:fs/promises';
import deepmerge from 'deepmerge';
import { parse } from 'jsonc-parser';
import { exists } from './utils';

const defaultConfig = {
  "formatter": "language_server",
  "format_on_save": "on",
  "languages": {
    "TypeScript": {
      "formatter": {
        "language_server": {
          "name": "biome"
        },
        "code_actions_on_format": {
          "source.fixAll.biome": true,
          "source.organizeImports.biome": true
        }
      }
    },
    "JavaScript": {
      "formatter": {
        "language_server": {
          "name": "biome"
        },
        "code_actions_on_format": {
          "source.fixAll.biome": true,
          "source.organizeImports.biome": true
        }
      }
    },
    "TSX": {
      "formatter": {
        "language_server": {
          "name": "biome"
        },
        "code_actions_on_format": {
          "source.fixAll.biome": true,
          "source.organizeImports.biome": true
        }
      }
    },
    "JSON": {
      "formatter": {
        "language_server": {
          "name": "biome"
        },
        "code_actions_on_format": {
          "source.fixAll.biome": true,
          "source.organizeImports.biome": true
        }
      }
    },
    "JSONC": {
      "formatter": {
        "language_server": {
          "name": "biome"
        },
        "code_actions_on_format": {
          "source.fixAll.biome": true,
          "source.organizeImports.biome": true
        }
      }
    }
  },
  "lsp": {
    "typescript-language-server": {
      "settings": {
        "typescript": {
          "preferences": {
            "includePackageJsonAutoImports": "on"
          }
        }
      }
    }
  }
};

const path = './.zed/settings.json';

export const zed = {
  exists: () => exists(path),
  create: async () => {
    await mkdir('.zed', { recursive: true });
    await writeFile(path, JSON.stringify(defaultConfig, null, 2));
  },
  update: async () => {
    const existingContents = await readFile(path, 'utf-8');
    const existingConfig = parse(existingContents) as Record<string, unknown> | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToMerge = existingConfig || {};
    const newConfig = deepmerge(configToMerge, defaultConfig);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
