import { mkdir, writeFile } from 'node:fs/promises';
import { rulesFile } from '../../docs/lib/rules';
import { exists } from '../utils';

const path = './.kiro/steering/linting-and-formatting.md';

export const kiro = {
  exists: () => exists(path),
  create: async () => {
    await mkdir('.kiro/steering', { recursive: true });
    await writeFile(path, rulesFile);
  },
  update: async () => {
    await mkdir('.kiro/steering', { recursive: true });
    await writeFile(path, rulesFile);
  },
};
