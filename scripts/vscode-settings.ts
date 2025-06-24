import { mkdir, readFile, writeFile } from 'node:fs/promises';
import deepmerge from 'deepmerge';
import { parse } from 'jsonc-parser';
import { exists } from './utils';

const defaultConfig = {
  'editor.defaultFormatter': 'esbenp.prettier-vscode',
  '[javascript][typescript][javascriptreact][typescriptreact][json][jsonc][css][graphql]':
    {
      'editor.defaultFormatter': 'biomejs.biome',
    },
  'typescript.tsdk': 'node_modules/typescript/lib',
  'editor.formatOnSave': true,
  'editor.formatOnPaste': true,
  'emmet.showExpandedAbbreviation': 'never',
  'editor.codeActionsOnSave': {
    'source.fixAll.biome': 'explicit',
    'source.organizeImports.biome': 'explicit',
  },
};

const path = './.vscode/settings.json';

export const vscode = {
  exists: () => exists(path),
  create: async () => {
    await mkdir('.vscode', { recursive: true });
    await writeFile(path, JSON.stringify(defaultConfig, null, 2));
  },
  update: async () => {
    const existingContents = await readFile(path, 'utf-8');
    const existingConfig = parse(existingContents) as Record<string, unknown> | undefined;

    if (!existingConfig) {
      throw new Error('Invalid .vscode/settings.json file');
    }

    const newConfig = deepmerge(existingConfig, defaultConfig);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
