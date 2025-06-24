import { readFile, writeFile } from 'node:fs/promises';
import deepmerge from 'deepmerge';
import { exists } from './utils';

const defaultConfig = {
  compilerOptions: {
    strictNullChecks: true,
  },
};

const path = './tsconfig.json';

export const tsconfig = {
  exists: () => exists(path),
  create: () => writeFile(path, JSON.stringify(defaultConfig, null, 2)),
  update: async () => {
    const existingContents = await readFile(path, 'utf-8');
    const existingConfig = JSON.parse(existingContents);

    const newConfig = deepmerge(existingConfig, defaultConfig);

    await writeFile(path, JSON.stringify(newConfig, null, 2));
  },
};
