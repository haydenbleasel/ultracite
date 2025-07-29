import { mkdir, readFile, writeFile } from 'node:fs/promises';
import deepmerge from 'deepmerge';
import { parse } from 'jsonc-parser';
import { exists } from '../utils';

const defaultConfig = {
  'editor.defaultFormatter': 'esbenp.prettier-vscode',
  '[javascript]': { 'editor.defaultFormatter': 'biomejs.biome' },
  '[typescript]': { 'editor.defaultFormatter': 'biomejs.biome' },
  '[javascriptreact]': { 'editor.defaultFormatter': 'biomejs.biome' },
  '[typescriptreact]': { 'editor.defaultFormatter': 'biomejs.biome' },
  '[json]': { 'editor.defaultFormatter': 'biomejs.biome' },
  '[jsonc]': { 'editor.defaultFormatter': 'biomejs.biome' },
  '[css]': { 'editor.defaultFormatter': 'biomejs.biome' },
  '[graphql]': { 'editor.defaultFormatter': 'biomejs.biome' },
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
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToMerge = existingConfig || {};
    const newConfig = deepmerge(configToMerge, defaultConfig);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
