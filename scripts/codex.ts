import { writeFile } from 'node:fs/promises';
import { aiRulesContent } from '../docs/lib/rules';
import { exists } from './utils';

const path = './AGENTS.md';

export const codex = {
  exists: () => exists(path),
  create: async () => {
    await writeFile(path, aiRulesContent);
  },
  update: async () => {
    await writeFile(path, aiRulesContent);
  },
};
