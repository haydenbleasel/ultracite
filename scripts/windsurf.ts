import { mkdir, writeFile } from 'node:fs/promises';
import { rulesFile } from '../docs/lib/rules';
import { exists } from './utils';

const path = '.windsurf/rules/ultracite.md';

export const windsurf = {
  exists: () => exists(path),
  create: async () => {
    await mkdir('.windsurf/rules', { recursive: true });
    await writeFile(path, rulesFile);
  },
  update: async () => {
    await mkdir('.windsurf/rules', { recursive: true });
    await writeFile(path, rulesFile);
  },
}; 