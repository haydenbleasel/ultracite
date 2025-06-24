import { readFile, writeFile } from 'node:fs/promises';
import deepmerge from 'deepmerge';
import { parse } from 'jsonc-parser';
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
    const existingConfig = parse(existingContents) as Record<string, unknown> | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToWork = existingConfig || {};

    // Check if ultracite is already in the extends array
    const existingExtends = configToWork.extends && Array.isArray(configToWork.extends) ? configToWork.extends : [];
    if (!existingExtends.includes('ultracite')) {
      configToWork.extends = [...existingExtends, 'ultracite'];
    }

    // Merge other properties from defaultConfig
    const configToMerge = {
      $schema: defaultConfig.$schema,
    };
    const newConfig = deepmerge(configToWork, configToMerge);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
