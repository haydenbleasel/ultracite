import { readFile, writeFile } from 'node:fs/promises';
import deepmerge from 'deepmerge';
import { exists } from './utils';

const defaultConfig = {
  $schema: 'https://www.ultracite.ai/v/2.0.0',
  extends: ['ultracite'],
};

const path = 'biome.jsonc';

export const biome = {
  exists: async () => {
    try {
      await exists(path);
      return true;
    } catch {
      return false;
    }
  },
  create: async () => {
    await writeFile(path, JSON.stringify(defaultConfig, null, 2));
  },
  update: async () => {
    const existingContents = await readFile(path, 'utf-8');
    const existingConfig = JSON.parse(existingContents);
    
    const newConfig = deepmerge(existingConfig, defaultConfig);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
