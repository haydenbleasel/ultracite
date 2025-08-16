import { writeFile } from 'node:fs/promises';
import { rulesFile } from '../../docs/lib/rules';
import { exists } from '../utils';

const path = './AGENTS.md';

export const codex = {
  exists: () => exists(path),
  create: async () => {
    await writeFile(path, rulesFile);
  },
  update: async () => {
    await writeFile(path, rulesFile);
  },
};
