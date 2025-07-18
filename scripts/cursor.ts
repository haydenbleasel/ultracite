import { mkdir, writeFile } from 'node:fs/promises';
import { cursorRulesFile } from '../docs/lib/rules';
import { exists } from './utils';

const path = './.cursor/rules/ultracite.mdc';

export const cursor = {
  exists: () => exists(path),
  create: async () => {
    await mkdir('.cursor/rules', { recursive: true });
    await writeFile(path, cursorRulesFile);
  },
  update: async () => {
    await mkdir('.cursor/rules', { recursive: true });
    await writeFile(path, cursorRulesFile);
  },
};
