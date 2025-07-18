import { mkdir, writeFile } from 'node:fs/promises';
import { aiRulesContent } from '../docs/lib/rules';
import { exists } from './utils';

const path = './.claude/CLAUDE.md';

export const claude = {
  exists: () => exists(path),
  create: async () => {
    await mkdir('.claude', { recursive: true });
    await writeFile(path, aiRulesContent);
  },
  update: async () => {
    await mkdir('.claude', { recursive: true });
    await writeFile(path, aiRulesContent);
  },
};
