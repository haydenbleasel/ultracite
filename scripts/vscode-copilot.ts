import { mkdir, writeFile } from 'node:fs/promises';
import { rulesFile } from '../docs/lib/rules';
import { exists } from './utils';

const path = './.github/copilot-instructions.md';

export const vscodeCopilot = {
  exists: () => exists(path),
  create: async () => {
    await mkdir('.github', { recursive: true });
    await writeFile(path, rulesFile);
  },
  update: async () => {
    await mkdir('.github', { recursive: true });
    await writeFile(path, rulesFile);
  },
}; 