import { readFile, writeFile } from 'node:fs/promises';
import deepmerge from 'deepmerge';
import { exists } from './utils';

const defaultConfig = {
  $schema: 'https://biomejs.dev/schemas/2.0.5/schema.json',
  extends: ['ultracite'],
};

const path = './biome.jsonc';

export const biome = {
  exists: () => exists(path),
  create: () => writeFile(path, JSON.stringify(defaultConfig, null, 2)),
  update: async () => {
    const existingContents = await readFile(path, 'utf-8');
    const existingConfig = JSON.parse(existingContents);
    
    // Check if ultracite is already in the extends array
    const existingExtends = existingConfig.extends || [];
    if (!existingExtends.includes('ultracite')) {
      existingConfig.extends = [...existingExtends, 'ultracite'];
    }
    
    // Merge other properties from defaultConfig
    const configToMerge = {
      $schema: defaultConfig.$schema,
    };
    const newConfig = deepmerge(existingConfig, configToMerge);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
